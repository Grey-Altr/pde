---
phase: 163-cli-ingestion-capability-model
plan: "03"
subsystem: cli-anything
tags: [graphql, mcp, parser, introspection, capability-model]
dependency_graph:
  requires: ["163-01"]
  provides: ["graphql-parser", "mcp-parser"]
  affects: ["163-05", "163-06"]
tech_stack:
  added: []
  patterns:
    - "GraphQL introspection via HTTP POST with stdlib fetch"
    - "MCP SDK Client + StdioClientTransport via absolute path require"
    - "TDD: RED commit then GREEN commit per parser"
    - "Unit-testable parseMCPToolsList/parseIntrospectionResult without spawning processes"
key_files:
  created:
    - bin/lib/cli-anything/parsers/graphql.cjs
    - bin/lib/cli-anything/parsers/mcp.cjs
  modified:
    - tests/phase-163/graphql-parser.test.mjs
    - tests/phase-163/mcp-parser.test.mjs
decisions:
  - "GraphQL parser exposes parseIntrospectionResult separately for unit testing without fetch"
  - "MCP parser exposes parseMCPToolsList separately for unit testing without spawning processes"
  - "MCP SDK loaded via absolute path to packages/pde-mcp-server/node_modules to avoid MODULE_NOT_FOUND"
  - "transport.close() wrapped in finally block to prevent child process leaks"
metrics:
  duration_seconds: 221
  completed_date: "2026-03-29T01:05:00Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 163 Plan 03: GraphQL + MCP Parsers Summary

**One-liner:** GraphQL HTTP introspection parser mapping Query/Mutation fields to capabilities, plus MCP StdioClientTransport parser using @modelcontextprotocol/sdk via absolute path require — 26 tests green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | GraphQL parser - failing tests | 12cb45f | tests/phase-163/graphql-parser.test.mjs |
| 1 (GREEN) | GraphQL introspection parser | 65b9af4 | bin/lib/cli-anything/parsers/graphql.cjs |
| 2 (RED) | MCP parser - failing tests | 3bb9f6a | tests/phase-163/mcp-parser.test.mjs |
| 2 (GREEN) | MCP parser implementation | 3e444ec | bin/lib/cli-anything/parsers/mcp.cjs |

## What Was Built

### GraphQL Parser (`bin/lib/cli-anything/parsers/graphql.cjs`)

Converts GraphQL introspection responses or SDL files into flat capability arrays:

- `INTROSPECTION_QUERY` — standard GraphQL introspection query string
- `parseIntrospectionResult(data)` — takes `data.__schema`, filters to root Query/Mutation types, maps fields to capabilities
- `argsToJsonSchema(args)` — converts GraphQL arg descriptors to JSON Schema properties
- `gqlTypeToJsonSchema(gqlType)` — handles LIST (array), OBJECT (object), SCALAR (string/number/boolean)
- `parse(source, content)` — HTTP URL: POST introspection query via fetch; .graphql file: regex SDL extraction fallback

Key behaviors:
- Only root Query and Mutation fields become capabilities (User type fields excluded)
- `extensions.parentType` set to 'Query' or 'Mutation' per capability
- `method: null, path: null` for all GraphQL capabilities (not HTTP REST)

### MCP Parser (`bin/lib/cli-anything/parsers/mcp.cjs`)

Introspects MCP servers via StdioClientTransport:

- `parseMCPToolsList(tools, transport)` — maps tools/list response to capabilities; pure function for unit testing
- `parse(source, _content)` — strips `mcp://` prefix, splits command+args, connects via StdioClientTransport, calls `client.listTools()`, always closes transport in `finally` block

Key behaviors:
- SDK loaded from `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs` absolute path
- `transport.close()` in finally block prevents orphaned child processes
- `outputSchema: null` for all MCP capabilities
- `extensions.transport: 'stdio'` by default

## Test Coverage

All 26 tests pass across both files:

- `tests/phase-163/graphql-parser.test.mjs`: 14 tests
  - 3-capability introspection fixture (user, users, createUser)
  - inputSchema from args (id, name, email)
  - extensions.parentType per capability
  - User non-root type exclusion
  - CapabilitySchema.safeParse validation
  - fetch mock for parse() HTTP behavior
  - argsToJsonSchema and gqlTypeToJsonSchema unit tests

- `tests/phase-163/mcp-parser.test.mjs`: 12 tests
  - 2-capability tools fixture (get_design_state, list_artifacts)
  - inputSchema properties and required fields
  - extensions.transport default and custom values
  - CapabilitySchema.safeParse validation
  - Edge cases: empty array, tool with no inputSchema

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - both parsers produce complete, validated capability objects.

## Self-Check: PASSED

Files exist:
- FOUND: bin/lib/cli-anything/parsers/graphql.cjs
- FOUND: bin/lib/cli-anything/parsers/mcp.cjs

Commits exist:
- 12cb45f: test(163-03): add failing tests for GraphQL introspection parser
- 65b9af4: feat(163-03): implement GraphQL introspection parser
- 3bb9f6a: test(163-03): add failing tests for MCP parser
- 3e444ec: feat(163-03): implement MCP parser with StdioClientTransport
