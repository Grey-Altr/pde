# Requirements: Platform Development Engine

**Defined:** 2026-03-28
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.19 Requirements

Requirements for WebMCP Integration milestone. Each maps to roadmap phases.

### Remote Infrastructure

- [x] **RMT-01**: User can access PDE tools via Streamable HTTP endpoint at dashboard/app/api/mcp/route.ts
- [x] **RMT-02**: Remote MCP server authenticates requests via Clerk-issued tokens with mcp-auth RFC 9728 validation
- [x] **RMT-03**: Remote MCP server validates Origin header against explicit allowlist on every request
- [x] **RMT-04**: Remote MCP server uses stateless per-request transport (sessionIdGenerator: undefined) for Vercel compatibility
- [x] **RMT-05**: Shared server-factory.ts extracts McpServer construction for reuse by both stdio and HTTP transports
- [x] **RMT-06**: Long-running tool calls use polling pattern to stay within Vercel timeout limits
- [x] **RMT-07**: Desktop clients can connect via documented npx @mcp-b/webmcp-local-relay bridge (zero code change)

### Browser Integration

- [x] **BRW-01**: Dashboard registers WebMCP tools via useWebMCP() hooks with @mcp-b/global polyfill initialization
- [x] **BRW-02**: useMcpTool() hook enforces strict mount/unmount lifecycle preventing zombie tool registrations
- [x] **BRW-03**: Dashboard provides initial tool registrations for design state, project info, and artifact listing
- [x] **BRW-04**: use-mcp-client.ts provides thin fetch-based MCP JSON-RPC hook (no SDK in browser bundle)
- [x] **BRW-05**: 7th context-sync.cjs emitter writes .webmcp/config.json for WebMCP client discovery
- [x] **BRW-06**: .webmcp/config.json added to MONITORED_FILES for auto-regeneration on .planning/ changes

### Rich UI & Previews

- [x] **RUI-01**: Tool handlers return type: 'resource' blocks with text/html;profile=mcp-app MIME plus text fallback
- [x] **RUI-02**: MCP App HTML resources declare required origins in _meta.ui.csp.connectDomains
- [x] **RUI-03**: Design artifacts accessible via ui://pde/[artifact] resource scheme in AI chat clients
- [x] **RUI-04**: Token playground UI component displays per-tool cost breakdown via @ai-sdk/mcp
- [x] **RUI-05**: Token playground shows session context window utilization view with cost aggregation in Upstash Redis

### Workflow Integration

- [x] **WFL-01**: Approval gates exposed as declarative WebMCP tool forms replacing imperative approval flow
- [x] **WFL-02**: --webmcp flag added to wireframe.md for WebMCP-enhanced output
- [x] **WFL-03**: --webmcp flag added to mockup.md for WebMCP-enhanced output
- [x] **WFL-04**: --webmcp flag added to critique.md for WebMCP-enhanced output
- [x] **WFL-05**: --webmcp flag added to competitive.md for WebMCP-enhanced output

### Advanced Tools

- [ ] **ADV-01**: competitive.md generates optional WebMCP tool stubs from competitor analysis
- [ ] **ADV-02**: Auto-generated tools pass through sanitization pipeline (strip instruction syntax, 512-char limit, source: "auto-generated")
- [ ] **ADV-03**: Auto-generated competitor tools require mandatory human review gate before activation
- [ ] **ADV-04**: Competitor tool registry stored in .webmcp/competitor-tools-registry.json

### Multi-Editor Bridge

- [ ] **MEB-01**: Cursor and Gemini CLI can access PDE tools via WebMCP relay endpoint
- [ ] **MEB-02**: Relay includes X-PDE-Relay-Depth header guard preventing circular relay cycles
- [ ] **MEB-03**: mcp-bridge.cjs APPROVED_SERVERS updated with remote MCP server entry

## Future Requirements

### Remote Collaboration (deferred from v0.19)

- **COL-01**: Clerk org-level namespace scoping for multi-user MCP sessions
- **COL-02**: Real-time cross-session state sharing during execution

### Full OAuth Provider (deferred)

- **OAT-01**: PDE issues tokens to external MCP clients (currently validate-only via mcp-auth)

### Cost Controls (deferred)

- **CST-01**: Spend caps with accurate token counting and API integration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Remote collaboration surface | Most complex integration — defer until WebMCP foundation is stable |
| Full OAuth provider (PDE issuing tokens) | Use mcp-auth validate-only for now; full provider is premature |
| Real-time cross-session state sharing | Conflicts with file-based state model; needs architectural rethink |
| Cost controls and spend caps | Requires accurate token counting + API integration not yet available |
| Running full PDE plugin in cloud | PDE Standalone CLI milestone scope, not v0.19 |
| Cookie/session persistence in .planning/ | Security risk — ephemeral browser sessions only |
| Full web scraping via WebMCP | Scope creep — WebMCP only for PDE artifacts and design workflows |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RMT-01 | Phase 156 | Complete |
| RMT-02 | Phase 156 | Complete |
| RMT-03 | Phase 156 | Complete |
| RMT-04 | Phase 156 | Complete |
| RMT-05 | Phase 156 | Complete |
| RMT-06 | Phase 156 | Complete |
| RMT-07 | Phase 156 | Complete |
| BRW-01 | Phase 157 | Complete |
| BRW-02 | Phase 157 | Complete |
| BRW-03 | Phase 157 | Complete |
| BRW-04 | Phase 157 | Complete |
| BRW-05 | Phase 157 | Complete |
| BRW-06 | Phase 157 | Complete |
| RUI-01 | Phase 158 | Complete |
| RUI-02 | Phase 158 | Complete |
| RUI-03 | Phase 158 | Complete |
| RUI-04 | Phase 159 | Complete |
| RUI-05 | Phase 159 | Complete |
| WFL-01 | Phase 160 | Complete |
| WFL-02 | Phase 160 | Complete |
| WFL-03 | Phase 160 | Complete |
| WFL-04 | Phase 160 | Complete |
| WFL-05 | Phase 160 | Complete |
| ADV-01 | Phase 161 | Pending |
| ADV-02 | Phase 161 | Pending |
| ADV-03 | Phase 161 | Pending |
| ADV-04 | Phase 161 | Pending |
| MEB-01 | Phase 162 | Pending |
| MEB-02 | Phase 162 | Pending |
| MEB-03 | Phase 162 | Pending |

**Coverage:**
- v0.19 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — traceability complete, all 30 requirements mapped to phases 156-162*
