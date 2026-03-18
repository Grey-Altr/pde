---
phase: 34-design-elevation-critique-hig-skills
plan: 02
subsystem: design-skills
tags: [hig, wcag, motion-accessibility, animation-performance, touch-targets, vestibular, prefers-reduced-motion, nyquist]

# Dependency graph
requires:
  - phase: 34-design-elevation-critique-hig-skills
    provides: 34-01-PLAN.md critique elevation (CRIT-01–04) already executed; HIG plan follows same elevation pattern
  - phase: 29-quality-infrastructure
    provides: references/motion-design.md with GPU-composited property list and animation performance rules
  - phase: 33-design-elevation-wireframe-skill
    provides: Nyquist bash test pattern (PASS=$((PASS+1)), set -euo pipefail, check() helper)
provides:
  - 3 Nyquist test scripts for HIG-01 (motion a11y), HIG-02 (performance), HIG-03 (touch target motion state)
  - workflows/hig.md elevated with 4g Motion Accessibility Audit, 4h Animation Performance Audit, 4i Touch Target During Motion State
  - @references/motion-design.md wired into HIG required_reading (5th entry)
affects:
  - phase-35-mockup-skill (HIG now audits motion properties mockups will generate)
  - phase-36-handoff-flows (HIG findings feed iterate loop before handoff)
  - phase-37-pressure-test (all 3 HIG Nyquist tests part of phase gate)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nyquist bash scripts grep skill workflow files for required content patterns (not runtime output)"
    - "Elevation is additive — new sub-sections 4g/4h/4i inserted after existing 4f, no structural changes"
    - "WCAG level accuracy: 2.3.3 AAA advisory vs 2.2.2 Level A mandatory — severity labels reflect this distinction"

key-files:
  created:
    - .planning/phases/34-design-elevation-critique-hig-skills/test_hig01_motion_a11y.sh
    - .planning/phases/34-design-elevation-critique-hig-skills/test_hig02_performance.sh
    - .planning/phases/34-design-elevation-critique-hig-skills/test_hig03_touch_target.sh
  modified:
    - workflows/hig.md

key-decisions:
  - "[Phase 34]: WCAG 2.3.3 (AAA) absence labeled minor/advisory, not major — 2.3.3 is AAA not AA; 2.2.2 Pause/Stop/Hide (Level A) is mandatory and stays major"
  - "[Phase 34]: Vestibular trigger catalogue uses 4 named patterns (parallax-scroll, large-scale-transform, spinning-continuous, viewport-pan) with explicit vestibular-safe alternatives per pattern"
  - "[Phase 34]: Animation performance findings must cite specific element name — generic 'some animations may cause reflow' disallowed by existing hig.md Anti-Patterns section"
  - "[Phase 34]: opacity: 0 documented as acceptable touch target pattern — element remains in DOM at full size; scale(0) and off-screen slide-in are the actual risks"

patterns-established:
  - "HIG elevation pattern: insert named decision blocks (4g, 4h, 4i) as sub-sections within Step 4/7, preserving existing pipeline"
  - "Nyquist RED-then-GREEN: write failing tests first (commit), then elevate skill file to pass (commit)"

requirements-completed: [HIG-01, HIG-02, HIG-03]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 34 Plan 02: HIG Skill Elevation — Motion Accessibility, Animation Performance, Touch Target Motion State Summary

**HIG skill elevated with prefers-reduced-motion audit, vestibular trigger catalogue (4 patterns), GPU-composited vs layout-reflow property classification, and touch target motion state check — all 3 Nyquist tests GREEN (HIG-01: 8/8, HIG-02: 6/6, HIG-03: 5/5)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T04:56:09Z
- **Completed:** 2026-03-18T04:57:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created 3 Nyquist test scripts covering HIG-01 (8 checks), HIG-02 (6 checks), HIG-03 (5 checks) — all confirmed RED against un-elevated hig.md
- Added `@references/motion-design.md` to hig.md required_reading (5th entry), wiring GPU/reflow property knowledge into the HIG skill
- Inserted 3 new audit sub-sections (4g, 4h, 4i) into Step 4/7 of hig.md — all additive, no existing pipeline structure modified
- All 3 HIG Nyquist tests pass GREEN after elevation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 Nyquist test scripts for HIG-01 through HIG-03** - `807cdbf` (test)
2. **Task 2: Elevate hig.md with motion accessibility audit, animation performance check, and touch target motion state** - `162e93c` (feat)

## Files Created/Modified

- `.planning/phases/34-design-elevation-critique-hig-skills/test_hig01_motion_a11y.sh` — 8-check Nyquist test for HIG-01 motion accessibility (prefers-reduced-motion, vestibular triggers, WCAG 2.3.3/2.2.2)
- `.planning/phases/34-design-elevation-critique-hig-skills/test_hig02_performance.sh` — 6-check Nyquist test for HIG-02 animation performance (GPU-composited, layout reflow, will-change)
- `.planning/phases/34-design-elevation-critique-hig-skills/test_hig03_touch_target.sh` — 5-check Nyquist test for HIG-03 touch target motion state (scale(0), off-screen slide-in, opacity:0)
- `workflows/hig.md` — +101 lines: @references/motion-design.md in required_reading; sections 4g (Motion Accessibility Audit), 4h (Animation Performance Audit), 4i (Touch Target During Motion State)

## Decisions Made

- WCAG level distinction enforced: 2.3.3 AAA absence is minor/advisory at hifi, nit at lofi/midfi. 2.2.2 Level A auto-play violation remains major. This matches research pitfall 4 guidance and prevents false compliance severity inflation.
- Vestibular trigger catalogue uses 4 named patterns from research — parallax-scroll, large-scale-transform, spinning-continuous, viewport-pan — each with a named vestibular-safe alternative. Naming ensures findings cite pattern by name, not generically.
- Animation performance findings requirement: every finding must cite specific element name. Enforced by existing Anti-Patterns section; confirmed in new 4h wording ("Cite specific element name in finding").
- opacity: 0 documented as acceptable (element stays in DOM at full size); scale(0) and off-screen slide-in are the risk patterns for touch target motion state.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- HIG-01, HIG-02, HIG-03 requirements complete
- Phase 34 is now complete (both plans 34-01 CRIT elevation and 34-02 HIG elevation done)
- Phase 35 (Mockup Skill) can proceed — depends on Phase 34 HIG elevation being complete
- All 7 Phase 34 Nyquist tests (CRIT-01–04 + HIG-01–03) must pass green at phase gate

---
*Phase: 34-design-elevation-critique-hig-skills*
*Completed: 2026-03-18*
