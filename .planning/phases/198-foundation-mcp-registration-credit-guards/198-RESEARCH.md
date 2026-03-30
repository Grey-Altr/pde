# Phase 198: Foundation -- MCP Registration + Credit Guards - Research

**Researched:** 2026-03-30
**Domain:** MCP bridge infrastructure, credit guard system, Firecrawl server registration
**Confidence:** HIGH

## Summary

Phase 198 registers Firecrawl as the eighth APPROVED_SERVER in mcp-bridge.cjs, adds 12 TOOL_MAP entries for all Firecrawl MCP tools, implements a credit guard system modeled on the existing Stitch quota infrastructure (Phase 65), and wires credit visibility into the tmux dashboard and session summary. The graceful degradation contract ensures workflows fall back to WebSearch/WebFetch when Firecrawl is unavailable or credits are exhausted.

The codebase already has a proven pattern for exactly this work. Phase 65 added Stitch quota management with `readStitchQuota`, `incrementStitchQuota`, and `checkStitchQuota` functions in mcp-bridge.cjs. Phase 198 mirrors this pattern for Firecrawl with the key difference that Firecrawl credits are tracked via the Firecrawl REST API (`GET /v2/team/credit-usage`) rather than purely local counters, since Firecrawl's billing is centralized and consumed across all API clients.

The FIRECRAWL_API_KEY must live in `process.env` (loaded from `.env` or shell profile), never in `config.json` which is version-controlled. This follows the same pattern as `BRAVE_API_KEY` and `STITCH_API_KEY`.

**Primary recommendation:** Mirror the Phase 65 Stitch quota pattern exactly for credit guard functions. Add Firecrawl to APPROVED_SERVERS with HTTP transport using the `https://mcp.firecrawl.dev/{key}/v2/mcp` URL pattern. The probe tool is `mcp__firecrawl__search` with `{query: "test", limit: 1}` (lightest read-only tool, 0.2 credits). Wire credit balance display into existing event bus NDJSON stream for tmux dashboard consumption.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None explicitly locked -- this is an auto-generated infrastructure phase with all decisions at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion -- pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md:
- Foundation before everything -- credit guards and TOOL_MAP must exist before any workflow calls a Firecrawl endpoint
- Concurrent worktree rate limiting -- at Standard plan (50 crawl RPM), 20 parallel agents could exhaust rate limit in seconds; must include max-2-parallel Firecrawl operations guard wired into concurrent-queue.cjs
- API key in .env only -- never in config.json (version-controlled)

### Deferred Ideas (OUT OF SCOPE)
None -- infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | User can register Firecrawl as an approved MCP server in mcp-bridge.cjs with TOOL_MAP entries for all supported tools | APPROVED_SERVERS entry pattern documented (lines 28-121 of mcp-bridge.cjs); 12 TOOL_MAP canonical entries mapped below |
| FND-02 | User can configure Firecrawl API key via PDE config.json with probe/degrade contract validating connectivity on first use | Note: REQUIREMENTS.md says "config.json" but ROADMAP/STATE.md say ".env only, never config.json". Follow ROADMAP -- key in process.env, probe pattern from mcp-integration.md |
| FND-03 | User can view remaining Firecrawl credits in the tmux dashboard and session summaries, with 80% depletion warning | Credit balance via REST API `GET /v2/team/credit-usage`; display pattern from Stitch quota in wireframe.md/mockup.md; tmux dashboard via NDJSON event bus |
| FND-04 | User experiences graceful degradation when Firecrawl credits are exhausted or API is unreachable, falling back to WebSearch/WebFetch | Probe/degrade contract from mcp-integration.md (FIRECRAWL_AVAILABLE flag pattern); fallback pattern identical to existing MCP degradation |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firecrawl-mcp` (HTTP endpoint) | v2 API | MCP server exposing 12 Firecrawl tools to Claude Code | Official hosted endpoint at `https://mcp.firecrawl.dev/{key}/v2/mcp`; HTTP transport like GitHub/Linear/Figma |
| `mcp-bridge.cjs` (existing) | n/a | APPROVED_SERVERS registry, TOOL_MAP, probe/degrade, credit guards | Central MCP coordination layer -- all changes go here |
| `event-bus.cjs` (existing) | n/a | NDJSON event emission for tmux dashboard | Existing infrastructure for dashboard event streaming |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node built-in `https` | built-in | REST API call to `api.firecrawl.dev/v2/team/credit-usage` for credit balance | Credit check function in mcp-bridge.cjs |
| Node built-in `fs` | built-in | Config.json read/write for local credit tracking cache | Mirror Stitch quota persistence pattern |

