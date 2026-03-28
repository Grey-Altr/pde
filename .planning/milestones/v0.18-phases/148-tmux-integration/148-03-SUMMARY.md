---
phase: 148-tmux-integration
plan: "03"
subsystem: tmux-pane-scripts
tags: [tmux, multi-session, ansi-color, bash, session-filter]
dependency_graph:
  requires: [148-01, 148-02]
  provides: [TMX-02, TMX-03, TMX-04, TMX-05]
  affects: [bin/pane-agent-activity.sh, bin/pane-log-stream.sh, bin/pane-token-meter.sh, bin/monitor-dashboard.sh]
tech_stack:
  added: []
  patterns:
    - Single combined jq call per NDJSON line (perf optimization for multi-session event frequency)
    - ANSI 256-color palette (6-color, modulo wrap) matching dashboard SESSION_PALETTE
    - Filter file pattern: $TMPDIR/pde-tmux-filter.txt read on each event iteration
    - MULTI_NDJSON_PATH constant in monitor-dashboard.sh for routing panes 0, 4, 5
key_files:
  created: []
  modified:
    - bin/pane-agent-activity.sh
    - bin/pane-log-stream.sh
    - bin/pane-token-meter.sh
    - bin/monitor-dashboard.sh
decisions:
  - Preserved all existing case branches in pane-log-stream.sh — 6 branches (session_start, subagent_start, file_changed, phase_started, experiment.*, *) unchanged; prefix prepended to all
  - show_header() function in pane-token-meter.sh called both at startup and during each 5-event refresh so filter display stays current
  - MULTI_NDJSON_PATH set as shell-level constant (not function-arg) in monitor-dashboard.sh — both build_full_layout and build_minimal_layout can reference it as outer-scope var
metrics:
  duration: "10 minutes"
  completed: "2026-03-27T03:47:57Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 148 Plan 03: Pane Script Multi-Session Upgrade Summary

**One-liner:** Upgraded three tmux pane scripts and monitor-dashboard.sh to render multi-session output with 6-color ANSI tagging, [L]/[R] source labels, session filter support, and s/a key bindings.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Upgrade pane-agent-activity.sh with [L]/[R] tags | 64f9cc2 | bin/pane-agent-activity.sh |
| 2 | Upgrade pane-log-stream.sh and pane-token-meter.sh | 6cad898 | bin/pane-log-stream.sh, bin/pane-token-meter.sh |
| 3 | Update monitor-dashboard.sh with multi-session path and key bindings | eb2edc9 | bin/monitor-dashboard.sh |

## What Was Built

### pane-agent-activity.sh (TMX-02)
- Added `ansi_color()` function with 6-color 256-ANSI palette (indices 0-5: blue/green/violet/amber/rose/cyan)
- Single combined `jq` call extracts `event_type`, `ts`, `agent_type`, `_pde_session_source`, `_pde_color_index` in one pass
- Output format: `[source] [timestamp] ACTION  agent_type` in per-session color
- Example: `[L] [12:00:00] SPAWN  planner` in blue for session with color_index=0

### pane-log-stream.sh (TMX-03)
- Added `ansi_color()` function (same 6-color palette)
- Single combined `jq` call extracts all needed fields including `_pde_session_id` short form (last 4 chars of hex suffix)
- Color prefix `[sid4]` prepended to every event line using the session's assigned color
- All 6 original case branches preserved unchanged

### pane-token-meter.sh (TMX-04)
- Added `FILTER_FILE` constant pointing to `$TMPDIR/pde-tmux-filter.txt`
- Added `show_header()` function that displays `[ALL SESSIONS]` or `[session-id-prefix]` in header
- Filter logic reads filter file on each incoming event — skips events not matching when filtered
- All existing MODEL_INFO resolution, pricing, and cost calculation logic preserved

### monitor-dashboard.sh (TMX-05)
- Added `MULTI_NDJSON_PATH="${TMPDIR:-/tmp}/pde-multi-session.ndjson"` constant
- Panes 0 (agent activity), 4 (log stream), 5 (token meter) now receive `MULTI_NDJSON_PATH`
- Panes 1, 2, 3, 6, 7 continue using single-session `${ndjson}` path
- `tmux bind-key -n s` wires `tmux-cycle-session.cjs` for session cycling
- `tmux bind-key -n a` resets filter file to `all`

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- `tests/dispatcher/tmux-fanout.test.cjs`: 8 tests PASS
- `tests/dispatcher/tmux-cycle-session.test.cjs`: 7 tests PASS
- `coordinator-smoke.test.cjs` Test 7: pre-existing timeout (15s limit), unrelated to this plan's changes

## Known Stubs

None — all paths use real `$TMPDIR` values and real script references.

## Self-Check

Files created/modified:
- bin/pane-agent-activity.sh — FOUND
- bin/pane-log-stream.sh — FOUND
- bin/pane-token-meter.sh — FOUND
- bin/monitor-dashboard.sh — FOUND

Commits:
- 64f9cc2 — FOUND
- 6cad898 — FOUND
- eb2edc9 — FOUND

## Self-Check: PASSED
