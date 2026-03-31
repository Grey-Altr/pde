# Requirements: PDE v0.25 Firecrawl Deep Web Integration

**Defined:** 2026-03-30
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v1 Requirements

Requirements for v0.25 milestone. Each maps to roadmap phases.

### Foundation

- [x] **FND-01**: User can register Firecrawl as an approved MCP server in mcp-bridge.cjs with TOOL_MAP entries for all supported tools
- [x] **FND-02**: User can configure Firecrawl API key via PDE config.json with probe/degrade contract validating connectivity on first use
- [x] **FND-03**: User can view remaining Firecrawl credits in the tmux dashboard and session summaries, with 80% depletion warning
- [x] **FND-04**: User experiences graceful degradation when Firecrawl credits are exhausted or API is unreachable, falling back to WebSearch/WebFetch

### Core Scraping & Search

- [x] **SCR-01**: User can scrape any URL to clean markdown via firecrawl_scrape MCP tool with onlyMainContent default
- [x] **SCR-02**: User can search the web via firecrawl_search MCP tool with source, category, and time filters
- [x] **SCR-03**: User can discover all URLs on a site via firecrawl_map MCP tool with search filtering and subdomain control
- [x] **SCR-04**: User can extract structured JSON from pages via firecrawl_extract with schema definitions
- [x] **SCR-05**: User can search and immediately scrape top results in a single firecrawl_search call with scrapeOptions

### Deep Crawling & Ingestion

- [x] **CRL-01**: User can crawl entire sites via firecrawl_crawl with enforced --limit and --max-depth defaults preventing runaway credit burn
- [x] **CRL-02**: User can add URLs as source material via /pde:source add <url> which scrapes/crawls content into the source pipeline
- [x] **CRL-03**: Scraped and crawled content is stored in .planning/research/firecrawl-cache/ via firecrawl-cache.cjs with slug-based access and gitignore

### Agent & Browser

- [x] **AGT-01**: User can delegate natural language web research to firecrawl_agent with mandatory maxCredits cap and user consent gate
- [x] **AGT-02**: User can check agent job status and retrieve structured JSON results via firecrawl_agent_status
- [ ] **AGT-03**: User can launch cloud browser sessions via firecrawl_interact for auth-gated content extraction with session TTL management
- [ ] **AGT-04**: User can execute Playwright code in browser sandbox sessions and extract content from authenticated pages

### Pipeline Integration

- [x] **PIP-01**: Competitive analysis workflow uses Firecrawl to crawl competitor sites and extract pricing, features, and positioning
- [x] **PIP-02**: Research agents (project-researcher, phase-researcher) use Firecrawl scrape/search with escalation ladder (WebSearch free → Firecrawl when JS rendering or structured extraction needed)
- [x] **PIP-03**: Design reference URLs scraped via Firecrawl feed into wireframe, mockup, and system skill context
- [x] **PIP-04**: Brief workflow accepts URLs and scrapes them as reference material via Firecrawl, stored in source pipeline

### Change Tracking & Monitoring

- [ ] **CHG-01**: User can track changes on competitor/dependency sites via changeTracking format with semantic markdown diffs
- [ ] **CHG-02**: Firecrawl operations emit structured NDJSON events to the event bus for dashboard display and session archival

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Browser

- **AGT-05**: User can persist browser profiles across sessions for repeated auth-gated access
- **AGT-06**: User can run parallel browser sessions for batch content extraction

### Scheduling

- **CHG-03**: User can schedule periodic change tracking via external cron integration (GitHub Actions / Vercel cron)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replace Playwright MCP with browser sandbox | Different jobs — Playwright serves visual testing/screenshots for critique/mockup; browser sandbox serves auth-gated extraction |
| Firecrawl for every URL fetch | 1 credit/page burns budget; WebFetch is free; routing policy enforces escalation |
| Unlimited crawl depth | Burns hundreds of credits; enforced --max-depth 3 and --limit 100 defaults |
| Store all scraped content in git | Gigabytes of noise ruins git diff; cache to gitignored .planning/research/firecrawl-cache/ |
| JSON-mode change tracking by default | 5 credits/page vs 0 for git-diff mode; opt-in only |
| In-PDE scraping scheduler | PDE is a design/dev pipeline, not a monitoring platform; document external cron instead |
| Self-hosted Firecrawl support | Requires user to run Firecrawl OSS locally; out of scope for v0.25 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 198 | Complete |
| FND-02 | Phase 198 | Complete |
| FND-03 | Phase 198 | Complete |
| FND-04 | Phase 198 | Complete |
| CRL-03 | Phase 199 | Complete |
| CRL-02 | Phase 199 | Complete |
| SCR-01 | Phase 200 | Complete |
| SCR-02 | Phase 200 | Complete |
| SCR-03 | Phase 200 | Complete |
| SCR-04 | Phase 200 | Complete |
| SCR-05 | Phase 200 | Complete |
| CRL-01 | Phase 200 | Complete |
| PIP-01 | Phase 200 | Complete |
| PIP-02 | Phase 201 | Complete |
| PIP-03 | Phase 201 | Complete |
| PIP-04 | Phase 201 | Complete |
| AGT-01 | Phase 202 | Complete |
| AGT-02 | Phase 202 | Complete |
| AGT-03 | Phase 202 | Pending |
| AGT-04 | Phase 202 | Pending |
| CHG-01 | Phase 203 | Pending |
| CHG-02 | Phase 203 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 — traceability populated after roadmap creation*
