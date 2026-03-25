# Phase 129: Hook Integration — Research

**Researched:** 2026-03-24
**Domain:** Claude Code hook system (SessionStart, PostToolUse), mtime-based file change detection, debounce patterns, PROJECT.md write-back — all within Node.js CommonJS, zero npm dependencies
**Confidence:** HIGH

---

## Summary

Phase 129 wires together everything built in Phases 126-128: reverse parsers, the merge engine, and the state file infrastructure. It does this through three mechanisms: (1) `reconcileOnStart()` — a session-start sweep that scans monitored editor files for mtime changes since last emission; (2) `ingestAll()` — an always-scan variant invoked by CLI and by the hook; and (3) a `scanMonitoredFiles()` addition to the existing `PostToolUse` hook that piggybacks on `.planning/` write events to detect live .mdc changes and queue them in `pendingIngest`.

The two existing plans are architecturally complete. The primary research value is: (a) confirming the Claude Code hook payload schema (`cwd` is present in both SessionStart and PostToolUse events — confirmed via official docs); (b) benchmarking that 7x `fs.statSync` calls complete in ~0.18ms on macOS (under the 10ms overhead budget by a factor of 55x); and (c) identifying the one unspecified sub-problem in both plans — there is no existing `replaceSection()` utility for writing merged IR values back into PROJECT.md sections. This write-back function must be implemented as part of Plan 01.

The SessionStart hook does not currently exist as a standalone reconciliation hook. The plan correctly specifies adding `reconcileOnStart()` to `context-sync.cjs` and wiring it from either a new SessionStart hook entry or from the existing session-start flow in `pde-tools.cjs`.

**Primary recommendation:** Implement exactly as specified in the two existing plans, with one addition: write a `replaceSectionInFile(filePath, sectionName, newContent)` helper as part of Plan 01's implementation step, before implementing `reconcileOnStart`. All other interfaces are verified present and exported.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist in this project. Constraints are drawn from STATE.md decisions and prior phase summaries.

| Constraint | Source | Applies To |
|------------|--------|------------|
| Zero npm dependencies | Project invariant | All new code in context-sync.cjs and hook files |
| CommonJS only (`'use strict'`, `require()`) | Existing module format | No ESM import syntax |
| ZERO stdout from hooks | hooks/context-sync-hook.cjs contract comment | scanMonitoredFiles(), reconcileOnStart() hook integration |
| Always exit 0 from hooks | hooks/context-sync-hook.cjs contract comment | All hook code paths |
| Non-fatal pattern: catch all, stderr only, never throw | Phase 126 pattern, project-wide | All new functions in hook context |
| .planning/ is always canonical | Core architecture decision | planning-wins default, write-back to PROJECT.md not editor files |
| Loop-break gate via computeLoopBreak() must be called before reverse parse | STATE.md, Phase 126 | reconcileOnStart(), scanMonitoredFiles() |
| `pendingIngest: []` field exists in state file schema v1.0 | Phase 126 writeStateFile() | scanMonitoredFiles() queue target |
| Logs directory: `.planning/logs/` | archive-session.cjs and emit-event.cjs pattern | sync-reconciliation.log must go here |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYN-04 | Session-start reconciliation sweep — scan monitored editor files for mtime newer than lastEmittedAt; queue changed files; log to sync-reconciliation.log; complete in <500ms | readStateFile() provides lastEmittedAt; fs.statSync provides mtime; 7x statSync = ~0.18ms (confirmed benchmark); log dir .planning/logs/ exists |
| SYN-05 | `pde context-sync --ingest` CLI command — full scan, parse, merge, write-back; summary output; idempotent | cmdContextSync() routes via args; --ingest flag pattern already used for --editor; ingestAll() = always-scan variant of reconcileOnStart |
| CUR-03 | Live mtime detection — hook scan of .mdc files during .planning/ writes; 500ms grace period; 200ms debounce; pendingIngest queue; zero stdout; <10ms overhead | existing PostToolUse hook benchmarked; 7x statSync = 0.18ms; pendingIngest field present in state schema; debounce requires reading pendingIngest.detectedAt per entry |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | Built-in (Node 20) | `fs.statSync`, `fs.readFileSync`, `fs.writeFileSync`, `fs.mkdirSync`, `fs.appendFileSync` | Already used throughout context-sync.cjs; statSync is the right call for mtime (synchronous, no callback overhead) |
| `node:path` | Built-in | Path resolution for monitored files | Already used throughout |
| `node:test` | Built-in (Node 18+) | Test runner | Established in Phase 126; matches existing test files |
| `node:assert/strict` | Built-in | Assertions | Matches existing test files |
| `node:os` | Built-in | `os.tmpdir()` in test helpers | Matches Phase 126-128 test patterns |

