# Feature Research

**Domain:** Firecrawl CLI/API deep integration into PDE design & development pipeline
**Researched:** 2026-03-30
**Confidence:** HIGH (sourced from official Firecrawl docs, CLI reference, pricing page, rate limits page)

---

## Context: What Already Exists in PDE

The following are already built and must NOT be re-implemented:

- MCP bridge with 7 approved servers (GitHub, Linear, Jira, Figma, Pencil, Stitch, Playwright)
- Playwright MCP for browser screenshots and visual testing
- Research agents with WebSearch/WebFetch
- Competitive analysis skill (`/pde:competitive`)
- `/pde:source` for source material ingestion
- CLI ingestion pipeline
- Visual AutoResearch with multi-candidate experiments
- Change tracking via visual diff (Playwright-based)

The new milestone adds Firecrawl as an **eighth MCP server** plus CLI-callable capability, replacing or augmenting the WebSearch/WebFetch tools for structured web research tasks.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a Firecrawl integration must have. Missing these makes it feel like a stub.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `firecrawl_scrape` via MCP tool call | Any web integration must be able to fetch a URL and return clean markdown | LOW | 1 credit/page; MCP tool `firecrawl_scrape` with `formats: ["markdown"]` and `onlyMainContent: true` |
| `firecrawl_search` via MCP tool call | Replaces/augments the existing WebSearch tool; must return structured results | LOW | 2 credits/10 results; supports `sources: ["web","news"]`, time filters `tbs: "qdr:d"`, location targeting |
| `firecrawl_map` for site discovery | Competitive analysis and research agents need to enumerate site structure before crawling | LOW | 1 credit/page discovered; returns URL list; use `--search` to filter to relevant paths |
| MCP server registration in allowlist | PDE enforces a security allowlist for MCP servers; Firecrawl must be added like other servers | LOW | `claude mcp add firecrawl --url https://mcp.firecrawl.dev/{API_KEY}/v2/mcp` or npx local |
| API key management via PDE config | Key must flow from PDE's config system; users should not paste it per-command | LOW | `FIRECRAWL_API_KEY` env var; PDE's existing `config.json` should store it with probe/degrade contract |
| Credit usage visibility in dashboard | PDE's tmux dashboard already tracks Stitch quota; Firecrawl credits must appear similarly | MEDIUM | `firecrawl credit-usage --json` CLI call; surface in Pane 7 or session summary |
| Graceful degradation when credits exhausted | Existing MCP pattern: probe → warn at 80% → fallback on failure | LOW | Mirror the Stitch quota pattern already in v0.9 |
| Output saved to `.planning/research/web-cache/` | PDE stores all artifacts in `.planning/`; scraped content must be accessible to downstream workflows | LOW | CLI's `--output` flag or MCP tool writing to gitignored `.planning/research/web-cache/` |

### Differentiators (Competitive Advantage)

