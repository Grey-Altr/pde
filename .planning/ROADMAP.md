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
- ✅ **v0.21 Desktop App Integration** — Phases 171-175 (shipped 2026-03-29)
- 🚧 **v0.22 Stakeholder Presentations** — Phases 176-184 (in progress)

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

<details>
<summary>✅ v0.21 Desktop App Integration (Phases 171-175) — SHIPPED 2026-03-29</summary>

### v0.21 Desktop App Integration

**Milestone Goal:** PDE can discover installed GUI applications, wrap them as agent-native CLI tools with safety-gated approval, and integrate Blender, GIMP, and Inkscape directly into the design pipeline — using the existing CLI-Anything infrastructure with no new npm dependencies.

- [x] Phase 171: Security Architecture + Discovery Foundation (3/3 plans) — completed 2026-03-29
- [x] Phase 172: Core App Wrappers (3/3 plans) — completed 2026-03-29
- [x] Phase 173: MCP Bridge Dynamic Registration (2/2 plans) — completed 2026-03-29
- [x] Phase 174: CLI Wrap Skill (2/2 plans) — completed 2026-03-29
- [x] Phase 175: Design Pipeline Integration (2/2 plans) — completed 2026-03-29

</details>

### 🚧 v0.22 Stakeholder Presentations (In Progress)

**Milestone Goal:** PDE can transform any project's `.planning/` artifacts into audience-specific communication documents — executive summaries, case studies, investor updates, post-mortems, and more — using a deterministic extraction-first pipeline that eliminates LLM hallucination about project state, with dual HTML+Markdown output, inline SVG charts, PDF export, claim verification, auto-generation on phase completion, and cross-project portfolio synthesis.

- [x] **Phase 176: Data Extraction IR Foundation** — artifact reader, IR builder, pde-tools subcommand, source-of-truth mapping, output directory, auto-gen gate design (completed 2026-03-30)
- [x] **Phase 177: Command Interface + Workflow Shell** — /pde:present command, workflow file, persona listing, persona dispatch routing (completed 2026-03-30)
- [x] **Phase 178: Reference Personas + Rendering Engine** — executive summary and case study reference implementations, dual-format renderer (HTML+Markdown), EJS templates, self-contained HTML constraints, design artifact embedding (completed 2026-03-30)
- [x] **Phase 179: SVG Charts** — burndown, velocity, phase timeline, effort breakdown charts as parametric inline SVG; accessible text alternatives (completed 2026-03-30)
- [x] **Phase 180: Claim Verification + PDF Export** — post-generation claim verification against IR, mismatch flagging, verification footer, PDF export via Playwright (completed 2026-03-30)
- [x] **Phase 181: Remaining Cluster A Personas** — investor update, sprint review, client deliverable, stakeholder status update, product manager view, project manager view (completed 2026-03-30)
- [ ] **Phase 182: Remaining Cluster B Personas** — agile project report, design persona report, research persona report, technical post-mortem, ADR summary, launch announcement, portfolio overview
- [ ] **Phase 183: Auto-Generation** — phase-completion hook, milestone-archive hook, state completion gate, configurable persona set, opt-out config flag
- [ ] **Phase 184: Cross-Project Portfolio Synthesis** — multi-project reader, schema version detection, defensive extraction, /pde:portfolio command, portfolio narrative

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

_Phases 171-175 archived to milestones/v0.21-ROADMAP.md_

---

### Phase 176: Data Extraction IR Foundation
**Goal**: All quantitative project state is deterministically extracted from .planning/ artifacts into a structured IR object that every persona can consume — no LLM touches source files directly
**Depends on**: Phase 175 (v0.21 complete)
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05, EXT-06, EXT-07, EXT-08, EXT-09, EXT-10, CMD-03, CMD-04
**Success Criteria** (what must be TRUE):
  1. Running `pde-tools presentation artifact-read` produces a JSON IR object containing project identity, phase completion percentages, requirement coverage, git velocity metrics, cost/timing data, blockers, verification results, research findings, and key decisions — all from deterministic file reads with no LLM involvement
  2. The IR object validates against a documented schema with typed fields; missing or unreadable source files produce explicit "data unavailable" markers rather than silently omitting data
  3. The .planning/presentations/ output directory is created if absent, and generated files follow the [persona]-[date].html / [persona]-[date].md naming convention
  4. The `pde-tools presentation` subcommand routes correctly and is isolated from existing subcommand blocks
  5. Cross-reference validation runs before any persona call: extracted numbers are compared against their source files and mismatches are logged as warnings
