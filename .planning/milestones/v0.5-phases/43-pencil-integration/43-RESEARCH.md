# Phase 43: Pencil Integration - Research

**Researched:** 2026-03-18
**Domain:** Pencil MCP server integration, design token sync, screenshot capture for visual audit
**Confidence:** MEDIUM — Pencil MCP tool names verified via official docs and community articles; exact parameter schemas are LOW confidence (Pencil source is closed, no public API reference)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PEN-01 | User can sync PDE DTCG design tokens to Pencil canvas via `set_variables` in `/pde:system` | `set_variables` tool confirmed by official docs; DTCG-to-Pencil variable format conversion needed (see Architecture Patterns) |
| PEN-02 | User can capture Pencil canvas screenshots for `/pde:critique` visual audit | `get_screenshot` tool confirmed by official docs; output format is base64 image (MEDIUM confidence) consistent with MCP image return patterns |
| PEN-03 | Pencil integration degrades gracefully when VS Code/Cursor is not available | Pencil MCP is a local stdio binary — when VS Code is closed, the process is gone; probe-deferred pattern from Phase 39/42 applies directly |
</phase_requirements>

---

## Summary

Pencil (pencil.dev) is a VS Code/Cursor extension that runs an MCP server locally as a platform-native binary bundled with the extension. When VS Code/Cursor is open with the Pencil extension active, the server starts automatically. When the IDE is closed, the server process is gone — there is no remote fallback.

The MCP server is `stdio` transport. The binary path is platform-specific and version-specific (e.g., `~/.vscode/extensions/highagency.pencildev-0.6.28/out/mcp-server-darwin-arm64`). Crucially, **the MCP configuration is auto-configured by the Pencil extension into `~/.claude.json` during installation — there is no `claude mcp add` command for the user to run manually.** This is a significant difference from GitHub, Linear, Figma, and Atlassian integrations and requires the connect workflow to detect this auto-configured pattern rather than providing manual install steps.

The MCP exposes 7 tools: `batch_design`, `batch_get`, `get_screenshot`, `snapshot_layout`, `get_editor_state`, `get_variables`, and `set_variables`. For PDE's requirements, only `set_variables` (PEN-01), `get_screenshot` (PEN-02), and a lightweight probe tool (PEN-03) are relevant. The `get_variables` tool is needed as the probe — it is the lightest read-only call.

Pencil's internal variable format uses dot-notation keys (`color.background`, `spacing.padding`) with typed objects. PDE's DTCG tokens (nested JSON with `$type` and `$value`) must be transformed to Pencil's flat variable format before calling `set_variables`. This transformation is the central implementation challenge of PEN-01.

**Key risk from STATE.md:** Tool names were previously sourced from community articles (MEDIUM confidence). This research confirms the official Pencil docs list `set_variables`, `get_variables`, `get_screenshot`, `batch_design`, `batch_get`, `snapshot_layout`, and `get_editor_state`. However, exact `mcp__pencil__*` tool names as they appear in Claude Code's tool namespace must be treated as MEDIUM confidence until verified in a live environment. The planner should build the adapter to use `bridge.call()` lookups (never hardcoded raw names) so tool name corrections require only a TOOL_MAP update.

**Known critical pitfall:** Pencil MCP is a local stdio server that can hang without responding when called from Claude Code if VS Code is closed mid-session or the Pencil extension process terminates. This is a documented issue in the Cursor community forum. The probe strategy must use a short timeout and treat silence as unavailability (not as a crash).

