# Platform Development Engine (PDE)

## What This Is

A full professional product design and development platform delivered as a Claude Code plugin. PDE takes users from raw idea to shipped product through AI-assisted research, design, planning, coding, testing, and deployment. Built as a disciplined fork of GSD (Get Shit Done), rebranded and restructured for public distribution.

## Core Value

Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## Requirements

### Validated

- ✓ 1:1 functional clone of GSD, rebranded as PDE — v1.0
- ✓ All GSD workflows operational under PDE naming — v1.0
- ✓ All GSD skill commands working as /pde: equivalents — v1.0
- ✓ All GSD agent types functional within PDE — v1.0
- ✓ Plugin installable and usable in Claude Code — v1.0
- ✓ All GSD templates, references, and configuration migrated — v1.0
- ✓ GSD tooling rebranded and functional — v1.0
- ✓ Design system generation produces DTCG tokens with CSS derivation — Phase 14

### Active

- [ ] Core design pipeline: brief → flows → system → wireframe → critique → iterate → handoff
- [ ] Each design skill works standalone AND as part of orchestrated /pde:build pipeline
- [ ] Design artifacts stored in .planning/design/ alongside planning state
- [ ] Design-to-implementation handoff produces component APIs and TypeScript interfaces

## Current Milestone: v1.1 Design Pipeline

**Goal:** Add a complete design stage to PDE so users can go from problem framing through visual wireframes to implementation-ready specs — closing the gap between requirements and code.

**Target features:**
- Problem framing (/pde:brief)
- User flow mapping (/pde:flows)
- Design system generation (/pde:system)
- Wireframing at controlled fidelity (/pde:wireframe)
- Multi-perspective design critique (/pde:critique)
- Critique-driven iteration (/pde:iterate)
- Design-to-code handoff (/pde:handoff)
- Orchestrated pipeline (/pde:build)

### Out of Scope

- MCP server integrations (GitHub, Linear, Figma, Jira) — candidate for future milestone
- Multi-AI-provider support (Gemini CLI, OpenCode, Codex) — candidate for future milestone
- Standalone CLI distribution independent of Claude Code — post-v2
- Multi-product-type support (hardware, content, non-software) — post-v2
- Maintenance/analytics/feedback loops — post-v2
- Real-time collaborative editing — conflicts with file-based state model
- In-tool web dashboard / UI — markdown files are the dashboard
- Architecture restructuring — do when pain forces it
- Advanced design skills (ideation, competitive analysis, opportunity scoring, HIG audit, mockups) — candidate for v1.2

## Context

- **Shipped v1.0** on 2026-03-15: 303 files, ~60,000 LOC (JavaScript/Markdown), 127 commits
- **Tech stack:** Node.js (CommonJS), Claude Code plugin API, markdown-based state management
- **Distribution:** Claude Code plugin via GitHub; marketplace registration pending
- **Architecture:** skills (slash commands) → workflows → agents → templates → references → bin scripts → config
- **Known tech debt:**
  - PLUG-01 end-to-end `claude plugin install` from GitHub not tested (marketplace registration may be required)
  - TRACKING-PLAN.md referenced in consent panel does not exist
  - Historical commits e067974 and efe3af0 lack Co-Authored-By trailer (pre-fix, cannot change)

## Constraints

- **Base**: Built on GSD codebase — same patterns, renamed
- **Compatibility**: Must work as a Claude Code plugin
- **State model**: File-based `.planning/` directory — no database, no server

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than rebuild | Fastest path to working product; GSD is proven | ✓ Good — shipped in 2 days |
| Start as Claude Code plugin | Same distribution model as GSD; familiar to users | ✓ Good — plugin validates and loads |
| Fast clone for v1 | Get working product quickly, refactor in later milestones | ✓ Good — 100% requirements met |
| Public distribution | Building for the community, not just personal use | ✓ Good — README, Getting Started, marketplace ready |
| Order-dependent rename sequence | Plugin identity → binaries → commands → engine → agents → templates → brand verify | ✓ Good — each layer clean before next |
| 0.1.0 → 1.0.0 version bump at Phase 8 | Signal work-in-progress until all phases pass | ✓ Good — version reflects shipped state |
| Full telemetry implementation over stub | render.cjs consent and track-* need real persistence | ✓ Good — no crashes, UI renders cleanly |
| 21 command stubs for dangling references | Stubs prevent user confusion; v2 implements full logic | ✓ Good — zero dangling /pde: references |

| Core design pipeline for v1.1 | Closes the biggest gap in "idea to shipped product" promise; design stage missing | — Pending |
| Standalone skills + orchestrator | Flexibility for ad-hoc use AND guided workflow | — Pending |
| .planning/design/ for artifacts | Keeps design state with planning state; consistent with existing patterns | — Pending |
| v1.1 not v2.0 | Incremental addition to existing platform, not a breaking change | — Pending |
| DTCG 2025.10 + OKLCH + dual dark mode | Industry-standard token format with perceptually uniform color space; dark mode via @media + [data-theme] | ✓ Good — Phase 14 |
| Inline tokens.css (no @import) | file:// URL compatibility for preview and wireframe consumption | ✓ Good — Phase 14 |

---
*Last updated: 2026-03-16 after Phase 14*
