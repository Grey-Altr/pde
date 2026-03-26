---
phase: 144-local-cli-dispatch
plan: "03"
subsystem: dispatcher
tags: [coordinator, parallel-dispatch, lifecycle-orchestration, dependency-injection]
dependency_graph:
  requires: [144-01, 144-02, 143-01, 143-02]
  provides: [DispatchCoordinator, --parallel-flag, dispatch-subcommand]
  affects: [bin/pde-tools.cjs, packages/dispatcher/index.cjs]
tech_stack:
  added: []
  patterns:
    - Dependency injection via opts._deps for CJS-testable coordinator
    - Lock-then-register-then-release pattern for atomic duplicate prevention
    - Queue-backed session lifecycle with pluggable concurrency limit
key_files:
  created:
    - packages/dispatcher/lib/coordinator.cjs
    - tests/dispatcher/coordinator-smoke.test.cjs
  modified:
    - packages/dispatcher/index.cjs
    - bin/pde-tools.cjs
    - bin/lib/init.cjs
decisions:
  - "Dependency injection via opts._deps avoids CJS module binding problem — vi.mock() hoisting doesn't work with destructured CJS requires; DI is cleaner and production-safe"
  - "release lock before spawn — lock held only during atomic check+register; spawn is slow and should not hold the lock"
  - "FAILED.json written to worktree .planning/phases/ not project root — stays scoped to session for easier debugging"
metrics:
  duration_minutes: 70
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_modified: 5
---

# Phase 144 Plan 03: DispatchCoordinator and --parallel Wiring Summary

**One-liner:** DispatchCoordinator integrates queue, registry, spawn, worktree, merge, and aggregator into a full session lifecycle with lock-protected dispatch and wave parallelism, exposed via --parallel flag in pde-tools.cjs.

## What Was Built

### coordinator.cjs (packages/dispatcher/lib/)
Full session lifecycle orchestrator tying together all Phase 143 + 144 primitives:
- `dispatch(phase, plan)`: acquireLock → hasPhase check → generateSessionId → createWorktree → registry.register → releaseLock → aggregator.watch → queue.add
- `_runSession()`: spawnSession + PID update in registry
- `_handleExit()`: exit 0 → mergeSession → recalculateFromArtifacts → removeWorktree → deleteBranch → registry.remove; exit ≠0 → write FAILED.json → registry.update(failed) + preserve worktree; merge needsHuman → registry.update(merge_failed) + preserve worktree
- `dispatchWave(plans)`: Promise.allSettled over all dispatches
- `shutdown()`: kill all sessions + aggregator.stopAll
- `static resolvePluginDir()`: reads ~/.claude/plugins/installed_plugins.json with fallback to CLAUDE_PLUGIN_ROOT

### --parallel flag in pde-tools.cjs + init.cjs
- `init execute-phase 144 --parallel`: JSON output includes `"parallel": true`
- `init execute-phase 144` (no flag): `"parallel": false` — zero behavioral change
- New `dispatch` subcommand: `node pde-tools.cjs dispatch <phase> <plan> [--max-concurrent N]`

### packages/dispatcher/index.cjs updated
Re-exports all Phase 143 + Phase 144 modules: 18 named exports including DispatchCoordinator, Aggregator, ConcurrencyQueue, SessionRegistry, spawnSession, and all Phase 143 symbols.

### tests/dispatcher/coordinator-smoke.test.cjs
9 integration smoke tests validating full coordinator wiring:
1. Constructor wiring
2. dispatch creates worktree + registers session
3. Duplicate phase rejection
4. Exit 0: merge + recalculate + cleanup
5. Exit non-0: preserve worktree + FAILED.json
6. Merge failure (needsHuman): preserve + merge_failed status
7. dispatchWave: multiple plans registered
8. shutdown: kill all sessions + aggregator.stopAll
9. index.cjs re-exports all 15 expected symbols

## Test Results

Full dispatcher suite: **89/89 tests pass** (80 pre-existing + 9 new coordinator smoke tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CJS vi.mock() hoisting incompatible with destructured requires**
- **Found during:** Task 3 — coordinator smoke test implementation
- **Issue:** `coordinator.cjs` destructures all dependencies at module load time (`const { createWorktree } = require('./worktree.cjs')`). vitest v4's `vi.mock()` hoisting intercepts the module cache but the coordinator already captured the function reference before the spy could intercept it. Auto-mocking also failed to produce `vi.fn()` instances in CJS mode.
- **Fix:** Added `opts._deps` dependency injection to `DispatchCoordinator` constructor. Production code never passes `_deps`; tests inject vi.fn() stubs directly. All method bodies use `this._xxx` (injected or module-level fallback).
- **Files modified:** `packages/dispatcher/lib/coordinator.cjs`, `tests/dispatcher/coordinator-smoke.test.cjs`
- **Commit:** a318800

## Known Stubs

None — all coordinator methods are fully implemented.

## Self-Check: PASSED

- coordinator.cjs: FOUND at packages/dispatcher/lib/coordinator.cjs
- coordinator-smoke.test.cjs: FOUND at tests/dispatcher/coordinator-smoke.test.cjs
- 144-03-SUMMARY.md: FOUND at .planning/phases/144-local-cli-dispatch/144-03-SUMMARY.md
- Commit 4c4a767 (coordinator.cjs): VERIFIED
- Commit 306cf2d (--parallel wiring + index.cjs): VERIFIED
- Commit a318800 (smoke tests + DI): VERIFIED
- Full test suite: 89/89 PASS
