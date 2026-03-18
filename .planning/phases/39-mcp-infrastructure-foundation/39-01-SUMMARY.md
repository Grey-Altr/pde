---
phase: 39-mcp-infrastructure-foundation
plan: 01
subsystem: infra
tags: [mcp, mcp-bridge, node, commonjs, security-allowlist, adapter-pattern, connection-persistence]

# Dependency graph
requires: []
provides:
  - bin/lib/mcp-bridge.cjs — central MCP adapter with allowlist, probe, tool map, and connection persistence
  - APPROVED_SERVERS registry with github, linear, figma, pencil, atlassian entries
  - TOOL_MAP scaffold (empty — phases 40-44 populate with canonical→raw tool name mappings)
  - assertApproved() POLICY_VIOLATION enforcement used by all MCP-dependent workflows
  - loadConnections()/saveConnections() for .planning/mcp-connections.json (no credentials)
  - .gitignore with .planning/mcp-connections.json entry
affects:
  - 40-github-mcp-integration
  - 41-linear-jira-mcp-integration
  - 42-figma-mcp-integration
  - 43-pencil-mcp-integration
  - 44-mcp-sync-workflows

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canonical tool name adapter: TOOL_MAP maps pde:canonical-name → mcp__server__rawName; all workflows call bridge.call() never raw tool names"
    - "Security allowlist: assertApproved() enforces APPROVED_SERVERS list with POLICY_VIOLATION error code before any operation"
    - "Probe-degrade contract: probe() is a coordination point; actual MCP calls happen at workflow layer where Claude Code MCP runtime is available"
    - "Credential-free metadata: mcp-connections.json has no token/secret/key/password fields — auth tokens stay in Claude Code's system keychain"

key-files:
  created:
    - bin/lib/mcp-bridge.cjs
    - .gitignore
  modified: []

key-decisions:
  - "TOOL_MAP is empty in Phase 39 — phases 40-44 populate canonical→raw mappings as each integration is researched and implemented"
  - "probe() returns a deferred result when probeTool is null — actual MCP tool calls happen only at workflow layer, never in this module"
  - "mcp-connections.json is gitignored because it is user-specific project-local metadata, even though it contains no credentials"
  - "assertApproved() uses error.code = 'POLICY_VIOLATION' for programmatic detection by callers"

patterns-established:
  - "All MCP-dependent phases (40-44) must import from bin/lib/mcp-bridge.cjs and call bridge.call(canonicalName, args) — never raw mcp__*__* tool names"
  - "Connection metadata written via saveConnections() must never include credential fields (token, secret, key, password)"

requirements-completed: [INFRA-04, INFRA-05, INFRA-06]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 39 Plan 01: MCP Infrastructure Foundation Summary

**CommonJS MCP adapter module (mcp-bridge.cjs) with 5-server allowlist, empty TOOL_MAP scaffold, credential-free connection persistence, and POLICY_VIOLATION enforcement — zero new npm dependencies**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T20:54:17Z
- **Completed:** 2026-03-18T20:55:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `bin/lib/mcp-bridge.cjs` with all 11 required exports: APPROVED_SERVERS, TOOL_MAP, AUTH_INSTRUCTIONS, CONNECTIONS_PATH, assertApproved, loadConnections, saveConnections, getStatus, getAllStatuses, probe, call, updateConnectionStatus
- Security allowlist rejects unapproved servers with POLICY_VIOLATION error code and includes full list of approved server names in rejection message
- TOOL_MAP scaffold is empty and ready for phases 40-44 to populate with canonical→raw MCP tool name mappings; call() validates lookups and returns {toolName, args} for workflow-layer execution
- Created `.gitignore` with `.planning/mcp-connections.json` entry; verified via `git check-ignore`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bin/lib/mcp-bridge.cjs** - `a75dcca` (feat)
2. **Task 2: Create .gitignore with mcp-connections.json entry** - `ce365a5` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bin/lib/mcp-bridge.cjs` - Central MCP adapter: allowlist, probe, canonical tool map, connection persistence (302 lines, zero new npm deps, Node 20+ CommonJS)
- `.gitignore` - Gitignore rule for `.planning/mcp-connections.json` to prevent accidental commits of user-specific connection metadata

## Decisions Made

- TOOL_MAP is empty in Phase 39 — filling it requires knowing the exact raw MCP tool names from each server, which is each integration phase's research responsibility. Phases 40-44 populate their entries as they validate tool names.
- probe() returns a deferred result when probeTool is null rather than attempting an actual MCP call — actual MCP tool calls must happen at the workflow layer where Claude Code's MCP runtime is available, not inside this CommonJS module.
- mcp-connections.json is gitignored even though it contains no credentials — it is user-specific (each developer's own MCP connection state) and should not be shared via source control.
- assertApproved() uses `error.code = 'POLICY_VIOLATION'` in addition to the human-readable message, enabling programmatic detection by callers without string-matching.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this infrastructure plan. Connection setup happens when users run `/pde:connect <service>` in later phases.

## Next Phase Readiness

- `bin/lib/mcp-bridge.cjs` is ready for phases 40-44 to import and extend. Each phase adds entries to TOOL_MAP and sets probeTool in APPROVED_SERVERS.
- `.gitignore` is in place; no risk of mcp-connections.json being committed.
- No blockers for Phase 39 Plan 02 or Phase 40.

## Self-Check: PASSED

- FOUND: bin/lib/mcp-bridge.cjs
- FOUND: .gitignore
- FOUND: .planning/phases/39-mcp-infrastructure-foundation/39-01-SUMMARY.md
- FOUND commit: a75dcca (feat(39-01): create bin/lib/mcp-bridge.cjs)
- FOUND commit: ce365a5 (chore(39-01): add .gitignore with mcp-connections.json entry)

---
*Phase: 39-mcp-infrastructure-foundation*
*Completed: 2026-03-18*
