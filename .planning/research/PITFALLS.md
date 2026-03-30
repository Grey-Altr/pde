# Pitfalls Research: Firecrawl Integration

**Domain:** Firecrawl CLI/API/MCP deep web integration into PDE plugin
**Researched:** 2026-03-30
**Confidence:** HIGH (verified against official Firecrawl docs, MCP server README, pricing page, and rate-limit documentation)

---

## Critical Pitfalls

### Pitfall 1: Unbounded Crawl Burning Through Credits in a Single Invocation

**What goes wrong:**
A research agent calls `firecrawl_crawl` or the CLI `crawl` command without setting a `limit` parameter. The default crawl limit is **10,000 pages**. At 1 credit/page (basic mode) or 9 credits/page (JSON + enhanced proxy), a single unconstrained crawl can exhaust an entire monthly credit allocation before the agent finishes. On the Hobby plan (3,000 credits), an unconstrained crawl hitting even 400 pages in enhanced mode depletes all credits.

**Why it happens:**
Developers come from a WebFetch mental model where "fetch a page" is a bounded, free operation. Firecrawl crawl is a job scheduler — it discovers and processes every reachable URL from the root. The 10,000-page default is not visibly prominent in the tool call signature, and research agents typically do not check credit balance before issuing a crawl.

**How to avoid:**
- Enforce a hard `limit` in every crawl call at the PDE skill level — never pass a crawl prompt to the MCP tool without it. Recommended maximum: 50 pages for research tasks, 10 pages for single-doc lookups.
- Add a `FIRECRAWL_CRAWL_MAX_PAGES` config constant to `bin/lib/mcp-bridge.cjs` (same pattern as Stitch quota) that all skills read before dispatching a crawl.
- Prefer the `map` + `batch_scrape` pattern: first call `firecrawl_map` to discover up to N URLs (cheap), then `firecrawl_batch_scrape` on the exact URLs needed. Never crawl an entire domain when the sitemap URL is known.
- In workflow prose, explicitly gate: "Only use `firecrawl_crawl` if no sitemap exists and breadth > 5 pages is genuinely required."

**Warning signs:**
- A research agent loop that has not returned within 30 seconds and involved Firecrawl
- `firecrawl_crawl` call with no `limit` field in the tool arguments
- Credit balance drops sharply between two consecutive skill invocations

**Phase to address:**
Phase 1 (Foundation / MCP registration) — the `limit` guard must be in the probe/degrade wrapper before any workflow uses crawl at all.

---

### Pitfall 2: The `firecrawl_agent` Endpoint Has Unpredictable Credit Consumption

**What goes wrong:**
The `/agent` endpoint autonomously traverses websites to answer a research question. In real-world testing it consumed **100–1,500+ credits per query** with no way to predict the cost before issuing the call. On the Hobby plan (3,000/month), a single poorly-scoped agent query can consume 50% of monthly credits. There is no `maxPages` equivalent for the agent endpoint.

**Why it happens:**
The agent is designed for autonomous multi-source research and will follow links, execute searches, and scrape supporting pages as it deems necessary. The endpoint is billed per page visited, not per query. Scoping the question vaguely (e.g., "research competitor landscape") leads to deep traversal.

**How to avoid:**
- Treat `firecrawl_agent` as **explicit-consent-only** — require the user to acknowledge estimated cost range before dispatch, the same way Stitch uses `CONSENT-01` gates in `workflows/wireframe.md`.
- Scope agent queries to single-domain or single-topic questions. Prefer `firecrawl_search` + `firecrawl_scrape` for bounded research tasks instead of the agent endpoint.
- Set a `FIRECRAWL_AGENT_DISABLED = true` default in PDE config; require opt-in via `--use-firecrawl-agent` flag.
- Include the `FIRECRAWL_CREDIT_WARNING_THRESHOLD` and `FIRECRAWL_CREDIT_CRITICAL_THRESHOLD` env vars in PDE's `.env.example` so the MCP server's built-in credit monitoring is active.

