# Requirements: Platform Development Engine

**Defined:** 2026-03-23
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.15 Requirements

Requirements for v0.15 Multi-Editor Integration. Each maps to roadmap phases.

### Context Generation (CTX)

- [x] **CTX-01**: PDE generates AGENTS.md at project root with project context, design system summary, and component catalog from .planning/ artifacts
- [x] **CTX-02**: PDE generates .cursor/rules/*.mdc files with YAML frontmatter (description, globs, alwaysApply) — pde-project.mdc, pde-design-tokens.mdc, pde-components.mdc, pde-architecture.mdc, pde-pipeline.mdc
- [x] **CTX-03**: PDE generates legacy .cursorrules file at project root for backwards compatibility
- [x] **CTX-04**: PDE generates hierarchical GEMINI.md files (project root + .planning/ + .planning/design/) with @file imports
- [x] **CTX-05**: PDE generates .agent/skills/pde-design/SKILL.md for Antigravity Agent Manager with PDE workflow instructions
- [x] **CTX-06**: Context sync engine auto-regenerates all editor files when .planning/ state changes via hook-driven detection
- [x] **CTX-07**: /pde:editor-sync command manually regenerates all editor context files on demand
- [x] **CTX-08**: Generated context files include hash-based staleness marker for freshness detection

### MCP Server (MCP)

- [x] **MCP-01**: Standalone MCP server package in isolated subdirectory with @modelcontextprotocol/sdk, TypeScript, stdio transport
- [x] **MCP-02**: Server exposes 10 read-only tools: get-project, get-design-state, get-manifest, get-tokens, get-handoff, get-artifact, get-roadmap, get-requirements, get-pipeline-status, list-artifacts
- [x] **MCP-03**: Server distributable via npx pde-mcp-server with automatic .planning/ directory discovery
- [x] **MCP-04**: Pipeline status exposed as MCP resource (passive context) for editor consumption
- [x] **MCP-05**: Design tokens served as Tailwind v4 @theme format via get-tokens tool with DTCG-to-Tailwind conversion

### Stitch Bridge (STH)

- [x] **STH-01**: PDE generates DESIGN.md in Antigravity Design DNA format from DTCG tokens (palette, typography, spacing, component patterns)
- [ ] **STH-02**: Antigravity-originated Stitch projects detected via manifest metadata (source: "antigravity-stitch") — Nyquist describe block + production consumer needed
- [x] **STH-03**: Bidirectional artifact flow: PDE design artifacts -> Stitch canvas via DESIGN.md, Stitch outputs -> PDE critique/handoff via existing STH pipeline

### Artifact Formatting (FMT)

- [x] **FMT-01**: Handoff specs include @file annotations (@component:, @props:, @tokens:) extractable by any editor
- [x] **FMT-02**: DTCG tokens converted to Tailwind v4 @theme declarations and CSS custom properties
- [x] **FMT-03**: Framework detection from package.json generates framework-appropriate component stubs (default: React + Tailwind)

### Divergence Detection (DIV)

- [x] **DIV-01**: T1 structural detection — glob-based check that handoff-declared components exist in codebase
- [x] **DIV-02**: T2 content detection — regex-based interface parsing comparing prop names/types against handoff specs
- [x] **DIV-03**: T3 behavioral detection — grep-based check that components use specified design tokens and patterns
- [x] **DIV-04**: DIVERGENCE.md output with per-component status (ALIGNED, DRIFTED, MISSING, EXTRA)
- [ ] **DIV-05**: /pde:check-divergence command triggers detection on demand — Nyquist describe block needed
- [x] **DIV-06**: .pde-divergence-ignore file for suppressing known-acceptable divergences

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTX-01 | Phase 118 | Complete |
| CTX-02 | Phase 118 | Complete |
| CTX-03 | Phase 118 | Complete |
| CTX-04 | Phase 118 | Complete |
| CTX-05 | Phase 119 | Complete |
| CTX-06 | Phase 123 | Complete |
| CTX-07 | Phase 123 | Complete |
| CTX-08 | Phase 118 | Complete |
| MCP-01 | Phase 121 | Complete |
| MCP-02 | Phase 121 | Complete |
| MCP-03 | Phase 121 | Complete |
| MCP-04 | Phase 121 | Complete |
| MCP-05 | Phase 121 | Complete |
| STH-01 | Phase 119 | Complete |
| STH-02 | Phase 125 | Pending |
| STH-03 | Phase 119 | Complete |
| FMT-01 | Phase 120 | Complete |
| FMT-02 | Phase 120 | Complete |
| FMT-03 | Phase 120 | Complete |
| DIV-01 | Phase 122 | Complete |
| DIV-02 | Phase 122 | Complete |
| DIV-03 | Phase 122 | Complete |
| DIV-04 | Phase 122 | Complete |
| DIV-05 | Phase 125 | Pending |
| DIV-06 | Phase 122 | Complete |

**Coverage:**
- v0.15 requirements: 25 total
- Satisfied: 23
- Pending (gap closure): 2 (STH-02, DIV-05)
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 — gap closure phase 125 added*