**Primary recommendation:** Follow the established Phase 40-42 adapter pattern exactly. Populate 7 Pencil TOOL_MAP entries in `mcp-bridge.cjs`, use `get_variables` as the probe tool, create a `sync-pencil.md` sub-workflow for PEN-01 (invoked from `/pde:system` when Pencil is connected), and create a `critique-pencil-screenshot.md` sub-workflow for PEN-02 (invoked from `/pde:critique` when Pencil is connected). Handle the auto-configured installation model in `connect.md` Step 3.9 with detection rather than manual steps.

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Pencil VS Code extension | `highagency.pencildev` (0.6.x at research time) | Runs the local MCP server automatically | Official source; installed via VS Code marketplace |
| `bin/lib/mcp-bridge.cjs` | In-repo | TOOL_MAP lookup, probe coordination, connection metadata | All MCP integrations use this — no exceptions |
| Node.js inline conversion (no npm) | Node 20+ | DTCG-to-Pencil variable format transformation | Zero-npm-dependency constraint; embedded inline in workflow like figmaColorToCss/mergeTokens |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `workflows/sync-pencil.md` (new) | — | PEN-01: DTCG token push to Pencil canvas via `set_variables` | Called from `/pde:system` when Pencil is connected |
| `workflows/critique-pencil-screenshot.md` (new) | — | PEN-02: Canvas screenshot capture for `/pde:critique` | Called from `/pde:critique` when Pencil is connected |
| `.planning/mcp-connections.json` | Custom schema | Pencil connection status and metadata | Same schema as all other integrations — no new fields needed |

### Pencil MCP Transport Details

| Property | Value | Confidence |
|----------|-------|------------|
| Transport | `stdio` | HIGH — confirmed by community articles showing `.claude.json` config |
| Binary location | `~/.vscode/extensions/highagency.pencildev-{version}/out/mcp-server-{platform}` | HIGH — confirmed via dev.classmethod.jp article config snippet |
| Platform variants | `darwin-arm64`, `darwin-x64`, `linux-x64`, `win32-x64` (inferred) | MEDIUM — only darwin-arm64 confirmed |
| Args | `["--app", "visual_studio_code"]` | HIGH — confirmed via dev.classmethod.jp article |
| Auto-configured | Yes — Pencil extension writes `~/.claude.json` on install | HIGH — multiple sources confirm "no special configuration needed" |
| Install command | None — user installs VS Code extension `highagency.pencildev` from marketplace | HIGH |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `set_variables` for token sync | Editing `.pen` file JSON directly | `.pen` files are complex document graphs; `set_variables` is the documented MCP path |
| `get_screenshot` for visual input | Manual wireframe files | `get_screenshot` is the MCP-native path; falls back gracefully to existing wireframes when unavailable |

### Installation

No npm install. User installs VS Code extension:

```
VS Code Marketplace: highagency.pencildev
OR
code --install-extension highagency.pencildev
```

The Pencil extension auto-configures Claude Code's `~/.claude.json` with the MCP server entry on first launch.

---

## Architecture Patterns

### Recommended New Files

```
bin/lib/
└── mcp-bridge.cjs          MODIFY — add 7 Pencil TOOL_MAP entries + probeTool

workflows/
├── connect.md              MODIFY — add Step 3.9 (Pencil connection detection)
├── sync-pencil.md          NEW — PEN-01 token push to Pencil canvas
└── critique-pencil-screenshot.md  NEW — PEN-02 screenshot capture for critique

commands/
├── system.md               MODIFY — add mcp__pencil__* to allowed-tools
└── critique.md             MODIFY — add mcp__pencil__* to allowed-tools

tests/phase-43/
├── pencil-toolmap.test.mjs         NEW — Wave 0 tests for TOOL_MAP entries
├── token-to-pencil.test.mjs        NEW — Wave 0 tests for dtcgToPencilVariables()
└── sync-pencil-workflow.test.mjs   NEW — Wave 0 structural tests
```

### Pencil TOOL_MAP Entries (7 entries, consistent with GitHub, Linear, Figma)

```javascript
// bin/lib/mcp-bridge.cjs — Phase 43 additions
// Source: docs.pencil.dev/getting-started/ai-integration (HIGH confidence for tool names)
// Raw mcp__pencil__* names: MEDIUM confidence until verified in live environment
'pencil:probe':             'mcp__pencil__get_variables',
'pencil:get-variables':     'mcp__pencil__get_variables',
'pencil:set-variables':     'mcp__pencil__set_variables',
'pencil:get-screenshot':    'mcp__pencil__get_screenshot',
'pencil:batch-get':         'mcp__pencil__batch_get',
'pencil:batch-design':      'mcp__pencil__batch_design',
'pencil:get-editor-state':  'mcp__pencil__get_editor_state',
```

