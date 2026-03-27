---
phase: 146-remote-dispatch
plan: 03
subsystem: dispatcher
tags: [cjs, node-ssh, remote-dispatch, coordinator, routing, ssh]

requires:
  - phase: 146-01
    provides: remote-router.cjs with routeSession() decision tree
  - phase: 146-02
    provides: remote-ssh.cjs with spawnRemoteSession() SSH backend
  - phase: 145-agent-sdk-orchestrator
    provides: DispatchCoordinator base class with DI pattern

provides:
  - DispatchCoordinator wired with remote routing via routeSession() before lock acquisition
  - _runRemoteSession() method for SSH session dispatch
  - readPlanAutonomous() static YAML frontmatter parser
  - Registry entries include backend tag (local/ssh/managed) and remoteHost
  - index.cjs exports spawnRemoteSession, detectManagedBackend, routeSession, readPlanAutonomous
  - coordinator-remote.test.cjs with 7 integration tests (all pass)

affects: [146-remote-dispatch, future phases using DispatchCoordinator]

tech-stack:
  added: []
  patterns:
    - "Routing before lock: async routeSession() called before acquireLock() to keep lock window narrow"
    - "DI injection for remote deps: _spawnRemoteSession, _routeSession, _remoteConfig, _readPlanAutonomous all injectable for test isolation"
    - "Static YAML regex parse for autonomous detection: same pattern as orchestrator.cjs checkFileOverlap"
    - "opts override pattern: opts.isAutonomous takes precedence over readPlanAutonomous() when provided"

key-files:
  created:
    - tests/dispatcher/coordinator-remote.test.cjs
  modified:
    - packages/dispatcher/lib/coordinator.cjs
    - packages/dispatcher/index.cjs

key-decisions:
  - "Routing before lock: routeSession() is async and must complete before lock acquisition — keeps the lock window narrow and avoids holding the mutex during network I/O"
  - "No PID update for remote sessions: SSH has no local PID; _runRemoteSession does not call registry.update({pid}) unlike _runSession"
  - "opts.isAutonomous short-circuits readPlanAutonomous: callers can override autonomous detection without reading filesystem"

patterns-established:
  - "Pattern: async pre-work before acquireLock() — pattern for any async decision that must precede the critical section"
  - "Pattern: backend tag in registry — all registry entries now include backend field for dashboard/monitoring consumers"

requirements-completed: [RMT-01, RMT-02, RMT-03, RMT-04, RMT-05, RMT-06]

duration: 6min
completed: 2026-03-27
---

# Phase 146 Plan 03: Coordinator Remote Wiring Summary

**DispatchCoordinator wired to route autonomous sessions via SSH using routeSession() + spawnRemoteSession(), with readPlanAutonomous PLAN.md parser and backend-tagged registry entries**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T00:12:58Z
- **Completed:** 2026-03-27T00:18:50Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Modified DispatchCoordinator to call routeSession() before lock acquisition and branch to _runRemoteSession vs _runSession based on backend decision
- Added readPlanAutonomous() static YAML frontmatter parser to detect autonomous: true from PLAN.md files
- Registry entries now include backend ('local'|'ssh'|'managed') and remoteHost fields for dashboard observability
- Updated index.cjs to export all three Phase 146 modules (remote-ssh, remote-managed, remote-router)
- Created 7 integration tests in coordinator-remote.test.cjs covering all routing paths (all pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire remote routing into coordinator.cjs and add readPlanAutonomous** - `cf691ea` (feat)
2. **Task 2: Update index.cjs exports and create coordinator-remote.test.cjs** - `ba3b73a` (feat)

**Plan metadata:** see docs commit below

## Files Created/Modified

- `packages/dispatcher/lib/coordinator.cjs` - Added remote-router/remote-ssh requires, readPlanAutonomous helper, Phase 146 constructor deps, updated dispatch() with backend routing, added _runRemoteSession(), updated module.exports
- `packages/dispatcher/index.cjs` - Added Phase 146 requires for remote-ssh/managed/router, updated exports spread
- `tests/dispatcher/coordinator-remote.test.cjs` - 7 integration tests for remote routing, SSH backend, registry tags, readPlanAutonomous integration

## Decisions Made

- Routing before lock: routeSession() is async and must complete before acquireLock() to keep the critical section window narrow and avoid holding the mutex during network I/O
- No PID update for remote sessions: SSH has no local PID; _runRemoteSession does not call registry.update({pid}) unlike _runSession which gets the child process PID
- opts.isAutonomous short-circuits readPlanAutonomous: callers can bypass filesystem reads when they already know the autonomous flag

## Deviations from Plan

### Pre-existing Issue Discovered (out of scope — logged only)

**coordinator-smoke.test.cjs Test 7 (dispatchWave timeout)** — pre-existing failure confirmed by reverting changes and re-running. The test's makeCoordWithDeps does not inject analyzeDag or routeSession stubs, causing the real analyzeDag (which invokes the Agent SDK) to hang. This was failing before Plan 03 changes. Logged to deferred-items.md.

**Total deviations:** 0 auto-fixes (plan executed exactly as written)

**Impact on plan:** No scope changes. The pre-existing smoke test failure is not caused by Plan 03 changes.

## Issues Encountered

- `node-ssh` package not installed in worktree — ran `npm install` in packages/dispatcher, resolved immediately
- Worktree was behind main (Plans 01 and 02 already merged) — rebased onto main to get remote-router.cjs and remote-ssh.cjs before starting implementation
- Test file initially used `require('vitest')` which fails in CJS globals mode — corrected to rely on vitest globals (globals: true in vitest.config.ts)

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All RMT requirements (01-06) are satisfied across Plans 01-03
- Phase 146 remote dispatch is complete: routing layer (01) + SSH backend (02) + coordinator wiring (03)
- v0.18 milestone Distributed Execution is ready for integration testing
- No blockers

---
*Phase: 146-remote-dispatch*
*Completed: 2026-03-27*
