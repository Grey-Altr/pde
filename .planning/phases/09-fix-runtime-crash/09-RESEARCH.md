# Phase 9: Fix Critical Runtime Crash (telemetry.cjs) - Research

**Researched:** 2026-03-15
**Domain:** Node.js CommonJS module system, PDE UI rendering chain, telemetry module API
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAND-04 | All UI banners display "PDE ►" instead of "GSD ►" | Banners already use PDE stage names; crash prevents them from rendering at all — fix crash to satisfy |
| BRAND-05 | All stage names, status symbols, and progress displays use PDE branding | Splash screen + stage names already PDE-branded; crash prevents display — fix crash to satisfy |
</phase_requirements>

---

## Summary

Phase 9 has a single, precise root cause: `lib/telemetry.cjs` does not exist in the plugin repository. The file `lib/ui/render.cjs` has a hard `require('../telemetry.cjs')` on line 10, which resolves to `lib/telemetry.cjs`. Because this `require()` executes at module load time (synchronously, before any command runs), every invocation of `render.cjs` — `banner`, `panel`, `progress`, `checkpoint`, `divider`, `splash`, all of them — crashes immediately with `Cannot find module '../telemetry.cjs'`.

The v1.0 milestone audit (`v1.0-MILESTONE-AUDIT.md`) documents this as a CRITICAL integration break affecting 14 workflow files and approximately 60 `banner()` and `panel()` calls. BRAND-04 and BRAND-05 were previously verified correct at the source level (PDE-branded stage names in workflows, zero GSD strings in `lib/ui/`, `splash.cjs` showing "Platform Development Engine") — but those verifications were textual grep checks that did not execute the module. The module cannot execute without `telemetry.cjs`.

The fix is to create `lib/telemetry.cjs` that exports the full API surface that `render.cjs` calls. No changes are required to `render.cjs`, to workflows, or to any other file. Once the module exists and is loadable, all 58+ `render.cjs` invocations across 14 workflow files will work and BRAND-04/BRAND-05 will be functionally satisfied.

**Primary recommendation:** Create `lib/telemetry.cjs` implementing the full telemetry API surface derived from `render.cjs` usage. The implementation must store consent, event log, and session ID in `~/.pde/telemetry/` to match the existing path conventions already present in `render.cjs`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in | Read/write telemetry JSONL log and consent file | Already used throughout bin/ and lib/ |
| `node:os` | built-in | Resolve `os.homedir()` for `~/.pde/` base path | Already used in `render.cjs` getTrackingFilePath() |
| `node:path` | built-in | Path construction for telemetry directory | Already used throughout project |
| `node:crypto` | built-in | Generate random session ID (uuid-like via randomBytes) | Standard Node.js approach; no npm deps needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | This module has zero npm dependencies | By project convention: `lib/ui/render.cjs` comment states "zero npm packages" |

**Installation:** No installation required — built-in Node.js modules only.

---

## Architecture Patterns

### Recommended Project Structure

The new file slots into the existing `lib/` layout:

```
lib/
├── ui/
│   ├── colors.cjs
│   ├── components.cjs
│   ├── layout.cjs
│   ├── render.cjs          # requires('../telemetry.cjs') — the caller
│   └── splash.cjs
└── telemetry.cjs           # CREATE THIS — resolves the MODULE_NOT_FOUND
```

The path `../telemetry.cjs` relative to `lib/ui/render.cjs` resolves to `lib/telemetry.cjs`. The file must be at exactly this path — no alternatives.

### Pattern 1: CommonJS Module Export

**What:** A `'use strict'; module.exports = { ... }` file exporting named functions only. No classes, no side effects at require-time.

**When to use:** Required — project uses `.cjs` extension throughout (`render.cjs`, `components.cjs`, `splash.cjs`, `colors.cjs`). No ESM.

**Example:**
```javascript
// lib/telemetry.cjs
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// ... implementation ...

module.exports = {
  getTrackingPlanVersion,
  checkConsent,
  saveConsent,
  getSessionId,
  appendEvent,
  readEvents,
  getStatus,
};
```