**APPROVED_SERVERS.pencil update:**

```javascript
pencil: {
  displayName: 'Pencil',
  transport: 'stdio',
  url: null,
  installCmd: null, // Auto-configured by VS Code extension — no manual install command
  probeTimeoutMs: 8000,  // Short timeout — stdio hang prevention (see Pitfall 1)
  probeTool: 'mcp__pencil__get_variables',
  probeArgs: {},
},
```

### Pattern 1: DTCG-to-Pencil Variable Format Transformation

**What:** PDE tokens are DTCG nested JSON (`color.primary.500 = { $type: "color", $value: "#3b82f6" }`). Pencil variables are flat dot-notation objects (`color.primary.500 = { type: "color", value: "#3b82f6" }`).

**Key difference:** DTCG uses `$type` / `$value` with `$` prefixes. Pencil uses plain `type` / `value`. DTCG colors are hex strings in both formats — no conversion needed beyond key stripping.

**When to use:** Every call to `set_variables` in `sync-pencil.md`.

**Inline conversion function (no external dependencies):**

```javascript
// Source: .pen format spec from docs.pencil.dev/for-developers/the-pen-format
function dtcgToPencilVariables(dtcgTokens, prefix) {
  const result = {};
  // prefix is the current DTCG group path (e.g., "color.primary")
  for (const [key, value] of Object.entries(dtcgTokens)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value.$type && value.$value !== undefined) {
      // Leaf token — convert to Pencil variable
      const pencilType = value.$type === 'color' ? 'color' :
                         value.$type === 'dimension' ? 'number' :
                         value.$type === 'fontFamily' ? 'string' : null;
      if (pencilType) {
        // Strip "px" from dimensions for Pencil number type
        const pencilValue = pencilType === 'number'
          ? parseFloat(value.$value)
          : value.$value;
        result[fullKey] = { type: pencilType, value: pencilValue };
      }
      // Skip unsupported types (boolean, shadow, gradient, etc.)
    } else if (typeof value === 'object' && value !== null) {
      // Group — recurse
      Object.assign(result, dtcgToPencilVariables(value, fullKey));
    }
  }
  return result;
}
```

**Type mapping:**

| DTCG `$type` | Pencil `type` | Value transformation |
|-------------|--------------|---------------------|
| `color` | `color` | Pass hex string as-is |
| `dimension` | `number` | Strip `px` suffix, parse to float |
| `fontFamily` | `string` | Pass string as-is |
| `fontWeight` | `number` | Parse to int |
| All others | SKIP | Not supported in Pencil variables |

### Pattern 2: sync-pencil.md Workflow (Step 0-5 pattern from Phase 40-42)

```
Step 0 — Initialize: load connections, look up tool names via bridge.call()
  - Check status = 'connected'
  - Get toolName for 'pencil:set-variables'
  - If not connected → degraded mode message, stop (do NOT crash)

Step 1 — Probe: bridge.probe('pencil') → probe_deferred → continue
  - If probe returns not_configured → stop with setup guidance

Step 2 — Read DTCG tokens from assets/tokens.json
  - If missing → stop with guidance

Step 3 — Transform: dtcgToPencilVariables() inline function
  - Count converted/skipped tokens

Step 4 — Call set_variables via MCP (NOT in bash block — Claude Code tool call)
  - Pass flat variable map as argument
  - Handle success and failure cases

Step 5 — Summary display
```

### Pattern 3: critique-pencil-screenshot.md (invoked from /pde:critique Step 3)

**What:** Captures the Pencil canvas screenshot and makes it available to the critique pipeline as an additional visual input alongside existing wireframe HTML files.

