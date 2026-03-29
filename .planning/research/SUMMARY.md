# Project Research Summary

**Project:** PDE Stakeholder Presentation & Portfolio Synthesis Engine
**Domain:** Automated document synthesis from structured project artifacts
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

The Stakeholder Presentation Synthesis Engine is a reader-and-narrator system that transforms existing PDE artifacts (`.planning/` state files, event bus records, design manifests, git history) into audience-specific communication documents. Experts in this domain — drawing lessons from Notion AI, Linear, Jira ARNR, and GitHub Project Insights — converge on the same principle: document generation must be pipeline-structured, not freeform. The recommended approach is a three-stage pipeline: deterministic data extraction into a structured Intermediate Representation (IR) first, persona-specific narrative framing second, and format rendering (HTML/Markdown) last. Each stage must be independently testable and the LLM must only touch stage two.

The recommended stack is minimal by design. `ejs@5.0.1` handles all template rendering (CJS-native, zero config, handles 10 persona types without a framework), `markdown-it@14.1.1` converts `.planning/` Markdown state files to HTML sections, and all charts are hand-coded SVG (pure parametric functions — no library justifies the dependency footprint for 4–6 chart types). PDF export uses already-installed `playwright` behind an opt-in flag. No new packages enter the plugin root: the two new packages install into an isolated `bin/lib/presentation-pipeline/` subdirectory, following the established image-pipeline and video-pipeline pattern.

The single largest risk is LLM narrative hallucination about project state. Research confirms GPT-class models hallucinate 28–39% of facts even when given source material (Stanford Legal RAG, 2025). This risk is fully preventable with strict pipeline discipline: all quantitative claims must be extracted by deterministic code before any LLM call, every numeric statement in generated prose must be verified against the extraction JSON, and the LLM must never read `.planning/` files directly. The second major risk is premature persona abstraction: building all 10 personas simultaneously creates an untestable shared engine. The research mandate is clear — build exactly two reference personas end-to-end first, then extract abstractions from confirmed duplication only.

---

## Key Findings

### Recommended Stack

The stack is deliberately minimal, leveraging PDE's existing dependencies wherever possible. Two new packages are needed: `ejs` for template rendering and `markdown-it` for Markdown-to-HTML conversion. Everything else is already present in the plugin root or is a Node.js built-in.

**Core technologies:**
- `ejs@5.0.1`: HTML and Markdown template rendering — CJS-native, zero peer deps, 25M weekly downloads, sufficient for all 10 persona output types without a framework
- `markdown-it@14.1.1`: `.planning/` Markdown state → structured HTML sections — strict CommonMark compliance handles edge cases in nested planning files that `marked` mishandles
- Hand-coded SVG (zero dep): velocity, burndown, timeline, and effort charts as pure functions returning inline SVG strings — no library justified for 4–6 chart types
- `playwright@1.58.2` (already installed): on-demand PDF export from generated HTML via `page.pdf()` — gated behind `--pdf` flag, not auto-generated
- Node.js `fs.readdirSync` with `{ recursive: true }` (built-in, Node 18.17+): cross-project directory walking for portfolio synthesis — no `fast-glob` needed at expected scale

**What to avoid:** `puppeteer` (duplicate Chromium when `playwright` is already installed), `vega`/`vega-lite` (requires `canvas` native binary, fails in clean CI), `jsdom` (28MB for a DOM shim), `chart.js` (browser-canvas dependent, no headless SVG path), `wkhtmltopdf`/`html-pdf` (system binary or archived project), any CDN-linked CSS or JS in generated HTML (breaks self-contained constraint).

### Expected Features

**Must have (table stakes):**
- Per-persona document generation (`/pde:present [persona]`) — each of 10 personas has distinct information needs and narrative arc
- Dual HTML + Markdown output — HTML is derived from Markdown; one generation path, not two separate LLM calls
- Phase completion status summary — every stakeholder report requires progress at a glance
- Key metrics extraction — dates, token cost, task counts from existing event bus records
- Design artifact embedding — wireframes and mockups from `.planning/design/` as evidence
- Git commit velocity summary — proves engineering cadence from existing git history integration
- Blocker and risk callouts — extracted from phase plans and RECONCILIATION.md files
- Output persistence in `.planning/presentations/` with timestamp-versioned filenames (never overwrite)

