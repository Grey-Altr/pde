---
phase: 169-parametric-cad-generation
plan: "01"
subsystem: 3d-pipeline
tags: [cadquery, step, cad, parametric, python-subprocess]
dependency_graph:
  requires: [168-03]
  provides: [cad.cjs-module, step-validation, cadquery-subprocess-pattern]
  affects: [bin/lib/3d-pipeline/cad.cjs, tests/phase-169/]
tech_stack:
  added: []
  patterns: [dependency-injection-execFn, execFileSync-no-shell, try-finally-cleanup, cjs-test-via-createRequire]
key_files:
  created:
    - bin/lib/3d-pipeline/cad.cjs
    - tests/phase-169/cad.test.mjs
    - tests/phase-169/fixtures/simple-box.step
  modified: []
decisions:
  - execFileSync used (not exec) for subprocess calls -- prevents shell injection, consistent with existing video pipeline pattern
  - _execFn dependency injection enables full unit testing without Python/CadQuery installed
  - generateCAD is async to allow future Promise-based orchestration; runCadScript remains sync since execFileSync is synchronous
  - saveCADAsset uses timestamp-based filenames to prevent collisions and match assets.cjs convention
  - generateScript provides a default parametric box fallback -- production callers supply _scriptContent directly
metrics:
  duration: "218s"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  tests_added: 14
  tests_passing: 14
---

# Phase 169 Plan 01: CadQuery CAD Generation Module Summary

**One-liner:** CadQuery subprocess module with execFileSync injection for STEP generation, validation, and .step+.cq.py+.meta.json triple asset storage.

## What Was Built

`bin/lib/3d-pipeline/cad.cjs` provides the TRD-06 and TRD-07 engine for parametric CAD model generation. All 6 exported functions use dependency injection (`_execFn`) so tests run without Python or CadQuery installed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create STEP fixture and test scaffold | e206b6c | tests/phase-169/cad.test.mjs, tests/phase-169/fixtures/simple-box.step |
| 2 | Implement cad.cjs module | 5557da6 | bin/lib/3d-pipeline/cad.cjs |

## Functions Exported

- `checkCadQuery(pythonBin, _execFn)` — returns true/false based on `import cadquery` subprocess attempt
- `getPythonVersion(pythonBin, _execFn)` — returns `{ major, minor }` or null
- `validateStep(filePath)` — validates ISO-10303-21 header, non-empty, existence
- `saveCADAsset({ slug, stepPath, scriptContent, params, assetsDir })` — writes .step + .cq.py + .meta.json triple
- `runCadScript({ pythonBin, scriptContent, outputStepPath, _execFn })` — executes Python script via execFileSync, try/finally cleanup
- `generateCAD({ description, slug, assetsDir, _execFn, _scriptContent })` — full pipeline orchestration

## Test Coverage

14 tests across 6 describe blocks covering all exported functions. All subprocess calls mocked via `_execFn` injection -- no real Python/CadQuery required to run the test suite.

## Verification

```
npx vitest run tests/phase-169/ --reporter=verbose
Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  134ms
```

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functions are fully wired. The `generateScript()` fallback is an intentional default that generates a valid parametric box; production callers supply `_scriptContent` with a custom script.

## Self-Check: PASSED

Files exist:
- bin/lib/3d-pipeline/cad.cjs: FOUND
- tests/phase-169/cad.test.mjs: FOUND
- tests/phase-169/fixtures/simple-box.step: FOUND

Commits exist:
- e206b6c: FOUND (test scaffold)
- 5557da6: FOUND (cad.cjs implementation)
