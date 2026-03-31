---
phase: 200-core-scraping-tools-competitive-recommend-integration
plan: "01"
subsystem: firecrawl-command
one-liner: "/pde:firecrawl command dispatcher and workflow prose exposing all five Firecrawl MCP tools with credit guards, cache writes, and crawl cap enforcement"
tags:
  - firecrawl
  - mcp
  - scraping
  - credit-guard
  - cache
  - command
dependency_graph:
  requires:
    - bin/lib/firecrawl-cache.cjs (Phase 199)
    - bin/lib/mcp-bridge.cjs probeFirecrawl/checkFirecrawlCredits/acquireFirecrawlSemaphore/incrementFirecrawlUsage (Phase 198)
    - mcp__firecrawl__* TOOL_MAP entries (Phase 198)
  provides:
    - commands/firecrawl.md (/pde:firecrawl command dispatcher)
    - workflows/firecrawl.md (workflow prose for scrape/search/map/extract/crawl subcommands)
  affects:
    - 200-02 (competitive.md + recommend.md integration consumes same probeFirecrawl pattern)
tech_stack:
  added: []
  patterns:
    - probeFirecrawl() credit guard via node --input-type=module pattern
    - acquireFirecrawlSemaphore() concurrency control before each MCP call
    - incrementFirecrawlUsage() credit tracking after each call
    - writeSource()/writeCrawl() disk I/O via firecrawl-cache.cjs
    - FIRECRAWL_CRAWL_MAX_PAGES cap enforcement in crawl subcommand
    - WebSearch/WebFetch fallback when Firecrawl unavailable
key_files:
  created:
    - commands/firecrawl.md
    - workflows/firecrawl.md
  modified: []
decisions:
  - "onlyMainContent: true is the default for scrape (not optional per SCR-01)"
  - "extract halts with error when Firecrawl unavailable — no fallback (no free structured extraction equivalent)"
  - "crawl/map haveNo full fallback when Firecrawl unavailable — skip with error"
  - "search/scrape/map fall back to WebSearch/WebFetch when Firecrawl unavailable"
metrics:
  duration_seconds: 123
  completed_date: "2026-03-31"
  tasks_completed: 1
  tasks_total: 1
  files_created: 2
  files_modified: 0
---

# Phase 200 Plan 01: Firecrawl Command + Workflow Summary

## What Was Built

Created the `/pde:firecrawl` command exposing all five Firecrawl MCP tools (scrape, search, map, extract, crawl) with full credit guards, cache integration, and crawl cap enforcement.

**commands/firecrawl.md** — command dispatcher:
- Frontmatter with `name: pde:firecrawl`
- All 6 Firecrawl MCP tool names in `allowed-tools` (scrape, search, map, extract, crawl, check_crawl_status) plus WebSearch and WebFetch for fallbacks
- Routes to `@workflows/firecrawl.md` with `$ARGUMENTS` passthrough

**workflows/firecrawl.md** — workflow prose for 6 subcommand sections:
- **scrape**: probeFirecrawl → acquireFirecrawlSemaphore → firecrawl_scrape (onlyMainContent: true) → incrementFirecrawlUsage(1) → writeSource → display
- **search**: probe → firecrawl_search with category/since filters → cache each scraped result via writeSource (SCR-05)
- **map**: probe → firecrawl_map with optional filter/subdomains → display URL list
- **extract**: parse --schema parameter (error if missing, error if invalid JSON) → probe → firecrawl_extract → incrementFirecrawlUsage(5)
- **crawl**: cap enforcement (FIRECRAWL_CRAWL_MAX_PAGES) → probe → firecrawl_crawl → poll check_crawl_status every 5s → 5-min timeout with partial results → writeCrawl
- **default**: usage help with all subcommands and examples

## Requirements Satisfied

| Req | Description | Status |
|-----|-------------|--------|
| SCR-01 | Scrape URL to markdown via firecrawl_scrape with onlyMainContent default | DONE |
| SCR-02 | Search via firecrawl_search with category/time filters | DONE |
| SCR-03 | Discover URLs via firecrawl_map with search filter and subdomain control | DONE |
| SCR-04 | Extract structured JSON via firecrawl_extract with user-supplied schema | DONE |
| SCR-05 | Search + immediate scrape of results via scrapeOptions caching | DONE |
| CRL-01 | Crawl with FIRECRAWL_CRAWL_MAX_PAGES cap, truncation + notification | DONE |

## Verification

All plan verification commands pass:
- `grep "pde:firecrawl" commands/firecrawl.md` — returns command name ✓
- `grep -c "mcp__firecrawl__firecrawl_" commands/firecrawl.md` — returns 6 ✓
- `grep "FIRECRAWL_CRAWL_MAX_PAGES" workflows/firecrawl.md` — shows cap enforcement ✓
- `grep "onlyMainContent" workflows/firecrawl.md` — shows default setting ✓
- `grep "writeSource\|writeCrawl" workflows/firecrawl.md` — shows cache integration ✓
- `grep "probeFirecrawl" workflows/firecrawl.md` — shows credit guard in all subcommands ✓
- `grep "schema" workflows/firecrawl.md` — shows parameter-based schema (SCR-04) ✓

## Commits

| Hash | Message |
|------|---------|
| 3eecf93 | feat(200-01): create /pde:firecrawl command and workflow with all 5 subcommands |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all subcommands have full workflow prose with no placeholder content.

## Self-Check: PASSED

- [x] commands/firecrawl.md exists with `name: pde:firecrawl`
- [x] workflows/firecrawl.md exists with all 5 subcommand sections
- [x] Commit 3eecf93 verified in git log
- [x] All acceptance criteria verified via grep
