# Phase 196: Containerized MCP Servers - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase)

<domain>
## Phase Boundary

Each approved MCP server runs in its own Docker container with a pinned runtime, and the probe/degrade contract accounts for container startup latency so degradation does not fire on normal cold starts.

</domain>

<decisions>
## Implementation Decisions

All at Claude's discretion — pure infrastructure phase. Key constraints from research:
- Only stdio-transport servers get containers (playwright, stitch) — HTTP/SSE servers are external
- `-i` flag required (stdin open), `-t` forbidden (corrupts MCP binary framing)
- Docker unavailability degrades gracefully — falls back to non-containerized npx launch
- Probe timeout extends by container.startupMs (5s default) when Docker available
- dockerode already available from Phase 191

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/pde-mcp-server/lib/approved-servers.cjs` — APPROVED_SERVERS list with installCmd, probeTimeoutMs
- `packages/pde-mcp-server/lib/mcp-lifecycle.cjs` — Server launch, probe, degrade logic
- `packages/cloud-adapter/index.cjs` — dockerode patterns from Phase 191

### Integration Points
- APPROVED_SERVERS entries need container block: { image, tag, startupMs }
- Server launch code needs Docker branch before npx fallback
- Probe timeout function needs container startup addition
- isDockerAvailable() check with caching (dockerode.ping())

</code_context>

<specifics>
## Specific Ideas

None beyond research findings — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

- Custom MCP server images with pre-installed deps — future optimization
- Container resource limits per server — future
- MCP server health monitoring dashboard — separate phase

</deferred>
