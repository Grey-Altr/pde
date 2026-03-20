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

---

## Deep Dive Findings

*Added 2026-03-20 — Deep investigation of all 5 areas requested in checkpoint response.*

---

### Area 1: Stitch MCP Tool Surface — Complete Verified Inventory

#### The Two-Layer Architecture

The `@_davideast/stitch-mcp` proxy exposes a **two-layer tool surface**:

1. **Virtual/custom tools** (proxy-defined, higher-level wrappers combining multiple upstream API calls)
2. **Upstream Stitch MCP tools** (forwarded directly from the official Stitch MCP backend)

This explains the `get_screen_code` vs `fetch_screen_code` discrepancy: `get_screen_code` is a **virtual tool** in the davideast proxy; `fetch_screen_code` is the **upstream official tool name**.

#### Virtual Tools (davideast proxy only)

These 3 tools are defined by the proxy and do NOT exist in the official Stitch MCP API:

| Tool Name | Parameters | Purpose |
|---|---|---|
| `build_site` | `projectId` (string, required), `routes` (array of `{screenId, route}` objects) | Builds a multi-page site by mapping screens to routes; returns HTML for each page |
| `get_screen_code` | project/screen identifiers | Wrapper around `fetch_screen_code` — retrieves screen HTML |
| `get_screen_image` | project/screen identifiers | Wrapper around `fetch_screen_image` — retrieves screenshot as base64 |

**Confidence: HIGH** — Source: github.com/davideast/stitch-mcp README (fetched directly)

#### Upstream Official Tool Names (Kargatharaakash / official Stitch API)

These 9 tools represent the official Stitch MCP API surface. The Kargatharaakash implementation forwards them without wrapping:

| Tool Name | Purpose | Confidence |
|---|---|---|
| `list_projects` | Lists all Stitch projects | HIGH (both Kargatharaakash and davideast proxy expose this as probe tool) |
| `get_project` | Gets details of a specific project | MEDIUM (Kargatharaakash repo) |
| `create_project` | Creates a new project | MEDIUM (Kargatharaakash repo) |
| `list_screens` | Lists screens in a project (has state-sync bug) | HIGH (confirmed by bug reports) |
| `get_screen` | Gets metadata for a specific screen | MEDIUM (Kargatharaakash repo) |
| `generate_screen_from_text` | Generates a new screen from a text prompt | HIGH (multiple sources, takes 2-10 min) |
| `fetch_screen_code` | Downloads the raw HTML/frontend code of a screen | MEDIUM (Kargatharaakash repo; `get_screen_code` is proxy alias) |
| `fetch_screen_image` | Downloads high-res screenshot of a screen | MEDIUM (Kargatharaakash; `get_screen_image` is proxy alias) |
| `extract_design_context` | Scans a screen to extract Design DNA (fonts, colors, layouts) | MEDIUM (Kargatharaakash repo) |

**Confidence: MEDIUM** — Source: github.com/Kargatharaakash/stitch-mcp README (fetched directly)

#### `get_screen_code` vs `fetch_screen_code` — Resolution

**Evidence summary:**

| Source | Tool Name Used | Type |
|---|---|---|
| davideast proxy (README) | `get_screen_code` | Virtual wrapper in proxy |
| Kargatharaakash/stitch-mcp | `fetch_screen_code` | Official upstream name |
| gemini-cli-extensions/stitch | `fetch_screen_code` | Official upstream name |
| google-labs-code/stitch-sdk | `get_html` (SDK method, not MCP tool name) | SDK abstraction |

**Verdict (MEDIUM confidence):** `fetch_screen_code` is the official Stitch MCP tool name. `get_screen_code` is a proxy wrapper added by davideast. The PDE TOOL_MAP should use `mcp__stitch__fetch_screen_code` as the raw name for `stitch:fetch-screen-code`. However, when the proxy is used (which PDE does), **both names may be available simultaneously** since the proxy forwards upstream tools AND adds its virtual tools. MCP-05 live gate must confirm which name Claude Code sees at runtime.

