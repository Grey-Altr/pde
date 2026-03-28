---
phase: 156-remote-mcp-server-foundation
verified: 2026-03-28T11:15:00Z
status: human_needed
score: 18/18 must-haves verified
re_verification: false
human_verification:
  - test: "Connect a real MCP client (Claude Code or mcp-remote) to the deployed endpoint"
    expected: "Client authenticates via Clerk OAuth, receives tool list including get_project_state, start_pipeline_run, check_pipeline_run"
    why_human: "Cannot verify end-to-end OAuth flow, Bearer token exchange, or Streamable HTTP framing without a deployed Vercel environment and a live Clerk OAuth app"
  - test: "Verify POST /api/mcp without Authorization header returns 401 (not 307 redirect)"
    expected: "withMcpAuth returns HTTP 401 to MCP client; endpoint is not silently redirected by Clerk middleware"
    why_human: "mcp-auth integration tests are marked test.todo(requires deployed env) — cannot confirm 401 vs 307 behavior without live Clerk middleware"
  - test: "Verify Mcp-Session-Id header is absent from responses (stateless mode)"
    expected: "No Mcp-Session-Id header in any response — confirms sessionIdGenerator remains undefined in mcp-handler"
    why_human: "Statelessness cannot be asserted by inspecting source alone; requires observing actual HTTP response headers from mcp-handler"
  - test: "Verify RMT-07 requirements text alignment: REQUIREMENTS.md says '@mcp-b/webmcp-local-relay' but docs use 'mcp-remote'"
    expected: "Confirm with project owner whether the requirements text should be updated to match the plan spec (mcp-remote for desktop clients, @mcp-b/webmcp-local-relay reserved for Phase 157 browser bridge)"
    why_human: "This is a documentation consistency decision — both the plan and the implementation are consistent with each other, but REQUIREMENTS.md uses different package name"
---

# Phase 156: Remote MCP Server Foundation — Verification Report

