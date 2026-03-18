# Phase 40: GitHub Integration - Research

**Researched:** 2026-03-18
**Domain:** GitHub MCP server tool API, bidirectional sync patterns, PR creation workflow, CI status retrieval, mcp-bridge.cjs integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GH-01 | User can sync GitHub issues to REQUIREMENTS.md via `/pde:sync --github` | `list_issues` tool verified with exact params; `.planning/` is write target; deduplication by GitHub issue number is the key conflict resolution approach |
| GH-02 | User can create GitHub PRs from handoff artifacts via `/pde:handoff --create-prs` with confirmation gate | `create_pull_request` tool verified with exact required params (owner, repo, title, head, base); assertApproved() + confirmation prompt pattern from mcp-bridge.cjs is the gate mechanism |
| GH-03 | User can populate `/pde:brief` from a GitHub issue via `--from-github` flag | `issue_read` with method=`get` returns title, body, labels, assignees — exact fields needed to pre-fill brief |
| GH-04 | User can view GitHub Actions CI status for the connected repo within pipeline status output | `actions_list` with method=`list_workflow_runs` + `actions_get` with method=`get_workflow_run` — verified tool names and params |
</phase_requirements>

---

## Summary

Phase 40 connects PDE's local `.planning/` state to GitHub by populating the empty `TOOL_MAP` and `APPROVED_SERVERS.github.probeTool` in `bin/lib/mcp-bridge.cjs` with verified GitHub MCP tool names, then building four workflow capabilities on top of that bridge layer: issue sync, PR creation with confirmation gate, brief pre-population from a GitHub issue, and CI status display.

The official GitHub MCP server (`github.com/github/github-mcp-server`) exposes tools via MCP over HTTP at `https://api.githubcopilot.com/mcp/`. Claude Code registers the server as `github` (local scope by default), which means tools appear in workflow context as `mcp__github__<tool_name>`. The server uses snake_case tool names (e.g., `list_issues`, `issue_read`, `create_pull_request`) — NOT camelCase. A `deprecated_tool_aliases.go` file in the server preserves old names as aliases, but Phase 40 should use the current canonical names to avoid depending on compatibility shims.

The most important architectural decision for Phase 40 is that **TOOL_MAP population is the deliverable**, not the individual workflow implementations. Every GitHub tool call in every workflow must flow through `bridge.call('github:...')` → TOOL_MAP lookup → `mcp__github__<raw_name>`. This insulates all four workflows from future GitHub MCP server renames and makes the adapter layer contract real for the first time.

**Primary recommendation:** Populate TOOL_MAP and set `probeTool` for github in mcp-bridge.cjs first (Wave 0), then build the four workflow capabilities against the adapter (not against raw tool names directly).

---

## Standard Stack

### Core
| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `bin/lib/mcp-bridge.cjs` (existing) | Phase 39 deliverable | Central adapter — all GitHub MCP tool calls flow through it | Phase 39 architectural constraint; direct MCP calls bypassing bridge are a policy violation |
| GitHub MCP Server (`github` key in APPROVED_SERVERS) | Current (HTTP at `https://api.githubcopilot.com/mcp/`) | GitHub data source — issues, PRs, Actions | Official GitHub MCP server; already in APPROVED_SERVERS allowlist from Phase 39 |
| `mcp__github__*` tool namespace | Determined by server name `github` registered in Claude Code | How Claude Code surfaces GitHub MCP tools in workflow context | Claude Code format: `mcp__<server-name>__<tool-name>` — confirmed by existing project patterns (`mcp__context7__resolve-library-id`, `mcp__sequential-thinking__think`) |
| Node.js `node --input-type=module` with `createRequire()` | Existing Phase 39 pattern | Loading mcp-bridge.cjs from bash blocks in workflows | Phase 39 decision: required by posttooluse-validate hook; ESM+createRequire satisfies it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `bin/lib/core.cjs` | In-repo | File I/O, REQUIREMENTS.md read/write | Reading existing requirements before deduplication; writing synced entries |
| `.planning/mcp-connections.json` | Phase 39 schema | Stores `repo` metadata for connected GitHub repos | Read by sync workflow to know which repo to query; written by `/pde:connect github --confirm` |
| `.planning/REQUIREMENTS.md` | Existing file | Write target for GH-01 (issue sync) | Issues are appended as unchecked requirements under a `### GitHub Issues` section |

### Approved GitHub MCP Tools (Phase 40 TOOL_MAP entries)

