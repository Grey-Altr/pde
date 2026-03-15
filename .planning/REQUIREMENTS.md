# Requirements: Platform Development Engine (PDE)

**Defined:** 2026-03-14
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Plugin Identity

- [x] **PLUG-01**: PDE installable as Claude Code plugin via standard mechanism
- [x] **PLUG-02**: plugin.json manifest with PDE name, description, and version 1.0.0
- [x] **PLUG-03**: Plugin passes Claude Code validation and loads without errors
- [ ] **PLUG-04**: Zero GSD references in any user-visible output or error message

### Command Interface

- [x] **CMD-01**: All ~29 /gsd: slash commands operational as /pde: equivalents
- [x] **CMD-02**: /pde:new-project initializes a project with questioning, research, requirements, roadmap
- [x] **CMD-03**: /pde:plan-phase creates detailed phase plans with verification
- [x] **CMD-04**: /pde:execute-phase runs plans with wave-based parallelization
- [x] **CMD-05**: /pde:progress shows current project state and next actions
- [x] **CMD-06**: /pde:quick executes single tasks without full planning overhead
- [x] **CMD-07**: /pde:help displays all available PDE commands with descriptions
- [x] **CMD-08**: /pde:discuss-phase gathers context through adaptive questioning
- [x] **CMD-09**: /pde:verify-work validates built features against requirements
- [x] **CMD-10**: /pde:map-codebase analyzes existing codebases with parallel agents
- [x] **CMD-11**: /pde:new-milestone starts new milestone cycles
- [x] **CMD-12**: /pde:complete-milestone archives completed milestones
- [x] **CMD-13**: /pde:audit-milestone audits milestone completion against intent

### Workflow Engine

- [x] **WORK-01**: Phase-based workflow (discuss → plan → execute → verify) operates end-to-end
- [x] **WORK-02**: .planning/ file state persists across context resets
- [x] **WORK-03**: Roadmap (ROADMAP.md) serves as editable source of truth for phases
- [ ] **WORK-04**: STATE.md tracks current phase, progress, and project memory
- [x] **WORK-05**: Requirements traceability maps every requirement to a phase
- [x] **WORK-06**: Atomic git commits created per completed task

### Agent System

- [x] **AGNT-01**: All GSD agent types functional with PDE naming (pde-project-researcher, pde-planner, etc.)
- [x] **AGNT-02**: Parallel agent orchestration with wave execution operates correctly
- [x] **AGNT-03**: Phase-aware research agents spawn before planning when configured
- [x] **AGNT-04**: Model selection works via config.json model_profile setting
- [x] **AGNT-05**: Agent spawning uses correct PDE paths (not GSD paths)

### Tooling & Infrastructure

- [x] **TOOL-01**: gsd-tools.cjs rebranded as pde-tools.cjs and fully functional
- [x] **TOOL-02**: All bin scripts reference PDE paths (~/.pde/ instead of ~/.gsd/)
- [x] **TOOL-03**: Templates migrated with PDE branding (banners, stage names, references)
- [x] **TOOL-04**: References and guides updated with PDE naming
- [x] **TOOL-05**: Config system uses ~/.pde/ for global defaults
- [x] **TOOL-06**: Git branch templates use pde/ prefix instead of gsd/

### Rebranding Completeness

- [ ] **BRAND-01**: Zero occurrences of "gsd" or "GSD" in any source file (case-insensitive grep clean)
- [x] **BRAND-02**: Zero occurrences of "get-shit-done" in any path reference
- [x] **BRAND-03**: Zero hardcoded absolute paths containing specific usernames
- [x] **BRAND-04**: All UI banners display "PDE ►" instead of "GSD ►"
- [x] **BRAND-05**: All stage names, status symbols, and progress displays use PDE branding
- [x] **BRAND-06**: README and any documentation reference PDE, not GSD

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Design Pipeline

- **DSGN-01**: Wireframing skill generates browser-viewable HTML/CSS wireframes
- **DSGN-02**: Design system generation with tokens, typography, color palette
- **DSGN-03**: User flow mapping as Mermaid flowchart diagrams
- **DSGN-04**: Design critique with multi-perspective review
- **DSGN-05**: Design-to-implementation handoff with component APIs

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
| Real-time collaborative editing | Requires server infrastructure; conflicts with file-based state model |
| In-tool web dashboard / UI | Bloats plugin into an app; markdown files are the dashboard |
| Automatic AI model routing | Cost/quality tradeoffs are user-specific; explicit config is better |
| Full autonomous ship-without-review | Trust erosion after first bad deploy; verification gate must stay |
| IDE replacement features | PDE runs inside Claude Code; competing with the host loses the plugin advantage |
| Proprietary agent runtime | Kills portability; breaks markdown + Claude simplicity |
| LLM-as-workflow-engine | LLMs make poor state machines; deterministic logic belongs in code |
| Subscription/credits system | Adds billing complexity; monetize via support/enterprise later |
| Architecture restructuring in v1 | Fast clone first; refactor in later milestones |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 1 | Complete |
| PLUG-02 | Phase 1 | Complete |
| PLUG-03 | Phase 1 | Complete |
| PLUG-04 | Phase 10 | Pending |
| CMD-01 | Phase 3 | Complete |
| CMD-02 | Phase 3 | Complete |
| CMD-03 | Phase 3 | Complete |
| CMD-04 | Phase 3 | Complete |
| CMD-05 | Phase 3 | Complete |
| CMD-06 | Phase 3 | Complete |
| CMD-07 | Phase 3 | Complete |
| CMD-08 | Phase 3 | Complete |
| CMD-09 | Phase 3 | Complete |
| CMD-10 | Phase 3 | Complete |
| CMD-11 | Phase 3 | Complete |
| CMD-12 | Phase 3 | Complete |
| CMD-13 | Phase 3 | Complete |
| WORK-01 | Phase 4 | Complete |
| WORK-02 | Phase 4 | Complete |
| WORK-03 | Phase 4 | Complete |
| WORK-04 | Phase 10 | Pending |
| WORK-05 | Phase 4 | Complete |
| WORK-06 | Phase 4 | Complete |
| AGNT-01 | Phase 5 | Complete |
| AGNT-02 | Phase 5 | Complete |
| AGNT-03 | Phase 5 | Complete |
| AGNT-04 | Phase 5 | Complete |
| AGNT-05 | Phase 5 | Complete |
| TOOL-01 | Phase 2 | Complete |
| TOOL-02 | Phase 2 | Complete |
| TOOL-03 | Phase 6 | Complete |
| TOOL-04 | Phase 6 | Complete |
| TOOL-05 | Phase 2 | Complete |
| TOOL-06 | Phase 2 | Complete |
| BRAND-01 | Phase 10 | Pending |
| BRAND-02 | Phase 7 | Complete |
| BRAND-03 | Phase 7 | Complete |
| BRAND-04 | Phase 9 | Complete |
| BRAND-05 | Phase 9 | Complete |
| BRAND-06 | Phase 8 | Complete |

**Coverage:**
- v1 requirements: 40 total (4 PLUG + 13 CMD + 6 WORK + 5 AGNT + 6 TOOL + 6 BRAND)
- Satisfied: 34
- Pending (gap closure): 6 (PLUG-04, BRAND-01, BRAND-04, BRAND-05, WORK-04, PLUG-01 partial)
- Mapped to phases: 40
- Unmapped: 0 ✓

Note: Source file stated 30 requirements but enumeration counts 40. All 40 enumerated requirements are mapped.

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation — traceability populated*
