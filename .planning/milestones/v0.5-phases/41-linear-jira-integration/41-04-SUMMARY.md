---
phase: 41-linear-jira-integration
plan: "04"
subsystem: workflows
tags: [linear, jira, mcp, handoff, confirmation-gate, adf, atlassian]

# Dependency graph
requires:
  - phase: 41-linear-jira-integration-01
    provides: mcp-bridge.cjs TOOL_MAP with linear:* and jira:* canonical entries
  - phase: 41-linear-jira-integration-02
    provides: connect.md and handoff.md command entry points routing --create-linear-issues and --create-jira-tickets flags
  - phase: 40-github-integration
    provides: handoff-create-prs.md reference implementation and confirmation gate pattern (VAL-03)
provides:
  - workflows/handoff-create-linear-issues.md — Linear issue creation with confirmation gate (LIN-03)
  - workflows/handoff-create-jira-tickets.md — Jira ticket creation with ADF description and confirmation gate (JIRA-03)
affects: [phase-42-figma, phase-43-pencil, VAL-03-compliance, handoff-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handoff-create pattern: glob latest HND-handoff-spec-v*.md, extract title/summary, confirmation gate, MCP write"
    - "ADF (Atlassian Document Format) for Jira Cloud description fields — type:doc, version:1 wrapper required"
    - "Pre-flight MCP read call before confirmation gate — getJiraProjectIssueTypesMetadata is read-only Step 2"
    - "bridge.call() lookup enforced for all MCP tool names — never hardcoded raw names in workflows"

key-files:
  created:
    - workflows/handoff-create-linear-issues.md
    - workflows/handoff-create-jira-tickets.md
  modified: []

key-decisions:
  - "Linear workflow requires no additional user input beyond y/n — teamId+title are sufficient for issue creation (no branch name needed unlike PR workflow)"
  - "Jira pre-flight type check (Step 2) is a read-only call placed before the confirmation gate — typesToolName from bridge.call('jira:get-project-types') used; Story>Task>first-available priority order"
  - "ADF description format hardcoded as structured object in workflow prose — Jira Cloud rejects plain markdown in description field"

patterns-established:
  - "Confirmation gate: display full details then 'Create this [thing]? (y/n)' — any non-y/yes response prints 'No [things] created.' and stops immediately"
  - "Degraded mode guard in Step 0: check status==='connected' AND required config field (teamId or projectKey) — if either missing, print instructions and stop"

requirements-completed: [LIN-03, JIRA-03]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 41 Plan 04: Linear + Jira Handoff Workflows Summary

**Two handoff-create workflows shipping Linear issues and Jira tickets from HND specs, with ADF description format, pre-flight issue type validation, and mandatory y/yes confirmation gates enforcing VAL-03**

## Performance

- **Duration:** 2 min 5s
- **Started:** 2026-03-19T04:22:46Z
- **Completed:** 2026-03-19T04:24:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `handoff-create-linear-issues.md`: reads latest HND-handoff-spec, loads teamId from mcp-connections.json via bridge, presents confirmation gate, creates Linear issue only after explicit y/yes
- `handoff-create-jira-tickets.md`: pre-flights issue types via getJiraProjectIssueTypesMetadata (Story>Task>first), builds ADF description structure, presents confirmation gate, creates Jira ticket only after explicit y/yes
- Both workflows follow handoff-create-prs.md pattern exactly: Step 0 init+guard, Step 1 glob, Steps 2-3 build payload + display, final step write after gate

## Task Commits

Each task was committed atomically:

1. **Task 1: Create handoff-create-linear-issues.md workflow (LIN-03)** - `6c32c90` (feat)
2. **Task 2: Create handoff-create-jira-tickets.md workflow (JIRA-03)** - `9cfbf31` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `workflows/handoff-create-linear-issues.md` — 152-line Linear issue creation workflow: Step 0 init (teamId, toolName via bridge.call), Step 1 glob HND-handoff-spec-v*.md, Step 2 construct payload, Step 3 CRITICAL confirmation gate, Step 4 create via mcp__linear__create_issue
- `workflows/handoff-create-jira-tickets.md` — 204-line Jira ticket creation workflow: Step 0 init (projectKey, siteUrl, createToolName+typesToolName via bridge.call), Step 1 glob, Step 2 pre-flight issue types (read-only), Step 3 construct ADF payload, Step 4 CRITICAL confirmation gate, Step 5 create via mcp__atlassian__createJiraIssue

## Decisions Made

- Linear workflow has no user input step between spec read and confirmation gate — teamId and title are sufficient; no branch-name equivalent needed
- Jira pre-flight type check placed in Step 2 (before confirmation gate) as it is read-only — gate remains the sole write boundary
- Story>Task>first-available ordering for issue type selection gives maximum compatibility across project configurations
- ADF description format encoded as prose in workflow (not bash) — AI agent constructs the object at call time from the extracted summary text

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required (uses existing mcp-connections.json populated by /pde:connect).

## Next Phase Readiness

- LIN-03 and JIRA-03 complete — Phase 41 Wave 2 finished
- handoff.md (from 41-02) routes `--create-linear-issues` and `--create-jira-tickets` flags to these workflows
- Phase 41 sync workflows (LIN-01, LIN-02, JIRA-01, JIRA-02) are separate plans — these handoff-create files do not depend on sync being complete
- Ready to advance to Phase 42 (Figma integration) or remaining Phase 41 sync plans

## Self-Check: PASSED

- FOUND: workflows/handoff-create-linear-issues.md
- FOUND: workflows/handoff-create-jira-tickets.md
- FOUND: .planning/phases/41-linear-jira-integration/41-04-SUMMARY.md
- FOUND: commit 6c32c90 (Task 1)
- FOUND: commit 9cfbf31 (Task 2)

---
*Phase: 41-linear-jira-integration*
*Completed: 2026-03-19*