**Should have (competitive differentiators):**
- Persona-driven narrative arc — same data, fundamentally different story structure per audience (no existing tool does this from structured dev artifacts)
- Research validation sourcing — claims backed by v0.7 validated research, not asserted (unique to PDE)
- Cost transparency narrative — "built X for $Y in token costs" is novel; no competitor reports LLM cost per deliverable
- Auto-generation on phase completion — hook-triggered via existing Claude Code hooks infrastructure
- Acceptance-criteria proof table — AC→VERIFICATION.md traceability, unique to PDE methodology
- Product-type-aware framing — experience/business/hardware products get domain-specific narrative

**Defer to v2+:**
- Cross-project portfolio synthesis — requires single-project synthesis stable first; introduces schema version complexity
- Timeline confidence scoring with velocity projection — deferred to P3; depends on stable portfolio infrastructure
- Launch Announcement persona — depends on cross-project synthesis infrastructure
- Interactive slide deck editor, real-time collaborative editing, email/Slack delivery — anti-features; scope traps adding months of orthogonal work with no PDE infrastructure

### Architecture Approach

The architecture follows the established context-sync.cjs emitter pattern. A single `presentation.cjs` library reads all `.planning/` artifacts into an IR object once; all 10 personas consume from the same IR. Individual persona modules (`bin/lib/personas/*.cjs`) are pure functions: `render(ir) → sections[]`. A separate `present-render.cjs` module wraps sections into the target format (HTML or Markdown). `pde-tools.cjs` gains a `presentation` subcommand family. Auto-generation fires via a new hook file (`hooks/present-on-phase.cjs`) registered with `async: true` — never blocking Claude Code execution.

**Major components:**
1. `bin/lib/presentation.cjs` — artifact reader (`readArtifacts(cwd)`), IR builder, persona dispatcher, portfolio reader; sole file-system reader; reuses `cmdHistoryDigest` from `commands.cjs`
2. `bin/lib/personas/*.cjs` — 10 isolated persona modules, each a pure `render(ir) → sections[]` function; mirrors the emitter architecture of context-sync.cjs
3. `bin/lib/present-render.cjs` — dual-format renderer: `renderMarkdown(sections, meta)` and `renderHtml(sections, meta)`; format is a rendering concern, not a persona concern
4. `bin/pde-tools.cjs` (extended) — `presentation` subcommand block routing to above libs; additive case block, isolated from existing subcommands
5. `hooks/present-on-phase.cjs` — PostToolUse listener with SessionEnd/cooldown gate, detects `phase_complete` event in NDJSON, triggers background generation; `async: true`
6. `commands/present.md` + `workflows/present.md` — slash command entry and execution workflow

**Key data flows:**
- `readArtifacts()` reuses `cmdHistoryDigest` from `commands.cjs` for phase traversal — no re-implementation of phase directory walking
- `presentation_generated` event emitted to NDJSON; surfaces in tmux dashboard Pane 4 automatically
- Milestone archive `.planning/milestones/v*-ROADMAP.md` files are the richest "what shipped when" source
- Portfolio mode: `portfolioReader(cwdList)` calls `readArtifacts()` per project, returns IR array tagged with project paths

### Critical Pitfalls

1. **LLM narrative hallucination about project state** — extract all quantitative claims deterministically first (structured JSON), verify each against its source file, only then call the LLM with "generate narrative only from this data; say '[data not available]' for missing fields." A post-generation pass must verify every numeric claim in generated prose matches the extraction JSON. Never allow the LLM to read `.planning/` files directly. (Stanford Legal RAG, 2025: 28–39% hallucination rate even with source material provided.)

2. **Chart data divergence from actual records** — define one authoritative source per metric (phase completion → STATE.md frontmatter only; commit velocity → git log only). Validate extracted numbers against cross-references before rendering. All chart generation must be deterministic code, never LLM. Every chart value must pass a Nyquist assertion against its source before any persona can use it. (VectorGym benchmark, 2025: LLMs produce inaccurate path counts and incomplete SVGs in generated vector graphics.)

3. **Auto-generation firing on every PostToolUse event** — a normal `pde:plan-phase` execution triggers 20–40 Write events to `.planning/`. Wiring auto-generation to PostToolUse blocks workflows with stale mid-execution snapshots and fills the dashboard with noise. Wire to SessionEnd or a 30s idle cooldown instead. Gate additionally on STATE.md showing `status: Completed`. Default `auto_generate: false` in config.json; opt-in only.

