# Milestones

## v0.10 Idle Time Productivity (Shipped: 2026-03-21)

**Phases completed:** 4 phases, 8 plans
**Commits:** 56 | **Files:** 107 | **LOC:** ~109,000
**Timeline:** ~4 hours (2026-03-21)
**Git range:** v0.9..HEAD

**Key accomplishments:**

1. Hook delivery infrastructure: Notification/idle_prompt hook with zero-stdout contract, NDJSON event gating (fires only on meaningful PDE events), marker-based idempotency, and /tmp/-only state files
2. Suggestion engine: Standalone CJS module (bin/lib/idle-suggestions.cjs) with phase-aware ranking, blocker prioritization, next-phase preview, artifact-fed targeting, time-bounded micro-task calibration — zero LLM calls, <2s budget, tech-noir output
3. Suggestion catalog: Human-editable idle-catalog.md with 6 phase categories (research/plan/execute/design/validation/default), DESIGN-STATE.md incomplete-item extraction, time-to-complete labels and resumption cost categories
4. Context notes: User-authored .planning/context-notes/ directory with README, injected into /pde:plan (Step 7.2 + planner prompt) and /pde:brief (Sub-step 2c + Step 5) for domain knowledge enrichment
5. Dashboard integration: 7-pane tmux layout with Pane 7 (suggestions) via pane-suggestions.sh polling script, adaptive degradation preserved, /pde:suggestions CLI command for non-tmux access
6. Documentation: Getting Started updated with messageIdleNotifThresholdMs: 5000 recommendation, monitor.md updated for 7-pane layout

**Delivered:** A guided productivity system for users during PDE processing wait times — phase-aware suggestions ranked by blockers, artifacts, and upcoming work, delivered via ambient tmux dashboard pane and CLI command, with user-authored context notes flowing into planning workflows — all built with zero LLM calls, zero npm dependencies, and zero stdout pollution.

---

## v0.9 Google Stitch Integration (Shipped: 2026-03-21)

**Phases completed:** 6 phases, 12 plans
**Commits:** 76 | **Files:** 91 | **LOC:** ~100,000
**Timeline:** ~6 hours (2026-03-20 → 2026-03-21)
**Git range:** feat(64-01): extend designCoverage schema → docs(v0.9): milestone audit
**Nyquist tests:** 215 assertions, all green

**Key accomplishments:**

1. Stitch MCP integration: Registered Google Stitch as 6th approved MCP server in mcp-bridge.cjs with auth (STITCH_API_KEY), 10-entry TOOL_MAP with live verification gate (MCP-05), probe/degrade contracts, and quota tracking (Standard 350/mo, Experimental 50/mo with 80% warning threshold and auto-fallback)
2. Wireframe + mockup pipeline: `--use-stitch` flag on `/pde:wireframe` and `/pde:mockup` with full generate-fetch-persist-annotate pipeline, consent gates, 10s timeout with Claude fallback, annotation injection (5 semantic HTML tags), and STH-{slug} artifact caching in design-manifest.json
3. Visual divergence: `/pde:ideate --diverge` feeds concept descriptions to Stitch for 3-5 visual interpretations per concept, batch quota-aware with partial-batch fallback (uses remaining quota rather than hard stop), PNG storage alongside text-based ideation artifacts
4. Critique comparison: `/pde:critique` detects Stitch-sourced artifacts via manifest `source: "stitch"`, suppresses DTCG token-format false positives (CRT-02), reads STH PNG screenshots for multimodal visual analysis (CRT-03), and appends conditional `## Stitch Comparison` delta reports as recommendations not failures
5. Handoff pattern extraction: `/pde:handoff` Step 2l gates on `stitch_annotated: true`, Step 4b-stitch extracts `@component:` annotations via regex, Step 5b produces STITCH_COMPONENT_PATTERNS section with WFR+Stitch/Stitch-only/WFR-only source tags, Step 5c generates `STH_{Slug}_{Component}Props` TypeScript interfaces with inline hex-to-OKLCH conversion and `@verify` labels for Stitch-only components
6. 215 Nyquist tests: Full structural regression suite across phases 65-69 using file-parse assertions (readFileSync + node:test), covering all 30 requirements with zero failures — provides regression safety net for future changes

