<purpose>
Export a PDE mockup (HTML file) to an editable Figma frame via the generate_figma_design MCP tool. Requires explicit user confirmation before any Figma write occurs (VAL-03 compliance). Gracefully degrades when Figma is not connected, file URL is not configured, or the generate_figma_design tool is unavailable (known issue claude-code#28718). Implements FIG-04.
</purpose>

<process>

## /pde:sync --export-figma — Mockup to Figma Export Pipeline

---

### Step 0 — Initialize and Check Connection

Load Figma connection info and check that Figma is connected with a configured file URL. Also look up the `figma:generate-design` tool name via the MCP bridge:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const fig = conn.connections && conn.connections.figma;
const fileUrl = fig && fig.fileUrl || '';
const status = fig && fig.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('figma:generate-design', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ fileUrl, status, toolName }) + '\n');
EOF
```

Parse the JSON output. The `toolName` field will resolve to `mcp__figma__generate_figma_design` when available.

If `status` is not `connected`, display:

```
Figma is not connected. Run /pde:connect figma --confirm to set up.
Export cancelled — no changes to Figma.
```

Stop here. Do NOT proceed with any further steps.

If `fileUrl` is empty, display:

```
No Figma file URL configured. Run /pde:connect figma --confirm to set up a target file URL.
Export cancelled — no changes to Figma.
```

Stop here.

---

### Step 1 — Find Mockup HTML

Search for mockup HTML files. First, search `assets/mockups/` for files matching the `MCK-*.html` pattern:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const fs = req('fs');
const path = req('path');
const cwd = process.cwd();

let mockupFiles = [];

// Check assets/mockups/ for MCK-*.html
const mockupsDir = path.join(cwd, 'assets', 'mockups');
if (fs.existsSync(mockupsDir)) {
  const files = fs.readdirSync(mockupsDir);
  mockupFiles = files
    .filter(f => f.match(/^MCK-.*\.html$/))
    .map(f => path.join('assets', 'mockups', f));
}

// Fallback: check assets/ root for *.html files
if (mockupFiles.length === 0) {
  const assetsDir = path.join(cwd, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    mockupFiles = files
      .filter(f => f.endsWith('.html') && !fs.statSync(path.join(assetsDir, f)).isDirectory())
      .map(f => path.join('assets', f));
  }
}

process.stdout.write(JSON.stringify({ mockupFiles }) + '\n');
EOF
```

If no HTML mockup files are found, display:

```
No mockup HTML files found. Run /pde:mockup first to generate a mockup.
Export cancelled — no changes to Figma.
```

Stop here.

If files are found, display the list and ask the user to confirm which one to export:

```
Found mockup file(s):

  {list of mockup file paths, numbered}

Which file to export? (Enter number or press Enter to use the most recent)
```

Wait for user selection. Default to the first (most recently modified) file if the user presses Enter.

---

### Step 2 — Check Tool Availability

Check whether the `generate_figma_design` tool is available. The `toolName` from Step 0 should be `mcp__figma__generate_figma_design`. If the `toolName` is empty or the tool does not appear in the Claude Code tool list, the tool is unavailable.

If the tool is unavailable, display:

```
The generate_figma_design tool is not available in your Claude Code session.
This is a known issue (claude-code#28718). Workaround:
  1. Open Claude.ai in your browser
  2. Connect the Figma MCP server there
  3. Use the code-to-canvas feature from the browser

Export cancelled — no changes to Figma.
```

Stop here. Do NOT proceed with any further steps.

---

### Step 3 — Confirmation Gate (VAL-03 — CRITICAL)

Display the export summary for user review before any Figma write:

```
Ready to export mockup to Figma:

  Source: {mockup_file_path}
  Target: {fileUrl}
  Action: Create a new editable frame in the Figma file

This will write to your Figma file. Proceed? (y/n)
```

Wait for the user's response.

**CRITICAL:** Apply strict check — only proceed if response matches `^y(es)?$` (case-insensitive). This means only `y`, `Y`, `yes`, `Yes`, or `YES` are accepted. Any other response (including `n`, `no`, empty, or anything else) results in:

```
Export cancelled — no changes to Figma.
```

Stop here immediately. Do NOT call any MCP tool. Do NOT write to Figma.

Only proceed to Step 4 if the user explicitly responds with `y` or `yes` (case-insensitive).

---

### Step 4 — Execute Export

Read the selected mockup HTML file content using the Read tool.

Use the `{toolName}` tool (resolved to `mcp__figma__generate_figma_design` via bridge.call) to create a Figma frame from the mockup HTML. Pass the HTML content and the target Figma `fileUrl`.

Wrap the call in a try/catch. On error, display:

```
Export failed: {error message}

No changes were made to Figma. You can retry or use Claude.ai browser as a workaround.
```

---

### Step 5 — Summary

On success, display:

```
Mockup exported to Figma successfully.

  Source: {mockup_file_path}
  Target: {fileUrl}
  Result: New editable frame created in your Figma file

Open your Figma file to view and edit the exported design.
```

</process>

<anti_patterns>
- NEVER write to Figma without the user explicitly confirming with `y` or `yes`. Any other response results in "Export cancelled — no changes to Figma." and immediate stop. This is VAL-03 compliance.
- NEVER call the raw MCP tool name `mcp__figma__generate_figma_design` without looking it up via `bridge.call('figma:generate-design', {})`. Always use the bridge lookup.
- NEVER hardcode fileUrl — always read from mcp-connections.json via `loadConnections()`.
- NEVER proceed if Figma status is not `connected` or if fileUrl is empty — check Step 0 guard.
- NEVER proceed if the generate_figma_design tool is unavailable — show the claude-code#28718 degraded message instead.
- NEVER skip the confirmation gate (Step 3). Steps 0-2 are read-only; Step 4 is the only write step.
</anti_patterns>
