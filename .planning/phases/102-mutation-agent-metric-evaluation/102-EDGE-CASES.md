---
phase: 102-mutation-agent-metric-evaluation
generated: "2026-03-23T00:00:00Z"
finding_count: 5
high_count: 2
has_bdd_candidates: true
---

# Phase 102: Edge Cases

**Generated:** 2026-03-23
**Findings:** 5 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] _checkModifiedFiles uses `git diff --name-only HEAD` which shows unstaged changes — if editor saves to a temp file not yet staged, violations may be false positives

**Plan element:** `bin/lib/experiment-runner.cjs` (`_checkModifiedFiles`)
**Category:** boundary_condition

The boundary check diffs against HEAD, but an agent Edit may not have been git-staged before the check runs. Depending on how pde-tools.cjs invokes the check (before or after staging), the modified file list could differ from what `git diff HEAD` reports.

**BDD Acceptance Criteria Candidate:**
```
Given an agent edits a mutable file that has not been staged
When _checkModifiedFiles is called
Then it returns the edited file in the modified list (not an empty list)
```

### 2. [HIGH] _writeJsonlRow uses fs.appendFileSync to a path that may not exist if ensureExperimentDirs was not called — silent ENOENT crash

**Plan element:** `bin/lib/experiment-runner.cjs` (`_writeJsonlRow`)
**Category:** error_path

The function constructs the results.jsonl path and calls appendFileSync. If the `.planning/experiments/{slug}/` directory has not been created (ensureExperimentDirs from experiment-schema.cjs was never called), the append will throw ENOENT. The task action does not mention creating the directory or handling the missing-dir case.

**BDD Acceptance Criteria Candidate:**
```
Given the slug directory does not exist
When _writeJsonlRow is called
Then it either creates the directory or returns a structured error instead of throwing
```

### 3. [MEDIUM] eval-metric subcommand in pde-tools.cjs reads EXPERIMENT-BEST.json for bestMetric — if the file does not exist (first iteration), readBest returns null, but the action does not specify null-handling for metric_delta calculation

**Plan element:** `bin/pde-tools.cjs` (`eval-metric` subcommand action, Plan 02 Task 2)
**Category:** empty_state

The action says "calls _compareMetric with bestMetric from EXPERIMENT-BEST.json (via readBest)". For the first iteration, bestMetric is null. _compareMetric handles null correctly (returns KEEP), but metric_delta is `newValue - bestMetric` which would be `42.5 - null = NaN`. The JSONL row would contain NaN in metric_delta.

### 4. [MEDIUM] check-boundaries subcommand in pde-tools.cjs reads experiment.md from `--slug` arg — no error handling specified if slug directory or experiment.md does not exist

**Plan element:** `bin/pde-tools.cjs` (`check-boundaries` subcommand, Plan 02 Task 2)
**Category:** empty_state

The action specifies "If parseExperimentFile returns invalid, calls error() with the errors." But it does not specify what happens when the file does not exist at all (vs. existing but being invalid). A missing experiment.md would cause parseExperimentFile to throw or return an unrecoverable parse error before the validation check runs.

### 5. [LOW] Agent instructions say tokens_used is null (populated by orchestrator) — but write-row subcommand in pde-tools.cjs has --tokens_used as a required CLI flag with no documented default

**Plan element:** `agents/pde-experiment-runner.md` (Return Format section)
**Category:** boundary_condition

The agent return format documents `tokens_used: null` with orchestrator populating it. But the write-row subcommand accepts `--tokens_used` as a positional argument. If the orchestrator passes 0 or omits the flag, it's unclear whether `_writeJsonlRow` defaults to null or errors.

