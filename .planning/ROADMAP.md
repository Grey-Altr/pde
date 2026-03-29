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
- ✅ **v0.19 WebMCP Integration** — Phases 156-162 (shipped 2026-03-28)
- 🚧 **v0.20 CLI-Anything + Asset Engine** — Phases 163-170 (in progress)

## Phases

<details>
<summary>✅ v0.19 WebMCP Integration (Phases 156-162) - SHIPPED 2026-03-28</summary>

### v0.19 WebMCP Integration

**Milestone Goal:** PDE tools are accessible from any browser-based AI agent and any MCP-compatible desktop client via a publicly accessible Streamable HTTP remote server, with rich UI previews, declarative approval gates, auto-generated competitor tools, and multi-editor relay support.

- [x] **Phase 156: Remote MCP Server Foundation** — Streamable HTTP endpoint with Clerk auth, Origin validation, stateless Vercel transport, shared server factory, and desktop relay bridge (completed 2026-03-28)
- [x] **Phase 157: Dashboard WebMCP Tools** — useMcpTool() lifecycle hook, use-mcp-client.ts, initial tool registrations, and context-sync .webmcp emitter (completed 2026-03-28)
- [x] **Phase 158: MCP Apps Rich UI + Design Artifact Preview** — type: 'resource' rich return blocks with MCP Apps HTML MIME, CSP declarations, and ui:// artifact resource scheme (completed 2026-03-28)
- [x] **Phase 159: Token Playground** — Per-tool cost breakdown UI and session context window utilization view via @ai-sdk/mcp and Upstash Redis (completed 2026-03-28)
- [x] **Phase 160: Declarative Approval Gates + Workflow Flags** — Approval gate WebMCP tool forms and --webmcp flag across all four design workflow commands (completed 2026-03-28)
- [x] **Phase 161: Auto-Generated Competitor Tools** — competitive.md tool stub generation with sanitization pipeline, mandatory human review gate, and competitor registry (completed 2026-03-28)
- [x] **Phase 162: Multi-Editor Bridge** — Cursor and Gemini CLI relay to PDE via WebMCP, relay depth guard, and mcp-bridge.cjs APPROVED_SERVERS update (completed 2026-03-28)

</details>

### v0.20 CLI-Anything + Asset Engine

**Milestone Goal:** PDE can auto-generate agent-native CLIs and MCP servers from any API spec, and produce production-ready visual assets (images, video, 3D models, CAD files) using free/open-source toolchains — zero paid API keys required.

- [x] **Phase 163: CLI Ingestion + Capability Model** — Ingest OpenAPI, JSON Schema, GraphQL, and MCP specs into a unified capability model with AI SDK tool() definitions and Zod schemas (completed 2026-03-29)
- [x] **Phase 164: CLI Wrapping + Publishing** — Auto-wrap any CLI as an MCP server via --help parsing, SKILL.md generation, --json flag, and CLI-Hub registry publishing (completed 2026-03-29)
- [x] **Phase 165: Image Generation Pipeline** — OG images via Satori, social cards, device mockup composites, Playwright screenshots, background removal via remove.bg free tier, and .planning/design/assets/ storage (completed 2026-03-29)
- [x] **Phase 166: Visual Diff + Asset Reporting** — Branch-level visual diff with perceptual hashing, comparison report with changed/unchanged/new/deleted asset classification (completed 2026-03-29)
- [ ] **Phase 167: Video Production Pipeline** — Playwright UI capture, FFmpeg assembly with transitions/overlays/captions, Remotion branded video composition with PDE design tokens, MP4 output
- [ ] **Phase 168: AI 3D Generation + Web Embedding** — Text-to-3D and image-to-3D via TripoSR/SF3D, GLB output, model-viewer web embedding with AR fallback (USDZ/WebXR), 3D asset storage
- [ ] **Phase 169: Parametric CAD Generation** — CadQuery Python scripts for hardware product CAD models, STEP file output for engineering handoff
- [ ] **Phase 170: PDE Utilities** — mmdr Mermaid renderer, DTCG token validator with OKLCH/APCA checks, visual diff command, test scaffold generation from flows, handoff spec verification with gap report

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
- [x] 156-02-PLAN.md — MCP route handler with Clerk auth, .well-known endpoints, proxy update
- [x] 156-03-PLAN.md — Polling tool pair for long-running ops, desktop client config docs

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
- [x] 157-03-PLAN.md — Browser tool hooks (design state, project info, artifacts), API routes, composite hook
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
- [x] 158-02-PLAN.md — Dynamic ui://pde/{artifact} resource template with format-specific rendering

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
**Plans:** 2/2 plans complete
Plans:
- [x] 161-01-PLAN.md — Workflow Step 8 competitor tool stub generation, sanitization pipeline, registry write, competitor-tools API route
- [x] 161-02-PLAN.md — useCompetitorTools browser hook, barrel export, composite hook wiring, test updates

