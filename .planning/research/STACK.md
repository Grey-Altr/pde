# Stack Research

**Domain:** Firecrawl CLI/MCP integration into PDE plugin architecture
**Researched:** 2026-03-30
**Confidence:** HIGH

## Scope

This file covers ONLY what is new for the Firecrawl integration milestone. Existing PDE stack (MCP bridge, Playwright MCP, WebSearch/WebFetch, Context7, research agents, CLI ingestion pipeline) is validated and out of scope.

---

## Recommended Stack

### Core Technologies — New Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `firecrawl-mcp` | 3.11.0 | MCP server exposing 12 Firecrawl tools to Claude Code | Hosted HTTP endpoint `https://mcp.firecrawl.dev/{key}/v2/mcp` means zero npx-spawn complexity at runtime; follows same pattern as GitHub/Linear/Figma (HTTP transport). Official package from firecrawl org. |
| `firecrawl-cli` | 1.12.2 | npx-invokable CLI for scrape/search/crawl/map/browser/agent from workflow scripts | Needed for non-MCP invocations: fire-and-forget crawl jobs, structured JSON output to filesystem, agent jobs with `--schema-file` and `--max-credits` guard. |
| `FIRECRAWL_API_KEY` env var | n/a | Auth token for both firecrawl-mcp HTTP URL and firecrawl-cli | Both packages read this env var; single credential surface. Stored at `~/Library/Application Support/firecrawl-cli/credentials.json` (0600 permissions) after `firecrawl login --api-key`. |

### Supporting Libraries — No New npm Root Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node built-in `child_process.spawnSync` | built-in | CLI invocation from .cjs workflow scripts | Already used by `app-cli-wrap.cjs` and `bin/pde-tools.cjs`. Use for synchronous scrape/search calls where output is needed inline. |
| Node built-in `child_process.spawn` (async) | built-in | Async crawl/agent job dispatch | Use for long-running crawl and agent jobs (`--wait` flag or poll pattern). Follows coordinator.cjs spawn model. |

CRITICAL: PDE has a zero-npm-deps-at-root constraint. `firecrawl-cli` and `firecrawl-mcp` are NOT added to `package.json`. They are invoked via `npx firecrawl-cli@1.12.2` (pinned) from CJS scripts, or registered as an MCP server via `claude mcp add`. No `npm install` of these packages at repo root.

### Development Tools — No Changes

No new dev tooling required. Existing vitest, eslint, and knip configurations cover any new .cjs modules added for firecrawl integration.

---

## Installation

```bash
# DO NOT add to package.json — zero-npm-deps-at-root constraint applies.

# 1. Register firecrawl MCP server (HTTP transport — preferred, no npx spawn at runtime):
claude mcp add firecrawl --url https://mcp.firecrawl.dev/$FIRECRAWL_API_KEY/v2/mcp

# 2. Authenticate CLI for workflow-script invocations:
firecrawl login --api-key fc-YOUR-API-KEY
# Stores to ~/Library/Application Support/firecrawl-cli/credentials.json (macOS)
# Linux: ~/.config/firecrawl-cli/credentials.json
# Windows: %APPDATA%/firecrawl-cli/credentials.json

# 3. Disable telemetry (PDE policy):
export FIRECRAWL_NO_TELEMETRY=1

# 4. Verify setup:
firecrawl --status
# Expected output: auth OK, concurrency 0/100, remaining credits
```

---

## Integration Architecture — Two-Lane Design

### Lane A: MCP Server (mcp-bridge.cjs registration)

Register `firecrawl` as the 10th APPROVED_SERVER in `bin/lib/mcp-bridge.cjs`. This gives Claude Code direct access to all 12 MCP tools during agentic workflow execution.

```
Transport:   HTTP
URL:         https://mcp.firecrawl.dev/{FIRECRAWL_API_KEY}/v2/mcp
Auth:        API key embedded in URL path (Firecrawl hosted MCP convention)
Probe tool:  firecrawl_scrape (lightest single-page tool; no crawl job overhead)
Probe args:  { url: 'https://example.com', formats: ['markdown'], onlyMainContent: true }
Timeout:     15000ms (HTTP roundtrip + JS rendering buffer)
Container:   none (HTTP transport; no Docker fallback needed)
```

MCP tool names (verified from official firecrawl-mcp 3.11.0 docs):
- `mcp__firecrawl__firecrawl_scrape`
- `mcp__firecrawl__firecrawl_search`
- `mcp__firecrawl__firecrawl_crawl`
- `mcp__firecrawl__firecrawl_check_crawl_status`
- `mcp__firecrawl__firecrawl_map`
- `mcp__firecrawl__firecrawl_extract`
- `mcp__firecrawl__firecrawl_agent`
- `mcp__firecrawl__firecrawl_agent_status`
- `mcp__firecrawl__firecrawl_browser_create`
- `mcp__firecrawl__firecrawl_browser_execute`
- `mcp__firecrawl__firecrawl_browser_delete`
- `mcp__firecrawl__firecrawl_browser_list`