| Canonical Name | Raw Tool Name | Purpose |
|----------------|---------------|---------|
| `github:probe` | `mcp__github__list_issues` | Probe — lightest read-only call; proves server connectivity |
| `github:list-issues` | `mcp__github__list_issues` | GH-01: Fetch issues for sync |
| `github:get-issue` | `mcp__github__issue_read` | GH-03: Fetch a single issue by number for brief pre-population |
| `github:create-pr` | `mcp__github__create_pull_request` | GH-02: Create a PR from handoff artifact |
| `github:list-workflow-runs` | `mcp__github__actions_list` | GH-04: List recent CI workflow runs |
| `github:get-workflow-run` | `mcp__github__actions_get` | GH-04: Get status of a specific workflow run |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub MCP server via bridge | GitHub REST API via `curl` or `gh` CLI | CLI approach would bypass the adapter layer and not satisfy INFRA-06; also doesn't work within workflow context without shell escaping issues |
| `issue_read` for single-issue fetch | `search_issues` with issue number | `issue_read` with method=`get` is the correct targeted fetch; `search_issues` is for fuzzy queries across repos |
| `actions_list` + `actions_get` for CI status | `pull_request_read` method=`get_check_runs` | PR-based check runs only show CI for a specific PR; `actions_list`/`actions_get` show repo-wide CI runs which is more useful for "pipeline status" display |

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
bin/lib/
└── mcp-bridge.cjs           MODIFY — populate TOOL_MAP + github probeTool

commands/
├── sync.md                  NEW — /pde:sync command (--github flag)
└── pipeline-status.md       NEW — /pde:pipeline-status command (or extend existing)

workflows/
├── sync-github.md           NEW — GH-01 issue sync workflow
├── handoff-create-prs.md    NEW — GH-02 PR creation workflow
├── brief-from-github.md     NEW — GH-03 brief pre-population workflow
└── pipeline-status.md       NEW (or extended) — GH-04 CI status display
```

### Pattern 1: TOOL_MAP Population (the foundational deliverable)

**What:** Add GitHub canonical→raw tool name entries to TOOL_MAP in mcp-bridge.cjs. Set `probeTool` for the github server entry in `APPROVED_SERVERS`.

**When to use:** Wave 0 of Phase 40, before any workflow is written.

**Exact changes to `bin/lib/mcp-bridge.cjs`:**

```javascript
// Source: Verified against github/github-mcp-server source (2026-03-18)
// File: pkg/github/issues.go, pullrequests.go, actions.go

const APPROVED_SERVERS = {
  github: {
    // ...existing fields...
    probeTool: 'mcp__github__list_issues', // Phase 40 fills — was null in Phase 39
    probeArgs: { owner: 'github', repo: 'github-mcp-server', state: 'OPEN', perPage: 1 },
    // probeArgs uses a public GitHub repo to confirm connectivity without requiring user repo config
  },
  // ...other servers unchanged...
};

const TOOL_MAP = {
  // GitHub — Phase 40 (verified against github/github-mcp-server source)
  'github:probe':               'mcp__github__list_issues',
  'github:list-issues':         'mcp__github__list_issues',
  'github:get-issue':           'mcp__github__issue_read',
  'github:create-pr':           'mcp__github__create_pull_request',
  'github:update-pr':           'mcp__github__update_pull_request',
  'github:list-workflow-runs':  'mcp__github__actions_list',
  'github:get-workflow-run':    'mcp__github__actions_get',
  'github:search-issues':       'mcp__github__search_issues',
};
```

**Source:** Verified from `github/github-mcp-server/pkg/github/issues.go`, `pullrequests.go`, `actions.go`, `deprecated_tool_aliases.go` (confirming current canonical names)

### Pattern 2: Workflow Probe Gate (all four GitHub workflows)

**What:** Every GitHub workflow starts with a probe gate. If GitHub MCP is unavailable, the command completes in degraded mode rather than failing.

**When to use:** First step in every GitHub-dependent workflow.

```bash
# Used in every GitHub workflow's initialization step
PROBE_RESULT=$(node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.probe('github');
process.stdout.write(JSON.stringify(result) + '\n');
EOF
)
```

Parse `PROBE_RESULT`. If `available: false` and `reason` is `probe_not_implemented`:
- Phase 40 has populated `probeTool` — this case means GitHub is truly not connected
- Display: "GitHub MCP is not connected. Run /pde:connect github to set up. [command] will run in degraded mode."
- Execute the non-MCP parts of the command (e.g., for sync: report current state without GitHub data)

If `available: false` and `reason` is `probe_deferred` or `not_configured`:
- GitHub server entry in APPROVED_SERVERS has no probeTool (Phase 39 state) — Phase 40 eliminates this case

**Note:** Actual MCP tool calls happen in Claude Code's execution context, NOT inside the `node --input-type=module` bash block. The bash block only reads from mcp-bridge.cjs. MCP tool calls happen as normal workflow instructions after the probe gate.

### Pattern 3: Issue Sync to REQUIREMENTS.md (GH-01)

**What:** Read GitHub issues via MCP, deduplicate against existing REQUIREMENTS.md entries, append new ones under a `### GitHub Issues` section.

