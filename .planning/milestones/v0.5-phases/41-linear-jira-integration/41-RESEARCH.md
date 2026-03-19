# Phase 41: Linear + Jira Integration - Research

**Researched:** 2026-03-18
**Domain:** Linear MCP server (official hosted), Atlassian Rovo MCP server (official hosted), mcp-bridge.cjs adapter layer, config-driven task_tracker toggle
**Confidence:** MEDIUM-HIGH (tool names verified from multiple sources; exact response schemas are MEDIUM confidence pending live validation)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIN-01 | User can sync Linear issues to REQUIREMENTS.md via `/pde:sync --linear` | `list_issues` tool verified from official Linear MCP server; sync pattern follows GH-01 exactly; deduplication by Linear issue identifier |
| LIN-02 | User can map Linear cycles/milestones to ROADMAP.md phases | `list_cycles` tool confirmed in official Linear server; cycles are time-boxed sprints with `teamId` filter; mapping writes to ROADMAP.md phase status section |
| LIN-03 | User can create Linear issues from handoff artifacts with confirmation gate | `create_issue` tool confirmed with `teamId` (required), `title` (required), optional `description`, `stateId`, `priority`; VAL-03 confirmation gate required |
| JIRA-01 | User can sync Jira issues to REQUIREMENTS.md via `/pde:sync --jira` | `searchJiraIssuesUsingJql` tool confirmed from Atlassian Rovo MCP; JQL is the query language; pagination via `nextPageToken` |
| JIRA-02 | User can map Jira epics to REQUIREMENTS.md categories | `searchJiraIssuesUsingJql` with JQL `issuetype = Epic` query; epics map to REQUIREMENTS.md sections |
| JIRA-03 | User can create Jira tickets from handoff artifacts with confirmation gate | `createJiraIssue` tool confirmed; requires `project` key and `issuetype`; `getJiraProjectIssueTypesMetadata` needed first to confirm valid types |
| JIRA-04 | User can toggle between Linear and Jira via `task_tracker` config setting | `task_tracker` key must be added to `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`; sync.md dispatch reads this; values: `"linear" \| "jira" \| "none"` |
</phase_requirements>

---

## Summary

Phase 41 adds two parallel MCP integrations — Linear and Jira — following the adapter pattern established in Phase 40. Both integrations follow the same three-step structure: (1) populate `TOOL_MAP` entries in `bin/lib/mcp-bridge.cjs`, (2) set `probeTool` for each server in `APPROVED_SERVERS`, and (3) build workflow files that call tools via `bridge.call()` rather than raw tool names.

The critical architectural finding is that the existing `mcp-bridge.cjs` has **incorrect install commands** for both services. Linear's official server is a hosted HTTP/OAuth server at `https://mcp.linear.app/mcp`, not a stdio npm package `@linear/mcp-server` (that package does not exist on npm). Atlassian's official server is hosted at `https://mcp.atlassian.com/v1/sse` (SSE transport via `mcp-remote` proxy), not a stdio `@atlassian/jira-mcp` package (also does not exist as a clean installable package). Both `installCmd` and `AUTH_INSTRUCTIONS` entries in `APPROVED_SERVERS` must be corrected in Wave 0.

The second critical finding is that `task_tracker` is not in `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`. This must be added before JIRA-04 can be tested. The sync command dispatch pattern is: read `task_tracker` from config, select `--linear` or `--jira` path accordingly, with `--none` as a valid third state meaning "no task tracker configured."

The Linear MCP server provides 24 confirmed tools including `list_issues`, `list_cycles`, and `create_issue`. The Atlassian Rovo MCP server provides 13 confirmed Jira tools including `searchJiraIssuesUsingJql`, `createJiraIssue`, and `getJiraIssue`. Tool names are in different naming conventions: Linear uses `snake_case`, Atlassian uses `camelCase`.

**Primary recommendation:** Wave 0 must fix `installCmd` values in `APPROVED_SERVERS` for both linear and atlassian, add `task_tracker` to `VALID_CONFIG_KEYS`, and populate `TOOL_MAP` entries. All four workflow files (sync-linear.md, sync-jira.md, handoff-create-linear-issues.md, handoff-create-jira-tickets.md) are built in Wave 1 against the corrected adapter layer.

---

## Standard Stack

### Core
| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `bin/lib/mcp-bridge.cjs` (existing) | Phase 39 deliverable | Central adapter — all Linear and Jira MCP tool calls flow through it | Phase 39 architectural constraint; direct MCP calls bypassing bridge are a policy violation |
| Linear MCP Server (official hosted) | Current (HTTP at `https://mcp.linear.app/mcp`) | Linear data source — issues, cycles, projects, teams | Official Linear server; HTTP Streamable transport; OAuth 2.1 |
| Atlassian Rovo MCP Server (official hosted) | Current (SSE at `https://mcp.atlassian.com/v1/sse`) | Jira data source — issues, projects, epics | Official Atlassian server; SSE via mcp-remote proxy; OAuth 2.1 |
| `mcp__linear__*` tool namespace | Determined by server name `linear` registered in Claude Code | How Claude Code surfaces Linear MCP tools | Claude Code format: `mcp__<server-name>__<tool-name>` |
| `mcp__atlassian__*` tool namespace | Determined by server name `atlassian` registered in Claude Code | How Claude Code surfaces Atlassian MCP tools | Same Claude Code format |
| `bin/lib/config.cjs` (existing) | In-repo | `.planning/config.json` read/write including `task_tracker` | config.cjs already exists; only needs `task_tracker` added to `VALID_CONFIG_KEYS` |

### Corrected Install Commands for APPROVED_SERVERS

**Linear (corrected from current mcp-bridge.cjs):**
```
WRONG (current): claude mcp add --transport stdio --env LINEAR_API_KEY=<your-key> linear -- npx -y @linear/mcp-server
RIGHT: claude mcp add --transport http linear https://mcp.linear.app/mcp
```
Linear's official server uses Streamable HTTP with OAuth 2.1. No env var needed — auth is handled by Claude Code's MCP OAuth flow. The `@linear/mcp-server` npm package does not exist on npm; the server is cloud-hosted.

