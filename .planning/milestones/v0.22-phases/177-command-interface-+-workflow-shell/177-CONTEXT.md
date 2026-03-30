# Phase 177: Command Interface + Workflow Shell - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous — command/workflow phase with constrained choices)

<domain>
## Phase Boundary

Wire the `/pde:present` skill command with persona listing, dispatch routing, and workflow file. Users invoke `/pde:present [persona]` to generate a presentation or `/pde:present` alone to list all 15 available personas. Unknown personas get a clear error with valid names. The workflow reads from the Phase 176 IR (not raw .planning/ files) and passes structured data to the LLM for narration.

</domain>

<decisions>
## Implementation Decisions

### Command Structure
- Command name is `/pde:present` (locked by ROADMAP)
- Argument is persona slug (e.g., `executive-summary`, `case-study`)
- No argument = list all personas with descriptions
- Invalid argument = error message + valid persona list

### Persona Registry
- 15 personas total (locked by ROADMAP: CLU-01 through portfolio-overview)
- Each persona has: slug, display name, one-line description, audience
- Registry is a static data structure (not generated at runtime)

### Workflow Architecture
- Workflow file at workflows/present.md (follows existing PDE skill pattern)
- Skill SKILL.md file with metadata for /pde:present command
- Workflow reads IR from `pde-tools presentation artifact-read` (Phase 176)
- Workflow passes IR + persona config to LLM for narration
- Output written to .planning/presentations/[persona]-[date].html and .md

### Claude's Discretion
- Persona registry data format (JSON, JS object, inline in workflow)
- Workflow file structure and step organization
- Error message formatting
- Whether persona listing uses a table, list, or other format

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
