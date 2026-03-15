# Project Research Summary

**Project:** Platform Development Engine (PDE) — v1.1 Design Pipeline
**Domain:** AI-assisted product design pipeline (brief → flows → system → wireframe → critique → iterate → handoff)
**Researched:** 2026-03-15 (v1.1 update; v1.0 research dated 2026-03-14)
**Confidence:** HIGH

## Executive Summary

PDE v1.1 adds a 7-stage text-native design pipeline to an existing AI development tool. The core architectural insight from research is that the LLM IS the generator: Claude writes Mermaid diagrams, HTML wireframes, DTCG design tokens, and TypeScript interfaces directly as text output. This eliminates all new npm dependencies — the entire design pipeline extends the existing zero-dependency CommonJS codebase using only Node.js built-ins. The recommended approach is to implement each skill as a self-contained, independently runnable workflow that slots into exactly two layers of PDE's existing architecture: the commands/workflows layer (7 new implementations) and the state layer (a new `.planning/design/` subtree). All templates, DESIGN-STATE schemas, and the `design-manifest.json` schema are already implemented in the codebase — the implementation work is wiring them into workflows.

The research draws a hard line between what PDE is and what it is not. PDE produces text artifacts that describe design intent; it does not produce visual files, does not replace Figma, and does not implement components. This boundary is not a limitation — it is the product strategy. The entire pipeline runs offline, produces version-controlled Markdown and HTML files that diff cleanly in git, and integrates with the existing `.planning/` state system. No existing tool offers a complete brief-to-handoff pipeline in text-native, file-based form integrated with a development workflow engine: Figma has no brief or flow stage; v0/Bolt skip design entirely; UX Pilot has no handoff or workflow integration.

The primary risks are LLM output consistency and scope creep. Without explicit fidelity contracts, token format schemas enforced at schema-definition time, and STACK.md injection into the handoff stage, the pipeline produces artifacts that are internally consistent but globally misaligned. The mitigation is schema-first development: establish the canonical token format, artifact naming convention, and DESIGN-STATE structure before any skill workflow is written. The second risk is that design pipeline work is adjacent to real design tools, creating constant pressure to add image generation, Figma export, and real-time preview. The scope boundary must be stated explicitly in every phase plan — not once in a requirements document that implementors do not re-read.

---

## Key Findings

### Recommended Stack

PDE v1.1 adds zero new npm dependencies. All design pipeline capabilities extend `bin/pde-tools.cjs` and a new `bin/lib/design.cjs` using Node.js built-ins only. The constraint is architectural: the existing codebase is CommonJS (`require()`), and all candidate libraries for design tooling (Mermaid 10+, Style Dictionary 4+, Terrazzo 0.7.2, Commander 15) are ESM-only and incompatible. This is fortunate, not limiting — the LLM generates Mermaid syntax text, DTCG token JSON, and TypeScript interfaces directly, making every one of those libraries unnecessary anyway.

The DTCG 2025.10 specification (W3C first stable release) is the token format. A 15-line recursive `dtcgToCss()` function in `bin/lib/design.cjs` converts DTCG JSON to CSS custom properties — no Style Dictionary or Terrazzo required. Wireframes are self-contained HTML files with inline CSS referencing `../../assets/tokens.css`. The post-v1 evolution (MCP integrations, standalone CLI) uses `@modelcontextprotocol/sdk` v1.x and Commander 14.x when those milestones are reached.

**Core technologies (v1.1):**
- Node.js 20.x LTS — runtime; already required; no change
- CommonJS (.cjs) — module format; required for Claude Code plugin compatibility
- Markdown + YAML frontmatter — skill/workflow definitions; native to existing system
- DTCG 2025.10 JSON — canonical token format; W3C stable spec; LLM-native; `$value`/`$type` structure
- CSS custom properties — token output format; generated from DTCG via inline `dtcgToCss()` in `bin/lib/design.cjs`
- Static HTML — wireframe format; self-contained, browser-viewable, no server required
- Mermaid syntax (text only) — flow diagrams; written by LLM into `.md` fenced code blocks; no mermaid npm package

