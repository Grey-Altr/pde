---
phase: 192-git-based-state-sync
plan: "02"
subsystem: dispatcher
tags: [state-sync, git, coordinator, cloud-dispatch, testing, DI]

dependency_graph:
  requires:
    - phase: 192-01
      provides: sync.cjs with pushPlanningState, fetchPlanningState, mergePlanningFromCloud
  provides:
    - coordinator.cjs wired with sync.cjs: push before spawn, fetch+merge before session merge
    - Lock-based sequential merge ordering for concurrent cloud sessions
    - Fallback-to-local routing on push failure
    - Integration tests (SW-01 to SW-07) for all wiring paths
  affects: [cloud-dispatch-pipeline, coordinator-lifecycle, concurrent-merge-ordering]

tech-stack:
  added: []
  patterns:
    - "DI injection: pushPlanningState/fetchPlanningState/mergePlanningFromCloud injectable via _deps, matching existing coordinator DI pattern"
    - "CLOUD_BACKENDS array: ['docker', 'ssh', 'managed', 'cloud'] gate for push/fetch/merge bypass"
    - "let backend reassignment: const→let enables fallback_to_local backend downgrade"
    - "try/catch in _handleExit cloud sync: failure is non-fatal, mergeSession always runs"
    - "acquireLock/releaseLock wrapper around merge-back: prevents concurrent session merge race (SYN-04)"

key-files:
  created:
    - tests/dispatcher/sync.test.cjs (coordinator sync wiring section SW-01–SW-07 appended)
  modified:
    - packages/dispatcher/lib/coordinator.cjs

key-decisions:
  - "CLOUD_BACKENDS=['docker','ssh','managed','cloud'] defined inline in dispatch() — matches research Pattern 5, avoids a separate constant module"
  - "push AFTER releaseLock: push is a slow network op; holding the lock during push would block other dispatches. Verified by SW-01 call order assertion"
  - "_handleExit cloud sync failure is non-fatal: session work is still in worktree; session merge will recover it. Cloud sync failure = degraded mode, not data loss"
  - "Existing test fixtures (coordinator-docker, coordinator-remote) updated to mock pushPlanningState/fetchPlanningState/mergePlanningFromCloud — essential isolation for pre-existing tests (Rule 2)"
  - "CD-05 timing fix: _handleExit is now async due to cloud sync; capturedOnExit test updated to setTimeout wait instead of await for correct async propagation"

patterns-established:
  - "Coordinator DI injection: new Phase 192 deps follow exact same pattern as Phase 146 (routeSession, readPlanAutonomous) and Phase 191 (spawnDockerSession)"
  - "Test fixture update pattern: when coordinator gains new injectable deps, all existing DI fixture helpers must add mock for the new dep to prevent production fallthrough"

requirements-completed: [SYN-02, SYN-04]

duration: 7min
completed: "2026-03-30"
---

# Phase 192 Plan 02: Coordinator Sync Wiring Summary

**Sync.cjs wired into coordinator dispatch lifecycle: push before spawn for cloud backends, fetch+merge before session merge in _handleExit, with lock-based sequential ordering and fallback-to-local routing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-30T15:54:16Z
- **Completed:** 2026-03-30T16:01:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- coordinator.cjs requires sync.cjs and injects pushPlanningState/fetchPlanningState/mergePlanningFromCloud via DI pattern
- dispatch() pushes planning state for CLOUD_BACKENDS=['docker','ssh','managed','cloud'] after releaseLock, before spawn — with fallback_to_local downgrade or throw on failure
- _handleExit() fetches and merges cloud state via acquireLock/releaseLock before mergeSession for non-local sessions (SYN-04 sequential ordering), failure is non-fatal
- 7 integration tests (SW-01–SW-07) confirm all wiring paths including call order, fallback, and sync failure resilience
- Full dispatcher suite (294 tests) passes with zero regressions

## Task Commits

1. **Task 1: Wire sync.cjs into coordinator dispatch and _handleExit** - `21f4922` (feat)
2. **Task 2: Integration tests for coordinator sync wiring** - `d88fc88` (test)

## Files Created/Modified

- `packages/dispatcher/lib/coordinator.cjs` - Added sync.cjs require, DI injection, CLOUD_BACKENDS push in dispatch(), fetch+merge+lock in _handleExit()
- `tests/dispatcher/sync.test.cjs` - Appended `coordinator sync wiring` describe block with 7 tests (SW-01–SW-07)
- `tests/dispatcher/coordinator-docker.test.cjs` - Added missing sync mocks to DI fixture, fixed CD-05 async timing
- `tests/dispatcher/coordinator-remote.test.cjs` - Added missing sync mocks to DI fixture

## Decisions Made

- CLOUD_BACKENDS defined inline: `['docker', 'ssh', 'managed', 'cloud']` — no separate constant module needed, matches research Pattern 5
- Push happens AFTER releaseLock: push is a slow network op and must not hold the dispatcher mutex
- _handleExit cloud sync failure is non-fatal: session work stays in worktree, session merge recovers it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added sync mocks to coordinator-docker and coordinator-remote test fixtures**
- **Found during:** Task 2 (running full dispatcher test suite)
- **Issue:** coordinator-docker and coordinator-remote tests don't inject pushPlanningState/fetchPlanningState/mergePlanningFromCloud into _deps, so production sync.cjs runs against non-git temp dirs and throws "State sync push failed: not a git repository"
- **Fix:** Added `pushPlanningState: vi.fn().mockResolvedValue({ ok: true })`, `fetchPlanningState`, `mergePlanningFromCloud` to defaults in both test fixtures
- **Files modified:** tests/dispatcher/coordinator-docker.test.cjs, tests/dispatcher/coordinator-remote.test.cjs
- **Verification:** Full dispatcher suite 294/294 tests pass
- **Committed in:** d88fc88 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed CD-05 async timing in coordinator-docker test**
- **Found during:** Task 2 (full dispatcher suite run)
- **Issue:** CD-05 test awaits `capturedOnExit()` but `onExit` lambda returns void (not a Promise); the `await` resolves immediately before `_handleExit`'s new async cloud sync ops complete, causing `mergeSession` not-yet-called assertion failure
- **Fix:** Changed `await capturedOnExit(sessionId, 0)` to `capturedOnExit(sessionId, 0); await new Promise(r => setTimeout(r, 50))`
- **Files modified:** tests/dispatcher/coordinator-docker.test.cjs
- **Verification:** CD-05 passes; mergeSession call confirmed after sync ops settle
- **Committed in:** d88fc88 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical test isolation, 1 async timing bug exposed by new code)
**Impact on plan:** Both essential for test correctness. No scope creep.

## Issues Encountered

- Plan 01 files (sync.cjs, sync.test.cjs) existed in a sibling worktree (agent-aa927889) but not in this worktree. Cherry-picked the 3 Plan 01 commits before proceeding. simple-git also needed npm install in this worktree's dispatcher package.

## Next Phase Readiness

- SYN-01 and SYN-02 wiring complete: cloud sessions will push .planning/ before spawn and merge back after exit
- SYN-04 sequential merge ordering enforced via dispatcher.lock mutex
- Local sessions remain unaffected (cloud sync gated on backend !== 'local')
- Full dispatcher test suite clean — ready for Phase 193 (Cloud Web Backend)

---
*Phase: 192-git-based-state-sync*
*Completed: 2026-03-30*
