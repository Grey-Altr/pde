# Project Research Summary

**Project:** PDE Firecrawl Integration
**Domain:** Web scraping / MCP server integration into existing PDE plugin architecture
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

This milestone adds Firecrawl as PDE's eighth approved MCP server, replacing WebSearch/WebFetch as the primary web intelligence layer for competitive analysis, source material ingestion, and research agent workflows. Firecrawl provides JS rendering, structured extraction, crawl jobs, change tracking, and optional autonomous research via the agent endpoint — capabilities that WebFetch fundamentally cannot provide. The integration uses a two-lane design: Lane A (MCP tools, HTTP transport) handles inline workflow tool calls; Lane B (npx-pinned firecrawl-cli) handles bulk operations writing output directly to `.planning/firecrawl-cache/`. Both lanes follow existing PDE patterns: probe/degrade contracts, zero-npm-deps-at-root, `.planning/` artifact storage, NDJSON event bus.

The recommended approach is incremental with a hard dependency sequence: register the MCP server and establish the cache module first (the shared foundation), then integrate into the three highest-value existing workflows (competitive.md, recommend.md, brief.md + pde-phase-researcher), then add the standalone `/pde:firecrawl` command, and finally wire change-tracking events to the dashboard. This ordering respects the dependency chain — every workflow integration depends on `mcp-bridge.cjs` TOOL_MAP entries existing first, and the cache-writing integrations (brief, researcher) depend on `firecrawl-cache.cjs` existing before they write. The standalone command can be built in parallel with workflow integrations once the foundation phases are complete.

The dominant risk is cost: Firecrawl is a credit-based paid API and two endpoints — `firecrawl_crawl` (default 10,000-page limit) and `firecrawl_agent` (100–1,500+ credits per query) — can silently exhaust a monthly allocation in a single misconfigured invocation. Both require mandatory guards before any workflow integration touches them: a crawl `limit` cap constant and an agent consent gate, both in Phase 1. Secondary risk is context window overflow from multi-page crawl results returned inline; mitigation is writing crawl output to `.planning/firecrawl-cache/` rather than injecting it into the conversation. A third risk is tool confusion between deprecated `firecrawl_browser` (which must never be used) and the replacement `firecrawl_interact`, and between Firecrawl browser and Playwright MCP (hard architectural boundary: Playwright for PDE design evaluation, Firecrawl for external content extraction only). All three risks have documented prevention strategies and must be addressed in Phase 1, not deferred.

---

## Key Findings

### Recommended Stack

Firecrawl enters the PDE environment as two artifacts: `firecrawl-mcp@3.11.0` registered via `claude mcp add` using HTTP transport (preferred — no cold-start latency, API key embedded in URL), and `firecrawl-cli@1.12.2` invoked via `npx firecrawl-cli@1.12.2` from CJS workflow scripts. Neither is added to `package.json` — PDE's zero-npm-deps-at-root constraint applies strictly. The only new source file PDE needs is `bin/lib/firecrawl-cache.cjs` (zero external deps, CJS module matching existing `bin/lib/` conventions). All other changes are modifications to existing markdown workflow, command, agent, and reference files.

**Core technologies:**
- `firecrawl-mcp@3.11.0` (HTTP MCP transport): Provides 12 tools callable inline by Claude Code during workflow execution — no subprocess spawn, no cold-start. Registered via `claude mcp add firecrawl --url https://mcp.firecrawl.dev/{key}/v2/mcp`. Probe tool: `firecrawl_search` with `limit:1` (lightest read-only operation).
- `firecrawl-cli@1.12.2` (npx-pinned subprocess): Handles bulk crawl jobs and write-to-filesystem operations where the CLI's `--output` flag avoids large inline context payloads. Version-pinned to prevent silent flag changes from breaking workflow scripts.
- `FIRECRAWL_API_KEY` env var: Single credential surface for both lanes. Stored via `firecrawl login --api-key` (platform keychain). Never committed to `.planning/config.json` — version-controlled directory violates credential hygiene.
- `bin/lib/firecrawl-cache.cjs` (new, zero deps): All disk I/O for scraped content, crawl results, and change-tracking snapshots. Keeps workflow markdown files declarative.

