# Phase 107: Nyquist Coverage - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The experiment infrastructure has structural regression tests that verify safety constraints fire correctly, and existing PDE workflows are confirmed unaffected when no experiment is active.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- tests/ directory with 1154+ passing tests across phases 99-106
- bin/lib/experiment.cjs — git state machine (289 lines)
- bin/lib/experiment-runner.cjs — iteration helpers (197 lines)
- bin/lib/experiment-report.cjs — report generation (279 lines)
- bin/lib/experiment-schema.cjs — schema parsing (190 lines)
- All existing Nyquist test patterns

### Established Patterns
- node:test framework with describe/test/assert
- Temp repo creation with fs.mkdtempSync for git tests
- Structural tests grep-checking file content

### Integration Points
- New Nyquist assertions for experiment infrastructure
- Full regression suite verification
- Safety constraint verification tests

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
