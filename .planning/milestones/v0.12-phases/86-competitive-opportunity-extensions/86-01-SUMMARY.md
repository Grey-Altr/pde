---
phase: 86-competitive-opportunity-extensions
plan: 01
subsystem: workflow
tags: [competitive-analysis, market-landscape, mermaid, business-mode, designCoverage, tam-sam-som]

# Dependency graph
requires:
  - phase: 84-business-product-type-foundation
    provides: businessMode/businessTrack manifest fields, 20-field designCoverage schema, business-financial-disclaimer.md, business-track.md
  - phase: 85-brief-extensions-detection
    provides: businessMode gating pattern (IF businessMode == true), track-differentiated depth branching, 20-field coverage pass-through-all pattern

provides:
  - MLS artifact generation (MLS-market-landscape-v{N}.md) gated on businessMode == true
  - Mermaid quadrantChart competitive positioning matrix with 0-1 coordinate normalization
  - Three-track market landscape depth (solo_founder: 1-page summary, startup_team: deep-dive, product_leader: build-vs-buy)
  - 20-field designCoverage write with hasMarketLandscape flag in competitive.md
  - 17 structural tests for MRKT-01/02/04/05 requirements

affects:
  - workflows/competitive.md consumers (any project running /pde:competitive in business mode)
  - Phase 86 Plan 02 (opportunity.md RICE business framing — MRKT-03)
  - Phase 93 (integration audit — hasMarketLandscape coverage flag now available)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MLS artifact: separate market-landscape file alongside CMP, versioning locked to CMP version"
    - "quadrantChart: Mermaid type with coordinate normalization svg_score/10 from Step 4d scores"
    - "businessMode gate: read BM/BT manifest before Step 4 sub-steps, cache flags for Steps 4i/4j/5/7"
    - "20-field coverage pass-through-all: coverage-check -> write all 20 fields, MLS_WRITTEN controls hasMarketLandscape"
    - "Track depth branching: solo=1-page summary, startup=deep-dive with top-down+bottom-up, leader=build-vs-buy matrix"

key-files:
  created:
    - .planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs
    - .planning/phases/86-competitive-opportunity-extensions/86-01-SUMMARY.md
  modified:
    - workflows/competitive.md

key-decisions:
  - "MLS artifact is SEPARATE from CMP artifact — MLS-market-landscape-v{N}.md not embedded in CMP; locked versioning (MLS version always equals CMP version)"
  - "businessMode/businessTrack read once at START of Step 4 and cached as $BM/$BT — consistent with brief.md pattern"
  - "Coordinate normalization: Mermaid 0-1 scale = SVG 0-10 score / 10, reuses Step 4d axis choices"
  - "MLS_WRITTEN flag gates both artifact write AND manifest registration AND hasMarketLandscape in designCoverage"
  - "designCoverage upgraded from 16 to 20 fields — hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit added"

patterns-established:
  - "MLS artifact pattern: businessMode-gated, separate file, locked versioning to CMP, 7-call manifest registration"
  - "Mermaid quadrantChart: verified official syntax, quadrant-1=top-right, competitor count by track"
  - "Track depth branching in competitive context: solo=3 competitors/1-page, startup=5-8/deep-dive, leader=8+/build-vs-buy"

requirements-completed: [MRKT-01, MRKT-02, MRKT-04, MRKT-05]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 86 Plan 01: Competitive MLS Extensions Summary

**competitive.md extended with MLS artifact generation (TAM/SAM/SOM placeholders), Mermaid quadrantChart positioning matrix, three-track market depth differentiation, and 20-field designCoverage write; 17/17 structural tests pass**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T15:59:14Z
- **Completed:** 2026-03-22T16:02:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created 17-test structural test scaffold (TDD RED confirmed: 16/17 fail against unmodified competitive.md — the 1 passing test reflects TAM/SAM/SOM already being in the file header)
- Extended competitive.md (+169 lines) with businessMode/businessTrack detection, Steps 4i (market landscape sizing) and 4j (Mermaid quadrant chart), MLS artifact write in Step 5, MLS DESIGN-STATE row in Step 6, and 20-field designCoverage in Step 7
- All 17 structural tests pass (GREEN state); no dollar amounts in workflow; all 20 coverage fields present

## Task Commits

Each task was committed atomically:

1. **Task 1: Create structural test scaffold (TDD RED)** - `c248180` (test)
2. **Task 2: Extend competitive.md** - `b60d57d` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks include test commit (RED) followed by implementation commit (GREEN)_

## Files Created/Modified
- `workflows/competitive.md` - Extended with MLS artifact, Mermaid quadrant chart, track depth branching, 20-field designCoverage
- `.planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs` - 17 structural tests for MRKT-01/02/04/05

## Decisions Made
- MLS artifact is a SEPARATE file (MLS-market-landscape-v{N}.md) — never embedded in CMP — different lifecycles
- businessMode/businessTrack read cached at start of Step 4 as $BM/$BT, consistent with brief.md pattern
- Mermaid coordinate normalization reuses Step 4d SVG scores: mermaid_coord = svg_score / 10
- MLS_WRITTEN flag gates all three outputs: artifact write, manifest registration, hasMarketLandscape coverage field
- 20-field designCoverage replaces 16-field version; "all 16 fields" language removed from competitive.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. One existing test (TAM/SAM/SOM text presence) passed in RED state because competitive.md already had a "## TAM/SAM/SOM Estimates" section header — the other 16 tests correctly failed. This was expected and did not affect the TDD flow.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MRKT-01, MRKT-02, MRKT-04, MRKT-05 satisfied
- Ready for Phase 86 Plan 02: opportunity.md RICE business framing (MRKT-03)
- competitive.md now produces MLS artifact for any project with businessMode=true

---
*Phase: 86-competitive-opportunity-extensions*
*Completed: 2026-03-22*