AUTH_INSTRUCTIONS block content:
```
'export FIRECRAWL_API_KEY=fc-YOUR-KEY\n' +
'claude mcp add firecrawl --url https://mcp.firecrawl.dev/$FIRECRAWL_API_KEY/v2/mcp'
```

### Lane B: CLI Invocation (workflow scripts via new bin/lib/firecrawl-cli.cjs)

For workflow scripts that need deterministic output written to `.planning/` (competitive analysis enrichment, source material ingestion, crawl-to-filesystem):

```javascript
// Pattern: spawnSync for short-lived scrape/search
const result = spawnSync('npx', ['-y', 'firecrawl-cli@1.12.2', 'scrape', url,
  '--only-main-content', '--json'], {
  encoding: 'utf8', timeout: 30000,
  env: { ...process.env, FIRECRAWL_NO_TELEMETRY: '1' }
});

// Pattern: spawn (async) for crawl jobs — returns job ID, poll separately
const crawlProc = spawn('npx', ['-y', 'firecrawl-cli@1.12.2', 'crawl', url,
  '--wait', '--progress', '--json'], {
  env: { ...process.env, FIRECRAWL_NO_TELEMETRY: '1' }
});
```

Version-pinning (`firecrawl-cli@1.12.2`) ensures reproducibility without lock file in node_modules.

---

## Credit Tracking — Design

| Concern | Approach |
|---------|----------|
| Per-operation cost visibility | `npx firecrawl-cli@1.12.2 credit-usage --json` emits structured JSON; parse in `bin/lib/firecrawl-credits.cjs` |
| Agent job cost cap | Pass `--max-credits <n>` on every `firecrawl agent` invocation; surface via workflow arg |
| Credit balance in dashboard | Add `firecrawl_credits_remaining` to telemetry event schema; display in existing monitoring pane |
| Low-credit warning | Mirror Stitch quota pattern (warn at 80% consumed); store threshold in `.planning/config.json` under `firecrawl.creditWarningThreshold` |
| Extraction surcharge awareness | AI extraction costs 5 credits/page vs 1 credit/page for plain scrape; always prefer `--formats markdown` unless structured extraction is explicitly needed |

---

## Rate Limiting — Awareness Layer

| Plan | /scrape RPM | /search RPM | /crawl RPM | /map RPM | /agent RPM |
|------|------------|------------|-----------|---------|-----------|
| Free | 10 | 5 | 1 | 10 | 10 |
| Hobby | 100 | 50 | 15 | 100 | 100 |
| Standard | 500 | 250 | 50 | 500 | 500 |
| Growth | 5000 | 2500 | 250 | 5000 | 1000 |

PDE workflows must not issue parallel firecrawl calls without a concurrency guard. The existing coordinator.cjs concurrency queue pattern applies. Recommended default: max 3 parallel scrape calls, sequential crawl (/crawl RPM is the tightest limit on all plans).

---

## API Key Storage — PDE Pattern

Firecrawl-cli stores credentials at `~/Library/Application Support/firecrawl-cli/credentials.json` (macOS, 0600 permissions). Fields: `{ "apiKey": "fc-...", "apiUrl": "..." }`.

PDE does NOT read or write this file directly. PDE reads `FIRECRAWL_API_KEY` from process environment (consistent with the MCP HTTP URL interpolation). Users run `firecrawl login --api-key` once during setup; the CLI picks up credentials automatically thereafter.

For the MCP lane, the API key is embedded in the HTTP URL — no separate env injection at MCP invocation time.