**Installation:**
No npm install required. Firecrawl MCP is registered via:
```bash
claude mcp add firecrawl --transport http --url "https://mcp.firecrawl.dev/${FIRECRAWL_API_KEY}/v2/mcp"
```

Or via npx (local transport):
```bash
claude mcp add firecrawl -e FIRECRAWL_API_KEY=your-api-key -- npx -y firecrawl-mcp
```

## Architecture Patterns

### Recommended File Structure (changes only)

```
bin/lib/
  mcp-bridge.cjs          # MODIFIED: +firecrawl APPROVED_SERVERS, +12 TOOL_MAP, +credit guard functions
references/
  mcp-integration.md       # MODIFIED: +Firecrawl section (probe/use/degrade)
workflows/
  connect.md               # MODIFIED: +firecrawl in approved services list
tests/
  phase-198/
    mcp-bridge-firecrawl.test.mjs   # NEW: TOOL_MAP entries, APPROVED_SERVERS, probe, credit guards
    firecrawl-credit-guard.test.mjs # NEW: quota read/check/increment functions
```

### Pattern 1: APPROVED_SERVERS Entry

**What:** Register Firecrawl as the eighth approved MCP server
**When to use:** One-time registration in mcp-bridge.cjs

```javascript
// Source: existing pattern from mcp-bridge.cjs lines 28-121
firecrawl: {
  displayName: 'Firecrawl',
  transport: 'http',
  url: null,  // Dynamic — constructed from FIRECRAWL_API_KEY at probe time
  installCmd: null,  // Multi-step: env var + claude mcp add — see AUTH_INSTRUCTIONS
  probeTimeoutMs: 15000,
  probeTool: 'mcp__firecrawl__search',  // Lightest read-only tool (2 credits/10 results)
  probeArgs: { query: 'test', limit: 1 },
},
```

**Key design decision:** The `url` field is `null` because the URL embeds the API key (`https://mcp.firecrawl.dev/{key}/v2/mcp`). Unlike GitHub/Linear/Figma which use OAuth, Firecrawl uses a key-in-URL pattern. The URL should never be stored in version-controlled files.

### Pattern 2: TOOL_MAP Canonical Entries (12 tools)

**What:** Map PDE canonical names to raw MCP tool names
**Source:** Firecrawl MCP server official tool names from docs.firecrawl.dev/mcp-server

```javascript
// 12 Firecrawl TOOL_MAP entries
'firecrawl:probe':              'mcp__firecrawl__search',               // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:scrape':             'mcp__firecrawl__scrape',               // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:search':             'mcp__firecrawl__search',               // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:map':                'mcp__firecrawl__map',                  // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:crawl':              'mcp__firecrawl__crawl',                // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:check-crawl-status': 'mcp__firecrawl__check_crawl_status',   // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:extract':            'mcp__firecrawl__extract',              // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:agent':              'mcp__firecrawl__agent',                // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:agent-status':       'mcp__firecrawl__agent_status',         // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:interact':           'mcp__firecrawl__interact',             // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:browser-create':     'mcp__firecrawl__browser_create',       // TOOL_MAP_VERIFY_REQUIRED
'firecrawl:browser-delete':     'mcp__firecrawl__browser_delete',       // TOOL_MAP_VERIFY_REQUIRED
```

**Important:** Raw MCP tool names for Firecrawl follow the `mcp__firecrawl__*` prefix pattern (not the longer `mcp__plugin_*__` prefix that Playwright uses). This needs verification against a live MCP server probe -- mark all entries TOOL_MAP_VERIFY_REQUIRED.

**TOOL_MAP count after Phase 198:** 57 (existing) + 12 (Firecrawl) = 69 total entries.

### Pattern 3: Credit Guard Functions (mirror Stitch quota)

**What:** Three functions for Firecrawl credit management
**Source:** Existing `readStitchQuota`, `incrementStitchQuota`, `checkStitchQuota` in mcp-bridge.cjs (lines 569-675)

