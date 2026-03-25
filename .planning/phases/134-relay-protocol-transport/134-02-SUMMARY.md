---
phase: 134-relay-protocol-transport
plan: "02"
subsystem: relay
tags: [relay, file-tailing, circuit-breaker, batch-queue, http-transport, rly-01, rly-02, rly-03]
dependency_graph:
  requires: [134-01]
  provides: [bin/lib/relay.cjs]
  affects: [134-03, 134-04]
tech_stack:
  added: []
  patterns:
    - Byte-offset cursor file tailing with inode/size stat checks (no npm deps)
    - 3-state circuit breaker (CLOSED/OPEN/HALF_OPEN) without opossum
    - Time+count batch queue with ring-buffer drop-oldest semantics
    - node:https zero-dep HTTP POST with keep-alive socket draining
    - Wire envelope wrapping via createEnvelope + WireEnvelopeSchema.safeParse before transmission
key_files:
  created:
    - bin/lib/relay.cjs
    - tests/phase-134/test-relay-tail.cjs
    - tests/phase-134/test-relay-circuit.cjs
    - tests/phase-134/test-relay-batch.cjs
  modified: []
decisions:
  - "Remove require('vitest') from CJS test files — vitest v4 globals:true injects describe/it/expect/vi globally; no require() needed (same deviation as plan 01)"
  - "Use node:path.join inside startRelay (not top-level) to avoid path being required at module load when relay is imported for tests"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-25"
  tasks_completed: 1
  files_created: 4
  files_modified: 0
---

# Phase 134 Plan 02: Core Relay Module Summary

**One-liner:** Byte-offset file tailing with time+count batch queue, 3-state circuit breaker, and zero-dep HTTPS POST transport, with wire envelope wrapping and zod validation on the transmission path.

## What Was Built

### bin/lib/relay.cjs

Complete relay module with all components wired together:

**TailCursor** — polls a single NDJSON file using `fs.statSync` + `fs.readSync` with a byte-offset cursor. Handles:
- File not created yet (catches ENOENT, waits silently)
- Truncation detection (stat.size < position → reset to 0)
- Rotation/inode change detection (stat.ino !== lastIno → reset to 0)
- Partial-line buffering via `remainder` accumulator

**BatchQueue** — accumulates events, flushes on count threshold or time interval:
- `push()` drops oldest when `maxBufferSize` exceeded (ring-buffer, prefers recency)
- `start()` sets time-based flush timer
- `stop()` clears timer and flushes remaining events
- `_flush()` swallows `onFlush` errors (circuit breaker handles retry logic)

**CircuitBreaker** — 3-state protection against cascading HTTP failures:
- CLOSED: all attempts allowed
- OPEN: attempts blocked; `canAttempt()` transitions to HALF_OPEN after `cooldownMs`
- HALF_OPEN: one probe attempt; `recordSuccess()` → CLOSED, `recordFailure()` → OPEN

**postEvents** — zero-dep HTTP POST using `node:https` (or `node:http` for http:// URLs):
- Sets `Content-Type: application/json`, `Authorization: Bearer {token}`, `Content-Length`
- Always drains response body via `res.resume()` to release socket to keep-alive pool
- `timeout: 10000` socket inactivity timeout; `req.on('timeout')` destroys socket on hang

**startRelay** — wires all components:
1. Creates CircuitBreaker, BatchQueue (with circuit-breaker-guarded `onFlush`), TailCursor
2. `onLine` callback: `JSON.parse` → `createEnvelope(sessionId, pdeEvent)` → `WireEnvelopeSchema.safeParse(envelope)` → queue if valid, drop if invalid (RLY-02)
3. Starts TailCursor and BatchQueue
4. Returns `{ stop() }` handle; stores in module-level `_activeRelay`

**stopRelay** — stops `_activeRelay` if set, clears reference.

### Test Files (14 tests, all GREEN)

| File | Tests |
|------|-------|
| test-relay-tail.cjs | 5 TailCursor tests (read lines, byte offset, missing file, truncation, stop) |
| test-relay-circuit.cjs | 5 CircuitBreaker tests (CLOSED start, OPEN threshold, HALF_OPEN cooldown, success, failure in HALF_OPEN) |
| test-relay-batch.cjs | 4 BatchQueue tests (count flush, timer flush, stop flush, buffer cap) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed `require('vitest')` from CJS test files**
- **Found during:** GREEN phase — all 3 test files failed with "Vitest cannot be imported in a CommonJS module using require()"
- **Issue:** vitest v4 does not support `require('vitest')` in CJS. With `globals: true` in vitest.config.ts, test globals (`describe`, `it`, `expect`, `vi`) are injected automatically — no require needed.
- **Fix:** Replaced `require('vitest')` destructures with a comment explaining globals injection
- **Files modified:** tests/phase-134/test-relay-tail.cjs, tests/phase-134/test-relay-circuit.cjs, tests/phase-134/test-relay-batch.cjs
- **Note:** Same deviation documented in plan 01 SUMMARY — consistent pattern for this project

## Known Stubs

None — relay.cjs is fully functional with real implementations for all exported symbols.

## Verification Results

```
npx vitest run tests/phase-134/test-relay-tail.cjs tests/phase-134/test-relay-circuit.cjs tests/phase-134/test-relay-batch.cjs
Test Files: 3 passed (3)
Tests:      14 passed (14)
```

```
node -e "const r = require('./bin/lib/relay.cjs'); console.log(Object.keys(r))"
[ 'TailCursor', 'BatchQueue', 'CircuitBreaker', 'postEvents', 'startRelay', 'stopRelay' ]
```

```
grep -c "createEnvelope" bin/lib/relay.cjs  → 5 (import + usages)
grep -c "safeParse" bin/lib/relay.cjs       → 2 (validation call + comment)
```

## Commits

| Hash | Message |
|------|---------|
| 23e5055 | test(134-02): add failing tests for TailCursor, CircuitBreaker, BatchQueue |
| 5ebde02 | feat(134-02): implement relay module — TailCursor, BatchQueue, CircuitBreaker, postEvents |

## Self-Check: PASSED
