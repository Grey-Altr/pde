<purpose>
Fetch Figma Code Connect mappings via MCP and format them as a component reference table for handoff spec enrichment. Called as a sub-workflow from handoff.md. Gracefully degrades when Figma is not connected, Code Connect is not set up, or the map is empty. Implements FIG-03.
</purpose>

<process>

## handoff-figma-codeConnect — Figma Code Connect Sub-Workflow

This sub-workflow is called from handoff.md Step 1.5/7. It returns a formatted markdown table of Code Connect component mappings for appending to the handoff spec output. All steps are internal — no user-facing output unless degraded mode is reached.

---

### Step 1: Check Figma Connection

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const figma = conn.connections && conn.connections.figma;
const status = figma && figma.status || 'not_configured';
const fileUrl = figma && figma.fileUrl || '';
let toolName = '';
try {
  const lookup = b.call('figma:get-code-connect-map', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ status, fileUrl, toolName }) + '\n');
EOF
```

Parse the JSON output. Extract `status`, `fileUrl`, and `toolName`.

**If `status` is not `'connected'`:**

Return empty string with note:

```
Figma Code Connect mappings unavailable — Figma is not connected.
  Run /pde:connect figma to set up the Figma integration.
```

Store `FIGMA_CODE_CONNECT_TABLE = ""` and halt this sub-workflow. The handoff.md pipeline continues without Code Connect mappings.

**If `status` is `'connected'`:** proceed to Step 2.

---

### Step 2: Look Up Tool Name

The `toolName` returned in Step 1 is `mcp__figma__get_code_connect_map`. If `toolName` is empty (bridge.call() failed), return empty string:

```
Figma Code Connect mappings unavailable — bridge.call('figma:get-code-connect-map') returned no tool name.
  Handoff spec will be generated without Code Connect component mappings.
```

Store `FIGMA_CODE_CONNECT_TABLE = ""` and halt this sub-workflow.

---

### Step 3: Fetch Code Connect Map

Using the `toolName` from Step 1, instruct Claude Code to call the Figma MCP tool:

"Use tool `{toolName}` (which is `mcp__figma__get_code_connect_map`) to get the Code Connect component map from the connected Figma file. Provide `{fileUrl}` as context. The response maps Figma node IDs to source component files: `{nodeId: {codeConnectSrc, codeConnectName}}`."

The MCP tool call happens in Claude Code's execution context using `mcp__figma__get_code_connect_map`.

**If the MCP call fails** (tool not found, API error, timeout): return empty string:

```
Figma Code Connect mappings unavailable — get_code_connect_map MCP call failed.
  Handoff spec will be generated without Code Connect component mappings.
  Error details: {error message if available}
```

Store `FIGMA_CODE_CONNECT_TABLE = ""` and halt this sub-workflow.

---

### Step 4: Handle Empty Map

Parse the response from `mcp__figma__get_code_connect_map`. The expected response structure is:

```json
{
  "1:23": { "codeConnectSrc": "src/components/ui/Button.tsx", "codeConnectName": "Button" },
  "1:45": { "codeConnectSrc": "src/components/ui/Card.tsx", "codeConnectName": "Card" }
}
```

**If the response is empty `{}`, null, or undefined:** return a setup guidance note:

```
No Code Connect mappings found. To set up Code Connect, install @figma/code-connect CLI and publish component mappings from your codebase:
  npm install -g @figma/code-connect
  figma connect publish
```

Store `FIGMA_CODE_CONNECT_TABLE = ""` and halt this sub-workflow.

---

### Step 5: Format Table

Convert the non-empty response to a markdown table:

```markdown
## Figma Code Connect Mappings

| Figma Node ID | Component | Source Path |
|---------------|-----------|-------------|
| {nodeId} | {codeConnectName} | {codeConnectSrc} |
```

For each key-value pair in the response map:
- Row 1: `| {nodeId} | {codeConnectName} | {codeConnectSrc} |`
- Continue for each entry in the map.

---

### Step 6: Return Table

Store the formatted markdown table as `FIGMA_CODE_CONNECT_TABLE`. Return it to handoff.md for appending to the handoff spec output.

Log to handoff.md progress: `  -> Figma Code Connect: {count} component mappings loaded`

</process>

<anti_patterns>
- NEVER call `mcp__figma__get_code_connect_map` directly in workflow bash blocks without looking it up via bridge.call('figma:get-code-connect-map'). Always use the bridge to resolve the tool name.
- NEVER halt the parent handoff.md pipeline if Code Connect mappings are unavailable — degrade gracefully with empty FIGMA_CODE_CONNECT_TABLE.
- NEVER require Code Connect for handoff spec generation — it is an enrichment layer. The handoff spec is complete without it.
- NEVER attempt to install @figma/code-connect or set it up as part of this workflow — that is a user-side operation. PDE only reads the result.
</anti_patterns>
</process>
