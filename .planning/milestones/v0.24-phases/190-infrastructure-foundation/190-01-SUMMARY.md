---
phase: 190-infrastructure-foundation
plan: "01"
subsystem: dispatcher
tags: [infrastructure, lock, aggregator, config, cloud-adapter, tdd]
dependency_graph:
  requires: []
  provides:
    - "lock.cjs cloud/docker sessionType guard"
    - "aggregator.cjs RemoteAggregator class and routing"
    - "config.cjs 6 new cloud/docker dispatch keys"
    - "packages/cloud-adapter/ requireable stub"
  affects:
    - "packages/dispatcher/lib/lock.cjs"
    - "packages/dispatcher/lib/aggregator.cjs"
    - "bin/lib/config.cjs"
    - "packages/cloud-adapter/"
tech_stack:
  added: []
  patterns:
    - "RemoteAggregator injectable class for test isolation"
    - "sessionType field in lock file JSON for cloud/docker sessions"
    - "TDD red-green with vitest globals"
key_files:
  created:
    - "tests/dispatcher/infrastructure-190.test.cjs"
    - "packages/cloud-adapter/package.json"
    - "packages/cloud-adapter/index.cjs"
  modified:
    - "packages/dispatcher/lib/lock.cjs"
    - "packages/dispatcher/lib/aggregator.cjs"
    - "bin/lib/config.cjs"
decisions:
  - "RemoteAggregator injected via constructor (not module-level require) for test isolation parity with MockTailCursor pattern"
  - "sessionType field checked before isPidAlive — prevents null-PID cloud lock from triggering ESRCH path"
metrics:
  duration_seconds: 149
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 6
---

# Phase 190 Plan 01: Infrastructure Foundation — Dispatcher Extension Summary

**One-liner:** Cloud/docker sessionType guard in lock.cjs, RemoteAggregator routing in aggregator.cjs, 6 new config keys, and requireable @pde/cloud-adapter stub — all TDD with 18 new tests.

## What Was Built

All subsequent phases (191-197) depend on the dispatcher understanding cloud and docker session types. This plan makes three surgical extensions and one new package:

1. **lock.cjs (INF-01):** Added a sessionType guard before `isPidAlive`. When the lock file contains `sessionType: 'cloud'` or `sessionType: 'docker'`, `acquireLock` returns `{ acquired: false }` immediately without checking process liveness. Local stale lock reclaim unchanged.

2. **aggregator.cjs (INF-02):** Added `RemoteAggregator` class (start/stop no-ops, Phase 191 wires the bus). Aggregator constructor now accepts a second `RemoteAggregatorClass` parameter. `watch(sessionId, sessionType)` routes cloud/docker sessions to `RemoteAggregator` and local sessions to `TailCursor`. Both classes are exported.

3. **config.cjs (INF-06):** Added 6 keys to `VALID_CONFIG_KEYS`: `dispatch.cloud.enabled`, `dispatch.cloud.provider`, `dispatch.cloud.idle_timeout`, `dispatch.docker.enabled`, `dispatch.docker.image`, `dispatch.docker.idle_timeout`.

4. **packages/cloud-adapter/ (CLD-06):** New package with `package.json` (`@pde/cloud-adapter` name, no root npm install required) and `index.cjs` stub (`module.exports = {}`).

## Test Results

- `infrastructure-190.test.cjs`: 18/18 pass (new)
- `aggregator.test.cjs`: 9/9 pass (backward compat)
- `config-dispatch.test.cjs`: 20/20 pass (backward compat, including 11 existing dispatch key tests)
- **Total: 46/46 tests pass**

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `packages/cloud-adapter/index.cjs`: exports empty object — intentional Phase 190 scaffold. Populated in Phase 191 (Docker Backend) and Phase 193 (Cloud Web Backend).
- `RemoteAggregator.start()` / `RemoteAggregator.stop()`: no-ops — intentional Phase 190 stub. Event bus wired in Phase 191.

## Self-Check: PASSED

Files created:
- tests/dispatcher/infrastructure-190.test.cjs: FOUND
- packages/cloud-adapter/package.json: FOUND
- packages/cloud-adapter/index.cjs: FOUND

Files modified:
- packages/dispatcher/lib/lock.cjs: FOUND (contains `holder.sessionType === 'cloud'`)
- packages/dispatcher/lib/aggregator.cjs: FOUND (contains `class RemoteAggregator`)
- bin/lib/config.cjs: FOUND (contains `'dispatch.cloud.enabled'`)

Commits:
- 4603b73: test(190-01): add failing tests for INF-01, INF-02, INF-06, CLD-06
- d080235: feat(190-01): extend lock.cjs with cloud/docker session guard (INF-01)
- 36b21b3: feat(190-01): RemoteAggregator routing, cloud/docker config keys, cloud-adapter scaffold (INF-02/INF-06/CLD-06)
