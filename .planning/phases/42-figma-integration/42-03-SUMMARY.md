---
phase: 42-figma-integration
plan: "03"
subsystem: workflows
tags: [figma, mcp, wireframe, handoff, code-connect, sub-workflow]

# Dependency graph
requires:
  - phase: 42-01
    provides: Figma TOOL_MAP entries, connect.md Step 3.8, mcp-bridge.cjs bridge.call pattern for figma tools

provides:
  - wireframe-figma-context.md sub-workflow fetching Figma design context via bridge.call('figma:get-design-context')
  - handoff-figma-codeConnect.md sub-workflow fetching Code Connect map via bridge.call('figma:get-code-connect-map')
  - wireframe.md Step 1.5/7 hook calling wireframe-figma-context sub-workflow
  - handoff.md Step 1.5/7 hook calling handoff-figma-codeConnect sub-workflow
  - tests/phase-42/wireframe-figma-workflow.test.mjs (7 assertions for FIG-02)
  - tests/phase-42/handoff-figma-workflow.test.mjs (9 assertions for FIG-03)

affects: [wireframe, handoff, figma-integration, FIG-02, FIG-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Sub-workflow delegation from wireframe.md and handoff.md to Figma-specific sub-workflows using @workflows/ references
    - Figma connection check pattern using b.loadConnections() + b.call() in bash block, graceful degradation when not connected
    - Empty map degraded mode with user-facing setup guidance (@figma/code-connect CLI)

key-files:
  created:
    - workflows/wireframe-figma-context.md
    - workflows/handoff-figma-codeConnect.md
    - tests/phase-42/wireframe-figma-workflow.test.mjs
    - tests/phase-42/handoff-figma-workflow.test.mjs
  modified:
    - workflows/wireframe.md
    - workflows/handoff.md

key-decisions:
  - "wireframe-figma-context sub-workflow uses bridge.call('figma:get-design-context') not raw MCP name — consistent with Phase 40/41 adapter pattern"
  - "Figma context is optional for wireframe — sub-workflow degrades to empty FIGMA_DESIGN_CONTEXT, parent pipeline continues unchanged"
  - "handoff-figma-codeConnect treats empty Code Connect map as valid degraded state — no error, provides @figma/code-connect setup guidance"
  - "Both hooks are skippable via --no-mcp flag (wireframe additionally skips with --quick)"

patterns-established:
  - "Sub-workflow injection pattern: parent workflow calls sub-workflow via @workflows/sub-workflow.md reference in a numbered step"
  - "Figma connection gate: all Figma sub-workflows check status + fileUrl before attempting MCP calls"

requirements-completed: [FIG-02, FIG-03]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 42 Plan 03: Figma Sub-Workflows for Wireframe Context and Handoff Code Connect Summary

**Figma design context injection into wireframe (FIG-02) and Code Connect table enrichment into handoff (FIG-03) via two new gracefully-degrading sub-workflows**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T05:22:44Z
- **Completed:** 2026-03-19T05:24:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `wireframe-figma-context.md` sub-workflow that fetches Figma design context via `bridge.call('figma:get-design-context')` and returns it as `FIGMA_DESIGN_CONTEXT` for wireframe generation reference
- Created `handoff-figma-codeConnect.md` sub-workflow that fetches Code Connect map via `bridge.call('figma:get-code-connect-map')` and formats it as a `| Figma Node ID | Component | Source Path |` table
- Added Step 1.5/7 hooks to both `wireframe.md` and `handoff.md` to call their respective sub-workflows (skippable via `--no-mcp`/`--quick`)
- Created TDD tests in RED state first (Task 1), then implemented workflows to turn GREEN (Task 2) — 7/7 and 9/9 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 tests for FIG-02 and FIG-03 (RED)** - `c411624` (test)
2. **Task 2: Create sub-workflows and inject hooks into wireframe/handoff (GREEN)** - `d5589f2` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 was TDD RED state commit; Task 2 turned both test suites GREEN._

## Files Created/Modified

- `workflows/wireframe-figma-context.md` — Sub-workflow: checks Figma connection, calls `figma:get-design-context` via bridge, returns design context or empty string with degraded note
- `workflows/handoff-figma-codeConnect.md` — Sub-workflow: checks Figma connection, calls `figma:get-code-connect-map` via bridge, formats response as markdown table, handles empty map with @figma/code-connect setup guidance
- `workflows/wireframe.md` — Added Step 1.5/7 calling `@workflows/wireframe-figma-context.md` (skipped with `--no-mcp` or `--quick`)
- `workflows/handoff.md` — Added Step 1.5/7 calling `@workflows/handoff-figma-codeConnect.md` (skipped with `--no-mcp`)
- `tests/phase-42/wireframe-figma-workflow.test.mjs` — 7 assertions for FIG-02 structure
- `tests/phase-42/handoff-figma-workflow.test.mjs` — 9 assertions for FIG-03 structure

## Decisions Made

- Both sub-workflows use `bridge.call()` for tool name lookup — never hardcode `mcp__figma__*` names directly in workflow files (Phase 40/41 adapter pattern)
- Figma context is non-blocking for both wireframe and handoff — if Figma is not connected, both parent workflows continue without interruption
- Empty `get_code_connect_map` response produces user-facing guidance about `@figma/code-connect` CLI setup rather than an error
- `--no-mcp` skips both hooks; `--quick` additionally skips the wireframe context hook for speed

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FIG-02 and FIG-03 sub-workflows are complete and tested
- Phase 42 may continue with FIG-04 (mockup-export-figma.md)
- All Phase 41 tests (84 tests) continue to pass

---
*Phase: 42-figma-integration*
*Completed: 2026-03-19*
