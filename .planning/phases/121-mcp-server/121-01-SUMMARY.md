---
phase: 121-mcp-server
plan: "01"
subsystem: mcp-server
tags: [mcp, typescript, tooling, read-only, stdio]
dependency_graph:
  requires: [120-artifact-formatting]
  provides: [pde-mcp-server package, 10 read-only tools, pipeline-status resource]
  affects: [cursor-integration, vscode-integration, any-mcp-editor]
tech_stack:
  added: ["@modelcontextprotocol/sdk@^1.26.0", "zod@^3.25.0", "typescript@^5.x"]
  patterns: [CJS-handler-with-ESM-wrapper, createRequire-interop, walk-up-discovery, factory-function-tools]
key_files:
  created:
    - packages/pde-mcp-server/package.json
    - packages/pde-mcp-server/tsconfig.json
    - packages/pde-mcp-server/discover.cjs
    - packages/pde-mcp-server/handlers.cjs
    - packages/pde-mcp-server/src/index.ts
    - packages/pde-mcp-server/src/discover.ts
    - packages/pde-mcp-server/src/tools/get-project.ts
    - packages/pde-mcp-server/src/tools/get-design-state.ts
    - packages/pde-mcp-server/src/tools/get-manifest.ts
    - packages/pde-mcp-server/src/tools/get-tokens.ts
    - packages/pde-mcp-server/src/tools/get-handoff.ts
    - packages/pde-mcp-server/src/tools/get-artifact.ts
    - packages/pde-mcp-server/src/tools/get-roadmap.ts
    - packages/pde-mcp-server/src/tools/get-requirements.ts
    - packages/pde-mcp-server/src/tools/get-pipeline-status.ts
    - packages/pde-mcp-server/src/tools/list-artifacts.ts
    - packages/pde-mcp-server/src/resources/pipeline-status.ts
    - tests/phase-121/test-mcp-server.cjs
  modified: []
decisions:
  - "CJS handlers.cjs pattern: all handler logic in plain CJS for direct test import without TypeScript compilation; TypeScript index.ts wraps via createRequire"
  - "discover.cjs provided alongside discover.ts so tests import CJS directly without build step"
  - "walk-up discovery caps at 10 levels to prevent filesystem root crawl on misconfigured environments"
  - "registerTool loop pattern: tools array built from factory calls, iterated once — keeps index.ts readable at scale"
  - "get-tokens resolves manifest.artifacts.tokens as absolute path (written by artifact pipeline) — no path joining needed"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-24"
  tasks_completed: 2
  tests_added: 27
  files_created: 18
---

# Phase 121 Plan 01: MCP Server Summary

**One-liner:** Standalone `pde-mcp-server` package with 10 read-only tools and `pde://pipeline-status` resource using stdio transport, `@modelcontextprotocol/sdk` v1.x, CJS handler pattern for testability.

## What Was Built

A self-contained MCP server package in `packages/pde-mcp-server/` with its own `node_modules`, isolated from the plugin root's zero-npm-dependency constraint. The server exposes all 10 required read-only tools and one passive resource.

**Package structure:**
```
packages/pde-mcp-server/
  package.json          — isolated deps: @modelcontextprotocol/sdk, zod, typescript
  tsconfig.json         — Node16 module, outDir dist/, rootDir src/
  discover.cjs          — CJS walk-up discovery (direct test import)
  handlers.cjs          — all 10 tool handlers + resource handler (plain CJS)
  src/
    index.ts            — McpServer entry, 10 registerTool, 1 registerResource
    discover.ts         — TypeScript walk-up discovery
    tools/              — 10 factory files (ESM, createRequire for handlers.cjs)
    resources/          — pipeline-status.ts resource factory
  dist/                 — compiled output (shebang verified on line 1)
```

## Task Outcomes

### Task 1: Package scaffold and discovery module
- `package.json` with `pde-mcp-server` name, `bin: { "pde-mcp-server": "./dist/index.js" }`, ESM `"type": "module"`, SDK dependency
- `tsconfig.json` targeting ES2022, Node16 module resolution
- `discover.cjs` exporting `discoverPlanningDir` — walks up max 10 levels, returns absolute `.planning/` path or null
- Test scaffold with MCP-01 and MCP-03 tests passing (10/27 tests green at commit)
- `npm install` completed inside `packages/pde-mcp-server/` only (94 packages, zero at project root)

### Task 2: All 10 tools, pipeline resource, and complete tests
- `handlers.cjs` — plain CJS with 11 async functions (10 tool handlers + 1 resource handler)
- `src/index.ts` — shebang on line 1, `--planning-dir` CLI override, tool loop, `registerResource`
- 10 TypeScript tool factory files wrapping `handlers.cjs` via `createRequire(import.meta.url)`
- `src/resources/pipeline-status.ts` — `pde://pipeline-status` resource
- TypeScript compilation clean: `tsc` exits 0, shebang preserved in `dist/index.js`
- 27/27 tests passing (MCP-01 through MCP-05)

## Test Results

```
# tests 27
# suites 5
# pass 27
# fail 0
# duration_ms ~79ms
```

**Coverage:**
- MCP-01: package.json structure (name, bin, SDK dep, tsconfig fields)
- MCP-02: all 10 tool handlers return correct content, isError on missing files, exactly 10 handlers
- MCP-03: discoverPlanningDir — direct, ancestor walk-up, null on missing, nested temp dir
- MCP-04: pipeline-status resource returns JSON with designState + manifest, same structure as tool
- MCP-05: get-tokens returns `@theme { }` block from DTCG fixture via generateTailwindTheme()

## Key Architectural Decision: CJS Handler Pattern

The plan's final decision was to use `handlers.cjs` (plain CJS) for all handler logic, with TypeScript `src/index.ts` importing via `createRequire`. This solves the ESM/CJS interop challenge cleanly:

- Tests import `handlers.cjs` directly — no build step required
- `artifact-format.cjs` is also CJS, so `handlers.cjs` uses plain `require()` without interop friction
- TypeScript entry point only handles server wiring; logic stays in testable CJS

## Deviations from Plan

None — plan executed exactly as written. The "simpler approach" (`handlers.cjs`) specified in Task 2 action was used as the final decision.

## Self-Check: PASSED

Files verified:
- `packages/pde-mcp-server/package.json` — exists
- `packages/pde-mcp-server/handlers.cjs` — exists
- `packages/pde-mcp-server/src/index.ts` — exists
- `packages/pde-mcp-server/discover.cjs` — exists
- `tests/phase-121/test-mcp-server.cjs` — exists
- `dist/index.js` — compiled, shebang on line 1

Commits:
- `49c048c` — feat(121-01): package scaffold and discovery module
- `8a5229e` — feat(121-01): 10 read-only tools, pipeline resource, and complete tests
