<purpose>
Push PDE DTCG design tokens to the Pencil canvas via the MCP set_variables tool. Reads tokens from assets/tokens.json, converts DTCG format ($type/$value) to Pencil format (type/value), performs get-before-set non-destructive merge to preserve Pencil-native variables, and handles degraded mode when Pencil is unavailable. Implements PEN-01. Called from /pde:system when Pencil is connected.
</purpose>

<process>

## Step 0 — Initialize and Check Connection

Load Pencil connection info and look up canonical tool names from mcp-bridge.cjs:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const pen = conn.connections && conn.connections.pencil;
const status = pen && pen.status || 'not_configured';
let setVarsToolName = '';
let getVarsToolName = '';
try {
  setVarsToolName = b.call('pencil:set-variables', {}).toolName;
  getVarsToolName = b.call('pencil:get-variables', {}).toolName;
} catch (err) {
  setVarsToolName = '';
  getVarsToolName = '';
}
process.stdout.write(JSON.stringify({ status, setVarsToolName, getVarsToolName }) + '\n');
EOF
```

Parse the JSON output.

If `status` is not `connected`, display:

```
Pencil is not connected. Run /pde:connect pencil to set up the Pencil VS Code extension,
then run /pde:connect pencil --confirm to record the connection.
Token push skipped — no changes made to Pencil canvas.
```

Stop here. Do NOT crash.

## Step 1 — Probe Pencil MCP Availability

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.probe('pencil')) + '\n');
EOF
```

If probe returns `status: 'not_configured'` (probeTool is null), display:

```
Pencil MCP server is not available. Run /pde:connect pencil to set up.
Token push will run in degraded mode — no changes made to Pencil canvas.
```

Stop here.

If probe returns `status: 'probe_deferred'`, continue (normal — probe tool is configured but actual call happens in workflow context).

## Step 2 — Read DTCG Tokens

Read `assets/tokens.json` from the project root. If the file does not exist, display:

```
No DTCG tokens found. Run /pde:system first to generate a design system,
then re-run Pencil sync to push tokens to the canvas.
```

Stop here. Do NOT crash.

If the file exists but contains malformed JSON, display:

```
assets/tokens.json is malformed. Check the file for syntax errors.
Token push skipped — no changes made to Pencil canvas.
```

Stop here. Do NOT crash.

## Step 3 — Convert DTCG Tokens and Fetch Existing Pencil Variables

**Conversion functions (no external dependencies):**

```javascript
function dtcgToPencilVariables(dtcgTokens, prefix) {
  const result = {};
  for (const [key, value] of Object.entries(dtcgTokens)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value.$type && value.$value !== undefined) {
      const pencilType = value.$type === 'color' ? 'color'
        : (value.$type === 'dimension' || value.$type === 'fontWeight') ? 'number'
        : (value.$type === 'fontFamily' || value.$type === 'string') ? 'string'
        : null;
      if (pencilType !== null) {
        const pencilValue = pencilType === 'number'
          ? parseFloat(String(value.$value).replace('px', ''))
          : value.$value;
        result[fullKey] = { type: pencilType, value: pencilValue };
      }
      // Skip unsupported types: shadow, gradient, boolean, cubicBezier, etc.
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, dtcgToPencilVariables(value, fullKey));
    }
  }
  return result;
}

function mergePencilVariables(existing, incoming) {
  // Non-destructive: only update/insert keys present in incoming.
  // Pencil-native variables NOT in incoming are preserved unchanged.
  const merged = Object.assign({}, existing);
  for (const [key, variable] of Object.entries(incoming)) {
    merged[key] = variable;
  }
  return merged;
}
```

**Type mapping:**

| DTCG `$type` | Pencil `type` | Value transformation |
|-------------|--------------|---------------------|
| `color` | `color` | Pass hex string as-is |
| `dimension` | `number` | Strip `px` suffix, parse to float |
| `fontWeight` | `number` | Parse to float (handles both numeric and string values) |
| `fontFamily` | `string` | Pass string as-is |
| `string` | `string` | Pass string as-is |
| All others | SKIP | Not supported in Pencil variables |

**Instruction for Claude:**

1. Parse the DTCG tokens from `assets/tokens.json`.
2. Run `dtcgToPencilVariables(parsedTokens, '')` to produce a flat Pencil variable map.
3. Track counts: `convertedCount` (supported types), `skippedCount` (unsupported types like shadow, gradient, boolean).

**Get existing Pencil variables (get-before-set pattern):**

Call `{getVarsToolName}` (i.e., `mcp__pencil__get_variables`) to fetch current Pencil variables before overwriting. This is a Claude Code tool call — NOT inside a bash block.

If the get_variables call fails or returns no data, treat existing as `{}` and log:

```
Note: Could not read existing Pencil variables. Proceeding with PDE tokens only.
Any Pencil-native variables not present in assets/tokens.json may be affected.
```

Continue regardless — do NOT stop here.

**Merge:**

Run `mergePencilVariables(existingPencilVars, convertedPdeTokens)` to produce the final variable map. Track `preservedCount` (keys in existing but not in incoming).

Token names in Pencil use dot.notation (e.g., `color.primary.500`). DTCG group hierarchy is flattened by `dtcgToPencilVariables`.

## Step 4 — Push to Pencil via MCP

Use the tool `{setVarsToolName}` (i.e., `mcp__pencil__set_variables`) to push the merged variable map to the Pencil canvas. This is a Claude Code tool call — NOT inside a bash block.

Pass the merged variable map as the `variables` argument.

If the set_variables call fails (error, timeout, or unexpected response), display:

```
Could not push tokens to Pencil canvas. The MCP server may be unavailable.
Run /pde:mcp-status to check connection state. Try again with VS Code open
and a .pen file active. Run /pde:connect pencil if the issue persists.
```

Do NOT crash. /pde:system will continue to its Summary step normally — Pencil sync is a non-blocking enhancement.

## Step 5 — Summary

Display the token push summary:

```
Pencil token sync complete.
  Converted:  {convertedCount} DTCG tokens pushed to Pencil canvas
  Skipped:    {skippedCount} tokens (unsupported types: shadow, gradient, boolean, etc.)
  Preserved:  {preservedCount} Pencil-native variables not overwritten

Note: Token names in Pencil use dot.notation (e.g., color.primary.500).
DTCG group hierarchy is flattened to flat dot-notation keys.
```

If Pencil-native variables were preserved:

```
  Tip: Pencil-native variables are preserved by the non-destructive merge.
  Only tokens present in assets/tokens.json are updated.
```

</process>
