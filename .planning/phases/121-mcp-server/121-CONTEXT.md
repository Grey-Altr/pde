# Phase 121: MCP Server - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Build a standalone MCP server package in an isolated subdirectory with its own package.json, @modelcontextprotocol/sdk dependency, TypeScript compilation, and stdio transport. Expose exactly 10 read-only tools for querying PDE state, plus a pipeline resource for ambient editor consumption. Distributable via npx.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from project state:
- MCP server isolated in subdirectory to preserve zero-npm-dependency constraint at plugin root
- Read-only MCP contract enforced from design phase — no write tools to avoid second write path
- 10 tools: get-project, get-design-state, get-manifest, get-tokens, get-handoff, get-artifact, get-roadmap, get-requirements, get-pipeline-status, list-artifacts
- get-tokens serves Tailwind v4 @theme format via DTCG-to-Tailwind conversion (Phase 120 artifact-format.cjs)
- Pipeline status exposed as MCP resource (passive context)
- npx distribution via package.json bin field
- stdio transport (standard for local MCP servers)
- MCP SDK v1.x (v2 deferred to v0.16 if it ships)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- bin/lib/artifact-format.cjs — DTCG-to-Tailwind conversion for get-tokens tool
- bin/lib/core.cjs — safeReadFile, output, error utilities
- bin/lib/context-sync.cjs — IR builder reads .planning/ artifacts (reusable for MCP tools)
- .planning/design/design-manifest.json — artifact registry
- .planning/design/DESIGN-STATE.md — pipeline stage tracking

### Established Patterns
- MCP infrastructure from v0.9 (Stitch integration): TOOL_MAP, probe/degrade contracts
- bin/lib/mcp-bridge.cjs — MCP client patterns (this phase builds a server, not client)
- pde-tools.cjs — CLI tool pattern for reading project state

### Integration Points
- MCP server reads same .planning/ directory as pde-tools.cjs
- get-tokens tool reuses generateTailwindTheme() from artifact-format.cjs
- Pipeline resource reads DESIGN-STATE.md and design-manifest.json

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
