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
- ✅ **v0.22 Stakeholder Presentations** — Phases 176-184 (shipped 2026-03-30)
- ✅ **v0.23 Quality & Reliability Hardening** — Phases 185-189 (shipped 2026-03-30)
- 🚧 **v0.24 Cloud Dispatch & State Sync** — Phases 190-197 (in progress)

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

### ✅ v0.22 Stakeholder Presentations (Shipped 2026-03-30)

**Milestone Goal:** PDE can transform any project's `.planning/` artifacts into audience-specific communication documents — executive summaries, case studies, investor updates, post-mortems, and more — using a deterministic extraction-first pipeline that eliminates LLM hallucination about project state, with dual HTML+Markdown output, inline SVG charts, PDF export, claim verification, auto-generation on phase completion, and cross-project portfolio synthesis.

- [x] **Phase 176: Data Extraction IR Foundation** — artifact reader, IR builder, pde-tools subcommand, source-of-truth mapping, output directory, auto-gen gate design (completed 2026-03-30)
- [x] **Phase 177: Command Interface + Workflow Shell** — /pde:present command, workflow file, persona listing, persona dispatch routing (completed 2026-03-30)
- [x] **Phase 178: Reference Personas + Rendering Engine** — executive summary and case study reference implementations, dual-format renderer (HTML+Markdown), EJS templates, self-contained HTML constraints, design artifact embedding (completed 2026-03-30)
- [x] **Phase 179: SVG Charts** — burndown, velocity, phase timeline, effort breakdown charts as parametric inline SVG; accessible text alternatives (completed 2026-03-30)
- [x] **Phase 180: Claim Verification + PDF Export** — post-generation claim verification against IR, mismatch flagging, verification footer, PDF export via Playwright (completed 2026-03-30)
- [x] **Phase 181: Remaining Cluster A Personas** — investor update, sprint review, client deliverable, stakeholder status update, product manager view, project manager view (completed 2026-03-30)
- [x] **Phase 182: Remaining Cluster B Personas** — agile project report, design persona report, research persona report, technical post-mortem, ADR summary, launch announcement, portfolio overview (completed 2026-03-30)
- [x] **Phase 183: Auto-Generation** — phase-completion hook, milestone-archive hook, state completion gate, configurable persona set, opt-out config flag (completed 2026-03-30)
- [x] **Phase 184: Cross-Project Portfolio Synthesis** — multi-project reader, schema version detection, defensive extraction, /pde:portfolio command, portfolio narrative (completed 2026-03-30)


<details>
<summary>✅ v0.23 Quality & Reliability Hardening (Phases 185-189) — SHIPPED 2026-03-30</summary>

### v0.23 Quality & Reliability Hardening

**Milestone Goal:** The PDE codebase has accurate state documents, reliable test infrastructure, complete Nyquist verification coverage for v0.22, and documented static-analysis baselines — eliminating the accumulated data drift, false test failures, IR field mismatches, and stale workflow paths from 22 prior milestones of rapid shipping.

- [x] **Phase 185: Data Integrity Baseline** — correct ROADMAP.md milestone status, MILESTONES.md one-liners, REQUIREMENTS.md checkbox reconciliation, Phase 180 VERIFICATION.md status (completed 2026-03-30)
- [x] **Phase 186: Test Infrastructure** — vitest exclude config for node:test files, @vitest/coverage-v8 coverage baseline (completed 2026-03-30)
- [x] **Phase 187: IR Field Fix + Mock Reconciliation** — buildCrossPatterns field name fix, Phase 184 test mock shape alignment, 23 portfolio tests confirmed green (completed 2026-03-30)
- [x] **Phase 188: Verification Coverage** — Nyquist VALIDATION.md backfill for all 9 v0.22 phases, v0.7 SUMMARY.md one-liner frontmatter, pde-tools health consistency subcommand (completed 2026-03-30)
- [x] **Phase 189: Technical Debt Cleanup** — correct $CLAUDE_PLUGIN_ROOT paths in workflow files, knip dead-code report, jscpd duplication report, ESLint clean pass (completed 2026-03-30)

