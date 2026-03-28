---
phase: 149-configuration-commands
plan: 01
subsystem: config
tags: [config, dispatch, tdd, guards]
dependency_graph:
  requires: []
  provides: [dispatch-config-keys, dispatch-enabled-guard, config-wiring-fix]
  affects: [bin/pde-tools.cjs, bin/lib/init.cjs, bin/lib/config.cjs]
tech_stack:
  added: []
  patterns: [source-inspection-tests, tdd-red-green, strict-equality-guard]
key_files:
  created:
    - tests/dispatcher/config-dispatch.test.cjs
  modified:
    - bin/lib/config.cjs
    - bin/pde-tools.cjs
    - bin/lib/init.cjs
decisions:
  - dispatch.enabled guard uses === false (strict equality) — absent config block defaults to enabled (CFG-05 graceful degradation)
  - Source inspection tests (readFileSync) used for pde-tools.cjs dispatch case and init.cjs — avoids process.exit() issues from output() and error() calls
  - config passed to DispatchCoordinator constructor as options.config — matches existing coordinator._remoteConfig consumption pattern at line 138
metrics:
  duration_minutes: 2
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 3
---

# Phase 149 Plan 01: Config Dispatch Keys and Wiring Summary

**One-liner:** 11 dispatch.* config keys registered in VALID_CONFIG_KEYS, critical config wiring gap fixed in pde-tools.cjs dispatch case, dispatch.enabled=false guards added at both entry points with strict equality semantics.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create config-dispatch test scaffold and extend VALID_CONFIG_KEYS | 835887c | tests/dispatcher/config-dispatch.test.cjs, bin/lib/config.cjs |
| 2 | Fix config wiring in dispatch case and add dispatch.enabled guards | 9de073f | bin/pde-tools.cjs, bin/lib/init.cjs |

## What Was Built

### Task 1: Config Keys + Test Scaffold

Added 11 dispatch.* keys to `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`:
- `dispatch.enabled` — enable/disable parallel dispatch
- `dispatch.max_local_sessions` — max concurrent local agent sessions
- `dispatch.max_remote_sessions` — max concurrent remote agent sessions
- `dispatch.remote.{host,username,identity_file,repo_path,plugin_dir,preferred_backend,env}` — remote SSH config
- `dispatch.routing.fallback_to_local` — routing fallback behavior

Created `tests/dispatcher/config-dispatch.test.cjs` with 20 tests covering:
- Tests 1-11: VALID_CONFIG_KEYS source inspection for all 11 keys
- Test 12: setConfigValue dot-notation writes nested dispatch values correctly
- Tests 13-17: pde-tools.cjs dispatch case source inspection (loadConfig, guard, config wiring, max_local_sessions, --max-concurrent)
- Tests 18-20: init.cjs guard source inspection (presence, isParallel gate, strict equality)

### Task 2: Config Wiring Fix + Guards

**pde-tools.cjs dispatch case** — three changes:
1. `const { loadConfig } = require('./lib/core.cjs')` added inside dispatch case (lazy require pattern)
2. `const config = loadConfig(cwd)` called before DispatchCoordinator creation
3. Guard: `if (config.dispatch && config.dispatch.enabled === false) error(...)` — loud error, not silent skip
4. `config.dispatch.max_local_sessions` used as fallback when `--max-concurrent` not specified (was hardcoded `3`)
5. `config` passed to `new DispatchCoordinator(cwd, { maxConcurrent, pluginDir, config })` — fixes silent remote routing breakage

**bin/lib/init.cjs** — one change:
- Guard inserted after `const config = loadConfig(cwd)`: `if (isParallel && config.dispatch && config.dispatch.enabled === false) error(...)`
- Gated on `isParallel` — does NOT affect non-parallel executions

## Verification Results

```
npx vitest run tests/dispatcher/config-dispatch.test.cjs
  Test Files  1 passed (1)
  Tests       20 passed (20)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all config keys functional, all guards wired.

## Self-Check: PASSED

- tests/dispatcher/config-dispatch.test.cjs: FOUND
- bin/lib/config.cjs (dispatch.enabled): FOUND
- bin/pde-tools.cjs (loadConfig in dispatch): FOUND
- bin/lib/init.cjs (dispatch.enabled guard): FOUND
- Commit 835887c: FOUND
- Commit 9de073f: FOUND
