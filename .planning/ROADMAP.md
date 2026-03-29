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
- ✅ **v0.20 CLI-Anything + Asset Engine** — Phases 163-170 (shipped 2026-03-29)
- 🚧 **v0.21 Desktop App Integration** — Phases 171-175 (in progress)

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

<details>
<summary>✅ v0.20 CLI-Anything + Asset Engine (Phases 163-170) — SHIPPED 2026-03-29</summary>

### v0.20 CLI-Anything + Asset Engine

**Milestone Goal:** PDE can auto-generate agent-native CLIs and MCP servers from any API spec, and produce production-ready visual assets (images, video, 3D models, CAD files) using free/open-source toolchains — zero paid API keys required.

- [x] Phase 163: CLI Ingestion + Capability Model (4/4 plans) — completed 2026-03-29
- [x] Phase 164: CLI Wrapping + Publishing (3/3 plans) — completed 2026-03-29
- [x] Phase 165: Image Generation Pipeline (3/3 plans) — completed 2026-03-29
- [x] Phase 166: Visual Diff + Asset Reporting (2/2 plans) — completed 2026-03-29
- [x] Phase 167: Video Production Pipeline (3/3 plans) — completed 2026-03-29
- [x] Phase 168: AI 3D Generation + Web Embedding (3/3 plans) — completed 2026-03-29
- [x] Phase 169: Parametric CAD Generation (2/2 plans) — completed 2026-03-29
- [x] Phase 170: PDE Utilities (3/3 plans) — completed 2026-03-29

</details>

### v0.21 Desktop App Integration (In Progress)

**Milestone Goal:** PDE can discover installed GUI applications, wrap them as agent-native CLI tools with safety-gated approval, and integrate Blender, GIMP, and Inkscape directly into the design pipeline — using the existing CLI-Anything infrastructure with no new npm dependencies.

- [x] **Phase 171: Security Architecture + Discovery Foundation** — Two-tier approval registry, five-tier binary probe, executionMode classification, col -b help preprocessing, and known-app catalog (completed 2026-03-29)
- [x] **Phase 172: Core App Wrappers** — Blender, GIMP, and Inkscape wrappers with version-aware headless modes, SKILL.md generation, JSON output, and display server probe (completed 2026-03-29)
- [x] **Phase 173: MCP Bridge Dynamic Registration** — loadDynamicServers() and registerDynamicServer() in mcp-bridge.cjs, pde-tools app subcommand, and pip CLI server-gen handler (completed 2026-03-29)
- [x] **Phase 174: CLI Wrap Skill** — /pde:cli-wrap one-command workflow with dual strategy routing (CLI-Anything fast path + native fallback) and pipx canonical install (completed 2026-03-29)
- [ ] **Phase 175: Design Pipeline Integration** — Optional app-tool steps in wireframe.md and mockup.md, Blender → 3D pipeline chaining, and GIMP → image pipeline chaining

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

_Phases 163-170 archived to milestones/v0.20-ROADMAP.md_

---

### Phase 171: Security Architecture + Discovery Foundation
**Goal**: Any discovered desktop application is classified and gated before any tool can invoke it — the two-tier approval registry, five-tier binary probe, and executionMode classification are in place as the foundation every subsequent phase writes into
**Depends on**: Phase 170
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06
**Success Criteria** (what must be TRUE):
  1. Running `pde-tools app discover` on macOS, Linux, or Windows returns a list of installed applications with binary paths resolved via the five-tier probe (env var → which/where → pip module → mdfind → well-known paths)
  2. Every discovered application appears in registry.json with status `pending` — no discovered app is executable by an agent until a human approves it
  3. Each registry entry carries a `executionMode` field (`headless`, `gui-required`, or `mock`) set at discovery time — a tool call against a `mock` entry produces a visible error before any subprocess runs
  4. The `col -b` preprocessing step strips backspace-escaped man page sequences from `--help` output, and capability models generated from degraded output carry a `parseQuality: "degraded"` annotation
  5. `references/app-integrations.md` exists and documents bundle IDs, pip status, executionMode, and discovery hints for at least Blender, GIMP, and Inkscape
