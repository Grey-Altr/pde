---
phase: 42-figma-integration
plan: "01"
subsystem: infra
tags: [mcp-bridge, figma, tool-map, mcp-integration, connect-workflow]

# Dependency graph
requires:
  - phase: 41-linear-jira-integration
    provides: TOOL_MAP pattern (7 entries per integration), connect.md step numbering (3.5, 3.6, 3.7)
  - phase: 40-github-integration
    provides: mcp-bridge.cjs adapter architecture, bridge.call() pattern
  - phase: 39-mcp-infrastructure-foundation
    provides: mcp-bridge.cjs scaffold, APPROVED_SERVERS.figma stub (probeTool: null)
provides:
  - 7 Figma TOOL_MAP entries in mcp-bridge.cjs (figma:probe through figma:get-metadata)
  - APPROVED_SERVERS.figma.probeTool set to mcp__figma__get_design_context
  - connect.md Step 3.8 capturing FIGMA_FILE_URL and FIGMA_FILE_KEY at connect time
  - sync.md --figma dispatch to sync-figma.md with mcp__figma__* allowed-tools
  - wireframe.md mcp__figma__* allowed-tools (for wireframe-figma-context.md sub-workflow)
  - handoff.md mcp__figma__* allowed-tools (for handoff-figma-codeConnect.md sub-workflow)