**Plans:** 3/3 plans complete
Plans:
- [ ] 176-01-PLAN.md — Core extractors (project identity, phases, requirements, design artifacts) + unit tests
- [ ] 176-02-PLAN.md — Remaining extractors (git velocity, cost/timing, blockers, verification, research, decisions) + unit tests
- [x] 176-03-PLAN.md — IR composer, cross-ref validation, pde-tools CLI routing, integration tests

### Phase 177: Command Interface + Workflow Shell
**Goal**: Users can invoke `/pde:present [persona]` to generate a presentation, or `/pde:present` (no argument) to see all available personas with descriptions
**Depends on**: Phase 176
**Requirements**: CMD-01, CMD-02
**Success Criteria** (what must be TRUE):
  1. Running `/pde:present executive-summary` triggers the full generation pipeline and produces output files in .planning/presentations/
  2. Running `/pde:present` with no argument displays a formatted list of all 15 available personas, each with a one-line description of its audience and purpose
  3. Running `/pde:present [unknown-persona]` produces a clear error message with the list of valid persona names
  4. The workflow reads from the IR (not raw .planning/ files) and passes structured data to the LLM for narration only
**Plans:** 1/1 plans complete
Plans:
- [x] 177-01-PLAN.md — Command file, workflow with persona registry and dispatch, skill-registry update

### Phase 178: Reference Personas + Rendering Engine
**Goal**: Users can generate a self-contained executive summary HTML/Markdown document and a case study HTML/Markdown document — the two reference implementations that prove the rendering pipeline and lock in all HTML constraints before any other persona is built
**Depends on**: Phase 177
**Requirements**: CLU-01, CLR-01, RND-01, RND-02, RND-03, RND-04, RND-05, RND-06, RND-07
**Success Criteria** (what must be TRUE):
  1. Running `/pde:present executive-summary` produces a self-contained HTML file under 500KB with embedded CSS using PDE design tokens, an auto-generated table of contents with anchor links, and no external URLs or JavaScript
  2. Running `/pde:present case-study` produces a self-contained HTML file with the same constraints, structured as a problem-approach-outcome-lessons narrative
  3. Both personas produce a Markdown companion file alongside the HTML, written to .planning/presentations/ with the [persona]-[date] naming convention
  4. Design artifact screenshots from .planning/design/ are embedded as inline base64 images where the persona calls for visual evidence
  5. Regenerating either presentation overwrites the prior output with the current project state
**Plans:** 2/2 plans complete
Plans:
- [x] 178-01-PLAN.md — Rendering engine (render-presentation.cjs) with executive-summary + case-study persona builders, TDD tests, CLI wiring
- [x] 178-02-PLAN.md — Workflow Step 6 update (stub to real render call) + human-verify end-to-end
**UI hint**: yes

### Phase 179: SVG Charts
**Goal**: Presentations can include inline burndown, velocity, phase timeline, and effort breakdown charts generated as pure parametric SVG — no external chart library, no runtime JavaScript
**Depends on**: Phase 176
**Requirements**: CHT-01, CHT-02, CHT-03, CHT-04, CHT-05, CHT-06
**Success Criteria** (what must be TRUE):
  1. A burndown chart showing remaining tasks/requirements over time renders as valid inline SVG inside an HTML presentation
  2. A velocity chart showing tasks completed per phase renders as valid inline SVG
  3. A phase timeline chart showing planned vs actual duration per phase renders as valid inline SVG
  4. An effort breakdown chart showing token cost or task count by category renders as valid inline SVG
  5. Every chart includes an aria-label and a fallback data table so the information is accessible without visual rendering
