# Requirements: Platform Development Engine

**Defined:** 2026-03-18
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.5 Requirements

Requirements for MCP Integrations milestone. Each maps to roadmap phases.

### MCP Infrastructure

- [ ] **INFRA-01**: User can view all MCP integration connection states via `/pde:mcp-status`
- [ ] **INFRA-02**: User can connect to external MCP servers via guided `/pde:connect` flow with auth instructions
- [ ] **INFRA-03**: All MCP-dependent commands detect server availability at runtime and degrade gracefully when unavailable
- [ ] **INFRA-04**: MCP connection metadata stored in unified `.planning/mcp-connections.json` schema (gitignored, no credentials)
- [ ] **INFRA-05**: Verified-sources-only security policy enforced — only official MCP servers from GitHub, Linear, Figma, Pencil, Atlassian
- [ ] **INFRA-06**: MCP adapter layer normalizes raw tool names into PDE canonical API calls (insulates workflows from server-side renames)

### GitHub Integration

- [ ] **GH-01**: User can sync GitHub issues to REQUIREMENTS.md via `/pde:sync --github`
- [ ] **GH-02**: User can create GitHub PRs from handoff artifacts via `/pde:handoff --create-prs` with confirmation gate
- [ ] **GH-03**: User can populate `/pde:brief` from a GitHub issue via `--from-github` flag
- [ ] **GH-04**: User can view GitHub Actions CI feedback integrated into pipeline status

### Linear Integration

- [ ] **LIN-01**: User can sync Linear issues to REQUIREMENTS.md via `/pde:sync --linear`
- [ ] **LIN-02**: User can map Linear cycles/milestones to ROADMAP.md phases
- [ ] **LIN-03**: User can create Linear issues from handoff artifacts with confirmation gate

### Jira Integration

- [ ] **JIRA-01**: User can sync Jira issues to REQUIREMENTS.md via `/pde:sync --jira`
- [ ] **JIRA-02**: User can map Jira epics to REQUIREMENTS.md categories
- [ ] **JIRA-03**: User can create Jira tickets from handoff artifacts with confirmation gate
- [ ] **JIRA-04**: User can toggle between Linear and Jira via `task_tracker` config setting

### Figma Integration

- [ ] **FIG-01**: User can import Figma design tokens into PDE's DTCG system via `/pde:sync --figma`
- [ ] **FIG-02**: User can feed Figma design context into `/pde:wireframe` for reference
- [ ] **FIG-03**: User can import Figma Code Connect mappings into `/pde:handoff` output
- [ ] **FIG-04**: User can export PDE mockup HTML to editable Figma frames via Code-to-Canvas

### Pencil Integration

- [ ] **PEN-01**: User can sync PDE DTCG design tokens to Pencil canvas via `set_variables` in `/pde:system`
- [ ] **PEN-02**: User can capture Pencil canvas screenshots for `/pde:critique` visual audit
- [ ] **PEN-03**: Pencil integration degrades gracefully when VS Code/Cursor is not available

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
| INFRA-01 | Phase 39 | Pending |
| INFRA-02 | Phase 39 | Pending |
| INFRA-03 | Phase 39 | Pending |
| INFRA-04 | Phase 39 | Pending |
| INFRA-05 | Phase 39 | Pending |
| INFRA-06 | Phase 39 | Pending |
| GH-01 | Phase 40 | Pending |
| GH-02 | Phase 40 | Pending |
| GH-03 | Phase 40 | Pending |
| GH-04 | Phase 40 | Pending |
| LIN-01 | Phase 41 | Pending |
| LIN-02 | Phase 41 | Pending |
| LIN-03 | Phase 41 | Pending |
| JIRA-01 | Phase 41 | Pending |
| JIRA-02 | Phase 41 | Pending |
| JIRA-03 | Phase 41 | Pending |
| JIRA-04 | Phase 41 | Pending |
| FIG-01 | Phase 42 | Pending |
| FIG-02 | Phase 42 | Pending |
| FIG-03 | Phase 42 | Pending |
| FIG-04 | Phase 42 | Pending |
| PEN-01 | Phase 43 | Pending |
| PEN-02 | Phase 43 | Pending |
| PEN-03 | Phase 43 | Pending |
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