</details>

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
- [x] 176-01-PLAN.md — Core extractors (project identity, phases, requirements, design artifacts) + unit tests
- [x] 176-02-PLAN.md — Remaining extractors (git velocity, cost/timing, blockers, verification, research, decisions) + unit tests
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
- [x] 180-01-PLAN.md — Claim verification engine (verify-presentation.cjs), render() integration, verification footer CSS, unit + integration tests
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
- [x] 181-01-PLAN.md — Investor update + sprint review builders, test scaffold
- [x] 181-02-PLAN.md — Client deliverable + stakeholder status builders, RAG logic
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
**Plans:** 3/3 plans complete
Plans:
- [x] 182-01-PLAN.md — Agile report + design report + research report builders, test scaffold
- [x] 182-02-PLAN.md — Post-mortem + ADR summary builders
- [x] 182-03-PLAN.md — Launch announcement + portfolio overview builders, complete test suite
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
**Plans:** 1/1 plans complete
Plans:
- [x] 183-01-PLAN.md — Config keys, auto-generation workflow steps in execute-phase.md and complete-milestone.md

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
**Plans:** 2/2 plans complete
Plans:
- [x] 184-01-PLAN.md — Multi-project IR extraction (portfolio.cjs), schema version detection, milestone history, TDD tests
- [x] 184-02-PLAN.md — Cross-project render function, pde-tools subcommand, /pde:portfolio command + workflow

### Phase 185: Data Integrity Baseline
**Goal**: State documents accurately reflect what shipped — ROADMAP.md, MILESTONES.md, REQUIREMENTS.md, and Phase 180 VERIFICATION.md all contain correct data that downstream IR extractors can consume without producing false portfolio narratives
**Depends on**: Phase 184
**Requirements**: INT-01, INT-02, INT-03, INT-04
**Success Criteria** (what must be TRUE):
  1. ROADMAP.md shows v0.22 status as shipped with all 9 phase plan boxes checked, verified against git log and SUMMARY.md completion timestamps
  2. MILESTONES.md one-liner fields for v0.19 through v0.22 contain accurate human-readable descriptions (not placeholder text), sourced from archived SUMMARY.md files
  3. REQUIREMENTS.md checkboxes for EXT-01 through EXT-10 are checked with inline phase references matching the VERIFICATION.md evidence entries
  4. Phase 180 VERIFICATION.md frontmatter shows status: complete, with the root cause of the prior gaps_found value documented
**Plans**: 2/2 plans complete
Plans:
- [x] 185-01-PLAN.md — Fix Phase 180 VERIFICATION.md, ROADMAP.md plan boxes, v0.22-REQUIREMENTS.md phase refs
- [x] 185-02-PLAN.md — Populate MILESTONES.md one-liners for v0.19-v0.22

### Phase 186: Test Infrastructure
**Goal**: Running npx vitest run reports zero false "No test suite found" failures and npx vitest run --coverage produces a coverage baseline report, giving reliable regression signal before any code changes are made
**Depends on**: Phase 185
**Requirements**: TST-01, TST-02
**Success Criteria** (what must be TRUE):
  1. Running npx vitest run reports pass/fail results only for vitest-compatible test files — the 137 node:test files no longer produce false "No test suite found" entries
  2. node:test files remain runnable via node --test and are not deleted or disabled — only excluded from vitest
  3. Running npx vitest run --coverage produces a coverage report showing lines and branch percentages per module in bin/lib/
**Plans**: 1/1 plans
Plans:
- [x] 186-01-PLAN.md — Vitest exclude config for node:test files + coverage baseline setup

### Phase 187: IR Field Fix + Mock Reconciliation
**Goal**: buildCrossPatterns reads the correct IR field names and produces non-empty cross-patterns sections for real PDE projects, and Phase 184 portfolio test mocks match the real IR shape so the test suite accurately reflects production behavior
**Depends on**: Phase 186
**Requirements**: INT-05, INT-06
**Success Criteria** (what must be TRUE):
  1. Running /pde:portfolio on two real PDE project directories produces a cross-patterns section with actual content (not an empty section)
  2. buildCrossPatterns accesses ir.topics and ir.project_research_files instead of ir.research.findings — confirmed by reading the updated source
  3. All 23 Phase 184 portfolio tests pass after mock shapes are updated to match buildPresentationIR output — zero regressions
  4. The mock update is atomic with the code fix — no intermediate state where tests pass against wrong shapes
**Plans**: 1/1 plans
Plans:
- [x] 187-01-PLAN.md — Fix buildCrossPatterns field access + reconcile Phase 184 test mock shape

