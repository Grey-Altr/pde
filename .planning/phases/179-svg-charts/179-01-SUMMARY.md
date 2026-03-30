---
phase: 179-svg-charts
plan: 01
subsystem: presentation
tags: [svg, charts, accessibility, aria, presentation-ir, html-rendering]

# Dependency graph
requires:
  - phase: 176-data-extraction-ir-foundation
    provides: IR object shape (requirements, phases, cost_timing, git_velocity)
  - phase: 178-reference-personas-+-rendering-engine
    provides: render-presentation.cjs renderer with section model and PDE_CSS

provides:
  - bin/lib/charts.cjs with four SVG chart generator functions
  - Accessible inline SVG charts (role=img, aria-labelledby, title element)
  - details/table fallback for each chart for screen readers
  - Charts wired into buildExecutiveSummary (burndown, velocity) and buildCaseStudy (timeline, effort)
  - Chart CSS in PDE_CSS (.chart-data-table)

affects:
  - 180-persona-expansion
  - 181-additional-personas
  - 182-additional-personas-2
  - 183-auto-generation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG chart generators: pure string-templating, zero npm deps, hardcoded hex colors (CSS vars unreliable in SVG fill)"
    - "Unavailability guard pattern: if (!ir.field || ir.field.unavailable) return unavailableSvg()"
    - "Accessibility pattern: role=img + aria-labelledby + <title id=...> + sibling <details><table> fallback"
    - "Synthetic burndown from IR aggregate counts (no per-phase snapshots needed)"

key-files:
  created:
    - bin/lib/charts.cjs
    - tests/phase-179/charts.test.mjs
  modified:
    - bin/lib/render-presentation.cjs
    - tests/phase-178/render-presentation.test.mjs

key-decisions:
  - "SVG colors are hardcoded hex values, not CSS custom properties — CSS variables do not work reliably in SVG fill attributes"
  - "Burndown chart uses synthetic linear approximation from IR aggregate counts (phases.completed / phases.total) since per-phase snapshots are not in IR"
  - "Fallback data table is a sibling HTML element (<details><table>), not SVG <foreignObject> — avoids rendering incompatibilities"
  - "velocityChart uses phase_list when available, falls back to aggregate completed/total bar when absent"

patterns-established:
  - "unavailableSvg(message): returns 600x100 placeholder SVG with centered text — reusable guard for all chart types"
  - "escAttr(str): SVG-safe attribute escaping (distinct from escHtml for body context)"
  - "All chart functions: guard unavailable first, guard insufficient data second, render chart third"

requirements-completed: [CHT-01, CHT-02, CHT-03, CHT-04, CHT-05, CHT-06]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 179 Plan 01: SVG Charts Summary

**Four parametric SVG chart generators (burndown, velocity, phase timeline, effort breakdown) with accessibility attributes and HTML fallback tables, wired into the executive-summary and case-study presentation personas.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T02:03:00Z
- **Completed:** 2026-03-30T02:06:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `bin/lib/charts.cjs` with four exported SVG chart generators, all zero-dependency pure string templating
- All charts include `role="img"`, `aria-labelledby`, `xmlns`, `viewBox`, and a `<title>` element for full accessibility
- All charts append `<details class="chart-data-table"><summary>...<table>` fallback for screen readers
- All guard patterns handle unavailable/empty IR data returning placeholder SVG without throwing
- No chart output contains `<script>` tags or external URLs (security constraints met)
- Wired burndown + velocity into `buildExecutiveSummary`, timeline + effort into `buildCaseStudy`
- Added `.chart-data-table` CSS rules and `svg { display: block }` to `PDE_CSS`
- 48 chart unit tests + 9 chart integration tests added; all 91 tests across phase-178 and phase-179 pass

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for SVG chart generators** - `120aa26` (test)
2. **Task 1 GREEN: Implement bin/lib/charts.cjs** - `52552b2` (feat)
3. **Task 2: Wire charts into render-presentation.cjs** - `4a2daf8` (feat)

## Files Created/Modified
- `bin/lib/charts.cjs` - Four SVG chart generator functions with accessibility and fallback tables
- `tests/phase-179/charts.test.mjs` - 48 unit tests covering all chart generators
- `bin/lib/render-presentation.cjs` - Added charts require, 4 new section entries, chart CSS
- `tests/phase-178/render-presentation.test.mjs` - Added Chart integration (CHT-05) describe block

## Decisions Made
- **SVG hardcoded hex colors**: CSS variables (`var(--pde-accent)`) do not work reliably in SVG `fill` attributes in self-contained HTML, so all colors are hardcoded PDE hex values (matches pitfalls noted in research).
- **Synthetic burndown**: IR lacks per-phase requirement snapshots, so burndown uses a linear approximation from `phases.completed/phases.total` progress as the interpolation factor.
- **Sibling `<details>` fallback**: Fallback data tables are sibling HTML elements outside the SVG, not `<foreignObject>` inside the SVG, avoiding rendering incompatibilities.
- **`velocityChart` phase_list fallback**: If `phase_list` is absent, renders a single summary bar with completed/total ratio instead of per-phase bars.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All TDD phases (RED → GREEN) worked on first pass.

## Known Stubs

None. All four chart generators produce real data from the IR. Unavailable-data cases produce properly labeled placeholder SVGs, not empty output.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `bin/lib/charts.cjs` is ready to be consumed by any additional personas added in phases 180-182
- The `unavailableSvg` guard pattern can be reused or imported if additional chart types are added
- PDE_CSS chart rules will automatically apply to all personas that use `renderHTML`

---
*Phase: 179-svg-charts*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: bin/lib/charts.cjs
- FOUND: tests/phase-179/charts.test.mjs
- FOUND: .planning/phases/179-svg-charts/179-01-SUMMARY.md
- FOUND commit 120aa26 (test RED)
- FOUND commit 52552b2 (feat GREEN)
- FOUND commit 4a2daf8 (feat wire)
