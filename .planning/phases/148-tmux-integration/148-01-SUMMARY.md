---
phase: 148-tmux-integration
plan: 01
subsystem: dispatcher
tags: [tmux, ndjson, fanout, aggregator, tdd]
dependency_graph:
  requires: [packages/dispatcher/lib/aggregator.cjs, packages/dispatcher/lib/registry.cjs]
  provides: [packages/dispatcher/lib/tmux-fanout.cjs]
  affects: [packages/dispatcher/lib/coordinator.cjs]
tech_stack:
  added: []
  patterns: [TDD red-green, EventEmitter subscription, NDJSON append, DI via opts constructor arg]
key_files:
  created:
    - packages/dispatcher/lib/tmux-fanout.cjs
    - tests/dispatcher/tmux-fanout.test.cjs
  modified:
    - packages/dispatcher/lib/coordinator.cjs
decisions:
  - sourceLabel() defaults to 'L' for undefined backend (unknown sessions are treated as local)
  - opts.fanoutPath constructor override used for test isolation instead of vi.mock('node:os')
  - TmuxFanout wiring placed before other deps assignments in constructor — deps.TmuxFanout injectable
metrics:
  duration: "4 minutes"
  completed: "2026-03-27T03:37:00Z"
  tasks: 2
  files_modified: 3
requirements: [TMX-01]
---

# Phase 148 Plan 01: TmuxFanout Module and Coordinator Wiring Summary

TmuxFanout class subscribes to aggregator 'event' emissions and appends enriched NDJSON lines to `/tmp/pde-multi-session.ndjson` with per-session color indices and source labels for tmux pane consumption.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TmuxFanout module and tests (TDD) | 7c27841 | packages/dispatcher/lib/tmux-fanout.cjs, tests/dispatcher/tmux-fanout.test.cjs |
| 2 | Wire TmuxFanout into coordinator lifecycle | 723ecf1 | packages/dispatcher/lib/coordinator.cjs |

## What Was Built

**TmuxFanout** (`packages/dispatcher/lib/tmux-fanout.cjs`):
- Exports `TmuxFanout` class, `FANOUT_PATH` (`/tmp/pde-multi-session.ndjson`), `FILTER_PATH` (`/tmp/pde-tmux-filter.txt`)
- `start()` truncates the fanout file and registers `aggregator.on('event', handler)`
- `stop()` calls `aggregator.off('event', handler)` — clean listener removal
- Each event is enriched with `_pde_session_id`, `_pde_session_source` (L/R), `_pde_color_index` (0-5 modulo)
- `sourceLabel()` maps `'local'` → `'L'`, all others (`'ssh'`, `'managed'`, undefined) → `'L'` (default local) or `'R'` for known remote backends
- Constructor accepts optional `opts.fanoutPath` override for test isolation
- All file operations wrapped in try/catch — never crash the coordinator

**Coordinator wiring** (`packages/dispatcher/lib/coordinator.cjs`):
- `const { TmuxFanout } = require('./tmux-fanout.cjs')` added at top
- Constructor instantiates `TmuxFanoutClass` (injectable via `deps.TmuxFanout`) and calls `start()`
- `shutdown()` calls `this._tmuxFanout.stop()` after `stopAll()`

## Test Results

- `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` — 8/8 tests pass
- `npx vitest run tests/dispatcher/` — 150/151 pass (1 pre-existing timeout unrelated to this plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed sourceLabel undefined default — returns 'L' not 'R'**
- **Found during:** Task 1 GREEN phase (Test 4 failed)
- **Issue:** Plan spec says "defaults to 'L' when registry.get(sessionId) returns undefined", but initial implementation of `sourceLabel(undefined)` fell through to the `else` branch returning `'R'`
- **Fix:** Added explicit `if (backend === undefined || backend === null) return 'L'` guard before the local/remote check
- **Files modified:** packages/dispatcher/lib/tmux-fanout.cjs
- **Commit:** 7c27841 (included in task commit)

### Pre-existing Issues (Out of Scope)

- `coordinator-smoke.test.cjs` Test 7 (`dispatchWave` multi-plan dispatch) times out at 15 seconds — verified pre-existing before this plan's changes by running with `git stash`. Root cause: `analyzeDag` SDK call or concurrency queue behavior hangs in this worktree environment. Logged to deferred-items for investigation.

## Known Stubs

None — all functionality is wired end-to-end.

## Self-Check: PASSED