**Delivered:** Google Stitch AI UI design tool fully integrated into PDE's 13-stage design pipeline as an alternative rendering engine (wireframe/mockup), visual exploration tool (ideation divergence), critique comparator (multimodal analysis with token suppression), and pattern extraction source (handoff with TypeScript interface generation) — all with quota tracking, consent gates, graceful fallback to Claude HTML/CSS, and zero npm dependencies.

---

## v0.8 Observability & Event Infrastructure (Shipped: 2026-03-20)

**Phases completed:** 6 phases, 13 plans
**Commits:** 80 | **Files:** 81 | **LOC:** ~192,000
**Timeline:** ~15 hours (2026-03-19 → 2026-03-20)
**Git range:** docs: start milestone v0.8 → docs(v0.8): milestone audit

**Key accomplishments:**

1. Event infrastructure: PdeEventBus class with setImmediate-deferred dispatch, session-scoped NDJSON files in /tmp, Claude Code hooks for automatic tool/agent event capture, future-proof schema with extensions field
2. tmux dashboard: `/pde:monitor` command with 6-pane layout (agent activity, pipeline progress, file changes, log stream, token/cost meter, context window), adaptive layout for small terminals, nested tmux detection, platform-aware auto-install
3. Session archival: Structured markdown summaries in `.planning/logs/` at every SessionEnd, NDJSON cleanup of files >7 days, ISO-timestamped session log filenames
4. Token & context metering: chars/4 heuristic with ~est. labels, per-model cost estimation from model-profiles config, orchestrator context utilization percentage
5. Workflow instrumentation: Semantic phase/wave/plan events emitted from execute-phase.md and execute-plan.md via surgical manual calls, enriching dashboard and session summaries
6. Gap closure: plan_started/plan_complete events added to session summary aggregation (MISS-01 from audit), 26/26 requirements satisfied, 6/6 phases Nyquist compliant

**Delivered:** A complete observability layer for PDE — structured event infrastructure with NDJSON event bus, persistent tmux monitoring dashboard with 6 live panes, automatic session history with structured summaries, and token/cost estimation — all built with zero npm dependencies using only Node.js built-ins and shell scripts.

---

## v0.7 Pipeline Reliability & Validation (Shipped: 2026-03-20)

**Phases completed:** 4 phases, 11 plans, 3 tasks

**Key accomplishments:**

- TRACKING-PLAN.md created to fix broken consent panel reference, one-liner field added to SUMMARY template, and all 20 v0.6 SUMMARY files backfilled for automated extraction
- Smoke-tested pde-research-validator against Phase 54 research: 9 claims extracted, verified against codebase, RESEARCH-VALIDATION.md produced with validated_at_phase: 55 — proves RVAL-03 and RVAL-06
- Dimension 9 (Cross-Phase Dependencies) added to pde-plan-checker using roadmap analyze --raw for gap detection with DEPENDENCY-GAPS.md artifact and three resolution option types
- Dimension 10 (Edge Cases) added to pde-plan-checker with LLM reasoning pass, severity classification, 5-8 cap, BDD candidates for HIGH findings, and EDGE-06 AC approval gate added to plan-phase.md as Step 11.5 outside the revision loop
- Dimension 11 (Integration Mode A) added to pde-plan-checker: @-reference extraction from <context> blocks, file existence checks, TOOL_MAP_PREREGISTERED exclusion-set for orphan detection, INTG-05 scope bound via allowlist, and INTEGRATION-CHECK.md artifact specification

---

## v0.6 Advanced Workflow Methodology (Shipped: 2026-03-20)