Features that meaningfully expand PDE's capabilities beyond what WebSearch/WebFetch provide.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `firecrawl_agent` natural language research | Single prompt produces fully structured JSON from multi-domain research — no URL needed upfront. Replaces manual WebSearch + WebFetch chains in competitive analysis and research skills | MEDIUM | `spark-1-mini` default (60% cheaper); `spark-1-pro` for accuracy-critical tasks; 5 free daily runs; dynamic credit cost (typical: a few hundred credits); `maxCredits` cap required; async — returns job ID, poll for completion |
| `firecrawl_crawl` for deep competitor ingestion | Crawl entire competitor docs sites, knowledge bases, or design systems — not just single pages. Feeds the `/pde:source` pipeline | MEDIUM | 1 credit/page; async job; `--max-depth`, `--limit`, `--include-paths` for scope control; use `firecrawl_check_crawl_status` for polling |
| Browser sandbox for auth-gated content | Cloud Chromium sessions let agents log in, navigate protected pages, and extract content from authenticated portals — impossible with WebFetch | HIGH | 2 credits/browser minute; preview limit of 20 active sessions; `firecrawl_browser_create` + `firecrawl_browser_execute` with Playwright Python/JS or `agent-browser` bash commands; session TTL 30–3600s; profiles for persistent auth state |
| `changeTracking` format on scrape | Detect what changed on a competitor's site since last scrape — feeds PDE's competitive intelligence workflow with semantic diffs, not visual pixel diffs | MEDIUM | Must include `markdown` + `changeTracking` in formats array; `changeStatus` values: "new", "same", "changed", "removed"; git-diff mode free; JSON mode (field-level with LLM) costs 5 credits/page; previous scrape matched on exact URL + team ID |
| Schema-driven structured extraction | `firecrawl_extract` uses LLM to pull structured JSON from unstructured pages — competitor pricing tables, feature lists, team rosters — mapped to PDE's data models | MEDIUM | Supports Zod/Pydantic schemas; `allowExternalLinks` and `enableWebSearch` flags; feeds directly into competitive analysis and opportunity scoring skills |
| `firecrawl_search` with `scrape: true` | Search + immediately scrape top results in one call — compresses the two-step research loop in competitive and brief workflows | LOW | Adds `scrapeOptions` to search call; moderate credit multiplier (2 per 10 results + 1 per page scraped) |
| Parallel agents for batch research | Run hundreds of agent queries simultaneously — useful for portfolio analysis, benchmarking multiple competitors, or multi-market research at once | HIGH | Intelligent waterfall: Spark-1 Fast first (10 credits/cell), upgrades to full agent only when needed; outputs streamed as structured JSON; requires Parallel Agents API access |
| Self-hosted Firecrawl for private content | Point `FIRECRAWL_API_URL` at a local instance to scrape internal docs, staging environments, or Confluence without sending data to Firecrawl cloud | MEDIUM | No API key needed for self-hosted; `--api-url` flag or `FIRECRAWL_API_URL` env var; requires user to run Firecrawl OSS locally |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Replacing Playwright MCP with browser sandbox | "Use one browser tool" — seems simpler | Playwright MCP serves visual testing and screenshot capture for critique/mockup workflows. Browser Sandbox serves auth-gated data extraction. Different jobs — replacing Playwright breaks the existing visual pipeline. | Keep both; route screenshot/visual tasks to Playwright MCP, auth-gated scraping to Firecrawl browser sandbox |
| Firecrawl for every URL fetch | Agents might reach for Firecrawl by default for any web request | 1 credit/page burns the monthly budget quickly; WebFetch is free. Credits deplete silently until the first 429. | Define a routing policy: WebFetch first → Firecrawl when JS rendering needed, structured extraction needed, or auth gating present |
| Unlimited crawl depth on competitor sites | "Get everything" instinct | Depth-unlimited crawl on a large site burns hundreds of credits and hits rate limits (50 crawls/min on Standard). | Set `--max-depth 3` and `--limit 100` as enforced defaults; expose overrides only for explicit power-user invocations |
| Storing all scraped content in git | "Track everything" | Scraped markdown from large crawls is gigabytes of noise; ruins `git diff` for actual code changes | Cache to `.planning/research/web-cache/` (gitignored); commit only extracted summaries, diffs, and structured JSON |
| JSON-mode change tracking on every scrape | "Most accurate diffing" | JSON mode costs 5 credits/page vs 0 extra for git-diff mode; 5x bill multiplier at scale | Default to git-diff mode; offer JSON mode as explicit opt-in only for structured fields where field-level tracking is essential |
| Building a custom scraping scheduler inside PDE | "We need periodic monitoring" | PDE is a design/dev pipeline tool, not a monitoring platform; scheduler complexity is out of scope | Document how to wire Firecrawl `changeTracking` to a GitHub Actions cron or Vercel cron job. Do not build a scheduler in PDE. |

---

## Feature Dependencies

```
[MCP server registration]
    └──required by──> [firecrawl_scrape]
    └──required by──> [firecrawl_search]
    └──required by──> [firecrawl_map]
    └──required by──> [firecrawl_crawl]
    └──required by──> [firecrawl_extract]
    └──required by──> [firecrawl_agent]
    └──required by──> [firecrawl_browser_*]

[API key in PDE config]
    └──required by──> [MCP server registration]
    └──required by──> [CLI commands]

[Credit usage monitoring]
    └──required by──> [graceful degradation on exhaustion]
    └──enhances──> [dashboard visibility (Pane 7)]

[firecrawl_scrape with changeTracking]
    └──requires──> [markdown format included in same call]
    └──enhances──> [competitive analysis skill (diff-aware)]

[firecrawl_map]
    └──informs──> [firecrawl_crawl] (discover URLs before deep crawl)

[firecrawl_agent]
    └──requires──> [async polling pattern] (job ID → poll /agent/status)
    └──enhances──> [research skill, competitive analysis skill]

[firecrawl_browser_create]
    └──required by──> [firecrawl_browser_execute]
    └──required by──> [firecrawl_browser_delete]

[schema definition (Zod/JSON Schema)]
    └──enhances──> [firecrawl_agent] (structured JSON output)
    └──enhances──> [firecrawl_extract] (field-level extraction)

[firecrawl_search with scrape:true]
    └──requires──> [firecrawl_scrape] (internally chains to it)
```

### Dependency Notes

