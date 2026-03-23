---
phase: 99-safety-boundaries
plan: 02
subsystem: workflow-safety
tags: [experiment-boundaries, LOCKED, OPTIMIZABLE, workflow-annotation, safety, v0.13]

# Dependency graph
requires:
  - phase: 99-safety-boundaries-plan-01
    provides: references/experiment-boundaries.md defining the boundary taxonomy

provides:
  - LOCKED/OPTIMIZABLE HTML comment markers in all 14 experiment-eligible design skill workflows
  - Section-level inline enforcement layer complementing file-level protections in experiment-boundaries.md

affects:
  - Phase 100 (experiment.cjs) — runner reads these markers to enforce mutation boundaries per-section
  - Phase 102 (metric evaluation) — experiment runner respects LOCKED/OPTIMIZABLE zones when generating mutations
  - Phase 104 (presets) — preset definitions specify which workflow files to mutate, constrained by markers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HTML comment annotation pattern: <!-- LOCKED: description --> ... <!-- /LOCKED --> wrapping infrastructure sections"
    - "OPTIMIZABLE sections wrap prose guidance, example outputs, and heuristic orderings"
    - "Step 1 (init with pde-tools.cjs), required_reading, flags, purpose always in first LOCKED region"
    - "designCoverage writes, artifact codes, file paths, MCP probes always in LOCKED regions"
    - "Awwwards dimension weights (Design 40%/Usability 30%/Creativity 20%/Content 10%) explicitly inside LOCKED region in critique.md"
    - "Stitch integration contracts in wireframe.md and mockup.md inside LOCKED region"

key-files:
  created: []
  modified:
    - workflows/brief.md
    - workflows/system.md
    - workflows/flows.md
    - workflows/ideate.md
    - workflows/wireframe.md
    - workflows/critique.md
    - workflows/hig.md
    - workflows/iterate.md
    - workflows/recommend.md
    - workflows/mockup.md
    - workflows/competitive.md
    - workflows/opportunity.md
    - workflows/handoff.md
    - workflows/deploy.md

key-decisions:
  - "Each file gets at minimum one LOCKED and one OPTIMIZABLE section — no files left unannotated per SAFE-02"
  - "Markers placed at step/section level (wrapping entire named sections), not line level"
  - "Interleaved markers used where needed (e.g., ideate.md has 3 LOCKED + 2 OPTIMIZABLE regions alternating)"
  - "critique.md Awwwards dimension weights explicitly documented in LOCKED comment description to prevent future ambiguity"
  - "deploy.md Step 3 (scaffold generation guidance) marked OPTIMIZABLE; Step 4 (Vercel deployment verification) marked LOCKED — deploy verification is infrastructure"

patterns-established:
  - "LOCKED open format: <!-- LOCKED: {brief description of what is protected} -->"
  - "OPTIMIZABLE open format: <!-- OPTIMIZABLE: {brief description of optimizable content} -->"
  - "Close markers use same format regardless: <!-- /LOCKED --> and <!-- /OPTIMIZABLE -->"
  - "First LOCKED block always covers: purpose, required_reading, flags, process header, init step, MCP probe"
  - "Coverage-write steps (manifest-set-top-level designCoverage) always in LOCKED regions"

requirements-completed: [SAFE-02]

# Metrics
duration: 35min
completed: 2026-03-23
---

# Phase 99 Plan 02: Workflow Section Markers Summary

**LOCKED/OPTIMIZABLE HTML comment markers added to all 14 experiment-eligible design skill workflows, protecting init steps and infrastructure while exposing prose guidance sections for autonomous optimization**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-23T08:20:00Z
- **Completed:** 2026-03-23T08:59:42Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- All 14 experiment-eligible workflow files (brief, system, flows, ideate, wireframe, critique, hig, iterate, recommend, mockup, competitive, opportunity, handoff, deploy) annotated with paired LOCKED/OPTIMIZABLE markers
- Every file has at least one LOCKED and one OPTIMIZABLE section (SAFE-02 requirement satisfied)
- All open/close marker counts match within every file (no unclosed markers)
- critique.md Awwwards dimension weights (Design 40%, Usability 30%, Creativity 20%, Content 10%) confirmed inside LOCKED region
- Full Nyquist suite verified: 944/952 passing — zero new regressions introduced by annotations