**Conflict resolution approach:** Use GitHub issue number as the stable ID. An issue is "already synced" if REQUIREMENTS.md contains `#<issue_number>` in the same line. Never delete existing requirements. Only append.

**Sync entry format:**
```markdown
- [ ] **GH-<number>**: <issue title> ([#<number>](https://github.com/<owner>/<repo>/issues/<number>))
```

**MCP tool call sequence:**
```
1. Call mcp__github__list_issues with:
   - owner: <from mcp-connections.json repo field>
   - repo: <from mcp-connections.json repo field>
   - state: "OPEN"
   - perPage: 50 (default; loop with `after` cursor for repos with >50 open issues)

2. For each issue: check if #<number> already appears in REQUIREMENTS.md
   - If yes: skip (do not duplicate)
   - If no: add to append list

3. Append new entries to REQUIREMENTS.md under ### GitHub Issues section
   - Create section if it doesn't exist
```

**Pagination:** `list_issues` supports cursor-based pagination via the `after` parameter. The response includes `endCursor` when more pages exist. Fetch up to 200 issues (4 pages of 50) before stopping to prevent runaway sync.

### Pattern 4: PR Creation with Confirmation Gate (GH-02)

**What:** `/pde:handoff --create-prs` reads handoff artifacts, constructs PR creation payloads, presents a confirmation list to the user, and only proceeds after explicit user approval.

**Confirmation gate format (display before any write):**
```
GitHub PRs to create:
  1. [<title>] <head> → <base> in <owner>/<repo>
  2. ...

Create these N PR(s)? (y/n)
```

If user confirms: call `mcp__github__create_pull_request` for each.
If user declines: stop, report "No PRs created."

**Required `create_pull_request` params (all required):**
- `owner`: repo owner (from mcp-connections.json)
- `repo`: repo name (from mcp-connections.json)
- `title`: PR title (from handoff artifact HND-handoff-spec-v{N}.md title)
- `head`: branch name (from handoff artifact or user-provided)
- `base`: target branch (default: `main` or from config)

**Optional params:**
- `body`: PR description (from handoff spec summary)
- `draft`: boolean (default: false)
- `maintainer_can_modify`: boolean (default: true)

**Source:** Verified from `github/github-mcp-server/pkg/github/pullrequests.go`

### Pattern 5: Brief Pre-population from GitHub Issue (GH-03)

**What:** `/pde:brief --from-github <issue-url-or-number>` calls `issue_read` to fetch title, body, and labels, then uses those to pre-fill the brief template.

**Parsing the `--from-github` argument:**
- If it looks like a URL (`https://github.com/<owner>/<repo>/issues/<number>`): extract owner, repo, issue_number from URL segments
- If it looks like a bare number: use owner/repo from `mcp-connections.json`
- If it looks like `<owner>/<repo>#<number>`: parse accordingly

**MCP tool call:**
```
mcp__github__issue_read with:
  method: "get"
  owner: <parsed owner>
  repo: <parsed repo>
  issue_number: <parsed number>
```

**Response fields used:**
- `title` → brief `## Problem Statement` section (issue title as starting point)
- `body` → brief `## Context` section (full issue body, formatted as blockquote)
- `labels[]` → brief `## Constraints` section (labels like `type:bug`, `priority:high`)

**Brief pre-population rule:** Pre-filled sections are marked with `[from GitHub #<number>]` suffix so users know which content came from GitHub and which was generated. The brief still runs the full generation pipeline — GitHub data is context, not replacement.

### Pattern 6: CI Status in Pipeline Output (GH-04)

**What:** Display recent GitHub Actions workflow run statuses as part of pipeline status output. Not a new command — integrated into existing pipeline/health output.

**MCP tool call sequence:**
```
1. mcp__github__actions_list with:
   method: "list_workflow_runs"
   owner: <from mcp-connections.json>
   repo: <from mcp-connections.json>
   per_page: 5  (last 5 runs)

2. For each run of interest:
   mcp__github__actions_get with:
     method: "get_workflow_run"
     owner: <same>
     repo: <same>
     resource_id: <run_id>
```

**Display format:**
```
GitHub Actions (last 5 runs):
  push/main    ci.yml    completed  success    2 min ago
  push/main    ci.yml    completed  failure    1 hr ago
  pr/feature   ci.yml    in_progress  --       running now
```

