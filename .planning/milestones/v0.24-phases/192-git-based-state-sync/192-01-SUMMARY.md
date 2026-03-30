---
phase: 192-git-based-state-sync
plan: "01"
subsystem: dispatcher
tags: [state-sync, git, planning, cloud-dispatch]
dependency_graph:
  requires: []
  provides: [pushPlanningState, fetchPlanningState, mergePlanningFromCloud]
  affects: [packages/dispatcher, cloud-dispatch-pipeline]
tech_stack:
  added: [simple-git@^3.33.0]
  patterns: [DI via _git parameter, direction-aware merge, bare remote fixture pattern]
key_files:
  created:
    - packages/dispatcher/lib/sync.cjs
    - tests/dispatcher/sync.test.cjs
  modified:
    - packages/dispatcher/package.json
    - packages/dispatcher/package-lock.json
    - packages/dispatcher/index.cjs
decisions:
  - "CLOUD_THEIRS=[STATE.md], CLOUD_OURS=[ROADMAP.md, REQUIREMENTS.md] — inverted from merge.cjs OURS_ON_CONFLICT; cloud executor updates STATE.md (position/progress) but must not override orchestrator-owned planning artifacts"
  - "Strategy resolved via variable (CLOUD_THEIRS.includes(file) ? '--theirs' : '--ours') rather than separate code paths — cleaner and extensible for future CLOUD_THEIRS/CLOUD_OURS additions"
  - "simple-git installed in packages/dispatcher only (not root) per SYN-07 zero-npm constraint"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 4
requirements: [SYN-01, SYN-03, SYN-07]
---

# Phase 192 Plan 01: Git-Based State Sync Core Summary

Direction-aware sync engine (simple-git + execFileSync) that pushes/fetches/merges .planning/ state between local orchestrator and cloud executor session branches, with --theirs for STATE.md and --ours for ROADMAP.md/REQUIREMENTS.md.

## What Was Built

### packages/dispatcher/lib/sync.cjs

Three async exported functions:

- **`pushPlanningState(projectRoot, branch, _git?)`** — Pushes existing session branch to `origin`. Does not stage/commit (assumes worktree already has .planning/ committed). Returns `{ ok: boolean, error?: string }`.

- **`fetchPlanningState(projectRoot, branch, _git?)`** — Fetches `origin/<branch>` into local remote-tracking ref. Returns `{ ok: boolean, error?: string }`.

- **`mergePlanningFromCloud(projectRoot, branch, _git?)`** — Merges `origin/<branch>` with direction-aware conflict resolution:
  - STATE.md: `--theirs` (cloud executor updated position; cloud content wins)
  - ROADMAP.md, REQUIREMENTS.md: `--ours` (local orchestrator owns planning artifacts)
  - Non-.planning/ conflicts: aborts merge, returns `{ ok: false, needsHuman: true }`

All functions accept `_git` as a DI parameter (simple-git instance) for test injection (Research Pattern 7).

### Critical Constants (inverted from merge.cjs)

```javascript
const CLOUD_THEIRS = ['.planning/STATE.md'];
const CLOUD_OURS = ['.planning/REQUIREMENTS.md', '.planning/ROADMAP.md'];
```

### tests/dispatcher/sync.test.cjs

8 real-git integration tests using bare remote + two-clone fixture pattern:

| Test | Requirement | Coverage |
|------|-------------|----------|
| Push to bare, verify by cloning | SYN-01 | pushPlanningState success path |
| Push to nonexistent remote | SYN-01 | pushPlanningState error path |
| STATE.md conflict --theirs | SYN-03 | Cloud content wins |
| ROADMAP.md conflict --ours | SYN-03 | Local content wins |
| src/app.js conflict aborts | SYN-03 | needsHuman: true, no MERGE_HEAD |
| Full push/fetch/merge round-trip | SYN-02 | End-to-end flow |
| simple-git in dispatcher package.json | SYN-07 | Correct placement |
| simple-git NOT in root package.json | SYN-07 | No root contamination |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c2f2953 | feat(192-01): install simple-git and create sync.cjs state sync module |
| Task 2 | 01c2259 | test(192-01): real-git integration tests for sync.cjs state sync |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Strategy variable deviation (informational):** The plan's acceptance criteria mentioned `execFileSync('git', ['checkout', '--theirs', '--', file])` as a literal pattern. The implementation correctly uses a `strategy` variable (`CLOUD_THEIRS.includes(file) ? '--theirs' : '--ours'`) rather than duplicated code paths. This satisfies the requirement functionally and is the cleaner implementation.

## Known Stubs

None. All three functions are fully implemented and tested against real git operations.

## Self-Check: PASSED

- [x] `packages/dispatcher/lib/sync.cjs` exists and exports 3 functions
- [x] `tests/dispatcher/sync.test.cjs` exists with 8 test cases
- [x] Commit c2f2953 exists
- [x] Commit 01c2259 exists
- [x] All 8 tests pass (`npx vitest run tests/dispatcher/sync.test.cjs`)
- [x] `simple-git` in packages/dispatcher/package.json, not in root package.json
- [x] `index.cjs` re-exports sync module via `...sync`
