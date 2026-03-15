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

### Active

(Define in next milestone — use `/pde:new-milestone`)

### Out of Scope

- Design pipeline (wireframing, design systems, user flows) — candidate for v2.0
- MCP server integrations (GitHub, Linear, Figma, Jira) — candidate for v2.0
- Multi-AI-provider support (Gemini CLI, OpenCode, Codex) — candidate for v2.0
- Standalone CLI distribution independent of Claude Code — post-v2
- Multi-product-type support (hardware, content, non-software) — post-v2
- Maintenance/analytics/feedback loops — post-v2
- Real-time collaborative editing — conflicts with file-based state model
- In-tool web dashboard / UI — markdown files are the dashboard
- Architecture restructuring — v1 was fast clone; refactor when needed

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

---
*Last updated: 2026-03-15 after v1.0 milestone*
