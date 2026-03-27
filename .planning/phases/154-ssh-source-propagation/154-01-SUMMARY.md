---
phase: 154-ssh-source-propagation
plan: "01"
subsystem: dispatcher/remote-ssh
tags: [ssh, source-propagation, relay, ndjson, emit-event, tdd]
dependency_graph:
  requires:
    - 152-01  # relay spawn + relayId UUID pattern
    - 146-01  # remote-ssh.cjs baseline
  provides:
    - SSH sessions emit source='remote-ssh' via PDE_BACKEND env var
    - relayId UUID flows coordinator -> remote-ssh -> NDJSON path
    - emit-event.cjs PDE_BACKEND fallback for SessionStart source
  affects:
    - dashboard session health matrix (source column)
    - relay schema validation (UUID session_id)
    - start-relay.cjs spawn (PDE_REMOTE/PDE_RELAY_TOKEN injection)
tech_stack:
  added: []
  patterns:
    - TDD red-green per task
    - source inspection tests (readFileSync) for spawnSync-based hooks
    - DI opts._deps pattern for CJS testability
key_files:
  created:
    - tests/dispatcher/emit-event-source.test.cjs
  modified:
    - packages/dispatcher/lib/coordinator.cjs
    - packages/dispatcher/lib/remote-ssh.cjs
    - hooks/emit-event.cjs
    - tests/dispatcher/coordinator-remote.test.cjs
    - tests/dispatcher/remote-ssh.test.cjs
decisions:
  - "effectiveSessionId = opts.relayId || opts.sessionId in remote-ssh.cjs — matches spawn.cjs UUID pattern; NDJSON path uses same variable for aggregator alignment"
  - "PDE_BACKEND=remote-ssh injected unconditionally in SSH envPrefix — always set for remote sessions, never for local"
  - "PDE_REMOTE/PDE_RELAY_TOKEN injected conditionally from remoteConfig.ingest_url/relay_token with env var fallbacks"
  - "Source inspection tests for emit-event.cjs — spawnSync internals make behavioral testing impractical; pattern matches Phase 150/149 convention"
metrics:
  duration_seconds: 192
  completed_date: "2026-03-27T23:28:39Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
  files_created: 1
  commits: 2
---

# Phase 154 Plan 01: SSH Source Propagation Summary

**One-liner:** Fixed three SSH source propagation blockers — relayId UUID wiring through coordinator, PDE_BACKEND/PDE_REMOTE/PDE_RELAY_TOKEN injection in remote-ssh envPrefix, and PDE_BACKEND fallback in emit-event.cjs — so remote sessions display source='remote-ssh' in the dashboard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire relayId through coordinator and fix remote-ssh.cjs envPrefix | e30b4b9 | coordinator.cjs, remote-ssh.cjs, coordinator-remote.test.cjs, remote-ssh.test.cjs |
| 2 | Add PDE_BACKEND fallback in emit-event.cjs and write unit test | 15700b4 | emit-event.cjs, emit-event-source.test.cjs |

## What Was Built

### Task 1: coordinator.cjs + remote-ssh.cjs

Three blockers fixed together:

**Blocker 1 (SSH-01): PDE_BACKEND missing from SSH envPrefix**
`remote-ssh.cjs` envPrefix now unconditionally includes `PDE_BACKEND=remote-ssh`. Remote executors receive this env var and `emit-event.cjs` reads it as the source for SessionStart events.

**Blocker 2 (SSH-02): PDE_SESSION_ID was non-UUID sessionId**
`effectiveSessionId = opts.relayId || opts.sessionId` pattern applied to both the envPrefix `PDE_SESSION_ID=` value and the NDJSON file path. When coordinator passes `relayId` (a `crypto.randomUUID()` value generated at line 220), the SSH session uses a UUID that passes relay schema validation. The NDJSON file path uses the same variable so `aggregator.watch(relayId)` matches the file being written.

**Blocker 3 (SSH-03): PDE_REMOTE/PDE_RELAY_TOKEN not injected**
`remoteConfig.ingest_url` and `remoteConfig.relay_token` (with `process.env.PDE_REMOTE`/`process.env.PDE_RELAY_TOKEN` fallbacks) are conditionally appended to the envPrefix. `start-relay.cjs` checks for these vars before spawning; without them it silently exits.

