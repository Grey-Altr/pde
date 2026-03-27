---
phase: 153-dashboard-auth-ux
plan: 01
subsystem: auth
tags: [next.js, react, hooks, clerk, dashboard, polling]

# Dependency graph
requires:
  - phase: 150-dashboard-hardening
    provides: Clerk auth guard on /api/sessions route (returns 401 when unauthenticated)
provides:
  - 401 detection in useAllSessions hook with client-side redirect to /sign-in
  - Polling interval cleared on 401 to prevent continued unauthenticated requests
affects: [dashboard-auth, dashboard-sessions, dashboard-polling]

# Tech tracking
tech-stack:
  added: []
  patterns: [useRouter from next/navigation for client-side redirect in polling hooks]

key-files:
  created:
    - dashboard/__tests__/auth-ux.test.ts
  modified:
    - dashboard/hooks/use-all-sessions.ts

key-decisions:
  - "useAllSessions uses async tick() with explicit status checks instead of .then().catch() chain — enables res.status inspection before parsing JSON"
  - "clearInterval(id) called before router.push on 401 — prevents orphaned polling intervals after redirect"
  - "Non-401 non-ok responses handled silently (if (!res.ok) return) — no redirect for 500s, preserves existing behavior"
  - "router added to useEffect dependency array — required by React rules for stability"

patterns-established:
  - "Source-inspection tests (readFileSync) used for hook behavior validation — avoids jsdom/DOM dependency for simple string-pattern checks"
  - "TDD RED/GREEN pattern: test file committed before implementation, tests confirmed failing before implementation committed"

requirements-completed: [AUX-01]

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 153 Plan 01: Dashboard Auth UX Summary

**useAllSessions hook now detects 401 from /api/sessions and redirects to /sign-in, closing the INT-AUTH-SILENT gap where unauthenticated users saw a blank dashboard**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-27T21:16:20Z
- **Completed:** 2026-03-27T21:17:29Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Added `useRouter` from `next/navigation` to `useAllSessions` for client-side redirect capability
- 401 response now triggers `clearInterval(id)` + `router.push('/sign-in')` + early return — no empty state shown
- Non-401 errors (500, network failures) remain silently ignored — no behavioral regression
- 5 source-inspection tests in `auth-ux.test.ts` cover the AUX-01 contract: import, status check, redirect call, early return, non-ok handling
- All 217 tests pass (212 pre-existing + 5 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auth-ux source-inspection test (RED)** - `e9c2bba` (test)
2. **Task 2: Add 401 detection and sign-in redirect to useAllSessions (GREEN)** - `6000851` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks have separate test and implementation commits_

## Files Created/Modified
- `dashboard/__tests__/auth-ux.test.ts` - 5 source-inspection tests for AUX-01 auth redirect behavior
- `dashboard/hooks/use-all-sessions.ts` - Added useRouter, async tick(), 401 detection with clearInterval + router.push + return

## Decisions Made
- `useAllSessions` refactored from `.then().catch()` chain to `async tick()` — only way to inspect `res.status` before parsing JSON body
- `id` declared with `let` outside `tick()` so `clearInterval(id)` can be called inside `tick()` on 401 detection
- `router` added to `useEffect` deps array — React correctness requirement, stale closure avoidance

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- AUX-01 satisfied: authenticated users redirected to /sign-in on session expiry or unauth access
- Dashboard no longer shows blank state for unauthenticated users
- Phase 153 complete — all v0.18 dashboard auth UX requirements addressed

---
*Phase: 153-dashboard-auth-ux*
*Completed: 2026-03-27*