### Phase 188: Verification Coverage
**Goal**: All 9 v0.22 phases have Nyquist-compliant VALIDATION.md files, v0.7 SUMMARY.md files include one-liner frontmatter, and a pde-tools health consistency subcommand exists for detecting cross-artifact mismatches
**Depends on**: Phase 185
**Requirements**: VER-01, VER-02, VER-03
**Success Criteria** (what must be TRUE):
  1. Each of the 9 phases (176 through 184) has a VALIDATION.md file with nyquist_compliant: true frontmatter and assertions derived from that phase's VERIFICATION.md observable truths table
  2. Running any assertion from a VALIDATION.md file against its target produces a meaningful pass or fail — not just a key-existence check
  3. All 5 v0.7 SUMMARY.md files include a one-liner: frontmatter field with an accurate single-sentence description
  4. Running pde-tools health consistency [version] reports any mismatches between requirements file checkboxes, roadmap phase entries, and milestone plan entries for the given milestone version
**Plans**: 3 plans
Plans:
- [x] 188-01-PLAN.md — Nyquist VALIDATION.md backfill for v0.22 phases 176-180
- [x] 188-02-PLAN.md — Nyquist VALIDATION.md backfill for v0.22 phases 181-184 + v0.7 SUMMARY.md one-liners
- [x] 188-03-PLAN.md — pde-tools health consistency subcommand implementation

### Phase 189: Technical Debt Cleanup
**Goal**: Stale workflow paths are corrected, dead-code and duplication reports are produced and triaged, and ESLint runs clean — establishing documented static-analysis baselines for future milestones
**Depends on**: Phase 186
**Requirements**: DEB-01, DEB-02, DEB-03, DEB-04
**Success Criteria** (what must be TRUE):
  1. execute-phase.md and complete-milestone.md reference $CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs — the stale $HOME/.claude/pde-os path is gone from both files
  2. Running npx knip produces a dead-code report with each finding triaged as keep, remove, or defer — the report is committed as a tracked artifact
  3. Running npx jscpd produces a duplication report identifying copy-paste blocks above the configured threshold — the report is committed as a tracked artifact
  4. Running npx eslint . produces a clean pass or a documented exceptions file explaining each suppressed rule — no undocumented suppressions
**Plans**: 2 plans
Plans:
- [x] 189-01-PLAN.md — Fix stale paths + knip/jscpd triage reports
- [x] 189-02-PLAN.md — ESLint 10 config + clean pass


### 🚧 v0.24 Cloud Dispatch & State Sync (In Progress)

**Milestone Goal:** PDE can dispatch autonomous phase executions to ephemeral cloud containers and local Docker containers, synchronize .planning/ state back to the local orchestrator via git, and route tasks intelligently across local, Docker, SSH, and cloud backends with full dashboard visibility and cost tracking.

- [ ] **Phase 190: Infrastructure Foundation** — Extended registry backend enum, SessionSource shared type, lock.cjs cloud-aware PID handling, aggregator RemoteAggregator stub, dispatch config block extension, and cloud adapter package scaffold
- [ ] **Phase 191: Docker Container Backend** — remote-docker.cjs mirroring spawn.cjs interface, NDJSON stdout relay, coordinator Docker dispatch branch, [D] source label, and coordinator-docker tests
- [ ] **Phase 192: Git-Based State Sync** — sync.cjs with pushPlanningState/fetchPlanningState, direction-aware merge strategy, simple-git in packages/, concurrent branch ordering, and sync tests against real worktree fixtures
- [ ] **Phase 193: Cloud Web Backend** — remote-cloud.cjs with CloudPoller synthetic events, OAuth probe, cloud dispatch branch in coordinator, auto-teardown on completion, and graceful fallback chain
- [ ] **Phase 194: Intelligent Routing** — Full classifyTaskRouting() integration, auto-classify from PLAN.md metadata, cost ceiling enforcement, manual --dispatch override, fast-path local guarantee, and routing event logging
- [ ] **Phase 195: Dashboard Integration** — Cloud and Docker session labels, CloudPoller progress bars, start/stop/inspect UI, sync state display, cost tracking in Token Playground, and session_source type extension
- [ ] **Phase 196: Containerized MCP Servers** — Per-server Docker containers for APPROVED_SERVERS with pinned runtimes and probe/degrade contract extension for container startup latency
- [ ] **Phase 197: Cross-Host Session Resume** — Agent SDK .jsonl persistence to shared storage and cwd encoding for cross-host session portability

#### Phase Details

