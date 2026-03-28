# Roadmap: Platform Development Engine

## Milestones

- ✅ **v0.1 PDE MVP** — Phases 1-11 (shipped 2026-03-15)
- ✅ **v0.2 Design Pipeline** — Phases 12-22 (shipped 2026-03-16)
- ✅ **v0.3 Advanced Design Skills** — Phases 24-28 (shipped 2026-03-17)
- ✅ **v0.4 Self-Improvement & Design Excellence** — Phases 29-38 (shipped 2026-03-18)
- ✅ **v0.5 MCP Integrations** — Phases 39-45 (shipped 2026-03-19)
- ✅ **v0.6 Advanced Workflow Methodology** — Phases 46-53 (shipped 2026-03-20)
- ✅ **v0.7 Pipeline Reliability & Validation** — Phases 54-57 (shipped 2026-03-20)
- ✅ **v0.8 Observability & Event Infrastructure** — Phases 58-63 (shipped 2026-03-20)
- ✅ **v0.9 Google Stitch Integration** — Phases 64-69 (shipped 2026-03-21)
- ✅ **v0.10 Idle Time Productivity** — Phases 70-73 (shipped 2026-03-21)
- ✅ **v0.11 Experience Product Type** — Phases 74-83 (shipped 2026-03-22)
- ✅ **v0.12 Business Product Type** — Phases 84-98 (shipped 2026-03-23)
- ✅ **v0.13 AutoResearch** — Phases 99-107 (shipped 2026-03-23)
- ✅ **v0.14 Visual AutoResearch** — Phases 108-117 (shipped 2026-03-24)
- ✅ **v0.15 Multi-Editor Integration** — Phases 118-125 (shipped 2026-03-24)
- ✅ **v0.16 Multi-Editor Context Sync** — Phases 126-133 (shipped 2026-03-24)
- ✅ **v0.17 Remote Dashboard** — Phases 134-142 (shipped 2026-03-26)
- ✅ **v0.18 Distributed Execution** — Phases 143-155 (shipped 2026-03-28)
- 🚧 **v0.19 WebMCP Integration** — Phases 156-162 (in progress)

## Phases

### v0.19 WebMCP Integration

**Milestone Goal:** PDE tools are accessible from any browser-based AI agent and any MCP-compatible desktop client via a publicly accessible Streamable HTTP remote server, with rich UI previews, declarative approval gates, auto-generated competitor tools, and multi-editor relay support.

- [x] **Phase 156: Remote MCP Server Foundation** — Streamable HTTP endpoint with Clerk auth, Origin validation, stateless Vercel transport, shared server factory, and desktop relay bridge (completed 2026-03-28)
- [x] **Phase 157: Dashboard WebMCP Tools** — useMcpTool() lifecycle hook, use-mcp-client.ts, initial tool registrations, and context-sync .webmcp emitter (completed 2026-03-28)
- [x] **Phase 158: MCP Apps Rich UI + Design Artifact Preview** — type: 'resource' rich return blocks with MCP Apps HTML MIME, CSP declarations, and ui:// artifact resource scheme (completed 2026-03-28)
- [x] **Phase 159: Token Playground** — Per-tool cost breakdown UI and session context window utilization view via @ai-sdk/mcp and Upstash Redis (completed 2026-03-28)
- [x] **Phase 160: Declarative Approval Gates + Workflow Flags** — Approval gate WebMCP tool forms and --webmcp flag across all four design workflow commands (completed 2026-03-28)
- [ ] **Phase 161: Auto-Generated Competitor Tools** — competitive.md tool stub generation with sanitization pipeline, mandatory human review gate, and competitor registry
- [ ] **Phase 162: Multi-Editor Bridge** — Cursor and Gemini CLI relay to PDE via WebMCP, relay depth guard, and mcp-bridge.cjs APPROVED_SERVERS update

## Phase Details

