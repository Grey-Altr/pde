---
phase: 123-context-sync-engine
plan: "01"
subsystem: hooks
tags: [hooks, context-sync, posttooluse, idempotency, tdd]
dependency_graph:
  requires:
    - bin/lib/context-sync.cjs (emitAll, computeSourceHash — Phase 118/119)
    - hooks/hooks.json (PostToolUse registration)
    - hooks/emit-event.cjs (pattern reference)
    - hooks/idle-suggestions.cjs (session ID + cwd pattern reference)
  provides:
    - hooks/context-sync-hook.cjs (auto-regeneration on .planning/ writes)
    - hooks/hooks.json (updated with context-sync PostToolUse entry)
    - tests/phase-123/test-context-sync-hook.cjs (7 unit tests)
  affects:
    - All editor context files (AGENTS.md, .cursor/rules/, .cursorrules, GEMINI.md, Antigravity DESIGN.md)
tech_stack:
  added: []
  patterns:
    - PostToolUse hook with zero-stdout contract
    - Marker-based idempotency via os.tmpdir()
    - handleHookPayload(hookData, opts) dependency injection for testability
    - TDD: RED (test file) -> GREEN (implementation) -> commit each phase
key_files:
  created:
    - hooks/context-sync-hook.cjs
    - tests/phase-123/test-context-sync-hook.cjs
  modified:
    - hooks/hooks.json
decisions:
  - "[Phase 123]: context-sync-hook uses opts dependency injection (emitAllFn, computeHashFn, markerDir) so unit tests never touch real filesystem emitters"
  - "[Phase 123]: matcher Write|Edit (no Bash) because Bash tool_input lacks file_path — prevents wasted invocations on every Bash call"
  - "[Phase 123]: marker stored in os.tmpdir() with session-scoped filename for per-session idempotency without cross-session state pollution"
metrics:
  duration_seconds: 160
  completed_date: "2026-03-24T05:46:42Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  tests_written: 7
  tests_passing: 145
---

# Phase 123 Plan 01: Context Sync Hook Summary

**One-liner:** PostToolUse hook `context-sync-hook.cjs` auto-regenerates all editor context files when `.planning/` writes occur, hash-gated for idempotency via `os.tmpdir()` marker files.

## What Was Built

A new PostToolUse hook script (`hooks/context-sync-hook.cjs`) that wires existing `emitAll()` from `context-sync.cjs` into the Claude Code hook lifecycle. When any Write or Edit tool modifies a file under `.planning/`, the hook:

1. Extracts `tool_input.file_path` from the hook payload
2. Filters to `.planning/` paths only (exits 0 silently for all other files)
3. Reads session ID from `.planning/config.json`
4. Compares current `computeSourceHash()` against last-seen hash in `os.tmpdir()/pde-context-sync-{sessionId}.last-hash`
5. Calls `emitAll(cwd)` only when hash has changed
6. Writes new hash to marker file
7. Always exits 0 — failures are swallowed, never propagated

The hook exports `handleHookPayload(hookData, opts)` for dependency injection, allowing unit tests to inject stub `emitAllFn`, `computeHashFn`, and `markerDir` without touching real filesystem emitters.

`hooks.json` was updated with a second `PostToolUse` array entry for `Write|Edit -> context-sync-hook.cjs`. The existing `Write|Edit|Bash -> emit-event.cjs` entry is unchanged.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests | ea39b0d | tests/phase-123/test-context-sync-hook.cjs |
| 1 (GREEN) | Implement context-sync-hook.cjs | b619829 | hooks/context-sync-hook.cjs |
| 2 | Register hook in hooks.json | d20b685 | hooks/hooks.json |

## Verification

- `node --test tests/phase-123/test-context-sync-hook.cjs` — 7/7 pass
- `node -p "JSON.parse(...).hooks.PostToolUse.length"` — 2 (correct)
- Full regression suite (phases 118–123) — **145/145 pass, zero regressions**

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Additional Tests

Added a 7th test beyond the required 6: "path filtering accepts both unix and windows .planning/ separators" — validates that both `/.planning/` and `\.planning\` path formats trigger the hook. This is a correctness requirement for cross-platform support mentioned in the implementation spec.

## Self-Check

**Files created/modified:**
- `hooks/context-sync-hook.cjs` — FOUND
- `hooks/hooks.json` — MODIFIED (2 PostToolUse entries)
- `tests/phase-123/test-context-sync-hook.cjs` — FOUND

**Commits:**
- ea39b0d — RED phase tests
- b619829 — GREEN phase implementation
- d20b685 — hooks.json registration

## Self-Check: PASSED
