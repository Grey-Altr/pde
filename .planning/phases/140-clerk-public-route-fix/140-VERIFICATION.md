---
phase: 140-clerk-public-route-fix
verified: 2026-03-26T00:20:00Z
status: passed
score: 3/3 must-haves verified
gaps: []
human_verification:
  - test: "Deploy to Vercel staging and issue GET /api/approval-response?session_id=X&approval_id=Y with a valid Bearer token"
    expected: "Response is 404 with body {pending:true} or 200 with approval data — NOT a Clerk 401"
    why_human: "Clerk middleware is edge runtime; cannot simulate full Next.js middleware stack locally"
  - test: "Issue GET /api/cron/gc with Authorization: Bearer <CRON_SECRET> in a real Vercel environment"
    expected: "Response is 200 with {ok:true, deleted:{count:N}} — NOT a Clerk 401"
    why_human: "CRON_SECRET is an env var not present in CI; cron bypass only testable against live edge middleware"
---

# Phase 140: Clerk Public Route Fix — Verification Report

**Phase Goal:** Unblock approval response relay and cron GC by adding missing public routes to the Clerk middleware matcher in proxy.ts
**Verified:** 2026-03-26T00:20:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Relay GET to /api/approval-response with Bearer token reaches the route handler without Clerk 401 | VERIFIED | `'/api/approval-response'` present in `PUBLIC_ROUTES` at proxy.ts:6; `createRouteMatcher([...PUBLIC_ROUTES])` at proxy.ts:10 means Clerk skips `auth.protect()` for this path |
| 2  | Vercel cron GET to /api/cron/gc with CRON_SECRET reaches the GC handler without Clerk 401 | VERIFIED | `'/api/cron/gc'` present in `PUBLIC_ROUTES` at proxy.ts:7; same `isPublicRoute` guard ensures `auth.protect()` is bypassed |
| 3  | Dashboard POST to /api/approval-response still requires Clerk session (handler-level auth unchanged) | VERIFIED | route.ts POST handler calls `await auth()` and checks `isAuthenticated` (line 17-20); proxy.ts public route list has exact path `/api/approval-response` with no wildcard — POST is not exempted at middleware level (Clerk only exempts path match, not method; route handler enforces Clerk auth on POST) |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `dashboard/proxy.ts` | Public route matcher with approval-response and cron/gc; exports PUBLIC_ROUTES | VERIFIED | 22 lines; exports `PUBLIC_ROUTES` as const (line 3-8), spreads into `createRouteMatcher` (line 10), exports default `clerkMiddleware` and `config` unchanged |
| `dashboard/__tests__/proxy-public-routes.test.ts` | Nyquist regression tests PR-01 through PR-04 | VERIFIED | 20 lines; 4 test cases importing `PUBLIC_ROUTES` directly from `../proxy`; all 4 pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dashboard/proxy.ts` | `dashboard/app/api/approval-response/route.ts` | `createRouteMatcher` skips `auth.protect()` for public routes | WIRED | `PUBLIC_ROUTES` contains `'/api/approval-response'`; `isPublicRoute` spread confirms route is matched; route handler's own `validateRelayToken` guard remains (proxy.ts:12-14, route.ts:42-44) |
| `dashboard/proxy.ts` | `dashboard/app/api/cron/gc/route.ts` | `createRouteMatcher` skips `auth.protect()` for public routes | WIRED | `PUBLIC_ROUTES` contains `'/api/cron/gc'`; route handler's own CRON_SECRET guard remains intact (cron/gc/route.ts:9-11) |

### Data-Flow Trace (Level 4)

Not applicable — proxy.ts is a middleware config file, not a data-rendering component. No dynamic data to trace.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| PUBLIC_ROUTES exports /api/approval-response | `grep "'/api/approval-response'" dashboard/proxy.ts` | Match on line 6 | PASS |
| PUBLIC_ROUTES exports /api/cron/gc | `grep "'/api/cron/gc'" dashboard/proxy.ts` | Match on line 7 | PASS |
| createRouteMatcher uses PUBLIC_ROUTES spread | `grep "createRouteMatcher.*PUBLIC_ROUTES" dashboard/proxy.ts` | Match on line 10 | PASS |
| clerkMiddleware export preserved | `grep "export default clerkMiddleware" dashboard/proxy.ts` | Match on line 12 | PASS |
| All 4 PR-* tests pass | `cd dashboard && npm test` | 121/121 tests pass (17 test files) | PASS |
| No regressions in existing hardening tests | same test run | 0 failures | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| APR-04 | 140-01-PLAN.md | Approval responses flow back to PDE via relay polling Upstash for pending responses | SATISFIED | Relay GET to `/api/approval-response` now bypasses Clerk 401; `validateRelayToken` at handler level is the remaining auth gate; `readApprovalResponse` Redis query intact in route.ts:57 |

No orphaned requirements — REQUIREMENTS.md maps APR-04 to phase 140 (confirmed at line 94 of REQUIREMENTS.md) and it is claimed in the plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

No TODOs, FIXMEs, placeholder returns, hardcoded empty data, or stub patterns found in proxy.ts or the test file.

### Human Verification Required

#### 1. Relay GET bypass in live Clerk edge runtime

**Test:** Deploy to Vercel staging. Issue `GET /api/approval-response?session_id=<uuid>&approval_id=<uuid>` with header `Authorization: Bearer <RELAY_TOKEN>`.
**Expected:** HTTP 404 with `{"pending":true}` (no matching response in Redis) — NOT a Clerk 401.
**Why human:** Clerk middleware executes in Next.js edge runtime. The unit tests verify the `PUBLIC_ROUTES` array contents but cannot simulate the full edge middleware execution chain.

#### 2. Cron GC bypass in live Vercel environment

**Test:** Issue `GET /api/cron/gc` with header `Authorization: Bearer <CRON_SECRET>` in a real Vercel deployment (or via `vercel dev` with env populated).
**Expected:** HTTP 200 with `{"ok":true,"deleted":{"count":N},...}` — NOT a Clerk 401.
**Why human:** `CRON_SECRET` is a Vercel environment variable not present in CI; cron auth path only testable against live edge middleware with env populated.

### Gaps Summary

No gaps. All three observable truths are verified:

1. `/api/approval-response` is present in `PUBLIC_ROUTES` and fed to `createRouteMatcher` — Clerk will skip `auth.protect()` for this path. The handler's own `validateRelayToken` Bearer-token check is intact.
2. `/api/cron/gc` is present in `PUBLIC_ROUTES` and fed to `createRouteMatcher` — Clerk will skip `auth.protect()` for this path. The handler's own CRON_SECRET check is intact.
3. POST to `/api/approval-response` retains Clerk session auth at the handler level — no security regression.

The regression test file (4 Nyquist tests PR-01 through PR-04) guards against future accidental route removal. All 121 dashboard tests pass. Commit `52e2585` contains only the two expected files. APR-04 is fully satisfied.

---

_Verified: 2026-03-26T00:20:00Z_
_Verifier: Claude (gsd-verifier)_
