# Phase 70: Hook Integration and Delivery Architecture - Research

**Researched:** 2026-03-20
**Domain:** Claude Code hook system, NDJSON event stream gating, /tmp file delivery, Getting Started documentation
**Confidence:** HIGH — all key technical claims verified against official Claude Code docs, GitHub issues, and direct codebase inspection of the existing v0.8/v0.9 hook infrastructure.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DLVR-01 | idle_prompt Notification hook registered in hooks.json with async: true and idle_prompt matcher | Verified: Notification hook type exists in Claude Code docs; idle_prompt matcher confirmed; async: true pattern already used by all existing hooks |
| DLVR-02 | Hook handler produces zero stdout — all suggestion output written to /tmp/pde-suggestions-{sessionId}.md only | Verified: Claude Code displays hook stdout directly in conversation pane; zero-stdout constraint is enforced by the hook system itself |
| DLVR-03 | Suggestion updates gated on meaningful PDE events (phase_started, phase_complete, plan_started) from NDJSON stream — not on every idle_prompt fire | Verified: idle_prompt fires on every Claude Code turn boundary, not just after PDE phases; gating requires tail-read of session NDJSON |
| DLVR-04 | All suggestion state files written to /tmp/ — zero files in .planning/ from suggestion system | Verified: /tmp/pde-session-{id}.ndjson precedent from v0.8; suggestion file must follow same pattern |
| DLVR-05 | Getting Started documentation updated with messageIdleNotifThresholdMs: 5000 recommendation for ~/.CLAUDE.json | Verified: setting confirmed implemented (GitHub issue #13922, March 6 2026); lives in ~/.CLAUDE.json not settings.json; default is 60000ms |
</phase_requirements>

---

## Summary

Phase 70 establishes the delivery contract for the idle suggestion system before any suggestion content is authored. The work is entirely infrastructure: wiring the Claude Code `Notification`/`idle_prompt` hook, implementing a handler that writes to `/tmp/` with zero stdout, gating suggestion file updates on meaningful PDE phase events from the NDJSON stream, and documenting the `messageIdleNotifThresholdMs` threshold configuration for users.

The existing v0.8 event infrastructure provides the complete reference implementation. `hooks/emit-event.cjs` demonstrates the exact stdin-read → JSON parse → spawnSync → exit 0 pattern the new handler must follow. `bin/lib/event-bus.cjs` defines the NDJSON session file path (`/tmp/pde-session-{sessionId}.ndjson`) that the handler reads to determine whether a meaningful PDE event has occurred since the last `idle_prompt` fire. The session ID is stored in `.planning/config.json` under `monitoring.session_id` and is the key for resolving both the NDJSON path and the suggestion output file path.

The most important architectural constraint for this phase is the gating logic: `idle_prompt` fires on every Claude Code turn boundary, potentially hundreds of times per session. The handler must tail the last 20 lines of the NDJSON file and check whether the most recent meaningful event is a `phase_started`, `phase_complete`, or `plan_started` event. If the last meaningful event has already been processed (tracked by a "last-processed event timestamp" written alongside the suggestion file), the handler exits silently without updating the suggestion file. This single gating check is the difference between a useful delivery system and one that generates constant I/O.

**Primary recommendation:** Model the new `hooks/idle-suggestions.cjs` file directly on `hooks/emit-event.cjs` — same module shape, same exit 0 guarantee, same spawnSync pattern for calling `pde-tools.cjs`. The only additions are: read the session NDJSON tail to check for a meaningful PDE event, write the suggestion file to `/tmp/` if a new event exists, and do nothing otherwise.

---

## Standard Stack

### Core (All Existing — Zero New Dependencies)

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Claude Code `Notification` hook with `idle_prompt` matcher | Current (verified 2026-03) | Detect when Claude Code is waiting for user input | Only correct primitive for user-facing idle detection; fires when agent is genuinely done waiting, not during processing pauses |
| `messageIdleNotifThresholdMs` setting in `~/.CLAUDE.json` | Current (confirmed 2026-03) | Control how quickly idle_prompt fires | Default 60s makes suggestions stale; 5000ms gives near-immediate delivery; lives in `~/.CLAUDE.json`, not project `settings.json` |
| Node.js `fs` built-in | Node 18+ (project standard) | Read NDJSON tail, write suggestion file to /tmp/ | Same pattern as `event-bus.cjs` safeAppendEvent(); already in every hook handler |
| Node.js `child_process.spawnSync` | Node 18+ (project standard) | Call `pde-tools.cjs session-id` from hook handler | Same pattern as `emit-event.cjs`; 5000ms timeout cap already established |
| Node.js `os.tmpdir()` | Node 18+ (project standard) | Resolve /tmp/ path cross-platform | Same pattern as `event-bus.cjs` |
| `hooks/hooks.json` | PDE standard | Register the Notification hook entry | Already contains SubagentStart/Stop, PostToolUse, SessionStart/End; add Notification block |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `crypto.randomUUID` | Built-in | Generate idempotency marker for last-processed event | Write alongside suggestion file so handler can detect "already processed this event" |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Notification`/`idle_prompt` hook | `Stop` hook | Stop fires after every response including active agent phases — generates suggestion spam; idle_prompt fires only when Claude is waiting for user input |
| `/tmp/pde-suggestions-{sessionId}.md` file write | stdout from hook handler | Claude Code displays hook stdout in conversation pane — this IS the interruption we are trying to avoid |
| NDJSON tail-read for event gating | Reading `.planning/STATE.md` for phase context | STATE.md reflects workflow-level state, not event-level; tail-read of NDJSON is cheaper and more precise for "did a PDE phase event just fire?" |

**Installation:** No new packages. Zero npm install steps.

---

## Architecture Patterns

### Phase 70 File Inventory

```
hooks/
├── hooks.json                    MODIFIED: add Notification/idle_prompt entry
├── emit-event.cjs                UNCHANGED: reference implementation
└── idle-suggestions.cjs          NEW: ~80 LOC, zero stdout, /tmp/ file write

/tmp/
├── pde-session-{sessionId}.ndjson  EXISTING: NDJSON event stream (read by handler)
└── pde-suggestions-{sessionId}.md  NEW: suggestion output file (written by handler)

GETTING-STARTED.md               MODIFIED: add messageIdleNotifThresholdMs section
```

### Pattern 1: Zero-Stdout Hook Handler

**What:** The idle-suggestions hook handler reads stdin, checks NDJSON for a meaningful event, and writes to /tmp/ only. No stdout, no stderr, always exits 0.

**When to use:** Whenever a Claude Code hook must not inject content into the conversation pane.

**Example (mirrors emit-event.cjs structure):**
```javascript
// hooks/idle-suggestions.cjs
// Source: modeled on hooks/emit-event.cjs (HIGH confidence — primary source)
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const pdeTools = path.join(pluginRoot, 'bin', 'pde-tools.cjs');

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    // 1. Parse hook payload
    let hookData;
    try { hookData = JSON.parse(raw); } catch { process.exit(0); }

    // 2. Resolve session ID from config.json (same as event-emit pattern)
    const cwd = hookData.cwd || process.cwd();
    const configPath = path.join(cwd, '.planning', 'config.json');
    let sessionId = 'unknown';
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.monitoring && cfg.monitoring.session_id) {
        sessionId = cfg.monitoring.session_id;
      }
    } catch { /* swallow — use 'unknown' */ }

    // 3. Read last 20 lines of NDJSON to check for meaningful PDE event
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    if (!fs.existsSync(ndjsonPath)) { process.exit(0); } // no active session

    // 4. Gate: check if last phase event has already been processed
    // ... (gate logic: tail read + last-processed marker file) ...

    // 5. Write suggestion content to /tmp/ — ZERO stdout
    const suggPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.md`);
    fs.writeFileSync(suggPath, '# Suggestions\n\n(placeholder)\n', 'utf-8');

    // Phase 71 will populate real suggestion content here

  } catch { /* swallow all errors */ }
  process.exit(0); // always exit 0
});
```

