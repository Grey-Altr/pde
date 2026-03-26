---
phase: 137-approval-gates
generated: "2026-03-25T00:00:00Z"
finding_count: 5
high_count: 2
has_bdd_candidates: true
---

# Phase 137: Edge Cases

**Generated:** 2026-03-25
**Findings:** 5 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] approval_response route POST has no error rollback if Redis pipeline exec fails

**Plan element:** `dashboard/app/api/approval-response/route.ts POST`
**Category:** error_path

The POST handler calls `writeApprovalResponse` which does `p.hset` + `p.expire` + `await p.exec()`. If `p.exec()` throws a network or Upstash error after the pipeline is built, no error is surfaced to the caller — the action returns `{ ok: true }` only AFTER `await writeApprovalResponse(...)`. However, the `writeApprovalResponse` function itself doesn't wrap the pipeline exec in a try/catch, so an Upstash failure will propagate as an unhandled promise rejection to the POST route, resulting in a 500 with no user-visible feedback. The plan action does not specify error handling inside `writeApprovalResponse`.

**BDD Acceptance Criteria Candidate:**
```
Given the Upstash Redis pipeline exec throws a network error
When a dashboard user submits an approval POST request
Then the route returns 500 with a structured error body rather than a bare unhandled rejection
```

### 2. [HIGH] Relay approval polling timer not cleared on stop() when approvalPollTimer is null

**Plan element:** `bin/lib/relay.cjs startRelay`
**Category:** error_path

Plan 03 Task 1 creates `approvalPollTimer` conditionally: `const approvalPollTimer = approvalUrl ? setInterval(...) : null`. The stop() handler calls `if (approvalPollTimer) clearInterval(approvalPollTimer)`. This is correct. However, the `pendingApprovals` Map entries from before stop() was called are never resolved — any active polling loop iteration that is mid-await when stop() is called will continue running until the HTTP timeout (10 seconds), then write to `process.stdout` after the relay has stopped. The plan does not specify aborting in-flight getApprovalResponse calls on stop.

**BDD Acceptance Criteria Candidate:**
```
Given the relay is stopped while an approval HTTP poll is in flight
When the in-flight getApprovalResponse eventually resolves
Then it does not write to process.stdout after the relay handle is stopped
```

### 3. [MEDIUM] Empty approval response key (hgetall returns empty hash, not null)

**Plan element:** `readApprovalResponse` in `dashboard/lib/queries.ts`
**Category:** empty_state

The `readApprovalResponse` function checks `if (data && Object.keys(data).length > 0)`. Upstash `hgetall` returns `null` for a missing key in most SDK versions, but may return an empty object `{}` for a key that exists with no fields. The plan accounts for this with the `Object.keys(data).length > 0` guard. However, if a race condition causes the key to be partially written (hset completed but expire hasn't committed), the data object may have incomplete fields. The plan does not validate that returned `data` has required fields (`approval_id`, `action`) before returning it.

### 4. [MEDIUM] Multiple simultaneous approval_request events in same batch

**Plan element:** `dashboard/app/api/ingest/route.ts` conditional loop
**Category:** boundary_condition

The ingest route loops over `validatedBatch` and sets `pending_approval_id` on the session hash for each `approval_request` event. If a batch contains two `approval_request` events (edge case in rapid emission), the session hash will be set to the last one in the batch. If the batch also contains an `approval_response` for the first request but not the second, the session hash will be cleared (set to empty string) for the first then overwritten for the second. The final state of `pending_approval_id` depends on the ordering of events within a batch, which is not explicitly ordered in the plan.

### 5. [LOW] Relay stdout write after session ends in approval_response emission

**Plan element:** `bin/lib/relay.cjs startRelay approvalPollTimer`
**Category:** boundary_condition

When a response is received, the relay writes NDJSON to `process.stdout`. If the approval timeout fires precisely as the session ends (PDE process is shutting down), the stdout write may occur after PDE has closed its stdin reader, resulting in a broken pipe. The plan does not specify SIGPIPE handling for the relay daemon's stdout writes. This is low severity because the relay already uses try/catch for the stdout write.
