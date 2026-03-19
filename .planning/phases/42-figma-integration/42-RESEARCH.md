# Phase 42: Figma Integration - Research

**Researched:** 2026-03-18
**Domain:** Figma MCP Server (remote), Figma REST API, DTCG token format, Code Connect, code-to-canvas
**Confidence:** HIGH for tool names and API structure; MEDIUM for exact tool call parameter shapes (not fully documented publicly)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIG-01 | User can import Figma design tokens into PDE's DTCG system via `/pde:sync --figma` | `get_variable_defs` MCP tool returns variables by selection/file URL; COLOR {r,g,b,a} in 0–1 range requires hex conversion; non-destructive merge requires naming-convention mapping |
| FIG-02 | User can feed Figma design context into `/pde:wireframe` for reference | `get_design_context` returns React+Tailwind code with variable names inline; requires Figma file URL from mcp-connections.json |
| FIG-03 | User can import Figma Code Connect mappings into `/pde:handoff` output | `get_code_connect_map` returns `{nodeId: {codeConnectSrc, codeConnectName}}` — planner appends to HND spec as component reference table |
| FIG-04 | User can export PDE mockup HTML to editable Figma frames via code-to-canvas | `generate_figma_design` available in Claude Code via remote MCP; requires browser-rendered UI; confirmation gate before any Figma write |
</phase_requirements>

---

## Summary

The Figma MCP server (hosted at `https://mcp.figma.com/mcp`, HTTP transport, OAuth auth) is the primary interface for all four FIG requirements. The MCP server provides 13 tools; all are available on the remote server used by PDE. The server is already pre-configured in `APPROVED_SERVERS` in `mcp-bridge.cjs` with `probeTool: null` — Phase 42 fills this.

The most critical architectural discovery is the **variable import plan constraint**: `get_variable_defs` requires a Figma frame URL (node-id) as context — it is not a "dump all tokens" endpoint. Users must store a Figma file URL in `mcp-connections.json` at connect time. Additionally, the **Figma REST API Variables endpoint (`/v1/files/:file_key/variables/local`) is Enterprise-plan only**, so the MCP-based `get_variable_defs` is the correct path for most users. A second constraint is that `get_variable_defs` only returns **default mode values** (not light/dark alternates) — this limits multi-mode token imports to single-mode output.

