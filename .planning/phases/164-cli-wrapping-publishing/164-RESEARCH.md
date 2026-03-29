# Phase 164: CLI Wrapping + Publishing - Research

**Researched:** 2026-03-29
**Domain:** CLI --help parsing, MCP server code generation, SKILL.md generation, local JSON registry
**Confidence:** HIGH

## Summary

Phase 164 builds on the Phase 163 infrastructure (capability model, codegen, pde-tools routing) to add a new class of input: live CLI binaries rather than static spec files. The wrapping pipeline has three stages: (1) run `<binary> [subcmd] --help`, parse the output with regex to extract subcommands and flags, produce capabilities; (2) generate a standalone CJS MCP server file (`server.cjs`) that uses `@modelcontextprotocol/sdk` via the known absolute path and exposes every subcommand as a registered tool with structured JSON output; (3) generate a `SKILL.md` documenting the tool for agent discovery. A fourth command, `/pde:publish`, writes validated entries into `.planning/cli-anything/registry.json`.

All work is in CJS modules matching the established `bin/lib/cli-anything/*.cjs` pattern. No new npm dependencies are needed — `@modelcontextprotocol/sdk` v1.27.1 and `zod` v3.25.76 are already available via `packages/pde-mcp-server/node_modules/`. The generated server files use the same absolute-path require pattern established in `parsers/mcp.cjs` and documented in STATE.md.

