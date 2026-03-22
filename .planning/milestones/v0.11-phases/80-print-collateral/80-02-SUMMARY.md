---
phase: 80-print-collateral
plan: 02
subsystem: ui
tags: [print-collateral, html-css, paged-media, festival-program, wireframe]

# Dependency graph
requires:
  - phase: 80-01
    provides: FLY and SIT print artifact blocks in wireframe.md Step 4g; print manifest registration pattern
  - phase: 76-experience-tokens
    provides: SYS-experience-tokens.json brand color variables consumed in PRG CSS custom properties
provides:
  - PRG festival program HTML generation block in wireframe.md (multi-day sub-type gate)
  - Five-page multi-page HTML: cover, schedule grid, artist bios, venue map, sponsors
  - Named @page CSS rules (cover portrait, schedule A4 landscape)
  - PRG file write in Step 5b-print
  - PRG manifest registration in Step 7c-print (physical domain)
  - 7 Nyquist tests for PRNT-03 (total 23 tests for Phase 80)
affects: [81-production-bible, 82-regression]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-page HTML with named @page CSS rules: @page cover (portrait), @page schedule (A4 landscape)"
    - "Page navigation bar for screen browsing, hidden via @media print"
    - "Schedule grid uses JetBrains Mono for time column (max 2 typefaces rule)"
    - "PRG gated strictly on experienceSubType === multi-day; GENERATE_PRG flag mirrors GENERATE_SIT pattern"

key-files:
  created:
    - .planning/phases/80-print-collateral/80-02-SUMMARY.md
  modified:
    - workflows/wireframe.md
    - tests/phase-80/print-collateral.test.mjs

key-decisions:
  - "PRG uses @page schedule { size: A4 landscape } for schedule grid legibility — landscape gives wider columns for multi-stage grids"
  - "Five discrete HTML sections (cover, schedule, lineup, map, sponsors) use page-break-after: always for clean print pagination"
  - "PRG GENERATE_PRG flag mirrors the GENERATE_SIT pattern exactly — consistent conditional generation logic"
  - "Schedule grid comments reference temporal flow artifact as soft dependency (placeholder grid if absent) — consistent with FLP pattern in venue map"

patterns-established:
  - "Pattern 1 (from 80-01): Named @page rules for multi-section print documents — cover, schedule, default"
  - "Pattern 2: GENERATE_PRG flag follows GENERATE_SIT pattern — IF gate at generation, IF gate at file write, conditional manifest registration"
  - "Pattern 3: Sponsor tier grid (headline/supporting/community) with placeholder logo boxes for design reference"

requirements-completed: [PRNT-03]

# Metrics
duration: 10min
completed: 2026-03-21
---

# Phase 80 Plan 02: Print Collateral (PRG Festival Program) Summary

**Multi-page festival program HTML artifact (PRG) added to wireframe.md experience branch with schedule grid, artist bios, venue map, and sponsors — gated on multi-day sub-type**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-21T19:50:00Z
- **Completed:** 2026-03-21T19:52:29Z
- **Tasks:** 1 auto + 1 auto-approved checkpoint
- **Files modified:** 2

## Accomplishments
- PRG generation block added to wireframe.md Step 4g, gated on `experienceSubType === "multi-day"`
- Five-page self-contained HTML: Cover (brand gradient hero), Schedule Grid (A4 landscape @page), Artist Bios (2-3 column card grid), Venue Map (FLP reference placeholder), Sponsors & Info (tier grid + essential info block)
- Multi-page CSS with three named @page rules: `cover` (portrait, zero margins), `schedule` (A4 landscape, 10mm), default (A4 portrait, 15mm)
- PRG file write and manifest registration in physical domain added to Steps 5b-print and 7c-print
- 7 PRNT-03 Nyquist tests added to print-collateral.test.mjs — all 23 Phase 80 tests green
- Phase 74 regression test suite unbroken (7 tests, all pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PRNT-03 tests and PRG generation block** - `ad7ff1b` (feat)
2. **Task 2: Human verification** - Auto-approved (checkpoint:human-verify, auto mode active)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified
- `workflows/wireframe.md` — PRG generation block in Step 4g; PRG write in Step 5b-print; PRG manifest registration in Step 7c-print
- `tests/phase-80/print-collateral.test.mjs` — New `describe('PRNT-03: PRG festival program')` block with 7 tests

## Decisions Made
- PRG uses `@page schedule { size: A4 landscape }` for schedule grid: landscape gives more columns for multi-stage event grids
- Five pages use `page-break-after: always` on `.page` class with `.page:last-child { page-break-after: auto }` — clean multi-page flow
- `GENERATE_PRG` flag mirrors `GENERATE_SIT` pattern exactly for consistency across conditional artifact generation
- Schedule grid, venue map, and artist lineup sections all include comments linking to upstream data sources (temporal flow, FLP, brief lineup field) as soft dependencies — placeholder data if absent

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 80 (print-collateral) complete: FLY, SIT, and PRG artifacts all implemented with proper gates, manifest registration, and 23 Nyquist tests
- Phase 81 (production bible) can reference all three print artifact codes (FLY, SIT, PRG) and their physical domain paths
- Phase 82 (regression) can validate all print collateral blocks end-to-end
- Research flag from STATE.md still active: CSS @page browser compatibility — Chrome reliable, test print-to-PDF in Chrome before finalizing any production print flow

---
*Phase: 80-print-collateral*
*Completed: 2026-03-21*
