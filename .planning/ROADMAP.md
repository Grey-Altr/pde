# Roadmap: Platform Development Engine (PDE)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-03-15)
- 🔄 **v1.1 Design Pipeline** — Phases 12-20 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-11) — SHIPPED 2026-03-15</summary>

- [x] Phase 1: Plugin Identity (2/2 plans) — completed 2026-03-15
- [x] Phase 2: Tooling & Binary Rebrand (1/1 plan) — completed 2026-03-15
- [x] Phase 3: Workflow Commands (3/3 plans) — completed 2026-03-15
- [x] Phase 4: Workflow Engine (4/4 plans) — completed 2026-03-15
- [x] Phase 5: Agent System (2/2 plans) — completed 2026-03-15
- [x] Phase 6: Templates & References (2/2 plans) — completed 2026-03-15
- [x] Phase 7: Rebranding Completeness (2/2 plans) — completed 2026-03-15
- [x] Phase 8: Onboarding & Distribution (4/4 plans) — completed 2026-03-15
- [x] Phase 9: Fix Critical Runtime Crash (1/1 plan) — completed 2026-03-15
- [x] Phase 10: Fix STATE.md Regressions (1/1 plan) — completed 2026-03-15
- [x] Phase 11: Command Reference Cleanup (1/1 plan) — completed 2026-03-15

Full details: .planning/milestones/v1.0-ROADMAP.md

</details>

### v1.1 Design Pipeline (Phases 12-20)

- [x] **Phase 12: Design Pipeline Infrastructure** — State management, artifact storage, token utilities, and write-lock protocol (completed 2026-03-15)
- [x] **Phase 13: Problem Framing (/pde:brief)** — Structured brief from PROJECT.md context, product-type detection (completed 2026-03-15)
- [x] **Phase 13.1: Hotfix — Tech Debt & Integration Fixes (Phases 12-13)** — Fix broken table schema, missing metadata, unimplemented subcommand, stale template entry, Nyquist gaps (completed 2026-03-15)
- [x] **Phase 13.2: Manifest Top-Level Fields & Nyquist Cleanup** — Add manifest-set-top-level subcommand, populate projectName/productType in /pde:brief, fix 13.1 Nyquist flag (completed 2026-03-15)
- [x] **Phase 14: Design System (/pde:system)** — DTCG tokens, CSS custom properties, typography/color/spacing scale
- [x] **Phase 15: User Flow Mapping (/pde:flows)** — Mermaid flow diagrams, screen inventory for wireframe stage (completed 2026-03-16)
- [ ] **Phase 15.1: Fix Integration Gaps & Tech Debt (Phases 12-15)** — Fix hasBrief contradiction, Domain Files stubs, orphaned CLIs, Phase 14 Nyquist audit
- [ ] **Phase 16: Wireframing (/pde:wireframe)** — Fidelity-controlled HTML/CSS wireframes per screen
- [ ] **Phase 17: Design Critique (/pde:critique)** — Multi-perspective review with severity ratings and fix recommendations
- [ ] **Phase 18: Critique-Driven Iteration (/pde:iterate)** — Artifact revision loop with convergence signal
- [ ] **Phase 19: Design-to-Code Handoff (/pde:handoff)** — TypeScript interfaces, component APIs, STACK.md-aligned specs
- [ ] **Phase 20: Pipeline Orchestrator (/pde:build)** — Thin orchestrator over all 7 skills via DESIGN-STATE

## Phase Details

### Phase 12: Design Pipeline Infrastructure
**Goal**: The design pipeline's shared foundation is in place — state tracking, artifact storage, token conversion, and manifest operations work before any skill produces output
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Running any design skill for the first time creates `.planning/design/` and all domain subdirectories automatically
  2. DESIGN-STATE.md tracks which pipeline stages are complete and enforces write-lock so concurrent writes cannot corrupt state
  3. `bin/lib/design.cjs` converts a DTCG JSON token tree to CSS custom properties via `dtcgToCss()` with no npm dependencies
  4. `design-manifest.json` records every generated artifact with path, type, version, and dependency metadata
**Plans:** 1/1 plans complete
Plans:
- [ ] 12-01-PLAN.md — Design infrastructure library (design.cjs) and pde-tools.cjs router

