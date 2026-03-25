---
phase: 126-sync-foundation
plan: 02
subsystem: context-sync
tags: [loop-prevention, hash-comparison, state-file, tdd, nyquist]
dependency_graph:
  requires: [126-01]
  provides: [computeLoopBreak, writeStateFile, readStateFile, PDE_HASH_RE]
  affects: [phase-129-watcher, phase-128-merge-engine]
tech_stack:
  added: []
  patterns: [write-rename-atomic, pid-based-tmp, regex-derived-from-format]
key_files:
  created:
    - tests/phase-126/test-sync-foundation.cjs
  modified:
    - bin/lib/context-sync.cjs
    - .gitignore
decisions:
  - "PDE_HASH_RE derived from makeHeader() via escape+replace to stay in sync with header format changes"
  - "Timestamp replacement string corrected: '2000-01-01T00:00:00\\.000Z' (only dot is regex-escaped, not dashes/colons)"
  - "Plan 01 prerequisites implemented in same commit due to parallel execution — Plan 01 worktree not yet merged"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-24"
  tasks_completed: 1
  files_created: 1
  files_modified: 2
  tests_added: 15
  tests_passing: 15
---

# Phase 126 Plan 02: computeLoopBreak() and Sync State File Infrastructure Summary

**One-liner:** Hash-comparison loop-break gate (computeLoopBreak) + atomic sync state file (writeStateFile/readStateFile) with PDE_HASH_RE derived dynamically from makeHeader() output.

## What Was Built

### computeLoopBreak() (SYN-02)

The loop-break gate that prevents PDE-written file changes from triggering reverse sync loops. Before Phase 129's watcher fires on any changed editor file, this function compares the embedded PDE-GENERATED hash against the current source hash:

- Returns `'skip'` when hashes match (PDE wrote the file — no loop)
- Returns `'proceed'` when hashes differ (external edit — process it)
- Returns `'skip'` for missing markers, empty content, null content, or malformed markers (non-hex hash)

### PDE_HASH_RE (regex derived from makeHeader)

The regex is NOT hardcoded. It is derived dynamically from `makeHeader()` with known placeholder values, then the placeholders are replaced with capture groups. This means if the header format ever changes, the regex automatically stays in sync:

```javascript
const _sampleHeader = makeHeader('0'.repeat(64), '2000-01-01T00:00:00.000Z');
const _escaped = _sampleHeader
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  .replace('0'.repeat(64), '([a-f0-9]{64})')
  .replace('2000-01-01T00:00:00\\.000Z', '([^>]+)');
const PDE_HASH_RE = new RegExp(_escaped);
```

### writeStateFile() (SYN-01)

Writes `.planning/.context-sync-state.json` atomically using write-rename pattern with PID-based tmp path to prevent concurrent hook race conditions. Non-fatal — emitAll() cannot throw if this fails.

State file schema (v1.0):
```json
{
  "schemaVersion": "1.0",
  "lastEmittedAt": "<ISO timestamp>",
  "lastSourceHash": "<64-char hex>",
  "lastIR": { "techStack": "...", "constraints": "...", "componentCatalog": "...", "designTokens": "..." },
  "pendingIngest": []
}
```

### readStateFile() (SYN-03)

Reads and validates the state file. Returns null for missing files, corrupt JSON, or unknown schema versions (forward-compatibility guard). Broad catch is intentional — all failure modes surface as null, which is safe.

### emitAll() integration

emitAll() now calls writeStateFile(ir, planningDir) after all emitters complete. Writing the state file does NOT affect computeSourceHash() output (LOOP-SAFE verified).

### .gitignore

Added exclusions:
- `.planning/.context-sync-state.json` (session-specific, not for git)
- `.planning/.context-sync-state.json.*.tmp` (PID-based tmp files during atomic write)

## Test Results

15 Nyquist tests — all GREEN:

- SYN-01 (3 tests): state file created, correct schema, hash stable after write
- SYN-03 (2 tests): lastIR has exactly 4 writable fields, updated on second call
- readStateFile (4 tests): null for missing, corrupt, valid, unknown schema version
- SYN-02 (6 tests): skip on hash match, proceed on hash differ, skip on no marker, skip on empty, skip on null, skip on malformed marker (INVALID_NOT_HEX)

## Verification

```
node --test tests/phase-126/test-sync-foundation.cjs
# tests 15 / pass 15 / fail 0

typeof cs.computeLoopBreak === 'function'   ✓
typeof cs.readStateFile === 'function'       ✓
typeof cs.writeStateFile === 'function'      ✓
PDE_HASH_RE DERIVED (not hardcoded)         ✓
LOOP-SAFE (hash stable after emitAll)       ✓
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 01 prerequisites missing in this worktree**
- **Found during:** Task 1 (initial setup)
- **Issue:** Plan 02 depends_on 126-01, but 126-01 was running as a parallel wave 1 agent in a different worktree. Neither writeStateFile, readStateFile, nor the test file existed in this worktree.
- **Fix:** Implemented all Plan 01 requirements (writeStateFile, readStateFile, emitAll integration, .gitignore, test file scaffold with 9 SYN-01/SYN-03/readStateFile tests) in the same commit as Plan 02 requirements.
- **Files modified:** bin/lib/context-sync.cjs, .gitignore, tests/phase-126/test-sync-foundation.cjs (created)
- **Commit:** 5267ba4

**2. [Rule 1 - Bug] Incorrect timestamp escape string in PDE_HASH_RE derivation**
- **Found during:** Task 1, GREEN phase (test 11 failing)
- **Issue:** The plan's regex derivation code used `'2000\\-01\\-01T00\\:00\\:00\\.000Z'` as the replacement target, but after escaping the header string, dashes `-` and colons `:` are NOT escaped (they're not regex special chars). The actual escaped string is `'2000-01-01T00:00:00\\.000Z'`.
- **Fix:** Changed replacement string to `'2000-01-01T00:00:00\\.000Z'` (only the dot is escaped, not dashes/colons).
- **Files modified:** bin/lib/context-sync.cjs
- **Commit:** 5267ba4 (same commit)

## Self-Check: PASSED