**What NOT to use (confirmed incompatible or unnecessary):**
- `mermaid` npm (ESM-only since v10; PDE only needs text output, not rendering)
- `style-dictionary` npm (ESM-only since v4; overkill for single-platform CSS output)
- `@terrazzo/cli` npm (ESM-only v0.7.2; same fit issue as Style Dictionary)
- `json-schema-to-typescript` (CJS support unconfirmed at v15; LLM writes better TypeScript anyway)
- Any HTML template engine (LLM writes bespoke HTML directly — no template engine needed)
- Commander 15 (ESM-only; requires Node 22.12+; incompatible with CJS codebase)

### Expected Features

The v1.1 MVP is all 7 skills at table-stakes level, both standalone and via `/pde:build` orchestration. Every skill has well-defined output formats (specified in `templates/`), dependency inputs, and anti-features that establish hard scope boundaries.

**Must have (table stakes — all P1 for v1.1 launch):**
- `/pde:brief` — structured brief with problem statement, personas, JTBD, goals, constraints, non-goals; anchors all downstream stages
- `/pde:flows` — happy path + error states + edge cases per persona; Mermaid diagrams in `.md` files; screen inventory for wireframe stage
- `/pde:system` — DTCG color/typography/spacing tokens + CSS variables + component inventory extracted from flow labels
- `/pde:wireframe` — ASCII/Unicode wireframes per screen; fidelity-controlled (`lo-fi` default; `mid-fi` available); state variants + annotations
- `/pde:critique` — multi-perspective heuristic evaluation (user, visual hierarchy, accessibility, flow logic) + severity ratings (Critical/High/Medium/Low) + fix recommendations
- `/pde:iterate` — issue-targeted wireframe updates + change log + deferred issue list + convergence signal after 3+ iterations
- `/pde:handoff` — TypeScript interfaces per component + implementation order (leaf-first) + CSS variables (final) + task list for implementation phase
- `/pde:build` — thin orchestrator reading DESIGN-STATE.md, running incomplete stages sequentially, human verification gates between each stage

**Should have (differentiators — add after v1.1 validation):**
- Assumption violation detection in critique (needs proven brief format stability)
- Existing component detection in handoff (needs codebase indexing capability)
- Implementation task injection into PDE workflow engine (needs handoff-to-plan bridge)
- Scope-controlled iteration (`--severity=critical,high` filter)
- Figma MCP export from handoff (requires MCP integration milestone)
- Responsive wireframe variants (add when users report mobile design as blocker)

**Defer (v2+):**
- Competitive analysis integrated into brief stage
- AI-generated persona research from user interview transcripts
- Image/screenshot-based design critique (requires reliable vision model integration)
- High-fidelity mockup generation (requires image generation pipeline)

### Architecture Approach

The design pipeline slots into PDE's existing layered architecture at exactly two points — command/workflow layer and state layer — with no changes to the agent layer, tooling layer, or any existing files except the 7 command stubs (which get their `<process>` blocks replaced with workflow references). The architecture follows four established PDE patterns: Skill-as-Self-Contained-Workflow (each skill runs standalone or orchestrated), Artifact Versioning via Filename Suffix (never overwrite; `BRF-brief-v2.md` not `BRF-brief.md`), DESIGN-STATE as Distributed Write-Locked Index (domain DESIGN-STATE files written by each skill; root merged by main context only), and Token Dependency for Staleness Tracking (design system changes cascade stale flags to dependent wireframes).

The artifact dependency chain is linear with one parallel opportunity: `PROJECT.md → brief → [flows || system] → wireframe → critique → iterate → handoff`. Flows and system share only the brief dependency and can be implemented in parallel. All design artifacts live under `.planning/design/` in domain subdirectories (`strategy/`, `ux/`, `visual/`, `review/`, `handoff/`, `assets/`). The `design-manifest.json` is the machine-readable bridge between the design pipeline and future engineering phases.