- **MCP server registration required by all tools:** The MCP tool path requires the server in PDE's allowlist before any downstream skill can invoke it. This is Phase 1.
- **`changeTracking` requires `markdown`:** The `markdown` format must always be co-requested with `changeTracking`. The diff algorithm operates on markdown content — omitting `markdown` from the formats array results in a silent response with no diff data.
- **`firecrawl_agent` requires async polling:** The agent endpoint is always asynchronous. Callers must store the job ID and poll `firecrawl_agent_status`. PDE's existing crawl-status polling pattern from v0.24 is directly reusable here.
- **Browser sandbox requires session lifecycle management:** Each `firecrawl_browser_execute` call must reference a live `sessionId` from `firecrawl_browser_create`. Sessions expire by TTL; agents must handle session-not-found (404) errors gracefully and re-create.
- **Credit monitoring enables graceful degradation:** Without credit tracking, the first sign of exhaustion is a failed mid-pipeline request. Credit visibility (mirroring Stitch quota system from v0.9) lets PDE warn at 80% and fall back before a pipeline run fails.

---

## MVP Definition

### Launch With (v1 — Core Integration)

Minimum integration that unlocks net-new value over existing WebSearch/WebFetch.

- [ ] MCP server registered in PDE allowlist with probe/degrade contract — required foundation for all features
- [ ] API key stored in PDE `config.json` with the same pattern as other MCP servers
- [ ] `firecrawl_scrape` available to research and competitive analysis skills — replaces WebFetch for JS-heavy pages
- [ ] `firecrawl_search` as a higher-quality replacement for WebSearch — structured results with time/location filters
- [ ] `firecrawl_map` for pre-crawl site structure discovery
- [ ] Routing policy: WebFetch default → Firecrawl when structured output / JS rendering / auth needed
- [ ] Credit usage surfaced in session summary — prevents surprise bill shock
- [ ] Graceful degradation: warn at 80% credits, fallback to WebSearch/WebFetch at exhaustion
- [ ] Output written to `.planning/research/web-cache/` (gitignored)

### Add After Validation (v1.x)

- [ ] `firecrawl_agent` wired into competitive analysis and research skills — trigger when multi-domain research needed or WebSearch returns insufficient structure. Requires routing policy and `maxCredits` cap.
- [ ] `changeTracking` format on competitor scrapes — trigger: user explicitly requests "what changed since last check". Default to git-diff mode; JSON mode opt-in.
- [ ] `firecrawl_crawl` for deep ingestion — trigger: `/pde:source` with a URL pointing to a doc site or knowledge base larger than 10 pages.
- [ ] `firecrawl_extract` with schema — trigger: competitive analysis skill needs structured competitor data (pricing, feature matrix) in a defined JSON shape.
- [ ] Credit usage in tmux dashboard (Pane 7) — live visibility during long crawl/agent jobs.

### Future Consideration (v2+)

- [ ] Browser sandbox integration — high complexity, preview-stage session limit (20 max), limited daily need. Add when auth-gated competitor portals are a confirmed user request.
- [ ] Parallel agents for batch competitive research — significant infrastructure; defer until single-agent pattern is validated.
- [ ] Self-hosted Firecrawl for private content — niche use case; document `FIRECRAWL_API_URL` pattern but do not build PDE scaffolding for it.
- [ ] Firecrawl Observer / periodic monitoring — out of scope for PDE as a design/dev pipeline tool.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MCP server registration + API key config | HIGH | LOW | P1 |
| `firecrawl_scrape` (JS-rendered pages) | HIGH | LOW | P1 |
| `firecrawl_search` (structured web search) | HIGH | LOW | P1 |
| Routing policy (WebFetch vs Firecrawl) | HIGH | LOW | P1 |
| Graceful credit degradation | HIGH | LOW | P1 |
| `firecrawl_map` (site discovery) | MEDIUM | LOW | P1 |
| Output to `.planning/research/web-cache/` | MEDIUM | LOW | P1 |
| `firecrawl_agent` (NL research) | HIGH | MEDIUM | P2 |
| `changeTracking` format (competitor diffs) | MEDIUM | MEDIUM | P2 |
| `firecrawl_crawl` (deep ingestion) | MEDIUM | MEDIUM | P2 |
| `firecrawl_extract` with schema | MEDIUM | MEDIUM | P2 |
| Credit usage in tmux dashboard | MEDIUM | MEDIUM | P2 |
| Browser sandbox | MEDIUM | HIGH | P3 |
| Parallel agents | LOW | HIGH | P3 |
| Self-hosted Firecrawl | LOW | MEDIUM | P3 |

---

## API Patterns and Output Formats Reference

### Scrape Response Schema
```json
{
  "markdown": "...",
  "html": "...",
  "links": ["..."],
  "screenshot": "data:image/png;base64,...",
  "changeTracking": {
    "previousScrapeAt": "2026-03-29T12:00:00Z",
    "changeStatus": "changed",
    "visibility": "visible",
    "diff": "- old line\n+ new line",
    "json": { "price": { "previous": "$99", "current": "$129" } }
  }
}
```