The code-to-canvas feature (`generate_figma_design`) is officially supported in Claude Code via the remote MCP, but there is an active unresolved issue (claude-code#28718, March 2026) where it does not appear in the tool list for some users. The implementation should include a graceful degraded path if the tool is unavailable.

**Primary recommendation:** Use the Figma remote MCP server for all four requirements. Store a Figma file URL and optional file_key in `mcp-connections.json`. Use `get_variable_defs` for token import (with DTCG conversion), `get_design_context` for wireframe context, `get_code_connect_map` for handoff enrichment, and `generate_figma_design` for mockup export. Match the Phase 40/41 adapter pattern exactly.

---

## User Constraints (no CONTEXT.md)

No CONTEXT.md exists for this phase. All decisions are Claude's discretion within the Phase 39-41 established patterns:

- Must follow the MCP bridge adapter pattern (never call raw MCP tool names in workflows)
- Must populate `TOOL_MAP` in `mcp-bridge.cjs`
- Must populate `probeTool` in `APPROVED_SERVERS.figma`
- Must add `mcp__figma__*` to `allowed-tools` in the sync command
- Must follow connect.md step-numbering pattern (Step 3.8 for figma)
- Zero npm dependency constraint applies: no new npm packages at plugin root

---

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| Figma MCP Server | Remote (mcp.figma.com) | All Figma MCP operations | Official Figma server; already in APPROVED_SERVERS |
| node:test | Built-in Node | Test framework | Established in Phases 40 and 41 |
| node:assert/strict | Built-in Node | Assertions | Established in Phases 40 and 41 |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| Figma REST API v1 | Current | Variables (Enterprise only) | Only if user explicitly has Enterprise plan; degraded gracefully otherwise |
| DTCG Format | W3C 2025.10 stable | Design token JSON schema | PDE already uses DTCG tokens in assets/ |
| `@figma/code-connect` CLI | npm | Code Connect setup (user-side) | FIG-03: user runs this themselves; PDE only reads the output via `get_code_connect_map` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MCP `get_variable_defs` | Figma REST API Variables | REST API is Enterprise-only; MCP works on Pro/Starter |
| MCP `get_code_connect_map` | Reading `.figma.tsx` files locally | Local files require user to have Code Connect set up AND share paths; MCP is authoritative |
| MCP `generate_figma_design` | External screenshot + figma-api library | External libs violate zero-npm constraint; MCP is the official path |

**Installation:** No new npm packages required. All tools are via MCP server.

---

## Architecture Patterns

### mcp-connections.json Schema Extension for Figma

Phase 42 adds a `figma` key to `mcp-connections.json`:

```json
{
  "connections": {
    "figma": {
      "status": "connected",
      "fileUrl": "https://www.figma.com/design/ABC123/MyDesign?node-id=1-2",
      "fileKey": "ABC123",
      "fileName": "MyDesign",
      "connectedAt": "2026-03-18T12:00:00Z"
    }
  }
}
```

The `fileUrl` is the Figma file URL (optionally including a node-id for scoped variable fetching). The `fileKey` is extracted from the URL for REST API calls if needed. This is stored at connect time when user runs `/pde:connect figma --confirm`.

### TOOL_MAP Entries for Figma

Based on Figma MCP server tool names (verified from official documentation):

```javascript
// Figma — Phase 42 (verified from developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
'figma:probe':                  'mcp__figma__get_design_context',
'figma:get-design-context':     'mcp__figma__get_design_context',
'figma:get-variable-defs':      'mcp__figma__get_variable_defs',
'figma:get-code-connect-map':   'mcp__figma__get_code_connect_map',
'figma:get-screenshot':         'mcp__figma__get_screenshot',
'figma:generate-design':        'mcp__figma__generate_figma_design',
'figma:get-metadata':           'mcp__figma__get_metadata',
```

**Note:** The `mcp__figma__` prefix is the Claude Code convention for Figma MCP tools (same pattern as `mcp__github__`, `mcp__linear__`). The raw tool names are the names from Figma's official documentation. This follows INFRA-06 exactly.

### Figma Variable to DTCG Conversion

Figma REST API / `get_variable_defs` returns variables with these types:

| Figma `resolvedType` | DTCG `$type` | Value Conversion |
|---------------------|--------------|-----------------|
| `COLOR` | `color` | `{r, g, b, a}` in 0–1 → hex `#RRGGBB` or `#RRGGBBAA` |
| `FLOAT` | `dimension` | Number value; append `px` for spacing, leave raw for unitless |
| `STRING` | N/A | Text values; map to font-family or similar |
| `BOOLEAN` | N/A | True/false; skip or map to boolean tokens |

**COLOR conversion (verified):**
```javascript
function figmaColorToCss(color) {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  if (color.a === 1 || color.a === undefined) {
    return `#${r}${g}${b}`;
  }
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}
```

**DTCG output format:**
```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#0066ff",
      "$description": "Figma: Colors/Primary (Light mode)"
    }
  },
  "spacing": {
    "sm": {
      "$type": "dimension",
      "$value": "8px",
      "$description": "Figma: Spacing/SM"
    }
  }
}
```

### Figma Variable Name → DTCG Path Mapping

This is the naming convention mapping flagged in STATE.md as requiring design before implementation.

Figma variable names use slash notation: `Colors/Primary/500`, `Spacing/Small`, `Typography/Body`.

**Mapping rule:** Replace `/` with `.` (nested object path in DTCG JSON), then camelCase each segment:

| Figma Variable Name | DTCG JSON Path | Token Key |
|--------------------|----------------|-----------|
| `Colors/Primary/500` | `color.primary` | `500` |
| `Spacing/Small` | `spacing` | `small` |
| `Typography/Body Size` | `typography` | `bodySize` |

Collection name becomes the top-level key. This is the standard used by Token Studio and `@tfk-samf/figma-to-dtcg`.

### Non-Destructive Merge Logic

The non-destructive merge (FIG-01 requirement: "existing tokens preserved"):

```
1. Read existing DTCG file at assets/tokens.json (or similar)
2. Parse Figma variables response into new token map
3. For each Figma token:
   a. If token key exists in existing file: UPDATE value, preserve $description
   b. If token key does NOT exist: INSERT new token