**Plans**: 3 plans
Plans:
- [x] 171-01-PLAN.md — Five-tier binary probe, display detection, col-b preprocessing, APP_CATALOG
- [x] 171-02-PLAN.md — Two-tier approval registry with state machine and SHA-256 verification
- [ ] 171-03-PLAN.md — pde-tools app CLI routing and known design app catalog

### Phase 172: Core App Wrappers
**Goal**: Blender, GIMP, and Inkscape are wrapped as agent-invokable MCP tools with version-aware headless modes, structured JSON output, and auto-generated SKILL.md files — covering all three executionMode patterns in one phase
**Depends on**: Phase 171
**Requirements**: WRAP-01, WRAP-02, WRAP-03, WRAP-04, WRAP-05, WRAP-06
**Success Criteria** (what must be TRUE):
  1. An agent can invoke Blender in headless mode via MCP without a display server — the wrapper passes `--background` and declares `startupMs: 5000` in the capability model; the async MCP server never uses synchronous subprocess variants
  2. An agent can invoke GIMP in batch mode via `--no-interface --batch` Script-Fu; the wrapper detects GIMP 2.x vs 3.x at discovery time and selects the correct flags for the installed version
  3. An agent can invoke Inkscape for SVG/PNG export using `inkscape --export-type` with no headless flags — the wrapper's capability model reflects the pure CLI surface only
  4. SKILL.md files for all three wrapped apps are auto-generated using Phase 164 machinery — an agent reading the SKILL.md knows the available commands, required flags, and output format without inspecting the binary
  5. Every wrapped app command returns JSON-structured output when invoked via MCP — raw stdout is not passed through to the agent unprocessed
  6. A missing or incompatible display server is detected at probe time and surface as a capability degradation in the tool map rather than a runtime crash
**Plans**: 3 plans
Plans:
- [x] 172-01-PLAN.md — asyncMode server-gen extension, app-wrappers orchestrator, Wave 0 test scaffolds
- [ ] 172-02-PLAN.md — Blender and Inkscape wrapper modules with version-aware CapabilityModels
- [ ] 172-03-PLAN.md — GIMP version-conditional wrapper and pde-tools app wrap subcommand

### Phase 173: MCP Bridge Dynamic Registration
**Goal**: Approved wrappers from the registry load automatically into mcp-bridge.cjs at session init, and users have a single `pde-tools app` entry point for all discovery and registration operations
**Depends on**: Phase 172
**Requirements**: REG-01, REG-02, REG-03, REG-04
**Success Criteria** (what must be TRUE):
  1. After a user approves a discovered app in registry.json, the next Claude Code session sees that app's MCP tools in TOOL_MAP without any manual configuration — `loadDynamicServers()` reads the registry at module load
  2. Apps with status `pending` or `rejected` in the registry do not appear in TOOL_MAP — only `approved` entries are loaded
  3. `pde-tools app discover|wrap|register|list|probe` commands are all available and documented — a user can manage the full app lifecycle from the CLI without editing registry.json by hand
  4. A pip CLI (e.g., rembg) can be registered via `generatePythonModuleHandler()` using `python -m {tool}` spawn pattern — the generated MCP server correctly handles the module invocation without shell injection risk
**Plans**: 2 plans
Plans:
- [x] 173-01-PLAN.md — loadDynamicServers, registerDynamicServer, DYNAMIC_SERVERS in mcp-bridge.cjs
- [x] 173-02-PLAN.md — generatePythonModuleHandler in server-gen.cjs, pde-tools app register subcommand

