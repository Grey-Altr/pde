---
phase: 193-cloud-web-backend
plan: "01"
subsystem: dispatcher
tags: [cloud, polling, oauth-probe, aggregator, source-label]
dependency_graph:
  requires: []
  provides: [CloudPoller, spawnCloudSession, detectManagedBackend, RemoteAggregator-cloud-wiring, cloud-sourceLabel]
  affects: [packages/dispatcher/lib/aggregator.cjs, packages/dispatcher/lib/tmux-fanout.cjs]
tech_stack:
  added: []
  patterns:
    - Async IIFE + synchronous kill handle (mirrors remote-ssh.cjs)
    - Dependency injection via _deps.execCommand for all CLI calls
    - CloudPoller interval polling with auto-stop on completion/error
    - JSON.stringify bridge in RemoteAggregator (Aggregator onLine string contract)
key_files:
  created:
    - packages/dispatcher/lib/remote-cloud.cjs
  modified:
    - packages/dispatcher/lib/remote-managed.cjs
    - packages/dispatcher/lib/aggregator.cjs
    - packages/dispatcher/lib/tmux-fanout.cjs
decisions:
  - "authMethod === 'claude.ai' (not github_connected) for OAuth probe per research — field does not exist in claude auth status --json v2.1.87"
  - "CloudPoller stops on BOTH non-running status AND errors to prevent infinite error loop"
  - "spawnCloudSession uses async IIFE + sync kill handle to mirror remote-ssh.cjs pattern"
metrics:
  duration_seconds: 130
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
requirements: [CLD-01, CLD-02, CLD-08]
---

# Phase 193 Plan 01: Cloud Web Backend Core Modules Summary

**One-liner:** CloudPoller interval-polls `claude task status --json` with auto-stop on completion/error; spawnCloudSession mirrors SSH async IIFE pattern; detectManagedBackend probes `authMethod === 'claude.ai'`; RemoteAggregator wired with CloudPoller forwarding JSON strings.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create remote-cloud.cjs with CloudPoller and spawnCloudSession | ab1cbeb | packages/dispatcher/lib/remote-cloud.cjs |
| 2 | Populate remote-managed.cjs probe, wire RemoteAggregator, add cloud sourceLabel | 5a50f1a | packages/dispatcher/lib/remote-managed.cjs, aggregator.cjs, tmux-fanout.cjs |

## What Was Built

### remote-cloud.cjs (new)

- `CloudPoller` class: polls `claude task status <taskId> --json` at configurable interval (default 5000ms). Emits three event shapes: `cloud_heartbeat` (running), `session_end` (completed), `cloud_error` (CLI failure). Stops automatically on both non-running status AND errors.
- `spawnCloudSession`: mirrors `remote-ssh.cjs` async IIFE + synchronous kill handle pattern. All CLI calls go through `_deps.execCommand` injection. Catches CLI failure gracefully (command doesn't exist in v2.1.87).

### remote-managed.cjs (replaced stub)

Real OAuth probe replacing the v0.18 stub. Runs `claude auth status --json`, checks `loggedIn === true AND authMethod === 'claude.ai'`. Uses `--json` flag (not `--output-format json` which doesn't exist). Accepts `_deps` injection for testing.

### aggregator.cjs (RemoteAggregator wired)

`RemoteAggregator` now creates a `CloudPoller` in `start()`. Extracts `taskId` from the session file path via `path.basename`. Forwards events as `JSON.stringify(event)` strings to satisfy the Aggregator `onLine` string contract.

### tmux-fanout.cjs (one-line change)

Added `if (backend === 'cloud') return 'C';` before the fallback `return 'R'`. `sourceLabel('cloud')` now returns `'C'`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `spawnCloudSession`: `claude task start --remote` does not exist in CLI v2.1.87. The async IIFE catches the failure and calls `onExit(sessionId, 1)`. This is documented in the plan (Pitfall 2) and expected. The stub is intentional — the real CLI command will be wired when the CLI supports it. Plan 02 integrates this into the coordinator router.

## Self-Check: PASSED

- FOUND: packages/dispatcher/lib/remote-cloud.cjs
- FOUND: packages/dispatcher/lib/remote-managed.cjs
- FOUND: packages/dispatcher/lib/aggregator.cjs
- FOUND: packages/dispatcher/lib/tmux-fanout.cjs
- FOUND: commit ab1cbeb (Task 1)
- FOUND: commit 5a50f1a (Task 2)