### Supporting

None required — this phase is entirely built-in.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fs.statSync` for mtime | `chokidar v4` file watcher | Decision locked in STATE.md: mtime comparison in PostToolUse hooks is simpler, no dependency; chokidar deferred |
| Manual mtime comparison | `fs.watch` / `fs.watchFile` | macOS `fs.watch` is unreliable (documented in STATE.md); mtime comparison is O(N) statSync calls, completes in <1ms |
| Atomic write-rename for sync-reconciliation.log | `appendFileSync` direct | appendFileSync is appropriate for a log file (not a state file); same pattern as .sync-conflicts.log |

**Installation:** None required — all built-ins.

---

## Architecture Patterns

### Recommended Code Placement

```
bin/lib/context-sync.cjs
  [constants]     MONITORED_FILES             (near top, after WRITABLE_FIELDS/VALID_POLICIES)
  [functions]     replaceSectionInFile()      (after readFieldPolicy — new utility)
  [functions]     parseMonitoredFile()        (helper, after replaceSectionInFile)
  [functions]     reconcileOnStart()          (after parseMonitoredFile)
  [functions]     ingestAll()                 (after reconcileOnStart)
  [modified]      cmdContextSync()            (add --ingest flag check before --editor)
  [exports]       add MONITORED_FILES, reconcileOnStart, ingestAll

hooks/context-sync-hook.cjs
  [functions]     scanMonitoredFiles(cwd, state)   (after handleHookPayload — new helper)
  [modified]      handleHookPayload()              (integrate scan after hash check, before emitAll)

hooks/hooks.json
  [no change]     SessionStart reconciliation runs from session-start in pde-tools.cjs
                  OR a new SessionStart hook entry for reconcileOnStart

tests/phase-129/
  test-hook-integration.cjs   (new file — 16 tests)
```

**Note on SessionStart delivery:** The plans route `reconcileOnStart()` through a new `context-sync-session-start.cjs` hook OR through the existing `pde-tools.cjs session-start` case. The cleanest integration is to add a new dedicated hook registered in `hooks.json` for SessionStart, following the same pattern as `context-sync-hook.cjs` for PostToolUse. This keeps the reconciliation concern separate from session UUID generation.

### Pattern 1: MONITORED_FILES Constant with Parser Mapping

**What:** Array of objects pairing each relative path with its parser type and filename.

**When to use:** Any function that needs to iterate all monitored editor files in a consistent order.

```javascript
// Source: Plan 129-01-PLAN.md spec, verified against emitter output paths
const MONITORED_FILES = [
  { path: '.cursor/rules/pde-project.mdc',      parser: 'mdc', filename: 'pde-project.mdc' },
  { path: '.cursor/rules/pde-architecture.mdc', parser: 'mdc', filename: 'pde-architecture.mdc' },
  { path: '.cursor/rules/pde-design-tokens.mdc',parser: 'mdc', filename: 'pde-design-tokens.mdc' },
  { path: '.cursor/rules/pde-components.mdc',   parser: 'mdc', filename: 'pde-components.mdc' },
  { path: '.cursor/rules/pde-pipeline.mdc',     parser: 'mdc', filename: 'pde-pipeline.mdc' },
  { path: '.agent/skills/pde-design/SKILL.md',  parser: 'skill' },
  { path: 'DESIGN.md',                          parser: 'design' },
];
```

### Pattern 2: mtime Comparison with Grace Period

**What:** Compare `file.mtimeMs` against `Date.parse(state.lastEmittedAt) + GRACE_MS`. Use 500ms grace to avoid false positives from near-simultaneous PDE writes.

**When to use:** reconcileOnStart() and scanMonitoredFiles() — any time mtime is used to filter for human edits.

```javascript
// Source: Plan 129-02-PLAN.md spec, confirmed by official docs that mtime is millisecond-precision
const GRACE_MS = 500;
const lastEmitted = state && state.lastEmittedAt ? new Date(state.lastEmittedAt).getTime() : 0;

