<purpose>
Sync Jira issues into REQUIREMENTS.md under a ### Jira Issues section, and fetch Jira epics into a ## Jira Epics reference table. Queries issues via searchJiraIssuesUsingJql through the MCP bridge adapter (never raw tool names), deduplicates against existing REQUIREMENTS.md content, appends new entries, and handles dry-run and degraded mode. Implements JIRA-01 and JIRA-02.
</purpose>

<process>

## Step 0 — Initialize and Parse Arguments

Parse $ARGUMENTS for flags:
- `--dry-run`: boolean flag, default false. If present, show what would be written but do not write.

Load project info from mcp-connections.json:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const atl = conn.connections && conn.connections.atlassian;
const projectKey = atl && atl.projectKey || '';
const projectName = atl && atl.projectName || '';
const siteUrl = atl && atl.siteUrl || '';
const status = atl && atl.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('jira:search-issues', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ projectKey, projectName, siteUrl, status, toolName }) + '\n');
EOF
```

Parse the JSON output. If `projectKey` is empty or `status` is not `connected`, display:

```
Atlassian (Jira) is not connected or no project configured.
Run /pde:connect atlassian to set up, then /pde:connect atlassian --confirm to select your project.
Sync skipped — no changes to REQUIREMENTS.md.
```

Stop. Do NOT crash.

## Step 1 — Probe Atlassian MCP Availability

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.probe('atlassian')) + '\n');
EOF
```

If probe returns `status: 'not_configured'` (probeTool is null — should not happen after Phase 41 Plan 01), display:
```
Atlassian MCP server is not available. Run /pde:connect atlassian to set up.
Sync will run in degraded mode — showing current REQUIREMENTS.md state without Jira data.
```
Then read `.planning/REQUIREMENTS.md` and display the current `### Jira Issues` section if it exists. Stop here.

If probe returns `status: 'probe_deferred'`, continue (normal — probe tool is configured but actual call happens in workflow context).

## Step 2 — Fetch Jira Issues via MCP

Use the `toolName` returned by `bridge.call('jira:search-issues', ...)` (i.e., `mcp__atlassian__searchJiraIssuesUsingJql`) to call the Jira MCP tool. This call happens in Claude Code's execution context as a normal tool use — NOT inside a bash block.

Call the tool with these parameters:
- `jql`: `'project = "<projectKey>" AND issuetype != Epic AND status != Done ORDER BY created DESC'`
  (Replace `<projectKey>` with the actual project key from mcp-connections.json)
- `maxResults`: 50

Collect all issues from the response. Each issue should have `key` (e.g., "PROJ-42") and `fields.summary`.

**Pagination:** Check for `nextPageToken` in the response. If present and not null, call `mcp__atlassian__searchJiraIssuesUsingJql` again with the same JQL plus `nextPageToken: <token>`. Cap at 4 pages (200 issues). If cap reached:
```
Showing first 200 Jira issues. Run /pde:sync --jira again later to check for new issues.
```

**CRITICAL:** Use `nextPageToken` for pagination, NOT `startAt`. The Atlassian MCP server uses cursor-based pagination.

If the MCP tool call fails (error or unexpected response), display:
```
Could not fetch issues from Jira. The MCP server may be unavailable.
Run /pde:mcp-status to check connection state.
```
Fall back to degraded mode: show current ### Jira Issues section from REQUIREMENTS.md if it exists. Do NOT crash.

## Step 3 — Deduplicate Against Existing REQUIREMENTS.md

Read `.planning/REQUIREMENTS.md`.

For each fetched issue with key `KEY` (e.g., "PROJ-42"), check if `JIRA-KEY` already appears in the file (e.g., `JIRA-PROJ-42`). If found, skip — already synced.

Collect the list of new issues NOT yet present.

## Step 4 — Append New Issues to REQUIREMENTS.md

If `--dry-run`:
- Display what would be appended:
  ```
  Dry run — no changes written to REQUIREMENTS.md.

  Would add <N> new issue(s):
    - **JIRA-<key>**: <summary> ([<key>](<siteUrl>/browse/<key>))
    ...
  ```
- Stop without writing.

If NOT dry-run and there are new issues:

1. Find or create `### Jira Issues` section in REQUIREMENTS.md:
   - If section exists, find its position after the heading.
   - If not, append before the `---` footer if present, or at end of file.

2. Append each new issue in this exact format:
   ```
   - [ ] **JIRA-<key>**: <issue summary> ([<key>](<siteUrl>/browse/<key>))
   ```
   Example: `- [ ] **JIRA-PROJ-42**: Fix login timeout ([PROJ-42](https://myorg.atlassian.net/browse/PROJ-42))`

3. Write updated REQUIREMENTS.md.

If no new issues, skip the write.

## Step 5 — Fetch Jira Epics and Write Reference Table (JIRA-02)

Look up the search tool again for epics (same `mcp__atlassian__searchJiraIssuesUsingJql` tool, different JQL):

Call the tool in Claude Code's execution context with:
- `jql`: `'project = "<projectKey>" AND issuetype = Epic ORDER BY created DESC'`
  (Replace `<projectKey>` with the actual project key from mcp-connections.json)
- `maxResults`: 50

From the response, collect each epic's `key`, `fields.summary`, and `fields.status.name` (or status category name if `fields.status` is not available).

Read `.planning/REQUIREMENTS.md`. Find or create a `## Jira Epics (from <projectKey>)` section. Replace its contents (this is a reference table, not an append-only list) with:

```markdown
## Jira Epics (from <projectKey>)

| Epic Key | Summary | Status |
|----------|---------|--------|
| <key>    | <summary> | <status> |
| ...      | ...       | ...      |
```

If `--dry-run`, display the table without writing.

If the epic fetch fails, skip silently — issue sync (JIRA-01) is the primary deliverable:
```
Note: Could not fetch Jira epics. Epic mapping skipped.
```

## Step 6 — Display Summary

If new issues were added (or dry-run showed additions):
```
Jira Sync Complete (<projectKey>)

  Issues fetched: <total>
  Already synced:  <skipped>
  Newly added:     <added>

New requirements added to .planning/REQUIREMENTS.md under ### Jira Issues.
```

If epics were mapped:
```
  Jira epics reference table updated: <count> epics
```

If no new issues:
```
All Jira issues already synced. No changes to REQUIREMENTS.md.

  Issues fetched: <total>
  Already synced:  <total>
  Newly added:     0
```

</process>
