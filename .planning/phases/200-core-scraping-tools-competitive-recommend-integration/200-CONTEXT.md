# Phase 200: Core Scraping Tools + Competitive/Recommend Integration - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

All five Firecrawl scraping/search MCP tools are available inline, firecrawl_crawl enforces its credit safety cap, and the two highest-value existing workflows (competitive analysis, recommend) use Firecrawl as their primary web intelligence layer.

Requirements: SCR-01, SCR-02, SCR-03, SCR-04, SCR-05, CRL-01, PIP-01

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md:
- Phases 200 and 201 can run in parallel once 198+199 are done — Phase 200 only needs TOOL_MAP (Phase 198)
- firecrawl_crawl must enforce FIRECRAWL_CRAWL_MAX_PAGES limit (50 pages default) — requests above cap truncated with user notification
- competitive.md must check FIRECRAWL_AVAILABLE before calling Firecrawl tools — graceful fallback to WebSearch
- recommend.md dual-probe: check both WebSearch and Firecrawl availability
- CRL-01 (full site crawl) belongs in Phase 200 with scraping tools — crawl is superset of map+scrape
- All Firecrawl output must flow through firecrawl-cache.cjs (Phase 199 dependency)

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
