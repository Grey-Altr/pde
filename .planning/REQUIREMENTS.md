# Requirements: Platform Development Engine

**Defined:** 2026-03-16
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle

## v1.2 Requirements

Requirements for v1.2 Advanced Design Skills. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Coverage flag update pattern migrated to pass-through-all across existing skills
- [x] **INFRA-02**: Design manifest schema extended with new coverage flags (hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHIG, hasRecommend)
- [x] **INFRA-03**: `ensureDesignDirs` updated with `ux/mockups` output directory

### Ideation

- [ ] **IDEAT-01**: User can run multi-phase diverge→converge ideation via `/pde:ideate`
- [ ] **IDEAT-02**: User can score and assess concept readiness before proceeding to brief
- [ ] **IDEAT-03**: Tool discovery (recommend) runs automatically during ideation diverge phase
- [ ] **IDEAT-04**: Ideation produces a brief seed artifact consumable by `/pde:brief`

### Competitive Analysis

- [ ] **COMP-01**: User can run structured competitive landscape analysis via `/pde:competitive`
- [ ] **COMP-02**: Competitive output includes feature comparison matrix and positioning map
- [ ] **COMP-03**: Competitive gaps feed into opportunity scoring as candidate input

### Opportunity Scoring

- [ ] **OPP-01**: User can score feature opportunities using RICE framework via `/pde:opportunity`
- [ ] **OPP-02**: RICE scoring collects interactive user input for each dimension
- [ ] **OPP-03**: Opportunity output includes sensitivity analysis and priority bucketing

### Mockup

- [ ] **MOCK-01**: User can generate hi-fi interactive HTML/CSS mockup from refined wireframe via `/pde:mockup`
- [ ] **MOCK-02**: Mockup applies design tokens from tokens.css with CSS-only interactive states
- [ ] **MOCK-03**: Mockup preserves wireframe annotations as HTML comments for handoff consumption

### HIG Audit

- [ ] **HIG-01**: User can run full WCAG 2.2 AA + HIG compliance audit via `/pde:hig`
- [ ] **HIG-02**: HIG light mode integrates into critique stage as enhanced accessibility perspective
- [ ] **HIG-03**: HIG findings are severity-rated and platform-aware

### Recommend

- [x] **REC-01**: User can discover relevant MCP servers and tools via `/pde:recommend`
- [x] **REC-02**: Recommend reads project context to tailor suggestions
- [x] **REC-03**: Recommend integrates into ideation workflow when called from `/pde:ideate`

### Build Orchestrator

- [ ] **BUILD-01**: `/pde:build` expanded to handle full pipeline: ideate → competitive → opportunity → brief → system → flows → wireframe → critique(+HIG light) → iterate → mockup → HIG(full) → handoff
- [ ] **BUILD-02**: All orchestrator stage count magic numbers replaced with dynamic stage detection
- [ ] **BUILD-03**: New pipeline stages are individually skippable (user can enter pipeline at any stage)

## Future Requirements

### Source Material Management

- **SRC-01**: User can import and tag source materials (PDFs, URLs, images)
- **SRC-02**: Source materials are searchable and referenceable in design artifacts

### MCP Integrations

- **MCP-01**: GitHub integration for issue/PR tracking
- **MCP-02**: Figma integration for design import/export
- **MCP-03**: Linear integration for project tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-AI-provider support | Candidate for future milestone; requires architecture changes |
| Standalone CLI distribution | Post-v2; current plugin model works |
| Real-time collaborative editing | Conflicts with file-based state model |
| In-tool web dashboard | Markdown files are the dashboard |
| Full architecture restructuring | Do when pain forces it |
| Hardware/content product types | Post-v2; software-first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 24 | Complete |
| INFRA-02 | Phase 24 | Complete (24-01) |
| INFRA-03 | Phase 24 | Complete (24-01) |
| IDEAT-01 | Phase 27 | Pending |
| IDEAT-02 | Phase 27 | Pending |
| IDEAT-03 | Phase 27 | Pending |
| IDEAT-04 | Phase 27 | Pending |
| COMP-01 | Phase 25 | Pending |
| COMP-02 | Phase 25 | Pending |
| COMP-03 | Phase 25 | Pending |
| OPP-01 | Phase 26 | Pending |
| OPP-02 | Phase 26 | Pending |
| OPP-03 | Phase 26 | Pending |
| MOCK-01 | Phase 26 | Pending |
| MOCK-02 | Phase 26 | Pending |
| MOCK-03 | Phase 26 | Pending |
| HIG-01 | Phase 26 | Pending |
| HIG-02 | Phase 26 | Pending |
| HIG-03 | Phase 26 | Pending |
| REC-01 | Phase 25 | Complete |
| REC-02 | Phase 25 | Complete |
| REC-03 | Phase 25 | Complete |
| BUILD-01 | Phase 28 | Pending |
| BUILD-02 | Phase 28 | Pending |
| BUILD-03 | Phase 28 | Pending |

**Coverage:**
- v1.2 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation (v1.2)*
