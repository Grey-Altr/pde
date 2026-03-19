---
phase: 41-linear-jira-integration
verified: 2026-03-18T00:00:00Z
status: passed
score: 18/18 must-haves verified
gaps: []
human_verification:
  - test: "Run /pde:connect linear then /pde:connect linear --confirm"
    expected: "Step 3.6 appears, mcp__linear__list_teams is called, user selects a team, teamId stored in mcp-connections.json"
    why_human: "Requires live Linear MCP server authenticated in Claude Code — cannot verify MCP call execution in bash"
  - test: "Run /pde:connect atlassian then /pde:connect atlassian --confirm"
    expected: "Step 3.7 appears, site URL is prompted, atlassian.net validation fires, mcp__atlassian__getVisibleJiraProjectsList is called, projectKey stored in mcp-connections.json"
    why_human: "Requires live Atlassian Rovo MCP server authenticated in Claude Code"
  - test: "Run /pde:sync --linear with Linear connected and teamId configured"
    expected: "Issues fetched via mcp__linear__list_issues, LIN-<identifier> entries appended to REQUIREMENTS.md, active cycle annotation written to ROADMAP.md"
    why_human: "Requires live Linear MCP server and real issue data"
  - test: "Run /pde:sync --jira with Atlassian connected and projectKey configured"
    expected: "Issues fetched via JQL (issuetype != Epic AND status != Done), JIRA-<key> entries appended to REQUIREMENTS.md, Jira Epics table written"
    why_human: "Requires live Atlassian Rovo MCP server and real project data"
  - test: "Run /pde:handoff --create-linear-issues, respond 'n' at gate"
    expected: "No issues created. printed, no MCP call made"
    why_human: "Requires interactive user response — confirmation gate behavior cannot be verified statically"
  - test: "Run /pde:handoff --create-jira-tickets, respond 'y' at gate"
    expected: "Jira ticket created with ADF description, key and URL printed"
    why_human: "Requires live Atlassian MCP server and interactive confirmation"
  - test: "Run /pde:settings task_tracker linear then /pde:sync (no flags)"
    expected: "sync.md reads task_tracker config, dispatches to sync-linear.md workflow automatically"
    why_human: "Requires end-to-end command execution in Claude Code environment"
---

# Phase 41: Linear + Jira Integration Verification Report