**Critical constraints:** Node.js >= 18 (already required). `firecrawl_browser` MCP tool is deprecated — use `firecrawl_interact`. Both `firecrawl-cli` and `firecrawl-mcp` are invoked via npx or `claude mcp add`, never added to `package.json`.

---

### Expected Features

**Must have (table stakes — v1 launch):**
- MCP server registration in `mcp-bridge.cjs` APPROVED_SERVERS with probe/degrade contract — foundation for all downstream features
- API key config via PDE's existing env/config system, same pattern as other MCP servers
- `firecrawl_scrape` available in research and competitive workflows — replaces WebFetch for JS-rendered pages
- `firecrawl_search` as primary search tool in competitive/recommend workflows — structured results vs raw WebSearch snippets
- `firecrawl_map` for pre-crawl URL discovery (cheap; avoids unbounded crawl)
- WebFetch → Firecrawl routing/escalation policy in `references/mcp-integration.md` — prevents free WebFetch being silently bypassed
- Credit usage surfaced in session summary — prevents surprise bill shock
- Graceful degradation at 80% credit consumption; fallback to WebSearch/WebFetch at exhaustion
- Output written to `.planning/firecrawl-cache/` (gitignored), not inline context

**Should have (differentiators — v1.x after validation):**
- `firecrawl_agent` wired into competitive analysis and research skills — requires consent gate and `--max-credits` cap
- `changeTracking` format for competitor page diffs — git-diff mode only by default, JSON mode as explicit opt-in
- `firecrawl_crawl` for deep doc site ingestion via `/pde:source` — requires async poll pattern
- `firecrawl_extract` with Zod/JSON schema for structured competitor data extraction
- Credit usage live in tmux dashboard Pane 7 — visibility during long crawl/agent jobs

**Defer to v2+:**
- Browser sandbox (`firecrawl_interact`) — preview-stage 20-session limit, high session management complexity, Playwright MCP covers most use cases
- Parallel agents for batch competitive research — validate single-agent pattern first
- Self-hosted Firecrawl for private content — document `FIRECRAWL_API_URL` pattern only, no PDE scaffolding
- Firecrawl Observer / periodic monitoring — out of scope, PDE is not a monitoring platform

---

### Architecture Approach

Firecrawl integrates into PDE as a layered addition, not a rewrite. At the foundation: `mcp-bridge.cjs` gains a `firecrawl` entry in APPROVED_SERVERS with 12 TOOL_MAP entries. Above that: `bin/lib/firecrawl-cache.cjs` provides the disk I/O layer — all scraped content flows through it to `.planning/firecrawl-cache/` subdirectories, with sources-manifest updates and NDJSON event emission. Above that: existing workflows gain probe/degrade sections using `FIRECRAWL_AVAILABLE` exactly as they currently use `WEBSEARCH_AVAILABLE`. New at the top: `workflows/firecrawl.md` + `commands/firecrawl.md` provide a standalone `/pde:firecrawl` command with 6 subcommands for power-user operations.

**Major components:**
1. `bin/lib/mcp-bridge.cjs` (modified) — Adds `firecrawl` to APPROVED_SERVERS + 12 TOOL_MAP canonical names; probe uses `firecrawl:probe` → `mcp__firecrawl__search` with `limit:1`; includes `--no-firecrawl` flag support and credit guard constants
2. `bin/lib/firecrawl-cache.cjs` (new) — read/write/slug/diff/emit; all disk I/O so workflow files stay declarative; emits `firecrawl_content_changed` events via `pde-tools.cjs event-emit` subprocess (NOT via emit-event.cjs hooks — Firecrawl events are application-level, not hook-level)
3. `.planning/firecrawl-cache/` (new directory) — `scrapes/`, `crawls/`, `snapshots/` subdirectories; gitignored; mirrors `.planning/design/` and `.planning/phases/` structure
4. Modified workflows — competitive.md (WEBSEARCH_AVAILABLE → FIRECRAWL_AVAILABLE probe), recommend.md (add Firecrawl search alongside WebSearch), brief.md (add `--source-url` flag + scrape→cache→BRF flow), pde-phase-researcher.md (add `## Web Evidence` step)
5. `workflows/firecrawl.md` + `commands/firecrawl.md` (new) — standalone orchestration skill with scrape/search/map/crawl/watch/agent subcommands
6. `references/mcp-integration.md` (modified) — adds Firecrawl section with Path A/B decision matrix, probe pattern, tool routing escalation ladder