### Phase 13: Problem Framing (/pde:brief)
**Goal**: Users can frame their product problem into a structured brief that anchors all downstream design stages
**Depends on**: Phase 12
**Requirements**: BRF-01, BRF-02
**Success Criteria** (what must be TRUE):
  1. `/pde:brief` reads PROJECT.md and produces a structured `BRF-brief-v1.md` in `.planning/design/strategy/` covering problem statement, personas, jobs-to-be-done, goals, constraints, and non-goals
  2. The brief detects software/hardware/hybrid product type and records design constraints specific to that type
  3. DESIGN-STATE.md is updated to reflect brief completion when the skill finishes
  4. Running `/pde:brief` standalone (without `/pde:build`) produces the same artifact as running it via the orchestrator
**Plans:** 1/1 plans complete
Plans:
- [ ] 13-01-PLAN.md — Brief workflow and command wiring

### Phase 13.1: Hotfix — Tech Debt & Integration Fixes (Phases 12-13)
**Goal**: All integration defects and metadata gaps from completed phases 12-13 are resolved before new phases begin
**Depends on**: Phase 13
**Requirements**: BRF-01 (metadata fix), INFRA-01 (template fix), INFRA-02 (subcommand fix)
**Gap Closure**: Closes gaps from v1.1 milestone audit
**Success Criteria** (what must be TRUE):
  1. `workflows/brief.md` Step 7 Cross-Domain Dependency Map writes correct column count matching DESIGN-STATE.md table schema (INT-02 fix)
  2. `lock-status` subcommand is implemented in design.cjs and callable via pde-tools.cjs (INT-01 fix)
  3. `hardware` domain directory is created by DOMAIN_DIRS in design.cjs, matching DESIGN-STATE.md template (INT-03 fix)
  4. Phase 13 SUMMARY frontmatter `requirements-completed` lists `[BRF-01, BRF-02]` (metadata fix)
  5. Phase 12 Nyquist validation passes (`nyquist_compliant: true`, `wave_0_complete: true`)
**Plans**: 1 plan
Plans:
- [ ] 13.1-01-PLAN.md — Fix INT-02, INT-01, INT-03 code defects + metadata/Nyquist doc gaps

### Phase 13.2: Manifest Top-Level Fields & Nyquist Cleanup
**Goal**: Manifest top-level fields are populated by /pde:brief and Phase 13.1 Nyquist compliance is recorded accurately
**Depends on**: Phase 13.1
**Requirements**: INFRA-04 (manifest completeness), BRF-02 (brief → manifest wiring)
**Gap Closure**: Closes integration gap and tech debt from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. `design-manifest.json` top-level `projectName` and `productType` fields are populated after running `/pde:brief`
  2. A `manifest-set-top-level` subcommand (or equivalent) exists in pde-tools.cjs to set root-level manifest fields
  3. Phase 13.1 VALIDATION.md frontmatter reads `nyquist_compliant: true`
**Plans**: 1 plan
Plans:
- [ ] 13.2-01-PLAN.md — Manifest top-level support and Nyquist cleanup

### Phase 14: Design System (/pde:system)
**Goal**: A canonical DTCG design token set with derived CSS custom properties is available for all downstream skills to consume
**Depends on**: Phase 13
**Requirements**: SYS-01, SYS-02, SYS-03
**Success Criteria** (what must be TRUE):
  1. `/pde:system` produces a valid DTCG 2025.10 JSON file with color, typography, and spacing tokens using `$value`/`$type` structure
  2. `assets/tokens.css` is generated from DTCG tokens via `dtcgToCss()` and is immediately consumable by wireframe HTML files
  3. Typography scale, color palette, and spacing tokens are all present and reference-able by name in downstream artifacts
  4. Token naming is locked in the design system document before any wireframe is generated, preventing cross-stage naming inconsistency
**Plans:** 1/1 plans complete
Plans:
- [x] 14-01-PLAN.md — System workflow and command wiring (DTCG tokens, CSS, preview, usage guide)

### Phase 15: User Flow Mapping (/pde:flows)
**Goal**: Every user persona's journey is mapped as a Mermaid flow diagram and a screen inventory is extracted for the wireframe stage
**Depends on**: Phase 13
**Requirements**: FLW-01, FLW-02
**Success Criteria** (what must be TRUE):
  1. `/pde:flows` produces at least one Mermaid flowchart diagram in `.planning/design/ux/` covering the happy path and error states for each persona in the brief
  2. Flow diagrams include decision branches and edge cases, not just linear happy paths
  3. A screen inventory is derived from flow node labels and written to a machine-readable format that `/pde:wireframe` reads as its screen list