### Phase 156: Remote MCP Server Foundation
**Goal**: PDE tools are reachable via a publicly accessible, authenticated, stateless Streamable HTTP endpoint that is safe to deploy on Vercel
**Depends on**: Nothing (first phase of v0.19)
**Requirements**: RMT-01, RMT-02, RMT-03, RMT-04, RMT-05, RMT-06, RMT-07
**Success Criteria** (what must be TRUE):
  1. An MCP client can call PDE tools by pointing at the dashboard /api/mcp URL — no local process required
  2. Requests without a valid Clerk token are rejected with an auth error before any tool handler runs
  3. Requests from origins not on the explicit allowlist are rejected on every request type including GET and SSE
  4. Long-running tool calls complete within Vercel timeout limits via a polling handoff rather than a hung connection
  5. Desktop clients (Claude Code, Cursor) connect to the remote server using the documented npx relay with zero code changes in PDE
**Plans:** 3/3 plans complete
Plans:
- [x] 156-01-PLAN.md — Install MCP packages, server factory, origin guard, Wave 0 test scaffolds
- [ ] 156-02-PLAN.md — MCP route handler with Clerk auth, .well-known endpoints, proxy update
- [ ] 156-03-PLAN.md — Polling tool pair for long-running ops, desktop client config docs

### Phase 157: Dashboard WebMCP Tools
**Goal**: The PDE dashboard registers live tools with any browser-based AI agent via the WebMCP API, with safe lifecycle management that prevents zombie registrations
**Depends on**: Phase 156
**Requirements**: BRW-01, BRW-02, BRW-03, BRW-04, BRW-05, BRW-06
**Success Criteria** (what must be TRUE):
  1. A browser AI agent sees PDE tools (design state, project info, artifact listing) available in navigator.modelContext after the dashboard loads
  2. Navigating away from a dashboard section unregisters that section's tools — no stale tools remain after unmount
  3. The dashboard makes MCP JSON-RPC calls without loading the full MCP SDK into the browser bundle
  4. Any WebMCP client can discover the PDE server endpoint by reading .webmcp/config.json without manual configuration
  5. Changes to .planning/ files trigger .webmcp/config.json regeneration automatically
**Plans:** 3/3 plans complete
Plans:
- [x] 157-01-PLAN.md — Install WebMCP packages, providers.tsx initialization, use-mcp-client.ts hook, Wave 0 test scaffolds
- [x] 157-02-PLAN.md — context-sync.cjs emitWebMcpConfig emitter, MONITORED_FILES entry, .webmcp/config.json generation
- [ ] 157-03-PLAN.md — Browser tool hooks (design state, project info, artifacts), API routes, composite hook
**UI hint**: yes

### Phase 158: MCP Apps Rich UI + Design Artifact Preview
**Goal**: PDE tool responses render as interactive HTML inside MCP Apps-capable AI chat clients, and design artifacts are directly previewable via a resource URI scheme
**Depends on**: Phase 157
**Requirements**: RUI-01, RUI-02, RUI-03
**Success Criteria** (what must be TRUE):
  1. Tool responses in MCP Apps-capable clients display a rendered HTML panel rather than raw text for artifacts that support rich display
  2. Tool responses include a plain text fallback that works in stdio MCP clients with no behavior change
  3. Design artifacts are accessible in AI chat clients as renderable resources at ui://pde/[artifact] without downloading files
  4. MCP App HTML panels can call back to PDE's own domain without CSP errors
**Plans**: 2 plans
Plans:
- [x] 158-01-PLAN.md — Install ext-apps SDK, rich tool+resource registration, CSP connectDomains, server-factory wiring
- [ ] 158-02-PLAN.md — Dynamic ui://pde/{artifact} resource template with format-specific rendering

### Phase 159: Token Playground
**Goal**: Users can see the token cost of each PDE tool call and their cumulative session spending directly in the dashboard
**Depends on**: Phase 157
**Requirements**: RUI-04, RUI-05
**Success Criteria** (what must be TRUE):
  1. The token playground UI shows a breakdown of token cost per tool call, attributed to the specific tool that was called
  2. The token playground shows total session context window usage as a percentage with an aggregated cost figure
  3. Session cost data persists across page refreshes using Upstash Redis so the running total is not lost on navigation
**Plans**: 2 plans
Plans:
- [x] 159-01-PLAN.md — TDD deriveToolBreakdown/deriveContextUsage + persistSessionCost server action
- [x] 159-02-PLAN.md — TokenPlayground component, session-detail wiring, SSR Redis hydration
**UI hint**: yes