### Pattern 2: Lazy Directory Creation

**What:** Create `~/.pde/telemetry/` on first write, not at require-time.

**When to use:** Always for home-directory writes. `render.cjs` already follows this in `runTrackSkill()` (uses `fs.mkdirSync(dir, { recursive: true })` before writing). The telemetry module should do the same.

**Example:**
```javascript
function getTelemDir() {
  const baseDir = process.env.PDE_TEST_DIR || os.homedir();
  return path.join(baseDir, '.pde', 'telemetry');
}

function ensureTelemDir() {
  fs.mkdirSync(getTelemDir(), { recursive: true });
}
```

Note: `render.cjs` already uses `process.env.PDE_TEST_DIR` as a test override for `os.homedir()`. The telemetry module must respect this same env var for consistency and testability.

### Pattern 3: Session ID — Single-process singleton

**What:** Generate a random session ID once per process invocation and cache it in a module-level variable.

**When to use:** `render.cjs` calls `telemetry.getSessionId()` in every track-* command. The session ID should be stable within a single `render.cjs` process invocation.

**Example:**
```javascript
let _sessionId = null;

function getSessionId() {
  if (!_sessionId) {
    const crypto = require('node:crypto');
    _sessionId = crypto.randomBytes(8).toString('hex');
  }
  return _sessionId;
}
```

### Pattern 4: JSONL Event Log

**What:** One JSON object per line in `~/.pde/telemetry/events.jsonl`. Append-only writes.

**When to use:** `readEvents()` needs to return an array of events, and `appendEvent()` must be fast/non-blocking. JSONL (newline-delimited JSON) is the correct format for append-only structured logs.

**Example:**
```javascript
const EVENTS_FILE = () => path.join(getTelemDir(), 'events.jsonl');

function appendEvent(event) {
  try {
    ensureTelemDir();
    fs.appendFileSync(EVENTS_FILE(), JSON.stringify(event) + '\n', 'utf8');
  } catch (_) {
    // Telemetry must never crash the main process
  }
}

function readEvents(filterType) {
  try {
    const raw = fs.readFileSync(EVENTS_FILE(), 'utf8');
    const events = raw.trim().split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
    return filterType ? events.filter(e => e.type === filterType) : events;
  } catch (_) {
    return [];
  }
}
```

### Pattern 5: Consent File

**What:** A JSON file at `~/.pde/telemetry/consent.json` storing `{ version, accepted, timestamp }`.

**When to use:** `checkConsent(version)` must return true/false, and `saveConsent(version)` writes it. `getStatus()` reads it.

### Anti-Patterns to Avoid

- **Throwing on missing files:** All file operations must catch errors and return safe defaults. Telemetry must never crash the main render.cjs process. JSONL reads return `[]`, consent reads return `false`.
- **Side effects at require-time:** Do NOT create directories or write files when the module is `require()`d. Only write on explicit function calls.
- **Synchronous `require()` inside exported functions when avoidable:** The module-level `require()` of `node:fs`, `node:os`, `node:path` at the top is fine. Avoid dynamic requires inside hot functions.
- **Hardcoding absolute paths:** Use `os.homedir()` via `getTelemDir()`, not `/Users/...` literals.
- **Ignoring `PDE_TEST_DIR`:** The `render.cjs` code uses `process.env.PDE_TEST_DIR || os.homedir()` in `getTrackingFilePath()`. The telemetry module must use the same env override so tests can isolate telemetry writes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File path construction | String concatenation | `path.join()` | Cross-platform separators |
| Random session ID | Math.random() based | `crypto.randomBytes(8).toString('hex')` | Sufficient entropy, built-in |
| Directory creation | Manual mkdir chain | `fs.mkdirSync(dir, { recursive: true })` | Already used in render.cjs runTrackSkill |
| UUID generation | npm uuid package | crypto.randomBytes hex | No npm deps; 16-char hex is sufficient |

**Key insight:** The entire module needs zero npm dependencies. Node.js built-ins handle all required operations.

---

## The Complete API Surface

This is the exact set of functions `render.cjs` calls on the `telemetry` object. The planner must implement all of these — none can be omitted:

