---
phase: 131-mcp-write-tools
plan: "01"
subsystem: mcp-server
tags: [mcp, write-tools, audit-log, flag-gate, context-sync]
dependency_graph:
  requires:
    - bin/lib/context-sync.cjs (replaceSectionInFile, emitAll)
    - packages/pde-mcp-server/handlers.cjs
  provides:
    - handleUpdateConstraints: PROJECT.md Constraints section overwrite via MCP
    - handleUpdateTechStack: PROJECT.md Tech Stack section overwrite via MCP
    - appendMcpWriteLog: NDJSON audit trail in .planning/logs/mcp-writes.ndjson
    - registerWriteTools: conditional write tool registration (--enable-writes)
    - enableWrites flag gate in index.ts
  affects:
    - packages/pde-mcp-server/src/index.ts
    - packages/pde-mcp-server/src/write-tools.ts
    - packages/pde-mcp-server/handlers.cjs
tech_stack:
  added: []
  patterns:
    - Lazy-load CJS modules via function wrapper (getContextSync pattern)
    - NDJSON audit log with mkdirSync({recursive:true}) + appendFileSync
    - emitAll error isolation: try/catch wraps emitAll, records error string in emitResult
    - tool factory pattern: factory function returns {name, description, inputSchema, handler}
key_files:
  created:
    - packages/pde-mcp-server/src/tools/update-constraints.ts
    - packages/pde-mcp-server/src/tools/update-tech-stack.ts
    - packages/pde-mcp-server/src/write-tools.ts
    - tests/phase-131/test-mcp-write-tools.cjs
  modified:
    - packages/pde-mcp-server/handlers.cjs
    - packages/pde-mcp-server/src/index.ts
decisions:
  - "emitAll error isolation: wrap in try/catch, store error string in emitResult so handler still succeeds and logs the attempt"
  - "validateWriteContent returns null (valid) or error string (invalid) — avoids throw for expected invalid input"
  - "getContextSync() lazy-loads context-sync.cjs at call time following getGenerateTailwindTheme() pattern"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 6
---

# Phase 131 Plan 01: MCP Write Tools — Handlers + Flag Gate Summary

**One-liner:** --enable-writes flag gate in index.ts with pde_update_constraints and pde_update_tech_stack tools writing PROJECT.md sections via replaceSectionInFile, NDJSON audit log, and emitAll re-emission.

## What Was Built

Two MCP write tools (plus supporting infrastructure) that allow MCP clients to overwrite the Constraints and Tech Stack sections of PROJECT.md through validated, audited, and idempotent handlers.

### Core components

**handlers.cjs additions:**
- `getContextSync()` — lazy-loads context-sync.cjs (replaceSectionInFile, emitAll)
- `validateWriteContent(content)` — shared guard: typeof string, 1-4000 chars, no `<!--`, no `PDE-GENERATED`
- `appendMcpWriteLog(planningDir, entry)` — creates `logs/` dir, appends NDJSON to `mcp-writes.ndjson`
- `handleUpdateConstraints(planningDir, params)` — validates, calls replaceSectionInFile('Constraints'), emitAll(cwd), logs NDJSON
- `handleUpdateTechStack(planningDir, params)` — identical pattern for 'Tech Stack' section

**TypeScript tool factories:**
- `src/tools/update-constraints.ts` — `updateConstraintsTool(planningDir)` factory following get-handoff.ts pattern
- `src/tools/update-tech-stack.ts` — `updateTechStackTool(planningDir)` factory
- `src/write-tools.ts` — `registerWriteTools(server, planningDir)` registers both tools

**Flag gate in index.ts:**
- `const enableWrites = process.argv.includes('--enable-writes');`
- Logs activation to stderr: `"pde-mcp-server: Write mode enabled — 4 write tools registered"`
- `if (enableWrites) { registerWriteTools(server, planningDir); }` — placed before server.connect()

## Decisions Made

1. **emitAll error isolation:** emitAll is wrapped in try/catch so handler always succeeds and logs the attempt. emitResult field captures `'ok:emitted=N'` or `'error:message'`.
2. **Lazy-load pattern:** getContextSync() follows getGenerateTailwindTheme() — avoids loading context-sync.cjs at require time, matches existing handlers.cjs convention.
3. **CRITICAL path followed:** `emitAll(cwd)` receives `path.dirname(planningDir)` (project root), not planningDir — per plan spec.
4. **replaceSectionInFile return check:** handler checks false return value to produce isError response when section not found.

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

All 11 Nyquist tests GREEN:

| Suite | Tests | Status |
|-------|-------|--------|
| INF-01: --enable-writes flag parsing | 2 | PASS |
| INF-02: handleUpdateConstraints | 7 | PASS |
| INF-03: handleUpdateTechStack | 2 | PASS |
| **Total** | **11** | **11/11 PASS** |

## Verification Passed

- `node tests/phase-131/test-mcp-write-tools.cjs` — 11/11 pass
- `npm run build` (packages/pde-mcp-server) — TypeScript build clean, no errors
- `grep -c 'enableWrites' src/index.ts` — returns 3 (>= 2 required)
- `grep -c 'handleUpdateConstraints\|handleUpdateTechStack\|appendMcpWriteLog' handlers.cjs` — returns 9 (>= 6 required)

## Known Stubs

None — both write tools are fully wired to replaceSectionInFile and emitAll.

## Commits

- `a8fff1d` — feat(131-01): add handleUpdateConstraints, handleUpdateTechStack, appendMcpWriteLog handlers
- `9a0cd88` — feat(131-01): add TypeScript tool factories, write-tools.ts entry, --enable-writes flag gate
