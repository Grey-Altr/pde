# Phase 106: Observability & Event Bus - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Experiment progress is visible in real time — the NDJSON event bus carries experiment lifecycle events and the tmux dashboard shows the current iteration, best metric, and budget remaining.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing NDJSON event bus infrastructure (from v0.8 tmux milestone)
- `bin/lib/experiment-runner.cjs` — iteration helpers that produce structured results
- `bin/lib/experiment-report.cjs` — report generation with circuit breaker state
- `workflows/optimize.md` — 9-step orchestrator (event emission points)
- tmux dashboard infrastructure (from prior milestones)

### Established Patterns
- NDJSON event format with type field
- tmux pane management
- Event bus file-based communication

### Integration Points
- Emit 6 event types from workflows/optimize.md at appropriate loop points
- Add experiment pane to tmux dashboard configuration
- Read events from NDJSON bus for real-time display

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
