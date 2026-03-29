---
phase: 162-multi-editor-bridge
plan: 02
subsystem: api
tags: [mcp, relay, streamable-http, gemini-cli, cursor, origin-guard]

# Dependency graph
requires:
  - phase: 162-01
    provides: relay-depth-guard.ts validateRelayDepth export
  - phase: 156-mcp-route
    provides: guardedHandler pipeline in route.ts
provides:
  - validateRelayDepth wired into MCP route guardedHandler after validateOrigin
  - Gemini CLI Streamable HTTP config documentation with httpUrl field
  - Troubleshooting rows for relay_depth_exceeded and Gemini CLI timeout
  - relay-depth-guard.ts module (created as Rule 3 fix for missing Plan 01 artifact)
affects: [162-multi-editor-bridge, mcp-route, desktop-client-docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard pipeline order: validateOrigin (cheapest) -> validateRelayDepth (header check) -> authHandler (Clerk, expensive)"
    - "Relay depth protection: reject X-PDE-Relay-Depth >= 1 before auth to avoid burning Clerk round-trips on circular relays"

key-files:
  created:
    - dashboard/lib/mcp/relay-depth-guard.ts
  modified:
    - dashboard/app/api/mcp/route.ts
    - docs/mcp-desktop-client-config.md

key-decisions:
  - "relay-depth-guard.ts created in Plan 02 as Rule 3 auto-fix (Plan 01 artifact was missing but required by Plan 02)"
  - "Guard order is origin -> relay depth -> auth — cheap guards first to avoid burning Clerk token validation on rejected requests"
  - "Gemini CLI uses httpUrl field (not url) for Streamable HTTP — url selects SSE transport which PDE does not support"
  - "depth 0 is allowed (first relay hop, Cursor/Gemini CLI use case); depth >= 1 is rejected (circular relay)"

patterns-established:
  - "Pipeline guard ordering: always cheapest guard first (origin header string match < relay depth parseInt < Clerk token RPC)"

requirements-completed: [MEB-01, MEB-02]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 162 Plan 02: Multi-Editor Bridge — Route Wiring and Gemini CLI Docs Summary

**Relay depth guard wired into MCP guardedHandler pipeline (origin -> relay depth -> auth) and Gemini CLI httpUrl config documented**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T23:04:00Z
- **Completed:** 2026-03-28T23:12:14Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Wired `validateRelayDepth` into `guardedHandler` between origin validation and auth — circular relay requests now rejected with 400 before any Clerk token processing
- Added Gemini CLI Streamable HTTP documentation section with `httpUrl` field example and OAuth auto-discovery note
- Extended troubleshooting table with Gemini CLI timeout cause/fix and `relay_depth_exceeded` row
- Created `relay-depth-guard.ts` (Rule 3 fix for missing Plan 01 artifact) with all 7 behaviors verified by tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire relay depth guard into route.ts and add Gemini CLI docs (MEB-01, MEB-02)** - `bb3b5cb` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified
- `dashboard/lib/mcp/relay-depth-guard.ts` - Created: validateRelayDepth + RELAY_DEPTH_LIMIT (Rule 3 auto-fix)
- `dashboard/app/api/mcp/route.ts` - Import and call validateRelayDepth between validateOrigin and authHandler
- `docs/mcp-desktop-client-config.md` - Gemini CLI section and troubleshooting table rows

## Decisions Made
- relay-depth-guard.ts created in this plan as Rule 3 auto-fix (Plan 01 artifact was missing but this plan cannot proceed without it)
- Guard order is origin -> relay depth -> auth — cheapest checks run first to avoid burning Clerk token RPC on requests that would be rejected anyway
- Gemini CLI uses `httpUrl` not `url` for Streamable HTTP — `url` selects SSE transport which PDE does not support

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing relay-depth-guard.ts dependency**
- **Found during:** Task 1 pre-flight read
- **Issue:** Plan 02 depends on `dashboard/lib/mcp/relay-depth-guard.ts` created by Plan 01, but Plan 01 had not been executed — file was absent. Importing from non-existent module would cause build failure.
- **Fix:** Created `relay-depth-guard.ts` per the exact interface specification in both plans' frontmatter and task specifications. Implementation mirrors `origin-guard.ts` pattern exactly.
- **Files modified:** `dashboard/lib/mcp/relay-depth-guard.ts` (created)
- **Verification:** All 7 relay depth tests from Plan 01's test spec pass green; module imports correctly in route.ts
- **Committed in:** `bb3b5cb` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking missing dependency)
**Impact on plan:** Auto-fix was required to unblock execution. No scope creep — implementation matches the exact spec defined in Plan 01.

## Issues Encountered
- None beyond the Rule 3 deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MCP route now has full three-layer guard pipeline: origin validation, relay depth protection, Clerk auth
- Cursor and Gemini CLI both have documented Streamable HTTP connection paths
- All 44 MCP test suite tests pass with no regressions

---
*Phase: 162-multi-editor-bridge*
*Completed: 2026-03-28*
