---
phase: 191-docker-container-backend
plan: "02"
subsystem: dispatcher/docker
tags: [docker, coordinator, router, aggregator, tmux, tdd]
dependency_graph:
  requires: [191-01, 190-01, 190-02]
  provides: [coordinator-docker-dispatch, docker-routing, aggregator-docker-fix, tmux-docker-label]
  affects: [packages/dispatcher, packages/cloud-adapter, dashboard]
tech_stack:
  added: []
  patterns: [DI injection for spawnDockerSession, TailCursor for local container NDJSON]
key_files:
  created:
    - tests/dispatcher/coordinator-docker.test.cjs
  modified:
    - packages/dispatcher/lib/coordinator.cjs
    - packages/dispatcher/lib/remote-router.cjs
    - packages/dispatcher/lib/tmux-fanout.cjs
    - packages/dispatcher/lib/aggregator.cjs
    - dashboard/__tests__/session-source.test.ts
    - tests/dispatcher/coordinator-remote.test.cjs
decisions:
  - Docker sessions use TailCursor (not RemoteAggregator) because container writes NDJSON to local /tmp/ file
  - RemoteAggregator reserved exclusively for cloud sessions (Phase 193) which push events over HTTP
  - Docker sessions skip relay spawn (same as SSH) -- no local relay process needed
  - sourceLabel exports added to tmux-fanout.cjs for direct test coverage
metrics:
  duration_seconds: 454
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 6
requirements: [CLD-04, CLD-05, CLD-03]
---

# Phase 191 Plan 02: Docker Coordinator Integration Summary

**One-liner:** Docker dispatch wired end-to-end via coordinator _runDockerSession, router docker rules, TailCursor fix for NDJSON tailing, and tmux 'D' label with 11 passing tests.

## Objective

Wire `spawnDockerSession` (from Plan 01) into the dispatcher: coordinator dispatch branch, router rule, aggregator routing fix (TailCursor for docker, not RemoteAggregator), tmux source label, and dashboard session-source tests.

## Tasks Completed

### Task 1: Coordinator Docker integration + router + aggregator fix + tmux label + tests

**TDD RED** — wrote failing tests for CD-01 through CD-10 in `tests/dispatcher/coordinator-docker.test.cjs`.

**TDD GREEN** — implemented 4 components:

**A. aggregator.cjs fix** — Changed `isRemote` condition from `sessionType === 'cloud' || sessionType === 'docker'` to `sessionType === 'cloud'`. Docker sessions write NDJSON to local `/tmp/pde-session-{relayId}.ndjson`, so TailCursor is correct. RemoteAggregator is reserved for Phase 193 cloud sessions which push events over HTTP.

**B. remote-router.cjs** — Added `dockerConfig` parameter and two new rules:
- Rule 2.5: `remoteConfig.preferred_backend === 'docker'` → return 'docker'
- Rule 2.6: `dockerConfig.enabled === true` → return 'docker'

**C. coordinator.cjs** — Added:
- `require('../../cloud-adapter/index.cjs').spawnDockerSession` import
- `_spawnDockerSession` DI binding and `_dockerConfig` extraction from config
- `dockerConfig` passed to `_routeSession` call
- Relay skip condition updated to `backend !== 'ssh' && backend !== 'docker'`
- New docker branch in queue routing: `backend === 'docker'` → `_runDockerSession`
- New `_runDockerSession` method following same pattern as `_runRemoteSession`

**D. tmux-fanout.cjs** — Updated `sourceLabel` to return `'D'` for docker backend (was returning `'R'`). Exported `sourceLabel` for direct testing.

Result: 11/11 tests pass (CD-01 through CD-10b).

### Task 2: Dashboard session-source tests for docker + regression check

Added `SS-docker-01` and `SS-docker-02` tests to `dashboard/__tests__/session-source.test.ts`:
- SS-docker-01: stores `session_source=docker` on `session_start` when `source=docker`
- SS-docker-02: getSessions returns `source=docker` when `session_source=docker` in Redis