**Integration point in critique.md:** After Step 3/7 (MCP probe), before Step 4/7 (evaluation). If Pencil is connected, capture screenshot and add it to WIREFRAME_FILES context. If not connected, continue with existing wireframe files — no blocking.

```
Step 0 — Check Pencil connection (bridge.call lookup)
  - If not connected → return immediately (non-blocking sub-workflow)
  - If connected → proceed

Step 1 — Call get_screenshot via MCP
  - toolName = bridge.call('pencil:get-screenshot').toolName
  - Returns base64-encoded image (MEDIUM confidence on exact format)
  - Timeout: 15 seconds

Step 2 — If screenshot available, write to .planning/design/ux/wireframes/pencil-canvas.png
  (decode base64 inline in bash block)

Step 3 — Return path for critique pipeline to include in evaluation
```

### Pattern 4: connect.md Step 3.9 — Pencil Connection Detection

**Why it's different from other integrations:** Pencil auto-configures `~/.claude.json` — there are NO manual `claude mcp add` steps. The connect workflow for Pencil is:

1. Verify VS Code with Pencil extension is installed (`highagency.pencildev`)
2. Instruct user to open VS Code and a `.pen` file to start the MCP server
3. Run `/pde:connect pencil --confirm` to record the connection in mcp-connections.json

**Auth instructions for Pencil in `AUTH_INSTRUCTIONS`:**

```javascript
pencil: [
  '1. Install the Pencil extension: code --install-extension highagency.pencildev',
  '   (or search "Pencil" in VS Code Extensions marketplace)',
  '2. Open VS Code and open or create a .pen file to start the Pencil MCP server',
  '3. The Pencil extension auto-configures Claude Code — no claude mcp add command needed',
  '4. Verify Pencil appears in Claude Code MCP list: run /mcp in Claude Code',
  '5. Return here and run /pde:connect pencil --confirm',
],
```

### Anti-Patterns to Avoid

- **Calling set_variables with DTCG format directly:** Pencil uses plain `type`/`value`, not DTCG `$type`/`$value`. Raw pass-through will fail silently or produce incorrect variables.
- **Hardcoding binary path:** The binary path includes the version number (`pencildev-0.6.28`). Never reference it directly — Claude Code manages this via `~/.claude.json`.
- **Missing timeout on probe:** Pencil MCP hangs when VS Code is closed (see Pitfall 1). `probeTimeoutMs: 8000` is required.
- **Blocking critique on Pencil unavailability:** PEN-03 requires graceful degradation. Screenshot capture must be a non-blocking enhancement, not a hard dependency.
- **No capture fallback in critique:** If `get_screenshot` returns no data, `/pde:critique` must continue with existing wireframe HTML files as if Pencil was never invoked.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS variable parsing for token import | Custom CSS parser | Instruct the AI agent to call `get_variables` from Pencil if sync is bidirectional | Pencil has its own variable structure; CSS parsing creates format mismatch |
| Screenshot capture | Node.js screenshot library or external tool | `get_screenshot` MCP tool | The MCP tool renders the actual canvas; external tools capture the OS screen which may not show the canvas |
| MCP server lifecycle management | Process spawning, health checks | Claude Code's MCP runtime + `probeTimeoutMs` timeout | Pencil extension manages the process; PDE should probe and degrade, not try to restart |
| Binary path detection | Filesystem scanning for `mcp-server-darwin*` | `~/.claude.json` auto-configuration by Pencil extension | Pencil extension handles this; manually scanning would break on extension updates |

**Key insight:** Pencil's MCP is a local tool managed by a VS Code extension process. PDE's role is purely coordination: transform token format, make the MCP call, handle the result. Never try to manage the Pencil process itself.

---

## Common Pitfalls