**coordinator.cjs changes:**
- `_runRemoteSession` signature adds `relayId` parameter
- `dispatch()` SSH queue call passes `relayId` to `_runRemoteSession`
- `_spawnRemoteSession` opts object includes `relayId` field

### Task 2: emit-event.cjs

**Blocker 4 (SSH-04): emit-event.cjs ignored PDE_BACKEND env var**

Two-line change in the `SessionStart` block:
```javascript
const source = hookData.source || process.env.PDE_BACKEND;
if (source) payload.source = source;
```

The two-step pattern: first assign (with fallback), then guard. This ensures:
- When `hookData.source` is set (future: direct source passing), it takes priority
- When `PDE_BACKEND=remote-ssh` is in the SSH session env, it becomes payload.source
- When neither is set (local sessions), `source` is `undefined` and the guard prevents assignment

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| coordinator-remote.test.cjs | 9 (7 existing + 2 new) | PASS |
| remote-ssh.test.cjs | 16 (12 existing + 4 new) | PASS |
| emit-event-source.test.cjs | 3 (new) | PASS |
| Full dispatcher suite | 238 | PASS |
| dashboard session-source.test.ts | 10 | PASS |

## Full Data Flow (Post-Fix)

```
coordinator.dispatch()
  → generates relayId (UUID)
  → _runRemoteSession(sessionId, ..., relayId)
    → _spawnRemoteSession({ sessionId, relayId, ... })
      → effectiveSessionId = relayId (UUID)
      → envPrefix: PDE_SESSION_ID=<UUID> PDE_BACKEND=remote-ssh PDE_REMOTE=<url> PDE_RELAY_TOKEN=<token>
      → ndjsonPath: /tmp/pde-session-<UUID>.ndjson
      → SSH exec on remote host

Remote host executor:
  → emit-event.cjs SessionStart hook fires
  → hookData.source absent → reads process.env.PDE_BACKEND = 'remote-ssh'
  → payload.source = 'remote-ssh'
  → pde-tools event-emit session_start { source: 'remote-ssh', session_id: <UUID> }
  → writes to /tmp/pde-session-<UUID>.ndjson

Local host:
  → start-relay.cjs spawns (PDE_REMOTE + PDE_RELAY_TOKEN present)
  → relay.cjs tails /tmp/pde-session-<UUID>.ndjson (UUID schema validation passes)
  → POST /api/ingest with event.source = 'remote-ssh'
  → Redis: session_source = 'remote-ssh'
  → Dashboard: source column shows 'remote-ssh'
```

## Decisions Made

1. **effectiveSessionId pattern** — `opts.relayId || opts.sessionId` in remote-ssh.cjs matches the existing `spawn.cjs` UUID pattern; NDJSON path uses same variable for aggregator alignment. No behavioral change when relayId absent (backward compatible).

2. **PDE_BACKEND unconditional** — Always set for remote sessions, never for local. Clean binary distinction. No conditional needed.

3. **Conditional PDE_REMOTE/PDE_RELAY_TOKEN** — Only injected when config provides them (ingest_url/relay_token). Env var fallbacks ensure CI/test environments can override without config changes.

4. **Source inspection tests for emit-event.cjs** — spawnSync internals make behavioral testing impractical without process-level mocking. Source inspection pattern matches Phase 150 (hardening-hdn.test.ts) and Phase 149 (pde-tools) conventions already established in the project.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows are wired end-to-end.

## Self-Check: PASSED

- [x] `packages/dispatcher/lib/coordinator.cjs` — modified, contains `relayId` in `_runRemoteSession`
- [x] `packages/dispatcher/lib/remote-ssh.cjs` — modified, contains `PDE_BACKEND=remote-ssh` and `effectiveSessionId`
- [x] `hooks/emit-event.cjs` — modified, contains `hookData.source || process.env.PDE_BACKEND`
- [x] `tests/dispatcher/coordinator-remote.test.cjs` — modified, contains Test 8 and Test 9
- [x] `tests/dispatcher/remote-ssh.test.cjs` — modified, contains Tests 13-16
- [x] `tests/dispatcher/emit-event-source.test.cjs` — created, 3 tests
- [x] Commit e30b4b9 — verified in git log
- [x] Commit 15700b4 — verified in git log
- [x] All 238 dispatcher tests pass
- [x] Dashboard session-source tests unaffected (10/10 pass)