The Firecrawl credit guard differs from Stitch in one critical way: Stitch tracks usage locally (PDE is the only consumer), while Firecrawl credits are consumed by any API client sharing the same API key. Therefore:

1. **`checkFirecrawlCredits(configPath)`** -- Calls `GET https://api.firecrawl.dev/v2/team/credit-usage` with Bearer token, returns `{allowed, remaining, total, reason, pct}`. Caches result for 5 minutes to avoid hammering the API. Falls back to local estimate if API unreachable.
2. **`incrementFirecrawlUsage(credits, configPath)`** -- Updates local credit tracking in config.json (for offline estimation). Does NOT call the API -- the API auto-tracks.
3. **`readFirecrawlCredits(configPath)`** -- Reads cached credit data from config.json. Used by dashboard display when fresh API call is not warranted.

Config.json structure:
```json
{
  "quota": {
    "firecrawl": {
      "remaining": 98500,
      "total": 100000,
      "last_checked": "2026-03-30T20:00:00Z",
      "cache_ttl_ms": 300000,
      "warning_threshold_pct": 80
    }
  }
}
```

### Pattern 4: Probe/Degrade Contract

**What:** FIRECRAWL_AVAILABLE flag set before any workflow body executes
**Source:** mcp-integration.md probe/use/degrade pattern (lines 596-630)

```
Before workflow body:
1. Check if --no-firecrawl flag is present -> skip probe
2. Check if FIRECRAWL_API_KEY is in environment -> if not, FIRECRAWL_AVAILABLE = false
3. Call mcp__firecrawl__search with { query: "test", limit: 1 }
   - Success: FIRECRAWL_AVAILABLE = true
   - Failure/timeout: FIRECRAWL_AVAILABLE = false
4. If FIRECRAWL_AVAILABLE = true, check credits:
   - checkFirecrawlCredits() -> quota_exhausted: FIRECRAWL_AVAILABLE = false (degrade)
   - checkFirecrawlCredits() -> quota_warning: FIRECRAWL_AVAILABLE = true (warn user)
   - checkFirecrawlCredits() -> ok: FIRECRAWL_AVAILABLE = true

When FIRECRAWL_AVAILABLE = false:
  - All firecrawl:* tool calls replaced with WebSearch/WebFetch equivalents
  - No user prompt required -- silent fallback
  - Source tags indicate "[Baseline mode -- Firecrawl unavailable, using WebSearch/WebFetch]"
```

### Pattern 5: Concurrency Guard

**What:** Max-2-parallel Firecrawl operations across worktrees
**Source:** STATE.md blocker: "at Standard plan (50 crawl RPM), 20 parallel agents could exhaust rate limit in seconds"

The Firecrawl Standard plan rate limits:
| Endpoint | RPM |
|----------|-----|
| /scrape | 500 |
| /map | 500 |
| /crawl | 50 |
| /search | 250 |
| /agent | 500 |

The bottleneck is /crawl at 50 RPM. With 20 parallel agents, even scrape operations (500 RPM) could saturate. The guard should:

1. Use a filesystem-based semaphore (lockfile in `/tmp/pde-firecrawl-semaphore/`) -- mirrors the approach for cross-process coordination
2. Max 2 concurrent Firecrawl operations (configurable via config key)
3. Waiting agents queue and retry after a short delay
4. Guard applies to all `firecrawl:*` tool calls, not just crawl

Config key: `dispatch.firecrawl_max_concurrent` (default: 2)

Note: STATE.md says "wired into concurrent-queue.cjs" but no such file exists in the codebase. The concurrency guard must be implemented fresh, likely as a new function in mcp-bridge.cjs or a new utility file.

### Pattern 6: Auth Instructions

**What:** User-facing setup instructions for Firecrawl MCP
**Source:** AUTH_INSTRUCTIONS pattern in mcp-bridge.cjs (lines 332-387)

```javascript
firecrawl: [
  '1. Get your API key from https://www.firecrawl.dev/app/api-keys',
  '2. Add export FIRECRAWL_API_KEY="fc-your-api-key" to your shell profile (~/.zshrc or ~/.bashrc)',
  '3. Restart your terminal or run: source ~/.zshrc',
  '4. Register Firecrawl MCP server: claude mcp add firecrawl -e FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY -- npx -y firecrawl-mcp',
  '5. Verify Firecrawl appears in Claude Code MCP list: run /mcp in Claude Code',
  '6. Return here and run /pde:connect firecrawl --confirm',
],
```

