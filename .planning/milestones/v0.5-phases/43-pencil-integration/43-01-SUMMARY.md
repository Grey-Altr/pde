---
phase: 43-pencil-integration
plan: "01"
subsystem: infra
tags: [mcp, pencil, mcp-bridge, design-tokens, tool-map, adapter]

# Dependency graph
requires:
  - phase: 42-figma-integration
    provides: TOOL_MAP adapter pattern (figma entries), connect.md Step 3.8, mcp-bridge.cjs scaffold with 29 entries

provides:
  - 7 Pencil TOOL_MAP entries in mcp-bridge.cjs (pencil:probe, get-variables, set-variables, get-screenshot, batch-get, batch-design, get-editor-state)
  - APPROVED_SERVERS.pencil with probeTool and probeTimeoutMs filled (Phase 43)
  - AUTH_INSTRUCTIONS.pencil with detection-based flow (no claude mcp add)
  - connect.md Step 3.9 for Pencil connection detection
  - mcp__pencil__* in allowed-tools for system.md and critique.md

affects:
  - 43-02 (sync-pencil.md needs bridge.call('pencil:set-variables') working — now unblocked)
  - 43-03 (critique-pencil-screenshot.md needs bridge.call('pencil:get-screenshot') working — now unblocked)
  - tests/phase-40, tests/phase-41, tests/phase-42 (TOOL_MAP count assertions updated to 36)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Detection-based connect flow for stdio auto-configured MCP servers (Pencil differs from all prior HTTP/OAuth integrations)
    - Short probeTimeoutMs (8000ms) for stdio hang prevention when VS Code not running

key-files:
  created: []
  modified:
    - bin/lib/mcp-bridge.cjs
    - workflows/connect.md
    - commands/system.md
    - commands/critique.md
    - tests/phase-40/mcp-bridge-toolmap.test.mjs
    - tests/phase-41/linear-toolmap.test.mjs
    - tests/phase-42/figma-toolmap.test.mjs

key-decisions:
  - "Pencil connect flow is detection-based (not setup-based): no claude mcp add command — VS Code extension auto-configures ~/.claude.json"
  - "probeTimeoutMs set to 8000ms for Pencil (shorter than 10-15s for HTTP integrations) to prevent stdio hang when VS Code is closed"
  - "pencil:probe maps to mcp__pencil__get_variables (lightest read-only tool) — consistent with Phase 40-42 probe-as-lightest-call pattern"
  - "Raw mcp__pencil__* tool names are MEDIUM confidence until verified in live Claude Code + VS Code + Pencil environment; bridge.call() adapter ensures only TOOL_MAP needs updating if names differ"

patterns-established:
  - "Pattern: stdio auto-configured MCP adapter — fill probeTool + probeTimeoutMs; connect.md Step N.x provides detection instructions not manual install steps"

requirements-completed: [PEN-01, PEN-02, PEN-03]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 43 Plan 01: Pencil Integration Bootstrap Summary

**Pencil MCP adapter bootstrapped in mcp-bridge.cjs: 7 TOOL_MAP entries, stdio hang-safe probeTimeoutMs 8000ms, detection-based connect flow replacing Phase 43 stubs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-19T06:05:33Z
- **Completed:** 2026-03-19T06:08:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added 7 Pencil TOOL_MAP entries to mcp-bridge.cjs, bringing total from 29 to 36 entries (8 GitHub + 7 Linear + 7 Atlassian + 7 Figma + 7 Pencil)
- Filled APPROVED_SERVERS.pencil stub: probeTool = `mcp__pencil__get_variables`, probeTimeoutMs = 8000 (was null/10000), installCmd comment updated for auto-configured pattern
- Replaced placeholder AUTH_INSTRUCTIONS.pencil with 5-step detection-based flow (install extension, open .pen file, verify via /mcp — no `claude mcp add`)
- Added connect.md Step 3.9 handling Pencil's unique auto-configured stdio model
- Enabled `mcp__pencil__*` in allowed-tools for system.md and critique.md (prerequisite for Plans 02 and 03)
- Updated stale TOOL_MAP count assertions (29 -> 36) in all phase-40/41/42 tests; all 214 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 7 Pencil TOOL_MAP entries, fill APPROVED_SERVERS.pencil, update AUTH_INSTRUCTIONS.pencil** - `cf61330` (feat)
2. **Task 2: Add connect.md Step 3.9, update system.md and critique.md allowed-tools, fix stale test assertions** - `3837b15` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bin/lib/mcp-bridge.cjs` - Added 7 pencil:* TOOL_MAP entries; filled APPROVED_SERVERS.pencil (probeTool, probeTimeoutMs, installCmd comment); replaced AUTH_INSTRUCTIONS.pencil with detection-based 5-step flow
- `workflows/connect.md` - Added Step 3.9: Pencil detection-based connect flow (auto-configured, no claude mcp add, probes at sync/critique time)
- `commands/system.md` - Added `mcp__pencil__*` to allowed-tools frontmatter (prerequisite for Plan 02 sync-pencil.md)
- `commands/critique.md` - Added `mcp__pencil__*` to allowed-tools frontmatter (prerequisite for Plan 03 critique-pencil-screenshot.md)
- `tests/phase-40/mcp-bridge-toolmap.test.mjs` - Updated TOOL_MAP count 29 -> 36; updated pencil probeTool assertion null -> mcp__pencil__get_variables
- `tests/phase-41/linear-toolmap.test.mjs` - Updated TOOL_MAP count 29 -> 36
- `tests/phase-42/figma-toolmap.test.mjs` - Updated TOOL_MAP count 29 -> 36; added APPROVED_SERVERS.pencil.probeTool test

## Decisions Made

- Pencil connect flow is detection-based (Step 3.9) rather than setup-based: VS Code extension auto-configures `~/.claude.json`, so there is no `claude mcp add` command to provide. This is a documented difference from all prior integrations (GitHub, Linear, Figma, Atlassian).
- probeTimeoutMs set to 8000ms to prevent stdio hang when VS Code is closed mid-session (confirmed pitfall from Cursor community forum reports).
- Raw `mcp__pencil__*` tool names are MEDIUM confidence — STATE.md research flag preserved; bridge.call() adapter ensures only TOOL_MAP needs updating if live verification reveals different names.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — the stale test assertions (29 -> 36) were planned in Task 2 and resolved as part of the task.

## User Setup Required

None — no external service configuration required for this plan. Pencil user setup instructions are documented in AUTH_INSTRUCTIONS.pencil (install `highagency.pencildev` VS Code extension, open a .pen file, verify via /mcp).

## Next Phase Readiness

- Plan 02 (sync-pencil.md) is unblocked: bridge.call('pencil:set-variables') resolves to `mcp__pencil__set_variables`
- Plan 03 (critique-pencil-screenshot.md) is unblocked: bridge.call('pencil:get-screenshot') resolves to `mcp__pencil__get_screenshot`
- All phase-40/41/42 tests continue to pass with updated TOOL_MAP count (214 tests, 0 failures)
- MEDIUM confidence flag on raw mcp__pencil__* names remains — validate in live environment before shipping Plans 02/03

---
*Phase: 43-pencil-integration*
*Completed: 2026-03-19*
