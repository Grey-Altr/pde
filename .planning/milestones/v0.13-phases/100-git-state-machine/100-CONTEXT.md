# Phase 100: Git State Machine - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

A reliable git state machine exists as a standalone CJS module that can commit experiment candidates, tag best results, and reset to baseline without touching regular planning commits.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/pde-tools.cjs` — existing CLI dispatch (subcommand pattern)
- `bin/lib/` — existing library modules for CJS utilities
- `references/experiment-boundaries.md` — Phase 99 output defining protected files/zones
- `protected-files.json` — protected file registry

### Established Patterns
- CJS modules in bin/lib/ with structured JSON output
- pde-tools.cjs subcommand dispatch pattern
- git operations via execFileSync for safety (no shell injection)

### Integration Points
- New module at bin/lib/experiment.cjs
- New subcommands in pde-tools.cjs: experiment init/commit/reset/promote/status/cleanup
- Reads experiment-boundaries.md for boundary validation (SAFE-04)
- Writes EXPERIMENT-BEST.json for session resumption

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
