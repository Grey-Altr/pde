---
phase: 73-dashboard-integration
plan: 02
subsystem: infra
tags: [tmux, bash, dashboard, monitoring, suggestions, cli, testing]

# Dependency graph
requires:
  - phase: 73-01
    provides: bin/pane-suggestions.sh and Pane 7 wired into build_full_layout()
  - phase: 72-suggestion-catalog
    provides: suggestion file written to /tmp/pde-suggestions-{sessionId}.md
provides:
  - bin/pde-tools.cjs suggestions subcommand — reads /tmp suggestion file, prints to stdout
  - commands/suggestions.md — /pde:suggestions command entry point
  - workflows/monitor.md — updated with 7-pane layout documentation and pane table
  - hooks/tests/verify-phase-73.cjs — automated verification for DASH-01 through DASH-06
affects: [74-dashboard-integration, idle-suggestions, tmux-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Node os.tmpdir() for cross-platform /tmp path resolution in pde-tools.cjs subcommands"
    - "execFileSync (not execSync) in test runners — avoids shell injection per project security conventions"

key-files:
  created:
    - commands/suggestions.md
    - hooks/tests/verify-phase-73.cjs
  modified:
    - bin/pde-tools.cjs
    - workflows/monitor.md

key-decisions:
  - "suggestions subcommand uses process.stdout.write (not console.log) for clean output piping"
  - "Zero-state message matches pane-suggestions.sh text exactly for consistent UX across CLI and tmux pane"
  - "Test file uses execFileSync (not execSync) per project security conventions"

patterns-established:
  - "pde-tools.cjs subcommand pattern: read session_id from config.json, resolve /tmp/{prefix}-{sessionId}.md, output to process.stdout"

requirements-completed: [DASH-05, DASH-06]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 73 Plan 02: Dashboard Integration Summary

**`/pde:suggestions` CLI command added to pde-tools.cjs, monitor.md updated with 7-pane layout docs, and verify-phase-73.cjs covering all DASH-01 through DASH-06 requirements**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-21T07:50:00Z
- **Completed:** 2026-03-21T07:55:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `case 'suggestions'` to pde-tools.cjs — reads session_id from config.json, resolves /tmp/pde-suggestions-{sessionId}.md, outputs content or zero-state message
- Created `commands/suggestions.md` providing the `/pde:suggestions` command definition
- Updated `workflows/monitor.md` with 7-pane layout table (P0-P6), Pane 7 zero-state documentation, and minimal layout note
- Created `hooks/tests/verify-phase-73.cjs` with 8 tests covering DASH-01 through DASH-06 — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add suggestions subcommand to pde-tools.cjs and create command file** - `ed4ec06` (feat)
2. **Task 2: Update monitor.md docs and create verify-phase-73.cjs test file** - `4a5d0df` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `bin/pde-tools.cjs` — added `const os = require('os')`, `case 'suggestions'` reading /tmp file, usage comment entry
- `commands/suggestions.md` — new /pde:suggestions command definition with Bash invocation pattern
- `workflows/monitor.md` — updated description, adaptive layout note (7-pane), added pane layout table and zero-state docs
- `hooks/tests/verify-phase-73.cjs` — 8 automated tests for DASH-01 through DASH-06 using execFileSync

## Decisions Made

- Used `process.stdout.write` instead of `console.log` in the suggestions subcommand — avoids trailing newline inconsistency and matches explicit output control pattern used elsewhere in pde-tools.cjs
- Zero-state message text matches `pane-suggestions.sh` exactly: "Waiting for PDE to start a phase. Suggestions will appear when a phase completes." — consistent experience across CLI and tmux pane
- Test file uses `execFileSync` (not `execSync`) per project security conventions established in verify-phase-72.cjs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All DASH-01 through DASH-06 requirements verified passing via `node hooks/tests/verify-phase-73.cjs`
- Phase 73 is complete — idle-time suggestion system fully wired: hook writes file, pane displays it, CLI exposes it, docs describe it
- Running `node bin/pde-tools.cjs suggestions` works from any terminal context

---
*Phase: 73-dashboard-integration*
*Completed: 2026-03-21*