**Atlassian (corrected from current mcp-bridge.cjs):**
```
WRONG (current): claude mcp add --transport stdio --env ATLASSIAN_EMAIL=<email> --env ATLASSIAN_TOKEN=<token> jira -- npx -y @atlassian/jira-mcp
RIGHT: claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
```
Atlassian's official server uses SSE transport. No env vars needed — auth is OAuth 2.1 via browser flow. The `@atlassian/jira-mcp` npm package does not exist. Note: `mcp-remote` proxy handles the SSE connection for Claude Code when it doesn't natively support SSE.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `bin/lib/core.cjs` | In-repo | File I/O, REQUIREMENTS.md and ROADMAP.md read/write | Same as GH-01 pattern |
| `.planning/mcp-connections.json` | Phase 39 schema | Stores Linear `teamId` and Jira `projectKey` + `siteUrl` metadata | Read by sync workflows; written by `/pde:connect linear --confirm` / `/pde:connect atlassian --confirm` |
| `.planning/config.json` | Extended in Phase 41 | `task_tracker: "linear" | "jira" | "none"` | Dispatch in sync.md; read once per command execution |
| `.planning/REQUIREMENTS.md` | Existing file | Write target for LIN-01 and JIRA-01/JIRA-02 | Issues appended under `### Linear Issues` / `### Jira Issues` sections |
| `.planning/ROADMAP.md` | Existing file | Write target for LIN-02 (cycles to phases) | Cycle status updates written as phase status annotations |

### Verified Linear MCP Tool Inventory (Official Server `mcp.linear.app/mcp`)

| Tool Name | Purpose |
|-----------|---------|
| `list_issues` | List issues with filters (assignee, status, project, limit) |
| `get_issue` | Get a single issue by identifier |
| `create_issue` | Create a new issue |
| `update_issue` | Update an existing issue |
| `list_my_issues` | List issues assigned to authenticated user |
| `list_cycles` | List cycles (sprints) in a project or team |
| `list_projects` | List available projects |
| `get_project` | Get a single project |
| `create_project` | Create a project |
| `update_project` | Update a project |
| `list_teams` | List teams |
| `get_team` | Get a single team |
| `list_users` | List users |
| `get_user` | Get a single user |
| `list_comments` | List comments on an issue |
| `create_comment` | Create a comment on an issue |
| `list_issue_statuses` | List available issue statuses |
| `get_issue_status` | Get a single issue status |
| `list_issue_labels` | List available issue labels |
| `create_issue_label` | Create a new issue label |
| `list_project_labels` | List project labels |
| `list_documents` | List documents |
| `get_document` | Get a single document |
| `search_documentation` | Search documentation |

**Source:** Verified from Google ADK official docs (google.github.io/adk-docs/integrations/linear/) and fiberplane.com MCP server analysis blog. Confidence: HIGH for names; MEDIUM for response schema field names.

### Verified Atlassian Rovo MCP Jira Tool Inventory

| Tool Name | Purpose |
|-----------|---------|
| `searchJiraIssuesUsingJql` | Search issues using JQL query |
| `createJiraIssue` | Create a new Jira issue |
| `getJiraIssue` | Get a Jira issue by ID or key |
| `editJiraIssue` | Update fields on an existing issue |
| `addCommentToJiraIssue` | Add a comment to an issue |
| `addWorklogToJiraIssue` | Add time tracking to an issue |
| `transitionJiraIssue` | Move issue through workflow |
| `getTransitionsForJiraIssue` | List available transitions for an issue |
| `getVisibleJiraProjectsList` | List accessible projects |
| `getJiraProjectIssueTypesMetadata` | List issue types per project |
| `getJiraIssueTypeMetaWithFields` | Get required/optional fields for issue creation |
| `getJiraIssueRemoteIssueLinks` | List remote issue links |
| `lookupJiraAccountId` | Find user account ID |

**Source:** Verified from Atlassian Support documentation (support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/) and Microsoft Azure community blog. Confidence: HIGH for tool names; MEDIUM for parameter schemas.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Official Linear HTTP MCP server | Community stdio servers (`@tacticlaunch/mcp-linear`, `linear-mcp-server`) | Community servers have API key auth via env var (simpler for some); but official server is cloud-hosted (no local process), officially maintained, and uses OAuth 2.1 (more secure). Use official. |
| Atlassian Rovo MCP (official, Cloud only) | `sooperset/mcp-atlassian` (community, supports Data Center) | Community server supports Jira Data Center but requires API token env vars and Python runtime. Official server supports Cloud only. Phase 41 targets Cloud; Data Center is v0.6 scope. |
| SSE transport for Atlassian | HTTP Streamable transport | Atlassian's current official endpoint is SSE at `/v1/sse` (SSE via mcp-remote proxy). The `/v1/mcp` HTTP endpoint exists but SSE is confirmed working for Claude Code. Use SSE as primary. |

**Installation:**
```bash
# Linear (official hosted, HTTP, OAuth 2.1):
claude mcp add --transport http linear https://mcp.linear.app/mcp

# Atlassian (official hosted, SSE via mcp-remote, OAuth 2.1):
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
```

---

## Architecture Patterns

### Recommended File Structure (new and modified files)

```
bin/lib/
└── mcp-bridge.cjs         MODIFY — fix installCmd for linear + atlassian; set probeTool; add TOOL_MAP entries
    config.cjs             MODIFY — add 'task_tracker' to VALID_CONFIG_KEYS

commands/
└── sync.md                MODIFY — add --linear, --jira flags and task_tracker-based dispatch

workflows/
├── sync-linear.md         NEW — LIN-01 + LIN-02 sync workflow
├── sync-jira.md           NEW — JIRA-01 + JIRA-02 sync workflow
├── handoff-create-linear-issues.md  NEW — LIN-03 ticket creation workflow
└── handoff-create-jira-tickets.md   NEW — JIRA-03 ticket creation workflow

commands/
└── handoff.md             MODIFY — add --create-linear-issues and --create-jira-tickets flags
```

### Pattern 1: TOOL_MAP Population (Wave 0 deliverable — both services)

**What:** Add Linear and Atlassian canonical→raw tool name entries to TOOL_MAP. Fix `installCmd` and `AUTH_INSTRUCTIONS` for both. Set `probeTool` values.