for (const entry of MONITORED_FILES) {
  const absPath = path.join(cwd, entry.path);
  let stat;
  try { stat = fs.statSync(absPath); } catch { continue; }  // missing = skip
  if (stat.mtimeMs > lastEmitted + GRACE_MS) {
    // File changed since last emission — candidate for ingest
  }
}
```

**Performance benchmark (macOS, confirmed 2026-03-24):** 7x `fs.statSync` calls complete in ~0.18ms. With read + parse overhead for detected changes, total hook overhead remains well under the 10ms target even in the worst case (all 7 files changed simultaneously).

### Pattern 3: Debounce via pendingIngest Timestamp Check

**What:** Before appending a file to `pendingIngest`, check if the same path already has an entry with `detectedAt` within DEBOUNCE_MS. If so, skip (idempotent queue).

**When to use:** `scanMonitoredFiles()` in the PostToolUse hook — rapid hook firings must not produce duplicate queue entries.

```javascript
// Source: Plan 129-02-PLAN.md spec
const DEBOUNCE_MS = 200;

function isDebouncedOut(pendingIngest, filePath) {
  if (!pendingIngest || !pendingIngest.length) return false;
  const now = Date.now();
  return pendingIngest.some(entry =>
    entry.path === filePath &&
    (now - new Date(entry.detectedAt).getTime()) < DEBOUNCE_MS
  );
}
```

### Pattern 4: replaceSectionInFile — The Missing Write-Back Utility

**What:** Read PROJECT.md, locate a `## SectionName` heading, replace the content until the next `## ` heading (or EOF) with new content, write file back.

**When to use:** When `mergePartialIR()` returns an editor-wins or editor-wins-no-conflict result for `techStack` or `constraints`. This is the only way to write merged values back into the `.planning/` canonical source.

**This utility is NOT currently in context-sync.cjs and must be added in Plan 01.**

```javascript
// Pattern: surgical section replacement in markdown
function replaceSectionInFile(filePath, sectionName, newContent) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var pattern = new RegExp(
    '(^##\\s+' + sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$\\n)([\\s\\S]*?)(?=^##\\s|$)',
    'im'
  );
  var replacement = '$1' + newContent.trim() + '\n\n';
  var updated = content.replace(pattern, replacement);
  if (updated === content) return false;  // section not found — no write
  fs.writeFileSync(filePath, updated, 'utf-8');
  return true;
}
```

**Field-to-file mapping for write-back:**
- `techStack` → PROJECT.md `## Tech Stack` section
- `constraints` → PROJECT.md `## Constraints` section (or `## Conventions`)
- `componentCatalog` → Not in PROJECT.md; skip (catalog is computed, not a section)
- `designTokens` → Not in PROJECT.md; skip (tokens come from design-manifest.json)

Only `techStack` and `constraints` need write-back to PROJECT.md. The other two fields are computed from design-manifest.json and cannot be written back via section replacement.

### Pattern 5: Atomic pendingIngest Queue Update

**What:** Read state file, append to pendingIngest, write state file back atomically using PID-based tmp path.

**When to use:** `scanMonitoredFiles()` — must use the same write-rename pattern established in Phase 126 to prevent corruption from concurrent hooks.

```javascript
// Pattern: read-modify-write state with atomic rename
function appendPendingIngest(planningDir, entry) {
  try {
    var state = readStateFile(planningDir) || {
      schemaVersion: '1.0',
      lastEmittedAt: null,
      lastSourceHash: null,
      lastIR: {},
      pendingIngest: [],
    };
    if (!Array.isArray(state.pendingIngest)) state.pendingIngest = [];
    state.pendingIngest.push(entry);
    var statePath = path.join(planningDir, '.context-sync-state.json');
    var tmpPath = statePath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, statePath);
  } catch (err) {
    process.stderr.write('[context-sync] pendingIngest write error: ' + err.message + '\n');
  }
}
```

