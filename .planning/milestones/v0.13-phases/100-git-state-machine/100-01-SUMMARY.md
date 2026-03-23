---
phase: "100"
plan: "01"
name: "Git State Machine"
subsystem: "experiment-infrastructure"
one-liner: "experiment.cjs CJS module implementing 6-command git state machine (init/commit/reset/promote/status/cleanup) with branch isolation, prefix-guarded reset, cherry-pick promotion, and boundary validation from experiment-boundaries.md YAML"
tags: [git, state-machine, experiment, branch-isolation, tdd]

dependency-graph:
  requires:
    - bin/lib/core.cjs (execGit, output, error)
    - references/experiment-boundaries.md (SAFE-04 boundary spec)
  provides:
    - bin/lib/experiment.cjs (git state machine module)
    - tests/phase-100/experiment-state-machine.test.mjs (unit tests)
  affects:
    - bin/pde-tools.cjs (Phase 101: GIT-05 will wire experiment subcommands)
    - Phase 101-107 (all depend on experiment.cjs as foundation)

tech-stack:
  added:
    - name: "experiment.cjs"
      notes: "289-line CJS module, zero new npm deps, uses existing execGit from core.cjs"
  patterns:
    - "Underscore helpers (_init, _commit, etc.) for testability without process.exit"
    - "TDD RED/GREEN cycle with temp git repos via mkdtempSync"
    - "YAML frontmatter parsing via line-by-line parser (no yaml library)"
    - "Force checkout (-f) when switching from experiment branch with untracked state files"

key-files:
  created:
    - path: bin/lib/experiment.cjs
      role: "Git state machine — complete experiment lifecycle"
    - path: tests/phase-100/experiment-state-machine.test.mjs
      role: "23 unit tests covering all 7 exported functions"
  modified: []

key-decisions:
  - "_checkBoundaries uses force checkout (-f) for branch switch: EXPERIMENT-BEST.json is metadata written post-commit and must not block git checkout — reading state before switching preserves correctness"
  - "Underscore helpers pattern: cmd* wrappers call output()/error() (process.exit); _* helpers return result objects — tests call _* directly to avoid in-process exit"
  - "git add -A in _commit stages EXPERIMENT-BEST.json — this is intentional; state file is part of experiment snapshot but read before branch switch so -f is safe"

metrics:
  duration_minutes: 15
  completed_date: "2026-03-23"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
  tests_added: 23
  tests_passing: 23

requirements-completed: [GIT-01, GIT-02, GIT-03, GIT-04]
---

# Phase 100 Plan 01: Git State Machine Summary

experiment.cjs CJS module implementing 6-command git state machine with branch isolation, double-guarded reset, cherry-pick promotion, and boundary validation.

## What Was Built

`bin/lib/experiment.cjs` — a 289-line CJS module (under the 300-line ceiling) that manages the full experiment lifecycle:

1. **cmdExperimentInit** — validates slug (`/^[a-z0-9-]+$/`), reads HEAD SHA as baseline, creates `experiment/slug` branch via `execGit checkout -b`, writes initial EXPERIMENT-BEST.json
2. **cmdExperimentCommit** — stages all changes via `git add -A`, commits with `experiment(slug): description` prefix, tracks best metric (max direction by default), updates EXPERIMENT-BEST.json
3. **cmdExperimentReset** — double-guarded: checks current branch is `experiment/slug` AND HEAD commit starts with `experiment(slug):` prefix; only then fires `git reset --hard HEAD~1`; either guard failure returns reset: false without git mutation
4. **cmdExperimentPromote** — reads bestCommit from EXPERIMENT-BEST.json, force-checkouts main (`-f`), cherry-picks bestCommit (not merge — keeps main history clean per GIT-03)
5. **cmdExperimentStatus** — reads EXPERIMENT-BEST.json, returns found: true/false with full state
6. **cmdExperimentCleanup** — force-checkouts main, deletes `experiment/slug` branch via `git branch -D`
7. **checkBoundaries** / **_checkBoundaries** — reads `references/experiment-boundaries.md` YAML frontmatter via line-by-line parser, checks mutableFiles against protected_files (exact match) and protected_directories (prefix match)

## Test Coverage

23 tests in `tests/phase-100/experiment-state-machine.test.mjs` covering all behaviors. Tests use temp git repos created via `fs.mkdtempSync` + `git init`. All tests call underscore helpers (`_init`, `_commit`, etc.) directly — avoiding `process.exit()` from cmd* wrappers.

All 23 tests pass: `node --test tests/phase-100/experiment-state-machine.test.mjs` exits 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Force checkout (-f) needed for branch switch in _promote and _cleanup**
- **Found during:** Task 1 — GREEN phase (tests failing for promote and cleanup)
- **Issue:** After `_commit`, EXPERIMENT-BEST.json has unstaged changes (written post-commit by `writeBest`). `git checkout main` fails with "local changes would be overwritten" error.
- **Fix:** Changed both `_promote` and `_cleanup` to use `execGit(cwd, ['checkout', '-f', 'main'])`. State is read from EXPERIMENT-BEST.json BEFORE the branch switch, so the force flag is safe — no data is lost.
- **Files modified:** bin/lib/experiment.cjs
- **Commit:** 8aa4b30

## Self-Check

- bin/lib/experiment.cjs: FOUND
- tests/phase-100/experiment-state-machine.test.mjs: FOUND
- Commits 6d61d0d (test) and 8aa4b30 (feat): FOUND
- Line count: 289 (under 300 ceiling): PASS
- Tests: 23/23 passing: PASS

## Self-Check: PASSED