**Phases completed:** 8 phases, 19 plans, 2 tasks

**Key accomplishments:**

- (none recorded)

### Plugin Install Status (PLUG-01)

**Status: Working** — Plugin installs successfully via the two-step sequence:

```
/plugin marketplace add Grey-Altr/pde
```

```
/plugin install platform-development-engine@pde
```

Both commands completed without error when tested programmatically via the `claude` CLI (v2.1.79). The first command clones the GitHub repository via HTTPS and registers it as a marketplace source. The second command installs the plugin into user scope. Verify by typing `/pde:` in Claude Code and confirming the command palette appears.

### Known Exceptions

- Commits `e067974` and `efe3af0` lack `Co-Authored-By` trailers. These commits predate the convention and cannot be retroactively amended without rewriting published history. Documented here as known exceptions — not a defect.

---

## v0.5 MCP Integrations (Shipped: 2026-03-19)

**Phases completed:** 7 phases, 18 plans
**Commits:** 99 | **Files:** 118 | **LOC:** ~145,000
**Timeline:** 2 days (2026-03-18 → 2026-03-19)
**Git range:** feat(39-01) → docs(quick-260319-0u1)

**Key accomplishments:**

1. MCP Infrastructure Foundation: Central adapter module (mcp-bridge.cjs) with security allowlist, probe/degrade contracts, connection persistence, and canonical tool name mapping — all integrations share one bridge
2. GitHub Integration: Bidirectional sync (issues → REQUIREMENTS.md, handoff → PRs), brief from GitHub issue, CI pipeline status, write-back confirmation gates
3. Linear + Jira Integration: Issue sync, milestone/epic mapping, ticket creation from handoff, configurable `task_tracker` toggle — unified adapter pattern for both services
4. Figma Integration: DTCG token import/export, wireframe design context, Code Connect handoff, mockup-to-Figma canvas export with non-destructive merge
5. Pencil Integration: Design token sync to VS Code canvas, screenshot capture for visual critique audit, detection-based connection with graceful degradation
6. End-to-End Validation: 315 structural tests verifying multi-server concurrency isolation, post-compaction auth recovery, and write-back confirmation enforcement across all integrations

**Delivered:** A connected development platform with 5 MCP integrations (GitHub, Linear, Jira, Figma, Pencil) — all sharing a central adapter module with security allowlist, probe/degrade contracts, and write-back confirmation gates — enabling bidirectional sync between PDE planning state and external development tools, validated by 315 structural tests.

---

## v0.4 Self-Improvement & Design Excellence (Shipped: 2026-03-18)

**Phases completed:** 10 phases, 20 plans
**Commits:** 131 | **Files:** 259 | **LOC:** ~134,000
**Timeline:** 4 days (2026-03-14 → 2026-03-18)
**Git range:** test(phase-24) → docs(v1.3): re-audit

**Key accomplishments:**

1. Quality infrastructure: Awwwards 4-dimension rubric, motion design reference, composition/typography reference, protected-files mechanism for safe self-modification
2. Self-improvement fleet: `/pde:audit` with 3-agent orchestration (auditor/improver/validator), baseline delta tracking, PDE Health Reports
3. Skill builder: `/pde:improve` with create/improve/eval modes, validation gate, style guide enforcement — PDE can create and elevate its own skills
4. Design elevation: All 7 pipeline skills elevated with DTCG motion tokens, OKLCH harmony palettes, APCA contrast, spring physics, scroll-driven animations, variable font axes (330+ Nyquist assertions)
5. Pressure test: `/pde:pressure-test` with two-tier evaluation (process compliance + Awwwards quality rubric) and AI aesthetic avoidance detection
6. Tech debt closure: All audit findings resolved — 62/62 requirements satisfied, 10/10 phases verified, 0 remaining debt