#### `generate_screen_from_text` — modelId Parameter

The `generate_screen_from_text` tool accepts a `modelId` parameter that determines whether it counts as Standard or Experimental quota:

| modelId Value | Quota Type | Monthly Limit |
|---|---|---|
| `"GEMINI_3_FLASH"` (default) | Standard | 350 |
| `"GEMINI_3_PRO"` | Experimental | 50 |

**Confidence: MEDIUM** — Source: google-labs-code/stitch-sdk README + search results confirming these two model values

**Implementation note:** The `modelId` parameter is how PDE should distinguish quota types. When calling `stitch:generate-screen`, pass `modelId: "GEMINI_3_FLASH"` for wireframe/mockup (Standard) and `modelId: "GEMINI_3_PRO"` for ideation divergence (Experimental). The quota counter type is determined by the modelId used.

#### Tool Discovery via CLI

The davideast proxy supports tool discovery without a live Claude Code connection:

```bash
npx @_davideast/stitch-mcp tool           # Lists all available tools
npx @_davideast/stitch-mcp tool -s <name> # Shows schema for a specific tool
```

This can be used to enumerate the EXACT tool names at implementation time, providing an alternative to the MCP `tools/list` protocol method.

---

### Area 2: stdio Transport Details

#### How `npx @_davideast/stitch-mcp proxy` Works Under the Hood

The command starts a Node.js process that:
1. Reads `STITCH_API_KEY` from the environment
2. Opens stdin/stdout as an MCP JSON-RPC transport
3. Acts as a bidirectional proxy: forwards tool calls to the Stitch API, returns responses
4. Exposes its 3 virtual tools alongside the upstream Stitch MCP tools

Claude Code manages this as a child process — it is spawned when the MCP server is first needed and kept alive across the session.

#### Startup Time

| Scenario | Expected Time | Notes |
|---|---|---|
| npx with warm cache | ~1.2 seconds | Node.js module resolution from ~/.npm cache |
| npx with cold cache | 5-15+ seconds | Downloads package from npm registry |
| Process already running | ~0 seconds | Claude Code reuses existing subprocess |

**Source: MEDIUM** — github.com/anthropics/claude-code/issues/29033 and SFEIR Institute MCP docs confirm "average 1.2s startup" for stdio servers; cold cache estimate based on npm download latency.

**Implication for probeTimeoutMs:** The existing `15000` ms value in the APPROVED_SERVERS entry is correct for cold cache scenarios. Do not reduce below 10000ms.

#### Connection Lifecycle

- **Session start:** Claude Code spawns the stdio subprocess when MCP tools are first needed (lazy initialization, not at session start unless the server is pre-warmed)
- **Between calls:** The subprocess stays alive; no reconnection overhead per tool call
- **Session end:** Claude Code does NOT reliably terminate MCP subprocess on exit — this is a known issue (github.com/anthropics/claude-code/issues/1935). Orphaned npx processes accumulate across sessions. Not a correctness issue for PDE (quota tracking is file-based), but worth knowing.
- **Timeout behavior:** Claude Code has a hard cap of ~60 seconds regardless of `MCP_TIMEOUT` env var setting (github.com/anthropics/claude-code/issues/16837). For Stitch generation (2-10 minutes), the MCP tool call itself does not time out at the transport level — only the stdio subprocess startup times out at 60s. The generation tool call has its own response timeout.

**Confidence: MEDIUM** — Sources: Claude Code GitHub issues #35287, #16837, #1935

#### Error Modes When the Proxy Crashes

| Scenario | What Claude Code Does | User Experience |
|---|---|---|
| Startup failure (bad STITCH_API_KEY) | Waits indefinitely for initialization handshake | Session appears to hang; must cancel manually |
| Crash during tool call | Tool call returns error; MCP server shows as disconnected | Error propagated to workflow; probe returns `available: false` |
| Reconnect attempt | `/mcp reconnect` attempts restart; often fails silently | User sees "Failed to reconnect to stitch" with no detail |
| Orphaned process | Process continues consuming resources | No user-facing impact; accumulates across sessions |

