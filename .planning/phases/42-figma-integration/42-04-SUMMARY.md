---
phase: 42-figma-integration
plan: "04"
subsystem: figma
tags: [figma, mcp-bridge, mockup, code-to-canvas, confirmation-gate, val-03, fig-04]

# Dependency graph
requires:
  - phase: 42-figma-integration
    provides: TOOL_MAP entries for figma:generate-design -> mcp__figma__generate_figma_design (Plan 01)
  - phase: 40-github-integration
    provides: confirmation gate pattern (strict y/yes check, VAL-03 compliance model)
provides:
  - workflows/mockup-export-figma.md — FIG-04 mockup-to-Figma export with confirmation gate
  - commands/sync.md --export-figma dispatch to mockup-export-figma.md
  - tests/phase-42/mockup-export-figma-workflow.test.mjs — 13 structural assertions for FIG-04
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Confirmation gate pattern applied to Figma writes: strict ^y(es)?$ check, 'Export cancelled — no changes to Figma.' on non-yes"
    - "Tool availability probe before write (claude-code#28718 degraded mode): check toolName emptiness before attempting generate_figma_design"
    - "Mockup search pattern: assets/mockups/MCK-*.html primary, assets/*.html fallback"

key-files:
  created:
    - workflows/mockup-export-figma.md
    - tests/phase-42/mockup-export-figma-workflow.test.mjs
  modified:
    - commands/sync.md

key-decisions:
  - "Strict y/yes-only check (^y(es)?$ regex) applied to export confirmation gate — consistent with handoff-create-prs.md VAL-03 pattern"
  - "Tool availability check (Step 2) degrades gracefully with claude-code#28718 message before reaching confirmation gate — prevents gate presenting for unavailable tool"
  - "Step 0 guard checks both status=connected AND fileUrl non-empty — both are required for export; separate error messages distinguish the two failure modes"

patterns-established:
  - "Export workflow: guard (Step 0) → find artifact (Step 1) → probe tool (Step 2) → confirm (Step 3) → execute (Step 4) → summary (Step 5)"
  - "All Figma write operations require confirmation gate before any MCP tool call"

requirements-completed: [FIG-04]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 42 Plan 04: Mockup Export to Figma Summary

**FIG-04 mockup-export-figma.md workflow with VAL-03 confirmation gate, generate_figma_design tool availability probe, and --export-figma dispatch in sync.md**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-19T05:22:42Z
- **Completed:** 2026-03-19T05:24:50Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `workflows/mockup-export-figma.md` implementing FIG-04 with 5-step pipeline: connection guard, mockup discovery, tool availability probe, VAL-03 confirmation gate, and export execution
- Confirmation gate uses strict `^y(es)?$` check — non-yes response produces "Export cancelled — no changes to Figma." with zero Figma writes
- Graceful degradation for claude-code#28718 (generate_figma_design unavailable) with clear workaround instructions (Claude.ai browser)
- Added `--export-figma` dispatch to `commands/sync.md` with updated argument-hint and usage text
- 13 structural tests pass GREEN covering all FIG-04 requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 test for FIG-04 workflow structure and confirmation gate** - `6c6b037` (test — RED state)
2. **Task 2: Create mockup-export-figma.md workflow and add --export-figma to sync.md** - `dd0d5d5` (feat — GREEN state)

## Files Created/Modified
- `workflows/mockup-export-figma.md` - FIG-04 5-step export workflow with VAL-03 confirmation gate and claude-code#28718 degraded mode
- `tests/phase-42/mockup-export-figma-workflow.test.mjs` - 13 structural assertions covering presence of figma:generate-design, loadConnections, fileUrl, y/n gate, strict y/yes check, cancellation path, degraded mode, mockup reference, and <purpose> block
- `commands/sync.md` - Added --export-figma dispatch to mockup-export-figma.md, updated argument-hint and usage text

## Decisions Made
- Strict `^y(es)?$` check matches the confirmation gate pattern from `handoff-create-prs.md` (Phase 40) for VAL-03 consistency across all write-back workflows
- Tool availability probe (Step 2) is placed before the confirmation gate (Step 3) — no point showing the gate if the tool cannot execute the write; prevents user confirmation from being ignored
- Step 0 guards both Figma `status === connected` and `fileUrl` non-empty with separate error messages — users get actionable feedback for each failure mode
- MCK-*.html is the primary search pattern for mockup files; assets/*.html is the fallback for non-standard setups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for this plan. Figma connection itself requires user OAuth setup, which is handled via /pde:connect figma (Phase 42 Plan 01).

## Next Phase Readiness
- Phase 42 Phase 04 completes the fourth and final FIG requirement (FIG-04)
- All four FIG-01 through FIG-04 requirements are now addressed across Plans 01-04
- Phase 42 is complete — all Figma integration workflows are in place

---
*Phase: 42-figma-integration*
*Completed: 2026-03-19*