### Pitfall 1: Pencil MCP Hangs When VS Code Is Closed
**What goes wrong:** A `set_variables` or `get_screenshot` call hangs indefinitely (no response, no error) when VS Code/Cursor is not running. The stdio connection is open but unresponsive.
**Why it happens:** The MCP server process is owned by VS Code. When VS Code closes, the process exits, but the stdio pipes may not be immediately cleaned up in Claude Code's runtime.
**How to avoid:** Set `probeTimeoutMs: 8000` (shorter than the 10-15s used for HTTP integrations). The probe must treat a timeout as "unavailable" and degrade. All workflow bash blocks must wrap MCP calls in try/catch with a timeout.
**Warning signs:** A workflow step that waits more than 8 seconds without response during a Pencil call.
**Source:** Cursor community forum report — Pencil MCP gets stuck after ~5 calls, especially when combined with other MCPs. (LOW-MEDIUM confidence this is inherent to all scenarios vs. specific Cursor/auto-model behavior.)

### Pitfall 2: Wrong Variable Type Mapping
**What goes wrong:** DTCG `dimension` tokens (e.g., `"16px"`) are passed to Pencil `set_variables` as strings. Pencil expects `type: "number"` with a numeric value (e.g., `16`).
**Why it happens:** Direct pass-through without format conversion.
**How to avoid:** The `dtcgToPencilVariables()` function must strip `px` and parse to float for `$type: "dimension"`.
**Warning signs:** After `set_variables`, spacing tokens appear as `"16px"` string rather than `16` number in Pencil's variables panel.

### Pitfall 3: Auto-Configuration Not Detected
**What goes wrong:** `connect.md` Step 3.9 provides `claude mcp add` instructions that don't work because Pencil auto-configures itself.
**Why it happens:** Phase 39-42 integrations all required explicit `claude mcp add` commands; Pencil is the only one that is auto-configured by the extension.
**How to avoid:** Step 3.9 must instruct users to install the VS Code extension and open a `.pen` file (which triggers auto-configuration), then verify via `/mcp` in Claude Code. No `claude mcp add` command.
**Warning signs:** User reports "command not found" or "already configured" errors after following connect instructions.

### Pitfall 4: set_variables Overwrites All Pencil Variables
**What goes wrong:** Calling `set_variables` with PDE's token set overwrites variables the user created manually in Pencil that don't have DTCG counterparts.
**Why it happens:** Unknown whether `set_variables` does a full replace or a partial merge. Official docs don't specify merge semantics.
**How to avoid:** Before calling `set_variables`, call `get_variables` to inspect existing variables. Implement a `dtcgMergePencilVariables()` that only updates variables present in PDE's DTCG tokens, preserving Pencil-native variables. Apply the same non-destructive merge principle established in Phase 42 for Figma.
**Warning signs:** User reports Pencil variables they set manually are gone after running `/pde:system`.
**Confidence:** LOW — `set_variables` merge semantics are not documented in official Pencil docs. **Must be tested in real environment.** Default to conservative approach: get-then-merge.

### Pitfall 5: get_screenshot Format Assumption
**What goes wrong:** Workflow assumes `get_screenshot` returns base64-encoded PNG. If Pencil returns a different format (URL, raw bytes, JPEG), the write operation fails.
**Why it happens:** Pencil's official docs describe `get_screenshot` conceptually but don't document the response schema.
**How to avoid:** Implement adaptive response handling in `critique-pencil-screenshot.md`. Try to detect if response is base64 (check for `data:image` prefix or pure base64 string), handle both cases. If response can't be decoded, log a warning and continue critique without the screenshot.
**Warning signs:** Base64 decode error in the critique workflow; file written but not readable as valid PNG.

### Pitfall 6: TOOL_MAP Raw Names May Differ
**What goes wrong:** The raw tool names `mcp__pencil__set_variables`, `mcp__pencil__get_screenshot`, etc. may differ from what Pencil's MCP server actually registers. The `mcp__` prefix and double-underscore format is Claude Code's naming convention applied to server/tool names, but the exact server name registered in `~/.claude.json` may be `pencil` or `pencil-mcp` or something else.
**Why it happens:** Pencil source is closed; tool names were validated via official docs but not verified by inspecting actual `listTools` output.
**How to avoid:** Workflows use `bridge.call()` lookups — if tool names are wrong, ONLY the TOOL_MAP entry needs updating (not the workflow logic). STATE.md already flags this: "validate in real Pencil + Claude Code + VS Code environment before committing workflow logic."
**Warning signs:** `Tool not found in TOOL_MAP` errors after implementation; or Claude Code reports "unknown tool" when workflow executes the MCP call.

