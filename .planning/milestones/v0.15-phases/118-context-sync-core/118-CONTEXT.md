# Phase 118: Context Sync Core - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Build the intermediate representation (IR) builder that reads .planning/ artifacts and editor-specific emitters that produce AGENTS.md, .cursor/rules/*.mdc, legacy .cursorrules, and hierarchical GEMINI.md files — all with SHA-256 source hash freshness markers.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from research:
- Cursor .mdc format: YAML frontmatter with description, globs, alwaysApply fields
- GEMINI.md: hierarchical loading from project root + subdirectories, @file.md import syntax
- AGENTS.md: plain markdown, cross-tool baseline (Cursor, Antigravity, Gemini CLI)
- Legacy .cursorrules: single file at project root for backwards compat
- Zero npm deps at plugin root — all generators as CJS modules in bin/lib/
- Hash-based freshness: SHA-256 of source .planning/ files embedded in generated output

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- bin/lib/pde-tools.cjs — state management, manifest operations, design coverage reads
- bin/lib/mcp-bridge.cjs — MCP infrastructure patterns, TOOL_MAP, probe/degrade
- .planning/design/design-manifest.json — artifact registry with 21 coverage flags
- .planning/design/DESIGN-STATE.md — pipeline stage tracking

### Established Patterns
- CJS modules in bin/lib/ with no npm dependencies
- File-based state in .planning/ directory
- Atomic commits per logical operation via gsd-tools.cjs commit

### Integration Points
- Context generators read: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, design-manifest.json, DESIGN-STATE.md, SYS-*.json tokens, handoff output
- Output files written to user's project root (AGENTS.md, .cursorrules) and .cursor/rules/*.mdc, GEMINI.md hierarchy

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
