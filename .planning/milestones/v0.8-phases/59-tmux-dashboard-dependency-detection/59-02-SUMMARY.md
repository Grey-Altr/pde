---
phase: 59-tmux-dashboard-dependency-detection
plan: 02
subsystem: infra
tags: [tmux, bash, ndjson, observability, dashboard, event-streaming, jq, ansi]

# Dependency graph
requires:
  - phase: 58-event-infrastructure-core
    provides: NDJSON event stream at /tmp/pde-session-{uuid}.ndjson, event envelope schema
  - phase: 59-01
    provides: bin/monitor-dashboard.sh which launches these pane scripts via tmux send-keys

provides:
  - bin/pane-agent-activity.sh — filters subagent_start/subagent_stop events; green SPAWN/yellow DONE display
  - bin/pane-pipeline-progress.sh — filters phase/wave/plan lifecycle events; hierarchical indented display
  - bin/pane-file-changes.sh — filters file_changed/tool_use events with file_path; CREATE/MODIFY/tool labels
  - bin/pane-log-stream.sh — displays all event types with color-coded severity categories

affects:
  - 59-03-validate-dashboard (validation script tests all 4 pane scripts with fixture NDJSON)
  - 62-semantic-events (pipeline progress pane ready to display phase_started/phase_complete/wave_started/wave_complete events)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tail -F (uppercase F) for self-healing NDJSON follow — survives file rotation and creation-after-start"
    - "jq -r for raw string extraction (not -C) + printf with explicit ANSI codes for reliable color in tmux panes"
    - "IFS= read -r for safe line reading from tail pipe, handling special characters in file paths"
    - "Event type case dispatch: each pane script handles only its relevant event types, ignores others"
    - "2>/dev/null on tail to suppress file-not-found noise before NDJSON exists"
    - "Waiting banner pattern: echo banner before tail -F so pane is never blank on startup"

key-files:
  created:
    - bin/pane-agent-activity.sh
    - bin/pane-pipeline-progress.sh
    - bin/pane-file-changes.sh
    - bin/pane-log-stream.sh
  modified: []

key-decisions:
  - "file_changed not tool_use: emit-event.cjs maps Write/Edit hooks to file_changed event type; pane-file-changes.sh handles both file_changed (primary) and tool_use (forward-compat) to match actual NDJSON output"
  - "pane-log-stream.sh handles file_changed/bash_called/tool_called explicitly in addition to tool_use catch pattern — prevents unknown-type gray styling for common high-frequency events"
  - "Pipeline progress pane is forward-only: phase_started/wave_started/plan_started events are not yet emitted (Phase 62 deferred); pane shows waiting banner until those events exist — this is correct behavior"

patterns-established:
  - "Pattern: pane script = shebang + NDJSON arg validation + waiting banner + tail -F | while read + case dispatch"
  - "Pattern: timestamp extraction via jq '.ts | split(\"T\")[1] | split(\".\")[0]' — gets HH:MM:SS from ISO timestamp"
  - "Pattern: color hierarchy — white-bold lifecycle, cyan agents, yellow/green start/done, gray high-freq, magenta pipeline"

requirements-completed: [TMUX-02, TMUX-03, TMUX-04, TMUX-05]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 59 Plan 02: tmux Dashboard Pane Scripts Summary

**Four NDJSON streaming pane scripts with ANSI color output: agent SPAWN/DONE tracking, hierarchical pipeline progress, file CREATE/MODIFY display, and full event log with severity coloring**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-20T18:12:05Z
- **Completed:** 2026-03-20T18:14:34Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- Created `bin/pane-agent-activity.sh` — tails NDJSON, green SPAWN for subagent_start, yellow DONE for subagent_stop with HH:MM:SS timestamps
- Created `bin/pane-pipeline-progress.sh` — hierarchically indented phase/wave/plan lifecycle events; forward-compatible with Phase 62 semantic events (shows waiting banner until those events are emitted)
- Created `bin/pane-file-changes.sh` — green CREATE for Write tool, yellow MODIFY for Edit tool, blue for other tools; handles `file_changed` (actual emitted type) and `tool_use` (forward-compat)
- Created `bin/pane-log-stream.sh` — displays all events with color-coded severity: white-bold lifecycle, cyan agents, gray tool events, magenta pipeline, gray catch-all for unknown types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pane-agent-activity.sh and pane-pipeline-progress.sh** - `bf64a66` (feat)
2. **Task 2: Create pane-file-changes.sh and pane-log-stream.sh** - `529c5ba` (feat, created during 59-03 as Rule 3 deviation, updated in place)

