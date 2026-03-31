# Phase 202: /pde:firecrawl Standalone Skill + Agent + Browser Sandbox - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Users have a dedicated `/pde:firecrawl` command exposing all six Firecrawl operations — including the autonomous research agent and browser sandbox — with consent gates and credit caps on every high-cost operation.

Requirements: AGT-01, AGT-02, AGT-03, AGT-04

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md and ROADMAP:
- Depends on Phase 199 (firecrawl-cache.cjs) and Phase 200 (Firecrawl tools available)
- Phase 200 already created commands/firecrawl.md and workflows/firecrawl.md with scrape/search/map/extract/crawl subcommands — Phase 202 EXTENDS these files with agent and interact subcommands
- firecrawl_agent requires consent gate showing estimated credit cost — agent call does NOT proceed without explicit user confirmation
- Every agent dispatch must include --max-credits cap
- firecrawl_agent_status returns current status and structured JSON results when complete
- firecrawl_interact launches cloud browser session with documented TTL — auto-terminated on expiry
- User can execute Playwright code inside browser sandbox session
- Blocker: changeTracking format requires markdown co-requested — verify before writing watch subcommand
- Blocker: git-diff mode (free) vs JSON mode (5 credits/page) — default to git-diff, JSON mode explicit opt-in only

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
