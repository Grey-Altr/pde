---
phase: 164-cli-wrapping-publishing
verified: 2026-03-29T02:05:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 164: CLI Wrapping + Publishing Verification Report

**Phase Goal:** Users can wrap any command-line tool as an agent-native MCP server and publish it so other agents can discover it
**Verified:** 2026-03-29T02:05:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `model.cjs` CapabilityModelSchema type enum accepts `'cli'` as a valid type | VERIFIED | `node -e "...validateCapabilityModel({meta:{...type:'cli'...}...})"` returns without error |
| 2 | `help-parser.cjs` extracts subcommands and flags from any `--help` output using regex patterns | VERIFIED | All 7 help-parser tests green; `parseSubcommands` and `parseFlags` exports confirmed |
| 3 | `help-parser.cjs` handles stderr fallback when CLI writes help to stderr | VERIFIED | `spawnHelpText` returns `result.stdout \|\| result.stderr` — test "returns stdout or stderr fallback" passes |
| 4 | `help-parser.cjs` recursively discovers subcommands up to depth 3 | VERIFIED | `discoverCapabilities` implements depth guard `if (depth > 3) return []`; integration test for git passes |
| 5 | `server-gen.cjs` produces a self-contained CJS MCP server file with stdio transport | VERIFIED | `generateServerSource` embeds absolute SDK_BASE, McpServer, StdioServerTransport; 11 server-gen tests green |
| 6 | Generated server returns structured JSON for every command (JSON.parse or envelope fallback) | VERIFIED | Generated source contains `JSON.parse(r.stdout)` with `{ stdout, stderr, exitCode }` fallback; confirmed via spot-check |
| 7 | Generated server appends `--json` when `useJson` input is true | VERIFIED | Handler: `if (input && input.useJson) args.push('--json')` — test "contains useJson support that appends --json" passes |
| 8 | Generated server supports `--dry-run` mode | VERIFIED | `DRY_RUN = process.argv.includes('--dry-run')` guard present; test "contains DRY_RUN flag" passes |
| 9 | Every generated CLI produces a SKILL.md with frontmatter, tool listing, and invocation instructions | VERIFIED | All 8 skill-gen tests green; `<!-- PDE-GENERATED` header, YAML frontmatter, `## Tools`, `## Flags`, `## Invocation` sections confirmed |
| 10 | User can publish a wrapped CLI to the local registry and see it in listings | VERIFIED | `node bin/pde-tools.cjs cli-anything publish git` + `list` confirms entry with 22 capabilities shown |
| 11 | `cmdWrap` orchestrates the full pipeline: parse --help, build model, generate server, generate SKILL.md | VERIFIED | Live run: `wrap git` produced `capability-model.json`, `server.cjs` (52500 bytes), `SKILL.md` (25193 bytes) |
| 12 | `pde-tools.cjs` routes wrap, publish, and list subcommands correctly | VERIFIED | Lines 725-737: `subcommand === 'wrap'`, `'publish'`, `'list'` routing present and functional |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/cli-anything/model.cjs` | Extended type enum including `'cli'` | VERIFIED | Line 32: `z.enum(['openapi', 'jsonschema', 'graphql', 'mcp', 'cli'])` |
| `bin/lib/cli-anything/help-parser.cjs` | CLI --help parsing and recursive capability discovery | VERIFIED | 7841 bytes; exports `parseSubcommands`, `parseFlags`, `spawnHelpText`, `discoverCapabilities`, `cmdWrap` |
| `bin/lib/cli-anything/server-gen.cjs` | MCP server CJS file generation from capabilities | VERIFIED | 5173 bytes; exports `generateServerSource`, `writeServer` |
| `bin/lib/cli-anything/skill-gen.cjs` | SKILL.md generation from capability model | VERIFIED | 3617 bytes; exports `generateSkillMd`, `writeSkillMd` |
| `bin/lib/cli-anything/registry.cjs` | Local CLI-Hub registry management | VERIFIED | 4386 bytes; exports `loadRegistry`, `upsertEntry`, `cmdPublish`, `cmdList` |
| `bin/pde-tools.cjs` | CLI routing for wrap, publish, list subcommands | VERIFIED | Lines 725-737 contain all three new subcommand routes |
| `commands/wrap.md` | `/pde:wrap` skill command documentation | VERIFIED | 1949 bytes; contains `/pde:wrap` with usage, examples, implementation |
| `commands/publish.md` | `/pde:publish` skill command documentation | VERIFIED | 1633 bytes; contains `/pde:publish` with usage, examples, implementation |
| `tests/phase-164/help-parser.test.mjs` | Test scaffold for help parser | VERIFIED | 3681 bytes; imports `parseSubcommands`, all tests green |
| `tests/phase-164/server-gen.test.mjs` | Test scaffold for server generator | VERIFIED | 4489 bytes; imports `generateServerSource`, all tests green |
| `tests/phase-164/skill-gen.test.mjs` | Test scaffold for SKILL.md generator | VERIFIED | 3025 bytes; imports `generateSkillMd`, all tests green |
| `tests/phase-164/registry.test.mjs` | Test scaffold for registry operations | VERIFIED | 3681 bytes; imports `upsertEntry`, `cmdPublish`, all tests green |
| `tests/phase-164/fixtures/git-help.txt` | Real git --help output for testing | VERIFIED | Present in fixtures/ directory |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/cli-anything/help-parser.cjs` | `node:child_process` | `spawnSync` with `timeout:5000` | WIRED | Line 24: `spawnSync(binary, args, { encoding: 'utf8', timeout: 5000 })` |
| `bin/lib/cli-anything/server-gen.cjs` | MCP SDK path | `SDK_BASE` absolute path embedded | WIRED | `writeServer` computes `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs` |
| `bin/lib/cli-anything/server-gen.cjs` | `registerTool` | `McpServer.registerTool()` | WIRED | Line 103: `server.registerTool(` — 22 invocations in live-generated git server |
| `bin/pde-tools.cjs` | `bin/lib/cli-anything/help-parser.cjs` | `require('./lib/cli-anything/help-parser.cjs')` | WIRED | Line 726: `const { cmdWrap } = require('./lib/cli-anything/help-parser.cjs')` |
| `bin/pde-tools.cjs` | `bin/lib/cli-anything/registry.cjs` | `require('./lib/cli-anything/registry.cjs')` | WIRED | Lines 729, 732: `cmdPublish` and `cmdList` imports |
| `bin/lib/cli-anything/registry.cjs` | `.planning/cli-anything/registry.json` | `fs.writeFileSync` | WIRED | Line 48: `fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8')` |
| `tests/phase-164/help-parser.test.mjs` | `bin/lib/cli-anything/help-parser.cjs` | `createRequire` import | WIRED | Import path resolves; all 7 tests green |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `cmdWrap` pipeline | `capabilities` | `discoverCapabilities(binary)` calling `spawnSync` live | Yes — 22 real git capabilities discovered | FLOWING |
| `generateServerSource` | tool handler closures | `cap.extensions.subcommandPath`, `meta.source` | Yes — 22 `registerTool` calls in generated server | FLOWING |
| `generateSkillMd` | SKILL.md sections | `model.capabilities`, `model.meta` | Yes — 25193-byte SKILL.md with all 22 tools listed | FLOWING |
| `cmdPublish` / `cmdList` | registry entries | `fs.writeFileSync` / `JSON.parse(fs.readFileSync)` | Yes — registry.json written; list command confirms output | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `model.cjs` accepts `'cli'` type without throwing | `node -e "...validateCapabilityModel({meta:{type:'cli'...}...})"` | `cli type validated OK` | PASS |
| All 41 phase-164 tests pass | `npx vitest run tests/phase-164/ --reporter=verbose` | 41 passed, 4 test files | PASS |
| Wrap pipeline produces all 3 artifacts | `node bin/pde-tools.cjs cli-anything wrap git` | `server.cjs` (52500 bytes), `SKILL.md` (25193 bytes), `capability-model.json` | PASS |
| Publish registers entry; list shows it | `node bin/pde-tools.cjs cli-anything publish git && list` | "Published git to CLI-Hub registry (22 capabilities)" + table row | PASS |
| Generated server contains all required patterns | `node -e "...generateServerSource(...)"` + pattern checks | All 9 patterns present: McpServer, StdioServerTransport, DRY_RUN, useJson, JSON.parse, spawnSync, registerTool, --json, exitCode | PASS |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLI-07 | 164-01, 164-02, 164-03 | User can auto-wrap any CLI as an MCP server via --help parsing | SATISFIED | `cmdWrap` implements full pipeline; `discoverCapabilities` recursively parses any `--help` output |
| CLI-08 | 164-01, 164-02 | Auto-generated MCP servers expose structured JSON output for every command | SATISFIED | `JSON.parse(r.stdout)` with `{ stdout, stderr, exitCode }` envelope in every tool handler |
| CLI-09 | 164-01, 164-03 | Every generated CLI/tool produces a SKILL.md for agent discovery | SATISFIED | `writeSkillMd` called in `cmdWrap` pipeline; SKILL.md with PDE-GENERATED header, YAML frontmatter, ## Tools, ## Flags, ## Invocation |
| CLI-10 | 164-01, 164-03 | User can publish generated CLIs to a CLI-Hub compatible registry | SATISFIED | `cmdPublish` validates artifacts, writes to `registry.json`; `cmdList` shows formatted table |
| CLI-11 | 164-01, 164-02 | Generated tools support --json flag for machine consumption | SATISFIED | `useJson` input property wired to `args.push('--json')` in every tool handler |