**Warning signs:**
- A research workflow that calls `firecrawl_agent` in a loop (e.g., competitive analysis with N competitors each dispatching one agent call)
- No consent gate present in a skill that uses the agent endpoint
- Monthly credit balance decreasing at a rate faster than documented operations would explain

**Phase to address:**
Phase 1 (Foundation) — the consent-gate pattern must be designed before any skill uses `firecrawl_agent`. Phase 2 (Research integration) — enforce the gate in competitive analysis and opportunity scoring skills where agent use is most tempting.

---

### Pitfall 3: Context Window Overflow from Crawl or Batch Scrape Results

**What goes wrong:**
`firecrawl_crawl` and `firecrawl_batch_scrape` return all page content as a single response injected directly into context. A 50-page crawl of a documentation site at ~4,000 tokens/page produces 200,000 tokens — at Claude's context ceiling with no room for the system prompt or reasoning. Users have hit this exact boundary with Firecrawl returning 220,000 tokens that exceeded the 200K context window, causing the agent to fail mid-task.

**Why it happens:**
When building research pipelines, developers default to markdown format because it is human-readable. Markdown preserves full page prose. For a multi-page crawl, this floods the context. The MCP tool's output goes directly into Claude's conversation — there is no intermediate storage layer.

**How to avoid:**
- Always request JSON format with an explicit schema when the goal is data extraction. JSON format returns only the specified fields, reducing output size by 60–90%.
- Use the `firecrawl_extract` endpoint for structured domain-wide extraction rather than crawl-then-parse.
- For cases where markdown is needed, enforce a `limit` of 5–10 pages maximum and summarize before proceeding.
- Write crawl/batch results to `.planning/research/firecrawl-cache/` rather than reading them inline into the context. Then read only the sections needed.
- Never use `firecrawl_crawl` for a single page — use `firecrawl_scrape` instead.

**Warning signs:**
- A tool call with `formats: ["markdown"]` and `limit` > 10
- An agent that passes full crawl output to a subsequent step in the same context window
- PDE's token metering counter (already tracking context utilization) approaching 70% after a Firecrawl call

**Phase to address:**
Phase 1 (Foundation) — add output-format guidance to the Firecrawl wrapper. Phase 2 (Research integration) — enforce JSON-with-schema as the default for all research skill calls.

---

### Pitfall 4: Duplicate Capability Confusion — Playwright vs Firecrawl Browser Sandbox

**What goes wrong:**
PDE already has Playwright MCP registered for screenshots, AOM accessibility analysis, and visual metrics. Firecrawl's browser sandbox appears to offer similar capabilities. Using both for the same task wastes credits and creates inconsistent results. Worse: `firecrawl_browser` is **marked deprecated** in the official MCP server — the replacement is `firecrawl_interact`. Using the deprecated tool will break when the endpoint is removed.

**Why it happens:**
The overlap is real: both Playwright and Firecrawl can take screenshots, interact with pages, and execute JavaScript. Developers not aware of PDE's Playwright integration default to whatever tool appears first in the MCP tool list.

**How to avoid:**
Use this decision matrix in workflow prose and `references/mcp-integration.md`:

| Task | Use | Reason |
|------|-----|--------|
| Screenshot for visual critique/regression | Playwright MCP | Already registered, no credits consumed, 1280x800 viewport calibrated |
| AOM accessibility analysis | Playwright + Axe MCP | Already integrated in critique.md with 4-way merge logic |
| Scrape a public URL to markdown/JSON | Firecrawl `firecrawl_scrape` | Purpose-built, handles JS-rendered pages, returns clean content |
| Multi-page crawl / site map discovery | Firecrawl `firecrawl_map` + `firecrawl_crawl` | No Playwright equivalent at scale |
| Click buttons / fill forms / stateful interaction | Firecrawl `firecrawl_interact` | Not `firecrawl_browser` (deprecated) |
| Browser session with persistent cookies across steps | Firecrawl browser sessions (TTL-managed) | Playwright MCP does not persist session state |

