---
phase: 141-approval-response-stdio-fix
plan: 01
subsystem: relay-ipc
tags: [relay, stdio, approval, poll, ipc, fix]
dependency_graph:
  requires: []
  provides: [relay-stdout-capture, poll-approval-subcommand]
  affects: [hooks/start-relay.cjs, bin/pde-tools.cjs]
tech_stack:
  added: []
  patterns: [fd-based-spawn-stdio, ndjson-polling]
key_files:
  created:
    - tests/relay-stdio.test.cjs
  modified:
    - hooks/start-relay.cjs
    - bin/pde-tools.cjs
decisions:
  - "[Phase 141]: Use fd-based spawn stdio to redirect relay daemon stdout to named NDJSON file — avoids EPIPE from pipe+unref pattern"
  - "[Phase 141]: Response file uses append mode ('a') to preserve responses across relay restarts"
  - "[Phase 141]: Skip response file deletion in stop-relay.cjs — avoids race condition where SessionEnd fires before poll-approval reads the response; OS tmpdir handles cleanup"
  - "[Phase 141]: poll-approval inlined in pde-tools.cjs case block (not delegated to commands module) — self-contained, no new module dependency"
requirements-completed: [APR-04]
metrics:
  duration: 7min
  completed: "2026-03-26T07:55:25Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 141 Plan 01: Approval Response Stdio Fix Summary

fd-based stdout redirect in start-relay.cjs and new poll-approval subcommand in pde-tools.cjs close the APR-04 approval response delivery gap.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Create Nyquist tests (TDD RED) | d5cf036 | tests/relay-stdio.test.cjs |
| 1 (GREEN) | Patch start-relay.cjs stdio | 51bb15e | hooks/start-relay.cjs |
| 2 | Add poll-approval subcommand | bd073fd | bin/pde-tools.cjs |

## What Was Built

**start-relay.cjs patch:** Changed relay daemon spawn from `stdio: 'ignore'` to `stdio: ['ignore', responseFd, 'ignore']` where `responseFd` is `fs.openSync(responseFile, 'a')` for `/tmp/pde-relay-responses-{sessionId}.ndjson`. The fd is closed in the parent immediately after spawn; the child holds its own copy independently. This is the canonical Node.js pattern for redirecting a detached child's stdout to a file.

**pde-tools.cjs poll-approval:** New `case 'poll-approval'` block reads `config.json` for `session_id`, constructs the response file path, scans NDJSON lines for a matching `approval_id`, and polls every 1000ms until found or deadline reached. Returns the matching JSON object or `{timed_out: true, approval_id}`.

**Tests:** 7 tests in `tests/relay-stdio.test.cjs` covering:
- RS-01 (3 tests): source inspection verifying fd-based stdio configuration
- RS-02 (1 test): integration test spawning a real child with fd-based stdio, confirming output reaches file
- RS-03 (3 tests): findResponse logic unit test, poll-approval integration (via spawnSync), poll-approval timeout

## Decisions Made

- **fd-based stdio over pipe:** `stdio: 'pipe'` with `detached+unref` causes EPIPE when parent event loop exits. File fd avoids this — child holds an independent copy after fork.
- **Append mode ('a'):** Preserves responses if relay restarts mid-session; truncation ('w') would lose prior responses.
- **No stop-relay.cjs cleanup:** Race condition risk (SessionEnd fires before poll-approval reads). `/tmp` OS cleanup is sufficient for UUID-named files (~KB each).
- **Inline implementation:** poll-approval case block is self-contained; no new module import needed.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

```
npx vitest run tests/relay-stdio.test.cjs --reporter=verbose
Test Files  1 passed (1)
Tests       7 passed (7)

grep -n "responseFd" hooks/start-relay.cjs
76:    const responseFd = fs.openSync(responseFile, 'a');
84:        stdio:    ['ignore', responseFd, 'ignore'],
90:    fs.closeSync(responseFd);

grep -n "poll-approval" bin/pde-tools.cjs
33: *   poll-approval <id> [timeout_ms]   Poll for approval response by ID
960:    case 'poll-approval': {

git diff bin/lib/relay.cjs hooks/stop-relay.cjs
(empty — untouched)
```

## Self-Check: PASSED

- FOUND: tests/relay-stdio.test.cjs
- FOUND: hooks/start-relay.cjs
- FOUND: bin/pde-tools.cjs
- FOUND: .planning/phases/141-approval-response-stdio-fix/141-01-SUMMARY.md
- FOUND: d5cf036 test(141-01): add failing Nyquist tests RS-01 RS-02 RS-03
- FOUND: 51bb15e feat(141-01): patch start-relay.cjs stdio
- FOUND: bd073fd feat(141-01): add poll-approval subcommand
