---
phase: 136-core-dashboard-features
plan: "01"
subsystem: dashboard
tags: [pure-functions, tdd, shadcn, lib, derive, event-filtering]
dependency_graph:
  requires: [dashboard/lib/wire-schema.ts]
  provides: [dashboard/lib/derive-progress.ts, dashboard/lib/derive-cost.ts, dashboard/lib/event-types.ts]
  affects: [Plan 136-02 (UI components that consume these pure functions)]
tech_stack:
  added: []
  patterns: [TDD RED/GREEN, pure functions, vitest globals]
key_files:
  created:
    - dashboard/lib/derive-progress.ts
    - dashboard/lib/derive-cost.ts
    - dashboard/lib/event-types.ts
    - dashboard/lib/__tests__/derive-progress.test.ts
    - dashboard/lib/__tests__/derive-cost.test.ts
    - dashboard/lib/__tests__/event-filters.test.ts
    - dashboard/components/ui/progress.tsx
    - dashboard/components/ui/tabs.tsx
    - dashboard/components/ui/separator.tsx
  modified: []
decisions:
  - "TDD RED/GREEN discipline maintained — tests written and confirmed failing before implementation"
  - "deriveCost uses Sonnet 4.5 pricing ($3/M input, $15/M output) as the cost estimate basis"
  - "EVENT_FILTER_GROUPS uses 'as const' for exhaustive type inference on FilterGroup"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 9
requirements_satisfied: [MON-01, MON-02, MON-03]
---

# Phase 136 Plan 01: Shadcn UI Dependencies and Pure Utility Functions Summary

Pure data-derivation layer established: three typed lib modules (derive-progress, derive-cost, event-types) with TDD coverage and three shadcn UI components (progress, tabs, separator) installed via `shadcn@latest add`.

## What Was Built

### shadcn UI Components (Task 1)

Three shadcn components installed via `npx shadcn@latest add progress tabs separator`:

- `dashboard/components/ui/progress.tsx` — Progress bar using `@base-ui/react/progress` primitives
- `dashboard/components/ui/tabs.tsx` — Tab navigation using `@base-ui/react/tabs` primitives
- `dashboard/components/ui/separator.tsx` — Visual divider using `@base-ui/react/separator` primitives

All use `base-nova` style consistent with existing project components.

### Pure Lib Functions (Task 2)

**`dashboard/lib/derive-progress.ts`**
- `deriveProgress(events: WireEnvelope[]): PhaseProgressState` — scans events newest-first for `extensions.phase_name` and `extensions.plan_name`

**`dashboard/lib/derive-cost.ts`**
- `deriveCost(events: WireEnvelope[]): CostState` — accumulates `input_tokens`/`output_tokens` via passthrough fields, calculates USD cost
- `formatTokens(n: number): string` — formats with k/M suffixes
- `formatCost(usd: number): string` — formats USD with appropriate decimal places

**`dashboard/lib/event-types.ts`**
- `EVENT_FILTER_GROUPS` — `as const` object with null (all), tools, agents, phases, errors groups
- `FilterGroup` type — exhaustive keyof union
- `filterEvents(events, group): WireEnvelope[]` — returns events matching the selected group

### Test Coverage

29 new tests (6 for derive-progress, 11 for derive-cost/format, 12 for event-filters). All 54 tests across 8 test files pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed node_modules in worktree dashboard**
- **Found during:** Task 2 RED phase — vitest config failed to load `@vitejs/plugin-react`
- **Issue:** Worktree's `dashboard/` had no `node_modules`; packages only installed in main repo's `dashboard/`
- **Fix:** Ran `npm install` in the worktree's `dashboard/` directory (461 packages, 7s)
- **Files modified:** `dashboard/node_modules/` (not tracked in git)
- **Commit:** N/A (runtime fix, not committed)

## Known Stubs

None. All pure functions are complete implementations — no hardcoded empty values, no placeholder text, no TODO markers. Functions wire directly to `WireEnvelope` data from `wire-schema.ts`.

## Self-Check: PASSED

All 9 created files verified present on disk. Commits 1745f89, 1ae94bf, b5d228d all confirmed in git log. 54 tests pass across 8 test files.
