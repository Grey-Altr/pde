# Phase 103: Orchestrator, Command & Circuit Breakers - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The full experiment loop is orchestrated end-to-end — a user can invoke `/pde:optimize`, confirm the cost estimate, and the system iterates automatically with all stopping conditions enforced.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/experiment.cjs` — git state machine (commitCandidate, resetToBaseline, promoteBest)
- `bin/lib/experiment-runner.cjs` — iteration helpers (boundary check, metric eval, diff, JSONL, compare)
- `bin/lib/experiment-schema.cjs` — schema parsing, ensureExperimentDirs, patchExperimentConfig
- `agents/pde-experiment-runner.md` — mutation agent definition
- `references/experiment-phase-type.md` — experiment ROADMAP format
- `templates/experiment.md` — experiment file template

### Established Patterns
- Skill definitions as .md files in skills/
- Workflow orchestration patterns in workflows/
- pde-tools.cjs subcommand dispatch
- Circuit breaker patterns from config.json experiment_defaults

### Integration Points
- New skill at skills/optimize.md (or equivalent)
- New workflow at workflows/optimize.md
- Reads experiment.md, dispatches pde-experiment-runner agent per iteration
- Enforces 5 circuit breakers from config.json experiment_defaults
- Generates REPORT.md after loop completion
- Uses experiment.cjs promoteBest for merge approval

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