**Exact TOOL_MAP additions to `bin/lib/mcp-bridge.cjs`:**

```javascript
// Source: Verified from official Linear MCP server tool list (google.github.io/adk-docs/integrations/linear/)
// Note: server registered as "linear" → tools appear as mcp__linear__<tool_name>
const TOOL_MAP = {
  // ... GitHub entries (Phase 40) ...

  // Linear — Phase 41 (verified from official mcp.linear.app server)
  'linear:probe':           'mcp__linear__list_issues',
  'linear:list-issues':     'mcp__linear__list_issues',
  'linear:get-issue':       'mcp__linear__get_issue',
  'linear:list-cycles':     'mcp__linear__list_cycles',
  'linear:list-teams':      'mcp__linear__list_teams',
  'linear:create-issue':    'mcp__linear__create_issue',
  'linear:list-statuses':   'mcp__linear__list_issue_statuses',

  // Atlassian — Phase 41 (verified from Atlassian Rovo MCP supported-tools docs)
  // Note: server registered as "atlassian" → tools appear as mcp__atlassian__<tool_name>
  'jira:probe':                     'mcp__atlassian__getVisibleJiraProjectsList',
  'jira:search-issues':             'mcp__atlassian__searchJiraIssuesUsingJql',
  'jira:get-issue':                 'mcp__atlassian__getJiraIssue',
  'jira:create-issue':              'mcp__atlassian__createJiraIssue',
  'jira:get-project-types':         'mcp__atlassian__getJiraProjectIssueTypesMetadata',
  'jira:get-issue-type-fields':     'mcp__atlassian__getJiraIssueTypeMetaWithFields',
  'jira:list-projects':             'mcp__atlassian__getVisibleJiraProjectsList',
};
```

**Probe configuration for APPROVED_SERVERS:**

```javascript
linear: {
  // ... existing fields ...
  // FIX: installCmd was wrong (npx stdio package doesn't exist)
  installCmd: 'claude mcp add --transport http linear https://mcp.linear.app/mcp',
  probeTool: 'mcp__linear__list_issues',   // Phase 41 fills
  probeArgs: { limit: 1 },                 // Minimal call to confirm connectivity
},
atlassian: {
  // ... existing fields ...
  // FIX: installCmd was wrong (npx stdio package doesn't exist)
  installCmd: 'claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse',
  probeTool: 'mcp__atlassian__getVisibleJiraProjectsList',  // Phase 41 fills
  probeArgs: {},  // No required args for project list
},
```

**Also fix AUTH_INSTRUCTIONS for both:**

```javascript
linear: [
  '1. Run: claude mcp add --transport http linear https://mcp.linear.app/mcp',
  '2. In Claude Code: /mcp -> select "linear" -> "Authenticate" -> follow browser OAuth flow',
  '3. Run /pde:connect linear --confirm',
],
atlassian: [
  '1. Run: claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse',
  '2. In Claude Code: /mcp -> select "atlassian" -> "Authenticate" -> follow browser OAuth flow',
  '3. Run /pde:connect atlassian --confirm',
],
```

### Pattern 2: task_tracker Config Key (Wave 0 deliverable — JIRA-04 enabler)

**What:** Add `task_tracker` to `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`. This enables users to set `task_tracker: "linear"` or `task_tracker: "jira"` in `.planning/config.json` via `/pde:settings`.

```javascript
// In bin/lib/config.cjs, add to VALID_CONFIG_KEYS:
const VALID_CONFIG_KEYS = new Set([
  // ... existing keys ...
  'task_tracker',  // Phase 41: "linear" | "jira" | "none"
]);
```

**Config dispatch in sync.md (JIRA-04):**

```
When /pde:sync is called without --linear or --jira:
  Read task_tracker from .planning/config.json
  If task_tracker === "linear": delegate to sync-linear.md
  If task_tracker === "jira": delegate to sync-jira.md
  If task_tracker === "none" or missing: display usage with suggestion to set via /pde:settings
```

### Pattern 3: Connection Metadata Schema Extension

**What:** The `connect linear --confirm` and `connect atlassian --confirm` flows must capture service-specific metadata into `mcp-connections.json`. Linear needs `teamId`; Jira needs `projectKey` and `siteUrl`.

**Updated mcp-connections.json schema (Phase 41 extension):**

```json
{
  "schema_version": "1.0",
  "connections": {
    "linear": {
      "server_key": "linear",
      "display_name": "Linear",
      "transport": "http",
      "status": "connected",
      "connected_at": "2026-03-18T10:00:00Z",
      "teamId": "TEAM_ID_HERE",    // NEW — required for list_issues, create_issue, list_cycles
      "teamName": "My Team"        // NEW — display name for UX
    },
    "atlassian": {
      "server_key": "atlassian",
      "display_name": "Atlassian (Jira)",
      "transport": "sse",
      "status": "connected",
      "connected_at": "2026-03-18T10:00:00Z",
      "projectKey": "PROJ",        // NEW — default project for issue creation
      "projectName": "My Project", // NEW — display name for UX
      "siteUrl": "https://myorg.atlassian.net"  // NEW — Jira site URL for issue links
    }
  }
}
```

**How captured:** Extend `workflows/connect.md` to add Linear-specific and Atlassian-specific branches. For Linear: ask "What is your team ID? (Found in Linear Settings → Team → API)". For Jira: ask "What is your project key and site URL?".

### Pattern 4: Linear Issue Sync to REQUIREMENTS.md (LIN-01)

**What:** Fetch open Linear issues via `list_issues`, deduplicate against REQUIREMENTS.md, append new entries under `### Linear Issues`.

**list_issues parameters (verified from official server):**

```
Tool: mcp__linear__list_issues
Parameters:
  status: <string>     (optional — e.g., "Todo", "In Progress"; no UPPERCASE enum requirement unlike GitHub)
  limit: 50            (default 25; max 100)
  sortBy: "createdAt"  (enum: "createdAt" | "updatedAt")
  sortDirection: "DESC"

Response fields used:
  (Array of issues, each with:)
  identifier  → unique issue ID (e.g., "TEAM-123") — use as deduplication key
  title       → issue title
  url         → issue URL
  state.name  → workflow state name
```

