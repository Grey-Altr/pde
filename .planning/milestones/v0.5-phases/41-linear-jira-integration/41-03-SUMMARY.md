---
phase: 41-linear-jira-integration
plan: "03"
subsystem: integrations
tags: [linear, jira, atlassian, mcp, mcp-bridge, workflow, sync, requirements]

requires:
  - phase: 41-linear-jira-integration
    provides: "Plan 01: mcp-bridge.cjs populated with Linear and Atlassian TOOL_MAP entries and APPROVED_SERVERS; Plan 02: sync.md command dispatch for --linear and --jira flags"
  - phase: 40-github-integration
    provides: "sync-github.md reference implementation pattern for all sync workflows"
provides:
  - workflows/sync-linear.md implementing LIN-01 (issue sync to REQUIREMENTS.md) and LIN-02 (cycle annotation to ROADMAP.md)
  - workflows/sync-jira.md implementing JIRA-01 (issue sync to REQUIREMENTS.md) and JIRA-02 (epic reference table)
affects: [42-figma-token-import, 43-pencil-integration, sync.md dispatch layer]

tech-stack:
  added: []
  patterns:
    - "Six-step sync workflow pattern: Step 0 init+parse, Step 1 probe, Step 2 MCP fetch, Step 3 dedup, Step 4 append, Step 5 secondary-data, Step 6 summary"
    - "bridge.call() lookup before every MCP tool use — toolName drives Claude Code tool call, never hardcoded raw names"
    - "LIN-<identifier> deduplication key for Linear issues; JIRA-<key> for Jira issues"
    - "nextPageToken cursor pagination for Atlassian (not startAt)"
    - "Epics table is replace-not-append; issues list is append-only with deduplication"
    - "Cycle annotations written as HTML comments after ROADMAP.md phase heading"

key-files:
  created:
    - workflows/sync-linear.md
    - workflows/sync-jira.md
  modified: []

key-decisions:
  - "sync-linear.md LIN-02 cycle annotations use HTML comments (<!-- Linear Active Cycle: -->) immediately after phase heading — machine-parseable without disrupting ROADMAP.md markdown rendering"
  - "Jira epics table is a reference table (full replace on each sync), not append-only — epics change status/count frequently and a stale append-only table would mislead"
  - "nextPageToken for Jira pagination is CRITICAL — startAt is explicitly documented as NOT supported by the Atlassian MCP server"
  - "Adaptive response handling for Linear identifier field (try 'identifier' then 'id') because response schema has MEDIUM confidence from research"

patterns-established:
  - "Secondary data (cycles, epics) synced in Step 5 of every workflow — issue sync (Step 4) is always the primary deliverable; Step 5 failures skip silently"
  - "Degraded mode always displays current state from REQUIREMENTS.md before stopping — never crashes, always informative"

requirements-completed: [LIN-01, LIN-02, JIRA-01, JIRA-02]

duration: 2min
completed: 2026-03-19
---

# Phase 41 Plan 03: Linear + Jira Sync Workflows Summary

**sync-linear.md and sync-jira.md delivering LIN-01/LIN-02 and JIRA-01/JIRA-02: issue sync with deduplication and dry-run, plus cycle annotations and epic reference table**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T04:22:48Z
- **Completed:** 2026-03-19T04:25:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `workflows/sync-linear.md` — fetches Linear issues via `mcp__linear__list_issues`, deduplicates by `LIN-<identifier>`, appends to `### Linear Issues` in REQUIREMENTS.md; fetches cycles via `mcp__linear__list_cycles` and writes `<!-- Linear Active Cycle: -->` HTML comments to ROADMAP.md
- Created `workflows/sync-jira.md` — fetches Jira issues via `mcp__atlassian__searchJiraIssuesUsingJql` with JQL (excluding Epics and Done), deduplicates by `JIRA-<key>`, appends to `### Jira Issues`; fetches epics and writes `## Jira Epics` reference table
- Both workflows follow the sync-github.md six-step pattern exactly with consistent `--dry-run`, degraded mode, and 200-issue pagination caps

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sync-linear.md workflow (LIN-01 + LIN-02)** - `5051f8f` (feat)
2. **Task 2: Create sync-jira.md workflow (JIRA-01 + JIRA-02)** - `aedb593` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `workflows/sync-linear.md` — Linear issue sync and cycle mapping workflow implementing LIN-01 and LIN-02 via bridge adapter pattern
- `workflows/sync-jira.md` — Jira issue sync and epic reference table workflow implementing JIRA-01 and JIRA-02 via bridge adapter pattern

## Decisions Made

- **Cycle annotations as HTML comments:** `<!-- Linear Active Cycle: -->` written immediately after the active phase heading in ROADMAP.md — machine-parseable without disrupting rendered markdown
- **Epics table is replace-not-append:** The `## Jira Epics (from <projectKey>)` section is fully replaced on each sync because epic status changes; an append-only table would accumulate stale entries
- **nextPageToken not startAt:** Jira pagination uses cursor-based `nextPageToken` per Atlassian MCP spec — `startAt` is explicitly documented as unsupported
- **Adaptive Linear response handling:** Try `identifier` field first, fall back to `id` — MEDIUM confidence on exact response schema from research; graceful degradation is safer than a crash

## Deviations from Plan

None — plan executed exactly as written. Both workflow files match the structure specified in the plan's `<action>` blocks, follow sync-github.md pattern exactly, and satisfy all acceptance criteria.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required beyond what was established in Plans 01 and 02 (connect.md setup for Linear team and Atlassian project).

## Next Phase Readiness

- LIN-01, LIN-02, JIRA-01, JIRA-02 requirements fully implemented
- Plans 04 and 05 (handoff-create-linear-issues.md and handoff-create-jira-tickets.md) can now be built — they follow the same bridge.call() pattern
- sync.md dispatch from Plan 02 already routes `--linear` to sync-linear.md and `--jira` to sync-jira.md — the full sync pipeline is end-to-end ready for connected users

---
*Phase: 41-linear-jira-integration*
*Completed: 2026-03-19*
