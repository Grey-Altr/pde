# Requirements: Platform Development Engine

**Defined:** 2026-03-23
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.15 Requirements

Requirements for v0.15 Multi-Editor Integration. Each maps to roadmap phases.

### Context Generation (CTX)

- [ ] **CTX-01**: PDE generates AGENTS.md at project root with project context, design system summary, and component catalog from .planning/ artifacts
- [ ] **CTX-02**: PDE generates .cursor/rules/*.mdc files with YAML frontmatter (description, globs, alwaysApply) — pde-project.mdc, pde-design-tokens.mdc, pde-components.mdc, pde-architecture.mdc, pde-pipeline.mdc
- [ ] **CTX-03**: PDE generates legacy .cursorrules file at project root for backwards compatibility
- [ ] **CTX-04**: PDE generates hierarchical GEMINI.md files (project root + .planning/ + .planning/design/) with @file imports
- [ ] **CTX-05**: PDE generates .agent/skills/pde-design/SKILL.md for Antigravity Agent Manager with PDE workflow instructions
- [ ] **CTX-06**: Context sync engine auto-regenerates all editor files when .planning/ state changes via hook-driven detection
- [ ] **CTX-07**: /pde:editor-sync command manually regenerates all editor context files on demand
- [ ] **CTX-08**: Generated context files include hash-based staleness marker for freshness detection

### MCP Server (MCP)

- [ ] **MCP-01**: Standalone MCP server package in isolated subdirectory with @modelcontextprotocol/sdk, TypeScript, stdio transport
- [ ] **MCP-02**: Server exposes 10 read-only tools: get-project, get-design-state, get-manifest, get-tokens, get-handoff, get-artifact, get-roadmap, get-requirements, get-pipeline-status, list-artifacts
- [ ] **MCP-03**: Server distributable via npx pde-mcp-server with automatic .planning/ directory discovery
- [ ] **MCP-04**: Pipeline status exposed as MCP resource (passive context) for editor consumption
- [ ] **MCP-05**: Design tokens served as Tailwind v4 @theme format via get-tokens tool with DTCG-to-Tailwind conversion

### Stitch Bridge (STH)

- [ ] **STH-01**: PDE generates DESIGN.md in Antigravity Design DNA format from DTCG tokens (palette, typography, spacing, component patterns)
- [ ] **STH-02**: Antigravity-originated Stitch projects detected via manifest metadata (source: "antigravity-stitch")
- [ ] **STH-03**: Bidirectional artifact flow: PDE design artifacts → Stitch canvas via DESIGN.md, Stitch outputs → PDE critique/handoff via existing STH pipeline

### Artifact Formatting (FMT)

- [ ] **FMT-01**: Handoff specs include @file annotations (@component:, @props:, @tokens:) extractable by any editor
- [ ] **FMT-02**: DTCG tokens converted to Tailwind v4 @theme declarations and CSS custom properties
- [ ] **FMT-03**: Framework detection from package.json generates framework-appropriate component stubs (default: React + Tailwind)

### Divergence Detection (DIV)

- [ ] **DIV-01**: T1 structural detection — glob-based check that handoff-declared components exist in codebase
- [ ] **DIV-02**: T2 content detection — regex-based interface parsing comparing prop names/types against handoff specs
- [ ] **DIV-03**: T3 behavioral detection — grep-based check that components use specified design tokens and patterns
- [ ] **DIV-04**: DIVERGENCE.md output with per-component status (ALIGNED, DRIFTED, MISSING, EXTRA)
- [ ] **DIV-05**: /pde:check-divergence command triggers detection on demand
- [ ] **DIV-06**: .pde-divergence-ignore file for suppressing known-acceptable divergences

## Future Requirements

### Multi-Format Export

- **MFMT-01**: Same design artifact available as React, Vue, or Svelte component depending on project framework
- **MFMT-02**: Multi-framework artifact export beyond React+Tailwind (wait for user demand signal)

### Advanced Divergence

- **ADIV-01**: Full TypeScript AST parsing for divergence detection (upgrade from regex when needed)
- **ADIV-02**: Hook-driven automatic divergence detection after code changes

### Extended Editor Support

- **EDIT-01**: Windsurf IDE context generation
- **EDIT-02**: VS Code Copilot context generation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Write tools in PDE MCP server | Creates second write path bypassing pde-tools.cjs validation and locking |
| Real-time file watching / live sync | PDE is session-based; file watchers conflict with plugin model |
| Editor-specific UI panels or extensions | PDE is a CLI plugin, not a VS Code extension |
| Cursor Composer / Antigravity Agent Manager API | Proprietary, undocumented internal APIs that change frequently |
| Auto-install MCP servers in editors | Triggers unexpected OAuth flows |
| Full pipeline execution from external editors | 13-stage pipeline requires Claude Code's subagent infrastructure |
| Bidirectional code-to-design sync | Reverse-engineering code back into PDE design artifacts is intractable |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTX-01 | — | Pending |
| CTX-02 | — | Pending |
| CTX-03 | — | Pending |
| CTX-04 | — | Pending |
| CTX-05 | — | Pending |
| CTX-06 | — | Pending |
| CTX-07 | — | Pending |
| CTX-08 | — | Pending |
| MCP-01 | — | Pending |
| MCP-02 | — | Pending |
| MCP-03 | — | Pending |
| MCP-04 | — | Pending |
| MCP-05 | — | Pending |
| STH-01 | — | Pending |
| STH-02 | — | Pending |
| STH-03 | — | Pending |
| FMT-01 | — | Pending |
| FMT-02 | — | Pending |
| FMT-03 | — | Pending |
| DIV-01 | — | Pending |
| DIV-02 | — | Pending |
| DIV-03 | — | Pending |
| DIV-04 | — | Pending |
| DIV-05 | — | Pending |
| DIV-06 | — | Pending |

**Coverage:**
- v0.15 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after initial definition*