**Implication:** The connect workflow Step 3.10 MUST verify STITCH_API_KEY is set before recording the connection. A missing API key causes an indefinite hang at startup, not a clean error message.

#### The `claude mcp add` Command — Exact Syntax

```bash
# Correct syntax for stdio MCP server with npx
claude mcp add stitch --transport stdio -- npx @_davideast/stitch-mcp proxy
```

**Important:** The `--` separator is required to prevent Claude Code from interpreting `npx` arguments as `claude mcp add` options.

**Note:** The `claude mcp add` command does NOT support passing env vars at registration time. STITCH_API_KEY must be set in the environment where Claude Code is launched (shell profile), NOT in the `claude mcp add` command.

#### Claude Code MCP Configuration Format (~/.claude.json)

The `claude mcp add` command writes to `~/.claude.json`. The resulting entry looks like:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"],
      "type": "stdio"
    }
  }
}
```

To include an env var explicitly in the config file (if shell profile approach is unreliable):

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"],
      "type": "stdio",
      "env": {
        "STITCH_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**The `env` field in .mcp.json / ~/.claude.json is the recommended approach for persistent env var configuration.** The shell profile approach is simpler to document in AUTH_INSTRUCTIONS but more fragile (doesn't work if user launches Claude Code from a GUI app that doesn't source the shell profile).

**Confidence: HIGH** — MCP JSON configuration format verified from MCP official docs and fastmcp.com documentation; `env` field is a standard MCP client configuration feature.

**Updated AUTH_INSTRUCTIONS recommendation:** AUTH_INSTRUCTIONS Step 3 should offer both approaches:
- Shell profile (simpler for most users)
- Direct ~/.claude.json env field (more reliable for GUI app launches)

#### `claude mcp test` Command (v1.0.33+)

Claude Code v1.0.33 (February 2026) added `claude mcp test <server-name>` which pings the server and verifies tools list is accessible. Use this in the MCP-05 verification step:

```bash
claude mcp test stitch
```

Expected output when working: server responds with tool list within ~150ms. This is the preferred way to run MCP-05 live verification rather than manually constructing JSON-RPC calls.

**Confidence: MEDIUM** — Source: SFEIR Institute MCP docs referencing v1.0.33 changelog

---

### Area 3: Quota Mechanics — Deep Investigation

#### Standard vs Experimental Determination

Generation type is determined by the `modelId` parameter passed to `generate_screen_from_text`:

- `modelId: "GEMINI_3_FLASH"` (or omitted — Flash is the default) → counts against **Standard** quota (350/month)
- `modelId: "GEMINI_3_PRO"` → counts against **Experimental** quota (50/month)

This is a **caller-controlled parameter**, not server-determined. The PDE quota tracking logic must read the `modelId` from the generation call to know which counter to increment.

**Confidence: MEDIUM** — Source: google-labs-code/stitch-sdk README showing two model IDs; search results confirming Flash=Standard, Pro=Experimental

#### Quota Exceeded — Error Response

When a Stitch generation call hits the quota limit, the API returns an HTTP 429 with a Google Cloud standard error body:

```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details.",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

The MCP layer wraps this: the `generate_screen_from_text` tool call will return an error object rather than a screen result. The workflow must detect this condition and trigger fallback.

**Confidence: MEDIUM** — Source: Google Cloud Quota docs (standard error format); Stitch likely follows this pattern as it's built on Google Cloud infrastructure. Not directly verified for Stitch-specific responses — LOW confidence on the exact message text, MEDIUM on the HTTP 429 / RESOURCE_EXHAUSTED pattern.

**Detection in workflow:** Check if the tool call result contains an `error.status === "RESOURCE_EXHAUSTED"` field, OR if the HTTP status was 429. If detected, set quota counter to limit (force exhaustion), trigger fallback.

