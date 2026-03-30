---
phase: 193
plan: 02
subsystem: dispatcher/cloud
tags: [cloud-dispatch, routing, coordinator, tests, tdd]
dependency_graph:
  requires: [193-01]
  provides: [cloud-routing, _runCloudSession, routing_fallback, CC-tests]
  affects: [remote-router, coordinator, aggregator, tmux-fanout]
tech_stack:
  added: [remote-cloud.cjs]
  patterns: [async-IIFE-kill-handle, DI-injection, TDD-red-green]
key_files:
  created:
    - packages/dispatcher/lib/remote-cloud.cjs
    - tests/dispatcher/coordinator-cloud.test.cjs
  modified:
    - packages/dispatcher/lib/remote-router.cjs
    - packages/dispatcher/lib/coordinator.cjs
    - packages/dispatcher/lib/remote-managed.cjs
    - packages/dispatcher/lib/aggregator.cjs
    - packages/dispatcher/lib/tmux-fanout.cjs
    - tests/dispatcher/remote-router.test.cjs
decisions:
  - "cloud routing probe via _detectManaged injection — same managed probe path, cloud is an elevated managed backend"
  - "routing_fallback emitted in coordinator (not router) — keeps router pure, router returns backend string only"
  - "CloudPoller stops on both non-running status AND catch block — prevents infinite error loop (Pitfall 5)"
  - "Plan 01 prerequisite artifacts created inline as Rule 3 auto-fix since Plan 01 was not yet executed"
metrics:
  duration_minutes: 9
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 8
  tests_added: 13
---

# Phase 193 Plan 02: Cloud Router + Coordinator Wiring Summary

Cloud dispatch wired into remote-router.cjs (Rules 2.7/2.8 with probe fallback) and coordinator.cjs (_runCloudSession, relay guard, routing_fallback event, cloud sessionType), with full CC-01 through CC-11 test coverage via TDD.

## Tasks Completed

### Task 1: Extend router with cloud rules and coordinator with _runCloudSession

**Commit:** fe25ac9

**remote-router.cjs changes:**
- Added `cloudConfig` parameter to `routeSession`
- Added Rule 2.7: `remoteConfig.preferred_backend === 'cloud'` → probe → return 'cloud' or fall through to SSH
- Added Rule 2.8: `cloudConfig.enabled === true` → probe → return 'cloud' or fall through
- Updated JSDoc to reference Phase 193 and CLD-07
- Updated routing targets comment to include 'cloud'

**coordinator.cjs changes:**
- Import `spawnCloudSession` from `./remote-cloud.cjs`
- Added `this._spawnCloudSession` and `this._cloudConfig` in constructor
- Pass `cloudConfig` to `routeSession` call
- Extended relay spawn guard: `backend !== 'cloud'` (Pitfall 4 — cloud must NOT spawn relay)
- Pass `sessionType='cloud'` to `aggregator.watch` for RemoteAggregator routing
- Added `cloud` dispatch branch to queue section
- Added `_runCloudSession` method mirroring `_runDockerSession` pattern
- Added `routing_fallback` event emission when `requestedBackend === 'cloud'` but `backend !== 'cloud'`

**Prerequisite files (Plan 01 artifacts, created via Rule 3):**
- `remote-cloud.cjs`: CloudPoller class + spawnCloudSession function
- `remote-managed.cjs`: Real OAuth probe (`authMethod === 'claude.ai'`)
- `aggregator.cjs`: RemoteAggregator wired to CloudPoller
- `tmux-fanout.cjs`: `sourceLabel('cloud')` returns `'C'`

### Task 2: Create coordinator-cloud.test.cjs (TDD)

**Commit:** 9fe7d95

Created `tests/dispatcher/coordinator-cloud.test.cjs` (442 lines) with full CC-01 through CC-11 coverage:

| Test | Description | Result |
|------|-------------|--------|
| CC-01 | dispatch() with backend=cloud calls spawnCloudSession, not others | PASS |
| CC-02 | cloud backend skips relay spawn even with PDE_REMOTE set | PASS |
| CC-03 | _runCloudSession passes sessionId, phase, plan, cloudConfig | PASS |
| CC-04 | onLine callback forwards events to aggregator.emit | PASS |
| CC-05 | onExit triggers _handleExit, mergeSession called on exit 0 | PASS |
| CC-05b | routing_fallback event emitted when cloud probe fails | PASS |
| CC-06 | detectManagedBackend returns { available: false } when authMethod !== 'claude.ai' | PASS |
| CC-07 | detectManagedBackend returns { available: true } when authMethod === 'claude.ai' | PASS |
| CC-08 | CloudPoller emits cloud_heartbeat then session_end, stops after completion | PASS |
| CC-09 | routeSession fallback: cloud unavailable → ssh (with host) or local (without host) | PASS |
| CC-10 | sourceLabel('cloud') returns 'C' | PASS |
| CC-11 | aggregator.watch(id, 'cloud') uses RemoteAggregator not TailCursor | PASS |

Total: 13 tests pass (including CC-09b bonus variant).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 01 prerequisite files not yet executed**

- **Found during:** Task 1 setup
- **Issue:** `remote-cloud.cjs` did not exist (created by Plan 01 which had not run). `remote-managed.cjs` still had v0.18 stub. `aggregator.cjs` had no-op RemoteAggregator. `tmux-fanout.cjs` lacked cloud label.
- **Fix:** Created all four Plan 01 artifacts inline: `remote-cloud.cjs` (CloudPoller + spawnCloudSession), real OAuth probe in `remote-managed.cjs`, RemoteAggregator wired to CloudPoller in `aggregator.cjs`, cloud label 'C' in `tmux-fanout.cjs`
- **Files modified:** packages/dispatcher/lib/remote-cloud.cjs (new), packages/dispatcher/lib/remote-managed.cjs, packages/dispatcher/lib/aggregator.cjs, packages/dispatcher/lib/tmux-fanout.cjs
- **Commit:** fe25ac9

**2. [Rule 1 - Bug] remote-router.test.cjs detectManagedBackend test expected v0.18 stub behavior**

- **Found during:** Task 2 full suite run
- **Issue:** Existing test `'returns unavailable in v0.18 (always { available: false })'` expected the old stub to return `{ available: false, reason: contains 'GitHub' }`. The updated `detectManagedBackend` probes the real CLI, which succeeded in the worktree environment, returning `{ available: true }`.
- **Fix:** Updated test to use `_deps` injection with mock execCommand, testing three cases (unavailable auth, available auth, CLI failure)
- **Files modified:** tests/dispatcher/remote-router.test.cjs
- **Commit:** 9fe7d95

**3. [Rule 2 - Missing functionality] routing_fallback not in test file**

- **Found during:** Task 2 acceptance criteria check
- **Issue:** `grep -q "routing_fallback"` on coordinator-cloud.test.cjs failed — the test was missing
- **Fix:** Added CC-05b test: dispatch() with routeSession returning 'ssh' (cloud probe failed) verifies routing_fallback event is emitted with from='cloud', to='ssh'
- **Commit:** 9fe7d95

## Known Stubs

None — all Plan 01 prerequisites were implemented fully, not stubbed.

## Verification Results

```
npx vitest run tests/dispatcher/coordinator-cloud.test.cjs
Test Files: 1 passed
Tests: 13 passed

npx vitest run tests/dispatcher/
Test Files: 30 passed
Tests: 309 passed
```

## Self-Check: PASSED

- packages/dispatcher/lib/remote-cloud.cjs: FOUND
- packages/dispatcher/lib/remote-router.cjs: FOUND (cloud rules)
- packages/dispatcher/lib/coordinator.cjs: FOUND (_runCloudSession)
- tests/dispatcher/coordinator-cloud.test.cjs: FOUND
- Commit fe25ac9: FOUND
- Commit 9fe7d95: FOUND
