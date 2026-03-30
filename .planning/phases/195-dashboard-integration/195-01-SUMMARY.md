---
phase: 195-dashboard-integration
plan: 01
subsystem: ui
tags: [redis, nextjs, server-actions, typescript, testing, cloud-dispatch]

# Dependency graph
requires:
  - phase: 194-intelligent-routing
    provides: cloud backend routing and classify.cjs
  - phase: 192-git-based-state-sync
    provides: cloud sync direction rules
  - phase: 191-docker-container-backend
    provides: docker session source type
provides:
  - Extended SessionListItem with syncStatus, syncLastTs, syncConflicts, cloudSessionUrl, infraCostUsdCents
  - Ingest route writes sync_status, sync_last_ts, sync_conflicts, cloud_session_url, container_uptime_s, infra_cost_usd_cents
  - Cloud session control server actions (startCloudSession, stopCloudSession, inspectCloudSession)
  - DSH integration test scaffold covering DSH-01 through DSH-06
affects: [195-dashboard-integration, 196-state-sync-visibility, 197-cloud-cost-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - source-inspection tests for server actions (readFileSync, no DOM)
    - Redis hash fields for cloud sync/cost state
    - HTTP dispatch for cloud session control (never process.kill)

key-files:
  created:
    - dashboard/__tests__/dsh-dashboard-integration.test.ts
  modified:
    - dashboard/lib/queries.ts
    - dashboard/app/api/ingest/route.ts
    - dashboard/app/actions.ts
    - dashboard/__tests__/aggregate-status.test.ts
    - dashboard/__tests__/derive-variant.test.ts

key-decisions:
  - "stopCloudSession uses HTTP fetch to PDE_DISPATCHER_URL — never process.kill (cloud sessions have no local PID)"
  - "infraCostUsdCents computed from container_uptime_s * PDE_INFRA_COST_RATE_CENTS_PER_HOUR at ingest time (not query time)"
  - "DSH-01/04/05 tests intentionally fail in Plan 01 — Plan 02/03 UI changes will make them pass"

patterns-established:
  - "DSH test scaffold pattern: source-inspection with existsSync guard for files not yet created"
  - "Cloud cost computation: Math.round((uptimeSec / 3600) * ratePerHour) on session_end event"

requirements-completed: [DSH-06, DSH-03]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 195 Plan 01: Dashboard Integration Data Layer Summary

**Extended SessionListItem with 5 sync/cost fields, added HTTP-based cloud session actions, and scaffolded DSH-01 through DSH-06 integration tests with source-inspection pattern**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-30T17:53:54Z
- **Completed:** 2026-03-30T17:57:39Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 created)

## Accomplishments

- Added 5 new fields to `SessionListItem`: `syncStatus`, `syncLastTs`, `syncConflicts`, `cloudSessionUrl`, `infraCostUsdCents` — populated in both `getSessions()` and `getSessionMeta()` with Redis-safe fallbacks (JSON.parse guarded)
- Extended ingest route to handle `cloud_sync_complete`, `cloud_session_url` on session_start, and `container_uptime_s` / infra cost on session_end
- Added three cloud session server actions: `startCloudSession` and `stopCloudSession` use HTTP fetch to `PDE_DISPATCHER_URL`; `inspectCloudSession` reads Redis directly
- Created DSH integration test scaffold — DSH-02, DSH-03, DSH-06 tests pass immediately; DSH-01/04/05 tests correctly fail until Plan 02/03 updates the UI components

## Task Commits

1. **Task 1: Extend data layer — queries.ts and ingest route** - `52a3ec7` (feat)
2. **Task 2: Cloud session control actions + DSH-06 verification** - `83ba554` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `dashboard/lib/queries.ts` — SessionListItem interface extended; getSessions/getSessionMeta mapping updated with safe Redis fallbacks
- `dashboard/app/api/ingest/route.ts` — cloud_sync_complete event handling, cloud_session_url on session_start, infra cost computation on session_end
- `dashboard/app/actions.ts` — startCloudSession, stopCloudSession, inspectCloudSession server actions added
- `dashboard/__tests__/dsh-dashboard-integration.test.ts` — source-inspection tests for DSH-01 through DSH-06 (created)
- `dashboard/__tests__/aggregate-status.test.ts` — makeSession fixture updated with new required fields (Rule 1 fix)
- `dashboard/__tests__/derive-variant.test.ts` — makeSession fixture updated with new required fields (Rule 1 fix)

## Decisions Made

- `stopCloudSession` uses HTTP fetch to PDE_DISPATCHER_URL instead of `process.kill` — cloud sessions run remotely, have no local PID
- `infraCostUsdCents` computed at ingest time (session_end event) from `container_uptime_s` field using `PDE_INFRA_COST_RATE_CENTS_PER_HOUR` env var — default 0 when unset
- DSH-01/04/05 tests intentionally fail in Plan 01; they serve as forward-contracts that Plan 02/03 UI changes must satisfy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated makeSession fixture in aggregate-status.test.ts and derive-variant.test.ts**
- **Found during:** Task 1 (TypeScript typecheck)
- **Issue:** Both test files had `makeSession` helpers that returned `Partial<SessionListItem>` spread objects; after adding 5 new required fields to the interface, TypeScript reported type errors because the base object was missing them
- **Fix:** Added `syncStatus: null, syncLastTs: null, syncConflicts: [], cloudSessionUrl: null, infraCostUsdCents: 0` to both makeSession base objects
- **Files modified:** dashboard/__tests__/aggregate-status.test.ts, dashboard/__tests__/derive-variant.test.ts
- **Verification:** TypeScript compiles without errors on modified files; all 384 previously-passing tests continue to pass
- **Committed in:** 52a3ec7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix. No scope creep — only test fixture defaults updated to match expanded interface.

## Issues Encountered

None — the regex dotAll flag (`/s`) in the test file caused a TS1501 error (tsconfig targets pre-ES2018); replaced with `[\s\S]` equivalent.

## Known Stubs

None — all data layer fields are wired to Redis. DSH-01/04/05 UI stubs are in components not modified by this plan (Plan 02/03 scope).

## Next Phase Readiness

- Data layer complete: downstream plans (195-02, 195-03) can consume `syncStatus`, `cloudSessionUrl`, `infraCostUsdCents` from `SessionListItem`
- Cloud session action contracts defined: UI controls can call `startCloudSession`/`stopCloudSession` via server actions
- Test scaffold in place: 11 failing tests act as acceptance gates for Plan 02/03 UI work
- No blockers for Plan 02

## Self-Check: PASSED

All files verified to exist. All commits verified in git log.

---
*Phase: 195-dashboard-integration*
*Completed: 2026-03-30*