4. For each existing token NOT in Figma response: PRESERVE unchanged
5. Write merged result
```

This is append-and-update, not replace. PDE-originated tokens (not from Figma) are preserved.

### Workflow File Patterns

Phase 42 creates these workflow files following Phase 40/41 patterns:

- `workflows/sync-figma.md` — FIG-01 token import
- `workflows/wireframe-figma-context.md` — FIG-02 context injection (sub-workflow called from wireframe.md)
- `workflows/handoff-figma-codeConnect.md` — FIG-03 Code Connect enrichment (sub-workflow called from handoff.md)
- `workflows/mockup-export-figma.md` — FIG-04 code-to-canvas export

### Connect Workflow Extension

`connect.md` gets a `Step 3.8` for Figma (following Step 3.6 for Linear, Step 3.7 for Jira). At `--confirm`, the user is prompted for their Figma file URL (optional but recommended for token import). This URL is stored in `mcp-connections.json` as `fileUrl`.

### Anti-Patterns to Avoid

- **Calling raw MCP tool names directly in workflows.** Always use `bridge.call('figma:xxx', args)` to get `toolName`, then use `toolName` as the Claude tool invocation.
- **Assuming Enterprise plan for variables.** `get_variable_defs` via MCP is the primary path; the Variables REST API is a fallback only documented for Enterprise.
- **Expecting `get_variable_defs` to return all tokens without a frame URL.** It requires a Figma URL with node-id. Store this in mcp-connections.json at connect time.
- **Using the desktop MCP server pattern.** PDE uses the remote server (`mcp.figma.com`). Desktop server patterns (selection-based without URL) do not apply.
- **Attempting Code Connect setup as part of PDE.** Code Connect is a user-side CLI tool (`@figma/code-connect`). PDE only reads the result via `get_code_connect_map`. If not set up, FIG-03 degrades gracefully.
- **Blocking on `generate_figma_design` availability.** There is an open issue (March 2026) where this tool does not appear for all Claude Code users. FIG-04 must check tool availability and degrade gracefully.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Figma token fetching | Custom REST API client | `get_variable_defs` MCP tool | Enterprise plan required for REST API; MCP works on all plans |
| Color hex conversion | Custom regex parser | Simple arithmetic (×255 + padStart) | Figma color format is defined; conversion is 4 lines |
| DTCG schema validation | Custom JSON schema validator | Trust the output format — no validation library needed | Zero npm constraint; DTCG format is simple enough to validate inline |
| Figma file API queries | `figma-api` npm package | Figma MCP tools | Violates zero npm constraint; MCP already authenticated |
| Token file merging | Deep merge library | Explicit key-by-key merge | "Non-destructive" semantics require controlled merge logic; generic deepmerge would overwrite PDE tokens |
| Code Connect file scanning | Codebase AST parsing | `get_code_connect_map` MCP tool | MCP tool is authoritative; scanning local files is fragile |

**Key insight:** In the Figma domain, the MCP server is more accessible (plan-wise) than the REST API. The REST API Variables endpoint is gated behind Enterprise — a significant adoption barrier. MCP tools work with OAuth on any paid plan.

---

## Common Pitfalls

### Pitfall 1: Enterprise Plan Assumption for Variables REST API
**What goes wrong:** Workflow calls `GET /v1/files/:file_key/variables/local` and gets a 403 because the user is on a Professional plan, not Enterprise.
**Why it happens:** Variables REST API requires Enterprise; `file_variables:read` scope is not available to non-Enterprise users.
**How to avoid:** Use `get_variable_defs` MCP tool (available on all plans). Only attempt REST API if user explicitly configures a Personal Access Token with `file_variables:read` scope — which implies they have Enterprise.
**Warning signs:** 403 errors with "Insufficient permissions" on variables endpoint.

### Pitfall 2: `get_variable_defs` Returns Only Default Mode
**What goes wrong:** User has Light/Dark mode tokens in Figma, but import only captures Light (default) values.
**Why it happens:** Known limitation confirmed in Figma Forum (Jan 2026): `get_variable_defs` only returns the default mode.
**How to avoid:** Document this limitation in the sync output. Users who need multi-mode tokens should use the Variables REST API (Enterprise) or the `@figma/code-connect` CLI export workflow.
**Warning signs:** Missing dark-mode tokens after sync.

### Pitfall 3: `generate_figma_design` Not in Tool List
**What goes wrong:** FIG-04 workflow calls `bridge.call('figma:generate-design', ...)` and gets the tool name, but when Claude Code tries to use it, the tool is not exposed by the MCP server for this user.
**Why it happens:** Active issue (claude-code#28718, March 2026): tool not exposed for all Claude Code users despite being documented as supported.
**How to avoid:** Before FIG-04 workflow runs, probe for tool availability using a lightweight check. If unavailable, display a graceful degraded message.
**Warning signs:** Tool call fails with "tool not found" even with Figma connected.

### Pitfall 4: Figma File URL Not Stored at Connect Time
**What goes wrong:** User runs `/pde:sync --figma` but no `fileUrl` in `mcp-connections.json`, so `get_variable_defs` has no Figma context.
**Why it happens:** Unlike GitHub (repo URL stored), Figma requires a user-provided file URL that is not automatically discoverable.
**How to avoid:** `connect.md` Step 3.8 prompts the user for their Figma file URL. Store in `mcp-connections.json`. Sync workflow checks for it and displays helpful error if missing.
**Warning signs:** "No Figma file URL configured" error in sync workflow.

### Pitfall 5: Code Connect Map Empty or Desktop-Only
**What goes wrong:** `get_code_connect_map` returns an empty object.
**Why it happens:** Code Connect requires: (1) user has run `@figma/code-connect` CLI to publish mappings, AND (2) their Figma plan supports Code Connect (Organization or Enterprise). Also: Code Connect map is populated from desktop server, not remote.
**How to avoid:** FIG-03 treats an empty `get_code_connect_map` response as a graceful degraded state — handoff spec produces correctly but without Code Connect component table. Add a note to output explaining how to set up Code Connect.
**Warning signs:** Empty `{}` response from `get_code_connect_map`.

### Pitfall 6: DTCG Token File Collision with Existing PDE Tokens
**What goes wrong:** Non-destructive merge overwrites PDE-originated tokens with Figma values because the key naming convention produces a collision.
**Why it happens:** If Figma variable is named `Color/Brand/Primary` and PDE already has a token at `color.brand.primary` with a different value, the merge will update it.
**How to avoid:** This is intentional by design — Figma is the source of truth for tokens it exports. But the merge must preserve tokens that have NO Figma counterpart. Document this clearly in the sync output.

---

## Code Examples

### bridge.call() pattern for Figma (follows Phase 40/41 established pattern)

```javascript
// Source: mcp-bridge.cjs pattern from Phase 40/41
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const figma = conn.connections && conn.connections.figma;
const fileUrl = figma && figma.fileUrl || '';
const status = figma && figma.status || 'not_configured';
let toolName = '';
try {
  const lookup = b.call('figma:get-variable-defs', {});
  toolName = lookup.toolName;
} catch (err) {
  toolName = '';
}
process.stdout.write(JSON.stringify({ fileUrl, status, toolName }) + '\n');
EOF
```

### get_variable_defs MCP call (happens in Claude Code workflow context, not bash)

```
Tool: mcp__figma__get_variable_defs
Input: { "fileUrl": "https://www.figma.com/design/ABC123/MyDesign?node-id=1-2" }
```
(Exact parameter name is MEDIUM confidence — may be `url`, `nodeUrl`, or just prompt context.
The workflow should prompt Claude to "use get_variable_defs with the Figma file URL" and
let the MCP server infer the correct parameter from context, as documented.)

### DTCG token merge (non-destructive)

```javascript
// Source: custom implementation pattern — no library
function mergeTokens(existing, incoming) {
  const merged = JSON.parse(JSON.stringify(existing)); // deep clone
  for (const [group, tokens] of Object.entries(incoming)) {
    if (!merged[group]) merged[group] = {};
    for (const [key, token] of Object.entries(tokens)) {
      if (merged[group][key]) {
        // UPDATE: preserve $description from existing if incoming has none
        merged[group][key].$value = token.$value;
        if (token.$description) merged[group][key].$description = token.$description;
      } else {
        // INSERT: new token from Figma
        merged[group][key] = token;
      }
    }
  }
  return merged; // existing tokens NOT in incoming are preserved
}
```

### Figma variable response → DTCG conversion

```javascript
// Source: derived from Figma REST API docs + DTCG spec (styledictionary.com/info/dtcg/)
function figmaVariablesToDtcg(variables, collections) {
  const result = {};
  for (const variable of Object.values(variables)) {
    const collection = collections[variable.variableCollectionId];
    const defaultModeId = collection?.defaultModeId;
    const value = variable.valuesByMode[defaultModeId];
    if (value === undefined) continue;

    // Derive DTCG path from variable name (e.g., "Colors/Primary/500" → ["Colors","Primary","500"])
    const parts = variable.name.split('/').map(p =>
      p.toLowerCase().replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    );
    const tokenKey = parts.pop();
    const groupPath = parts.map(p => p.toLowerCase()).join('.');

    // Convert value
    let dtcgType, dtcgValue;
    if (variable.resolvedType === 'COLOR') {
      dtcgType = 'color';
      dtcgValue = figmaColorToCss(value);
    } else if (variable.resolvedType === 'FLOAT') {
      dtcgType = 'dimension';
      dtcgValue = `${value}px`;
    } else {
      continue; // skip STRING/BOOLEAN for now
    }

    // Build nested output
    const groupKeys = groupPath ? groupPath.split('.') : [];
    let node = result;
    for (const key of groupKeys) {
      node[key] = node[key] || {};
      node = node[key];
    }
    node[tokenKey] = { $type: dtcgType, $value: dtcgValue };
  }
  return result;
}
```

### get_code_connect_map response structure

```json
{
  "1:23": {
    "codeConnectSrc": "src/components/ui/Button.tsx",
    "codeConnectName": "Button"
  },
  "1:45": {
    "codeConnectSrc": "src/components/ui/Card.tsx",
    "codeConnectName": "Card"
  }
}
```
Source: `developers.figma.com/docs/figma-mcp-server/tools-and-prompts/` (via WebSearch verification)

### Handoff spec Code Connect table format

```markdown
## Figma Code Connect Mappings