### Phase 162: Multi-Editor Bridge
**Goal**: Cursor and Gemini CLI users can access PDE tools via the WebMCP relay without circular relay loops or unauthorized access
**Depends on**: Phase 156
**Requirements**: MEB-01, MEB-02, MEB-03
**Success Criteria** (what must be TRUE):
  1. Cursor and Gemini CLI can call PDE tools through the WebMCP relay endpoint with correct authentication
  2. A relay request that would create a circular chain is detected and rejected via the X-PDE-Relay-Depth header guard
  3. The PDE remote MCP server appears in mcp-bridge.cjs APPROVED_SERVERS so Claude Code can route requests to it via the existing bridge
**Plans:** 2/2 plans complete
Plans:
- [x] 162-01-PLAN.md — Relay depth guard module, APPROVED_SERVERS pde_remote entry, and tests for both
- [x] 162-02-PLAN.md — Wire relay guard into route.ts guardedHandler, Gemini CLI docs

---

### Phase 163: CLI Ingestion + Capability Model
**Goal**: Users can ingest any API spec or MCP server and get a unified capability model with typed AI SDK tool definitions ready for agent consumption
**Depends on**: Phase 162
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06
**Success Criteria** (what must be TRUE):
  1. User can point CLI-Anything at an OpenAPI spec file and receive a unified capability model JSON with all endpoints represented
  2. User can point CLI-Anything at a JSON Schema file and receive an equivalent unified capability model
  3. User can point CLI-Anything at a GraphQL endpoint and receive a capability model derived from introspection without manual schema writing
  4. User can point CLI-Anything at a running MCP server and receive a capability model listing all available tools
  5. Generated AI SDK tool() definitions compile without TypeScript errors and include Zod inputSchema with fully typed execute functions
**Plans:** 4/4 plans complete
Plans:
- [x] 163-01-PLAN.md — Foundation: capability model schema, detect module, test scaffolds, ingest skeleton, command file
- [x] 163-02-PLAN.md — OpenAPI + JSON Schema parsers
- [ ] 163-03-PLAN.md — GraphQL + MCP parsers
- [ ] 163-04-PLAN.md — Codegen (JSON Schema to Zod + tool generation) + pde-tools.cjs wiring

### Phase 164: CLI Wrapping + Publishing
**Goal**: Users can wrap any command-line tool as an agent-native MCP server and publish it so other agents can discover it
**Depends on**: Phase 163
**Requirements**: CLI-07, CLI-08, CLI-09, CLI-10, CLI-11
**Success Criteria** (what must be TRUE):
  1. User can run CLI-Anything on any CLI binary and get a working MCP server that exposes every subcommand as an MCP tool — derived entirely from --help output
  2. Every command exposed by the auto-wrapped MCP server returns structured JSON, not raw stdout text
  3. Every generated CLI or tool produces a SKILL.md that an agent can read to understand what the tool does and how to call it
  4. User can publish a generated CLI to a CLI-Hub compatible registry and have it appear in registry listings
  5. Any generated tool accepts a --json flag and returns machine-parseable output when that flag is present