### Anti-Patterns to Avoid

- **Storing API key in config.json:** Config.json is version-controlled. API keys go in `.env` or shell profile only. Credit balance data (non-secret) can be cached in config.json.
- **Calling Firecrawl credit API on every tool invocation:** Cache for 5 minutes. The credit check is an HTTP round-trip that adds latency.
- **Building custom rate limiting from scratch:** Use simple filesystem semaphore. Do not build a full queue system -- agents wait briefly and retry.
- **Probing with firecrawl_scrape:** Costs 1 credit per probe. Use firecrawl_search with limit:1 (costs fraction of a credit and is read-only).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quota tracking | Custom usage database | `checkFirecrawlCredits()` calling Firecrawl REST API + local cache in config.json | Firecrawl tracks centrally; local-only counter drifts when API key is shared |
| MCP tool name mapping | Hard-coded tool names in workflows | TOOL_MAP canonical entries in mcp-bridge.cjs | Single source of truth; tool names may change between Firecrawl versions |
| Rate limiting | Full queue system with backpressure | Filesystem semaphore with max-2-concurrent | Simple enough for PDE's use case; complex queue systems are overkill |
| Credit display | Custom dashboard pane | NDJSON event on event bus, consumed by existing pane-token-meter.sh or pane-log-stream.sh | Reuse existing event infrastructure |

## Common Pitfalls

### Pitfall 1: MCP Tool Name Prefix Mismatch
**What goes wrong:** Playwright uses `mcp__plugin_playwright_playwright__*` (with plugin prefix), not `mcp__playwright__*`. Firecrawl may also have a different prefix than expected.
**Why it happens:** Claude Code assigns MCP tool name prefixes based on how the server is registered (name in `claude mcp add` command).
**How to avoid:** Mark all entries TOOL_MAP_VERIFY_REQUIRED. The executor must probe the live server and update prefixes if they differ from `mcp__firecrawl__*`.
**Warning signs:** "No such tool available" errors when calling Firecrawl tools.

### Pitfall 2: API Key in URL Leaking to Git
**What goes wrong:** The Firecrawl HTTP MCP URL is `https://mcp.firecrawl.dev/{API_KEY}/v2/mcp` -- if this URL is logged or stored in config.json, the API key leaks.
**Why it happens:** Other HTTP MCP servers (GitHub, Linear) have static URLs with separate OAuth. Firecrawl embeds the key.
**How to avoid:** Never store the URL with key in any version-controlled file. Construct URL dynamically from `process.env.FIRECRAWL_API_KEY`. Use npx transport alternative to avoid URL-embedded key entirely.
**Warning signs:** `config.json`, `mcp-connections.json`, or logs containing `mcp.firecrawl.dev/fc-` strings.

### Pitfall 3: Credit Check Blocks Workflow Startup
**What goes wrong:** Calling the credit API synchronously during probe adds 500ms-2s to every workflow start.
**Why it happens:** HTTP round-trip to api.firecrawl.dev.
**How to avoid:** Probe the MCP server (which validates the key). Check credits asynchronously or use cached value from last check. Only do a fresh credit API call if cache is older than 5 minutes.
**Warning signs:** Workflow startup noticeably slower after Firecrawl integration.

### Pitfall 4: Concurrent Config.json Writes Corrupt Quota Data
**What goes wrong:** Two parallel agents both read config.json, increment credit usage, and write back -- one write overwrites the other.
**Why it happens:** The Stitch quota pattern uses synchronous read-modify-write with no locking.
**How to avoid:** For Firecrawl, the primary credit source is the REST API (authoritative), not the local counter. Local counter is advisory only. This is already safer than Stitch's pure-local model. Still, use atomic write pattern (write to temp file, rename).
**Warning signs:** Credit counters that seem to "reset" or "jump" unexpectedly.

### Pitfall 5: Forgetting the --no-firecrawl Flag
**What goes wrong:** No way to disable Firecrawl probes for offline work or debugging.
**Why it happens:** Existing `--no-{name}` flags are documented in mcp-integration.md but the new server needs explicit addition.
**How to avoid:** Add `--no-firecrawl` to the flag table in mcp-integration.md.
**Warning signs:** Workflow hangs or errors when Firecrawl is intentionally disabled.