**Major components (v1.1 delta from existing):**
1. `commands/*.md` (7 stubs upgraded + 1 new `build.md`) — entry points; reference workflow files; stubs already exist
2. `workflows/*.md` (8 new files: 7 skills + 1 orchestrator) — implement skill logic: read prerequisites, produce artifacts, update DESIGN-STATE
3. `bin/lib/design.cjs` (new) — utility module: DTCG-to-CSS conversion, manifest read/write, artifact path resolution; no new npm deps
4. `.planning/design/` subtree (created at runtime) — per-project artifact store with domain subdirectories
5. `design-manifest.json` — machine-readable artifact registry; fully designed template already exists
6. DESIGN-STATE infrastructure (root + per-domain) — write-lock protocol; all templates already exist

What does NOT exist yet and must be created: 8 workflow files, `bin/lib/design.cjs`, `commands/build.md`. What DOES exist and is ready: all 6 design artifact templates, DESIGN-STATE templates (root + domain), `design-manifest.json` template, all 7 command stubs, all references.

### Critical Pitfalls

1. **Wireframe fidelity drift** — LLMs default to "impressive output" without a fidelity constraint, producing wildly different fidelity between invocations. Downstream critique and iterate break when fidelity is inconsistent. Prevention: define `skeleton | lo-fi | mid-fi` enum, enforce via agent prompt constraint blocks per level, store fidelity in artifact frontmatter. Must be built in from day one; retrofitting breaks artifact compatibility.

2. **Generic critique from missing context** — Critique agent spawned with only the wireframe produces textbook UX advice applicable to any interface ("consider improving visual hierarchy"). Without brief and flows in context, the LLM evaluates a generic UI rather than this specific product's design decisions. Prevention: critique agent receives `brief.md`, `flows.md`, and the wireframe — in that order. Block critique entirely rather than run a degraded pass when brief or flows are absent.

3. **Design token naming inconsistency across pipeline stages** — Without a canonical token format schema established before any agent runs, each context window invents locally consistent but globally inconsistent naming. Wireframe uses `--color-primary`; handoff references `color.primary`; design system uses `$primary`. Prevention: canonical format defined in `templates/design-system.md` before any skill is built; every downstream agent reads the token table from the generated system doc before producing output.

4. **Handoff spec targets wrong tech stack** — Handoff agent has no information about the project's actual tech stack, so defaults to training-data-most-common patterns. Prevention: `/pde:handoff` reads `.planning/research/STACK.md` before generating specs; if STACK.md is absent, block and require user to supply it. This is a required input, not optional context.

5. **Pipeline state not persisted — crashes lose all progress** — A 7-stage pipeline with no checkpoint state forces users to restart from the beginning after any interruption. Prevention: add design pipeline state to the existing state system before the first skill is implemented; expose `design-state load` and `design-state update` in `pde-tools.cjs`; every skill writes its status at start AND completion.

6. **Infinite iterate loop with no convergence signal** — LLM critique will always find something to improve. Without a convergence signal, users never know when to proceed to handoff. Prevention: `/pde:iterate` tracks iteration count in design state; after iteration 3+, surfaces explicit convergence checklist and "ready for handoff" recommendation. Build into the first implementation — not added after users report the problem.

7. **Scope creep into real design tooling** — Design pipeline work is adjacent to Figma, creating constant pressure to add image generation, real-time preview, color pickers. Each is individually defensible; collectively they delay the core pipeline 10x with no payoff. Prevention: scope boundary stated explicitly in every phase plan. When a feature sounds like "PDE should do what Figma does," the answer is "future milestone or Figma MCP integration."

---

## Implications for Roadmap

Based on the artifact dependency structure (ARCHITECTURE.md) and pitfall sequencing (PITFALLS.md), the recommended phase structure follows the dependency chain with schema-first infrastructure preceding all skill implementations. The architecture explicitly recommends this 9-build-phase sequence:

### Phase 1: Design Pipeline Infrastructure
**Rationale:** PITFALLS.md is explicit that pipeline state, artifact storage convention, and DESIGN-STATE schema must be established before any skill workflow is written. Retrofitting these after 7 skills exist causes cascading disruption. All templates are ready — this phase wires them into tooling.
**Delivers:** `bin/lib/design.cjs` (DTCG-to-CSS converter + manifest operations); `pde-tools.cjs design-state` commands (load, update, status, coverage-check, staleness-check); `.planning/design/` directory structure creation logic; write-lock protocol for root DESIGN-STATE.md; `commands/build.md` stub.
**Avoids:** PITFALLS 6 (pipeline state), 8 (artifacts outside `.planning/`), 3 (token naming — canonical format locked before any agent runs)

