---
phase: 60-session-archival
plan: 02
subsystem: infra
tags: [hooks, ndjson, session-archival, event-bus, nodejs, markdown]

# Dependency graph
requires:
  - phase: 60-session-archival (plan 01)
    provides: session_start_ts in config.json, validate-archival.sh, cleanup-old-sessions.cjs, hooks.json SessionStart chain
  - phase: 58-event-infrastructure-core
    provides: NDJSON event bus (pde-session-*.ndjson), hooks/emit-event.cjs, pde-tools.cjs event-emit
provides:
  - hooks/archive-session.cjs: SessionEnd hook that reads NDJSON, aggregates metrics, writes .planning/logs/{ISO-ts}-{session-id}.md
  - .planning/logs/ directory created on first SessionEnd with structured markdown summaries
  - hooks.json SessionEnd now chains emit-event.cjs (writes session_end to NDJSON) then archive-session.cjs (reads and summarizes)
affects:
  - 61-context-window (reads .planning/logs/ for session history context)
  - 62-workflow-events (will add phase/plan events to NDJSON; archive-session.cjs Phase/Plan Progress section will be populated)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SessionEnd hook chain: emit-event.cjs first (writes session_end to NDJSON), archive-session.cjs second (reads NDJSON) — both async: false"
    - "NDJSON aggregation: fs.readFileSync + JSON.parse per line with try/catch skip on corrupt lines"
    - "Git commit counting via spawnSync('git', ['log', '--since=sessionStartTs', '--oneline']) with timeout:3000 and try/catch default 0"
    - "ISO timestamp filename: new Date().toISOString().replace(/:/g, '-').replace(/\\..+$/, '') + '-' + sessionId + '.md'"
    - "Outer try/catch wrapping entire main logic body — hook must never throw unhandled"
    - "os.tmpdir() for NDJSON path (macOS returns /var/folders/..., not /tmp)"

key-files:
  created:
    - hooks/archive-session.cjs
  modified:
    - hooks/hooks.json

key-decisions:
  - "aggregateNdjson as named exported function — validate-archival.sh grep checks for 'aggregateNdjson' token to confirm correct structure"
  - "session_end event counted via eventCount++ on all parsed lines — archiver reads whatever is in NDJSON; session_end written by emit-event.cjs which runs first per hook order"
  - "ndjsonMissing flag in aggregateNdjson return: drives different Notes section in markdown — 'NDJSON file not found' vs '*Raw NDJSON: path*'"
  - "Outer try/catch wraps entire stdin 'end' handler body — ensures process.exit(0) even if writeSummary throws on unexpected fs errors"

patterns-established:
  - "Pattern: Phase/Plan Progress section is placeholder text until Phase 62 emits semantic workflow events to NDJSON"
  - "Pattern: .planning/logs/ is created on first SessionEnd via mkdirSync({ recursive: true }) — no prior setup needed"

requirements-completed: [HIST-01, HIST-02, HIST-04]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 60 Plan 02: Session Archival — Archive-session.cjs Summary

**SessionEnd archiver reading NDJSON from os.tmpdir(), aggregating 5 metrics, and writing ISO-timestamped markdown summaries to .planning/logs/ — validate-archival.sh 8/8 PASS**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T18:48:14Z
- **Completed:** 2026-03-20T18:51:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created hooks/archive-session.cjs: reads session NDJSON, aggregates event count/agent count/files changed, counts git commits via `git log --since`, computes duration from config.json session_start_ts, writes structured markdown to .planning/logs/
- Registered archive-session.cjs as second hook in hooks.json SessionEnd array — emit-event.cjs runs first (writes session_end to NDJSON), archiver runs second (reads complete NDJSON)
- validate-archival.sh: 8/8 PASS (all HIST-01 through HIST-04 requirements verified)

## Task Commits

Each task was committed atomically:

1. **Task 1: archive-session.cjs NDJSON aggregation and markdown generation** - `ae9cceb` (feat)
2. **Task 2: hooks.json SessionEnd registration + validation** - `8132811` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `hooks/archive-session.cjs` - SessionEnd hook: reads pde-session-{id}.ndjson, aggregates metrics, counts git commits, writes .planning/logs/{ts}-{id}.md
- `hooks/hooks.json` - Added archive-session.cjs as second SessionEnd hook entry (after emit-event.cjs)

## Decisions Made
- aggregateNdjson named as top-level function (not inline) — validate-archival.sh FILE-02 check greps for `aggregateNdjson` token
- sessionEndTs captured as `new Date().toISOString()` at hook execution time (not from NDJSON) — more reliable, avoids depending on session_end event being in NDJSON before archiver reads
- Outer try/catch wraps entire stdin 'end' handler body in addition to per-operation error handling — belt-and-suspenders for hook correctness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 60 is complete: every PDE SessionEnd now produces a markdown summary in .planning/logs/ with duration, event count, agents spawned, files changed, and commits made
- .planning/logs/ directory will be created automatically on first real SessionEnd (no manual setup needed)
- Phase 62 (EVNT-04) can populate the "Phase / Plan Progress" section in archive-session.cjs by adding phase_start/complete events to NDJSON

---
*Phase: 60-session-archival*
*Completed: 2026-03-20*