**Primary recommendation:** Build four new CJS modules (`help-parser.cjs`, `server-gen.cjs`, `skill-gen.cjs`, `registry.cjs`), wire them into `pde-tools.cjs` under `cli-anything wrap|publish|list`, and add two skill command files (`wrap.md`, `publish.md`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CLI Wrapping Invocation**
- `/pde:wrap <binary-path>` skill command — mirrors `/pde:ingest` pattern
- Regex-based --help parser handling common patterns (GNU-style `--flag`, subcommand trees, usage lines) with fallback to raw text capture
- Generated MCP server written to `.planning/cli-anything/{slug}/server/` alongside the capability model
- Wrapper intercepts stdout, attempts JSON.parse, falls back to `{ stdout, stderr, exitCode }` envelope for structured JSON output

**MCP Server Generation**
- Stdio transport (standard MCP, works with Claude Code, Cursor) — simplest, most compatible
- Recursive subcommand discovery: run `<binary> --help`, parse subcommands, then run `<binary> <subcmd> --help` for each (max depth 3)
- Tag each tool with `readOnly: false` by default, user can mark read-only in SKILL.md; generated server includes a `--dry-run` mode that logs commands without executing
- Template-based SKILL.md: extract tool name, description from --help, list all subcommands with args, include example invocations

**CLI-Hub Registry**
- JSON file-based registry at `.planning/cli-anything/registry.json` — local-first, no server required
- Registry entry metadata: `{ name, version, description, binary, capabilities_count, skill_path, server_path, published_at }`
- `/pde:publish <slug>` command validates capability model exists, copies server to registry dir, updates registry.json
- `pde-tools.cjs cli-anything list` returns registry entries; SKILL.md files are discoverable by standard agent skill scanning

### Claude's Discretion

No items deferred to Claude's discretion — all grey areas resolved by user.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLI-07 | User can auto-wrap any CLI as an MCP server via --help parsing | help-parser.cjs parses --help text into capabilities; server-gen.cjs emits MCP server file |
| CLI-08 | Auto-generated MCP servers expose structured JSON output for every command | stdout intercept + JSON.parse with `{ stdout, stderr, exitCode }` envelope fallback |
| CLI-09 | Every generated CLI/tool produces a SKILL.md for agent discovery | skill-gen.cjs generates template SKILL.md from capability model + help metadata |
| CLI-10 | User can publish generated CLIs to a CLI-Hub compatible registry | registry.cjs maintains `.planning/cli-anything/registry.json`; `/pde:publish` validates + registers |
| CLI-11 | Generated tools support --json flag for machine consumption | server-gen.cjs appends `--json` to command when MCP tool is called with `useJson: true` input field |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.27.1 | McpServer, StdioServerTransport, registerTool | Already installed in packages/pde-mcp-server/node_modules/; used by existing pde-mcp-server |
| zod | 3.25.76 | inputSchema validation in generated server | Already available; vitest config inlines it to prevent dual-instance issues |
| node:child_process | (built-in) | execFileSync / spawnSync for running `<binary> --help` | No dependency needed |
| node:fs | (built-in) | Writing server.cjs, SKILL.md, registry.json | No dependency needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript (tsc) | 5.x | Type-checking generated server files (optional) | Same tsc path as codegen.cjs if type-checking is desired |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex --help parser | `commander` / `yargs` help parsers | Third-party libs add dependency; regex is zero-dep and handles the variety of real help output |
| CJS server template | TypeScript server (compile step) | TypeScript requires build; CJS works directly, matches existing bin/lib pattern |

**Installation:** No new packages needed. All dependencies present.

**Version verification:** `@modelcontextprotocol/sdk` 1.27.1 confirmed via direct inspection of `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/package.json`. Zod 3.25.76 confirmed via `node -e "require('./packages/pde-mcp-server/node_modules/zod/package.json').version"`.

## Architecture Patterns

### Recommended Project Structure

```
bin/lib/cli-anything/
├── model.cjs          (Phase 163 — CapabilityModelSchema)
├── detect.cjs         (Phase 163 — detectSpecType)
├── ingest.cjs         (Phase 163 — cmdIngest, slugify)
├── codegen.cjs        (Phase 163 — generateTools)
├── parsers/           (Phase 163 — openapi, jsonschema, graphql, mcp)
├── help-parser.cjs    (NEW) — parse --help output into capabilities
├── server-gen.cjs     (NEW) — generate server.cjs from capabilities
├── skill-gen.cjs      (NEW) — generate SKILL.md from capabilities
└── registry.cjs       (NEW) — read/write registry.json

commands/
├── ingest.md          (Phase 163)
├── wrap.md            (NEW) — /pde:wrap skill command
└── publish.md         (NEW) — /pde:publish skill command

tests/phase-164/
├── help-parser.test.mjs
├── server-gen.test.mjs
├── skill-gen.test.mjs
└── registry.test.mjs

.planning/cli-anything/
├── {slug}/
│   ├── capability-model.json  (Phase 163 output, consumed here)
│   ├── tools.ts               (Phase 163 output)
│   └── server/
│       ├── server.cjs         (NEW — generated MCP server)
│       └── SKILL.md           (NEW — generated agent skill doc)
└── registry.json              (NEW — local CLI-Hub registry)
```

### Pattern 1: help-parser.cjs — Regex-Based --help Parsing

**What:** Runs `<binary> --help` via `spawnSync`, parses stdout line-by-line with regex patterns to extract subcommands and flags, returns capability array shaped for CapabilityModelSchema.

**When to use:** Called by `cmdWrap` as the first stage of the wrap pipeline.

**Key parsing rules (HIGH confidence — derived from observed help output patterns):**

1. **Usage line:** Match `^[Uu]sage:?\s+(\w+)\s+(.+)` or `^(\w+)\s+<command>` to identify binary name
2. **Subcommand sections:** Match `^\s{0,6}(\w[-\w]*)\s{2,}(.+)` — a word at low indent followed by 2+ spaces and a description. This is the most reliable cross-CLI pattern (git, gh, npm, docker all use it)
3. **Flags:** Match `^\s+-(-[\w-]+)?(?:,\s*)?(-+[\w-]+)(?:\s+<([^>]+)>)?\s+(.+)?` for long and short options
4. **Section headers:** Match `^[A-Z][A-Z\s]+:$` (e.g., `USAGE`, `OPTIONS`, `COMMANDS`) to segment the output
5. **Depth guard:** Max depth 3 for recursive subcommand traversal (decision from CONTEXT.md)

**Recursive discovery algorithm:**

```javascript
// Source: derived from CONTEXT.md decisions
async function discoverSubcommands(binary, prefix, depth) {
  if (depth > 3) return [];
  const helpText = spawnHelpText(binary, prefix);
  const subcommands = parseSubcommands(helpText);
  const capabilities = [];
  for (const sub of subcommands) {
    const subHelp = spawnHelpText(binary, [...prefix, sub.name]);
    const flags = parseFlags(subHelp);
    capabilities.push(buildCapability(binary, prefix, sub, flags));
    // Only recurse if subcommand itself has subcommands
    const nested = parseSubcommands(subHelp);
    if (nested.length > 0 && depth < 3) {
      capabilities.push(...await discoverSubcommands(binary, [...prefix, sub.name], depth + 1));
    }
  }
  return capabilities;
}
```

**Fallback (raw text capture):** When no subcommands are parsed, create a single capability for the binary itself with `description` set to the full `--help` text (truncated to 1000 chars). This ensures every binary produces at least one tool.

**Timeout guard:** `spawnSync` must use `timeout: 5000` (5 seconds). Some CLIs hang on `--help` if they have interactive prompts or require a TTY.

### Pattern 2: server-gen.cjs — Generated MCP Server Template

**What:** Takes a capability model and writes a self-contained `server.cjs` file to `{slug}/server/` that uses McpServer + StdioServerTransport.

**Critical design decisions:**

1. **Require path for MCP SDK:** The generated server.cjs must use the same absolute-path pattern as `parsers/mcp.cjs`. The `__dirname` in the generated file will be the server output directory; the relative path to `packages/pde-mcp-server/node_modules/` must be calculated at generation time from the output path and embedded as an absolute path.

2. **Tool execution pattern:** Each tool spawns the binary using `spawnSync` with the subcommand path and user-provided args. Return value follows the structured JSON contract.

3. **Structured JSON output (CLI-08):** Every tool handler does:
   - Run the command, capture stdout/stderr
   - Attempt `JSON.parse(stdout)` — if success, use parsed object
   - On parse failure, return `{ stdout: stdout.trim(), stderr: stderr.trim(), exitCode }` envelope

4. **`--json` flag support (CLI-11):** Every generated tool accepts an optional `useJson` boolean input field. When `true`, the tool appends `--json` to the command args before execution. The tool description notes this behavior.

5. **`--dry-run` mode:** The server accepts `--dry-run` as a process arg. When set, tool handlers log `[dry-run] would execute: <cmd>` to stderr and return `{ dryRun: true, command: [...] }` without executing.

**Generated server.cjs structure:**

```javascript
// Source: derived from packages/pde-mcp-server/src/index.ts pattern
// WARNING: Auto-generated by /pde:wrap — do not edit manually
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

// Absolute path to MCP SDK (must not change unless packages/pde-mcp-server is moved)
const SDK_BASE = '/absolute/path/to/packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs';
const { McpServer } = require(path.join(SDK_BASE, 'server/mcp.js'));
const { StdioServerTransport } = require(path.join(SDK_BASE, 'server/stdio.js'));

const BINARY = '/path/to/binary';
const DRY_RUN = process.argv.includes('--dry-run');

const server = new McpServer({ name: '{slug}', version: '1.0.0' });

// Register tools (one per capability)
server.registerTool(
  '{tool-name}',
  {
    description: '{description}',
    inputSchema: { /* z.object shape or {} */ },
    annotations: { readOnlyHint: false },
  },
  async (input) => {
    const args = [/* subcommand path */];
    if (input.useJson) args.push('--json');
    // append other flags from input...
    if (DRY_RUN) {
      process.stderr.write(`[dry-run] would execute: ${BINARY} ${args.join(' ')}\n`);
      return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, command: [BINARY, ...args] }) }] };
    }
    const result = spawnSync(BINARY, args, { encoding: 'utf8', timeout: 30000 });
    let data;
    try { data = JSON.parse(result.stdout); } catch { data = { stdout: result.stdout.trim(), stderr: result.stderr.trim(), exitCode: result.status }; }
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch(err => { process.stderr.write(err.message + '\n'); process.exit(1); });
```

**Key SDK API note (HIGH confidence — verified from `mcp.d.ts`):** `registerTool(name, config, callback)` is the non-deprecated form. Config accepts `{ description, inputSchema, outputSchema, annotations }`. The callback receives the validated input object. Return value must be `{ content: [{ type: 'text', text: string }] }` (CallToolResult format).

**inputSchema for generated tools:** Use JSON Schema format (not Zod shapes) as the `inputSchema` in `registerTool` config — this is what the MCP protocol transmits. The SDK's `zod-json-schema-compat.js` handles Zod-to-JSON-Schema conversion internally when Zod objects are passed, but for generated CJS files that don't import Zod, passing a plain JSON Schema object `{ type: 'object', properties: {...} }` is the correct approach.

### Pattern 3: skill-gen.cjs — SKILL.md Template

**What:** Generates a structured SKILL.md from a capability model.

**Template structure:**

```markdown
<!-- PDE-GENERATED | hash:{sha} | generated:{iso-date} -->
---
name: {slug}
description: {first-line of --help or capability model description}
binary: {binary-path}
---
# {Binary Name}

## Goal
{extracted description from --help}

## Invocation
Start the MCP server: `node .planning/cli-anything/{slug}/server/server.cjs`

## Tools ({N} total)
{for each capability}
### {tool-name}
{description}
**Input:** {list flags/args}
**Example:** `{binary} {subcommand} --help`

## Flags
--dry-run   Log commands without executing
--json      Append --json to commands for machine output

## Constraints
- Binary path is absolute — server fails if binary is not at the registered path
- Max subcommand recursion depth: 3
```

### Pattern 4: registry.cjs — Local CLI-Hub Registry

**What:** Reads/writes `.planning/cli-anything/registry.json`. Used by `cmdPublish` and `cmdList`.

**Registry schema:**

```javascript
// registry.json structure
{
  "version": "1.0",
  "entries": [
    {
      "name": "{slug}",
      "version": "1.0.0",
      "description": "{description}",
      "binary": "{absolute-binary-path}",
      "capabilities_count": 12,
      "skill_path": ".planning/cli-anything/{slug}/server/SKILL.md",
      "server_path": ".planning/cli-anything/{slug}/server/server.cjs",
      "published_at": "{iso-date}"
    }
  ]
}
```

**`cmdPublish` algorithm:**
1. Verify `{slug}/capability-model.json` exists — fail fast if not
2. Verify `{slug}/server/server.cjs` and `{slug}/server/SKILL.md` exist — fail fast if not
3. Load or initialize `registry.json`
4. Upsert entry by `name` (replace existing entry if already published)
5. Write registry.json atomically
6. Print success summary

### Pattern 5: pde-tools.cjs Routing Extension

**What:** Add `wrap`, `publish`, `list` subcommands to the existing `cli-anything` case.

```javascript
case 'cli-anything': {
  const subcommand = args[1];
  if (subcommand === 'ingest') {
    const { cmdIngest } = require('./lib/cli-anything/ingest.cjs');
    await cmdIngest(cwd, args.slice(2));
  } else if (subcommand === 'wrap') {
    const { cmdWrap } = require('./lib/cli-anything/help-parser.cjs');
    await cmdWrap(cwd, args.slice(2));
  } else if (subcommand === 'publish') {
    const { cmdPublish } = require('./lib/cli-anything/registry.cjs');
    await cmdPublish(cwd, args.slice(2));
  } else if (subcommand === 'list') {
    const { cmdList } = require('./lib/cli-anything/registry.cjs');
    await cmdList(cwd, args.slice(2));
  } else {
    console.error(`Unknown cli-anything subcommand: ${subcommand}. Available: ingest, wrap, publish, list`);
    process.exit(1);
  }
  break;
}
```

### Pattern 6: cmdWrap Orchestration

**What:** The top-level wrap command that ties all modules together. Mirrors `cmdIngest` structure from `ingest.cjs`.

```javascript
async function cmdWrap(cwd, args) {
  const binaryPath = args[0];
  // 1. Validate binary exists and is executable
  // 2. Slugify binary name
  // 3. Run help-parser to discover capabilities
  // 4. Build capability model (type: 'cli')
  // 5. Validate with validateCapabilityModel — NOTE: model.cjs type enum must accept 'cli'
  // 6. Write capability-model.json
  // 7. Generate server.cjs via server-gen.cjs
  // 8. Generate SKILL.md via skill-gen.cjs
  // 9. Print summary
}
```

**CRITICAL: CapabilityModel `type` enum must be extended.** `model.cjs` currently allows `z.enum(['openapi', 'jsonschema', 'graphql', 'mcp'])`. The wrap command produces type `'cli'`. Either:
- Add `'cli'` to the enum in model.cjs, OR
- Create a separate capability model variant for CLI-wrapped tools

**Recommended:** Add `'cli'` to the existing enum — minimal change, backward compatible.

### Anti-Patterns to Avoid

- **Async spawnSync loops without timeout:** `spawnSync` blocks the event loop. Always set `timeout: 5000` for `--help` invocations and `timeout: 30000` for actual command execution. Without this, a hanging CLI will deadlock the wrap command.
- **Relative paths in generated server.cjs:** The server file is run from arbitrary directories. All paths (binary path, SDK path) must be absolute and embedded at generation time. Do NOT use relative `require()` paths in generated files.
- **Parsing stderr as help text:** Many CLIs write help to stderr when called with `--help` (exit code 1). The parser must try both stdout and stderr and use whichever is non-empty.
- **Registering Zod v3 shapes as inputSchema in CJS context:** The generated server.cjs is pure CJS and does not import Zod. Use plain JSON Schema objects as `inputSchema` in `registerTool`. The MCP SDK accepts JSON Schema directly.
- **Shell injection in generated commands:** Binary path and subcommand names come from --help parsing. Use `spawnSync(binary, args, ...)` (array form), never template string shell commands, to prevent injection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP server transport | Custom stdio/JSON-RPC | McpServer + StdioServerTransport from SDK | Protocol edge cases, client compatibility |
| Schema validation | Manual field checks | Existing validateCapabilityModel (model.cjs) | Already tested, handles all CapabilitySchema constraints |
| Slug generation | Custom slugify | Existing `slugify()` from ingest.cjs | Already handles edge cases, consistent with Phase 163 output dirs |
| Tool registration loop | Custom tools/list handler | `server.registerTool()` per capability | SDK handles tools/list, tools/call dispatch, error wrapping |

**Key insight:** The MCP SDK's `McpServer.registerTool()` handles the entire tools/list and tools/call protocol surface. Generated servers should register tools and call `server.connect(transport)` — nothing else is needed.

## Common Pitfalls

### Pitfall 1: --help Written to stderr with Exit Code 1

**What goes wrong:** `spawnSync` returns non-zero `status` and empty `stdout`. Parser finds no capabilities and falls back to raw text capture, but also reads empty string.

**Why it happens:** Many CLIs (including GNU coreutils, some Python CLIs) treat `--help` as an "error" and write to stderr. git, gh, and docker all write to stderr when `--help` is the first arg to a subcommand.

**How to avoid:** In help-parser.cjs, use `result.stdout || result.stderr` as the text to parse. Never check exit code to gate parsing — always try both streams.

**Warning signs:** All capabilities come back empty, capability_count is 0 or 1 (just the fallback).

### Pitfall 2: CapabilityModel type enum rejects 'cli'

**What goes wrong:** `validateCapabilityModel` throws `Invalid capability model` with a Zod error about `meta.type` not matching enum.

**Why it happens:** `model.cjs` enum only includes Phase 163 spec types. CLI wrapping is a new source type.

**How to avoid:** Extend the enum in model.cjs before writing tests. Add this change in Wave 0 (infrastructure setup).

**Warning signs:** cmdWrap fails at step 5 (validate model) with Zod validation error.

### Pitfall 3: Absolute SDK Path Breaks on Machine Differences

**What goes wrong:** Generated server.cjs hardcodes an absolute path like `/Users/greyaltaer/code/projects/Platform Development Engine/packages/...` — works on the generating machine, breaks when shared or moved.

**Why it happens:** The MCP SDK is not installed globally; it lives in `packages/pde-mcp-server/node_modules/`.

**How to avoid:** The absolute path embedded in server.cjs should be computed relative to the `cwd` passed to `cmdWrap`, not relative to `__dirname`. When server-gen.cjs writes the file, it should compute `path.join(cwd, 'packages/pde-mcp-server/node_modules/...')` and embed that. The server is always run from the project root.

**Alternative:** Add a `pde-wrap-sdk-path` config entry so the path is discoverable at runtime, not hard-coded at generation time.

**Warning signs:** `Cannot find module '@modelcontextprotocol/sdk/...'` when running generated server.cjs.

### Pitfall 4: Subcommand Regex Over-Matches Headers and Examples

**What goes wrong:** The parser identifies section headers like `COMMANDS`, `USAGE`, or examples like `git commit -m "msg"` as subcommand names.

**Why it happens:** The two-space gap pattern used by most CLIs is also used in example lines and decorated section headers.

**How to avoid:** Exclude lines that:
- Match ALL_CAPS (section headers)
- Start with a flag (`-` or `--`)
- Contain special chars like `:`, `(`, `)` in the first token
- Are in a "global options" section (parse section context to skip non-command sections)

**Warning signs:** Capability names like `COMMANDS`, `OPTIONS`, or `Usage` appear in the output.

### Pitfall 5: Registry.json Write Race (Multi-Publish)

**What goes wrong:** Two `pde-tools cli-anything publish` calls running simultaneously corrupt registry.json.

**Why it happens:** Read-modify-write without a lock. In practice, the publish command is human-driven and this is unlikely — but a simple upsert guard prevents it.

**How to avoid:** Read-parse-upsert-write as an atomic synchronous operation using `fs.readFileSync` and `fs.writeFileSync` (sync, not async). At the scale of a local JSON file, this is correct behavior.

**Warning signs:** registry.json becomes malformed JSON after a publish operation.

## Code Examples

### help-parser.cjs — Subcommand Extraction

```javascript
// Source: derived from observed --help output patterns across git, gh, npm, docker
'use strict';

const { spawnSync } = require('child_process');

function spawnHelpText(binary, cmdPath) {
  const args = [...cmdPath, '--help'];
  const result = spawnSync(binary, args, {
    encoding: 'utf8',
    timeout: 5000,
    // Do NOT use 'shell: true' — prevents injection
  });
  // Use stdout if non-empty, else stderr (many CLIs write help to stderr)
  return (result.stdout || result.stderr || '').trim();
}

function parseSubcommands(helpText) {
  const subcommands = [];
  const lines = helpText.split('\n');
  // Two-column pattern: word at low indent, 2+ spaces gap, description
  const subRe = /^  {0,4}(\w[-\w]*)  {2,}(.+)/;
  // Skip lines that are section headers (ALL CAPS) or flags
  const skipRe = /^[A-Z][A-Z\s]+:|^[\s]*-/;
  for (const line of lines) {
    if (skipRe.test(line)) continue;
    const m = line.match(subRe);
    if (m) {
      subcommands.push({ name: m[1].trim(), description: m[2].trim() });
    }
  }
  return subcommands;
}
```

### server-gen.cjs — Generated Server Template

```javascript
// Source: derived from packages/pde-mcp-server/src/index.ts pattern
function generateServerSource(capabilities, meta, sdkBasePath) {
  const header = [
    `// Auto-generated by /pde:wrap`,
    `// Binary: ${meta.source}`,
    `// Generated: ${meta.generatedAt}`,
    `// WARNING: absolute paths embedded at generation time`,
    `'use strict';`,
    `const path = require('path');`,
    `const { spawnSync } = require('child_process');`,
    `const SDK_BASE = ${JSON.stringify(sdkBasePath)};`,
    `const { McpServer } = require(path.join(SDK_BASE, 'server/mcp.js'));`,
    `const { StdioServerTransport } = require(path.join(SDK_BASE, 'server/stdio.js'));`,
    `const BINARY = ${JSON.stringify(meta.source)};`,
    `const DRY_RUN = process.argv.includes('--dry-run');`,
    `const server = new McpServer({ name: ${JSON.stringify(meta.source)}, version: '1.0.0' });`,
  ].join('\n');
  // ... register tools ...
}
```

### registry.cjs — Upsert Pattern

```javascript
// Source: derived from decided registry schema in CONTEXT.md
function upsertEntry(registryPath, entry) {
  let registry = { version: '1.0', entries: [] };
  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  }
  const idx = registry.entries.findIndex(e => e.name === entry.name);
  if (idx >= 0) {
    registry.entries[idx] = entry;  // replace existing
  } else {
    registry.entries.push(entry);
  }
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
```

### MCP Tool Handler — Structured JSON Output (CLI-08)

```javascript
// Source: derived from MCP SDK CallToolResult spec + CONTEXT.md decisions
server.registerTool(toolName, { description, inputSchema, annotations: { readOnlyHint: false } },
  async (input) => {
    const cmdArgs = [...subcommandPath];
    if (input.useJson) cmdArgs.push('--json');
    // Append flag args from input
    for (const [key, val] of Object.entries(input)) {
      if (key === 'useJson') continue;
      if (val !== undefined && val !== null) {
        cmdArgs.push(`--${key}`, String(val));
      }
    }
    if (DRY_RUN) {
      const dryResult = { dryRun: true, command: [BINARY, ...cmdArgs] };
      return { content: [{ type: 'text', text: JSON.stringify(dryResult) }] };
    }
    const r = spawnSync(BINARY, cmdArgs, { encoding: 'utf8', timeout: 30000 });
    let data;
    try {
      data = JSON.parse(r.stdout);
    } catch {
      data = { stdout: r.stdout.trim(), stderr: r.stderr.trim(), exitCode: r.status ?? -1 };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-write MCP servers per tool | Generate from --help parsing | Phase 164 (this phase) | Any binary becomes an MCP tool in seconds |
| `server.tool()` (deprecated) | `server.registerTool()` | MCP SDK ~1.10+ | Must use registerTool in new code |
| Zod shapes as inputSchema | JSON Schema objects as inputSchema (for CJS generated files) | SDK 1.x | Generated CJS files can't import Zod; plain JSON Schema works |

**Deprecated/outdated:**
- `server.tool()`: Deprecated in MCP SDK; `server.registerTool()` is the current API — verified from mcp.d.ts
- `server.resource()`: Deprecated; use `server.registerResource()` — not needed for this phase but consistent

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | CJS module execution | Yes | v20.20.0 | — |
| @modelcontextprotocol/sdk | Generated server.cjs | Yes | 1.27.1 | — |
| zod | model.cjs validation | Yes | 3.25.76 | — |
| Any CLI binary (e.g. git, gh) | Testing help-parser.cjs | Yes | varies | Tests use git as a known-present binary |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest.config.ts at project root) |
| Config file | `vitest.config.ts` — already exists, includes `tests/**/*.{test,spec}.{cjs,mjs,js,ts}` |
| Quick run command | `npx vitest run tests/phase-164/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-07 | help-parser extracts subcommands from `--help` text | unit | `npx vitest run tests/phase-164/help-parser.test.mjs` | Wave 0 |
| CLI-07 | cmdWrap produces capability-model.json for a real binary | integration | `npx vitest run tests/phase-164/help-parser.test.mjs` | Wave 0 |
| CLI-08 | Generated server tool handler returns structured JSON envelope | unit | `npx vitest run tests/phase-164/server-gen.test.mjs` | Wave 0 |
| CLI-09 | skill-gen produces valid SKILL.md with correct frontmatter | unit | `npx vitest run tests/phase-164/skill-gen.test.mjs` | Wave 0 |
| CLI-10 | cmdPublish writes entry to registry.json; second publish upserts | unit | `npx vitest run tests/phase-164/registry.test.mjs` | Wave 0 |
| CLI-11 | Tool handler appends --json when useJson input is true | unit | `npx vitest run tests/phase-164/server-gen.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/phase-164/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-164/help-parser.test.mjs` — covers CLI-07
- [ ] `tests/phase-164/server-gen.test.mjs` — covers CLI-08, CLI-11
- [ ] `tests/phase-164/skill-gen.test.mjs` — covers CLI-09
- [ ] `tests/phase-164/registry.test.mjs` — covers CLI-10

No new vitest config needed — existing `vitest.config.ts` already includes `tests/**/*.test.mjs`.

## Open Questions

1. **How should the generated server.cjs locate the MCP SDK when the project is moved or shared?**
   - What we know: Current pattern (absolute path embedded at generation time) breaks across machines. The `parsers/mcp.cjs` has the same limitation but only runs during `pde-tools` execution (not persisted).
   - What's unclear: Whether CLI-Hub use cases require shareable servers or whether local-only is acceptable for v0.20.
   - Recommendation: For v0.20, embed absolute path at generation time (matches local-first registry model). Document the limitation in SKILL.md. A `--relocate` flag for registry.cjs is a future enhancement.

2. **Should `cmdWrap` extend the existing CapabilityModel type enum or create a separate schema variant?**
   - What we know: Current enum is `['openapi', 'jsonschema', 'graphql', 'mcp']`. Adding `'cli'` is a one-line change in model.cjs.
   - What's unclear: Whether any downstream consumer (codegen.cjs) breaks if it receives a `'cli'` type model.
   - Recommendation: Add `'cli'` to the enum. In codegen.cjs, the `generateExecuteBody` function has a `default` branch that returns a stub — this already handles unknown types gracefully. No other consumer is type-dependent.

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` found at project root. Constraints are sourced from STATE.md and PROJECT.md.

**Active constraints from STATE.md / PROJECT.md:**
- All v0.20 services must use free or open-source toolchains — no paid API keys required
- CLI-Anything: unified capability model is the shared data structure consumed by all downstream generators
- CJS modules (.cjs) in bin/lib/cli-anything/ — established pattern, must be followed
- pde-tools.cjs subcommand routing pattern — all new CLI operations go through this entry point
- MCP SDK must be required from packages/pde-mcp-server/node_modules absolute path — bare require('@modelcontextprotocol/sdk') fails
- Zod v4: z.record() requires two args — but zod 3.25.76 is what's installed; use z.record(z.string(), z.unknown()) for safety

## Sources

### Primary (HIGH confidence)

- Direct file inspection: `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.d.ts` — registerTool API signature verified
- Direct file inspection: `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/package.json` — v1.27.1 confirmed
- Direct file inspection: `bin/lib/cli-anything/parsers/mcp.cjs` — absolute SDK path pattern
- Direct file inspection: `bin/lib/cli-anything/model.cjs` — CapabilityModelSchema enum
- Direct file inspection: `packages/pde-mcp-server/src/index.ts` — registerTool usage pattern
- Direct file inspection: `vitest.config.ts` — test include pattern and zod inline setting
- STATE.md decisions section — critical technical constraints documented from Phase 163

### Secondary (MEDIUM confidence)

- Observed output of `git --help`, `gh --help`, `npm --help` — used to derive regex patterns for help-parser.cjs
- MCP SDK mcp.d.ts type declarations — CallToolResult return format `{ content: [{ type, text }] }`

### Tertiary (LOW confidence)

- None — all claims in this research are supported by direct file inspection or official SDK type declarations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified by direct file inspection, no new dependencies
- Architecture patterns: HIGH — derived from existing codebase patterns (ingest.cjs, parsers/mcp.cjs, index.ts) and CONTEXT.md locked decisions
- Pitfalls: HIGH — stderr/stdout ambiguity verified by running actual CLIs; SDK absolute path pattern verified from mcp.cjs
- Test framework: HIGH — vitest.config.ts inspected, phase-163 test structure used as model

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (MCP SDK version pinned; stable ecosystem)
