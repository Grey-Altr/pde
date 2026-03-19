---
phase: 41-linear-jira-integration
plan: "02"
subsystem: integrations
tags: [linear, jira, atlassian, mcp, task-tracker, workflow-routing]

# Dependency graph
requires:
  - phase: 41-linear-jira-integration
    provides: Research on Linear MCP and Atlassian Rovo MCP tool names and API patterns

provides:
  - connect.md captures Linear teamId and Atlassian projectKey/siteUrl during --confirm flow
  - sync.md dispatches --linear to sync-linear.md, --jira to sync-jira.md, falls back to task_tracker config
  - handoff.md dispatches --create-linear-issues to handoff-create-linear-issues.md and --create-jira-tickets to handoff-create-jira-tickets.md
affects: [42-figma-token-import, 43-pencil, sync-linear, sync-jira, handoff-create-linear-issues, handoff-create-jira-tickets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-specific metadata capture steps in connect.md (3.5 for GitHub, 3.6 for Linear, 3.7 for Atlassian)"
    - "task_tracker config-driven default dispatch in sync.md when no explicit flag given"
    - "Flag-based workflow dispatch pattern extended from --create-prs to --create-linear-issues and --create-jira-tickets"

key-files:
  created: []
  modified:
    - workflows/connect.md
    - commands/sync.md
    - commands/handoff.md

key-decisions:
  - "connect.md gets service-specific steps (3.6, 3.7) rather than separate connect-linear.md / connect-atlassian.md — keeps dispatch logic centralized, consistent with Phase 40 GitHub decision"
  - "sync.md reads task_tracker from .planning/config.json as default service when no flag provided — allows frictionless /pde:sync without requiring flags once tracker is configured"
  - "Atlassian Step 3.7 validates atlassian.net domain with a soft warning (y/n) rather than hard reject — accommodates edge cases while surfacing the v0.5 Cloud-only constraint"
  - "mcp__linear__* and mcp__atlassian__* added to both sync.md and handoff.md allowed-tools — workflows spawned by these commands need MCP access"

patterns-established:
  - "Service metadata capture pattern: each new integration adds a numbered step in connect.md (3.N) for --confirm metadata collection, then a named branch in Step 4 for recording"
  - "Config-driven default routing: commands check task_tracker config when no explicit flag, display usage only when config is also empty"

requirements-completed: [LIN-01, LIN-03, JIRA-01, JIRA-03, JIRA-04]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 41 Plan 02: Command Entry Points for Linear and Jira Integration Summary

**connect.md extended with Linear team selection (Step 3.6) and Jira project capture (Step 3.7); sync.md and handoff.md updated with --linear/--jira flag dispatch and task_tracker config-driven routing**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-19T04:18:48Z
- **Completed:** 2026-03-19T04:20:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- connect.md now captures Linear team ID (via mcp__linear__list_teams with manual fallback) and Jira project key + site URL (via mcp__atlassian__getVisibleJiraProjectsList with manual fallback) during --confirm, storing them as extraFields in mcp-connections.json
- sync.md dispatches to sync-linear.md on --linear, sync-jira.md on --jira, reads task_tracker from config.json for default routing when no flag given, and displays a tip about /pde:settings when config is also empty
- handoff.md dispatches --create-linear-issues to handoff-create-linear-issues.md and --create-jira-tickets to handoff-create-jira-tickets.md, preserving existing --create-prs behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Linear and Atlassian metadata capture branches to connect.md** - `06a407f` (feat)
2. **Task 2: Update sync.md and handoff.md with Linear/Jira flag dispatch and task_tracker routing** - `814edb9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `workflows/connect.md` - Added Steps 3.6 (Linear team capture) and 3.7 (Jira project + site URL capture), extended Step 4 with Linear and Atlassian branches
- `commands/sync.md` - Updated argument-hint, allowed-tools, and process block with --linear/--jira dispatch and task_tracker default routing
- `commands/handoff.md` - Updated argument-hint, allowed-tools, and process block with --create-linear-issues and --create-jira-tickets dispatch

## Decisions Made

- connect.md gets service-specific steps (3.6, 3.7) rather than separate connect-linear.md / connect-atlassian.md — centralized dispatch consistent with Phase 40 GitHub decision
- sync.md reads task_tracker from .planning/config.json as default service when no flag — allows frictionless /pde:sync once tracker is configured
- Atlassian Step 3.7 validates atlassian.net domain with soft warning (y/n) not hard reject — surfaces Cloud-only constraint while handling edge cases
- mcp__linear__* and mcp__atlassian__* added to both sync.md and handoff.md allowed-tools

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Command entry points are complete — sync-linear.md, sync-jira.md, handoff-create-linear-issues.md, and handoff-create-jira-tickets.md workflows can now be implemented (Plans 41-03 and beyond)
- mcp-connections.json will store teamId and projectKey/siteUrl once users run /pde:connect linear --confirm or /pde:connect atlassian --confirm
- No blockers.

---
*Phase: 41-linear-jira-integration*
*Completed: 2026-03-19*
