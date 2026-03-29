---
phase: 170-pde-utilities
plan: "02"
subsystem: utils
tags: [flow-test-gen, handoff-verifier, mermaid, playwright, gap-detection, tdd]
dependency_graph:
  requires:
    - "bin/lib/3d-pipeline/cad.cjs (dependency injection pattern)"
    - "bin/lib/divergence.cjs (grep export search pattern)"
  provides:
    - "bin/lib/utils/flow-test-gen.cjs (parseFlowchart, generateTestScaffold, findLatestFlowsFile)"
    - "bin/lib/utils/handoff-verifier.cjs (parseHandoffSpec, searchForExport, verifyHandoff, findLatestHandoffSpec)"
  affects:
    - "170-03 (pde-tools.cjs wiring uses these modules)"
tech_stack:
  added: []
  patterns:
    - "Dependency injection for CJS testability (_execFn, _readFn, _readdirFn)"
    - "Regex-based Mermaid flowchart parsing (no external AST library)"
    - "grep-based export search (execFileSync, no shell injection)"
key_files:
  created:
    - bin/lib/utils/flow-test-gen.cjs
    - bin/lib/utils/handoff-verifier.cjs
    - tests/phase-170/flow-test-gen.test.mjs
    - tests/phase-170/handoff-verifier.test.mjs
  modified: []
decisions:
  - "Edge regex updated to handle inline node labels (A[Label] --> B[Label]) — EDGE_RE must allow optional bracket/paren/diamond after node ID before arrow"
  - "flow-test-gen.cjs uses _extractInlineLabels() helper to scan multiple node declarations per line"
  - "handoff-verifier searchForExport() catches all errors (not just exit-1) to safely handle missing srcDir"
  - "verifyHandoff() checks ENOENT by both err.code and message string for compatibility with injected mock fns"
metrics:
  duration: "4 minutes"
  completed_date: "2026-03-29T05:59:21Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
  tests_added: 45
---

# Phase 170 Plan 02: Flow Test Generator and Handoff Verifier Summary

Mermaid flowchart parser + Playwright test scaffold generator; handoff spec grep-based gap detector with structured JSON + markdown report output.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create flow-test-gen.cjs with Mermaid parser and Playwright scaffold generator | 2d74466 | bin/lib/utils/flow-test-gen.cjs, tests/phase-170/flow-test-gen.test.mjs |
| 2 | Create handoff-verifier.cjs with gap detection and tests | bb8c525 | bin/lib/utils/handoff-verifier.cjs, tests/phase-170/handoff-verifier.test.mjs |

## What Was Built

### flow-test-gen.cjs

Three exported functions for converting /pde:flows Mermaid output into Playwright test skeletons:

- `parseFlowchart(mermaidText)` — Splits by newlines, skips `subgraph`/`end`/`%%`/direction keywords, matches edges with an updated regex that handles inline node labels (`A[Label] --> B[Label]`), and extracts label text from bracket/paren/diamond syntax via `_extractInlineLabels()`. Returns `{ nodes: Map<id, label>, edges: Array<{from, to}> }`.

- `generateTestScaffold({ nodes, edges, baseUrl })` — Produces a complete Playwright test file string with `const { test, expect } = require('@playwright/test')` header and one `test()` block per edge. Each test calls `page.goto(baseUrl)`, `page.click('[data-testid="${toId}-link"]')`, and `expect(page).toHaveURL(/${toId}/i)`. Defaults to `http://localhost:3000`.

- `findLatestFlowsFile(designDir, _readdirFn)` — Filters files matching `FLW-flows-v*.md`, sorts by version number, returns full path to highest version or null if none found.

### handoff-verifier.cjs

Four exported functions for comparing HANDOFF-SPEC.md against source code:

- `parseHandoffSpec(specContent)` — Scans markdown for table rows starting with `|`, skips header/separator rows, splits by `|` and trims cells to produce `{ component, props, file }` array.

- `searchForExport(componentName, srcDir, _execFn)` — Calls `grep -r -l 'export.*ComponentName' srcDir` with `--include=*.ts/tsx/js/jsx` flags. Returns array of matching file paths, or `[]` on any error (grep exit-1 = no matches treated identically to other failures).

- `verifyHandoff({ specPath, srcDir, _readFn, _execFn })` — Reads spec file (returns `{ status: 'no-spec', message }` on ENOENT), parses components, calls `searchForExport` for each, classifies as `matched`/`missing`, builds gap array + markdown table + stats object. Returns `{ status: 'complete', gaps, markdown, stats }`.

- `findLatestHandoffSpec(designDir, _readdirFn)` — Auto-detects latest `HND-handoff-spec-v*.md` by version number, returns full path or null.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Edge regex did not match inline node label syntax**
- **Found during:** Task 1 (TDD GREEN phase — tests failing)
- **Issue:** Original `EDGE_RE = /^\s*(\w+)\s*(?:-->|...)/` required bare `\w+` before the arrow. Mermaid flowchart lines like `Home[Home Screen] --> Login[Login Screen]` have bracket-labels inline — the regex skipped these entirely, producing 0 edges from realistic flowchart inputs.
- **Fix:** Updated regex to allow optional `(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?` after the node ID before matching the arrow operator.
- **Files modified:** bin/lib/utils/flow-test-gen.cjs
- **Commit:** 2d74466 (within same task commit)

## Known Stubs

None — both modules are fully wired with real logic. No hardcoded empty values or placeholder returns.

## Self-Check: PASSED

Files exist:
- bin/lib/utils/flow-test-gen.cjs: FOUND
- bin/lib/utils/handoff-verifier.cjs: FOUND
- tests/phase-170/flow-test-gen.test.mjs: FOUND
- tests/phase-170/handoff-verifier.test.mjs: FOUND

Commits exist:
- 2d74466: FOUND (feat(170-02): flow-test-gen.cjs)
- bb8c525: FOUND (feat(170-02): handoff-verifier.cjs)

Tests: 45/45 passing
