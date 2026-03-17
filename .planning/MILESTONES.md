# Milestones

## v1.2 Advanced Design Skills (Shipped: 2026-03-17)

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

## v1.1 Design Pipeline (Shipped: 2026-03-16)

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

## v1.0 PDE v1.0 MVP (Shipped: 2026-03-15)

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