### Pattern 6: reconcileOnStart Return Shape

**What:** Structured return object from reconcileOnStart() for both logging and test assertions.

```javascript
// Source: Plan 129-01-PLAN.md must_haves
// { filesScanned, changesDetected, conflicts, elapsed }
var result = {
  filesScanned: MONITORED_FILES.length,
  changesDetected: changedPaths.length,
  conflicts: totalConflicts,
  elapsed: Math.round(Number(process.hrtime.bigint() - start) / 1e6),  // ms
};
```

**Performance timing:** Use `process.hrtime.bigint()` for sub-millisecond precision. Return elapsed in ms (integer). The 500ms budget for 7-8 files is extremely generous given ~0.18ms for all statSync calls.

### Pattern 7: sync-reconciliation.log Format

**What:** Append-only log line per reconciliation run. Consistent format for both human readability and programmatic parsing.

```javascript
// Source: Plan 129-01-PLAN.md spec
var logDir = path.join(planningDir, 'logs');
fs.mkdirSync(logDir, { recursive: true });
var logLine = '[' + new Date().toISOString().slice(0, 19) + 'Z] reconcile: ' +
  'scanned=' + result.filesScanned + ' ' +
  'changed=' + result.changesDetected + ' ' +
  'conflicts=' + result.conflicts + ' ' +
  'elapsed=' + result.elapsed + 'ms\n';
fs.appendFileSync(path.join(logDir, 'sync-reconciliation.log'), logLine, 'utf-8');
```

### Anti-Patterns to Avoid

- **Stdout from hook functions:** Any `console.log()` or `process.stdout.write()` from code called during PostToolUse violates the zero-stdout contract. Use `process.stderr.write('[context-sync] ...')` for errors.
- **Throwing from scan/reconcile functions:** All errors must be caught and swallowed (or logged to stderr). Hook failures must never crash Claude Code execution.
- **Using mtime without grace period:** Without a 500ms grace window, PDE's own emitAll() writes may be detected as "external changes" due to filesystem timestamp resolution.
- **Calling fs.watch or chokidar:** Decision is locked (STATE.md): use mtime comparison, not file watchers.
- **Writing componentCatalog/designTokens back to PROJECT.md:** Only techStack and constraints have sections in PROJECT.md. Attempting to write the others will fail silently or corrupt the file. Skip write-back for these two fields.
- **processling pendingIngest in the hook itself:** The hook only QUEUES changes. Processing (parse + merge + emitAll) happens in `ingestAll()`, called either from `reconcileOnStart()` at session start or from `--ingest` CLI. The hook must not call `ingestAll()` synchronously — that would block and potentially exceed the 10ms budget.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| mtime-based change detection | chokidar, fs.watch | `fs.statSync().mtimeMs` comparison | Decision locked in STATE.md; statSync is synchronous, O(N), ~0.18ms for 7 files |
| Debounce | Lodash debounce, setTimeout | Manual timestamp check against pendingIngest | Zero deps; hook is synchronous; no event loop available for setTimeout-based debounce |
| Log rotation for sync-reconciliation.log | Rolling appender | Raw `fs.appendFileSync` | Phase 132 adds INF-06 for log trimming; do not conflate |
| NDJSON encoding | Custom serializer | `JSON.stringify(entry) + '\n'` | One line; handles all escaping; same pattern as .sync-conflicts.log |
| Section replacement regex | DOM parser, remark | Hand-rolled regex on `## SectionName` | Markdown section boundaries are well-defined; regex is 5 lines; no dep needed |
| Merge algorithm | Re-implement 3-way merge | `mergePartialIR()` from Phase 128 | Already exported; 20 tests green; do not duplicate |

**Key insight:** This phase connects existing infrastructure — it adds routing and a scan loop, not new algorithms. The complexity budget is in the write-back utility and the debounce correctness, not in the detection or merge logic.

---

## Common Pitfalls

### Pitfall 1: No replaceSectionInFile Utility Exists — Must Be Written

**What goes wrong:** Both plans specify "write merged values back to .planning/ source files" but there is no existing utility in context-sync.cjs to do this. Without it, `mergePartialIR()` returns a merged object that is never persisted, and `emitAll()` re-emits the old values.

