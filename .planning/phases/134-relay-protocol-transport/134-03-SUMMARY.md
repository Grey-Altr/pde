---
phase: 134-relay-protocol-transport
plan: "03"
subsystem: relay
tags: [hooks, relay, daemon, pde-remote, zero-impact, e2e, circuit-breaker]
dependency_graph:
  requires: [134-01, 134-02]
  provides: [RLY-04, RLY-05, relay-hook-integration, relay-e2e-pipeline]
  affects: [hooks/hooks.json, session-lifecycle]
tech_stack:
  added: []
  patterns:
    - PDE_REMOTE env gate (RLY-04)
    - Detached daemon spawn with PID file lifecycle
    - Zero-impact error isolation (RLY-05) — try/catch wrapping all hook logic
    - TDD: RED test → GREEN implementation pattern
key_files:
  created:
    - hooks/start-relay.cjs
    - hooks/stop-relay.cjs
    - bin/lib/relay.cjs (daemon-mode block appended)
    - tests/phase-134/test-relay-hooks.cjs
    - tests/phase-134/test-relay-e2e.cjs
  modified:
    - hooks/hooks.json
decisions:
  - "PDE_RELAY_SCRIPT_OVERRIDE env var added for test isolation (allows tests to point to non-existent path to verify error swallowing)"
  - "stop-relay placed before archive-session in SessionEnd (async:false) so relay flushes before session is archived"
  - "start-relay placed after context-sync-session-start in SessionStart (async:true) to not block session start"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 2
  tests_added: 11
  tests_total_phase_134: 33
key_decisions:
  - "Relay daemon spawned with detached:true + stdio:ignore + child.unref() so hook process can exit immediately"
  - "Duplicate guard: signal 0 probe on existing PID prevents double-spawn"
---

# Phase 134 Plan 03: Hook Integration and E2E Test Summary

**One-liner:** PDE_REMOTE env-gated relay hook scripts that spawn/stop a detached relay daemon, with full NDJSON-to-HTTP pipeline proven via 5 in-process integration tests.

## Objective

Wire the relay daemon (plan 02) into PDE's hook system with a PDE_REMOTE environment gate and zero-impact error isolation. Prove the full pipeline with an integration test.

## Tasks Completed

### Task 1: Hook scripts with PDE_REMOTE gate and zero-impact isolation

**Commit:** `5088c2b`

Created three files:

**hooks/start-relay.cjs:** SessionStart hook that:
- Immediately exits 0 if PDE_REMOTE is not set (RLY-04 env gate)
- Reads session_id from hook JSON payload
- Checks for alive duplicate via PID file + signal-0 probe
- Spawns `node bin/lib/relay.cjs <sessionId> <ingestUrl> <bearerToken>` as detached process
- Writes PID to `/tmp/pde-relay-{sessionId}.pid`
- Wraps all logic in try/catch that exits 0 (RLY-05 zero-impact)

**hooks/stop-relay.cjs:** SessionEnd hook that:
- Reads PID from `/tmp/pde-relay-{sessionId}.pid`
- Sends SIGTERM to relay daemon
- Removes PID file
- Silently handles all errors and exits 0

**hooks/hooks.json:** Updated with:
- `start-relay.cjs` added to SessionStart (async: true, after context-sync)
- `stop-relay.cjs` added to SessionEnd (async: false, before archive-session)
- All original hooks preserved

**bin/lib/relay.cjs:** Daemon-mode block appended:
- `if (require.main === module)` block reads argv[2]/[3]/[4] as sessionId/ingestUrl/bearerToken
- Installs `unhandledRejection` and `uncaughtException` handlers (both exit 0)
- Calls startRelay() then keeps process alive with setInterval

6 hook tests passing (env gate, PID write, SIGTERM + cleanup, no-PID guard, error swallow, duplicate guard).

### Task 2: End-to-end integration test — NDJSON to mock HTTP endpoint

**Commit:** `9c7674f`

Created `tests/phase-134/test-relay-e2e.cjs` with 5 integration tests:

1. **Pipeline test:** 3 NDJSON events arrive at mock server within 5 seconds
2. **Batch format test:** Received batches are valid JSON arrays with wire envelope fields (seq, session_id, machine_id, relay_ts, event_type)
3. **Circuit breaker open:** Server returning 500 causes circuit to open after failureThreshold failures; request rate drops
4. **HALF_OPEN probe:** After cooldown elapses with server returning 200, circuit transitions OPEN → HALF_OPEN → CLOSED
5. **Unreachable URL:** Relay continues running without crash when endpoint is unreachable

All tests use `node:http` createServer on port 0 (auto-assigned), and in-process `startRelay` for testability.

## Overall Verification

All 33 phase 134 tests passing:
- 8 protocol tests (WireEnvelopeSchema, createEnvelope)
- 5 circuit breaker tests
- 4 batch queue tests
- 5 tail cursor tests
- 6 hook unit tests
- 5 e2e integration tests

## Deviations from Plan

### Auto-added: PDE_RELAY_SCRIPT_OVERRIDE support

**[Rule 2 - Missing test isolation]**
- **Found during:** Task 1 test writing
- **Issue:** Test 5 (error swallowing) needed a way to trigger spawn failure without breaking the actual relay script path
- **Fix:** Added `PDE_RELAY_SCRIPT_OVERRIDE` env var support to start-relay.cjs — when set, uses that path instead of the resolved relay.cjs path. Allows tests to point to `/nonexistent/path/relay.cjs` to prove error swallowing works.
- **Files modified:** hooks/start-relay.cjs

### Plan 01 and 02 files copied to worktree

- **Found during:** Task execution setup
- **Issue:** This worktree (agent-a417af30) was initialized from main before plans 01 and 02 were executed in other worktrees. relay.cjs, relay-protocol.cjs, vitest.config.ts, and tests/phase-134/*.cjs were missing.
- **Fix:** Copied files from main repo (which had them from prior parallel execution). Not a code change — just worktree synchronization.

## Known Stubs

None — all relay pipeline components are fully implemented and tested.

## Self-Check: PASSED

Files created:
- hooks/start-relay.cjs: FOUND
- hooks/stop-relay.cjs: FOUND
- tests/phase-134/test-relay-hooks.cjs: FOUND
- tests/phase-134/test-relay-e2e.cjs: FOUND
- bin/lib/relay.cjs (daemon block): FOUND

Commits:
- 5088c2b: FOUND (feat(134-03): hook scripts with PDE_REMOTE gate)
- 9c7674f: FOUND (feat(134-03): end-to-end integration test)