**Status values to handle:** `queued`, `in_progress`, `completed`, `requested`, `waiting` (conclusion values when completed: `success`, `failure`, `cancelled`, `skipped`, `timed_out`)

### Pattern 7: repo field in mcp-connections.json

**What:** The `connect github --confirm` flow must capture the GitHub repo (`<owner>/<repo>`) from the user so it can be stored in `mcp-connections.json` for all four workflows to read.

**Updated mcp-connections.json schema (Phase 40 extension):**
```json
{
  "schema_version": "1.0",
  "connections": {
    "github": {
      "server_key": "github",
      "display_name": "GitHub",
      "transport": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "status": "connected",
      "connected_at": "2026-03-18T10:00:00Z",
      "last_probe_at": "2026-03-18T12:30:00Z",
      "last_probe_status": "connected",
      "repo": "owner/repo-name"   // NEW in Phase 40 — required for all sync operations
    }
  }
}
```

**How it's captured:** The `connect github --confirm` workflow step (in `workflows/connect.md`) already calls `updateConnectionStatus()`. Phase 40 extends that flow: before `--confirm`, the workflow asks the user "Which GitHub repo should PDE sync with? (format: owner/repo)". The answer is passed as `extraFields.repo` to `updateConnectionStatus()`.

### Anti-Patterns to Avoid

- **Direct raw MCP tool calls in workflows:** Never use `mcp__github__list_issues` directly in a workflow. Always call `bridge.call('github:list-issues', args)` to get the raw tool name from TOOL_MAP, then use the returned `toolName`. This is the whole point of the adapter layer.
- **Using deprecated alias tool names:** Do not use old tool names like `list_workflow_runs` (deprecated alias → `actions_list`). Use current canonical names in TOOL_MAP.
- **Storing GitHub API responses in `.planning/`:** Sync writes structured requirement entries to REQUIREMENTS.md only. Never store raw GitHub API payloads in `.planning/` files.
- **Creating PRs without confirmation:** GH-02 requires an explicit user confirmation gate before ANY write to GitHub. No silent write-back ever.
- **Hardcoding owner/repo:** Never hardcode a GitHub repo path in workflows. Always read from `mcp-connections.json` via `bridge.loadConnections().connections.github.repo`.
- **Assuming `probe()` result is a live MCP call:** `probe()` in mcp-bridge.cjs is a coordination point — it does NOT make an actual MCP call. After `probe()` returns `probeTool`, the workflow layer must make the actual MCP call using `probeTool` and catch errors independently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub API client | Custom `fetch()` or `curl` calls to `api.github.com` | `mcp__github__*` tools via bridge | Custom client bypasses the adapter layer, violates INFRA-06, and requires managing auth tokens (GitHub MCP handles OAuth) |
| Issue deduplication algorithm | Custom fuzzy-match on issue titles | Exact match on `#<issue_number>` in REQUIREMENTS.md | Issue numbers are stable and unique; title matching produces false positives and false negatives |
| PR field validation | Custom checks for branch existence, owner format | GitHub MCP server returns clear error messages on invalid params | Server-side validation is authoritative; duplicating it in the workflow wastes code |
| Pagination cursor management | Custom loop with page numbers | GitHub MCP pagination uses cursor (`after` = `endCursor`) — follow the cursor pattern until `hasNextPage` is false or 200-issue cap is hit | Server uses GraphQL cursor pagination, not REST page numbers; page-number approach will miss issues |
| CI status polling | Polling loop checking run status repeatedly | Single `actions_list` + `actions_get` call for display; re-run `/pde:pipeline-status` if user wants refresh | Status display is a snapshot, not a live view; polling in a workflow context is wrong architecture |
| Confirmation gate UI | Custom multi-step prompt | Display list → ask `y/n` → proceed or abort | Simplest pattern that satisfies VAL-03; matches how `/pde:connect --confirm` works |

**Key insight:** The GitHub MCP server already handles authentication, rate limiting, error formatting, and API version management. The workflow layer should be thin — describe what to fetch and what to do with the data, not how to talk to the GitHub API.

---

## Common Pitfalls

### Pitfall 1: Wrong Tool Names (snake_case vs. camelCase)

**What goes wrong:** Developer writes `mcp__github__listIssues` (camelCase) instead of `mcp__github__list_issues` (snake_case). Tool is not found.

**Why it happens:** Pre-existing Claude training data may remember old tool names from v0 GitHub MCP server or from `modelcontextprotocol/servers` community implementations that used camelCase.