---

## Code Examples

### DTCG-to-Pencil Conversion (Inline, No External Deps)

```javascript
// Source: .pen format spec from docs.pencil.dev/for-developers/the-pen-format
// Inline in sync-pencil.md — consistent with figmaColorToCss/mergeTokens pattern

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
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, dtcgToPencilVariables(value, fullKey));
    }
  }
  return result;
}

function mergePencilVariables(existing, incoming) {
  // Non-destructive: only update/insert keys present in incoming
  const merged = Object.assign({}, existing);
  for (const [key, variable] of Object.entries(incoming)) {
    merged[key] = variable; // Update value; preserve Pencil-native variables not in incoming
  }
  return merged;
}
```

### Step 0 Pattern for sync-pencil.md (mirrors sync-figma.md)

```javascript
// bash block in sync-pencil.md Step 0
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
}
process.stdout.write(JSON.stringify({ status, setVarsToolName, getVarsToolName }) + '\n');
```

### APPROVED_SERVERS.pencil Update

```javascript
// Source: dev.classmethod.jp article + docs.pencil.dev/getting-started/ai-integration
pencil: {
  displayName: 'Pencil',
  transport: 'stdio',
  url: null,
  installCmd: null, // Extension auto-configures; no manual claude mcp add needed
  probeTimeoutMs: 8000, // Short timeout — prevent hang when VS Code not running
  probeTool: 'mcp__pencil__get_variables', // Lightest read-only tool (MEDIUM confidence on raw name)
  probeArgs: {},
},
```

### Test Pattern for Token Conversion