### Pattern 2: Event-Gating Logic

**What:** On each `idle_prompt` fire, tail the last 20 lines of the session NDJSON. If the most recent event with type `phase_started`, `phase_complete`, or `plan_started` has a timestamp newer than what's stored in a marker file, process and update the suggestion file. Otherwise exit immediately.

**When to use:** Prevents suggestion file from being rewritten on every `idle_prompt` fire (which fires hundreds of times per session).

**Gate decision flow:**
```
idle_prompt fires
  │
  ▼
Read /tmp/pde-session-{id}.ndjson (last 20 lines)
  │
  ├─ No file → exit 0 (no active PDE session)
  │
  ▼
Find last event with type in [phase_started, phase_complete, plan_started]
  │
  ├─ No such event → exit 0 (no meaningful PDE activity this session)
  │
  ▼
Read /tmp/pde-suggestions-{id}.last-event-ts (if exists)
  │
  ├─ Event timestamp <= last-processed timestamp → exit 0 (already handled)
  │
  ▼
Write /tmp/pde-suggestions-{id}.md  (placeholder content, Phase 71 fills this)
Write /tmp/pde-suggestions-{id}.last-event-ts  (record processed timestamp)
exit 0
```

### Pattern 3: hooks.json Notification Registration

**What:** Add the `Notification` hook block to `hooks/hooks.json` with `async: true` and `idle_prompt` matcher.

