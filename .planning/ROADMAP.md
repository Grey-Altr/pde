# Roadmap: Platform Development Engine (PDE)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-11 (shipped 2026-03-15)
- ✅ **v1.1 Design Pipeline** — Phases 12-23 (shipped 2026-03-16)
- 🚧 **v1.2 Advanced Design Skills** — Phases 24-28 (in progress)

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

<details>
<summary>✅ v1.1 Design Pipeline (Phases 12-23) — SHIPPED 2026-03-16</summary>

- [x] Phase 12: Design Pipeline Infrastructure (1/1 plan) — completed 2026-03-15
- [x] Phase 13: Problem Framing /pde:brief (1/1 plan) — completed 2026-03-15
- [x] Phase 13.1: Hotfix — Tech Debt & Integration Fixes (1/1 plan) — completed 2026-03-15
- [x] Phase 13.2: Manifest Top-Level Fields & Nyquist Cleanup (1/1 plan) — completed 2026-03-15
- [x] Phase 14: Design System /pde:system (1/1 plan) — completed 2026-03-16
- [x] Phase 15: User Flow Mapping /pde:flows (1/1 plan) — completed 2026-03-16
- [x] Phase 15.1: Fix Integration Gaps & Tech Debt (2/2 plans) — completed 2026-03-16
- [x] Phase 16: Wireframing /pde:wireframe (1/1 plan) — completed 2026-03-16
- [x] Phase 17: Design Critique /pde:critique (1/1 plan) — completed 2026-03-16
- [x] Phase 18: Critique-Driven Iteration /pde:iterate (1/1 plan) — completed 2026-03-16
- [x] Phase 19: Design-to-Code Handoff /pde:handoff (1/1 plan) — completed 2026-03-16
- [x] Phase 20: Pipeline Orchestrator /pde:build (1/1 plan) — completed 2026-03-16
- [x] Phase 21: Fix Pipeline Integration Wiring (1/1 plan) — completed 2026-03-16
- [x] Phase 22: Nyquist Compliance & Tech Debt Cleanup (1/1 plan) — completed 2026-03-16
- [x] Phase 23: Fix Wireframe Filename Convention & Final Tech Debt (1/1 plan) — completed 2026-03-16

Full details: .planning/milestones/v1.1-ROADMAP.md

</details>

### v1.2 Advanced Design Skills (In Progress)

**Milestone Goal:** Expand the design pipeline with six advanced skills — ideation, competitive analysis, opportunity scoring, hi-fi mockups, HIG audit, and tool discovery — creating a comprehensive pre-brief research layer and post-iterate quality gate, all orchestrable via an expanded `/pde:build`.

- [x] **Phase 24: Schema Migration & Infrastructure** - Migrate coverage flags to pass-through-all; extend manifest schema with six new flags; add ux/mockups/ directory (completed 2026-03-16)
- [x] **Phase 25: Recommend & Competitive Skills** - Build /pde:recommend (MCP/tool discovery) and /pde:competitive (landscape analysis with gap identification) (completed 2026-03-16)
- [x] **Phase 26: Opportunity, Mockup & HIG Skills** - Build /pde:opportunity (RICE scoring), /pde:mockup (hi-fi HTML/CSS), and /pde:hig (WCAG 2.2 AA dual-mode audit) (completed 2026-03-16)
- [ ] **Phase 27: Ideation Skill & Brief Update** - Build /pde:ideate with two-pass diverge→converge structure; update /pde:brief to inject competitive/opportunity context
- [ ] **Phase 28: Build Orchestrator Expansion** - Expand /pde:build from 7 to 13 stages with dynamic stage count and per-stage skip support

## Phase Details

