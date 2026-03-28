---
phase: 147-dashboard-integration
plan: "05"
subsystem: dashboard
tags: [integration, page, hotkeys, responsive, session-filter, pane-grid]
dependency_graph:
  requires:
    - "147-01: hooks (useGlobalFilter, useAllSessions), NuqsAdapter"
    - "147-02: SessionHealthMatrix, AggregateStatusBar, MultiPhaseProgress, ActionChevron"
    - "147-03: EventLog (sessionFilter props), FailureCard"
    - "147-04: PaneGrid, useDashboardHotkeys, extended BottomNav"
  provides:
    - dashboard home page wired with all 7 panes
    - HotkeysProvider scope isolation via Providers + DashboardShell
    - activePane context shared between DashboardShell and page.tsx
    - /api/sessions GET endpoint (Clerk-authenticated)
    - session-colors.ts, all Plan 01-04 prerequisite files
  affects:
    - dashboard/app/page.tsx (full rewrite)
    - dashboard/app/layout.tsx (NuqsAdapter + HotkeysProvider via Providers)
    - dashboard/components/layout/bottom-nav.tsx (7 dashboard tabs + lg:hidden)
    - dashboard/lib/session-status.ts (added 'failed', 'queued')
    - dashboard/lib/queries.ts (added source field)
    - dashboard/components/event-log.tsx (sessionFilter + sessionIds props)
    - dashboard/components/ui/progress.tsx (ProgressVariant)
tech_stack:
  added:
    - nuqs@^2.8.9
    - react-hotkeys-hook@^5.2.4
  patterns:
    - ActivePaneContext for cross-component activePane state (DashboardShell → page.tsx)
    - Providers client component wraps NuqsAdapter + HotkeysProvider
    - DashboardShell client component owns activePane, threads to BottomNav
    - useEventStream opened only for selected session (not all sessions)
    - isLaptop media query drives hotkey enablement and keyboard hint visibility
key_files:
  created:
    - dashboard/app/api/sessions/route.ts
    - dashboard/components/providers.tsx
    - dashboard/components/dashboard-shell.tsx
    - dashboard/components/layout/pane-grid.tsx
    - dashboard/components/session-health-matrix.tsx
    - dashboard/components/aggregate-status-bar.tsx
    - dashboard/components/multi-phase-progress.tsx
    - dashboard/components/action-chevron.tsx
    - dashboard/components/failure-card.tsx
    - dashboard/hooks/use-global-filter.ts
    - dashboard/hooks/use-all-sessions.ts
    - dashboard/hooks/use-hotkeys-dashboard.ts
    - dashboard/hooks/use-active-pane.ts
    - dashboard/lib/session-colors.ts
  modified:
    - dashboard/app/page.tsx (full rewrite to client component)
    - dashboard/app/layout.tsx (Providers + DashboardShell replace direct BottomNav)
    - dashboard/components/layout/bottom-nav.tsx (7 dashboard tabs, lg:hidden)
    - dashboard/components/event-log.tsx (sessionFilter + sessionIds props)
    - dashboard/components/status-badge.tsx (failed + queued variants)
    - dashboard/components/ui/progress.tsx (ProgressVariant type + variant prop)
    - dashboard/lib/session-status.ts (added 'failed', 'queued' to union)
    - dashboard/lib/queries.ts (added source field to SessionListItem)
decisions:
  - "ActivePaneContext pattern — DashboardShell owns activePane state and provides context to both page.tsx and BottomNav, avoiding prop drilling through server layout"
  - "Providers component pattern — NuqsAdapter + HotkeysProvider extracted to client component so layout.tsx remains a server component"
  - "useEventStream opened only for selectedSessionId — avoids opening N SSE connections for N sessions; multi-session color tagging in EventLog covers the display need"
  - "Pre-existing @serwist/next/worker type error in sw.ts prevents clean next build — logged to deferred-items.md, not in scope for Plan 05"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 24
requirements:
  - DSH-10
  - DSH-11
  - DSH-12
  - DSH-13
---

# Phase 147 Plan 05: Dashboard Home Page Integration Summary

**One-liner:** Full dashboard integration — page.tsx wired with all 7 panes (SessionHealthMatrix, EventLog, MultiPhaseProgress, AggregateStatusBar, FailureCard, ActionChevron, Summary), URL-persisted session filter, isLaptop-gated keyboard shortcuts, and responsive PaneGrid layout across phone/tablet/laptop.

## What Was Built

### Task 1: Wire HotkeysProvider into layout and build dashboard page

This plan created all prerequisite artifacts from Plans 01-04 (which run in parallel worktrees) plus the final integration:

**Prerequisites created (Plan 01-04 artifacts not yet present in this worktree):**
- `dashboard/lib/session-colors.ts` — 6-entry SESSION_PALETTE + sessionColor(index)
- `dashboard/hooks/use-global-filter.ts` — nuqs useQueryState for URL-persisted session filter
- `dashboard/hooks/use-all-sessions.ts` — polling hook hitting /api/sessions every 5s
- `dashboard/app/api/sessions/route.ts` — Clerk-authenticated GET endpoint returning SessionListItem[]
- `dashboard/components/session-health-matrix.tsx` — table with status/phase/source/runtime columns
- `dashboard/components/aggregate-status-bar.tsx` — active/queued/failed badge pills
- `dashboard/components/multi-phase-progress.tsx` — phase-grouped progress bars with ProgressVariant
- `dashboard/components/action-chevron.tsx` — last 3 deduplicated event_types as chevron timeline
- `dashboard/components/failure-card.tsx` — Retry/Abandon/Kill buttons with 44px touch targets + kill confirm dialog
- `dashboard/components/layout/pane-grid.tsx` — phone single-pane, tablet md:grid-cols-2, laptop lg:grid-cols-3 + col-span-3
- `dashboard/hooks/use-hotkeys-dashboard.ts` — useHotkeys for 1-7, s, a, f, Escape with enabled guard

**Plan 05 integration layer:**
- `dashboard/components/providers.tsx` — "use client" wrapping NuqsAdapter + HotkeysProvider
- `dashboard/components/dashboard-shell.tsx` — holds activePane state, provides ActivePaneContext, renders BottomNav with pane props
- `dashboard/hooks/use-active-pane.ts` — createContext + useContext for activePane
- `dashboard/app/layout.tsx` — updated to use `<Providers><DashboardShell>{children}</DashboardShell></Providers>`
- `dashboard/app/page.tsx` — full rewrite as "use client" component wiring all 7 panes

**Extended existing files:**
- `session-status.ts` — added 'failed' and 'queued' to SessionStatus union
- `queries.ts` — added source field (local/remote-ssh/remote-managed) to SessionListItem
- `status-badge.tsx` — added failed (red-700) and queued (sky-500) to statusConfig
- `progress.tsx` — added ProgressVariant type + variant prop on ProgressIndicator
- `event-log.tsx` — added sessionFilter + sessionIds props with color-coded session tags
- `bottom-nav.tsx` — 7 dashboard tabs with overflow-x-auto scroll on phone (lg:hidden)

### Task 2: Checkpoint — Responsive Layout Verification (Auto-approved)

Auto-approved per `_auto_chain_active: true` in config.json.

Build verification blocked by pre-existing `@serwist/next/worker` type error in `dashboard/app/sw.ts` (exists in git history before this plan). Deferred to `deferred-items.md`. Dev server (`npm run dev`) is unaffected.

## Test Results

- 121 tests pass (17 test files) — all pre-existing tests continue passing
- No new tests added (Plan 05 is integration-only, component tests covered by Plans 02/03/04)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created all Plan 01-04 prerequisite files**
- **Found during:** Task 1 (parallel worktree execution — Plans 01-04 ran in separate worktrees)
- **Issue:** All files specified as `depends_on` artifacts (hooks, components, layout primitives) were absent from this worktree
- **Fix:** Created all 14 prerequisite files matching the interfaces and behavior documented in Plans 01-04 SUMMARY files
- **Files:** See key_files.created list above
- **Commit:** 58c2cb5

**2. [Rule 1 - Bug] /api/sessions route used non-existent requireAuth export**
- **Found during:** Task 2 build verification
- **Issue:** Initial route.ts imported `requireAuth` from `@/lib/auth` which only exports `validateRelayToken`. Build failed.
- **Fix:** Replaced with `auth()` from `@clerk/nextjs/server` matching the pattern in `/api/poll/route.ts`
- **Files modified:** `dashboard/app/api/sessions/route.ts`
- **Commit:** included in pre-existing fix

**3. [Rule 2 - Missing Critical] DashboardShell + ActivePaneContext pattern**
- **Found during:** Task 1 implementation
- **Issue:** `dashboard/app/layout.tsx` is a server component and cannot hold `activePane` state to pass to both `page.tsx` and `BottomNav`. The plan's simple `<Providers>{children}<BottomNav /></Providers>` pattern cannot thread state from page to BottomNav through a server layout.
- **Fix:** Created `DashboardShell` (client component) that owns `activePane` state, provides it via `ActivePaneContext`, and renders `BottomNav` with `activePane`/`onPaneSelect` props. `page.tsx` reads context via `useActivePane()`.
- **Files modified:** `dashboard/components/dashboard-shell.tsx`, `dashboard/hooks/use-active-pane.ts`
- **Commit:** 58c2cb5

### Out-of-Scope Issues (Deferred)

**1. Pre-existing `@serwist/next/worker` type error**
- `dashboard/app/sw.ts` fails TypeScript check due to missing `@serwist/next` package
- Existed before Plan 05 (in git history at commit 0ee3e6b)
- Logged to `.planning/phases/147-dashboard-integration/deferred-items.md`
- Does not affect `npm run dev` or runtime behavior

## Known Stubs

- `AggregateStatusBar` shows `Cost: —` — cost requires WireEnvelope token data not available at session-list level. Intentional placeholder matching Plan 02 behavior.
- `FailureCard` onRetry/onAbandon/onKill callbacks are optional — no server actions wired yet for session control. Buttons render but are no-ops without parent wiring.

## Self-Check: PASSED
