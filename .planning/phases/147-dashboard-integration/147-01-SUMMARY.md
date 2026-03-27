---
phase: 147-dashboard-integration
plan: "01"
subsystem: dashboard
tags: [foundation, hooks, css, session-source, nuqs, progress]
dependency_graph:
  requires: []
  provides:
    - session-colors palette function
    - useGlobalFilter hook (nuqs URL state)
    - useAllSessions polling hook
    - /api/sessions GET endpoint
    - ProgressIndicator variant prop
    - progress-striped CSS animation
    - session_source Redis field (ingest + queries)
  affects:
    - dashboard/lib/queries.ts (SessionListItem type extended)
    - dashboard/lib/session-status.ts (SessionStatus type extended)
    - dashboard/app/layout.tsx (NuqsAdapter wired)
tech_stack:
  added:
    - react-hotkeys-hook@^5.2.4
    - nuqs@^2.8.9
  patterns:
    - TDD (RED → GREEN) for Task 1
    - CSS-only striped animation via repeating-linear-gradient + @keyframes
    - nuqs useQueryState for URL-persisted filter state
key_files:
  created:
    - dashboard/lib/session-colors.ts
    - dashboard/hooks/use-global-filter.ts
    - dashboard/hooks/use-all-sessions.ts
    - dashboard/app/api/sessions/route.ts
    - dashboard/__tests__/session-colors.test.ts
    - dashboard/__tests__/session-source.test.ts
    - dashboard/__tests__/progress-variant.test.ts
  modified:
    - dashboard/lib/session-status.ts
    - dashboard/lib/queries.ts
    - dashboard/app/api/ingest/route.ts
    - dashboard/components/ui/progress.tsx
    - dashboard/app/globals.css
    - dashboard/app/layout.tsx
    - dashboard/package.json
decisions:
  - "sessionColor() uses modulo 6 over a const tuple — deterministic, tree-shakeable, no state"
  - "CSS-only striped progress via repeating-linear-gradient — no framer-motion dep needed"
  - "NuqsAdapter placed inside ThemeProvider to ensure filter state available to all children including BottomNav"
  - "deriveStatus checks 'fail' before 'error' to correctly classify task_failed events as 'failed' not 'error'"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 14
---

# Phase 147 Plan 01: Foundation Layer (deps, session_source, shared primitives) Summary

**One-liner:** Session_source data pipeline from ingest to queries + color palette, nuqs global filter hook, polling sessions hook, and variant-based striped progress bars as foundation for all Phase 147 plans.

## What Was Built

### Task 1: Install deps, create shared primitives, close session_source gap

- Installed `react-hotkeys-hook@^5.2.4` and `nuqs@^2.8.9`
- Created `dashboard/lib/session-colors.ts`: 6-entry `SESSION_PALETTE` const tuple and `sessionColor(index)` deterministic color function using modulo wrapping
- Extended `SessionStatus` type: added `'failed'` and `'queued'` variants; `deriveStatus()` now checks `lastEventType.includes('fail')` → `'failed'` before the existing `'error'` check
- Extended `SessionListItem` interface: added `source: 'local' | 'remote-ssh' | 'remote-managed'`
- Extended `getSessions()` and `getSessionMeta()`: read `raw.session_source` from Redis hash, map to `source` field (default `'local'`)
- Extended ingest route: stores `session_source` in Redis hash for `session_start` events (DSH-01 gap closed)
- Created `/api/sessions` GET endpoint returning `SessionListItem[]` via `NextResponse.json(sessions)`

### Task 2: Extend Progress component, striped CSS, hooks, NuqsAdapter

- Extended `ProgressIndicator` in `dashboard/components/ui/progress.tsx`: accepts `variant?: ProgressVariant` prop; applies `progress-striped progress-executing` / `progress-striped progress-waiting` / `opacity-30` based on variant; exported `ProgressVariant` type
- Added `@keyframes progress-stripes` inside first `@theme inline` block in `globals.css`
- Added `.progress-striped` (repeating-linear-gradient 45deg), `.progress-executing` (0.6s animation), `.progress-waiting` (2s animation) utility classes
- Created `dashboard/hooks/use-global-filter.ts`: `useGlobalFilter()` using `nuqs` `useQueryState('session', parseAsString.withDefault('all'))`
- Created `dashboard/hooks/use-all-sessions.ts`: `useAllSessions(pollIntervalMs=5000)` polling `/api/sessions` via `setInterval`
- Wired `NuqsAdapter` from `nuqs/adapters/next/app` inside `ThemeProvider` in `app/layout.tsx`, wrapping both `{children}` and `<BottomNav />`

## Test Results

- 147 tests pass (20 test files) — up from 123 pre-plan
- New: `session-colors.test.ts` (9 tests), `session-source.test.ts` (10 tests), `progress-variant.test.ts` (7 tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pipeline mock missing hgetall for getSessions tests**
- **Found during:** Task 1 GREEN phase
- **Issue:** `session-source.test.ts` pipeline mock didn't include `hgetall` method; `getSessions()` calls `p.hgetall()` in pipeline
- **Fix:** Added `mockHgetallPipeline` to pipeline mock factory in `session-source.test.ts`
- **Files modified:** `dashboard/__tests__/session-source.test.ts`
- **Commit:** `7482a3e`

**2. [Rule 1 - Bug] Existing ingest test expected hset called once, now called twice**
- **Found during:** Task 1 GREEN phase
- **Issue:** `lib/__tests__/ingest.test.ts` Test 8 asserted `mockHset.toHaveBeenCalledTimes(1)` — our new `session_source` storage added a second `hset` call for `session_start` events
- **Fix:** Updated assertion to `toHaveBeenCalledTimes(2)` with descriptive comment
- **Files modified:** `dashboard/lib/__tests__/ingest.test.ts`
- **Commit:** `7482a3e`

## Known Stubs

None — all data flows are wired end-to-end. `source` field defaults to `'local'` when `session_source` is absent in Redis (intentional default, not a stub).

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits confirmed in git log (7482a3e, fcea8d9).