**Hard architectural boundary:** Playwright MCP handles PDE design evaluation (wireframes, critique, mockups, deploy smoke tests) against local artifacts. Firecrawl browser sandbox handles external content extraction only. No crossover. `firecrawl_browser` is deprecated; `firecrawl_interact` is the replacement but deferred to v2+.

---

### Critical Pitfalls

1. **Unbounded crawl burning through credits (default 10,000-page limit)** — Add `FIRECRAWL_CRAWL_MAX_PAGES` constant (cap: 50) in `mcp-bridge.cjs` in Phase 1, before any workflow uses crawl. Prefer `firecrawl_map` + targeted `firecrawl_scrape` over full crawl. Never call `firecrawl_crawl` without an explicit `limit` parameter.

2. **`firecrawl_agent` unpredictable credit consumption (100–1,500+ credits/query)** — Treat as explicit-consent-only with a consent gate before dispatch, same pattern as Stitch CONSENT-01 in `workflows/wireframe.md`. Default `FIRECRAWL_AGENT_DISABLED = true`; require opt-in. Set `--max-credits` on every agent invocation. Design this gate in Phase 1 before any skill references the agent endpoint.

3. **Context window overflow from crawl/batch results** — Never inject raw crawl output inline into the conversation. Always write to `.planning/firecrawl-cache/` and read only the sections needed. Use JSON format with explicit schema for multi-page operations; markdown only for single-page scrapes under 5K tokens.

4. **Playwright vs Firecrawl browser confusion and deprecated `firecrawl_browser`** — The decision matrix must be in `references/mcp-integration.md` before any skill is updated. `firecrawl_browser` must never appear in any skill or workflow file. Never use Firecrawl for PDE design evaluation; never use Playwright for external competitor site scraping.

5. **`firecrawl_search` silently replacing free WebSearch** — Define the escalation ladder in workflow prose: WebSearch/WebFetch first (free) → `firecrawl_scrape` when JS rendering needed (1 credit) → `firecrawl_search` only when search + structured extraction in one pass is required (2 credits/10 results). Skills must preserve WebSearch as the first-tier tool for discovery queries.

---

## Implications for Roadmap

The dependency chain drives a 6-phase structure. Phases 1–2 are the strict foundation all others require. Phases 3 and 4 can run in parallel (Phase 3 only needs Phase 1; Phase 4 needs both Phases 1 and 2). Phase 5 can overlap Phases 3–4 once Phases 1–2 are stable. Phase 6 is a pure observability addition with no downstream dependents.

### Phase 1: Foundation — MCP Registration + Credit Guards

**Rationale:** Every subsequent phase calls through `mcp-bridge.cjs` TOOL_MAP. Without this registration, no probe can be issued and no tool called. The credit guard constants and agent consent pattern must exist at this layer before any workflow integration touches Firecrawl — one misconfigured call without guards can exhaust the monthly credit budget. This is the non-negotiable first phase, and all security and cost-protection mechanisms belong here.

**Delivers:** `firecrawl` in APPROVED_SERVERS with probe/degrade contract; 12 TOOL_MAP entries; `--no-firecrawl` flag; `FIRECRAWL_CRAWL_MAX_PAGES` constant (cap: 50); agent consent gate design; `FIRECRAWL_CREDIT_WARNING_THRESHOLD` + `FIRECRAWL_CREDIT_CRITICAL_THRESHOLD` in `.env.example`; credit graceful degradation logic; mcp-integration.md Firecrawl section with Path A/B decision matrix and tool routing escalation ladder.

**Addresses:** MCP server registration, API key config, graceful credit degradation (table stakes)

**Avoids:** Unbounded crawl credit burn (Pitfall 1), agent runaway cost (Pitfall 2), deprecated `firecrawl_browser` confusion (Pitfall 4), API key exposure (security)

**Research flag:** Standard pattern — follows existing Stitch/Playwright/GitHub entries in APPROVED_SERVERS. Skip research-phase.

---

### Phase 2: Data Layer — firecrawl-cache.cjs + Sources Manifest

