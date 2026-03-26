---
phase: 140-clerk-public-route-fix
plan: 01
subsystem: auth
tags: [clerk, nextjs, middleware, route-matcher, nyquist]

# Dependency graph
requires:
  - phase: 137-approval-gates
    provides: approval-response route handler with validateRelayToken auth
  - phase: 139-production-hardening
    provides: cron/gc route handler with CRON_SECRET auth
provides:
  - PUBLIC_ROUTES exported const with 4 entries including /api/approval-response and /api/cron/gc
  - Clerk middleware bypasses Clerk auth for relay Bearer-token and cron CRON_SECRET routes
  - Nyquist regression test file preventing future accidental route removal
affects: [137-approval-gates, 139-production-hardening, future-middleware-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Export PUBLIC_ROUTES as const from proxy.ts — testable without mocking Clerk runtime"
    - "Spread PUBLIC_ROUTES into createRouteMatcher — single source of truth for public route config"

key-files:
  created:
    - dashboard/__tests__/proxy-public-routes.test.ts
  modified:
    - dashboard/proxy.ts

key-decisions:
  - "Export PUBLIC_ROUTES as const array from proxy.ts — enables direct import in tests without Clerk runtime mocking"
  - "No wildcards on /api/approval-response or /api/cron/gc — exact paths, no child routes exist"
  - "TDD RED/GREEN: test file created first with failing assertions, then proxy.ts updated to make them pass"

patterns-established:
  - "Clerk public route config: export PUBLIC_ROUTES array, spread into createRouteMatcher — keeps array as single source of truth"

requirements-completed: [APR-04]

# Metrics
duration: 5min
completed: 2026-03-26
---

# Phase 140 Plan 01: Clerk Public Route Fix Summary

**Exported PUBLIC_ROUTES const in proxy.ts adds /api/approval-response and /api/cron/gc as Clerk-bypassed routes, unblocking relay approval polling and Vercel cron GC**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T00:07:00Z
- **Completed:** 2026-03-26T00:12:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Extracted public route array into exported `PUBLIC_ROUTES` const with `as const` for type safety and testability
- Added `/api/approval-response` to public routes — relay Bearer-token GET now reaches `validateRelayToken` (APR-04 unblocked)
- Added `/api/cron/gc` to public routes — Vercel cron CRON_SECRET GET now reaches GC handler (HRD-05 unblocked)
- Created Nyquist regression test file with 4 tests (PR-01 through PR-04) preventing future route removal
- All 121 dashboard tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add public routes to Clerk middleware matcher and create regression test** - `52e2585` (feat)

## Files Created/Modified

- `dashboard/proxy.ts` — Added `export const PUBLIC_ROUTES` with 4 routes; spread into `createRouteMatcher`
- `dashboard/__tests__/proxy-public-routes.test.ts` — 4 Nyquist regression tests (PR-01 through PR-04)

## Decisions Made

- Export `PUBLIC_ROUTES` as a named const — this allows test files to import directly without needing to mock the Clerk runtime, making tests fast and reliable
- No wildcards on new routes — `/api/approval-response` and `/api/cron/gc` are exact paths with no child routes, so wildcards would be unnecessarily permissive
- TDD RED then GREEN: test file created first confirming all 4 tests fail (PUBLIC_ROUTES undefined), then proxy.ts updated to make all pass

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — straightforward implementation following plan specification.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- APR-04 unblocked: relay's `getApprovalResponse` GET requests will no longer receive Clerk 401; handler's `validateRelayToken` check takes over
- HRD-05 unblocked: Vercel cron GC GET requests will no longer receive Clerk 401; handler's CRON_SECRET check takes over
- Handler-level auth in both route files unchanged — security maintained
- Regression guard in place: any future accidental removal of these routes from PUBLIC_ROUTES will fail the PR-* Nyquist tests

---
*Phase: 140-clerk-public-route-fix*
*Completed: 2026-03-26*