## Task Commits

Each task was committed atomically:

1. **Task 1: Annotate 7 core design skill workflows** - `5291bea` (feat)
2. **Task 2: Annotate 7 remaining design skill workflows** - `55c3965` (feat)

## Files Created/Modified
- `workflows/brief.md` - LOCKED=init+prereqs+MCP+type-detect+state-writes; OPTIMIZABLE=Step 5 brief synthesis
- `workflows/system.md` - LOCKED=init+token-schema+state-writes; OPTIMIZABLE=Step 5 token generation guidance
- `workflows/flows.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=Step 4 flow diagram guidance
- `workflows/ideate.md` - LOCKED=init+prereqs+MCP+recommend-checkpoint+artifact-writes; OPTIMIZABLE=Step 4 diverge + Step 6 converge guidance
- `workflows/wireframe.md` - LOCKED=init+prereqs+MCP+Stitch-contract+file-writes; OPTIMIZABLE=Step 4a Claude generation guidance
- `workflows/critique.md` - LOCKED=init+prereqs+MCP+Awwwards-weights+finding-format+artifact-writes; OPTIMIZABLE=perspective guidance (Perspectives 1-4)
- `workflows/hig.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=WCAG/HIG evaluation prose
- `workflows/iterate.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=Step 4 iteration guidance
- `workflows/recommend.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=Step 4 recommendation framing
- `workflows/mockup.md` - LOCKED=init+prereqs+MCP+Stitch-contract+artifact-writes; OPTIMIZABLE=Step 4a mockup generation
- `workflows/competitive.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=Step 4 competitive analysis guidance
- `workflows/opportunity.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=Step 4 RICE scoring guidance
- `workflows/handoff.md` - LOCKED=init+prereqs+MCP+artifact-writes; OPTIMIZABLE=Step 4 handoff synthesis guidance
- `workflows/deploy.md` - LOCKED=init+prereqs+approval-gates-infra+coverage-write; OPTIMIZABLE=Step 3 scaffold generation guidance

## Decisions Made
- Each file annotated with 2-3 LOCKED blocks and 1-2 OPTIMIZABLE blocks depending on step structure (not a flat single block per file — allows interleaving for files like ideate.md with alternating lock/optimize/lock structure)
- deploy.md: Step 3 (scaffold generation guidance) OPTIMIZABLE; Step 4 (Vercel deployment steps) LOCKED — deploy verification infrastructure should not be mutated
- critique.md: Only Perspectives 1-4 (UX, Visual Hierarchy, Accessibility, Business Alignment) marked OPTIMIZABLE; Awwwards dimension mapping section kept LOCKED alongside scoring calculation and artifact writes
- ideate.md has 3 LOCKED + 2 OPTIMIZABLE regions: init→LOCKED, diverge→OPTIMIZABLE, recommend-checkpoint→LOCKED, converge-scoring→OPTIMIZABLE, artifact-writes→LOCKED

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- 8 pre-existing test failures in Nyquist suite (TOOL_MAP bridge tests, manifest fields, v0.11 wiring) — confirmed pre-existing by stash test before/after comparison, zero new failures introduced

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All 14 experiment-eligible workflows now have section-level LOCKED/OPTIMIZABLE markers
- Phase 100 (experiment.cjs) can now implement the section-level parser that reads these markers at experiment runtime
- experiment-boundaries.md (Phase 99 Plan 01) defines the file-level protection; this plan adds the section-level protection — both layers are now in place

---
*Phase: 99-safety-boundaries*
*Completed: 2026-03-23*
