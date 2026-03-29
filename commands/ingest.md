---
name: pde:ingest
description: Ingest any API spec or MCP server into a unified capability model with AI SDK tool definitions
argument-hint: "<spec-path-or-url> (OpenAPI JSON, JSON Schema, GraphQL endpoint/file, mcp://command)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Execute the /pde:ingest command. Ingest an API specification or MCP server and produce:

1. `.planning/cli-anything/{slug}/capability-model.json` — unified capability model containing all operations/tools from the spec
2. `.planning/cli-anything/{slug}/tools.ts` — AI SDK `tool()` exports with Zod inputSchema for every capability

Supported spec types:
- **OpenAPI JSON** — local file (`.json` with `openapi` or `swagger` key) or remote URL
- **JSON Schema** — local file (`.json` with `$schema`, `type`, or `properties` key)
- **GraphQL** — introspection via HTTP endpoint, or local `.graphql`/`.gql` file
- **MCP server** — `mcp://command` URI (runs the command via stdio transport and calls `tools/list`)
</objective>

<process>
Run:

```
node bin/pde-tools.cjs cli-anything ingest $ARGUMENTS
```

On success: report the output files written (capability-model.json path, tools.ts path) and the number of capabilities ingested.

On failure: diagnose the error — check that the spec path exists, the spec is valid JSON, and the spec type was detected correctly. Suggest fixes.
</process>
