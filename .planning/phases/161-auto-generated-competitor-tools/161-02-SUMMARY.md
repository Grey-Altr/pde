---
phase: 161-auto-generated-competitor-tools
plan: 02
subsystem: dashboard/browser-tools
tags: [webmcp, competitor-tools, browser-tools, hooks, barrel-export]

# Dependency graph
requires:
  - phase: 161-auto-generated-competitor-tools
    provides: "161-01: GET /api/planning/competitor-tools route serving approved registry entries"
  - phase: 157
    provides: "Module-level inputSchema pattern (zombie re-registration prevention)"
  - phase: 160
    provides: "useApprovalGateTool pattern (reference hook)"
provides:
  - "useCompetitorTools hook registering query_competitor_data WebMCP tool"
  - "Barrel export with 5 hooks (was 4)"
  - "Composite useWebMcpTools calling all 5 hooks"
  - "Source inspection test suite for competitor tools wiring"
affects:
  - Browser AI agents can now query approved competitor data via query_competitor_data WebMCP tool

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dispatcher pattern: single query_competitor_data WebMCP tool accepts competitor_name param (avoids hooks-in-loop violation for per-competitor tools)"
    - "Source inspection tests: readFileSync-based tests verify wiring without jsdom (consistent with Phase 157 pattern)"

key-files:
  created:
    - "dashboard/lib/mcp/browser-tools/use-competitor-tools.ts"
    - "dashboard/lib/__tests__/competitor-tools.test.ts"
  modified:
    - "dashboard/lib/mcp/browser-tools/index.ts"
    - "dashboard/hooks/use-webmcp-tools.ts"
    - "dashboard/__tests__/webmcp-browser-tools.test.ts"

key-decisions:
  - "Single dispatcher query_competitor_data tool accepts competitor_name param — avoids hooks-in-loop for dynamic per-competitor registration (D-04 resolution)"
  - "Worktree branch merged from main before task execution to include Phase 161-01 API route changes (prerequisite)"
  - "Test verification run from main dashboard (node_modules not in worktree) with files copied for test execution"

requirements-completed: [ADV-03, ADV-04]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 161 Plan 02: useCompetitorTools Hook and Wiring Summary

**useCompetitorTools hook registered as query_competitor_data WebMCP dispatcher tool, wired into barrel and composite hook, with full source inspection test coverage**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T22:41:42Z
- **Completed:** 2026-03-28T22:45:43Z
- **Tasks:** 2
- **Files modified:** 5 (1 new hook + 1 new test + 3 updated)

## Accomplishments

- Created `dashboard/lib/mcp/browser-tools/use-competitor-tools.ts` — single dispatcher `query_competitor_data` WebMCP tool accepting `competitor_name` param, fetches from `/api/planning/competitor-tools?name=` with `encodeURIComponent`
- `inputSchema` defined at module level (Phase 157 pattern, prevents zombie re-registrations)
- Only approved competitors are queryable — enforcement delegated to API route (returns 404/500 for non-approved entries)
- Created `dashboard/lib/__tests__/competitor-tools.test.ts` — 9 source inspection tests across 3 describe blocks: tool file structure, composite hook wiring, barrel export wiring
- Added `useCompetitorTools` as 5th export in `dashboard/lib/mcp/browser-tools/index.ts`
- Added `useCompetitorTools` to import and call in `dashboard/hooks/use-webmcp-tools.ts`
- Updated `dashboard/__tests__/webmcp-browser-tools.test.ts`: export count 4→5, added `useCompetitorTools` assertions in barrel and composite tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCompetitorTools hook and source inspection tests** — `5166e28` (feat)
2. **Task 2: Wire hook into barrel export, composite hook, and update existing test** — `0247deb` (feat)

## Files Created/Modified

- `dashboard/lib/mcp/browser-tools/use-competitor-tools.ts` — New hook: `query_competitor_data` WebMCP tool with module-level inputSchema, fetch to `/api/planning/competitor-tools?name=`, error handling for non-approved competitors
- `dashboard/lib/__tests__/competitor-tools.test.ts` — New test file: 9 source inspection tests verifying hook structure, composite wiring, barrel export
- `dashboard/lib/mcp/browser-tools/index.ts` — Added 5th export: `useCompetitorTools`
- `dashboard/hooks/use-webmcp-tools.ts` — Added `useCompetitorTools` import and `useCompetitorTools()` call
- `dashboard/__tests__/webmcp-browser-tools.test.ts` — Updated export count assertion 4→5, added competitor tools assertions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch out of date — missing Phase 161-01 API route**
- **Found during:** Pre-task setup (test infrastructure check)
- **Issue:** The worktree branch `worktree-agent-abf6211d` diverged from main at commit `4fccf32` and did not have Phase 161-01's changes (`dashboard/app/api/planning/competitor-tools/route.ts`). The `useCompetitorTools` hook references this API route, and the source inspection tests check for this path.
- **Fix:** Merged `main` into the worktree branch via fast-forward (`git merge main`), bringing in Phase 161-01's 8 changed files.
- **Files modified:** None (merge only)

**2. [Rule 3 - Blocking] No node_modules in worktree — test verification required main dashboard**
- **Found during:** Task 1 verification
- **Issue:** The worktree dashboard has no `node_modules` directory; vitest cannot load `@vitejs/plugin-react` from the worktree's config. The plan's verify command references the main dashboard path.
- **Fix:** Copied new/modified files to the main dashboard before running `npx vitest run`. Tests ran from the main dashboard successfully (43 test files, 356 tests, 0 failures).
- **Impact:** Files were committed to the worktree branch as intended; the main dashboard copies were only for test verification.

## Known Stubs

None — `query_competitor_data` handler makes real fetch calls to the API route. The API route (from Plan 01) reads from the real registry file. No hardcoded/mock data.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `dashboard/lib/mcp/browser-tools/use-competitor-tools.ts` | FOUND |
| `dashboard/lib/__tests__/competitor-tools.test.ts` | FOUND |
| `dashboard/lib/mcp/browser-tools/index.ts` contains `useCompetitorTools` | FOUND |
| `dashboard/hooks/use-webmcp-tools.ts` contains `useCompetitorTools()` | FOUND |
| `dashboard/__tests__/webmcp-browser-tools.test.ts` contains `toBe(5)` | FOUND |
| Commit `5166e28` (Task 1) | FOUND |
| Commit `0247deb` (Task 2) | FOUND |
| Full vitest suite: 43 files, 356 tests, 0 failures | PASSED |
