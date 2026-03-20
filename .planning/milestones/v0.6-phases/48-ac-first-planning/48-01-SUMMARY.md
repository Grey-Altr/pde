---
phase: 48-ac-first-planning
plan: 01
subsystem: testing
tags: [sharding, tdd, acceptance-criteria, task-files, workflow]

# Dependency graph
requires:
  - phase: 47-story-file-sharding
    provides: shardPlan, buildTaskFileContent, extractField, resolveTaskPath — the sharding foundation this extends
provides:
  - extractPlanAcBlock() helper in sharding.cjs — extracts plan-level AC block before <tasks>, ignores per-task ACs
  - Extended buildTaskFileContent() with planAcBlock, acRefs, boundaries params and conditional sections
  - Extended shardPlan() extracting ac_refs and boundaries from task blocks and injecting planAcBlock into all task files
  - exportPlanAcBlock exported from sharding.cjs module
affects: [49-reconciliation, 50-readiness-gate, 51-task-tracking, 52-agent-context, any future sharding consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plan-level AC block extracted before <tasks> boundary — avoids false positives from per-task blocks"
    - "Conditional section injection in task files — omit section entirely when field empty (no empty headings)"
    - "Pre-Phase-48 graceful degradation — missing acRefs shows '(none - pre-Phase-48 plan)' fallback"
    - "TDD RED-GREEN pattern: failing tests committed first, then implementation"

key-files:
  created:
    - tests/phase-48/sharding-ac.test.mjs
  modified:
    - bin/lib/sharding.cjs

key-decisions:
  - "extractPlanAcBlock slices content at <tasks> index before matching — single regex match on pre-tasks content avoids per-task false positives without lookaheads"
  - "Conditional sections use truthy check on string value — empty string is falsy, no section rendered; non-empty string renders section with heading"
  - "acRefs fallback is '(none - pre-Phase-48 plan)' not empty — makes backwards-compatibility explicit in task files"

patterns-established:
  - "AC-first pattern: plan-level acceptance_criteria block before <tasks> propagated to all task files as Reference section"
  - "ac_refs per-task field: which plan-level ACs this specific task satisfies, surfaced in task file header"
  - "boundaries per-task field: paths/sections DO NOT CHANGE, rendered as dedicated section before Task Action"

requirements-completed: [PLAN-03, PLAN-04, PLAN-05]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 48 Plan 01: AC-First Sharding Support Summary

**extractPlanAcBlock() helper + extended buildTaskFileContent() and shardPlan() make task files self-contained for AC verification without reading PLAN.md**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-19T20:32:00Z
- **Completed:** 2026-03-19T20:40:15Z
- **Tasks:** 2 (RED + GREEN, no REFACTOR needed)
- **Files modified:** 2

## Accomplishments
- New `extractPlanAcBlock()` function extracts plan-level AC block from content before `<tasks>`, correctly ignoring per-task acceptance_criteria blocks
- Extended `buildTaskFileContent()` with three new optional params: `planAcBlock`, `acRefs`, `boundaries` — each producing conditional sections only when non-empty
- Extended `shardPlan()` to extract `ac_refs` and `boundaries` from each task block and pass `planAcBlock` (extracted once per plan) to all task files
- 12 new unit/integration tests covering all behavioral truths from the plan
- All 18 phase-47 regression tests still pass

## Task Commits

Each TDD phase committed atomically:

1. **RED: Failing tests** - `8795982` (test)
2. **GREEN: Implementation** - `be6cff1` (feat)

## Files Created/Modified
- `tests/phase-48/sharding-ac.test.mjs` — 12 tests: extractPlanAcBlock unit tests, buildTaskFileContent extension tests, shardPlan integration tests
- `bin/lib/sharding.cjs` — Added extractPlanAcBlock(), extended buildTaskFileContent() and shardPlan(), exported extractPlanAcBlock

## Decisions Made
- `extractPlanAcBlock` slices content at `<tasks>` tag index then runs a single regex on the pre-tasks portion — simpler and more reliable than a negative lookahead approach
- Conditional section injection uses JS truthy check: empty string `''` is falsy so section is omitted, any non-empty string renders the full section with its heading
- acRefs fallback text `(none - pre-Phase-48 plan)` makes backwards-compatibility explicit and visible in generated task files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AC-first sharding is now complete. Phase-48 plans can include a plan-level `<acceptance_criteria>` block before `<tasks>` and per-task `<ac_refs>` and `<boundaries>` fields; sharded task files will include these for executor self-containment.
- Pre-Phase-48 plans continue to work without modification (graceful degradation confirmed by regression tests).
- Remaining Phase 48 plans can proceed.

---
*Phase: 48-ac-first-planning*
*Completed: 2026-03-19*