| Function | Called From | Contract |
|----------|-------------|----------|
| `getTrackingPlanVersion()` | `runConsent()` line 51 | Returns a string version for the current tracking plan (e.g., `"v1"`) |
| `checkConsent(version)` | `runConsent()` line 54 | Returns boolean — true if consent was previously saved for this version |
| `saveConsent(version)` | `runConsent()` line 96 | Persists consent acceptance to disk |
| `getSessionId()` | Every track-* function | Returns a stable string ID for the current process invocation |
| `appendEvent(event)` | `runTrackSkill()`, `runTrackError()`, `runTrackContext()`, `runTrackMcp()`, `runTrackCustom()`, `runFeedback()` | Appends a JSON event object to the event log |
| `readEvents(filterType)` | `runShowData()` line 225 | Returns array of event objects; filterType is string or null |
| `getStatus()` | `runStatus()` line 280 | Returns object with: `{ consented: boolean, version: string, eventCount: number, fileSize: number, lastEvent: string\|null }` |

---

## Common Pitfalls

### Pitfall 1: require()-time crash defeats the whole fix

**What goes wrong:** If `telemetry.cjs` throws at require-time (e.g., tries to `fs.readFileSync` a file that may not exist, or calls `fs.mkdirSync` that fails due to permissions), then `render.cjs` will still crash, just with a different error.

**Why it happens:** Node.js evaluates the module body synchronously when `require()` is called. Any throw in the module body propagates to the caller.

**How to avoid:** Keep module-level code to pure declarations. All file I/O goes inside exported function bodies, wrapped in try/catch.

**Warning signs:** Any `fs.*` call at the top level outside a function body.

---

### Pitfall 2: getStatus() fileSize field

**What goes wrong:** `render.cjs` `runStatus()` does `(status.fileSize / 1024).toFixed(1)` — if `fileSize` is undefined or NaN, this prints "NaN KB".

**Why it happens:** getStatus() returns an object and the caller accesses `status.fileSize` directly.

**How to avoid:** Always return a numeric `fileSize` — use `0` as default when the events file doesn't exist yet.

---

### Pitfall 3: readEvents() with empty or missing file

**What goes wrong:** `fs.readFileSync` throws `ENOENT` when no events have been written yet.

**Why it happens:** First run — events.jsonl hasn't been created.

**How to avoid:** Wrap in try/catch, return `[]` on any error.

---

### Pitfall 4: Ignoring PDE_TEST_DIR

**What goes wrong:** Telemetry writes go to the real `~/.pde/` during tests, polluting the developer's environment.

**Why it happens:** `render.cjs` already has `process.env.PDE_TEST_DIR || os.homedir()` — the telemetry module must mirror this.

**How to avoid:** Use the same `process.env.PDE_TEST_DIR || os.homedir()` pattern in `getTelemDir()`.

---

### Pitfall 5: Verification of BRAND-04/BRAND-05 must be runtime, not textual

**What goes wrong:** Phase 7 declared BRAND-04 and BRAND-05 satisfied based on grep checks of banner() call arguments. The crash was not caught because verification was textual, not executed.

**Why it happens:** Grep finds zero GSD strings and passes — but never actually runs `render.cjs`.

**How to avoid:** Phase 9 verification must execute `node lib/ui/render.cjs banner "TEST"` and confirm it exits 0 and produces output. This is the correct smoke test.

---

## Code Examples

### Complete telemetry.cjs skeleton (authoritative contract)

Derived directly from render.cjs usage (HIGH confidence — read from source):

