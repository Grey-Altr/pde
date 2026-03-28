---
phase: 148-tmux-integration
plan: 02
subsystem: tmux
tags: [tmux, dispatcher, session-cycling, cjs, filter-state]

requires:
  - phase: 148-tmux-integration plan 01
    provides: dispatcher.pids registry format and session ID conventions

provides:
  - bin/lib/tmux-cycle-session.cjs — Node script that reads dispatcher.pids and cycles the session filter file
  - tests/dispatcher/tmux-cycle-session.test.cjs — Unit tests for all 7 cycling behavior cases

affects: [148-tmux-integration, monitor-dashboard.sh, tmux key bindings]

tech-stack:
  added: []
  patterns:
    - "cycleSession uses injectable filterFile parameter for test isolation — same DI pattern as other dispatcher modules"
    - "Vitest globals pattern in CJS test files — no require('vitest'), globals provided by vitest.config.ts"

key-files:
  created:
    - bin/lib/tmux-cycle-session.cjs
    - tests/dispatcher/tmux-cycle-session.test.cjs
  modified: []

key-decisions:
  - "cycleSession accepts optional filterFile parameter for test isolation — avoids writing to real TMPDIR during tests"
  - "Sessions sorted alphabetically before cycling — deterministic order independent of Object.entries iteration order"
  - "Stale session IDs (not in running sessions) reset to all — avoids getting stuck on a gone session"

patterns-established:
  - "Filter file pattern: TMPDIR/pde-tmux-filter.txt — writable by Node, readable by shell scripts"

requirements-completed: [TMX-04, TMX-05]

duration: 3min
completed: 2026-03-27
---

# Phase 148 Plan 02: tmux-cycle-session Summary

**cycleSession Node script that reads dispatcher.pids running sessions and cycles a TMPDIR filter file through all->s1->s2->all for tmux `s`-key binding**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T03:32:50Z
- **Completed:** 2026-03-27T03:36:11Z
- **Tasks:** 1 (TDD: test commit + impl commit)
- **Files modified:** 2

## Accomplishments

- Implemented `cycleSession(pidsFile, filterFile)` that reads dispatcher.pids, filters running-only sessions, sorts them, and advances the filter one step (wrapping to "all" after the last)
- All 7 behavior cases covered: all->first, mid->next, last->all, no sessions, stale ID, non-running filtered, missing filter file
- Regression: full dispatcher test suite 149/150 passed (1 pre-existing timeout in coordinator-smoke.test.cjs)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing tests** - `cba75d9` (test)
2. **Task 1 (GREEN): implementation** - `3ec95db` (feat)

## Files Created/Modified

- `bin/lib/tmux-cycle-session.cjs` - cycleSession function + CLI entry point; exports { cycleSession, FILTER_FILE }
- `tests/dispatcher/tmux-cycle-session.test.cjs` - 7 vitest unit tests covering all cycling behavior cases

## Decisions Made

- `cycleSession` accepts an optional `filterFile` parameter for test isolation — avoids writing to real `$TMPDIR` during tests, consistent with DI pattern used throughout dispatcher modules
- Sessions sorted with `.sort()` for deterministic cycle order regardless of Object.entries iteration order
- Stale session IDs (current filter not in running sessions) reset to "all" — prevents infinite stuck state when a session exits

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed require('vitest') from test file**
- **Found during:** Task 1 RED phase (initial test run)
- **Issue:** Vitest cannot be imported via require() in CJS — "Vitest cannot be imported in a CommonJS module using require()"
- **Fix:** Removed `const { describe, it, expect, ... } = require('vitest')` — globals provided by vitest.config.ts globals:true setting, matching all existing dispatcher tests
- **Files modified:** tests/dispatcher/tmux-cycle-session.test.cjs
- **Verification:** Tests ran and failed with "Cannot find module" (correct RED state)
- **Committed in:** cba75d9 (test RED commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test setup)
**Impact on plan:** Fix required for tests to run at all. No scope creep.

## Issues Encountered

- Pre-existing timeout in `tests/dispatcher/coordinator-smoke.test.cjs` Test 7 (`dispatchWave dispatches multiple plans`) — confirmed pre-existing by reverting our changes and re-running. Out of scope.

## Next Phase Readiness

- `tmux-cycle-session.cjs` is ready to be wired into `monitor-dashboard.sh` key binding: `bind s run-shell "node .../tmux-cycle-session.cjs .planning/dispatcher.pids"`
- Filter file at `$TMPDIR/pde-tmux-filter.txt` is readable by pane scripts for session-scoped display filtering

---
*Phase: 148-tmux-integration*
*Completed: 2026-03-27*
