---
phase: 58-event-infrastructure-core
plan: 02
subsystem: infra
tags: [event-bus, ndjson, pde-tools, session-id, observability, subcommand, cli]

# Dependency graph
requires:
  - phase: 58-01
    provides: safeAppendEvent(sessionId, envelope) in event-bus.cjs and monitoring config keys in config.json
provides:
  - event-emit subcommand in pde-tools.cjs — external write path for hook handlers and workflow markdown files
  - session-start subcommand in pde-tools.cjs — generates UUID v4, persists to config.json monitoring.session_id
  - Session-scoped NDJSON write: each event-emit writes to /tmp/pde-session-{session_id}.ndjson
  - Lazy-require isolation: event-bus.cjs loaded only inside event-emit case block

affects:
  - 58-03 (emit-event.cjs hook handler calls node pde-tools.cjs event-emit and session-start)
  - 59-tmux-dashboard (reads /tmp/pde-session-{uuid}.ndjson written by event-emit)
  - 60-archiver (reads /tmp/pde-session-{uuid}.ndjson)
  - 61-token-estimator (reads /tmp/pde-session-{uuid}.ndjson)
  - 62-semantic-events (calls event-emit for semantic workflow events)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy require pattern for event-bus.cjs in pde-tools.cjs — never top-level, loaded only in event-emit case"
    - "configPath constructed with path.join(cwd, '.planning', 'config.json') — respects --cwd override for sandboxed subagents"
    - "Payload spread + extensions override: {...payload, extensions: payload.extensions || {}} ensures extensions always present"

key-files:
  created: []
  modified:
    - bin/pde-tools.cjs

key-decisions:
  - "configPath uses path.join(cwd, ...) not __dirname — ensures --cwd flag works correctly for sandboxed subagents"
  - "Lazy require('./lib/event-bus.cjs') inside event-emit case only — if module fails to load, only event-emit breaks, not 40+ other commands"
  - "session-start outer try/catch swallows write errors — session ID persistence failure must not crash anything"

patterns-established:
  - "Pattern: event-emit builds envelope inline (not via PdeEventBus.dispatch) — pde-tools.cjs is CLI, not in-process; safeAppendEvent is the correct direct write path"
  - "Pattern: session-start reads existing config.json with try/catch before writing — handles case where config.json does not yet exist"

requirements-completed: [EVNT-01, EVNT-02, EVNT-06]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 58 Plan 02: Event Infrastructure Core — pde-tools.cjs event-emit and session-start Subcommands Summary

**event-emit and session-start CLI subcommands in pde-tools.cjs — session-scoped NDJSON write path with UUID persistence to config.json, lazy-require isolation, and fail-silent malformed payload handling**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-20T07:10:04Z
- **Completed:** 2026-03-20T07:12:27Z
- **Tasks:** 1 of 1
- **Files modified:** 2

## Accomplishments

- Added `case 'session-start'` to pde-tools.cjs — generates UUID v4 via `crypto.randomUUID()`, persists to `.planning/config.json` at `monitoring.session_id`, outputs `{"session_id":"..."}` with `--raw` flag
- Added `case 'event-emit'` to pde-tools.cjs — lazy-requires event-bus.cjs, reads session_id from config.json, builds NDJSON envelope with schema_version '1.0', calls safeAppendEvent, silently handles malformed JSON payload
- Both case blocks inserted between tracking case and default: — the correct insertion point per plan specification

## Task Commits

Each task was committed atomically:

1. **Task 1: Add event-emit and session-start case blocks to bin/pde-tools.cjs** - `b2b02ba` (feat)

## Files Created/Modified

- `bin/pde-tools.cjs` — two new case blocks added: session-start (lines 744-760) and event-emit (lines 762-801); no other modifications; lazy require of event-bus.cjs inside event-emit case block only
- `.planning/config.json` — monitoring.session_id populated with UUID during test execution (was null, now has a live session UUID)

## Decisions Made

- **configPath via path.join(cwd, ...) not __dirname:** The `cwd` variable in pde-tools.cjs already resolves the --cwd flag, so using it ensures session-start works correctly when called by sandboxed subagents running outside project root.
- **Lazy require inside event-emit case block:** If event-bus.cjs has a syntax error or missing dependency at load time, only the event-emit command breaks — the other 40+ pde-tools commands remain functional. This was a planned pattern from Plan 01 research.
- **Outer try/catch around session-start write:** The `fs.writeFileSync` call is wrapped in a try/catch that swallows all errors, ensuring that config.json unavailability (e.g., read-only filesystem) never crashes the hook handler that calls session-start.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Inline `node -e` verification with `!==` operator failed in zsh due to `!` history expansion, resolved by writing verification script to a temp file (`/tmp/verify-ndjson.js`) — not a code issue, shell escaping only.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- event-emit and session-start subcommands are complete and verified; Plan 03 (emit-event.cjs hook handler) can immediately call `node pde-tools.cjs session-start` on SessionStart hook and `node pde-tools.cjs event-emit <type> <payload>` on all tool/agent hooks
- Session-scoped NDJSON files (/tmp/pde-session-{uuid}.ndjson) are being created correctly — Plans 59-62 can begin reading from them

---
*Phase: 58-event-infrastructure-core*
*Completed: 2026-03-20*
