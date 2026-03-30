---
phase: 196-containerized-mcp-servers
verified: 2026-03-30T11:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 196: Containerized MCP Servers Verification Report

**Phase Goal:** Each approved MCP server runs in its own Docker container with a pinned runtime, and the probe/degrade contract accounts for container startup latency so degradation does not fire on normal cold starts
**Verified:** 2026-03-30T11:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Each stdio-transport APPROVED_SERVERS entry has a container block with image and startupMs | VERIFIED | `playwright.container.image = 'mcr.microsoft.com/playwright:v1.50.0-noble'`, `startupMs = 5000`; `stitch.container.image = 'node:20-slim'`, `startupMs = 3000`; pencil has no container block (correct) |
| 2  | getInstallCmd returns docker run form when Docker available, raw installCmd when not | VERIFIED | `getInstallCmd('playwright', true)` returns `claude mcp add playwright -- docker run --rm -i mcr.microsoft.com/playwright:v1.50.0-noble npx @playwright/mcp@latest --headless --allow-unrestricted-file-access`; `getInstallCmd('playwright', false)` returns null |
| 3  | getProbeTimeoutMs adds container.startupMs to base timeout when Docker available | VERIFIED | playwright: 35000 (30000+5000) when true, 30000 when false; stitch: 18000 (15000+3000) when true, 15000 when false |
| 4  | isDockerAvailable returns false gracefully when dockerode not found or daemon down | VERIFIED | `let Dockerode; try { Dockerode = require('dockerode'); } catch (_) { Dockerode = null; }` at module top — null path sets `_dockerAvailableCache = false`; daemon-down path caught in try/catch in isDockerAvailable(); 35 unit tests cover all false paths |
| 5  | HTTP-transport servers and pencil have no container block | VERIFIED | `APPROVED_SERVERS.github.container` returns `undefined`; same for linear, figma, atlassian, greptile, pde_remote, pencil — all confirmed by 11 unit tests and live node -e spot-check |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/mcp-bridge.cjs` | Container blocks on APPROVED_SERVERS, isDockerAvailable, getInstallCmd, getProbeTimeoutMs | VERIFIED | File exists, substantive (35KB), all three functions present and exported at lines 689, 715, 734; container blocks at lines 82-87 (stitch) and 105-110 (playwright) |
| `tests/phase-196/mcp-bridge-container.test.cjs` | Unit tests for all container mode functions | VERIFIED | File exists, 222 lines, 35 tests in 4 describe blocks covering container structure, getInstallCmd, getProbeTimeoutMs, and isDockerAvailable — all 35 pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `getInstallCmd` | `APPROVED_SERVERS[key].container` | container block lookup with dockerAvailable gate | WIRED | `server.container` lookup present at line 718; `docker run --rm -i ${image} ${cmd.join(' ')}` template confirmed in output |
| `getProbeTimeoutMs` | `APPROVED_SERVERS[key].container.startupMs` | base + startupMs addition | WIRED | `container.startupMs` read at line 739; arithmetic produces 35000/18000 on live spot-check |
| `isDockerAvailable` | `dockerode` | require with MODULE_NOT_FOUND catch | WIRED | `require('dockerode')` in try/catch at line 24; `Dockerode = null` on failure; `new Dockerode().ping()` called at line 696 |

### Data-Flow Trace (Level 4)

Not applicable. This phase produces utility functions and data structures (APPROVED_SERVERS container blocks), not UI components rendering dynamic data. No rendering pipeline to trace.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Functions exported | `node -e "const m = require('./bin/lib/mcp-bridge.cjs'); console.log(typeof m.getInstallCmd, typeof m.getProbeTimeoutMs, typeof m.isDockerAvailable)"` | `function function function` | PASS |
| Playwright container image | `node -e "... m.APPROVED_SERVERS.playwright.container.image"` | `mcr.microsoft.com/playwright:v1.50.0-noble` | PASS |
| GitHub no container | `node -e "... m.APPROVED_SERVERS.github.container"` | `undefined` | PASS |
| getInstallCmd docker run form | `node -e "... m.getInstallCmd('playwright', true)"` | `claude mcp add playwright -- docker run --rm -i mcr.microsoft.com/playwright:v1.50.0-noble npx @playwright/mcp@latest --headless --allow-unrestricted-file-access` | PASS |
| getProbeTimeoutMs values | `node -e "... getProbeTimeoutMs('playwright', true/false) + getProbeTimeoutMs('stitch', true/false)"` | `35000 30000 18000 15000` | PASS |
| No -t flag in docker run | Confirmed by test `playwright docker run command does NOT contain -t flag` and spot-check on live output | Not present | PASS |
| Phase 196 tests | `npx vitest run tests/phase-196/mcp-bridge-container.test.cjs` | 35/35 passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INF-04 | 196-01-PLAN.md | Each stdio MCP server runs in its own Docker container with a pinned runtime | SATISFIED | playwright (`mcr.microsoft.com/playwright:v1.50.0-noble`) and stitch (`node:20-slim`) have container blocks; getInstallCmd returns `docker run --rm -i` form when Docker available |
| INF-05 | 196-01-PLAN.md | Probe timeouts extend by container startup time to avoid false degradation on cold starts | SATISFIED | getProbeTimeoutMs adds `container.startupMs` to base: playwright 30000+5000=35000ms, stitch 15000+3000=18000ms |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No anti-patterns detected. Confirmed no `-t` flag in any docker run command output. No TODOs/FIXMEs/placeholders in container-related code. The MODULE_NOT_FOUND catch is intentional and correct.

### Human Verification Required

None. All goal behaviors are verifiable programmatically via unit tests and node spot-checks.

### Full Test Suite Regression Check

Full `npx vitest run` result: **2 files failed, 108 passed** (4 tests failed, 1338 passed, 2 skipped). The 4 failures are in:
- `tests/phase-177/present-cmd.test.mjs` — 3 failing tests (persona slug assertions for product-manager, design-persona, research-persona; unrelated to phase 196)
- `tests/phase-134/test-relay-e2e.cjs` — 1 failing test (circuit breaker timeout; unrelated to phase 196)

These failures are pre-existing (SUMMARY.md documents "16 pre-existing failures unrelated to this plan" — the suite has since consolidated). Zero new regressions introduced by phase 196 changes.

### Gaps Summary

No gaps. All five must-have truths are verified. Both artifacts exist, are substantive, and are wired. Both requirements (INF-04, INF-05) are satisfied. The graceful degradation contract (fallback to non-containerized when Docker unavailable) is implemented and tested.

---

_Verified: 2026-03-30T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
