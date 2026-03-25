---
phase: 137-approval-gates
plan: "02"
subsystem: dashboard-ui
tags: [approval-gates, ui, alertdialog, base-ui, touch-targets]
one-liner: "Phone-friendly ApprovalCard with Base UI AlertDialog confirmation, wired into SessionDetail and SessionCard badge"

dependency-graph:
  requires:
    - "137-01 (findPendingApproval, SessionListItem.pendingApprovalId)"
    - "@base-ui/react ^1.3.0"
    - "dashboard/components/ui/card"
    - "dashboard/components/ui/badge"
  provides:
    - "dashboard/components/approval-card.tsx — ApprovalCard component"
    - "dashboard/lib/queries.ts — pendingApprovalId field + findPendingApproval()"
    - "dashboard/components/session-detail.tsx — ApprovalCard inserted above PhaseProgress"
    - "dashboard/components/session-card.tsx — amber Approval badge on pending sessions"
  affects:
    - "dashboard/app/sessions/[id]/page.tsx (via session-detail)"
    - "dashboard/app/page.tsx (via session-card)"

tech-stack:
  added:
    - "@base-ui/react/alert-dialog — AlertDialog.Root/Portal/Overlay/Popup/Title/Description/Close"
  patterns:
    - "AlertDialog.Portal for z-index escape from overflow-hidden containers"
    - "Controlled open state with pendingAction union type for dual-action dialogs"
    - "pendingApprovalId stored in Redis hash, surfaced via SessionListItem"
    - "findPendingApproval Set-based matching (order-independent)"

key-files:
  created:
    - dashboard/components/approval-card.tsx
  modified:
    - dashboard/lib/queries.ts
    - dashboard/components/session-detail.tsx
    - dashboard/components/session-card.tsx

requirements-completed:
  - APR-01
  - APR-02
  - APR-05

decisions:
  - "Use controlled AlertDialog.Root open state (not AlertDialog.Trigger pattern) — enables shared dialog for both approve/deny actions with pendingAction state"
  - "pendingApprovalId read from raw.pending_approval_id in Redis hash — consistent with Plan 01 storage key"
  - "findPendingApproval added to queries.ts in Plan 02 (Plan 01 did not include it) — auto-fixed as Rule 2 missing critical functionality"

metrics:
  duration: "~15 minutes"
  completed_date: "2026-03-25T23:19:49Z"
  tasks_completed: 3
  files_modified: 4
  commits: 2
---

# Phase 137 Plan 02: Approval UI — ApprovalCard, SessionDetail Wire, SessionCard Badge Summary

Phone-friendly ApprovalCard with Base UI AlertDialog confirmation, wired into SessionDetail and SessionCard badge.

## What Was Built

### Task 1: ApprovalCard Component (`dashboard/components/approval-card.tsx`)

Created a `"use client"` component that:

- Renders approval context: `context` field (or fallback to `event_type`), `phase_name`, `plan_name`, and relative timestamp
- Approve and Deny buttons with `min-h-[44px]` touch targets (D-08)
- Controlled `AlertDialog.Root` with `AlertDialog.Portal > AlertDialog.Overlay + AlertDialog.Popup` — no `@radix-ui` dependency
- AlertDialog shows "Confirm Approve" or "Confirm Deny" title based on `pendingAction` state
- `handleSubmit` POSTs to `/api/approval-response` with `session_id`, `approval_id`, `action`
- Submitted state renders green checkmark ("Approval submitted") or red x ("Denied") in place of action buttons
- Error state shows inline error message if POST fails

Also added to `dashboard/lib/queries.ts`:
- `pendingApprovalId: string | null` field to `SessionListItem` interface
- `findPendingApproval(events: WireEnvelope[]): WireEnvelope | null` — Set-based matching that returns first unresponded `approval_request` event

### Task 2: SessionDetail and SessionCard Integration

**`session-detail.tsx`** now:
- Imports `findPendingApproval` and `ApprovalCard`
- Computes `pendingApproval = findPendingApproval(events)` before render
- Conditionally renders `<ApprovalCard>` between the status header card and `<PhaseProgress>` (APR-01)

**`session-card.tsx`** now:
- Imports `Badge`
- Wraps `StatusBadge` and conditional amber `"Approval"` badge in a flex row
- Badge shows only when `session.pendingApprovalId` is non-null (APR-05)

### Task 3: Visual Verification (Auto-approved)

TypeScript compiles clean. All programmatic acceptance criteria verified. Checkpoint auto-approved per `--auto` flag.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added findPendingApproval and pendingApprovalId to queries.ts**

- **Found during:** Task 1 (read_first review of queries.ts)
- **Issue:** Plan 01 was supposed to provide `findPendingApproval()` and `pendingApprovalId` in `SessionListItem`, but neither existed in the current `queries.ts`
- **Fix:** Added `pendingApprovalId: string | null` to `SessionListItem`, updated `getSessions()` and `getSessionMeta()` to read `raw.pending_approval_id`, and implemented `findPendingApproval()` with Set-based matching
- **Files modified:** `dashboard/lib/queries.ts`
- **Commit:** 0e193d5

## Commits

| Hash | Message |
|------|---------|
| 0e193d5 | feat(137-02): create ApprovalCard component with Base UI AlertDialog |
| cc976d9 | feat(137-02): wire ApprovalCard into SessionDetail, add badge to SessionCard |

## Self-Check: PASSED