**When to use:** Registering any Claude Code notification hook.

**Example:**
```json
// Source: https://code.claude.com/docs/en/hooks (HIGH confidence — official docs)
"Notification": [
  {
    "matcher": "idle_prompt",
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/idle-suggestions.cjs",
        "async": true
      }
    ]
  }
]
```

### Pattern 4: Getting Started Documentation Update

**What:** Add a new section to `GETTING-STARTED.md` documenting the `messageIdleNotifThresholdMs` configuration.

**When to use:** Any time a user-configurable `~/.CLAUDE.json` setting affects PDE behavior.

**Content to add:**
```markdown
## Idle Suggestion Threshold (Optional)

PDE surfaces productivity suggestions when Claude Code is idle between operations.
By default, Claude Code waits 60 seconds before firing the idle notification. To see
suggestions sooner, add this to `~/.CLAUDE.json`:

\`\`\`json
{
  "messageIdleNotifThresholdMs": 5000
}
\`\`\`

This makes suggestions appear after 5 seconds of idle time instead of 60 seconds.
```

### Anti-Patterns to Avoid

- **Stdout from hook handler:** Any output from `idle-suggestions.cjs` appears in the Claude Code conversation pane as an injected message. The handler must produce zero stdout. Use file writes to `/tmp/` only.
- **Writing suggestion state to `.planning/`:** Suggestion files would appear as unstaged git changes on every `git status`. All suggestion state is ephemeral session data — `/tmp/` only.
- **No event gating:** Without checking whether a meaningful PDE event has fired since the last `idle_prompt`, the suggestion file is rewritten hundreds of times per session. Gate on the NDJSON stream.
- **`async: false` on the Notification hook:** Synchronous hook execution blocks Claude Code's notification delivery pipeline. The idle_prompt hook must be `async: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting PDE session ID in hook handler | Custom session ID discovery logic | Read `config.json` monitoring.session_id (same as event-emit.cjs line 779) | Session ID already written by `session-start` at SessionStart; config.json is the canonical store |
| Hook handler stdin processing | New stdin reader | Copy `emit-event.cjs` lines 36-43 exactly | Pattern handles partial chunks, JSON parse failure, and always exits 0 |
| /tmp/ path resolution | `'/tmp/' + sessionId` hardcode | `path.join(os.tmpdir(), ...)` | os.tmpdir() is cross-platform; hardcoded /tmp/ fails on Windows (not current concern but good hygiene) |
| NDJSON tail read | File stream or readline | `fs.readFileSync` + string split + slice(-20) | Suggestion handler is short-lived; sync read of last 20 lines is fast and matches existing pde-tools.cjs patterns |

