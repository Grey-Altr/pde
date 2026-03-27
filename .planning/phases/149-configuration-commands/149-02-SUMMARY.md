---
phase: 149-configuration-commands
plan: "02"
subsystem: dispatcher/session-management
tags: [session-management, pde-tools, slash-commands, tdd]
dependency_graph:
  requires: [149-01]
  provides: [list-sessions-subcommand, stop-session-subcommand, pde-sessions-command]
  affects: [bin/pde-tools.cjs, commands/, workflows/]
tech_stack:
  added: []
  patterns: [SessionRegistry-lazy-require, pid-liveness-probe, DI-test-extraction]
key_files:
  created:
    - tests/dispatcher/sessions.test.cjs
    - commands/sessions.md
    - workflows/sessions.md
  modified:
    - bin/pde-tools.cjs
decisions:
  - "Tests extract listSessions/stopSession as local helper functions for testability — avoids needing to require pde-tools.cjs monolith in tests"
  - "loadFromDisk already marks dead PIDs as 'orphaned' — list-sessions PID probe only re-checks entries still marked 'running'"
  - "Test 9 uses process.pid (live) so loadFromDisk preserves 'running' status before killSpy intercepts SIGTERM"
metrics:
  duration_seconds: 167
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 149 Plan 02: Session Management Commands Summary

**One-liner:** list-sessions and stop-session subcommands with PID liveness probing and remote session handling, plus /pde:sessions slash command.

## What Was Built

Added two new subcommands to `bin/pde-tools.cjs` and the supporting slash command infrastructure:

- **list-sessions**: Loads SessionRegistry, probes each 'running' entry's PID with `process.kill(pid, 0)`, returns sorted JSON array with `id`, `phase`, `plan`, `status`, `backend`, `pid`, `startedAt`, `elapsedSeconds`. Marks dead PIDs as 'orphaned'. Human-readable text output shows formatted per-session lines.

- **stop-session `<id>`**: Validates sessionId, checks session exists and is 'running', returns manual SSH instructions for non-local backends (remote guard), sends SIGTERM only when `entry.pid > 0` (PID 0 guard), updates registry to `status: 'stopped'`.

- **/pde:sessions command**: `commands/sessions.md` with `pde:sessions` namespace, `[stop <id>]` argument hint, routes to `workflows/sessions.md`.

- **sessions workflow**: `workflows/sessions.md` — parses arguments, invokes `pde-tools.cjs list-sessions` or `stop-session <id>`, displays formatted table or stop confirmation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add list-sessions and stop-session subcommands with tests | b233997 | bin/pde-tools.cjs, tests/dispatcher/sessions.test.cjs |
| 2 | Create /pde:sessions command and workflow files | 6d21215 | commands/sessions.md, workflows/sessions.md |

## Test Coverage

10 tests in `tests/dispatcher/sessions.test.cjs`:

- list-sessions: empty registry, live PID stays 'running', dead PID becomes 'orphaned', field completeness (phase/plan/backend/startedAt/elapsedSeconds)
- stop-session: missing ID error, unknown ID error, already-complete skip-kill, remote backend manual instructions, local SIGTERM+registry-update, PID 0 guard

All 10 tests green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture PID for stop-session tests**
- **Found during:** Task 1 TDD RED phase
- **Issue:** Test 9 used dead PID 9999997 expecting 'running' status, but `loadFromDisk()` pre-marks dead PIDs as 'orphaned' — so `stopSession` saw status='orphaned' and returned early. Test 10 used `writeRegistryFile` with `pid=0`, but `loadFromDisk` calls `process.kill(0, 0)` during initialization which triggered the spy before the assertion.
- **Fix:** Test 9 switched to `process.pid` (guaranteed live) so `loadFromDisk` preserves 'running' status; spy installed after `loadFromDisk`. Test 10 bypasses `loadFromDisk` entirely by setting `registry._map` directly to avoid the initialization PID probe.
- **Files modified:** tests/dispatcher/sessions.test.cjs
- **Commit:** b233997 (included in Task 1 commit)

## Known Stubs

None — all functionality is fully wired. Session data flows from real SessionRegistry file reads.

## Self-Check: PASSED

- bin/pde-tools.cjs: FOUND
- tests/dispatcher/sessions.test.cjs: FOUND
- commands/sessions.md: FOUND
- workflows/sessions.md: FOUND
- Commit b233997: FOUND
- Commit 6d21215: FOUND