**Why it happens:** Phases 126-128 established the merge machinery but not the write-back path. Phase 129 is the first phase that needs to update PROJECT.md sections.

**How to avoid:** Add `replaceSectionInFile(filePath, sectionName, newContent)` as a new internal helper in context-sync.cjs in Plan 01, before implementing `reconcileOnStart`. Test it explicitly (Test 3 exercises this indirectly).

**Warning signs:** Test 3 (reconcileOnStart calls reverse parser and merges) passes but .planning/ state does not reflect merged value.

### Pitfall 2: writeStateFile Resets pendingIngest to []

**What goes wrong:** Every call to `emitAll()` calls `writeStateFile(ir, planningDir)`, which always sets `pendingIngest: []`. If `scanMonitoredFiles()` appends to pendingIngest and then `emitAll()` fires immediately afterward, the queue is wiped.

**Why it happens:** Phase 126 designed writeStateFile to reset pendingIngest on every emission because the state file represents the post-emission baseline. The queue was intended for between-session use only.

**How to avoid:** In the PostToolUse hook flow (Plan 02), when changes are detected: call `ingestAll()` (which processes the queue and calls emitAll internally) rather than calling emitAll directly. This ensures pendingIngest is processed before being reset. The hook flow in Plan 02 is: scan → if changes → `ingestAll()` (not plain emitAll); if no changes → plain emitAll.

**Warning signs:** Test 11 (hook detects .mdc change, pendingIngest populated) passes but pendingIngest is empty immediately after.

### Pitfall 3: SessionStart Hook Payload Has cwd — Use It

**What goes wrong:** A SessionStart hook that tries to use `process.cwd()` instead of `hookData.cwd` will use the hook process's working directory, not the project root.

**Why it happens:** PostToolUse hook already handles this correctly (line 46 of context-sync-hook.cjs: `const cwd = (hookData && hookData.cwd) || process.cwd()`). A new SessionStart hook must replicate the same fallback.

**How to avoid:** Always extract cwd from hookData first: `const cwd = (hookData && hookData.cwd) || process.cwd()`. This is already the established pattern in context-sync-hook.cjs and archive-session.cjs.

**Warning signs:** reconcileOnStart runs but scans files relative to wrong directory (tmpdir or hooks/ dir).

### Pitfall 4: SessionStart stdout Goes to Claude — Reconcile Silently

**What goes wrong:** The official Claude Code docs confirm that SessionStart hooks exiting 0 with plain text stdout have that text added as context for Claude. If reconcileOnStart logs to stdout, Claude will see raw log output at session start.

**Why it happens:** Developers who test reconcileOnStart via node directly see stdout fine; but in Claude Code the output becomes LLM context injection.

**How to avoid:** The SessionStart reconciliation hook must produce zero stdout. All logging goes to sync-reconciliation.log file (not stdout). The reconcileOnStart() function signature must return a result object that the hook does not print. The hook exits silently after reconciliation.

**Warning signs:** Claude starts each session with "reconcile: scanned=7 changed=0..." as an injected context message.

### Pitfall 5: computeLoopBreak Must Be Called Before Parsing

**What goes wrong:** If `reconcileOnStart()` or `scanMonitoredFiles()` skips the `computeLoopBreak()` check and proceeds directly to parsing, PDE's own emitter output will be re-ingested as "editor changes" — creating a feedback loop.

**Why it happens:** The mtime check alone does not distinguish "PDE just wrote this" from "human just edited this". The 500ms grace period helps but doesn't eliminate all races.

**How to avoid:** Always call `computeLoopBreak(fileContent, planningDir)` after reading a changed file and before calling the parser. If result is `'skip'`, treat the file as unchanged and continue to next. This is the Phase 126 loop-break gate.

**Warning signs:** Every reconciliation sweep reports conflicts even when no human edits occurred.

### Pitfall 6: ingestAll Must Handle Null State File (First-Run Scenario)

**What goes wrong:** On first run (before any emitAll() call), readStateFile() returns null. If reconcileOnStart or ingestAll treats null state as an error, first-run fails silently and no editor content is ever ingested.