**Key insight:** Everything needed for Phase 70 already exists in the codebase. The work is assembly and gating logic, not new primitives.

---

## Common Pitfalls

### Pitfall 1: Hook Handler Produces stdout
**What goes wrong:** Any `console.log()` or process.stdout.write() in `idle-suggestions.cjs` is captured by Claude Code and injected into the conversation pane as text. This is the primary interruption path the feature is designed to avoid.
**Why it happens:** Developers test the handler by logging output; logging accidentally ships.
**How to avoid:** The handler writes only to `/tmp/` files. Add a comment at the top: `// ZERO STDOUT — all output to /tmp/ only. Claude Code displays hook stdout to the user.`
**Warning signs:** Running a test session and seeing suggestion content appear in the Claude Code conversation pane.

### Pitfall 2: idle_prompt Fires Without Gating
**What goes wrong:** `idle_prompt` fires after every Claude Code turn boundary — not just after PDE phases complete. Without gating, the suggestion file is rewritten hundreds of times per session including during short one-sentence exchanges where the user is mid-workflow.
**Why it happens:** The hook is wired and works, but the NDJSON event check is omitted.
**How to avoid:** The gating check (tail last 20 NDJSON lines, compare to last-processed marker) must be the first significant operation after parsing the hook payload. If no meaningful event is found, exit immediately.
**Warning signs:** `ls -lt /tmp/pde-suggestions-*` shows modification timestamps changing on every Claude Code turn.

### Pitfall 3: Session ID Resolution Fails Silently
**What goes wrong:** `config.json` may not exist or may not have `monitoring.session_id` (first run, before any PDE command). The handler crashes or uses 'unknown' and writes to the wrong `/tmp/` path.
**Why it happens:** Session ID is written by `session-start` at `SessionStart` event, but if the session started before hooks were installed, config.json may be stale.
**How to avoid:** Wrap the config.json read in try/catch (already done in `emit-event.cjs` line 779 pattern). If session ID is 'unknown', still write the file — `pde-suggestions-unknown.md` is a valid fallback path.
**Warning signs:** Hook handler silently exits without writing any file; no `pde-suggestions-*.md` appears in /tmp/ after a PDE session with meaningful events.

### Pitfall 4: Getting Started Documentation Ambiguity on Config File Location
**What goes wrong:** The documentation says "add to `~/.CLAUDE.json`" but users search for `settings.json` or put it in the project `.claude/settings.json`. The setting has no effect.
**Why it happens:** Claude Code has multiple config files; `~/.CLAUDE.json` is the global user config, not the project config.
**How to avoid:** The Getting Started section must explicitly name `~/.CLAUDE.json` (not `settings.json`, not `.claude/settings.json`) and include the exact JSON key `messageIdleNotifThresholdMs`. Confirmed correct key and file from GitHub issue #13922 (March 6 2026).
**Warning signs:** User reports "idle suggestions not appearing quickly" after adding the setting.

---

## Code Examples

Verified patterns from primary sources (the existing codebase):

### Reading Session ID From config.json
```javascript
// Source: bin/pde-tools.cjs lines 780-787 (HIGH confidence — primary source)
const configPath = path.join(cwd, '.planning', 'config.json');
let sessionId = 'unknown';
try {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (cfg.monitoring && cfg.monitoring.session_id) {
    sessionId = cfg.monitoring.session_id;
  }
} catch { /* config not found or unreadable — use 'unknown' session ID */ }
```

### NDJSON Session File Path
```javascript
// Source: bin/lib/event-bus.cjs line 51 (HIGH confidence — primary source)
const logPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
```