**Plans:** 1/1 plans complete
Plans:
- [ ] 15-01-PLAN.md — Flows workflow and command wiring (Mermaid diagrams, screen inventory JSON)

### Phase 15.1: Fix Integration Gaps & Tech Debt (Phases 12-15)
**Goal**: All integration contradictions, stale template data, and orphaned CLI paths from Phases 12-15 are resolved before wireframe work begins
**Depends on**: Phase 15
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, BRF-01, BRF-02, SYS-01, SYS-02, SYS-03 (integration fixes for already-satisfied requirements)
**Gap Closure:** Closes INT-01, INT-02, INT-03, FLW-BREAK-01, FLW-BREAK-02 from v1.1 milestone audit
**Success Criteria** (what must be TRUE):
  1. `workflows/system.md` and `workflows/flows.md` Step 7 no longer reference `hasBrief` in coverage-merge instructions (INT-01 + FLW-BREAK-01 resolved)
  2. `templates/design-state-root.md` Domain Files table has no `{count}` placeholders — rows are either removed or show `0` / `--` defaults (INT-02 + FLW-BREAK-02 resolved)
  3. `workflows/system.md` Step 5 calls `pde-tools.cjs design tokens-to-css` for CSS generation instead of inline Write (INT-03 resolved for tokens-to-css)
  4. Phase 14 VALIDATION.md has `nyquist_compliant: true` after audit
**Plans**: 0 plans

### Phase 16: Wireframing (/pde:wireframe)
**Goal**: Every screen in the flow inventory has a browser-viewable wireframe at an explicitly controlled fidelity level
**Depends on**: Phase 14, Phase 15
**Requirements**: WFR-01, WFR-02, WFR-03
**Success Criteria** (what must be TRUE):
  1. `/pde:wireframe` produces a self-contained HTML file for each screen that opens in a browser without a server
  2. Wireframes consume CSS custom properties from `assets/tokens.css` so design system changes cascade to wireframes
  3. The fidelity level (`lo-fi`, `mid-fi`, `hi-fi`) is enforced by an explicit enum — running the command twice at the same fidelity level produces the same structural output, not wildly different results
  4. Each wireframe includes state variants (default, loading, error) and annotation comments describing interaction behavior
**Plans**: 1 plan
Plans:
- [ ] 13.1-01-PLAN.md — Fix INT-02, INT-01, INT-03 code defects + metadata/Nyquist doc gaps

### Phase 17: Design Critique (/pde:critique)
**Goal**: Every wireframe receives a multi-perspective usability review grounded in the project's own brief and flows, not generic UI heuristics
**Depends on**: Phase 16
**Requirements**: CRT-01, CRT-02, CRT-03
**Success Criteria** (what must be TRUE):
  1. `/pde:critique` performs review from four perspectives: UX/usability, visual hierarchy, accessibility, and business alignment
  2. The command is blocked — with a clear recovery message — if brief or flows are absent from context, preventing generic critique that ignores product intent
  3. Every finding has a severity rating (Critical / High / Medium / Low) and an actionable recommendation, not just a description of the problem
  4. Critique output includes a "What Works" section to preserve intentional design decisions during iteration
**Plans**: 1 plan
Plans:
- [ ] 13.1-01-PLAN.md — Fix INT-02, INT-01, INT-03 code defects + metadata/Nyquist doc gaps

### Phase 18: Critique-Driven Iteration (/pde:iterate)
**Goal**: Users can revise wireframes against critique findings and know when the design is ready to hand off
**Depends on**: Phase 17
**Requirements**: ITR-01, ITR-02
**Success Criteria** (what must be TRUE):
  1. `/pde:iterate` produces new versioned wireframe files (`WFR-screen-v2.html`) — original files are never overwritten
  2. Each iteration run produces a change log mapping critique findings to applied changes, and a deferred list for issues not addressed
  3. After three or more iteration cycles, the command surfaces an explicit convergence checklist and a "ready for handoff" recommendation based on remaining open issues
**Plans**: 1 plan
Plans:
- [ ] 13.1-01-PLAN.md — Fix INT-02, INT-01, INT-03 code defects + metadata/Nyquist doc gaps

