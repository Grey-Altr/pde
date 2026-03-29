# Platform Development Engine (PDE)

## What This Is

A full professional product design and development platform delivered as a Claude Code plugin. PDE takes users from raw idea to shipped product through AI-assisted research, design, planning, coding, testing, and deployment. Includes a complete 13-stage design pipeline (recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff) orchestrable via a single `/pde:build` command. Supports multiple product types — software, hardware, hybrid, experience (events, festivals, installations), and business — with type-specific artifacts including physical design tokens, floor plan/timeline wireframes, print collateral, production bible handoff, and venture design engine (business thesis, lean canvas, brand system, landing page spec, pricing config, pitch deck, launch kit, deploy scaffolding). Features browser-based visual optimization via Playwright MCP: automatic screenshot capture for wireframes and mockups, browser AOM accessibility analysis for critique, 5 visual metric scripts (DOM structure, a11y violations, WCAG contrast, responsive compliance, Mermaid readability), and AutoResearch experiment templates for all 14 design skills with visual regression circuit breaker, multi-candidate A/B variant selection, meta-optimization strategy self-calibration, ideation visual diversity scoring, and brief reference screenshot capture. Self-improvement fleet audits, validates, and elevates output quality against Awwwards-level standards. Integrates with external development tools (GitHub, Linear, Jira, Figma, Pencil) via MCP for bidirectional sync. Advanced workflow methodology with story-file sharding, acceptance-criteria-first planning, post-execution reconciliation, readiness gating, and persistent agent memory. Real-time observability via structured event infrastructure with NDJSON event bus, persistent 7-pane tmux monitoring dashboard, and idle-time suggestion display. Multi-editor integration: generates context files for Cursor (.mdc rules), Gemini CLI (GEMINI.md), Google Antigravity (SKILL.md + Design DNA), and AGENTS.md; standalone MCP server with 10 read-only tools for programmatic state queries; hook-driven auto-sync on .planning/ changes; 3-tier handoff-vs-code divergence detection; DTCG-to-Tailwind v4 artifact formatting with framework-detected component stubs — zero npm dependencies. Distributed execution via git worktree isolation, parallel CLI dispatch with concurrency queue, Agent SDK orchestrator (DAG analysis, file-overlap detection, failure summarization), SSH remote dispatch with managed backend fallback, multi-session dashboard integration (health matrix, animated progress bars, failure cards, responsive pane grid), and tmux multi-session fan-out.

## Core Value

Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## Requirements

### Validated

