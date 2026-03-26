---
phase: 137-approval-gates
plan: "01"
subsystem: dashboard-approval-data-layer
tags: [approval-gates, redis, api-routes, tdd, event-filtering]
one-liner: "Approval data layer: filter taxonomy, detection logic, Redis queries with 1h TTL + one-shot delete, and dual-auth /api/approval-response endpoint"

dependency-graph:
  requires:
    - dashboard/lib/wire-schema.ts (WireEnvelope type with approval_id field)
    - dashboard/lib/redis.ts (Upstash Redis client)
    - dashboard/lib/auth.ts (validateRelayToken for Bearer auth)
    - "@clerk/nextjs/server (Clerk auth for dashboard POST)"
  provides:
    - "EVENT_FILTER_GROUPS.approvals filter group for EventLog tab"
    - "findPendingApproval() — order-independent unresponded request detection"
    - "writeApprovalResponse() — Redis hash with 1h TTL at pde:default:approvals:{sid}:{aid}"
    - "readApprovalResponse() — one-shot read+delete"
    - "/api/approval-response POST (Clerk auth) + GET (Bearer auth)"
    - "pending_approval_id on session hash (set on approval_request, cleared on approval_response)"
    - "SessionListItem.pendingApprovalId field"
  affects:
    - "EventLog component — approvals tab rendered automatically from filter group"
    - "SessionCard (Plan 02) — reads pendingApprovalId for approval badge"
    - "PDE relay (Plan 03) — polls GET /api/approval-response to deliver response"

tech-stack:
  added:
    - "zod ApprovalResponseSchema — uuid + enum(['approved','denied']) validation"
    - "Redis pipeline pattern for writeApprovalResponse (hset + expire in one round-trip)"
    - "vi.mocked() + as never cast pattern for Clerk auth mocking in vitest"
  patterns:
    - "TDD RED/GREEN discipline — tests written and confirmed failing before implementation"
    - "Dual-auth route pattern — POST uses Clerk (dashboard user), GET uses Bearer (relay daemon)"
    - "One-shot Redis semantics — readApprovalResponse deletes key after first successful read"
    - "Set-based approval detection — order-independent, works with newest-first event arrays"

key-files:
  created:
    - dashboard/lib/__tests__/approval.test.ts
    - dashboard/lib/__tests__/approval-response.test.ts
    - dashboard/app/api/approval-response/route.ts
  modified:
    - dashboard/lib/event-types.ts (added approvals filter group)
    - dashboard/lib/queries.ts (added findPendingApproval, writeApprovalResponse, readApprovalResponse, pendingApprovalId on SessionListItem)
    - dashboard/lib/__tests__/event-filters.test.ts (added approvals filter group tests)
    - dashboard/app/api/ingest/route.ts (pending_approval_id tracking on session hash)

decisions:
  - "[Phase 137-01]: zod v4 uuid validation is stricter than RFC 4122 — test UUIDs must use valid version/variant bits; used well-known UUIDs (550e8400-e29b... and 6ba7b810-9dad...) in test fixtures"
  - "[Phase 137-01]: vi.mocked() + as never cast used for Clerk auth mock — Clerk's auth() returns a complex discriminated union that cannot be partially satisfied without casting"
  - "[Phase 137-01]: Test globals (describe/it/expect) produce TS errors across all test files — pre-existing gap where tsconfig lacks vitest/globals types; not caused by this plan"

requirements-completed:
  - APR-01
  - APR-03
  - APR-04
  - APR-05

metrics:
  duration: "~20 minutes"
  completed_date: "2026-03-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 4
  tests_added: 30
  tests_total: 87
  test_pass_rate: "87/87 (100%)"
  commits: 2
---

# Phase 137 Plan 01: Approval Data Layer Summary

Approval data layer with filter taxonomy, detection logic, Redis queries with 1h TTL and one-shot delete semantics, and dual-auth /api/approval-response endpoint.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add approvals filter group, findPendingApproval, query helpers, and tests (TDD) | 23dffc4 | event-types.ts, queries.ts, approval.test.ts, approval-response.test.ts, route.ts |
| 2 | Create /api/approval-response route and extend ingest route | 45ea66e | ingest/route.ts, queries.ts (SessionListItem), approval-response.test.ts (mock fix) |

## What Was Built