**How to avoid:** All GitHub MCP server tool names are snake_case, verified from source. Use the TOOL_MAP entries in this research — they are sourced from the server's Go source code.

**Warning signs:** Any `mcp__github__*` call returning "tool not found" when GitHub is confirmed connected.

### Pitfall 2: Deprecated Alias Confusion

**What goes wrong:** Workflow uses `mcp__github__list_workflow_runs` or `mcp__github__get_workflow_run` (the old tool names). These are aliases that currently work but are not guaranteed forward-compatible.

**Why it happens:** The `deprecated_tool_aliases.go` file exists in the server source, confirming that old names currently redirect to new names. But aliases are not guaranteed to persist.

**How to avoid:** TOOL_MAP must use current canonical names: `mcp__github__actions_list` (not `mcp__github__list_workflow_runs`), `mcp__github__actions_get` (not `mcp__github__get_workflow_run`).

**Warning signs:** TOOL_MAP entries using old-style verb-first names for Actions tools.

### Pitfall 3: Missing `repo` in mcp-connections.json

**What goes wrong:** Sync workflow runs but has no owner/repo to query. Workflow tries to use a blank or undefined repo value, causing the GitHub MCP tool call to fail with a missing parameter error.

**Why it happens:** Phase 39's `connect github --confirm` flow records status but not repo metadata. Phase 40 must extend the connect flow to capture `repo`.

**How to avoid:** The `connect github` workflow should ask for `owner/repo` input before `--confirm`. The `updateConnectionStatus()` call must include `{ repo: '<owner>/<repo>' }` in extraFields.

**Warning signs:** `bridge.loadConnections().connections.github.repo` is undefined or empty.

### Pitfall 4: `state` Parameter Case Sensitivity for list_issues

**What goes wrong:** Workflow calls `list_issues` with `state: "open"` (lowercase) and gets no results or an error.

**Why it happens:** The GitHub MCP server uses GraphQL-style enum values for `list_issues`, which are UPPERCASE: `"OPEN"` and `"CLOSED"`. The REST API uses lowercase; the MCP server uses uppercase.

**How to avoid:** Always pass `state: "OPEN"` (all caps) when calling `mcp__github__list_issues`.

**Warning signs:** `list_issues` returning empty results even though the repo has open issues.

### Pitfall 5: PR Creation Without Confirming Branch Exists

**What goes wrong:** `/pde:handoff --create-prs` calls `create_pull_request` with a `head` branch that does not exist on GitHub. GitHub MCP returns an error.

**Why it happens:** The handoff artifact may reference a local branch name, but the branch must be pushed to GitHub before a PR can be created.

**How to avoid:** Before the confirmation gate, check that the user has pushed the branch. Add a pre-flight check step: "Confirm that branch `<head>` has been pushed to GitHub before proceeding."

**Warning signs:** `create_pull_request` returning an "Invalid value for 'head'" or "Reference does not exist" error.

### Pitfall 6: `issue_read` `issue_number` Type

**What goes wrong:** Workflow passes `issue_number` as a string (`"123"`) instead of an integer (`123`). GitHub MCP server returns a type error.

**Why it happens:** URL parsing produces strings. If the workflow parses the issue number from a URL and passes it directly without converting to integer, the tool call fails.

**How to avoid:** When parsing `--from-github <url>`, convert the extracted issue number to integer: `parseInt(issueNumber, 10)`.

**Warning signs:** `issue_read` returning "invalid type for issue_number" when called with a string value.

### Pitfall 7: Rate Limiting on Large Repos

**What goes wrong:** Sync on a repo with hundreds of open issues exceeds API rate limits. GitHub MCP returns a 429 or rate limit error mid-pagination.

**Why it happens:** GitHub API has rate limits (5000 requests/hour for authenticated requests). Paginating through many issues consumes multiple requests quickly.

**How to avoid:** Cap sync at 200 issues maximum (4 pages of 50). Display a message when cap is hit: "Showing first 200 open issues. Run `/pde:sync --github` again to check for new issues." The GitHub MCP server's own rate limit handling will surface errors — catch them and degrade gracefully.

**Warning signs:** Sync stalling or returning partial results on large repositories.

---

## Code Examples

Verified patterns from official sources:

### TOOL_MAP Population in mcp-bridge.cjs
```javascript
// Source: Verified from github/github-mcp-server source (2026-03-18)
// Canonical names from issues.go, pullrequests.go, actions.go
const TOOL_MAP = {
  // GitHub — Phase 40
  'github:probe':               'mcp__github__list_issues',
  'github:list-issues':         'mcp__github__list_issues',
  'github:get-issue':           'mcp__github__issue_read',
  'github:create-pr':           'mcp__github__create_pull_request',
  'github:update-pr':           'mcp__github__update_pull_request',
  'github:list-workflow-runs':  'mcp__github__actions_list',
  'github:get-workflow-run':    'mcp__github__actions_get',
  'github:search-issues':       'mcp__github__search_issues',
};
```

