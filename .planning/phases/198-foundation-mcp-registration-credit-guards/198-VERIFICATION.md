---
phase: 198-foundation-mcp-registration-credit-guards
verified: 2026-03-30T22:00:00Z
status: gaps_found
score: 5/9 must-haves verified (plan-level); 0/4 success criteria fully satisfied (phase-level)
re_verification: false
gaps:
  - truth: "Running any Firecrawl-enabled workflow calls mcp__firecrawl__search with limit:1 as the probe -- FIRECRAWL_AVAILABLE is set true or false before the workflow body executes"
    status: failed
    reason: "FIRECRAWL_AVAILABLE variable does not exist in any implementation file. The probe mechanism (probeTool/probeArgs) is registered in APPROVED_SERVERS but no workflow-level code sets a FIRECRAWL_AVAILABLE flag or gates Firecrawl tool calls behind it. Grep for FIRECRAWL_AVAILABLE returns only .planning/ docs and research files."
    artifacts:
      - path: "bin/lib/mcp-bridge.cjs"
        issue: "probe() function exists and returns probe config, but no workflow integration sets FIRECRAWL_AVAILABLE based on probe result"
    missing:
      - "Workflow-level probe invocation that sets FIRECRAWL_AVAILABLE before workflow body"
      - "Gate logic that prevents Firecrawl tool calls when FIRECRAWL_AVAILABLE is false"
  - truth: "User can set FIRECRAWL_API_KEY in .env and see a 'Firecrawl: connected' confirmation in the session summary"
    status: failed
    reason: "No session summary integration exists. AUTH_INSTRUCTIONS reference env var setup, but no code produces a 'Firecrawl: connected' message in session summaries. The probe/degrade contract is defined but not wired into session lifecycle."
    artifacts:
      - path: "bin/lib/mcp-bridge.cjs"
        issue: "AUTH_INSTRUCTIONS guide the user to set the env var, but no session summary code consumes the probe result to display connection status"
    missing:
      - "Session summary integration that displays 'Firecrawl: connected' or 'Firecrawl: not configured' based on probe result"
  - truth: "The tmux dashboard and session summary display remaining Firecrawl credit balance with a visible warning when usage reaches 80%"
    status: partial
    reason: "checkFirecrawlCredits and readFirecrawlCredits functions exist and correctly compute ok/warning/exhausted states. However, no tmux dashboard pane or session summary template consumes these functions. The building blocks are present but the display integration is missing."
    artifacts:
      - path: "bin/lib/mcp-bridge.cjs"
        issue: "Credit functions implemented but not wired into dashboard or session summary rendering"
    missing:
      - "tmux dashboard pane showing Firecrawl credit balance"
      - "Session summary section displaying credit status with 80% warning"
  - truth: "When Firecrawl credits are exhausted or the API is unreachable, the workflow continues using WebSearch/WebFetch -- no hard failure"
    status: partial
    reason: "checkFirecrawlCredits returns {allowed: false} when exhausted, providing the decision point. However, no workflow code consumes this to fall back to WebSearch/WebFetch. The degradation contract is defined in the function signatures but not wired into any workflow."
    artifacts:
      - path: "bin/lib/mcp-bridge.cjs"
        issue: "Credit exhaustion detection works, but no fallback routing to WebSearch/WebFetch exists"
    missing:
      - "Workflow-level fallback logic: if checkFirecrawlCredits returns allowed:false, route to WebSearch/WebFetch"
      - "API-unreachable detection and fallback path"
---

# Phase 198: Foundation -- MCP Registration + Credit Guards Verification Report

**Phase Goal:** Firecrawl is a registered, probe-verified MCP server in PDE with all cost-protection mechanisms in place -- credit guards, graceful degradation, and tool routing policy -- before any workflow calls a single Firecrawl endpoint
**Verified:** 2026-03-30T22:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Firecrawl-enabled workflow calls probe, sets FIRECRAWL_AVAILABLE, gates tool calls | FAILED | FIRECRAWL_AVAILABLE not found in any implementation file. probeTool/probeArgs registered but no workflow-level integration. |
| SC-2 | User sets FIRECRAWL_API_KEY in .env, sees "Firecrawl: connected" in session summary | FAILED | AUTH_INSTRUCTIONS guide env var setup but no session summary displays connection status. |
| SC-3 | tmux dashboard and session summary display credit balance with 80% warning | PARTIAL | checkFirecrawlCredits correctly computes warning/exhausted states. No dashboard or session summary consumes these functions. |
| SC-4 | Exhausted credits or unreachable API falls back to WebSearch/WebFetch silently | PARTIAL | checkFirecrawlCredits returns {allowed:false} on exhaustion. No workflow fallback to WebSearch/WebFetch implemented. |

