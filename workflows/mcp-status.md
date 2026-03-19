<purpose>
Display connection status for all 5 approved MCP integrations (github, linear, figma, pencil, atlassian) with actionable degraded-mode messages for disconnected, not_configured, and degraded servers. Implements INFRA-03: any unavailable server produces an actionable message rather than crashing.
</purpose>

<required_reading>
@${CLAUDE_PLUGIN_ROOT}/references/mcp-integration.md
</required_reading>

<process>

## 0. Initialize

Parse $ARGUMENTS:
- `--json`: boolean flag, default false. If present, output raw JSON and stop.
- `--no-mcp`: boolean flag, default false. If present, skip all probe calls and show stored metadata only.

## 1. Load Status Data

Run the following bash command to get all server statuses from mcp-bridge.cjs via getAllStatuses():

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.getAllStatuses()) + '\n');
EOF
```

Parse the JSON output into a `statuses` object keyed by server key (github, linear, figma, pencil, atlassian).

If the command fails, display:
```
Error: Could not load MCP status. Ensure bin/lib/mcp-bridge.cjs exists and loads cleanly.
```
Then stop.

## 2. Load Connection Metadata

Run the following bash command to get connection metadata from mcp-bridge.cjs via loadConnections():

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.loadConnections()) + '\n');
EOF
```

Parse the JSON output. This provides `connected_at`, `last_updated`, and other metadata fields from `.planning/mcp-connections.json` if they exist.

## 3. Check Degraded Status via probe()

If `--no-mcp` flag is present: skip this step entirely and use stored metadata only.

Otherwise, for each server that has `status: 'connected'` in the statuses object, run probe() to check availability. Replace SERVER_KEY with the actual key (github, linear, figma, pencil, or atlassian):

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.probe('SERVER_KEY')) + '\n');
EOF
```

Interpret probe results:
- If probe returns `available: false` with `status: 'not_configured'` (probeTool is null): mark the server as `degraded` — it is recorded as connected but has no probe capability yet (no probe tool configured for this server).
- If probe returns `available: true`: the server is fully operational (will occur after phases 40-44).
- If probe returns `available: false` with another status: note the reason for display.

This step is the degraded-mode detection contract (INFRA-03): connected servers are validated via probe() so the status display is authoritative, not just based on recorded metadata.

## 4. Display Status

### If --json flag:

Run getAllStatuses() and output raw JSON. Stop after output.

### Otherwise, display formatted status table:

Output header:
```
MCP Integration Status
```

Followed by a blank line.

For each server key in order (github, linear, figma, pencil, atlassian), display one row:
- Server display name: left-aligned, padded to 16 characters
- Status indicator and actionable message based on effective status:

**Status: `connected` (and probe returned available: true)**
```
  GitHub           connected      Last probe: <relative time from last_updated if available>
```

**Status: `connected` but probe returned `not_configured` (degraded — no probe tool configured)**
```
  GitHub           degraded       Server connected but probe unavailable -- features may be limited
```

**Status: `disconnected`**
```
  Linear           disconnected   Run /pde:connect linear to reconnect
```

**Status: `not_configured`**
```
  Figma            --             Run /pde:connect figma to set up
```

These actionable messages for `disconnected`, `not_configured`, and `degraded` statuses are the degraded-mode output required by INFRA-03. Every unavailable server tells the user exactly what to do next rather than silently failing or crashing.

Example full output:
```
MCP Integration Status

  GitHub           connected      Last probe: 2 min ago
  Linear           disconnected   Run /pde:connect linear to reconnect
  Figma            --             Run /pde:connect figma to set up
  Pencil           --             Run /pde:connect pencil to set up
  Atlassian        --             Run /pde:connect atlassian to set up

1/5 integrations active. Run /pde:connect <name> to add.
```

Count entries with effective status `connected` (excluding `degraded`). Display footer:
```
{N}/5 integrations active. Run /pde:connect <name> to add.
```

## 5. Suggest Next Steps

- If N = 0 (no integrations active): suggest `/pde:connect github` as the starting point — GitHub is the most common first integration.
  ```
  No integrations connected. Start with: /pde:connect github
  ```
- If N = 5 (all integrations active): note all integrations are connected.
  ```
  All 5 integrations connected.
  ```
- Otherwise: display footer from Step 4 only (no additional suggestion needed).

</process>