## Code Examples

### Credit Check Function (verified pattern from Stitch quota)

```javascript
// Source: mcp-bridge.cjs checkStitchQuota pattern (lines 655-675)
// Adapted for Firecrawl with REST API call + cache

function checkFirecrawlCredits(configPath) {
  const cfgPath = configPath || path.join(process.cwd(), '.planning', 'config.json');
  let config = {};
  try { config = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch { /* missing */ }

  const cached = config?.quota?.firecrawl;
  if (!cached) return { allowed: true, remaining: null, reason: 'no_quota_configured' };

  const remaining = cached.remaining;
  const total = cached.total || 100000;
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, reason: 'quota_exhausted' };
  }

  const pct = ((total - remaining) / total) * 100;
  if (pct >= 80) {
    return { allowed: true, remaining, reason: 'quota_warning', pct: Math.round(pct) };
  }

  return { allowed: true, remaining, reason: 'ok' };
}
```

### Probe Pattern in Workflow (verified from wireframe.md)

```javascript
// Source: wireframe.md lines 786-797 (Stitch quota check pattern)
// Adapted for Firecrawl

node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { checkFirecrawlCredits } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = checkFirecrawlCredits();
process.stdout.write(JSON.stringify(result));
EOF
```

### NDJSON Event for Credit Balance (verified from event-bus.cjs pattern)

```javascript
// Source: event-bus.cjs dispatch pattern (lines 67-80)
bus.dispatch('firecrawl_credit_check', {
  remaining: 85000,
  total: 100000,
  pct_used: 15,
  warning: false,
  source: 'api',  // or 'cache'
});
```

## Firecrawl API Reference

### Credit Usage Endpoint (HIGH confidence -- official docs)

```bash
GET https://api.firecrawl.dev/v2/team/credit-usage
Authorization: Bearer fc-your-api-key

Response: {
  "success": true,
  "data": {
    "remainingCredits": 98500,
    "planCredits": 100000,
    "billingPeriodStart": "2026-03-01T00:00:00Z",
    "billingPeriodEnd": "2026-04-01T00:00:00Z"
  }
}
```

### Credit Costs Per Operation

| Operation | Credits | Notes |
|-----------|---------|-------|
| Scrape | 1/page | +4 for JSON extraction, +4 for enhanced mode |
| Crawl | 1/page | Per page crawled |
| Map | 1/call | Returns URL list |
| Search | 2/10 results | 0.2 credits per result |
| Extract | 5/page | LLM-powered structured extraction |
| Browser | 2/minute | Per active browser session |
| Agent | variable | 5 free daily runs; variable credits after |

### Rate Limits (Standard Plan)

| Endpoint | RPM |
|----------|-----|
| /scrape | 500 |
| /map | 500 |
| /crawl | 50 |
| /search | 250 |
| /agent | 500 |
| /crawl/status | 1500 |
| /agent/status | 25000 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `firecrawl_browser_create/execute/delete` | `firecrawl_interact` (single tool) | Late 2025 | Simpler browser interaction -- no session management |
| Key-in-URL HTTP MCP | npx local transport OR key-in-URL HTTP | Current | Both options available; npx avoids URL-embedded key |
| No credit API | `GET /v2/team/credit-usage` | Current | Enables real-time credit monitoring |

**Deprecated/outdated:**
- `firecrawl_browser` (raw CDP): Replaced by `firecrawl_interact`. Keep `browser-create` and `browser-delete` in TOOL_MAP for completeness but mark as deprecated in comments.

## Open Questions

1. **Exact MCP tool name prefix**
   - What we know: Official docs show `firecrawl_scrape`, `firecrawl_search`, etc. Claude Code MCP tools typically have `mcp__` prefix.
   - What's unclear: Whether the prefix is `mcp__firecrawl__*` or includes a plugin namespace like `mcp__plugin_firecrawl__*` (as Playwright does).
   - Recommendation: Mark all entries TOOL_MAP_VERIFY_REQUIRED. Verify during execution by probing the live server. The executor should update prefixes if they differ.

