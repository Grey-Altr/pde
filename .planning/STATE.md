---
gsd_state_version: 1.0
milestone: v0.13
milestone_name: AutoResearch
status: Phase complete — ready for verification
stopped_at: Completed 105-01-PLAN.md
last_updated: "2026-03-23T13:12:00Z"
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 11
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** Phase 105 — Researcher Empirical Mode (complete)

## Current Position

Phase: 105 (Researcher Empirical Mode) — COMPLETE
Plan: 1 of 1

## Performance Metrics

**Prior milestone reference:**

- v0.12: 15 phases, 24 plans, 141 commits, 235/235 Nyquist GREEN
- v0.11: 10 phases, 19 plans, 116 commits (~15 hours)
- v0.10: 4 phases, 8 plans, 56 commits (~4 hours)

**By Phase:** (none yet — v0.13 starting)

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

## Accumulated Context

| Phase 99 P01 | 8 | 2 tasks | 2 files |
| Phase 99 P02 | 35 | 2 tasks | 14 files |
| Phase 100 P01 | 15 | 1 tasks | 2 files |
| Phase 100 P02 | 12min | 1 tasks | 2 files |
| Phase 101 P02 | 58 | 1 tasks | 1 files |
| Phase 101-experiment-schema-state-directory P01 | 15 | 2 tasks | 7 files |
| Phase 102 P01 | 7min | 1 tasks | 7 files |
| Phase 102 P02 | 35 | 2 tasks | 7 files |
| Phase 103 P01 | 18min | 2 tasks | 6 files |
| Phase 103 P02 | 25 | 2 tasks | 9 files |
| Phase 105 P01 | 8min | 1 tasks | 4 files |

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting v0.13 planning:

- Branch isolation chosen over git worktrees — Claude Code has confirmed /ide worktree bug (March 2026); branch isolation provides equivalent safety
- Circuit breakers ship with the orchestrator (Phase 103), not deferred — PITFALLS research is unambiguous that all 7 critical pitfalls require prevention before first experiment run
- Token efficiency (Haiku-first, diff-based context, token tracking) bundled into Phase 102 runner, not a separate phase — these are execution properties of the runner, not a distinct feature
- Researcher empirical mode is HIGH complexity and placed late (Phase 105) — depends on stable loop from Phase 103 and preset infrastructure from Phase 104
- Self-improvement preset ships before researcher mode (Phase 104) — primary use case must be usable before the more complex research augmentation is added
- File naming: experiment.md (lowercase) — user-authored config files follow lowercase convention (consistent with program.md in Karpathy pattern); agent-produced outputs are uppercase (EXPERIMENT-BEST.json, REPORT.md)
- 300-line ceiling enforced on experiment.cjs — scope creep prevention per PITFALLS research; if a feature requires exceeding this, it goes through a separate phase
- [Phase 99]: experiment-boundaries.md is self-protecting — listed in its own protected_files so no agent/experiment can remove boundary definition
- [Phase 99]: Default policy is LOCKED (not OPTIMIZABLE) for unannotated files — prevents silent full-optimization
- [Phase 99]: protected_files in experiment-boundaries.md is superset of protected-files.json — two independent protection layers
- [Phase 99]: LOCKED/OPTIMIZABLE markers at section level (not file level) — interleaved patterns supported for multi-step flows like ideate.md
- [Phase 99]: deploy.md Step 3 (scaffold guidance) is OPTIMIZABLE; Step 4 (Vercel deployment verification) is LOCKED — deploy verification is infrastructure not prose
- [Phase 100]: Force checkout (-f) in _promote/_cleanup: EXPERIMENT-BEST.json has post-commit unstaged changes; reading state before branch switch makes -f safe with no data loss
- [Phase 100]: Underscore helpers pattern for testability: cmd* wrappers call output()/error() causing process.exit; _* helpers return result objects — tests call _* directly
- [Phase 100]: Slug-missing check fires before subcommand routing — produces unified error listing all 6 available subcommands for both missing and unknown subcommand cases
- [Phase 101]: CMD-03 is a format convention document — four ROADMAP fields (Type, Target Metric, Search Space, Iteration Budget) recognized by field presence, not parser code changes
- [Phase 101]: experiment-schema.cjs as NEW module (not extending experiment.cjs) — 300-line ceiling enforcement per PITFALLS research
- [Phase 101]: JSONL_ROW_FIELDS as Object.freeze() constant — Phase 102 imports rather than hardcodes field names (EXEC-05 contract)
- [Phase 101]: extractFrontmatter from frontmatter.cjs for experiment.md parsing (not parseFrontmatter in experiment.cjs which is experiment-boundaries.md-specific)
- [Phase 102]: git diff --name-only HEAD detects staged+unstaged changes vs HEAD; tests stage files (not commit) for pre-commit boundary check simulation
- [Phase 102]: timeout detection in _evalMetric uses proc.signal check (SIGTERM/SIGKILL) first, falls back to proc.error.code === ETIMEDOUT
- [Phase 102]: import output from core.cjs in pde-tools.cjs -- only error was imported; new runner subcommands call output() directly
- [Phase 102]: Read EXPERIMENT-BEST.json directly (JSON.parse) in eval-metric dispatch -- readBest is not exported from experiment.cjs
- [Phase 102]: shell:true in spawnSync for _evalMetric -- real verify commands need shell features; whitespace-split breaks quoted args
- [Phase 102]: git status --porcelain for _checkModifiedFiles -- detects untracked new files that git diff misses
- [Phase 103]: estimateCost returns raw token count not dollar cost — orchestrator applies model-specific pricing
- [Phase 103]: cost_estimate circuit breaker deferred to orchestrator (Phase 103-02) — runtime token tracking not yet available; _estimateCost serves as planning-time utility
- [Phase 103]: Plan 01 executed as prerequisite in same session as Plan 02 — experiment-report.cjs, pde-experiment-runner-sonnet.md, and pde-tools subcommands created before Plan 02 artifacts
- [Phase 103]: Config merge pattern: experiment.md overrides only iteration/time budgets; consecutive_failure_limit, no_progress_limit, cost_estimate_enabled are always read from config.json (global safety policy)
- [Phase 103]: consecutiveViolations tracked separately from consecutiveFailures — violations drive model escalation; consecutiveFailures drives BREAK-03; distinct failure dimensions
- [Phase 105]: Empirical mode is additive (researcher always produces RESEARCH.md; --empirical adds try_candidates on top)
- [Phase 105]: 2-keyword threshold for auto-routing prevents over-triggering on phases that mention optimization tangentially
- [Phase 105]: Experiments Attempted section is a placeholder written by researcher; optimize workflow fills outcomes after running candidates

### Pending Todos

- Run /pde:connect stitch --confirm with valid STITCH_API_KEY to execute MCP-05 live tool name gate and update TOOL_MAP markers to TOOL_MAP_VERIFIED

### Blockers/Concerns

- Phase 101 (Experiment Schema): File naming inconsistency between STACK.md (lowercase) and ARCHITECTURE.md (uppercase) must be resolved before schema is finalized — decision logged above (lowercase for user-authored, uppercase for agent-produced)
- Phase 102 (Metric Evaluation): Trimmed Nyquist subset composition (15-30 assertions per iteration vs full 235) not yet defined — address in Phase 102 planning when verify command is specified
- Phase 107 (Nyquist): Metric extraction reliability from `node --test tests/nyquist/` output format must be validated against actual runner output before test harness is authored

## Session Continuity

Last session: 2026-03-23T13:12:00Z
Stopped at: Completed 105-01-PLAN.md
Resume file: None

Next action: /pde:execute-phase 106
