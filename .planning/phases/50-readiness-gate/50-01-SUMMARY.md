---
phase: 50-readiness-gate
plan: "01"
subsystem: verification
tags: [readiness, validation, pre-execution, VRFY-03]
dependency_graph:
  requires: [bin/lib/sharding.cjs, bin/lib/frontmatter.cjs, bin/lib/core.cjs]
  provides: [bin/lib/readiness.cjs, commands/check-readiness.md, workflows/check-readiness.md]
  affects: [bin/pde-tools.cjs]
tech_stack:
  added: [bin/lib/readiness.cjs]
  patterns: [TDD red-green, structural/consistency check hierarchy, severity-first classification]
key_files:
  created:
    - bin/lib/readiness.cjs
    - commands/check-readiness.md
    - workflows/check-readiness.md
    - tests/phase-50/readiness-checks.test.mjs
    - tests/phase-50/readiness-report.test.mjs
  modified:
    - bin/pde-tools.cjs
decisions:
  - "A6 check uses extractTaskBlocks() result count — not <tasks> wrapper presence — since sharding.cjs already matches <task> without requiring wrapper"
  - "B-checks skipped gracefully when requirementsContent is null, enabling unit tests without real filesystem"
  - "Future Requirements section excluded from B1 active-section lookup using ## Future Requirements header boundary"
duration: 8min
completed: "2026-03-19T22:00:20Z"
requirements: [VRFY-03]
---

# Phase 50 Plan 01: Readiness Gate — Structural and Consistency Checks

**One-liner:** Pre-execution readiness gate with 12-check A/B hierarchy (A1-A9 presence + B1-B3 consistency), severity-first PASS/CONCERNS/FAIL classification, READINESS.md output, and /pde:check-readiness command routing through pde-tools.cjs.

## What Was Built

Created the complete `/pde:check-readiness` command pipeline:

1. **`bin/lib/readiness.cjs`** — Core library implementing:
   - `runStructuralChecks(planContent, requirementsContent, planFileName)` — Category A (A1-A9) presence checks and Category B (B1-B3) consistency checks
   - `classifyResult(checks)` — severity-first precedence (fail > concerns > pass)
   - `writeReadinessMd(phaseDir, phaseNumber, phaseName, allChecks, result)` — formats and writes READINESS.md with frontmatter and check tables
   - `cmdReadinessCheck(cwd, phaseArg, planFile, raw)` — CLI entry point adding A10/A11 filesystem checks, aggregates all plans
   - `cmdReadinessResult(cwd, phaseArg, raw)` — reads existing READINESS.md frontmatter

2. **`commands/check-readiness.md`** — Thin command wrapper (`name: pde:check-readiness`) routing to workflow

3. **`workflows/check-readiness.md`** — 4-step agent workflow: load_context → run_structural_checks → run_semantic_checks (C1-C3) → report_result

4. **`bin/pde-tools.cjs`** — Added `case 'readiness':` dispatch for check and result subcommands

5. **Test files** — 35 unit tests (readiness-checks) + 19 smoke tests (readiness-report) = 54 total

## Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create readiness.cjs with structural and consistency checks | e1373cf | bin/lib/readiness.cjs, tests/phase-50/readiness-checks.test.mjs |
| 2 | Create command, workflow, pde-tools dispatch, and report tests | 737173c | commands/check-readiness.md, workflows/check-readiness.md, bin/pde-tools.cjs, tests/phase-50/readiness-report.test.mjs |

## Verification Results

1. `node --test tests/phase-50/readiness-checks.test.mjs` — 35/35 pass
2. `node --test tests/phase-50/readiness-report.test.mjs` — 19/19 pass
3. `node --test tests/phase-50/*.test.mjs` — 54/54 pass
4. `node --test tests/phase-49/*.test.mjs` — 39/39 pass (regression green)
5. `commands/check-readiness.md` contains `pde:check-readiness`
6. `bin/pde-tools.cjs` contains `case 'readiness':`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A6 test fixture incorrect**
- **Found during:** Task 1 GREEN phase (test 14 failed)
- **Issue:** Test replaced `<tasks>` with `<!-- no tasks -->` but kept `<task>` block; `extractTaskBlocks()` still found tasks so A6 passed when it should fail
- **Fix:** Updated test fixture to use a plan with no `<task>` inside `<tasks>` (text content only), which correctly results in `extractTaskBlocks().length === 0`
- **Files modified:** tests/phase-50/readiness-checks.test.mjs
- **Commit:** e1373cf (included in Task 1 commit)

## Decisions Made

- A6 check uses `extractTaskBlocks()` count (not `<tasks>` wrapper presence) — consistent with how sharding.cjs already works
- B-checks are entirely skipped (treated as passed) when `requirementsContent` is null — allows unit tests to run without filesystem
- Future Requirements section excluded from B1 active-section lookup by slicing content at the `## Future Requirements` header
- `writeReadinessMd` escapes `|` in details cells to prevent markdown table corruption

## Self-Check

- [x] bin/lib/readiness.cjs exists: FOUND
- [x] commands/check-readiness.md exists: FOUND
- [x] workflows/check-readiness.md exists: FOUND
- [x] tests/phase-50/readiness-checks.test.mjs exists: FOUND
- [x] tests/phase-50/readiness-report.test.mjs exists: FOUND
- [x] Commit e1373cf exists: FOUND
- [x] Commit 737173c exists: FOUND

## Self-Check: PASSED
