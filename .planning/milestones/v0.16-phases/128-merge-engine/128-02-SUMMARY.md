---
phase: 128-merge-engine
plan: 02
subsystem: context-sync
tags: [merge-engine, conflict-resolution, policies, design-tokens, tdd]
dependency_graph:
  requires: [128-01]
  provides: [CUR-05, per-field-policies, designTokens-normalization]
  affects: [context-sync.cjs, config.json, test-merge-engine.cjs]
tech_stack:
  added: []
  patterns: [per-field-policy-dispatch, format-normalization, opts-override-pattern]
key_files:
  created: []
  modified:
    - bin/lib/context-sync.cjs
    - tests/phase-128/test-merge-engine.cjs
    - .planning/config.json
decisions:
  - "readFieldPolicy checks opts.fieldPolicies override before reading config.json — allows per-call override without mutating config"
  - "normalizeDesignTokensForComparison falls back to value.trim() when no color patterns found — safe for non-color designTokens strings"
  - "prompt policy uses currentVal (planning value) as placeholder in merged output — UI must query pendingResolution flag to show user the deferred decision"
  - "designTokens normalization applied before editorChanged/pdeChanged comparison — prevents false conflicts while still detecting real color changes"
metrics:
  duration_seconds: 171
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_modified: 3
requirements:
  - CUR-05
---

# Phase 128 Plan 02: Configurable Per-Field Conflict Resolution Policies Summary

**One-liner:** Per-field policy dispatch (planning-wins/editor-wins/prompt) with designTokens format normalization via readFieldPolicy() and normalizeDesignTokensForComparison().

## What Was Built

Added configurable conflict resolution to the merge engine (CUR-05). Previously mergePartialIR() hardcoded planning-wins for all true conflicts. Now each WRITABLE_FIELDS entry can resolve conflicts independently via one of three policies, read at merge time from opts.fieldPolicies or config.json.

### readFieldPolicy(planningDir, field, overrides)

Reads conflict resolution policy for a field. Priority: (1) opts.fieldPolicies override, (2) config.json contextSync.fieldPolicies[field], (3) 'planning-wins' default. Non-fatal — any read/parse error returns 'planning-wins'.

### normalizeDesignTokensForComparison(value)

Normalizes designTokens strings to a sorted `name:#hex|...` key before equality comparison. Extracts `**Name** (#hex)` patterns from both color-list format (from parseDesignMd) and token-summary format (from buildContextIR). Prevents false conflicts when the same colors are present in different formats (Research Finding 2).

### Policy dispatch in mergePartialIR

- `editor-wins`: resolvedValue = editorVal
- `prompt`: resolvedValue = currentVal, entry.pendingResolution = true
- `planning-wins` (default): resolvedValue = currentVal

### config.json

Added `contextSync.fieldPolicies: {}` schema. Empty by default — all fields default to planning-wins until explicitly configured.

## Tasks Completed

| Task | Description | Commit | Type |
|------|-------------|--------|------|
| 1 | Write 7 failing tests (RED) — policy and designTokens normalization | 0c2524b | test |
| 2 | Implement readFieldPolicy, normalizeDesignTokensForComparison, policy-aware merge | 63ac643 | feat |

## Test Results

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| phase-128/test-merge-engine.cjs | 20 | 20 | 0 |
| phase-127/test-reverse-parsers.cjs | 25 | 25 | 0 |
| phase-126/test-sync-foundation.cjs | 15 | 15 | 0 |
| **Total** | **60** | **60** | **0** |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is fully wired. The `contextSync.fieldPolicies: {}` in config.json is intentionally empty (teams configure per their needs); the engine correctly defaults to planning-wins when empty.

## Self-Check: PASSED

All files found on disk. Both commits verified in git log. 60/60 tests passing.
