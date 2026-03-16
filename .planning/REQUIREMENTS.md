# Requirements: Platform Development Engine (PDE)

**Defined:** 2026-03-15
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v1.1 Requirements

Requirements for design pipeline release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: .planning/design/ directory created on first design skill invocation
- [x] **INFRA-02**: DESIGN-STATE.md tracks pipeline stage completion with write-lock mechanism
- [x] **INFRA-03**: bin/lib/design.cjs provides DTCG-to-CSS conversion and artifact path resolution
- [x] **INFRA-04**: Design manifest (design-manifest.json) tracks all generated artifacts

### Problem Framing

- [x] **BRF-01**: /pde:brief produces structured problem framing document from PROJECT.md context
- [x] **BRF-02**: Brief detects product type (software/hardware/hybrid) and sets design constraints

### User Flows

- [x] **FLW-01**: /pde:flows generates Mermaid flowchart diagrams for happy paths and error states
- [x] **FLW-02**: Flow diagrams derive screen inventory used downstream by wireframe stage

### Design System

- [x] **SYS-01**: /pde:system generates DTCG JSON tokens as canonical source (W3C 2025.10 format)
- [x] **SYS-02**: CSS custom properties derived from DTCG tokens for wireframe consumption
- [x] **SYS-03**: Typography scale, color palette, and spacing tokens generated

### Wireframing

- [ ] **WFR-01**: /pde:wireframe generates browser-viewable HTML/CSS at controlled fidelity levels (lofi/midfi/hifi)
- [ ] **WFR-02**: Wireframes consume design system tokens for consistent styling
- [ ] **WFR-03**: Fidelity level is enforced by enum — no drift between levels

### Design Critique

- [ ] **CRT-01**: /pde:critique performs multi-perspective review (UX, engineering, accessibility, business)
- [ ] **CRT-02**: Critique requires brief and flows in context — blocked when absent
- [ ] **CRT-03**: Critique produces severity-rated findings with actionable recommendations

### Iteration

- [ ] **ITR-01**: /pde:iterate applies critique findings to revise design artifacts
- [ ] **ITR-02**: Iteration includes convergence signal — stops when issues are resolved

### Handoff

- [ ] **HND-01**: /pde:handoff synthesizes all design artifacts into implementation specifications
- [ ] **HND-02**: Handoff produces component APIs with TypeScript interfaces
- [ ] **HND-03**: Handoff reads STACK.md for project-specific technology alignment

### Orchestration

- [ ] **ORC-01**: /pde:build orchestrates the full pipeline sequence via DESIGN-STATE
- [ ] **ORC-02**: Each skill works standalone when invoked directly (not just via /pde:build)
- [ ] **ORC-03**: /pde:build is a thin orchestrator — all skill logic stays in individual workflows

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Advanced Design Skills

- **DSGN-01**: /pde:ideate structured idea exploration (5-phase diverge/converge)
- **DSGN-02**: /pde:competitive competitor landscape analysis with positioning maps
- **DSGN-03**: /pde:opportunity RICE-scored opportunity evaluation
- **DSGN-04**: /pde:hig WCAG 2.2 AA compliance auditing and human interface guidelines
- **DSGN-05**: /pde:mockup full visual polish on wireframes with working interactions

### MCP Integrations

- **MCP-01**: GitHub MCP server integration for issue/PR management
- **MCP-02**: Linear MCP server integration for project tracking
- **MCP-03**: Figma MCP server integration for design artifact access
- **MCP-04**: Jira MCP server integration for enterprise project management

### Platform Expansion

- **PLAT-01**: Multi-AI-provider support (Gemini CLI, OpenCode, Codex)
- **PLAT-02**: Standalone CLI distribution independent of Claude Code
- **PLAT-03**: Multi-product-type support (hardware, content, non-software)
- **PLAT-04**: Maintenance/analytics/feedback loops for post-ship lifecycle

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pixel-precise visual design | PDE produces text artifacts describing design intent, not visual files |
| Image/SVG generation | LLM text output only; no image generation pipeline |
| Real-time design collaboration | Conflicts with file-based state model |
| Design tool integration (Figma import/export) | Candidate for v2 MCP integration, not v1.1 |
| Component library runtime | PDE generates specs, not running components |
| Hi-fi mockup polish | Candidate for v1.2 (/pde:mockup) |
| Server-side rendering of wireframes | Wireframes are static HTML files opened in browser |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 12 | Complete |
| INFRA-02 | Phase 12 | Complete |
| INFRA-03 | Phase 12 | Complete |
| INFRA-04 | Phase 12 (Phase 13.2 manifest top-level fix) | Complete |
| BRF-01 | Phase 13 (Phase 13.1 metadata fix) | Complete |
| BRF-02 | Phase 13 (Phase 13.2 manifest top-level fix) | Complete |
| SYS-01 | Phase 14 | Complete |
| SYS-02 | Phase 14 | Complete |
| SYS-03 | Phase 14 | Complete |
| FLW-01 | Phase 15 | Complete |
| FLW-02 | Phase 15 | Complete |
| WFR-01 | Phase 16 | Pending |
| WFR-02 | Phase 16 | Pending |
| WFR-03 | Phase 16 | Pending |
| CRT-01 | Phase 17 | Pending |
| CRT-02 | Phase 17 | Pending |
| CRT-03 | Phase 17 | Pending |
| ITR-01 | Phase 18 | Pending |
| ITR-02 | Phase 18 | Pending |
| HND-01 | Phase 19 | Pending |
| HND-02 | Phase 19 | Pending |
| HND-03 | Phase 19 | Pending |
| ORC-01 | Phase 20 | Pending |
| ORC-02 | Phase 20 | Pending |
| ORC-03 | Phase 20 | Pending |

**Coverage:**
- v1.1 requirements: 25 total (4 INFRA + 2 BRF + 3 SYS + 2 FLW + 3 WFR + 3 CRT + 2 ITR + 3 HND + 3 ORC)
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation (v1.1 traceability complete)*