### Phase 190: Infrastructure Foundation
**Goal**: The type system, registry, lock, aggregator, and package structure accept cloud and Docker backends so all subsequent phases can be built without type drift or constraint violations
**Depends on**: Phase 189
**Requirements**: INF-01, INF-02, INF-03, INF-06, CLD-06
**Success Criteria** (what must be TRUE):
  1. SessionSource enum in wire-schema.ts includes 'remote-cloud' and 'docker' values and TypeScript compilation succeeds across coordinator and dashboard consumers
  2. lock.cjs handles cloud session IDs without calling process.kill — verified by reading updated source and running existing lock tests
  3. aggregator.cjs routes cloud session IDs to RemoteAggregator instead of TailCursor — no ghost cursors accumulate for cloud session IDs
  4. packages/cloud-adapter/ directory exists with package.json and the root plugin passes node require check with no extra npm packages at root
  5. Dispatch config block accepts cloud and docker settings — verified by config schema parse test
**Plans**: TBD

### Phase 191: Docker Container Backend
**Goal**: Users can dispatch a plan to a local Docker container that streams real NDJSON events through the existing event bus, with the same onLine/onExit interface as local spawn
**Depends on**: Phase 190
**Requirements**: CLD-04, CLD-05, CLD-03
**Success Criteria** (what must be TRUE):
  1. Running --dispatch=docker on a plan spawns a Docker container and streams NDJSON events consumable by the existing event bus — verified in coordinator-docker.test.cjs
  2. Docker container dispatch uses the same onLine/onExit callback interface as spawn.cjs — no caller changes needed at the coordinator dispatch site
  3. Dashboard shows [D] source label for Docker-dispatched sessions
  4. Container is torn down after the task completes — no dangling containers after coordinator-docker test run
**Plans**: TBD

### Phase 192: Git-Based State Sync
**Goal**: Planning state (.planning/) is pushed to a remote git branch before cloud dispatch and merged back locally after completion, with correct merge direction so cloud-written STATE.md content survives the merge
**Depends on**: Phase 191
**Requirements**: SYN-01, SYN-02, SYN-03, SYN-04, SYN-07
**Success Criteria** (what must be TRUE):
  1. pushPlanningState() commits and pushes .planning/ to a session-scoped remote branch before dispatch — verified against real git worktree fixture
  2. fetchPlanningState() fetches and merges the cloud branch using the v0.16 3-way merge engine — confirmed in sync.test.cjs
  3. Cloud-written STATE.md content survives the merge (direction-aware: --theirs for STATE.md, --ours for ROADMAP.md and REQUIREMENTS.md) — explicit test confirms remote state is not overwritten
  4. Concurrent cloud sessions push to separate branches and sequential merge ordering is enforced — two simultaneous sync operations do not corrupt main
  5. simple-git is installed in packages/ directory, not at plugin root — verified by checking root package.json
**Plans**: TBD

### Phase 193: Cloud Web Backend
**Goal**: Users can dispatch an autonomous phase to an Anthropic-managed cloud VM via claude --remote, receive synthetic NDJSON progress events via CloudPoller, and have the container auto-teardown with state synced back on completion
**Depends on**: Phase 192
**Requirements**: CLD-01, CLD-02, CLD-07, CLD-08
**Success Criteria** (what must be TRUE):
  1. Running --dispatch=cloud on an autonomous plan spawns a cloud session, captures the session ID, and starts CloudPoller emitting synthetic NDJSON events every 5 seconds — verified in coordinator-cloud.test.cjs with CLI stubs
  2. Cloud session auth uses claude.ai OAuth probe (not ANTHROPIC_API_KEY) — detectManagedBackend() returns available:false on machines without claude.ai auth, confirmed by CLI stub test
  3. Cloud container is torn down automatically on task completion with configurable idle timeout — no cloud sessions remain running after coordinator-cloud test completes
  4. Fallback chain cloud -> SSH -> local activates automatically when cloud probe returns unavailable, emitting a routing_fallback event
**Plans**: TBD

### Phase 194: Intelligent Routing
**Goal**: Tasks are automatically routed to the best execution backend based on PLAN.md metadata, user-configured cost ceilings, and manual overrides, with fast-path commands always staying local
**Depends on**: Phase 193
**Requirements**: RTG-01, RTG-02, RTG-03, RTG-04, RTG-05, RTG-06
**Success Criteria** (what must be TRUE):
  1. Passing --dispatch=cloud|local|ssh|docker routes to that target regardless of auto-classification — verified with all four targets in routing validation tests
  2. Plans with agent_type: autonomous and estimated_minutes above threshold are auto-classified for cloud routing — classifyTaskRouting() reads PLAN.md frontmatter and returns routing decision in under 100ms with no LLM call
  3. User can set force override in config.json per plan or phase — override is respected and logged as a structured routing event
  4. When dispatch target cost exceeds user-configured ceiling, routing falls back to next target in chain and emits a routing_fallback event with cost reason
  5. /pde:quick and /pde:fast always route to local — confirmed by routing tests with fast-path flag set
