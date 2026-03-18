---
phase: 32-design-elevation-system-skill
plan: 03
subsystem: ui
tags: [design-tokens, dtcg, spacing, typography, css-custom-properties, density]

# Dependency graph
requires:
  - phase: 32-02
    provides: OKLCH harmony palettes and APCA contrast guidance in system skill

provides:
  - Density spacing system with compact/default/cozy contexts using IBM Carbon multiplier pattern
  - Semantic spacing token layer (6 named slots) on top of 15-step primitive scale
  - Type pairing recommendations with Vox-ATypI classification taxonomy and APCA notes
  - 5 documented pairings with 4-field format (classification contrast, roles, APCA note, avoid)
  - DTCG JSON density extensions (density-compact, density-cozy conditions)
  - DTCG JSON pairing metadata in typography block

affects: [33-design-elevation-wireframe-skill, 34-design-elevation-critique-hig, 35-design-elevation-mockup-skill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Density context pattern: same semantic token names override primitive values via data-density attribute (IBM Carbon approach)"
    - "Semantic spacing layer: intermediate tokens map intent to primitive values, protecting downstream CSS from scale changes"
    - "Type classification taxonomy: Vox-ATypI simplified for digital (8 categories with token values)"
    - "4-field pairing format: classification contrast / roles / APCA note / avoid"

key-files:
  created: []
  modified:
    - workflows/system.md

key-decisions:
  - "[Phase 32]: Density context uses data-density attribute selector (IBM Carbon pattern) with ~0.75x/1x/1.5x multipliers — compact for data-dense, default for standard, cozy for editorial/hero"
  - "[Phase 32]: Semantic spacing layer sits between primitives and components — 6 named slots (component-gap, section-gap, content-gap, inline, card-padding, page-margin)"
  - "[Phase 32]: Type pairings placed in Step 4 (generation) not Step 6 (output) — pairings are design generation decisions, not formatting metadata"
  - "[Phase 32]: DTCG JSON uses $extensions with com.pde.condition for density variants — follows DTCG spec extension pattern for contextual overrides"

patterns-established:
  - "Density spacing: semantic token layer with 3-context override pattern enables same token names to serve hero and data-dense views"
  - "Type pairing documentation: 4-field format (classification contrast / role description / APCA threshold / anti-pattern) becomes standard for pairing docs"

requirements-completed: [SYS-05, SYS-06]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 32 Plan 03: Design Elevation — System Skill Summary

**Density spacing system (compact/default/cozy) with semantic token layer and 5 type pairings with Vox-ATypI classification contrast rationale added to system skill**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T03:02:47Z
- **Completed:** 2026-03-18T03:04:46Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Density spacing system: semantic 6-slot token layer with compact/default/cozy override contexts using IBM Carbon ~0.75x/1x/1.5x multipliers
- Optical spacing adjustment notes documenting section flush, icon pair gap reduction, touch target minimums
- DTCG JSON spacing.semantic block with density-compact/cozy $extensions conditions
- SYS-spacing.css template extended with semantic default + compact + cozy density override blocks
- Type pairing section: Vox-ATypI classification taxonomy (8 categories) with 4-field recommendation format
- 5 documented pairings: Playfair+Inter, EB Garamond+DM Sans, Fraunces+Source Sans 3, JetBrains Mono+Inter, Clash Display+Satoshi
- DTCG JSON typography block extended with pairing key and classification $description on fontFamily tokens
- All 65 Nyquist tests pass (6 test scripts, SYS-01 through SYS-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add density spacing system (SYS-05)** - `a886b5f` (feat)
2. **Task 2: Add type pairing recommendations (SYS-06)** - `197c083` (feat)

## Files Created/Modified
- `workflows/system.md` - Added density spacing (semantic layer + 3 density contexts + optical notes + DTCG JSON + CSS template) and type pairing section (taxonomy + 5 pairings + DTCG JSON)

## Decisions Made
- Density context uses `data-density` attribute selector (IBM Carbon pattern) with ~0.75x/1x/1.5x multipliers
- Semantic spacing layer sits between primitives and components — protects downstream CSS from scale changes
- Type pairings placed between typography tokens and spacing tokens — logically follows type token generation
- DTCG JSON uses `$extensions` with `com.pde.condition` for density variants
- dry-run estimate updated from "15 values" to "15 primitives + 6 semantic + 12 density overrides"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 32 complete — system skill elevated with SYS-01 through SYS-06 (motion, variable fonts, harmony palettes, APCA, density spacing, type pairings)
- Phase 33 (Wireframe Skill) can now reference system.md for density contexts and type pairing guidance
- Phase 34 (Critique & HIG) will use type pairing classification taxonomy from system.md

---
*Phase: 32-design-elevation-system-skill*
*Completed: 2026-03-18*
