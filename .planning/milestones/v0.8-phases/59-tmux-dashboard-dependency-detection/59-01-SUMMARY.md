---
phase: 59-tmux-dashboard-dependency-detection
plan: 01
subsystem: infra
tags: [tmux, bash, dashboard, monitoring, dependency-detection]

# Dependency graph
requires:
  - phase: 58-event-infrastructure-core
    provides: NDJSON event stream at os.tmpdir()/pde-session-{uuid}.ndjson, monitoring.session_id in .planning/config.json
provides:
  - /pde:monitor slash command (commands/monitor.md)
  - Monitor workflow with --kill flag (workflows/monitor.md)
  - bin/monitor-dashboard.sh — tmux session manager with deps detection, adaptive layout, nested tmux handling
affects: [59-02, 59-03, phase-61-token-estimation, phase-62-semantic-events]

# Tech tracking
tech-stack:
  added: [tmux, bash session scripting]
  patterns: [command-v dependency detection, consent-gated auto-install, stty-size adaptive layout, pane-id capture pattern]

key-files:
  created:
    - commands/monitor.md
    - workflows/monitor.md
    - bin/monitor-dashboard.sh
  modified: []

key-decisions:
  - "build_full_layout() and build_minimal_layout() defined as bash functions before the layout selection block — bash requires function definition before invocation"
  - "jq check is soft warning only (not blocking) — dashboard can still tail NDJSON without jq, pane scripts degrade to raw output"
  - "NDJSON path resolved via node -e at dashboard launch time — reads monitoring.session_id from .planning/config.json; tail -F self-heals if file does not exist yet"
  - "Pane scripts referenced by path but not created in this plan — Plans 02 and 03 provide them; monitor-dashboard.sh wires them in"

patterns-established:
  - "command -v pattern: use command -v not which for dependency detection — command -v is a bash builtin, portable and reliable"
  - "Pane ID capture: always capture pane ID with -dPF '#{pane_id}' immediately after split-window; use ID not index in all subsequent -t flags"
  - "Adaptive layout: stty size outside tmux for terminal dimensions; MIN_COLS=120/MIN_ROWS=30 threshold for full vs minimal layout"
  - "Nested tmux: $TMUX env var presence triggers switch-client instead of attach-session"

requirements-completed: [DEPS-01, DEPS-02, DEPS-03, TMUX-01, TMUX-08, TMUX-09, TMUX-10]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 59 Plan 01: Monitor Command and Dashboard Session Manager Summary

**bash-only tmux session manager with platform-aware dependency detection, consent-gated auto-install, 6-pane adaptive layout, and nested tmux handling via /pde:monitor command**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T18:07:19Z
- **Completed:** 2026-03-20T18:09:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `/pde:monitor` slash command following project command pattern (Read/Bash/AskUserQuestion tools)
- Created monitor workflow with `--kill` flag handling that calls `bin/monitor-dashboard.sh`
- Created `bin/monitor-dashboard.sh` (216 lines, executable) handling all 7 requirements: DEPS-01/02/03, TMUX-01/08/09/10
- Script satisfies plan verification: `bash -n` clean, 8 `select-pane -T` calls (6 full + 2 minimal), all acceptance criteria pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /pde:monitor command and workflow** - `a6b4fd9` (feat)
2. **Task 2: Create bin/monitor-dashboard.sh** - `56b71ac` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `commands/monitor.md` — /pde:monitor slash command with Bash + AskUserQuestion tools
- `workflows/monitor.md` — monitor workflow with --kill handling, documents all TMUX/DEPS behaviors
- `bin/monitor-dashboard.sh` — main tmux session creation script: deps detection, adaptive layout, nested tmux handling, remain-on-exit

## Decisions Made
- `build_full_layout()` and `build_minimal_layout()` defined as bash functions before the layout selection block — bash requires function definition before invocation; placing functions after the session creation options block ensures all session state is set before layout is chosen
- jq check is a soft warning (not blocking exit) — the dashboard can still launch with limited functionality; pane scripts will handle the degraded case individually
- NDJSON path resolved at launch via `node -e` reading `monitoring.session_id` from `.planning/config.json` — consistent with Phase 58 session ID pattern; tail -F self-heals if file does not exist yet
- Pane scripts (pane-agent-activity.sh, etc.) referenced by path in the layout functions but not created in this plan — Plans 02 and 03 will provide them; the session manager is the correct owner of pane wiring

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `bin/monitor-dashboard.sh` creates the named tmux session and wires pane script invocations — Plans 02 and 03 can now create the individual pane scripts that will be called
- Pane scripts must be placed at the paths referenced in `build_full_layout()` and `build_minimal_layout()` or the panes will show "command not found" (remain-on-exit keeps them visible)
- Sandbox/tmux compatibility noted in STATE.md as a blocker — empirical verification recommended before claiming TMUX-01 fully proven end-to-end

---
*Phase: 59-tmux-dashboard-dependency-detection*
*Completed: 2026-03-20*