All 5 required requirements satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

No blockers or warnings found. Scanned `help-parser.cjs`, `server-gen.cjs`, `skill-gen.cjs`, `registry.cjs` — no TODO/FIXME/HACK/PLACEHOLDER comments, no empty return stubs, no hardcoded empty data passed to rendering paths.

---

### Human Verification Required

#### 1. MCP Server stdio transport connectivity

**Test:** Start the generated git server: `node .planning/cli-anything/git/server/server.cjs`, then connect an MCP client via stdio and invoke a tool (e.g., `git_status`)
**Expected:** Server initializes without error; tool invocation returns JSON-structured output
**Why human:** Requires a running MCP client; programmatic stdio-level verification not practical in this context

#### 2. Discovery of generated SKILL.md by agent tooling

**Test:** Add the generated SKILL.md path to an agent context; verify the agent reads it and can identify the available tools and invocation command
**Expected:** Agent correctly reads `## Tools` section and `## Invocation` command from the generated SKILL.md
**Why human:** Agent context loading and comprehension cannot be verified programmatically

---

### Gaps Summary

No gaps. All 12 observable truths verified, all 8 implementation artifacts present and substantive, all 7 key links wired, all 5 requirements satisfied, all behavioral spot-checks passed, 41/41 tests green.

The only items requiring human attention are live MCP connectivity and agent SKILL.md discovery — both behavioral validations that cannot be automated without a running server environment.

---

_Verified: 2026-03-29T02:05:00Z_
_Verifier: Claude (gsd-verifier)_