### Phase 2: Problem Framing (`/pde:brief`)
**Rationale:** Brief is the single anchor document that every downstream skill reads. A weak or inconsistently formatted brief corrupts every downstream stage. Build and validate the brief format first.
**Delivers:** Full `commands/brief.md` skill + `workflows/brief.md`; `strategy/` domain initialized; `BRF-brief-v{N}.md` production; DESIGN-STATE updated on completion; REQUIREMENTS.md traceability; standalone execution acceptance test passed.
**Addresses:** FEATURES brief table stakes (problem statement, personas, JTBD, goals, constraints, non-goals)
**Avoids:** PITFALL 2 (brief must exist before critique can run); PITFALL 10 (standalone execution tested)

### Phase 3: Design System (`/pde:system`)
**Rationale:** Can be built immediately after brief (only brief dependency). Must precede wireframe because wireframe consumes `assets/tokens.css`. Building system early locks in the token naming convention that all downstream skills must use — the explicit Pitfall 3 prevention.
**Delivers:** Full `commands/system.md` + `workflows/system.md`; DTCG token JSON production; `dtcgToCss()` invocation via `pde-tools.cjs design tokens-to-css`; `assets/tokens.css` generation; component inventory from flow labels; CSS variable block; WCAG contrast check at token level.
**Avoids:** PITFALL 3 (token naming inconsistency — system establishes canonical format before wireframe runs)

### Phase 4: User Flow Mapping (`/pde:flows`)
**Rationale:** Flows can be implemented in parallel with system (both depend only on brief). Separate phase to allow parallel implementation tracks. Must complete before wireframe (wireframe derives its screen inventory from flow labels).
**Delivers:** Full `commands/flows.md` + `workflows/flows.md`; Mermaid flow diagrams in `ux/`; happy path + error states + edge cases per persona; flow-to-screen labeling; gap flagging against brief goals; standalone execution tested.
**Addresses:** FEATURES flows table stakes (happy path, decision branches, error states, entry points, screen inventory)

### Phase 5: Wireframing (`/pde:wireframe`)
**Rationale:** Depends on both flows (screen inventory) and system (token vocabulary). Cannot begin until Phases 3 and 4 complete. Fidelity contract is the highest-priority implementation requirement per PITFALLS.md — built in from day one, never retrofitted.
**Delivers:** Full `commands/wireframe.md` + `workflows/wireframe.md`; ASCII/Unicode wireframes per screen; fidelity enum enforced in agent prompt (`lo-fi` default, `mid-fi` available); state variants (default, loading, error); annotation layer; screen index file; token dependency recorded in manifest.
**Avoids:** PITFALL 1 (fidelity drift — enforced in agent prompt on first implementation)

### Phase 6: Design Critique (`/pde:critique`)
**Rationale:** Depends on wireframes. Multi-perspective structure requires all upstream artifacts to produce specific critique. Building critique before iterate validates the issue list format before iterate consumes it.
**Delivers:** Full `commands/critique.md` + `workflows/critique.md`; brief + flows injected into critique context (dependency check blocks run if absent); multi-perspective evaluation; coverage check (wireframes vs flows); severity ratings; fix recommendations; "What Works" preservation section.
**Addresses:** FEATURES critique table stakes; peer-reviewed research (arxiv 2507.02306) confirms AI critique finds 73-77% of usability issues vs 57-63% human baseline when structured correctly
**Avoids:** PITFALL 2 (generic critique — brief and flows injected before LLM invocation, blocked if absent)

