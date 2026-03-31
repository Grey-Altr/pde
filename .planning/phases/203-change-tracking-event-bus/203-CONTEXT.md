# Phase 203: Change Tracking + Event Bus - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Users can monitor competitor or dependency pages for content changes, with semantic diffs surfaced in the dashboard and every Firecrawl operation producing a structured NDJSON event for session archival.

Requirements: CHG-01, CHG-02

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md and ROADMAP:
- Depends on Phase 199 (firecrawl-cache.cjs)
- changeTracking format requires markdown to be co-requested in the same call as changeTracking; omitting it produces silent empty diffs — verify before writing watch subcommand prose
- git-diff mode (free) vs JSON mode (5 credits/page) cost difference must be enforced in workflow prose — default to git-diff, JSON mode explicit opt-in only
- /pde:firecrawl watch <url> produces markdown diff showing what changed since baseline snapshot
- Diffs written to .planning/research/firecrawl-cache/snapshots/ — not injected inline
- Every Firecrawl operation (scrape, search, crawl, agent, watch) emits NDJSON event to event bus
- Events must include url, slug, word_count, and operation fields
- Dashboard Pane 5 displays change summary when monitored page diff is non-empty

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