DO NOT store `fc-` keys in `.planning/config.json` — version-controlled directory; violates credential hygiene.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `firecrawl-mcp` HTTP transport | `firecrawl-mcp` stdio via `npx -y firecrawl-mcp` | Only if the hosted HTTP endpoint is unavailable. Stdio adds 2–5s cold-start latency per session and requires npx spawn from the MCP runtime. |
| npx-pinned `firecrawl-cli@1.12.2` in CJS scripts | Global install `npm install -g firecrawl-cli` | Only in CI environments where network npx is blocked. Breaks zero-npm-root-deps policy if added to package.json. |
| `firecrawl-mcp` MCP tools for agent-invoked ops | Direct HTTP calls to `api.firecrawl.dev` from PDE scripts | Only if MCP server is unavailable. Bypasses mcp-bridge policy layer and duplicates auth management. |
| Two-lane design (MCP + CLI) | MCP only | Acceptable for simple scrape/search. CLI lane is required for: `--schema-file` structured extraction, crawl job polling with progress, `--max-credits` enforcement, writing output directly to `.planning/` paths. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@mendable/firecrawl-js` as root npm dep | Adds a root npm dependency for no capability beyond what firecrawl-mcp already exposes via MCP tools | firecrawl-mcp MCP tools (Lane A) or firecrawl-cli via npx (Lane B) |
| `firecrawl-mcp` stdio transport as default | Cold-start npx spawn per Claude Code session; API key management requires `-e` flag vs cleaner URL embed | HTTP transport: `claude mcp add firecrawl --url https://mcp.firecrawl.dev/{key}/v2/mcp` |
| Unpinned `npx firecrawl-cli@latest` | Version drift; CLI flag changes will silently break workflow scripts | Pin to `firecrawl-cli@1.12.2`, update deliberately with a changelog review |
| `firecrawl agent` without `--max-credits` | Agent jobs consume credits autonomously; no cap = unbounded spend on a single invocation | Always pass `--max-credits` derived from config or user-provided limit |
| Storing `fc-` key in `.planning/config.json` | Plaintext in version-controlled directory | Process env (`FIRECRAWL_API_KEY`) + `~/Library/Application Support/firecrawl-cli/credentials.json` |
| Adding `firecrawl-cli` or `firecrawl-mcp` to `package.json` | Violates PDE zero-npm-deps-at-root constraint; locks entire project to firecrawl version | npx pinned invocation + `claude mcp add` registration |

---

## Stack Patterns by Variant

**If user is on Free plan (500 credits/month):**
- Restrict crawl depth: `--max-depth 2 --limit 20`
- Disable firecrawl_extract and firecrawl_agent (5 credits/page cost is unviable for free tier)
- Surface credit balance in dashboard; block operations when < 50 credits remain

**If user is on Hobby/Standard plan:**
- Enable full crawl with `--limit 100 --max-depth 3`
- Enable agent with `--max-credits 50` default (configurable per workflow)
- Enable browser sandbox for interactive scraping scenarios

**If self-hosted Firecrawl instance:**
- Set `FIRECRAWL_API_URL=http://localhost:3002` (skips API key requirement in CLI)
- MCP URL changes to `http://localhost:3002/v2/mcp`
- Rate limits are user-managed; remove credit tracking from dashboard

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `firecrawl-mcp@3.11.0` | `@mendable/firecrawl-js@4.17.0` (internal) | firecrawl-mcp bundles firecrawl-js; do not install firecrawl-js separately |
| `firecrawl-cli@1.12.2` | Node.js >= 18 | PDE already requires Node 18+ (vitest 4.x); no conflict |
| `firecrawl-cli@1.12.2` | `commander@^14.0.2`, `@inquirer/prompts@^8.2.1` | Internal to CLI, not exposed to PDE root |
| firecrawl HTTP MCP transport | Claude Code MCP runtime | Claude Code supports HTTP MCP natively; no adapter needed |

---

## Sources

- [Firecrawl CLI documentation](https://docs.firecrawl.dev/sdks/cli) — Full command reference, all flags, auth, telemetry disable — HIGH confidence (official docs, verified 2026-03-30)
- [firecrawl/cli GitHub — package.json](https://github.com/firecrawl/cli/blob/main/package.json) — Version 1.12.2 confirmed, dependencies listed — HIGH confidence
- [firecrawl/cli GitHub — src/utils/credentials.ts](https://github.com/firecrawl/cli) — Config path `~/Library/Application Support/firecrawl-cli/credentials.json`, 0600 permissions, JSON format — HIGH confidence
- [Firecrawl MCP Server documentation](https://docs.firecrawl.dev/mcp-server) — 12 tool names, HTTP endpoint URL pattern, claude mcp add command — HIGH confidence
- [Firecrawl Rate Limits](https://docs.firecrawl.dev/rate-limits) — RPM table by plan and endpoint — HIGH confidence
- `npm show firecrawl-mcp version` — 3.11.0 verified locally — HIGH confidence
- `npm show firecrawl-cli version` — 1.12.2 verified locally — HIGH confidence
- [Firecrawl Pricing](https://www.firecrawl.dev/pricing) — Credit costs per operation (1 scrape, 5 AI extraction) — MEDIUM confidence (pricing subject to change without docs update)

---
*Stack research for: PDE Firecrawl CLI/MCP integration*
*Researched: 2026-03-30*
