---
phase: 144-local-cli-dispatch
plan: 02
subsystem: dispatcher
tags: [concurrency-queue, ndjson, aggregator, event-emitter, tail-cursor, cjs, tdd, vitest]

# Dependency graph
requires:
  - phase: 143-session-isolation
    provides: TailCursor from bin/lib/relay.cjs — used by aggregator for NDJSON polling
provides:
  - ConcurrencyQueue class in packages/dispatcher/lib/queue.cjs
  - Aggregator class (extends EventEmitter) in packages/dispatcher/lib/aggregator.cjs
affects:
  - 144-03 (coordinator will use ConcurrencyQueue to gate session spawning)
  - phase-147 (dashboard SSE subscribes to Aggregator 'event' emissions)
  - phase-148 (tmux pane integration subscribes to Aggregator 'event' emissions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Slot-based drain cycle: _active counter + _pending array + .finally() for guaranteed slot release"
    - "Dependency injection for TailCursor constructor — Aggregator accepts optional TailCursorClass arg for test isolation"
    - "Module-level static array (MockTailCursor.instances) for tracking DI mock lifecycle in CJS vitest"

key-files:
  created:
    - packages/dispatcher/lib/queue.cjs
    - packages/dispatcher/lib/aggregator.cjs
    - tests/dispatcher/queue.test.cjs
    - tests/dispatcher/aggregator.test.cjs
  modified: []

key-decisions:
  - "DI pattern for TailCursor in Aggregator constructor — avoids vi.mock() CJS hoisting issues while keeping production default (require('../../../bin/lib/relay.cjs'))"
  - "vi.mock() CJS static property access is unreliable in vitest 4.x — factory exports (functions/arrays attached to class) do not transfer through the require() boundary; DI solves this cleanly"
  - "Microtask yield (await Promise.resolve()) required after awaiting add() result — .finally() decrement runs in the next microtask after .then(resolve, reject)"

patterns-established:
  - "Pattern 1: Promise-based slot queue — new Promise wrapping run() closure; .finally() always decrements and drains"
  - "Pattern 2: TailCursor DI — Aggregator(TailCursorClass?) pattern for production default + test injection"

requirements-completed: [DSP-06, DSP-08]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 144 Plan 02: Concurrency Queue and NDJSON Aggregator Summary

**Zero-dependency slot-based ConcurrencyQueue and TailCursor-backed NDJSON Aggregator with 16 tests passing, ready for coordinator wiring in plan 03**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-26T21:28:04Z
- **Completed:** 2026-03-26T21:36:15Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 4

## Accomplishments

- ConcurrencyQueue limits concurrent tasks to configurable max (default 3), returns Promises per task, releases slots via `.finally()` on both success and failure, supports `setMax()` for runtime changes
- Aggregator extends EventEmitter, watches per-session NDJSON files via TailCursor, emits tagged `'event'` events, supports idempotent watch, clean unwatch and stopAll shutdown
- TDD approach with RED/GREEN commits — 8 tests for queue, 8 tests for aggregator, 16 total passing
- Dependency injection pattern adopted for TailCursor to work around vitest 4.x CJS mock hoisting limitations

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for ConcurrencyQueue** - `525dacc` (test)
2. **Task 1 GREEN: Implement ConcurrencyQueue** - `b657ab5` (feat)
3. **Task 2 RED: Failing tests for Aggregator** - `1e5fbc9` (test)
4. **Task 2 GREEN: Implement Aggregator** - `01a8136` (feat)

_Note: TDD tasks committed as separate RED/GREEN pairs_

## Files Created/Modified

- `packages/dispatcher/lib/queue.cjs` — ConcurrencyQueue class: slot-based concurrency limiter, zero dependencies
- `packages/dispatcher/lib/aggregator.cjs` — Aggregator class: EventEmitter + TailCursor per-session multiplexer
- `tests/dispatcher/queue.test.cjs` — 8 tests: concurrency limits, sequential execution, Promise resolve/reject, getters, setMax, failure-resilience
- `tests/dispatcher/aggregator.test.cjs` — 8 tests: EventEmitter inheritance, watch/unwatch lifecycle, TailCursor path, start(500), idempotency, event emission, invalid JSON skip, stopAll

## Decisions Made

- **DI for TailCursor:** `Aggregator(TailCursorClass?)` — production uses `require('../../../bin/lib/relay.cjs').TailCursor` as default, tests inject `MockTailCursor`. This avoids `vi.mock()` CJS hoisting issues in vitest 4.x where static properties set inside factory functions are not accessible via `require()`.
- **Microtask yield pattern:** Tests that check `activeCount === 0` after `await promise` need `await Promise.resolve()` to let `.finally()` run before asserting — documented in comments.
- **No `vi.mock()` for relay.cjs:** vitest 4.x factory-returned values don't survive CJS module boundary for property access (static arrays, functions). DI is the correct pattern here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added DI constructor arg to Aggregator for test isolation**
- **Found during:** Task 2 (Aggregator tests)
- **Issue:** `vi.mock()` CJS factory with static properties (`MockTailCursor._instances`) was not accessible through vitest's `require()` boundary — the mock returned the class but static properties were lost. Three attempts failed.
- **Fix:** Added optional `TailCursorClass` constructor parameter to `Aggregator`; tests inject `MockTailCursor` directly. Production code continues to use `TailCursor` from relay.cjs as default.
- **Files modified:** `packages/dispatcher/lib/aggregator.cjs`, `tests/dispatcher/aggregator.test.cjs`
- **Verification:** All 8 aggregator tests pass; production `new Aggregator()` still uses real TailCursor
- **Committed in:** `01a8136` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test approach)
**Impact on plan:** DI is a strictly better design — no change to production behavior, improved testability. The Aggregator's `require('../../../bin/lib/relay.cjs')` path is preserved for production.

## Issues Encountered

- vitest 4.x CJS `vi.mock()` with factory: static properties set on exported class inside factory don't transfer through the `require()` boundary. Resolved via DI constructor arg pattern.
- Microtask timing: `activeCount` and test assertions after `await promise` require an extra `await Promise.resolve()` for `.finally()` to complete its decrement.

## Known Stubs

None — both modules are fully wired to real or injected TailCursor.

## Next Phase Readiness

- ConcurrencyQueue ready for use by plan 03 coordinator to gate concurrent session spawning
- Aggregator ready for dashboard SSE (plan 147) and tmux (plan 148) subscription wiring
- No blockers

---
*Phase: 144-local-cli-dispatch*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: packages/dispatcher/lib/queue.cjs
- FOUND: packages/dispatcher/lib/aggregator.cjs
- FOUND: tests/dispatcher/queue.test.cjs
- FOUND: tests/dispatcher/aggregator.test.cjs
- FOUND commit: 525dacc (test: failing queue tests)
- FOUND commit: b657ab5 (feat: ConcurrencyQueue)
- FOUND commit: 1e5fbc9 (test: failing aggregator tests)
- FOUND commit: 01a8136 (feat: Aggregator)
