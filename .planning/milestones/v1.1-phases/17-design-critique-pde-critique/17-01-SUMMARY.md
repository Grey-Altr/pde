---
phase: 17-design-critique-pde-critique
plan: "01"
subsystem: design-pipeline
tags: [pde-critique, design-critique, ux, accessibility, wcag, workflows, commands]

# Dependency graph
requires:
  - phase: 16-wireframing-pde-wireframe
    provides: wireframe HTML files that /pde:critique evaluates
  - phase: 15-user-flow-mapping-pde-flows
    provides: FLW-flows-v{N}.md consumed as context for business alignment and UX evaluation
  - phase: 13-design-brief-pde-brief
    provides: BRF-brief-v{N}.md consumed as product context for all four perspectives
provides:
  - workflows/critique.md — 631-line 7-step /pde:critique skill workflow
  - commands/critique.md — delegation stub wired to @workflows/critique.md
  - Multi-perspective critique pipeline (UX/Usability, Visual Hierarchy, Accessibility, Business Alignment)
  - Versioned CRT-critique-v{N}.md output with scored findings and iterate action list
affects: [18-design-iteration-pde-iterate, 19-handoff-pde-handoff, 20-build-orchestrator-pde-build]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hard-block prerequisite pattern: halt on both dependencies absent, warn-and-continue on one missing"
    - "Weighted multi-perspective scoring: (UX*1.5 + hierarchy*1.0 + a11y*1.5 + business*1.0) / 5.0"
    - "Fidelity-severity calibration: lofi findings downgraded, hifi findings upgraded per calibration table"
    - "What Works mandatory section: preserves intentional design decisions from iterate overwriting"
    - "coverage-check read-before-set: hasCritique set by merging into existing designCoverage object"

key-files:
  created:
    - workflows/critique.md
  modified:
    - commands/critique.md

key-decisions:
  - "Critique hard-blocks when BOTH brief and flows are absent (CRT-02) — without product context, only generic UI heuristics are possible, which ignores personas and user journeys"
  - "Warn-and-continue when only one prerequisite is missing — single context source is enough to ground evaluation"
  - "Four perspectives with non-equal weights: UX and Accessibility both 1.5x; Visual Hierarchy and Business Alignment both 1.0x — reflects primacy of usability and a11y in quality gates"
  - "What Works section is mandatory (not optional) — /pde:iterate reads this to avoid undoing correct decisions"
  - "Only Critical and Major findings written to DESIGN-STATE Open Critique Items — keeps state focused on action-required items"
  - "Fidelity-severity calibration table applied per finding — lofi color contrast is nit, hifi is major/critical"

patterns-established:
  - "Critique workflow mirrors wireframe.md 7-step structure exactly — Step 1 ensure-dirs, Step 7 coverage-check-before-manifest-set-top-level"
  - "Every finding has 8 mandatory fields: Location, Severity, Effort, Issue, Suggestion, Reference, Perspective, Weight"
  - "Suggestions must include specific values (token names, pixel counts, exact changes) — vague suggestions are anti-patterns"

requirements-completed: [CRT-01, CRT-02, CRT-03]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 17 Plan 01: Design Critique (/pde:critique) Summary

**631-line /pde:critique workflow with four weighted perspectives, hard-block prerequisite gate (CRT-02), fidelity-calibrated severity scoring, mandatory What Works section, and full manifest/coverage integration**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-15T00:48:11Z
- **Completed:** 2026-03-15T00:51:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `workflows/critique.md` (631 lines) with complete 7-step design critique pipeline
- Hard-block implemented at Step 2c: halts with exact error message when both brief and flows are absent (CRT-02)
- Four weighted perspectives in Step 4: UX/Usability (1.5x), Visual Hierarchy (1.0x), Accessibility (1.5x), Business Alignment (1.0x) — each with specific evaluation questions and framework references
- Fidelity-severity calibration table ensures lofi findings are not over-penalized (e.g., color contrast is nit at lofi, major/critical at hifi)
- Mandatory "What Works" section identification in Step 4 with corresponding section in Step 5 report — /pde:iterate reads this to preserve correct decisions
- Coverage flag read-before-set pattern: `coverage-check` before `manifest-set-top-level` preserves flags from other skills
- Updated `commands/critique.md` from stub ("Planned — available in PDE v2") to full delegation to `@workflows/critique.md`
- Infrastructure self-tests: 20/20 passing (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflows/critique.md** - `2ddb3ea` (feat)
2. **Task 2: Update commands/critique.md** - `419debd` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `workflows/critique.md` — 631-line 7-step /pde:critique skill workflow with multi-perspective design evaluation pipeline
- `commands/critique.md` — delegation stub updated from "Planned" stub to `@workflows/critique.md` with argument-hint and updated description

## Decisions Made

- Critique hard-blocks when BOTH brief and flows are absent — without product context, only generic UI heuristics are possible, which adds no value over a generic checklist
- Warn-and-continue when only one prerequisite is missing — a single context source is sufficient to ground at least business alignment or journey-based UX evaluation
- What Works section is mandatory (not optional) — downstream /pde:iterate must know which decisions to preserve, not just which to fix
- Only Critical and Major findings go into DESIGN-STATE Open Critique Items — keeps state focused on action-required items, not exhaustive annotation
- Fidelity-severity calibration table applied per finding — prevents unfair penalization of placeholder colors at lofi while ensuring hifi wireframes are held to production standard

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/pde:critique` is fully wired and ready for use
- Phase 18 (design iteration / `/pde:iterate`) can now consume CRT-critique-v{N}.md Action List
- The "What Works" section and "Open Critique Items" table in DESIGN-STATE are ready for iterate consumption
- Phase 19 (handoff) unblocked — critique is the quality gate before handoff in the pipeline

---
*Phase: 17-design-critique-pde-critique*
*Completed: 2026-03-15*
