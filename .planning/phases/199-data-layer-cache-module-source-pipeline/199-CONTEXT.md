# Phase 199: Data Layer — Cache Module + Source Pipeline - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

All Firecrawl output flows to disk through a single, tested CJS module before any workflow is modified — preventing context window overflow and establishing the source pipeline that brief, researcher, and /pde:source all depend on.

Requirements: CRL-03, CRL-02

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md:
- Cache module before workflow integrations — brief, researcher, and /pde:source all write to firecrawl-cache; cache module must exist before any workflow touches disk
- firecrawl-cache.cjs must be a single tested CJS module (matching existing bin/lib/ pattern)
- .planning/research/firecrawl-cache/ directory must be gitignored

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