### Probe Tool Configuration in APPROVED_SERVERS
```javascript
// Source: Phase 40 fills what Phase 39 left null
github: {
  // ...existing fields from Phase 39...
  probeTool: 'mcp__github__list_issues',
  probeArgs: {
    owner: 'github',        // Public repo — proves connectivity without needing user's repo config
    repo: 'github-mcp-server',
    state: 'OPEN',
    perPage: 1              // Minimal response to confirm server is alive
  },
},
```

### list_issues Call (GH-01 — correct params)
```
// Source: Verified from github/github-mcp-server/pkg/github/issues.go
Tool: mcp__github__list_issues
Parameters:
  owner: <string>        (required)
  repo: <string>         (required)
  state: "OPEN"          (uppercase — GraphQL enum, NOT "open")
  perPage: 50            (optional, max per page)
  after: <cursor>        (optional — for pagination; value = endCursor from previous response)

Response fields used for sync:
  nodes[].number         → GH-<number> requirement ID
  nodes[].title          → requirement description
  nodes[].url            → link in requirement entry
  nodes[].state          → skip CLOSED issues
  pageInfo.endCursor     → next page cursor
  pageInfo.hasNextPage   → whether to continue paginating
```

### issue_read Call (GH-03 — single issue fetch)
```
// Source: Verified from github/github-mcp-server/pkg/github/issues.go
Tool: mcp__github__issue_read
Parameters:
  method: "get"           (enum — "get" | "get_comments" | "get_sub_issues" | "get_labels")
  owner: <string>         (required)
  repo: <string>          (required)
  issue_number: <integer> (required — must be integer, not string)

Response fields used for brief pre-population:
  title          → brief problem statement seed
  body           → brief context/background seed
  labels[].name  → brief constraints/type tags
  assignees[].login → brief stakeholder notes
```

### create_pull_request Call (GH-02)
```
// Source: Verified from github/github-mcp-server/pkg/github/pullrequests.go
Tool: mcp__github__create_pull_request
Required parameters:
  owner: <string>         (repo owner — from mcp-connections.json)
  repo: <string>          (repo name — from mcp-connections.json)
  title: <string>         (PR title)
  head: <string>          (source branch — must already be pushed to GitHub)
  base: <string>          (target branch — typically "main")

Optional parameters:
  body: <string>          (PR description — from handoff spec summary)
  draft: false            (default — create as ready-for-review)
  maintainer_can_modify: true  (default — allow maintainer edits)
```

### actions_list Call (GH-04 — list recent runs)
```
// Source: Verified from github/github-mcp-server/pkg/github/actions.go
Tool: mcp__github__actions_list
Parameters:
  method: "list_workflow_runs"   (method enum value)
  owner: <string>                (required)
  repo: <string>                 (required)
  per_page: 5                    (show last 5 runs for status display)
  // resource_id is OPTIONAL for list_workflow_runs — omit to list all workflow runs

Response fields for status display:
  workflow_runs[].id              → use for actions_get follow-up calls
  workflow_runs[].name            → workflow name (e.g., "CI")
  workflow_runs[].status          → "queued" | "in_progress" | "completed"
  workflow_runs[].conclusion      → "success" | "failure" | "cancelled" etc. (only when completed)
  workflow_runs[].head_branch     → branch that triggered the run
  workflow_runs[].event           → "push" | "pull_request" etc.
  workflow_runs[].created_at      → ISO 8601 timestamp for "X min ago" display
```

### actions_get Call (GH-04 — specific run details)
```
// Source: Verified from github/github-mcp-server/pkg/github/actions.go
Tool: mcp__github__actions_get
Parameters:
  method: "get_workflow_run"     (method enum value)
  owner: <string>                (required)
  repo: <string>                 (required)
  resource_id: <integer>         (required — the workflow run ID from actions_list)
```

### Workflow Node Block Pattern (Phase 39 pattern — use for all GitHub workflows)
```bash
# Source: Phase 39 decision — posttooluse-validate requires ESM+createRequire pattern
# Use this to call mcp-bridge.cjs from workflow bash blocks

REPO_INFO=$(node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const connections = b.loadConnections();
const github = connections.connections && connections.connections.github;
const repo = github && github.repo || '';
process.stdout.write(JSON.stringify({ repo, status: github && github.status || 'not_configured' }) + '\n');
EOF
)
# Parse REPO_INFO to get owner/repo for MCP calls
```

