# Phase 71: Suggestion Engine - Research

**Researched:** 2026-03-21
**Domain:** Node.js CJS module design — ranked suggestion list generation from file-based state
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Output format and visual style:**
- Lowercase tech-noir aesthetic — all text lowercase, underscore-separated labels, daemon-log feel
- Block elements (`█ ▒ ░`) with slash-fill lines (`////`) as category separators
- Block char intensity encodes resumption cost: `░` = low, `▒` = medium, `█` = high
- Fixed 32-char width for slash-fill lines
- Max 7 suggestions returned
- All categories always visible — empty categories show `-- none` rather than being hidden
- Stats footer line at bottom: `// gen:N shown:N cut:N budget:~Nmin`
- Category labels: `blocker`, `next_phase`, `review`, `think`
- Metadata per suggestion: `Nmin // resumption:low|med|high`

**Phase classification logic:**
- Event-type inference from the triggering NDJSON event: `plan_started` → plan, `phase_started` → check context, etc.
- DESIGN-STATE.md gets its own detection path: if file exists AND has incomplete stages → classify as `design`
- Fallback on unknown/missing state: empty zero-state message `// awaiting phase data...` — no suggestions until classification succeeds

**Ranking and priority model:**
- Fixed priority order: `blocker` > `next_phase` > `review` > `think`
- Blockers always first (ENGN-03 requirement)
- Upcoming-phase prep prioritized over artifact reviews (forward-looking over retrospective)
- Knowledge capture prompts (`think`) lowest priority
- Time-bounded filtering uses fixed heuristics per phase type: research 5-10min, plan 3-5min, execute 10-30min per task
- Tiebreaker within category: lower resumption cost wins
- Suggestions exceeding estimated remaining time are filtered out (counted in stats footer `cut:N`)

**Integration seam with hook handler:**
- Hook calls engine via direct `require('../bin/lib/idle-suggestions.cjs')` — no spawnSync overhead
- Minimal data contract: hook passes `cwd` (project root) and `event` (last meaningful NDJSON event object)
- Engine reads STATE.md, ROADMAP.md, DESIGN-STATE.md, and design-manifest.json itself (within the 3-file-read budget — STATE.md + ROADMAP.md + one of DESIGN-STATE.md or design-manifest.json)

### Claude's Discretion
- Whether engine returns JSON array (hook formats to markdown) or final markdown string — pick the cleanest testing/separation boundary
- Exact event-type-to-phase-category mapping logic
- How to extract upcoming phase info from ROADMAP.md within the read budget
- Internal data structures for suggestion candidates before ranking

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENGN-01 | Phase-aware suggestion engine reads STATE.md + DESIGN-STATE.md to classify current phase (research/plan/execute/design/validation/default) | STATE.md frontmatter (`extractFrontmatter`) gives `current_phase` and `status` without process.exit; DESIGN-STATE.md `[ ]` checkbox scan classifies design phase |
| ENGN-02 | Suggestion generation completes within 2-second budget with zero LLM calls and max 3 synchronous file reads | All reads use `fs.readFileSync`; no async, no network, no LLM; budget architecture documented below |
| ENGN-03 | Blockers from STATE.md blockers field appear as highest-priority suggestions above all other categories | `stateExtractField()` + blockers regex from STATE.md body; fixed category priority `blocker` > all others |
| ENGN-04 | Upcoming phase preview reads ROADMAP.md next-phase entry and surfaces 2-3 preparation prompts | `stripShippedMilestones()` (verified exported from `core.cjs`) strips past phases; unchecked phase regex finds next |
| ENGN-05 | Artifact-fed targeting reads design-manifest.json and critique outputs to include specific file paths and severity in suggestions | `readManifest(cwd)` from `design.cjs` returns null on missing file; filter `artifacts[*].status === 'complete'` for paths |
| ENGN-06 | Time-bounded micro-task calibration filters suggestions to match estimated remaining processing time (fixed heuristics: research 5-10min, execute 10-30min per task) | Fixed lookup table per phase category; `cut:N` in stats footer tracks filtered items |
</phase_requirements>

