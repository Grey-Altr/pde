<purpose>
Sync open GitHub issues into REQUIREMENTS.md under a ### GitHub Issues section. Fetches issues via the MCP bridge adapter (never raw tool names), deduplicates against existing REQUIREMENTS.md content, appends new entries in PDE requirement format, and handles dry-run, pagination (200-issue cap), and degraded mode when GitHub MCP is unavailable. Implements GH-01.
</purpose>

<process>

## Step 0 — Initialize and Parse Arguments

Parse $ARGUMENTS for flags:
- `--dry-run`: boolean flag, default false. If present, show what would be written but do not write.

Load repo info and look up the canonical tool name from mcp-bridge.cjs:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const gh = conn.connections && conn.connections.github;
const repo = gh && gh.repo || '';
const status = gh && gh.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('github:list-issues', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ repo, status, toolName }) + '\n');
EOF
```

Parse the JSON output. If `repo` is empty or `status` is not `connected`, display the following degraded-mode message and stop (do NOT crash):

```
GitHub is not connected or no repo configured.
Run /pde:connect github to set up, then /pde:connect github --confirm to record your repo.
Sync skipped — no changes to REQUIREMENTS.md.
```

## Step 1 — Probe GitHub MCP Availability

Call `b.probe('github')` to confirm the MCP server has a probe tool configured:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.probe('github')) + '\n');
EOF
```

If probe returns `status: 'not_configured'` (probeTool is null — this should not occur after Phase 40), display:
```
GitHub MCP server is not available. Run /pde:connect github to set up.
Sync will run in degraded mode — showing current REQUIREMENTS.md state without GitHub data.
```
Then read `.planning/REQUIREMENTS.md` and display the current `### GitHub Issues` section if it exists. Stop here.

If probe returns `status: 'probe_deferred'`, this is normal — continue. The probe tool is configured (Phase 40 set probeTool); the actual MCP call happens in the next step.

## Step 2 — Fetch GitHub Issues via MCP

Split the `repo` value on `/` to get `owner` and `repoName`.

Use the `toolName` returned by `bridge.call('github:list-issues', ...)` (i.e., `mcp__github__list_issues`) to call the GitHub MCP tool. This call happens in Claude Code's execution context as a normal tool use — NOT inside a bash block.

Call the tool with these parameters:
- `owner`: the parsed owner
- `repo`: the parsed repoName
- `state`: `"OPEN"` (UPPERCASE — GraphQL enum, NOT lowercase "open")
- `perPage`: 50

Collect all issue nodes from `nodes[]`. Each node contains: `number`, `title`, `url`.

Handle pagination: if the response includes `pageInfo.hasNextPage === true`, call `mcp__github__list_issues` again with `after: pageInfo.endCursor`, `owner`, `repo`, `state: "OPEN"`, `perPage: 50`. Cap at 4 pages total (200 issues maximum). If the cap is reached, display:
```
Showing first 200 open issues. Run /pde:sync --github again later to check for new issues.
```

If the MCP tool call fails (error or unexpected response shape), display:
```
Could not fetch issues from GitHub. The MCP server may be unavailable.
Run /pde:mcp-status to check connection state.
```
Then fall back to degraded mode: show current ### GitHub Issues section from REQUIREMENTS.md if it exists. Do NOT crash.

## Step 3 — Deduplicate Against Existing REQUIREMENTS.md

Read `.planning/REQUIREMENTS.md`.

For each fetched issue (with issue number `N`), check if `#N` already appears in the file followed by a non-digit character or end of line (regex: `#N\D` or `#N` at end of string). If found, skip that issue — it is already synced.

Collect the list of new issues NOT yet present in REQUIREMENTS.md.

## Step 4 — Append New Issues to REQUIREMENTS.md

If `--dry-run` flag is present:
- Display what would be appended:
  ```
  Dry run — no changes written to REQUIREMENTS.md.

  Would add <N> new issue(s):
    - **GH-<number>**: <title> ([#<number>](<url>))
    ...
  ```
- Stop here without writing.

If NOT dry-run and there are new issues to add:

1. Find or create the `### GitHub Issues` section in REQUIREMENTS.md:
   - If the section already exists, find its position (after the `### GitHub Issues` heading).
   - If the section does NOT exist, append it before the `---` footer if one is present, or at the end of the file otherwise.

2. Append each new issue in this exact format:
   ```
   - [ ] **GH-<number>**: <issue title> ([#<number>](https://github.com/<owner>/<repo>/issues/<number>))
   ```

3. Write the updated REQUIREMENTS.md.

If there are no new issues to add (all already synced), skip the write step entirely.

## Step 5 — Display Summary

If new issues were added (or dry-run showed additions):
```
GitHub Sync Complete (<owner>/<repo>)

  Issues fetched: <total>
  Already synced:  <skipped>
  Newly added:     <added>

New requirements added to .planning/REQUIREMENTS.md under ### GitHub Issues.
```

If no new issues:
```
All GitHub issues already synced. No changes to REQUIREMENTS.md.

  Issues fetched: <total>
  Already synced:  <total>
  Newly added:     0
```

</process>