**Rationale:** Before any workflow can write scraped content to disk, the disk I/O module must exist. Brief, competitive, and the researcher agent all need to write to `.planning/firecrawl-cache/` and update `sources-manifest.json`. Building this before the workflow integrations ensures a stable, tested write path rather than each workflow inventing its own. Also provides the event emission substrate for Phase 6 (change tracking).

**Delivers:** `bin/lib/firecrawl-cache.cjs` (read/write/slug/diff/emit); `.planning/firecrawl-cache/` directory structure (scrapes/, crawls/, snapshots/); extended `templates/sources-manifest.json` schema with firecrawl source type; unit tests for slug generation, read/write round-trip, manifest update idempotency.

**Uses:** Node built-in `fs` (zero npm deps); existing `pde-tools.cjs` event-emit subprocess pattern

**Implements:** Source material ingestion flow (Architecture Pattern 2)

**Avoids:** Context window overflow (output to cache, not inline — Pitfall 3)

**Research flag:** Standard CJS zero-deps module matching existing `bin/lib/` files. Skip research-phase.

---

### Phase 3: Competitive + Recommend Workflow Integration

**Rationale:** Highest-value workflow integrations with minimal dependencies — they use MCP tools inline without requiring the cache module, so they only need Phase 1 complete. Migrating `competitive.md` from WEBSEARCH_AVAILABLE to FIRECRAWL_AVAILABLE and adding `firecrawl_search` to `recommend.md` delivers immediate research quality improvement to PDE's most-used skills. This phase can run in parallel with Phase 4 once Phases 1 and 2 are done.

**Delivers:** `workflows/competitive.md` with FIRECRAWL_AVAILABLE probe replacing WEBSEARCH_AVAILABLE; `workflows/recommend.md` with dual WebSearch + Firecrawl probes; confidence labels updated to `[confirmed via Firecrawl — {date}]`; escalation ladder enforced in competitive prose (WebSearch first → firecrawl_search only for structured extraction).

**Addresses:** `firecrawl_scrape`, `firecrawl_search`, `firecrawl_map` (table stakes); `changeTracking` groundwork for competitive diffs (v1.x differentiator)

**Avoids:** `firecrawl_search` over-use replacing free WebSearch (Pitfall 5)

**Research flag:** Direct migration from existing WEBSEARCH_AVAILABLE probe — pattern is well-established. Skip research-phase.

---

### Phase 4: Brief + Phase Researcher Integration

**Rationale:** Depends on Phase 2 (cache write path). Adding `--source-url` to `brief.md` and a Firecrawl search step to `pde-phase-researcher.md` closes the source material ingestion loop — users can pass a competitor URL to any brief and have the content scraped, cached, and injected as semantic context. The researcher agent gains web-sourced evidence for external API and ecosystem knowledge. Both workflows must degrade gracefully when FIRECRAWL_AVAILABLE = false.

**Delivers:** `--source-url` flag on `workflows/brief.md` with scrape → `firecrawl-cache.cjs` write → BRF `## Source Material` section; `agents/pde-phase-researcher.md` Standard Mode with Firecrawl search + scrape step producing `## Web Evidence` section; graceful degradation on FIRECRAWL_AVAILABLE = false for both.

**Implements:** Source material ingestion flow end-to-end (Architecture Pattern 2)

**Avoids:** Context window overflow (all scrape output written to cache, not inline — Pitfall 3)

**Research flag:** Follows existing `--reference-url` Playwright flag pattern for brief.md (additive, not conflicting). Researcher agent gains one new conditional step. Standard. Skip research-phase.

---

### Phase 5: /pde:firecrawl Standalone Skill

**Rationale:** Depends on Phases 1 and 2 (TOOL_MAP + cache). Exposes all Firecrawl capabilities as explicit user-facing commands rather than only embedded within other workflows. Covers operations (crawl, watch, agent) that don't belong embedded in competitive/brief workflows. The async crawl poll loop and agent consent gate both require care — recommend a targeted research-phase scan on the changeTracking format interaction before implementing the `watch` subcommand prose.

**Delivers:** `workflows/firecrawl.md` with 6 subcommands (scrape/search/map/crawl/watch/agent); `commands/firecrawl.md` slash command entry; async crawl poll loop (crawl → job ID → poll `firecrawl_check_crawl_status`); agent consent gate enforced; `--max-credits` cap on every agent invocation; output to `firecrawl-cache` for all subcommands.

