---
phase: 200-core-scraping-tools-competitive-recommend-integration
verified: 2026-03-30T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 200: Core Scraping Tools + Competitive/Recommend Integration Verification Report

**Phase Goal:** All five Firecrawl scraping/search MCP tools are available inline, firecrawl_crawl enforces its credit safety cap, and the two highest-value existing workflows (competitive analysis, recommend) use Firecrawl as their primary web intelligence layer

**Verified:** 2026-03-30
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | User can run /pde:firecrawl scrape and receive cached markdown | VERIFIED | workflows/firecrawl.md contains full scrape subcommand: probeFirecrawl → acquireFirecrawlSemaphore → firecrawl_scrape (onlyMainContent: true) → writeSource |
| 2 | User can run /pde:firecrawl search and receive filtered results | VERIFIED | workflows/firecrawl.md contains full search subcommand with category/since/limit parsing and firecrawl_search call |
| 3 | User can run /pde:firecrawl map and discover all site URLs | VERIFIED | workflows/firecrawl.md contains map subcommand with firecrawl_map call, --search filter, --subdomains flag |
| 4 | User can run /pde:firecrawl extract with --schema and receive structured data | VERIFIED | workflows/firecrawl.md contains extract subcommand; schema required as parameter, halts with error if missing or invalid JSON; CRITICAL note enforces no hard-coding |
| 5 | User can run /pde:firecrawl crawl and never exceed FIRECRAWL_CRAWL_MAX_PAGES | VERIFIED | workflows/firecrawl.md crawl subcommand reads env var, applies cap enforcement with truncation warning, sets EFFECTIVE_LIMIT = FIRECRAWL_CRAWL_MAX_PAGES when exceeded |
| 6 | /pde:competitive uses Firecrawl when available, falls back to WebSearch | VERIFIED | workflows/competitive.md Step 3 probeFirecrawl() at line 235 (inside LOCKED boundary, before line 259); Step 4b IF FIRECRAWL_AVAILABLE block calls firecrawl_search + firecrawl_scrape + firecrawl_extract; ELSE branch at line 336 routes to WebSearch |
| 7 | /pde:recommend probes Firecrawl independently and uses firecrawl_search for tool discovery | VERIFIED | workflows/recommend.md Step 3 probeFirecrawl() at line 188 (inside LOCKED boundary, before line 210); Step 4b item 3 calls firecrawl_search with technology category for live tool discovery; deduplication against mcp-compass and WebSearch results |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `commands/firecrawl.md` | /pde:firecrawl command dispatcher | VERIFIED | Exists; frontmatter name=pde:firecrawl; 6 Firecrawl MCP tools in allowed-tools (scrape, search, map, extract, crawl, check_crawl_status) plus WebSearch and WebFetch; routes to @workflows/firecrawl.md |
| `workflows/firecrawl.md` | Workflow prose for all five subcommands plus crawl cap | VERIFIED | Exists; 456 lines; all 5 subcommands present plus default help; FIRECRAWL_CRAWL_MAX_PAGES enforcement in crawl; onlyMainContent: true in scrape; writeSource in scrape and search; writeCrawl in crawl; probeFirecrawl in every subcommand |
| `commands/competitive.md` | Updated allowed-tools with Firecrawl MCP tools | VERIFIED | Contains mcp__firecrawl__firecrawl_scrape (line 13), mcp__firecrawl__firecrawl_search (line 14), mcp__firecrawl__firecrawl_extract (line 15); existing tools preserved |
| `workflows/competitive.md` | FIRECRAWL_AVAILABLE probe block + Firecrawl-enhanced competitor analysis | VERIFIED | FIRECRAWL_AVAILABLE appears 5 times; probeFirecrawl at line 235 inside LOCKED section; Step 4b enrichment block with firecrawl_search + firecrawl_scrape + firecrawl_extract; ELSE branch with WebSearch fallback; --no-firecrawl flag added; LOCKED boundaries intact at lines 1 and 259 |
| `commands/recommend.md` | Updated allowed-tools with Firecrawl search tool | VERIFIED | Contains mcp__firecrawl__firecrawl_search at line 13; existing tools preserved |
| `workflows/recommend.md` | Firecrawl dual-probe and enhanced catalog discovery | VERIFIED | FIRECRAWL_AVAILABLE appears 5 times; probeFirecrawl at line 188 inside LOCKED section (closes at line 210); Step 4b item 3 with firecrawl_search for tool discovery; --no-firecrawl flag at lines 41 and 49; LOCKED boundaries intact |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| commands/firecrawl.md | workflows/firecrawl.md | @workflows/firecrawl.md reference | WIRED | Line 26: "Follow @workflows/firecrawl.md exactly, passing all of $ARGUMENTS" |
| workflows/firecrawl.md | bin/lib/firecrawl-cache.cjs | writeSource and writeCrawl calls | WIRED | writeSource called in scrape (line 81) and search (line 153); writeCrawl called in crawl (line 392) |
| workflows/firecrawl.md | bin/lib/mcp-bridge.cjs | probeFirecrawl and credit guard calls | WIRED | probeFirecrawl at lines 35, 118, 194, 261, 332; acquireFirecrawlSemaphore at lines 49, 344; incrementFirecrawlUsage throughout |
| workflows/competitive.md | bin/lib/mcp-bridge.cjs | probeFirecrawl() call in Step 3 | WIRED | probeFirecrawl at line 240 inside LOCKED section |
| workflows/recommend.md | bin/lib/mcp-bridge.cjs | probeFirecrawl() call in Step 3 | WIRED | probeFirecrawl at line 193 inside LOCKED section |