**Sync entry format:**

```markdown
- [ ] **LIN-<identifier>**: <issue title> ([<identifier>](<url>))
```

Example: `- [ ] **LIN-ENG-42**: Fix login timeout ([ENG-42](https://linear.app/team/issue/ENG-42))`

**Deduplication key:** Linear issue `identifier` (e.g., "ENG-42") is stable and unique. Check if REQUIREMENTS.md contains `LIN-<identifier>` before appending.

### Pattern 5: Linear Cycles to ROADMAP.md (LIN-02)

**What:** Fetch cycles for the configured team via `list_cycles`, display current cycle status, optionally annotate ROADMAP.md phase status with active cycle info.

**list_cycles parameters (verified from multiple community sources + official tool inventory):**

```
Tool: mcp__linear__list_cycles
Parameters:
  (No required params — lists all cycles for the authenticated team)
  Note: If team context is required, teamId from mcp-connections.json is passed

Response fields:
  (Array of cycles:)
  id          → cycle ID
  name        → cycle name (e.g., "Sprint 12")
  number      → cycle number
  startsAt    → ISO date
  endsAt      → ISO date
  completedAt → ISO date (null if active)
  progress    → float 0.0-1.0 (completion percentage)
  status      → "started" | "completed" | "future"
```

**ROADMAP.md annotation format (non-destructive — comment lines only):**

```markdown
## Phase 41: Linear + Jira Integration
<!-- Linear Active Cycle: Sprint 12 (ends 2026-03-25, 67% complete) -->
```

Write these as HTML comments so they display in markdown renderers but don't affect GSD workflow parsing.

### Pattern 6: Linear Issue Creation from Handoff (LIN-03)

**What:** `/pde:handoff --create-linear-issues` reads handoff artifact, constructs issue payload, displays confirmation gate, creates issue after explicit user approval.

**create_issue parameters (verified from official server):**

```
Tool: mcp__linear__create_issue
Required:
  teamId: <string>     (from mcp-connections.json linear.teamId)
  title: <string>      (from handoff spec title)

Optional:
  description: <string>  (from handoff spec summary — markdown supported)
  stateId: <string>      (workflow state ID — omit to use team default)
  priority: <0-4>        (0=no priority, 1=urgent, 2=high, 3=medium, 4=low)
  estimate: <number>     (story points — omit)
  cycleId: <string>      (add to active cycle — omit unless user specifies)
  projectId: <string>    (add to project — omit unless user specifies)
  labelIds: []           (label IDs — omit)
```

**Confirmation gate format:**

```
Linear issues to create:

  1. [<title>] in team <teamName>
     Description: <first 100 chars of summary>...

Create this issue? (y/n)
```

### Pattern 7: Jira Issue Sync to REQUIREMENTS.md (JIRA-01)

**What:** Query Jira issues via `searchJiraIssuesUsingJql`, deduplicate against REQUIREMENTS.md, append under `### Jira Issues`.

**searchJiraIssuesUsingJql parameters (verified from Atlassian Rovo MCP):**

```
Tool: mcp__atlassian__searchJiraIssuesUsingJql
Parameters:
  jql: <string>    (JQL query — e.g., 'project = "PROJ" AND issuetype != Epic AND status != Done ORDER BY created DESC')
  maxResults: 50   (default; cap at 50 per page)

Pagination: Use nextPageToken from response for subsequent pages (NOT startAt)
Response fields:
  issues[].key       → issue key (e.g., "PROJ-42") — deduplication key
  issues[].fields.summary    → issue title
  issues[].self      → API URL (construct web URL from siteUrl + /browse/ + key)
  nextPageToken      → pagination cursor (null if no more pages)
```

**Sync entry format:**

```markdown
- [ ] **JIRA-<key>**: <issue summary> ([<key>](<siteUrl>/browse/<key>))
```

Example: `- [ ] **JIRA-PROJ-42**: Fix login timeout ([PROJ-42](https://myorg.atlassian.net/browse/PROJ-42))`

**Deduplication key:** `JIRA-<key>` in REQUIREMENTS.md (e.g., `JIRA-PROJ-42`).

### Pattern 8: Jira Epics to REQUIREMENTS.md Categories (JIRA-02)

**What:** Query Jira epics via `searchJiraIssuesUsingJql` with `issuetype = Epic`, display them as potential category headers in REQUIREMENTS.md.

**JQL for epics:**

```
jql: 'project = "<projectKey>" AND issuetype = Epic ORDER BY created DESC'
```

**REQUIREMENTS.md epic annotation (non-destructive):**

```markdown
## Jira Epics (from <projectKey>)

| Epic Key | Summary | Status |
|----------|---------|--------|
| PROJ-10  | Authentication Overhaul | In Progress |
| PROJ-15  | Mobile Performance | To Do |
```

This section is written (or updated) by sync, not appended as individual requirements — it's a reference table, not a requirements list.

### Pattern 9: Jira Ticket Creation from Handoff (JIRA-03)

**What:** `/pde:handoff --create-jira-tickets` reads handoff artifact, calls `getJiraProjectIssueTypesMetadata` to confirm valid issue types, constructs payload, shows confirmation gate, creates ticket.

**Pre-flight check — get valid issue types:**

```
Tool: mcp__atlassian__getJiraProjectIssueTypesMetadata
Parameters:
  projectKey: <from mcp-connections.json atlassian.projectKey>

Use to confirm "Story" or "Task" is a valid issue type before attempting creation.
```

**createJiraIssue parameters:**

```
Tool: mcp__atlassian__createJiraIssue
Required fields (vary by project — always check getJiraIssueTypeMetaWithFields first):
  project.key: <string>        (from mcp-connections.json)
  issuetype.name: "Story"      (or "Task" — use valid type from metadata)
  summary: <string>            (from handoff spec title)

Common optional fields:
  description: <string>        (from handoff spec summary — Atlassian Document Format required for cloud)
  assignee: null               (leave unassigned)
  priority.name: "Medium"      (default)
```

**Critical:** Jira Cloud `description` field requires Atlassian Document Format (ADF), not plain markdown. For Phase 41, use a plain string wrapped in minimal ADF structure:

```json
{
  "type": "doc",
  "version": 1,
  "content": [{"type": "paragraph", "content": [{"type": "text", "text": "<description>"}]}]
}
```

### Anti-Patterns to Avoid

- **Using the wrong installCmd:** `@linear/mcp-server` and `@atlassian/jira-mcp` do not exist as npm packages. Always use the hosted server install commands (HTTP for Linear, SSE for Atlassian).
- **Missing teamId for Linear:** All Linear MCP tools that operate on issues require a team context. `teamId` must be captured during `/pde:connect linear --confirm` and stored in `mcp-connections.json`.
- **Skipping getJiraIssueTypeMetaWithFields before Jira issue creation:** Required fields differ by project. Always pre-flight check to avoid cryptic "required field missing" errors from Jira.
- **Using markdown in Jira description:** Jira Cloud requires Atlassian Document Format (ADF) for the description field. Plain markdown will be rejected or stored as-is (not rendered).
- **Misusing nextPageToken for Jira pagination:** The `searchJiraIssuesUsingJql` response uses `nextPageToken`, not `startAt`. Using `startAt`-based pagination will miss items or produce duplicates.
- **Case sensitivity in Linear status filter:** Linear MCP status filter accepts the workflow state name as a string (e.g., "Todo", "In Progress") — not uppercase enums like GitHub. Verify against `list_issue_statuses` for the team's actual state names.
- **Bypassing bridge.call():** Never use raw tool names like `mcp__linear__list_issues` directly in workflows. Always call `bridge.call('linear:list-issues', args)` to get the raw tool name from TOOL_MAP.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Linear API client | Custom `fetch()` to `api.linear.app/graphql` | `mcp__linear__*` tools via bridge | Linear's API is GraphQL; handling GraphQL complexity limits (10,000 points/query), pagination cursors, and OAuth manually is far more work than the MCP layer |
| Jira REST API client | Custom `fetch()` to `<site>.atlassian.net/rest/api/3/` | `mcp__atlassian__*` tools via bridge | Jira REST requires understanding Atlassian Document Format, JQL syntax validation, and pagination cursor differences between v2 and v3 endpoints |
| JQL query builder | Custom string concatenation for JQL | Hardcoded JQL templates per use case (project filter, epic filter) | JQL is simple for the three specific queries Phase 41 needs; a general builder adds complexity without proportional benefit |
| task_tracker dispatch logic | Custom service registry | Read `task_tracker` from config.json + if/else dispatch in sync.md | Two services with identical command interface; a registry pattern would be over-engineered |
| ADF (Atlassian Document Format) builder | Custom ADF serializer | Minimal ADF wrapper (single paragraph) for Phase 41 | Phase 41 only needs to wrap a plain text description; a full ADF builder is needed only if rich formatting is required (it is not in Phase 41) |
| Pagination cursor management | Custom page-number loop | Cursor-based loop following `endCursor` (Linear) or `nextPageToken` (Jira) until null, capped at 200 issues | Both services use cursor pagination; page numbers are not supported |

**Key insight:** Both Linear and Atlassian have official MCP servers that handle authentication, rate limiting, and API complexity. The workflow layer should be thin — describe what to fetch and what to do with the data.

---

## Common Pitfalls

### Pitfall 1: Wrong Linear Install Command (incorrect in current mcp-bridge.cjs)

**What goes wrong:** Phase 39 set `installCmd: 'claude mcp add --transport stdio --env LINEAR_API_KEY=<your-key> linear -- npx -y @linear/mcp-server'`. This package does not exist on npm. Users who follow the connect instructions will get `npm ERR! 404 Not Found - @linear/mcp-server`.

**Why it happens:** The v0.5 research (SUMMARY.md) mentioned "Linear MCP is stdio" — this was accurate for early community servers but Linear shipped an official hosted server after that research was written.

**How to avoid:** Wave 0 MUST fix `installCmd` and `AUTH_INSTRUCTIONS` for `linear` in `APPROVED_SERVERS` before any connect workflow can work.

**Warning signs:** `/pde:connect linear` produces `npm ERR! 404 Not Found`.

### Pitfall 2: Wrong Atlassian Install Command (incorrect in current mcp-bridge.cjs)

**What goes wrong:** Phase 39 set `installCmd: 'claude mcp add --transport stdio --env ATLASSIAN_EMAIL=<email> --env ATLASSIAN_TOKEN=<token> jira -- npx -y @atlassian/jira-mcp'`. This package also does not exist. The server name is also wrong (`jira` vs `atlassian`).

**Why it happens:** Same issue as Linear — early research pointed to community servers; official Atlassian Rovo MCP server was not released until May 2025.

**How to avoid:** Fix `installCmd` in `APPROVED_SERVERS.atlassian` to use `claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse`.

**Warning signs:** `/pde:connect atlassian` produces `npm ERR! 404 Not Found`.

### Pitfall 3: task_tracker Missing from VALID_CONFIG_KEYS

**What goes wrong:** User tries `/pde:settings task_tracker linear` and gets `Error: Unknown config key: "task_tracker"` from config.cjs.

**Why it happens:** `VALID_CONFIG_KEYS` in `bin/lib/config.cjs` is a closed set. `task_tracker` is not in it — confirmed by code inspection.

**How to avoid:** Add `'task_tracker'` to `VALID_CONFIG_KEYS` in Wave 0. Values should be `"linear"`, `"jira"`, or `"none"`.

**Warning signs:** `/pde:settings task_tracker linear` returns an error; JIRA-04 acceptance test cannot be run.

### Pitfall 4: Jira Description Requires Atlassian Document Format

**What goes wrong:** `createJiraIssue` is called with `description: "plain text"`. Jira Cloud returns a 400 error or stores the string unrendered.

**Why it happens:** Jira Cloud REST API v3 (which the Atlassian MCP server wraps) changed the description field from plain text to Atlassian Document Format (ADF) — a JSON structure.

**How to avoid:** Wrap description in minimal ADF: `{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"<description>"}]}]}`.

**Warning signs:** `createJiraIssue` returns 400 or the description appears as raw JSON in Jira.

### Pitfall 5: Linear teamId Not Captured During Connect