### Sync Deduplication Check Pattern
```javascript
// Source: Project convention — REQUIREMENTS.md is append-only for sync
// Before appending, check if issue is already present
function isAlreadySynced(requirementsContent, issueNumber) {
  // Match any line containing #<number> followed by non-digit or end of line
  const pattern = new RegExp(`#${issueNumber}(?:\\D|$)`);
  return pattern.test(requirementsContent);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `modelcontextprotocol/servers` community GitHub server (camelCase tools) | Official `github/github-mcp-server` (snake_case tools) | Late 2024 | Official server is the standard; community server is deprecated for GitHub use |
| Individual verb-based Actions tools (`list_workflow_runs`, `get_workflow_run`) | Consolidated tools with `method` param (`actions_list`, `actions_get`) | 2025 (see deprecated_tool_aliases.go) | Fewer tools to maintain; method param selects operation |
| SSE transport for remote servers | HTTP (Streamable HTTP) transport | Early 2026 | GitHub MCP server uses HTTP at `https://api.githubcopilot.com/mcp/` |
| Individual PR CRUD tools | `pull_request_read` (for reads) + individual write tools (`create_pull_request`, `update_pull_request`) | Current | Read operations consolidated; write operations remain discrete |

**Deprecated/outdated:**
- `list_workflow_runs` (tool name): Deprecated alias → use `actions_list` with `method: "list_workflow_runs"`
- `get_workflow_run` (tool name): Deprecated alias → use `actions_get` with `method: "get_workflow_run"`
- `list_workflow_jobs` (tool name): Deprecated alias → use `actions_list` with `method: "list_workflow_jobs"`
- SSE transport: Do not use `--transport sse`; GitHub MCP uses HTTP

---

## Open Questions

1. **Probe args validation — public repo assumption**
   - What we know: `probeArgs` for github uses `github/github-mcp-server` as the test repo (a public GitHub repo that always exists and has open issues)
   - What's unclear: Whether this probe works if the user's GitHub auth token has restricted scope (e.g., only reads their private repos, not github.com public repos)
   - Recommendation: Implement probe with the public repo as primary. If probe fails on the public repo but user has confirmed connection, fall back to probing the user's configured `repo` from `mcp-connections.json`. Document this fallback in the connect workflow.

2. **GitHub repo capture in connect workflow**
   - What we know: `workflows/connect.md` handles `--confirm` by calling `updateConnectionStatus()`. It does not currently ask for `owner/repo`.
   - What's unclear: Whether Phase 40 should modify `workflows/connect.md` directly (adding a GitHub-specific branch) or create a `workflows/connect-github.md` for GitHub-specific steps
   - Recommendation: Modify `workflows/connect.md` to add a GitHub-specific branch (check if `SERVICE_KEY === 'github'` before `--confirm`) that asks for `owner/repo`. Keep other services unchanged. This is cleaner than forking the file.

3. **PR creation source — what handoff artifact fields to use**
   - What we know: `handoff.md` produces `HND-handoff-spec-v{N}.md`. The spec has a title and summary section.
   - What's unclear: Where does the `head` branch name come from? The handoff spec doesn't currently track which git branch the work is on.
   - Recommendation: `/pde:handoff --create-prs` should ask the user "Which branch contains this work?" as part of the pre-confirmation step. Do not try to auto-detect the current branch — the workflow context may not know which branch is "the right one".

4. **actions_list response format for `list_workflow_runs`**
   - What we know: `actions_list` with `method: list_workflow_runs` returns workflow runs. Exact JSON response field names were not verifiable from the Go source in this research session.
   - What's unclear: Exact field names in the response (e.g., is it `workflow_runs` or `runs` or `items`?)
   - Recommendation: MEDIUM confidence on response field names. The workflow implementation should handle a response parsing step that tries known field names and degrades gracefully if the shape differs. Validate against a live server in Wave 1.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — PDE uses Claude Code Nyquist assertions (inline behavioral checks in workflow output) |
