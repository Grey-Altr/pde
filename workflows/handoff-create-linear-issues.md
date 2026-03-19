<purpose>
Create Linear issues from handoff artifacts. Reads the most recent HND-handoff-spec-v{N}.md, constructs issue payload with teamId from mcp-connections.json, presents a confirmation gate to the user, and only creates the issue after explicit user approval. Implements LIN-03. Satisfies VAL-03 (write-back confirmation gate).
</purpose>

<process>

## /pde:handoff --create-linear-issues — Linear Issue Creation Pipeline

---

### Step 0 — Initialize and check Linear availability

Load team info from mcp-connections.json and verify Linear is connected:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const lin = conn.connections && conn.connections.linear;
const teamId = lin && lin.teamId || '';
const teamName = lin && lin.teamName || '';
const status = lin && lin.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('linear:create-issue', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ teamId, teamName, status, toolName }) + '\n');
EOF
```

Parse the JSON output. The `teamId` field contains the Linear team identifier. The `toolName` field confirms the MCP tool name to use (`mcp__linear__create_issue`).

If `teamId` is empty or `status` is not `connected`, display:

```
Linear is not connected or no team configured.
Run /pde:connect linear to set up.
Issue creation skipped.
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

### Step 2 — Construct issue payload

The issue will be created with:
- `teamId`: from mcp-connections.json (the Linear team identifier)
- `title`: the title extracted from the handoff spec
- `description`: the summary extracted from the handoff spec (Linear supports markdown in description)

No additional user input is needed (unlike PR creation which needs a branch name). Linear issues only require `teamId` and `title`.

---

### Step 3 — Display confirmation gate (CRITICAL — no write without user approval)

Display the complete issue details for user review before any Linear write:

```
Linear issue to create:

  Title: <title>
  Team: <teamName> (<teamId>)
  Description: <first 100 chars of summary>...

Create this issue in Linear? (y/n)
```

If the summary is shorter than 100 characters, display it in full without the ellipsis.

Wait for the user's response.

**CRITICAL:** If the user responds with anything OTHER than `y` or `yes` (case-insensitive), display:

```
No issues created.
```

Stop here immediately. Do NOT call any MCP tool. Do NOT create any issue.

Only proceed to Step 4 if the user explicitly responds with `y` or `yes` (case-insensitive).

---

### Step 4 — Create issue via MCP (only after user confirms)

Using the tool name returned by `bridge.call('linear:create-issue')` — which is `mcp__linear__create_issue` — call the tool in Claude Code's execution context with:

- `teamId`: the team ID from mcp-connections.json
- `title`: the title from the handoff spec
- `description`: the summary from the handoff spec

**If the call succeeds**, display:

```
Linear issue created successfully!
  Title: <title>
  Identifier: <identifier from response>
  URL: <url from response>
```

**If the call fails**, display the error message and suggest common fixes:

```
Issue creation failed: <error message>

Common causes:
  - Linear MCP server not authenticated (run /mcp to re-authenticate)
  - Team ID '<teamId>' may be invalid (run /pde:connect linear --confirm to reselect)
```

</process>

<anti_patterns>
- NEVER create an issue without the user explicitly confirming with `y` or `yes`. Any other response (including `n`, `no`, empty, or anything else) results in "No issues created." and immediate stop.
- NEVER call the raw MCP tool name `mcp__linear__create_issue` without looking it up via `bridge.call('linear:create-issue')`. Always use the bridge lookup.
- NEVER hardcode teamId — always read from mcp-connections.json via `loadConnections()`.
- NEVER call any MCP tool before Step 3 confirmation is obtained. Steps 0-2 are read-only.
- NEVER proceed if Linear status is not `connected` — always check Step 0 guard.
</anti_patterns>