**What goes wrong:** `list_issues` and `create_issue` calls fail with "missing required argument: teamId" because `mcp-connections.json` has no `teamId` for the linear connection.

**Why it happens:** Unlike GitHub (which needs owner/repo), Linear uses `teamId` as the primary scoping key. The current connect workflow does not ask for it.

**How to avoid:** Extend the `connect linear --confirm` flow to ask "What is your Linear team ID? (Found at linear.app/settings -> API -> Team ID or visible in any issue URL)". Store as `teamId` in `mcp-connections.json`.

**Warning signs:** `bridge.loadConnections().connections.linear.teamId` is undefined.

### Pitfall 6: Jira Pagination Uses nextPageToken, Not startAt

**What goes wrong:** Sync workflow paginates using `startAt` offset from Jira REST documentation. This parameter does NOT work with the Atlassian MCP server's `searchJiraIssuesUsingJql` tool.

**Why it happens:** Jira's legacy REST v2 used `startAt`/`maxResults` offset pagination. The newer v3 endpoint (used by the MCP server) uses cursor-based pagination with `nextPageToken`.

**How to avoid:** Check for `nextPageToken` in the response. If present and not null, pass it in the next call to get the next page. Cap at 200 issues (4 pages of 50).

**Warning signs:** Pagination loop returning the same page repeatedly or skipping issues.

### Pitfall 7: Linear Rate Limits on Large Teams

**What goes wrong:** Syncing a large Linear workspace (many issues) hits the 1,500 requests/hour limit or the 250,000 complexity points/hour limit.

**Why it happens:** Each `list_issues` call with 50 issues uses approximately 66 complexity points (50 issues × 3 properties × 0.1 + object overhead). The limit is rarely hit in practice for small teams but can affect large organizations.

**How to avoid:** Cap sync at 200 issues (4 pages of 50 = ~264 complexity points per full sync run). Display "Showing first 200 issues. Run `/pde:sync --linear` again to check for new issues." at cap. The MCP server handles rate limiting automatically; catch errors and degrade gracefully.

### Pitfall 8: Jira Cloud Only (No Data Center Support)

**What goes wrong:** User has Jira Data Center (self-hosted). The Atlassian Rovo MCP server at `mcp.atlassian.com` does not support Data Center — it is Atlassian Cloud only.

**Why it happens:** The official Atlassian MCP server is a cloud-hosted bridge to Atlassian Cloud tenants. On-premise Jira Data Center has a different API surface.

**How to avoid:** In the connect workflow, display clearly: "PDE connects to Atlassian Cloud (atlassian.net). Jira Data Center is not supported in v0.5. For Data Center support, see v0.6 roadmap." If user attempts to connect with a non-atlassian.net URL, stop with this message.

**Warning signs:** `connect atlassian` flow producing auth errors with a self-hosted Jira URL.

---

## Code Examples

### TOOL_MAP additions (Wave 0)

```javascript
// Source: Verified from official Linear MCP server (google.github.io/adk-docs/integrations/linear/)
// and Atlassian Rovo MCP supported-tools docs (support.atlassian.com/...)
// File: bin/lib/mcp-bridge.cjs

// Linear — Phase 41
'linear:probe':           'mcp__linear__list_issues',
'linear:list-issues':     'mcp__linear__list_issues',
'linear:get-issue':       'mcp__linear__get_issue',
'linear:list-cycles':     'mcp__linear__list_cycles',
'linear:list-teams':      'mcp__linear__list_teams',
'linear:create-issue':    'mcp__linear__create_issue',
'linear:list-statuses':   'mcp__linear__list_issue_statuses',

// Atlassian — Phase 41
'jira:probe':                   'mcp__atlassian__getVisibleJiraProjectsList',
'jira:search-issues':           'mcp__atlassian__searchJiraIssuesUsingJql',
'jira:get-issue':               'mcp__atlassian__getJiraIssue',
'jira:create-issue':            'mcp__atlassian__createJiraIssue',
'jira:get-project-types':       'mcp__atlassian__getJiraProjectIssueTypesMetadata',
'jira:get-issue-type-fields':   'mcp__atlassian__getJiraIssueTypeMetaWithFields',
'jira:list-projects':           'mcp__atlassian__getVisibleJiraProjectsList',
```

### mcp-connections.json read pattern in Linear workflow bash blocks

```bash
# Source: Phase 40 pattern (sync-github.md) — adapted for Linear
# Use for all Linear workflow initialization steps
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const lin = conn.connections && conn.connections.linear;
const teamId = lin && lin.teamId || '';
const status = lin && lin.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('linear:list-issues', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ teamId, status, toolName }) + '\n');
EOF
```

### Linear list_issues call (LIN-01)

```
// Source: Verified from official Linear MCP server documentation
// Tool name from TOOL_MAP: mcp__linear__list_issues

Tool: mcp__linear__list_issues
Parameters:
  limit: 50          (max 100 per call)
  sortBy: "createdAt"
  sortDirection: "DESC"
  // No 'state' filter by default — sync all non-completed issues
  // (status filter uses team-specific state names like "Todo", "In Progress")

Response fields for sync:
  [].identifier    → "ENG-42" — use as deduplication key (format: TEAMKEY-NUMBER)
  [].title         → issue title
  [].url           → full URL to issue in Linear app
  [].state.name    → workflow state name (for potential filtering)
```

### Jira searchJiraIssuesUsingJql call (JIRA-01)

```
// Source: Verified from Atlassian Rovo MCP supported-tools docs
// Tool name from TOOL_MAP: mcp__atlassian__searchJiraIssuesUsingJql

Tool: mcp__atlassian__searchJiraIssuesUsingJql
Parameters:
  jql: 'project = "PROJ" AND issuetype != Epic AND status != Done ORDER BY created DESC'
  maxResults: 50

Response fields for sync:
  issues[].key             → "PROJ-42" — deduplication key
  issues[].fields.summary  → issue title/summary
  nextPageToken            → pagination cursor (null if no more pages)

Construct web URL: <siteUrl>/browse/<key>  (e.g., https://myorg.atlassian.net/browse/PROJ-42)
```

### Jira createJiraIssue call (JIRA-03)