#### Checking Quota Usage

There is **no API to check current Stitch quota usage**. The Stitch dashboard shows quota at `stitch.withgoogle.com` (Settings → API Keys section reportedly shows remaining generations) but there is no programmatic endpoint to query current usage.

**Implication:** PDE's local counter in config.json is the only quota tracking mechanism. If a user makes calls outside PDE (directly in the Stitch UI or via another tool), the local counter will undercount actual usage. This is an acceptable limitation — document it in the Stitch quota display.

**Confidence: LOW** — Unable to find official API for quota query. Based on absence of documented endpoint plus community reports showing no programmatic quota check.

#### Monthly Reset — Calendar Month vs Rolling 30 Days

Stitch quota resets on a **calendar month basis** (first of the month), not a rolling 30-day window. This is consistent with all community sources citing "monthly" limits and the standard Google Cloud billing cycle.

**Reset implementation:**
```javascript
// Correct: first day of next calendar month at midnight UTC
const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
```

**Timezone edge case:** Store `reset_at` as UTC ISO string. Compare using UTC dates. A user in UTC-8 at 11pm on March 31 should see their quota reset at midnight UTC April 1 (4pm local time March 31), not midnight local time. Using `Date.UTC()` for reset calculation avoids this edge case.

**Confidence: MEDIUM** — Calendar month reset confirmed by general Google quota patterns; UTC recommendation is best practice for timezone-safe code.

#### Rate Limits Within Quota

No evidence of within-quota rate limits (e.g., max concurrent, requests per minute) was found in official sources. Screen generation takes 2-10 minutes per call due to the generative AI backend, which serves as a natural rate limiter. Community reports do not mention per-minute rate limiting.

**Confidence: LOW** — Absence of evidence is not evidence of absence. Phase 67 batch generation should implement sequential (not parallel) generation as a safe default, regardless.

---

### Area 4: Existing mcp-bridge.cjs Architecture — Complete Documentation

#### APPROVED_SERVERS Structure (from source)

Each entry in `APPROVED_SERVERS` has exactly these fields:

```javascript
{
  displayName: string,       // Human-readable name shown in /pde:connect output
  transport: string,         // 'http' | 'stdio' | 'sse'
  url: string | null,        // Base URL for HTTP/SSE transports; null for stdio
  installCmd: string | null, // claude mcp add command string; null when multi-step (Pencil, Stitch)
  probeTimeoutMs: number,    // Timeout for probe operations (varies by transport speed)
  probeTool: string | null,  // Raw MCP tool name for liveness probe; null if no probe
  probeArgs: object,         // Arguments to pass to probeTool (empty {} for no-arg probes)
}
```

Confirmed from reading the actual source: all 5 existing servers follow this schema exactly.

#### AUTH_INSTRUCTIONS Structure

`AUTH_INSTRUCTIONS` is a plain object keyed by server key, value is an array of instruction strings:

```javascript
const AUTH_INSTRUCTIONS = {
  github: ['1. Run in terminal: ...', '2. In Claude Code session: ...', ...],
  linear: [...],
  figma: [...],
  pencil: [...],
  atlassian: [...],
};
```

The connect.md workflow reads `AUTH_INSTRUCTIONS[SERVICE_KEY]` and displays each string on its own line. Adding `stitch` as a key with a 7-element array follows this exact pattern.

#### probe() Function Contract

The `probe()` function in mcp-bridge.cjs does NOT actually call MCP tools. It is a coordination point only:

```javascript
function probe(serverKey) {
  assertApproved(serverKey);
  const server = APPROVED_SERVERS[serverKey];
  if (server.probeTool === null) {
    return { available: false, status: 'not_configured', reason: 'probe_not_implemented' };
  }
  return {
    available: false,
    status: 'probe_deferred',
    reason: 'Probe tool calls require Claude Code MCP runtime — use within workflow context',
  };
}
```

