---
phase: 121-mcp-server
generated: "2026-03-23T00:00:00Z"
finding_count: 5
high_count: 2
has_bdd_candidates: true
---

# Phase 121: Edge Cases

**Generated:** 2026-03-23
**Findings:** 5 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] get-tokens fails silently when tokens path in manifest is relative vs absolute

**Plan element:** `packages/pde-mcp-server/src/tools/get-tokens.ts`
**Category:** error_path

The get-tokens handler reads `manifest?.artifacts?.tokens` to find the tokens file path. If this path is relative, it must be resolved against the project root (not process.cwd()). The action describes reading the tokens path directly from the manifest and passing to safeReadFile without specifying relative-path resolution logic. If the path is stored relative to .planning/, reading it from an unresolved cwd will silently fail with isError: true even when the file exists.

**BDD Acceptance Criteria Candidate:**
```
Given a design-manifest.json with tokens artifact path stored as relative (e.g. "design/tokens.json")
When the get-tokens handler is invoked with a valid planningDir
Then the handler resolves the path relative to planningDir (not process.cwd()) and returns the @theme block
```

### 2. [HIGH] handlers.cjs import path from src/index.ts is not specified — CJS/ESM boundary left unresolved

**Plan element:** `packages/pde-mcp-server/handlers.cjs`
**Category:** error_path

Task 2 finalizes its test approach by saying "create handlers.cjs" but does not specify the exact import path used in src/index.ts (TypeScript ESM). The action says "The TypeScript src/index.ts imports it via createRequire" but does not state whether this is `./handlers.cjs` (relative to src/?) or `../handlers.cjs` (one level up from src/). An incorrect relative path in the createRequire call will cause a runtime crash at server startup — a visibly failing state transition not covered by any test fixture.

**BDD Acceptance Criteria Candidate:**
```
Given a compiled dist/index.js that imports handlers.cjs via createRequire
When the server is started with node dist/index.js --planning-dir .planning
Then the server starts without MODULE_NOT_FOUND errors and registers all 10 tools
```

### 3. [MEDIUM] discoverPlanningDir returns null when editor spawns server from home directory

**Plan element:** `packages/pde-mcp-server/src/discover.ts`
**Category:** boundary_condition

The walk-up algorithm stops after 10 levels. If an MCP editor spawns the server process from a deeply nested system directory (or from ~ on macOS where the project root is 3+ levels deeper than the 10-level cap), discovery returns null and the server exits. The --planning-dir CLI override is documented as a fallback but the done criteria only checks that "discoverPlanningDir works for direct, ancestor, and missing cases" — it does not test the 10-level boundary explicitly.

### 4. [MEDIUM] get-handoff directory listing fails when handoff/ directory does not exist

**Plan element:** `packages/pde-mcp-server/src/tools/get-handoff.ts`
**Category:** empty_state

When get-handoff is called without a name param, the handler reads the `design/handoff/` directory and returns a list. The action does not specify error handling for when the `handoff/` directory is absent (new projects before any handoff is generated). `fs.readdirSync` on a missing directory throws; the test coverage only addresses "isError: true when files are missing" for named files, not for directory listing failures.

### 5. [LOW] pipeline-status resource returns null fields rather than informative message when design artifacts not yet generated

**Plan element:** `packages/pde-mcp-server/src/resources/pipeline-status.ts`
**Category:** empty_state

The resource returns `{ designState: null, manifest: null }` when DESIGN-STATE.md and design-manifest.json don't exist. Editors subscribing to this resource as ambient context may display empty or malformed data. A more informative empty state (e.g. `{ designState: "No design pipeline initiated", manifest: null, hint: "Run /pde:design to start" }`) would be more useful but this is advisory only with no correctness impact.
