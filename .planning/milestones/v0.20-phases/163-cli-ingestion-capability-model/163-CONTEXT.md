# Phase 163: CLI Ingestion + Capability Model - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the CLI-Anything ingestion layer: a `/pde:ingest` skill command that accepts any API spec (OpenAPI, JSON Schema, GraphQL, MCP) and produces a unified capability model with typed AI SDK tool() definitions. Handles local files, HTTP URLs, and live MCP server introspection. Auto-detects spec type. Outputs to `.planning/cli-anything/{slug}/`.

</domain>

<decisions>
## Implementation Decisions

### Invocation Interface
- `/pde:ingest <spec-path>` skill command — consistent with all other PDE commands
- Auto-detect spec type from file extension + content sniffing (.json→OpenAPI/JSON Schema via presence of `openapi` key, .graphql→GraphQL, mcp://→MCP)
- Accept both local files and HTTP(S) URLs for remote specs, MCP server addresses for MCP introspection
- Output unified capability model to `.planning/cli-anything/{slug}/capability-model.json`

### Capability Model Schema
- Top-level structure: `{ meta: {source, type, version, auth}, capabilities: [{name, description, inputSchema, outputSchema, method, path, extensions}] }` — flat capability array with metadata
- `extensions` object per capability for source-specific data (e.g., GraphQL type info, HTTP method/path) — follows PDE event schema pattern
- `meta.auth` section captures auth schemes from the spec (apiKey, bearer, oauth) so downstream generators can wire auth params
- Validate generated model against a Zod schema before writing — fail fast on malformed output

### Parser Architecture
- One CJS module per spec type in `bin/lib/cli-anything/parsers/` (openapi.cjs, jsonschema.cjs, graphql.cjs, mcp.cjs) — matches existing bin/ CJS convention
- GraphQL: try introspection query on live endpoint first, fall back to .graphql/.gql file parsing (addresses CLI-03 offline concern from STATE.md)
- MCP: use `@modelcontextprotocol/sdk` client to connect via stdio/SSE transport, call `tools/list` — standard MCP protocol
- Large specs (1000+ endpoints): chunk into batches, generate capability model incrementally, warn if >500 capabilities

### AI SDK Tool Generation
- Output `.ts` file with named exports — one `tool()` call per capability, importable by any AI SDK consumer
- Walk JSON Schema tree to emit Zod builder calls (z.object, z.string, z.number, z.array, z.enum) — pure codegen, no runtime dependency on json-schema-to-zod
- Generate stub execute functions with fetch() for REST, GraphQL query for GQL, MCP tool call for MCP — runnable but user-customizable
- Run `tsc --noEmit` on generated .ts files as post-generation type-safety check — fail if TypeScript errors (per success criteria 5)

### Claude's Discretion
No items deferred to Claude's discretion — all grey areas resolved by user.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/pde-tools.cjs` — Central CLI utility with state management, phase operations, git commits, slug generation
- `packages/pde-mcp-server/` — Existing MCP server package with discover.cjs, handlers.cjs, TypeScript src/
- `packages/dispatcher/` — Parallel CLI dispatch with concurrency queue
- Zod already a devDependency in root package.json (v4.3.6)
- Vitest test framework available (v4.1.1)

### Established Patterns
- CJS modules (.cjs) in bin/ and bin/lib/ for CLI tooling
- `pde-tools.cjs` subcommand pattern for tool registration
- `.planning/` directory for all generated artifacts
- JSON output with structured metadata (see event bus NDJSON pattern)
- Skill commands defined in commands/*.md files

### Integration Points
- New `/pde:ingest` command file in commands/
- Parser modules in new `bin/lib/cli-anything/parsers/` directory
- Capability model output in `.planning/cli-anything/{slug}/`
- Generated .ts tool definitions alongside capability model
- Phase 164 consumes capability model for CLI wrapping + publishing

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