### Phase 24: Schema Migration & Infrastructure
**Goal**: All existing skills safely preserve new coverage flags; manifest schema and directory structure ready for six new skills to write into
**Depends on**: Phase 23 (v1.1 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Any existing skill (brief, system, flows, wireframe, critique, iterate, handoff) can run after a v1.2 skill without deleting the v1.2 coverage flag
  2. design-manifest.json template shows all 13 coverage flags (7 existing + 6 new: hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations)
  3. Running `/pde:wireframe` on a project that already has hasIdeation=true leaves hasIdeation unchanged
  4. The ux/mockups/ directory is created when `/pde:setup` or the design pipeline initializes
**Plans**: 2 plans
Plans:
- [x] 24-01-PLAN.md — Extend manifest template with 13 coverage flags and add ux/mockups to ensureDesignDirs (completed 2026-03-16)
- [x] 24-02-PLAN.md — Migrate 6 workflow files from 7-field to 13-field coverage pattern (completed 2026-03-16)

### Phase 25: Recommend & Competitive Skills
**Goal**: Users can discover relevant MCP tools for their project and run a structured competitive landscape analysis, each as standalone commands
**Depends on**: Phase 24
**Requirements**: REC-01, REC-02, REC-03, COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. User can run `/pde:recommend` and receive a ranked list of MCP servers and tools matched to their project stack and goals, with installation instructions
  2. Recommend output degrades gracefully when the MCP Registry API is unreachable (offline catalog fallback shown, no crash)
  3. User can run `/pde:competitive` and receive a feature comparison matrix, positioning map, and explicit gap list covering 3+ direct competitors
  4. Every claim in competitive output carries a confidence label (confirmed / inferred / unverified)
  5. Competitive gaps are written to a structured artifact that the opportunity skill can read as candidate input
**Plans**: 2 plans
Plans:
- [x] 25-01-PLAN.md — Build /pde:recommend command stub and workflow (MCP/tool discovery with inline catalog) (completed 2026-03-16)
- [x] 25-02-PLAN.md — Build /pde:competitive command stub and workflow (landscape analysis with confidence labels and structured gaps) (completed 2026-03-16)

### Phase 26: Opportunity, Mockup & HIG Skills
**Goal**: Users can score feature opportunities with real RICE input, generate hi-fi interactive mockups from refined wireframes, and run WCAG 2.2 AA / HIG audits with severity-rated findings
**Depends on**: Phase 25
**Requirements**: OPP-01, OPP-02, OPP-03, MOCK-01, MOCK-02, MOCK-03, HIG-01, HIG-02, HIG-03
**Success Criteria** (what must be TRUE):
  1. User can run `/pde:opportunity`, provide Reach and Effort values interactively, and receive a ranked opportunity list with component scores and sensitivity analysis visible
  2. User can run `/pde:mockup` and receive a self-contained HTML/CSS file that applies design tokens from tokens.css and includes CSS-only interactive states for all screen variants
  3. Mockup HTML preserves wireframe annotations as HTML comments traceable to the originating wireframe version
  4. User can run `/pde:hig` standalone and receive severity-rated findings covering color contrast (WCAG 1.4.3), focus visibility (2.4.11), touch targets (2.5.8), form labels, and heading hierarchy
  5. Running `/pde:critique` now delegates its HIG perspective to `/pde:hig --light` rather than applying inline logic; critique output and standalone HIG output use identical severity ratings for the same issue
**Plans**: 3 plans
Plans:
- [ ] 26-01-PLAN.md — Build /pde:opportunity command and workflow (RICE scoring with interactive input, sensitivity analysis, Now/Next/Later buckets) + create skill-registry.md
- [ ] 26-02-PLAN.md — Build /pde:mockup command and workflow (hi-fi HTML/CSS from wireframes with tokens, CSS-only interactions, annotation traceability)
- [ ] 26-03-PLAN.md — Build /pde:hig command and workflow (WCAG 2.2 AA audit with --light mode) + update critique.md Perspective 3 delegation

### Phase 27: Ideation Skill & Brief Update
**Goal**: Users can run multi-phase diverge→converge ideation that automatically invokes tool discovery, scores concept readiness, and produces a brief seed artifact; existing /pde:brief accepts upstream competitive and opportunity context
**Depends on**: Phase 25 (recommend must exist), Phase 26 (opportunity artifacts exist for enrichment)
**Requirements**: IDEAT-01, IDEAT-02, IDEAT-03, IDEAT-04
**Success Criteria** (what must be TRUE):
  1. User can run `/pde:ideate` and receive a minimum of 5 distinct divergent directions (with no evaluative language in the diverge output), followed by a scored convergence with an explicit recommended direction
  2. Recommend runs automatically at the diverge→converge checkpoint; feasibility annotations appear on each idea in the converge output
  3. Ideation produces an IDT artifact with status `ideation-complete` and a brief-seed section that `/pde:brief` can consume directly
  4. Running `/pde:brief` after competitive and opportunity runs automatically injects CMP/OPP context into the brief; running it without those artifacts produces the brief normally with a warning (not a failure)
**Plans**: TBD

### Phase 28: Build Orchestrator Expansion
**Goal**: Users can run `/pde:build` and execute the full 13-stage pipeline from ideation through handoff, with accurate stage tracking and the ability to enter the pipeline at any stage
**Depends on**: Phase 27 (all six new skills must be stable standalone before wiring)
**Requirements**: BUILD-01, BUILD-02, BUILD-03
**Success Criteria** (what must be TRUE):
  1. `/pde:build --dry-run` displays exactly 13 stages: recommend → competitive → opportunity → ideate → brief → system → flows → wireframe → critique → iterate → mockup → hig → handoff
  2. Stage count in all orchestrator messages is derived from the stage list at runtime, not from any hardcoded numeric literal
  3. User can start the pipeline at any named stage (e.g., `--from wireframe`) and the orchestrator skips preceding stages without error
  4. After a complete pipeline run, all 13 coverage flags in design-manifest.json are true with none silently clobbered
**Plans**: TBD

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
| 12. Design Pipeline Infrastructure | v1.1 | 1/1 | Complete | 2026-03-15 |
| 13. Problem Framing | v1.1 | 1/1 | Complete | 2026-03-15 |
| 13.1 Hotfix — Tech Debt | v1.1 | 1/1 | Complete | 2026-03-15 |
| 13.2 Manifest Top-Level | v1.1 | 1/1 | Complete | 2026-03-15 |
| 14. Design System | v1.1 | 1/1 | Complete | 2026-03-16 |
| 15. User Flow Mapping | v1.1 | 1/1 | Complete | 2026-03-16 |
| 15.1 Fix Integration Gaps | v1.1 | 2/2 | Complete | 2026-03-16 |
| 16. Wireframing | v1.1 | 1/1 | Complete | 2026-03-16 |
| 17. Design Critique | v1.1 | 1/1 | Complete | 2026-03-16 |
| 18. Critique-Driven Iteration | v1.1 | 1/1 | Complete | 2026-03-16 |
| 19. Design-to-Code Handoff | v1.1 | 1/1 | Complete | 2026-03-16 |
| 20. Pipeline Orchestrator | v1.1 | 1/1 | Complete | 2026-03-16 |
| 21. Fix Pipeline Integration Wiring | v1.1 | 1/1 | Complete | 2026-03-16 |
| 22. Nyquist Compliance | v1.1 | 1/1 | Complete | 2026-03-16 |
| 23. Wireframe Filename Fix | v1.1 | 1/1 | Complete | 2026-03-16 |
| 24. Schema Migration & Infrastructure | v1.2 | 2/2 | Complete | 2026-03-16 |
| 25. Recommend & Competitive Skills | v1.2 | 2/2 | Complete | 2026-03-16 |
| 26. Opportunity, Mockup & HIG Skills | 3/3 | Complete   | 2026-03-16 | - |
| 27. Ideation Skill & Brief Update | v1.2 | 0/TBD | Not started | - |
| 28. Build Orchestrator Expansion | v1.2 | 0/TBD | Not started | - |
