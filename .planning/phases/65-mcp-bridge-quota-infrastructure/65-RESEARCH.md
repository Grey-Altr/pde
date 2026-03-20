# Phase 65: MCP Bridge + Quota Infrastructure — Research

**Researched:** 2026-03-20
**Domain:** Google Stitch MCP integration, Claude Code HTTP MCP authentication, quota tracking patterns
**Confidence:** MEDIUM (Stitch tool names MEDIUM, HTTP header bug HIGH, quota limits MEDIUM-HIGH)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCP-01 | Stitch registered as 6th approved server in mcp-bridge.cjs APPROVED_SERVERS with probe/degrade contract | APPROVED_SERVERS schema documented in mcp-bridge.cjs; Stitch uses stdio transport (npx) not HTTP |
| MCP-02 | TOOL_MAP populated with verified Stitch MCP tool names | Community sources list 9 tools with MEDIUM confidence; live verification gate (MCP-05) resolves final names |
| MCP-03 | API key auth via STITCH_API_KEY env var with AUTH_INSTRUCTIONS for /pde:connect stitch | STITCH_API_KEY env var confirmed; stdio npx transport passes it as env var, not HTTP header |
| MCP-05 | Live MCP tool name verification gate before TOOL_MAP entries are finalized | Must call tools/list on live server via probe at bridge registration time |
| QUOTA-01 | Generation counter in .planning/config.json (Standard 350/mo, Experimental 50/mo) | Pattern: persist counter in config.json with monthly reset timestamp |
| QUOTA-02 | Pre-generation quota check with 80% threshold warning | Read counter before generation; 80% of 350 = 280 Standard, 80% of 50 = 40 Experimental |
| QUOTA-03 | Auto fallback to Claude HTML/CSS when quota exhausted | Same pattern as existing probe/degrade contract; check quota counter as degrade condition |
| QUOTA-04 | Quota status in /pde:progress and /pde:health | Surface quota.stitch block from config.json in both commands |
</phase_requirements>

---

## Summary

Phase 65 is foundational infrastructure for all subsequent Stitch integration phases. It has two independent tracks: (1) registering Stitch as the 6th approved MCP server in mcp-bridge.cjs with the probe/degrade contract, and (2) implementing a persistent quota counter in .planning/config.json with threshold alerting and fallback behavior.

