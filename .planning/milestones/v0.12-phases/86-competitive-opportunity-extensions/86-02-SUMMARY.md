---
phase: 86-competitive-opportunity-extensions
plan: 02
subsystem: workflow
tags: [opportunity, rice-scoring, unit-economics, business-mode, design-coverage, ltv, cac]

# Dependency graph
requires:
  - phase: 84-business-product-type-foundation
    provides: businessMode flag, businessTrack manifest fields, business-financial-disclaimer.md, 20-field designCoverage schema
  - phase: 85-brief-extensions-detection
    provides: businessMode gating pattern (IF businessMode == true conditional block), 20-field pass-through-all coverage write pattern

provides:
  - opportunity.md with business initiative framing section in RICE scoring (gated on businessMode == true)
  - Unit economics placeholders: LTV formula, CAC ceiling, payback period at 3 churn scenarios
  - 20-field designCoverage write in opportunity.md (upgraded from 16)
  - Structural test file covering MRKT-03 (12 tests, all pass)

affects:
  - Phase 90 (critique.md) — unit economics viability critique references opportunity.md business framing
  - Phase 93 (recommend/iterate guard stubs) — opportunity coverage flag in 20-field schema

# Tech tracking
tech-stack:
  added: []
  patterns:
    - businessMode conditional gate with BUSINESS_FRAMING_GENERATED flag for multi-step gating
    - 20-field designCoverage pass-through-all pattern (consistent with Phase 85 brief.md)
    - [YOUR_X] [VERIFY FINANCIAL ASSUMPTIONS] inline disclaimer on every financial placeholder

key-files:
  created:
    - .planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs
  modified:
    - workflows/opportunity.md

key-decisions:
  - "Business Initiative Framing placed at end of Step 4 (after bucket assignment) — keeps step count at 7 and preserves display line position"
  - "BUSINESS_FRAMING_GENERATED flag used to gate both Step 4 generation and Step 5 artifact inclusion — prevents orphaned artifact section"
  - "20-field coverage write replaces 16-field write in-place — no migration path needed, just extended field list"

patterns-established:
  - "Pattern: Two-flag gate — businessMode gates generation, BUSINESS_FRAMING_GENERATED gates artifact inclusion in subsequent steps"
  - "Pattern: Unit economics template with 3-scenario payback table (Optimistic/Base Case/Pessimistic) using [YOUR_CHURN_RATE_LOW/BASE/HIGH] placeholders"

requirements-completed: [MRKT-03]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 86 Plan 02: Competitive Opportunity Extensions Summary

**opportunity.md extended with businessMode-gated RICE unit economics framing (LTV, CAC ceiling, payback at 3 churn scenarios) and 20-field designCoverage write — all 12 structural tests pass**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-22T15:59:15Z
- **Completed:** 2026-03-22T16:01:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created 12-test structural test file (MRKT-03 coverage + 20-field designCoverage) — RED state confirmed before implementation
- Extended opportunity.md Step 4 with businessMode detection and Business Initiative Framing section containing LTV formula, CAC ceiling, and payback period at 3 churn scenarios (Optimistic/Base Case/Pessimistic) — all values use [YOUR_X] [VERIFY FINANCIAL ASSUMPTIONS] placeholders
- Upgraded opportunity.md designCoverage write from 16 to 20 fields (adds hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit)
- Added 3 new anti-patterns guarding against dollar amount generation, businessMode gate bypass, and 16-field regression

## Task Commits

Each task was committed atomically:

1. **Task 1: Create structural test scaffold for MRKT-03** - `3d4fc90` (test)
2. **Task 2: Extend opportunity.md with business initiative framing and 20-field coverage** - `e444db6` (feat)

## Files Created/Modified

- `workflows/opportunity.md` — Extended with businessMode detection (Step 4), Business Initiative Framing section (end of Step 4), conditional OPP artifact section (Step 5), 20-field designCoverage write (Step 7), 3 new anti-patterns
- `.planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs` — 12 structural tests for MRKT-03 and 20-field designCoverage

## Decisions Made

- Business Initiative Framing placed at end of Step 4 (after bucket assignment) — keeps step count at 7 and preserves the existing display line position
- BUSINESS_FRAMING_GENERATED flag used as secondary gate in Step 5 — ensures unit economics section only appears in artifact when generation succeeded in Step 4
- 20-field coverage write replaces 16-field version in-place without migration path — extended field list naturally carries all existing flags

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 86 is now complete (Plan 01: competitive.md market landscape + Mermaid matrix; Plan 02: opportunity.md business initiative framing)
- opportunity.md business framing provides unit economics context for Phase 90 (critique.md) unit economics viability critique
- All 20-field designCoverage writes are now consistent across brief.md (Phase 85), competitive.md (Phase 86-01), and opportunity.md (Phase 86-02)

---
*Phase: 86-competitive-opportunity-extensions*
*Completed: 2026-03-22*
