---
phase: 176-data-extraction-ir-foundation
plan: "03"
subsystem: presentation-ir
tags: [ir-extraction, cli-routing, tdd, presentation, composer]
requires: [176-01, 176-02]
provides: [buildPresentationIR, cmdPresentationArtifactRead, crossRefValidate, pde-tools-presentation-router]
affects: [bin/lib/presentation.cjs, bin/pde-tools.cjs, tests/phase-176/]
tech-stack:
  added: []
  patterns: [TDD-red-green, IR-composer, lazy-require, SHA256-hash]
key-files:
  created:
    - tests/phase-176/presentation-cmd.test.mjs
  modified:
    - bin/lib/presentation.cjs
    - bin/pde-tools.cjs
key-decisions:
  - "crossRefValidate is non-blocking — warnings array only, never prevents IR output"
  - "source_hash uses SHA-256 of STATE.md + ROADMAP.md + REQUIREMENTS.md + PROJECT.md concatenated"
  - "cmdPresentationArtifactRead uses lazy require('./core.cjs') inside function, consistent with module pattern"
metrics:
  duration: "12min"
  completed: "2026-03-30"
  tasks: 2
  files_changed: 3
requirements: [CMD-03, CMD-04]
---

# Phase 176 Plan 03: IR Composer, CLI Routing, and Integration Tests Summary

**One-liner:** buildPresentationIR composer wiring all 10 EXT functions into a single JSON IR with SHA-256 source hash and non-blocking cross-reference validation, accessible via `pde-tools presentation artifact-read`.

## What Was Built

This plan completed Phase 176 by composing all 10 extractors (EXT-01 through EXT-10, built in Plans 01 and 02) into a single accessible CLI command.

### Task 1: buildPresentationIR, crossRefValidate, cmdPresentationArtifactRead

Added three functions to `bin/lib/presentation.cjs`:

**crossRefValidate(ir)** — Non-blocking consistency checks:
- If `phases.completed > phases.total` → warning
- If `requirements.completed > requirements.total` → warning
- If `verification.phases_verified > phases.total` → warning
- Returns empty array when all clean

**buildPresentationIR(cwd)** — Composes all 10 extractors:
- `schema_version: '1.0'`
- `extracted_at: new Date().toISOString()`
- `source_hash`: SHA-256 of STATE.md + ROADMAP.md + REQUIREMENTS.md + PROJECT.md
- All 10 EXT function results under their respective keys
- `blockers` and `risks` split from `extractBlockers()` return
- `output_dir: '.planning/presentations'` with `fs.mkdirSync` creation
- `cross_ref_warnings` from `crossRefValidate(ir)`

**cmdPresentationArtifactRead(cwd, raw)** — Single-line CLI handler calling `buildPresentationIR` and `output()`.

### Task 2: pde-tools.cjs Routing + Integration Tests (TDD)

Following TDD pattern:
1. RED: Created `tests/phase-176/presentation-cmd.test.mjs` with 9 integration tests — all failing (routing not yet wired)
2. GREEN: Added `case 'presentation':` block to `bin/pde-tools.cjs` before `default:` — all 9 tests pass

Integration tests validate:
- schema_version === '1.0'
- All 17 required top-level IR keys present
- extracted_at round-trips as valid ISO 8601
- `.planning/presentations/` directory created
- source_hash is non-empty hex string
- cross_ref_warnings is an array
- Unknown subcommand exits non-zero with "Unknown presentation subcommand. Available: artifact-read"

## Deviations from Plan

None — plan executed exactly as written.

The only extra step was checking out `bin/lib/presentation.cjs` from the `main` branch (Plans 01 and 02 completed in parallel worktrees) before adding the three new functions. This is expected parallel execution behavior, not a deviation.

## Verification Results

```
node bin/pde-tools.cjs presentation artifact-read
→ @file:/tmp/pde-*.json (valid JSON, schema_version: "1.0", 17 top-level keys)

node bin/pde-tools.cjs presentation bogus 2>&1
→ Error: Unknown presentation subcommand. Available: artifact-read (exit 1)

ls .planning/presentations/
→ directory exists (created by buildPresentationIR)

npx vitest run tests/phase-176/ --reporter=verbose
→ 2 test files, 38 tests, 38 passed
```

All phase-176 tests pass (29 unit for EXT-01 through EXT-10, 9 integration for CLI routing).

## Commits

- `9b45fcd` feat(176-03): add buildPresentationIR, crossRefValidate, cmdPresentationArtifactRead
- `911e048` test(176-03): add failing integration tests for presentation CLI routing
- `4ab2434` feat(176-03): wire presentation CLI routing in pde-tools.cjs

## Self-Check

- [x] `bin/lib/presentation.cjs` contains `buildPresentationIR`, `crossRefValidate`, `cmdPresentationArtifactRead`
- [x] `bin/lib/presentation.cjs` module.exports includes all three new functions
- [x] `bin/pde-tools.cjs` contains `case 'presentation':` and `require('./lib/presentation.cjs')`
- [x] `tests/phase-176/presentation-cmd.test.mjs` exists with 9 integration tests
- [x] All 38 phase-176 tests pass
- [x] `.planning/presentations/` directory created on artifact-read
- [x] CMD-03 and CMD-04 requirements satisfied
