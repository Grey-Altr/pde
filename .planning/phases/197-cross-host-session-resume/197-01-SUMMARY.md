---
phase: 197-cross-host-session-resume
plan: "01"
subsystem: dispatcher
tags: [session-persist, cross-host, jsonl, config]
dependency_graph:
  requires: []
  provides:
    - packages/dispatcher/lib/session-persist.cjs
  affects:
    - bin/lib/config.cjs
tech_stack:
  added: []
  patterns:
    - CommonJS module with zero external dependencies (node:fs, node:path, node:os, node:crypto)
    - SHA256-base64url hash suffix for >200-char cwd sanitization (deterministic alternative to SDK base-36)
    - Async function signatures matching sync.cjs DI style
key_files:
  created:
    - packages/dispatcher/lib/session-persist.cjs
    - tests/dispatcher/session-persist.test.cjs
  modified:
    - bin/lib/config.cjs
decisions:
  - "Use SHA256-base64url for >200-char path hash suffix: SDK vJ() uses Math.abs(ZK(cwd)).toString(36) but sdk.mjs is not available in this environment; SHA256 base64url provides deterministic, cross-platform behavior. Divergence only affects paths >200 chars sanitized (rare edge case). Documented in module comment."
  - "restoreSession accepts optional storageSubDir to allow callers to specify the storage subdirectory; defaults to sanitizeCwdForProjectDir(resumingCwd) so the most common case (same cwd on both hosts) requires no extra args"
metrics:
  duration_seconds: 142
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
requirements:
  - SYN-05
  - SYN-06
---

# Phase 197 Plan 01: Session Persist Module Summary

**One-liner:** CommonJS session-persist.cjs with cwd sanitization, JSONL copy to shared storage, idempotent restore, and three config key registrations for cross-host session resume.

## What Was Built

### `packages/dispatcher/lib/session-persist.cjs`

Four exported functions:

- **`sanitizeCwdForProjectDir(cwd)`** — Replaces all non-alphanumeric characters with `-`; appends 8-char SHA256-base64url hash suffix for sanitized paths >200 characters. Matches the SDK's `vJ()` formula for <200-char paths (the common case).

- **`getSessionJsonlPath(cwd, sessionUuid)`** — Computes `~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl`, the host-local JSONL path.

- **`persistSession(worktreePath, claudeSessionId, sharedStoragePath, opts?)`** — Locates source JSONL via `getSessionJsonlPath`, checks file existence and size against `opts.maxSizeMb` (default 10 MB), copies to `sharedStoragePath/<sanitized-cwd>/<uuid>.jsonl`. Returns `{ ok: true, savedTo }` or `{ ok: false, reason }`.

- **`restoreSession(claudeSessionId, sharedStoragePath, resumingCwd, opts?)`** — Resolves source path in shared storage, checks existence, copies to host-local path. Returns `{ ok: true, skipped: true }` if target already exists (idempotent). Returns `{ ok: false, reason: 'not_in_storage' }` if source missing.

### `tests/dispatcher/session-persist.test.cjs`

18 unit tests covering:
- sanitizeCwdForProjectDir: short paths, spaces, alphanumeric-only, exactly-200, >200 (hash suffix), determinism
- getSessionJsonlPath: correct home-relative path assembly
- persistSession: file_not_found, success with copy, directory creation, too_large, default maxSizeMb
- restoreSession: not_in_storage, successful copy with restoredTo, skip when target exists, recursive dir creation

### `bin/lib/config.cjs`

Three new keys added to `VALID_CONFIG_KEYS` after the `dispatch.docker.*` block:
- `dispatch.session_persist.enabled`
- `dispatch.session_persist.storage_path`
- `dispatch.session_persist.max_size_mb`

## Deviations from Plan

### Auto-noted Divergences

**1. [Documentation - Hash Algorithm] SHA256 vs SDK base-36 hash for >200-char paths**
- **Found during:** Task 1 implementation
- **Issue:** SDK `vJ()` uses `Math.abs(ZK(cwd)).toString(36)` for the hash suffix on long paths; `sdk.mjs` is not installed in this worktree so the exact `ZK` function cannot be verified
- **Fix:** Used `crypto.createHash('sha256').update(cwd).digest('base64url').slice(0, 8)` — deterministic, stable, and explicitly documented in the module comment as a divergence
- **Impact:** Only affects paths >200 chars sanitized (e.g., deeply nested paths with spaces). For the standard case (<200 chars), no divergence. Cross-host resume with long paths requires consistent use of this PDE implementation on both hosts.
- **Files modified:** `packages/dispatcher/lib/session-persist.cjs`

**2. [Rule 2 - Enhancement] restoreSession storageSubDir option**
- **Found during:** Test design for restoreSession
- **Issue:** The plan's `restoreSession` signature does not specify how the caller indicates which subdirectory in sharedStoragePath to look in (the source session may have been persisted from a different host's cwd)
- **Fix:** Added optional `opts.storageSubDir` parameter that defaults to `sanitizeCwdForProjectDir(resumingCwd)` — covers the simple case (same project cwd on both hosts) without requiring extra configuration
- **Files modified:** `packages/dispatcher/lib/session-persist.cjs`, `tests/dispatcher/session-persist.test.cjs`

## Verification Results

```
npx vitest run tests/dispatcher/session-persist.test.cjs
  Test Files  1 passed (1)
  Tests       18 passed (18)
  Duration    120ms

node -e "require('./packages/dispatcher/lib/session-persist.cjs')"
Module loads OK
```

## Known Stubs

None — all functions are fully implemented with real file system operations. No hardcoded empty values or placeholder text.

## Self-Check: PASSED
