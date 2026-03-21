---
phase: 74-foundation-and-regression-infrastructure
plan: 01
subsystem: testing
tags: [node-test, regression, experience-type, manifest-schema, brief-detection]

# Dependency graph
requires: []
provides:
  - Regression smoke matrix test (tests/phase-74/experience-regression.test.mjs) covering FNDX-01 through FNDX-04
  - Experience product type detection in brief.md with 48 signal keywords and 5 sub-types
  - experienceSubType manifest write instruction in brief.md Step 7
  - All 5 manifest JSON files updated with experienceSubType field
  - DESIGN-STATE template extended with Sub-type row
affects:
  - 75-experience-tokens
  - 76-flow-diagram-experience
  - 77-floor-plan-and-timeline
  - 78-critique-and-hig
  - 79-hig-checklist
  - 80-print-artifacts
  - 81-production-bible
  - 82-full-regression

# Tech tracking
tech-stack:
  added: []
  patterns:
    - node:test describe/test structural assertion pattern for workflow file content
    - PIPELINE_WORKFLOW_FILES constant as canonical 14-file pipeline enumeration
    - experienceSubType as null sentinel (non-experience types) vs string value (experience type)

key-files:
  created:
    - tests/phase-74/experience-regression.test.mjs
  modified:
    - workflows/brief.md
    - templates/design-state-root.md
    - templates/design-manifest.json
    - .planning/design/design-manifest.json
    - .planning/pressure-test/fixture-greenfield/design/design-manifest.json
    - .planning/pressure-test/fixture-partial/design/design-manifest.json
    - .planning/pressure-test/fixture-rerun/design/design-manifest.json

key-decisions:
  - "Experience detection in brief.md uses experience-first classification: experience check precedes hybrid check because experience + software signals (ticketing app) should resolve to hybrid-event sub-type, not hybrid product type"
  - "experienceSubType is written as null for non-experience products — presence of field with null value is the Phase 74 sentinel (not omission)"
  - "Software default preserved as final ELSE in all classification chains — never replaced by experience catch-all"
  - "Regression smoke matrix written before workflow edits so failing state validates pre-implementation gap"

patterns-established:
  - "Pattern: Regression test written BEFORE implementation so failing tests confirm pre-state (Wave 0 strategy)"
  - "Pattern: All 5 manifest JSON files must be updated in sync — template + live + 3 fixtures"
  - "Pattern: experience branch precedes hybrid check in type classification chains"

requirements-completed: [FNDX-01, FNDX-03, FNDX-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 74 Plan 01: Foundation and Regression Infrastructure Summary

**Experience product type added to brief.md (48 signals, 5 sub-types, experienceSubType manifest write) with cross-type regression smoke matrix and all 5 manifest JSON files updated**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T10:18:52Z
- **Completed:** 2026-03-21T10:21:52Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- Regression smoke matrix test created first — failing tests validate pre-implementation state before any workflow edits
- brief.md Step 4 extended with Experience signals block (48 keywords), 4-type classification logic with experience-first ordering, and 5 sub-types
- brief.md Step 7 extended with experienceSubType manifest-set-top-level instruction
- All 5 manifest JSON files (template + live + 3 fixtures) updated with experienceSubType field
- Existing phase-64 manifest-schema.test.mjs passes without regression (designCoverage fields unchanged)
- Phase-74 smoke matrix: 6/7 tests pass — 1 expected failure (FNDX-02: downstream workflows not yet updated — deferred to Plan 02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write regression smoke matrix test file** - `e14a3aa` (test)
2. **Task 2: Add experience detection to brief.md and update DESIGN-STATE template** - `b84bbfd` (feat)
3. **Task 3: Update all 5 manifest JSON files with experienceSubType field** - `4248b21` (feat)

## Files Created/Modified

- `tests/phase-74/experience-regression.test.mjs` - Cross-type regression smoke matrix, 152 lines, 4 describe blocks covering FNDX-01 through FNDX-04
- `workflows/brief.md` - Experience signals block (48 keywords), 4-type classification chain, sub-type detection, experienceSubType manifest write
- `templates/design-state-root.md` - Product Type row updated to include experience; Sub-type row added
- `templates/design-manifest.json` - productType updated to include experience; experienceSubType schema field added
- `.planning/design/design-manifest.json` - productType updated; experienceSubType: null added
- `.planning/pressure-test/fixture-greenfield/design/design-manifest.json` - experienceSubType: null added
- `.planning/pressure-test/fixture-partial/design/design-manifest.json` - experienceSubType: null added
- `.planning/pressure-test/fixture-rerun/design/design-manifest.json` - experienceSubType: null added

## Decisions Made

- Experience check precedes hybrid check in the classification chain — experience + software signals (e.g. ticketing app) should resolve to `hybrid-event` sub-type (not `hybrid` product type)
- `experienceSubType` is written as `null` for non-experience products, not omitted — null presence is the sentinel confirming Phase 74 ran
- Software default preserved as final ELSE — never replaced with experience as catch-all
- Wave 0 strategy: regression test written before any workflow edits to validate failing pre-state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The FNDX-02 test failure (downstream workflows not yet containing experience) is the expected Wave 0 state documented in the plan — this is by design, not an issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (experience branch stubs in all 14 downstream workflows) is ready to begin
- The FNDX-02 test will go from failing to passing when Plan 02 adds experience branch stubs to the 13 non-brief workflow files
- All 5 manifest files are schema-ready for experience product data
- Existing phase-64 tests passing — no manifest regression introduced

---
*Phase: 74-foundation-and-regression-infrastructure*
*Completed: 2026-03-21*

## Self-Check: PASSED

**Files verified present:**
- FOUND: tests/phase-74/experience-regression.test.mjs
- FOUND: workflows/brief.md
- FOUND: templates/design-state-root.md
- FOUND: templates/design-manifest.json

**Commits verified:**
- FOUND: e14a3aa (test(74-01): add experience regression smoke matrix)
- FOUND: b84bbfd (feat(74-01): add experience product type detection to brief.md and DESIGN-STATE template)
- FOUND: 4248b21 (feat(74-01): add experienceSubType field to all 5 manifest JSON files)
