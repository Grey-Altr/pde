<purpose>
Create Jira tickets from handoff artifacts. Reads the most recent HND-handoff-spec-v{N}.md, pre-flights valid issue types via getJiraProjectIssueTypesMetadata, constructs ticket payload with projectKey from mcp-connections.json and ADF-formatted description, presents a confirmation gate, and only creates the ticket after explicit user approval. Implements JIRA-03. Satisfies VAL-03 (write-back confirmation gate).
</purpose>

<process>

## /pde:handoff --create-jira-tickets — Jira Ticket Creation Pipeline

---

### Step 0 — Initialize and check Atlassian availability

Load project info from mcp-connections.json and verify Atlassian is connected:

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
let createToolName = '';
let typesToolName = '';
try {
  createToolName = b.call('jira:create-issue', {}).toolName;
  typesToolName = b.call('jira:get-project-types', {}).toolName;
} catch (err) {
  createToolName = '';
  typesToolName = '';
}
process.stdout.write(JSON.stringify({ projectKey, projectName, siteUrl, status, createToolName, typesToolName }) + '\n');
EOF
```

Parse the JSON output. The `projectKey` field contains the Jira project key (e.g., `MYPROJ`). The `createToolName` field is `mcp__atlassian__createJiraIssue`. The `typesToolName` field is `mcp__atlassian__getJiraProjectIssueTypesMetadata`.

If `projectKey` is empty or `status` is not `connected`, display:

```
Atlassian (Jira) is not connected or no project configured.
Run /pde:connect atlassian to set up.
Ticket creation skipped.
```

Stop here. Do NOT proceed with any further steps.

---

### Step 1 — Find handoff artifacts

Use the Glob tool to search for handoff spec files matching:

```
.planning/design/implementation/HND-handoff-spec-v*.md
```

If no files are found matching this pattern, display:

```
No handoff specs found. Run /pde:handoff first to generate a handoff spec.
```

Stop here.

If one or more files are found, select the latest version by finding the file with the highest `v{N}` number in its name. Parse the version number from each filename (e.g., `HND-handoff-spec-v3.md` → version 3) and select the maximum.

Use the Read tool to read the selected handoff spec file.

From the handoff spec, extract:
- **Title:** Look for the first `# ` heading in the file. If no `# ` heading exists, derive the title from the filename (convert `HND-handoff-spec-v{N}.md` to `Handoff Spec v{N}`).
- **Summary:** Look for a `## Summary` section. If found, use the first paragraph under it (up to 500 characters). If no `## Summary` section exists, use the first non-heading paragraph in the document (up to 500 characters).

---

### Step 2 — Pre-flight: Get valid issue types

Call `mcp__atlassian__getJiraProjectIssueTypesMetadata` (the `typesToolName` from Step 0) in Claude Code's execution context with:
- `projectKey`: from mcp-connections.json

This is a **read-only pre-flight call** — it retrieves available issue types for the project before any write is attempted.

From the response, find the first available issue type matching "Story" or "Task" (in that order of preference). If neither exists, use the first issue type in the list.

Store the selected issue type name as ISSUE_TYPE_NAME.

If the pre-flight call fails, default to `"Story"` and display:

```
Note: Could not verify issue types for project <projectKey>. Defaulting to "Story".
```

---

### Step 3 — Construct ticket payload

Build the Jira description in Atlassian Document Format (ADF) — Jira Cloud requires ADF, NOT plain markdown:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "<summary from handoff spec, up to 500 chars>"
        }
      ]
    }
  ]
}
```

The full payload for `mcp__atlassian__createJiraIssue`:
- `project`: `{ "key": "<projectKey>" }`
- `issuetype`: `{ "name": "<ISSUE_TYPE_NAME>" }`
- `summary`: title from the handoff spec
- `description`: the ADF JSON structure above
- `priority`: `{ "name": "Medium" }`

---

### Step 4 — Display confirmation gate (CRITICAL — no write without user approval)

Display the complete ticket details for user review before any Jira write:

```
Jira ticket to create:

  Project: <projectName> (<projectKey>)
  Type: <ISSUE_TYPE_NAME>
  Summary: <title>
  Description: <first 100 chars of summary>...
  Priority: Medium

Create this ticket in Jira? (y/n)
```

If the summary is shorter than 100 characters, display it in full without the ellipsis.

Wait for the user's response.

**CRITICAL:** If the user responds with anything OTHER than `y` or `yes` (case-insensitive), display:

```
No tickets created.
```

Stop here immediately. Do NOT call any MCP tool. Do NOT create any ticket.

Only proceed to Step 5 if the user explicitly responds with `y` or `yes` (case-insensitive).

---

### Step 5 — Create ticket via MCP (only after user confirms)

Using the `createToolName` from Step 0 (`mcp__atlassian__createJiraIssue`), call the tool in Claude Code's execution context with the constructed payload:

- `project`: `{ "key": "<projectKey>" }`
- `issuetype`: `{ "name": "<ISSUE_TYPE_NAME>" }`
- `summary`: title from the handoff spec
- `description`: the ADF JSON object (not a string — the structured object)
- `priority`: `{ "name": "Medium" }`

**If the call succeeds**, display:

```
Jira ticket created successfully!
  Key: <key from response>
  Summary: <title>
  URL: <siteUrl>/browse/<key>
```

**If the call fails**, display the error message and suggest common fixes:

```
Ticket creation failed: <error message>

Common causes:
  - Atlassian MCP server not authenticated (run /mcp to re-authenticate)
  - Project key '<projectKey>' may be invalid
  - Issue type '<ISSUE_TYPE_NAME>' may not be available for this project
  - Description format may need adjustment (ADF structure issue)

Try: Run /pde:connect atlassian --confirm to verify project configuration.
```

</process>

<anti_patterns>
- NEVER create a ticket without the user explicitly confirming with `y` or `yes`. Any other response (including `n`, `no`, empty, or anything else) results in "No tickets created." and immediate stop.
- NEVER call the raw MCP tool name `mcp__atlassian__createJiraIssue` without looking it up via `bridge.call('jira:create-issue')`. Always use the bridge lookup.
- NEVER hardcode projectKey or siteUrl — always read from mcp-connections.json via `loadConnections()`.
- NEVER use plain markdown for the Jira description field — always wrap in ADF format with `"type": "doc"` and `"version": 1`.
- NEVER skip the pre-flight issue type check (Step 2) — required fields vary by project; "Story" and "Task" availability is not guaranteed.
- NEVER call any write MCP tool (`mcp__atlassian__createJiraIssue`) before Step 4 confirmation is obtained. Steps 0-2 are read-only (the `mcp__atlassian__getJiraProjectIssueTypesMetadata` call in Step 2 is a read operation).
- NEVER proceed if Atlassian status is not `connected` — always check Step 0 guard.
</anti_patterns>