**Delivered:** A self-improving design platform that audits, validates, and elevates its own output quality against professional standards — producing Awwwards-level design artifacts through a 13-stage pipeline with motion choreography, perceptual color harmony, and AI aesthetic avoidance, validated by end-to-end pressure testing.

---

## v0.3 Advanced Design Skills (Shipped: 2026-03-17)

**Phases completed:** 5 phases, 10 plans
**Commits:** 67 | **Files:** 84 | **LOC:** ~101,700
**Timeline:** 2 days (2026-03-16 → 2026-03-17)
**Git range:** feat(24-01) → feat(28-01)

**Key accomplishments:**

1. Built 6 new design skills: recommend, competitive, opportunity, mockup, HIG, and ideate
2. Migrated all existing skills to 13-field pass-through-all coverage pattern (zero flag clobber)
3. Expanded /pde:build orchestrator from 7 to 13 stages with --from entry point and dynamic stage counting
4. Created two-pass diverge→converge ideation pipeline with auto tool discovery at checkpoint
5. Added WCAG 2.2 AA / HIG audit with dual mode (light in critique, full standalone) and severity-rated findings
6. Wired soft upstream context injection (IDT/CMP/OPP) into /pde:brief with graceful degradation

**Delivered:** Six advanced design skills expanding the pipeline from 7 to 13 stages — ideation, competitive analysis, opportunity scoring, hi-fi mockups, HIG audit, and tool discovery — creating a comprehensive pre-brief research layer and post-iterate quality gate, all orchestrable via `/pde:build`.

---

## v0.2 Design Pipeline (Shipped: 2026-03-16)

**Phases completed:** 15 phases, 16 plans
**Commits:** 135 | **Files:** 172 | **LOC:** ~89,000
**Timeline:** 2 days (2026-03-15 → 2026-03-16)
**Git range:** docs(12) → docs(v1.1)

**Key accomplishments:**

1. Design pipeline infrastructure: state management, DTCG-to-CSS conversion, write-lock protocol, artifact manifest (design.cjs + pde-tools.cjs)
2. Problem framing (/pde:brief): structured brief generation with product-type detection (software/hardware/hybrid)
3. Design system (/pde:system): DTCG 2025.10 JSON tokens with CSS custom properties, OKLCH color space, dual dark mode
4. User flow mapping (/pde:flows): Mermaid flowchart diagrams with screen inventory JSON for wireframe stage
5. Wireframing + critique + iteration: fidelity-controlled HTML/CSS wireframes (/pde:wireframe), 4-perspective severity-rated critique (/pde:critique), versioned revision with convergence signal (/pde:iterate)
6. Handoff + orchestrator: TypeScript interfaces and STACK.md-aligned component specs (/pde:handoff), single-command full pipeline (/pde:build)

**Delivered:** A complete 7-stage design pipeline (brief → system → flows → wireframe → critique → iterate → handoff) that takes users from problem framing through visual wireframes to implementation-ready TypeScript specs, orchestrable via a single `/pde:build` command.

---

## v0.1 PDE MVP (Shipped: 2026-03-15)

**Phases completed:** 11 phases, 23 plans
**Commits:** 127 | **Files:** 303 | **LOC:** ~60,000
**Timeline:** 2 days (2026-03-14 → 2026-03-15)
**Git range:** feat(01-01) → feat(11-01)

**Key accomplishments:**

1. Complete GSD → PDE rebrand: zero GSD strings in any source file (grep-clean verified)
2. 34 `/pde:` slash commands operational with full command palette integration
3. Workflow engine with persistent `.planning/` state across context resets
4. Agent system with 12 PDE agent types and parallel wave orchestration
5. Public distribution ready: README, Getting Started guide, marketplace.json, version 1.0.0
6. Gap closure: runtime crash fix (telemetry.cjs), STATE.md regressions, 21 command stubs for dangling references

**Delivered:** A fully rebranded, publicly distributable Claude Code plugin that provides AI-assisted end-to-end product development lifecycle management.

---
