# Phase 99: Safety Boundaries - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

All experiment-eligible workflow files have machine-enforceable locked and optimizable zone markers, and a canonical reference defines what is permanently immutable vs what can be modified.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- 76 workflow files in workflows/
- 43 reference files in references/
- 9 agent definitions in agents/

### Established Patterns
- Markdown-based workflow definitions with HTML comment annotations
- Reference files as standalone .md documents in references/
- Phase artifacts follow {padded}-{name} naming convention

### Integration Points
- New reference file at references/experiment-boundaries.md
- HTML comment markers (<!-- LOCKED -->, <!-- OPTIMIZABLE -->) in workflow files
- Mutable file list validation will be consumed by future experiment runner (Phase 102)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
