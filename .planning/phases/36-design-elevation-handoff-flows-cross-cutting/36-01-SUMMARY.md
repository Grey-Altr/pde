---
phase: 36-design-elevation-handoff-flows-cross-cutting
plan: 01
subsystem: ui
tags: [design-system, handoff, flows, motion, typescript, nyquist, bash-grep]

# Dependency graph
requires:
  - phase: 35-design-elevation-mockup-skill
    provides: VISUAL-HOOK convention and mockup motion annotation patterns consumed by handoff.md implementation notes
  - phase: 32-design-elevation-system-skill
    provides: motion-design.md reference and motion token vocabulary used by handoff.md motion spec interface fields
provides:
  - handoff.md elevated with conditional motion spec TypeScript interface fields (HAND-01)
  - handoff.md Implementation Notes subsection pattern with VISUAL-HOOK linkage (HAND-02)
  - flows.md elevated with screen-to-screen transition annotation vocabulary and instructions (FLOW-01)
  - 4 Nyquist test scripts covering HAND-01, HAND-02, FLOW-01, CROSS-01 (17 checks total)
  - 36-VERIFICATION.md documenting ORDER-01 dependency chain and CROSS-02 audit delta procedure
  - All 7 design skills form coherent motion-aware pipeline: system → wireframe → critique/iterate → mockup → handoff + flows