**Plans**: 3 plans
Plans:
- [x] 164-01-PLAN.md — Wave 0: model.cjs cli type, test scaffolds, fixtures
- [x] 164-02-PLAN.md — help-parser.cjs + server-gen.cjs
- [ ] 164-03-PLAN.md — skill-gen.cjs + registry.cjs + pde-tools wiring + commands

### Phase 165: Image Generation Pipeline
**Goal**: Users can generate OG images, social cards, device mockups, and product screenshots, with background removal and organized asset storage — all using free toolchains
**Depends on**: Phase 163
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, IMG-07, IMG-08
**Success Criteria** (what must be TRUE):
  1. User can generate an OG image from a template by providing product data — output is a valid PNG suitable for og:image meta tags
  2. User can generate a social media card image from product data fields without writing any code
  3. User can produce a device mockup composite (browser frame or phone frame) by supplying a product screenshot as input
  4. User can capture a product screenshot via Playwright at any configured viewport size with a single command
  5. User can remove the background from any product image using the remove.bg free tier and receive a PNG with transparent background
  6. All generated image assets are stored in .planning/design/assets/ with an accompanying metadata JSON file
**Plans:** 3/3 plans complete
Plans:
- [ ] 165-01-PLAN.md — Foundation: deps install, asset storage, OG + social card generation
- [ ] 165-02-PLAN.md — Screenshot capture, device mockup compositing, background removal
- [ ] 165-03-PLAN.md — pde-tools.cjs image subcommand wiring + /pde:image command docs
**UI hint**: yes

### Phase 166: Visual Diff + Asset Reporting
**Goal**: Users can detect visual regressions between git branches or commits and get a structured report showing exactly what changed
**Depends on**: Phase 165
**Requirements**: IMG-05, IMG-06
**Success Criteria** (what must be TRUE):
  1. User can run a visual diff command targeting two git branches and receive perceptual hash comparison results for all matched assets
  2. Visual diff produces a comparison report that classifies every asset as changed, unchanged, new, or deleted — no ambiguous output
  3. Changed assets in the report include a visual indicator or score showing the degree of change, not just a binary changed/unchanged flag
**Plans:** 2/2 plans complete
Plans:
- [x] 166-01-PLAN.md — pHash engine, git branch diff, report generation with tests
- [ ] 166-02-PLAN.md — pde-tools.cjs image diff subcommand wiring + /pde:visual-diff command doc

### Phase 167: Video Production Pipeline
**Goal**: Users can record product UI interactions and assemble them into branded videos with captions — all using free, local toolchains
**Depends on**: Phase 165
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, VID-06
**Success Criteria** (what must be TRUE):
  1. User can record a product UI interaction sequence via Playwright screen capture and receive a video clip file as output
  2. User can assemble multiple video clips into a single video with configurable transitions, overlays, and captions using FFmpeg
  3. User can compose a branded product video using Remotion React components that automatically apply PDE design tokens (colors, fonts, spacing)
  4. Video pipeline produces an MP4 file at a configurable resolution without requiring a paid video service
  5. User can add text captions or subtitles to any generated video and see them rendered in the final MP4
**Plans:** 3 plans
Plans:
- [ ] 167-01-PLAN.md — FFmpeg pipeline: deps install, video assets, record, assemble, caption modules with tests
- [ ] 167-02-PLAN.md — Remotion branded video: isolated project, compositions, compose.cjs with token extraction
- [ ] 167-03-PLAN.md — pde-tools.cjs video subcommand wiring + /pde:video command doc