```javascript
// tests/phase-43/token-to-pencil.test.mjs
// Inline function copies (TDD without module coupling — same pattern as token-conversion.test.mjs)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// [Inline dtcgToPencilVariables() here]

describe('dtcgToPencilVariables', () => {
  it('converts color token to Pencil color variable', () => {
    const dtcg = { color: { primary: { '500': { $type: 'color', $value: '#3b82f6' } } } };
    const result = dtcgToPencilVariables(dtcg, '');
    assert.deepEqual(result['color.primary.500'], { type: 'color', value: '#3b82f6' });
  });

  it('strips px and parses dimension tokens as number', () => {
    const dtcg = { spacing: { base: { $type: 'dimension', $value: '16px' } } };
    const result = dtcgToPencilVariables(dtcg, '');
    assert.deepEqual(result['spacing.base'], { type: 'number', value: 16 });
  });

  it('skips unsupported types (shadow, gradient)', () => {
    const dtcg = { shadow: { base: { $type: 'shadow', $value: '0 1px 3px #000' } } };
    const result = dtcgToPencilVariables(dtcg, '');
    assert.equal(Object.keys(result).length, 0);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual design token copy-paste to design tool | MCP-based `set_variables` sync | 2025 (Pencil MCP launch) | Direct programmatic sync without user copy-paste |
| Design screenshots taken manually | `get_screenshot` MCP tool for AI-readable canvas capture | 2025 | AI critique can read canvas directly |
| HTTP/OAuth transport for all MCP integrations | stdio binary (Pencil) — auto-configured by extension | Phase 43 context | Pencil is different from all prior integrations: no `claude mcp add`, binary varies by version |

**Pencil vs. Figma comparison (relevant to PDE patterns):**

| Aspect | Figma | Pencil |
|--------|-------|--------|
| Transport | HTTP to `mcp.figma.com` | stdio local binary |
| Auth | OAuth via `/mcp` | None — extension auto-configures |
| Install command | `claude mcp add --transport http figma ...` | Install VS Code extension (extension auto-configures) |
| Variable import direction | Figma → PDE (FIG-01) | PDE → Pencil (PEN-01) |
| Screenshot | `mcp__figma__get_screenshot` from Figma file | `mcp__pencil__get_screenshot` from canvas |
| Availability check | Figma service outage, no file URL | VS Code not running, extension not installed |

---

## Open Questions

1. **`set_variables` merge semantics — does it replace all or merge?**
   - What we know: Official docs say it "updates theme values." No explicit merge/replace documentation.
   - What's unclear: Whether calling `set_variables` with 50 tokens deletes the other 200 Pencil-native variables.
   - Recommendation: Implement get-before-set pattern. Call `get_variables` first, merge with `mergePencilVariables()`, then call `set_variables` with the merged result. This is conservative and safe regardless of actual merge semantics.
   - **This is a MUST verify in real environment.**

2. **`get_screenshot` response format**
   - What we know: MCP tools conventionally return image content as base64. Figma's `mcp__figma__get_screenshot` returns base64. Pattern is consistent across MCP screenshot tools.
   - What's unclear: Whether Pencil's `get_screenshot` returns base64, a file path, or a URL. The Pencil docs say "render previews" without schema detail.
   - Recommendation: Implement adaptive handling in `critique-pencil-screenshot.md`. Try base64 decode first (standard MCP image content pattern). If response has `data:image/` prefix, strip it. If decode fails, log warning and continue without screenshot.

3. **Raw tool name format in Claude Code (`mcp__pencil__*`)**
   - What we know: Pencil MCP server is registered as `"pencil"` in `~/.claude.json`. Claude Code applies `mcp__` prefix and `__` tool-name separator. So `get_variables` → `mcp__pencil__get_variables`.
   - What's unclear: Whether the registered server name is `pencil`, `pencil-mcp`, or something else.
   - Recommendation: Use `mcp__pencil__*` in TOOL_MAP as the best-available guess. STATE.md explicitly flags this for validation in a live environment before shipping workflow logic.

4. **Pencil availability when `--app visual_studio_code` is running in Cursor**
   - What we know: The MCP binary takes `--app visual_studio_code` as argument even when run from Cursor context.
   - What's unclear: Whether the arg value matters for Cursor users or if `--app cursor` exists.
   - Recommendation: Phase 43 handles VS Code as the primary platform. The `connect.md` Step 3.9 should note that Cursor is also supported; the MCP binary arg is handled by the auto-configuration from the extension.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | None — direct file invocation |
| Quick run command | `node --test tests/phase-43/*.test.mjs` |
| Full suite command | `node --test tests/phase-40/*.test.mjs tests/phase-41/*.test.mjs tests/phase-42/*.test.mjs tests/phase-43/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PEN-01 | `dtcgToPencilVariables()` converts color/dimension/fontFamily correctly | unit | `node --test tests/phase-43/token-to-pencil.test.mjs` | ❌ Wave 0 |
| PEN-01 | `mergePencilVariables()` preserves Pencil-native variables not in incoming | unit | `node --test tests/phase-43/token-to-pencil.test.mjs` | ❌ Wave 0 |
| PEN-01 | `sync-pencil.md` exists and contains required strings (bridge.call, loadConnections, set-variables, tokens.json) | structural | `node --test tests/phase-43/sync-pencil-workflow.test.mjs` | ❌ Wave 0 |
| PEN-01 | TOOL_MAP has all 7 pencil entries; APPROVED_SERVERS.pencil.probeTool is set | unit | `node --test tests/phase-43/pencil-toolmap.test.mjs` | ❌ Wave 0 |
| PEN-02 | `critique-pencil-screenshot.md` exists and contains bridge.call, get-screenshot, degraded mode | structural | `node --test tests/phase-43/sync-pencil-workflow.test.mjs` | ❌ Wave 0 |
| PEN-03 | Degraded mode: when status != connected, workflow displays message and does NOT crash | structural | `node --test tests/phase-43/sync-pencil-workflow.test.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-43/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-40/*.test.mjs tests/phase-41/*.test.mjs tests/phase-42/*.test.mjs tests/phase-43/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-43/pencil-toolmap.test.mjs` — validates 7 TOOL_MAP entries, APPROVED_SERVERS.pencil.probeTool, probeTimeoutMs
- [ ] `tests/phase-43/token-to-pencil.test.mjs` — validates dtcgToPencilVariables() and mergePencilVariables() inline functions
- [ ] `tests/phase-43/sync-pencil-workflow.test.mjs` — structural tests for sync-pencil.md and critique-pencil-screenshot.md
- [ ] `tests/phase-40/mcp-bridge-toolmap.test.mjs` — UPDATE TOOL_MAP count assertion (currently 29; will become 36 after +7 Pencil entries)
- [ ] `tests/phase-41/linear-toolmap.test.mjs` — UPDATE TOOL_MAP count assertion (same)
- [ ] `tests/phase-42/figma-toolmap.test.mjs` — UPDATE TOOL_MAP count assertion (same)

---

## Sources

### Primary (HIGH confidence)

- [Pencil AI Integration docs](https://docs.pencil.dev/getting-started/ai-integration) — tool list: `batch_design`, `batch_get`, `get_screenshot`, `snapshot_layout`, `get_editor_state`, `get_variables`, `set_variables`
- [Pencil .pen format spec](https://docs.pencil.dev/for-developers/the-pen-format) — variable structure: `{ type, value }` flat dot-notation keys
- [dev.classmethod.jp Claude Code + Pencil article](https://dev.classmethod.jp/en/articles/claude-code-pencil-mcp-web-design/) — `~/.claude.json` config snippet confirming: `stdio` transport, `mcp-server-darwin-arm64` binary, `--app visual_studio_code` arg, auto-configuration
- Project `bin/lib/mcp-bridge.cjs` — existing APPROVED_SERVERS.pencil stub with `probeTool: null` (Phase 43 fills)
- Project `workflows/sync-figma.md` — established pattern for token sync workflow (Phase 42)
- Project `.planning/phases/42-figma-integration/42-02-SUMMARY.md` — inline function embedding pattern

### Secondary (MEDIUM confidence)

- [Pencil variables docs](https://docs.pencil.dev/core-concepts/variables) — variable types (color, number/dimension, string, boolean) confirmed
- Multiple community articles (atalupadhyay.wordpress.com, medium.com) — consistent with official docs on tool availability
- STATE.md research flag: "Tool names sourced from community articles (MEDIUM confidence) — validate in real Pencil + Claude Code + VS Code environment"

### Tertiary (LOW confidence)

- `mcp__pencil__*` raw tool name format — inferred from Claude Code's naming convention (server name `pencil` + `__` + tool name); not verified against live `listTools` output
- `set_variables` merge semantics — undocumented; assumed replace-or-merge; must verify in real environment
- `get_screenshot` response format — assumed base64 based on MCP image content conventions; not confirmed in official docs
- Pencil hang behavior — from Cursor community forum report; may be Cursor/auto-model-specific rather than universal

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Pencil extension ID, binary path, transport type, auto-configuration all confirmed by multiple sources
- TOOL_MAP entries (canonical names): HIGH — listed explicitly in official docs
- Raw `mcp__pencil__*` names: MEDIUM — inferred from Claude Code naming convention, not verified live
- `set_variables` format: HIGH for type mapping (DTCG vs Pencil), LOW for merge semantics
- `get_screenshot` format: MEDIUM — conventional base64 MCP pattern but not explicitly documented for Pencil
- Pitfalls: HIGH — hang behavior confirmed by community report; format mismatch confirmed by .pen spec

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Pencil is active software; extension version may change binary path — but tool API is stable)

**Critical validation required before shipping:**
1. Verify actual `mcp__pencil__*` raw tool names in a live Claude Code + VS Code + Pencil environment
2. Verify `set_variables` merge vs. replace behavior
3. Verify `get_screenshot` response format (base64, URL, or other)
