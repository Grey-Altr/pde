---
phase: 73-dashboard-integration
plan: 01
subsystem: infra
tags: [tmux, bash, dashboard, monitoring, suggestions]

# Dependency graph
requires:
  - phase: 72-suggestion-catalog
    provides: suggestion file written to /tmp/pde-suggestions-{sessionId}.md
  - phase: 58-tmux-monitoring
    provides: monitor-dashboard.sh with build_full_layout and build_minimal_layout
provides:
  - bin/pane-suggestions.sh — polling pane script for suggestion file display
  - Pane 7 (suggestions) wired into build_full_layout() via P6 split from P5
  - SUGG_PATH resolved from config.json monitoring.session_id
affects: [74-dashboard-integration, tmux-monitoring, idle-suggestions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pane polling loop: while true / cat file / sleep 3 for atomically-replaced files (not tail -F)"
    - "ANSI cursor positioning: printf '\\033[3;1H\\033[J' for clean pane redraws"
    - "Inline Node.js path resolution pattern reused from NDJSON_PATH block"

key-files:
  created:
    - bin/pane-suggestions.sh
  modified:
    - bin/monitor-dashboard.sh

key-decisions:
  - "Polling (sleep 3) not tail -F for suggestion file — file is atomically replaced via fs.writeFileSync"
  - "P6 split at 50% from P5 (token/cost pane) — right column gets third row for suggestions"
  - "build_minimal_layout() unchanged per DASH-04 constraint"

patterns-established:
  - "Pane content script: shebang + comment header + usage guard + header echo + while true poll loop"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 73 Plan 01: Dashboard Integration Summary

**Pane 7 (suggestions) added to tmux full layout — polling script reads /tmp/pde-suggestions-{sessionId}.md every 3 seconds with zero-state fallback**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T07:43:12Z
- **Completed:** 2026-03-21T07:44:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `bin/pane-suggestions.sh` with polling loop, zero-state message, and ANSI cursor positioning for clean redraws
- Added SUGG_PATH resolution block to `monitor-dashboard.sh` using inline Node.js reading config.json session_id
- Wired P6 (suggestions) into `build_full_layout()` as a 50% vertical split from P5 (token/cost)
- `build_minimal_layout()` left completely unchanged per DASH-04 requirement

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bin/pane-suggestions.sh polling script** - `8a0515d` (feat)
2. **Task 2: Wire Pane 7 into build_full_layout() with SUGG_PATH resolution** - `bcf8a0a` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `bin/pane-suggestions.sh` — new pane script; polls suggestion file every 3s, shows zero-state when absent
- `bin/monitor-dashboard.sh` — added SUGG_PATH resolution, P6 split, suggestions label, send-keys for pane-suggestions.sh; build_full_layout now accepts 3rd param

## Decisions Made

- Used polling (sleep 3) instead of `tail -F` — suggestion file is atomically replaced by `fs.writeFileSync`, so tail would miss replacements
- P6 split at 50% from P5 matching the layout pattern of other right-column splits
- SUGG_PATH fallback to `/tmp/pde-suggestions-unknown.md` mirrors the existing NDJSON_PATH fallback pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Pane 7 is wired and ready — suggestions will display automatically when the hook system writes the suggestion file
- Phase 73 Plan 02 can proceed (if applicable)

---
*Phase: 73-dashboard-integration*
*Completed: 2026-03-21*