**Plans:** 1/1 plans complete
Plans:
- [x] 179-01-PLAN.md — Four SVG chart generators (burndown, velocity, timeline, effort) + renderer integration

### Phase 180: Claim Verification + PDF Export
**Goal**: Every generated presentation has been verified for factual accuracy against the IR before the user sees it, and any presentation can be exported to PDF on demand
**Depends on**: Phase 178
**Requirements**: VER-01, VER-02, VER-03, PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. After narrative generation, a post-generation pass compares every numeric claim in the prose against the extracted IR values — mismatches (wrong counts, dates, status) are flagged before the file is written
  2. The verification result (claims checked, mismatches found, overall pass/fail) appears as a metadata footer section in the generated HTML and Markdown output
  3. Running `/pde:present executive-summary --pdf` produces a PDF file in .planning/presentations/ alongside the HTML output using Playwright page.pdf()
  4. The PDF preserves chart SVGs, embedded base64 images, and table formatting from the HTML source without requiring additional dependencies
**Plans:** 2/2 plans complete
Plans:
- [ ] 180-01-PLAN.md — Claim verification engine (verify-presentation.cjs), render() integration, verification footer CSS, unit + integration tests
- [x] 180-02-PLAN.md — PDF export module (export-pdf.cjs), pde-tools presentation pdf subcommand, workflow --pdf flag, smoke tests

### Phase 181: Remaining Cluster A Personas
**Goal**: Users can generate all six remaining internal/forward-looking personas — investor update, sprint review, client deliverable, stakeholder status update, product manager view, and project manager view — using the shared engine proven by the reference implementations
**Depends on**: Phase 178, Phase 179
**Requirements**: CLU-02, CLU-03, CLU-04, CLU-05, CLU-06, CLU-07
**Success Criteria** (what must be TRUE):
  1. Running `/pde:present investor-update` produces a milestone-velocity and technical moat narrative backed by extracted IR data
  2. Running `/pde:present sprint-review` produces a what-shipped, demo screenshots, and what's-next document
  3. Running `/pde:present client-deliverable` produces a feature-specs and ACs-met report with verification evidence
  4. Running `/pde:present stakeholder-status` produces a RAG-status, decisions-needed, and risks document
  5. Running `/pde:present pm-view` and `/pde:present project-manager-view` each produce their respective persona documents with the correct data emphasis and narrative arc
**Plans:** 3/3 plans complete
Plans:
- [ ] 181-01-PLAN.md — Investor update + sprint review builders, test scaffold
- [ ] 181-02-PLAN.md — Client deliverable + stakeholder status builders, RAG logic
- [x] 181-03-PLAN.md — Product manager + project manager builders, complete test suite

**UI hint**: yes

### Phase 182: Remaining Cluster B Personas
**Goal**: Users can generate all seven remaining external/retrospective personas — agile project report, design persona report, research persona report, technical post-mortem, ADR summary, launch announcement, and portfolio overview — completing the full 15-persona suite
**Depends on**: Phase 178, Phase 179
**Requirements**: CLR-02, CLR-03, CLR-04, CLR-05, CLR-06, CLR-07, CLR-08
**Success Criteria** (what must be TRUE):
  1. Running `/pde:present agile-report` produces a retro narrative with burndown and velocity chart embeds
  2. Running `/pde:present design-report` produces a design decisions, token evolution, and visual direction rationale document
  3. Running `/pde:present research-report` produces a findings summary with evidence-backed recommendations sourced from the research/ directory
  4. Running `/pde:present post-mortem`, `/pde:present adr-summary`, `/pde:present launch-announcement`, and `/pde:present portfolio-overview` each produce their respective documents with correct narrative arc and IR data
  5. All 15 personas are listed in the output of `/pde:present` (no argument) with accurate descriptions
