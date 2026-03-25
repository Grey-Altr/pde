<!-- PDE-GENERATED | hash:b63adc2031bf14a3883c07398e19255af1feac40d88821fdd69a43221a70ef40 | generated:2026-03-24T22:26:41.789Z -->
---
name: pde-design
description: PDE design system context -- query palette colors, typography rules, spacing scale, and component patterns for the current project
---
<!-- pde-skill-version: 1.0 -->

# PDE Design System

## Goal

Provide design system context for Platform Development Engine (PDE) to enable consistent
code generation aligned with the project's visual identity.

## Instructions

1. Check DESIGN.md at project root for full design DNA (palette, typography, spacing)
2. Design tokens are in DTCG format at .planning/design/design-manifest.json
3. Component patterns are documented in handoff specs at .planning/design/handoff/

## Workflows

[ ] System Tokens (/pde:system)
[ ] Wireframes (/pde:wireframe)
[ ] Mockups (/pde:mockup)
[ ] Handoff Specs (/pde:handoff)
[ ] Visual Regression (/pde:visual-regression)

## Design Tokens Available

No design artifacts generated yet.

## Component Catalog

No component handoff specs available yet.

## Constraints

- Use hex color values from DESIGN.md, not raw OKLCH from token files
- Follow typography hierarchy defined in DESIGN.md section 3
- Spacing uses the base unit defined in DESIGN.md section 5

Zero npm deps at plugin root**: Any new dependencies go in isolated subdirectories
- **MCP security**: Verified-sources-only policy — only official MCP servers from approved vendors

<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->