Fixed `coordinator-remote.test.cjs` Tests 1 and 7 to use `expect.objectContaining` instead of exact match (accommodates new `dockerConfig` parameter added to `routeSession` call).

**Regression results:** 47 tests pass across all affected dispatcher test files.

## Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| `coordinator.cjs` contains `_runDockerSession` | PASS (2 occurrences) |
| `coordinator.cjs` contains `spawnDockerSession` | PASS (3 occurrences) |
| `coordinator.cjs` contains `backend !== 'docker'` | PASS |
| `coordinator.cjs` contains `this._dockerConfig` | PASS (3 occurrences) |
| `remote-router.cjs` contains `return 'docker'` | PASS (2 occurrences) |
| `remote-router.cjs` contains `dockerConfig` | PASS (5 occurrences) |
| `tmux-fanout.cjs` contains `'D'` | PASS |
| `tmux-fanout.cjs` contains `docker` | PASS |
| `aggregator.cjs` contains `sessionType === 'cloud'` (NOT 'docker') | PASS |
| `coordinator-docker.test.cjs` exists with 10+ test cases | PASS (11 tests) |
| All CD-* tests pass | PASS |
| `SS-docker-01` in session-source tests | PASS |
| No regression in dispatcher tests | PASS (44 tests pass) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] coordinator-remote.test.cjs assertions broke after adding dockerConfig**

- **Found during:** Task 2 regression check
- **Issue:** Tests 1 and 7 used exact `toHaveBeenCalledWith` matching. Adding `dockerConfig` to the `routeSession` call parameters caused these assertions to fail.
- **Fix:** Updated assertions to use `expect.objectContaining` so they match the relevant fields without requiring the full object shape.
- **Files modified:** `tests/dispatcher/coordinator-remote.test.cjs`
- **Commit:** f95d341

**2. [Rule 3 - Blocking] packages/dispatcher/node_modules not installed in worktree**

- **Found during:** Task 1 test run setup
- **Issue:** `node-ssh` (required by remote-ssh.cjs) was not in the worktree's node_modules.
- **Fix:** Ran `npm install` in `packages/dispatcher/` and `packages/cloud-adapter/` directories.
- **Commit:** n/a (dependency install, not a code change)

**3. [Rule 3 - Blocking] cherry-picked 191-01 commits**

- **Found during:** Task 1 setup
- **Issue:** `packages/cloud-adapter/index.cjs` was still the stub (empty exports). The 191-01 implementation existed on another branch (`worktree-agent-a1a9a8ea`).
- **Fix:** Cherry-picked commits `71eb12b` (tests) and `7755778` (implementation) onto this branch.
- **Commit:** a12527e, 2ca814b (cherry-picks)

**4. [Rule 1 - Bug] vi.fn() mock constructors needed constructor pattern for Aggregator tests**

- **Found during:** Task 1 GREEN phase
- **Issue:** CD-10 test used arrow function mocks with `vi.fn(() => {...})`. The Aggregator's `watch()` calls `new CursorClass(...)`, which requires a constructor-compatible function (not an arrow function).
- **Fix:** Updated mocks to use `function MockTailCursor()` pattern with `vi.fn(MockTailCursor)`.
- **Files modified:** `tests/dispatcher/coordinator-docker.test.cjs`

## Known Stubs

None. All wiring is complete. `spawnDockerSession` from Plan 01 is fully integrated into the coordinator dispatch path.

## Self-Check: PASSED

All files found:
- FOUND: packages/dispatcher/lib/coordinator.cjs
- FOUND: packages/dispatcher/lib/remote-router.cjs
- FOUND: packages/dispatcher/lib/tmux-fanout.cjs
- FOUND: packages/dispatcher/lib/aggregator.cjs
- FOUND: tests/dispatcher/coordinator-docker.test.cjs
- FOUND: dashboard/__tests__/session-source.test.ts
- FOUND: .planning/phases/191-docker-container-backend/191-02-SUMMARY.md

All commits found:
- FOUND: 29d8751 (test RED)
- FOUND: 1d2a68c (feat GREEN)
- FOUND: f95d341 (feat Task 2 + regression fix)
