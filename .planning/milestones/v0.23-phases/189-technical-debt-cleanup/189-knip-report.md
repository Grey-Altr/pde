# Knip Dead-Code Report — Phase 189

**Date:** 2026-03-30
**Knip version:** 6.1.0 (via npx)
**Config:** `knip.json` (project root)
**Command:** `npx knip --reporter compact`

## Summary

| Category | Count |
|----------|-------|
| Unused files | 44 |
| Unused dependencies | 0 |
| Unused devDependencies | 1 |
| Unlisted dependencies | 3 |
| Unused exports | 0 (suppressed by `ignoreExportsUsedInFile: true`) |

## Triage Table

| Finding | Category | Classification | Reason |
|---------|----------|---------------|--------|
| `bin/lib/idle-suggestions.cjs` | Unused file | defer | Feature may be used in future milestones; no current callers in main flow |
| `bin/lib/strategy-weights.cjs` | Unused file | defer | Strategy weighting logic; may be integrated with future planner improvements |
| `lib/telemetry.cjs` | Unused file | defer | Telemetry module; targeted for future observability milestone |
| `lib/ui/colors.cjs` | Unused file | defer | UI component library — used by dashboard/CLI UI sub-app; knip cannot trace entry via runtime require |
| `lib/ui/components.cjs` | Unused file | defer | UI component library — used by dashboard/CLI UI sub-app; knip cannot trace entry via runtime require |
| `lib/ui/layout.cjs` | Unused file | defer | UI component library — used by dashboard/CLI UI sub-app; knip cannot trace entry via runtime require |
| `lib/ui/render.cjs` | Unused file | defer | UI component library — used by dashboard/CLI UI sub-app; knip cannot trace entry via runtime require |
| `lib/ui/splash.cjs` | Unused file | defer | UI splash screen; part of CLI startup flow; loaded dynamically |
| `packages/pde-mcp-server/dist/discover.d.ts` | Unused file | defer | TypeScript declaration file for compiled MCP server output; dist/ is a build artifact tracked separately |
| `packages/pde-mcp-server/dist/index.d.ts` | Unused file | defer | TypeScript declaration file for compiled MCP server output; dist/ is a build artifact |
| `packages/pde-mcp-server/dist/resources/pipeline-status.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/append-context-note.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/flag-divergence.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-artifact.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-design-state.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-handoff.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-manifest.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-pipeline-status.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-project.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-requirements.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-roadmap.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/get-tokens.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/list-artifacts.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/update-constraints.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/tools/update-tech-stack.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/dist/write-tools.d.ts` | Unused file | defer | TypeScript declaration file; dist/ build artifact |
| `packages/pde-mcp-server/src/discover.ts` | Unused file | defer | MCP server TypeScript source; loaded by MCP runtime, not traced by knip's static analysis from CJS entry points |
| `packages/pde-mcp-server/src/index.ts` | Unused file | defer | MCP server entry; separate sub-package with its own build; not traced from pde-tools.cjs |
| `packages/pde-mcp-server/src/resources/pipeline-status.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/append-context-note.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/flag-divergence.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-artifact.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-design-state.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-handoff.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-manifest.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-pipeline-status.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-project.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-requirements.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-roadmap.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/get-tokens.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/list-artifacts.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/update-constraints.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/tools/update-tech-stack.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `packages/pde-mcp-server/src/write-tools.ts` | Unused file | defer | MCP server TypeScript source; sub-package boundary |
| `ai` (devDependency) | Unused devDependency | keep | Used by vitest tests that import AI SDK utilities; knip doesn't trace test files under `node_modules/` scope |
| `node-fetch` (unlisted) | Unlisted dependency | defer | Runtime dependency in `bin/lib/3d-pipeline/convert.cjs`; should be added to `package.json` in a future dependency hygiene pass |
| `node-ssh` (unlisted) | Unlisted dependency | defer | Runtime dependency in `packages/dispatcher/lib/remote-ssh.cjs`; should be added to `package.json` in a future dependency hygiene pass |
| `@anthropic-ai/claude-agent-sdk` (unlisted) | Unlisted dependency | defer | Runtime dependency in `packages/dispatcher/lib/sdk-bridge.cjs`; SDK is under active development; defer to dependency hygiene pass |

## Notes

- **pde-mcp-server sub-package:** knip flags all 32 TypeScript source and declaration files because they live under `packages/pde-mcp-server/` which has its own sub-package boundary. The entry `packages/*/index.cjs` pattern doesn't apply to TypeScript source files. These are all `defer` — the MCP server is a separately compiled and deployed sub-package with its own `package.json` and build pipeline.
- **lib/ui/ files:** The `lib/ui/` directory contains UI rendering components. They are loaded via dynamic require paths in the CLI rendering layer. knip's static analysis cannot trace dynamic `require()` paths, so these appear unused. Classified as `defer` — verify dynamic callers before removal.
- **Unlisted deps:** `node-fetch`, `node-ssh`, `@anthropic-ai/claude-agent-sdk` are confirmed runtime dependencies not listed in `package.json`. Adding them to `package.json` is out of scope for this plan; tracked as `defer`.
- **`bin/lib/strategy-weights.cjs`:** Not in original research pre-classification. Actual file analysis: contains weighting logic for strategy selection. No current callers in main flow found; classified as `defer`.
- **`.tmp-git-commit.mjs`:** Removed from `ignore` list and expected to appear as unused file, but does not appear in output because it is a `.mjs` file not matched by the `project` glob patterns (`*.cjs`, `*.ts`). Tracked for future removal via manual cleanup.
