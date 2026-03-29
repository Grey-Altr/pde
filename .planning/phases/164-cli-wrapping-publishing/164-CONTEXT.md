# Phase 164: CLI Wrapping + Publishing - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the CLI wrapping and publishing layer: `/pde:wrap` command that takes any CLI binary, parses its --help output recursively, generates an MCP server with stdio transport exposing every subcommand as a tool, produces a SKILL.md for agent discovery, and `/pde:publish` command that registers wrapped CLIs in a local JSON-based CLI-Hub registry.

</domain>

<decisions>
## Implementation Decisions

### CLI Wrapping Invocation
- `/pde:wrap <binary-path>` skill command — mirrors `/pde:ingest` pattern
- Regex-based --help parser handling common patterns (GNU-style `--flag`, subcommand trees, usage lines) with fallback to raw text capture
- Generated MCP server written to `.planning/cli-anything/{slug}/server/` alongside the capability model
- Wrapper intercepts stdout, attempts JSON.parse, falls back to `{ stdout, stderr, exitCode }` envelope for structured JSON output

### MCP Server Generation
- Stdio transport (standard MCP, works with Claude Code, Cursor) — simplest, most compatible
- Recursive subcommand discovery: run `<binary> --help`, parse subcommands, then run `<binary> <subcmd> --help` for each (max depth 3)
- Tag each tool with `readOnly: false` by default, user can mark read-only in SKILL.md; generated server includes a `--dry-run` mode that logs commands without executing
- Template-based SKILL.md: extract tool name, description from --help, list all subcommands with args, include example invocations

### CLI-Hub Registry
- JSON file-based registry at `.planning/cli-anything/registry.json` — local-first, no server required
- Registry entry metadata: `{ name, version, description, binary, capabilities_count, skill_path, server_path, published_at }`
- `/pde:publish <slug>` command validates capability model exists, copies server to registry dir, updates registry.json
- `pde-tools.cjs cli-anything list` returns registry entries; SKILL.md files are discoverable by standard agent skill scanning

### Claude's Discretion
No items deferred to Claude's discretion — all grey areas resolved by user.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/cli-anything/model.cjs` — CapabilityModelSchema, validateCapabilityModel (from Phase 163)
- `bin/lib/cli-anything/detect.cjs` — detectSpecType (from Phase 163)
- `bin/lib/cli-anything/ingest.cjs` — cmdIngest, loadSource, slugify (from Phase 163)
- `bin/lib/cli-anything/codegen.cjs` — jsonSchemaToZod, generateToolSource, generateTools (from Phase 163)
- `bin/lib/cli-anything/parsers/` — 4 parsers (openapi, jsonschema, graphql, mcp) (from Phase 163)
- `bin/pde-tools.cjs` — Central CLI with `cli-anything` routing (from Phase 163)
- `@modelcontextprotocol/sdk` — Available in packages/pde-mcp-server/node_modules/
- `packages/pde-mcp-server/` — Existing MCP server implementation as reference

### Established Patterns
- CJS modules (.cjs) in bin/lib/cli-anything/
- pde-tools.cjs subcommand routing pattern
- Skill command files in commands/*.md
- .planning/cli-anything/{slug}/ for per-CLI output

### Integration Points
- New `/pde:wrap` command in commands/wrap.md
- New `/pde:publish` command in commands/publish.md
- New modules: bin/lib/cli-anything/help-parser.cjs, server-gen.cjs, skill-gen.cjs, registry.cjs
- pde-tools.cjs additions: `cli-anything wrap`, `cli-anything publish`, `cli-anything list`
- Phase 163 capability model consumed as input for server generation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decided architecture.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