Never use `firecrawl_browser` — it is deprecated. Do not use Firecrawl for screenshots of PDE-generated HTML (use Playwright). Do not use Playwright for scraping external URLs (use Firecrawl).

**Warning signs:**
- A workflow calling both `mcp__playwright__screenshot` and `firecrawl_scrape` on the same URL
- Any reference to `firecrawl_browser` in skill prose
- Firecrawl browser session credit charges (2 credits/minute) appearing when Playwright could have been used

**Phase to address:**
Phase 1 (Foundation) — the `mcp-integration.md` decision matrix must be written before any skill is updated. Phase 3 (Skill integration) — each skill update must verify it is not double-calling.

---

### Pitfall 5: `firecrawl_search` Replacing Free WebSearch

**What goes wrong:**
Research agents default to `firecrawl_search` because it is the most prominent search tool in the Firecrawl MCP. Firecrawl search costs **2 credits per 10 results**. PDE's existing research agents use the built-in `WebSearch` tool, which is free. Routing all search queries through Firecrawl adds up: 50 searches/month at 2 credits each = 100 credits, roughly 3% of a Hobby plan's monthly allocation for zero marginal gain on discovery queries.

**Why it happens:**
When Firecrawl MCP is registered, `firecrawl_search` appears in the tool list alongside `firecrawl_scrape`. Agents pick the most specific-sounding tool. There is no "use free WebSearch first" policy in current skill prose.

**How to avoid:**
Define a clear escalation ladder in workflow prose:

1. **WebSearch / WebFetch** (built-in, free) — for discovery, link-finding, general research questions
2. **`firecrawl_scrape`** (1 credit/page) — when WebFetch returns inadequate content (JS-rendered pages, anti-scraping protection)
3. **`firecrawl_search`** (2 credits/10 results) — only when search + content-extraction-in-one-pass is required (e.g., "find and extract structured data from the top 5 results matching a schema")

Add this escalation policy to `references/mcp-integration.md` in the Firecrawl section.

**Warning signs:**
- A research skill calling `firecrawl_search` where the query could be satisfied by `WebSearch`
- Credit consumption showing search charges when no JS-rendered pages were involved
- Research agent skills not calling `WebSearch` at all despite it being available

**Phase to address:**
Phase 2 (Research integration) — the escalation ladder must be in skill prose for competitive analysis, opportunity scoring, and research validation.

---

### Pitfall 6: Browser Session Leaks Exhausting the 20-Session Pool

**What goes wrong:**
The Firecrawl browser endpoint allows up to **20 concurrent active sessions** across all plans. Sessions bill at **2 credits/browser-minute** with a default TTL of 600 seconds (10 minutes) and an activity TTL of 300 seconds. If a research agent opens a session and the workflow throws an error before closing it, the session stays alive and billing continues until TTL expiry. Ten such leaks consume 200 credits before any TTL fires. With 20 simultaneous parallel agent worktrees (PDE already supports this via worktree isolation), all 20 session slots can be exhausted in a single run.

**Why it happens:**
Workflow prose that calls `firecrawl_interact` or the browser endpoint does not automatically close the session on error. Claude Code agents do not have try/finally semantics — the session close instruction is easy to omit. Parallel worktree agents each create their own sessions without visibility into how many others are active.

**How to avoid:**
- Every skill that opens a browser session must have an explicit session-destroy call in both the success path and the error path. Write this as a required final step in skill prose: "Step N: Destroy browser session regardless of outcome."
- Add a `FIRECRAWL_BROWSER_SESSION_ACTIVE` flag to the MCP debug log so `/pde:monitor` can surface open sessions.
- Limit browser session use to workflows where Playwright cannot substitute. For most PDE use cases, Playwright MCP is sufficient.
- Wire a session-cleanup check to PDE's existing session-end hook (already fires on `session_end` event).

