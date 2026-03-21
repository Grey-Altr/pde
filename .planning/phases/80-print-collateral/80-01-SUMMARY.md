---
phase: 80-print-collateral
plan: 01
subsystem: ui
tags: [print-collateral, html, css, cmyk, wireframe, experience-product]

requires:
  - phase: 74-foundation-and-regression-infrastructure
    provides: experience product type gate, physical domain in DOMAIN_DIRS
  - phase: 79-critique-and-hig-extensions
    provides: Nyquist test pattern (node:test, readFileSync structural assertions)

provides:
  - FLY event flyer HTML scaffold in wireframe.md experience branch (Step 4g)
  - SIT series identity template with {{variable}} slots, gated on recurring-series sub-type
  - CSS @page A5/A4 print dimensions + bleed/safe zone pseudo-element workaround
  - CMYK approximation table inline generation with ink-total warning
  - Awwwards-level composition annotation block (focal hierarchy, negative space, max 3 typefaces)
  - Format variant switcher (A5, A4, Instagram Square 1080x1080, Instagram Story 1080x1920)
  - Mandatory prepress disclaimer block (COMPOSITION REFERENCE language)
  - FLY and SIT manifest registration in physical domain (Step 7c-print)
  - hasPrintCollateral coverage flag (15th flag in designCoverage object)
  - Nyquist test suite (tests/phase-80/print-collateral.test.mjs) covering PRNT-01, PRNT-02, PRNT-04

affects: [81-production-bible, 82-regression-validation]

tech-stack:
  added: []
  patterns:
    - "CSS @page named size keyword (A5, A4) for paper formats; fixed px + transform:scale for screen-only (Instagram) formats"
    - "Bleed zone visualization via ::before pseudo-element with inset: -3mm (not @page bleed — no browser implements it)"
    - "CMYK approximation via inline rgbToCmyk function (RapidTables standard formula, 12 lines)"
    - "{{SLOT_NAME}} template-slot editorial markers for SIT recurring-series template variables"
    - "hasPrintCollateral: true added to 15-field designCoverage coverage flag object"

key-files:
  created:
    - tests/phase-80/print-collateral.test.mjs
  modified:
    - workflows/wireframe.md

key-decisions:
  - "Bleed zone faked with ::before pseudo-element (inset: -3mm) not @page { bleed: 3mm } — no browser implements the @page bleed descriptor"
  - "Instagram formats (1080x1080, 1080x1920) use fixed px dimensions with transform:scale, never @page — they are screen-only artifacts"
  - "CMYK values are approximations only — mandatory disclaimer co-located with every CMYK table"
  - "SIT series identity template strictly gated on experienceSubType === recurring-series — never generated for single-night or other sub-types"
  - "print-ready phrase prohibited in generated content; prepress disclaimer (COMPOSITION REFERENCE) is the canonical replacement phrase"

patterns-established:
  - "Wave 0 TDD: Nyquist tests written before workflow edits, confirming red state before implementation"
  - "Print collateral lives in physical/print/ domain as FLY-event-flyer-v1.html and SIT-series-identity-v1.html"
  - "All print artifacts are composition reference guides, not production files — architectural constraint locked in STATE.md"

requirements-completed: [PRNT-01, PRNT-02, PRNT-04]

duration: 4min
completed: 2026-03-21
---

# Phase 80 Plan 01: Print Collateral Summary

**FLY event flyer and SIT series identity template generation added to wireframe.md experience branch with CSS @page A5 dimensions, pseudo-element bleed/safe zones, CMYK approximation tables, prepress disclaimers, and Awwwards composition annotations — all 16 Nyquist tests green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T19:44:02Z
- **Completed:** 2026-03-21T19:48:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Wrote 16-test Nyquist suite covering PRNT-01, PRNT-02, PRNT-04 — confirmed red state before edits
- Added full FLY event flyer HTML scaffold to wireframe.md Step 4g with CSS @page A5, bleed/safe zone pseudo-elements, CMYK table, 4-format switcher, prepress disclaimer, composition annotation
- Added SIT series identity template generation gated on `experienceSubType === "recurring-series"` with `{{EVENT_NAME}}`, `{{DATE}}`, `{{VENUE}}`, `{{HEADLINER}}`, `{{EDITION_NUMBER}}` template-slot pattern
- Added FLY/SIT manifest registration in physical domain (Step 7c-print) and `hasPrintCollateral` as 15th coverage flag
- Phase 74 regression tests remain green (7/7)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Wave 0 Nyquist test suite for PRNT-01, PRNT-02, PRNT-04** - `9981e07` (test)
2. **Task 2: Add FLY and SIT generation blocks to wireframe.md experience branch** - `26a0069` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `tests/phase-80/print-collateral.test.mjs` - 16 structural Nyquist tests for print collateral requirements; covers FLY artifact, CMYK table, bleed/safe zones, prepress disclaimer, format switcher, SIT gating, Awwwards composition rules, manifest registration
- `workflows/wireframe.md` - Added Step 2h (print prerequisites gate), Step 4g (FLY + SIT HTML scaffold generation), Step 5b-print (file writes to physical/print/), Step 7c-print (manifest registration), updated Step 7d to 15-field coverage object with hasPrintCollateral

## Decisions Made

- Bleed zone faked with `::before` pseudo-element (`inset: -3mm`) not `@page { bleed: 3mm }` — the `@page bleed` descriptor is not implemented in any browser (MDN verified)
- Instagram formats (1080x1080 square, 1080x1920 story) use fixed `px` dimensions with `transform: scale()` for screen preview, never `@page` — they are screen-only compositional reference artifacts
- CMYK values carry mandatory approximation disclaimer; ink-total > 300% flagged in table
- SIT strictly gated on `experienceSubType === "recurring-series"` — never generated for other sub-types
- "print-ready" phrase prohibited in generated flyer content; "COMPOSITION REFERENCE" is the canonical prepress term

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed @page { bleed string from comment in scaffold**
- **Found during:** Task 2 (wireframe.md edits)
- **Issue:** Initial scaffold comment included the literal string `@page { bleed: 3mm }` as a negative example. Test 3 asserts `!content.includes('@page { bleed')` — the comment caused the anti-pattern assertion to fail
- **Fix:** Rephrased the comment to "the @page bleed descriptor is not implemented in any browser" without the exact prohibited string
- **Files modified:** workflows/wireframe.md
- **Verification:** Test 3 passes; no `@page { bleed` matches in grep output
- **Committed in:** `26a0069` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — test assertion conflict with comment content)
**Impact on plan:** Minor phrasing adjustment only. No scope change.

## Issues Encountered

- Test 3 (bleed zone anti-pattern assertion) failed on first pass because the scaffold comment included the exact prohibited string as a negative example. Fixed by rephrasing the comment.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FLY and SIT artifacts ready for reference in Phase 81 (production bible)
- PRNT-03 (festival program, multi-page HTML) is Plan 2 scope — not covered here
- hasPrintCollateral: true coverage flag available for Phase 82 regression validation

## Self-Check: PASSED

- tests/phase-80/print-collateral.test.mjs: FOUND
- workflows/wireframe.md: FOUND
- .planning/phases/80-print-collateral/80-01-SUMMARY.md: FOUND
- Commit 9981e07: FOUND
- Commit 26a0069: FOUND

---
*Phase: 80-print-collateral*
*Completed: 2026-03-21*