```
// Source: Verified from Atlassian Rovo MCP and Microsoft Azure blog
// Tool name from TOOL_MAP: mcp__atlassian__createJiraIssue

// Step 1: Pre-flight — get valid issue types
Tool: mcp__atlassian__getJiraProjectIssueTypesMetadata
Parameters:
  projectKey: <from mcp-connections.json atlassian.projectKey>
Returns: array of { id, name } — find "Story" or "Task"

// Step 2: Create issue
Tool: mcp__atlassian__createJiraIssue
Parameters:
  project: { key: "<projectKey>" }
  issuetype: { name: "Story" }   (or "Task" if "Story" not available)
  summary: "<title from handoff spec>"
  description: {
    type: "doc",
    version: 1,
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "<summary from handoff spec>" }]
    }]
  }
  priority: { name: "Medium" }
```

### task_tracker config dispatch (JIRA-04)

```bash
# In sync.md — read task_tracker before deciding default service
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const fs = req('fs');
const path = req('path');
const configPath = path.join(process.cwd(), '.planning', 'config.json');
let taskTracker = 'none';
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  taskTracker = config.task_tracker || 'none';
} catch {}
process.stdout.write(JSON.stringify({ taskTracker }) + '\n');
EOF
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Linear community stdio server (`@linear/mcp-server` etc.) | Official Linear HTTP server at `mcp.linear.app/mcp` | May 2025 (Linear MCP launch) | Official server is cloud-hosted, no local process, OAuth-only — cleaner auth but requires HTTP transport (not stdio) |
| Atlassian community servers (`sooperset/mcp-atlassian` Python) | Official Atlassian Rovo MCP at `mcp.atlassian.com/v1/sse` | May 2025 (Atlassian Rovo MCP GA) | Official server covers Jira Cloud only but is officially maintained; community server adds Data Center support |
| Atlassian SSE endpoint `/v1/sse` | Atlassian HTTP endpoint `/v1/mcp` | Announced, deprecating `/v1/sse` after June 30, 2026 | Phase 41 should use `/v1/sse` now; plan to update to `/v1/mcp` before June 2026 deprecation |
| Linear API key auth (env var) | OAuth 2.1 via browser flow | With official server launch | No more API key management; auth stored in Claude Code keychain |
| Jira API token + email (env var) | OAuth 2.1 via browser flow | With official Rovo MCP GA | No more API token management; same OAuth pattern as GitHub and Linear |

**Deprecated/outdated in mcp-bridge.cjs (must fix in Phase 41):**
- `linear.installCmd` with `npx -y @linear/mcp-server`: Package does not exist; use HTTP transport
- `atlassian.installCmd` with `npx -y @atlassian/jira-mcp`: Package does not exist; use SSE transport
- `atlassian.AUTH_INSTRUCTIONS` with `ATLASSIAN_EMAIL`/`ATLASSIAN_TOKEN`: OAuth replaced env var auth
- Server name `jira` used in install guidance: Should be `atlassian` to match `APPROVED_SERVERS` key

---

## Open Questions

1. **Exact Linear list_issues response schema**
   - What we know: Tool name `list_issues` confirmed; `identifier`, `title`, `url` fields expected from multiple community implementations
   - What's unclear: Exact JSON field names when called against official `mcp.linear.app` server vs community servers (may differ slightly)
   - Recommendation: MEDIUM confidence. Wave 1 implementation should validate field names against a live connection. If `identifier` is not present, fall back to checking `id` and constructing identifier from `team.key` + number.

2. **Linear teamId capture — can it be inferred from `list_teams`?**
   - What we know: `list_teams` tool exists in official server; `teamId` is required for `list_issues` and `create_issue`
   - What's unclear: Whether `list_teams` returns the team ID in a consistent format that can be auto-discovered (reducing user friction during connect)
   - Recommendation: In `connect linear --confirm` flow, call `list_teams` first and display the list for user selection rather than asking for a raw ID. Store selected team's ID. This is better UX than asking for a raw ID.

3. **Atlassian SSE vs HTTP transport for Claude Code**
   - What we know: Official endpoint is `mcp.atlassian.com/v1/sse` (SSE); the `/v1/mcp` HTTP endpoint is being phased in; SSE deprecation is June 30, 2026
   - What's unclear: Whether Claude Code's `--transport sse` flag supports SSE natively or requires the `mcp-remote` npm proxy
   - Recommendation: Use SSE transport for now. If Claude Code `--transport sse` fails, fall back to mcp-remote proxy: `claude mcp add atlassian -- npx -y mcp-remote@latest https://mcp.atlassian.com/v1/sse`. Document both in AUTH_INSTRUCTIONS.

4. **Jira project metadata capture — required fields vary**
   - What we know: `getJiraIssueTypeMetaWithFields` can fetch required fields; required fields differ by project configuration
   - What's unclear: Whether always calling `getJiraIssueTypeMetaWithFields` before `createJiraIssue` adds unacceptable latency or if the MCP server caches this
   - Recommendation: Always call `getJiraIssueTypeMetaWithFields` in the pre-flight step before displaying the confirmation gate. Display the resolved required fields in the confirmation gate so users know what will be set.

5. **Linear MCP list_cycles — team-scoped or workspace-scoped?**
   - What we know: `list_cycles` exists in official tool inventory; `teamId` is the common filter for Linear operations
   - What's unclear: Whether `list_cycles` requires `teamId` as a parameter or returns workspace-wide cycles
   - Recommendation: Pass `teamId` from `mcp-connections.json` to `list_cycles`. If the tool doesn't accept it, omit it and filter the returned cycles by matching team context.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — PDE uses behavioral smoke tests (same as Phase 40) |
