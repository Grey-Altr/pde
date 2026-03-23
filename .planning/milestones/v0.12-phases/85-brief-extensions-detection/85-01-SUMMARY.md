---
phase: 85-brief-extensions-detection
plan: 01
subsystem: workflow
tags: [business-detection, brief, track-selection, domain-strategy, manifest]

# Dependency graph
requires:
  - phase: 84-foundation
    provides: businessMode/businessTrack manifest schema, business-track.md, launch-frameworks.md, business-financial-disclaimer.md
provides:
  - Business intent detection logic in workflows/brief.md (Step 4: 5-category signal taxonomy, BUSINESS_SIGNAL_COUNT >= 3 threshold)
  - Track selection prompt with product_leader/startup_team/solo_founder detection and --force/--dry-run/--quick flag handling
  - Conditional Domain Strategy section in BRF artifact (Naming Direction, Domain Availability Notes, Brand Positioning Seeds)
  - businessMode and businessTrack manifest writes in Step 7
  - Financial placeholder enforcement with dollar-amount grep verification
  - Structural test scaffold covering BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07 (17 tests, all pass)
affects: [86-competitive, 87-flows, 88-brand, 89-wireframe, 90-critique, 91-handoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Business detection via signal taxonomy: 5 named categories (Model/Market/Launch/Metrics/Positioning), 3+ signals across 2+ categories = businessMode true"
    - "Track detection order: product_leader first (most specific), then startup_team, then solo_founder as default"
    - "Interactive track confirmation prompt with flag escape hatches: --force/--quick skip prompt, --dry-run halts after display"
    - "Domain Strategy section gated on businessMode == true, always uses [YOUR_X] placeholders per financial-disclaimer.md"
    - "Dollar-amount verification: grep -qE '\\$[0-9]' on BRF artifact after write"

key-files:
  created:
    - .planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs
    - .planning/phases/85-brief-extensions-detection/85-01-SUMMARY.md
  modified:
    - workflows/brief.md

key-decisions:
  - "Inserted business detection as a sub-section of Step 4 (after product_type display) rather than a new Step 4b — keeps step count at 7 and insertion point is natural"
  - "Domain Strategy placed after experience-only sections (before Footer) so it composes correctly for both experience and non-experience product types"
  - "Track selection uses interactive prompt by default; --force and --quick both skip it — consistent with existing --force semantics in version increment"
  - "Dollar-amount verification is a runtime bash check in Step 7, not a write-time guard — preserves existing BRF write sequence"

patterns-established:
  - "Business mode structural tests: read workflow file once at top, run all assertions as string pattern checks (no runtime execution)"
  - "Required_reading block is the canonical location for reference file declarations in workflow files"

requirements-completed: [BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 85 Plan 01: Brief Extensions Detection Summary

**Business intent detection in brief.md via 5-category signal taxonomy (3+/2+ threshold), interactive track selection with solo_founder/startup_team/product_leader, conditional Domain Strategy section in BRF output, and businessMode/businessTrack manifest writes**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-22T15:00:00Z
- **Completed:** 2026-03-22T15:06:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created 17-test structural scaffold (test-brief-detection.cjs) verifying brief.md business detection infrastructure for BRIEF-01, BRIEF-02, BRIEF-05, BRIEF-07
- Added Business Intent Detection (BRIEF-01): 5-category signal taxonomy scanning PROJECT.md content, BUSINESS_SIGNAL_COUNT >= 3 AND 2+ categories threshold, strong single-signal override, businessMode = false default
- Added Track Detection (BRIEF-02): product_leader first, startup_team, solo_founder default, interactive selection prompt with --force/--dry-run/--quick flag handling
- Added Domain Strategy section template (BRIEF-05): Naming Direction, Domain Availability Notes, Brand Positioning Seeds — gated on businessMode == true, all financial values use [YOUR_X] placeholders
- Added Business Mode Manifest Writes (Step 7): manifest-set-top-level businessMode and businessTrack, dollar-amount grep verification per BRIEF-07

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test scaffold for brief detection requirements** - `cf36ed7` (test)
2. **Task 2: Add business detection, track selection, domain strategy, and manifest writes to brief.md** - `30bb7dc` (feat)

## Files Created/Modified
- `workflows/brief.md` - Added 130 lines: business detection logic, track selection, Domain Strategy template, manifest writes, summary row, output block update
- `.planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs` - 225-line structural test file for BRIEF-01/02/05/07 (17 tests, all pass GREEN)

## Decisions Made
- Inserted business detection as a sub-section of Step 4 (after product_type display) rather than a new Step 4b — keeps step count at 7
- Domain Strategy placed after experience-only sections so it composes correctly for both product types
- Track selection uses interactive prompt by default; --force and --quick both skip — consistent with existing --force semantics
- Dollar-amount verification is a runtime bash check in Step 7 rather than a write-time guard

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Brief workflow is ready for Plan 02 (business thesis + lean canvas generation when businessMode == true)
- All structural tests pass, providing regression coverage for future brief.md edits
- Phase 86 (competitive) and Phase 87 (flows) can reference businessMode/businessTrack from manifest to apply track-specific depth thresholds

---
*Phase: 85-brief-extensions-detection*
*Completed: 2026-03-22*