**Warning signs:**
- Firecrawl API returning 429 on new session requests when overall rate limits are not exceeded
- Credit consumption spiking during periods of low scraping activity
- `mcp-debug.log` showing session-open entries without corresponding session-close entries

**Phase to address:**
Phase 3 (Browser sandbox feature) — not needed until browser session functionality is actively used. Must be addressed before any skill uses `firecrawl_interact` with stateful sessions.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `limit: 100` in crawl calls | Prevents unlimited crawls | 100 pages at 9 credits each = 900 credits per invocation; still expensive at scale | Never — use a named constant capped at 50 |
| Skip consent gate for `firecrawl_agent` | Less friction for research agents | One poorly-scoped query can exhaust monthly credits | Never — gate is mandatory |
| Use markdown format for all scrapes | Easy to read output | 10x larger response; context window overflow risk on any multi-page call | Acceptable for single-page scrape only |
| Store firecrawl output in context directly | Simplest implementation | Context window fills; previous conversation lost | Only for outputs under 5,000 tokens |
| Reuse one `FIRECRAWL_API_KEY` for all environments | Simple setup | Dev/test queries burn production credits; no usage attribution | Acceptable for solo MVP; fix before multi-user or team use |
| Skip `--no-firecrawl` flag implementation | One less flag to document | No way to run offline or debug without burning credits | Never — add during Phase 1 alongside other `--no-{name}` flags |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MCP registration | Registering Firecrawl MCP without setting credit threshold env vars | Always set `FIRECRAWL_CREDIT_WARNING_THRESHOLD` (default 1000) and `FIRECRAWL_CREDIT_CRITICAL_THRESHOLD` (default 100) in `.env` — these drive the MCP server's built-in alerts |
| API key management | Hardcoding `fc-...` key in `claude_desktop_config.json` or `.mcp.json` | Pass via `FIRECRAWL_API_KEY` env var only; never commit the key; add to `.gitignore` |
| `firecrawl_batch_scrape` | Calling batch without knowing the URLs | `batch_scrape` requires exact URLs — use `firecrawl_map` to discover them first; never guess URLs |
| Crawl + Stitch in same pipeline | Running a crawl for competitor research immediately before Stitch wireframe generation | Both operations are credit-gated; running sequentially without quota checks can hit two different monthly limits in one pipeline run — check both before starting |
| Probe/degrade error handling | Treating all Firecrawl errors the same in the degrade path | 401 (invalid key) = disable permanently for session; 429 (rate limited) = backoff and retry with exponential delay; 503 (service unavailable) = degrade to WebFetch |
| `firecrawl_browser` vs `firecrawl_interact` | Using the deprecated `firecrawl_browser` tool | It is deprecated in the official MCP server. Use `firecrawl_interact` for browser-based page interactions |
| Async crawl timing | Assuming `firecrawl_crawl` is synchronous | Crawl returns a job ID; the MCP server polls automatically, but wall-clock time is 30–120 seconds for large crawls. Build timeout awareness into skill prose |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Parallel research agents all calling `firecrawl_search` | Rapid credit burn; Standard plan allows 250 search RPM but credits drain fast | Route discovery phase to WebSearch; promote to Firecrawl only when content extraction is needed | Any parallel research workflow with N > 2 agents |
| `firecrawl_crawl` with no `maxDepth` on a large docs site | Crawl runs 60+ seconds, returns 200+ pages, overflows context | Set `maxDepth: 2` by default; only increase for known shallow sites | Depth unconstrained on any large documentation domain |
| Requesting multiple formats per scrape | Triple the output size per page | Default to `formats: ["markdown"]` only; never request `rawHtml` unless DOM parsing is required | Any multi-format request on 5+ pages |
| Browser sessions not explicitly closed | 20-session pool exhausted; new requests return 429 | Explicit session destroy in all browser workflow paths | After approximately 20 concurrent research agent invocations |
| `firecrawl_extract` without a schema | Extract infers schema from the page; returns more data than needed | Always provide an explicit `schema` object; keep to 5–10 fields max | Any extract call on a data-dense page |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing `FIRECRAWL_API_KEY` to the PDE repo | Key exposed; attacker uses credits or scrapes on your account | Add `FIRECRAWL_API_KEY` to `.gitignore` and `.env.example` (placeholder only); audit with `git log -S FIRECRAWL_API_KEY` before shipping |
| Same API key in worktree agents as in main session | Parallel worktree agents consume credits simultaneously; 10 parallel agents can hit rate limits (50 crawl RPM on Standard) | Consider a concurrency-aware credit queue in `bin/lib/mcp-bridge.cjs` — the parallel dispatch queue already exists for CLI commands |
| Passing user-supplied URLs directly to `firecrawl_scrape` | SSRF — scraping internal network addresses or cloud metadata endpoints | Validate URLs against an allowlist before passing to Firecrawl; block `169.254.169.254`, `localhost`, `10.*`, `192.168.*` |
| Storing scraped content directly in `.planning/` state files | Malicious page injects front-matter or structured data that corrupts `.planning/` state | Write scraped content to `.planning/research/firecrawl-cache/` in isolation; never interpolate scraped text into structured state files without sanitization |

