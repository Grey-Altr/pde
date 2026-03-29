---
phase: 162-multi-editor-bridge
plan: 01
subsystem: api
tags: [mcp, relay, guard, typescript, vitest, mcp-bridge]

# Dependency graph
requires:
  - phase: 156-mcp-server-foundation
    provides: origin-guard.ts pattern and guardedHandler structure
provides:
  - relay-depth-guard.ts — validateRelayDepth + RELAY_DEPTH_LIMIT for circular relay prevention
  - pde_remote APPROVED_SERVERS entry in mcp-bridge.cjs for Claude Code bridge
affects: [162-02, 163-cursor-gemini-config]

# Tech tracking
tech-stack:
  added: []
  patterns: [relay-depth-header-guard, source-inspection-tests]

key-files:
  created:
    - dashboard/lib/mcp/relay-depth-guard.ts
    - dashboard/__tests__/mcp-relay-depth.test.ts
    - dashboard/__tests__/mcp-bridge-pde-remote.test.ts
  modified:
    - bin/lib/mcp-bridge.cjs

key-decisions:
  - "validateRelayDepth extracted to dashboard/lib/mcp/relay-depth-guard.ts (not inline in route.ts) to enable direct import for unit testing — mirrors origin-guard.ts pattern"
  - "Relay depth threshold is >= 1: depth 0 = first relay hop (Cursor/Gemini CLI intended use), depth 1 = circular attempt (rejected)"
  - "APPROVED_SERVERS key is pde_remote (underscore) to match mcp__pde_remote__ Claude Code tool prefix convention"
  - "pde_remote url uses NEXT_PUBLIC_APP_URL env var with null fallback — matches pencil/stitch pattern for deployment-dependent URLs"
  - "node_modules symlinked from canonical dashboard to worktree dashboard for test execution (parallel agent worktree pattern)"

patterns-established:
  - "Relay depth guard: header absent = allowed, depth 0 = allowed, depth >= 1 = 400 JSON"
  - "Guard order: validateOrigin -> validateRelayDepth -> authHandler (cheapest checks first)"
  - "Source inspection tests (readFileSync) for CJS modules that cannot be executed in vitest node environment"

requirements-completed: [MEB-02, MEB-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 162 Plan 01: Multi-Editor Bridge — Guard Module and APPROVED_SERVERS Summary

**X-PDE-Relay-Depth circular relay guard module and pde_remote APPROVED_SERVERS entry enabling Claude Code bridge routing to PDE remote MCP server**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T23:05:13Z
- **Completed:** 2026-03-28T23:08:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `relay-depth-guard.ts` with `validateRelayDepth` function that rejects X-PDE-Relay-Depth >= 1 with 400 JSON and allows null/0/NaN
- 7 unit tests covering all guard behaviors (absent, 0, 1, 5, garbage, JSON body, RELAY_DEPTH_LIMIT export)
- Added `pde_remote` entry to APPROVED_SERVERS in `mcp-bridge.cjs` with http transport, env-var URL, and `get_project_state` probe tool
- 5 source inspection tests verifying structural properties of the pde_remote entry

## Task Commits

1. **Task 1: Relay depth guard module and tests (MEB-02)** - `d49d6d3` (feat)
2. **Task 2: APPROVED_SERVERS pde_remote entry and source inspection test (MEB-03)** - `22ff055` (feat)

## Files Created/Modified

- `dashboard/lib/mcp/relay-depth-guard.ts` - RELAY_DEPTH_LIMIT constant and validateRelayDepth function; mirrors origin-guard.ts pattern
- `dashboard/__tests__/mcp-relay-depth.test.ts` - 7 unit tests for relay depth guard behaviors
- `dashboard/__tests__/mcp-bridge-pde-remote.test.ts` - 5 source inspection tests for pde_remote APPROVED_SERVERS entry
- `bin/lib/mcp-bridge.cjs` - Added pde_remote to APPROVED_SERVERS (http transport, env-var URL, get_project_state probe)

## Decisions Made

- `validateRelayDepth` is in a separate file (`relay-depth-guard.ts`) rather than inline in `route.ts` — this matches the `origin-guard.ts` pattern and allows direct import for unit testing without mocking the full route module.
- RELAY_DEPTH_LIMIT = 1: depth 0 is the intended first relay hop from Cursor/Gemini CLI; only depth >= 1 (relay-to-relay) is circular.
- APPROVED_SERVERS key `pde_remote` uses underscore to align with Claude Code's `mcp__pde_remote__*` tool prefix (hyphens become underscores in the prefix).
- `url: null` fallback follows the pencil/stitch/playwright pattern for deployment-dependent URLs; `NEXT_PUBLIC_APP_URL` provides the actual URL at runtime.

## Deviations from Plan

None - plan executed exactly as written. One infrastructure deviation handled automatically: worktree had no node_modules so a symlink was created from `dashboard/node_modules` to the canonical dashboard's node_modules to enable test execution. This is a worktree-parallel-agent operational pattern, not a code deviation.

## Issues Encountered

- Worktree `dashboard/node_modules` was absent — resolved by symlinking to canonical `dashboard/node_modules`. Tests ran successfully after symlink.

## Known Stubs

None — all exported functions are fully implemented and tested.

## Next Phase Readiness

- `validateRelayDepth` is ready for import into `dashboard/app/api/mcp/route.ts` in Plan 02
- `pde_remote` APPROVED_SERVERS entry is live; `assertApproved('pde_remote')` will succeed
- 12 tests pass green across both suites

---
*Phase: 162-multi-editor-bridge*
*Completed: 2026-03-28*
