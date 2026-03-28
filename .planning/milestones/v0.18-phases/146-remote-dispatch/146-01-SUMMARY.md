---
phase: 146-remote-dispatch
plan: 01
subsystem: dispatcher/routing
tags: [remote-dispatch, routing, managed-backend-stub, ssh, CJS]
dependency_graph:
  requires: []
  provides: [remote-managed.cjs, remote-router.cjs, remote-router.test.cjs]
  affects: [packages/dispatcher/lib/coordinator.cjs]
tech_stack:
  added: []
  patterns: [dependency-injection, async-routing-decision-tree, managed-backend-stub]
key_files:
  created:
    - packages/dispatcher/lib/remote-managed.cjs
    - packages/dispatcher/lib/remote-router.cjs
    - tests/dispatcher/remote-router.test.cjs
  modified: []
decisions:
  - "Managed backend stub returns { available: false } always in v0.18 — claude --remote is GitHub-connected web sessions, not programmatic dispatch"
  - "routeSession uses injectable _detectManaged parameter (not _deps object) for testability — consistent with orchestrator.cjs functional injection pattern"
  - "Interactive sessions (isAutonomous=false) short-circuit first before any config check — RMT-05 guarantee"
metrics:
  duration: "~1 minute"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 146 Plan 01: Remote Routing Layer Summary

**One-liner:** SSH-primary routing decision tree with injectable managed backend stub — interactive always local, autonomous routes to SSH or managed per config.

## What Was Built

Two production CJS modules and a test suite establishing the remote dispatch routing layer for Phase 146.

### remote-managed.cjs

`detectManagedBackend()` is a documented stub that always returns `{ available: false }` in v0.18. The JSDoc explains exactly why: `claude --remote` creates GitHub-connected web sessions that cannot stream NDJSON, are in research preview with active bugs (#38066, #38049, #37713), and have no confirmed CLAUDE.md propagation. Future probing logic is outlined in comments.

### remote-router.cjs

`routeSession({ isAutonomous, remoteConfig, _detectManaged })` implements a 5-rule decision tree:

1. `!isAutonomous` → `'local'` (RMT-05 — interactive always local)
2. `!remoteConfig || !remoteConfig.host` → `'local'` (no SSH target)
3. `preferred_backend === 'managed'` → probe, return `'managed'` if available, fall through otherwise
4. `remoteConfig.host` exists → `'ssh'`
5. Default → `'local'`

The `_detectManaged` parameter enables test injection without `vi.mock()` CJS hoisting issues (same pattern established in Phase 144/145).

### tests/dispatcher/remote-router.test.cjs

8 tests covering all routing branches:
- Interactive → local (RMT-05)
- No config / no host → local
- SSH config → ssh
- Managed preferred + available → managed (DI injection)
- Managed preferred + unavailable → ssh (fallback)
- Explicit ssh preferred_backend → ssh
- detectManagedBackend always returns unavailable (v0.18 invariant)

## Verification

```
npx vitest run tests/dispatcher/remote-router.test.cjs
→ 8 passed in 107ms
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed erroneous `require('vitest')` from test file**
- **Found during:** Task 2 first test run
- **Issue:** Test file initially included `const { describe, it, expect } = require('vitest')` — vitest cannot be imported via CJS `require()`, throws ERR_REQUIRE_ESM. Existing test files use vitest globals injected by the runner (globals: true in vitest config).
- **Fix:** Removed the require line; all tests use globals as injected by vitest.
- **Files modified:** tests/dispatcher/remote-router.test.cjs
- **Commit:** b8989b2 (included in task commit)

## Known Stubs

**remote-managed.cjs — detectManagedBackend**
- File: `packages/dispatcher/lib/remote-managed.cjs`
- The entire function is a stub returning `{ available: false }` permanently.
- This is **intentional** — `claude --remote` is deferred to post-v0.18 per STATE.md decision [Phase 146].
- Future plan (post-v0.18) will implement: `claude auth status --json` probe + GitHub connectivity check.
- Does not prevent plan goal from being achieved — the router's fallback-to-SSH path handles this correctly.

## Self-Check: PASSED

- `packages/dispatcher/lib/remote-managed.cjs` — FOUND
- `packages/dispatcher/lib/remote-router.cjs` — FOUND
- `tests/dispatcher/remote-router.test.cjs` — FOUND
- Task 1 commit `68c5565` — verified
- Task 2 commit `b8989b2` — verified