4. **Premature persona abstraction creating an untestable engine** — build exactly two reference personas (executive summary + case study — the internal/external poles) end-to-end before extracting any shared abstractions. The 10 personas differ primarily in what data they need, not in rendering logic. A shared `PersonaConfig` built for all 10 personas before any is proven produces an engine that is correct structurally and wrong semantically.

5. **Self-contained HTML edge cases** — enforce a 500KB hard file size budget on generated HTML; no inline `<script>` blocks (eliminates corporate CSP failures); no external URLs (no CDN fonts, no stylesheet links); no base64-embedded images by default; test in Chrome, Safari, and a text-based renderer. These constraints must be established before any HTML template is built — retrofitting them breaks all existing templates. (cucumber/html-formatter issue #62: reports growing from 7MB to 310MB in production.)

---

## Implications for Roadmap

The research identifies four natural phases, driven by strict dependency ordering. The data extraction foundation must precede persona rendering; two reference personas must be proven before the shared engine is abstracted; HTML rendering constraints must be locked in early; and portfolio synthesis is last due to schema version complexity and cross-project risk.

### Phase 1: Data Extraction Foundation and Core Pipeline Infrastructure

**Rationale:** This is the critical path. All persona output depends on correct data extraction. Building personas before the extraction layer is validated is the most common cause of hallucinated presentations (Pitfall 1). The hook trigger logic also belongs here so it is designed correctly before any generation code runs (Pitfall 3). The IR object shape must accommodate all 10 personas before the first persona is built.
**Delivers:** `bin/lib/presentation.cjs` with `readArtifacts(cwd)` and IR object; phase completion % calculator; metric extractor (dates, cost, task counts, blockers); `pde-tools.cjs presentation artifact-read` subcommand; `.planning/presentations/` output directory with file naming convention; hook trigger design (SessionEnd/cooldown, not PostToolUse); `auto_generate: false` default in config; data cross-reference validation layer
**Addresses:** Per-persona document generation (prerequisite), phase completion status summary, key metrics extraction, output persistence, blocker/risk extraction
**Avoids:** LLM narrative hallucination (extraction-first architecture established before any LLM call), auto-generation workflow noise (trigger logic designed upfront), chart data divergence (source-of-truth mapping defined at extraction layer)

### Phase 2: Two Reference Personas and Dual-Format Rendering

**Rationale:** Build executive summary (Cluster A: internal/forward-looking) and case study (Cluster B: external/retrospective) as independent end-to-end implementations before abstracting any shared logic. These are the poles of the persona spectrum; duplication between them is the only valid basis for shared abstractions (Pitfall 4). HTML rendering constraints must be locked here before any other persona adds templates (Pitfall 5). FEATURES.md identifies 80% shared logic for executive summary and 60% shared logic for case study — validating these estimates requires both to exist first.
**Delivers:** `personas/executive.cjs` and `personas/case-study.cjs` as proven reference implementations; `bin/lib/present-render.cjs` with `renderMarkdown()` and `renderHtml()` (500KB budget, no JS, no external URLs, self-contained enforced); `commands/present.md` + `workflows/present.md`; `/pde:present` slash command; EJS templates for both personas in HTML and Markdown; design artifact embedding from `.planning/design/`; product-type-aware framing applied as enrichment layer
**Uses:** `ejs@5.0.1`, `markdown-it@14.1.1`, hand-coded SVG chart functions installed into `bin/lib/presentation-pipeline/`
**Implements:** Common artifact-reading pipeline (IR pattern), pde-tools subcommand extension, dual HTML+Markdown renderer
**Avoids:** Premature persona abstraction (two independent implementations first — shared abstractions extracted after both pass), self-contained HTML edge cases (constraints locked before additional templates)

### Phase 3: Remaining 8 Personas and Shared Engine

**Rationale:** With two reference personas proven and duplication confirmed, extract shared abstractions and build the remaining 8 personas. The shared engine is built from observed duplication, not anticipated duplication. FEATURES.md groups personas into Cluster A (internal/forward-looking: sprint review, client deliverable, investor update, stakeholder status) and Cluster B (external/retrospective: post-mortem, ADR summary, launch announcement) with ~70% cross-cluster shared logic estimated — confirm this against the two reference implementations before committing to an abstraction boundary.
**Delivers:** Full 10-persona suite (all `bin/lib/personas/*.cjs`); shared extraction utilities extracted from confirmed duplication; sprint review, client deliverable, investor update, stakeholder status, post-mortem, ADR summary, portfolio overview, launch announcement personas; auto-generation hook (`hooks/present-on-phase.cjs`) with SessionEnd/cooldown trigger registered in hooks.json; research validation sourcing integration (v0.7 agent output); acceptance-criteria proof table from VERIFICATION.md
**Addresses:** All Cluster A and Cluster B personas; auto-generation on phase completion; research validation sourcing; cost transparency narrative
**Avoids:** Premature abstraction (built from confirmed duplication only); context bleeding between persona narrative calls (isolated LLM contexts per persona)

### Phase 4: Cross-Project Portfolio Synthesis

**Rationale:** This phase is last because it depends on all single-project synthesis being stable, and it introduces the highest-risk new failure mode: schema version heterogeneity across older PDE projects (Pitfall 6 from PITFALLS.md — PDE schema has changed across every milestone v0.12–v0.21). Schema version detection must be built before any cross-project extraction runs. Portfolio synthesis is a compositional extension of single-project synthesis, not a rewrite.
**Delivers:** `portfolioReader(cwdList)` in `presentation.cjs`; schema version detector (reads `gsd_state_version` from STATE.md frontmatter, selects extraction adapter); defensive cross-project extraction (null for absent fields, structured error for failed projects, never crash on missing keys); `commands/portfolio.md` + `workflows/portfolio.md`; `/pde:portfolio` slash command; portfolio-level narrative for executive and investor personas; IR caching with STATE.md mtime as cache key; parallel extraction for multiple projects
**Addresses:** Cross-project portfolio synthesis; portfolio overview persona; scalability for 4–20 projects
**Avoids:** Cross-project path/schema assumptions (version detection gate before any extraction); auto-discovery glob (explicit path list only — never traverse filesystem to find `.planning/` dirs); path traversal via user-supplied roots (validate absolute path with readable `.planning/` before processing)

### Phase Ordering Rationale

- **Extraction before rendering:** The research is unambiguous — LLM hallucination is the highest-damage failure mode, and the only prevention is strict extraction-first architecture. No persona can be built before the extraction layer is validated. Building personas first and adding verification later consistently fails in analogous systems.
- **HTML constraints before additional templates:** Self-contained HTML edge cases (Pitfall 5) require constraints to be established before any template is built; retrofitting them breaks all existing templates. Phase 2 locks this in for the first two personas; all subsequent personas inherit the constraint.
- **Two reference personas before shared engine:** Pitfall 4 (premature abstraction) is a confirmed failure mode. Building the shared engine from observed duplication rather than anticipated duplication is the primary guard.
- **Portfolio synthesis last:** Pitfall 6 (schema version heterogeneity) is the highest-complexity failure. The schema version detection work has no dependencies on Phases 2–3 internals, but the integration risk warrants isolation in its own phase, after single-project synthesis is stable.
- **Feature groupings match research clusters:** FEATURES.md identifies Cluster A (internal/forward-looking) and Cluster B (external/retrospective) personas with ~70% shared logic within each cluster. Phase 3 builds along these natural groupings after the reference implementations confirm the pattern.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (IR design):** The specific set of fields needed across all 10 personas should be validated before finalizing the IR object shape. Recommended pre-planning exercise: list what each persona needs, deduplicate, confirm all fields are deterministically extractable from current `.planning/` artifacts. A persona-to-field mapping table is a worthwhile pre-planning artifact.
- **Phase 4 (portfolio synthesis):** Schema version detection across PDE v0.12–v0.21 needs specific mapping of which frontmatter keys changed per milestone. Audit STATE.md frontmatter across representative older projects before planning this phase to build the version detection mapping.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 2 (dual-format rendering):** EJS + markdown-it integration follows well-documented CJS patterns; HTML rendering constraints are enumerated explicitly in PITFALLS.md. No additional research needed.
- **Phase 3 (persona engine):** Patterns are fully defined by the Phase 2 reference implementations. The task is execution against proven patterns, not discovery.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against npm registry; integration patterns verified against existing PDE codebase (image-pipeline pattern, pde-tools.cjs subcommand routing, hooks/hooks.json format confirmed via source inspection) |
| Features | MEDIUM | Ecosystem patterns verified via web search and competitive analysis (Notion AI, Linear, Jira ARNR, GitHub Insights); persona feature sets are research-informed judgments without a single authoritative spec source |
| Architecture | HIGH | Based on direct inspection of existing PDE source code (pde-tools.cjs 1681 lines, context-sync.cjs emitter pattern, hooks.json registration format, event-bus.cjs event schema, commands.cjs cmdHistoryDigest); all integration points confirmed against actual code |
| Pitfalls | HIGH | Hallucination rates from Stanford Legal RAG (2025); SVG generation pitfalls from VectorGym benchmark (2025); HTML file size failures from cucumber/html-formatter production issue #62; hook noise patterns from Claude Code hook contracts and PDE's own context-sync-hook.cjs source; cross-project schema pitfalls from PDE milestone history |

**Overall confidence:** HIGH

### Gaps to Address

- **IR field completeness validation:** The IR object shape is defined architecturally but the complete field list across all 10 personas has not been enumerated. Map each persona's data requirements before finalizing Phase 1 implementation to avoid IR schema churn during Phase 2–3.
- **Schema version inventory for portfolio synthesis:** The exact frontmatter key changes across PDE milestones v0.12–v0.21 are known qualitatively but not mapped to specific keys. Run a targeted audit of STATE.md frontmatter across representative older projects before Phase 4 planning.
- **EJS vs template literals trade-off:** STACK.md recommends EJS but notes that persona output structures may be simple enough that EJS adds complexity without benefit. Validate during Phase 2 implementation; falling back to template literals in CJS modules is legitimate if EJS overhead is not justified.
- **Default UX for `/pde:present`:** The default command behavior (which persona, which format, behavior when no presentations directory exists, behavior when artifacts are incomplete) should be finalized during Phase 1 planning rather than discovered during Phase 2 implementation.

---

## Sources

### Primary (HIGH confidence)

- PDE codebase direct inspection: `bin/pde-tools.cjs`, `bin/lib/context-sync.cjs`, `bin/lib/commands.cjs`, `hooks/hooks.json`, `hooks/context-sync-hook.cjs`, `hooks/emit-event.cjs`, `hooks/archive-session.cjs`, `bin/lib/event-bus.cjs`, `.planning/PROJECT.md`, `workflows/execute-phase.md`, `.planning/config.json` — architecture patterns and integration points (2026-03-29)
- npm registry direct query: `ejs@5.0.1`, `markdown-it@14.1.1`, `playwright@1.58.2`, `d3@7.9.0`, `linkedom@0.18.12`, `pdfkit@0.18.0`, `jsdom@29.0.1`, `@observablehq/plot@0.6.17` — version and compatibility verification (2026-03-29)
- Node.js release history: `fs.readdirSync` recursive option added in Node 18.17.0 LTS

### Secondary (MEDIUM confidence)

- Stanford Legal RAG Hallucinations (2025) — 28–39% hallucination rate even with source material; basis for extraction-first pipeline design
- VectorGym benchmark (OpenReview, 2025) — LLM SVG generation pitfalls: inaccurate path counts, incomplete SVGs; basis for deterministic chart generation mandate
- cucumber/html-formatter GitHub issue #62 — self-contained HTML file size explosion (7MB to 310MB in production); basis for 500KB budget
- Notion AI Review 2026, Linear Changelog (initiative updates Feb 2025), Jira ARNR Atlassian Marketplace Q4 2025 updates, GitHub community discussion #38840 (missing burndown chart) — competitive feature analysis
- "The Double-Edged Sword of Abstraction in Software Engineering" (blog.chinaza.dev, 2024) — basis for two-personas-before-abstraction recommendation
- designmodo.com "HTML and CSS in Emails: What Works in 2026" — inline CSS constraints for email-safe generated HTML
- Digital Project Manager AI reporting guide, Agile Seekers automation guide — AI project status reporting best practices

### Tertiary (LOW confidence)

- Observable Plot GitHub discussions #847, #1759 — jsdom compatibility for server-side SVG (referenced for alternatives analysis)
- Cursor 1.7 Hooks release (InfoQ, 2025) — hook event noise patterns in analogous hook system
- Allure issue #755 on single-file HTML portability — corroborating evidence for file size constraints

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
