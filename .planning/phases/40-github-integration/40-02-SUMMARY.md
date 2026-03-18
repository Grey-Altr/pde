---
phase: 40-github-integration
plan: "02"
subsystem: github-commands
tags: [github, sync, ci, mcp, requirements, pipeline]
dependency_graph:
  requires: [40-01]
  provides: [pde:sync --github, pde:pipeline-status]
  affects: [.planning/REQUIREMENTS.md, workflows/sync-github.md, workflows/pipeline-status.md]
tech_stack:
  added: []
  patterns: [mcp-bridge-adapter, node-esm-createrequire, degraded-mode-gate, deduplication-by-issue-number]
key_files:
  created:
    - commands/sync.md
    - workflows/sync-github.md
    - commands/pipeline-status.md
    - workflows/pipeline-status.md
  modified: []
decisions:
  - sync-github workflow uses bridge.call() lookup before every MCP call — toolName returned drives actual Claude Code tool use, never hardcoded raw names
  - pipeline-status response field handling is adaptive (tries workflow_runs then fallbacks) because actions_list field names are MEDIUM confidence from research
  - Both workflows use the same pattern: Step 0 loads repo+status from mcp-connections.json, Step 1 checks MCP probe state, then proceeds to tool call
metrics:
  duration: "114s"
  completed: "2026-03-18T21:57:01Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 40 Plan 02: GitHub Commands (sync and pipeline-status) Summary

**One-liner:** `/pde:sync --github` fetches open GitHub issues via mcp__github__list_issues, deduplicates against REQUIREMENTS.md, and appends under `### GitHub Issues`; `/pde:pipeline-status` displays last 5 Actions runs via mcp__github__actions_list with status/conclusion/relative-time formatting.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create /pde:sync command and GitHub sync workflow (GH-01) | 6bc6319 | commands/sync.md, workflows/sync-github.md |
| 2 | Create /pde:pipeline-status command and CI status workflow (GH-04) | 14a2a6b | commands/pipeline-status.md, workflows/pipeline-status.md |

## What Was Built

### /pde:sync --github (GH-01)

`commands/sync.md` dispatches to `workflows/sync-github.md` when the `--github` flag is present. The workflow:

1. Loads repo and status from `mcp-connections.json` via bridge, exits cleanly if not configured
2. Probes MCP availability and degrades gracefully if unavailable
3. Calls `mcp__github__list_issues` (looked up via `bridge.call('github:list-issues')`) with `state: "OPEN"` (uppercase GraphQL enum), `perPage: 50`, with pagination up to 4 pages (200 issues max)
4. Deduplicates by checking if `#<issue_number>` exists in REQUIREMENTS.md before adding
5. Appends new issues as `- [ ] **GH-<number>**: <title> ([#<number>](<url>))` under `### GitHub Issues`
6. Supports `--dry-run` mode (preview without writing)
7. Displays a summary with fetched/skipped/added counts

### /pde:pipeline-status (GH-04)

`commands/pipeline-status.md` delegates entirely to `workflows/pipeline-status.md`. The workflow:

1. Loads repo/status from `mcp-connections.json`, exits cleanly if not configured
2. Handles `--no-mcp` flag to skip the call entirely
3. Calls `mcp__github__actions_list` (via `bridge.call('github:list-workflow-runs')`) with `method: "list_workflow_runs"`, `per_page: 5`
4. Formats each run: event/branch, workflow name, status, conclusion (`--` if not completed), relative time
5. Adaptive response field handling: tries `workflow_runs` first, then `runs`/`items`/`data` fallbacks
6. Errors degrade gracefully — never crashes

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created files exist:
- commands/sync.md: FOUND
- workflows/sync-github.md: FOUND
- commands/pipeline-status.md: FOUND
- workflows/pipeline-status.md: FOUND

### Commits exist:
- 6bc6319 (Task 1): FOUND
- 14a2a6b (Task 2): FOUND

## Self-Check: PASSED
