<purpose>
Guide the user through connecting PDE to an approved MCP server. Validates the server against the security allowlist, displays server-specific auth instructions, records connection status in .planning/mcp-connections.json on --confirm, and handles --disconnect. Does NOT make direct MCP tool calls — all MCP connection management happens through Claude Code's /mcp interface.
</purpose>

<required_reading>
@${CLAUDE_PLUGIN_ROOT}/references/mcp-integration.md
</required_reading>

<process>

## 0. Initialize

Parse $ARGUMENTS to extract:
- `SERVICE_KEY`: first positional argument (required). If missing, display help and stop:
  ```
  Usage: /pde:connect <service>

  Approved services: github, linear, figma, pencil, atlassian

  Run /pde:connect <service> to see auth instructions for that service.
  ```
- `--confirm` flag: boolean, default false. When present, record the connection as active in mcp-connections.json.
- `--disconnect` flag: boolean, default false. When present, mark the connection as disconnected.

Convert SERVICE_KEY to lowercase and trim whitespace.

## 1. Validate Server

Run assertApproved() from mcp-bridge.cjs to check the server is in the approved list:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
try {
  b.assertApproved(process.env.SERVICE_KEY);
  process.stdout.write('APPROVED\n');
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}
EOF
```

(Set `SERVICE_KEY` environment variable to the parsed service key before running.)

If the command exits non-zero, the error output contains the policy violation message. Display that message verbatim to the user. The message will include:
- The rejected key
- The phrase "is not an approved MCP server"
- The list of approved servers (github, linear, figma, pencil, atlassian)

Do NOT proceed after a policy violation. Stop here.

## 2. Handle --disconnect

If `--disconnect` flag is present:

Run updateConnectionStatus() to mark the server as disconnected:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'disconnected', {
  disconnected_at: new Date().toISOString()
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

Display:
```
Disconnected from <displayName>. Connection metadata updated in .planning/mcp-connections.json.
```

Then suggest:
```
Run 'claude mcp remove <SERVICE_KEY>' to also remove the MCP server registration from Claude Code.
```

Stop here. Do not proceed to auth instructions.

## 3. Display Auth Instructions

If `--confirm` flag is NOT present:

Run AUTH_INSTRUCTIONS lookup from mcp-bridge.cjs:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const instructions = b.AUTH_INSTRUCTIONS[process.env.SERVICE_KEY];
process.stdout.write(JSON.stringify(instructions) + '\n');
EOF
```

Parse the JSON array of instruction strings.

Display header:
```
Connecting to <displayName>
```

Followed by a blank line.

Display each instruction string on its own line, in order.

After all instructions, display:
```
After completing the steps above, run: /pde:connect <SERVICE_KEY> --confirm
```

Stop here. Do not proceed to Step 4 without --confirm.

## 4. Confirm Connection (--confirm present)

Run updateConnectionStatus() to record the connection as active:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = b.updateConnectionStatus(process.env.SERVICE_KEY, 'connected', {
  connected_at: new Date().toISOString()
});
process.stdout.write(JSON.stringify(result) + '\n');
EOF
```

Display:
```
Connected to <displayName>. Status saved to .planning/mcp-connections.json.
```

Then display:
```
Run /pde:mcp-status to see all connection states.
```

## 5. Error Handling

If any node command fails unexpectedly (non-policy errors such as missing module, parse errors):
- Display the error output to the user verbatim.
- Suggest: `Check that ${CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs exists and loads cleanly.`
- Never exit without a user-facing message.

**Important:** This workflow does NOT call any MCP tools directly. It guides the user through auth setup steps (which happen outside PDE via `claude mcp add` in a terminal and `/mcp` inside Claude Code), then records the connection metadata. The actual MCP server connection is managed by Claude Code's runtime, not by PDE.

</process>
