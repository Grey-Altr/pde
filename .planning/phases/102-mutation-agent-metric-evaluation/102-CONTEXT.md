# Phase 102: Mutation Agent & Metric Evaluation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

An experiment runner agent can apply one atomic change per iteration, evaluate a deterministic metric, and return a structured result — while consuming the minimum possible tokens.

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
- `bin/lib/experiment-schema.cjs` — schema parsing, JSONL_ROW_FIELDS contract, ensureExperimentDirs
- `references/experiment-boundaries.md` — boundary definitions with protected files
- `agents/` — existing agent definitions (9 agents)

### Established Patterns
- Agent definitions as .md files in agents/ with YAML frontmatter
- Structured JSON output from agent tools
- spawnSync for subprocess execution
- JSONL_ROW_FIELDS schema for results.jsonl rows

### Integration Points
- New agent at agents/pde-experiment-runner.md
- Consumes experiment.md schema from Phase 101
- Uses experiment.cjs for git operations (commit, reset)
- Writes results.jsonl rows matching JSONL_ROW_FIELDS schema
- Generates REPORT.md with token cost summary

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
