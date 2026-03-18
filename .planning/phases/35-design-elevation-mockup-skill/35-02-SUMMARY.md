---
phase: 35-design-elevation-mockup-skill
plan: 02
subsystem: ui
tags: [variable-fonts, font-variation-settings, visual-hook, gpu-performance, 60fps, mockup-skill, gsap, css-animations]

# Dependency graph
requires:
  - phase: 35-01
    provides: MOCK-01 through MOCK-04 GREEN; spring physics, @supports scroll-driven, 7 states, narrative entrance in mockup.md
  - phase: 35-RESEARCH
    provides: Variable font patterns, VISUAL-HOOK convention, GPU compositing rules

provides:
  - MOCK-05 through MOCK-07 Nyquist tests GREEN (completing all 7 MOCK requirements)
  - Variable font animation directives in mockup.md (font-weight nav hover, wdth axis, opsz optical size)
  - VISUAL-HOOK naming convention with HTML comment scaffold and concept-specific examples
  - GPU performance rules (GPU-composited safe properties, NEVER animate layout-triggering, will-change guidance)
  - Generation directives 18 (variable fonts), 19 (visual hook), 20 (60fps GPU performance)
  - Animation Anti-Patterns section (10 rules) in mockup.md Anti-Patterns block
  - 35-VALIDATION.md updated and approved (nyquist_compliant: true, wave_0_complete: true)
  - workflows/mockup.md fully elevated with all 7 MOCK requirement directives

affects:
  - 36-design-elevation-handoff-flows-cross-cutting
  - 37-pressure-test-validation

# Tech tracking
tech-stack:
  added:
    - font-variation-settings (CSS variable font axis animation — Baseline Widely Available)
    - font-optical-sizing: auto (CSS optical size context control)
    - Google Fonts CSS2 API wght axis range (wght@100..900 syntax)
  patterns:
    - Variable font weight animation: font-weight 400->700 on nav hover using var(--ease-spring)
    - VISUAL-HOOK naming convention: HTML comment <!-- VISUAL-HOOK: {name} — {description} --> plus CSS /* VISUAL-HOOK: {name} */ co-location
    - GPU-composited animation constraint: ONLY transform and opacity; NEVER width/height/top/left/margin/padding
    - will-change: transform, opacity — applied sparingly to pre-announce GPU promotion; never will-change: all

key-files:
  created: []
  modified:
    - workflows/mockup.md

key-decisions:
  - "[Phase 35-02]: Variable font section documents which axes the loaded font supports as a comment above <style> — Inter (wght only), Roboto Flex (wght+wdth+opsz) — prevents silent axis-mismatch failures"
  - "[Phase 35-02]: VISUAL-HOOK naming convention uses HTML comment co-located with element in scaffold, plus CSS comment co-located with keyframe — machine-parseable by critique skill and test_mock06"
  - "[Phase 35-02]: Animation Anti-Patterns section added as mandatory reject checklist — 10 patterns enumerated including layout thrashing, generic visual hooks, will-change:all, missing @supports guard"

patterns-established:
  - "Variable font axis comment: always document which axes the loaded font supports above the <style> block; prevents silent wdth/opsz failures on fonts that don't support those axes"
  - "VISUAL-HOOK dual comment: HTML comment <!-- VISUAL-HOOK: name --> on the element + CSS comment /* VISUAL-HOOK: name */ on the keyframe/rule — enables grep validation and critique skill detection"
  - "GPU constraint: ONLY transform and opacity for animations; use transform: scaleX()/scaleY() to replace width/height animation"

requirements-completed: [MOCK-05, MOCK-06, MOCK-07]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 35 Plan 02: Design Elevation — Mockup Skill (Variable Fonts, Visual Hook, GPU Performance) Summary

**mockup.md fully elevated with variable font axis animation (font-variation-settings wght/wdth/opsz), named VISUAL-HOOK convention with anti-generic examples, and 60fps GPU performance rules — all 7 MOCK Nyquist tests GREEN (47 total checks)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-18T05:44:00Z
- **Completed:** 2026-03-18T05:47:43Z
- **Tasks:** 2
- **Files modified:** 2 (workflows/mockup.md + 35-VALIDATION.md)

## Accomplishments

- Added variable font animation CSS section to HTML scaffold: font-weight nav hover (400->700 with var(--ease-spring)), wdth axis (Roboto Flex/Barlow), font-optical-sizing for body/display/caption contexts
- Added VISUAL-HOOK naming convention: HTML comment block in scaffold body with 3 anti-generic examples (pulse-ring, data-flow particle trail, magnetic cursor)
- Added GPU performance comment block: safe properties (transform, opacity), NEVER animate layout-triggering properties, will-change guidance, 60fps target
- Added generation directives 18 (variable fonts), 19 (visual hook concept-specific), 20 (60fps GPU performance) to Key generation rules section
- Added Animation Anti-Patterns section with 10 mandatory rejection rules
- Updated 35-VALIDATION.md: nyquist_compliant: true, wave_0_complete: true, all 7 Wave 0 boxes checked, Approval: approved
- All 7 MOCK Nyquist tests GREEN: MOCK-01 (8 checks), MOCK-02 (7), MOCK-03 (9), MOCK-04 (6), MOCK-05 (6), MOCK-06 (5), MOCK-07 (6) = 47 total checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Elevate mockup.md — variable fonts, visual hook, GPU performance** - `bad05a8` (feat)
2. **Task 2: Validate full test suite and update validation frontmatter** - `81e4a78` (chore)

## Files Created/Modified

- `workflows/mockup.md` - Variable font CSS section, VISUAL-HOOK comment convention in scaffold body, GPU performance comment block, generation directives 18-20, Animation Anti-Patterns section (10 rules)
- `.planning/phases/35-design-elevation-mockup-skill/35-VALIDATION.md` - nyquist_compliant: true, wave_0_complete: true, all Wave 0 boxes checked, all Per-Task Status set to green, Approval: approved

## Decisions Made

- Variable font section documents which axes the loaded font supports as a comment — Inter (wght only), Roboto Flex (wght+wdth+opsz) — prevents silent axis-mismatch failures per Research Pitfall 4
- VISUAL-HOOK naming convention uses HTML comment co-located with scaffold element plus CSS comment co-located with keyframe — dual comment enables both grep validation (test_mock06) and critique skill concept-specificity detection
- Animation Anti-Patterns section placed as a sub-section of the existing Anti-Patterns block — follows Plan 01's additive insertion pattern without restructuring

## Deviations from Plan

None — plan executed exactly as written. All 4 changes (variable fonts, visual hook, GPU performance, anti-patterns) inserted at specified locations without modifying Plan 01 content.

## Issues Encountered

None — elevation applied cleanly. All 7 test scripts passed on first run after edits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 MOCK Nyquist tests GREEN (47 total checks passing)
- workflows/mockup.md has complete elevation: spring physics + scroll-driven + 7 states + narrative entrance + variable fonts + visual hook + GPU performance
- 35-VALIDATION.md nyquist_compliant: true, approved
- Phase 35 complete — ready for Phase 36: Design Elevation — Handoff, Flows & Cross-Cutting

---
*Phase: 35-design-elevation-mockup-skill*
*Completed: 2026-03-18*