---

## "Looks Done But Isn't" Checklist

- [ ] **Credit guard on crawl:** `limit` parameter is present and capped — verify no workflow calls `firecrawl_crawl` without an explicit `limit` ≤ 50
- [ ] **Agent consent gate:** Any workflow using `firecrawl_agent` has a user consent prompt with estimated credit range before dispatch — verify `CONSENT` check exists before the tool call
- [ ] **`--no-firecrawl` flag:** The flag is documented in `mcp-integration.md` and the probe logic reads it before any Firecrawl tool call — verify the flag actually skips the probe
- [ ] **Deprecated `firecrawl_browser` absent:** No workflow references `firecrawl_browser` — verify by grepping all skill and workflow files
- [ ] **Credit thresholds in `.env.example`:** `FIRECRAWL_CREDIT_WARNING_THRESHOLD` and `FIRECRAWL_CREDIT_CRITICAL_THRESHOLD` are documented — verify they appear in `.env.example` and `setup.md`
- [ ] **Browser session close path:** Every code path that opens a browser session has a corresponding close call — verify try/finally pattern in skill prose
- [ ] **Search escalation ladder intact:** Skills that currently use `WebSearch` have not been rewritten to use `firecrawl_search` — verify WebSearch is still the first-tier tool in research workflows
- [ ] **Crawl output written to file, not inline context:** Crawl and batch-scrape results are written to `.planning/research/firecrawl-cache/` — verify no workflow reads raw crawl output inline into a multi-step reasoning chain

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Credits exhausted mid-pipeline | HIGH | (1) Check if free credits reset next month; (2) upgrade plan or purchase overage; (3) fall back to WebFetch for remaining research; (4) add `FIRECRAWL_CREDITS_EXHAUSTED = true` guard in mcp-bridge.cjs to short-circuit all subsequent Firecrawl calls for the session |
| Browser sessions leaked (all 20 slots occupied) | MEDIUM | (1) Call the Firecrawl API to list active sessions; (2) destroy orphaned sessions via the session destroy endpoint; (3) wait for TTL expiry (max 600s) if API destroy not available; (4) add session-cleanup hook to PDE's session-end event |
| Context window overflow from crawl output | LOW | (1) Truncate response to first N pages; (2) summarize in a sub-agent with a fresh context window; (3) write full output to disk and re-query specific sections; (4) re-run with `formats: ["json"]` and a targeted schema |
| API key committed to git | HIGH | (1) Rotate the key immediately in the Firecrawl dashboard; (2) use BFG or `git filter-repo` to remove from history; (3) force-push after team coordination; (4) audit Firecrawl usage logs for unauthorized calls |
| Rate limited (429) on parallel research agents | LOW | Built-in MCP server exponential backoff handles transient 429s. For persistent throttling: reduce parallel agent concurrency in `bin/lib/concurrent-queue.cjs` to max 2 when Firecrawl is involved |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Unbounded crawl credit burn | Phase 1 — Foundation (MCP registration + wrapper) | Grep all Firecrawl tool calls for absence of `limit`; assert `limit ≤ 50` in Nyquist tests |
| `firecrawl_agent` runaway cost | Phase 1 (consent gate design) + Phase 2 (research skill integration) | Verify consent check exists before every `firecrawl_agent` call; test that declining consent falls back gracefully |
| Context window overflow | Phase 1 (output format policy in wrapper) + Phase 2 (skill integration) | Assert `formats` default is `["json"]` with schema; test 20-page crawl result stays under 50K tokens |
| Playwright vs Firecrawl confusion | Phase 1 (decision matrix in mcp-integration.md) | No skill calls both `mcp__playwright__screenshot` and `firecrawl_scrape` on the same URL |
| `firecrawl_search` over-use | Phase 2 (research skill integration) | Research skills call `WebSearch` first; `firecrawl_search` only appears as conditional fallback |
| Deprecated `firecrawl_browser` use | Phase 1 (MCP tool map definition) | `firecrawl_browser` is absent from the TOOL_MAP in `references/mcp-integration.md` |
| Browser session leaks | Phase 3 (browser sandbox feature) | Every browser session call has a matching close; tested with error injection |
| API key exposure | Phase 1 (Foundation) | `.env.example` contains placeholder only; `.env` in `.gitignore`; CI check confirms no real key in tracked files |
| Parallel worktrees exhausting rate limits | Phase 1 (concurrent queue configuration) | Firecrawl calls routed through concurrency-capped queue; max 2 parallel Firecrawl operations validated |

