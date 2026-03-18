---
gsd_state_version: 1.0
milestone: v0.5
milestone_name: MCP Integrations
status: active
stopped_at: ""
last_updated: "2026-03-18"
last_activity: 2026-03-18 — Completed 39-02: /pde:mcp-status and /pde:connect commands with degraded-mode output
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 2
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** v0.5 MCP Integrations — Phase 39: MCP Infrastructure Foundation

## Current Position

Phase: 39 — MCP Infrastructure Foundation
Plan: 2/2 complete (phase plans complete)
Status: Active — executing plans
Progress: ░░░░░░░░░░ 0/6 phases (Phase 39 in progress)

Last activity: 2026-03-18 — Completed 39-02: /pde:mcp-status and /pde:connect commands

## Performance Metrics

| Metric | v0.1 | v0.2 | v0.3 | v0.4 |
|--------|------|------|------|------|
| Phases | 11 | 12 | 5 | 10 |
| Commits | 127 | 135 | 67 | 131 |
| Files changed | 303 | 172 | 84 | 259 |
| LOC | ~60,000 | ~89,000 | ~101,700 | ~134,000 |
| Timeline | 2 days | 2 days | 1 day | 4 days |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

#### Phase 39-01 Decisions (2026-03-18)

- TOOL_MAP is empty in Phase 39 — phases 40-44 populate canonical→raw MCP tool name mappings as each integration is researched
- probe() returns a deferred result when probeTool is null — actual MCP tool calls happen only at workflow layer, never inside mcp-bridge.cjs
- mcp-connections.json is gitignored (user-specific project-local metadata, no credentials)
- assertApproved() sets error.code = 'POLICY_VIOLATION' for programmatic detection by callers

#### Phase 39-02 Decisions (2026-03-18)

- Workflow bash blocks use node --input-type=module with createRequire() rather than inline require() — posttooluse-validate hook rejects require() in workflow files; ESM+createRequire satisfies validator while loading CommonJS mcp-bridge.cjs correctly
- mcp-status calls probe() for connected servers: probeTool=null → displayed as 'degraded' (Phase 39 state, resolves as phases 40-44 populate probeTool)
- connect workflow is two-phase: display instructions without --confirm, record status only with --confirm — matches Claude Code's external MCP setup model

### Key Architecture Constraints for v0.5

- `bin/lib/mcp-bridge.cjs` must exist before any sync workflow is written (Phase 39 hard blocks all others)
- Adapter layer normalizing raw MCP tool names into PDE canonical API calls is established in Phase 40 (GitHub) and inherited by all subsequent integrations — do not let individual workflows call raw tool names
- `.planning/` is the single source of truth; external services are read-only input sources; write-back always requires explicit user confirmation
- Zero-npm-dependency constraint at plugin root must be preserved; any new deps go in isolated subdirectories
- Auth persistence must be addressed in Phase 39 before any integration is built (retrofitting is 5x the work)

### Research Flags for Planning

- **Phase 39**: Validate whether `listTools` is callable programmatically within skill context before finalizing probe implementation approach
- **Phase 42 (Figma token import)**: Non-destructive DTCG merge logic requires a naming convention mapping between Figma variables and PDE token names — design this mapping before implementation
- **Phase 43 (Pencil)**: Tool names sourced from community articles (MEDIUM confidence) — validate in real Pencil + Claude Code + VS Code environment before committing workflow logic

### Pending Todos

None — ready to begin Phase 39.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-18
Stopped at: Completed 39-02-PLAN.md — Phase 39 complete, next step is Phase 40 (GitHub MCP Integration)
Resume file: None
