---
phase: 70-hook-integration-and-delivery-architecture
plan: 01
subsystem: infra
tags: [hooks, claude-code, ndjson, event-bus, idle-suggestions]

# Dependency graph
requires:
  - phase: 69-monitoring-and-observability
    provides: NDJSON event bus (pde-session-{sessionId}.ndjson), session ID in config.json, emit-event.cjs stdin pattern
provides:
  - Notification/idle_prompt hook registered in hooks.json with async: true
  - idle-suggestions.cjs handler with zero stdout, NDJSON event gating, marker-based idempotency
affects:
  - 71-suggestion-content-engine
  - 70-02

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-stdout hook handlers — all output to /tmp/ only, never to .planning/"
    - "Event gating via NDJSON tail read — read last N lines, find last meaningful event, compare ts to marker file"
    - "Marker file pattern — /tmp/pde-suggestions-{sessionId}.last-event-ts stores last processed event timestamp"

key-files:
  created:
    - hooks/idle-suggestions.cjs
  modified:
    - hooks/hooks.json

key-decisions:
  - "async: true on Notification hook — synchronous notification hooks block Claude Code notification delivery pipeline"
  - "Gate on ts field equality (not sequence number) — timestamps from NDJSON events are stable unique identifiers per event"
  - "MEANINGFUL_EVENTS = phase_started | phase_complete | plan_started — wave events excluded as too granular for suggestion triggers"
  - "Placeholder content for Phase 70 — actual suggestion generation deferred to Phase 71 suggestion content engine"

patterns-established:
  - "Zero-stdout contract: hook handlers must never write to stdout; Claude Code displays hook stdout to user"
  - "Marker file idempotency: /tmp/pde-suggestions-{sessionId}.last-event-ts prevents duplicate suggestion writes on repeated idle_prompt fires"

requirements-completed: [DLVR-01, DLVR-02, DLVR-03, DLVR-04]

# Metrics
duration: 1min
completed: 2026-03-21
---

# Phase 70 Plan 01: Hook Integration and Delivery Architecture Summary

**Notification/idle_prompt hook registered with async event gating — writes /tmp/pde-suggestions-{sessionId}.md only when a new phase_started, phase_complete, or plan_started event has fired**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-21T05:45:05Z
- **Completed:** 2026-03-21T05:46:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Registered Notification/idle_prompt hook entry in hooks.json with async: true and correct ${CLAUDE_PLUGIN_ROOT} variable expansion
- Created idle-suggestions.cjs with zero stdout, NDJSON tail-read event gating, and marker-file idempotency
- All code paths exit 0; handler silently no-ops when no NDJSON file exists, no meaningful events found, or event already processed

## Task Commits

Each task was committed atomically:

1. **Task 1: Register Notification/idle_prompt hook in hooks.json** - `face76e` (feat)
2. **Task 2: Create idle-suggestions.cjs handler with event gating and zero stdout** - `43106be` (feat)

## Files Created/Modified
- `hooks/hooks.json` - Added Notification block with idle_prompt matcher, async: true, pointing to idle-suggestions.cjs
- `hooks/idle-suggestions.cjs` - Zero-stdout hook handler (85 LOC): reads NDJSON tail, gates on MEANINGFUL_EVENTS, writes /tmp/ suggestion and marker files

## Decisions Made
- async: true on Notification hook — synchronous notification hooks block Claude Code notification delivery pipeline
- Gate on ts field equality (not sequence number) — timestamps from NDJSON events are stable unique identifiers per event
- MEANINGFUL_EVENTS set to phase_started | phase_complete | plan_started — wave events excluded as too granular for suggestion triggers
- Placeholder content written for Phase 70 — actual suggestion generation content deferred to Phase 71 suggestion content engine

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Delivery contract established: hooks.json routes idle_prompt to idle-suggestions.cjs, which gates on NDJSON events and writes to /tmp/
- Phase 71 can implement actual suggestion content generation by replacing the placeholder writeFileSync block in idle-suggestions.cjs
- Gate logic and marker file pattern are in place — Phase 71 only needs to change what gets written to the suggestion file

## Self-Check: PASSED

- FOUND: hooks/idle-suggestions.cjs
- FOUND: hooks/hooks.json (with Notification block)
- FOUND: 70-01-SUMMARY.md
- FOUND commit face76e: feat(70-01): register Notification/idle_prompt hook in hooks.json
- FOUND commit 43106be: feat(70-01): create idle-suggestions.cjs hook handler with event gating

---
*Phase: 70-hook-integration-and-delivery-architecture*
*Completed: 2026-03-21*
