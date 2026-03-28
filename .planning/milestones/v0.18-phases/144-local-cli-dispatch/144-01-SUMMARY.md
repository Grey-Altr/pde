---
phase: 144-local-cli-dispatch
plan: 01
subsystem: dispatcher
tags: [spawn, registry, child-process, session-tracking, tdd]
dependency_graph:
  requires: []
  provides: [spawnSession, SessionRegistry]
  affects: [packages/dispatcher/lib/queue.cjs, packages/dispatcher/lib/aggregator.cjs]
tech_stack:
  added: []
  patterns: [TDD red-green, atomic temp+rename, vi.spyOn CJS mocking]
key_files:
  created:
    - packages/dispatcher/lib/spawn.cjs
    - packages/dispatcher/lib/registry.cjs
    - tests/dispatcher/spawn.test.cjs
    - tests/dispatcher/registry.test.cjs
  modified: []
decisions:
  - Use childProcess.spawn (not destructured) so vi.spyOn can intercept in CJS test environment
  - Use vi.spyOn(childProcess, 'spawn') instead of vi.mock — CJS modules cache references at require time so mocking the module factory doesn't intercept already-loaded references
metrics:
  duration_minutes: 14
  completed_date: "2026-03-26"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
  tests_added: 21
requirements: [DSP-01, DSP-02, DSP-03, DSP-07, DSP-09]
---

# Phase 144 Plan 01: Spawn + Registry Foundation Summary

**One-liner:** CJS subprocess launcher (`spawnSession`) and crash-recoverable session registry (`SessionRegistry`) using atomic temp+rename JSON persistence, with 21 vitest tests passing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement spawn.cjs — subprocess launch with NDJSON streaming | 8f5b980 | packages/dispatcher/lib/spawn.cjs, tests/dispatcher/spawn.test.cjs |
| 2 | Implement registry.cjs — crash-recoverable session tracking | 53e4d7a | packages/dispatcher/lib/registry.cjs, tests/dispatcher/registry.test.cjs |

## What Was Built

### spawn.cjs (97 lines)

`spawnSession(opts)` launches a `claude --print` subprocess in a worktree directory with:
- `CLAUDECODE` deleted from env (prevents "cannot be launched inside session" error — verified live Issue #6295)
- `PDE_SESSION_ID`, `PDE_PHASE`, `PDE_PLAN`, `PDE_SESSION_START` set on child env
- Args: `--print --bare --output-format stream-json --verbose --dangerously-skip-permissions --plugin-dir <pluginDir> --append-system-prompt <autonomous prompt> <natural-language-prompt>`
- `stdio: ['ignore', 'pipe', 'pipe']` — stdin is never piped (hanging bug fix)
- `readline.createInterface` for line-by-line NDJSON parsing from stdout
- Stderr surfaced as `{ type: 'system', subtype: 'stderr', message }` events
- `child.on('close')` calls `onExit(sessionId, exitCode ?? 1)` — null exitCode defaults to 1

### registry.cjs (187 lines)

`SessionRegistry` class manages session lifecycle:
- In-memory `Map` as source of truth
- `_flush()` writes atomically: `writeFileSync(tmpFile)` then `renameSync(tmp, target)` — POSIX atomic
- `loadFromDisk()` rebuilds Map on restart; probes each PID with `process.kill(pid, 0)` → marks dead as `orphaned`
- `hasPhase(n)` prevents duplicate phase assignment (checks `status === 'running'`)
- `activeCount()` for concurrency slot management
- JSON format: `{ sessions: { [sessionId]: { pid, phase, plan, worktreePath, branch, status, startedAt } } }`

## Test Coverage

- spawn.test.cjs: 9 tests — pid/kill return, env (CLAUDECODE deleted, PDE_* set), args flags, stdio, onLine NDJSON, stderr events, onExit null default, onExit non-zero
- registry.test.cjs: 12 tests — constructor, register flush, update merge, remove, get/getAll, hasPhase, activeCount, loadFromDisk stale PID detection, missing file graceful, atomic rename spy, JSON format shape

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used vi.spyOn instead of vi.mock for CJS child_process mocking**
- **Found during:** Task 1 GREEN implementation
- **Issue:** `vi.mock('node:child_process')` with factory returns a mock module object, but `spawn.cjs` had already cached `const { spawn } = require(...)` at module load time — the spy never intercepted calls
- **Fix:** Changed spawn.cjs to use `childProcess.spawn(...)` (not destructured), and test uses `vi.spyOn(childProcess, 'spawn')` which patches the live object reference that the module holds
- **Files modified:** packages/dispatcher/lib/spawn.cjs, tests/dispatcher/spawn.test.cjs
- **Commit:** 8f5b980

**2. [Rule 1 - Bug] Removed require('vitest') from CJS test files**
- **Found during:** Task 1 RED phase
- **Issue:** CJS test files cannot `require('vitest')` — vitest globals are injected by the test runner (vitest.config.ts has `globals: true`); `require` throws "Vitest cannot be imported in a CommonJS module using require()"
- **Fix:** Removed all `require('vitest')` lines; use `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` as globals (consistent with existing test files in the project)
- **Files modified:** tests/dispatcher/spawn.test.cjs
- **Commit:** 8f5b980

## Known Stubs

None — both modules are fully implemented and wired.

## Success Criteria Verification

- spawn.cjs exports `spawnSession` with correct env handling (`CLAUDECODE` deleted), `stdio: ['ignore','pipe','pipe']`, and NDJSON line parsing — PASS
- registry.cjs exports `SessionRegistry` with crash-safe JSON persistence (`renameSync`), stale PID detection (`loadFromDisk`), and duplicate phase prevention (`hasPhase`) — PASS
- All 21 tests pass in both test files — PASS
- Zero npm dependencies added — PASS

## Self-Check: PASSED

Files verified:
- FOUND: packages/dispatcher/lib/spawn.cjs
- FOUND: packages/dispatcher/lib/registry.cjs
- FOUND: tests/dispatcher/spawn.test.cjs
- FOUND: tests/dispatcher/registry.test.cjs

Commits verified:
- FOUND: 8f5b980 (feat(144-01): implement spawnSession)
- FOUND: 53e4d7a (feat(144-01): implement SessionRegistry)