---

### Data-Flow Trace (Level 4)

Not applicable — all artifacts are workflow prose files (markdown instruction documents for Claude), not components or pages that render dynamic data from a data source. The data flows through Firecrawl MCP tool calls and firecrawl-cache.cjs at runtime when Claude executes the workflows.

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — artifacts are Claude workflow prose files, not runnable code with entry points.

Dependency files confirmed present:
- `bin/lib/firecrawl-cache.cjs` (8,714 bytes, from Phase 199)
- `bin/lib/mcp-bridge.cjs` (47,346 bytes, from Phase 198)

All 3 commits verified in git history:
- `3eecf93` — feat(200-01): create /pde:firecrawl command and workflow with all 5 subcommands
- `f1286f8` — feat(200-02): add Firecrawl MCP tools to competitive and recommend allowed-tools
- `4602915` — feat(200-02): add Firecrawl probe and enhancement to competitive and recommend workflows

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| SCR-01 | 200-01 | User can scrape any URL to clean markdown via firecrawl_scrape with onlyMainContent default | SATISFIED | workflows/firecrawl.md scrape subcommand: onlyMainContent: true at line 59, labeled "(SCR-01)" at line 63 |
| SCR-02 | 200-01 | User can search the web via firecrawl_search with source, category, and time filters | SATISFIED | workflows/firecrawl.md search subcommand: --category and --since flags parsed, passed as searchOptions.category and searchOptions.after |
| SCR-03 | 200-01 | User can discover all URLs on a site via firecrawl_map with search filtering and subdomain control | SATISFIED | workflows/firecrawl.md map subcommand: --search FILTER and --subdomains flags supported, passed to firecrawl_map |
| SCR-04 | 200-01 | User can extract structured JSON from pages via firecrawl_extract with schema definitions | SATISFIED | workflows/firecrawl.md extract subcommand: --schema required parameter, halts on missing/invalid JSON, CRITICAL note at line 253 enforces no hard-coding |
| SCR-05 | 200-01 | User can search and immediately scrape top results via scrapeOptions caching | SATISFIED | workflows/firecrawl.md search Step 5 (line 146): caches result content via writeSource if results contain scraped content; credits tracked per page |
| CRL-01 | 200-01 | User can crawl entire sites with enforced --limit and --max-depth preventing runaway credit burn | SATISFIED | workflows/firecrawl.md crawl Step 1: reads FIRECRAWL_CRAWL_MAX_PAGES, enforces cap with truncation warning, sets EFFECTIVE_LIMIT (lines 314-324) |
| PIP-01 | 200-02 | Competitive analysis workflow uses Firecrawl to crawl competitor sites and extract pricing, features, and positioning | SATISFIED | workflows/competitive.md Step 4b: firecrawl_search for pricing page discovery, firecrawl_scrape for main page extraction, firecrawl_extract with pricing/positioning schema (lines 322-338) |

No orphaned requirements — all 7 IDs from plan frontmatter accounted for and satisfied.

---

### Anti-Patterns Found

No anti-patterns found. Scanned commands/firecrawl.md and workflows/firecrawl.md:
- No TODO/FIXME/PLACEHOLDER comments
- No empty implementations (return null, return {}, etc.)
- No hardcoded empty data arrays or objects passed to rendering paths

The schema in workflows/competitive.md Step 4b enrichment is labeled "a SUGGESTED starting point" (not hard-coded per SCR-04 — that requirement applies specifically to the /pde:firecrawl extract subcommand, which correctly requires --schema as a user-supplied parameter).

---

### Human Verification Required

None. All phase requirements are verifiable from workflow prose structure. The workflows follow the standard PDE pattern (probe/guard/call/cache) and all integration points are confirmed wired.

---

## Gaps Summary

No gaps. All 7 observable truths verified, all 6 artifacts substantive and wired, all 5 key links confirmed, all 7 requirement IDs satisfied. Phase goal is fully achieved.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
