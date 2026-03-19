---
phase: 47-story-file-sharding
plan: 01
subsystem: infra
tags: [sharding, pde-tools, task-files, context-reduction, tdd, node-test]

requires:
  - phase: 46-methodology-foundation
    provides: frontmatter.cjs extractFrontmatter API used to parse PLAN.md metadata

provides:
  - bin/lib/sharding.cjs with shardPlan() and resolveTaskPath() exports
  - shard-plan CLI subcommand in pde-tools.cjs
  - Per-task file generation from PLAN.md task blocks
  - Task file schema: phase/plan/task/task_of frontmatter + verbatim action/read_first/AC/verify/done

affects: [47-02, 48-ac-first-planning, 51-workflow-tracking, execute-phase.md orchestrator]

tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN with node:test built-in (no framework install required)"
    - "Deterministic document transformation: regex extraction over PLAN.md XML-like task blocks"
    - "Plan-scoped tasks directory naming: {plan-prefix}-tasks/ co-located with PLAN.md"
    - "Zero-padded 3-digit task file numbering: task-001.md through task-NNN.md"

key-files:
  created:
    - bin/lib/sharding.cjs
    - tests/phase-47/sharding.test.mjs
    - tests/phase-47/task-file-content.test.mjs
    - tests/phase-47/executor-path-resolution.test.mjs
  modified:
    - bin/pde-tools.cjs

key-decisions:
  - "TDD plans exempted from sharding regardless of task count — RED-GREEN-REFACTOR sequence requires cross-task test failure context"
  - "resolveTaskPath() exported from sharding.cjs for use by execute-phase.md orchestrator — double-checks both directory and specific file existence before task file mode"
  - "must_haves artifacts filtered to task-relevant files only; truths included in full (all are short strings relevant to executor self-check)"

patterns-established:
  - "shardPlan() idempotent: overwrites existing task files on every call — safe to run in revision loops"
  - "Task file isolation: each file contains only its own task content — no adjacent task leakage"

requirements-completed: [PLAN-01]

duration: 4min
completed: 2026-03-19
---

# Phase 47 Plan 01: Story-File Sharding — Sharding Library Summary

**shardPlan() library that converts PLAN.md into zero-padded per-task files with verbatim content, registered as pde-tools shard-plan subcommand, with TDD exemption and threshold logic**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T19:48:47Z
- **Completed:** 2026-03-19T19:52:57Z
- **Tasks:** 2 (TDD task with RED + GREEN commits + non-TDD task)
- **Files modified:** 5

## Accomplishments

- Implemented `shardPlan(planPath, options)` in `bin/lib/sharding.cjs`: reads PLAN.md, extracts task blocks via `/<task[\s>]/gi`, writes self-contained `task-NNN.md` files with zero-padded names
- Implemented `resolveTaskPath(phaseDir, planPrefix, taskNum, planFile)`: conditional task file vs PLAN.md fallback with double-check on directory and file existence
- Registered `case 'shard-plan':` in `bin/pde-tools.cjs` dispatch with `--threshold` option support
- 18 passing tests across 3 files covering all plan requirements (threshold, TDD exemption, verbatim content, frontmatter schema, path resolution)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for sharding library** - `3d0377e` (test)
2. **Task 1 GREEN: Implement sharding library** - `215eaad` (feat)
3. **Task 2: Register shard-plan CLI command and path resolution tests** - `ae06ad8` (feat)

## Files Created/Modified

- `bin/lib/sharding.cjs` — shardPlan() and resolveTaskPath() exports, extractTaskBlocks/extractField/hasTddTasks/extractObjective helpers
- `bin/pde-tools.cjs` — shard-plan case added to switch dispatch, docblock updated with Sharding section
- `tests/phase-47/sharding.test.mjs` — 6 tests: threshold, count, TDD exemption, custom threshold, idempotency
- `tests/phase-47/task-file-content.test.mjs` — 9 tests: verbatim action/read_first/AC/verify/done, frontmatter fields, task isolation
- `tests/phase-47/executor-path-resolution.test.mjs` — 3 tests: task file resolution, PLAN.md fallback (no dir), PLAN.md fallback (missing task file)

## Decisions Made

- TDD plans exempted via `tdd="true"` attribute detection — RED-GREEN sequence cannot be split across files
- `resolveTaskPath()` double-checks both directory AND specific file existence — defends against Pitfall 5 from research
- `must_haves.truths` included in full in all task files (short); `artifacts` filtered to task-relevant paths only
- Task file naming uses plan basename to derive prefix: `47-01-PLAN.md` → `47-01-tasks/`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all tests passed on first implementation pass.

## Next Phase Readiness

- `shardPlan()` and `resolveTaskPath()` ready for Plan 02 integration (plan-phase.md post-generation sharding step + execute-phase.md conditional task file loading)
- Task file schema established with phase/plan/task/task_of frontmatter — Phase 48 can add `ac_refs` without schema change
- `task_of` field in frontmatter provides total-task signal Phase 51 needs for workflow-status.md initialization

---
*Phase: 47-story-file-sharding*
*Completed: 2026-03-19*
