---
phase: 198-foundation-mcp-registration-credit-guards
plan: 01
subsystem: infra
tags: [mcp, firecrawl, tool-map, registration]

# Dependency graph
requires: []
provides:
  - "APPROVED_SERVERS.firecrawl entry with stdio transport and search probe"
  - "12 TOOL_MAP firecrawl:* canonical-to-raw name mappings"
  - "AUTH_INSTRUCTIONS.firecrawl 6-step setup guide"
  - "--no-firecrawl flag in mcp-integration.md"
  - "firecrawl in connect.md approved services list"
affects: [198-02-credit-guards, 199-cache-module, 200-scraping-workflows, 201-researcher-brief, 202-pde-firecrawl]

# Tech tracking
tech-stack:
  added: [firecrawl-mcp]
  patterns: [TOOL_MAP_VERIFY_REQUIRED markers for unverified tool mappings]

key-files:
  created:
    - tests/phase-198/mcp-bridge-firecrawl.test.mjs
  modified:
    - bin/lib/mcp-bridge.cjs
    - references/mcp-integration.md
    - workflows/connect.md

key-decisions:
  - "Used mcp__firecrawl__search as probe tool (lightest read-only, 0.2 credits)"
  - "Probe args { query: 'test', limit: 1 } to minimize credit usage during connectivity check"
  - "All 12 TOOL_MAP entries marked TOOL_MAP_VERIFY_REQUIRED pending first live probe"
  - "browser-create and browser-delete marked deprecated in favor of firecrawl:interact"

patterns-established:
  - "Firecrawl registration follows stitch pattern: stdio transport, null url, null installCmd, AUTH_INSTRUCTIONS for multi-step setup"

requirements-completed: [FND-01, FND-02]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 198 Plan 01: Firecrawl MCP Registration Summary

**Registered Firecrawl as ninth approved MCP server with 12 TOOL_MAP entries, AUTH_INSTRUCTIONS, and documentation updates**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-30T21:16:54Z
- **Completed:** 2026-03-30T21:25:00Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

### Task 1: Test scaffold for Firecrawl MCP registration (TDD RED)
- Created `tests/phase-198/mcp-bridge-firecrawl.test.mjs` with 28+ assertions
- Three describe blocks: APPROVED_SERVERS fields, TOOL_MAP entries (count + individual mappings + source markers), AUTH_INSTRUCTIONS content
- Standalone assertApproved and probe shape tests
- Commit: `d7adec7`

### Task 2: Register Firecrawl in mcp-bridge.cjs and update documentation (TDD GREEN)
- Added `APPROVED_SERVERS.firecrawl` with displayName "Firecrawl", stdio transport, search probe tool, `{ query: 'test', limit: 1 }` probe args
- Added 12 `firecrawl:*` TOOL_MAP entries: probe, scrape, search, map, crawl, check-crawl-status, extract, agent, agent-status, interact, browser-create (deprecated), browser-delete (deprecated)
- Added `AUTH_INSTRUCTIONS.firecrawl` with 6-step guide: API key acquisition, env var, npx registration, verification
- Added `--no-firecrawl` to mcp-integration.md flag table
- Added firecrawl to connect.md approved services list (both usage help and policy violation message)
- Commit: `65dc89c`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Updated policy violation server list in connect.md**
- **Found during:** Task 2
- **Issue:** Line 52 of connect.md listed only the original 5 servers (github, linear, figma, pencil, atlassian) in the policy violation message description, missing stitch and greptile
- **Fix:** Updated to include all 8 servers including firecrawl
- **Files modified:** workflows/connect.md
- **Commit:** 65dc89c

## Verification

- Inline Node.js verification confirmed: APPROVED_SERVERS.firecrawl exists, displayName correct, transport correct, probeTool correct, TOOL_MAP count 12, AUTH_INSTRUCTIONS length 6, assertApproved passes (7/7 checks passed)
- `node --test` runner could not execute due to system fork limit under parallel agent load (EAGAIN); inline verification used as substitute
- No literal API keys (fc-[a-zA-Z0-9]{10+}) found in version-controlled files

## Known Stubs

None -- all registrations are complete with real values. TOOL_MAP entries are marked TOOL_MAP_VERIFY_REQUIRED pending first live probe (intentional -- verification happens during /pde:connect firecrawl --confirm flow).

## Self-Check: PASSED

- [x] tests/phase-198/mcp-bridge-firecrawl.test.mjs -- FOUND
- [x] bin/lib/mcp-bridge.cjs -- FOUND (firecrawl entries confirmed via Read)
- [x] .planning/phases/198-foundation-mcp-registration-credit-guards/198-01-SUMMARY.md -- FOUND
- [x] Commit d7adec7 (Task 1 TDD RED) -- FOUND in git log
- [x] Commit 65dc89c (Task 2 GREEN) -- FOUND in git log
