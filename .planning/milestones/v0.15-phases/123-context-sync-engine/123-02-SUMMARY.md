---
phase: 123-context-sync-engine
plan: "02"
subsystem: editor-sync-command
tags: [context-sync, editor-sync, command, workflow, CTX-07]
dependency_graph:
  requires: [context-sync.cjs emitAll, pde-tools.cjs context-sync]
  provides: [/pde:editor-sync command, editor-sync workflow]
  affects: [commands/, workflows/, tests/phase-123/]
tech_stack:
  added: []
  patterns: [command-workflow delegation pattern, check-divergence pattern]
key_files:
  created:
    - commands/editor-sync.md
    - workflows/editor-sync.md
    - tests/phase-123/test-editor-sync-command.cjs
  modified: []
decisions:
  - "/pde:editor-sync delegates to workflows/editor-sync.md following check-divergence pattern — consistent command architecture"
  - "Workflow calls context-sync.cjs emitAll directly via inline ESM for full sync; pde-tools.cjs context-sync used for --editor flag variants"
  - "9 tests cover all 6 behavior specs: structural validation, emitAll 6-key return, written/skipped properties, idempotency"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
requirements-completed: [CTX-07]
---

# Phase 123 Plan 02: Editor-Sync Command Summary

**One-liner:** `/pde:editor-sync` command and workflow for CTX-07 on-demand context regeneration via `context-sync.cjs emitAll`, following check-divergence delegation pattern.

## What Was Built

Created the `/pde:editor-sync` command that allows users to force regeneration of all 6 editor context files (AGENTS.md, Cursor rules, .cursorrules, GEMINI.md hierarchy, Antigravity skill, DESIGN.md) outside of pipeline execution.

### commands/editor-sync.md

Command definition following the exact `check-divergence.md` pattern:
- `name: pde:editor-sync`
- `allowed-tools: Read, Write, Bash, Glob`
- Delegates to `@workflows/editor-sync.md`
- Passes `$ARGUMENTS` through to workflow

### workflows/editor-sync.md

Workflow implementing CTX-07:
1. Parses `--editor` flag (default: `all`; valid: `cursor`, `gemini`, `agents`, `antigravity`, `all`)
2. Calls `context-sync.cjs` `emitAll()` via inline ESM module for full sync, or `pde-tools.cjs context-sync --editor {value}` for scoped sync
3. Displays formatted results table showing each target file path and written/skipped status
4. Shows source hash and generation timestamp
5. Error handling for missing `.planning/` directory

### tests/phase-123/test-editor-sync-command.cjs

9 tests across 4 describe blocks:
- **commands/editor-sync.md structure** (3 tests): file exists, has `pde:editor-sync` name, references `workflows/editor-sync`
- **workflows/editor-sync.md structure** (3 tests): file exists, contains `context-sync`, contains `emitAll` or `context-sync` call
- **emitAll integration** (2 tests): all 6 keys returned, each emitter has `written` or `skipped` property
- **emitAll idempotency** (1 test): `sourceHash` identical on two consecutive calls

## Test Results

```
# tests 9
# pass  9
# fail  0
```

Regression suite (phases 118-122): 138 tests, 0 failures.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 59a46ed | feat(123-02): create pde:editor-sync command and workflow |
| 2    | 8f98548 | test(123-02): add editor-sync command structure and emitAll integration tests |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- commands/editor-sync.md: FOUND
- workflows/editor-sync.md: FOUND
- tests/phase-123/test-editor-sync-command.cjs: FOUND
- Commit 59a46ed: FOUND
- Commit 8f98548: FOUND