**Why it happens:** State file is written by writeStateFile() inside emitAll(). On a fresh project where context-sync is run for the first time, no state exists.

**How to avoid:** When `readStateFile()` returns null, treat `lastEmittedAt` as epoch (0ms). This causes all monitored files to appear "newer than last emission" — which is correct for first-run: parse everything. Test 10 in Plan 01 explicitly covers this.

**Warning signs:** Test 10 throws or returns error on first-run scenario.

---

## Code Examples

### Hook Payload Schema — Verified from Official Docs

SessionStart stdin payload (official docs, 2026):
```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../session.jsonl",
  "cwd": "/path/to/project",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```

PostToolUse stdin payload (official docs, 2026):
```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/project/.planning/PROJECT.md" },
  "tool_response": { "success": true }
}
```

**Key contract (official docs):** SessionStart exits 0 → plain text stdout is added as Claude context. Exit 2 → stderr shown in verbose mode only. Therefore SessionStart reconciliation hook MUST produce zero stdout.

### Full scanMonitoredFiles Sketch

```javascript
// Source: Plan 129-02-PLAN.md spec + Phase 126 atomic write pattern
var GRACE_MS = 500;
var DEBOUNCE_MS = 200;

function scanMonitoredFiles(cwd, state) {
  var lastEmitted = state && state.lastEmittedAt
    ? new Date(state.lastEmittedAt).getTime() : 0;
  var pendingIngest = (state && state.pendingIngest) ? state.pendingIngest : [];
  var planningDir = path.join(cwd, '.planning');
  var changed = [];

  for (var i = 0; i < MONITORED_FILES.length; i++) {
    var entry = MONITORED_FILES[i];
    var absPath = path.join(cwd, entry.path);
    var stat;
    try { stat = fs.statSync(absPath); } catch { continue; }
    if (stat.mtimeMs <= lastEmitted + GRACE_MS) continue;  // not changed

    // Debounce: skip if same file queued within 200ms
    var now = Date.now();
    var alreadyQueued = pendingIngest.some(function(e) {
      return e.path === entry.path &&
        (now - new Date(e.detectedAt).getTime()) < DEBOUNCE_MS;
    });
    if (alreadyQueued) continue;

    changed.push({ path: entry.path, detectedAt: new Date().toISOString() });
  }

  return changed;  // caller writes to pendingIngest
}
```

### Integration into handleHookPayload (Plan 02 change)

```javascript
// After hash change confirmed, before emitAll():
var { readStateFile, MONITORED_FILES, ingestAll } = require('../bin/lib/context-sync.cjs');
var state = readStateFile(planningDir);
var changed = scanMonitoredFiles(cwd, state);

if (changed.length > 0) {
  // Process queue immediately (ingestAll calls emitAll internally)
  ingestAll(cwd);
} else {
  // No editor changes — plain emitAll
  emitAll(cwd);
}
// Note: do NOT write hash marker here; ingestAll/emitAll updates state file
```

### Existing Interface Contracts (Verified Against Live Code)

```javascript
// From bin/lib/context-sync.cjs exports (lines 1298-1305, verified)
module.exports = {
  buildContextIR,        // returns full IR with techStack, constraints, etc.
  emitAll,               // writes all editor files + writeStateFile
  readStateFile,         // returns { schemaVersion, lastEmittedAt, lastSourceHash, lastIR, pendingIngest } | null
  writeStateFile,        // atomic write-rename with PID tmp path
  computeLoopBreak,      // returns 'skip' | 'proceed'
  parseMdcContent,       // returns partial IR | null
  parseSkillMd,          // returns partial IR | null
  parseDesignMd,         // returns partial IR | {} | null
  mergePartialIR,        // returns { merged, conflicts }
  // NOT YET EXPORTED (Phase 129 adds):
  // MONITORED_FILES, reconcileOnStart, ingestAll
};
```

---

## Environment Availability

Step 2.6: SKIPPED — pure JavaScript functions added to existing CommonJS modules; no external dependencies. Confirmed Node.js 20.20.0 available (`node --version` = v20.20.0).

---

## Runtime State Inventory