---

## Sources

- [Firecrawl Rate Limits Documentation](https://docs.firecrawl.dev/rate-limits) — confirmed plan-level rate limits (scrape: 500 RPM Standard, crawl: 50 RPM Standard) and concurrent browser limits (50 on Standard)
- [Firecrawl Browser Feature Documentation](https://docs.firecrawl.dev/features/browser) — confirmed 2 credits/browser-minute, 20-session limit across all plans, TTL defaults (600s total, 300s activity)
- [Firecrawl Crawl Feature Documentation](https://docs.firecrawl.dev/features/crawl) — confirmed default limit is 10,000 pages, 24-hour job result retention, pagination at 10MB
- [Firecrawl Search Feature Documentation](https://docs.firecrawl.dev/features/search) — confirmed 2 credits per 10 results, scrapeOptions multipliers
- [Official Firecrawl MCP Server README (GitHub)](https://github.com/firecrawl/firecrawl-mcp-server) — confirmed credit threshold env vars; confirmed `firecrawl_browser` is deprecated in favor of `firecrawl_interact`; confirmed 8 exposed tools
- [Firecrawl Pricing Breakdown 2026 — ScrapeGraphAI](https://scrapegraphai.com/blog/firecrawl-pricing) — confirmed 9-credit-per-page worst case; agent endpoint 100–1,500+ credits per query
- [Firecrawl vs Playwright — Grokipedia](https://grokipedia.com/page/Firecrawl_vs_Playwright) — use-case boundary analysis
- PDE `references/mcp-integration.md` — probe/degrade contract patterns, `--no-{name}` flag system, mcp-debug.log format (HIGH confidence, direct file read)
- PDE `workflows/wireframe.md` lines 785-820 — Stitch quota check pattern as model for Firecrawl credit gating (HIGH confidence, direct file read)

---
*Pitfalls research for: Firecrawl deep web integration in PDE plugin*
*Researched: 2026-03-30*