- ✓ 1:1 functional clone of GSD, rebranded as PDE — v0.1
- ✓ All GSD workflows operational under PDE naming — v0.1
- ✓ All GSD skill commands working as /pde: equivalents — v0.1
- ✓ All GSD agent types functional within PDE — v0.1
- ✓ Plugin installable and usable in Claude Code — v0.1
- ✓ All GSD templates, references, and configuration migrated — v0.1
- ✓ GSD tooling rebranded and functional — v0.1
- ✓ Design system generation produces DTCG tokens with CSS derivation — v0.2
- ✓ Core design pipeline: brief → flows → system → wireframe → critique → iterate → handoff — v0.2
- ✓ Each design skill works standalone AND as part of orchestrated /pde:build pipeline — v0.2
- ✓ Design artifacts stored in .planning/design/ alongside planning state — v0.2
- ✓ Design-to-implementation handoff produces component APIs and TypeScript interfaces — v0.2
- ✓ Ideation skill with multi-phase diverge→converge exploration — v0.3
- ✓ Competitive analysis skill with structured landscape evaluation — v0.3
- ✓ Opportunity scoring skill with RICE framework — v0.3
- ✓ Mockup skill for hi-fi interactive HTML/CSS from wireframes — v0.3
- ✓ HIG audit skill with dual mode (light in critique, full standalone) — v0.3
- ✓ Recommend skill for MCP/tool discovery (integrated into ideation) — v0.3
- ✓ Brief accepts upstream IDT/CMP/OPP context with graceful degradation — v0.3
- ✓ Build orchestrator expanded to 13-stage pipeline with --from entry and dynamic stage counting — v0.3
- ✓ Audit PDE tooling against Awwwards-level standards with 3-agent fleet — v0.4
- ✓ Skill builder (create/improve/eval) with validation gate and style guide enforcement — v0.4
- ✓ Self-improvement fleet with baseline delta tracking and health reports — v0.4
- ✓ Design quality elevation: all 7 pipeline skills with motion tokens, OKLCH palettes, APCA contrast, spring physics — v0.4
- ✓ Pressure test: end-to-end pipeline validation with process compliance and quality rubric tiers — v0.4
- ✓ 62/62 v0.4 requirements satisfied with 330+ Nyquist assertions — v0.4
- ✓ MCP infrastructure with security allowlist, probe/degrade contracts, connection persistence — v0.5
- ✓ GitHub integration: issue sync, PR creation, brief from issue, CI pipeline status — v0.5
- ✓ Linear + Jira integration: issue sync, milestone/epic mapping, ticket creation, task_tracker toggle — v0.5
- ✓ Figma integration: DTCG token import/export, wireframe context, Code Connect handoff, mockup export — v0.5
- ✓ Pencil integration: token sync to canvas, screenshot capture for critique, graceful degradation — v0.5
- ✓ End-to-end validation: 315 tests for concurrency isolation, auth recovery, write-back confirmation — v0.5
- ✓ Project context constitution with auto-generated compact context document for all subagents — v0.6
- ✓ Story-file sharding: plans with 5+ tasks produce atomic task files, executor loads one at a time — v0.6
- ✓ AC-first planning: acceptance criteria before task list, task-to-AC verification gates, boundary enforcement — v0.6
- ✓ Post-execution reconciliation: mandatory RECONCILIATION.md comparing planned vs actual git commits — v0.6
- ✓ Readiness gate: /pde:check-readiness with PASS/CONCERNS/FAIL blocking execute-phase on FAIL — v0.6
- ✓ Per-task workflow tracking with real-time status updates and HANDOFF.md for session breaks — v0.6
- ✓ Agent enhancements: assumptions capture, analyst persona, analyst-to-brief pipeline, persistent agent memory — v0.6
- ✓ File-hash manifest for safe framework updates preserving user modifications — v0.6
- ✓ BMAD/PAUL methodology patterns documented in PDE terms — v0.6
- ✓ Research validation agent with LLM claim extraction, three-tier classification, and three-state codebase verification — v0.7
- ✓ Plan checker enhanced with three new dimensions: cross-phase dependency detection, edge case surfacing with BDD AC generation, and declaration-time integration verification — v0.7
- ✓ Workflow integration: research validation gates plan-phase, B4/B5 structural readiness checks, integration checks consuming all verification artifacts — v0.7
- ✓ Event infrastructure with structured event bus, NDJSON session-scoped files, Claude Code hooks for automatic capture — v0.8
- ✓ tmux monitoring dashboard with 6 panes, adaptive layout, nested tmux detection, dependency auto-install — v0.8
- ✓ `/pde:monitor` command to launch persistent dashboard — v0.8
- ✓ Session archival with structured markdown summaries and NDJSON cleanup — v0.8
- ✓ Token/cost metering with chars/4 heuristic, per-model pricing, context window utilization (~est. labels) — v0.8
- ✓ Workflow instrumentation: semantic phase/wave/plan events enriching dashboard and session summaries — v0.8
- ✓ Future-proof event schema with extensions field for downstream consumers — v0.8
- ✓ Google Stitch MCP integration with auth, 10-entry tool map, live verification gate, probe/degrade contracts — v0.9
- ✓ Stitch quota tracking (Standard 350/mo, Experimental 50/mo) with 80% warning, auto-fallback, health visibility — v0.9
- ✓ `--use-stitch` flag on wireframe/mockup with generate-fetch-persist-annotate pipeline, consent gates, 10s fallback — v0.9
- ✓ Ideation visual divergence via Stitch with batch consent, quota-aware partial-batch fallback — v0.9
- ✓ Critique Stitch comparison with manifest detection, DTCG token suppression, multimodal PNG analysis — v0.9
- ✓ Handoff Stitch pattern extraction with annotation gate, @component: extraction, hex-to-OKLCH TypeScript interfaces — v0.9
- ✓ 215 Nyquist structural regression tests across all v0.9 phases — v0.9
- ✓ Hook delivery infrastructure with zero-stdout contract, NDJSON event gating, marker-based idempotency — v0.10
- ✓ Phase-aware suggestion engine: standalone CJS module ranking idle-time suggestions by blockers, artifacts, next-phase prep — zero LLM, <2s — v0.10
- ✓ Human-editable suggestion catalog with 6 phase categories, DESIGN-STATE incomplete-item extraction, time/cost labels — v0.10
- ✓ User-authored context notes (.planning/context-notes/) injected into plan-phase and brief workflows — v0.10
- ✓ 7-pane tmux dashboard with Pane 7 (suggestions), /pde:suggestions CLI, adaptive degradation preserved — v0.10
- ✓ Experience product type detection with 5 sub-types, conditional blocks in all 14 pipeline workflows — v0.11
- ✓ Experience brief extensions (promise statement, vibe contract, audience archetype, venue constraints, repeatability intent) — v0.11
- ✓ Physical design token architecture: SYS-experience-tokens.json with 6 categories (sonic, lighting, spatial, atmospheric, wayfinding, brand coherence) — v0.11
- ✓ Experience flow dimensions (temporal, spatial, social) with spaces-inventory.json for floor plan consumption — v0.11
- ✓ Floor plan (FLP) and timeline (TML) wireframe artifacts for experience products — v0.11
- ✓ Seven event-specific critique perspectives + seven physical interface guidelines with regulatory disclaimers — v0.11
- ✓ Print collateral: event flyer (FLY), series identity template (SIT), festival program (PRG) with Awwwards composition — v0.11
- ✓ Production bible (BIB) handoff: advance document, run sheet, staffing plan, budget framework, post-event template, print spec — v0.11
- ✓ 16-field designCoverage schema across all pipeline workflows, zero cross-phase flag clobber — v0.11
- ✓ 48 requirements, 162 Nyquist tests, zero software/hardware/hybrid regressions — v0.11
- ✓ Foundation: manifest schema 16→20 fields (businessMode, businessTrack, hasBusinessThesis, hasLeanCanvas), launch/ dir, business reference files (tracks, frameworks, disclaimers) — v0.12
- ✓ Business intent detection with 5-category signal taxonomy (model/market/launch/metrics/positioning), 3+ signals / 2+ categories threshold — v0.12
- ✓ Track selection prompt (solo_founder / startup_team / product_leader) with --force/--dry-run/--quick flag handling — v0.12
- ✓ BTH (business thesis) artifact in strategy/ with problem, solution, market, unfair-advantage sections — v0.12
- ✓ LCV (lean canvas) artifact with all 9 boxes and validated/assumed/unknown hypothesis status marking — v0.12
- ✓ Domain Strategy section in BRF with [YOUR_X] financial placeholders and post-write dollar-amount grep enforcement — v0.12
- ✓ 20-field designCoverage write pattern (first workflow to use full Phase 84 schema) — v0.12
- ✓ Service blueprint (SBP) 5-lane Mermaid sequence diagram in flows.md business mode — v0.12
- ✓ GTM channel flow (acquisition → conversion → retention) with channel priority annotations — v0.12
- ✓ hasServiceBlueprint conditional coverage flag in 20-field designCoverage write — v0.12
- ✓ SBP/GTM output depth adapts per businessTrack (solo/startup/leader) — v0.12
- ✓ MKT (Brand/Marketing System) artifact with positioning statement, tone of voice spectrum, visual differentiation — v0.12
- ✓ Brand system tokens: marketing-specific DTCG group (brand voice, campaign palette variants) — v0.12
- ✓ LDP landing page wireframe spec with Next.js component mapping (hero, features, pricing, CTA, footer) — v0.12
- ✓ STR Stripe pricing config with placeholder-only financial values, track-default tier structures — v0.12
- ✓ DPD pitch deck outline with YC/Sequoia/internal business case format, QUAL-02 coherence anchors — v0.12
- ✓ Launch artifact cross-references: LDP reads MKT brand tokens + GTM flow; STR reads LCV revenue streams + MLS competitive pricing — v0.12
- ✓ All launch artifacts in `.planning/design/launch/` with manifest registration and DESIGN-STATE wiring — v0.12
- ✓ 20-field designCoverage write pattern in wireframe.md (hasLaunchKit flag) — v0.12
- ✓ Four business critique perspectives in critique.md: unit economics viability, GTM-ICP fit, pricing psychology, investor readiness — v0.12
- ✓ Pitch coherence cross-check: LCV UVP ↔ DPD solution slide, LCV key metrics ↔ DPD traction slide via coherence anchors — v0.12
- ✓ Business communications HIG section: pitch deck readability, email cadence structure, content calendar structure — v0.12
- ✓ Composite score formula updated to 9.5 denominator (8 perspectives) in business mode — v0.12
- ✓ 20-field designCoverage write in both critique.md and hig.md (hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit) — v0.12
- ✓ 24 Nyquist tests for QUAL-01/02/03/04 + INTG-02 — all GREEN — v0.12
- ✓ Launch kit assembly in handoff.md: LKT manifest (11 upstream business artifacts catalogued with status/readiness), CNT 30-day content calendar, OTR Resend-compatible email sequences — v0.12
- ✓ Step 7b-lkt manifest registration (21 manifest-update calls for LKT/CNT/OTR), DESIGN-STATE rows, hasLaunchKit coverage flag — v0.12
- ✓ DPD-gated investor outreach (3-email sequence skipped if no pitch deck), structural placeholder enforcement (KIT-06) — v0.12
- ✓ handoff.md upgraded from 16→20 designCoverage fields across purpose, Step 7c, anti-patterns, and output sections — v0.12
- ✓ Deploy skill (Stage 14): workflows/deploy.md (942 lines, 6 steps) with 4 mandatory human approval gates before any external write — v0.12
- ✓ Next.js 16.2.1 + Stripe v20 + Resend 6.9.4 + Tailwind v4 scaffold generation consuming LDP/STR/OTR artifacts — v0.12
- ✓ Vercel CLI deployment via `npx vercel --prod --no-wait --yes` with `vercel whoami` pre-check — v0.12
- ✓ /pde:deploy slash command + Stage 14 wired into build.md STAGES table with businessMode gate — v0.12
- ✓ deploy-manifest.json tracking with `review_required: true` per artifact, .planning/deploy-staging/ directory isolation — v0.12
- ✓ Integration wiring fixes: OTR/BTH glob mismatches resolved, hasDeployStaging 21st designCoverage field, handoff required_reading expanded — v0.12
- ✓ 21-field designCoverage schema (hasDeployStaging) across all 10 coverage-writing workflows — v0.12
- ✓ 21-field cascade fix: test assertion (20→21), hasDeployStaging in 4 secondary workflows (recommend, ideate, iterate, mockup), clobber-audit updated — v0.12
- ✓ Consumer glob mismatch fixes: 5 remaining producer→consumer glob mismatches fixed (STR extension .md→.json in deploy.md, STR/DPD/GTM stem corrections in handoff.md, STR stem fix in critique.md), Deploy E2E flow repaired — v0.12
- ✓ Prose drift cleanup: LDP glob stem fixed in critique.md BIZ-3, all stale "20 fields" prose updated to "21 fields" across 9 workflow files, hasDeployStaging added to all prose field lists — v0.12

