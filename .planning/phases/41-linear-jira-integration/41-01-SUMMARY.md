---
phase: 41-linear-jira-integration
plan: "01"
subsystem: api
tags: [linear, jira, atlassian, mcp-bridge, tool-map, config]

# Dependency graph
requires:
  - phase: 40-github-integration
    provides: TOOL_MAP scaffold and mcp-bridge.cjs adapter pattern established in Phase 40
  - phase: 39-mcp-infrastructure-foundation
    provides: mcp-bridge.cjs module with APPROVED_SERVERS, probe(), call(), assertApproved()
provides:
  - TOOL_MAP entries for all Linear canonical names (7 entries: linear:probe through linear:list-statuses)
  - TOOL_MAP entries for all Atlassian/Jira canonical names (7 entries: jira:probe through jira:list-projects)
  - Corrected APPROVED_SERVERS for linear (HTTP transport to mcp.linear.app/mcp)
  - Corrected APPROVED_SERVERS for atlassian (SSE transport to mcp.atlassian.com/v1/sse)
  - probeTool values for both linear and atlassian (enabling probe_deferred rather than not_configured)
  - OAuth browser flow AUTH_INSTRUCTIONS for both linear and atlassian
  - task_tracker VALID_CONFIG_KEYS entry in config.cjs (enables JIRA-04 service toggle)
affects:
  - 41-02 (sync-linear workflow depends on linear:* TOOL_MAP entries)
  - 41-03 (sync-jira workflow depends on jira:* TOOL_MAP entries)
  - 41-04 (task_tracker config key enables service toggle)
  - any workflow calling bridge.call('linear:*') or bridge.call('jira:*')

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TOOL_MAP pattern extended: new integrations follow same canonical:action -> mcp__server__tool_name pattern
    - Hosted MCP transports: Linear uses HTTP (not stdio), Atlassian uses SSE (not stdio)
    - OAuth-first auth: both Linear and Atlassian use browser OAuth flow, not API key env vars

key-files:
  created: []
  modified:
    - bin/lib/mcp-bridge.cjs
    - bin/lib/config.cjs

key-decisions:
  - "Linear MCP server uses HTTP transport to mcp.linear.app/mcp (not stdio npx @linear/mcp-server) — official hosted server, OAuth flow"
  - "Atlassian Rovo MCP server uses SSE transport to mcp.atlassian.com/v1/sse (not stdio npx @atlassian/jira-mcp) — official hosted server, OAuth flow"
  - "linear:probe and jira:probe share their respective list tools as probeTool to keep probe count at 22 total entries (not separate probe-only tools)"
  - "task_tracker config key placed after brave_search, before workflow.* keys — ordering signals it's a top-level integration toggle like brave_search"

patterns-established:
  - "New integration TOOL_MAP section: add comment block with phase/source citation, then 7 entries covering probe + list + get + create + domain-specific tools"
  - "APPROVED_SERVERS correctness: transport, url, installCmd, probeTool, probeArgs must all be consistent — probeTool null means probe returns not_configured, value means probe_deferred"

requirements-completed: [LIN-01, JIRA-01, JIRA-04]

# Metrics
duration: 7min
completed: 2026-03-19
---

# Phase 41 Plan 01: Linear + Atlassian MCP Bridge Foundation Summary

**22-entry TOOL_MAP with 7 Linear + 7 Atlassian canonical names, corrected HTTP/SSE APPROVED_SERVERS transport, OAuth AUTH_INSTRUCTIONS, and task_tracker config key**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-19T04:18:45Z
- **Completed:** 2026-03-19T04:25:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added 14 new TOOL_MAP entries (7 Linear + 7 Atlassian) bringing total to 22
- Corrected APPROVED_SERVERS for both linear (HTTP) and atlassian (SSE) — fixes wrong stdio/npx entries from Phase 39 scaffold
- Updated AUTH_INSTRUCTIONS to OAuth browser flow for both services (no env vars)
- Added task_tracker to VALID_CONFIG_KEYS enabling JIRA-04 service toggle

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Linear + Atlassian TOOL_MAP entries, fix APPROVED_SERVERS, fix AUTH_INSTRUCTIONS** - `3aed882` (feat)
2. **Task 2: Add task_tracker to VALID_CONFIG_KEYS in config.cjs** - `dbab424` (feat)

## Files Created/Modified

- `bin/lib/mcp-bridge.cjs` - 14 new TOOL_MAP entries, corrected APPROVED_SERVERS transport/url/installCmd/probeTool for linear and atlassian, OAuth AUTH_INSTRUCTIONS for both
- `bin/lib/config.cjs` - task_tracker added to VALID_CONFIG_KEYS with Phase 41 comment

## Decisions Made

- Linear MCP server uses HTTP transport to mcp.linear.app/mcp (not stdio npx @linear/mcp-server). The research confirmed the official hosted server is the correct integration target.
- Atlassian Rovo MCP uses SSE transport to mcp.atlassian.com/v1/sse (not stdio npx @atlassian/jira-mcp). Same reason — hosted server, OAuth flow.
- Both linear:probe and jira:probe reuse their respective list tools as probeTool (mcp__linear__list_issues and mcp__atlassian__getVisibleJiraProjectsList). This keeps probe logic consistent with the GitHub pattern from Phase 40.
- task_tracker key placed after brave_search in VALID_CONFIG_KEYS to signal it is a top-level integration toggle, not a sub-workflow option.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan. Plans 41-02 through 41-04 will require Linear and Atlassian MCP server connections.

## Next Phase Readiness

- Plans 41-02 (sync-linear) and 41-03 (sync-jira) can now safely call bridge.call('linear:*') and bridge.call('jira:*') — all canonical names are registered
- bridge.probe('linear') and bridge.probe('atlassian') both return probe_deferred (not not_configured) — /pde:mcp-status will show correct state
- task_tracker config key is live — users can set it before workflows check it in Plan 41-04
- GitHub entries verified unchanged (regression check passed)

---
*Phase: 41-linear-jira-integration*
*Completed: 2026-03-19*
