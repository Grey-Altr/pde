---
phase: 60-session-archival
plan: 01
subsystem: infra
tags: [hooks, ndjson, cleanup, session, event-bus, nodejs]

# Dependency graph
requires:
  - phase: 58-event-infrastructure-core
    provides: NDJSON event bus (pde-session-*.ndjson), hooks/hooks.json structure, emit-event.cjs SessionStart pattern
provides:
  - session_start_ts persisted in config.json at every SessionStart (required by Plan 02 archiver for duration computation)
  - hooks/cleanup-old-sessions.cjs deletes NDJSON files older than 7 days at SessionStart
  - validate-archival.sh with HIST-01/02/03/04 requirement tests ready for Plan 02 to run green
affects:
  - 60-02 (archive-session.cjs reads session_start_ts added here; validate-archival.sh checks archive-session.cjs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SessionStart hook chain: emit-event.cjs first (creates session/NDJSON), cleanup second (deletes stale files) — order matters"
    - "cleanup-old-sessions.cjs uses os.tmpdir() not /tmp (macOS portability, established in Phase 58)"
    - "fs.statSync().mtimeMs for cross-platform file age check (BSD/GNU find behavior differs; Node.js stat is identical)"
    - "Hook scripts always process.exit(0) — cleanup failure must never affect Claude Code execution"
    - "validate-archival.sh uses fs.utimesSync to backdate fixture files for deterministic age-based cleanup tests"

key-files:
  created:
    - .planning/phases/60-session-archival/validate-archival.sh
    - hooks/cleanup-old-sessions.cjs
  modified:
    - bin/pde-tools.cjs
    - hooks/hooks.json

key-decisions:
  - "session_start_ts stored in config.json (not inferred from NDJSON first event) — config.json is authoritative session state; NDJSON session_start event may not be present if SessionStart hook fires before first write"
  - "cleanup-old-sessions.cjs registered after emit-event.cjs in SessionStart — emit-event.cjs creates session/NDJSON first so the current session file's mtime is always < 7 days"
  - "validate-archival.sh tests FILE-02 and HOOKS-02 for archive-session.cjs even though that file is created in Plan 02 — script exit 1 on these is expected and correct until Plan 02 runs"

patterns-established:
  - "Pattern: Hook cleanup scripts drain stdin with process.stdin.resume() then process.stdin.on('end') — matches emit-event.cjs stdin reading pattern"
  - "Pattern: validate-archival.sh temporarily overrides config.json session fields for fixture tests then restores original — safe test isolation without permanent side effects"

requirements-completed: [HIST-03, HIST-04]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 60 Plan 01: Session Archival Foundation Summary

**session_start_ts persisted to config.json at SessionStart, NDJSON 7-day cleanup hook registered, and validate-archival.sh with HIST-03/04 tests passing**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-20T18:43:11Z
- **Completed:** 2026-03-20T18:47:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `cfg.monitoring.session_start_ts = new Date().toISOString()` to pde-tools.cjs session-start case — enables archive-session.cjs (Plan 02) to compute session duration
- Created hooks/cleanup-old-sessions.cjs: deletes `pde-session-*.ndjson` files older than 7 days from `os.tmpdir()` at SessionStart; always exits 0
- Registered cleanup-old-sessions.cjs as second hook in hooks.json SessionStart array (after emit-event.cjs, which creates the session NDJSON first)
- Created validate-archival.sh with 8 tests covering all HIST requirements — 5/8 pass at plan completion (3 require archive-session.cjs from Plan 02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Validation script + session_start_ts in pde-tools.cjs** - `83c89db` (feat)
2. **Task 2: cleanup-old-sessions.cjs + hooks.json SessionStart registration** - `e5b4db4` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `.planning/phases/60-session-archival/validate-archival.sh` - 8-test validation script for HIST-01/02/03/04; uses Node.js inline for deterministic fixture testing
- `hooks/cleanup-old-sessions.cjs` - SessionStart hook: deletes pde-session-*.ndjson files older than 7 days from os.tmpdir()
- `bin/pde-tools.cjs` - Added `cfg.monitoring.session_start_ts` to session-start case (line 755)
- `hooks/hooks.json` - Added cleanup-old-sessions.cjs as second entry in SessionStart hooks array

## Decisions Made
- `session_start_ts` stored in config.json rather than derived from NDJSON: config.json is written synchronously at SessionStart (async: false), making it authoritative; NDJSON session_start event timing is less reliable
- cleanup-old-sessions.cjs runs after emit-event.cjs in SessionStart hooks: emit-event.cjs creates the session NDJSON first, ensuring current session file has a fresh mtime (never at risk of 7-day deletion)
- validate-archival.sh includes tests for archive-session.cjs existence and hooks.json SessionEnd registration even though archive-session.cjs is built in Plan 02 — validates the full requirement surface, exits 1 until Plan 02 is complete by design

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (archive-session.cjs + hooks.json SessionEnd registration) can now read `monitoring.session_start_ts` from config.json for duration computation
- validate-archival.sh is ready; Plan 02 should produce 8/8 PASS after adding archive-session.cjs
- hooks.json SessionEnd still has only emit-event.cjs — Plan 02 adds archive-session.cjs there

---
*Phase: 60-session-archival*
*Completed: 2026-03-20*
