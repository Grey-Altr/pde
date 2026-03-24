---
phase: 129-hook-integration
plan: "01"
subsystem: context-sync
tags: [sync, reconciliation, ingest, mtime, write-back, tdd]
dependency_graph:
  requires: [128-01, 128-02, 127-01, 126-01, 126-02]
  provides: [SYN-04, SYN-05]
  affects: [bin/lib/context-sync.cjs, bin/pde-tools.cjs]
tech_stack:
  added: []
  patterns: [mtime-based change detection, 3-way merge write-back, TDD RED/GREEN]
key_files:
  created:
    - tests/phase-129/test-hook-integration.cjs
  modified:
    - bin/lib/context-sync.cjs
decisions:
  - replaceSectionInFile uses regex to locate ## heading + replace body up to next ## or EOF; returns false (not throw) when section not found
  - reconcileOnStart calls computeLoopBreak BEFORE parsing any changed file — files without PDE-GENERATED header also return 'skip' (prevents ingesting untracked files)
  - MONITORED_FILES placed near top of context-sync.cjs after WRITABLE_FIELDS for co-location with configuration
  - ingestAll processes pendingIngest queue before emitAll to prevent emitAll's pendingIngest reset from losing queued items
  - reconcileOnStart returns elapsed in ms (rounded integer) for performance test comparability
metrics:
  duration_seconds: 221
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 2
  tests_written: 12
  tests_passed: 12
  regressions: 0
---

# Phase 129 Plan 01: Hook Integration Summary

Session-start reconciliation (SYN-04) and manual ingest CLI (SYN-05) implemented: mtime-based change detection, computeLoopBreak gate, reverse parse, 3-way merge, PROJECT.md write-back, and idempotent emitAll re-normalization with `pde context-sync --ingest` routing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write failing tests (RED) | 3cb1891 | tests/phase-129/test-hook-integration.cjs |
| 2 | Implement MONITORED_FILES, replaceSectionInFile, reconcileOnStart, ingestAll, --ingest | 0a72e72 | bin/lib/context-sync.cjs, tests/phase-129/test-hook-integration.cjs |

## What Was Built

### MONITORED_FILES constant

Array of 7 monitored editor output paths with parser type mapping (mdc/skill/design). Placed at top of context-sync.cjs alongside WRITABLE_FIELDS for configuration co-location.

### replaceSectionInFile(filePath, sectionName, newContent)

Reads a markdown file, locates a `## SectionName` heading via regex, replaces the body between that heading and the next `##` heading (or EOF), and writes back atomically. Returns `true` if replaced, `false` if section not found. Used to write editor-wins `techStack` and `constraints` values back to PROJECT.md.

### parseMonitoredFile(absPath, entry)

Dispatcher helper: reads file content and routes to `parseMdcContent`, `parseSkillMd`, or `parseDesignMd` based on `entry.parser`. Returns partial IR or null.

### reconcileOnStart(cwd) — SYN-04

Session-start reconciliation:
1. Read state file; epoch-0 fallback on first run
2. For each of 7 MONITORED_FILES: statSync for mtime, skip if mtime <= lastEmittedAt + 500ms grace
3. For newer files: read content, call computeLoopBreak — skip if 'skip'
4. Parse changed files via parseMonitoredFile
5. Build currentIR via buildContextIR
6. For each partial: mergePartialIR(base=state.lastIR, editor=partial, current=currentIR)
7. Write back editor-wins techStack/constraints to PROJECT.md via replaceSectionInFile
8. Call emitAll to re-normalize
9. Log to `.planning/logs/sync-reconciliation.log` with `scanned=N changed=N conflicts=N elapsed=Nms`
10. Return `{ filesScanned, changesDetected, conflicts, elapsed }` — non-fatal (try/catch)

### ingestAll(cwd) — SYN-05

Always-scan variant:
- Processes `pendingIngest` queue from state file BEFORE emitAll (emitAll resets it to [])
- Scans ALL 7 monitored files regardless of mtime
- computeLoopBreak gate per file
- Same merge + write-back flow as reconcileOnStart
- Calls emitAll at end to re-normalize and reset state
- Returns `{ filesScanned, changesDetected, conflicts }`
- Idempotent: after emitAll re-normalizes files, second run detects zero differences

### --ingest CLI routing

In `cmdContextSync`, added `--ingest` flag check BEFORE `--editor` check. Routes to `ingestAll(cwd)`. Outputs `"Ingest complete: scanned=N changed=N conflicts=N"` to stdout (or JSON in raw mode).

## Test Results

```
Phase 129: 12/12 tests GREEN
Phase 128: 20/20 tests GREEN (no regression)
Phase 127: 25/25 tests GREEN (no regression)
Phase 126: 15/15 tests GREEN (no regression)
Total: 72/72 tests GREEN
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 4 expectation corrected for computeLoopBreak behavior**
- **Found during:** Task 2 (GREEN phase, test run)
- **Issue:** Test 4 set a stub .mdc file's mtime to future and expected `changesDetected >= 1`, but stub files have no PDE-GENERATED header, so `computeLoopBreak` returns 'skip' for them (correct behavior — missing header means skip)
- **Fix:** Updated Test 4 to first run `emitAll` (which writes real PDE-GENERATED headers), then replace the hash with all-zeros to force `computeLoopBreak` to return 'proceed', then set future mtime
- **Files modified:** tests/phase-129/test-hook-integration.cjs
- **Commit:** 0a72e72

## Known Stubs

None — all functions are fully implemented and wired.

## Self-Check: PASSED