### Phase 168: AI 3D Generation + Web Embedding
**Goal**: Users can generate 3D models from text or images and embed them directly in web pages with automatic AR fallback — using open-source models only
**Depends on**: Phase 163
**Requirements**: TRD-01, TRD-02, TRD-03, TRD-04, TRD-05, TRD-08
**Success Criteria** (what must be TRUE):
  1. User can describe a product in text and receive a downloadable GLB file generated by TripoSR or SF3D — no paid API key required
  2. User can supply a product image and receive a GLB file representing the 3D model inferred from that image
  3. Generated GLB files have optimized geometry — filesize is within a reasonable bound for web delivery and loads without errors in model-viewer
  4. User can embed any generated GLB in a web page via a model-viewer component snippet with a single command
  5. The model-viewer integration automatically includes AR fallback: USDZ for iOS and WebXR for Android, without manual configuration
  6. All 3D assets are stored in .planning/design/3d/ with generation metadata (source model, input, timestamp, parameters)
**Plans**: TBD

### Phase 169: Parametric CAD Generation
**Goal**: Users building hardware products can generate engineering-grade CAD models from Python scripts and export STEP files ready for manufacturing handoff
**Depends on**: Phase 168
**Requirements**: TRD-06, TRD-07
**Success Criteria** (what must be TRUE):
  1. User can provide a product description and receive a working CadQuery Python script that generates a parametric 3D model
  2. Running the CadQuery script produces a valid STEP file that opens without errors in standard CAD tools (FreeCAD, Fusion 360, SOLIDWORKS)
  3. Generated CadQuery scripts are parameterized — changing dimension variables in the script produces correctly scaled geometry
**Plans**: TBD

### Phase 170: PDE Utilities
**Goal**: Users gain a fast Mermaid renderer, a design token validator with gamut/contrast checks, a visual diff command, flow-derived test scaffolds, and a handoff spec verifier — all as first-class /pde: commands
**Depends on**: Phase 166
**Requirements**: UTL-01, UTL-02, UTL-03, UTL-04, UTL-05, UTL-06, UTL-07, UTL-08
**Success Criteria** (what must be TRUE):
  1. Mermaid diagrams in PDE render via the mmdr Rust renderer and complete noticeably faster than the previous mermaid-cli path
  2. User can run /pde:validate-tokens and receive a report flagging any DTCG token that violates schema completeness or naming conventions
  3. Token validation report includes OKLCH gamut violations and APCA contrast ratio failures with specific token names and values
  4. User can run a visual diff command comparing Playwright screenshots across two branches or commits and receive the same structured report as Phase 166
  5. User can run /pde:gen-tests on a flows diagram output and receive Playwright E2E test skeleton files with navigation paths derived from the flow
  6. User can run /pde:verify-handoff and receive a gap report listing every component where the implementation diverges from or is absent from the handoff spec
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 156. Remote MCP Server Foundation | v0.19 | 3/3 | Complete | 2026-03-28 |
| 157. Dashboard WebMCP Tools | v0.19 | 3/3 | Complete | 2026-03-28 |
| 158. MCP Apps Rich UI + Design Artifact Preview | v0.19 | 2/2 | Complete | 2026-03-28 |
| 159. Token Playground | v0.19 | 2/2 | Complete | 2026-03-28 |
| 160. Declarative Approval Gates + Workflow Flags | v0.19 | 2/2 | Complete | 2026-03-28 |
| 161. Auto-Generated Competitor Tools | v0.19 | 2/2 | Complete | 2026-03-28 |
| 162. Multi-Editor Bridge | v0.19 | 2/2 | Complete | 2026-03-28 |
| 163. CLI Ingestion + Capability Model | 4/4 | Complete   | 2026-03-29 |  |
| 164. CLI Wrapping + Publishing | v0.20 | 2/3 | Complete    | 2026-03-29 |
| 165. Image Generation Pipeline | 3/3 | Complete   | Complete    | 2026-03-29 |
| 166. Visual Diff + Asset Reporting | v0.20 | 1/2 | Complete    | 2026-03-29 |
| 167. Video Production Pipeline | v0.20 | 0/3 | In progress | - |
| 168. AI 3D Generation + Web Embedding | v0.20 | 0/TBD | Not started | - |
| 169. Parametric CAD Generation | v0.20 | 0/TBD | Not started | - |
| 170. PDE Utilities | v0.20 | 0/TBD | Not started | - |
