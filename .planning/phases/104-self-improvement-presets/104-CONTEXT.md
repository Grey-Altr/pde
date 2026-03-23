# Phase 104: Self-Improvement Presets - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Users can invoke PDE self-optimization with a single flag — the system auto-discovers eligible files, applies the correct eval harness, and produces an improvement or reports no gain.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `commands/optimize.md` — /pde:optimize command (Phase 103)
- `workflows/optimize.md` — 9-step experiment orchestrator
- `bin/lib/experiment-schema.cjs` — parseExperimentFile, EXPERIMENT_DEFAULTS
- `references/experiment-boundaries.md` — lists experiment-eligible workflows with OPTIMIZABLE markers
- `templates/experiment.md` — experiment file template

### Established Patterns
- Experiment .md schema with YAML frontmatter
- OPTIMIZABLE/LOCKED section markers in workflows
- Nyquist test suite as regression guard (node --test tests/)
- pde-tools experiment subcommands

### Integration Points
- Extend /pde:optimize with --self and --skill flags
- Auto-discover OPTIMIZABLE files from experiment-boundaries.md
- Generate experiment.md on-the-fly from preset configurations
- Use Nyquist pass count as eval metric for self-improvement

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