2. **HTTP vs npx transport for MCP server**
   - What we know: HTTP endpoint `https://mcp.firecrawl.dev/{key}/v2/mcp` requires no local npx process. npx transport `npx -y firecrawl-mcp` requires local Node process.
   - What's unclear: Whether the HTTP endpoint works reliably with Claude Code (GitHub/Linear/Figma all use HTTP successfully).
   - Recommendation: Default to npx transport (matches Stitch pattern, avoids key-in-URL), with HTTP as documented alternative in AUTH_INSTRUCTIONS.

3. **concurrent-queue.cjs does not exist**
   - What we know: STATE.md references "wired into concurrent-queue.cjs" but no such file exists in the codebase.
   - What's unclear: Whether this was a planned module name or a reference to a different pattern.
   - Recommendation: Implement the concurrency guard as new functions in mcp-bridge.cjs (or a new `firecrawl-guard.cjs` utility). Use filesystem semaphore pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in) |
| Config file | none -- node:test uses no config file |
| Quick run command | `node --test tests/phase-198/*.test.mjs` |
| Full suite command | `node --test tests/phase-198/*.test.mjs tests/phase-40/mcp-bridge-toolmap.test.mjs tests/phase-108/mcp-bridge-playwright.test.mjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | APPROVED_SERVERS.firecrawl exists with correct fields; 12 TOOL_MAP entries; call() resolves; probe() returns probe_deferred | unit | `node --test tests/phase-198/mcp-bridge-firecrawl.test.mjs` | Wave 0 |
| FND-02 | AUTH_INSTRUCTIONS.firecrawl exists; no API key in config.json; env var detection | unit | `node --test tests/phase-198/mcp-bridge-firecrawl.test.mjs` | Wave 0 |
| FND-03 | checkFirecrawlCredits returns ok/warning/exhausted; readFirecrawlCredits reads cache; 80% threshold | unit | `node --test tests/phase-198/firecrawl-credit-guard.test.mjs` | Wave 0 |
| FND-04 | checkFirecrawlCredits returns quota_exhausted with allowed:false; no_quota_configured returns allowed:true | unit | `node --test tests/phase-198/firecrawl-credit-guard.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-198/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-198/*.test.mjs tests/phase-40/mcp-bridge-toolmap.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-198/mcp-bridge-firecrawl.test.mjs` -- covers FND-01, FND-02
- [ ] `tests/phase-198/firecrawl-credit-guard.test.mjs` -- covers FND-03, FND-04
- [ ] Update `tests/phase-40/mcp-bridge-toolmap.test.mjs` -- TOOL_MAP count from 57 to 69
- [ ] Update `tests/phase-108/mcp-bridge-playwright.test.mjs` -- APPROVED_SERVERS count from 7+pde_remote to include firecrawl

## Sources

### Primary (HIGH confidence)
- Firecrawl official docs: https://docs.firecrawl.dev/mcp-server -- tool list, installation
- Firecrawl billing docs: https://docs.firecrawl.dev/billing -- credit costs per operation
- Firecrawl rate limits: https://docs.firecrawl.dev/rate-limits -- RPM per endpoint per plan
- Firecrawl credit API: https://docs.firecrawl.dev/api-reference/endpoint/credit-usage -- REST endpoint for balance check
- Codebase: `bin/lib/mcp-bridge.cjs` -- existing APPROVED_SERVERS, TOOL_MAP, Stitch quota pattern
- Codebase: `tests/phase-65/quota-counter.test.mjs` -- Stitch quota test pattern (exact template for Firecrawl)
- Codebase: `references/mcp-integration.md` -- probe/use/degrade contract

### Secondary (MEDIUM confidence)
- GitHub firecrawl/firecrawl-mcp-server README -- tool names and parameters
- Codebase: `.planning/research/ARCHITECTURE.md` -- project-level research already completed

### Tertiary (LOW confidence)
- Exact MCP tool name prefix (`mcp__firecrawl__*` vs `mcp__plugin_firecrawl__*`) -- needs live verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Firecrawl MCP is well-documented; PDE patterns are proven
- Architecture: HIGH -- directly mirrors Phase 65 Stitch quota + Phase 108 Playwright registration
- Pitfalls: HIGH -- API key leakage, concurrent writes, rate limits are well-understood concerns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable infrastructure patterns, Firecrawl API unlikely to break)
