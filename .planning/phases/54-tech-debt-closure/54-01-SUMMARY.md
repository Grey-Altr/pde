---
phase: 54
plan: "01"
subsystem: workflows, mcp-bridge, pde-tools
one_liner: "Cosmetic normalization of lock-release bash calls, TOOL_MAP preregistration annotations, and v0.6 command help text additions"
tags: [tech-debt, normalization, documentation, annotations]
dependency_graph:
  requires: []
  provides: [DEBT-04, DEBT-06, DEBT-07]
  affects: [workflows/critique.md, workflows/iterate.md, workflows/handoff.md, bin/lib/mcp-bridge.cjs, bin/pde-tools.cjs]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - workflows/critique.md
    - workflows/iterate.md
    - workflows/handoff.md
    - bin/lib/mcp-bridge.cjs
    - bin/pde-tools.cjs
key_decisions:
  - "lock-release bash code blocks normalized to no trailing args; prose references in guidelines left unchanged as they describe intent"
  - "TOOL_MAP_PREREGISTERED annotation chosen as inline comment (not block comment) to stay on same line as the entry"
  - "v0.6 help sections inserted between Sharding and Validation sections to maintain logical grouping"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-20"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
---

# Phase 54 Plan 01: Cosmetic Tech Debt Closure Summary

Cosmetic normalization of lock-release bash calls in three workflow files, TOOL_MAP preregistration annotations in mcp-bridge.cjs, and addition of three missing v0.6 command sections to pde-tools.cjs help text. Zero functional changes across all 5 files.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Normalize lock-release trailing args in workflow files | 3cbf724 | workflows/critique.md, workflows/iterate.md, workflows/handoff.md |
| 2 | Annotate TOOL_MAP pre-registered entries | 66ea21e | bin/lib/mcp-bridge.cjs |
| 3 | Add missing v0.6 commands to pde-tools.cjs help text | 4fa911b | bin/pde-tools.cjs |

## Changes Made

### Task 1: Lock-release trailing argument normalization

Three workflow files had bash code blocks that passed a trailing argument to `design lock-release` that `cmdLockRelease` in pde-tools.cjs ignores:

- `workflows/critique.md` line 614: `lock-release critique` → `lock-release`
- `workflows/iterate.md` line 355: `lock-release iterate` → `lock-release`
- `workflows/handoff.md` line 611: `lock-release pde-handoff` → `lock-release`

Prose references in guidelines sections (e.g., "Always release the write lock via `lock-release iterate`") were intentionally left unchanged — those describe intent and context, not executable calls.

### Task 2: TOOL_MAP_PREREGISTERED annotations

Two TOOL_MAP entries in `bin/lib/mcp-bridge.cjs` that have no current consumers in any operational file were annotated:

- `'github:update-pr'` at line 90
- `'github:search-issues'` at line 93

Both now carry `// TOOL_MAP_PREREGISTERED` inline comments. Future integration checks will not flag these entries as orphaned dead code.

### Task 3: v0.6 command help text additions

Three command sections were missing from the `bin/pde-tools.cjs` header comment block despite all three being implemented. Inserted between the Sharding and Validation sections:

- **File Manifest:** `manifest init`, `manifest check`
- **Readiness:** `readiness check <phase> [plan]`, `readiness result <phase>`
- **Task Tracking:** `tracking init <phase> <plan>`, `tracking set-status <phase> <plan>`, `tracking read <phase> <plan>`

No implementation changes. Help text only.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Task 1: `grep -n "lock-release [a-z]" workflows/*.md` — returns only prose lines, no bash code blocks with trailing args
- Task 2: `grep -c "TOOL_MAP_PREREGISTERED" bin/lib/mcp-bridge.cjs` — returns 2
- Task 3: All 7 help entries (`manifest init`, `manifest check`, `readiness check`, `readiness result`, `tracking init`, `tracking set-status`, `tracking read`) present in comment block

## Self-Check: PASSED

Files verified:
- workflows/critique.md — FOUND, lock-release normalized
- workflows/iterate.md — FOUND, lock-release normalized
- workflows/handoff.md — FOUND, lock-release normalized
- bin/lib/mcp-bridge.cjs — FOUND, 2 TOOL_MAP_PREREGISTERED annotations
- bin/pde-tools.cjs — FOUND, 7 new help entries

Commits verified:
- 3cbf724 — FOUND (chore(54-01): normalize lock-release)
- 66ea21e — FOUND (chore(54-01): annotate TOOL_MAP)
- 4fa911b — FOUND (chore(54-01): add help text)
