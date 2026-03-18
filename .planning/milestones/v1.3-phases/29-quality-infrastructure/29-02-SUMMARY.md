---
phase: 29-quality-infrastructure
plan: 02
subsystem: ui
tags: [motion, animation, gsap, scroll-driven, spring-physics, apca, typography, composition, grid-systems, variable-fonts]

# Dependency graph
requires: []
provides:
  - "references/motion-design.md — animation timing scales, GSAP 3.14 CDN patterns, spring physics (3 levels), mandatory @supports scroll-driven pattern, variable font axis animation"
  - "references/composition-typography.md — named grid systems (5 types), visual weight analysis, spatial asymmetry principles, type pairing classification, APCA |Lc| thresholds"
affects:
  - Phase 32 (Design Elevation — System Skill)
  - Phase 33 (Design Elevation — Wireframe Skill)
  - Phase 34 (Design Elevation — Critique and HIG)
  - Phase 35 (Design Elevation — Mockup Skill)
  - Phase 36 (Design Elevation — Handoff, Flows, Cross-Cutting)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LLM-consumable reference anatomy with header block, Version/Scope/Ownership/Boundary, tables, code examples, citations"
    - "MANDATORY @supports guard for CSS scroll-driven animations (Firefox progressive enhancement)"
    - "APCA |Lc| absolute value notation for polarity-neutral contrast documentation"
    - "Three-level spring physics fidelity: cubic-bezier (universal), linear() (88%), GSAP elastic (unlimited)"

key-files:
  created:
    - references/motion-design.md
    - references/composition-typography.md
  modified: []

key-decisions:
  - "CSS scroll-driven animation @supports guard labeled MANDATORY (not optional) because omitting it causes invisible content in Firefox — critical usability failure"
  - "APCA values documented with absolute value |Lc| notation throughout to prevent polarity confusion (positive = dark-on-light, negative = light-on-dark)"
  - "Spring physics documented at 3 fidelity levels to match skill and browser support constraints: cubic-bezier for universal, linear() for 88% support, GSAP for complex scenarios"
  - "GSAP 3.14 is current version (March 2026); all plugins including ScrollTrigger are free post-Webflow 2024 acquisition — no club membership note included to prevent agents using outdated paid-gating warnings"

patterns-established:
  - "Pattern 1 (motion-design.md): Duration scale as CSS custom properties (--duration-micro through --duration-dramatic) with DTCG token format"
  - "Pattern 2 (composition-typography.md): Grid selection rationale format — explicit documentation of choice and rejected alternative"
  - "Pattern 3 (composition-typography.md): Type pairing requires classification or structural contrast — size difference alone is not a pairing"
  - "Pattern 4 (composition-typography.md): Eye-path annotation with three required elements: first anchor, reading axis, rest point"

requirements-completed: [QUAL-02, QUAL-03]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 29 Plan 02: Motion Design and Composition/Typography References Summary

**Motion design reference (GSAP 3.14, 3-level spring physics, mandatory @supports scroll-driven pattern) and composition/typography reference (5 named grid systems, APCA |Lc| thresholds, type pairing classification) authored as LLM-consumable prescriptive reference files for design elevation phases**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T23:48:39Z
- **Completed:** 2026-03-17T23:51:50Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- `references/motion-design.md` created: duration scale, 5 easing curves, spring physics at 3 fidelity levels (cubic-bezier/linear()/GSAP), GSAP 3.14 CDN patterns with 4 usage examples, MANDATORY @supports scroll-driven animation guard, variable font axis table + code, performance rules, DTCG token format
- `references/composition-typography.md` created: 5 named grid systems with CSS patterns, 7-factor visual weight table, 5 spatial asymmetry types, type pairing classification (5 contrast types) with rationale format, APCA |Lc| threshold tables (by context and by size×weight), viewport-aware content hierarchy format
- Both files follow established reference anatomy: header block with Scope/Ownership/Boundary, tabular data, code examples with source citations, citations table at end

## Task Commits

Each task was committed atomically:

1. **Task 1: Author references/motion-design.md** - `f985687` (feat)
2. **Task 2: Author references/composition-typography.md** - `7a036a1` (feat)

**Plan metadata:** (see final commit below)

## Files Created

- `references/motion-design.md` — GSAP 3.14 CDN patterns, spring physics (3 levels), mandatory @supports scroll-driven animations, variable font axis animation, performance rules
- `references/composition-typography.md` — Named grid systems (12-col, modular, golden ratio, rule of thirds, asymmetric), visual weight analysis, spatial asymmetry principles, type pairing classification, APCA |Lc| thresholds

## Decisions Made

- CSS scroll-driven `@supports` guard is labeled **MANDATORY** because omitting it causes `opacity: 0` content to be permanently invisible in Firefox — a content failure, not a graceful degradation
- APCA values use `|Lc|` notation throughout to eliminate polarity confusion. Positive Lc = dark text on light background; negative Lc = light text on dark background. Absolute value enables unambiguous comparisons
- Spring physics documented at 3 levels because skill agents may operate without GSAP loaded. Level 1 (cubic-bezier) is universally safe; Level 2 (linear()) covers 88% of browsers with no dependencies; Level 3 (GSAP elastic) requires the library
- GSAP 3.14 noted as current (March 2026) with all plugins now free — eliminates incorrect agent behavior of treating ScrollTrigger as a paid-only plugin

## Deviations from Plan

None — plan executed exactly as written. Both files authored following the specified structure from the plan's action blocks and the reference anatomy from color-systems.md.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Both files are static Markdown references.

## Next Phase Readiness

- Phase 29 Plan 03 (protected-files.json and infrastructure extensions) can proceed
- Phases 32–36 (design elevation) have their motion and composition/typography reference prerequisites satisfied
- Both files available for `@references/motion-design.md` and `@references/composition-typography.md` includes

---
*Phase: 29-quality-infrastructure*
*Completed: 2026-03-17*
