# Phase 105: Researcher Empirical Mode - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The research agent can validate hypotheses by trying them against a metric rather than only doing desk research — producing richer RESEARCH.md artifacts for optimization-focused phases.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agents/pde-phase-researcher.md` — existing research agent definition
- `workflows/research-phase.md` — research orchestration workflow (if exists)
- `bin/lib/experiment-runner.cjs` — iteration helpers for metric evaluation
- `bin/lib/experiment-schema.cjs` — experiment schema parsing
- `templates/experiment.md` — experiment file template

### Established Patterns
- Agent definitions with YAML frontmatter in agents/
- Workflow orchestration in workflows/
- Structured RESEARCH.md output format

### Integration Points
- Extend pde-phase-researcher agent with --empirical flag
- Auto-detect empirical mode from CONTEXT.md/ROADMAP keywords
- New "Experiments Attempted" section in RESEARCH.md output

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
