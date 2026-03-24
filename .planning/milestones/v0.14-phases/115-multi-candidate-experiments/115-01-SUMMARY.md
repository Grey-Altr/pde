---
phase: 115-multi-candidate-experiments
plan: "01"
subsystem: experiment-library
tags: [multi-candidate, experiment-schema, experiment-runner, pde-tools, tdd]
dependency_graph:
  requires: [phase-114-visual-regression-circuit-breaker]
  provides: [multi-candidate-primitives, reset-to-sha-subcommand, extended-jsonl-schema]
  affects: [bin/lib/experiment-schema.cjs, bin/lib/experiment-runner.cjs, bin/pde-tools.cjs]
tech_stack:
  added: []
  patterns: [TDD-red-green, branch-guard-pattern, JSONL-schema-extension]
key_files:
  created:
    - tests/phase-115/multi-candidate.test.mjs
  modified:
    - bin/lib/experiment-schema.cjs
    - bin/lib/experiment-runner.cjs
    - bin/pde-tools.cjs
decisions:
  - "screenshot_hash and baseline_hash included in base 11 fields (Phase 114 additions) — worktree predates Phase 114, so both phases' schema extensions applied in one commit"
  - "JSONL_ROW_FIELDS extends from 9 fields (worktree baseline) to 14 fields in one atomic update"
  - "_resetToSha uses git rev-parse --abbrev-ref HEAD for branch guard — matches execGit pattern throughout runner"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-24T00:39:36Z"
  tasks_completed: 1
  files_modified: 4
---

# Phase 115 Plan 01: Multi-Candidate Infrastructure Summary

Multi-candidate experiment primitives added to the library layer via TDD: candidates field parsing with default 3, 14-field JSONL schema (adding candidates_evaluated, candidates_scores, best_candidate_index), _resetToSha branch-guarded helper, and reset-to-sha pde-tools subcommand.

## What Was Built

### Task 1: Extend experiment-schema.cjs, experiment-runner.cjs, pde-tools.cjs + Nyquist tests

**TDD approach — RED then GREEN:**

1. Created `tests/phase-115/multi-candidate.test.mjs` with 14 tests covering MULTI-01 through MULTI-04
2. Ran tests — confirmed 11 failures (RED)
3. Implemented all changes — confirmed 14/14 pass (GREEN)

**Changes:**

`bin/lib/experiment-schema.cjs`:
- Extended `JSONL_ROW_FIELDS` from 9 to 14 fields (added screenshot_hash, baseline_hash from Phase 114, then candidates_evaluated, candidates_scores, best_candidate_index for Phase 115)
- Added `candidates: fm.candidates !== undefined ? parseInt(fm.candidates, 10) : 3` to `parseExperimentFile` return

`bin/lib/experiment-runner.cjs`:
- Added `_resetToSha(cwd, slug, sha)` function with branch guard (returns `{ reset: false, reason: 'wrong_branch' }` if not on `experiment/{slug}`)
- Added `_resetToSha` to module.exports

`bin/pde-tools.cjs`:
- Added `reset-to-sha` subcommand routing to `_resetToSha` with `--sha SHA` argument
- Updated available subcommand error message to include `reset-to-sha`

## Verification

```
node --test tests/phase-115/multi-candidate.test.mjs
# tests 14 / pass 14 / fail 0

node --test tests/phase-112/
# tests 126 / pass 126 / fail 0
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added screenshot_hash and baseline_hash to JSONL_ROW_FIELDS**

- **Found during:** Task 1 — test file written expecting 11 base fields, but worktree (branched before Phase 114) only had 9
- **Issue:** Worktree predated Phase 114 which added screenshot_hash and baseline_hash to JSONL_ROW_FIELDS. Plan test expectations required 11 fields in positions 0-10
- **Fix:** Included Phase 114's screenshot_hash and baseline_hash additions in the same schema extension commit, making the worktree consistent with the plan's test expectations
- **Files modified:** bin/lib/experiment-schema.cjs
- **Commit:** 4550983

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7689d47 | test | add failing tests for MULTI-01 through MULTI-04 (RED) |
| 4550983 | feat | add multi-candidate infrastructure to experiment library (GREEN) |

## Known Stubs

None — all functionality is fully implemented. Plan 02 will use these primitives to implement the candidate loop in optimize.md.

## Self-Check: PASSED

All files confirmed present:
- tests/phase-115/multi-candidate.test.mjs: FOUND
- bin/lib/experiment-schema.cjs: FOUND
- bin/lib/experiment-runner.cjs: FOUND
- bin/pde-tools.cjs: FOUND

All commits confirmed:
- 7689d47: FOUND
- 4550983: FOUND
