---
phase: 31-skill-builder
plan: "02"
subsystem: skill-builder
tags: [workflow, command, validate-skill, pde-skill-builder, pde-design-quality-evaluator, tooling]

requires:
  - phase: 31-01
    provides: pde-skill-builder agent, pde-design-quality-evaluator agent, skill-quality-rubric, 6 Nyquist test scripts

provides:
  - commands/improve.md — thin command wrapper for /pde:improve
  - workflows/improve.md — three-mode orchestrator (create, improve, eval) with validation gating

affects: [phases/32-design-elevation, skill creation workflows, all future PDE skill development]

tech-stack:
  added: [commands/improve.md, workflows/improve.md]
  patterns: [three-mode workflow dispatch, generate-validate-retry loop (MAX_CYCLES=3), additive-vs-rewrite improve mode, protected-files enforcement before writes]

key-files:
  created:
    - commands/improve.md
    - workflows/improve.md
  modified: []

key-decisions:
  - "workflows/improve.md is a skill workflow file with <skill_code>IMP</skill_code> and all 7 anatomy sections — not a command file — so it passes pde-tools validate-skill"
  - "commands/improve.md is a thin wrapper without skill anatomy sections; validate-skill is not run against it (command files are not skill files)"

patterns-established:
  - "Three-mode workflow dispatch: parse first positional argument, branch to mode-specific step sequences"
  - "Generate-validate-retry loop: spawn agent, gate through validate-skill --raw, retry with errors in context (max 3 cycles)"
  - "Additive improve default: agent returns {additions, replacements} JSON; workflow applies via Edit tool without full file replacement"

requirements-completed: [SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06]

duration: 1min
completed: 2026-03-18
---

# Phase 31 Plan 02: Skill Builder Command and Workflow Summary

**Three-mode /pde:improve command with generate-validate-retry loop: creates new skills via pde-skill-builder agent, improves existing skills additively or via --rewrite, evaluates quality via pde-design-quality-evaluator — all gated through validate-skill before presenting output**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-18T02:05:54Z
- **Completed:** 2026-03-18T02:07:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `commands/improve.md` — thin command wrapper with `name: pde:improve`, all three modes in `argument-hint`, Task in `allowed-tools`, delegating to `@workflows/improve.md`
- Created `workflows/improve.md` — three-mode orchestrator that passes `pde-tools validate-skill --raw` (valid: true, no errors, no warnings); contains all 7 anatomy sections (`<purpose>`, `<required_reading>`, `<flags>`, `<process>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`)
- All 6 Nyquist tests pass green (37/37 checks across SKILL-01 through SKILL-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create commands/improve.md command file** - `17e2e9d` (feat)
2. **Task 2: Create workflows/improve.md three-mode orchestrator** - `c95a564` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `commands/improve.md` — Thin command wrapper for /pde:improve; frontmatter + process delegation to @workflows/improve.md
- `workflows/improve.md` — Three-mode orchestrator workflow; validate-skill gated; passes pde-tools validate-skill validation; IMP skill code registered

## Decisions Made

- `workflows/improve.md` is the skill file (has `<skill_code>IMP</skill_code>`) while `commands/improve.md` is a thin command wrapper without skill anatomy sections. This distinction is required: validate-skill skips files in `workflows/` that lack `<skill_code>`, and files with `<skill_code>` get full LINT validation. The plan required workflows/improve.md to pass validate-skill, which it does.
- Validation gate uses `|| true` after pde-tools call per research guidance (Pitfall 2: non-zero exit still outputs JSON via --raw, must not swallow it)

## Deviations from Plan

None — plan executed exactly as written. The exact content for both files was specified in the plan and implemented precisely.

## Issues Encountered

None. validate-skill returned `valid: true` on first attempt with no errors or warnings. All 6 Nyquist tests passed on first run.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 31 is complete: /pde:improve command fully operational with all three modes
- Phase 32 (Design Elevation — System Skill) can begin: depends on Phase 29 references and Phase 30 audit baseline, both available
- `workflows/improve.md` is listed as protected in `protected-files.json` — agents cannot modify it at runtime (enforced by prompt instructions)

---
*Phase: 31-skill-builder*
*Completed: 2026-03-18*

## Self-Check: PASSED

- FOUND: commands/improve.md
- FOUND: workflows/improve.md
- FOUND: .planning/phases/31-skill-builder/31-02-SUMMARY.md
- FOUND: commit 17e2e9d (Task 1 — commands/improve.md)
- FOUND: commit c95a564 (Task 2 — workflows/improve.md)
