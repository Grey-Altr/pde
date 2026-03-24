# Phase 115: Multi-Candidate Experiments - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Experiment iterations can generate and evaluate multiple variants simultaneously, selecting the best one. Extends the existing orchestrator loop from Phase 103 with fork-evaluate-promote semantics.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from ROADMAP:
- MULTI-01 through MULTI-05 requirements
- Must work within existing orchestrator loop (Phase 103)
- Candidate count configurable in experiment.md
- Best candidate promoted via git commit, others discarded
- Default candidate count: 3

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- experiment-schema.cjs (Phase 101) — experiment template validation
- optimize.md (Phase 103) — orchestrator loop with mutation/evaluation cycle
- visual-regression.cjs (Phase 114) — screenshot-based regression detection
- git-state-machine.cjs (Phase 100) — git branch/commit/reset operations

### Established Patterns
- _evalMetric contract: exit 0, stdout = numeric score
- Experiment templates in skills/*/experiment.md
- JSONL history logging for experiment results
- Circuit breakers: consecutive_failure_limit, no_progress_limit

### Integration Points
- optimize.md orchestrator loop — main integration target
- experiment-schema.cjs — needs candidate_count field
- git-state-machine.cjs — fork/promote/discard operations

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
