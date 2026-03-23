---
phase: 102-mutation-agent-metric-evaluation
plan: "01"
subsystem: experiment-runner
tags: [experiment, runner, metric-eval, boundary-check, jsonl, tdd]
one_liner: "experiment-runner.cjs with 5 iteration helpers: boundary check via git-status, metric eval via spawnSync shell, compare/JSONL write, diff extraction"
dependency_graph:
  requires: [101-01]
  provides: [_checkModifiedFiles, _evalMetric, _compareMetric, _writeJsonlRow, _extractDiff]
  affects: [102-02, 103]
tech_stack:
  added: [bin/lib/experiment-runner.cjs]
  patterns: [spawnSync shell:true, git status --porcelain, JSONL_ROW_FIELDS contract, TDD RED-GREEN]
key_files:
  created:
    - bin/lib/experiment-runner.cjs
    - tests/phase-102/experiment-runner-boundaries.test.mjs
    - tests/phase-102/experiment-runner-metric-eval.test.mjs
    - tests/phase-102/experiment-runner-jsonl.test.mjs
    - tests/phase-102/experiment-runner-diff.test.mjs
  modified:
    - bin/lib/experiment-schema.cjs
    - tests/phase-101/experiment-schema.test.mjs
key_decisions:
  - "shell:true in spawnSync for _evalMetric -- real verify commands need shell features; whitespace-split approach breaks quoted args"
  - "git status --porcelain for _checkModifiedFiles -- detects untracked new files that git diff misses"
  - "JSONL_ROW_FIELDS extended to 9 fields (added tokens_used) as required by EXEC-02"
metrics:
  duration: "~20 min"
  completed: "2026-03-23"
  tasks: 1
  files: 7
---

# Phase 102 Plan 01: Experiment Runner Library Summary

experiment-runner.cjs with 5 iteration helpers: boundary check via git-status, metric eval via spawnSync shell, compare/JSONL write, diff extraction

## What Was Built

New `bin/lib/experiment-runner.cjs` module (209 lines, under 300 ceiling) with 5 exported helper functions:

1. **`_checkModifiedFiles(cwd, mutableFiles)`** — Uses `git status --porcelain` to detect all file changes (staged, unstaged, and untracked). Returns `{ valid, violations, modified }`. Returns `valid:false` with "no files modified" if nothing has changed, or with violation list if any file is outside mutableFiles.

2. **`_evalMetric(cwd, verifyCmd, timeoutMs)`** — Runs verify command via `spawnSync` with `shell: true`. Handles three CRASH reasons: timeout (SIGTERM/ETIMEDOUT), nonzero_exit (status !== 0), unparseable_metric (last stdout line is not a finite number). Returns `{ status: 'ok', metric_value }` on success.

3. **`_compareMetric(newValue, bestMetric, direction)`** — Returns 'KEEP' or 'DISCARD'. Always KEEP on first iteration (bestMetric === null). Direction 'max': KEEP if newValue > bestMetric. Direction 'min': KEEP if newValue < bestMetric.

4. **`_writeJsonlRow(cwd, slug, rowData)`** — Appends JSONL row to `.planning/experiments/{slug}/results.jsonl`. Restricts keys to JSONL_ROW_FIELDS (9 fields), auto-generates `id` and `ts`.

5. **`_extractDiff(cwd, baseline, files)`** — Returns `git diff baseline HEAD -- files` string, or null on failure.

Also extended `JSONL_ROW_FIELDS` in `experiment-schema.cjs` from 8 to 9 fields (added `tokens_used`), and updated the phase-101 regression test accordingly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `shell: true` instead of whitespace-split for `_evalMetric`**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Plan spec said "split verifyCmd on whitespace: parts[0] = cmd, parts.slice(1) = args". Whitespace-split passes quoted args literally (e.g., `"process.exit(1)"` stays quoted), causing wrong behavior.
- **Fix:** Use `spawnSync(verifyCmd, [], { shell: true })` — passes full string to shell, correctly handles quoted args and shell syntax.
- **Files modified:** bin/lib/experiment-runner.cjs

**2. [Rule 1 - Bug] Used `git status --porcelain` instead of `git diff --name-only` for `_checkModifiedFiles`**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Plan spec said to use `git diff --name-only HEAD`. This misses newly created (untracked) files — which is the most common case when an agent creates a new file to target.
- **Fix:** Use `git status --porcelain` which returns all changes including untracked files.
- **Files modified:** bin/lib/experiment-runner.cjs

## Test Results

- Phase 102: 22/22 tests pass (all 4 new test files)
- Phase 101 regression: 9/9 tests pass (JSONL_ROW_FIELDS extension verified)
