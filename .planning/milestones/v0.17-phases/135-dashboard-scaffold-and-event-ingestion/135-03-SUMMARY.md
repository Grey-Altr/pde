---
phase: 135-dashboard-scaffold-and-event-ingestion
plan: "03"
subsystem: api
tags: [sse, polling, nextjs, upstash-redis, clerk, eventsource, react-hooks]

requires:
  - phase: 135-01
    provides: redis.ts singleton, wire-schema.ts WireEnvelope type, session-status.ts, proxy.ts Clerk middleware

provides:
  - SSE streaming endpoint /api/events with 15s heartbeat, Clerk auth, 2s Redis poll loop
  - Polling fallback endpoint /api/poll with cursor-based ZRANGEBYSCORE, Clerk auth
  - useEventStream React hook with SSE-to-polling fallback, connectionStatus, 200-event rolling buffer

affects:
  - 135-04 (session detail page that uses useEventStream hook)
  - 135-05 (session list page may reference connectionStatus)

tech-stack:
  added: []
  patterns:
    - "SSE ReadableStream with setInterval heartbeat and 2s Redis poller inside stream"
    - "zrange with byScore:true and withScores:true for cursor-based sorted set pagination"
    - "useEventStream hook: SSE primary, 30s missed-heartbeat fallback to 3s polling, retry SSE after 10 polls"
    - "Vitest mocking of @clerk/nextjs/server auth() and @/lib/redis for Route Handler unit tests"

key-files:
  created:
    - dashboard/app/api/events/route.ts
    - dashboard/app/api/poll/route.ts
    - dashboard/hooks/use-event-stream.ts
    - dashboard/lib/__tests__/poll.test.ts
  modified: []

key-decisions:
  - "Redis key namespace uses 'default' as user segment (single-user dashboard; Clerk userId available at request time but 'default' is consistent)"
  - "zrange with byScore:true+withScores:true instead of deprecated zrangebyscore — Upstash SDK v1.37 uses unified zrange command"
  - "SSE error fallback triggers after 2 consecutive onerror events, not immediately, to tolerate transient network blips"
  - "Events prepended to buffer (newest-first) for display; MAX_EVENTS=200 prevents unbounded memory growth"

patterns-established:
  - "Pattern: SSE Route Handler with heartbeat + Redis poller — see dashboard/app/api/events/route.ts"
  - "Pattern: cursor-based poll endpoint with zrange byScore — see dashboard/app/api/poll/route.ts"
  - "Pattern: useEventStream hook with SSE/polling duality — see dashboard/hooks/use-event-stream.ts"

requirements-completed: [DSH-02]

duration: 12min
completed: "2026-03-25"
---

# Phase 135 Plan 03: Event Delivery Layer Summary

**SSE streaming endpoint with 15s heartbeat + 2s Redis poll, cursor-based polling fallback, and useEventStream hook that auto-switches from EventSource to 3s polling on 30s missed heartbeat**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-25T09:18:32Z
- **Completed:** 2026-03-25T09:20:58Z
- **Tasks:** 2
- **Files modified:** 4 created, 0 modified

## Accomplishments

- SSE endpoint (`/api/events`) streams `pde-event` named events with Redis-backed 2s poll loop, 15s heartbeat comments, Clerk JWT auth, and `maxDuration=300` for Fluid Compute
- Polling fallback endpoint (`/api/poll`) returns cursor-paginated event pages using `zrange byScore`, Clerk-protected
- `useEventStream` hook manages SSE/polling state machine: connects via EventSource, falls back to 3s polling on 30s missed heartbeat, retries SSE every 10th poll cycle, exposes `connectionStatus` for UI badges
- 5 unit tests for poll endpoint (401 unauth, 400 missing session, valid events+cursor, cursor filtering, empty result) — all pass

## Task Commits

1. **Task 1: SSE endpoint, polling endpoint, poll tests** - `5c14705` (feat)
2. **Task 2: useEventStream client hook** - `eaeb250` (feat)

## Files Created/Modified

- `dashboard/app/api/events/route.ts` - SSE streaming endpoint with heartbeat, Redis poll loop, Clerk auth
- `dashboard/app/api/poll/route.ts` - Polling fallback with zrange cursor query, Clerk auth
- `dashboard/hooks/use-event-stream.ts` - Client hook: SSE primary, polling fallback, connectionStatus
- `dashboard/lib/__tests__/poll.test.ts` - 5 unit tests for poll Route Handler

## Decisions Made

- Used `zrange` with `{ byScore: true, withScores: true }` instead of `zrangebyscore` — Upstash SDK v1.37 unifies these into `zrange` with options; `withScores: true` returns interleaved `[member, score, ...]` pairs
- Redis key namespace uses `'default'` as user segment (consistent with ingest endpoint pattern; single-user dashboard)
- SSE error fallback after 2 consecutive `onerror` events rather than immediately — tolerates transient network blips while still switching to polling reliably

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `--grep` flag is removed in vitest 4.x — used file path argument `lib/__tests__/poll.test.ts` instead. Plan's verify command `npx vitest run --grep poll` does not work with this version. Tests pass when run with file path.

## Next Phase Readiness

- `/api/events` and `/api/poll` are live and build-verified — session detail page (Plan 04) can import `useEventStream` directly
- `connectionStatus` exposed for Plan 04/05 UI badge wiring
- No blockers

## Self-Check: PASSED

- dashboard/app/api/events/route.ts: FOUND
- dashboard/app/api/poll/route.ts: FOUND
- dashboard/hooks/use-event-stream.ts: FOUND
- dashboard/lib/__tests__/poll.test.ts: FOUND
- Commit 5c14705 (Task 1): FOUND
- Commit eaeb250 (Task 2): FOUND

---
*Phase: 135-dashboard-scaffold-and-event-ingestion*
*Completed: 2026-03-25*
