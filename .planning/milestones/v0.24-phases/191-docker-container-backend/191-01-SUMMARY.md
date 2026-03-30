---
phase: 191-docker-container-backend
plan: "01"
subsystem: cloud-adapter
tags: [docker, dockerode, dispatch, ndjson, tdd]
dependency_graph:
  requires: []
  provides: [spawnDockerSession]
  affects: [packages/dispatcher/lib/coordinator.cjs]
tech_stack:
  added: [dockerode@4.0.10]
  patterns: [async-iife-kill-handle, container-logs-demux-readline, container-wait-exit-code]
key_files:
  created:
    - packages/cloud-adapter/index.cjs
    - tests/dispatcher/remote-docker.test.cjs
    - packages/cloud-adapter/package-lock.json
  modified:
    - packages/cloud-adapter/package.json
    - packages/dispatcher/package.json
    - packages/dispatcher/package-lock.json
decisions:
  - "container.wait() is authoritative exit signal; logStream.destroy() forces readline close (Pitfall 1 mitigation)"
  - "Mock demuxStream stores impl PassThroughs so wait() pushes data to correct streams; wait() resolves via setImmediate to allow readline event loop tick"
  - "Failure cleanup setTimeout.unref() guards kill handle but container is already auto-removed (AutoRemove:true + CONTEXT.md clarification)"
metrics:
  duration: 294s
  completed: 2026-03-30
  tasks_completed: 2
  files_changed: 6
---

# Phase 191 Plan 01: spawnDockerSession Implementation Summary

**One-liner:** Docker container dispatch via dockerode with async IIFE + synchronous kill handle, container.logs() demux to readline for NDJSON relay, container.wait() as authoritative exit signal.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write unit tests for spawnDockerSession (RED) | 71eb12b | tests/dispatcher/remote-docker.test.cjs |
| 2 | Implement spawnDockerSession + install dockerode (GREEN) | 7755778 | packages/cloud-adapter/index.cjs, packages/cloud-adapter/package.json, packages/dispatcher/package.json |

## What Was Built

`spawnDockerSession(opts)` in `packages/cloud-adapter/index.cjs`:

- Mirrors `spawnRemoteSession` from `remote-ssh.cjs` exactly: async IIFE + synchronous `{ kill }` return
- Container created with `Tty:false`, `OpenStdin:false`, `AutoRemove:true`, `CLAUDECODE=` (empty)
- `container.logs({ follow:true, stdout:true, stderr:true })` streams output; `container.modem.demuxStream()` separates stdout/stderr (required for `Tty:false` multiplexed Docker stream)
- readline on stdout PassThrough parses NDJSON line-by-line, forwards to `onLine(sessionId, parsedEvent)`
- stderr forwarded as `{ type:'system', subtype:'stderr', message }` events
- `container.wait()` is authoritative exit signal (Pitfall 1: `follow:true` may not self-terminate); `logStream.destroy()` forces readline close
- NDJSON written to `/tmp/pde-session-{effectiveSessionId}.ndjson` for TailCursor aggregator consumption
- Uses `opts.relayId || opts.sessionId` as `effectiveSessionId` (matches remote-ssh.cjs pattern)
- Failure cleanup: 10-min `setTimeout().unref()` guards kill handle; container already auto-removed by Docker on natural exit
- DI via `opts._deps.Dockerode` for full testability without real Docker

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock timing: wait() resolved before readline processed data**

- **Found during:** Task 1 (TDD RED → GREEN iteration)
- **Issue:** Mock `wait()` used `setImmediate` to push stdout data. The implementation's `wait().then()` called `rl.close()` synchronously before `setImmediate` fired, so readline never received the data.
- **Fix:** Restructured mock `wait()` to: (a) push data to PassThroughs synchronously before the promise, (b) end streams synchronously, (c) resolve via `setImmediate` to give readline's event loop a tick to process. This matches real Docker behavior where data arrives before `wait()` resolves.
- **Files modified:** `tests/dispatcher/remote-docker.test.cjs`
- **Commit:** 7755778

**2. [Rule 1 - Bug] Mock demuxStream initial state: _stdoutPass/_stderrPass initially pointed to wrong streams**

- **Found during:** Task 1 analysis
- **Issue:** Mock `_stdoutPass`/`_stderrPass` were initially set to factory-scope PassThroughs but `wait()` needed to push to the impl's PassThroughs (registered via demuxStream). Mock's `demuxStream` correctly overwrites these, but initial values were wrong.
- **Fix:** Initialized `mockContainer._stdoutPass = null` and `mockContainer._stderrPass = null`; the implementation's PassThroughs are captured when `demuxStream` is called, then `wait()` uses them.
- **Files modified:** `tests/dispatcher/remote-docker.test.cjs`
- **Commit:** 7755778

## Verification Results

```
npx vitest run tests/dispatcher/remote-docker.test.cjs

Test Files  1 passed (1)
Tests       12 passed (12)
Duration    800ms
```

All 12 unit tests pass:
- Test 1 (CLD-04): createContainer called with correct config (Image, Tty:false, OpenStdin:false, AutoRemove:true, Labels, Binds, Cmd)
- Test 2 (CLD-04): container.start() called after createContainer
- Test 3 (CLD-05): onLine receives parsed JSON from stdout
- Test 4 (CLD-05): onLine receives { type:'system', subtype:'stderr' } for stderr
- Test 5 (CLD-05): onExit receives StatusCode:0
- Test 6 (CLD-05): onExit receives StatusCode:1
- Test 7 (CLD-03): NDJSON file written to /tmp/pde-session-{relayId}.ndjson
- Test 8: kill() calls containerInstance.kill()
- Test 9: kill() safe before container starts
- Test 10: top-level error fires docker_error subtype + onExit(1)
- Test 11: CLAUDECODE= present in Env
- Test 12: pde-session label set to sessionId

## Known Stubs

None. All functionality is fully implemented per plan requirements.

## Self-Check: PASSED