**Plans:** 2/3 plans executed
Plans:
- [x] 182-01-PLAN.md — Agile report + design report + research report builders, test scaffold
- [x] 182-02-PLAN.md — Post-mortem + ADR summary builders
- [ ] 182-03-PLAN.md — Launch announcement + portfolio overview builders, complete test suite
**UI hint**: yes

### Phase 183: Auto-Generation
**Goal**: Presentations auto-generate when a phase is marked complete or a milestone is archived, without interrupting Claude Code execution or flooding the dashboard with noise from mid-execution file writes
**Depends on**: Phase 181, Phase 182
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05
**Success Criteria** (what must be TRUE):
  1. Completing a phase triggers background presentation generation (using the default persona set from config.json) without blocking Claude Code execution — the generation runs async and logs a `presentation_generated` event to the NDJSON bus
  2. Running `/gsd:complete-milestone` triggers presentation generation for all default personas and writes outputs to .planning/presentations/
  3. Auto-generation only fires when STATE.md shows `status: Completed` — it does not fire on every PostToolUse Write event during mid-phase execution
  4. The default persona set for auto-generation is configurable in config.json and used when no explicit persona is specified
  5. Setting `auto_generate: false` in config.json disables auto-generation entirely without affecting on-demand `/pde:present`
**Plans:** 1 plan
Plans:
- [ ] 177-01-PLAN.md — Command file, workflow with persona registry and dispatch, skill-registry update

### Phase 184: Cross-Project Portfolio Synthesis
**Goal**: Users can synthesize a portfolio narrative across multiple PDE projects by passing a list of .planning/ directory paths — with schema version detection ensuring older projects are extracted correctly regardless of which milestone they were built on
**Depends on**: Phase 183
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06
**Success Criteria** (what must be TRUE):
  1. Running `/pde:portfolio /path/to/project-a /path/to/project-b` produces a cross-project portfolio document showing patterns, skills demonstrated, and cumulative outcomes across all supplied projects
  2. Each project's STATE.md is read with schema version detection — projects built on older PDE milestones are extracted using the correct adapter for their schema version, not the current schema
  3. Missing or incompatible fields in any project surface a "data unavailable" marker in the output rather than silently zeroing or crashing
  4. A project directory that cannot be read (wrong path, missing .planning/) is skipped with an explicit error message, and the remaining projects are still synthesized
  5. The portfolio command validates all supplied paths as absolute paths with readable .planning/ directories before starting any extraction
**Plans:** 1 plan
Plans:
- [ ] 177-01-PLAN.md — Command file, workflow with persona registry and dispatch, skill-registry update

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
| 171. Security Architecture + Discovery Foundation | v0.21 | 3/3 | Complete | 2026-03-29 |
| 172. Core App Wrappers | v0.21 | 3/3 | Complete | 2026-03-29 |
| 173. MCP Bridge Dynamic Registration | v0.21 | 2/2 | Complete | 2026-03-29 |
| 174. CLI Wrap Skill | v0.21 | 2/2 | Complete | 2026-03-29 |
| 175. Design Pipeline Integration | v0.21 | 2/2 | Complete | 2026-03-29 |
| 176. Data Extraction IR Foundation | v0.22 | 1/3 | Complete    | 2026-03-30 |
| 177. Command Interface + Workflow Shell | v0.22 | 1/1 | Complete    | 2026-03-30 |
| 178. Reference Personas + Rendering Engine | v0.22 | 2/2 | Complete    | 2026-03-30 |
| 179. SVG Charts | v0.22 | 1/1 | Complete    | 2026-03-30 |
| 180. Claim Verification + PDF Export | v0.22 | 1/2 | Complete    | 2026-03-30 |
| 181. Remaining Cluster A Personas | v0.22 | 1/3 | Complete    | 2026-03-30 |
| 182. Remaining Cluster B Personas | v0.22 | 2/3 | In Progress|  |
| 183. Auto-Generation | v0.22 | 0/TBD | Not started | - |
| 184. Cross-Project Portfolio Synthesis | v0.22 | 0/TBD | Not started | - |