| Figma Node ID | Component | Source Path |
|---------------|-----------|-------------|
| 1:23 | Button | src/components/ui/Button.tsx |
| 1:45 | Card | src/components/ui/Card.tsx |
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Token Studio (Figma plugin) for token export | Native MCP `get_variable_defs` + REST API | 2024 (Figma Variables launched) | MCP-based approach is now preferred for AI workflows |
| `html-to-figma` libraries for mockup export | `generate_figma_design` MCP tool | 2025 (Figma MCP launch) | No npm dependency needed; official integration |
| Manual dev handoff in Dev Mode | Code Connect + MCP `get_code_connect_map` | 2024 (Code Connect launched) | AI agents can now auto-reference real component implementations |
| Figma Tokens plugin for DTCG sync | Native DTCG export (Nov 2025, Enterprise) | 2025 | Native import/export follows W3C DTCG 1.0 spec; plugins being superseded |

**Deprecated/outdated:**
- `html-to-figma` npm package: superseded by official `generate_figma_design` MCP tool
- Token Studio Figma plugin (for team token sync): being superseded by native Figma DTCG export, though plugin still widely used
- `@figma/rest-api-spec` direct REST calls for variables: gated to Enterprise; MCP is the practical path

---

## Open Questions

1. **Exact parameter name for `get_variable_defs` tool**
   - What we know: Tool is called `get_variable_defs`; it returns variables for a selection or frame URL
   - What's unclear: Is the input parameter `url`, `fileUrl`, `nodeId`, or prompt-only (no explicit param)?
   - Recommendation: Implement workflow as a natural-language prompt to Claude with the file URL in context, letting the MCP server infer. Add adaptive handling: if first call fails, retry as prompt-only.

