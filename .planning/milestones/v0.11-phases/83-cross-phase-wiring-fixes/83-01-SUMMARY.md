---
phase: 83-cross-phase-wiring-fixes
plan: 01
subsystem: testing
tags: [designCoverage, workflow, schema, regression, tdd]

# Dependency graph
requires:
  - phase: 82-integration-validation
    provides: regression test suite baseline (42 tests) protecting all pipeline workflows
  - phase: 80-print-collateral
    provides: hasPrintCollateral as the 15th coverage field
  - phase: 81-handoff-production-bible
    provides: hasProductionBible as the 16th coverage field

provides:
  - All 10 affected workflow files write the full 16-field designCoverage schema
  - wireframe.md reads SYS-experience-tokens.json from .planning/design/visual/ (correct path)
  - tests/phase-83/wiring-fixes.test.mjs enforcing all 3 fixes

affects:
  - Any future workflow file that writes designCoverage (must use 16-field schema)
  - wireframe.md consumers (now receive correct brand tokens from visual/ path)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "16-field canonical designCoverage write pattern: read-merge-write with hasPrintCollateral and hasProductionBible as fields 15 and 16"
    - "recommend.md uses {current_hasFieldName} placeholder style (distinct from {current} used by all other workflows)"

key-files:
  created:
    - tests/phase-83/wiring-fixes.test.mjs
  modified:
    - workflows/system.md
    - workflows/critique.md
    - workflows/iterate.md
    - workflows/hig.md
    - workflows/ideate.md
    - workflows/competitive.md
    - workflows/opportunity.md
    - workflows/recommend.md
    - workflows/mockup.md
    - workflows/wireframe.md

key-decisions:
  - "Gap 3 (REQUIREMENTS.md FPL→FLP typo) was already resolved before Phase 83 — confirmed as no-op by grep; test still verifies the invariant holds"

patterns-established:
  - "TDD red-then-green: write failing tests first, then apply fixes — validates pre-state and creates unambiguous pass/fail contract"
  - "16-field designCoverage invariant: every workflow that writes designCoverage must include all 16 fields or it silently erases the fields it omits"

requirements-completed: [HDOF-06, DSYS-06, PRNT-04]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 83 Plan 01: Cross-Phase Wiring Fixes Summary

**16-field designCoverage schema propagated to all 10 affected workflows (system, critique, iterate, hig, ideate, competitive, opportunity, recommend, mockup, wireframe) + wireframe.md token path corrected from assets/ to visual/**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T00:24:36Z
- **Completed:** 2026-03-22T00:28:46Z
- **Tasks:** 2
- **Files modified:** 11 (10 workflows + 1 new test file)

## Accomplishments

- Wrote failing red tests covering all 3 integration gaps (Gap 1: 9 tests, Gap 2: 2 tests, Gap 3: 1 test already passing)
- Updated 9 workflows from 14-field to 16-field designCoverage (system, critique, iterate, hig, ideate, competitive, opportunity, recommend, mockup)
- Updated wireframe.md from 15-field to 16-field (hasProductionBible appended to all 3 JSON variant commands)
- Fixed wireframe.md Gap 2: `.planning/design/assets/SYS-experience-tokens.json` → `.planning/design/visual/SYS-experience-tokens.json` (one-line path fix)
- Confirmed Gap 3 was already resolved (REQUIREMENTS.md line 46 already reads FLP, not FPL)
- Phase 83 suite: 5/5 tests pass GREEN; Phase 82 regression suite: 42/42 pass (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing test for all 3 wiring gaps (RED)** - `1cc0321` (test)
2. **Task 2: Fix all 10 workflow files — designCoverage 16-field + token path (GREEN)** - `b99f906` (fix)

**Plan metadata:** committed with SUMMARY.md (docs)

_Note: TDD tasks have two commits (test → fix)_

## Files Created/Modified

- `tests/phase-83/wiring-fixes.test.mjs` — Phase 83 regression tests: Gap 1 (16-field schema on all 10 workflows), Gap 2 (wireframe.md token path), Gap 3 (REQUIREMENTS.md FLP code)
- `workflows/system.md` — 14-field → 16-field designCoverage; added hasPrintCollateral, hasProductionBible to JSON command and prose
- `workflows/critique.md` — 14-field → 16-field designCoverage; same pattern
- `workflows/iterate.md` — 14-field → 16-field designCoverage; also updated outputs section ("13 fields" → "15 fields")
- `workflows/hig.md` — 14-field → 16-field designCoverage; updated IMPORTANT note and anti-pattern count
- `workflows/ideate.md` — 14-field → 16-field designCoverage; updated IMPORTANT note and anti-pattern counts
- `workflows/competitive.md` — 14-field → 16-field designCoverage; updated anti-pattern flag count
- `workflows/opportunity.md` — 14-field → 16-field designCoverage; updated anti-pattern flag count
- `workflows/recommend.md` — 14-field → 16-field designCoverage; uses `{current_hasPrintCollateral}` / `{current_hasProductionBible}` named placeholders; added 2 table rows
- `workflows/mockup.md` — 14-field → 16-field designCoverage; updated anti-pattern prose counts
- `workflows/wireframe.md` — 15-field → 16-field (hasProductionBible:{current} appended to all 3 JSON variants); Gap 2 path fix (assets/ → visual/)

## Decisions Made

- Gap 3 confirmed as no-op: REQUIREMENTS.md line 46 already uses FLP (not FPL). The v0.11 audit report may have referenced a prior state. The test still enforces the invariant going forward.

## Deviations from Plan

None — plan executed exactly as written. Gap 3 was documented in research as a likely no-op and confirmed so at execution time.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 12 workflows that write designCoverage (10 fixed + 2 baselines: flows.md and handoff.md) now use the full 16-field schema
- hasPrintCollateral and hasProductionBible flags are safe from clobber through any pipeline execution order
- wireframe.md will correctly find SYS-experience-tokens.json and use brand tokens for print palette (vs falling back to 3-color default)
- Phase 83 is the final phase of the v0.11 milestone — all gap closure requirements met

## Self-Check: PASSED

- tests/phase-83/wiring-fixes.test.mjs: FOUND
- .planning/phases/83-cross-phase-wiring-fixes/83-01-SUMMARY.md: FOUND
- commit 1cc0321 (test RED): FOUND
- commit b99f906 (fix GREEN): FOUND

---
*Phase: 83-cross-phase-wiring-fixes*
*Completed: 2026-03-22*
