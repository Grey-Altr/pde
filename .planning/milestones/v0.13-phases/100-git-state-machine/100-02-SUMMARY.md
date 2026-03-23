---
phase: 100-git-state-machine
plan: "02"
subsystem: infra
tags: [experiment, cli, dispatch, pde-tools, node]

requires:
  - phase: 100-git-state-machine plan 01
    provides: experiment.cjs git state machine with all 6 cmd functions

provides:
  - "case 'experiment' dispatch block in pde-tools.cjs routing all 6 subcommands"
  - "CLI-accessible experiment init/commit/reset/promote/status/cleanup via pde-tools.cjs"
  - "Usage comment documentation for all 6 experiment subcommands with flags"
  - "Integration test suite (6 tests) spawning pde-tools.cjs process for end-to-end verification"

affects:
  - phase-101-experiment-schema
  - phase-102-runner
  - phase-103-orchestrator
  - phase-104-presets
  - phase-105-researcher
  - phase-106-optimize-command
  - phase-107-nyquist

tech-stack:
  added: []
  patterns:
    - "Lazy require inside case block — experiment.cjs loaded only when experiment subcommand dispatched"
    - "Flag parsing via args.indexOf('--slug') + args[idx+1] pattern consistent with other case blocks"
    - "TDD dispatch integration: spawn pde-tools.cjs via spawnSync, parse --raw JSON output"

key-files:
  created:
    - tests/phase-100/experiment-dispatch.test.mjs
  modified:
    - bin/pde-tools.cjs

key-decisions:
  - "Slug-missing check fires before subcommand routing — produces single unified error that lists available subcommands"
  - "Unknown subcommand check placed in else branch so both missing and unknown produce consistent listing error"
  - "commit subcommand validates --metric is a non-NaN float before calling cmdExperimentCommit"

patterns-established:
  - "Integration tests use spawnSync(process.execPath, [PDE_TOOLS, ...args]) — never execSync shell string"
  - "Dispatch block parses flag value as args[indexOf(flag) + 1] — consistent with other pde-tools.cjs flags"

requirements-completed: [GIT-05]

duration: 12min
completed: 2026-03-23
---

# Phase 100 Plan 02: Git State Machine Dispatch Summary

**pde-tools.cjs experiment dispatch wiring all 6 state machine subcommands (init/commit/reset/promote/status/cleanup) via lazy-require pattern with --slug/--metric/--description flag parsing and 6-test integration suite**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-23T09:10:00Z
- **Completed:** 2026-03-23T09:22:00Z
- **Tasks:** 1 (TDD: 2 commits)
- **Files modified:** 2

## Accomplishments

- Added `case 'experiment'` block to pde-tools.cjs routing all 6 subcommands via lazy require of experiment.cjs
- Parsed `--slug` (required for all), `--metric` (required for commit), `--description` (optional for commit)
- Updated usage comment at top of pde-tools.cjs documenting all 6 experiment subcommands with their flags
- Created 6-test integration suite that spawns pde-tools.cjs via process to verify end-to-end dispatch

## Task Commits

Each task was committed atomically via TDD:

1. **RED: Failing dispatch tests** - `4c607c4` (test)
2. **GREEN: Experiment dispatch implementation** - `7218567` (feat)

## Files Created/Modified

- `bin/pde-tools.cjs` — Added case 'experiment' block (lines 835–866) and usage comment (lines 158–164)
- `tests/phase-100/experiment-dispatch.test.mjs` — 6 integration tests spawning pde-tools.cjs process

## Decisions Made

- Slug-missing check fires before subcommand routing so both "no subcommand + no slug" and "unknown subcommand + no slug" produce a unified error listing all 6 available subcommands — consistent behavior, single error path
- `--metric` validated with `isNaN(parseFloat(...))` before dispatch — NaN metric is rejected with clear error

## Deviations from Plan

None — plan executed exactly as written. Lazy-require pattern, --slug/--metric/--description flag parsing, usage comment update, and integration tests all match spec.

## Issues Encountered

Plan 01 commits existed on `main` but not on the worktree branch. Resolved by `git merge main` to pull in experiment.cjs before implementing dispatch.

## Next Phase Readiness

- All 6 experiment subcommands accessible via `node bin/pde-tools.cjs experiment <subcommand> --slug SLUG`
- Phase 101 (Experiment Schema) and Phase 102 (Runner) can call experiment operations through standard pde-tools.cjs interface
- No blockers

---
*Phase: 100-git-state-machine*
*Completed: 2026-03-23*
