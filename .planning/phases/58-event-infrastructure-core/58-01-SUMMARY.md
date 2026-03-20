---
phase: 58-event-infrastructure-core
plan: 01
subsystem: infra
tags: [event-bus, ndjson, eventemitter, session-id, observability, node-events, crypto]

# Dependency graph
requires: []
provides:
  - PdeEventBus class with setImmediate-deferred dispatch() and wildcard '*' emit
  - bus singleton for in-process event fan-out within a pde-tools.cjs invocation
  - generateSessionId() / getSessionId() for module-level session UUID management
  - safeAppendEvent(sessionId, envelope) for fail-silent NDJSON append to /tmp/pde-session-{uuid}.ndjson
  - monitoring.enabled and monitoring.session_id in VALID_CONFIG_KEYS
  - monitoring section in .planning/config.json with enabled=true and session_id=null
affects:
  - 58-02 (session-start subcommand calls setConfigValue for monitoring.session_id)
  - 58-03 (hooks emit-event.cjs and pde-tools event-emit use event-bus.cjs and the config keys)
  - 59-tmux-dashboard (dashboard reads NDJSON from /tmp/pde-session-*.ndjson)
  - 60-archiver (archiver reads NDJSON from /tmp/pde-session-*.ndjson)
  - 61-token-estimator (token estimator reads NDJSON from /tmp/pde-session-*.ndjson)
  - 62-semantic-events (semantic events write via event-bus.cjs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-process EventEmitter bus with setImmediate deferral for non-blocking dispatch"
    - "Session-scoped NDJSON filenames (/tmp/pde-session-{uuid}.ndjson) for concurrent isolation"
    - "Fail-silent safeAppendEvent: try/catch with empty catch — event log never crashes PDE"
    - "Lazy require pattern for event-bus.cjs in pde-tools.cjs (never top-level)"
    - "Wildcard '*' emit for NDJSON writer subscriber fan-out"

key-files:
  created:
    - bin/lib/event-bus.cjs
  modified:
    - bin/lib/config.cjs
    - .planning/config.json

key-decisions:
  - "Use appendFileSync in safeAppendEvent (not async appendFile) — pde-tools.cjs is short-lived, write must complete before process exits"
  - "setImmediate (not process.nextTick) for dispatch deferral — fires after I/O phase, correctly non-blocking"
  - "setMaxListeners(20) pre-set — supports 6 dashboard panes + log + cost + context without spurious MaxListeners warning"
  - "Empty catch block in safeAppendEvent — event log failure must never propagate to calling workflow"

patterns-established:
  - "Pattern: PdeEventBus.dispatch() builds envelope with all 5 required fields (schema_version, ts, event_type, session_id, extensions) and defers via setImmediate"
  - "Pattern: safeAppendEvent swallows all errors — event infrastructure is always best-effort"
  - "Pattern: monitoring config keys follow 'monitoring.key' dot-notation matching existing workflow.* pattern"

requirements-completed: [EVNT-01, EVNT-02, EVNT-05, EVNT-06]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 58 Plan 01: Event Infrastructure Core — NDJSON Event Bus Foundation Summary

**In-process EventEmitter bus with session-scoped NDJSON append (/tmp/pde-session-{uuid}.ndjson), setImmediate-deferred dispatch, and fail-silent safeAppendEvent — zero npm dependencies, all Node.js built-ins**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-20T07:03:13Z
- **Completed:** 2026-03-20T07:06:39Z
- **Tasks:** 2 of 2
- **Files modified:** 3

## Accomplishments

- Created `bin/lib/event-bus.cjs` — PdeEventBus class extending EventEmitter, bus singleton, generateSessionId/getSessionId, and safeAppendEvent with full NDJSON envelope schema (EVNT-01, EVNT-02, EVNT-05, EVNT-06)
- Expanded VALID_CONFIG_KEYS in config.cjs with `monitoring.enabled` and `monitoring.session_id` — config-set now accepts these keys without "unknown key" errors
- Added `monitoring: { enabled: true, session_id: null }` to .planning/config.json — establishes the config schema that session-start (Plan 02) will populate

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bin/lib/event-bus.cjs** - `12423ef` (feat)
2. **Task 2: Add monitoring config keys and initialize monitoring section** - `0bba5d3` (feat)

## Files Created/Modified

- `bin/lib/event-bus.cjs` — PdeEventBus class + bus singleton + generateSessionId + getSessionId + safeAppendEvent; no top-level side effects; safe for lazy-require in pde-tools.cjs case blocks
- `bin/lib/config.cjs` — VALID_CONFIG_KEYS expanded with monitoring.enabled and monitoring.session_id
- `.planning/config.json` — monitoring section added at root level with enabled=true and session_id=null

## Decisions Made

- **appendFileSync over appendFile in safeAppendEvent:** Short-lived pde-tools.cjs process — write must complete before process exits; async appendFile could be lost on fast exit. Research confirmed this pattern for hook handlers and pde-tools subcommands.
- **setImmediate over process.nextTick for dispatch deferral:** nextTick fires before I/O callbacks (not truly deferred); setImmediate fires in the check phase after I/O, ensuring calling operation fully completes first.
- **Empty catch in safeAppendEvent:** Event log failure must never crash a PDE workflow. No console.error, no rethrow — pure silent swallow by design.
- **No top-level require of event-bus.cjs in pde-tools.cjs:** If event-bus.cjs fails to load (syntax error, missing dep), it would crash all 40+ pde-tools commands. Lazy-require inside the event-emit case block only.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. All Node.js built-ins (events, crypto, fs, os, path) loaded without issues. Shell escaping of `!` in zsh required using a temp file for the verification test rather than inline node -e — not a code issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- event-bus.cjs is complete and stable; Plan 02 (session-start subcommand) can immediately call `setConfigValue(cwd, 'monitoring.session_id', uuid)` using the existing config.cjs API
- monitoring.session_id key is now recognized by config-set — session-start subcommand (Plan 02, Task 1) will write the UUID there
- NDJSON write path is ready; Plans 02 and 03 build the subcommands and hooks that call it

---
*Phase: 58-event-infrastructure-core*
*Completed: 2026-03-20*
