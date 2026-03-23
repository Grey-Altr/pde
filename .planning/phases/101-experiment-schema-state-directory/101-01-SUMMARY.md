---
phase: 101-experiment-schema-state-directory
plan: 01
subsystem: experiment
tags: [experiment, schema, jsonl, config, tdd, node-test]

requires:
  - phase: 100-git-state-machine
    provides: experiment init/commit/reset/promote/status/cleanup CLI subcommands and EXPERIMENT-BEST.json slug dir creation

provides:
  - experiment-schema.cjs module with parseExperimentFile, _ensureExperimentDirs, _patchExperimentConfig, JSONL_ROW_FIELDS
  - experiment.md template with complete YAML frontmatter schema
  - pde-tools.cjs dispatch for ensure-dirs and patch-config subcommands
  - VALID_CONFIG_KEYS extended with 5 experiment_defaults.* keys
  - 19 unit tests covering all schema parsing, dir creation, and config patching behaviors
  - end-to-end test validating Phase 100 slug dir creation (EXEC-06 Phase 100 boundary)

affects: [102-metric-evaluation, 103-orchestrator, 104-presets, 105-researcher, 106-reporting, 107-nyquist]

tech-stack:
  added: []
  patterns:
    - "New CJS module when existing module is at 300-line ceiling — experiment-schema.cjs avoids touching experiment.cjs at 289 lines"
    - "JSONL_ROW_FIELDS frozen constant as machine-readable contract — downstream consumers import rather than hardcode field names"
    - "extractFrontmatter from frontmatter.cjs for experiment.md parsing (not parseFrontmatter in experiment.cjs which is experiment-boundaries.md-specific)"
    - "TDD RED→GREEN commit sequence for new modules with testable internal helpers"

key-files:
  created:
    - bin/lib/experiment-schema.cjs
    - templates/experiment.md
    - tests/phase-101/experiment-schema.test.mjs
    - tests/phase-101/experiment-dirs.test.mjs
    - tests/phase-101/experiment-config.test.mjs
  modified:
    - bin/pde-tools.cjs
    - bin/lib/config.cjs

key-decisions:
  - "experiment-schema.cjs as NEW module (not extending experiment.cjs) — 300-line ceiling enforcement; scope creep prevention per PITFALLS research"
  - "extractFrontmatter from frontmatter.cjs, not parseFrontmatter from experiment.cjs — parseFrontmatter only handles experiment-boundaries.md shape"
  - "_ensureExperimentDirs creates parent .planning/experiments/ only (not per-slug dirs) — per-slug creation is lazy via Phase 100 experiment init writeBest"
  - "JSONL_ROW_FIELDS as Object.freeze() constant — immutable contract; Phase 102 imports rather than hardcodes field names (EXEC-05)"
  - "End-to-end slug structure test validates Phase 100's EXPERIMENT-BEST.json creation — EXEC-06 boundary: Phase 101 guarantees parent dir, Phase 100 guarantees slug dir, Phase 102 will add experiment.md copy and results.jsonl"

patterns-established:
  - "Experiment data contracts defined once in experiment-schema.cjs, consumed by all downstream phases (102-107)"
  - "JSONL_ROW_FIELDS constant import pattern — Phase 102 uses require('./experiment-schema.cjs').JSONL_ROW_FIELDS"

requirements-completed: [EXEC-01, EXEC-05, EXEC-06, OBS-03, OBS-04]

duration: 15min
completed: 2026-03-23
---

# Phase 101 Plan 01: Experiment Schema and State Directory Summary

**experiment-schema.cjs with parseExperimentFile, JSONL_ROW_FIELDS frozen 8-field contract, directory init, and idempotent config patching — plus experiment.md template and 19 TDD tests GREEN**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-23T10:24:00Z
- **Completed:** 2026-03-23T10:39:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created bin/lib/experiment-schema.cjs (190 lines, well under 300-line ceiling) with all four exports: parseExperimentFile, _ensureExperimentDirs, _patchExperimentConfig, JSONL_ROW_FIELDS
- Exported JSONL_ROW_FIELDS as a frozen 8-field array constant — machine-readable contract for Phase 102 consumers (EXEC-05)
- Wired ensure-dirs and patch-config subcommands into pde-tools.cjs dispatch; both work without --slug flag
- Extended VALID_CONFIG_KEYS in config.cjs with 5 experiment_defaults.* keys for user-level overrides
- 19 unit tests all GREEN; Phase 100 regression (6 tests) all GREEN

## Task Commits

Each task was committed atomically:

1. **TDD RED: Add failing tests for experiment-schema module** - `e51d7ec` (test)
2. **Task 1: Implement experiment-schema.cjs and experiment.md template** - `4951657` (feat)
3. **Task 2: Wire ensure-dirs and patch-config into pde-tools.cjs** - `e78ceb4` (feat)

## Files Created/Modified

- `bin/lib/experiment-schema.cjs` - New schema module: parseExperimentFile, _ensureExperimentDirs, _patchExperimentConfig, JSONL_ROW_FIELDS
- `templates/experiment.md` - User-facing experiment.md template with full YAML frontmatter schema
- `tests/phase-101/experiment-schema.test.mjs` - Unit tests for parseExperimentFile and JSONL_ROW_FIELDS (9 tests)
- `tests/phase-101/experiment-dirs.test.mjs` - Tests for _ensureExperimentDirs and end-to-end slug structure (5 tests)
- `tests/phase-101/experiment-config.test.mjs` - Tests for _patchExperimentConfig idempotency and preservation (5 tests)
- `bin/pde-tools.cjs` - Added ensure-dirs and patch-config dispatch branches; updated slug guard and error messages
- `bin/lib/config.cjs` - Added 5 experiment_defaults.* keys to VALID_CONFIG_KEYS

## Decisions Made

- experiment-schema.cjs as NEW module: experiment.cjs is at 289/300 line ceiling; adding schema parsing there would trigger the ceiling; new module is cleaner and keeps each module focused
- Used extractFrontmatter from frontmatter.cjs (not parseFrontmatter from experiment.cjs): the experiment.cjs parseFrontmatter is experiment-boundaries.md-specific (expects protected_files/protected_directories arrays only)
- JSONL_ROW_FIELDS as Object.freeze(): immutable contract prevents accidental mutation; Phase 102 consumers get a stable reference

## Deviations from Plan

None - plan executed exactly as written. The TDD RED→GREEN→task2 commit sequence followed the plan's tdd="true" attribute on Task 1.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 102 can import parseExperimentFile and JSONL_ROW_FIELDS from experiment-schema.cjs for metric evaluation
- _ensureExperimentDirs and _patchExperimentConfig available for setup commands in Phase 102 runner init
- EXEC-06 boundary: Phase 102 needs to add experiment.md copy and results.jsonl creation to complete the slug directory structure

---
*Phase: 101-experiment-schema-state-directory*
*Completed: 2026-03-23*