```javascript
// lib/telemetry.cjs
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TRACKING_PLAN_VERSION = 'v1';

function getTelemDir() {
  const baseDir = process.env.PDE_TEST_DIR || os.homedir();
  return path.join(baseDir, '.pde', 'telemetry');
}

function ensureTelemDir() {
  fs.mkdirSync(getTelemDir(), { recursive: true });
}

function getConsentPath() {
  return path.join(getTelemDir(), 'consent.json');
}

function getEventsPath() {
  return path.join(getTelemDir(), 'events.jsonl');
}

// --- Session ID ---
let _sessionId = null;

function getSessionId() {
  if (!_sessionId) {
    const crypto = require('node:crypto');
    _sessionId = crypto.randomBytes(8).toString('hex');
  }
  return _sessionId;
}

// --- Tracking plan version ---
function getTrackingPlanVersion() {
  return TRACKING_PLAN_VERSION;
}

// --- Consent ---
function checkConsent(version) {
  try {
    const data = JSON.parse(fs.readFileSync(getConsentPath(), 'utf8'));
    return data.accepted === true && data.version === version;
  } catch (_) {
    return false;
  }
}

function saveConsent(version) {
  try {
    ensureTelemDir();
    fs.writeFileSync(getConsentPath(), JSON.stringify({
      version,
      accepted: true,
      timestamp: new Date().toISOString()
    }), 'utf8');
  } catch (_) {
    // Telemetry must never crash the main process
  }
}

// --- Events ---
function appendEvent(event) {
  try {
    ensureTelemDir();
    fs.appendFileSync(getEventsPath(), JSON.stringify(event) + '\n', 'utf8');
  } catch (_) {
    // Telemetry must never crash the main process
  }
}

function readEvents(filterType) {
  try {
    const raw = fs.readFileSync(getEventsPath(), 'utf8');
    const events = raw.trim().split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch (_) { return null; } })
      .filter(Boolean);
    return filterType ? events.filter(e => e.type === filterType) : events;
  } catch (_) {
    return [];
  }
}

// --- Status ---
function getStatus() {
  const consentPath = getConsentPath();
  const eventsPath = getEventsPath();
  let consented = false;
  let version = TRACKING_PLAN_VERSION;
  let eventCount = 0;
  let fileSize = 0;
  let lastEvent = null;

  try {
    const data = JSON.parse(fs.readFileSync(consentPath, 'utf8'));
    consented = data.accepted === true;
    version = data.version || version;
  } catch (_) {}

  try {
    const stat = fs.statSync(eventsPath);
    fileSize = stat.size;
  } catch (_) {}

  const events = readEvents(null);
  eventCount = events.length;
  if (events.length > 0) {
    lastEvent = events[events.length - 1].timestamp || null;
  }

  return { consented, version, eventCount, fileSize, lastEvent };
}

module.exports = {
  getTrackingPlanVersion,
  checkConsent,
  saveConsent,
  getSessionId,
  appendEvent,
  readEvents,
  getStatus,
};
```

### Smoke test — verify fix works

```bash
# Run from project root. Exit code 0 and visible banner output = pass.
node "${CLAUDE_PLUGIN_ROOT:-$(pwd)}/lib/ui/render.cjs" banner "PHASE 9 TEST"

# Should output something like:
# ████████████████████ PHASE 9 TEST ████████████████████

# If telemetry.cjs still missing:
# Error: Cannot find module '../telemetry.cjs'
```

### Verify full command surface loads

