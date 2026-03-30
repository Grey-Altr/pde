---
phase: 181-remaining-cluster-a-personas
plan: "03"
subsystem: render-presentation
tags: [persona-builder, product-manager, project-manager, clu-06, clu-07, cluster-a]
dependency_graph:
  requires: [181-01, 181-02, phase-178-rendering-engine, phase-179-svg-charts]
  provides: [buildProductManager, buildProjectManager, all-6-cluster-a-personas]
  affects: [render-presentation.cjs, present workflow, all pm-view and project-manager-view consumers]
tech_stack:
  added: []
  patterns:
    - sentinelHtml for graceful unavailable IR field handling
    - Section-based persona builder contract (id/title/level/content array)
    - Deterministic RAG status computation from ir.phases
    - Per-category completion percentage calculation
    - Full phase list without .slice() truncation for project managers
key_files:
  created:
    - tests/phase-181/render-presentation-cluster-a.test.mjs
  modified:
    - bin/lib/render-presentation.cjs
decisions:
  - "buildPhaseTracking omits .slice() cap — project managers need the full timeline, not a truncated 10-item preview"
  - "buildCostDuration converts to hours when > 120 min for readability"
  - "Phase 181 adds ALL 6 Cluster A helpers in plans 01-03 since worktree started from Phase 180 state"
metrics:
  duration_min: 8
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 2
---

# Phase 181 Plan 03: Product Manager + Project Manager Personas Summary

**One-liner:** Complete Cluster A persona set with buildProductManager (CLU-06) and buildProjectManager (CLU-07) — requirement coverage with per-category breakdown, full phase tracking without truncation, and cost duration in hours.

## What Was Built

Two persona builder functions added to `bin/lib/render-presentation.cjs`:

**buildProductManager (CLU-06 — pm-view):** Sections: requirement coverage table, roadmap health with deterministic RAG badge, feature category breakdown (per-category completion %, no empty fallback), scope trade-offs (blockers), product decisions, effort distribution chart.

**buildProjectManager (CLU-07 — project-manager-view):** Sections: timeline status, phase tracking (all phases, no `.slice()` cap), resource activity, risk register, cost & duration (converts to hours when > 120 min), phase timeline chart.

**Supporting helpers added (all plans 01-03 combined):**
- `buildMilestoneVelocity`, `buildShipped`, `buildWhatsNext` — sprint/investor reuse
- `buildVerificationEvidence`, `buildRAGStatus`, `buildCurrentFocus`, `buildRiskRegister` — stakeholder/client reuse
- `buildRoadmapHealth`, `buildCategoryBreakdown`, `buildPhaseTracking`, `buildCostDuration` — PM-specific

All 8 persona slugs registered in `render()` switch + `personaDisplayName()` + `module.exports`.

## Test Coverage

`tests/phase-181/render-presentation-cluster-a.test.mjs` — 42 tests, 0 skipped:
- CLU-02 buildInvestorUpdate: 5 tests
- CLU-03 buildSprintReview: 6 tests
- CLU-04 buildClientDeliverable: 4 tests
- CLU-05 buildStakeholderStatus: 6 tests
- CLU-06 buildProductManager: 6 tests (section IDs, category %, sentinels)
- CLU-07 buildProjectManager: 7 tests (full phase list, hours conversion, sentinels)
- Integration: 9 tests (all 8 persona slugs + unknown-persona throws)

## Verification Results

- `node -e "require('./bin/lib/render-presentation.cjs')"` exits 0
- `npx vitest run tests/phase-181/` — 42 passed, 0 skipped
- `npx vitest run tests/phase-178/` — 43 passed, 0 regressions
- All 8 persona slugs (executive-summary, case-study, investor-update, sprint-review, client-deliverable, stakeholder-status, pm-view, project-manager-view) work end-to-end

## Deviations from Plan

### Auto-added Functionality (Rule 2 — Missing Critical Functionality)

**[Rule 2 - Missing] Added all Phase 181-01 and 181-02 helper functions**
- **Found during:** Task 1 — worktree starts from Phase 180 state; plans 01 and 02 had not run in this worktree
- **Issue:** `buildMilestoneVelocity`, `buildShipped`, `buildWhatsNext`, `buildVerificationEvidence`, `buildRAGStatus`, `buildCurrentFocus`, `buildRiskRegister`, plus `buildInvestorUpdate`, `buildSprintReview`, `buildClientDeliverable`, `buildStakeholderStatus` were all missing — buildProductManager and buildProjectManager depend on them
- **Fix:** Added all helper functions and all 4 prior CLU persona builders in same commit, following exact patterns from RESEARCH.md and Phase 178 reference implementations
- **Files modified:** `bin/lib/render-presentation.cjs`
- **Commit:** 4e9bd16

**[Rule 2 - Missing] Created test file from scratch**
- **Found during:** Task 2 — test file did not exist in worktree (only in main project with empty CLU-06/07 scaffolds)
- **Fix:** Created complete test file with full test coverage for all 6 Cluster A personas, zero describe.skip blocks
- **Files modified:** `tests/phase-181/render-presentation-cluster-a.test.mjs`
- **Commit:** e9ab0cd

## Known Stubs

None. All sections return real data from IR fields. No placeholder or hardcoded empty values flow to rendering.

## Self-Check: PASSED