### Change Status Values
| Status | Meaning | When |
|--------|---------|------|
| `new` | First time this URL was scraped | Initial scrape |
| `same` | Content unchanged since last scrape | Re-scrape, no edits |
| `changed` | Content modified; diff available | Competitor updated page |
| `removed` | URL previously scraped, now 404 | Page deleted |

### Agent Response Schema
```json
{
  "success": true,
  "status": "completed",
  "data": { },
  "creditsUsed": 247,
  "expiresAt": "2026-03-31T12:00:00Z"
}
```

Agent job statuses: `processing` | `completed` | `failed` | `cancelled`. Results expire after 24 hours.

### Browser Sandbox Execution Modes
```bash
firecrawl browser execute --python 'await page.goto("https://example.com")'
firecrawl browser execute --node 'await page.goto("..."); await page.screenshot({path:"out.png"})'
firecrawl browser execute --bash "agent-browser snapshot"
```

MCP equivalent: `firecrawl_browser_execute` with `sessionId`, `code`, `language` ("python"/"javascript"/"bash").

### Credit Costs Quick Reference
| Operation | Credits |
|-----------|---------|
| Scrape (1 page) | 1 |
| Crawl (per page found) | 1 |
| Map (per URL discovered) | 1 |
| Search (per 10 results) | 2 |
| Browser sandbox | 2 per browser-minute |
| Agent — 5 free daily runs | 0 |
| Agent — beyond free tier | Dynamic (~100–2,500) |
| changeTracking git-diff mode | 0 extra |
| changeTracking JSON mode | +5 per page |

### Rate Limits (Standard Plan — likely PDE user tier)
| Endpoint | Requests/min | Concurrent |
|----------|-------------|-----------|
| /scrape | 500 | 50 |
| /map | 500 | 50 |
| /crawl | 50 | 50 |
| /search | 250 | 50 |
| /agent | 500 | 50 |
| Browser sessions | 10 RPM (FIRE-1) | 20 active (preview) |

---

## Integration with Existing PDE Skills

| Existing PDE Skill | Current Web Tool | Firecrawl Enhancement |
|-------------------|-----------------|----------------------|
| `/pde:competitive` competitive analysis | WebSearch + WebFetch | `firecrawl_search` for structured results; `firecrawl_agent` for multi-domain research; `changeTracking` for what-changed semantic diffs |
| Research agents (AutoResearch) | WebSearch + WebFetch | `firecrawl_scrape` for JS-heavy pages; `firecrawl_extract` for schema-driven data |
| `/pde:source` source material ingestion | Manual URL fetch | `firecrawl_crawl` for entire doc sites; `firecrawl_map` for pre-discovery |
| Critique skill (competitor reference) | Screenshot via Playwright MCP | Complement with `firecrawl_scrape --format screenshot` for remote non-local URLs |
| Brief skill (market context) | WebSearch | `firecrawl_search` with `tbs: "qdr:w"` for recent news/context |
| Opportunity scoring | Manual research | `firecrawl_agent` with structured schema for market sizing, competitor data |

---

## Sources

- [Firecrawl CLI Documentation](https://docs.firecrawl.dev/sdks/cli) — HIGH confidence
- [Firecrawl MCP Server Tools](https://docs.firecrawl.dev/mcp-server) — HIGH confidence
- [Firecrawl Agent Endpoint](https://docs.firecrawl.dev/features/agent) — HIGH confidence
- [Firecrawl Change Tracking](https://docs.firecrawl.dev/features/change-tracking) — HIGH confidence
- [Firecrawl Rate Limits](https://docs.firecrawl.dev/rate-limits) — HIGH confidence
- [Firecrawl Pricing](https://www.firecrawl.dev/pricing) — HIGH confidence
- [Firecrawl Browser Sandbox](https://www.firecrawl.dev/blog/introducing-browser-sandbox) — MEDIUM confidence (marketing blog, not full API reference)
- [Introducing Firecrawl Skill and CLI](https://www.firecrawl.dev/blog/introducing-firecrawl-skill-and-cli) — MEDIUM confidence
- [Spark 1 Pro and Mini models](https://www.firecrawl.dev/blog/introducing-spark-1) — MEDIUM confidence
- [Firecrawl CLI GitHub repo](https://github.com/firecrawl/cli) — HIGH confidence
- [Firecrawl MCP Server GitHub](https://github.com/firecrawl/firecrawl-mcp-server) — HIGH confidence

---
*Feature research for: Firecrawl deep integration into PDE pipeline*
*Researched: 2026-03-30*