### Tail Last N Lines of NDJSON
```javascript
// Pattern for gating logic (HIGH confidence — Node.js built-ins)
function getLastNdjsonLines(filePath, n = 20) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// Check for meaningful PDE event
const MEANINGFUL_EVENTS = new Set(['phase_started', 'phase_complete', 'plan_started']);
const recentEvents = getLastNdjsonLines(ndjsonPath, 20);
const lastMeaningful = recentEvents.reverse().find(e => MEANINGFUL_EVENTS.has(e.event_type));
```

### Suggestion Marker File for Idempotency
```javascript
// Write marker to prevent reprocessing the same event on subsequent idle_prompt fires
const markerPath = path.join(os.tmpdir(), `pde-suggestions-${sessionId}.last-event-ts`);

// Check
let lastProcessedTs = null;
try { lastProcessedTs = fs.readFileSync(markerPath, 'utf-8').trim(); } catch { /* first run */ }
if (lastMeaningful && lastMeaningful.ts === lastProcessedTs) {
  process.exit(0); // already processed this event
}

// Write after updating suggestion file
fs.writeFileSync(markerPath, lastMeaningful.ts, 'utf-8');
```

### hooks.json Notification Block Location
```json
// Source: hooks/hooks.json (HIGH confidence — primary source)
// Add after "SessionEnd" block — the Notification block is a peer-level key under "hooks"
{
  "hooks": {
    "SubagentStart": [...],
    "SubagentStop": [...],
    "PostToolUse": [...],
    "SessionStart": [...],
    "SessionEnd": [...],
    "Notification": [                       // ADD THIS
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/idle-suggestions.cjs",
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for idle state with timer | `Notification`/`idle_prompt` hook | Claude Code current (2026) | Eliminates polling; event-driven, zero false positives from inference pauses |
| Desktop notifications (`notify-send`, `osascript`) | tmux-native file writes to /tmp/ | PDE v0.8 established pattern | Platform-agnostic; no OS permission requirements; matches PDE's terminal-native UX |
| Global idle notification threshold (60s default) | `messageIdleNotifThresholdMs` in `~/.CLAUDE.json` | Implemented March 6 2026 (GH #13922) | Users can tune to 5s for near-immediate suggestions vs 60s default |

**Deprecated/outdated:**
- Using `Stop` hook for idle detection: fires after every agent response including active phases; creates suggestion spam during automated workflows.
- Writing suggestion state to `.planning/`: pollutes project state, risks accidental git commits.

---

## Open Questions

1. **Exact NDJSON event type names for phase events**
   - What we know: v0.8 workflow instrumentation emits semantic workflow events; `phase_started` and `phase_complete` are referenced in REQUIREMENTS.md DLVR-03
   - What's unclear: The exact string values used — whether it's `phase_started` vs `phase_start`, `phase_complete` vs `phase_completed`
   - Recommendation: Read `workflows/execute-phase.md` or `workflows/plan-phase.md` to find the exact event-emit calls before implementing the gating logic. The handler must match these exact strings or gating never triggers.

2. **Suggestion file content for Phase 70 placeholder**
   - What we know: Phase 70 establishes the delivery contract; Phase 71 implements the suggestion engine that populates content
   - What's unclear: Should the Phase 70 placeholder write empty content, a "phase active" message, or nothing?
   - Recommendation: Write a minimal placeholder `# Suggestions\n\n_PDE is processing. Check back when the phase completes._\n` so the file exists and the tmux pane (Phase 73) can detect it without errors. This is the zero-state fallback until Phase 71 populates real content.

3. **cwd in idle_prompt hook payload**
   - What we know: `SubagentStart`/`Stop` payloads include `cwd`; `Notification` hook payload schema may differ
   - What's unclear: Whether the `Notification`/`idle_prompt` payload includes `cwd` for resolving config.json path
   - Recommendation: Check official Claude Code hooks docs for Notification payload schema. If `cwd` is absent, fall back to `process.cwd()` (same as emit-event.cjs line 33 pattern: `process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..')`).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — tests invoked directly with `node --test` |
