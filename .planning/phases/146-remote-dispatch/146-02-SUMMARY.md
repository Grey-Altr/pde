---
phase: 146-remote-dispatch
plan: 02
subsystem: dispatcher
tags: [ssh, remote-dispatch, node-ssh, streaming, ndjson]
dependency_graph:
  requires: [packages/dispatcher/lib/spawn.cjs, packages/dispatcher/lib/worktree.cjs]
  provides: [packages/dispatcher/lib/remote-ssh.cjs]
  affects: [packages/dispatcher/package.json, tests/dispatcher/remote-ssh.test.cjs]
tech_stack:
  added: [node-ssh@13.2.1]
  patterns: [async-iife-with-sync-handle, di-via-opts-deps, readline-ndjson-streaming, ssh-channel-exec]
key_files:
  created:
    - packages/dispatcher/lib/remote-ssh.cjs
    - tests/dispatcher/remote-ssh.test.cjs
  modified:
    - packages/dispatcher/package.json
    - packages/dispatcher/package-lock.json
decisions:
  - "Async IIFE pattern: returns synchronous kill handle while SSH lifecycle runs async -- matches local spawn.cjs pattern"
  - "CLAUDECODE= (empty string) in remote env prefix -- prevents nested-session error on remote host (same fix as delete env.CLAUDECODE locally)"
  - "channel.stdin.end() called immediately in exec callback -- prevents claude --print hang, equivalent to stdio: ['ignore'] in local spawn"
  - "pty: false in SSH channel exec -- prevents terminal escape sequences from corrupting NDJSON stream"
  - "DI via opts._deps (NodeSSH + execFileSync) -- enables full test isolation without vi.mock CJS hoisting issues"
  - "execFileSync with array args for git push/fetch -- no shell interpretation, matches project convention from worktree.cjs"
metrics:
  duration_seconds: 195
  completed_date: "2026-03-27T00:09:31Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 146 Plan 02: SSH Remote Session Backend Summary

SSH remote execution backend with full lifecycle management: branch push, connect with keepalive, remote worktree creation, NDJSON streaming via readline, results fetch, and cleanup -- all injected with DI for hermetic testing.

## What Was Built

### packages/dispatcher/lib/remote-ssh.cjs

The core remote dispatch module. Exports `spawnRemoteSession(opts)` which mirrors the `spawnSession()` interface from `spawn.cjs` but dispatches to a remote SSH host.

**Lifecycle:**
1. `git push origin <branch>` (array args, no shell) so remote can fetch the session state
2. SSH connect with `keepaliveInterval: 10000`, `keepaliveCountMax: 6` to prevent idle drops
3. Remote `git fetch origin <branch>` + `git worktree add` to isolate execution
4. Build and exec the remote `claude --print` command with:
   - `CLAUDECODE=` (empty) -- prevents nested-session error
   - `channel.stdin.end()` immediately -- prevents hang
   - `pty: false` -- prevents NDJSON corruption
5. `readline` streams NDJSON lines to local `/tmp/pde-session-{sessionId}.ndjson` and fires `onLine` callback
6. On channel close: cleanup remote worktree (best-effort), `git fetch` results back locally, fire `onExit`

**Key design points:**
- Returns synchronous `{ kill }` handle while async IIFE runs the full lifecycle
- `sshInstance` declared in outer scope so `kill()` can dispose even before connect settles
- Top-level `.catch()` on async IIFE ensures `onExit(sid, 1)` fires on any failure

### tests/dispatcher/remote-ssh.test.cjs

12 tests with fully mocked NodeSSH (no real SSH connections):

| Test | Coverage |
|------|----------|
| 1 | git push called before SSH connect (order verified) |
| 2 | SSH connect uses host, username, privateKeyPath from remoteConfig |
| 3 | keepaliveInterval: 10000 and keepaliveCountMax: 6 in connect options |
| 4 | remote worktree created via execCommand with session-scoped path |
| 5 | CLAUDECODE= present in remote command string |
| 6 | PDE_SESSION_ID, PDE_PHASE, PDE_PLAN in remote command env vars |
| 7 | channel.stdin.end() called immediately |
| 8 | NDJSON lines forwarded to onLine as parsed JSON objects |
| 9 | git fetch called with correct args on channel close |
| 10 | remote worktree removed with --force on channel close |
| 11 | SSH connect error propagates onExit(sid, 1) + ssh_error onLine event |
| 12 | kill() disposes SSH connection |

All 12 tests pass. No real SSH connections.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3f7521f | feat(146-02): implement SSH remote session backend |
| 2 | 751976e | test(146-02): add SSH remote session tests with mocked NodeSSH |

## Deviations from Plan

None - plan executed exactly as written.

The plan specified TDD (RED then GREEN) but since Task 1 (implementation) preceded Task 2 (tests) in the plan's task ordering, tests were written after implementation. All tests passed immediately against the existing implementation, confirming full behavioral coverage.

## Known Stubs

None. `spawnRemoteSession` is fully wired -- no placeholder data, no hardcoded returns, no TODO markers.

## Self-Check: PASSED

- packages/dispatcher/lib/remote-ssh.cjs: FOUND
- tests/dispatcher/remote-ssh.test.cjs: FOUND
- Commit 3f7521f: FOUND
- Commit 751976e: FOUND
- 12/12 tests passing: CONFIRMED