---

## Summary

Phase 71 builds `bin/lib/idle-suggestions.cjs` — a pure CJS module with zero npm dependencies that receives `{ cwd, event }` from the Phase 70 hook handler and returns a formatted markdown string representing a ranked suggestion list. The module sits entirely inside the existing `bin/lib/` pattern and reuses three already-written library modules: `state.cjs` for STATE.md parsing, `roadmap.cjs` for next-phase discovery, and `design.cjs` for artifact manifest reads. The 2-second, 3-file-read budget is achievable because all relevant data is already parsed synchronously by those libs.

The main engineering challenge in this phase is not parsing — it is the ranking and formatting pipeline. Candidates arrive from up to four sources (STATE.md blockers, ROADMAP.md next-phase, design-manifest.json artifacts, catalog static entries) and must be sorted by category priority, filtered by time budget, capped at 7, and rendered in the tech-noir block-character format. The catalog itself (`.planning/idle-catalog.md`) is Phase 72's responsibility; Phase 71 works with minimal static fallback entries so the engine is independently testable.

The cleanest testing/separation boundary is to have the engine **export a function that returns a plain markdown string** and also expose a secondary export of the raw ranked array for unit-test assertions. The hook handler calls the string export and writes it to `/tmp/pde-suggestions-{sessionId}.md`. The test harness can call the array export directly against fixture data without touching the file system.

**Primary recommendation:** Build `bin/lib/idle-suggestions.cjs` as a function-export CJS module that takes `{ cwd, event, catalogPath? }` and returns a markdown string; expose a second `rankSuggestions()` export for unit testing; follow the pattern established by `hooks/tests/verify-phase-70.cjs` for the test file.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in | Synchronous file reads | Zero-dep constraint; all `bin/lib/*.cjs` already use it |
| `node:path` | built-in | Cross-platform path joins | Project-wide standard |
| `node:os` | built-in | `os.tmpdir()` for /tmp/ paths | Established in hook handler |
| `node:assert` | built-in | Test assertions | Used by all phase test files |

### Supporting (Internal)

| Module | Path | Safe Functions | When to Use |
|--------|------|---------------|-------------|
| `frontmatter.cjs` | `bin/lib/frontmatter.cjs` | `extractFrontmatter()` — VERIFIED exported | STATE.md frontmatter parse (no process.exit) |
| `state.cjs` | `bin/lib/state.cjs` | `stateExtractField()` — safe; NOT `cmd*` wrappers | Blockers body parse; field extraction |
| `core.cjs` | `bin/lib/core.cjs` | `stripShippedMilestones()` — VERIFIED exported | ROADMAP.md past-milestone stripping |
| `design.cjs` | `bin/lib/design.cjs` | `readManifest()` — safe, returns null on missing | design-manifest.json artifact read |

**No npm install needed** — zero external dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
bin/lib/
├── idle-suggestions.cjs    # NEW — this phase's deliverable
├── frontmatter.cjs         # Reuse: extractFrontmatter() for STATE.md
├── state.cjs               # Reuse: stateExtractField() for blockers body parse
├── core.cjs                # Reuse: stripShippedMilestones() for ROADMAP.md
└── design.cjs              # Reuse: readManifest() for artifact paths

