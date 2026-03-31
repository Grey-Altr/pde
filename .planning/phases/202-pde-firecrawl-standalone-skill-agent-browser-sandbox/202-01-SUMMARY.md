---
phase: 202-pde-firecrawl-standalone-skill-agent-browser-sandbox
plan: 01
subsystem: api
tags: [firecrawl, mcp, agent, browser-sandbox, credit-guard, consent-gate, workflow]

# Dependency graph
requires:
  - phase: 200-pde-firecrawl-tools
    provides: commands/firecrawl.md and workflows/firecrawl.md with scrape/search/map/extract/crawl subcommands
  - phase: 198-pde-firecrawl-foundation
    provides: probeFirecrawl, acquireFirecrawlSemaphore, incrementFirecrawlUsage in mcp-bridge.cjs
  - phase: 199-pde-firecrawl-cache
    provides: writeSource in firecrawl-cache.cjs for agent result caching
provides:
  - agent subcommand in /pde:firecrawl with consent gate, 15s polling, 5-min timeout, writeSource cache
  - agent-status subcommand in /pde:firecrawl with 4-state status display
  - interact subcommand routing prose and full implementation (Plan 02 implementation)
  - mcp__firecrawl__firecrawl_agent, firecrawl_agent_status, firecrawl_interact added to commands/firecrawl.md allowed-tools
affects: [202-02, plan-02, firecrawl-browser-sandbox, firecrawl-interact]

# Tech tracking
tech-stack:
  added: [mcp__firecrawl__firecrawl_agent, mcp__firecrawl__firecrawl_agent_status, mcp__firecrawl__firecrawl_interact]
  patterns:
    - Consent gate pattern — display credit cap + balance, require explicit "yes" before high-cost MCP dispatch
    - Async job polling — 15s interval, 5-min timeout, elapsed display, matching crawl subcommand pattern
    - Variable credit tracking — use creditsUsed from response, fall back to MAX_CREDITS if absent

key-files:
  created: []
  modified:
    - commands/firecrawl.md
    - workflows/firecrawl.md

key-decisions:
  - "Consent gate halts on non-yes: IF user does not respond 'yes': halt immediately — Do NOT proceed to semaphore acquire"
  - "maxCredits default 500 (conservative) not 2500 (Firecrawl default) — per RESEARCH.md Pitfall 2 recommendation"
  - "maxCredits noted as advisory-only if MCP tool does not accept parameter — consent gate is the primary safety mechanism regardless"
  - "Agent polling: 15s interval, 300s timeout — matches crawl subcommand pattern for consistency"
  - "interact subcommand prose included for routing completeness; full implementation deferred to Plan 02"

patterns-established:
  - "Consent gate pattern: display cost estimate + balance → await 'yes' → halt on anything else → then semaphore acquire"
  - "Variable credit deduct: use result.creditsUsed after completion, fall back to MAX_CREDITS as conservative over-deduct"
  - "Async polling: track POLL_START, display elapsed each iteration, timeout message includes job ID for manual recheck"

requirements-completed: [AGT-01, AGT-02]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 202 Plan 01: Agent and Agent-Status Subcommands for /pde:firecrawl Summary

**Firecrawl autonomous agent dispatch with mandatory consent gate (halt on non-"yes"), 15s polling loop, 5-min timeout, and structured result caching via writeSource**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T05:18:18Z
- **Completed:** 2026-03-31T05:20:33Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `agent` subcommand to `/pde:firecrawl` with 9-step workflow: argument parsing (--max-credits default 500, --model, --urls), probeFirecrawl credit guard, consent gate that explicitly halts on non-"yes" response, semaphore acquire, firecrawl_agent MCP call, 15-second polling loop with 5-minute timeout and elapsed display, credit tracking via incrementFirecrawlUsage(creditsUsed || MAX_CREDITS), writeSource caching with type 'agent', and formatted result display
- Added `agent-status` subcommand to `/pde:firecrawl` with 3-step workflow: JOB_ID parse with usage error on missing, firecrawl_agent_status MCP call, status-conditional display for all 4 states (processing/completed/failed/cancelled)
- Added `interact` subcommand routing prose with consent gate, scrape-first pattern, and Playwright/prompt dispatch (full implementation in Plan 02)
- Added `mcp__firecrawl__firecrawl_agent`, `mcp__firecrawl__firecrawl_agent_status`, and `mcp__firecrawl__firecrawl_interact` to `commands/firecrawl.md` allowed-tools
- Updated description, argument-hint, routing dispatcher, and help section with all new subcommands, costs, and examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Add agent + agent-status subcommands to firecrawl workflow and command** - `8b5674a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `commands/firecrawl.md` - Updated description, argument-hint, added 3 new MCP tools to allowed-tools
- `workflows/firecrawl.md` - Updated purpose block, routing dispatcher, added agent/agent-status/interact subcommand sections, updated help section

## Decisions Made

- maxCredits default set to 500 (not 2500 Firecrawl default) — conservative cap for first-time users per RESEARCH.md Pitfall 2
- Consent gate prose explicitly states "Do NOT proceed to Step 4" on non-yes to eliminate any ambiguity about halting behavior
- Note added to agent workflow: "maxCredits may be advisory-only if the MCP tool does not accept this parameter" — per RESEARCH.md Open Question 1 (MCP tool parameter not confirmed vs REST API)
- interact subcommand fully documented in routing and prose but noted as "Implemented in Plan 02" — provides routing completeness and future implementation reference

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Firecrawl API key already configured since Phase 198.

## Next Phase Readiness

- Plan 02 can implement `interact` subcommand with full scrape-first + browser sandbox session flow — routing and consent gate prose already in workflows/firecrawl.md
- AGT-01 and AGT-02 requirements are complete — agent dispatch with consent gate and agent-status polling are fully documented
- AGT-03 and AGT-04 (browser sandbox) require Plan 02 implementation of interact subcommand

---
*Phase: 202-pde-firecrawl-standalone-skill-agent-browser-sandbox*
*Completed: 2026-03-31*
