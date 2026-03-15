# Requirements: Platform Development Engine (PDE)

**Defined:** 2026-03-14
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Plugin Identity

- [ ] **PLUG-01**: PDE installable as Claude Code plugin via standard mechanism
- [ ] **PLUG-02**: plugin.json manifest with PDE name, description, and version 1.0.0
- [ ] **PLUG-03**: Plugin passes Claude Code validation and loads without errors
- [ ] **PLUG-04**: Zero GSD references in any user-visible output or error message

### Command Interface

- [ ] **CMD-01**: All ~29 /gsd: slash commands operational as /pde: equivalents
- [ ] **CMD-02**: /pde:new-project initializes a project with questioning, research, requirements, roadmap
- [ ] **CMD-03**: /pde:plan-phase creates detailed phase plans with verification
- [ ] **CMD-04**: /pde:execute-phase runs plans with wave-based parallelization
- [ ] **CMD-05**: /pde:progress shows current project state and next actions
- [ ] **CMD-06**: /pde:quick executes single tasks without full planning overhead
- [ ] **CMD-07**: /pde:help displays all available PDE commands with descriptions
- [ ] **CMD-08**: /pde:discuss-phase gathers context through adaptive questioning
- [ ] **CMD-09**: /pde:verify-work validates built features against requirements
- [ ] **CMD-10**: /pde:map-codebase analyzes existing codebases with parallel agents
- [ ] **CMD-11**: /pde:new-milestone starts new milestone cycles
- [ ] **CMD-12**: /pde:complete-milestone archives completed milestones
- [ ] **CMD-13**: /pde:audit-milestone audits milestone completion against intent

### Workflow Engine

- [ ] **WORK-01**: Phase-based workflow (discuss → plan → execute → verify) operates end-to-end
- [ ] **WORK-02**: .planning/ file state persists across context resets
- [ ] **WORK-03**: Roadmap (ROADMAP.md) serves as editable source of truth for phases
- [ ] **WORK-04**: STATE.md tracks current phase, progress, and project memory
- [ ] **WORK-05**: Requirements traceability maps every requirement to a phase
- [ ] **WORK-06**: Atomic git commits created per completed task

### Agent System

- [ ] **AGNT-01**: All GSD agent types functional with PDE naming (pde-project-researcher, pde-planner, etc.)
- [ ] **AGNT-02**: Parallel agent orchestration with wave execution operates correctly
- [ ] **AGNT-03**: Phase-aware research agents spawn before planning when configured
- [ ] **AGNT-04**: Model selection works via config.json model_profile setting
- [ ] **AGNT-05**: Agent spawning uses correct PDE paths (not GSD paths)

### Tooling & Infrastructure

- [ ] **TOOL-01**: gsd-tools.cjs rebranded as pde-tools.cjs and fully functional
- [ ] **TOOL-02**: All bin scripts reference PDE paths (~/.pde/ instead of ~/.gsd/)
- [ ] **TOOL-03**: Templates migrated with PDE branding (banners, stage names, references)
- [ ] **TOOL-04**: References and guides updated with PDE naming
- [ ] **TOOL-05**: Config system uses ~/.pde/ for global defaults
- [ ] **TOOL-06**: Git branch templates use pde/ prefix instead of gsd/

### Rebranding Completeness

- [ ] **BRAND-01**: Zero occurrences of "gsd" or "GSD" in any source file (case-insensitive grep clean)
- [ ] **BRAND-02**: Zero occurrences of "get-shit-done" in any path reference
- [ ] **BRAND-03**: Zero hardcoded absolute paths containing specific usernames
- [ ] **BRAND-04**: All UI banners display "PDE ►" instead of "GSD ►"
- [ ] **BRAND-05**: All stage names, status symbols, and progress displays use PDE branding
- [ ] **BRAND-06**: README and any documentation reference PDE, not GSD

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
| (Populated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30 ⚠️

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after initial definition*