Step 2.5: SKIPPED — not a rename/refactor/migration phase; new functions added only.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node.js built-in, v20.20.0) |
| Config file | None — run directly with `node --test` |
| Quick run command | `node --test tests/phase-129/test-hook-integration.cjs 2>&1 \| tail -5` |
| Full suite command | `node --test tests/phase-129/test-hook-integration.cjs && node --test tests/phase-123/test-context-sync-hook.cjs && node --test tests/phase-128/test-merge-engine.cjs && node --test tests/phase-127/test-reverse-parsers.cjs && node --test tests/phase-126/test-sync-foundation.cjs` |

### Baseline Status (2026-03-24, confirmed via live run)

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/phase-126/test-sync-foundation.cjs` | 15/15 | GREEN |
| `tests/phase-127/test-reverse-parsers.cjs` | 25/25 | GREEN |
| `tests/phase-128/test-merge-engine.cjs` | 20/20 | GREEN |
| `tests/phase-123/test-context-sync-hook.cjs` | 7/7 | GREEN |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYN-04 | reconcileOnStart skips files with mtime older than lastEmittedAt | unit | `node --test tests/phase-129/test-hook-integration.cjs` | No — Wave 0 |
| SYN-04 | reconcileOnStart detects file with mtime newer than lastEmittedAt | unit | same | No — Wave 0 |
| SYN-04 | reconcileOnStart calls reverse parser and merges | unit | same | No — Wave 0 |
| SYN-04 | reconcileOnStart logs to sync-reconciliation.log | unit | same | No — Wave 0 |
| SYN-04 | reconcileOnStart performance < 500ms for 8 files | unit | same | No — Wave 0 |
| SYN-05 | ingestAll returns file/change/conflict counts | unit | same | No — Wave 0 |
| SYN-05 | ingestAll is idempotent (second run = zero writes) | unit | same | No — Wave 0 |
| SYN-05 | ingestAll calls emitAll() after merge | unit | same | No — Wave 0 |
| SYN-05 | ingestAll handles null state file (first-run) | unit | same | No — Wave 0 |
| CUR-03 | hook detects .mdc with mtime newer than lastEmittedAt + 500ms grace | unit | same | No — Wave 0 |
| CUR-03 | hook skips .mdc within 500ms grace period | unit | same | No — Wave 0 |
| CUR-03 | debounce prevents double-queuing within 200ms | unit | same | No — Wave 0 |
| CUR-03 | hook overhead < 10ms | unit | same | No — Wave 0 |
| CUR-03 | zero stdout during mtime scanning | unit | same | No — Wave 0 |
| CUR-03 | E2E: .mdc edit → hook detects → merge → emitAll re-normalizes | integration | same | No — Wave 0 |

### Sampling Rate

- **Per task commit (RED):** `node --test tests/phase-129/test-hook-integration.cjs 2>&1 | tail -5` — confirm new tests fail
- **Per task commit (GREEN):** full phase-129 suite
- **Per wave merge:** All 5 suites (phase-123, 126, 127, 128, 129)
- **Phase gate:** All 5 suites green before verification

### Wave 0 Gaps

- [ ] `tests/phase-129/` directory — must be created
- [ ] `tests/phase-129/test-hook-integration.cjs` — 16 tests covering SYN-04, SYN-05, CUR-03

*(No new framework config needed — node:test works without config files)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No session-start reconciliation | mtime sweep on start | Phase 129 | Between-session editor changes are captured automatically |
| Manual `pde context-sync` forced full overwrite | `--ingest` merges editor changes before re-normalizing | Phase 129 | Human edits survive re-normalization via 3-way merge |
| PostToolUse hook only calls emitAll() | PostToolUse hook also scans .mdc files for live changes | Phase 129 | Live editing sessions detect and queue human edits in real time |
| chokidar v4 (deferred) | mtime comparison in hooks | STATE.md decision | Simpler, zero dependency, sufficient for session-boundary use case |

---

## Open Questions

1. **SessionStart hook delivery: new file vs pde-tools.cjs session-start case**
   - What we know: Plans specify `reconcileOnStart()` in context-sync.cjs; hooks.json has a SessionStart entry that calls `emit-event.cjs` then `cleanup-old-sessions.cjs`
   - What's unclear: The cleanest delivery — new `context-sync-session-start.cjs` hook registered in hooks.json, OR augment the existing `session-start` case in pde-tools.cjs to also call reconcileOnStart
   - Recommendation: Add a new `context-sync-session-start.cjs` hook registered in hooks.json as a third SessionStart entry (`async: true`). This keeps reconciliation separate from UUID generation and avoids modifying the synchronous emit-event.cjs flow. The hook reads stdin, extracts cwd, calls reconcileOnStart(cwd), exits 0 with zero stdout.

2. **Write-back scope: which files receive merged values**
   - What we know: `buildContextIR()` reads `techStack` from `## Tech Stack` section in PROJECT.md and `constraints` from `## Constraints` section. `componentCatalog` is computed from a different source (plan files). `designTokens` is from design-manifest.json.
   - What's unclear: The exact section heading for constraints — PROJECT.md uses `## Constraints` but `extractSection` also checks `## Conventions` as fallback (line 358). `replaceSection` must target the heading that actually exists.
   - Recommendation: In `replaceSectionInFile`, try `## Constraints` first; if not found, try `## Conventions`. Or read the file first to detect which heading exists.

