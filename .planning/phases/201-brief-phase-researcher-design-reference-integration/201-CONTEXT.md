# Phase 201: Brief + Phase Researcher + Design Reference Integration - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Firecrawl is wired into the three source-material-consuming workflows — brief, pde-phase-researcher, and design reference — so that any URL passed to these workflows produces cache-backed semantic context rather than an inline content dump.

Requirements: PIP-02, PIP-03, PIP-04

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md and ROADMAP:
- Depends on Phase 199 (firecrawl-cache.cjs) and Phase 200 (Firecrawl tools available)
- brief.md --source-url flag: scrape URL via Firecrawl, write to firecrawl-cache, inject ## Source Material section into BRF
- pde-phase-researcher.md: add ## Web Evidence section from firecrawl_search + firecrawl_scrape when FIRECRAWL_AVAILABLE is true; section absent (not empty) when false
- Design reference URLs in wireframe/mockup/system: scrape via Firecrawl, feed into design context; don't use WebFetch when Firecrawl is available
- All output must flow through firecrawl-cache.cjs (writeSource/readSource)
- Graceful fallback to WebFetch when Firecrawl unavailable

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