**Phase Goal:** Users can sync project management state with PDE requirements and roadmap regardless of whether they use Linear or Jira
**Verified:** 2026-03-18
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `bridge.call('linear:list-issues', {})` returns toolName `mcp__linear__list_issues` | VERIFIED | Runtime: `node -e` confirms `r1_toolName: "mcp__linear__list_issues"` |
| 2 | `bridge.call('jira:search-issues', {})` returns toolName `mcp__atlassian__searchJiraIssuesUsingJql` | VERIFIED | Runtime: `r2_toolName: "mcp__atlassian__searchJiraIssuesUsingJql"` |
| 3 | `bridge.probe('linear')` returns status `probe_deferred` | VERIFIED | Runtime: `p1_status: "probe_deferred"` |
| 4 | `bridge.probe('atlassian')` returns status `probe_deferred` | VERIFIED | Runtime: `p2_status: "probe_deferred"` |
| 5 | APPROVED_SERVERS.linear uses HTTP transport to mcp.linear.app/mcp | VERIFIED | Runtime: `linTransport: "http"`, `linUrl: "https://mcp.linear.app/mcp"`, `linInstall: "claude mcp add --transport http linear https://mcp.linear.app/mcp"` |
| 6 | APPROVED_SERVERS.atlassian uses SSE transport to mcp.atlassian.com/v1/sse | VERIFIED | Runtime: `atlTransport: "sse"`, `atlUrl: "https://mcp.atlassian.com/v1/sse"`, `atlInstall: "claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse"` |
| 7 | config.cjs accepts `task_tracker` as a valid config key | VERIFIED | `grep task_tracker bin/lib/config.cjs` → line 17: `'task_tracker', // Phase 41: "linear" \| "jira" \| "none"` |
| 8 | connect.md captures Linear teamId (Step 3.6) and stores in mcp-connections.json | VERIFIED | connect.md has Steps 3.6 and 3.7; `LINEAR_TEAM_ID` appears 3x; `teamId: process.env.LINEAR_TEAM_ID` wires into Step 4 |
| 9 | connect.md captures Jira projectKey + siteUrl (Step 3.7) and stores in mcp-connections.json | VERIFIED | `JIRA_PROJECT_KEY` appears 4x, `JIRA_SITE_URL` appears 3x; `projectKey:` and `siteUrl:` wired into Step 4; Jira Data Center warning present |
| 10 | `/pde:sync --linear` routes to sync-linear.md | VERIFIED | commands/sync.md process block: `@workflows/sync-linear.md` on `--linear`; confirmed with `grep -c sync-linear.md commands/sync.md` = 2 |
| 11 | `/pde:sync --jira` routes to sync-jira.md | VERIFIED | commands/sync.md process block: `@workflows/sync-jira.md` on `--jira` |
| 12 | `/pde:sync` without flags reads task_tracker config and dispatches accordingly | VERIFIED | commands/sync.md has `task_tracker` config read block (3 occurrences); dispatches linear/jira/usage based on value |
| 13 | sync-linear.md fetches issues (LIN-01) and cycles (LIN-02) with deduplication and degraded mode | VERIFIED | 194 lines; `b.call('linear:list-issues')`, `b.call('linear:list-cycles')`, `### Linear Issues`, `LIN-` format, `<!-- Linear Active Cycle:`, dry-run, degraded mode, `loadConnections()` |
| 14 | sync-jira.md fetches issues (JIRA-01) and epics (JIRA-02) with nextPageToken pagination and degraded mode | VERIFIED | 184 lines; `b.call('jira:search-issues')`, `### Jira Issues`, `## Jira Epics`, `issuetype != Epic AND status != Done` JQL, `nextPageToken` (2 occurrences), no `startAt`, `loadConnections()` |
| 15 | `/pde:handoff --create-linear-issues` routes to handoff-create-linear-issues.md | VERIFIED | commands/handoff.md: `@workflows/handoff-create-linear-issues.md` on `--create-linear-issues` |
| 16 | `/pde:handoff --create-jira-tickets` routes to handoff-create-jira-tickets.md | VERIFIED | commands/handoff.md: `@workflows/handoff-create-jira-tickets.md` on `--create-jira-tickets` |
| 17 | handoff-create-linear-issues.md reads HND spec, confirmation gate, creates issue only on y/yes (LIN-03) | VERIFIED | 152 lines; `linear:create-issue` bridge call, `HND-handoff-spec-v*.md` glob (4x), `Create this issue in Linear? (y/n)`, `No issues created.` (2x), `CRITICAL` (2x), teamId from connections (11x) |
| 18 | handoff-create-jira-tickets.md reads HND spec, pre-flights types, ADF description, confirmation gate (JIRA-03) | VERIFIED | 204 lines; `jira:create-issue` and `jira:get-project-types` bridge calls, ADF `"type": "doc"` + `"version": 1`, `HND-handoff-spec-v*.md` (4x), `Create this ticket in Jira? (y/n)`, `No tickets created.` (2x), `CRITICAL` (2x) |

**Score:** 18/18 truths verified

---

## Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/mcp-bridge.cjs` | 14 new TOOL_MAP entries (7 Linear + 7 Atlassian), corrected APPROVED_SERVERS, OAuth AUTH_INSTRUCTIONS | VERIFIED | Runtime: 22 total entries confirmed; HTTP/SSE transports correct; probe_deferred for both services |
| `bin/lib/config.cjs` | task_tracker in VALID_CONFIG_KEYS | VERIFIED | Line 17: `'task_tracker', // Phase 41: "linear" \| "jira" \| "none"` |
| `workflows/connect.md` | Linear team selection (Step 3.6) and Jira project capture (Step 3.7) with mcp-connections.json storage | VERIFIED | Steps 3.6 and 3.7 present; all required env vars and extraFields wired |
| `commands/sync.md` | --linear, --jira flags and task_tracker dispatch | VERIFIED | Updated argument-hint, mcp__linear__* + mcp__atlassian__* in allowed-tools, full dispatch logic |
| `commands/handoff.md` | --create-linear-issues and --create-jira-tickets flags | VERIFIED | Updated argument-hint, mcp__linear__* + mcp__atlassian__* in allowed-tools, dispatch to both new workflows |
| `workflows/sync-linear.md` | Linear issue sync (LIN-01) and cycle annotation (LIN-02) | VERIFIED | 194 lines, all acceptance criteria met |
| `workflows/sync-jira.md` | Jira issue sync (JIRA-01) and epic reference table (JIRA-02) | VERIFIED | 184 lines, nextPageToken pagination, no startAt |
| `workflows/handoff-create-linear-issues.md` | Linear issue creation with confirmation gate (LIN-03) | VERIFIED | 152 lines, all acceptance criteria met |
| `workflows/handoff-create-jira-tickets.md` | Jira ticket creation with ADF and confirmation gate (JIRA-03) | VERIFIED | 204 lines, ADF format present, pre-flight type check |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/mcp-bridge.cjs` | TOOL_MAP | `call()` lookup: `linear:list-issues` → `mcp__linear__list_issues` | WIRED | Runtime confirmed |
| `bin/lib/mcp-bridge.cjs` | APPROVED_SERVERS | `probeTool: 'mcp__linear__list_issues'` | WIRED | Runtime: `linProbeTool: "mcp__linear__list_issues"` |
| `commands/sync.md` | `workflows/sync-linear.md` | `--linear` flag dispatch | WIRED | `@workflows/sync-linear.md` in process block |
| `commands/sync.md` | `workflows/sync-jira.md` | `--jira` flag dispatch | WIRED | `@workflows/sync-jira.md` in process block |
| `commands/sync.md` | `.planning/config.json` | `task_tracker` read | WIRED | Config read block present (3 occurrences) |
| `commands/handoff.md` | `workflows/handoff-create-linear-issues.md` | `--create-linear-issues` dispatch | WIRED | `@workflows/handoff-create-linear-issues.md` in process block |
| `commands/handoff.md` | `workflows/handoff-create-jira-tickets.md` | `--create-jira-tickets` dispatch | WIRED | `@workflows/handoff-create-jira-tickets.md` in process block |
| `workflows/sync-linear.md` | `bin/lib/mcp-bridge.cjs` | `b.call('linear:list-issues')` and `b.call('linear:list-cycles')` | WIRED | Both bridge calls present |
| `workflows/sync-linear.md` | `.planning/REQUIREMENTS.md` | append under `### Linear Issues` | WIRED | Section heading format confirmed (5 occurrences) |
| `workflows/sync-jira.md` | `bin/lib/mcp-bridge.cjs` | `b.call('jira:search-issues')` | WIRED | Bridge call present (1 occurrence) |
| `workflows/sync-jira.md` | `.planning/REQUIREMENTS.md` | append under `### Jira Issues` | WIRED | Section heading format confirmed (5 occurrences) |
| `workflows/handoff-create-linear-issues.md` | `bin/lib/mcp-bridge.cjs` | `bridge.call('linear:create-issue')` | WIRED | `b.call('linear:create-issue')` present |
| `workflows/handoff-create-linear-issues.md` | `.planning/design/implementation/` | Glob for `HND-handoff-spec-v*.md` | WIRED | 4 occurrences of `HND-handoff-spec` |
| `workflows/handoff-create-jira-tickets.md` | `bin/lib/mcp-bridge.cjs` | `bridge.call('jira:create-issue')` and `bridge.call('jira:get-project-types')` | WIRED | Both bridge calls present |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LIN-01 | 41-01, 41-02, 41-03 | User can sync Linear issues to REQUIREMENTS.md via `/pde:sync --linear` | SATISFIED | sync-linear.md fetches via `mcp__linear__list_issues`, deduplicates by `LIN-<identifier>`, appends to `### Linear Issues`; sync.md routes `--linear` to it |
| LIN-02 | 41-03 | User can map Linear cycles/milestones to ROADMAP.md phases | SATISFIED | sync-linear.md Step 5 fetches cycles via `mcp__linear__list_cycles`, writes `<!-- Linear Active Cycle: -->` comments to ROADMAP.md |
| LIN-03 | 41-02, 41-04 | User can create Linear issues from handoff artifacts with confirmation gate | SATISFIED | handoff-create-linear-issues.md has mandatory y/yes gate; handoff.md routes `--create-linear-issues` to it |
| JIRA-01 | 41-01, 41-02, 41-03 | User can sync Jira issues to REQUIREMENTS.md via `/pde:sync --jira` | SATISFIED | sync-jira.md fetches via JQL search, deduplicates by `JIRA-<key>`, appends to `### Jira Issues`; sync.md routes `--jira` to it |
| JIRA-02 | 41-03 | User can map Jira epics to REQUIREMENTS.md categories | SATISFIED | sync-jira.md Step 5 fetches epics via `issuetype = Epic` JQL, writes `## Jira Epics (from <projectKey>)` reference table |
| JIRA-03 | 41-02, 41-04 | User can create Jira tickets from handoff artifacts with confirmation gate | SATISFIED | handoff-create-jira-tickets.md has pre-flight type check, ADF description, mandatory y/yes gate; handoff.md routes `--create-jira-tickets` to it |
| JIRA-04 | 41-01, 41-02 | User can toggle between Linear and Jira via `task_tracker` config setting | SATISFIED | `task_tracker` in VALID_CONFIG_KEYS; sync.md reads it as default dispatch when no flag provided |

All 7 requirements satisfied. No orphaned requirements found in REQUIREMENTS.md.

---

## Anti-Patterns Found