**The actual probe MCP call happens in workflow files (like sync-pencil.md), not in mcp-bridge.cjs.** The workflow calls the probeTool directly via Claude Code's MCP runtime. mcp-bridge.cjs only provides the tool name and timeout value.

**Implication for MCP-05 implementation:** The live verification gate must be implemented in connect.md Step 3.10 (workflow context), not in mcp-bridge.cjs.

#### TOOL_MAP Pattern

TOOL_MAP maps `'service:canonical-name'` → `'mcp__service__raw_name'` format:

```javascript
const TOOL_MAP = {
  'github:list-issues': 'mcp__github__list_issues',  // kebab-case canonical → snake_case raw
  ...
};
```

The `call()` function does a hasOwnProperty lookup and returns `{ toolName, args }`. The workflow layer uses the returned `toolName` to make the actual MCP call.

#### How /pde:connect Works for Existing Servers (from workflows/connect.md)

The connect workflow follows this sequence:

1. **Step 0:** Parse arguments (SERVICE_KEY, --confirm, --disconnect flags)
2. **Step 1:** `assertApproved()` — security policy enforcement
3. **Step 2:** Handle --disconnect if present
4. **Step 3:** If no --confirm: display AUTH_INSTRUCTIONS and stop
5. **Steps 3.5-3.9:** Service-specific capture (repo for GitHub, teamId for Linear, etc.)
6. **Step 4:** `updateConnectionStatus()` — write to mcp-connections.json with status='connected'
7. **Step 5:** Error handling

**Key observations for Stitch Step 3.10:**
- Steps 3.5-3.9 are service-specific sub-steps between Step 3 and Step 4
- Each sub-step captures service-specific metadata and passes it as `extraFields` to `updateConnectionStatus()`
- Pencil's Step 3.9 is the closest analog — detection-based, no `claude mcp add` command
- Stitch Step 3.10 should check for STITCH_API_KEY env var (like Pencil checks for extension detection) before recording as 'connected'
- Step 4 for Stitch uses the "all other services" branch (no special extraFields needed beyond `connected_at`)

**The approved services list in Step 0 help text also needs updating:** Line 20 of connect.md reads `Approved services: github, linear, figma, pencil, atlassian`. This must become `github, linear, figma, pencil, atlassian, stitch`.

#### Connection Persistence Schema (mcp-connections.json)

The `updateConnectionStatus()` function writes connection metadata with this structure:

```json
{
  "schema_version": "1.0",
  "connections": {
    "stitch": {
      "server_key": "stitch",
      "display_name": "Google Stitch",
      "transport": "stdio",
      "url": null,
      "status": "connected",
      "connected_at": "2026-03-20T22:00:00.000Z",
      "last_updated": "2026-03-20T22:00:00.000Z"
    }
  }
}
```

Note: `url` is `null` for stdio servers (copied from APPROVED_SERVERS). The `extraFields` spread adds any service-specific metadata. For Stitch, no extra fields are needed (unlike GitHub which adds `repo`, Linear which adds `teamId`/`teamName`).

---

### Area 5: Graceful Degradation Patterns

#### What "Fallback to Claude HTML/CSS Generation" Means Concretely

The existing wireframe workflow (`workflows/wireframe.md`) generates HTML/CSS entirely via Claude — no external service calls. This is the baseline that Phase 66 extends with `--use-stitch`.

The fallback means: **when Stitch MCP is unavailable or quota is exhausted, skip the Stitch generation step and proceed with the standard `workflows/wireframe.md` generation path**. The output is identical in structure (WFR-*.html files in .planning/design/ux/wireframes/) but generated by Claude instead of Stitch.

For Stitch-specific artifacts (`STH-*.html` files) that only exist when Stitch is used, the fallback produces standard `WFR-*.html` files instead. The `hasStitchWireframes` flag in `designCoverage` remains `false`.

#### How Existing PDE Wireframe/Mockup Skills Generate Without Stitch

