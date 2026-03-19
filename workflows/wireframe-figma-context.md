<purpose>
Fetch Figma design context (component structure, variable names, layout patterns) from the connected Figma file via MCP and return it as reference context for wireframe generation. Called as a sub-workflow from wireframe.md. Gracefully degrades when Figma is not connected or file URL is not configured. Implements FIG-02.
</purpose>

<process>

## wireframe-figma-context — Figma Design Context Sub-Workflow

This sub-workflow is called from wireframe.md Step 1.5/7. It returns Figma design context for use as a reference during wireframe generation. All steps are internal — no output to the user unless a degraded mode is reached.

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
  const lookup = b.call('figma:get-design-context', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ status, fileUrl, toolName }) + '\n');
EOF
```

Parse the JSON output. Extract `status`, `fileUrl`, and `toolName`.

**If `status` is not `'connected'` OR `fileUrl` is empty:**

Return empty context with note:

```
Figma context unavailable — wireframe will use PDE design tokens only.
  To enable Figma design context, run /pde:connect figma and provide your Figma file URL.
```

Store `FIGMA_DESIGN_CONTEXT = ""` and halt this sub-workflow. The wireframe.md pipeline continues without Figma context.

**If `status` is `'connected'` AND `fileUrl` is non-empty:** proceed to Step 2.

---

### Step 2: Look Up Tool Name

The `toolName` returned in Step 1 is `mcp__figma__get_design_context`. If `toolName` is empty (bridge.call() failed), return empty context:

```
Figma context unavailable — bridge.call('figma:get-design-context') returned no tool name.
  Wireframe will proceed using PDE design tokens only.
```

Store `FIGMA_DESIGN_CONTEXT = ""` and halt this sub-workflow.

---

### Step 3: Fetch Design Context

Using the `toolName` from Step 1, instruct Claude Code to call the Figma MCP tool with the Figma file URL as context:

"Use tool `{toolName}` (which is `mcp__figma__get_design_context`) to get design context from the Figma file. Provide the file URL `{fileUrl}` as context for the tool call. Request component structure, variable references, and layout patterns from the connected Figma file."

The MCP tool call happens in Claude Code's execution context using `mcp__figma__get_design_context`.

**If the MCP call fails** (tool not found, API error, timeout): return empty context:

```
Figma context unavailable — get_design_context MCP call failed.
  Wireframe will proceed using PDE design tokens only.
  Error details: {error message if available}
```

Store `FIGMA_DESIGN_CONTEXT = ""` and halt this sub-workflow.

---

### Step 4: Return Context

The response from `mcp__figma__get_design_context` contains React+Tailwind code with Figma variable names inline. This represents the component structure and layout patterns from the connected Figma file.

Parse and store the returned content as `FIGMA_DESIGN_CONTEXT`. This is the structured reference data that wireframe.md will use.

Return `FIGMA_DESIGN_CONTEXT` to the calling wireframe.md step. The content is used as additional design reference alongside PDE design tokens — it does not replace the wireframe generation pipeline; it informs component naming and layout decisions.

Log to wireframe.md progress: `  -> Figma design context loaded from {fileUrl}`

</process>

<anti_patterns>
- NEVER call `mcp__figma__get_design_context` directly in workflow bash blocks without looking it up via bridge.call('figma:get-design-context'). Always use the bridge to resolve the tool name.
- NEVER halt the parent wireframe.md pipeline if Figma context is unavailable — degrade gracefully with an empty FIGMA_DESIGN_CONTEXT.
- NEVER require Figma context for wireframe generation — it is an enhancement, not a hard dependency. If unavailable, wireframe.md continues with PDE design tokens only.
</anti_patterns>
</process>
