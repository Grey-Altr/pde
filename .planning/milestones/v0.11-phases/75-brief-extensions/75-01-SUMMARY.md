---
phase: 75-brief-extensions
plan: 01
subsystem: workflow
tags: [brief, experience, product-type, nyquist, tdd, venue, events]

# Dependency graph
requires:
  - phase: 74-foundation-and-regression-infrastructure
    provides: experience product type detection in brief.md, sub-type classification logic, experience-disclaimer.md
provides:
  - Five experience-specific brief sections in workflows/brief.md (Promise Statement, Vibe Contract, Audience Archetype, Venue Constraints, Repeatability Intent) inside a product_type == "experience" guard
  - Experience type added to Type enum in brief.md and templates/design-brief.md
  - Experience Design Constraints clause in brief.md Step 5 Product Type section
  - Phase 75 Nyquist test suite (tests/phase-75/brief-extensions.test.mjs) — 7 describe blocks, 8 tests, all green
  - Phase 82 milestone test updated to reflect Phase 75 completion (negative assertions flipped to positive)
affects:
  - 76-experience-design-tokens (token generation parametrized by vibe contract and venue capacity from brief)
  - 77-flow-diagrams (audience archetype informs crowd flow design)
  - 78-wireframes (venue constraints feed spatial layout)
  - 82-nyquist-validation (milestone test suite updated for Phase 75 completion)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD: write failing Nyquist tests before any workflow edits, commit them red, then implement to green"
    - "Experience conditional blocks in workflow .md files use product_type == \"experience\" guard before all experience-specific content"
    - "VERIFY WITH LOCAL AUTHORITY inline tag mandatory on all regulatory venue values"
    - "Negative milestone assertions in phase-82 test are forward pointers — must be flipped to positive when the referenced phase ships"

key-files:
  created:
    - tests/phase-75/brief-extensions.test.mjs
  modified:
    - workflows/brief.md
    - templates/design-brief.md
    - tests/phase-82/milestone-completion.test.mjs

key-decisions:
  - "Wave 0 test scaffold written before workflow edits — all 8 tests fail against pre-edit brief.md, then pass after edits (TDD contract)"
  - "Experience sections grouped in a single conditional block after Scope Boundaries, not scattered — keeps section order clean and guard unambiguous"
  - "VERIFY WITH LOCAL AUTHORITY tags placed inline in Venue Constraints table cells (not as separate disclaimers) for co-location with the data they qualify"
  - "Phase 82 negative assertions replaced with positive assertions in the same test (not a new test) — maintains test count parity"
  - "templates/design-brief.md updated in same task as brief.md (atomic change) — template must stay structurally in sync with workflow instructions"

patterns-established:
  - "Pattern 1: Conditional experience blocks follow `**If product_type == \"experience\"**` guard syntax — consistent with critique.md and handoff.md patterns from Phase 74/79"
  - "Pattern 2: Phase 82 milestone test tracks phase completion state — flip negative assertions to positive when a phase ships"

requirements-completed: [BREF-01, BREF-02, BREF-03, BREF-04, BREF-05]

# Metrics
duration: 8min
completed: 2026-03-21
---

# Phase 75 Plan 01: Brief Extensions Summary

**Five experience-specific brief sections (Promise Statement, Vibe Contract, Audience Archetype, Venue Constraints, Repeatability Intent) added to workflows/brief.md inside a product_type guard, with Nyquist tests all green and Phase 74/82 regressions clean**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-21T21:42:00Z
- **Completed:** 2026-03-21T21:50:36Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Wave 0 Nyquist test scaffold created (7 describe blocks / 8 tests) — committed red against pre-edit codebase
- Five experience-specific brief sections added to workflows/brief.md in a single product_type guard block
- Experience Design Constraints clause added to brief.md alongside existing software/hardware/hybrid clauses
- Type enum updated to `{software | hardware | hybrid | experience}` in both brief.md and templates/design-brief.md
- Experience section stubs added to templates/design-brief.md (Promise Statement through Repeatability Intent)
- Phase 82 milestone test updated: negative BREF assertions replaced with positive assertions confirming Phase 75 delivery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 Nyquist test scaffold for BREF-01 through BREF-05** - `e1fbc85` (test)
2. **Task 2: Add experience brief sections to workflows/brief.md and templates/design-brief.md** - `01d925a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/phase-75/brief-extensions.test.mjs` - Nyquist structural assertions for BREF-01 through BREF-05 plus cross-type regression and template sync checks
- `workflows/brief.md` - Type enum updated, experience Design Constraints clause added, five experience sections added in product_type guard after Scope Boundaries
- `templates/design-brief.md` - Type enum updated, five experience section stubs added before footer
- `tests/phase-82/milestone-completion.test.mjs` - Negative BREF assertions replaced with positive assertions (Phase 75 completion signaling)

## Decisions Made
- Wave 0 TDD strategy: tests written and committed red before any workflow edits — this validates the pre-state and creates an unambiguous pass/fail contract
- Experience sections grouped in a single `product_type == "experience"` conditional block (not individual per-section guards) — simpler, more grep-friendly
- VERIFY WITH LOCAL AUTHORITY inline in table cells, not as separate disclaimers — keeps the qualifier co-located with the regulated value
- Phase 82 test updated in the same commit as the workflow edits (not a separate phase) — keeps milestone regression suite accurate

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated Phase 82 milestone test negative assertions**
- **Found during:** Task 2 (workflow edits)
- **Issue:** tests/phase-82/milestone-completion.test.mjs lines 229-243 had negative assertions (`!content.includes('promise_statement')`) that would fail after Phase 75 edits — explicitly documented in RESEARCH.md Pattern 4 as mandatory
- **Fix:** Replaced negative BREF assertions with positive assertions confirming Promise Statement, Vibe Contract, Audience Archetype, Venue Constraints, and Repeatability Intent are present
- **Files modified:** tests/phase-82/milestone-completion.test.mjs
- **Verification:** `node --test tests/phase-82/milestone-completion.test.mjs` exits 0, 17/17 non-todo assertions pass
- **Committed in:** 01d925a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical)
**Impact on plan:** Mandatory update documented in RESEARCH.md before execution began. Prevented Phase 82 test suite regression.

## Issues Encountered
None — plan executed cleanly. Wave 0 tests failed as expected against pre-edit codebase, then all passed after edits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 75 complete: all five experience brief sections live in workflows/brief.md with correct conditional guard
- Phase 76 (experience design tokens) can now read Vibe Contract (lighting/sound aesthetic) and Venue Constraints (capacity → spatial token density) from generated BRF artifacts
- Phase 74 regression: 7/7 pass; Phase 75 Nyquist: 8/8 pass; Phase 82 milestone: 17/17 pass (0 regressions)

---
*Phase: 75-brief-extensions*
*Completed: 2026-03-21*