### Phase 160: Declarative Approval Gates + Workflow Flags
**Goal**: Approval gates are presented as browser-native WebMCP tool forms rather than imperative approval flows, and all four design workflow commands produce WebMCP-enhanced output when requested
**Depends on**: Phase 157
**Requirements**: WFL-01, WFL-02, WFL-03, WFL-04, WFL-05
**Success Criteria** (what must be TRUE):
  1. A browser AI agent can approve or reject a pending PDE gate by calling a declarative WebMCP tool form — no need to navigate to the dashboard UI separately
  2. Running /pde:wireframe --webmcp produces output sections that include WebMCP-specific tooling context
  3. Running /pde:mockup --webmcp, /pde:critique --webmcp, and /pde:competitive --webmcp each produce analogous WebMCP-enhanced output
  4. Existing approval flow continues to work unchanged for users not using the --webmcp flag
**Plans:** 2/2 plans complete
Plans:
- [x] 160-01-PLAN.md — Approval gate browser tool hook, gates API route, composite hook wiring, tests
- [x] 160-02-PLAN.md — --webmcp flag on wireframe, mockup, critique, and competitive workflows

**UI hint**: yes

### Phase 161: Auto-Generated Competitor Tools
**Goal**: The competitive analysis workflow can optionally generate WebMCP tool stubs from competitor data, with mandatory human review before any tool becomes active
**Depends on**: Phase 160
**Requirements**: ADV-01, ADV-02, ADV-03, ADV-04
**Success Criteria** (what must be TRUE):
  1. Running /pde:competitive produces an optional set of WebMCP tool stub definitions derived from competitor analysis
  2. Generated tool descriptions are sanitized — instruction syntax stripped, capped at 512 characters, and tagged source: "auto-generated"
  3. No auto-generated tool can be called by any agent until a human explicitly approves it through the review gate
  4. Approved and pending competitor tool stubs are persisted in .webmcp/competitor-tools-registry.json between sessions
**Plans:** 2 plans
Plans:
- [ ] 161-01-PLAN.md — Workflow Step 8 competitor tool stub generation, sanitization pipeline, registry write, competitor-tools API route
- [ ] 161-02-PLAN.md — useCompetitorTools browser hook, barrel export, composite hook wiring, test updates

### Phase 162: Multi-Editor Bridge
**Goal**: Cursor and Gemini CLI users can access PDE tools via the WebMCP relay without circular relay loops or unauthorized access
**Depends on**: Phase 156
**Requirements**: MEB-01, MEB-02, MEB-03
**Success Criteria** (what must be TRUE):
  1. Cursor and Gemini CLI can call PDE tools through the WebMCP relay endpoint with correct authentication
  2. A relay request that would create a circular chain is detected and rejected via the X-PDE-Relay-Depth header guard
  3. The PDE remote MCP server appears in mcp-bridge.cjs APPROVED_SERVERS so Claude Code can route requests to it via the existing bridge
**Plans**: 2 plans
Plans:
- [ ] 158-01-PLAN.md — Install ext-apps SDK, rich tool+resource registration, CSP connectDomains, server-factory wiring
- [ ] 158-02-PLAN.md — Dynamic ui://pde/{artifact} resource template with format-specific rendering

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 156. Remote MCP Server Foundation | v0.19 | 1/3 | Complete    | 2026-03-28 |
| 157. Dashboard WebMCP Tools | v0.19 | 2/3 | Complete    | 2026-03-28 |
| 158. MCP Apps Rich UI + Design Artifact Preview | v0.19 | 1/2 | Complete    | 2026-03-28 |
| 159. Token Playground | v0.19 | 2/2 | Complete    | 2026-03-28 |
| 160. Declarative Approval Gates + Workflow Flags | v0.19 | 2/2 | Complete    | 2026-03-28 |
| 161. Auto-Generated Competitor Tools | v0.19 | 0/2 | Not started | - |
| 162. Multi-Editor Bridge | v0.19 | 0/TBD | Not started | - |