None. Scan of all 9 modified/created files produced zero TODO, FIXME, PLACEHOLDER, `return null`, or `Not implemented` patterns.

---

## Regression Checks

| Check | Status | Details |
|-------|--------|---------|
| GitHub TOOL_MAP entries unchanged (8 entries) | PASSED | `github:probe` through `github:search-issues` all resolve correctly |
| sync.md still routes `--github` to sync-github.md | PASSED | `@workflows/sync-github.md` present in process block |
| handoff.md still routes `--create-prs` to handoff-create-prs.md | PASSED | `@workflows/handoff-create-prs.md` present in process block |
| TOTAL TOOL_MAP entries = 22 (8 GH + 7 LIN + 7 JRA) | PASSED | Runtime confirmed: `toolMapSize: 22` |

---

## Human Verification Required

The following items are architecturally sound but require a live Claude Code environment with authenticated MCP servers to verify end-to-end behavior.

### 1. Linear Connect Flow

**Test:** Run `/pde:connect linear` then `/pde:connect linear --confirm` with Linear MCP server installed and authenticated via OAuth.
**Expected:** Step 3.6 prompts for team selection using `mcp__linear__list_teams`; selected `teamId` and `teamName` stored in `mcp-connections.json`.
**Why human:** Requires live Linear MCP OAuth session in Claude Code.

### 2. Atlassian Connect Flow

**Test:** Run `/pde:connect atlassian` then `/pde:connect atlassian --confirm` with Atlassian Rovo MCP installed and authenticated.
**Expected:** Step 3.7 prompts for site URL (validates atlassian.net), fetches projects via `mcp__atlassian__getVisibleJiraProjectsList`, stores `projectKey` and `siteUrl`.
**Why human:** Requires live Atlassian Rovo MCP OAuth session in Claude Code.

### 3. Linear Issue Sync End-to-End

**Test:** With Linear connected and `teamId` configured, run `/pde:sync --linear`.
**Expected:** Issues fetched, `LIN-<identifier>` entries appended to REQUIREMENTS.md under `### Linear Issues`; active cycle annotated in ROADMAP.md.
**Why human:** Requires live Linear data and connected MCP server.

### 4. Jira Issue Sync End-to-End

**Test:** With Atlassian connected and `projectKey` configured, run `/pde:sync --jira`.
**Expected:** Issues fetched via JQL, `JIRA-<key>` entries appended; `## Jira Epics` table written.
**Why human:** Requires live Jira project data and connected Atlassian MCP server.

### 5. Linear Handoff Ticket Creation with Gate

**Test:** With a handoff spec in `.planning/design/implementation/`, run `/pde:handoff --create-linear-issues` and respond `n` at the gate.
**Expected:** "No issues created." printed; no MCP write call made.
**Why human:** Requires interactive response at confirmation gate in Claude Code context.

### 6. Jira Handoff Ticket Creation with Gate

**Test:** With Atlassian connected and a handoff spec available, run `/pde:handoff --create-jira-tickets` and respond `y`.
**Expected:** Pre-flight issue type check runs, ADF-formatted ticket created, key and URL displayed.
**Why human:** Requires live Atlassian MCP server and interactive y/n confirmation.

### 7. task_tracker Config-Driven Dispatch

**Test:** Run `/pde:settings task_tracker linear` then `/pde:sync` (no flags).
**Expected:** sync.md reads config, dispatches to sync-linear.md without requiring `--linear` flag.
**Why human:** Requires end-to-end command chain in Claude Code environment.

---

## Summary

Phase 41 achieves its goal. All 7 requirements (LIN-01 through LIN-03, JIRA-01 through JIRA-04) are implemented and wired. The bridge adapter, config key, command routing, sync workflows, and handoff creation workflows are all present, substantive, and correctly connected.

Key architectural decisions verified in the actual code:
- TOOL_MAP: 22 entries total (8 GH + 7 Linear + 7 Atlassian), all resolving correctly at runtime
- HTTP/SSE transports correctly set for Linear/Atlassian (not the wrong stdio/npx from Phase 39 scaffold)
- OAuth browser flow instructions (no env vars) in AUTH_INSTRUCTIONS
- nextPageToken pagination in sync-jira.md (no startAt)
- ADF description format in handoff-create-jira-tickets.md
- Confirmation gate ("CRITICAL" annotated) in both handoff workflows
- All 8 commits from SUMMARY files verified in git log

The 7 human verification items are all integration tests requiring live MCP server sessions — they cannot be short-circuited statically, but the workflow instructions are correctly authored to support them.

---

_Verified: 2026-03-18_
_Verifier: Claude (gsd-verifier)_