**Score:** 0/4 Success Criteria fully satisfied

### Plan-Level Must-Have Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P1-1 | APPROVED_SERVERS contains firecrawl entry with correct transport, probeTool, probeArgs | VERIFIED | Line 112-120 of mcp-bridge.cjs: displayName "Firecrawl", transport "stdio", probeTool "mcp__firecrawl__search", probeArgs {query:"test",limit:1} |
| P1-2 | TOOL_MAP contains 12 firecrawl:* entries | VERIFIED | Lines 262-274: probe, scrape, search, map, crawl, check-crawl-status, extract, agent, agent-status, interact, browser-create, browser-delete |
| P1-3 | AUTH_INSTRUCTIONS.firecrawl provides 6-step setup | VERIFIED | Lines 411-418: 6 elements including firecrawl.dev/app/api-keys, npx -y firecrawl-mcp, /pde:connect firecrawl --confirm |
| P1-4 | connect.md lists firecrawl as approved service | VERIFIED | Line 18 and line 52 of workflows/connect.md |
| P1-5 | mcp-integration.md flag table includes --no-firecrawl | VERIFIED | Line 44 of references/mcp-integration.md |
| P1-6 | No Firecrawl API key in version-controlled files | VERIFIED | Grep for fc-[a-zA-Z0-9]{10,} in bin/ returns no matches |
| P2-1 | checkFirecrawlCredits returns correct states | VERIFIED | Lines 740-757: ok/warning/exhausted/no_quota_configured logic all present |
| P2-2 | readFirecrawlCredits reads config.json read-only | VERIFIED | Lines 718-725: reads file, returns spread copy, no write operations |
| P2-3 | incrementFirecrawlUsage decrements credits atomically | VERIFIED | Lines 768-797: atomic write via tmp+rename, Math.max(0,...) guard |
| P2-4 | acquireFirecrawlSemaphore creates lockfiles, enforces max-2 | VERIFIED | Lines 815-857: lockfile creation, stale cleanup, FIRECRAWL_CONCURRENCY_LIMIT error |
| P2-5 | All four credit functions exported from mcp-bridge.cjs | VERIFIED | Lines 950-953 in module.exports block |

