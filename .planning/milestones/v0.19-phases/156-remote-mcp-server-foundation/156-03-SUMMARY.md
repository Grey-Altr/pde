---
phase: 156-remote-mcp-server-foundation
plan: "03"
subsystem: api
tags: [mcp, redis, upstash, polling, next-server, after, pipeline, desktop-client]

requires:
  - phase: 156-01
    provides: server-factory.ts stub registerPipelineTools and mcp-handler install (created as prerequisite here)

provides:
  - start_pipeline_run MCP tool: writes Redis hash at pde:mcp:job:{uuid} with 1hr TTL, returns job_id immediately
  - check_pipeline_run MCP tool: reads Redis job state, returns job_not_found for unknown IDs
  - registerPipelineTools function exported from dashboard/lib/mcp/tools/pipeline-tools.ts
  - Desktop client config docs for Claude Code, Cursor, and legacy mcp-remote relay clients

affects:
  - 156-02 (imports registerPipelineTools via server-factory)
  - 157-webmcp-browser (builds on polling pattern)
  - 158-tool-handlers (pipeline tools are stub targets for real pipeline execution)

tech-stack:
  added:
    - mcp-handler@1.1.0
    - "@clerk/mcp-tools@0.3.1"
  patterns:
    - start/check polling pattern for long-running operations via Redis job store
    - after() from next/server for fire-and-forget background work within same maxDuration budget
    - Redis key pattern pde:mcp:job:{uuid} namespaced to avoid collisions
    - 1hr TTL auto-expiry for job cleanup without cron

key-files:
  created:
    - dashboard/lib/mcp/tools/pipeline-tools.ts
    - dashboard/lib/mcp/tools/index.ts
    - dashboard/lib/mcp/server-factory.ts
    - dashboard/lib/mcp/origin-guard.ts
    - dashboard/__tests__/mcp-polling-tools.test.ts
    - docs/mcp-desktop-client-config.md
  modified:
    - dashboard/package.json
    - dashboard/package-lock.json

key-decisions:
  - "Redis key pattern pde:mcp:job:{uuid} namespaced to avoid collisions with existing keys"
  - "TTL of 3600s (1hr) for auto-expiry — no cleanup cron needed for job store"
  - "after() executes stub work after HTTP response, within same maxDuration budget"
  - "Foundation files (server-factory, origin-guard) created here since Plan 01 runs in parallel wave"

patterns-established:
  - "Polling pattern: start tool returns job_id immediately, check tool polls Redis for completion"
  - "MCP tool registration: registerXxxTools(server) pattern, barrel-exported from tools/index.ts"
  - "Redis job store: hset for fields, expire for TTL, hgetall for retrieval"

requirements-completed:
  - RMT-06
  - RMT-07

duration: 7min
completed: "2026-03-28"
---

# Phase 156 Plan 03: Polling Tool Pair and Desktop Client Docs Summary

**start_pipeline_run/check_pipeline_run MCP tools using Upstash Redis job store with 1hr TTL, plus desktop client config docs for Claude Code, Cursor, and mcp-remote relay**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T11:05:30Z
- **Completed:** 2026-03-28T18:07:23Z
- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Two MCP polling tools registered via registerPipelineTools: start_pipeline_run (writes Redis hash + 1hr TTL, returns job_id immediately) and check_pipeline_run (reads Redis state, returns job_not_found for missing keys)
- 6 tests pass covering both tool handlers with mocked Redis and next/server after()
- Desktop client configuration docs created covering Claude Code (native HTTP), Cursor (native HTTP), and legacy clients (mcp-remote relay), with troubleshooting table

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement polling tool pair and tests** - `ecea160` (feat)
2. **Task 2: Create desktop client configuration documentation** - `31df716` (docs)

## Files Created/Modified

- `dashboard/lib/mcp/tools/pipeline-tools.ts` - start_pipeline_run and check_pipeline_run MCP tools
- `dashboard/lib/mcp/tools/index.ts` - barrel re-export of registerPipelineTools
- `dashboard/lib/mcp/server-factory.ts` - registerPdeTools factory (Plan 01 prereq, created here)
- `dashboard/lib/mcp/origin-guard.ts` - origin header validation (Plan 01 prereq, created here)
- `dashboard/__tests__/mcp-polling-tools.test.ts` - 6 tests with mocked Redis and after()
- `docs/mcp-desktop-client-config.md` - desktop client connection guide
- `dashboard/package.json` - mcp-handler@1.1.0 and @clerk/mcp-tools@0.3.1 added
- `dashboard/package-lock.json` - lockfile updated

## Decisions Made

- Redis key pattern `pde:mcp:job:{uuid}` — namespaced to avoid collisions with existing keys in Upstash
- TTL of 3600s auto-expiry — no cleanup cron required; jobs are ephemeral by design
- `after()` from next/server used for fire-and-forget stub work — executes after HTTP response within same maxDuration budget, does NOT extend function lifetime
- Foundation files (server-factory.ts, origin-guard.ts) created in this plan since Plan 01 runs in parallel wave under the orchestrator; these files are consistent with Plan 01's spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Plan 01 prerequisite foundation files**
- **Found during:** Task 1 (polling tools implementation)
- **Issue:** Plan 03 depends_on 156-01 which runs in a parallel wave. Files server-factory.ts, origin-guard.ts, and tools/index.ts were not yet created, blocking the pipeline-tools.ts import chain.
- **Fix:** Created server-factory.ts, origin-guard.ts, and tools/index.ts following the exact spec from 156-01-PLAN.md. Also installed mcp-handler@1.1.0 and @clerk/mcp-tools@0.3.1 per Plan 01 spec.
- **Files modified:** dashboard/lib/mcp/server-factory.ts, dashboard/lib/mcp/origin-guard.ts (created), dashboard/package.json
- **Verification:** Tests pass, import chain resolves correctly
- **Committed in:** ecea160 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — parallel wave prerequisite)
**Impact on plan:** Necessary to unblock Task 1. Files created exactly per Plan 01 spec, no scope creep.

## Issues Encountered

- SDK exports use `@modelcontextprotocol/sdk/server/mcp.js` path via `.*` wildcard export in package.json — resolved by checking package exports directly

## Known Stubs

- `after()` callback in start_pipeline_run uses a 2-second setTimeout stub instead of real pipeline execution — intentional per plan spec, real pipeline execution is Phase 158 target

## User Setup Required

None - no external service configuration required beyond what Plan 01 sets up (Upstash Redis env vars).

## Next Phase Readiness

- registerPipelineTools is wired and tested; Plan 02 (MCP HTTP route) can import server-factory.ts and call registerPdeTools
- Polling tools are stubs — Phase 158 will replace setTimeout with real pipeline execution
- Desktop client docs are complete for RMT-07

---
*Phase: 156-remote-mcp-server-foundation*
*Completed: 2026-03-28*