affects: [37-pressure-test-validation, pde-design-pipeline, pde-handoff-agent, pde-flows-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional motion spec block: motionTrigger/motionDuration/motionEasing/respectReducedMotion added to TypeScript interface ONLY when upstream mockup has motion annotation — prevents phantom props on static components"
    - "VISUAL-HOOK linkage in handoff.md Implementation Notes — ties handoff directives back to mockup concept-specific interactions by ID"
    - "Screen-to-screen transition annotation vocabulary in flows.md: slide-right/left/up/down, fade, morph/morph-expand/morph-collapse, shared-element — decision node branches excluded (logical, not visual)"
    - "Step Descriptions transition rationale lines: each outgoing screen-to-screen edge annotated with type and rationale"

key-files:
  created:
    - .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand01_motion_spec.sh
    - .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand02_impl_notes.sh
    - .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_flow01_transitions.sh
    - .planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_cross01_includes.sh
    - .planning/phases/36-design-elevation-handoff-flows-cross-cutting/36-VERIFICATION.md
  modified:
    - workflows/handoff.md
    - workflows/flows.md

key-decisions:
  - "Motion spec fields are conditional — never emitted for static/data-display components lacking upstream motion annotations; prevents phantom TypeScript props that mislead engineers"
  - "Implementation Notes subsection omitted entirely when screen has no VISUAL-HOOK — empty subsections are explicitly disallowed"
  - "flows.md transition annotations use parenthetical format -->|\"CTA click (slide-up)\"| — decision branches excluded because they are logical control flow, not visual transitions"
  - "CROSS-01 test_cross01_includes.sh checks @references/ pattern (not specific file) — handoff.md and flows.md both satisfied via existing skill-style-guide and mcp-integration includes, with handoff.md now gaining motion-design.md"

patterns-established:
  - "Nyquist Wave 0 test scripts: all 4 use PASS=$((PASS+1)) not ((PASS++)) — bash set -e kills arithmetic returning 0; established Phase 32, enforced Phase 36"
  - "Additive-only elevation: no step renumbering, no structural changes to 7-step pipeline anatomy across handoff.md and flows.md"
  - "Transition vocabulary is standardized: slide-right/left/up/down, fade, morph/morph-expand/morph-collapse, shared-element — consistent across all flows output"

requirements-completed: [HAND-01, HAND-02, FLOW-01, CROSS-01, CROSS-02, ORDER-01]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 36 Plan 01: Design Elevation — Handoff, Flows & Cross-Cutting Summary

**handoff.md gains conditional motion spec TypeScript fields (motionTrigger/Duration/Easing/respectReducedMotion) and VISUAL-HOOK Implementation Notes pattern; flows.md gains screen-to-screen transition annotation vocabulary; all 7 design skills verified motion-aware via 17-check Nyquist suite**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T07:17:50Z
- **Completed:** 2026-03-18T07:20:46Z
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- 4 Nyquist test scripts created (Wave 0 RED state confirmed before elevation, GREEN state confirmed after): HAND-01 (5 checks), HAND-02 (3 checks), FLOW-01 (2 checks), CROSS-01 (7 checks) — 17 total
- handoff.md elevated with conditional motion spec TypeScript interface block (4 optional props with JSDoc) and Implementation Notes subsection pattern linking VISUAL-HOOK IDs to Recommended Approach library recommendations
- flows.md elevated with complete transition annotation vocabulary table, screen-to-screen edge annotation rule (decision branches excluded), Step Descriptions extension format, and deprecated vocabulary prohibition
- 36-VERIFICATION.md created with ORDER-01 dependency chain evidence (system→wireframe→critique→mockup→handoff+flows), CROSS-01 7/7 compliance table, and CROSS-02 audit delta procedure with pre/post /pde:audit instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 4 Nyquist test scripts (Wave 0)** - `4d3f4ea` (test)
2. **Task 2: Elevate handoff.md — HAND-01, HAND-02, CROSS-01** - `71fdc15` (feat)
3. **Task 3: Elevate flows.md + create 36-VERIFICATION.md — FLOW-01, ORDER-01, CROSS-02** - `e3aea53` (feat)

**Plan metadata:** (docs commit — see state updates)

## Files Created/Modified
- `workflows/handoff.md` — Added @references/motion-design.md, motion spec TypeScript interface block (4 conditional props), Implementation Notes subsection with VISUAL-HOOK/Recommended Approach table
- `workflows/flows.md` — Added Transition annotations on screen-to-screen edges section: vocabulary table, RULE documentation, annotation placement guide, Step Descriptions extension, deprecated vocabulary
- `.planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand01_motion_spec.sh` — 5-check Nyquist test for HAND-01 (motionTrigger, motionDuration, motionEasing, respectReducedMotion, @references/motion-design)
- `.planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_hand02_impl_notes.sh` — 3-check Nyquist test for HAND-02 (Implementation Notes, VISUAL-HOOK, Recommended Approach)
- `.planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_flow01_transitions.sh` — 2-check Nyquist test for FLOW-01 (transition vocabulary, annotation instruction)
- `.planning/phases/36-design-elevation-handoff-flows-cross-cutting/test_cross01_includes.sh` — 7-check Nyquist test for CROSS-01 (all 7 skill files have @references/ in required_reading)
- `.planning/phases/36-design-elevation-handoff-flows-cross-cutting/36-VERIFICATION.md` — ORDER-01 and CROSS-02 evidence documentation

## Decisions Made
- Motion spec fields are conditional — never emitted for static/data-display components lacking upstream motion annotations; prevents phantom TypeScript props that mislead engineers
- Implementation Notes subsection omitted entirely when screen has no VISUAL-HOOK — empty subsections are explicitly disallowed
- flows.md transition annotations use parenthetical format `-->|"CTA click (slide-up)"|` — decision branches excluded because they are logical control flow, not visual transitions
- CROSS-01 test_cross01_includes.sh checks `@references/` pattern (not a specific file name) — both handoff.md and flows.md were already COMPLIANT via their existing skill-style-guide and mcp-integration includes; handoff.md additionally gains motion-design.md in Phase 36

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks completed per specification. test_cross01_includes.sh was 7/7 GREEN from the start (not partially RED as the plan's conservative estimate predicted) because handoff.md and flows.md already had `@references/skill-style-guide.md` satisfying the `@references/` pattern check. This is expected and correct.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 37 (Pressure Test & Validation) can proceed: all 7 design skills are fully elevated and motion-aware
- All 17 Nyquist checks across 4 test scripts are GREEN
- ORDER-01, CROSS-01, CROSS-02 documented in 36-VERIFICATION.md
- Remaining CROSS-02 item: run `/pde:audit --save-baseline` then `/pde:audit` to record quantitative delta (documented in VERIFICATION.md as pending)
- Pressure test quality evaluation tier decision (AI-with-rubric vs human review) must be resolved before Phase 37 planning (noted in STATE.md pending decisions)

## Self-Check: PASSED

All files verified present. All 3 task commits found (4d3f4ea, 71fdc15, e3aea53). Full 17-check test suite GREEN.

---
*Phase: 36-design-elevation-handoff-flows-cross-cutting*
*Completed: 2026-03-18*