**Plan-level score:** 11/11 plan must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/mcp-bridge.cjs` | APPROVED_SERVERS.firecrawl, TOOL_MAP, credit guards, semaphore | VERIFIED | All entries present, functions substantive, properly exported |
| `references/mcp-integration.md` | --no-firecrawl flag entry | VERIFIED | Line 44 |
| `workflows/connect.md` | firecrawl in approved services | VERIFIED | Lines 18, 52 |
| `tests/phase-198/mcp-bridge-firecrawl.test.mjs` | Registration unit tests | VERIFIED | 178 lines, 28+ assertions covering APPROVED_SERVERS, TOOL_MAP, AUTH_INSTRUCTIONS |
| `tests/phase-198/firecrawl-credit-guard.test.mjs` | Credit guard unit tests | VERIFIED | 342 lines, 14 tests covering all credit states and semaphore behavior |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| mcp-bridge.cjs | APPROVED_SERVERS | `firecrawl:` key in object | WIRED | Line 112 |
| mcp-bridge.cjs | TOOL_MAP | 12 `firecrawl:` entries | WIRED | Lines 262-274 |
| mcp-bridge.cjs | config.json | fs.readFileSync/writeFileSync for quota.firecrawl | WIRED | Lines 719-790 |
| mcp-bridge.cjs | /tmp semaphore | pde-firecrawl-semaphore lockfiles | WIRED | Lines 801-857 |
| mcp-bridge.cjs | module.exports | 4 new functions exported | WIRED | Lines 950-953 |
| credit functions | workflows | consumed by workflow code | NOT WIRED | No workflow imports or calls checkFirecrawlCredits |
| credit functions | dashboard/tmux | consumed by dashboard rendering | NOT WIRED | No dashboard code references readFirecrawlCredits |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| checkFirecrawlCredits | quota.firecrawl from config.json | fs.readFileSync | Yes (reads real config file) | FLOWING (within module) |
| readFirecrawlCredits | quota.firecrawl from config.json | fs.readFileSync | Yes (reads real config file) | FLOWING (within module) |
| incrementFirecrawlUsage | quota.firecrawl write | fs.writeFileSync + renameSync | Yes (persists to disk) | FLOWING (within module) |
| Credit display in dashboard | N/A | N/A | N/A | DISCONNECTED -- no consumer exists |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Tests pass | node --test tests/phase-198/*.test.mjs | System fork exhaustion prevented execution | SKIP |
| Module loads without error | node -e "require('./bin/lib/mcp-bridge.cjs')" | Fork exhaustion prevented execution | SKIP |
| FIRECRAWL_AVAILABLE set in workflows | grep -r FIRECRAWL_AVAILABLE (non-planning) | No matches in implementation code | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| FND-01 | 198-01 | Register Firecrawl as approved MCP server with TOOL_MAP entries | SATISFIED | APPROVED_SERVERS.firecrawl with 12 TOOL_MAP entries present in mcp-bridge.cjs |
| FND-02 | 198-01 | Configure API key via env var with probe/degrade contract | PARTIAL | AUTH_INSTRUCTIONS guide env var setup. probe() returns config. But no "connected" confirmation in session summary, and probe/degrade contract not wired into workflows. |
| FND-03 | 198-02 | View remaining credits in tmux dashboard and session summaries with 80% warning | PARTIAL | checkFirecrawlCredits correctly returns quota_warning at 80%. readFirecrawlCredits reads cached data. But no tmux dashboard or session summary integration exists. |
| FND-04 | 198-02 | Graceful degradation falling back to WebSearch/WebFetch | PARTIAL | checkFirecrawlCredits returns {allowed:false} on exhaustion. But no workflow fallback to WebSearch/WebFetch exists. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | -- | No TODO/FIXME/placeholder patterns found | -- | -- |
| bin/lib/mcp-bridge.cjs | 262-274 | TOOL_MAP_VERIFY_REQUIRED on all 12 entries | Info | Intentional -- verification happens during first live /pde:connect probe. Not a blocker. |

### Human Verification Required

### 1. Test Suite Execution
**Test:** Run `node --test tests/phase-198/*.test.mjs` (requires Node 20+ and system fork capacity)
**Expected:** All 42+ tests pass (28 registration + 14 credit guard)
**Why human:** System fork exhaustion prevented automated test execution during verification

### 2. Firecrawl MCP Probe (Live)
**Test:** Set FIRECRAWL_API_KEY, run `claude mcp add firecrawl ...`, then `/pde:connect firecrawl --confirm`
**Expected:** Probe returns success, connection status saved
**Why human:** Requires live Firecrawl API key and Claude Code MCP runtime

## Gaps Summary

Phase 198 successfully delivered all **plan-level artifacts**: Firecrawl is registered in APPROVED_SERVERS with 12 TOOL_MAP entries, AUTH_INSTRUCTIONS, documentation updates, and four credit guard functions (check, read, increment, semaphore). The code is substantive, properly exported, and well-tested.

However, there is a significant gap between what the plans delivered and what the **ROADMAP Success Criteria** require. The plans focused on building the foundation modules (registration data structures, credit guard functions), but none of the four Success Criteria are fully satisfied because:

1. **No workflow integration exists.** The `FIRECRAWL_AVAILABLE` probe-gate pattern described in SC-1 is not implemented anywhere. The probe configuration is registered but never invoked by a workflow.

2. **No display integration exists.** Credit balance data is computable via `readFirecrawlCredits`/`checkFirecrawlCredits` but no tmux dashboard pane or session summary template consumes it (SC-2, SC-3).

3. **No fallback routing exists.** The credit exhaustion detection works (`{allowed: false}`), but no code routes to WebSearch/WebFetch as an alternative (SC-4).

**Root cause analysis:** The two plans (198-01 and 198-02) scope was limited to "registration + credit functions" -- the building blocks. The Success Criteria require end-to-end integration (probe in workflows, display in dashboard, fallback in routing) that was not planned. This is a planning gap, not an execution gap -- the plans were executed correctly but their scope was insufficient to satisfy the phase goal.

**Recommendation:** A gap-closure plan (198-03) is needed to wire the credit guard functions into workflows, dashboard, and session summary. Alternatively, if the intent is for downstream phases (199-203) to do this wiring, the Success Criteria should be revised to match the foundation scope.

---

_Verified: 2026-03-30T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
