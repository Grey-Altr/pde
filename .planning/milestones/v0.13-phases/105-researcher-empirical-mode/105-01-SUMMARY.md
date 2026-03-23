---
phase: 105-researcher-empirical-mode
plan: 01
subsystem: researcher-agent
one_liner: "pde-phase-researcher gains --empirical flag for candidate generation mode with keyword-based auto-routing in research-phase.md"
tags: [researcher, empirical-mode, optimization, candidate-generation, rsrch-01, rsrch-02, rsrch-03]
dependency_graph:
  requires:
    - 103-orchestrator-command-circuit-breakers (optimize.md workflow that consumes try_candidates)
    - 104-self-improvement-presets (preset infrastructure that empirical researcher feeds into)
  provides:
    - pde-phase-researcher empirical mode (RSRCH-01)
    - research-phase.md keyword routing (RSRCH-02)
    - Experiments Attempted RESEARCH.md section template (RSRCH-03)
  affects:
    - workflows/research-phase.md (modified — empirical routing added)
    - agents/pde-phase-researcher.md (new — full agent definition)
tech_stack:
  added:
    - agents/pde-phase-researcher.md (new agent definition file)
  patterns:
    - additive agent flag pattern (--empirical extends standard behavior without replacing it)
    - keyword-based routing (2+ keyword threshold prevents over-triggering)
    - structured JSON return for empirical mode (try_candidates consumed by orchestrator)
key_files:
  created:
    - agents/pde-phase-researcher.md
    - tests/phase-105/researcher-empirical-mode.test.mjs
    - .planning/phases/105-researcher-empirical-mode/105-01-PLAN.md
  modified:
    - workflows/research-phase.md
decisions:
  - "Empirical mode is additive, not replacing: researcher always produces standard RESEARCH.md; --empirical adds try_candidates on top"
  - "2-keyword threshold for auto-routing: prevents over-triggering on phases that mention optimization tangentially"
  - "Keyword list is inclusive: optimize/experiment/empirical/autoresearch/benchmark/metric/iteration-budget/self-improvement — covers all v0.13 experiment-related vocabulary"
  - "Experiments Attempted section is a placeholder: researcher writes headers, optimize workflow fills outcomes after running candidates"
  - "try_candidates returns as JSON code block at end of response: consistent with pde-experiment-runner.md return format pattern"
metrics:
  duration: "8 minutes"
  completed: "2026-03-23"
  tasks_completed: 1
  files_created: 3
  files_modified: 1
  tests_added: 22
  tests_passing: 22
---

# Phase 105 Plan 01: Researcher Empirical Mode Summary

## What Was Built

pde-phase-researcher gains `--empirical` flag for candidate generation mode alongside keyword-based auto-routing in research-phase.md that activates empirical mode when optimization/experiment context is detected.

### agents/pde-phase-researcher.md (NEW)

New agent definition for the `pde-phase-researcher` subagent type. Prior to this phase, the agent was referenced throughout the codebase (model-profiles.cjs, workflows, templates) but had no `agents/` file defining its behavior.

The file defines:
- **Standard mode**: desk research producing RESEARCH.md with architecture analysis and integration points
- **Empirical mode** (`--empirical`): standard mode PLUS a `try_candidates` list of specific, bounded mutations to test in the experiment loop
- **try_candidates structure**: each candidate has `id`, `description`, `mutable_files`, `change_summary`, `expected_delta`, `confidence` (HIGH/MEDIUM/LOW)
- **Experiments Attempted placeholder**: written into RESEARCH.md for the optimize workflow to populate after running candidates
- **Empirical return format**: JSON code block with `status: "RESEARCH_COMPLETE"`, `mode: "empirical"`, `try_candidates` array

### workflows/research-phase.md (MODIFIED)

Added Step 2.5 (Detect Empirical Mode) between Step 2 (Check Existing Research) and Step 3 (Gather Phase Context):

- Reads CONTEXT.md + ROADMAP phase goal for optimization keywords
- Keyword list: optimize, optimization, experiment, experimentation, empirical, autoresearch, auto-research, benchmark, benchmarking, metric, metrics, iteration budget, iteration loop, self-improvement, self-optimize
- Requires 2+ keyword matches to activate (prevents over-triggering)
- Sets `EMPIRICAL_MODE=true/false`

Modified Step 4 (Spawn Researcher):
- Conditionally adds empirical mode instructions to Task() prompt when `EMPIRICAL_MODE=true`
- Instructions require researcher to produce try_candidates list and Experiments Attempted placeholder

Modified Step 5 (Handle Return):
- Added empirical mode return handling: parse JSON block, extract try_candidates, display candidate count
- Offers "Run experiment loop with these candidates / Review candidates / Done"

### tests/phase-105/researcher-empirical-mode.test.mjs (NEW)

22 structural tests across 3 describe blocks:
- RSRCH-01 (9 tests): pde-phase-researcher.md has --empirical, try_candidates, Experiments Attempted, RESEARCH_COMPLETE, mutable_files, confidence, additive description
- RSRCH-02 (11 tests): research-phase.md has empirical routing, keyword triggers (optimize/experiment/benchmark/metric), --empirical pass-through, 2+ threshold, CONTEXT.md reading
- Integration (2 tests): both files reference try_candidates and Experiments Attempted consistently

All 22 tests pass.

## Deviations from Plan

None — plan executed exactly as written.

Note: The pre-existing 8 Nyquist test failures are from earlier phases (v0.5 MCP bridge tests, v0.11 wiring issues) and predate Phase 105. Phase 105 actually reduced the failure count from 19 to 8 because creating `agents/pde-phase-researcher.md` satisfied assertions from other tests that checked for the file's existence.

## Self-Check: PASSED

- [x] agents/pde-phase-researcher.md exists at expected path
- [x] workflows/research-phase.md contains empirical routing
- [x] tests/phase-105/researcher-empirical-mode.test.mjs exists
- [x] All 22 phase-105 tests pass
- [x] Commit 099734f exists in git log
