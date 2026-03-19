# Requirements: Platform Development Engine

**Defined:** 2026-03-18
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.5 Requirements

Requirements for MCP Integrations milestone. Each maps to roadmap phases.

### MCP Infrastructure

- [x] **INFRA-01**: User can view all MCP integration connection states via `/pde:mcp-status`
- [x] **INFRA-02**: User can connect to external MCP servers via guided `/pde:connect` flow with auth instructions
- [x] **INFRA-03**: All MCP-dependent commands detect server availability at runtime and degrade gracefully when unavailable
- [x] **INFRA-04**: MCP connection metadata stored in unified `.planning/mcp-connections.json` schema (gitignored, no credentials)
- [x] **INFRA-05**: Verified-sources-only security policy enforced — only official MCP servers from GitHub, Linear, Figma, Pencil, Atlassian
- [x] **INFRA-06**: MCP adapter layer normalizes raw tool names into PDE canonical API calls (insulates workflows from server-side renames)

### GitHub Integration

- [x] **GH-01**: User can sync GitHub issues to REQUIREMENTS.md via `/pde:sync --github`
- [x] **GH-02**: User can create GitHub PRs from handoff artifacts via `/pde:handoff --create-prs` with confirmation gate
- [x] **GH-03**: User can populate `/pde:brief` from a GitHub issue via `--from-github` flag
- [x] **GH-04**: User can view GitHub Actions CI feedback integrated into pipeline status

### Linear Integration

- [x] **LIN-01**: User can sync Linear issues to REQUIREMENTS.md via `/pde:sync --linear`
- [x] **LIN-02**: User can map Linear cycles/milestones to ROADMAP.md phases
- [x] **LIN-03**: User can create Linear issues from handoff artifacts with confirmation gate

### Jira Integration

- [x] **JIRA-01**: User can sync Jira issues to REQUIREMENTS.md via `/pde:sync --jira`
- [x] **JIRA-02**: User can map Jira epics to REQUIREMENTS.md categories
- [x] **JIRA-03**: User can create Jira tickets from handoff artifacts with confirmation gate
- [x] **JIRA-04**: User can toggle between Linear and Jira via `task_tracker` config setting

### Figma Integration

- [x] **FIG-01**: User can import Figma design tokens into PDE's DTCG system via `/pde:sync --figma`
- [x] **FIG-02**: User can feed Figma design context into `/pde:wireframe` for reference
- [x] **FIG-03**: User can import Figma Code Connect mappings into `/pde:handoff` output
- [x] **FIG-04**: User can export PDE mockup HTML to editable Figma frames via Code-to-Canvas

### Pencil Integration

- [x] **PEN-01**: User can sync PDE DTCG design tokens to Pencil canvas via `set_variables` in `/pde:system`
- [x] **PEN-02**: User can capture Pencil canvas screenshots for `/pde:critique` visual audit
- [x] **PEN-03**: Pencil integration degrades gracefully when VS Code/Cursor is not available

### Validation

- [ ] **VAL-01**: User can run all integrations simultaneously (2+ MCP servers connected)
- [ ] **VAL-02**: All integrations function correctly after context compaction (auth recovery)
- [ ] **VAL-03**: Write-back operations to external services require explicit user confirmation

## v0.6 Requirements

Deferred to future release. Tracked but not in current roadmap.

### PDE-as-MCP-Server

- **SRV-01**: PDE exposes `.planning/` state as read-only MCP resources (pde://plan, pde://state, pde://design-state)
- **SRV-02**: PDE state server provides tools (get_current_phase, get_requirements, get_design_artifacts)
- **SRV-03**: State server bundled via `.mcp.json` with isolated `@modelcontextprotocol/sdk` dependency

### Cross-Pipeline Orchestration

- **PIPE-01**: `/pde:build --sync` injects MCP syncs at pre-brief (requirements pull), post-mockup (design push), post-handoff (ticket creation)

### Extended Integrations

- **EXT-01**: Pencil Level 2 — native `.pen` file output from `/pde:wireframe`
- **EXT-02**: Jira Data Center support via community `sooperset/mcp-atlassian` server
- **EXT-03**: Slack/Notion requirements import

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time bidirectional Figma sync | Architecturally impossible in session-based plugin; use explicit sync commands |
| Auto-configure all MCP servers on install | Triggers unexpected OAuth flows; always require explicit user consent |
| MCP tool passthrough to all subagents | Destroys 85% context savings from Tool Search; scope tools at agent spawn time |
| Write tools in PDE-as-MCP-server | Creates second write path bypassing pde-tools.cjs validation and locking |
| Sentry/Vercel post-deployment feedback | Requires deployed user projects first; defer to post-v1.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 39 | Complete |
| INFRA-02 | Phase 39 | Complete |
| INFRA-03 | Phase 39 | Complete |
| INFRA-04 | Phase 39 | Complete |
| INFRA-05 | Phase 39 | Complete |
| INFRA-06 | Phase 39 | Complete |
| GH-01 | Phase 40 | Complete |
| GH-02 | Phase 40 | Complete |
| GH-03 | Phase 40 | Complete |
| GH-04 | Phase 40 | Complete |
| LIN-01 | Phase 41 | Complete |
| LIN-02 | Phase 41 | Complete |
| LIN-03 | Phase 41 | Complete |
| JIRA-01 | Phase 41 | Complete |
| JIRA-02 | Phase 41 | Complete |
| JIRA-03 | Phase 41 | Complete |
| JIRA-04 | Phase 41 | Complete |
| FIG-01 | Phase 42 | Complete |
| FIG-02 | Phase 42 | Complete |
| FIG-03 | Phase 42 | Complete |
| FIG-04 | Phase 42 | Complete |
| PEN-01 | Phase 43 | Complete |
| PEN-02 | Phase 43 | Complete |
| PEN-03 | Phase 43 | Complete |
| VAL-01 | Phase 44 | Pending |
| VAL-02 | Phase 44 | Pending |
| VAL-03 | Phase 44 | Pending |

**Coverage:**
- v0.5 requirements: 27 total (note: original count of 25 was incorrect; 27 requirements across 7 categories)
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 — traceability completed during roadmap creation*