### Phase 7: Critique-Driven Iteration (`/pde:iterate`)
**Rationale:** Depends on critique. Convergence signaling must be built into the first implementation — PITFALLS.md is explicit that adding it after users report the infinite loop problem is the failure mode.
**Delivers:** Full `commands/iterate.md` + `workflows/iterate.md`; issue-targeted wireframe updates; new versioned artifact files (never overwrite); change log per iteration; deferred issue list; convergence checklist + "ready for handoff" recommendation after iteration 3+.
**Avoids:** PITFALL 9 (infinite iterate loop — convergence signal built in from day one)

### Phase 8: Design-to-Code Handoff (`/pde:handoff`)
**Rationale:** Terminal skill; depends on all prior artifacts. STACK.md integration is a required input per PITFALLS.md Pitfall 4. Handoff is the bridge between design pipeline and engineering phases via `design-manifest.json`.
**Delivers:** Full `commands/handoff.md` + `workflows/handoff.md`; STACK.md integration for stack-aware prop naming; TypeScript interfaces per component; implementation order (leaf components first); CSS variables (final); component tree/composition map; behavior specifications; task list for implementation phase; `design-manifest.json` fully populated.
**Avoids:** PITFALL 4 (stack mismatch — STACK.md is a required input, blocked if absent)

### Phase 9: Pipeline Orchestrator (`/pde:build`)
**Rationale:** Thin orchestrator built last after all 7 skills are independently validated. PITFALLS.md Pitfall 5 documents the god-orchestrator failure mode precisely — the delegation boundary must be the initial design, not a refactor target.
**Delivers:** Full `commands/build.md` + `workflows/build.md`; reads DESIGN-STATE.md to determine incomplete stages; sequential stage invocation with human verification gates; crash-resumable from last complete stage; dry-run support; progress reporting.
**Avoids:** PITFALL 5 (god orchestrator — build workflow stays under ~80 lines; all logic lives in individual skill workflows); PITFALL 6 (pipeline state; resumability verified via crash-recovery acceptance test)

### Phase Ordering Rationale

- **Schema-first, skills-second:** Infrastructure (Phase 1) before any skill produces artifacts. State management, storage conventions, and token format schema cannot be retrofitted without cascading disruption to all 7 skills.
- **Brief anchors everything (Phase 2):** A breaking change to brief format cascades to all 6 downstream skills. Validate the brief format first, in isolation.
- **System before wireframe (Phase 3 before 5):** Design system establishes the token naming contract wireframe and handoff must respect. Building wireframe before system guarantees Pitfall 3 occurs.
- **Flows and system can parallelize (Phases 3 and 4):** Both depend only on brief. Separate phases to allow parallel tracks; sequential order is safe if resources don't allow parallel.
- **Orchestrator last (Phase 9):** Requires all 7 skills independently validated. Building earlier forces integration against unvalidated components.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (wireframe):** ASCII wireframe generation reliability may vary for complex screens (dashboards, data tables with many rows). Acceptance criteria should include stress-testing with information-heavy screens before marking the phase complete.
- **Phase 8 (handoff):** TypeScript interface generation quality degrades if wireframe annotations are sparse. Verify annotation completeness requirements are captured in Phase 5 acceptance criteria.
- **Phase 9 (build):** Orchestrator crash-resume behavior requires test infrastructure to simulate mid-pipeline interruption. Plan for explicit crash-recovery test cases in acceptance criteria.

Phases with standard patterns (skip deeper research):
- **Phase 1 (infrastructure):** All templates, DESIGN-STATE schemas, and `design-manifest.json` schemas are already implemented. Direct source inspection confirms readiness — no research needed.
- **Phase 2 (brief):** Problem statement + persona elicitation is a well-documented pattern (HMW + JTBD). Output format is fully specified in `templates/design-brief.md`. Standard.
- **Phase 3 (system):** DTCG 2025.10 is a stable W3C spec. `dtcgToCss()` implementation is fully specified in STACK.md. CSS custom properties output is straightforward. No research needed.
- **Phase 6 (critique):** Multi-perspective heuristic evaluation structure is grounded in peer-reviewed literature (arxiv 2507.02306, 2508.10745). Pattern is well-established.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified via direct source code inspection of PDE codebase; ESM-only constraints confirmed from GitHub issues and official migration guides; DTCG format verified against W3C 2025.10 stable spec; `dtcgToCss()` implementation fully specified |
| Features | HIGH | Output formats, dependency structure, and anti-features fully specified in existing templates; competitive positioning is MEDIUM (competitor feature sets evolve rapidly); peer-reviewed research confirms critique effectiveness |
| Architecture | HIGH | All findings derived from direct inspection of existing PDE source, templates, and schemas; no speculation; forward-looking workflow implementations based on fully-designed existing schemas and established workflow patterns |
| Pitfalls | HIGH | Grounded in direct codebase inspection, LLM prompt engineering literature, GSD codebase history, and design-tools community post-mortems; pitfall-to-phase mapping is explicit and actionable with verification criteria |

