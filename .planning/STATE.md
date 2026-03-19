---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: milestone
status: executing
stopped_at: Completed 41-03-PLAN.md — sync-linear.md (LIN-01/LIN-02) and sync-jira.md (JIRA-01/JIRA-02) workflow files
last_updated: "2026-03-19T04:26:14.049Z"
last_activity: "2026-03-18 — Completed 39-02: /pde:mcp-status and /pde:connect commands"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 10
  completed_plans: 10
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
| Phase 40-github-integration P01 | 97 | 2 tasks | 2 files |
| Phase 40-github-integration P02 | 114s | 2 tasks | 4 files |
| Phase 40-github-integration P03 | 2 | 2 tasks | 4 files |
| Phase 40.1-github-tech-debt P01 | 5 | 2 tasks | 4 files |
| Phase 41-linear-jira-integration P01 | 7 | 2 tasks | 2 files |
| Phase 41 P02 | 2 | 2 tasks | 3 files |
| Phase 41-linear-jira-integration P04 | 125 | 2 tasks | 2 files |
| Phase 41-linear-jira-integration P03 | 2 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
- [Phase 40-github-integration]: TOOL_MAP uses 8 GitHub entries with github:probe sharing mcp__github__list_issues as the probe target; probeArgs use public github/github-mcp-server repo to avoid needing user repo config before probe
- [Phase 40-github-integration]: connect.md gets GitHub-specific Step 3.5 (not a separate connect-github.md) to keep dispatch logic centralized; Step 4 preserves original non-GitHub updateConnectionStatus call unchanged
- [Phase 40-github-integration]: sync-github workflow uses bridge.call() lookup before every MCP call — toolName returned drives actual Claude Code tool use, never hardcoded raw names
- [Phase 40-github-integration]: pipeline-status response field handling is adaptive (tries workflow_runs then fallbacks) because actions_list field names are MEDIUM confidence from research
- [Phase 40-github-integration]: Sub-workflow delegation pattern: brief-from-github.md and handoff-create-prs.md handle flag-specific logic then delegate to main workflows — keeps main workflows as single sources of truth
- [Phase 40-github-integration]: Confirmation gate for PR creation uses strict y/yes check — any non-yes response produces 'No PRs created.' with zero GitHub writes (VAL-03 compliance)
- [Phase 40.1-github-tech-debt]: mcp__github__* wildcard added only to sync.md and pipeline-status.md allowed-tools — no other tools added; try/catch wraps only b.call() in workflow bash blocks with toolName='' fallback, process.stdout.write stays outside the block
- [Phase 41-linear-jira-integration]: Linear MCP uses HTTP transport to mcp.linear.app/mcp; Atlassian uses SSE to mcp.atlassian.com/v1/sse — both are official hosted OAuth servers (not stdio npx)
- [Phase 41-linear-jira-integration]: task_tracker config key added after brave_search in VALID_CONFIG_KEYS — top-level integration toggle accepting linear|jira|none
- [Phase 41-02]: connect.md gets service-specific steps (3.6, 3.7) rather than separate files — centralized dispatch consistent with Phase 40 GitHub pattern
- [Phase 41-02]: sync.md reads task_tracker from config.json as default service when no flag — frictionless /pde:sync once tracker is configured
- [Phase 41-04]: Linear workflow requires no additional user input beyond y/n — teamId+title sufficient for issue creation (no branch name needed unlike PR workflow)
- [Phase 41-04]: Jira pre-flight type check (Step 2) is read-only before confirmation gate; Story>Task>first-available priority order for maximum project compatibility
- [Phase 41-04]: ADF description format for Jira handoff tickets — plain markdown rejected by Jira Cloud; type:doc version:1 wrapper required
- [Phase 41-03]: sync-linear.md LIN-02 cycle annotations use HTML comments immediately after ROADMAP.md phase heading — machine-parseable without disrupting markdown rendering
- [Phase 41-03]: Jira epics table is replace-not-append on each sync; issue lists are append-only with deduplication — epics change status frequently
- [Phase 41-03]: Jira pagination uses nextPageToken cursor (NOT startAt) per Atlassian MCP server spec

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

Last session: 2026-03-19T04:26:14.046Z
Stopped at: Completed 41-03-PLAN.md — sync-linear.md (LIN-01/LIN-02) and sync-jira.md (JIRA-01/JIRA-02) workflow files
Resume file: None
