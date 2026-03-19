<purpose>
Sync Figma design variables into PDE's DTCG token file (assets/tokens.json) via non-destructive merge. Fetches variables via the MCP bridge adapter (never raw tool names), converts Figma COLOR/FLOAT types to DTCG color/dimension tokens, merges with existing tokens preserving PDE-originated entries, and handles dry-run and degraded mode. Implements FIG-01. Note: only default mode values are imported (Figma MCP limitation — see Pitfall 2 in 42-RESEARCH.md).
</purpose>

<process>

## Step 0 — Initialize and Parse Arguments

Parse $ARGUMENTS for flags:
- `--dry-run`: boolean flag, default false. If present, show what would be written but do not write.

Load Figma connection info and look up the canonical tool name from mcp-bridge.cjs:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const fig = conn.connections && conn.connections.figma;
const fileUrl = fig && fig.fileUrl || '';
const fileKey = fig && fig.fileKey || '';
const status = fig && fig.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('figma:get-variable-defs', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ fileUrl, fileKey, status, toolName }) + '\n');
EOF
```

Parse the JSON output.

If `status` is not `connected`, display:

```
Figma is not connected. Run /pde:connect figma to set up, then /pde:connect figma --confirm.
Sync skipped — no changes to token files.
```

Stop here. Do NOT crash.

If `fileUrl` is empty, display:

```
No Figma file URL configured. Run /pde:connect figma --confirm and provide your Figma file URL when prompted.
Token import requires a Figma file URL to fetch variables from.
Sync skipped — no changes to token files.
```

Stop here. Do NOT crash.

## Step 1 — Probe Figma MCP Availability

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
process.stdout.write(JSON.stringify(b.probe('figma')) + '\n');
EOF
```

If probe returns `status: 'not_configured'` (probeTool is null), display:

```
Figma MCP server is not available. Run /pde:connect figma to set up.
Sync will run in degraded mode — no token changes made.
```

Stop here.

If probe returns `status: 'probe_deferred'`, continue (normal — probe tool is configured but actual call happens in workflow context).

## Step 2 — Fetch Figma Variables via MCP

Use the `toolName` returned by `bridge.call('figma:get-variable-defs', ...)` (which resolved to `mcp__figma__get_variable_defs`) to call the Figma MCP tool. This call happens in Claude Code's execution context as a normal tool use — NOT inside a bash block.

Call the tool with the Figma file URL as context. Instruct Claude:

"Use the tool `{toolName}` (i.e., `mcp__figma__get_variable_defs`) to get design variables from the Figma file at URL: {fileUrl}. Return the variable definitions including their names, types (COLOR/FLOAT/STRING/BOOLEAN), and values in the default mode."

Collect the variables and collections from the response. Each variable should have: `name` (e.g., "Colors/Primary/500"), `resolvedType` (COLOR|FLOAT|STRING|BOOLEAN), `variableCollectionId`, and `valuesByMode`.

**Adaptive response handling:** If the response shape differs from the above, try to extract variables from top-level keys. If neither works, log a warning and proceed to degraded mode.

If the MCP tool call fails (error, timeout, or unexpected response), display:

```
Could not fetch variables from Figma. The MCP server may be unavailable or the file URL may be invalid.
Run /pde:mcp-status to check connection state.
```

Show degraded mode: display current token count from assets/tokens.json if it exists. Do NOT crash.

## Step 3 — Convert Figma Variables to DTCG Format

Process the fetched variables using these inline conversion functions (no external dependencies):

**Color conversion:**

```javascript
function figmaColorToCss(color) {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  if (color.a === 1 || color.a === undefined) {
    return '#' + r + g + b;
  }
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
  return '#' + r + g + b + a;
}
```

**Variable to DTCG conversion rules:**

For each variable in the response:

1. Get collection name from `collections[variable.variableCollectionId].name` (or use `variable.variableCollectionId` as fallback).
2. Get the default mode ID from `collection.defaultModeId`. Get the value from `variable.valuesByMode[defaultModeId]`.
3. If value is undefined, skip this variable.
4. Convert variable name to DTCG path: split by `/`, camelCase each segment, use all-but-last as group path, last as token key.
   - Example: `Colors/Primary/500` → group path `color.primary`, token key `500`
   - Example: `Spacing/Small` → group path `spacing`, token key `small`
   - Example: `Typography/Body Size` → group path `typography`, token key `bodySize`
5. Convert value by `resolvedType`:
   - `COLOR`: apply `figmaColorToCss()` to the `{r, g, b, a}` object → DTCG `$type: "color"`
   - `FLOAT`: append `"px"` to the numeric value → DTCG `$type: "dimension"`
   - `STRING`: skip with note — text values not imported (use Code Connect for component references)
   - `BOOLEAN`: skip with note — boolean values not imported
6. Build `$description`: `"Figma: {original variable name} ({collection name})"`

Build nested DTCG output object from group path + token key.

Track counts: `importedCount` (COLOR+FLOAT converted), `skippedCount` (STRING+BOOLEAN).

## Step 4 — Non-Destructive Merge with Existing Tokens

Read existing `assets/tokens.json`. If the file does not exist, treat existing as `{}` (create new). If the file is malformed JSON, display a warning and treat as `{}`.

Apply the non-destructive merge using this logic:

```javascript
function mergeTokens(existing, incoming) {
  const merged = JSON.parse(JSON.stringify(existing)); // deep clone
  for (const [group, tokens] of Object.entries(incoming)) {
    if (!merged[group]) merged[group] = {};
    for (const [key, token] of Object.entries(tokens)) {
      if (merged[group][key]) {
        // UPDATE: Figma is source of truth for $value; preserve $description if incoming has none
        merged[group][key].$value = token.$value;
        if (token.$description) merged[group][key].$description = token.$description;
      } else {
        // INSERT: new token from Figma not previously in PDE
        merged[group][key] = token;
      }
    }
  }
  return merged; // tokens NOT in incoming are preserved unchanged
}
```

Track counts:
- `updatedCount`: tokens in both existing and incoming (value updated)
- `insertedCount`: tokens in incoming but not existing (new)
- `preservedCount`: tokens in existing but not incoming (unchanged)

**If `--dry-run`**, display the diff summary and stop without writing:

```
Dry run — no changes written to assets/tokens.json.

Would import from Figma:
  New tokens:       {insertedCount}
  Updated tokens:   {updatedCount}
  Preserved (PDE):  {preservedCount}
  Skipped (non-color/dimension): {skippedCount}

Sample of new tokens:
  [list up to 5 new token paths and values]

Sample of updated tokens:
  [list up to 5 updated token paths with old → new value]
```

**If NOT dry-run**, write the merged result to `assets/tokens.json` with 2-space indentation:

```
assets/tokens.json updated.
```

If write fails (permissions, missing directory), display:

```
Could not write to assets/tokens.json. Check file permissions.
```

Do NOT crash.

## Step 5 — Display Summary

Display the sync summary:

```
Figma token sync complete.
  Imported:  {importedCount} tokens from Figma
  Updated:   {updatedCount} existing tokens
  Inserted:  {insertedCount} new tokens
  Preserved: {preservedCount} PDE-only tokens
  Total:     {totalCount} tokens in assets/tokens.json

Note: Only default mode values imported. Dark/light mode alternates require
the Figma Enterprise Variables REST API (/v1/files/:file_key/variables/local).
```

If skipped variables exist:

```
  Skipped:   {skippedCount} variables (STRING/BOOLEAN types not supported)
```

</process>
