---
phase: 145-agent-sdk-orchestrator
plan: 02
subsystem: infra
tags: [claude-agent-sdk, coordinator, orchestrator, dag-analysis, file-overlap, failure-summary, conflict-triage, tdd]

# Dependency graph
requires:
  - phase: 145-01
    provides: packages/dispatcher/lib/orchestrator.cjs with four SDK functions (analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts)
provides:
  - DispatchCoordinator with full orchestrator integration
  - DAG analysis runs once per coordinator lifetime (cached in this._dag)
  - File overlap warnings emitted as aggregator events (subtype: overlap_warning)
  - Failure summaries emitted as aggregator events (subtype: failure_summary) on session failure
  - Conflict triage stored in registry (conflictTriage field) on merge failure
  - All four orchestrator functions re-exported from packages/dispatcher entry point
affects:
  - 146-remote-dispatch (can use analyzeDag/checkFileOverlap from dispatcher package directly)
  - 147-dashboard (overlap_warning and failure_summary events visible to SSE consumers)
  - 148-tmux (same aggregator events visible to tmux output)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "_deps injection extended with four orchestrator functions (same pattern as Phase 144)"
    - "dispatchWave: orchestrator pre-flight (analyzeDag + checkFileOverlap) before parallel dispatch"
    - "_handleExit: non-blocking SDK calls wrapped in try/catch (failure never blocks session exit)"
    - "DAG result cached in this._dag — one analysis per coordinator object lifetime"
    - "TDD: test file written first (RED), then implementation (GREEN), test fixed for microtask timing"

# Key files
key-files:
  created:
    - tests/dispatcher/coordinator-sdk.test.cjs
  modified:
    - packages/dispatcher/lib/coordinator.cjs
    - packages/dispatcher/index.cjs

# Decisions
decisions:
  - "Cached _dag on coordinator instance (not module-level) — coordinator is single-use per parallel run; caching is per-run, not per-process"
  - "summarizeFailure called AFTER registry.update(status:'failed') — FAILED.json always written even if SDK throws"
  - "triageConflicts called AFTER registry.update(status:'merge_failed', conflicts) — status always set even if triage throws"
  - "Test 7 required double await Promise.resolve() flush to capture spawnSession callback from queue microtask chain"

# Metrics
metrics:
  duration: 10m
  completed_date: "2026-03-26T23:27:47Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 145 Plan 02: Wire Orchestrator into DispatchCoordinator Summary

**One-liner:** DispatchCoordinator now runs DAG analysis + file overlap checks before each wave, emits failure summaries and conflict triage via aggregator/registry, all via injectable _deps with 9 new integration tests.

## What Was Built

### Task 1: Wire orchestrator into DispatchCoordinator

Modified `packages/dispatcher/lib/coordinator.cjs`:

1. Added `require('./orchestrator.cjs')` at the top alongside Phase 144 module imports
2. Extended constructor `_deps` injection with four new orchestrator functions: `_analyzeDag`, `_checkFileOverlap`, `_summarizeFailure`, `_triageConflicts`, plus `_dag = null` cache field
3. Modified `dispatchWave()` to run:
   - `analyzeDag` once (cached in `this._dag`) before first wave
   - `checkFileOverlap` before every wave, emitting `overlap_warning` aggregator events for each overlapping pair
4. Modified `_handleExit()` (failure branch) to:
   - Call `summarizeFailure(sessionId)` after writing FAILED.json
   - Emit `failure_summary` aggregator event with session ID and summary text
   - Wrapped in try/catch — failure of summarizeFailure never blocks exit handler
5. Modified `_handleExit()` (merge failed branch) to:
   - Call `triageConflicts(result.conflicts, this._root)` after setting `status: 'merge_failed'`
   - Store result as `conflictTriage` in registry via `registry.update(sessionId, { conflictTriage: triage })`
   - Wrapped in try/catch — failure of triageConflicts never blocks exit handler
6. Updated JSDoc for constructor and module header to include Phase 145 references

Created `tests/dispatcher/coordinator-sdk.test.cjs`:
- 9 tests covering SDK-02 (DAG caching), SDK-03 (overlap warnings), SDK-04 (failure summaries), SDK-05 (conflict triage)
- Uses same `_deps` injection pattern as coordinator-smoke.test.cjs
- All deps stubbed with vi.fn() — no real filesystem, no real SDK

### Task 2: Update package entry point

Modified `packages/dispatcher/index.cjs`:
- Added `const orchestrator = require('./lib/orchestrator.cjs')` in Phase 145 modules block
- Added `...orchestrator` to the `module.exports` spread
- Updated JSDoc header to document Phase 145 exports
- External consumers can now import `analyzeDag`, `checkFileOverlap`, `summarizeFailure`, `triageConflicts` directly from `require('./packages/dispatcher')`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test microtask timing for Test 7**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** `getCapturedOnExit()` returned `undefined` in Test 7 because the ConcurrencyQueue dispatches via `Promise.resolve().then(run)` and `run` uses `Promise.resolve().then(factory)` — two microtask levels deep. After `await coord.dispatch()`, spawnSession hadn't been called yet.
- **Fix:** Added `await Promise.resolve(); await Promise.resolve()` before `getCapturedOnExit()` in Test 7. Also changed `expect(onExit(...)).resolves.not.toThrow()` to `await onExit(...)` (the return value is void, not a promise that throws).
- **Files modified:** `tests/dispatcher/coordinator-sdk.test.cjs`
- **Note:** Other tests work because getCapturedOnExit is called after a different await that happens to flush enough microtasks.

## Test Results

```
tests/dispatcher/coordinator-sdk.test.cjs    9 tests PASS (new)
tests/dispatcher/coordinator-smoke.test.cjs  9 tests PASS (regression: unchanged)
All 13 test files, 116 tests: ALL GREEN
```

## Acceptance Criteria Verification

- [x] `packages/dispatcher/lib/coordinator.cjs` contains `require('./orchestrator.cjs')`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `this._analyzeDag = deps.analyzeDag || analyzeDag`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `this._checkFileOverlap = deps.checkFileOverlap || checkFileOverlap`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `this._summarizeFailure = deps.summarizeFailure || summarizeFailure`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `this._triageConflicts = deps.triageConflicts || triageConflicts`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `this._dag = null`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `subtype: 'overlap_warning'`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `subtype: 'failure_summary'`
- [x] `packages/dispatcher/lib/coordinator.cjs` contains `conflictTriage: triage`
- [x] `tests/dispatcher/coordinator-sdk.test.cjs` exists with 9 tests
- [x] `tests/dispatcher/coordinator-smoke.test.cjs` still passes (no regressions)
- [x] `packages/dispatcher/index.cjs` contains `require('./lib/orchestrator.cjs')`
- [x] `packages/dispatcher/index.cjs` contains `...orchestrator`
- [x] All four orchestrator functions exported as `function` from package entry point

## Known Stubs

None — all wiring is complete and connected to real orchestrator.cjs functions.

## Self-Check: PASSED