hooks/
├── idle-suggestions.cjs    # Phase 70 hook handler — replace placeholder block (lines 66-75)
hooks/tests/
└── verify-phase-71.cjs     # Test file — follow Phase 70 pattern
```

### Pattern 1: CJS Module Export with Dual Entry Points

Every `bin/lib/*.cjs` module exports functions that accept `cwd` as first argument. The new module follows this exactly. Dual exports enable unit-test isolation without a test framework.

```javascript
// bin/lib/idle-suggestions.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const { extractFrontmatter } = require('./frontmatter.cjs');
const { stateExtractField } = require('./state.cjs');
const { stripShippedMilestones } = require('./core.cjs');
const { readManifest } = require('./design.cjs');

// Primary export: returns a formatted markdown string
function generateSuggestions({ cwd, event, catalogPath }) {
  const state = loadStateData(cwd);
  const phaseType = classifyPhase(event, state, cwd);
  const candidates = gatherCandidates(cwd, phaseType, state, catalogPath);
  const { shown, cut } = rankAndFilter(candidates, phaseType);
  return formatOutput(shown, cut, phaseType);
}

// Secondary export: pure ranking logic, no file IO — used by unit tests
function rankSuggestions(candidates, phaseType) {
  // sort by category priority, then by resumption cost asc
}

module.exports = { generateSuggestions, rankSuggestions };
```

### Pattern 2: File-Read Budget Architecture (ENGN-02)

The 3-read budget is consumed in strict order of priority. Reading is aborted once the budget is exhausted.

```
Read 1: STATE.md                     (always — phase classification + blockers)
Read 2: ROADMAP.md                   (if phase classified — next-phase lookup)
Read 3: DESIGN-STATE.md              (if phase is 'execute' or 'design')
     OR design-manifest.json         (if DESIGN-STATE.md absent — artifact paths)
     OR catalogPath if provided      (optional catalog override from Phase 72)
```

All reads are synchronous `fs.readFileSync`. If a file is missing, return empty/null — never throw. The 2-second budget is satisfied because there are no async operations, no network calls, and no LLM invocations.

### Pattern 3: Phase Classification via NDJSON Event + STATE.md

The hook passes the last meaningful NDJSON event object. Classification uses event_type first, then cross-checks STATE.md frontmatter status field.

```javascript
const EVENT_TO_PHASE = {
  'plan_started':   'plan',
  'phase_started':  null,      // resolve from STATE.md current_phase
  'phase_complete': 'review',  // post-phase: surface review suggestions
};

function classifyPhase(event, stateData, cwd) {
  // 1. DESIGN-STATE.md incomplete stages → 'design' (highest specificity)
  //    check fs.existsSync, then scan for '[ ]' in content
  // 2. EVENT_TO_PHASE lookup on event.event_type
  // 3. STATE.md frontmatter status field normalization
  // 4. Fallback: 'default'
  // Zero-state: if nothing resolves → return null → output '// awaiting phase data...'
}
```

### Pattern 4: Candidate Data Structure

Internal suggestion candidates before ranking:

```javascript
// Candidate shape (internal only — not exposed in exports)
{
  category: 'blocker' | 'next_phase' | 'review' | 'think',
  text: string,             // the suggestion text (lowercase)
  minutes: number,          // estimated time-to-complete
  resumption: 'low' | 'med' | 'high',
  filePath: string | null,  // artifact path if ENGN-05 applies
  source: 'blocker' | 'roadmap' | 'manifest' | 'catalog',
}
```

### Pattern 5: Output Format (Locked by Decisions)

```
// blocker ////////////////////
█ address: {blocker text}
  5min // resumption:high

// next_phase /////////////////
░ prep: review phase 72 catalog requirements
  3min // resumption:low

// review /////////////////////
-- none

// think //////////////////////
░ capture: what decisions shaped this phase?
  5min // resumption:low

// gen:8 shown:3 cut:5 budget:~20min
```

- Slash-fill lines are exactly 32 characters wide (ASCII only — safe across terminals)
- Block char (`░▒█`) maps to resumption cost (low/med/high) on suggestion lines only
- Empty categories show `-- none`
- Stats footer always present

### Pattern 6: Hook Integration Point (Phase 70 seam)

```javascript
// In hooks/idle-suggestions.cjs — REPLACE lines 66-75 (the placeholder block):
const { generateSuggestions } = require('../bin/lib/idle-suggestions.cjs');

const content = generateSuggestions({ cwd, event: lastMeaningful });
fs.writeFileSync(suggPath, content, 'utf-8');
```

### Anti-Patterns to Avoid

- **Never call `cmd*` functions from `state.cjs`, `roadmap.cjs`, or other lib files** — they call `output()` from `core.cjs` which calls `process.exit()`, killing the hook handler
- **Never write to stdout inside the library module** — zero stdout constraint from Phase 70 (DLVR-02) applies transitively
- **Never use async/await or Promises** — synchronous reads only; async would complicate the hook handler's stdin-on-end pattern
- **Never spawn child processes** — `spawnSync` adds ~50ms overhead and violates the integration contract
- **Never call `output()` or `error()` from `core.cjs`** — those call `process.exit()`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| STATE.md frontmatter parse | Custom YAML parser | `extractFrontmatter(raw)` from `frontmatter.cjs` | Verified exported; handles all STATE.md shapes; no process.exit |
| Blockers body extraction | Start-from-scratch regex | `stateExtractField(body, 'field')` + known-good blockers pattern from `cmdStateAddBlocker` | Pattern handles both `## Blockers` and `### Blockers/Concerns` forms |
| ROADMAP.md shipped milestone filtering | Custom `<details>` strip | `stripShippedMilestones(raw)` from `core.cjs` | Verified exported; already used by roadmap.cjs internally |
| Manifest artifact read | Direct JSON.parse on unknown path | `readManifest(cwd)` from `design.cjs` | Returns null on missing file; path resolution already correct |
| DESIGN-STATE.md incomplete stage detection | Complex parser | Simple `[ ]` checkbox regex on file body | This IS worth hand-rolling — it is two lines of code |

**Key insight:** The heavy parsing is already done in existing lib modules. This phase's work is the ranking/filtering/formatting pipeline, not new parsers.

---

## Common Pitfalls

### Pitfall 1: `process.exit()` Leaking from Imported Modules

**What goes wrong:** Calling `cmdStateSnapshot()`, `cmdRoadmapAnalyze()`, or any other `cmd*` function from the engine module kills the hook handler process. These functions call `output()` from `core.cjs` which calls `process.exit(0)`.

**Why it happens:** The `cmd*` functions are CLI-facing wrappers that assume they own the process lifecycle. The underlying utility functions (`stateExtractField`, `extractFrontmatter`, `readManifest`, `stripShippedMilestones`) do not call `process.exit`.

**How to avoid:** Use only the low-level utility functions listed in the Standard Stack table. Specifically, never call any function whose name starts with `cmd`.

**Warning signs:** Hook handler process exits silently after `require()`-ing the engine; suggestion file is never updated after the first event.

### Pitfall 2: Blockers Section Regex Mismatch

**What goes wrong:** The blockers section in STATE.md uses `## Blockers` or `### Blockers/Concerns` depending on template version. A narrow regex misses the second form, returning empty blockers even when blockers exist.

**Why it happens:** `cmdStateAddBlocker` in `state.cjs` handles both forms but the `cmdStateSnapshot` function uses only `## Blockers`. The body parsing must match the more flexible `cmdStateAddBlocker` pattern.

**How to avoid:** Use the known-good pattern from `cmdStateAddBlocker`:
```
/###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n([\s\S]*?)(?=\n###?|\n##[^#]|$)/i
```
Then filter out lines that are just `None` or `None yet`.

### Pitfall 3: ROADMAP.md Shipped Milestone Bleed

**What goes wrong:** Parsing ROADMAP.md for the next unchecked phase returns a phase number from v0.1–v0.9 (past milestones) because those phases also have unchecked checkboxes in the `<details>` blocks.

**Why it happens:** ROADMAP.md contains archived milestone sections in `<details>` blocks. The current milestone section follows those.

**How to avoid:** Call `stripShippedMilestones(raw)` from `core.cjs` before applying any phase-matching regex. This function is VERIFIED exported from `core.cjs`. Alternatively use the inline regex: `raw.replace(/<details>[\s\S]*?<\/details>/g, '')`.

### Pitfall 4: 3-File Budget Exceeded

**What goes wrong:** Reading STATE.md + ROADMAP.md + DESIGN-STATE.md + design-manifest.json = 4 reads, violating ENGN-02.

**Why it happens:** Natural temptation to read all four data sources for completeness.

**How to avoid:** The 3rd read slot is exclusive:
- If DESIGN-STATE.md exists and is non-empty → read it (design phase detection + incomplete stages)
- If DESIGN-STATE.md is absent → read design-manifest.json (artifact paths for ENGN-05)
- If a `catalogPath` option is provided → read that instead (Phase 72 catalog integration path)

### Pitfall 5: Slash-Fill Line Width Inconsistency

**What goes wrong:** Multi-byte Unicode block characters (█ ▒ ░) may occupy different widths in different terminals, causing alignment issues.

**Why it happens:** Unicode full-width vs half-width rendering is terminal-dependent.

**How to avoid:** The slash-fill separators are ASCII-only (`////`) and safe. Block chars appear only as the leading character of each suggestion line, not in separators. The 32-char width constraint applies only to the slash-fill separator lines.

```javascript
function slashFill(label, totalWidth) {
  totalWidth = totalWidth || 32;
  const prefix = '// ' + label + ' ';
  const remaining = totalWidth - prefix.length;
  return prefix + '/'.repeat(Math.max(0, remaining));
}
// slashFill('blocker') → '// blocker ////////////////////'  (32 chars)
```

### Pitfall 6: Catalog Read Consuming a Required File Budget Slot

**What goes wrong:** If Phase 72 catalog read is treated as required (not optional), it displaces ROADMAP.md or DESIGN-STATE.md, breaking ENGN-04 or ENGN-05.

**Why it happens:** The catalog is Phase 72's deliverable, not Phase 71's. Phase 71 must work without it.

**How to avoid:** The `catalogPath` parameter is optional. Absent a catalog, Phase 71 uses static fallback suggestion strings embedded in the module (2-3 strings per category). Phase 72 passes a `catalogPath` to the engine to replace these.

---

## Code Examples

Verified patterns from existing codebase:

### Reading STATE.md Frontmatter (Safe — No process.exit)

```javascript
// Source: bin/lib/frontmatter.cjs — extractFrontmatter() VERIFIED exported
// Source: bin/lib/state.cjs — syncStateFrontmatter() populates fields
const { extractFrontmatter } = require('./frontmatter.cjs');
const fs = require('fs');
const path = require('path');

function loadStateData(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const fm = extractFrontmatter(raw) || {};
    // Also keep body for blockers section parsing
    const body = raw.replace(/^---\n[\s\S]*?\n---\n*/, '');
    return { fm, body };
  } catch {
    return { fm: {}, body: '' };
  }
}
// fm fields: current_phase, current_phase_name, status, milestone, progress.*
```

### Extracting Blockers from STATE.md Body (Safe)

```javascript
// Source: bin/lib/state.cjs — cmdStateAddBlocker() pattern, both section forms
function extractBlockers(body) {
  const match = body.match(
    /###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n([\s\S]*?)(?=\n###?|\n##[^#]|$)/i
  );
  if (!match) return [];
  return (match[1].match(/^-\s+(.+)$/gm) || [])
    .map(line => line.replace(/^-\s+/, '').trim())
    .filter(t => t && !/^none\.?$/i.test(t));
}
```

### Reading Manifest for Completed Artifacts (Safe)

```javascript
// Source: bin/lib/design.cjs — readManifest() returns null on missing file
const { readManifest } = require('./design.cjs');

