# Phase 101: Experiment Schema & State Directory - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The experiment file format, state directory structure, config defaults, and experiment phase type are fully defined so that an operator can declare an experiment and know exactly where results will appear.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/experiment.cjs` — Phase 100 git state machine (289 lines)
- `bin/lib/core.cjs` — execGit, output, error utilities
- `bin/pde-tools.cjs` — CLI dispatch with experiment subcommands
- `.planning/config.json` — existing config structure
- `references/experiment-boundaries.md` — boundary definitions

### Established Patterns
- CJS modules in bin/lib/ with structured JSON output
- YAML frontmatter parsing for experiment-boundaries.md
- config.json for workflow settings
- ensure-dirs pattern for directory creation

### Integration Points
- experiment.md schema consumed by Phase 102 mutation agent
- State directory structure at .planning/experiments/{slug}/
- config.json experiment_defaults block
- ROADMAP.md experiment phase type recognition

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
