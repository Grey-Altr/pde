# Phase 198: Foundation — MCP Registration + Credit Guards - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Firecrawl is a registered, probe-verified MCP server in PDE with all cost-protection mechanisms in place — credit guards, graceful degradation, and tool routing policy — before any workflow calls a single Firecrawl endpoint.

Requirements: FND-01, FND-02, FND-03, FND-04

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md:
- Foundation before everything — credit guards and TOOL_MAP must exist before any workflow calls a Firecrawl endpoint
- Concurrent worktree rate limiting — at Standard plan (50 crawl RPM), 20 parallel agents could exhaust rate limit in seconds; must include max-2-parallel Firecrawl operations guard wired into concurrent-queue.cjs
- API key in .env only — never in config.json (version-controlled)

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
