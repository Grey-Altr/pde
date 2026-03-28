---
phase: 150-dashboard-hardening
plan: 01
subsystem: auth, api, ui
tags: [clerk, nextjs, server-actions, session-management, sigterm]

# Dependency graph
requires:
  - phase: 147-dashboard-integration
    provides: FailureCard component, /api/sessions route, page.tsx with session display

provides:
  - Clerk auth guard on /api/sessions (HDN-01)
  - Three session control server actions: retrySession, abandonSession, killSession (HDN-02)
  - FailureCard wired to real server actions with error display
  - Cleanup request file scheduling for abandoned sessions
  - 7 passing tests for all behaviors in hardening-hdn.test.ts

affects:
  - 150-dashboard-hardening (plan 02+)
  - Any consumer of /api/sessions or FailureCard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Clerk auth guard pattern (isAuthenticated check) reused from /api/poll/route.ts
    - readRegistry/writeRegistry helpers for dispatcher.pids file operations
    - cleanup-requests/ directory for deferred worktree cleanup scheduling

key-files:
  created:
    - dashboard/__tests__/hardening-hdn.test.ts
  modified:
    - dashboard/app/api/sessions/route.ts
    - dashboard/app/actions.ts
    - dashboard/app/page.tsx
    - dashboard/components/failure-card.tsx
    - dashboard/.env.example
    - dashboard/__tests__/session-source.test.ts

key-decisions:
  - "hardening-hdn.test.ts created as separate file from hardening.test.ts (which covers ingest/cron) to avoid mock conflicts — existing file mocks @/app/actions globally"
  - "vi.importActual used for source-inspection test (Test 7) to bypass node:fs mock and read real page.tsx content"
  - "session-source.test.ts patched with Clerk mock — auth guard addition broke two pre-existing passing tests (Rule 1 auto-fix)"

patterns-established:
  - "Source-inspection tests use vi.importActual('node:fs') when the module is also mocked in the same test file"

requirements-completed: [HDN-01, HDN-02]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 150 Plan 01: Dashboard Hardening — Auth Guard and Session Actions Summary

**Clerk auth guard on /api/sessions + three session control server actions (kill/abandon/retry) wired to FailureCard with error display and 7 passing tests**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T05:38:00Z
- **Completed:** 2026-03-27T05:46:54Z
- **Tasks:** 2
- **Files modified:** 6 (+ 1 created)

## Accomplishments

- /api/sessions route now requires Clerk authentication — unauthenticated GET returns 401 (HDN-01)
- Three server actions added to actions.ts: `killSession` (SIGTERM + registry stopped), `abandonSession` (registry abandoned + cleanup-requests file), `retrySession` (stub error) (HDN-02)
- FailureCard updated to await async action callbacks and display error messages
- FailureCard in page.tsx receives real server action props (onRetry, onAbandon, onKill)
- PDE_PROJECT_ROOT documented in .env.example for local session action usage
- All 212 dashboard tests pass (28 test files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth guard and server actions** - `a14d3da` (feat)
2. **Task 2: Tests for HDN-01 and HDN-02** - `a97462f` (test)

## Files Created/Modified

- `dashboard/app/api/sessions/route.ts` - Added Clerk auth guard (HDN-01)
- `dashboard/app/actions.ts` - Added retrySession, abandonSession, killSession server actions + helpers
- `dashboard/app/page.tsx` - Wired FailureCard with imported server action props
- `dashboard/components/failure-card.tsx` - Updated props to async, added error state display
- `dashboard/.env.example` - Added PDE_PROJECT_ROOT documentation
- `dashboard/__tests__/hardening-hdn.test.ts` - 7 tests covering HDN-01 and HDN-02
- `dashboard/__tests__/session-source.test.ts` - Added Clerk mock (Rule 1 auto-fix)

## Decisions Made

- Created `hardening-hdn.test.ts` as a new file rather than appending to the existing `hardening.test.ts` — the existing file globally mocks `@/app/actions` which would intercept the new server actions under test.
- Used `vi.importActual('node:fs')` in the source-inspection test to bypass the `node:fs` mock that covers the rest of the session action tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed session-source.test.ts broken by auth guard addition**
- **Found during:** Task 1 (auth guard on /api/sessions)
- **Issue:** Pre-existing tests SS-07 and SS-08 in session-source.test.ts import /api/sessions/route without mocking @clerk/nextjs/server. Adding the auth guard caused those tests to fail with "This module cannot be imported from a Client Component module" (server-only error from Clerk).
- **Fix:** Added `vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn().mockResolvedValue({ isAuthenticated: true }) }))` to session-source.test.ts.
- **Files modified:** dashboard/__tests__/session-source.test.ts
- **Verification:** All 212 tests pass after fix.
- **Committed in:** a14d3da (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug caused by own change)
**Impact on plan:** Essential fix to maintain green test suite. No scope creep.

## Issues Encountered

- `vi.importActual` required for source-inspection test to get real `readFileSync` when `node:fs` is mocked in the same file — straightforward resolution using the vitest documented pattern.

## User Setup Required

None - no external service configuration required beyond what was already configured. PDE_PROJECT_ROOT env var is optional and gracefully degrades (session actions return error message when absent, enabling Vercel cloud deployment without local config).

## Next Phase Readiness

- HDN-01 and HDN-02 complete — auth-guarded sessions API and wired FailureCard ready
- Phase 150 plan 02+ can build on these foundations
- Session action cleanup-requests/ directory protocol established for worktree GC integration

---
*Phase: 150-dashboard-hardening*
*Completed: 2026-03-27*

## Self-Check: PASSED

- FOUND: dashboard/app/api/sessions/route.ts
- FOUND: dashboard/app/actions.ts
- FOUND: dashboard/app/page.tsx
- FOUND: dashboard/components/failure-card.tsx
- FOUND: dashboard/__tests__/hardening-hdn.test.ts
- FOUND: .planning/phases/150-dashboard-hardening/150-01-SUMMARY.md
- FOUND commit: a14d3da
- FOUND commit: a97462f
