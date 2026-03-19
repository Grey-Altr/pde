---
phase: 40-github-integration
plan: "01"
subsystem: mcp-bridge
tags: [github, mcp, tool-map, adapter-layer, connect-workflow]
dependency_graph:
  requires: [39-01, 39-02]
  provides: [GH-01, GH-02, GH-03, GH-04]
  affects: [workflows/connect.md, bin/lib/mcp-bridge.cjs]
tech_stack:
  added: []
  patterns: [canonical-to-raw-tool-name-mapping, github-only-workflow-branch, extraFields-repo-capture]
key_files:
  created: []
  modified:
    - bin/lib/mcp-bridge.cjs
    - workflows/connect.md
decisions:
  - TOOL_MAP uses 8 GitHub entries — github:probe shares the same raw tool as github:list-issues (mcp__github__list_issues) since list_issues is the lightest read-only probe target
  - probeArgs use public github/github-mcp-server repo so probe works before user configures their own repo
  - connect.md adds GitHub-specific Step 3.5 inside existing file rather than a separate connect-github.md — keeps dispatch logic centralized
  - Step 4 preserves the original non-GitHub updateConnectionStatus call unchanged so non-GitHub services are completely unaffected
  - --repo argument added to Step 0 for batch/scripted use cases (skip interactive prompt)
metrics:
  duration: "1m 37s"
  completed: "2026-03-18"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 40 Plan 01: GitHub TOOL_MAP + Connect Repo Capture Summary

**One-liner:** 8 GitHub canonical→raw MCP tool name entries in TOOL_MAP with probeTool set, plus GitHub-specific repo capture step in connect workflow that stores owner/repo in mcp-connections.json.

## What Was Built

### Task 1: Populate TOOL_MAP and probeTool for GitHub in mcp-bridge.cjs

**File:** `bin/lib/mcp-bridge.cjs`

Replaced the empty `const TOOL_MAP = {}` scaffold (Phase 39) with 8 verified GitHub canonical→raw tool name mappings sourced from the official `github/github-mcp-server` Go source:

| Canonical Name | Raw Tool Name |
|----------------|---------------|
| `github:probe` | `mcp__github__list_issues` |
| `github:list-issues` | `mcp__github__list_issues` |
| `github:get-issue` | `mcp__github__issue_read` |
| `github:create-pr` | `mcp__github__create_pull_request` |
| `github:update-pr` | `mcp__github__update_pull_request` |
| `github:list-workflow-runs` | `mcp__github__actions_list` |
| `github:get-workflow-run` | `mcp__github__actions_get` |
| `github:search-issues` | `mcp__github__search_issues` |

Set `probeTool` for the github entry in APPROVED_SERVERS to `'mcp__github__list_issues'` (was `null` in Phase 39). Set `probeArgs` to use the public `github/github-mcp-server` repo so probe works without requiring user repo config. All four other servers (linear, figma, pencil, atlassian) remain unchanged with `probeTool: null`.

**Verification:** `bridge.call('github:list-issues', args)` returns `toolName: 'mcp__github__list_issues'`. `bridge.probe('github')` returns `status: 'probe_deferred'` instead of `probe_not_implemented`. 4 remaining `probeTool: null` entries confirmed.

**Commit:** `17d2509`

### Task 2: Extend connect workflow to capture GitHub repo on --confirm

**File:** `workflows/connect.md`

Three changes:

1. **Step 0 (Initialize):** Added `--repo <owner/repo>` as documented optional argument for GitHub connections.

2. **Step 3.5 (new, GitHub-only):** Inserted between Step 3 (Display Auth Instructions) and Step 4 (Confirm Connection). When `--confirm` AND `SERVICE_KEY === 'github'`:
   - Checks if `--repo` was provided in $ARGUMENTS; if so, uses that value directly as GITHUB_REPO
   - If not, prompts: "Which GitHub repo should PDE sync with? (format: owner/repo)"
   - Validates format: exactly one `/` separating non-empty owner and repo name; re-prompts on invalid input

3. **Step 4 (Confirm Connection):** Split into GitHub branch (includes `repo: process.env.GITHUB_REPO` in extraFields) and non-GitHub branch (original call unchanged). Steps 1, 2, 3, and 5 are completely unchanged.

**Verification:** 4 GITHUB_REPO occurrences in connect.md. `grep -c` check returns 8 (>= 3 required).

**Commit:** `83efa57`

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

- **github:probe shares mcp__github__list_issues as raw tool name:** The probe entry and the list-issues entry map to the same raw tool. This is intentional — list_issues is the lightest connectivity check available.
- **probeArgs use public repo:** `{ owner: 'github', repo: 'github-mcp-server', state: 'OPEN', perPage: 1 }` uses a public GitHub repo that always has open issues. This avoids needing user repo config before probe can run. (Open question in research: probe may fail if user's auth token has restricted scope to only their private repos — monitor in Wave 1.)
- **Step 3.5 inside connect.md (not a separate file):** Research recommended modifying connect.md directly to add a GitHub branch. A separate `connect-github.md` would require dispatch logic changes. The `SERVICE_KEY === 'github'` conditional in Step 3.5 keeps everything in one place.
- **Non-GitHub Step 4 block preserved verbatim:** The original `updateConnectionStatus` call (without repo) is kept as a separate explicit block in Step 4 for non-GitHub services, so the behavior delta is clear and non-GitHub services are not accidentally affected.

## Verification Results

All plan verification checks pass:

1. TOOL_MAP has 8 GitHub entries: `github:probe, github:list-issues, github:get-issue, github:create-pr, github:update-pr, github:list-workflow-runs, github:get-workflow-run, github:search-issues`
2. `probeArgs` for github: `{"owner":"github","repo":"github-mcp-server","state":"OPEN","perPage":1}`
3. GITHUB_REPO occurrences in connect.md: 4 (>= 2 required)
4. `probeTool: null` count: 4 (linear, figma, pencil, atlassian — unchanged)

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `bin/lib/mcp-bridge.cjs` exists | FOUND |
| `workflows/connect.md` exists | FOUND |
| `40-01-SUMMARY.md` exists | FOUND |
| Commit 17d2509 exists | FOUND |
| Commit 83efa57 exists | FOUND |
