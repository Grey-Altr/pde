# Phase 120: Artifact Formatting - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Add @file annotations to handoff specs for editor extraction, implement DTCG-to-Tailwind v4 @theme conversion alongside existing CSS custom properties, and build framework detection from package.json to generate framework-appropriate component stubs (React + Tailwind default, adapting to Vue/Svelte/Angular when detected).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- Zero npm deps at plugin root — all generators as CJS modules in bin/lib/
- Handoff spec template at templates/handoff-spec.md already has token mapping table
- DTCG tokens stored in .planning/design/tokens/ as SYS-*.json files
- context-sync.cjs (898 lines) houses IR builder + emitter pattern from Phase 118
- Existing handoff.md workflow reads STACK.md for framework detection (Step 2a)
- Phase 118 established CJS module pattern; Phase 119 extended with Antigravity/DESIGN.md emitters

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- bin/lib/context-sync.cjs — IR builder, hash infrastructure, emitter framework
- templates/handoff-spec.md — handoff output template with token mapping table
- workflows/handoff.md — 7-step handoff pipeline reading STACK.md and DTCG tokens
- bin/lib/core.cjs — safeReadFile, output, error utilities
- .planning/design/tokens/ — SYS-colors.json, SYS-typography.json, SYS-spacing.json DTCG token files

### Established Patterns
- CJS modules in bin/lib/ with no npm dependencies
- Emitter pattern: function takes IR, returns string
- DTCG token format: { "$value": "...", "$type": "..." } with OKLCH color values
- Handoff reads STACK.md for framework/TypeScript detection

### Integration Points
- handoff.md Step 3 (component specification) — insert @file annotations
- handoff.md Step 4 (token mappings) — emit Tailwind v4 @theme alongside CSS custom props
- STACK.md framework field — drive component stub generation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