**Addresses:** `firecrawl_agent` (v1.x differentiator), `firecrawl_crawl` deep ingestion (v1.x), `firecrawl_extract` with schema (v1.x)

**Avoids:** Agent runaway cost (consent gate applied here — Pitfall 2), unbounded crawl (max-pages constant from Phase 1 — Pitfall 1)

**Research flag:** The `watch` subcommand's changeTracking format has specific async complexity (markdown must be co-requested with changeTracking; git-diff vs JSON mode cost difference; diff algorithm depends on exact URL + team ID match). Recommend targeted research-phase scan on async crawl polling and changeTracking format requirements before writing `watch` subcommand prose.

---

### Phase 6: Change Tracking + Event Bus

**Rationale:** Optional observability layer. Depends on Phase 2 (snapshot module) and Phase 5 (`watch` subcommand). Wires `firecrawl_content_changed` NDJSON events to the dashboard when a competitor page changes. No other phase depends on this — it can be deferred if scope pressure arises without blocking any other work.

**Delivers:** `firecrawl_content_changed` event emitted to NDJSON bus when diff is non-empty; NDJSON line format validated (`{ url, slug, word_count, diff_lines }`); snapshot baseline written on first watch invocation; diff written on subsequent watches; dashboard Pane 5 (log stream) surfaces change summary; idle catalog updated with watch/change suggestions.

**Implements:** Change tracking + event bus (Architecture Pattern 5)

**Avoids:** Anti-pattern of emitting via `emit-event.cjs` HOOK_TO_EVENT_TYPE (Firecrawl events are application-level, not hook-level — emit via `pde-tools.cjs event-emit` subprocess from `firecrawl-cache.cjs`)

**Research flag:** NDJSON event schema and dashboard pane integration follow well-documented PDE patterns. Skip research-phase.

---

### Phase Ordering Rationale

- Phases 1–2 are strict prerequisites: TOOL_MAP must exist before probes can run; cache module must exist before any workflow writes to disk. No shortcuts here.
- Phases 3 and 4 can run in parallel once Phases 1 and 2 are done (Phase 3 only needs TOOL_MAP; Phase 4 needs both TOOL_MAP and cache module).
- Phase 5 can overlap Phases 3–4 once Phases 1–2 are stable — it exercises the same tools and cache paths that Phases 3–4 validate, and benefits from their tests being stable first.
- Phase 6 is a pure addition with no downstream dependents — can be deferred or descoped without affecting any other phase.
- Credit guards (Pitfalls 1 and 2) are resolved in Phase 1. This is the most important ordering constraint: all workflow integrations that use crawl or agent must come after the guards exist.

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (`watch` subcommand and `changeTracking` format):** The changeTracking API requires `markdown` to be co-requested in the same call; omitting it produces silent empty diffs. Git-diff mode (free) vs JSON mode (5 credits/page) has significant cost implications. The diff algorithm matches on exact URL + team ID — implications for cache keying need verification. Recommend a targeted research-phase scan before writing `watch` prose.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Direct extension of existing APPROVED_SERVERS pattern; Stitch, Playwright, and GitHub precedents all present in codebase at known locations.
- **Phase 2:** Standard CJS zero-deps module — same pattern as existing `bin/lib/` files (mcp-bridge.cjs, core.cjs).
- **Phase 3:** Direct migration from WEBSEARCH_AVAILABLE probe; existing competitive.md is the reference implementation.
- **Phase 4:** Follows `--reference-url` Playwright flag pattern in brief.md (additive). Researcher agent step structure already defined.
- **Phase 6:** NDJSON event emission pattern follows hooks/emit-event.cjs and pde-tools.cjs documentation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via `npm show`; HTTP transport URL pattern confirmed from official MCP server docs; zero-npm constraint is enforced existing policy |
| Features | HIGH | Sourced from official Firecrawl docs (CLI, MCP server, rate limits, agent); credit costs from official pricing page (MEDIUM — pricing subject to change without docs update) |
| Architecture | HIGH | Patterns derived directly from PDE codebase reads (mcp-bridge.cjs, competitive.md, brief.md, pde-phase-researcher.md, wireframe.md); integration points specified at file and function level |
| Pitfalls | HIGH | Rate limits and credit costs verified from official docs; browser session limits from official browser feature docs; real-world agent cost range corroborated by third-party analysis + official docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Firecrawl pricing stability:** Credit costs (especially agent endpoint 100–1,500+ range) are sourced from docs and third-party analysis. Firecrawl has historically changed pricing without prominent docs updates. Validate actual credit consumption on the first few production calls and calibrate consent gate thresholds.
- **`firecrawl_interact` API surface:** The replacement for deprecated `firecrawl_browser` is confirmed in the MCP server README but its full parameter schema (code execution modes, sessionId lifecycle, error handling) is not fully documented. Read the MCP server source before implementing any browser-session flows in Phase 5.
- **Concurrent worktree rate limiting:** PDE supports up to 20 parallel worktree agents. At Standard plan (50 crawl RPM), 20 agents simultaneously issuing crawl requests would exhaust the rate limit in seconds. The Phase 1 concurrent queue cap (max 2 parallel Firecrawl operations) addresses this, but the exact wiring point in `concurrent-queue.cjs` needs validation during Phase 1 planning.
- **changeTracking diff algorithm keying:** The diff compares against the previous scrape matched on exact URL + team ID. The implications for `firecrawl-cache.cjs` slug-based keying (which strips team ID from the cache filename) need explicit verification during Phase 5 planning.

