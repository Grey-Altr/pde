---
phase: 152-parallel-relay-wiring
plan: 01
subsystem: dispatcher
tags: [relay, coordinator, parallel-dispatch, monitoring, RLY-01, RLY-02]
dependency_graph:
  requires: []
  provides: [relay-lifecycle-in-coordinator, pde-session-id-uuid-propagation]
  affects: [packages/dispatcher/lib/coordinator.cjs, packages/dispatcher/lib/spawn.cjs, bin/pde-tools.cjs]
tech_stack:
  added: []
  patterns: [TDD-red-green, DI-deps-injection, detached-child-process, uuid-correlation]
key_files:
  created:
    - tests/dispatcher/coordinator-relay.test.cjs
  modified:
    - packages/dispatcher/lib/coordinator.cjs
    - packages/dispatcher/lib/spawn.cjs
    - bin/pde-tools.cjs
decisions:
  - "Relay spawned synchronously in dispatch() before queue.add() — relay ready before session writes events"
  - "child.kill(sig) used in relay handle (not process.kill(pid)) — preserves mock fidelity in DI tests"
  - "_relays Map keyed by coordinator sessionId (p152-1-xxx) for _handleExit lookup; relayId UUID stored separately in _relayIds Map"
  - "aggregator.watch(relayId) replaces watch(sessionId) — aligns NDJSON tail path with relay.cjs argv UUID"
metrics:
  duration_seconds: 242
  completed_date: "2026-03-27T20:53:01Z"
  tasks_completed: 3
  files_modified: 4
requirements_satisfied: [RLY-01, RLY-02]
---

# Phase 152 Plan 01: Parallel Session Relay Wiring Summary

**One-liner:** Relay lifecycle wired into DispatchCoordinator via `_spawnRelay` + `_relays` Map, with UUID propagated through spawn.cjs as `PDE_SESSION_ID` so dashboard receives parallel session events end-to-end.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RED: relay test scaffold + pde-tools.cjs PDE_SESSION_ID | `14036a0` | tests/dispatcher/coordinator-relay.test.cjs, bin/pde-tools.cjs |
| 2 | GREEN: _spawnRelay, _relays Map, relay lifecycle in coordinator.cjs | `9cc3db6` | packages/dispatcher/lib/coordinator.cjs |
| 3 | spawn.cjs relayId as PDE_SESSION_ID + full suite green | `e38f231` | packages/dispatcher/lib/spawn.cjs |

## What Was Built

**coordinator.cjs — relay lifecycle:**
- `_spawnChildProcess` DI injectable (defaults to `require('node:child_process').spawn`)
- `_relays: Map` — tracks relay handle per coordinator sessionId
- `_relayIds: Map` — tracks relayId UUID per coordinator sessionId (for aggregator unwatch)
- `_spawnRelay(relayId)` method — detached child process, unref, silent on error, skips when `PDE_REMOTE` unset
- Relay spawned synchronously in `dispatch()` after lock release, before queue enqueue
- `_handleExit` kills relay handle and cleans both Maps
- `shutdown()` kills all relays before stopping aggregator
- `aggregator.watch(relayId)` / `aggregator.unwatch(relayId)` — UUID-aligned with relay.cjs NDJSON path

**spawn.cjs:**
- `env.PDE_SESSION_ID = opts.relayId || sessionId` — UUID flows to child session-start

**pde-tools.cjs:**
- `const newSessionId = process.env.PDE_SESSION_ID || randomUUID()` — session-start honors env var

## Verification Results

```
npx vitest run tests/dispatcher/coordinator-relay.test.cjs  → 8/8 PASS
npx vitest run tests/dispatcher/coordinator-smoke.test.cjs  → 9/9 PASS
npx vitest run tests/dispatcher/                            → 229/229 PASS (24 files)
grep 'process.env.PDE_SESSION_ID' bin/pde-tools.cjs        → FOUND
grep '_spawnRelay' packages/dispatcher/lib/coordinator.cjs  → FOUND
grep '_relays' packages/dispatcher/lib/coordinator.cjs      → FOUND
grep 'relayId' packages/dispatcher/lib/spawn.cjs            → FOUND
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Relay kill routing: child.kill(sig) instead of process.kill(child.pid, sig)**
- **Found during:** Task 2 first GREEN run (Tests 5 & 6 failed)
- **Issue:** Plan specified `process.kill(child.pid, sig)` in relay handle. But DI tests inject a mock spawn stub whose `.kill` vi.fn() is never called — `process.kill(pid)` bypasses the mock entirely
- **Fix:** Changed relay handle to `kill: (sig) => { try { child.kill(sig); } catch (_) {} }` — routes through child object, so mock's kill is called correctly in tests; identical behavior in production
- **Files modified:** packages/dispatcher/lib/coordinator.cjs
- **Commit:** `9cc3db6`

**2. [Rule 1 - Bug] Relay spawn location: dispatch() not _runSession()**
- **Found during:** Task 2 first GREEN run (Tests 5 & 6 still failing after kill fix)
- **Issue:** Plan specified spawning relay inside `_runSession()` which runs asynchronously via `Promise.resolve().then(factory)` in ConcurrencyQueue. After `await dispatch()`, the relay had not yet been spawned, so `_relays.get(sessionId)` was empty when `_handleExit` ran
- **Fix:** Moved `this._spawnRelay(relayId)` call to `dispatch()` itself (synchronous, before `queue.add()`). Relay is registered in `_relays` Map before the Promise returns. `_runSession` still receives `relayId` for passing to spawnSession opts
- **Files modified:** packages/dispatcher/lib/coordinator.cjs
- **Commit:** `9cc3db6`

## Known Stubs

None — all relay lifecycle is fully wired. Dashboard event flow depends on `PDE_REMOTE` being set at runtime; graceful degradation (null relay, no-op) is intentional behavior per D-06.

## Self-Check: PASSED

- [x] tests/dispatcher/coordinator-relay.test.cjs exists (verified)
- [x] packages/dispatcher/lib/coordinator.cjs modified (verified: _spawnRelay, _relays, _relayIds)
- [x] packages/dispatcher/lib/spawn.cjs modified (verified: opts.relayId || sessionId)
- [x] bin/pde-tools.cjs modified (verified: PDE_SESSION_ID || randomUUID())
- [x] Commit 14036a0 exists (RED)
- [x] Commit 9cc3db6 exists (GREEN)
- [x] Commit e38f231 exists (spawn.cjs + full suite)
- [x] 229/229 dispatcher tests pass
