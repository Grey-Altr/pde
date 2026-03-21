---
phase: 81-handoff-production-bible
plan: 01
subsystem: workflow
tags: [experience, handoff, production-bible, workflow, nyquist, tdd]

# Dependency graph
requires:
  - phase: 74-foundation-and-regression-infrastructure
    provides: Experience stubs in handoff.md that this plan replaces; disclaimer block in required_reading
  - phase: 80-print-collateral
    provides: Print collateral artifacts (FLY, SIT, PRG) referenced in BIB Print Spec section

provides:
  - Full experience branch in handoff.md replacing both Phase 74 stubs
  - Six-section production bible generation instructions (Advance, Run Sheet, Staffing, Budget, Post-Event, Print Spec)
  - Four-pass BIB generation split to avoid token truncation at large venues
  - Step 2a STACK.md bypass for non-hybrid-event experience products
  - HND_GENERATES_SOFTWARE / BIB_GENERATES_SECTIONS flags for product type isolation
  - 7b-bib BIB manifest registration section
  - Updated Step 7c coverage write for 16 flags
  - hasProductionBible and hasPrintCollateral in templates/design-manifest.json
  - Nyquist test suite with 50 assertions covering HDOF-01 through HDOF-06

affects:
  - 81-02 (second plan in phase — will use handoff.md and may reference BIB output)
  - 82-regression (full regression validation runs against handoff.md)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Four-pass split pattern for large structured document generation to avoid token truncation"
    - "HND_GENERATES_SOFTWARE / BIB_GENERATES_SECTIONS boolean flags for product-type branching in single workflow"
    - "16-flag designCoverage write with read-before-set clobber prevention"

key-files:
  created:
    - tests/phase-81/handoff-production-bible.test.mjs
  modified:
    - workflows/handoff.md
    - templates/design-manifest.json

key-decisions:
  - "Four-pass BIB generation (Pass A-D) is mandatory — single-pass truncates at staffing plan for venues above 500 capacity"
  - "HND_GENERATES_SOFTWARE = false for pure experience; = true only for hybrid-event sub-type"
  - "STACK.md check skipped for non-hybrid-event experience (FRAMEWORK=none, TYPESCRIPT=false)"
  - "Every staffing ratio and regulatory value in BIB sections carries [VERIFY WITH LOCAL AUTHORITY] — enforced in workflow instructions"
  - "BIB manifest registration lives at 7b-bib (separate from 7b HND registration) so each artifact type has its own step"

patterns-established:
  - "Pattern: Experience branch uses BIB_GENERATES_SECTIONS = true + HND_GENERATES_SOFTWARE as the gate pattern for conditional section generation"
  - "Pattern: Step 2a reads manifest before STACK.md to determine bypass eligibility — manifest read is the new pre-check for experience products"

requirements-completed: [HDOF-01, HDOF-02, HDOF-03, HDOF-04, HDOF-05, HDOF-06]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 81 Plan 01: Handoff Production Bible Summary

**Six-section production bible generation added to handoff.md via four-pass split, replacing both Phase 74 stubs, with STACK.md bypass for pure experience products and 16-flag manifest coverage write**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T20:24:28Z
- **Completed:** 2026-03-21T20:28:24Z
- **Tasks:** 2 (TDD: test + implementation)
- **Files modified:** 3

## Accomplishments

- Nyquist test suite with 50 assertions (RED phase: 45 fail against stubs; GREEN phase: 50/50 pass)
- Full experience branch replacing both Phase 74 stubs in handoff.md — six BIB sections with four-pass split generation
- Step 2a STACK.md bypass for non-hybrid-event experience products (STACK.md hard-stop no longer triggers)
- Step 7b-bib BIB manifest registration + Step 7c updated to read/write all 16 coverage flags
- design-manifest.json template extended with hasPrintCollateral and hasProductionBible

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Nyquist test suite for HDOF-01 through HDOF-06** — `ef56bd4` (test)
2. **Task 2: Replace Phase 74 stubs with full experience branch in handoff.md** — `ca8aeac` (feat)

_Note: TDD tasks had two commits — test (RED) then feat (GREEN)_

## Files Created/Modified

- `tests/phase-81/handoff-production-bible.test.mjs` — 50-assertion Nyquist test suite for all six HDOF requirements plus isolation, disclaimer, bypass, four-pass, and manifest flag checks
- `workflows/handoff.md` — Full experience branch: Step 2a bypass, Step 4i expansion, Step 5 four-pass BIB generation, Step 7b-bib registration, Step 7c 16-flag coverage write, five new anti-patterns
- `templates/design-manifest.json` — Added hasPrintCollateral and hasProductionBible to designCoverage (now 16 flags)

## Decisions Made

- Four-pass BIB generation (Pass A through Pass D) is the mandatory pattern — single-pass truncates at staffing plan for venues above 500 capacity. This is documented as an anti-pattern.
- HND_GENERATES_SOFTWARE = false for pure experience; = true only for hybrid-event — keeps software layer generation from running for single-night, multi-day, recurring-series, and installation sub-types.
- STACK.md bypass reads manifest before the STACK.md hard-stop, meaning experience products no longer fail if STACK.md is absent. Hybrid-event still requires STACK.md.
- Every numerical regulatory value (staffing ratios, first aid counts, curfew references) carries `[VERIFY WITH LOCAL AUTHORITY]` inline — enforced in the workflow instructions, not just as a header disclaimer.
- BIB manifest registration is its own 7b-bib sub-section (separate from 7b for HND) so the two artifact types can be independently traced and verified.

## Deviations from Plan

None — plan executed exactly as written. All six edits to handoff.md and the manifest template update matched the plan specification.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 81-02 can proceed — handoff.md experience branch is complete, all six HDOF requirements are addressed
- Phase 82 full regression can validate handoff.md changes against the complete test suite
- Upstream artifacts (FLY, SIT, PRG from Phase 80) are correctly referenced in the Print Spec section

---
*Phase: 81-handoff-production-bible*
*Completed: 2026-03-21*
