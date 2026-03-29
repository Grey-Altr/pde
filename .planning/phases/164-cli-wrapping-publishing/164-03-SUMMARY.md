---
phase: 164-cli-wrapping-publishing
plan: "03"
subsystem: cli-anything
tags: [cli-wrapping, mcp-server, skill-generation, registry, help-parser]
dependency_graph:
  requires: [163-cli-ingestion-capability-model]
  provides: [cli-wrap-pipeline, skill-md-generation, cli-hub-registry]
  affects: [pde-tools-routing, commands-surface]
tech_stack:
  added: [help-parser, server-gen, skill-gen, registry]
  patterns: [stdio-mcp-server, capability-model, spawnSync-subprocess, local-registry]
key_files:
  created:
    - bin/lib/cli-anything/help-parser.cjs
    - bin/lib/cli-anything/server-gen.cjs
    - bin/lib/cli-anything/skill-gen.cjs
    - bin/lib/cli-anything/registry.cjs
    - tests/phase-164/help-parser.test.mjs
    - tests/phase-164/server-gen.test.mjs
    - tests/phase-164/skill-gen.test.mjs
    - tests/phase-164/registry.test.mjs
    - tests/phase-164/fixtures/git-help.txt
    - tests/phase-164/fixtures/gh-help.txt
    - tests/phase-164/fixtures/simple-help.txt
    - commands/wrap.md
    - commands/publish.md
  modified:
    - bin/lib/cli-anything/model.cjs
    - bin/pde-tools.cjs
decisions:
  - "help-parser uses spawnSync with array args (no shell: true) to prevent injection — BINARY path embedded as JSON.stringify in generated server"
  - "discoverCapabilities recursion stops at depth 3; at depth 0 with no subcommands, a fallback capability is created from binary itself"
  - "server-gen embeds absolute SDK path via JSON.stringify at generation time — generated server.cjs is fully self-contained"
  - "cmdWrap added to help-parser.cjs for cohesion (full pipeline orchestration co-located with parser)"
  - "Plans 01 and 02 were not previously executed — their work (model.cjs update, test scaffolds, fixtures, help-parser, server-gen) was implemented as part of this plan"
metrics:
  duration: "5m 8s"
  completed: "2026-03-29T02:01:16Z"
  tasks_completed: 2
  files_created: 13
  files_modified: 2
  tests_added: 41
  tests_passing: 41
---

# Phase 164 Plan 03: CLI Wrapping + Publishing Summary

**One-liner:** Full wrap+publish pipeline: help-parser with recursive --help discovery, self-contained MCP server generator, SKILL.md generator with SHA256 provenance, and local CLI-Hub registry — wired end-to-end via pde-tools.cjs and skill command files.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Implement skill-gen, registry, help-parser, server-gen | d9ab1dd | 12 new files, model.cjs updated |
| 2 | Wire cmdWrap orchestration, pde-tools routing, skill commands | 3cb6db5 | pde-tools.cjs, wrap.md, publish.md |

## What Was Built

### Core Modules

**help-parser.cjs** — Parses `--help` output from any CLI binary:
- `parseSubcommands(helpText)` — Two-column format extraction, skips ALL_CAPS headers and flags
- `parseFlags(helpText)` — Extracts `--long`, `-short`, `<arg>`, description tuples
- `spawnHelpText(binary, cmdPath)` — Uses `spawnSync` with 5s timeout, stdout||stderr fallback
- `discoverCapabilities(binary, prefix, depth)` — Recursive discovery up to depth 3, fallback capability when no subcommands found
- `cmdWrap(cwd, args)` — Full pipeline orchestrator: resolve binary, discover, build model, write server, write SKILL.md

**server-gen.cjs** — Generates self-contained CJS MCP server files:
- `generateServerSource(capabilities, meta, sdkBasePath)` — Emits valid CJS with McpServer/StdioServerTransport, BINARY constant, DRY_RUN flag, per-capability `registerTool`, JSON.parse envelope fallback, useJson/--json wiring, 30s timeout
- `writeServer(outputDir, capabilities, meta, projectRoot)` — Computes absolute SDK path, writes server.cjs

**skill-gen.cjs** — Generates SKILL.md agent documentation:
- `generateSkillMd(model)` — Starts with `<!-- PDE-GENERATED | hash:{sha256} | generated:{ts} -->`, YAML frontmatter, Goal, Invocation, Tools (N total), Flags, Constraints sections
- `writeSkillMd(outputDir, model)` — Writes SKILL.md, returns path

**registry.cjs** — Local CLI-Hub registry management:
- `loadRegistry(registryPath)` — Returns `{ version: '1.0', entries: [] }` for missing file
- `upsertEntry(registryPath, entry)` — Replace-or-append by name
- `cmdPublish(cwd, args)` — Validates 3 artifacts, writes entry with capabilities_count + timestamps
- `cmdList(cwd, args)` — Formatted table output

### Infrastructure

**model.cjs** — Extended type enum to accept `'cli'` alongside `openapi|jsonschema|graphql|mcp`

**pde-tools.cjs** — Added `wrap`, `publish`, `list` subcommand routing to cli-anything case

**commands/wrap.md + publish.md** — Skill command files with usage, examples, and implementation sections

### End-to-End Verification

```
node bin/pde-tools.cjs cli-anything wrap git
# Discovered 22 capabilities from /opt/homebrew/bin/git
# Wrapped git: 22 capabilities, server.cjs, SKILL.md, capability-model.json

node bin/pde-tools.cjs cli-anything publish git
# Published git to CLI-Hub registry (22 capabilities)

node bin/pde-tools.cjs cli-anything list
# Name  Capabilities  Published At
# ----  ------------  --------------------
# git   22            2026-03-29 02:00:52
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plans 01 and 02 not previously executed**
- **Found during:** Task 1 setup
- **Issue:** `bin/lib/cli-anything/help-parser.cjs`, `server-gen.cjs` did not exist. `tests/phase-164/` directory did not exist. `model.cjs` still had old enum without `'cli'` type.
- **Fix:** Implemented all prerequisite work inline: model.cjs enum update, fixture files (git-help.txt, gh-help.txt, simple-help.txt), test scaffolds for all 4 modules, and full implementations of help-parser.cjs and server-gen.cjs alongside skill-gen.cjs and registry.cjs.
- **Files modified:** See full file list in key_files
- **Commits:** d9ab1dd

## Known Stubs

None — all pipeline stages are fully wired with real functionality.

## Self-Check: PASSED

All files verified present:
- bin/lib/cli-anything/help-parser.cjs: FOUND
- bin/lib/cli-anything/server-gen.cjs: FOUND
- bin/lib/cli-anything/skill-gen.cjs: FOUND
- bin/lib/cli-anything/registry.cjs: FOUND
- commands/wrap.md: FOUND
- commands/publish.md: FOUND
- .planning/cli-anything/git/capability-model.json: FOUND
- .planning/cli-anything/git/server/server.cjs: FOUND
- .planning/cli-anything/git/server/SKILL.md: FOUND
- .planning/cli-anything/registry.json: FOUND

Commits verified:
- d9ab1dd: FOUND
- 3cb6db5: FOUND