---

## Sources

### Primary (HIGH confidence)
- [Firecrawl MCP Server docs](https://docs.firecrawl.dev/mcp-server) — 12 tool names, HTTP endpoint, `firecrawl_browser` deprecation
- [Firecrawl CLI docs](https://docs.firecrawl.dev/sdks/cli) — all flags, auth, telemetry disable, credential storage paths
- [Firecrawl Rate Limits](https://docs.firecrawl.dev/rate-limits) — RPM tables by plan and endpoint, concurrent browser session limits
- [Firecrawl Crawl Feature](https://docs.firecrawl.dev/features/crawl) — 10,000-page default limit, async job model, 24h result retention
- [Firecrawl Change Tracking](https://docs.firecrawl.dev/features/change-tracking) — git-diff vs JSON mode, changeStatus values, markdown co-request requirement
- [Firecrawl Browser Feature](https://docs.firecrawl.dev/features/browser) — 2 credits/browser-minute, 20-session limit, TTL defaults
- [firecrawl/cli GitHub](https://github.com/firecrawl/cli) — v1.12.2 confirmed, credential file paths
- [firecrawl/firecrawl-mcp-server GitHub](https://github.com/firecrawl/firecrawl-mcp-server) — credit threshold env vars, `firecrawl_browser` deprecation confirmed
- PDE `bin/lib/mcp-bridge.cjs` (direct codebase read) — APPROVED_SERVERS + TOOL_MAP structure, probe/degrade contract
- PDE `workflows/competitive.md` (direct codebase read) — WEBSEARCH_AVAILABLE probe pattern being migrated
- PDE `workflows/wireframe.md` (direct codebase read) — Stitch CONSENT-01 gate as model for agent consent gate

### Secondary (MEDIUM confidence)
- [Firecrawl Pricing](https://www.firecrawl.dev/pricing) — credit costs per operation; subject to change without docs update
- [Firecrawl Browser Sandbox blog](https://www.firecrawl.dev/blog/introducing-browser-sandbox) — session limit context; marketing blog, not full API reference
- [Spark 1 Pro and Mini models](https://www.firecrawl.dev/blog/introducing-spark-1) — agent model tiers (spark-1-mini vs spark-1-pro) and cost tradeoffs
- `npm show firecrawl-mcp version` / `npm show firecrawl-cli version` — versions 3.11.0 and 1.12.2 confirmed locally

### Tertiary (LOW confidence — verify during implementation)
- [Firecrawl Pricing Breakdown — ScrapeGraphAI](https://scrapegraphai.com/blog/firecrawl-pricing) — 9-credit/page worst case and agent 100–1,500+ credits range; third-party source, corroborates but does not replace official pricing
- [Firecrawl vs Playwright — Grokipedia](https://grokipedia.com/page/Firecrawl_vs_Playwright) — use-case boundary analysis; single secondary source

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
