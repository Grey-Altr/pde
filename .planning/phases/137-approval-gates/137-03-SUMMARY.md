---
phase: 137-approval-gates
plan: "03"
subsystem: relay-daemon
tags: [approval-polling, relay, http-get, zero-deps, tdd]
requirements-completed: [APR-03, APR-04]

dependency_graph:
  requires: ["137-01"]
  provides: ["relay-approval-polling"]
  affects: ["bin/lib/relay.cjs", "tests/relay-approval.test.cjs"]

tech_stack:
  added: []
  patterns: ["HTTP GET polling with setInterval", "Map-based pending approval tracking", "NDJSON stdout emission for PDE consumption"]

key_files:
  created:
    - tests/relay-approval.test.cjs
  modified:
    - bin/lib/relay.cjs

decisions:
  - "getApprovalResponse uses same node:https/http pattern as postEvents — zero npm deps maintained"
  - "approvalUrl derived by replacing /api/ingest with /api/approval-response in ingestUrl"
  - "Approval responses written to stdout as NDJSON — PDE reads relay stdout for bidirectional loop"

metrics:
  duration: "1 minute"
  completed_date: "2026-03-25"
  tasks_completed: 1
  files_created: 1
  files_modified: 1
---

# Phase 137 Plan 03: Approval Response Polling Summary

**One-liner:** Relay daemon gains `getApprovalResponse` HTTP GET polling with 3s interval and 10-minute timeout, completing the bidirectional dashboard-to-PDE approval loop.

## What Was Built

Extended `bin/lib/relay.cjs` with:

1. **`getApprovalResponse(approvalUrl, bearerToken, sessionId, approvalId)`** — HTTP GET function that polls `/api/approval-response` with Bearer auth and query params. Returns parsed JSON on 200, `null` on 404, network error, or timeout. Never rejects.

2. **Approval polling in `startRelay`:**
   - Derives `approvalUrl` from `ingestUrl` by replacing `/api/ingest` with `/api/approval-response`
   - `pendingApprovals` Map tracks `approval_id -> { sessionId, startedAt }`
   - `setInterval` polls every `APPROVAL_POLL_INTERVAL = 3000` ms
   - Times out after `APPROVAL_TIMEOUT = 600000` ms (10 minutes)
   - When response arrives, writes NDJSON `{ type: 'approval_response', ... }` to stdout

3. **`approval_request` detection in `onLine` callback** — when a tailed event has `event_type === 'approval_request'`, the `approval_id` is registered in `pendingApprovals`

4. **Cleanup in `stop()`** — `clearInterval(approvalPollTimer)` and `pendingApprovals.clear()`

5. **Updated exports** — `getApprovalResponse` added to `module.exports`

## TDD Execution

- **RED:** Created `tests/relay-approval.test.cjs` with 4 tests using a local `node:http` test server. Tests failed with `TypeError: getApprovalResponse is not a function`
- **GREEN:** Implemented `getApprovalResponse` and approval polling. All 4 tests pass.

## Verification

```
npx vitest run tests/relay-approval.test.cjs --reporter=verbose
  4 passed (4)
```

Acceptance criteria checked:
- `function getApprovalResponse(` — present
- `getApprovalResponse` in module.exports — present
- `pendingApprovals` Map — present
- `APPROVAL_POLL_INTERVAL` = 3000 — present
- `APPROVAL_TIMEOUT` = 600000 — present
- `approval_request` detection in onLine — present
- `clearInterval(approvalPollTimer)` in stop() — present
- `api/approval-response` URL derivation — present
- Zero npm `require()` calls — confirmed

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7bfde08 | test | Add failing tests for getApprovalResponse approval polling (RED) |
| bc2b5b3 | feat | Add getApprovalResponse and approval polling to relay daemon (GREEN) |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files exist:
- `/Users/greyaltaer/code/projects/Platform Development Engine/.claude/worktrees/agent-a5f4e36b/bin/lib/relay.cjs` — FOUND
- `/Users/greyaltaer/code/projects/Platform Development Engine/.claude/worktrees/agent-a5f4e36b/tests/relay-approval.test.cjs` — FOUND

### Commits exist:
- 7bfde08 — FOUND
- bc2b5b3 — FOUND

## Self-Check: PASSED
