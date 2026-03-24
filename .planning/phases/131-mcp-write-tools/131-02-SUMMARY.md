---
phase: 131-mcp-write-tools
plan: 02
subsystem: mcp-server
tags: [mcp, write-tools, context-notes, divergence-flags, nyquist]
dependency_graph:
  requires: ["131-01"]
  provides: ["INF-04", "INF-05"]
  affects: ["packages/pde-mcp-server/handlers.cjs", "packages/pde-mcp-server/src/write-tools.ts"]
tech_stack:
  added: []
  patterns: ["category-allowlist-validation", "atomic-json-write-rename", "emitAll-isolation-try-catch", "no-emitAll-on-flag-divergence"]
key_files:
  created:
    - packages/pde-mcp-server/src/tools/append-context-note.ts
    - packages/pde-mcp-server/src/tools/flag-divergence.ts
  modified:
    - packages/pde-mcp-server/handlers.cjs
    - packages/pde-mcp-server/src/write-tools.ts
    - tests/phase-131/test-mcp-write-tools.cjs
decisions:
  - "VALID_CATEGORIES allowlist prevents path traversal without regex — simpler and more explicit"
  - "handleFlagDivergence does NOT call emitAll per INF-05 — divergence flags are internal signals, not editor-sync triggers"
  - "emitAll wrapped in try/catch in handleAppendContextNote for error isolation (matches Phase 131 decision)"
  - "Atomic write in handleFlagDivergence uses pid-based tmp path to prevent concurrent write races"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_modified: 5
---

# Phase 131 Plan 02: MCP Write Tools (Context Note + Divergence Flag) Summary

**One-liner:** pde_append_context_note + pde_flag_divergence handlers with category allowlist, atomic JSON write, emitAll isolation, and 13 Nyquist tests (24 total GREEN).

## What Was Built

Added the remaining two MCP write tools to complete the four-tool write API introduced in Phase 131:

1. **`pde_append_context_note`** (INF-04): Appends a timestamped note to `.planning/context-notes/{category}-notes.md`. Validates category against a 5-item allowlist (design, technical, product, research, decision) to prevent path traversal. Calls `emitAll(cwd)` in a try/catch for error isolation. Logs NDJSON audit entry.

2. **`pde_flag_divergence`** (INF-05): Writes a component/reason/severity entry to `.planning/divergence-flags.json`. Validates component name against `COMPONENT_NAME_RE` (no path separators, alphanumeric start). Uses atomic write-rename pattern (pid-based tmp file). Does NOT call `emitAll` per spec. Logs NDJSON audit entry.

Both tools are wired into `write-tools.ts` and registered when `--enable-writes` is present.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Context note + divergence flag handlers with Nyquist tests (TDD) | ef778b8 | handlers.cjs, test-mcp-write-tools.cjs |
| 2 | TypeScript tool factories + wire into write-tools.ts + build | ca2d0e3 | append-context-note.ts, flag-divergence.ts, write-tools.ts |

## Verification Results

- `node tests/phase-131/test-mcp-write-tools.cjs` — **24/24 pass** (INF-01 through INF-05)
- `npm run build` in packages/pde-mcp-server — **clean TypeScript build, no errors**
- `handleAppendContextNote` and `handleFlagDivergence` each appear >= 2 times in handlers.cjs
- `VALID_CATEGORIES` confirmed present
- `emitAll` present in handleUpdateConstraints, handleUpdateTechStack, handleAppendContextNote — absent from handleFlagDivergence body

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all four write tools are fully wired with real behavior.

## Self-Check: PASSED

- append-context-note.ts: FOUND
- flag-divergence.ts: FOUND
- commit ef778b8: FOUND
- commit ca2d0e3: FOUND