The existing wireframe.md workflow:
1. Reads design tokens from `assets/tokens.css`
2. Reads screen inventory from FLW-screen-inventory.json
3. Generates complete self-contained HTML/CSS per screen using Claude's code generation
4. Applies fidelity rules (lofi/midfi/hifi) to determine content type and styling
5. Writes WFR-{slug}.html files to .planning/design/ux/wireframes/
6. Updates design manifest and DESIGN-STATE.md

This is entirely Claude-generated — no MCP tools needed (except optional Sequential Thinking MCP for composition reasoning, which is also degradable).

**The Claude HTML/CSS fallback IS the current production wireframe path.** Phase 66 adds Stitch as an optional enhancement via `--use-stitch`. Degradation = not using that flag.

#### User Messaging Pattern for Degradation (from sync-pencil.md)

The Pencil sync workflow shows the exact degradation messaging pattern:

```
Pencil is not connected. Run /pde:connect pencil to set up the Pencil VS Code extension,
then run /pde:connect pencil --confirm to record the connection.
Token push skipped — no changes made to Pencil canvas.
```

For Stitch quota exhaustion, the equivalent pattern should be:

```
Stitch Standard quota exhausted (350/350 used). Generating wireframes with Claude HTML/CSS instead.
Run /pde:progress to see quota status and reset date.
```

For Stitch unavailable (MCP probe failed):

```
Stitch MCP server is not responding (probe timed out). Generating wireframes with Claude HTML/CSS instead.
To reconnect: run /pde:connect stitch and verify the STITCH_API_KEY environment variable is set.
```

**Key principle from existing patterns:** The message must be (1) informative about what happened, (2) tell the user what they'll get instead, and (3) tell them how to fix it. The workflow does NOT halt — it continues with the fallback.

#### Fallback — Transparent vs Explicit

Based on existing PDE patterns (Pencil, Figma):
- **Be explicit to the user** when falling back — display a WARNING message before continuing
- **Be transparent in artifacts** — the design manifest `source` field distinguishes Stitch (`"source": "stitch"`) from Claude (`"source": "claude"`) artifacts; downstream skills (critique, handoff) use this to apply different evaluation modes
- **Never silently degrade** — silent fallback hides information the user needs to understand why artifacts look different

#### State Preservation During Fallback

For quota exhaustion fallback:
- Quota counter state in config.json is preserved as-is (counter at limit)
- No cleanup needed — the generation simply did not happen
- The wireframe output directory still gets written (with Claude-generated files, not Stitch files)
- `hasStitchWireframes` stays `false`; `hasWireframes` is set to `true` by the Claude path

For MCP probe failure fallback:
- mcp-connections.json `status` remains `connected` (probe failure ≠ disconnection; user should re-run /pde:connect to explicitly disconnect)
- No state changes needed

#### How Pencil Handles Degradation Today (Reference Implementation)

From `workflows/sync-pencil.md` Step 0 and Step 1:

```
Step 0: Load connection status
  - If status !== 'connected': display message + stop. Do NOT crash.

Step 1: Probe Pencil MCP Availability
  - call mcp-bridge.probe('pencil')
  - if probe returns status: 'not_configured': display "degraded mode" message + stop
  - if probe returns status: 'probe_deferred': continue (normal path — probe deferred to Claude Code runtime)
```

The actual probe happens at the workflow level: the workflow calls `mcp__pencil__get_variables` (the probeTool). If that fails, the workflow reports degraded mode and does not proceed.

**Pattern for Stitch:** Phase 66 wireframe-stitch workflow will:
1. Check quota via `checkStitchQuota('standard')` — if `quota_exhausted`, fallback immediately
2. Call `mcp__stitch__list_projects` as a liveness probe with `probeTimeoutMs: 15000`
3. If probe fails: fallback with user message
4. If probe succeeds: proceed with Stitch generation
5. If generation returns `RESOURCE_EXHAUSTED` error: set counter to limit, fallback with message

This is a **quota check → probe check → generation → error check** pipeline, consistent with the defense-in-depth pattern PDE uses for all external service calls.

---

