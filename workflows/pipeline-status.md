<purpose>
Display recent GitHub Actions CI workflow run statuses for the connected GitHub repo. Shows the last 5 runs with event, branch, workflow name, status, conclusion, and relative time. Implements GH-04.
</purpose>

<process>

## Step 0 — Initialize

Parse $ARGUMENTS for flags:
- `--no-mcp`: boolean flag, default false. If present, skip MCP call and display a short notice.

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
  const lookup = b.call('github:list-workflow-runs', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ repo, status, toolName }) + '\n');
EOF
```

Parse the JSON output.

If `repo` is empty or `status` is not `connected`, display the following degraded message and stop (do NOT crash):
```
GitHub is not connected or no repo configured.
Run /pde:connect github to set up.
```

If `--no-mcp` flag is present, display and stop:
```
Pipeline status requires GitHub MCP. Skipped due to --no-mcp flag.
```

## Step 1 — Fetch CI Runs via MCP

Split `repo` on `/` to get `owner` and `repoName`.

Use the `toolName` returned by `bridge.call('github:list-workflow-runs', ...)` (i.e., `mcp__github__actions_list`) to call the GitHub MCP tool. This call happens in Claude Code's execution context as a normal tool use — NOT inside a bash block.

Call the tool with these parameters:
- `method`: `"list_workflow_runs"`
- `owner`: the parsed owner
- `repo`: the parsed repoName
- `per_page`: 5

<!-- Response field names validated against live server — update if shape differs. -->
The response should contain `workflow_runs[]`. If that field is not present, try common alternatives: `runs`, `items`, `data`. If none match, report the actual top-level keys returned so the user can see the raw shape:
```
Unexpected response shape from GitHub Actions API. Top-level keys: <key1>, <key2>, ...
Run /pde:mcp-status to check connection state.
```

If the MCP tool call fails entirely, display and stop (do NOT crash):
```
Could not fetch CI status from GitHub. The MCP server may be unavailable.
Run /pde:mcp-status to check connection state.
```

## Step 2 — Format and Display

Display a header line:
```
GitHub Actions — <owner>/<repo> (last 5 runs)
```

Followed by a blank line.

For each workflow run in the response, compute a relative time from `created_at` (ISO 8601 timestamp):
- If the run's `status` is `in_progress` or `queued`: show `running now`
- If less than 60 seconds ago: `<N> sec ago`
- If less than 3600 seconds ago: `<N> min ago`
- If less than 86400 seconds ago: `<N> hr ago`
- Otherwise: `<N> day ago` (or `<N> days ago`)

For `conclusion`: show `--` if `status` is not `completed` (run is still in progress or queued).

Display one row per run:
```
  <event>/<head_branch>    <workflow_name>    <status>    <conclusion>    <relative_time>
```

Where:
- `event`: the triggering event (e.g., `push`, `pull_request`, `schedule`, `workflow_dispatch`)
- `head_branch`: the branch that triggered the run
- `workflow_name`: the name of the workflow (from `.name` field)
- `status`: one of `queued`, `in_progress`, `completed`, `requested`, `waiting`
- `conclusion`: one of `success`, `failure`, `cancelled`, `skipped`, `timed_out` — or `--` if not yet completed
- `relative_time`: computed above

Status and conclusion values to handle:
- Status: `queued`, `in_progress`, `completed`, `requested`, `waiting`
- Conclusion (when completed): `success`, `failure`, `cancelled`, `skipped`, `timed_out`

After all rows, display a blank line followed by:
```
Run /pde:pipeline-status to refresh.
```

</process>