function getCompletedArtifacts(cwd) {
  const manifest = readManifest(cwd); // null if no design-manifest.json
  if (!manifest || !manifest.artifacts) return [];
  return Object.values(manifest.artifacts)
    .filter(a => a.status === 'complete' && a.path)
    .map(a => ({ code: a.code, path: a.path, name: a.name }));
}
```

### Getting Next Phase from ROADMAP.md (Safe — using verified export)

```javascript
// Source: bin/lib/core.cjs — stripShippedMilestones() VERIFIED exported
const { stripShippedMilestones } = require('./core.cjs');
const fs = require('fs');
const path = require('path');

function getNextPhaseInfo(cwd) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  try {
    const raw = fs.readFileSync(roadmapPath, 'utf-8');
    const stripped = stripShippedMilestones(raw);
    // Find first unchecked phase in current milestone section
    const match = stripped.match(/-\s*\[ \]\s*\*\*Phase\s+(\d+):\s*([^*]+)\*\*/);
    if (!match) return null;
    return { number: match[1], name: match[2].trim() };
  } catch {
    return null;
  }
}
```

### Slash-Fill Separator Generation

```javascript
// Derived from locked visual spec in CONTEXT.md
function slashFill(label, totalWidth) {
  totalWidth = totalWidth || 32;
  const prefix = '// ' + label + ' ';
  const remaining = totalWidth - prefix.length;
  return prefix + '/'.repeat(Math.max(0, remaining));
}
// slashFill('blocker')    → '// blocker ////////////////////'
// slashFill('next_phase') → '// next_phase /////////////////'
```

### Stats Footer Generation

```javascript
function statsFooter(generated, shown, cut, budgetMin) {
  return '// gen:' + generated + ' shown:' + shown + ' cut:' + cut + ' budget:~' + budgetMin + 'min';
}
```

### Test File Pattern (Matching Phase 70 Style)

```javascript
// File: hooks/tests/verify-phase-71.cjs
// Source pattern: hooks/tests/verify-phase-70.cjs
'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.log('FAIL: ' + name + ' — ' + (e.message || e)); failed++; }
}

