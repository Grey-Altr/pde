# Phase 162: Multi-Editor Bridge - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Cursor and Gemini CLI users can access PDE tools via the WebMCP relay without circular relay loops or unauthorized access. This phase adds the PDE remote MCP server to mcp-bridge.cjs APPROVED_SERVERS and implements a relay depth guard via X-PDE-Relay-Depth header.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Multi-Editor Bridge — MEB-01 through MEB-03 define acceptance criteria
- `.planning/ROADMAP.md` §Phase 162 — Success criteria and dependency on Phase 156

### Existing Infrastructure
- `bin/lib/mcp-bridge.cjs` — APPROVED_SERVERS registry, probe/degrade contracts, transport config
- `dashboard/app/api/mcp/route.ts` — Remote MCP server route handler (Phase 156)
- `dashboard/lib/mcp/server-factory.ts` — Shared MCP server construction

### Prior Phase Infrastructure
- `.planning/phases/156-remote-mcp-server-foundation/` — Remote MCP server foundation artifacts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mcp-bridge.cjs` APPROVED_SERVERS registry — established pattern for adding new servers
- Origin guard in MCP route handler — can be extended for relay depth checking
- Existing relay tests in `tests/` — patterns for testing relay behavior

### Established Patterns
- APPROVED_SERVERS entries have: displayName, transport, url, installCmd, probeTimeoutMs, probeTool, probeArgs
- Origin validation happens before auth in MCP route handler
- Source-inspection tests for structural verification

### Integration Points
- mcp-bridge.cjs APPROVED_SERVERS gets a new entry for PDE remote MCP server
- MCP route handler gets X-PDE-Relay-Depth header check
- Cursor/Gemini CLI config examples for connecting to PDE relay

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>

---

*Phase: 162-multi-editor-bridge*
*Context gathered: 2026-03-28*