- ✓ Playwright MCP registered as 7th APPROVED_SERVER with 11 TOOL_MAP entries, probe/degrade contracts, stdio transport — v0.14
- ✓ Wireframe + mockup screenshot capture via Playwright MCP at 1280x800 viewport — v0.14
- ✓ Critique browser AOM accessibility analysis with 4-way merge logic (Playwright+Axe, Playwright-only, Axe-only, neither) — v0.14
- ✓ Deploy post-deploy smoke testing with backoff retry and section verification — v0.14
- ✓ 5 visual metric scripts (DOM structure, a11y, WCAG contrast, responsive, Mermaid) following _evalMetric contract — v0.14
- ✓ 14 experiment templates for all eligible design skills with browser-backed verify commands — v0.14
- ✓ Cross-skill pipeline experiments measuring upstream prose changes by downstream visual impact — v0.14
- ✓ Iterate effectiveness experiments with before/after visual delta measurement and convergence speed tracking — v0.14
- ✓ Visual regression circuit breaker (SHA-256 hash + metric delta AND-gate) preventing cosmetic regressions during optimization — v0.14
- ✓ Multi-candidate experiments: N variants per iteration (default 3), best-of-N selection via argmax/argmin, fork-evaluate-promote — v0.14
- ✓ Pressure test visual scoring dimension (65% text + 35% visual combined weighting) — v0.14
- ✓ Meta-optimization: strategy-weights.cjs reads JSONL history to weight mutation strategies toward productive approaches — v0.14
- ✓ Ideation visual diversity scoring via screenshot hash variance — v0.14
- ✓ Brief reference screenshot capture from user-provided URLs — v0.14
- ✓ 441+ Nyquist tests across all 10 v0.14 phases, zero v0.13 regressions — v0.14
- ✓ Context sync engine generating AGENTS.md, .cursor/rules/*.mdc, .cursorrules, GEMINI.md, Antigravity SKILL.md, DESIGN.md from .planning/ state — v0.15
- ✓ Standalone MCP server (packages/pde-mcp-server/) with 10 read-only tools, pipeline resource, npx distribution — v0.15
- ✓ Artifact formatting: @file annotations in handoff specs, DTCG-to-Tailwind v4 @theme conversion, framework-detected component stubs — v0.15
- ✓ Antigravity Design DNA emitter (DESIGN.md from DTCG tokens), Stitch bridge source detection, bidirectional artifact flow — v0.15
- ✓ 3-tier divergence detection (structural/content/behavioral) with DIVERGENCE.md output and .pde-divergence-ignore suppression — v0.15
- ✓ Hook-driven auto-regeneration of editor files on .planning/ changes, /pde:editor-sync manual command — v0.15
- ✓ 575 Nyquist tests across all v0.15 phases, zero v0.14 regressions — v0.15
- ✓ Full Nyquist traceability: all 8 VALIDATION.md files compliant, all 14 SUMMARY.md files with requirements-completed, isStitchSource production consumer wired — v0.15

- ✓ coordinator-smoke Test 7 fixed with analyzeDag and routeSession DI stubs — v0.18
- ✓ Phase 149 VALIDATION.md Nyquist compliance finalized (nyquist_compliant: true, wave_0_complete: true) — v0.18
- ✓ SSH source propagation: PDE_SSH_SOURCE env var forwarded to remote sessions, ssh-source.test.ts assertions — v0.18
- ✓ Retry button disabled with aria-disabled + title tooltip explaining local dispatcher limitation (INT-RETRY-STUB) — v0.18
- ✓ PDE_REMOTE documented in dashboard/.env.example and coordinator.cjs _spawnRelay JSDoc (INT-PDE-REMOTE-DOC) — v0.18
- ✓ 224 dashboard tests across 29 files, all integration gaps closed — v0.18

### Validated (v0.20)

- ✓ CLI ingestion: OpenAPI, JSON Schema, GraphQL, MCP parsers producing unified capability models — Phase 163
- ✓ AI SDK tool() code generation with Zod inputSchema from any capability model — Phase 163
- ✓ CLI wrapping: any --help → MCP server + SKILL.md + registry publishing — Phase 164
- ✓ Image pipeline: OG cards, social images, device mockups, screenshots, background removal — Phase 165
- ✓ Visual diff: perceptual hash comparison across git branches with structured reports — Phase 166
- ✓ Video pipeline: Playwright recording, FFmpeg assembly, Remotion composition, captioning — Phase 167
- ✓ 3D pipeline: text/image-to-3D via TripoSR/SF3D, GLB optimization, model-viewer AR embed — Phase 168
- ✓ Parametric CAD: CadQuery Python scripts producing STEP files for manufacturing handoff — Phase 169
- ✓ Utilities: mmdr Mermaid renderer, DTCG token validator, flow-to-test scaffolds, handoff verifier — Phase 170

### Validated (v0.19)

- ✓ Remote MCP Server Foundation: Streamable HTTP endpoint with Clerk auth, Origin validation, stateless transport, desktop relay bridge — Phase 156
- ✓ Dashboard WebMCP Tools: useMcpTool() lifecycle hook, initial tool registrations, .webmcp config emitter — Phase 157
- ✓ MCP Apps Rich UI: type: 'resource' rich return blocks with HTML MIME, CSP declarations, ui:// resource scheme — Phase 158
- ✓ Token Playground: per-tool cost breakdown, session context window utilization, Upstash Redis persistence — Phase 159
- ✓ Declarative Approval Gates + Workflow Flags: WebMCP tool forms, --webmcp flag on 4 design workflows — Phase 160
- ✓ Auto-Generated Competitor Tools: competitive.md Step 8, sanitization pipeline, human review gate, competitor-tools-registry.json — Phase 161
- ✓ Multi-Editor Bridge: relay depth guard (X-PDE-Relay-Depth), pde_remote APPROVED_SERVERS entry, Gemini CLI config docs — Phase 162

### Validated (v0.18)

- ✓ Session isolation with atomic worktree lifecycle, single-writer protocol, and post-merge recalculation — v0.18
- ✓ Local CLI dispatch with concurrency queue, crash-recoverable registry, NDJSON aggregation — v0.18
- ✓ Agent SDK orchestrator: DAG analysis, file-overlap detection, failure summarization, conflict triage — v0.18
- ✓ SSH remote dispatch with managed backend fallback chain and git-based state sync — v0.18
- ✓ Multi-session dashboard: health matrix, striped progress bars, failure cards with server actions, responsive pane grid — v0.18
- ✓ tmux multi-session fan-out with color-prefixed tags, [L]/[R] source labels, session cycling — v0.18
- ✓ Dispatch configuration block with graceful degradation (dispatch disabled = exact pre-v0.18 behavior) — v0.18
- ✓ 54/54 requirements satisfied, 224 dashboard tests, all VALIDATION.md files Nyquist compliant — v0.18

### Validated (v0.17)

- ✓ Relay daemon with zod wire protocol, circuit breaker, HTTP batching, zero-impact PDE isolation gated behind PDE_REMOTE — v0.17
- ✓ Next.js 16 dashboard with Clerk auth, Upstash Redis, SSE streaming + polling fallback, session list and detail views — v0.17
- ✓ Core monitoring: PhaseProgress, CostMeter, EventLog with type filtering, mobile-responsive 44px touch targets — v0.17
- ✓ Bidirectional approval gates: TOCTOU-safe cryptographic approval_id, AlertDialog confirmation, relay polling, 1h TTL one-shot delete — v0.17
- ✓ PWA: Serwist service worker (Turbopack route), Web Push notifications (VAPID), offline shell, capability detection, Settings page — v0.17
- ✓ Production hardening: rate limiting, 7-day Redis TTL, event downsampling, 1000-event buffer cap, daily cron GC — v0.17
- ✓ 107 tests across 15 files, 27/27 requirements satisfied, full Nyquist compliance — v0.17

## Current State

**v0.20 CLI-Anything + Asset Engine shipped** (2026-03-29) — 8 phases, 23 plans, 41 requirements. Auto-generated CLIs/MCP servers from any API spec (OpenAPI, JSON Schema, GraphQL, MCP), full asset engine (OG images, social cards, video production, 3D generation, parametric CAD), visual diff, and PDE utility commands. All free/open-source toolchains.

**v0.19 WebMCP Integration shipped** (2026-03-28) — 7 phases, 16 plans, 30 requirements. Remote MCP server, MCP Apps rich UI, dashboard WebMCP tools, token playground, approval gates, competitor tools, multi-editor bridge.

**v0.18 Distributed Execution shipped** (2026-03-28) — 13 phases, 28 plans, 54 requirements, 129 commits, 142 files, +19,639 LOC. Worktree isolation, parallel CLI dispatch, Agent SDK orchestrator, SSH remote dispatch, multi-session dashboard and tmux integration.

### Out of Scope

- Multi-AI-provider support (Gemini CLI, OpenCode, Codex) — candidate for future milestone
- Standalone CLI distribution independent of Claude Code — post-v2
- Multi-product-type support (content, non-software beyond current 4 types) — post-v2
- Maintenance/analytics/feedback loops — post-v2
- Real-time collaborative editing — conflicts with file-based state model
- In-tool web dashboard / UI — markdown files are the dashboard
- Architecture restructuring — do when pain forces it
- Fully autonomous self-modification without safeguards — protected-files mechanism provides guardrails
- Generic LLM quality metrics (BLEU, ROUGE) — Awwwards rubric is domain-specific
- Continuous background self-improvement loop — Claude Code is session-based; explicit invocations are correct
- Real-time bidirectional Figma sync — architecturally impossible in session-based plugin; use explicit sync commands
- Auto-configure all MCP servers on install — triggers unexpected OAuth flows; always require explicit user consent
- MCP tool passthrough to all subagents — destroys 85% context savings from Tool Search
- Write tools in PDE-as-MCP-server — creates second write path bypassing pde-tools.cjs validation and locking
- Direct BMAD agent file import — BMAD agents written for human-directed sequential workflows; PDE agents are autonomous parallel
- PAUL .paul/ directory structure — PDE uses .planning/; parallel state tree creates two sources of truth
- Story points and sprint ceremonies — PDE's phase/milestone model is simpler for AI-assisted development

## Context

- **Shipped v0.19** on 2026-03-28: 7 phases, 16 plans, 30 requirements (WebMCP Integration: remote MCP server, MCP Apps rich UI, dashboard WebMCP tools, token playground, approval gates, competitor tools, multi-editor bridge)
- **Shipped v0.18** on 2026-03-28: 13 phases, 28 plans, 54 requirements, 129 commits, 142 files, +19,639 LOC (Distributed Execution: worktree isolation, parallel CLI dispatch, Agent SDK orchestrator, SSH remote dispatch, multi-session dashboard and tmux integration)
- **Shipped v0.17** on 2026-03-26: 13 phases, 27 plans, 27 requirements, 224 commits, 308 files, +44,337 LOC (Remote Dashboard: relay daemon, Next.js 16 PWA, approval gates, Web Push, production hardening)
- **Shipped v0.16** on 2026-03-24: 7 phases, 14 plans, 26 requirements, 48 commits (Multi-Editor Context Sync: bidirectional sync, 3-way merge, conflict detection, sync audit trail, user content preservation)
- **Shipped v0.15** on 2026-03-24: 8 phases, 16 plans, 25 requirements, 162 Nyquist tests (Multi-Editor Integration: context sync engine, standalone MCP server, DTCG-to-Tailwind v4, divergence detection)
- **Shipped v0.14** on 2026-03-24: 10 phases, 21 plans, 78 requirements, 441+ Nyquist assertions (Visual AutoResearch: Playwright MCP, visual metrics, multi-candidate A/B, meta-optimization)
- **Shipped v0.13** on 2026-03-23: 9 phases, 15 plans (AutoResearch: safety boundaries, experiment schema, mutation agent, circuit breakers)
- **Shipped v0.12** on 2026-03-23: 15 phases, 24 plans, 59 requirements, 235 Nyquist assertions (Business product type with venture design engine)
- **Planned roadmap:** Next milestone TBD → v1.0 Standalone CLI
- **v0.11** shipped 2026-03-22: 112 files changed, 116 commits (experience product type: detection, brief, tokens, flows, wireframes, critique, HIG, print, handoff, 48 requirements)
- **v0.10** shipped 2026-03-21: 107 files changed, 56 commits (idle-time productivity: suggestion engine, catalog, context notes, 7-pane dashboard)
- **v0.9** shipped 2026-03-21: 91 files changed, 76 commits (Google Stitch integration across 5 pipeline skills)
- **v0.1** shipped 2026-03-15: 303 files, ~60,000 LOC, 127 commits (GSD → PDE rebrand)
- **v0.2** shipped 2026-03-16: 172 files changed, 135 commits (7-stage design pipeline)
- **v0.3** shipped 2026-03-17: 84 files changed, 67 commits (6 advanced design skills, 13-stage pipeline)
- **v0.4** shipped 2026-03-18: 259 files changed, 131 commits (self-improvement fleet, design elevation, pressure test)
- **v0.5** shipped 2026-03-19: 118 files changed, 99 commits (5 MCP integrations, 315 validation tests)
- **v0.6** shipped 2026-03-20: 108 files changed, ~91 commits (workflow methodology: sharding, AC-first, reconciliation, readiness, tracking, agent memory)
- **v0.7** shipped 2026-03-20: 67 files changed, ~47 commits (pipeline verification: research validation agent, plan checker Dimensions 9-11, workflow integration)
- **v0.8** shipped 2026-03-20: 81 files changed, 80 commits (observability: event bus, tmux dashboard, session archival, token metering, workflow instrumentation)
- **Tech stack:** Node.js (CommonJS), Claude Code plugin API, markdown-based state management, MCP protocol (HTTP/SSE/stdio transports)
- **Distribution:** Claude Code plugin via GitHub; marketplace registration pending
- **Architecture:** skills (slash commands) → workflows → agents → templates → references → bin scripts → config; event infrastructure (hooks → event-bus → NDJSON → dashboard/archiver)
- **Design pipeline:** 13 skills (recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff) + build orchestrator, DESIGN-STATE.md tracking, design-manifest.json artifact registry (21 coverage flags, pass-through-all pattern); experience products add FLP/TML/FLY/SIT/PRG/BIB artifacts, SYS-experience-tokens.json, spaces-inventory.json, and 7 event-specific critique perspectives + 7 physical interface guidelines; wireframe and mockup support `--use-stitch` flag for Stitch MCP generation with consent gates, annotation injection, 10s fallback, and local artifact caching (STH-{slug}.html/png); critique detects Stitch-sourced artifacts via manifest `source: "stitch"`, suppresses DTCG token-format false positives, reads STH PNG screenshots for multimodal visual analysis, and appends conditional `## Stitch Comparison` delta reports with token compliance percentages; handoff detects `stitch_annotated: true` in manifest (Step 2l), extracts `@component:` annotations from Stitch HTML (Step 4b-stitch), produces STITCH_COMPONENT_PATTERNS section with WFR+Stitch/Stitch-only/WFR-only source tags (Step 5b), generates `STH_{Slug}_{Component}Props` TypeScript interfaces with inline hex-to-OKLCH conversion and `@verify` labels for Stitch-only components (Step 5c)
- **Observability:** PdeEventBus (EventEmitter + setImmediate dispatch), session-scoped NDJSON in /tmp, Claude Code hooks (SubagentStart/Stop, PostToolUse, SessionStart/End, Notification/idle_prompt), semantic workflow events (phase/wave/plan), tmux 7-pane dashboard (agent activity, pipeline progress, file changes, log stream, token/cost, context window, suggestions), archive-session.cjs summaries in .planning/logs/
- **Idle-time productivity:** idle-suggestions.cjs engine with phase classification, blocker prioritization, artifact-fed targeting; idle-catalog.md with 6 phase categories; context-notes/ directory injected into plan-phase and brief workflows; pane-suggestions.sh polling display; /pde:suggestions CLI command
- **Quality infrastructure:** Awwwards 4-dimension rubric, 3 quality reference files (motion-design, composition-typography, quality-standards), protected-files mechanism, 3-agent self-improvement fleet, skill builder with validation gate
- **MCP integration layer:** mcp-bridge.cjs central adapter with TOOL_MAP (57 entries), APPROVED_SERVERS (7 services incl. Google Stitch, Playwright), probe/degrade contracts, connection persistence (.planning/mcp-connections.json), write-back confirmation gates, Stitch quota tracking (Standard 350/mo, Experimental 50/mo) with lazy monthly reset
- **Workflow methodology:** story-file sharding (task-NNN.md), AC-first planning (AC-N verification gates), post-execution reconciliation (RECONCILIATION.md), readiness gate (PASS/CONCERNS/FAIL), per-task tracking (workflow-status.md), persistent agent memory (50-entry cap with archival), analyst persona interviews
- **Pipeline verification:** Research validation agent (3-tier claim classification, codebase verification), plan checker Dimensions 9-11 (dependencies, edge cases, integration Mode A), readiness B4/B5 checks, run_integration_checks consuming all 4 artifact types
- **Known tech debt:**
  - Historical commits e067974 and efe3af0 lack Co-Authored-By trailer (pre-fix, cannot change)
  - 5 v0.7 SUMMARY files missing one-liner frontmatter field (non-breaking, graceful null)
  - 3 human verification items for Phase 56 deferred (live dependency detection, edge case quality, AC approval gate)
  - 10 human verification items across Phases 58/59/61 (live hook auto-fire, dashboard E2E, real-time token display) — requires active tmux session to verify

## Constraints
- Use hex color values from DESIGN.md, not raw OKLCH from token files
- Follow typography hierarchy defined in DESIGN.md section 3
- Spacing uses the base unit defined in DESIGN.md section 5

Zero npm deps at plugin root**: Any new dependencies go in isolated subdirectories
- **MCP security**: Verified-sources-only policy — only official MCP servers from approved vendors

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than rebuild | Fastest path to working product; GSD is proven | ✓ Good — shipped in 2 days |
| Start as Claude Code plugin | Same distribution model as GSD; familiar to users | ✓ Good — plugin validates and loads |
| Fast clone for v0.1 | Get working product quickly, refactor in later milestones | ✓ Good — 100% requirements met |
| Public distribution | Building for the community, not just personal use | ✓ Good — README, Getting Started, marketplace ready |
| Order-dependent rename sequence | Plugin identity → binaries → commands → engine → agents → templates → brand verify | ✓ Good — each layer clean before next |
| Core design pipeline for v0.2 | Closes the biggest gap in "idea to shipped product" promise | ✓ Good — 7 skills + orchestrator shipped |
| Standalone skills + orchestrator | Flexibility for ad-hoc use AND guided workflow | ✓ Good — each skill works both ways |
| DTCG 2025.10 + OKLCH + dual dark mode | Industry-standard token format with perceptually uniform color space | ✓ Good |
| Orchestrator is strictly read-only | No coverage writes, no manifest mutations; each skill owns its own flag | ✓ Good |
| Pass-through-all coverage pattern | Each skill reads all 13 flags, sets only its own — prevents clobber | ✓ Good |
| Self-improvement before pressure test | Build tools to fix PDE first, then validate with real project | ✓ Good |
| Awwwards-level as quality bar | PDE must produce stunning, professional-grade design output | ✓ Good — 330+ Nyquist assertions |
| Prompt-only protected-files enforcement | bwrap sandbox can't prevent Claude Code Write/Edit; defense-in-depth | ✓ Good |
| Version numbering correction v1.x → v0.x | Pre-1.0 product; semver signals maturity accurately | ✓ Good |
| Central MCP adapter (mcp-bridge.cjs) | Single module for all integrations — consistent security, probe/degrade, tool mapping | ✓ Good — 6 integrations share one bridge |
| Canonical tool name mapping (TOOL_MAP) | Insulates workflows from raw MCP tool name changes | ✓ Good — 46 entries, zero raw names in workflows |
| Verified-sources-only security policy | Only official MCP servers — prevents unauthorized tool access | ✓ Good — assertApproved() blocks all unapproved |
| Write-back confirmation gates | Every external write requires explicit user consent (VAL-03) | ✓ Good — 26 confirmation gate tests GREEN |
| Detection-based Pencil connection | VS Code extension auto-configures — no manual `claude mcp add` | ✓ Good — zero friction for VS Code users |
| task_tracker config toggle | Single setting switches Linear↔Jira without workflow changes | ✓ Good — clean service dispatch |
| Non-destructive Figma token merge | PDE-originated tokens preserved; Figma is source for its exports | ✓ Good — no data loss on sync |
| Inline conversion functions (zero npm) | figmaColorToCss, dtcgToPencilVariables embedded in workflows | ✓ Good — zero-npm-dependency preserved |
| Story-file sharding with task-count threshold | Plans ≥5 tasks get sharded; <5 stay monolithic — balances context savings vs overhead | ✓ Good — ~90% context reduction |
| AC-first planning with AC-N identifiers | Tasks verified against acceptance criteria before marked done — prevents shallow execution | ✓ Good — every phase shipped clean |
| Post-execution reconciliation as mandatory step | Compares planned vs actual git commits — catches drift before verification | ✓ Good — reconciler finds deviations reliably |
| Readiness gate blocks on FAIL | Prevents executing plans with known structural issues | ✓ Good — clean separation of plan validation vs execution |
| Per-agent persistent memory with 50-entry cap | Agents learn project-specific patterns across sessions without unbounded growth | ✓ Good — archival prevents context bloat |
| Analyst persona interviews in new-project/new-milestone | Surfaces unspoken assumptions before planning begins | ✓ Good — structured briefs improve plan quality |
| Read-only research validator agent | Agent cannot write files; orchestrator writes artifact_content to disk | ✓ Good — clean separation of concerns, no accidental mutations |
| Three-tier claim classification (T1/T2/T3) | Match verification method to claim complexity (structural→content→behavioral) | ✓ Good — reduces false positives from wrong-tool verification |
| Edge cases always CONCERNS, never FAIL | Edge cases are informational, not blocking — users decide what to act on | ✓ Good — prevents false-positive execution blocks |
| BDD AC approval gate outside revision loop | Additive-only AC append; checker not re-invoked after approval | ✓ Good — prevents infinite loop between checker and approval |
| B4/B5 as concerns-severity structural checks | File existence and orphan export checks inform but don't block execution | ✓ Good — right severity for declarative-only checks |
| Tech debt closure as first v0.7 phase | Clean baseline before adding new verification surface area | ✓ Good — all 7 items resolved, no interference with new features |
| Session-scoped NDJSON files in /tmp | Concurrent sessions write to separate files; /tmp auto-cleans on reboot | ✓ Good — no interleaving, no disk bloat |
| appendFileSync in event write path | pde-tools.cjs is short-lived; async write could be lost on fast exit | ✓ Good — reliable writes for hook handlers |
| setImmediate for dispatch deferral | Fires after I/O phase, correctly non-blocking for calling operation | ✓ Good — zero measurable overhead |
| chars/4 heuristic with ~est. labels | Honest approximation; no local Claude 3+ tokenizer exists | ✓ Good — users informed, no false precision |
| Hooks-first instrumentation | Claude Code hooks cover tool/agent lifecycle automatically; manual workflow events deferred to Phase 62 | ✓ Good — minimal regression surface |
| tmux adaptive layout with priority ordering | Degrades from 6-pane to 2-pane on small terminals instead of crashing | ✓ Good — works on all terminal sizes |
| Surgical manual event emits (8 calls in 2 files) | Minimizes workflow file changes; concentrated risk surface | ✓ Good — zero regressions across all workflows |
| Stitch stdio transport (not HTTP) | Claude Code silently drops custom headers (#7290, #17069); stdio via npx proxy is reliable | ✓ Good — avoids known Claude Code bug |
| TOOL_MAP_VERIFY_REQUIRED markers | Tool names from community repos (MEDIUM confidence); live gate confirms at connect time | ✓ Good — MCP-05 verification deferred to connection, not build |
| Lazy monthly quota reset | Read-time check vs stored reset_at date; no cron/background process needed | ✓ Good — zero-npm-dependency preserved |
| Per-artifact Stitch detection (not per-project) | critique/handoff read `source: "stitch"` per-artifact from manifest, not `hasStitchWireframes` flag | ✓ Good — supports mixed WFR+Stitch projects |
| Annotation injection before manifest registration | `stitch_annotated: true` only set after 5 semantic HTML tags injected | ✓ Good — downstream handoff can trust annotation presence |
| DTCG token suppression per-artifact (not global) | SUPPRESS_TOKEN_FINDINGS flag set only for Stitch artifacts in critique | ✓ Good — WFR artifacts still get full token compliance checks |
| Stitch Comparison as recommendations not findings | Stitch deviations excluded from Action List and DESIGN-STATE | ✓ Good — prevents blocking on tool limitations vs design intent |
| hexToOklch inline function (zero npm) | Math.cbrt/Math.atan2 OKLab conversion embedded in handoff workflow | ✓ Good — zero-npm-dependency preserved, handles #rgb/#rrggbbaa/named colors |
| Stitch-only components get @verify label | Human decision prompt rather than silent omission or auto-acceptance | ✓ Good — safe default for unvalidated components |
| QUOTA-03 split across Phase 65/66 | Phase 65 provides detection signal; Phase 66 provides fallback routing (WFR-06) | ✓ Good — clean infrastructure/consumer separation |
| Hook delivery architecture for idle suggestions | idle_prompt hook fires silently, /tmp/-only state, event gating, threshold docs | ✓ Good — zero stdout, NDJSON event gating, marker-based dedup |
| Suggestion catalog and context notes | Human-editable idle-catalog.md replaces hardcoded suggestions; context-notes/ injects domain knowledge into plan/brief workflows | ✓ Good — catalog is plain markdown, context notes are opt-in with README |
| Dashboard integration (Pane 7) | 7-pane tmux layout with live suggestion display, adaptive degradation preserved, /pde:suggestions CLI for non-tmux users | ✓ Good — polling loop, zero-state fallback, build_minimal_layout() untouched |
| Zero-LLM suggestion engine | Suggestions ranked by file reads + heuristics only; no model calls during idle time | ✓ Good — <2s budget, zero cost, no recursive wait |
| Context notes as opt-in enrichment | User-authored notes injected into planner prompt, not auto-generated | ✓ Good — if PDE can infer it, user input isn't needed |
| Sub-types as manifest metadata, not pipeline branches | 5 experience sub-types stored as `experienceSubType` in manifest; conditional blocks in existing workflows, no new workflow files | ✓ Good — 8 branch points vs 40 if structural; preserves --from resumption |
| Experience branch stubs before content | Phase 74 adds empty stubs to all 14 workflows; content filled by Phases 75-82 | ✓ Good — atomicity preserved, regression test guards from day one |
| Regulatory disclaimer as reusable reference block | `references/experience-disclaimer.md` loaded via `@references/` pattern in critique and handoff | ✓ Good — single source of truth for [VERIFY WITH LOCAL AUTHORITY] tag |
| Cross-phase wiring fix (16-field designCoverage) | Audit found 10 workflows clobbering hasPrintCollateral/hasProductionBible; read-merge-write pattern must preserve all 16 fields | ✓ Good — all 10 workflows fixed, pipeline preserves flags end-to-end |
| Token path alignment (visual/ not assets/) | system.md writes to visual/, wireframe.md was reading from assets/ — silent fallback masked the bug | ✓ Good — one-line fix, brand tokens now flow to print palette |
| Business detection threshold (3+ signals, 2+ categories) | Prevents over-triggering on pure software projects while catching genuine business intent | ✓ Good — 5-category taxonomy with category diversity requirement |
| BTH→LCV dependency chain (skip, don't halt) | If BTH generation fails, LCV is skipped with warning rather than halting entire brief run | ✓ Good — graceful degradation preserves non-business brief output |
| 20-field designCoverage write (not copy 16-field pattern) | Phase 84 added 4 fields; copying opportunity.md's 16-field pattern silently drops them | ✓ Good — canonical order from manifest template |
| Playwright MCP via stdio transport | npx @playwright/mcp@latest --headless — identical to Stitch pattern, zero npm deps | ✓ Good — 7th APPROVED_SERVER, 10 TOOL_MAP entries, 27 Nyquist tests |
| browser_snapshot as probe tool (not browser_navigate) | browser_snapshot requires no URL arg, avoids "missing required parameter" error on probe | ✓ Good — lightest read-only operation for server health check |
| Push-based relay architecture | Relay daemon tails NDJSON, POSTs to dashboard ingest — PDE never knows if relay is working | ✓ Good — zero-impact isolation, fire-and-forget |
| Upstash Redis sorted sets (not Streams/LISTs) | Time-range queries for session events, natural TTL via ZRANGEBYSCORE | ✓ Good — simple API, efficient range scans |
| Polling-first real-time delivery | SSE with polling fallback avoids Vercel serverless timeout | ✓ Good — works on all plans, auto-reconnects |
| Clerk for dashboard auth, Bearer token for relay | Single-user owner access via Clerk; relay uses static Bearer token | ✓ Good — simple, Marketplace-native |
| Serwist for PWA service worker (Turbopack) | @serwist/turbopack esbuild + route handler for Turbopack dev mode | ✓ Good — /serwist/sw.js path, no webpack collision |
| fd-based spawn stdio for relay daemon | Named file descriptor redirect instead of pipe+unref pattern | ✓ Good — avoids EPIPE, approval responses captured |
| TOCTOU-safe approval with 1h TTL + one-shot delete | Cryptographic approval_id, Redis single-read-delete pattern | ✓ Good — prevents replay attacks and stale responses |
| Single-writer protocol for .planning/ | Session agents write COMPLETE.json + COMPLETED-REQS.md; dispatcher recalculates shared state post-merge | ✓ Good — eliminates race conditions by construction |
| pde/session/ branch prefix | Isolates PDE worktrees from Claude Code's .claude/worktrees/ system | ✓ Good — clean namespace separation |
| ESM-to-CJS bridge for Agent SDK | Dynamic import() cached in sdk-bridge.cjs — CJS plugin consuming ESM package | ✓ Good — avoids ERR_REQUIRE_ESM, single import per process |
| SSH-primary architecture for remote dispatch | claude --remote deferred (research preview with active bugs); SSH is production-ready | ✓ Good — reliable path; managed backend available as future upgrade |
| DI via opts._deps pattern | Constructor injection for test isolation in CJS (spawn, SSH, SDK) — no vi.mock hoisting issues | ✓ Good — consistent across all dispatcher modules |
| CSS-only striped progress bars | repeating-linear-gradient instead of framer-motion dependency | ✓ Good — zero runtime overhead, visual state-as-signal |
| Relay spawned before session | Relay.cjs child process started synchronously before queue.add() — relay ready before first event | ✓ Good — no event loss window |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

*Last updated: 2026-03-29 after v0.20 milestone — CLI-Anything + Asset Engine shipped*