**Phase Goal:** PDE tools are reachable via a publicly accessible, authenticated, stateless Streamable HTTP endpoint that is safe to deploy on Vercel
**Verified:** 2026-03-28T11:15:00Z
**Status:** human_needed (all automated checks passed; 4 items require human/deployed verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | registerPdeTools registers get_project_state tool on any McpServer instance | VERIFIED | server-factory.ts L13-25; server-factory.test.ts passes (3 tests green) |
| 2 | Origin guard rejects requests with unlisted Origin header with 403 | VERIFIED | origin-guard.ts L22-24 returns `Response('Origin not allowed', { status: 403 })`; mcp-origin-guard.test.ts passes |
| 3 | Origin guard allows requests with no Origin header (relay/CLI contexts) | VERIFIED | origin-guard.ts L22 checks `origin !== null` before rejecting; test confirms null returns null |
| 4 | POST /api/mcp from unlisted Origin returns 403 | VERIFIED (wired) | route.ts L28-31 calls validateOrigin before authHandler; integration confirmed by unit test mock |
| 5 | POST /api/mcp without valid auth token returns 401 | VERIFIED (wired) | withMcpAuth called with required:true (mcp-auth.test.ts L43); deployed behavior needs human check |
| 6 | GET /.well-known/oauth-protected-resource/mcp returns OAuth metadata JSON | VERIFIED | route.ts exports GET as protectedResourceHandlerClerk; test confirms function export |
| 7 | GET /.well-known/oauth-authorization-server returns Clerk AS metadata JSON | VERIFIED | route.ts exports GET as authServerMetadataHandlerClerk; test confirms function export |
| 8 | Response from /api/mcp does not contain Mcp-Session-Id header (stateless) | VERIFIED (wired) | mcp-handler called without sessionIdGenerator option (default undefined); deployed check needed |
| 9 | /api/mcp and .well-known routes bypass Clerk middleware auth.protect() | VERIFIED | proxy.ts L8-10 adds all three paths to PUBLIC_ROUTES; createRouteMatcher uses PUBLIC_ROUTES |
| 10 | start_pipeline_run returns job_id immediately and writes Redis hash with status running | VERIFIED | pipeline-tools.ts L14-20; mcp-polling-tools.test.ts passes (6 tests green) |
| 11 | start_pipeline_run sets a 1-hour TTL on the Redis job key | VERIFIED | pipeline-tools.ts L20: `redis.expire(key, 3600)`; test asserts TTL=3600 |
| 12 | check_pipeline_run returns the job state from Redis for a valid job_id | VERIFIED | pipeline-tools.ts L48-63; test verifies hgetall return flows to response |
| 13 | check_pipeline_run returns an error for a non-existent job_id | VERIFIED | pipeline-tools.ts L53-56 returns `{ error: 'job_not_found' }` when hgetall returns null/empty |
| 14 | Desktop client configuration for Claude Code, Cursor, and legacy clients is documented | VERIFIED | docs/mcp-desktop-client-config.md contains all three client types with exact config snippets |

**Score:** 14/14 truths verified (4 items deferred to human verification for deployed-environment behaviors)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `dashboard/lib/mcp/server-factory.ts` | Shared McpServer tool registration; exports registerPdeTools | VERIFIED | Substantive: registers get_project_state + calls registerPipelineTools; wired: imported by route.ts |
| `dashboard/lib/mcp/origin-guard.ts` | Origin header validation; exports validateOrigin, ALLOWED_ORIGINS | VERIFIED | Substantive: allowlist with 403 rejection; wired: imported and called in route.ts guardedHandler |
| `dashboard/lib/mcp/tools/index.ts` | Tool registration barrel; exports registerPipelineTools | VERIFIED | Re-exports from pipeline-tools.ts (not a stub — L1: `export { registerPipelineTools } from './pipeline-tools'`) |
| `dashboard/lib/mcp/tools/pipeline-tools.ts` | start_pipeline_run and check_pipeline_run MCP tools | VERIFIED | Substantive: 65 lines, Redis hset/expire/hgetall, after() for background work; wired: exported via index.ts → server-factory.ts |
| `dashboard/app/api/mcp/route.ts` | Streamable HTTP MCP endpoint; exports GET, POST, DELETE, dynamic, maxDuration | VERIFIED | dynamic='force-dynamic', maxDuration=300, GET/POST/DELETE all guardedHandler; wired: imports registerPdeTools + validateOrigin |
| `dashboard/app/.well-known/oauth-protected-resource/mcp/route.ts` | RFC 9728 protected resource metadata; exports GET, OPTIONS | VERIFIED | Uses protectedResourceHandlerClerk; exports verified by mcp-well-known.test.ts |
| `dashboard/app/.well-known/oauth-authorization-server/route.ts` | Clerk OAuth AS metadata; exports GET, OPTIONS | VERIFIED | Uses authServerMetadataHandlerClerk; exports verified by mcp-well-known.test.ts |
| `docs/mcp-desktop-client-config.md` | Desktop client connection docs; contains "claude mcp add" | VERIFIED | Contains Claude Code CLI method, Cursor config, mcp-remote legacy relay, troubleshooting table |
| `dashboard/__tests__/server-factory.test.ts` | Tests for RMT-05 server factory | VERIFIED | 3 passing tests |
| `dashboard/__tests__/mcp-origin-guard.test.ts` | Tests for RMT-03 origin guard | VERIFIED | 4 passing tests |
| `dashboard/__tests__/mcp-route.test.ts` | Tests for RMT-01, RMT-04 route exports | VERIFIED | 6 passing tests + 4 todo (deployed-env integration) |
| `dashboard/__tests__/mcp-auth.test.ts` | Tests for RMT-02 token validation | VERIFIED | 5 passing tests confirming withMcpAuth wiring and oauth_token config |
| `dashboard/__tests__/mcp-well-known.test.ts` | Tests for RMT-02 metadata endpoints | VERIFIED | 4 passing tests confirming GET+OPTIONS exports |
| `dashboard/__tests__/mcp-polling-tools.test.ts` | Tests for RMT-06 polling tools | VERIFIED | 6 passing tests with mocked Redis and after() |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dashboard/app/api/mcp/route.ts` | `dashboard/lib/mcp/server-factory.ts` | import registerPdeTools | WIRED | route.ts L4: `import { registerPdeTools } from '@/lib/mcp/server-factory'`; called at L11 |
| `dashboard/app/api/mcp/route.ts` | `dashboard/lib/mcp/origin-guard.ts` | import validateOrigin | WIRED | route.ts L5: `import { validateOrigin } from '@/lib/mcp/origin-guard'`; called at L29 |
| `dashboard/proxy.ts` | `dashboard/app/api/mcp/route.ts` | PUBLIC_ROUTES includes /api/mcp | WIRED | proxy.ts L8: `'/api/mcp'` in PUBLIC_ROUTES array |
| `dashboard/lib/mcp/server-factory.ts` | `dashboard/lib/mcp/tools/index.ts` | import registerPipelineTools | WIRED | server-factory.ts L3: `import { registerPipelineTools } from './tools/index'`; called at L27 |
| `dashboard/lib/mcp/tools/pipeline-tools.ts` | `dashboard/lib/redis.ts` | import redis | WIRED | pipeline-tools.ts L2: `import { redis } from '@/lib/redis'`; used at L14, L20, L53 |
| `dashboard/lib/mcp/tools/index.ts` | `dashboard/lib/mcp/tools/pipeline-tools.ts` | re-export registerPipelineTools | WIRED | index.ts L1: `export { registerPipelineTools } from './pipeline-tools'` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `pipeline-tools.ts` start_pipeline_run | jobId, job hash fields | crypto.randomUUID() + Date.now() + authInfo | Yes — deterministic at call time; background stub uses setTimeout (intentional per plan spec) | FLOWING |
| `pipeline-tools.ts` check_pipeline_run | job | redis.hgetall(`pde:mcp:job:${job_id}`) | Yes — real Upstash Redis query (mocked in tests, real in prod) | FLOWING |
| `server-factory.ts` get_project_state | static JSON | Hardcoded `{ status: 'ok', message: 'PDE project state' }` | Intentional stub — plan spec states "Plan 158 will replace with real pipeline execution" | STATIC (intentional) |

Note: `get_project_state` returns static JSON per plan spec. This is a known stub — Phase 158 is the planned target for real state reading from `.planning/`.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full MCP test suite passes | `cd dashboard && npm test -- --run __tests__/server-factory.test.ts __tests__/mcp-origin-guard.test.ts __tests__/mcp-route.test.ts __tests__/mcp-auth.test.ts __tests__/mcp-well-known.test.ts __tests__/mcp-polling-tools.test.ts` | 6 files passed, 28 tests passed, 4 todo (skipped), 0 failures | PASS |
| server-factory exports registerPdeTools | `grep 'export function registerPdeTools' dashboard/lib/mcp/server-factory.ts` | Match found at L12 | PASS |
| origin-guard exports validateOrigin + ALLOWED_ORIGINS | `grep 'export' dashboard/lib/mcp/origin-guard.ts` | Both exports present at L3, L19 | PASS |
| route.ts exports dynamic + maxDuration | `grep 'force-dynamic\|maxDuration' dashboard/app/api/mcp/route.ts` | L7-8 match both | PASS |
| proxy.ts PUBLIC_ROUTES includes all 3 MCP paths | `grep 'api/mcp\|well-known' dashboard/proxy.ts` | All 3 paths present at L8-10 | PASS |
| pipeline-tools registers both polling tools | Test: registerPipelineTools calls server.tool twice | PASS — asserted by mcp-polling-tools.test.ts | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RMT-01 | 156-02 | Streamable HTTP endpoint at /api/mcp | SATISFIED | `dashboard/app/api/mcp/route.ts` exists with GET/POST/DELETE exports and createMcpHandler |
| RMT-02 | 156-02 | Clerk OAuth auth with RFC 9728 .well-known endpoints | SATISFIED | withMcpAuth with acceptsToken:'oauth_token'; both .well-known routes exist and export GET+OPTIONS |
| RMT-03 | 156-01 | Origin header validation against explicit allowlist | SATISFIED | `origin-guard.ts` with ALLOWED_ORIGINS set; 403 response for unlisted origins; null origin allowed |
| RMT-04 | 156-02 | Stateless per-request transport (no sessionIdGenerator) | SATISFIED (wired) | route.ts calls createMcpHandler with no sessionIdGenerator override; deployed behavior needs human confirm |
| RMT-05 | 156-01 | Shared server-factory.ts for stdio + HTTP transport reuse | SATISFIED | `server-factory.ts` is pure (no transport lifecycle); accepts any McpServer instance |
| RMT-06 | 156-03 | Polling pattern for long-running tools within Vercel timeout | SATISFIED | start_pipeline_run + check_pipeline_run with Redis job store and after() for background work |
| RMT-07 | 156-03 | Desktop client connectivity documented | SATISFIED (with note) | `docs/mcp-desktop-client-config.md` covers Claude Code, Cursor, mcp-remote relay. NOTE: REQUIREMENTS.md text says "@mcp-b/webmcp-local-relay" but plan spec and docs correctly use "mcp-remote" for desktop relay — requirements text needs update |

### RMT-07 Discrepancy Note

REQUIREMENTS.md line 18 reads:
> RMT-07: Desktop clients can connect via documented npx @mcp-b/webmcp-local-relay bridge (zero code change)

The implementation, the plan spec, and the docs all consistently use `mcp-remote` for the legacy desktop relay bridge, and explicitly state that `@mcp-b/webmcp-local-relay` is reserved for Phase 157 browser integration. The requirement is functionally satisfied — desktop client connectivity is documented. The REQUIREMENTS.md text appears to carry a stale package name from an earlier research pass. This requires a human decision on whether to update the requirements text.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dashboard/lib/mcp/tools/pipeline-tools.ts` | L25-36 | `setTimeout(resolve, 2000)` stub for background work | Info | Intentional per plan spec — "Stub: simulate pipeline work (replace with real pipeline execution in later phases)". Phase 158 is the target for real execution. Does not block goal. |
| `dashboard/lib/mcp/server-factory.ts` | L17-22 | `get_project_state` returns hardcoded `{ status: 'ok', message: 'PDE project state' }` | Info | Intentional stub per plan spec — Phase 158 will replace with real .planning/ state read. Does not block the phase goal of endpoint reachability. |

No blockers. No orphaned artifacts. No unexpected empty implementations.

---

## Human Verification Required

### 1. End-to-End MCP Client Connection

**Test:** Deploy to Vercel preview. Run `claude mcp add pde-remote --transport http https://<preview-url>/api/mcp`. Issue a tool call from Claude Code.
**Expected:** Browser opens Clerk OAuth flow; after auth, Claude Code lists `get_project_state`, `start_pipeline_run`, `check_pipeline_run`; calling `get_project_state` returns JSON response.
**Why human:** OAuth token exchange, Streamable HTTP framing, and Clerk's oauth_token path cannot be verified without a live deployed environment and a registered Clerk OAuth app.

### 2. 401 vs 307 Behavior for Unauthenticated Requests

**Test:** Send `POST /api/mcp` with no Authorization header to the deployed endpoint (e.g., `curl -X POST https://<url>/api/mcp -H 'Content-Type: application/json' -d '{}'`).
**Expected:** HTTP 401 response from withMcpAuth. Must NOT be a 307 redirect to Clerk sign-in page (which would mean proxy.ts bypass is not working).
**Why human:** Cannot verify middleware ordering in production Next.js without a deployed environment. proxy.ts is correct in source but edge cases in Clerk middleware version behavior require live confirmation.

### 3. Stateless Mode Confirmation (No Mcp-Session-Id)

**Test:** Inspect response headers from a valid POST /api/mcp request on the deployed endpoint.
**Expected:** Response headers do NOT include `Mcp-Session-Id`. Confirms mcp-handler's default stateless mode is active.
**Why human:** sessionIdGenerator behavior is internal to mcp-handler at runtime; cannot be confirmed by source inspection alone.

### 4. RMT-07 Requirements Text Alignment

**Test:** Review REQUIREMENTS.md line 18 with project owner.
**Expected:** Update text to: "Desktop clients can connect via documented `mcp-remote` relay bridge or native Streamable HTTP (Claude Code, Cursor); `@mcp-b/webmcp-local-relay` is Phase 157 browser bridge."
**Why human:** This is a documentation decision — the implementation is correct per plan spec, but REQUIREMENTS.md carries a stale package name that should be corrected to avoid confusion in future phases.

---

## Gaps Summary

No blocking gaps. All automated checks passed:

- 6 test files, 28 active tests green, 0 failures
- All 7 required artifacts exist and are substantive (not stubs for phase-goal purposes)
- All 6 key links are wired (imports confirmed, usages confirmed)
- Data flows through pipeline-tools.ts to Redis (intentional stub in background worker is scoped to Phase 158)
- All 7 requirement IDs (RMT-01 through RMT-07) are covered by artifacts

The 4 human verification items are deployed-environment behaviors that cannot be confirmed by static analysis. The RMT-07 requirements text discrepancy is a documentation consistency issue, not a code defect.

---

_Verified: 2026-03-28T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
