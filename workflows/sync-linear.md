<purpose>
Sync open Linear issues into REQUIREMENTS.md under a ### Linear Issues section, and annotate ROADMAP.md with active Linear cycle info. Fetches issues and cycles via the MCP bridge adapter (never raw tool names), deduplicates against existing REQUIREMENTS.md content, appends new entries in PDE requirement format, and handles dry-run and degraded mode when Linear MCP is unavailable. Implements LIN-01 and LIN-02.
</purpose>

<process>

## Step 0 — Initialize and Parse Arguments

Parse $ARGUMENTS for flags:
- `--dry-run`: boolean flag, default false. If present, show what would be written but do not write.

Load team info and look up the canonical tool name from mcp-bridge.cjs:

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
  const lookup = b.call('linear:list-issues', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ teamId, teamName, status, toolName }) + '\n');
EOF
```

Parse the JSON output. If `teamId` is empty or `status` is not `connected`, display:

```
Linear is not connected or no team configured.
Run /pde:connect linear to set up, then /pde:connect linear --confirm to select your team.
Sync skipped — no changes to REQUIREMENTS.md.
```

Stop here. Do NOT crash.

## Step 1 — Probe Linear MCP Availability

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.probe('linear')) + '\n');
EOF
```

If probe returns `status: 'not_configured'` (probeTool is null — should not happen after Phase 41 Plan 01), display:
```
Linear MCP server is not available. Run /pde:connect linear to set up.
Sync will run in degraded mode — showing current REQUIREMENTS.md state without Linear data.
```
Then read `.planning/REQUIREMENTS.md` and display the current `### Linear Issues` section if it exists. Stop here.

If probe returns `status: 'probe_deferred'`, continue (normal — probe tool is configured but actual call happens in workflow context).

## Step 2 — Fetch Linear Issues via MCP

Use the `toolName` returned by `bridge.call('linear:list-issues', ...)` (i.e., `mcp__linear__list_issues`) to call the Linear MCP tool. This call happens in Claude Code's execution context as a normal tool use — NOT inside a bash block.

Call the tool with these parameters:
- `limit`: 50
- `sortBy`: `"createdAt"`
- `sortDirection`: `"DESC"`

Collect all issues from the response. Each issue should have: `identifier` (e.g., "ENG-42"), `title`, `url`, and optionally `state.name`.

**Adaptive response handling:** If the response does not have an `identifier` field, try `id` field. If neither exists, log a warning and skip that issue. The exact response schema has MEDIUM confidence from research — handle gracefully.

Handle pagination: if the response includes more results available (check for pagination cursor/token), make additional calls with the cursor until no more pages or 4 pages total (200 issues max). If cap reached, display:
```
Showing first 200 open Linear issues. Run /pde:sync --linear again later to check for new issues.
```

If the MCP tool call fails (error or unexpected response), display:
```
Could not fetch issues from Linear. The MCP server may be unavailable.
Run /pde:mcp-status to check connection state.
```
Fall back to degraded mode: show current ### Linear Issues section from REQUIREMENTS.md if it exists. Do NOT crash.

## Step 3 — Deduplicate Against Existing REQUIREMENTS.md

Read `.planning/REQUIREMENTS.md`.

For each fetched issue with identifier `ID` (e.g., "ENG-42"), check if `LIN-ID` already appears in the file (e.g., `LIN-ENG-42`). If found, skip — already synced.

Collect the list of new issues NOT yet present.

## Step 4 — Append New Issues to REQUIREMENTS.md

If `--dry-run`:
- Display what would be appended:
  ```
  Dry run — no changes written to REQUIREMENTS.md.

  Would add <N> new issue(s):
    - **LIN-<identifier>**: <title> ([<identifier>](<url>))
    ...
  ```
- Stop without writing.

If NOT dry-run and there are new issues:

1. Find or create `### Linear Issues` section in REQUIREMENTS.md:
   - If section exists, find its position after the heading.
   - If not, append before the `---` footer if present, or at end of file.

2. Append each new issue in this exact format:
   ```
   - [ ] **LIN-<identifier>**: <issue title> ([<identifier>](<url>))
   ```
   Example: `- [ ] **LIN-ENG-42**: Fix login timeout ([ENG-42](https://linear.app/team/issue/ENG-42))`

3. Write updated REQUIREMENTS.md.

If no new issues, skip the write.

## Step 5 — Fetch Linear Cycles and Annotate ROADMAP.md (LIN-02)

Look up the cycle tool:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
let toolName = '';
try {
  const lookup = b.call('linear:list-cycles', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ toolName }) + '\n');
EOF
```

If toolName is empty, skip cycle mapping silently.

Call `mcp__linear__list_cycles` (the toolName from above) in Claude Code's execution context. No required parameters — the server returns cycles for the authenticated workspace.

From the response, find cycles where `completedAt` is null or `status` is `"started"` (active cycles). For each active cycle, extract: `name`, `endsAt`, `progress` (if available, convert to percentage).

Read `.planning/ROADMAP.md`. Find the `### Phase 41:` line (or the current active phase). Insert or update an HTML comment line immediately after the phase heading:

```
<!-- Linear Active Cycle: <name> (ends <endsAt formatted as YYYY-MM-DD>, <progress>% complete) -->
```

If multiple active cycles exist, write one comment per cycle.

If `--dry-run`, display what would be written but do not modify ROADMAP.md.

If the cycle MCP call fails, skip cycle mapping silently — issue sync (LIN-01) is the primary deliverable. Display:
```
Note: Could not fetch Linear cycles. Cycle mapping skipped.
```

## Step 6 — Display Summary

```
Linear Sync Complete (<teamName>)

  Issues fetched: <total>
  Already synced:  <skipped>
  Newly added:     <added>

New requirements added to .planning/REQUIREMENTS.md under ### Linear Issues.
```

If cycles were mapped:
```
  Active cycles annotated in ROADMAP.md: <count>
```

If no new issues:
```
All Linear issues already synced. No changes to REQUIREMENTS.md.

  Issues fetched: <total>
  Already synced:  <total>
  Newly added:     0
```

</process>
