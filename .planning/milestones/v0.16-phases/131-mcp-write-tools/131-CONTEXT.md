# Phase 131: MCP Write Tools - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The MCP server exposes four validated write tools behind an --enable-writes flag that route all writes through pde-tools.cjs validation and call emitAll() post-write

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pde-mcp-server.cjs` — existing MCP server with read-only tools, Zod schemas, handlers.cjs pattern
- `replaceSectionInFile()` — PROJECT.md section overwrite utility (Phase 129)
- `emitAll()` — re-emission after writes
- `appendConflictLog()` — NDJSON append pattern to reuse for mcp-writes.ndjson

### Established Patterns
- Two-layer: TypeScript factory in src/tools/ + handler in handlers.cjs
- process.argv.includes() for feature flags
- Lazy-load via createRequire for CJS modules
- Zod for input validation schemas

### Integration Points
- --enable-writes flag controls tool registration
- Write tools call replaceSectionInFile() then emitAll()
- Audit log at .planning/logs/mcp-writes.ndjson
- pde_flag_divergence writes to .planning/divergence-flags.json (no emitAll)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