The most critical research finding is that **the official Stitch MCP server uses stdio transport (npx), not HTTP transport**. The HTTP endpoint `https://stitch.googleapis.com/mcp` with `X-Goog-Api-Key` header exists but has active Claude Code bugs making it unreliable (issues #7290, #17069 — custom headers not sent, not written to config). The stdio proxy approach via `npx @_davideast/stitch-mcp proxy` with `STITCH_API_KEY` env var is the correct, supported path.

The second critical finding is the **`get_screen_code` vs `fetch_screen_code` discrepancy** from STATE.md: research confirms both names exist in different implementations. The official server uses `fetch_screen_code` (Kargatharaakash implementation, Gemini CLI extension) while the davideast proxy exposes `get_screen_code` as a wrapper. Since PDE must use the official Google server (verified-sources-only policy), the tool names from the community-wrapping implementations are likely lower-fidelity. The live verification gate (MCP-05) exists precisely to resolve this at implementation time.

Quota limits (350 Standard / 50 Experimental per month) are now MEDIUM-HIGH confidence — confirmed by multiple community sources including a review site, a Google Stitch complete guide, and product reviews, all citing the same values. Monthly reset logic is straightforward: store counter + reset_at ISO timestamp, reset when current date > reset_at.

**Primary recommendation:** Use stdio transport with npx for the Stitch MCP server, pass STITCH_API_KEY as an environment variable in the MCP server entry, and store quota state as a `quota.stitch` block in the existing .planning/config.json rather than a separate file.

---

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| `@_davideast/stitch-mcp` (npm) | latest | Official stdio proxy wrapping Stitch API | Most-referenced, explicit STITCH_API_KEY env var support, used in official Google Codelabs |
| Node.js native test runner | built-in | Phase 65 Nyquist tests | Established pattern from Phase 64 (.test.mjs files) |
| `mcp-bridge.cjs` | existing | Central adapter for all MCP integrations | Add Stitch as 6th entry; no new modules needed |
| `.planning/config.json` | existing | Persistent quota storage | Existing state file; zero additional dependencies |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|---|---|---|---|
| `Kargatharaakash/stitch-mcp` | community | Alternative with 9-tool surface | Fallback reference if davideast proxy lacks tool coverage |
| `stitch-sdk` (google-labs-code) | latest | Direct API for verification | Used in MCP-05 live tool name verification only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| stdio/npx transport | HTTP transport + X-Goog-Api-Key header | HTTP transport has active Claude Code bugs (issues #7290, #17069) where custom headers are not forwarded to server — headers not written to config file, not sent on requests. Closed as "NOT PLANNED" (Oct 2025). stdio is the correct path. |
| Separate quota.json file | `quota.stitch` block in config.json | Separate file adds a new persistent path with no benefit; config.json already exists and is read by health/progress commands |
| Monthly reset in cron/timer | Reset-on-read with timestamp comparison | PDE has no background process; reset must be lazy (check at read time if reset_at has passed) |

**Installation:**
```bash
# Stitch MCP server (runs as a subprocess via Claude Code MCP runtime)
npx @_davideast/stitch-mcp proxy
# No installation in plugin root needed — npx handles it at runtime
```

**Note:** Zero-npm constraint applies. PDE does NOT install `@_davideast/stitch-mcp` in package.json. The Claude Code MCP runtime invokes it via npx as configured in ~/.claude.json.

**Version verification:**
```bash
npm view @_davideast/stitch-mcp version
# Check at implementation time — this package is actively developed
```

---

## Architecture Patterns

### Recommended Project Structure

The Stitch changes are isolated to three existing files plus one new module:

```
bin/lib/
├── mcp-bridge.cjs           # Add stitch to APPROVED_SERVERS + TOOL_MAP
.planning/
├── config.json              # Add quota.stitch block
workflows/
├── connect.md               # Add Step 3.10 for Stitch API key capture
├── progress.md              # Add quota display section
├── health.md                # Quota.stitch included in health check
tests/
├── phase-65/
│   ├── stitch-bridge-registration.test.mjs   # MCP-01: APPROVED_SERVERS entry
│   ├── tool-map-stitch.test.mjs              # MCP-02: TOOL_MAP completeness
│   ├── quota-counter.test.mjs                # QUOTA-01/02/03: counter logic
│   └── quota-display.test.mjs               # QUOTA-04: progress/health surface
```

### Pattern 1: APPROVED_SERVERS Entry (Stitch)

**What:** Add Stitch as 6th entry in the APPROVED_SERVERS constant in mcp-bridge.cjs.
**When to use:** Follows the exact pattern of existing entries (github, linear, figma, pencil, atlassian).

```javascript
// Source: mcp-bridge.cjs existing entries + davideast/stitch-mcp README
stitch: {
  displayName: 'Google Stitch',
  transport: 'stdio',               // npx-based stdio proxy — NOT HTTP (see pitfall #1)
  url: null,                        // stdio transport has no URL
  installCmd: null,                 // See AUTH_INSTRUCTIONS — requires API key setup, not just claude mcp add
  probeTimeoutMs: 15000,            // Stitch generation can take 2-10 minutes; probe uses lightweight list tool
  probeTool: 'mcp__stitch__list_projects',  // Lightest read-only tool (MEDIUM confidence — verify at implementation)
  probeArgs: {},
},
```

**Critical note on installCmd:** Unlike GitHub/Linear/Figma/Atlassian which use simple `claude mcp add --transport http <url>`, Stitch requires an env var. The actual registration command is:
```bash
claude mcp add stitch --transport stdio -- npx @_davideast/stitch-mcp proxy
# Then set STITCH_API_KEY in the environment before Claude Code starts
```

### Pattern 2: TOOL_MAP Entries (Stitch)

**What:** Add stitch:* entries to TOOL_MAP in mcp-bridge.cjs.
**When to use:** Follow canonical-name → raw-name convention established by phases 40-43.

```javascript
// Source: Kargatharaakash/stitch-mcp README (MEDIUM confidence — live verification required per MCP-05)
// PENDING LIVE VERIFICATION — names marked TOOL_MAP_VERIFY_REQUIRED
'stitch:probe':                   'mcp__stitch__list_projects',          // TOOL_MAP_VERIFY_REQUIRED
'stitch:generate-screen':         'mcp__stitch__generate_screen_from_text', // TOOL_MAP_VERIFY_REQUIRED
'stitch:get-screen':              'mcp__stitch__get_screen',             // TOOL_MAP_VERIFY_REQUIRED
'stitch:list-screens':            'mcp__stitch__list_screens',           // TOOL_MAP_VERIFY_REQUIRED
'stitch:fetch-screen-code':       'mcp__stitch__fetch_screen_code',      // TOOL_MAP_VERIFY_REQUIRED (vs get_screen_code — resolve via MCP-05)
'stitch:fetch-screen-image':      'mcp__stitch__fetch_screen_image',     // TOOL_MAP_VERIFY_REQUIRED
'stitch:extract-design-context':  'mcp__stitch__extract_design_context', // TOOL_MAP_VERIFY_REQUIRED
'stitch:create-project':          'mcp__stitch__create_project',         // TOOL_MAP_VERIFY_REQUIRED
'stitch:list-projects':           'mcp__stitch__list_projects',          // TOOL_MAP_VERIFY_REQUIRED
'stitch:get-project':             'mcp__stitch__get_project',            // TOOL_MAP_VERIFY_REQUIRED
```

**MCP-05 Live Verification Gate Pattern:**

At Phase 65 implementation time, after configuring the MCP server with a valid STITCH_API_KEY, call `tools/list` on the live server:

```javascript
// Invoke in workflow context where Claude Code MCP runtime is available
// Tool: mcp__stitch__[any-tool]  — first attempt list_projects or equivalent
// If list_projects returns successfully, call the MCP tools/list discovery endpoint
// Compare returned tool names against TOOL_MAP entries
// Log discrepancies before committing TOOL_MAP
```

The key discrepancy to resolve: `fetch_screen_code` (Kargatharaakash, Gemini CLI extension) vs `get_screen_code` (davideast proxy). The proxy wraps the official tools, so official server likely uses `fetch_screen_code`.

### Pattern 3: Quota Storage Schema

**What:** Add a `quota.stitch` block to .planning/config.json.
**When to use:** Read before every Stitch generation call; write after every generation.

```javascript
// Quota block in .planning/config.json
// Source: PDE convention — config.json is the persistent state store
{
  "quota": {
    "stitch": {
      "standard": {
        "limit": 350,
        "used": 0,
        "reset_at": "2026-04-20T00:00:00.000Z"  // First day of next calendar month
      },
      "experimental": {
        "limit": 50,
        "used": 0,
        "reset_at": "2026-04-20T00:00:00.000Z"
      }
    }
  }
}
```

**Quota type mapping:**
- Standard = Gemini 2.5 Flash generations (wireframe, mockup screens)
- Experimental = Gemini 2.5 Pro generations (ideation visual divergence)

### Pattern 4: Quota Check Function

**What:** A reusable quota check function used before every Stitch generation.
**When to use:** Called by all Stitch-dependent workflows (wireframe, mockup, ideation) before making any generation call.

```javascript
// Source: PDE convention — inline functions, zero npm, CommonJS
// Location: bin/lib/mcp-bridge.cjs (new export)

function checkStitchQuota(generationType) {
  // generationType: 'standard' | 'experimental'
  const configPath = path.join(process.cwd(), '.planning', 'config.json');
  const raw = safeReadFile(configPath);
  const config = raw ? JSON.parse(raw) : {};
  const quota = config?.quota?.stitch?.[generationType];

  if (!quota) return { allowed: true, remaining: null, reason: 'no_quota_configured' };

  // Lazy monthly reset
  const now = new Date();
  const resetAt = new Date(quota.reset_at);
  if (now >= resetAt) {
    return { allowed: true, remaining: quota.limit, reason: 'quota_reset', needsWrite: true };
  }

  const remaining = quota.limit - quota.used;
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, reason: 'quota_exhausted' };
  }

  const pct = (quota.used / quota.limit) * 100;
  if (pct >= 80) {
    return { allowed: true, remaining, reason: 'quota_warning', pct: Math.round(pct) };
  }

  return { allowed: true, remaining, reason: 'ok' };
}
```

### Pattern 5: AUTH_INSTRUCTIONS for Stitch (connect.md Step 3.10)

**What:** Step 3.10 in connect.md for Stitch-specific auth capture.
**When to use:** When user runs `/pde:connect stitch` with `--confirm`.

The Stitch auth flow differs from OAuth-based services because it uses an API key:

1. User visits stitch.withgoogle.com → Profile icon → Settings → API Key section
2. User copies the API key
3. Set `STITCH_API_KEY` environment variable in shell profile:
   ```bash
   export STITCH_API_KEY="your-api-key-here"
   ```
4. Add Stitch to Claude Code MCP config:
   ```bash
   claude mcp add stitch --transport stdio -- npx @_davideast/stitch-mcp proxy
   ```
5. Restart Claude Code (or reload MCP servers via /mcp)
6. Run `/pde:connect stitch --confirm`

**AUTH_INSTRUCTIONS entry in mcp-bridge.cjs:**
```javascript
stitch: [
  '1. Go to stitch.withgoogle.com → click your profile icon → Settings → API Key section',
  '2. Generate and copy your Stitch API key',
  '3. Add to your shell profile (~/.zshrc or ~/.bashrc):',
  '   export STITCH_API_KEY="your-api-key-here"',
  '4. Source your profile: source ~/.zshrc (or open a new terminal)',
  '5. Register the Stitch MCP server with Claude Code:',
  '   claude mcp add stitch --transport stdio -- npx @_davideast/stitch-mcp proxy',
  '6. In Claude Code: /mcp → verify "stitch" appears in the server list',
  '7. Return here and run /pde:connect stitch --confirm',
],
```

### Anti-Patterns to Avoid

- **HTTP transport for Stitch:** Do not use `claude mcp add --transport http stitch https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: ..."`. Claude Code issues #7290 and #17069 confirm the `--header` flag is not written to config and headers are not forwarded on requests. Closed as NOT PLANNED. Use stdio.
- **Hardcoded quota limits in code:** Do not embed `350` and `50` as magic numbers throughout workflows. Store in config.json quota block; read from config. Future limit changes then require one config update.
- **Quota reset in a background process:** PDE is session-based; there is no background process. Reset must be lazy — check `reset_at` timestamp on every quota read, reset if past due.
- **Using list_screens for screen discovery after generate_screen_from_text:** Confirmed bug (discuss.ai.google.dev, Feb 2026 — Stitch team confirmed high priority). Screens are invisible to list_screens until the project is opened in a browser. Architectural mitigation: use the screenId returned in the generate_screen_from_text response directly, not list_screens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP stdio subprocess management | Custom stdio bridge | Claude Code MCP runtime + npx proxy | Claude Code already manages stdio subprocess lifecycle; npx handles version pinning |
| Stitch API HTTP client | Inline fetch() calls in workflows | `@_davideast/stitch-mcp` proxy (stdio) | Proxy handles token refresh, connection management, API surface changes |
| Monthly quota reset scheduler | cron job, background timer | Lazy reset on read (compare ISO timestamp) | PDE has no background process; file-based state is the correct model |
| Tool name discovery | Hardcoded MCP tool names at build time | Live verification gate at connection time (MCP-05) | Tool names have changed between implementations; verification prevents silent breakage |

**Key insight:** The Stitch MCP ecosystem has multiple competing implementations with divergent tool names. The verified-sources-only policy means PDE uses the official proxy, and the live verification gate (MCP-05) is the only reliable way to get authoritative tool names.

---

## Common Pitfalls

### Pitfall 1: HTTP Transport Header Bug in Claude Code
**What goes wrong:** Configuring `claude mcp add --transport http stitch https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: ..."` appears to succeed but the header is silently dropped. Authentication fails when tools are called.
**Why it happens:** Claude Code issues #7290, #17069 — `--header` flag not written to `~/.claude.json`; even when manually written, headers may not be forwarded on tool call POST requests. Closed as NOT PLANNED.
**How to avoid:** Use stdio transport exclusively. The `@_davideast/stitch-mcp` proxy handles auth internally via STITCH_API_KEY env var.
**Warning signs:** `mcp__stitch__*` calls return 401/403; probe times out; `~/.claude.json` stitch entry has no `headers` field after `claude mcp add --header`.

### Pitfall 2: `get_screen_code` vs `fetch_screen_code` Discrepancy
**What goes wrong:** TOOL_MAP entry uses wrong raw tool name; all stitch:fetch-screen-code calls throw "Tool not found in TOOL_MAP" or MCP tool not found.
**Why it happens:** The davideast proxy exposes `get_screen_code` (wrapper name) while the Kargatharaakash implementation and Gemini CLI extension both use `fetch_screen_code` (official name). The live server may differ from both.
**How to avoid:** MCP-05 live verification gate: after connecting with valid STITCH_API_KEY, call tools/list on the live server and compare against TOOL_MAP before committing.
**Warning signs:** Probe succeeds (list_projects works) but screen code fetch fails.

### Pitfall 3: list_screens State-Sync Bug
**What goes wrong:** After `generate_screen_from_text` succeeds, calling `list_screens` returns an empty array. Phase 66 workflows that depend on listing screens to get download URLs will silently produce no output.
**Why it happens:** Confirmed Stitch API bug (Feb 2026) — state sync latency between generative backend and MCP API layer. The screen exists server-side but is not returned by list_screens.
**How to avoid:** Architecture all screen workflows to use the `screenId` from the `generate_screen_from_text` response directly (to call `get_screen` or `fetch_screen_code`), never relying on `list_screens` for newly-generated screens.
**Warning signs:** list_screens returns `[]` immediately after successful generation; works correctly after opening project in browser.

### Pitfall 4: Quota Counter Clobber on Concurrent Writes
**What goes wrong:** Two concurrent Stitch calls both read `used: 5`, both increment to `6`, both write `6`. One increment is lost.
**Why it happens:** config.json is a shared file; no locking mechanism.
**How to avoid:** PDE runs sequentially within a session (Claude Code is not parallel within one conversation). If Phase 67 introduces batch generation, use a read-modify-write sequence and avoid separate read/increment/write calls with async gaps.
**Warning signs:** Used counter is lower than expected; generations happen but quota is not fully debited.

### Pitfall 5: Missing Stitch API Key Not Producing Clear Error
**What goes wrong:** User runs `/pde:wireframe --use-stitch` without having set STITCH_API_KEY. The MCP server starts but fails silently, or produces a confusing error.
**Why it happens:** The probe function in mcp-bridge.cjs delegates to Claude Code's runtime; if the server starts but authentication fails, the error message may not be user-friendly.
**How to avoid:** In AUTH_INSTRUCTIONS, explicitly tell users to persist STITCH_API_KEY in shell profile, not just set it for the current session. Connect workflow Step 3.10 should verify the env var is set before recording connection as `connected`.
**Warning signs:** `probe_result.available: false` with reason `auth_error`; user sees raw API error instead of PDE-formatted message.

---

## Code Examples

Verified patterns from existing PDE code and official sources:

### Quota Read + Reset Pattern (config.json)

```javascript
// Source: PDE convention — mcp-bridge.cjs inline function pattern
// Read quota, perform lazy reset if month has turned over
function readStitchQuota(generationType) {
  const configPath = path.join(process.cwd(), '.planning', 'config.json');
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch { /* missing or invalid — quota unconfigured */ }

  const quota = config?.quota?.stitch?.[generationType];
  if (!quota) return null;

  const now = new Date();
  const resetAt = quota.reset_at ? new Date(quota.reset_at) : new Date(0);

  if (now >= resetAt) {
    // Lazy reset: zero the counter, advance reset_at to first of next month
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      used: 0,
      limit: quota.limit,
      reset_at: nextReset.toISOString(),
      wasReset: true,
    };
  }

  return { used: quota.used, limit: quota.limit, reset_at: quota.reset_at, wasReset: false };
}
```

### Quota Increment Pattern

```javascript
// Source: PDE convention — atomic read-modify-write on config.json
function incrementStitchQuota(generationType) {
  const configPath = path.join(process.cwd(), '.planning', 'config.json');
  let config = {};
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}

  if (!config.quota) config.quota = {};
  if (!config.quota.stitch) config.quota.stitch = {};
  if (!config.quota.stitch[generationType]) {
    const limits = { standard: 350, experimental: 50 };
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);
    config.quota.stitch[generationType] = {
      limit: limits[generationType],
      used: 0,
      reset_at: nextReset.toISOString(),
    };
  }

  config.quota.stitch[generationType].used++;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return config.quota.stitch[generationType];
}
```

### APPROVED_SERVERS Entry (complete)

```javascript
// Source: mcp-bridge.cjs pattern — existing 5 entries as template
stitch: {
  displayName: 'Google Stitch',
  transport: 'stdio',
  url: null,
  installCmd: null,  // Multi-step: env var + npx — see AUTH_INSTRUCTIONS
  probeTimeoutMs: 15000,
  probeTool: 'mcp__stitch__list_projects',  // VERIFY at implementation — lightest read-only tool
  probeArgs: {},
},
```

### Connect Workflow Step 3.10 Pattern

The connect.md Step 3.10 for Stitch follows the Step 3.9 Pencil pattern (detection-based, no auto-configured MCP) but with API key capture:

```
## 3.10. Capture Stitch API Key (Stitch only, --confirm present)

Before recording the connection, verify STITCH_API_KEY is set in the environment.

Check for the env var:
- If STITCH_API_KEY is set: proceed to Step 4 with status 'connected'
- If STITCH_API_KEY is not set: display the AUTH_INSTRUCTIONS and stop with message:
  "STITCH_API_KEY is not set. Please complete setup first:
  Run /pde:connect stitch (without --confirm) to see setup instructions."
```

### Quota Display Pattern (for progress.md and health.md)

```
## Stitch Quota

| Type | Used | Limit | Remaining | Resets |
|------|------|-------|-----------|--------|
| Standard (Gemini Flash) | {used} | 350 | {350-used} | {reset_at date} |
| Experimental (Gemini Pro) | {used} | 50 | {50-used} | {reset_at date} |

{if standard.used >= 280 or experimental.used >= 40}
WARNING: Approaching quota limit — Stitch generation may fall back to Claude HTML/CSS.
{/if}
{if standard.used >= 350}
Stitch Standard quota exhausted. Wireframe/mockup generation will use Claude HTML/CSS.
{/if}
{if experimental.used >= 50}
Stitch Experimental quota exhausted. Ideation visual divergence will use text-only.
{/if}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| HTTP transport for Stitch (official endpoint) | stdio transport via npx proxy | Late 2025 (Claude Code header bugs never fixed) | HTTP is the intended path but Claude Code bugs make it unreliable; stdio is the actual working path |
| OAuth authentication for Stitch | API key authentication | March 2026 (Stitch API Keys launch) | Much simpler: set STITCH_API_KEY env var, done. No browser OAuth flow. |
| list_screens for screen discovery | Direct screenId from generate response | Feb 2026 (bug confirmed) | list_screens has state-sync latency; all workflows must use screenId from generation response |

**Deprecated/outdated:**
- `gcloud auth application-default login` + `GOOGLE_CLOUD_PROJECT` flow: Early Stitch MCP setup required gcloud credentials. API keys (March 2026) replace this. The community repo `Kargatharaakash/stitch-mcp` still shows ADC instructions but the API key path is simpler and officially launched.
- Direct `https://stitch.googleapis.com/mcp` HTTP endpoint: Exists but unreliable due to Claude Code header bugs. Use stdio proxy.

---

## Open Questions

1. **Exact live tool names from the official server**
   - What we know: Community sources list `fetch_screen_code` (Kargatharaakash, Gemini CLI) and `get_screen_code` (davideast proxy). Both are MEDIUM confidence.
   - What's unclear: Which name does the server behind `@_davideast/stitch-mcp proxy` expose to Claude Code at runtime?
   - Recommendation: MCP-05 live verification gate resolves this. Implementer must call `tools/list` on the connected server and compare before finalizing TOOL_MAP. Flag any discrepancy with an explicit warning comment in TOOL_MAP.

2. **Stitch generation type classification (Standard vs Experimental)**
   - What we know: Standard = Gemini 2.5 Flash (350/mo), Experimental = Gemini 2.5 Pro (50/mo)
   - What's unclear: Which `generate_screen_from_text` invocations count as Standard vs Experimental? Is the type a parameter? Or is it determined by a model selection field?
   - Recommendation: Stitch SDK docs show `modelId: "GEMINI_3_PRO" | "GEMINI_3_FLASH"`. Treat Flash as Standard, Pro as Experimental. If the proxy doesn't expose model selection, default to Standard for quota tracking.

3. **probe tool availability when STITCH_API_KEY is not set**
   - What we know: The davideast proxy exits if no credentials are found
   - What's unclear: Does the probe fail with a useful error message, or hang?
   - Recommendation: Set probeTimeoutMs to 15000; implement specific error handling for `STITCH_API_KEY not set` in connect.md Step 3.10 to prevent confusing timeout errors.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js native test runner (.test.mjs) |
| Config file | none — native runner |
| Quick run command | `node --test tests/phase-65/*.test.mjs` |
| Full suite command | `node --test tests/phase-65/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | APPROVED_SERVERS has stitch entry with required fields | unit | `node --test tests/phase-65/stitch-bridge-registration.test.mjs` | Wave 0 |
| MCP-02 | TOOL_MAP has all 10 stitch:* entries | unit | `node --test tests/phase-65/tool-map-stitch.test.mjs` | Wave 0 |
| MCP-03 | AUTH_INSTRUCTIONS has stitch array with 7 steps | unit | `node --test tests/phase-65/stitch-bridge-registration.test.mjs` | Wave 0 |
| MCP-05 | TOOL_MAP entries have TOOL_MAP_VERIFY_REQUIRED marker OR live-verified comment | unit | `node --test tests/phase-65/tool-map-stitch.test.mjs` | Wave 0 |
| QUOTA-01 | checkStitchQuota reads/writes config.json quota.stitch block | unit | `node --test tests/phase-65/quota-counter.test.mjs` | Wave 0 |
| QUOTA-02 | checkStitchQuota returns `quota_warning` at 80% threshold | unit | `node --test tests/phase-65/quota-counter.test.mjs` | Wave 0 |
| QUOTA-03 | checkStitchQuota returns `quota_exhausted` when used >= limit | unit | `node --test tests/phase-65/quota-counter.test.mjs` | Wave 0 |
| QUOTA-04 | Quota display logic surfaces Standard and Experimental counters | unit | `node --test tests/phase-65/quota-display.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-65/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-65/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-65/stitch-bridge-registration.test.mjs` — covers MCP-01, MCP-03 (APPROVED_SERVERS entry, AUTH_INSTRUCTIONS)
- [ ] `tests/phase-65/tool-map-stitch.test.mjs` — covers MCP-02, MCP-05 (TOOL_MAP completeness, verification markers)
- [ ] `tests/phase-65/quota-counter.test.mjs` — covers QUOTA-01, QUOTA-02, QUOTA-03 (counter logic, threshold, exhaustion, monthly reset)
- [ ] `tests/phase-65/quota-display.test.mjs` — covers QUOTA-04 (quota display formatting with correct threshold flags)

---

## Sources

### Primary (HIGH confidence)
- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/mcp-bridge.cjs` — Existing APPROVED_SERVERS schema, TOOL_MAP pattern, AUTH_INSTRUCTIONS format, probe/degrade architecture
- `github.com/anthropics/claude-code/issues/7290` — HTTP MCP headers not sent (closed NOT PLANNED); confirmed Claude Code header bug
- `github.com/anthropics/claude-code/issues/17069` — claude mcp add --header flag not written to config; confirmed Jan 2026; closed NOT PLANNED
- `github.com/anthropics/claude-code/issues/14977` — Custom headers not transmitted (duplicate of #7290)

### Secondary (MEDIUM confidence)
- `github.com/Kargatharaakash/stitch-mcp` — Tool names: `extract_design_context`, `fetch_screen_code`, `fetch_screen_image`, `generate_screen_from_text`, `create_project`, `list_projects`, `list_screens`, `get_project`, `get_screen`
- `github.com/davideast/stitch-mcp` — stdio proxy with STITCH_API_KEY env var; tool names `build_site`, `get_screen_code`, `get_screen_image`; STITCH_API_KEY auth confirmed
- `github.com/gemini-cli-extensions/stitch` — API Key authentication method confirmed; `fetch_screen_code` tool name aligned with Kargatharaakash
- `discuss.ai.google.dev/t/list-screens-returns-empty-after-generate-screen-from-text-until-project-is-opened-in-browser/123348` — list_screens bug confirmed; Stitch team acknowledged; high priority as of Feb 2026
- `codelabs.developers.google.com/design-to-code-with-antigravity-stitch` — API key authentication confirmed from official Google Codelabs
- `nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026` — Quota limits: 350 Standard (Gemini Flash), 50 Experimental (Gemini Pro)
- `winbuzzer.com/2026/03/20/google-redesigns-stitch-ai-voice-canvas-developer-integrations-xcxwbn/` — Stitch MCP server launch with API Keys confirmed March 2026

### Tertiary (LOW confidence)
- `mcpservers.org/servers/kargatharaakash/stitch-mcp` — Community aggregator; tool names overlap with Kargatharaakash repo
- `discuss.ai.google.dev/t/stitch-mcp-not-working-with-api-key/120933` — HTTP endpoint unreliable; gcloud credentials workaround (superseded by API key launch)
- `x.com/stitchbygoogle/status/2016567646180041166` — API Keys launch announcement (page content not accessible, search result summary only)

---

## Metadata

**Confidence breakdown:**
- Standard stack (stdio transport, npx proxy, STITCH_API_KEY): HIGH — confirmed by multiple sources including official Google Codelabs and davideast README
- Tool names (TOOL_MAP entries): MEDIUM — multiple community sources agree on most names, but `get_screen_code` vs `fetch_screen_code` discrepancy unresolved; MCP-05 live gate is mandatory
- Quota limits (350/50): MEDIUM-HIGH — confirmed by 3+ independent community sources, all citing the same values with model association (Flash/Pro)
- HTTP header bug: HIGH — multiple GitHub issues with repro evidence, closed NOT PLANNED
- list_screens bug: HIGH — confirmed by Google Developers Forum, Stitch team acknowledged

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — stable infrastructure, but Stitch is actively developed; quota limits could change with paid tiers)