**Overall confidence:** HIGH

### Gaps to Address

- **Critique context window limits:** Critique agent receiving full design system + all wireframes + full brief may hit context limits for large projects (design system exceeding ~4k tokens, wireframes exceeding ~2k tokens each). Mitigation strategy (inject wireframe subset + brief summary + relevant tokens) is documented in PITFALLS.md but the exact threshold needs empirical testing during Phase 6.
- **`/pde:build` sub-skill invocation mechanism:** Architecture specifies build invokes each skill "via SlashCommand or inline process embedding." The exact invocation mechanism should be resolved in Phase 1 infrastructure design, not deferred to Phase 9.
- **Agent type registry entries:** PITFALLS.md flags that new agent types must be registered in `core.cjs` model resolution. Determine which design pipeline skills spawn named subagents vs run inline before implementing each skill phase.
- **Standalone skill UX for missing-artifact cases:** Each skill must produce user-friendly "run X first" messages when prerequisites are absent. The exact message format and recovery flow should be specified in each phase plan, not improvised during implementation.

---

## Sources

### Primary (HIGH confidence)
- PDE source code direct inspection (`/Users/greyaltaer/code/projects/Platform Development Engine/`) — command stubs, workflow patterns, existing templates (all 6 design artifact templates), DESIGN-STATE schemas, `design-manifest.json` schema
- designtokens.org/tr/drafts/format/ — DTCG 2025.10 stable spec, `$value`/`$type` format
- w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ — DTCG first stable version announcement
- Official Claude Code docs (code.claude.com/docs/en/skills, /plugins, /sub-agents) — skills format, plugin structure, subagent frontmatter
- modelcontextprotocol.io/docs/sdk — transport options, stdio vs Streamable HTTP
- github.com/mermaid-js/mermaid issues #3590, #4148 — Mermaid 10+ ESM-only confirmed, CommonJS broken
- styledictionary.com/versions/v4/migration/ — Style Dictionary v4+ ESM-only confirmed
- arxiv 2507.02306 — AI critique finds 73-77% of usability issues vs 57-63% human baseline (peer-reviewed)
- arxiv 2508.10745 — multi-perspective critique structure for AI design review (peer-reviewed)

### Secondary (MEDIUM confidence)
- npm search results (March 2026) — style-dictionary v5.3.3, Terrazzo v0.7.2, mermaid v11.13.x, Commander 14.x/15.x — version confirmation and ESM-only status
- BareMinimum, Mockdown, AsciiKit — confirm ASCII wireframe as valid LLM-native output format
- Competitor feature analysis (Figma AI, v0/Bolt/Lovable, UX Pilot/Uizard) — feature gap identification confirming PDE's unique brief-to-handoff positioning
- LLM prompt engineering literature — output consistency patterns, variability without explicit constraint anchors
- designtokens.org/tr/drafts/format/ — DTCG `$value`/`$type` structure for token generation patterns
- Design Tokens and AI: Scaling UX with Dynamic Systems (Medium) — AI token generation patterns

### Tertiary (LOW confidence)
- github.com/orgs/mermaid-js/discussions/4148 — LLM Mermaid text generation community patterns (consistent with direct testing expectations but not PDE-specific)
- json-schema-to-typescript v15.0.4 — CommonJS support unconfirmed; decision to exclude is based on reasoning about LLM capability superiority, not confirmed incompatibility test

---

*Research completed: 2026-03-15*
*Ready for roadmap: yes*