const ROOT = path.join(__dirname, '..', '..');
const { generateSuggestions, rankSuggestions } = require(
  path.join(ROOT, 'bin', 'lib', 'idle-suggestions.cjs')
);

// Tests call rankSuggestions() with fixture data — no real file IO needed
test('ENGN-03: blockers sort above next_phase candidates', () => {
  const candidates = [
    { category: 'next_phase', text: 'prep task', minutes: 5, resumption: 'low' },
    { category: 'blocker', text: 'resolve auth error', minutes: 10, resumption: 'high' },
  ];
  const { shown } = rankSuggestions(candidates, 'execute');
  assert.strictEqual(shown[0].category, 'blocker');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
```

---

## State of the Art

| Old Approach | Current Approach | Notes | Impact |
|--------------|------------------|-------|--------|
| Hook writes static placeholder | Hook calls `generateSuggestions()` from engine module | Phase 71 replaces placeholder block at lines 66-75 | Engine returns final markdown string |
| No suggestion state | `/tmp/pde-suggestions-{sessionId}.md` | Established and locked by Phase 70 | File path and naming not changeable |
| `cmd*` wrappers own process lifecycle | Engine exports pure utility functions | Engine must NEVER call `cmd*` functions | Use `extractFrontmatter`, `stateExtractField`, `readManifest`, `stripShippedMilestones` |

**Deprecated/outdated:**
- The placeholder block in `hooks/idle-suggestions.cjs` lines 67-75 will be replaced entirely in this phase

---

## Open Questions

1. **What fallback text does the engine use before Phase 72 provides the catalog?**
   - What we know: Phase 71 must be independently testable without `.planning/idle-catalog.md`; ENGN-01 through ENGN-06 tests must pass on day one
   - What's unclear: The exact wording of the static fallback suggestion strings for each category
   - Recommendation: Embed a minimal static fallback object covering all four categories (2-3 strings per category). Phase 72 drops in the catalog file, and the engine checks `catalogPath` first. No interface change needed.

*(Questions about `stripShippedMilestones` and `extractFrontmatter` exports are RESOLVED: both are confirmed exported from their respective modules via direct source read.)*

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:assert` + manual test runner (matching Phase 70 style) |
| Config file | none |
| Quick run command | `node hooks/tests/verify-phase-71.cjs` |
| Full suite command | `node hooks/tests/verify-phase-71.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENGN-01 | Engine classifies phase from STATE.md frontmatter + DESIGN-STATE.md + event type | unit | `node hooks/tests/verify-phase-71.cjs` | Wave 0 |
| ENGN-02 | Generation completes < 2s, zero LLM calls, max 3 file reads | integration | `node hooks/tests/verify-phase-71.cjs` | Wave 0 |
| ENGN-03 | Blockers appear first in ranked output above all other categories | unit | `node hooks/tests/verify-phase-71.cjs` | Wave 0 |
| ENGN-04 | Next-phase prep prompts sourced from ROADMAP.md next unchecked phase | unit | `node hooks/tests/verify-phase-71.cjs` | Wave 0 |
| ENGN-05 | Completed artifact file paths from design-manifest.json appear in suggestions | unit | `node hooks/tests/verify-phase-71.cjs` | Wave 0 |
| ENGN-06 | Suggestions filtered by phase-type time budget heuristics; `cut:N` reflects filtered count | unit | `node hooks/tests/verify-phase-71.cjs` | Wave 0 |

Tests use in-memory fixture data (no real STATE.md/ROADMAP.md file reads) to verify ranking and formatting logic in isolation. The integration test (ENGN-02 timing) uses `os.tmpdir()` temp directories with fixture files.

### Sampling Rate

- **Per task commit:** `node hooks/tests/verify-phase-71.cjs`
- **Per wave merge:** `node hooks/tests/verify-phase-71.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `hooks/tests/verify-phase-71.cjs` — covers ENGN-01 through ENGN-06; does not exist yet; must be created as Wave 1, Task 1 before any implementation tasks commit

*(No other gaps — test infrastructure (Node.js built-in assert, manual runner pattern) is already fully established by Phase 70)*

---

## Sources

### Primary (HIGH confidence)

- `hooks/idle-suggestions.cjs` — integration seam location, output file path, marker file path, event gating pattern
- `bin/lib/state.cjs` — `stateExtractField()` safe for import; `cmd*` wrappers call `process.exit()` (confirmed by source read)
- `bin/lib/frontmatter.cjs` — `extractFrontmatter()` VERIFIED in `module.exports`; pure utility, no `process.exit()`
- `bin/lib/core.cjs` — `stripShippedMilestones()` VERIFIED in `module.exports`; safe to import
- `bin/lib/design.cjs` — `readManifest()` returns null on missing file; safe to import
- `bin/lib/roadmap.cjs` — `cmd*` wrappers unsafe; `stripShippedMilestones` + direct regex is the safe path
- `.planning/phases/71-suggestion-engine/71-CONTEXT.md` — all locked decisions, integration contract
- `.planning/REQUIREMENTS.md` — ENGN-01 through ENGN-06 definitions
- `hooks/tests/verify-phase-70.cjs` — test file pattern to follow
- `.planning/phases/70-hook-integration-and-delivery-architecture/70-VALIDATION.md` — validation architecture template

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` — Phase 71 and Phase 72 success criteria; next-phase data structure confirmed by reading actual content
- `templates/design-manifest.json` — artifact schema shape (fields: code, name, path, status, type) confirmed by reading template

### Tertiary (LOW confidence)

None — all findings are from direct codebase reads. No WebSearch required for this internal implementation phase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are built-in Node.js or project-internal; exports verified by source read
- Architecture: HIGH — integration contract locked in CONTEXT.md; all function signatures verified by source read
- Pitfalls: HIGH — all pitfalls identified from direct source reading of `state.cjs`, `core.cjs`, `roadmap.cjs`, and the hook handler

**Research date:** 2026-03-21
**Valid until:** Stable — valid until next refactor of `bin/lib/*.cjs` module boundaries
