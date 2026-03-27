---
phase: 147-dashboard-integration
plan: "03"
subsystem: dashboard
tags: [event-log, failure-card, push-notifications, session-filtering, ux]
dependency_graph:
  requires: ["147-01"]
  provides: ["event-log-session-filter", "failure-card", "merge-push-notification"]
  affects: ["dashboard/components/event-log.tsx", "dashboard/components/failure-card.tsx", "dashboard/app/api/ingest/route.ts"]
tech_stack:
  added: []
  patterns: ["Base UI AlertDialog", "source-inspection tests", "sessionColor palette"]
key_files:
  created:
    - dashboard/components/failure-card.tsx
    - dashboard/lib/session-colors.ts
  modified:
    - dashboard/components/event-log.tsx
    - dashboard/app/api/ingest/route.ts
    - dashboard/__tests__/hardening.test.ts
    - dashboard/__tests__/failure-card.test.ts
decisions:
  - "Source inspection tests (readFileSync) used instead of @testing-library/react — vitest is configured with node environment; no DOM support available"
  - "session-colors.ts created here as Rule 3 fix — Plan 01 artifact not yet present in this worktree during parallel execution"
metrics:
  duration_seconds: 196
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 6
requirements:
  - DSH-02
  - DSH-03
  - DSH-06
  - DSH-07
---

# Phase 147 Plan 03: Event Log + FailureCard + Merge Push Summary

Multi-session EventLog with session filter/color tags, FailureCard with 44px touch-target buttons and AlertDialog kill confirmation, and session_end merge push notification in ingest route.

## Tasks Completed

### Task 1: Extend EventLog with session filter and color-coded tags
- Extended `EventLogProps` with `sessionFilter?: string` and `sessionIds?: string[]`
- Session filtering applies before event type filter: events are filtered by `session_id === sessionFilter` when not 'all'
- Color-coded session tag badges appear per row when `sessionIds.length > 1`
- Imported `sessionColor` from `@/lib/session-colors` and `Badge` from `@/components/ui/badge`
- Used `cn` from `@/lib/utils` for conditional badge class application

**Commit:** f495c42

### Task 2: FailureCard component and merge push notification (TDD)
**RED:** Created failing tests in `failure-card.test.ts` and added H-11 to `hardening.test.ts`

**GREEN:**
- Created `dashboard/components/failure-card.tsx` — "use client" component with:
  - Retry (green), Abandon (amber), Kill (destructive) buttons with `min-h-[44px] min-w-[44px]`
  - Kill button triggers Base UI AlertDialog with "Kill session?" title and worktree removal warning
  - All buttons disabled during `submitting` state
  - Card styled with `border-destructive/50 bg-destructive/5`
- Extended `dashboard/app/api/ingest/route.ts` with `session_end` push block:
  - Sends "Session Merged" push notification with `merge-{session_id}` tag
  - Fire-and-forget pattern with `.catch(() => {})` matching existing push blocks

**Commit:** 12ac7d9

## Verification Results

- `npx vitest run`: 18 test files, 132 tests — all passed
- `grep "sessionFilter" event-log.tsx` — prop confirmed
- `grep "session_end" ingest/route.ts` — push trigger confirmed
- `grep "min-h-[44px]" failure-card.tsx` — 5 instances (3 action buttons + 2 dialog buttons)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created session-colors.ts (Plan 01 artifact missing)**
- **Found during:** Task 1
- **Issue:** `dashboard/lib/session-colors.ts` did not exist — Plan 01 runs in parallel in a separate worktree and had not yet executed. EventLog import would fail without it.
- **Fix:** Created `session-colors.ts` with the exact 6-color SESSION_PALETTE specified in Plan 01's action block
- **Files modified:** `dashboard/lib/session-colors.ts` (created)
- **Commit:** f495c42

**2. [Rule 1 - Bug] Rewrote failure-card.test.ts as source inspection tests**
- **Found during:** Task 2 RED phase
- **Issue:** Test used `@testing-library/react` and `@testing-library/user-event` which are not installed. Vitest config uses `environment: 'node'` — no DOM available.
- **Fix:** Rewrote test as source inspection (readFileSync) matching the project's existing test pattern for component structural validation (as seen in bottom-nav.test.ts)
- **Files modified:** `dashboard/__tests__/failure-card.test.ts`
- **Commit:** 12ac7d9

## Known Stubs

None — all data flows are wired. FailureCard props (onRetry, onAbandon, onKill) are intentionally optional callbacks — callers wire them when integrating the component into the session detail view.

## Self-Check: PASSED