## Deep Dive Confidence Updates

The deep dive changes these confidence levels from the original research:

| Area | Was | Now | Reason |
|------|-----|-----|--------|
| Tool names (Kargatharaakash 9 tools) | MEDIUM | MEDIUM (unchanged) | Two implementations confirmed; discrepancy persists; MCP-05 gate still required |
| `fetch_screen_code` as official name | MEDIUM | MEDIUM-HIGH | Three sources agree (Kargatharaakash, gemini-cli-extensions, stitch-sdk); davideast `get_screen_code` is confirmed wrapper |
| modelId parameter for Standard/Experimental | LOW (inferred) | MEDIUM | stitch-sdk README shows GEMINI_3_FLASH and GEMINI_3_PRO as explicit model IDs |
| Quota error response format | LOW | MEDIUM | Google Cloud RESOURCE_EXHAUSTED pattern is confirmed standard; specific Stitch message text not verified |
| stdio startup time | LOW | MEDIUM | Claude Code MCP docs confirm ~1.2s average for warm cache; 60s timeout cap confirmed |
| stdio process lifecycle | LOW | HIGH | Multiple Claude Code GitHub issues document exact behavior (orphaned processes, reconnect failures, indefinite hang on missing API key) |
| mcp-bridge.cjs architecture | INFERRED | HIGH | File read directly; all schemas, functions, and patterns documented from source |
| connect.md workflow | INFERRED | HIGH | File read directly; step numbering, extraFields pattern, service dispatch pattern all documented from source |
| Fallback pattern | INFERRED | HIGH | sync-pencil.md read directly; exact degradation messaging and state preservation pattern documented from source |
| `env` field in ~/.claude.json | NOT KNOWN | HIGH | Standard MCP client configuration format confirmed by MCP official docs and multiple integration guides |
| `claude mcp test` command | NOT KNOWN | MEDIUM | SFEIR Institute docs reference v1.0.33 changelog; independently useful for MCP-05 verification |

## Deep Dive Sources Added

### Primary (HIGH confidence)
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/connect.md` — Complete connect workflow step-by-step; Step 3.5-3.9 patterns for service-specific auth capture; Step 4 updateConnectionStatus call patterns
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/sync-pencil.md` — Pencil stdio degradation pattern; Step 0 connection check; Step 1 probe pattern; fallback messaging format
- `/Users/greyaltaer/code/projects/Platform Development Engine/workflows/wireframe.md` — Full Claude HTML/CSS wireframe generation path; proves fallback = existing production path
- `github.com/anthropics/claude-code/issues/35287` — stdio servers hang indefinitely when child process fails to initialize (confirmed)
- `github.com/anthropics/claude-code/issues/16837` — MCP_TIMEOUT hard cap at 60s (confirmed)
- `github.com/anthropics/claude-code/issues/1935` — Orphaned MCP processes on Claude Code exit (confirmed)
- `gofastmcp.com/integrations/mcp-json-configuration` — env field in MCP server config format (confirmed)

### Secondary (MEDIUM confidence)
- `github.com/davideast/stitch-mcp` README (fetched) — 3 virtual tools with schemas (build_site, get_screen_code, get_screen_image) confirmed; upstream tool forwarding confirmed; `npx @_davideast/stitch-mcp tool` discovery command confirmed
- `github.com/Kargatharaakash/stitch-mcp` README (fetched) — 9 official upstream tool names confirmed; uses GOOGLE_CLOUD_PROJECT (ADC), not STITCH_API_KEY
- `github.com/google-labs-code/stitch-sdk` README (fetched) — GEMINI_3_PRO and GEMINI_3_FLASH model IDs confirmed
- `docs.cloud.google.com/docs/quotas/troubleshoot` — RESOURCE_EXHAUSTED / HTTP 429 error format for Google Cloud quota errors
- `institute.sfeir.com/en/claude-code/claude-code-mcp-model-context-protocol/` — stdio average startup 1.2s; `claude mcp test` command in v1.0.33
