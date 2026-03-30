---
phase: 181-remaining-cluster-a-personas
plan: "01"
subsystem: rendering-engine
tags: [personas, render-presentation, investor-update, sprint-review, cluster-a]
dependency_graph:
  requires: [178-reference-personas-+-rendering-engine, 179-svg-charts]
  provides: [CLU-02-investor-update, CLU-03-sprint-review]
  affects: [bin/lib/render-presentation.cjs]
tech_stack:
  added: []
  patterns: [section-based-document-model, sentinel-html-pattern, persona-builder-contract]
key_files:
  created:
    - tests/phase-181/render-presentation-cluster-a.test.mjs
  modified:
    - bin/lib/render-presentation.cjs
decisions:
  - "buildShipped uses no .slice() limit on completed phases — full list shown per research pitfall #2"
  - "buildMilestoneVelocity computes pct inline (not from ir.phases.completion_pct) for investor clarity"
metrics:
  duration_min: 7
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 2
---

# Phase 181 Plan 01: Investor Update + Sprint Review Persona Builders Summary

**One-liner:** Added investor-update (CLU-02) and sprint-review (CLU-03) persona builders with 5 new helpers, full test coverage, and CLU-04 through CLU-07 test scaffolds.

## What Was Built

Two persona builder functions following the exact Phase 178 section-based document model pattern:

**buildInvestorUpdate (CLU-02)** — 6 sections:
- `vision` — project overview (reuses buildOverview)
- `velocity` — milestone velocity with progress bar (new buildMilestoneVelocity helper)
- `delivery` — requirement coverage table (reuses buildRequirements)
- `moat` — technical decisions list (reuses buildTechnical)
- `activity` — git velocity + timing (reuses buildTimeline)
- `v-chart` — velocity SVG chart embed

**buildSprintReview (CLU-03)** — 5 sections:
- `shipped` — completed phases as HTML table (new buildShipped helper, no slice limit)
- `artifacts` — design artifact listing (reuses buildArtifacts)
- `acceptance` — requirement coverage (reuses buildRequirements)
- `next` — first 3 upcoming phases (new buildWhatsNext helper)
- `burndown` — burndown SVG chart embed

**New helpers added:**
- `buildMilestoneVelocity(ir)` — phases completed/total with inline progress bar
- `buildShipped(ir)` — completed phase list as table (falls back to count if phase_list empty)
- `buildWhatsNext(ir)` — first 3 incomplete phases, "All phases complete" if none remain

**Registration:** Both slugs added to `personaDisplayName()`, `render()` switch, and `module.exports`.

**Test file:** `tests/phase-181/render-presentation-cluster-a.test.mjs` with 16 active tests (all passing) and 12 skipped scaffold stubs for CLU-04 through CLU-07.

## Verification Results

- `node -e "require('./bin/lib/render-presentation.cjs')"` exits 0
- `npx vitest run tests/phase-181/` — 16 passed, 12 skipped
- `npx vitest run tests/phase-178/` — 43 passed (no regressions)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 6eb9ee4 | feat(181-01): add buildInvestorUpdate and buildSprintReview persona builders |
| 2    | 9f2682f | test(181-01): add CLU-02/03 tests and CLU-04 through CLU-07 scaffold |

## Known Stubs

None — both builders produce real content from IR data, no placeholder text.

## Self-Check: PASSED
