---
phase: 164-cli-wrapping-publishing
plan: "02"
subsystem: cli-anything
tags: [help-parser, server-gen, mcp, tdd, cli-wrapping]
dependency_graph:
  requires:
    - "CapabilityModelSchema with 'cli' type (from 164-01)"
    - "tests/phase-164/help-parser.test.mjs and server-gen.test.mjs (RED scaffolds from 164-01)"
  provides:
    - "CLI --help parsing and recursive subcommand discovery"
    - "MCP server CJS file generation from capability models"
  affects:
    - "bin/lib/cli-anything/help-parser.cjs"
    - "bin/lib/cli-anything/server-gen.cjs"
tech_stack:
  added: []
  patterns:
    - "spawnSync with timeout:5000 for safe CLI subprocess invocation (no shell injection)"
    - "Regex-based two-column help text parsing with section header and flag filtering"
    - "Code generation via template string interpolation with JSON.stringify for safe embedding"
    - "Envelope fallback pattern: JSON.parse(stdout) || { stdout, stderr, exitCode }"
key_files:
  created:
    - bin/lib/cli-anything/help-parser.cjs
    - bin/lib/cli-anything/server-gen.cjs
  modified: []
decisions:
  - "parseFlags returns { flag, short, long, arg, description } with 'flag' as primary key (long || short) — test checked f.flag not f.long"
  - "generateServerSource accepts full model object { meta, capabilities } matching test call signature, with optional sdkBasePath second param"
  - "Server-gen defaults SDK path to __dirname-relative packages/pde-mcp-server path, overridable for testing"
  - "discoverCapabilities recurses into every subcommand but only appends child caps if non-empty, avoiding duplicate root capability"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 164 Plan 02: Core Wrapping Engine — help-parser + server-gen Summary

Implemented help-parser.cjs for extracting CLI subcommands/flags from --help output with recursive discovery, and server-gen.cjs for generating self-contained CJS MCP server files with JSON envelope output, --json flag support, and --dry-run mode.

## What Was Built

### Task 1: help-parser.cjs

Four exports covering the full parsing and discovery pipeline:

- **spawnHelpText(binary, cmdPath)**: Invokes `spawnSync(binary, [...cmdPath, '--help'], { timeout: 5000 })`, returns stdout || stderr (handles CLIs that write help to stderr), ignores exit code.
- **parseSubcommands(helpText)**: Splits on newlines, matches two-column format via `/^ {0,4}(\w[-\w]*)  {2,}(.+)/`, skips ALL_CAPS section headers, flag lines (starting with `-`), and tokens with special chars.
- **parseFlags(helpText)**: Matches flag lines via regex, returns `{ flag, short, long, arg, description }` with `flag` as the primary identifier (long flag or short flag).
- **discoverCapabilities(binary, prefix, depth)**: Recursive discovery up to depth 3. Builds CapabilitySchema-shaped objects with `name` (underscore-joined path), `path` (space-joined path), `extensions.subcommandPath`. Falls back to a single capability at depth 0 if no subcommands found.

All 7 help-parser tests green.

### Task 2: server-gen.cjs

Two exports for server generation:

- **generateServerSource(model, sdkBasePath?)**: Accepts `{ meta, capabilities }` model. Generates valid CJS that: requires McpServer and StdioServerTransport from absolute SDK_BASE path, sets BINARY and DRY_RUN, calls `server.registerTool()` for each capability.
- **writeServer(outputDir, capabilities, meta, projectRoot)**: Computes SDK path from projectRoot, calls generateServerSource, writes `server.cjs` to outputDir.

Each generated tool handler:
- Builds args from `extensions.subcommandPath`
- Appends `--json` when `input.useJson` is true
- Maps other input fields to `--key [value]` flags
- Short-circuits with dry-run JSON if `DRY_RUN` is set
- Uses `spawnSync(BINARY, args, { timeout: 30000 })` for command execution
- Attempts `JSON.parse(r.stdout)` with `{ stdout, stderr, exitCode }` envelope fallback

All 6 server-gen tests green.

## Deviations from Plan

**[Rule 2 - Auto-fix] Merged main into worktree branch**
- **Found during:** Setup — worktree branch was behind main, missing 164-01 test scaffolds
- **Fix:** `git merge main --no-edit --no-verify` to bring in 164-01 commits (test files + model.cjs)
- **Impact:** Tests became runnable in the worktree

**[Rule 1 - Bug] parseFlags returns `flag` property not `long`**
- **Found during:** Reading test file — test checks `f.flag` not `f.long`
- **Fix:** Added `flag` property to return object as `long || short` primary identifier
- **Files modified:** bin/lib/cli-anything/help-parser.cjs

**[Rule 1 - Bug] generateServerSource accepts full model object not `(capabilities, meta, sdkBasePath)`**
- **Found during:** Reading server-gen.test.mjs — test calls `generateServerSource(mockModel)` with single full model object
- **Fix:** Function signature changed to `(model, sdkBasePath?)` where model has `.meta` and `.capabilities`
- **Files modified:** bin/lib/cli-anything/server-gen.cjs

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2cba80e | feat | implement help-parser.cjs — CLI --help parsing and capability discovery |
| 85f326c | feat | implement server-gen.cjs — MCP server CJS file generator |

## Success Criteria Verification

- [x] help-parser.cjs exports parseSubcommands, parseFlags, spawnHelpText, discoverCapabilities
- [x] parseSubcommands extracts init/build/test/deploy from simple-help.txt
- [x] parseSubcommands skips ALL_CAPS headers and flag lines
- [x] spawnHelpText uses spawnSync with timeout:5000, stdout||stderr fallback
- [x] discoverCapabilities returns capabilities with name, description, inputSchema, path, extensions
- [x] All 7 help-parser tests green
- [x] server-gen.cjs exports generateServerSource and writeServer
- [x] Generated source contains McpServer, StdioServerTransport, BINARY, DRY_RUN
- [x] Structured JSON output envelope (CLI-08) in every generated tool handler
- [x] --json flag support (CLI-11) via useJson input in every tool
- [x] spawnSync with timeout:30000, no exec/spawn
- [x] All 6 server-gen tests green

## Self-Check: PASSED