2. **`generate_figma_design` availability status in Claude Code**
   - What we know: Officially supported per Figma docs; 12/13 tools visible per claude-code#28718 (March 2026)
   - What's unclear: Is this resolved in current Claude Code versions? Is it plan-gated?
   - Recommendation: FIG-04 must probe before calling. If tool is absent, show a message with the workaround (use Claude.ai browser for this operation) rather than failing.

3. **Code Connect plan requirement for `get_code_connect_map`**
   - What we know: Code Connect setup requires Organization or Enterprise plan; `get_code_connect_map` is available via MCP
   - What's unclear: Does `get_code_connect_map` return data if user has only set up Code Connect locally (not published to Figma)?
   - Recommendation: FIG-03 treats empty map as graceful degraded state. No plan check needed — just handle empty response.

4. **Figma file URL node-id scoping for token import**
   - What we know: Remote server requires a frame/file URL; entire file URL (no node-id) extracts from whole file
   - What's unclear: Can `get_variable_defs` with a whole-file URL return all global variables (not just used in one frame)?
   - Recommendation: Store full file URL at connect time. Document that users should provide a URL without node-id to get all variables. Note in sync output that only variables used in the file are returned.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in Node.js) |
| Config file | None |
| Quick run command | `node --test tests/phase-42/*.test.mjs` |
| Full suite command | `node --test tests/phase-42/*.test.mjs && node --test tests/phase-41/*.test.mjs && node --test tests/phase-40/mcp-bridge-toolmap.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIG-01 | Figma TOOL_MAP entries resolve via bridge.call() | unit | `node --test tests/phase-42/figma-toolmap.test.mjs` | Wave 0 |
| FIG-01 | sync-figma.md workflow file exists with correct structure | unit | `node --test tests/phase-42/sync-figma-workflow.test.mjs` | Wave 0 |
| FIG-01 | figmaColorToCss() converts RGBA 0-1 to hex correctly | unit | `node --test tests/phase-42/token-conversion.test.mjs` | Wave 0 |
| FIG-01 | mergeTokens() is non-destructive (preserves PDE tokens) | unit | `node --test tests/phase-42/token-conversion.test.mjs` | Wave 0 |
| FIG-02 | wireframe-figma-context.md exists and uses bridge.call for figma:get-design-context | unit | `node --test tests/phase-42/wireframe-figma-workflow.test.mjs` | Wave 0 |
| FIG-03 | handoff-figma-codeConnect.md exists with Code Connect table format | unit | `node --test tests/phase-42/handoff-figma-workflow.test.mjs` | Wave 0 |
| FIG-04 | mockup-export-figma.md exists with confirmation gate and generate_figma_design usage | unit | `node --test tests/phase-42/mockup-export-figma-workflow.test.mjs` | Wave 0 |
| FIG-04 | Confirmation gate rejects non-yes input (VAL-03 compliance) | unit | included in mockup-export-figma-workflow.test.mjs | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-42/*.test.mjs`
- **Per wave merge:** Full suite command above
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-42/figma-toolmap.test.mjs` — covers FIG-01 TOOL_MAP
- [ ] `tests/phase-42/sync-figma-workflow.test.mjs` — covers FIG-01 workflow file
- [ ] `tests/phase-42/token-conversion.test.mjs` — covers FIG-01 conversion logic
- [ ] `tests/phase-42/wireframe-figma-workflow.test.mjs` — covers FIG-02
- [ ] `tests/phase-42/handoff-figma-workflow.test.mjs` — covers FIG-03
- [ ] `tests/phase-42/mockup-export-figma-workflow.test.mjs` — covers FIG-04

---

## Sources

### Primary (HIGH confidence)

- `developers.figma.com/docs/figma-mcp-server/tools-and-prompts/` — complete tool list, server availability per tool
- `developers.figma.com/docs/rest-api/variables-endpoints/` — full Variables REST API schema (GET/POST endpoints, response structure)
- `developers.figma.com/docs/figma-mcp-server/code-to-canvas/` — generate_figma_design mechanics, supported clients
- `help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server` — overview of capabilities and limitations
- `mcp-bridge.cjs` (project file) — existing APPROVED_SERVERS.figma configuration (URL, transport, auth pattern)
- `tests/phase-41/linear-toolmap.test.mjs` + `tests/phase-41/sync-linear-workflow.test.mjs` — established test patterns for Phase 42 to follow

### Secondary (MEDIUM confidence)

- `deepwiki.com/figma/mcp-server-guide/3.1-remote-server-setup` — remote server URL and link-based parameter pattern
- `deepwiki.com/figma/mcp-server-guide/6.2-setting-up-code-connect` — get_code_connect_map response schema `{nodeId: {codeConnectSrc, codeConnectName}}`
- `styledictionary.com/info/dtcg/` — DTCG $type/$value schema and token structure
- `github.com/anthropics/claude-code/issues/28718` — confirmed that `generate_figma_design` is missing from Claude Code for some users (March 2026)
- `forum.figma.com/suggest-a-feature-11/figma-mcp-reading-variable-modes-42031` — confirmed that `get_variable_defs` only returns default mode values

### Tertiary (LOW confidence — flag for live validation)

- Community sources confirming `mcp__figma__` prefix convention for Claude Code (not in official docs)
- Exact parameter names for `get_variable_defs` MCP call (documentation does not specify; prompt-based context is the documented approach)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Figma MCP server URL, transport, auth, and tool names all verified from official docs
- Architecture: HIGH — adapter pattern is established in Phase 40/41; DTCG format is verified W3C spec
- Pitfalls: HIGH — Enterprise plan restriction, mode limitation, and generate_figma_design issue all verified from official sources and GitHub issues
- Tool parameter shapes: MEDIUM — official docs describe tools by purpose but not always exact parameter names; Claude Code's MCP context inference compensates

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 for stable Figma MCP server; `generate_figma_design` availability may change sooner given active GitHub issue
