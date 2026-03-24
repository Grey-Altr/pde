# Phase 122: Divergence Detection - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Build a 3-tier handoff-vs-code drift detection system: T1 structural (glob-based file existence), T2 content (regex-based prop/type comparison), T3 behavioral (grep-based token usage). Output DIVERGENCE.md with per-component status. Add /pde:check-divergence command and .pde-divergence-ignore suppression file.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from project state:
- Divergence detection starts heuristic (regex/glob) not AST — T3 behavioral via grep
- Zero npm deps at plugin root — all detectors as CJS modules in bin/lib/
- Handoff specs at .planning/design/handoff/HND-handoff-spec-*.md contain component APIs
- @file annotations from Phase 120 (@component:, @props:, @tokens:) provide extraction targets
- /pde:check-divergence command follows existing skill command pattern

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- bin/lib/artifact-format.cjs — @file annotation generation, framework detection
- bin/lib/core.cjs — safeReadFile, output, error utilities
- templates/handoff-spec.md — handoff output structure with component APIs
- workflows/handoff.md — handoff pipeline producing the specs to compare against

### Established Patterns
- CJS modules in bin/lib/ with no npm dependencies
- Command files in commands/ directory (markdown skill format)
- Workflow files in workflows/ directory
- Test files in tests/phase-{N}/ using node:test

### Integration Points
- Handoff specs contain @component:/@props:/@tokens: annotations (Phase 120)
- package.json for framework detection (Phase 120 detectFramework)
- .pde-divergence-ignore at project root for suppression

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
