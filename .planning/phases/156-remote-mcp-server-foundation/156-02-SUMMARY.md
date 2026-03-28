---
phase: 156-remote-mcp-server-foundation
plan: 02
subsystem: api
tags: [mcp, clerk, oauth, nextjs, vercel, streamable-http, well-known, rfc-9728]

# Dependency graph
requires:
  - phase: 156-01
    provides: registerPdeTools (McpServer tool registration) and validateOrigin (allowlist-based origin guard)

provides:
  - Streamable HTTP MCP endpoint at /api/mcp with Clerk OAuth Bearer auth
  - RFC 9728 OAuth protected resource metadata at /.well-known/oauth-protected-resource/mcp
  - Clerk AS metadata at /.well-known/oauth-authorization-server
  - proxy.ts PUBLIC_ROUTES bypass for all three MCP paths
  - Test suite for route shape, auth config, and .well-known exports (15 passing tests)

affects:
  - 156-03: MCP polling tool tests will import from /api/mcp handler
  - 157: useMcpTool() hook connects to /api/mcp endpoint
  - 162: relay depth detection reads well-known endpoints

# Tech tracking
tech-stack:
  added: [mcp-handler, @clerk/mcp-tools/next, @modelcontextprotocol/sdk]
  patterns:
    - Streamable HTTP with createMcpHandler + withMcpAuth wrapper pattern
    - Origin guard runs before auth handler on every request type
    - acceptsToken='oauth_token' required for Clerk OAuth (not default session tokens)
    - force-dynamic + maxDuration=300 for Vercel Fluid Compute MCP routes

key-files:
  created:
    - dashboard/app/api/mcp/route.ts
    - dashboard/app/.well-known/oauth-protected-resource/mcp/route.ts
    - dashboard/app/.well-known/oauth-authorization-server/route.ts
    - dashboard/__tests__/mcp-route.test.ts
    - dashboard/__tests__/mcp-auth.test.ts
    - dashboard/__tests__/mcp-well-known.test.ts
    - dashboard/lib/mcp/server-factory.ts (stub — Plan 01 overwrites)
    - dashboard/lib/mcp/origin-guard.ts (stub — Plan 01 overwrites)
  modified:
    - dashboard/proxy.ts (added 3 PUBLIC_ROUTES entries)

key-decisions:
  - "MCP route uses acceptsToken='oauth_token' not default — plain auth() returns session tokens which MCP clients cannot provide"
  - "Origin guard wraps auth handler so bad-origin requests are rejected before any Clerk processing"
  - "Stub lib/mcp files created to unblock test isolation — Plan 01 will overwrite with full implementations"

patterns-established:
  - "Streamable HTTP MCP: createMcpHandler -> withMcpAuth wrapper -> guardedHandler with origin check"
  - ".well-known routes: always export GET + OPTIONS, use Clerk helper functions directly"
  - "PUBLIC_ROUTES in proxy.ts is the canonical bypass list for all Bearer-token routes"

requirements-completed: [RMT-01, RMT-02, RMT-04]

# Metrics
duration: 12min
completed: 2026-03-28
---

# Phase 156 Plan 02: MCP Route Handler and OAuth Metadata Summary

**Streamable HTTP MCP endpoint at /api/mcp with Clerk OAuth auth, RFC 9728 .well-known discovery routes, and 15-test suite verifying export shapes and auth wiring**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-28T18:00:00Z
- **Completed:** 2026-03-28T18:07:30Z
- **Tasks:** 2
- **Files modified:** 9 (4 created, 3 test files, 2 stubs, 1 proxy update)

## Accomplishments

- Created `/api/mcp` Streamable HTTP endpoint with `createMcpHandler` + `withMcpAuth`, origin guard runs first
- Created `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server` RFC 9728 metadata endpoints
- Added all three paths to `proxy.ts PUBLIC_ROUTES` so Clerk middleware doesn't block MCP OAuth Bearer tokens
- Implemented 15-test suite covering route exports, static config, and full auth wiring (acceptsToken, resourceMetadataPath)

## Task Commits

1. **Task 1: MCP route handler, .well-known endpoints, proxy update** - `94f0c6b` (feat)
2. **Task 2: Tests for route, auth, and .well-known** - `fa0e861` (test)

## Files Created/Modified

- `dashboard/app/api/mcp/route.ts` - Streamable HTTP MCP endpoint with guardedHandler (origin check + withMcpAuth)
- `dashboard/app/.well-known/oauth-protected-resource/mcp/route.ts` - RFC 9728 protected resource metadata
- `dashboard/app/.well-known/oauth-authorization-server/route.ts` - Clerk OAuth AS metadata
- `dashboard/proxy.ts` - Added /api/mcp and both .well-known paths to PUBLIC_ROUTES
- `dashboard/__tests__/mcp-route.test.ts` - Tests: GET/POST/DELETE exports, dynamic, maxDuration
- `dashboard/__tests__/mcp-auth.test.ts` - Tests: withMcpAuth wiring, acceptsToken=oauth_token
- `dashboard/__tests__/mcp-well-known.test.ts` - Tests: GET+OPTIONS exports on both .well-known routes
- `dashboard/lib/mcp/server-factory.ts` - Stub (Plan 01 overwrites with full tool registration)
- `dashboard/lib/mcp/origin-guard.ts` - Stub (Plan 01 overwrites with allowlist validation)

## Decisions Made

- `acceptsToken: 'oauth_token'` is required — plain `auth()` only accepts Clerk session cookies, not OAuth Bearer tokens sent by MCP clients
- Origin guard placed before `authHandler` in `guardedHandler` so invalid origins get 403 before any Clerk token processing
- Stub files created for `lib/mcp/server-factory.ts` and `lib/mcp/origin-guard.ts` to enable test isolation while Plan 01 runs in parallel (wave 1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created stub lib/mcp files for test isolation**
- **Found during:** Task 2 (test implementation)
- **Issue:** Plan 01 (wave 1) creates `lib/mcp/server-factory.ts` and `lib/mcp/origin-guard.ts`. These files did not exist in the worktree, causing vitest to fail with `ERR_MODULE_NOT_FOUND` even though the mocks were declared — Vitest resolves the physical path before applying `vi.mock()`
- **Fix:** Created minimal stub implementations with the correct exported function signatures per the `<interfaces>` spec in this plan. Stubs are clearly documented as placeholders for Plan 01.
- **Files modified:** `dashboard/lib/mcp/server-factory.ts`, `dashboard/lib/mcp/origin-guard.ts`
- **Verification:** All 15 tests pass after stubs added
- **Committed in:** `fa0e861` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix essential for test execution in parallel wave structure. No scope creep. Plan 01 will overwrite stubs with production implementations.

## Issues Encountered

- `dashboard/node_modules` not present in worktree — ran `npm install` before tests (standard parallel agent setup)

## Known Stubs

- `dashboard/lib/mcp/server-factory.ts:6` — `registerPdeTools()` is a no-op stub. Plan 01 provides full implementation with McpServer tool registration.
- `dashboard/lib/mcp/origin-guard.ts:7` — `validateOrigin()` always returns null (allow all). Plan 01 provides full allowlist-based implementation.

## Next Phase Readiness

- /api/mcp route handler ready for MCP client connections (pending Plan 01's registerPdeTools)
- .well-known endpoints ready for OAuth discovery
- proxy.ts bypass complete — no Clerk middleware interference with MCP OAuth tokens
- Test suite established — Plan 01 can run server-factory/origin-guard tests independently

---
*Phase: 156-remote-mcp-server-foundation*
*Completed: 2026-03-28*
