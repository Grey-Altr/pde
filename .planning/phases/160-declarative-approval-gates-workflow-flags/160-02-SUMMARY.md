---
phase: 160-declarative-approval-gates-workflow-flags
plan: 02
subsystem: workflows
tags: [webmcp, workflow-flags, approval-gates, pde-approval-gate]

# Dependency graph
requires:
  - phase: 160-declarative-approval-gates-workflow-flags
    provides: "160-01: pde_approval_gate MCP tool and gate state file infrastructure"
provides:
  - "--webmcp flag in wireframe.md with USE_WEBMCP parse step and WebMCP Context output section"
  - "--webmcp flag in mockup.md with USE_WEBMCP parse step and WebMCP Context output section"
  - "--webmcp flag in critique.md with USE_WEBMCP parse step and WebMCP Context output section"
  - "--webmcp flag in competitive.md with USE_WEBMCP parse step and WebMCP Context output section"
  - "Source-inspection test suite for workflow --webmcp flag presence (16 tests)"
affects:
  - 161-webmcp-competitor-tools
  - 162-webmcp-relay

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "--webmcp flag pattern: flags table row + early check list + parse step (USE_WEBMCP) + conditional WebMCP Context output section"
    - "WebMCP Context section: tool table, gate ID, approve/reject JSON examples, gate state file reference"
    - "Source-inspection test pattern: fs.readFileSync with path.resolve(__dirname, '../../../workflows/{name}.md')"

key-files:
  created:
    - "dashboard/lib/__tests__/workflow-flags.test.ts"
  modified:
    - "workflows/wireframe.md"
    - "workflows/mockup.md"
    - "workflows/critique.md"
    - "workflows/competitive.md"

key-decisions:
  - "WebMCP Context section is additive-only: appended after standard output summary when USE_WEBMCP=true, no behavior change when flag absent (per D-06)"
  - "Gate ID format established: {workflow}-{PHASE_NUMBER}-{YYYYMMDD}-{4_HEX} for traceability across all four workflows"
  - "Source-inspection tests used instead of runtime execution tests (vitest runs in node environment, no DOM/jsdom)"

patterns-established:
  - "WebMCP Context pattern: consistent tool table (pde_approval_gate, get_design_state, list_artifacts, get_project_info) + gate ID + JSON examples across all workflows"
  - "Flag insertion order: flag row goes after --use-stitch (or last existing flag), parse step goes after last existing parse step"

requirements-completed: [WFL-02, WFL-03, WFL-04, WFL-05]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 160 Plan 02: Workflow --webmcp Flag Summary

**--webmcp flag added to all four design workflows (wireframe, mockup, critique, competitive) with USE_WEBMCP parse step and conditional WebMCP Context section containing pde_approval_gate tool table and gate ID**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T21:49:53Z
- **Completed:** 2026-03-28T21:54:47Z
- **Tasks:** 2
- **Files modified:** 5 (4 workflows + 1 test file)

## Accomplishments
- Added `--webmcp` flag to all four design workflow commands (wireframe, mockup, critique, competitive) following the established `--use-stitch` pattern exactly
- Each workflow now parses `--webmcp` into `USE_WEBMCP` variable and conditionally appends a WebMCP Context section after standard output
- WebMCP Context section provides browser AI agents with: tool table (pde_approval_gate, get_design_state, list_artifacts, get_project_info), gate ID, and approve/reject JSON examples
- Created 16-test source-inspection suite covering all four workflows; all pass green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflow flags test scaffold + add --webmcp to wireframe.md and mockup.md** - `3886fa4` (test)
2. **Task 2: Add --webmcp flag to critique.md and competitive.md** - `c99ccd5` (feat)

## Files Created/Modified
- `dashboard/lib/__tests__/workflow-flags.test.ts` - Source-inspection tests for --webmcp flag in all four workflows (16 tests)
- `workflows/wireframe.md` - Added --webmcp flag row, USE_WEBMCP parse step (2h), WebMCP Context output section
- `workflows/mockup.md` - Added --webmcp flag row, USE_WEBMCP parse step (2f), WebMCP Context output section
- `workflows/critique.md` - Added --webmcp flag row, USE_WEBMCP parse step (2h), WebMCP Context output section
- `workflows/competitive.md` - Added --webmcp flag row, USE_WEBMCP parse step, WebMCP Context output section

## Decisions Made
- WebMCP Context section is additive-only: standard output unchanged when `--webmcp` not passed (per D-06 requirement)
- Gate IDs follow consistent format: `{workflow}-{PHASE_NUMBER}-{YYYYMMDD}-{4_HEX}` across all four workflows
- Source-inspection tests used (fs.readFileSync) following Phase 157 decision — vitest runs in node environment, no jsdom

## Deviations from Plan

None - plan executed exactly as written. TDD red-green pattern followed: test file created first (all 16 tests RED for workflows without --webmcp), then wireframe+mockup made green in Task 1, then critique+competitive made green in Task 2.

## Issues Encountered

Minor: Vitest verification command in plan runs from main project's dashboard (`cd .../Platform\ Development\ Engine/dashboard`) while this is a worktree execution. Resolved by copying updated workflow files to main project for test verification. Worktree files are the authoritative changes committed to git.

## Next Phase Readiness
- All four design workflows now produce WebMCP Context output when `--webmcp` is passed
- pde_approval_gate tool referenced in gate tables — requires phase 160-01 infrastructure (approval gate MCP tool) to be present at runtime
- Ready for phase 161 which may consume these WebMCP-enabled workflow outputs

---
*Phase: 160-declarative-approval-gates-workflow-flags*
*Completed: 2026-03-28*