**Plans**: TBD

### Phase 195: Dashboard Integration
**Goal**: Cloud and Docker sessions are visible in the dashboard health matrix with source labels, sync state, and cost tracking, and users can start, stop, and inspect cloud sessions from the dashboard UI
**Depends on**: Phase 193
**Requirements**: DSH-01, DSH-02, DSH-03, DSH-04, DSH-05, DSH-06
**Success Criteria** (what must be TRUE):
  1. Cloud sessions appear in the health matrix with [C] source label and Docker sessions appear with [D] label — visible in dashboard after dispatching one of each
  2. Cloud session progress bars and agent activity display using CloudPoller synthetic events — progress updates without a local NDJSON file
  3. User can start, stop, and inspect a cloud session from the dashboard UI — stop terminates the cloud VM, inspect shows sessionUrl
  4. Sync state panel shows pending merges, last sync time, and conflict indicators — visible after a cloud session completes and before local merge
  5. Token Playground shows container uptime times provider rate alongside token cost for cloud and Docker sessions
**Plans**: TBD
**UI hint**: yes

### Phase 196: Containerized MCP Servers
**Goal**: Each approved MCP server runs in its own Docker container with a pinned runtime, and the probe/degrade contract accounts for container startup latency so degradation does not fire on normal cold starts
**Depends on**: Phase 191
**Requirements**: INF-04, INF-05
**Success Criteria** (what must be TRUE):
  1. Each entry in APPROVED_SERVERS runs in its own per-server Docker container with a pinned runtime version — verified by reading updated MCP server launch code
  2. Probe/degrade contract extends startup timeout to accommodate container cold start — probe does not trigger degraded state during normal container startup
  3. MCP server containers degrade gracefully if Docker daemon is unavailable, falling back to the existing non-containerized behavior
**Plans**: TBD

### Phase 197: Cross-Host Session Resume
**Goal**: Agent SDK session .jsonl files are persisted to shared storage so a session started on one machine can be resumed on a different host with matching cwd encoding
**Depends on**: Phase 192
**Requirements**: SYN-05, SYN-06
**Success Criteria** (what must be TRUE):
  1. Agent SDK .jsonl session files are persisted to configured shared storage on session completion — verified by reading the updated session persistence code
  2. Session resume on a different host succeeds when the shared storage entry exists — coordinator loads .jsonl from shared storage and resumes with matching cwd encoding
  3. cwd encoding is portable across hosts — a session started in /Users/alice/project resumes correctly on /home/alice/project via cwd normalization
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
| 182. Remaining Cluster B Personas | v0.22 | 3/3 | Complete    | 2026-03-30 |
| 183. Auto-Generation | v0.22 | 1/1 | Complete    | 2026-03-30 |
| 184. Cross-Project Portfolio Synthesis | v0.22 | 2/2 | Complete    | 2026-03-30 |
| 185. Data Integrity Baseline | v0.23 | 2/2 | Complete | 2026-03-30 |
| 186. Test Infrastructure | v0.23 | 1/1 | Complete | 2026-03-30 |
| 187. IR Field Fix + Mock Reconciliation | v0.23 | 1/1 | Complete    | 2026-03-30 |
| 188. Verification Coverage | v0.23 | 3/3 | Complete    | 2026-03-30 |
| 189. Technical Debt Cleanup | v0.23 | 2/2 | Complete    | 2026-03-30 |
| 190. Infrastructure Foundation | v0.24 | 0/TBD | Not started | - |
| 191. Docker Container Backend | v0.24 | 0/TBD | Not started | - |
| 192. Git-Based State Sync | v0.24 | 0/TBD | Not started | - |
| 193. Cloud Web Backend | v0.24 | 0/TBD | Not started | - |
| 194. Intelligent Routing | v0.24 | 0/TBD | Not started | - |
| 195. Dashboard Integration | v0.24 | 0/TBD | Not started | - |
| 196. Containerized MCP Servers | v0.24 | 0/TBD | Not started | - |
| 197. Cross-Host Session Resume | v0.24 | 0/TBD | Not started | - |