| Config file | None |
| Quick run command | `/pde:sync --github --dry-run` (post-Phase 40, verify output format without writing) |
| Full suite command | `/pde:health` + manual smoke tests for each GH-* requirement |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GH-01 | `/pde:sync --github` reflects GitHub issues as requirements in REQUIREMENTS.md | smoke | `/pde:sync --github` — verify REQUIREMENTS.md contains `### GitHub Issues` section with entries matching `GH-<number>` format | ❌ Wave 0 |
| GH-02 | `/pde:handoff --create-prs` shows confirmation prompt before any GitHub write | smoke | `/pde:handoff --create-prs` — verify confirmation prompt appears listing PRs; verify NO PR is created when user responds `n` | ❌ Wave 0 |
| GH-03 | `/pde:brief --from-github <url>` pre-populates brief with issue context | smoke | `/pde:brief --from-github https://github.com/<owner>/<repo>/issues/<number>` — verify output brief contains `[from GitHub #<number>]` markers | ❌ Wave 0 |
| GH-04 | GitHub Actions CI status visible in pipeline status output | smoke | `/pde:pipeline-status` (or equivalent) — verify output contains GitHub Actions section with run statuses | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `/pde:health` — verify no .planning/ regressions
- **Per wave merge:** Smoke test each GH-* requirement manually (GitHub MCP must be connected)
- **Phase gate:** All four GH-* success criteria verified with live GitHub connection before Phase 41 begins

### Wave 0 Gaps

- [ ] `bin/lib/mcp-bridge.cjs` TOOL_MAP population (GitHub entries) + `probeTool` for github
- [ ] `commands/sync.md` — new command file for `/pde:sync`
- [ ] `workflows/sync-github.md` — GH-01 issue sync workflow
- [ ] `commands/sync.md` extension for `--create-prs` flag OR extend `commands/handoff.md`
- [ ] `workflows/handoff-create-prs.md` — GH-02 PR creation workflow
- [ ] `workflows/brief-from-github.md` — GH-03 brief pre-population workflow
- [ ] `commands/pipeline-status.md` (new) OR extended health/build command — GH-04 CI display
- [ ] `workflows/pipeline-status.md` — GH-04 CI status display workflow
- [ ] Extend `workflows/connect.md` to capture `owner/repo` for GitHub connections

---

## Sources

### Primary (HIGH confidence)
- `github/github-mcp-server/pkg/github/issues.go` — exact tool names: `list_issues`, `issue_read`, `issue_write`, `search_issues`, `add_issue_comment` and all parameters verified from source
- `github/github-mcp-server/pkg/github/pullrequests.go` — exact tool names: `pull_request_read`, `create_pull_request`, `update_pull_request`, `merge_pull_request` and all parameters verified from source
- `github/github-mcp-server/pkg/github/actions.go` — exact tool names: `actions_list`, `actions_get`, `actions_run_trigger` and method enum values verified from source
- `github/github-mcp-server/pkg/github/deprecated_tool_aliases.go` — complete list of deprecated-to-current tool name mappings; confirms canonical names and aliases
- `github/github-mcp-server/pkg/github/repositories.go` — confirmed repository tool names (not directly used in Phase 40 but establishes naming conventions)
- Project `bin/lib/mcp-bridge.cjs` (Phase 39 deliverable) — exact API surface, TOOL_MAP structure, APPROVED_SERVERS schema, `probe()` return shape, `updateConnectionStatus()` signature
- Project `references/mcp-integration.md` — confirmed `mcp__<server-name>__<tool-name>` format via `mcp__context7__resolve-library-id`, `mcp__sequential-thinking__think` examples
- Project `commands/handoff.md` — confirmed `mcp__sequential-thinking__*` allowed-tools pattern in command files
- Claude Code official docs (`code.claude.com/docs/en/mcp`) — confirmed OAuth token storage in system keychain, `/mcp__servername__promptname` format for MCP prompts, `local` scope default

### Secondary (MEDIUM confidence)
- `github/github-mcp-server/pkg/github/actions.go` response format — tool names HIGH confidence; exact response JSON field names for `actions_list` MEDIUM confidence (verified tool exists, response shape inferred from Go struct names)
- Probe strategy using `github/github-mcp-server` public repo as probe target — MEDIUM confidence (logical approach, not verified against a live connection)

### Tertiary (LOW confidence)
- `actions_list` response field names (`workflow_runs`, `pageInfo`, etc.) — LOW confidence; confirmed tool name and method values, but response JSON shape not verified from raw API response. Phase 40 Wave 1 implementation should validate field names against live server.

---

## Metadata

**Confidence breakdown:**
- GitHub MCP tool names: HIGH — verified from Go source files in `github/github-mcp-server`
- Tool parameters (required vs optional): HIGH — verified from Go source
- `actions_list`/`actions_get` response field names: MEDIUM — tool names confirmed, response shape inferred
- mcp-bridge.cjs integration pattern: HIGH — Phase 39 deliverable is in project; API surface read directly
- Workflow architecture (how to build sync, PR creation, brief, CI status): HIGH — derived from verified tool params and established project patterns

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (GitHub MCP server tool names are stable; 30-day window for HTTP API at `api.githubcopilot.com/mcp/`)
