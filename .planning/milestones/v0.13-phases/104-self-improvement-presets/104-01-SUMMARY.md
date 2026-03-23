---
phase: 104-self-improvement-presets
plan: 01
subsystem: infra
tags: [experiment, optimization, nyquist, preset, self-improvement, autoResearch]

requires:
  - phase: 103-orchestrator-command-circuit-breakers
    provides: workflows/optimize.md with 9-step loop, --self/--skill flag detection, abort stub in Step 1

provides:
  - bin/nyquist-metric.cjs: Nyquist pass count extraction helper — outputs integer, always exits 0
  - workflows/optimize.md Step 1: full --self preset resolution with OPTIMIZABLE auto-discovery and 14-file mutable list
  - workflows/optimize.md Step 1: full --skill preset resolution with skill name validation and single-file targeting
  - tests/phase-104/: 26 structural tests covering SELF-01, SELF-02, SELF-03

affects:
  - phase-105-researcher-empirical-mode
  - any phase using /pde:optimize --self or /pde:optimize --skill

tech-stack:
  added: []
  patterns:
    - Preset resolution in orchestrator Step 1 — generate experiment.md on-the-fly, fall through to existing loop
    - Nyquist metric extraction via dedicated CJS wrapper script (always exits 0, pass count is the metric)
    - Authorized file list cross-check guards against mis-annotated infrastructure workflows

key-files:
  created:
    - bin/nyquist-metric.cjs
    - tests/phase-104/nyquist-metric.test.mjs
    - tests/phase-104/experiment-self-preset.test.mjs
    - tests/phase-104/experiment-skill-preset.test.mjs
  modified:
    - workflows/optimize.md

key-decisions:
  - "--self generates pde-self-improve experiment targeting all 14 OPTIMIZABLE workflows with nyquist_pass_count metric and direction max"
  - "--skill {name} resolves to single-file experiment targeting workflows/{name}.md as optimization proxy (no skills/ dir needed)"
  - "nyquist-metric.cjs always exits 0 — pass count IS the metric; non-zero exit would CRASH every eval"
  - "Cross-reference OPTIMIZABLE grep output against authorized list from experiment-boundaries.md (Pitfall 2 guard)"
  - "Unknown skill names abort with enumerated list of all 14 valid names"

patterns-established:
  - "Preset experiment.md generation: construct frontmatter in Step 1, write to /tmp/, fall through to existing validation"
  - "Nyquist metric extraction: spawnSync node --test tests/, parse # pass N line, print integer, always process.exit(0)"

requirements-completed: [SELF-01, SELF-02, SELF-03]

duration: 12min
completed: 2026-03-23
---

# Phase 104 Plan 01: Self-Improvement Presets Summary

**nyquist-metric.cjs pass count extraction helper + --self/--skill preset resolution in optimize.md Step 1 replacing the abort stub**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-23T12:25:00Z
- **Completed:** 2026-03-23T12:37:00Z
- **Tasks:** 1
- **Files modified:** 5 (1 created bin script, 3 created tests, 1 modified workflow)

## Accomplishments

- Created `bin/nyquist-metric.cjs`: runs full Nyquist suite, parses `# pass N` from TAP output, prints integer, always exits 0
- Replaced the "Preset mode is not yet implemented" abort stub in `workflows/optimize.md` Step 1 with complete --self and --skill preset resolution logic
- --self preset auto-discovers 14 OPTIMIZABLE workflow files, cross-checks against authorized list from experiment-boundaries.md, generates `/tmp/pde-self-improve-experiment.md`
- --skill preset validates name against 14 known skills, generates `/tmp/pde-skill-{name}-experiment.md` targeting a single workflow file; unknown names abort with clear enumerated error
- Added 26 structural tests across 3 test files covering SELF-01, SELF-02, SELF-03; all pass
- Full Nyquist suite: 1101 pass, 8 pre-existing failures (zero regressions from this work)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create nyquist-metric.cjs and implement --self/--skill preset resolution** - `1623763` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `bin/nyquist-metric.cjs` — Nyquist pass count extraction helper: spawnSync node --test tests/, parse # pass N, print integer, exit 0
- `workflows/optimize.md` — Step 1 expanded: abort stub replaced with full --self and --skill preset resolution branches
- `tests/phase-104/nyquist-metric.test.mjs` — 7 structural tests for bin/nyquist-metric.cjs (shebang, spawnSync, regex, exit 0, fallback)
- `tests/phase-104/experiment-self-preset.test.mjs` — 10 structural tests for --self preset resolution (slug, metric, OPTIMIZABLE discovery, 14 files)
- `tests/phase-104/experiment-skill-preset.test.mjs` — 9 structural tests for --skill preset resolution (validation, error, single-file, pde-skill- slug)

## Decisions Made

- `nyquist-metric.cjs` always exits 0: `_evalMetric` in experiment-runner.cjs treats non-zero exit as CRASH, which would kill every iteration. The pass count number carries the regression signal — a drop in count fires DISCARD, not a crash.
- `--skill {name}` maps to `workflows/{name}.md` as the optimization target: no `skills/` directory exists, but the 14 named workflows are the actual optimization targets. This satisfies SELF-03 while deferring a full skills directory to future milestones.
- Cross-reference OPTIMIZABLE grep output with authorized list: guards against Pitfall 2 (infrastructure workflow mis-annotated with OPTIMIZABLE marker getting included).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 104 complete: `/pde:optimize --self` and `/pde:optimize --skill {name}` are now fully functional preset modes
- `bin/nyquist-metric.cjs` is ready for use as the verify command in any self-improvement experiment
- Phase 105 (researcher empirical mode) can proceed — depends on the stable experiment loop from Phase 103 and preset infrastructure from Phase 104, both now complete

---
*Phase: 104-self-improvement-presets*
*Completed: 2026-03-23*