**Filter taxonomy:** `EVENT_FILTER_GROUPS.approvals` added with `['approval_request', 'approval_response']`. The `FilterGroup` type expands automatically via `keyof typeof EVENT_FILTER_GROUPS`. The EventLog component will render an Approvals tab without further changes.

**Approval detection:** `findPendingApproval(events)` builds a Set of all `approval_id` values from `approval_response` events, then scans for the first `approval_request` not in that Set. This is order-independent — works correctly with newest-first arrays (response at index 0, request at index 3).

**Redis query helpers:**
- `writeApprovalResponse(sessionId, approvalId, action, responderId)` — writes `pde:default:approvals:{sid}:{aid}` hash with 1h TTL via pipeline (hset + expire in one round-trip)
- `readApprovalResponse(sessionId, approvalId)` — hgetall + del in single key lifecycle (one-shot semantics per D-13)

**Dual-auth API endpoint** at `/api/approval-response`:
- POST: Clerk auth (`isAuthenticated`), zod schema (`session_id` uuid + `approval_id` uuid + `action` enum), calls `writeApprovalResponse`, returns `{ ok: true }`
- GET: Bearer token auth (`validateRelayToken`), query params `session_id` + `approval_id`, returns payload or `{ pending: true }` with 404

**Ingest extension:** Each batch event is scanned for `approval_request` (sets `pending_approval_id`) and `approval_response` (clears it to empty string). All pipeline commands execute in the same single round-trip.

**SessionListItem:** Added `pendingApprovalId: string | null` field. Both `getSessions()` and `getSessionMeta()` read `raw.pending_approval_id || null` and include it in return objects.

## Test Coverage

- `event-filters.test.ts`: 2 new tests for approvals filter group (contains both types, filters correctly, empty array case)
- `approval.test.ts`: 6 tests for `findPendingApproval` (single request, responded request, empty, two requests, out-of-order newest-first)
- `approval-response.test.ts`: 8 tests covering POST 401 (no Clerk session), POST 422 (missing action, invalid enum), POST 200 (valid body + writeApprovalResponse call), GET 401 (invalid Bearer), GET 400 (missing params), GET 404 (no Redis key), GET 200 (one-shot payload)

Full suite: **87/87 tests passing**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test UUIDs failing zod v4 UUID validation**
- **Found during:** Task 1 (GREEN phase — POST 200 test returned 422 instead of 200)
- **Issue:** Test UUIDs `11111111-1111-1111-1111-111111111111` and `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` do not satisfy zod v4's strict RFC 4122 UUID pattern (requires valid version bits 1-8 and variant bits 8-b). The POST route's zod schema correctly rejected them.
- **Fix:** Replaced test UUIDs with RFC 4122 compliant well-known UUIDs (`550e8400-e29b-41d4-a716-446655440000` for SESSION_ID, `6ba7b810-9dad-11d1-80b4-00c04fd430c8` for APPROVAL_ID)
- **Files modified:** `dashboard/lib/__tests__/approval-response.test.ts`
- **Commit:** 45ea66e

**2. [Rule 1 - Bug] Fixed vi.mocked() type cast for Clerk auth mock**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `auth as ReturnType<typeof vi.fn>` caused TS2352 overlap error. `vi.mocked(auth).mockResolvedValue({ isAuthenticated: false })` caused TS2345 because Clerk's auth() returns a complex discriminated union requiring many fields.
- **Fix:** Changed mock casts to `vi.mocked()` pattern and added `as never` to `mockResolvedValue()` calls to satisfy TypeScript without altering test behavior
- **Files modified:** `dashboard/lib/__tests__/approval-response.test.ts`
- **Commit:** 45ea66e

**Out-of-scope pre-existing issue (not fixed):** All test files including the pre-existing `event-filters.test.ts`, `derive-cost.test.ts`, `derive-progress.test.ts` have TS2593 errors for `describe`/`it`/`expect` globals because tsconfig lacks `vitest/globals` types. This is pre-existing and not caused by this plan. Logged for future plan.

## Self-Check: PASSED

- FOUND: dashboard/lib/event-types.ts
- FOUND: dashboard/lib/queries.ts
- FOUND: dashboard/app/api/approval-response/route.ts
- FOUND: dashboard/lib/__tests__/approval.test.ts
- FOUND: dashboard/lib/__tests__/approval-response.test.ts
- FOUND: commit 23dffc4 (Task 1)
- FOUND: commit 45ea66e (Task 2)