## Files Created/Modified

- `bin/pane-agent-activity.sh` — Agent spawn/complete event display; subagent_start (green SPAWN) + subagent_stop (yellow DONE)
- `bin/pane-pipeline-progress.sh` — Phase/wave/plan lifecycle display; cyan START events, green DONE events, hierarchical indentation
- `bin/pane-file-changes.sh` — File change display; handles file_changed + tool_use event types; CREATE/MODIFY/tool-name labels
- `bin/pane-log-stream.sh` — Full event log; handles all event types; color-coded by severity category

## Decisions Made

- **file_changed not tool_use for pane-file-changes.sh:** The plan interface spec listed `tool_use` as the event type, but `emit-event.cjs` (Phase 58) actually maps Write/Edit PostToolUse hooks to `file_changed` event type. Scripts handle both so they work with current NDJSON output and remain forward-compatible if the schema is ever unified.
- **Explicit handling of file_changed/bash_called/tool_called in pane-log-stream.sh:** Rather than letting these fall through to the gray catch-all `*` case, the log stream explicitly matches them with the same gray styling to document the expected high-frequency events clearly.
- **Pipeline progress pane is intentionally idle:** phase_started, wave_started, plan_started etc. are Phase 62 events not yet emitted. The "waiting for session events..." banner is correct idle state — not a bug.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tool_use vs actual emitted event type mismatch in pane-file-changes.sh**
- **Found during:** Task 2 (pane-file-changes.sh creation)
- **Issue:** Plan interface spec listed event_type `tool_use` for file events, but emit-event.cjs (Phase 58) maps Write/Edit hooks to `file_changed` — a `tool_use` case would never match any actual NDJSON line
- **Fix:** Added `file_changed|tool_use` case pattern — `file_changed` is primary (matches actual output), `tool_use` is forward-compat
- **Files modified:** `bin/pane-file-changes.sh`
- **Verification:** Functional test with fixture NDJSON `{"event_type":"file_changed","tool_name":"Write","file_path":"/tmp/test.txt"}` produces `[HH:MM:SS] CREATE /tmp/test.txt`
- **Committed in:** `529c5ba` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed tool_use vs actual event types in pane-log-stream.sh**
- **Found during:** Task 2 (pane-log-stream.sh creation)
- **Issue:** Plan showed only `tool_use` case in log stream, but actual emitted types are `file_changed`, `bash_called`, `tool_called` — these would fall through to gray catch-all but without explicit documentation
- **Fix:** Added `file_changed|bash_called|tool_called|tool_use` as explicit gray case to match all tool-level events correctly
- **Files modified:** `bin/pane-log-stream.sh`
- **Verification:** Functional test with `{"event_type":"file_changed"}` produces gray output; `{"event_type":"session_start"}` produces white-bold output
- **Committed in:** `529c5ba` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Both fixes required for correct behavior — without them, pane-file-changes.sh would display nothing and pane-log-stream.sh would inconsistently style tool events. No scope creep.

## Issues Encountered

- pane-file-changes.sh and pane-log-stream.sh existed in git from a prior plan (59-03 Rule 3 deviation) before this plan executed them. The files were updated in-place to incorporate the event type bug fixes. Working tree was clean after updates as the changes matched what was already committed.

## User Setup Required

None — no external service configuration required. Pane scripts are launched automatically by monitor-dashboard.sh via `tmux send-keys`.

## Next Phase Readiness

- All 4 NDJSON pane scripts are executable and pass bash -n syntax check
- Scripts produce correct colored, timestamped output when fed NDJSON lines (verified with fixture data)
- pane-agent-activity.sh ready to display live subagent events from Phase 58 hooks
- pane-file-changes.sh ready to display file_changed events from Phase 58 PostToolUse hooks
- pane-pipeline-progress.sh ready and waiting for Phase 62 semantic events
- pane-log-stream.sh ready to display all current + future event types
- Phase 59 Plan 03 (validate-dashboard.sh) can run validation against these 4 scripts

---
*Phase: 59-tmux-dashboard-dependency-detection*
*Completed: 2026-03-20*