### Phase 19: Design-to-Code Handoff (/pde:handoff)
**Goal**: Implementation engineers receive complete, stack-aligned component specifications derived from the full design pipeline without having to interpret wireframes manually
**Depends on**: Phase 18
**Requirements**: HND-01, HND-02, HND-03
**Success Criteria** (what must be TRUE):
  1. `/pde:handoff` synthesizes all design pipeline artifacts into a single implementation specification document in `.planning/design/handoff/`
  2. TypeScript interfaces are generated for every component with props, types, and variant signatures derived from wireframe annotations
  3. The command reads `.planning/research/STACK.md` and aligns prop naming, import patterns, and component API conventions to the project's actual tech stack — blocked with a recovery message if STACK.md is absent
  4. `design-manifest.json` is fully populated with all artifact paths, versions, and component-to-artifact mappings
**Plans**: 1 plan
Plans:
- [ ] 13.1-01-PLAN.md — Fix INT-02, INT-01, INT-03 code defects + metadata/Nyquist doc gaps

### Phase 20: Pipeline Orchestrator (/pde:build)
**Goal**: Users can run the full brief-to-handoff design pipeline with a single command, resumable from any interruption point
**Depends on**: Phase 19
**Requirements**: ORC-01, ORC-02, ORC-03
**Success Criteria** (what must be TRUE):
  1. `/pde:build` reads DESIGN-STATE.md and invokes only the incomplete pipeline stages in dependency order, skipping stages already complete
  2. After a simulated mid-pipeline interruption, re-running `/pde:build` resumes from the last complete stage without re-running earlier stages or losing artifacts
  3. Each skill invoked via `/pde:build` produces identical output to running that skill standalone — the orchestrator adds no logic of its own, delegating all skill behavior to individual workflows
  4. Human verification gates appear between stages so users can inspect output before the next stage begins
**Plans**: 1 plan
Plans:
- [ ] 13.1-01-PLAN.md — Fix INT-02, INT-01, INT-03 code defects + metadata/Nyquist doc gaps

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Plugin Identity | v1.0 | 2/2 | Complete | 2026-03-15 |
| 2. Tooling & Binary Rebrand | v1.0 | 1/1 | Complete | 2026-03-15 |
| 3. Workflow Commands | v1.0 | 3/3 | Complete | 2026-03-15 |
| 4. Workflow Engine | v1.0 | 4/4 | Complete | 2026-03-15 |
| 5. Agent System | v1.0 | 2/2 | Complete | 2026-03-15 |
| 6. Templates & References | v1.0 | 2/2 | Complete | 2026-03-15 |
| 7. Rebranding Completeness | v1.0 | 2/2 | Complete | 2026-03-15 |
| 8. Onboarding & Distribution | v1.0 | 4/4 | Complete | 2026-03-15 |
| 9. Fix Critical Runtime Crash | v1.0 | 1/1 | Complete | 2026-03-15 |
| 10. Fix STATE.md Regressions | v1.0 | 1/1 | Complete | 2026-03-15 |
| 11. Command Reference Cleanup | v1.0 | 1/1 | Complete | 2026-03-15 |
| 12. Design Pipeline Infrastructure | 1/1 | Complete    | 2026-03-15 | - |
| 13. Problem Framing (/pde:brief) | 1/1 | Complete    | 2026-03-15 | - |
| 13.1 Hotfix — Tech Debt & Integration Fixes | 1/1 | Complete    | 2026-03-15 | - |
| 13.2 Manifest Top-Level Fields & Nyquist Cleanup | 1/1 | Complete    | 2026-03-15 | - |
| 14. Design System (/pde:system) | v1.1 | Complete    | 2026-03-16 | 2026-03-16 |
| 15. User Flow Mapping (/pde:flows) | 1/1 | Complete    | 2026-03-16 | - |
| 16. Wireframing (/pde:wireframe) | v1.1 | 0/TBD | Not started | - |
| 17. Design Critique (/pde:critique) | v1.1 | 0/TBD | Not started | - |
| 18. Critique-Driven Iteration (/pde:iterate) | v1.1 | 0/TBD | Not started | - |
| 19. Design-to-Code Handoff (/pde:handoff) | v1.1 | 0/TBD | Not started | - |
| 20. Pipeline Orchestrator (/pde:build) | v1.1 | 0/TBD | Not started | - |
