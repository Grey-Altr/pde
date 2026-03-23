---
phase: 102-mutation-agent-metric-evaluation
plan: "02"
subsystem: experiment-runner-agent
tags: [experiment, agent, pde-tools, haiku, tdd, boundary-enforcement]
one_liner: "pde-experiment-runner agent (Haiku-first, minimal context, diff-based) + check-boundaries/eval-metric/write-row dispatch in pde-tools.cjs"
dependency_graph:
  requires: [102-01]
  provides: [agents/pde-experiment-runner.md, pde-tools experiment check-boundaries, pde-tools experiment eval-metric, pde-tools experiment write-row]
  affects: [103]
tech_stack:
  added: [agents/pde-experiment-runner.md, tests/phase-102/experiment-runner-agent.test.mjs, tests/phase-102/experiment-runner-pde-tools.test.mjs]
  patterns: [agent-definition frontmatter, YAML allowed-tools, argument-hint, pde-tools dispatch, output() from core.cjs]
key_files:
  created:
    - agents/pde-experiment-runner.md
    - tests/phase-102/experiment-runner-agent.test.mjs
    - tests/phase-102/experiment-runner-pde-tools.test.mjs
  modified:
    - bin/pde-tools.cjs
key_decisions:
  - "import output from core.cjs in pde-tools.cjs -- it was missing (only error was imported); new runner subcommands call output() directly"
  - "Read EXPERIMENT-BEST.json directly (JSON.parse) instead of via readBest -- readBest is not exported from experiment.cjs"
  - "agent: tokens_used set to null (not 0) in return format -- orchestrator populates from API metadata"
metrics:
  duration: "~15 min"
  completed: "2026-03-23"
  tasks: 2
  files: 3
---

# Phase 102 Plan 02: Mutation Agent & Metric Evaluation Summary

pde-experiment-runner agent (Haiku-first, minimal context, diff-based) + check-boundaries/eval-metric/write-row dispatch in pde-tools.cjs

## What Was Built

### Task 1: pde-experiment-runner agent definition

New `agents/pde-experiment-runner.md` (136 lines) following the pde-research-validator.md frontmatter pattern:

**Frontmatter:**
- `name: pde-experiment-runner`
- `model: haiku` (Haiku-first per SELF-07)
- `allowed-tools: [Read, Edit, Bash]`
- `argument-hint: "[experiment-md-path] [iteration] [baseline-sha] [context-mode full|diff]"`

**Body sections:**
1. **Context Window** (SELF-06): 4 inputs only (experiment.md, file/diff, last 3 results rows, prior metric). Zero project context, no codebase maps.
2. **Iteration Protocol**: 11-step boundary-check/eval-metric/write-row workflow with explicit violation handling.
3. **Model Escalation** (SELF-07): Haiku default, `consecutive_violations` tracked by orchestrator, escalates to Sonnet after 3 failures, no de-escalation.
4. **Diff-Based Context** (SELF-08): full on iter 1, diff on iter 2+, empty diff falls back to full read.
5. **Return Format** (EXEC-02): 6-field JSON (`iteration`, `metric_value`, `metric_delta`, `status`, `description`, `tokens_used: null`).
6. **Boundary Enforcement** (EXEC-03): LOCKED section awareness, violation = discard + retry different change.

### Task 2: pde-tools.cjs dispatch (check-boundaries, eval-metric, write-row)

Three new subcommands added to the experiment dispatch block:

**`experiment check-boundaries --slug SLUG`**
- Reads `experiment.md` via `parseExperimentFile`
- Calls `_checkModifiedFiles(cwd, parsed.mutable_files)`
- Returns `{ valid, violations, modified }` JSON

**`experiment eval-metric --slug SLUG`**
- Reads `experiment.md` to get verify command + direction
- Calls `_evalMetric(cwd, parsed.verify, 30000)`
- Reads bestMetric from `EXPERIMENT-BEST.json` directly
- Calls `_compareMetric(metric_value, bestMetric, direction)`
- Returns `{ status, metric_value, decision, metric_delta }` JSON

**`experiment write-row --slug SLUG --iteration N --metric_value V --metric_delta D --status S --description TEXT --tokens_used T`**
- Parses all flag arguments
- Calls `_writeJsonlRow(cwd, slug, rowData)`
- Returns the written row JSON

Updated slug-missing error message to list all 11 subcommands (including the 3 new ones).

## Also Executed (Plan 01 was not yet done)

Since Plan 01 hadn't run before this agent was spawned, this execution also completed Plan 01:

- Extended `JSONL_ROW_FIELDS` in `experiment-schema.cjs` to 9 fields (added `tokens_used`)
- Created `bin/lib/experiment-runner.cjs` with 5 exported helpers
- Created 4 test files in `tests/phase-102/` covering all helper behaviors
- Updated phase-101 regression test to expect 9 JSONL_ROW_FIELDS

## Deviations from Plan

### Auto-fixed Issues (Plan 01)

**1. [Rule 1 - Bug] Used `shell: true` for `_evalMetric` instead of whitespace-split**
- **Found during:** Plan 01, Task 1 (GREEN phase)
- **Issue:** Whitespace-split fails with shell quoting. `node -e "process.exit(1)"` passed as `['node', '-e', '"process.exit(1)"']` causes node to evaluate a string expression, exiting 0 with empty output.
- **Fix:** `spawnSync(verifyCmd, [], { shell: true })` — full command string to shell.
- **Files modified:** `bin/lib/experiment-runner.cjs`

**2. [Rule 1 - Bug] Used `git status --porcelain` instead of `git diff --name-only HEAD`**
- **Found during:** Plan 01, Task 1 (GREEN phase)
- **Issue:** `git diff --name-only HEAD` misses newly created (untracked) files. Agent Edit tool creates new files which show as `?? filename` in git status, not in diff output.
- **Fix:** `git status --porcelain` detects all changes including untracked.
- **Files modified:** `bin/lib/experiment-runner.cjs`

### Auto-fixed Issues (Plan 02)

**3. [Rule 3 - Blocking] Added `output` import to pde-tools.cjs**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** `output` was not imported in pde-tools.cjs (only `error` was). The new subcommands call `output()` directly.
- **Fix:** Changed `const { error } = require('./lib/core.cjs')` to `const { error, output } = require('./lib/core.cjs')`.
- **Files modified:** `bin/pde-tools.cjs`

**4. [Rule 1 - Bug] Read EXPERIMENT-BEST.json directly instead of via `readBest`**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Plan spec says "via readBest from experiment.cjs" but `readBest` is not exported from experiment.cjs.
- **Fix:** `JSON.parse(fs.readFileSync(bestJsonPath, 'utf-8'))` directly — functionally identical.
- **Files modified:** `bin/pde-tools.cjs`

## Test Results

- Phase 102: 37/37 tests pass (all 5 test files)
- Phase 101 regression: 19/19 tests pass
- Phase 100 regression: 29/29 tests pass