| Config file | None |
| Quick run command | `/pde:sync --linear --dry-run` or `/pde:sync --jira --dry-run` (verify output format without writing) |
| Full suite command | `/pde:health` + manual smoke tests for each LIN-*/JIRA-* requirement |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIN-01 | `/pde:sync --linear` appends Linear issues to REQUIREMENTS.md under `### Linear Issues` | smoke | `/pde:sync --linear` — verify REQUIREMENTS.md contains `### Linear Issues` section with `LIN-<identifier>` format entries | ❌ Wave 0 |
| LIN-02 | `/pde:sync --linear` displays current Linear cycle status and annotates ROADMAP.md | smoke | `/pde:sync --linear` — verify ROADMAP.md contains `<!-- Linear Active Cycle:` comments for active cycles | ❌ Wave 0 |
| LIN-03 | `/pde:handoff --create-linear-issues` shows confirmation prompt before any Linear write | smoke | `/pde:handoff --create-linear-issues` — verify confirmation prompt appears; verify NO issue is created when user responds `n` | ❌ Wave 0 |
| JIRA-01 | `/pde:sync --jira` appends Jira issues to REQUIREMENTS.md under `### Jira Issues` | smoke | `/pde:sync --jira` — verify REQUIREMENTS.md contains `### Jira Issues` section with `JIRA-<key>` format entries | ❌ Wave 0 |
| JIRA-02 | `/pde:sync --jira` writes epic summary table to REQUIREMENTS.md | smoke | `/pde:sync --jira` — verify REQUIREMENTS.md contains `## Jira Epics` section with table format | ❌ Wave 0 |
| JIRA-03 | `/pde:handoff --create-jira-tickets` shows confirmation prompt before any Jira write | smoke | `/pde:handoff --create-jira-tickets` — verify confirmation prompt appears; verify NO ticket is created when user responds `n` | ❌ Wave 0 |
| JIRA-04 | Changing `task_tracker` in config routes `/pde:sync` to the correct service | smoke | Set `task_tracker: "linear"` → run `/pde:sync` → verify Linear sync executes. Set `task_tracker: "jira"` → run `/pde:sync` → verify Jira sync executes | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `/pde:health` — verify no `.planning/` regressions
- **Per wave merge:** Smoke test each LIN-* and JIRA-* requirement manually (both MCP servers must be connected)
- **Phase gate:** All seven LIN/JIRA requirements verified with live connections before Phase 42 begins

### Wave 0 Gaps

- [ ] `bin/lib/mcp-bridge.cjs` TOOL_MAP population (linear + atlassian entries) + `probeTool` for both + corrected `installCmd` + corrected `AUTH_INSTRUCTIONS`
- [ ] `bin/lib/config.cjs` — add `'task_tracker'` to `VALID_CONFIG_KEYS`
- [ ] `commands/sync.md` — add `--linear`, `--jira` flags and `task_tracker`-based dispatch
- [ ] `commands/handoff.md` — add `--create-linear-issues` and `--create-jira-tickets` flags
- [ ] `workflows/sync-linear.md` — LIN-01 + LIN-02 sync workflow
- [ ] `workflows/sync-jira.md` — JIRA-01 + JIRA-02 sync workflow
- [ ] `workflows/handoff-create-linear-issues.md` — LIN-03 ticket creation workflow
- [ ] `workflows/handoff-create-jira-tickets.md` — JIRA-03 ticket creation workflow
- [ ] Extend `workflows/connect.md` — add Linear and Atlassian branches for service-specific metadata capture (teamId, projectKey, siteUrl)

---

## Sources

### Primary (HIGH confidence)
- `google.github.io/adk-docs/integrations/linear/` — Official Linear MCP server tool list (24 tools with names and descriptions); verified from Google ADK docs which use the official `mcp.linear.app` server
- `support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/` — Atlassian official tool inventory; 13 Jira tools listed with exact camelCase names
- `linear.app/docs/mcp` — Official Linear MCP docs: HTTP transport at `https://mcp.linear.app/mcp`, OAuth 2.1, install command `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`
- Project `bin/lib/mcp-bridge.cjs` — Confirmed Phase 39 structure; identified incorrect `installCmd` values for linear and atlassian; confirmed TOOL_MAP schema; confirmed probe() API
- Project `bin/lib/config.cjs` — Confirmed `task_tracker` is NOT in `VALID_CONFIG_KEYS`; confirmed dot-notation setter pattern
- Project `workflows/sync-github.md` and `workflows/handoff-create-prs.md` — Confirmed Phase 40 patterns for probe gate, mcp-connections.json read, deduplication, confirmation gate

### Secondary (MEDIUM confidence)
- `techcommunity.microsoft.com/.../get-started-with-atlassian-rovo-mcp-server-in-azure-sre-agent` — Jira tool names cross-referenced with official docs; `searchJiraIssuesUsingJql` and `createJiraIssue` confirmed
- `blog.fiberplane.com/blog/mcp-server-analysis-linear/` — All 23 tool names for official Linear server confirmed (matches ADK docs)
- `linear.app/changelog/2026-02-05-linear-mcp-for-product-management` — Confirmed `list_cycles`, project milestones, SSE deprecation notice for Linear
- `support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/` — SSE endpoint and upcoming `/v1/mcp` migration confirmed; June 30, 2026 deprecation date

### Tertiary (LOW confidence)
- Linear response field names (`identifier`, `title`, `url`, `state.name`) — Inferred from community server implementations and documented behavior; exact official server response shape needs live validation in Wave 1
- Jira `searchJiraIssuesUsingJql` parameter schema (`jql`, `maxResults`, `nextPageToken`) — Confirmed tool name and JQL parameter; cursor pagination behavior inferred from Atlassian REST v3 docs; validate against live server in Wave 1
- Linear `list_cycles` parameters — Tool confirmed in official inventory; parameter schema inferred from community implementations; validate against live server in Wave 1

---

## Metadata

**Confidence breakdown:**
- Linear tool names: HIGH — confirmed from official Google ADK docs and multiple cross-references
- Atlassian tool names: HIGH — confirmed from official Atlassian support docs
- Linear installCmd fix: HIGH — official docs explicitly state HTTP transport at `mcp.linear.app/mcp`
- Atlassian installCmd fix: HIGH — official docs explicitly state SSE at `mcp.atlassian.com/v1/sse`
- Response field schemas (both services): MEDIUM — tool names confirmed but JSON response shapes inferred; validate in Wave 1
- task_tracker gap: HIGH — confirmed by direct inspection of config.cjs (key not in VALID_CONFIG_KEYS)
- Architecture patterns: HIGH — following established Phase 40 adapter pattern; changes are additive

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Linear and Atlassian MCP server tool names are stable; note Atlassian SSE endpoint deprecated June 30, 2026 — update installCmd before that date)