3. **pendingIngest processing: immediate vs deferred**
   - What we know: Plan 02 says "If any changes detected: call ingestAll (which includes emitAll) instead of plain emitAll." This means live hook changes are processed immediately (not deferred to next session start).
   - What's unclear: If `ingestAll()` is called from inside the PostToolUse hook, it completes synchronously within the hook invocation. The hook is registered `async: true` so this is fine — it won't block Claude Code execution.
   - Recommendation: Process immediately in the hook (as Plan 02 specifies). The pendingIngest queue is a safety net for session start, not the primary live-detection path.

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/context-sync.cjs` lines 840-894 — writeStateFile/readStateFile contracts verified directly; pendingIngest: [] field confirmed in writeStateFile schema
- `bin/lib/context-sync.cjs` lines 896-985 — mergePartialIR verified exported and functional; WRITABLE_FIELDS confirmed
- `bin/lib/context-sync.cjs` lines 1298-1305 — full exports list verified; MONITORED_FILES/reconcileOnStart/ingestAll confirmed absent (to be added)
- `bin/lib/context-sync.cjs` line 358 — buildContextIR reads constraints with `## Constraints` / `## Conventions` fallback confirmed
- `hooks/context-sync-hook.cjs` lines 1-103 — full hook structure verified; dependency injection pattern via opts confirmed; zero stdout contract documented
- `hooks/hooks.json` — confirmed PostToolUse hook matcher `"Write|Edit"`, async:true; SessionStart has two entries (emit-event, cleanup-old-sessions) — third slot available
- `tests/phase-123/test-context-sync-hook.cjs` — dependency injection pattern via makeOpts() confirmed; 7/7 tests green
- Official Claude Code hooks documentation (code.claude.com/docs/en/hooks) — SessionStart payload schema with `cwd` field confirmed; stdout-as-context behavior confirmed; exit code contracts confirmed
- Live benchmark: `node -e "7x fs.statSync"` = 0.176ms on macOS (2026-03-24)
- Live test runs: phase-123 7/7, phase-126 15/15, phase-127 25/25, phase-128 20/20 — all GREEN

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — chokidar deferral decision, accumulated constraints
- `.planning/REQUIREMENTS.md` — requirement text for SYN-04, SYN-05, CUR-03
- `.planning/phases/129-hook-integration/129-01-PLAN.md` — plan spec for reconcileOnStart, ingestAll, MONITORED_FILES
- `.planning/phases/129-hook-integration/129-02-PLAN.md` — plan spec for scanMonitoredFiles, debounce, E2E

### Tertiary (LOW confidence)

None — all claims verified directly against source files, official docs, or live test/benchmark runs.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — built-ins only; no library selection needed; matches established project patterns
- Architecture: HIGH — all interfaces verified against live code; statSync performance benchmarked; hook payload schema confirmed from official docs
- Pitfalls: HIGH — Pitfall 1 (missing replaceSectionInFile) discovered by code audit; Pitfalls 2-6 derived from code inspection and official docs review

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable codebase; no external dependency risk)
