# Platform Development Engine (PDE)

## What This Is

A full professional product design and development platform that takes users from raw idea to shipped product and beyond. PDE starts as a fork of GSD (Get Shit Done), rebranded and restructured to serve as the foundation for a comprehensive lifecycle tool. It will be distributed publicly — initially as a Claude Code plugin, evolving into a standalone CLI that works with multiple AI providers.

## Core Value

Any user can go from idea to shipped product through a single platform that handles research, design, planning, coding, testing, deployment, and ongoing iteration.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 1:1 functional clone of GSD, rebranded as PDE
- [ ] All GSD workflows operational under PDE naming (new-project, plan-phase, execute-phase, etc.)
- [ ] All GSD skill commands working as /pde: equivalents
- [ ] All GSD agent types functional within PDE
- [ ] Plugin installable and usable in Claude Code
- [ ] All GSD templates, references, and configuration migrated
- [ ] GSD tooling (gsd-tools.cjs, bin scripts) rebranded and functional

### Out of Scope

- Design pipeline (wireframing, design systems, user flows) — post-v1, after stable clone
- MCP server integrations — post-v1
- CLI/toolkit integrations — post-v1
- Multi-product support (hardware, content, non-software) — post-v1
- Standalone CLI distribution — post-v1, starts as Claude Code plugin
- Multi-AI-provider support — post-v1
- Maintenance/analytics/feedback loops — post-v1
- Architecture restructuring — v1 is fast clone, refactor later

## Context

- GSD is an existing Claude Code plugin that handles project planning and code execution through a phase-based workflow
- GSD's architecture: skills (slash commands), workflows, agents, templates, references, bin scripts, and a config system
- PDE v1 is a direct fork — same architecture, same patterns, renamed
- Post-v1 milestones will expand PDE into a full product lifecycle platform covering design, tool ecosystem integration, and multi-product-type support
- Target audience: developers and product builders who want AI-assisted end-to-end product development
- Distribution model: Claude Code plugin first, standalone CLI later

## Constraints

- **Base**: Must fork from existing GSD codebase — not a ground-up rewrite
- **Naming**: All references must change from GSD/gsd to PDE/pde
- **Compatibility**: Must work as a Claude Code plugin (same plugin structure as GSD)
- **Speed**: v1 prioritizes working clone over architectural improvements

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than rebuild | Fastest path to working product; GSD is proven | — Pending |
| Start as Claude Code plugin | Same distribution model as GSD; familiar to users | — Pending |
| Fast clone for v1 | Get working product quickly, refactor in later milestones | — Pending |
| Public distribution | Building for the community, not just personal use | — Pending |

---
*Last updated: 2026-03-14 after initialization*