affects: [42-02, 42-03, 42-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Figma MCP bridge adapter pattern: bridge.call('figma:xxx') returns mcp__figma__xxx toolName"
    - "connect.md step 3.8 prompts for optional Figma file URL; skip path sets empty strings"

key-files:
  created: []
  modified:
    - bin/lib/mcp-bridge.cjs
    - workflows/connect.md
    - commands/sync.md
    - commands/wireframe.md
    - commands/handoff.md
    - tests/phase-40/mcp-bridge-toolmap.test.mjs
    - tests/phase-41/linear-toolmap.test.mjs

key-decisions:
  - "figma:probe maps to mcp__figma__get_design_context (not a dedicated probe tool — get_design_context is the lightest available read-only tool)"
  - "probeArgs for figma is kept as {} — get_design_context uses prompt context not explicit args"
  - "Figma file URL capture (Step 3.8) is optional — 'skip' is a valid path; sync-figma.md must handle missing fileUrl gracefully"
  - "FIGMA_FILE_KEY is extracted from URL via /design/<key>/ or /file/<key>/ pattern; stored alongside fileUrl for REST API fallback"

patterns-established:
  - "Figma allowed-tools wildcard: add mcp__figma__* to any command that may call Figma sub-workflows"
  - "All Figma workflows use bridge.call() for tool name lookup — never hardcode mcp__figma__xxx"

requirements-completed: [FIG-01, FIG-02, FIG-03, FIG-04]

# Metrics
duration: 10min
completed: 2026-03-18
---

# Phase 42 Plan 01: Figma Integration Bootstrap Summary

**Figma MCP adapter bootstrap: 7 TOOL_MAP entries + probeTool + file URL capture in connect.md + mcp__figma__* dispatch in sync/wireframe/handoff commands**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-18T~04:35:00Z
- **Completed:** 2026-03-18T~04:45:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added 7 Figma entries to TOOL_MAP (29 total), set probeTool in APPROVED_SERVERS.figma — bridge.probe('figma') now returns probe_deferred instead of not_configured
- Added connect.md Step 3.8 to capture Figma file URL and file key at connect time, with soft validation and skip path; added Figma extraFields branch in Step 4
- Updated sync.md (--figma dispatch to sync-figma.md, mcp__figma__* allowed-tools, argument-hint); wireframe.md and handoff.md (mcp__figma__* allowed-tools)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Figma TOOL_MAP entries, set probeTool and probeArgs** - `ab75462` (feat)
2. **Task 2: Add Figma connect Step 3.8 and update sync/wireframe/handoff command dispatch** - `57ad855` (feat)

## Files Created/Modified
- `bin/lib/mcp-bridge.cjs` - Added 7 Figma TOOL_MAP entries; set APPROVED_SERVERS.figma.probeTool; updated header comment
- `workflows/connect.md` - Added Step 3.8 (Figma file URL capture) and Figma branch in Step 4 extraFields
- `commands/sync.md` - Added mcp__figma__* to allowed-tools, --figma dispatch to sync-figma.md, updated argument-hint and usage text
- `commands/wireframe.md` - Added mcp__figma__* to allowed-tools
- `commands/handoff.md` - Added mcp__figma__* to allowed-tools
- `tests/phase-40/mcp-bridge-toolmap.test.mjs` - Updated TOOL_MAP total count from 22 to 29; updated figma probeTool assertion (null -> mcp__figma__get_design_context)
- `tests/phase-41/linear-toolmap.test.mjs` - Updated TOOL_MAP total count from 22 to 29

## Decisions Made
- figma:probe maps to mcp__figma__get_design_context — it is the lightest read-only Figma MCP tool available and follows the same probe-as-lightest-call pattern established in Phase 40/41
- probeArgs stays `{}` — get_design_context uses Claude's prompt context for Figma file awareness rather than explicit args
- Figma file URL capture is optional at connect time (user can skip) — sync-figma.md (Plan 02) must handle missing fileUrl gracefully with a helpful error
- fileKey is extracted inline from URL using /design/<key>/ or /file/<key>/ segment pattern — stored for future REST API fallback if needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated Phase 40/41 tests asserting stale TOOL_MAP count and figma probeTool=null**
- **Found during:** Task 2 verification (running existing Phase 40/41 tests)
- **Issue:** Phase 40 test `mcp-bridge-toolmap.test.mjs` asserted TOOL_MAP.length === 22 and figma.probeTool === null, both of which Phase 42 intentionally changes. Phase 41 `linear-toolmap.test.mjs` also asserted TOOL_MAP.length === 22. These were forward-looking placeholder assertions (annotated "Phase 42 fills") that became incorrect once Phase 42 was executed.
- **Fix:** Updated both tests to assert 29 entries and mcp__figma__get_design_context probeTool; updated header comments to note Phase 42 update
- **Files modified:** tests/phase-40/mcp-bridge-toolmap.test.mjs, tests/phase-41/linear-toolmap.test.mjs
- **Verification:** node --test tests/phase-40/*.test.mjs (69 pass, 0 fail); node --test tests/phase-41/*.test.mjs (84 pass, 0 fail)
- **Committed in:** 57ad855 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - stale test assertions that were explicitly annotated as Phase 42 placeholders)
**Impact on plan:** Required fix — tests would have caused CI failures; no scope creep.

## Issues Encountered
None — plan executed cleanly. The stale test assertions were anticipated (annotated "Phase 42 fills") and resolved automatically under Rule 1.

## User Setup Required
None - no external service configuration required for this plan. Figma connection itself requires user OAuth setup (documented in AUTH_INSTRUCTIONS.figma), which is handled via /pde:connect figma.

## Next Phase Readiness
- Plan 02 (sync-figma.md workflow): bridge.call('figma:get-variable-defs') is ready; fileUrl stored at connect time via Step 3.8; --figma dispatch in sync.md routes to sync-figma.md
- Plan 03 (wireframe-figma-context.md): bridge.call('figma:get-design-context') is ready; mcp__figma__* allowed in wireframe.md
- Plan 04 (handoff-figma-codeConnect.md, mockup-export-figma.md): bridge.call('figma:get-code-connect-map') and bridge.call('figma:generate-design') are ready; mcp__figma__* allowed in handoff.md
- All subsequent plans (02-04) depend on TOOL_MAP entries existing — this plan unblocks all of them

---
*Phase: 42-figma-integration*
*Completed: 2026-03-18*