```bash
# Test that all commands are reachable (not just banner)
node lib/ui/render.cjs panel "TITLE" --type info --content "body text"
node lib/ui/render.cjs progress "Loading" --percent 50
node lib/ui/render.cjs checkpoint "CHECKPOINT: Test"
node lib/ui/render.cjs divider
node lib/ui/render.cjs splash
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GSD-branded banner strings | PDE-branded stage names | Phase 7 | Already done — source is correct |
| Telemetry module exists (in GSD source) | Module missing in PDE fork | Forking from GSD | Root cause of this phase |
| Textual grep to verify UI | Runtime execution of render.cjs | Phase 9 (new) | Catches runtime crashes that grep misses |

**Key insight:** The GSD → PDE fork operation created the plugin repo but did not include `lib/telemetry.cjs`. This file may have existed in the original GSD installation (`~/.gsd/lib/telemetry.cjs`) but was never present in this plugin repository. The fork only captured files that were reviewed and copied.

---

## Open Questions

1. **Does GSD source have a telemetry.cjs to reference?**
   - What we know: `find $HOME -name "telemetry.cjs"` returned nothing. No GSD source available.
   - What's unclear: Whether GSD had a different API surface.
   - Recommendation: Derive the implementation from render.cjs call sites (which we have in full). No reference implementation needed — the contract is fully knowable from the callers.

2. **Should telemetry be truly functional or a stub?**
   - What we know: `render.cjs` has fully implemented consent gates, event tracking, and show-data commands. It expects a real implementation.
   - What's unclear: Whether the PDE alpha actually needs functioning telemetry.
   - Recommendation: Implement fully functional telemetry. A stub (functions that do nothing) would satisfy the crash fix but would make the `consent`, `track-*`, and `telemetry` commands useless. The file is small (~100 lines) and the full implementation costs nothing extra.

---

## Validation Architecture

`nyquist_validation` is enabled (`config.json` confirms). Testing applies.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in (no test framework detected in project) |
| Config file | none — bash smoke tests only |
| Quick run command | `node lib/ui/render.cjs banner "SMOKE TEST"` |
| Full suite command | See Phase Requirements → Test Map below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-04 | `render.cjs banner` executes without MODULE_NOT_FOUND and renders output | smoke | `node lib/ui/render.cjs banner "PDE TEST" 2>&1; echo "exit:$?"` — expect exit:0 and block-char output | ❌ Wave 0: `lib/telemetry.cjs` must be created |
| BRAND-05 | `render.cjs splash` runs without crash and displays PDE logo | smoke | `node lib/ui/render.cjs splash 2>&1; echo "exit:$?"` — expect exit:0 | ❌ Wave 0: `lib/telemetry.cjs` must be created |
| BRAND-05 | All render.cjs commands load cleanly (panel, progress, checkpoint, divider) | smoke | `for cmd in panel progress checkpoint divider; do node lib/ui/render.cjs $cmd "TEST" 2>&1; done` | ❌ Wave 0: `lib/telemetry.cjs` must be created |

### Sampling Rate

- **Per task commit:** `node lib/ui/render.cjs banner "SMOKE TEST" 2>&1; echo "exit:$?"`
- **Per wave merge:** Full set of render.cjs command checks above
- **Phase gate:** All render.cjs commands exit 0 before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `lib/telemetry.cjs` — covers BRAND-04, BRAND-05 (the entire phase deliverable)

*(No test framework gaps — project uses bash smoke tests; no framework install needed.)*

---

## Sources

### Primary (HIGH confidence)

- `lib/ui/render.cjs` (read directly) — complete list of `telemetry.*` calls at lines 51, 54, 96, 143, 146, 159, 162, 171, 174, 182, 185, 192, 195, 225, 280, 331, 334
- `.planning/v1.0-MILESTONE-AUDIT.md` (read directly) — authoritative crash evidence, affected file count, requirement linkage
- `.planning/REQUIREMENTS.md` (read directly) — BRAND-04, BRAND-05 definitions
- `lib/ui/components.cjs` (read directly) — confirmed: banner() takes a stage name string; no "PDE ►" prefix in the function itself
- `references/ui-brand.md` (read directly) — confirmed: "PDE ►" inline pattern is listed as an ANTI-PATTERN; banners use block chars

### Secondary (MEDIUM confidence)

- `.planning/phases/07-rebranding-completeness/07-02-SUMMARY.md` — prior Phase 7 verification scope (why crash wasn't caught: textual grep only)
- `.planning/STATE.md` — project decisions log confirming Phase 7 BRAND-04/BRAND-05 scope

### Tertiary (LOW confidence)

- None — everything derived from direct source inspection.

---

## Metadata

**Confidence breakdown:**

- Root cause: HIGH — confirmed by `node lib/ui/render.cjs banner "TEST"` returning `Cannot find module '../telemetry.cjs'`
- Required API surface: HIGH — derived by reading every `telemetry.*` call in render.cjs source
- Implementation approach: HIGH — standard Node.js built-ins, same patterns already in project
- File path: HIGH — `../telemetry.cjs` relative to `lib/ui/render.cjs` is unambiguous

**Research date:** 2026-03-15
**Valid until:** 2026-04-14 (stable domain — Node.js CJS module loading is unchanged)