### Phase 174: CLI Wrap Skill
**Goal**: Any installed application can be wrapped as an agent-native CLI tool in one command — `/pde:cli-wrap` handles discovery, capability model generation, MCP server creation, and SKILL.md publishing automatically
**Depends on**: Phase 173
**Requirements**: CLI-01, CLI-02, CLI-03
**Success Criteria** (what must be TRUE):
  1. Running `/pde:cli-wrap <app-name>` produces a complete agent-native CLI (capability model + MCP server + SKILL.md) for the specified application in one command — no manual steps required after the command completes
  2. When a CLI-Anything pre-built harness is available via pipx, `/pde:cli-wrap` uses it as the fast path and skips native `--help` parsing — the routing decision is visible in the command output
  3. When no CLI-Anything harness is available, `/pde:cli-wrap` falls back to native `--help` → capability model → codegen — the fallback path produces a valid (potentially degraded) capability model
  4. pipx is used as the canonical install method for CLI-Anything CLIs — the absolute path to the installed binary is resolved at setup time and stored in config so it is not subject to PATH variations in Node.js subprocesses
**Plans**: 2 plans
Plans:
- [ ] 174-01-PLAN.md — Dual-strategy router module (app-cli-wrap.cjs), pipx setup, pde-tools routing, unit tests
- [ ] 174-02-PLAN.md — /pde:cli-wrap slash command and integration test

### Phase 175: Design Pipeline Integration
**Goal**: Design workflows that invoke Blender, GIMP, or Inkscape degrade gracefully when those apps are absent — and chain their output into existing v0.20 asset pipelines when they are present
**Depends on**: Phase 173
**Requirements**: PIPE-01, PIPE-02, PIPE-03
**Success Criteria** (what must be TRUE):
  1. Running `/pde:wireframe` or `/pde:mockup` on a machine without Blender, GIMP, or Inkscape completes without error — each optional app-tool step is skipped with a documented "tool not available" note rather than a failure
  2. On a machine where Blender is approved in the registry, a 3D wireframe step can pass its render output directly into the Phase 168 GLB optimize → model-viewer pipeline without manual file transfer
  3. On a machine where GIMP is approved in the registry, a mockup workflow can invoke GIMP retouch as an editing step within the Phase 165 image pipeline, producing a retouched artifact in the pipeline output directory
**Plans**: 2 plans
Plans:
- [ ] 175-01-PLAN.md — probeAppTool utility, Blender GLB export + chain, GIMP retouch chain, tests
- [ ] 175-02-PLAN.md — Wire Blender step into wireframe.md, GIMP step into mockup.md

---

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
| 163. CLI Ingestion + Capability Model | v0.20 | 4/4 | Complete | 2026-03-29 |
| 164. CLI Wrapping + Publishing | v0.20 | 3/3 | Complete | 2026-03-29 |
| 165. Image Generation Pipeline | v0.20 | 3/3 | Complete | 2026-03-29 |
| 166. Visual Diff + Asset Reporting | v0.20 | 2/2 | Complete | 2026-03-29 |
| 167. Video Production Pipeline | v0.20 | 3/3 | Complete | 2026-03-29 |
| 168. AI 3D Generation + Web Embedding | v0.20 | 3/3 | Complete | 2026-03-29 |
| 169. Parametric CAD Generation | v0.20 | 2/2 | Complete | 2026-03-29 |
| 170. PDE Utilities | v0.20 | 3/3 | Complete | 2026-03-29 |
| 171. Security Architecture + Discovery Foundation | v0.21 | 2/3 | Complete    | 2026-03-29 |
| 172. Core App Wrappers | v0.21 | 1/3 | Complete    | 2026-03-29 |
| 173. MCP Bridge Dynamic Registration | v0.21 | 2/2 | Complete    | 2026-03-29 |
| 174. CLI Wrap Skill | v0.21 | 0/2 | Complete    | 2026-03-29 |
| 175. Design Pipeline Integration | v0.21 | 0/2 | Not started | - |