| Quick run command | `node --test tests/phase-70/*.test.mjs` |
| Full suite command | `node --test tests/phase-69/*.test.mjs tests/phase-70/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DLVR-01 | Notification/idle_prompt entry present in hooks.json with async: true | unit | `node --test tests/phase-70/hook-registration.test.mjs` | Wave 0 |
| DLVR-02 | idle-suggestions.cjs contains no stdout calls | unit | `node --test tests/phase-70/zero-stdout.test.mjs` | Wave 0 |
| DLVR-03 | Handler does not write suggestion file when no meaningful PDE event in NDJSON | unit | `node --test tests/phase-70/event-gating.test.mjs` | Wave 0 |
| DLVR-04 | Suggestion file path resolves to /tmp/ not .planning/ | unit | `node --test tests/phase-70/file-path.test.mjs` | Wave 0 |
| DLVR-05 | GETTING-STARTED.md contains messageIdleNotifThresholdMs: 5000 and ~/.CLAUDE.json key | unit | `node --test tests/phase-70/docs-update.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-70/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-70/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-70/hook-registration.test.mjs` — covers DLVR-01: checks hooks.json for Notification/idle_prompt block with async: true
- [ ] `tests/phase-70/zero-stdout.test.mjs` — covers DLVR-02: reads idle-suggestions.cjs source, asserts no stdout/console.log calls
- [ ] `tests/phase-70/event-gating.test.mjs` — covers DLVR-03: mocks NDJSON with no phase events, asserts suggestion file not written; mocks with phase_complete event, asserts file written
- [ ] `tests/phase-70/file-path.test.mjs` — covers DLVR-04: asserts suggestion file path contains os.tmpdir(); asserts no .planning/ path in handler
- [ ] `tests/phase-70/docs-update.test.mjs` — covers DLVR-05: reads GETTING-STARTED.md, asserts messageIdleNotifThresholdMs: 5000 and ~/.CLAUDE.json present

---

## Sources

### Primary (HIGH confidence)
- `hooks/hooks.json` — existing hook registrations, async flags, matcher syntax, `${CLAUDE_PLUGIN_ROOT}` variable expansion
- `hooks/emit-event.cjs` — stdin-read → JSON parse → spawnSync → exit 0 reference implementation; zero-stdout pattern; error-swallowing contract
- `bin/lib/event-bus.cjs` — NDJSON session file path pattern `/tmp/pde-session-{sessionId}.ndjson`, safeAppendEvent() atomic write pattern
- `bin/pde-tools.cjs` lines 744-801 — session-start and event-emit implementations; config.json session ID read pattern
- `bin/monitor-dashboard.sh` — build_full_layout() and build_minimal_layout() functions; MIN_COLS/MIN_ROWS thresholds; existing 6-pane layout baseline
- `.planning/config.json` — confirmed `monitoring.session_id` field exists and is the canonical session ID store
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — Notification hook, idle_prompt matcher, async behavior, hook payload schema
- [GitHub Issue #13922](https://github.com/anthropics/claude-code/issues/13922) — `messageIdleNotifThresholdMs` confirmed implemented March 6 2026; exact `~/.CLAUDE.json` key and value format verified

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — milestone-level stack research for v0.10; verified key claims against official sources
- `.planning/research/PITFALLS.md` — milestone-level pitfalls research; nine pitfalls applicable across Phases 70-73; Pitfalls 1, 4, and 7 are directly Phase 70 concerns

### Tertiary (LOW confidence)
- [GitHub Issue #12048](https://github.com/anthropics/claude-code/issues/12048) — idle_prompt firing behavior nuances; not official docs but corroborated by issue #13922

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components are existing PDE built-ins or Node.js built-ins; no new dependencies
- Architecture: HIGH — directly modeled on emit-event.cjs which is already production code; gating logic uses same NDJSON path pattern as event-bus.cjs
- Pitfalls: HIGH — all four critical pitfalls for this phase are verified by either official Claude Code docs or direct codebase inspection; recovery strategies are LOW-cost

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain — Claude Code hook API and Node.js built-ins are stable; `messageIdleNotifThresholdMs` is newly confirmed so re-verify if Claude Code updates)
