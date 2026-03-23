---
phase: 103-orchestrator-command-circuit-breakers
generated: "2026-03-23T00:00:00Z"
finding_count: 5
high_count: 2
has_bdd_candidates: true
---

# Phase 103: Edge Cases

**Generated:** 2026-03-23
**Findings:** 5 (cap: 8)
**HIGH severity:** 2
**BDD candidates:** yes

## Findings

### 1. [HIGH] generateReport crashes when results.jsonl is empty (zero-iteration experiment)

**Plan element:** `bin/lib/experiment-report.cjs`
**Category:** empty_state

When an experiment halts at the cost estimate gate (BREAK-05) or is cancelled at the concurrency check before any iterations run, results.jsonl will not exist or will be empty. The `_generateReport` function reads this file line-by-line. If there are no rows, aggregate calculations (total tokens, improvements kept, cost-per-improvement ratio) will divide by zero or produce NaN.

**BDD Acceptance Criteria Candidate:**
```
Given results.jsonl does not exist for a slug
When _generateReport(cwd, slug, { haltReason: "cost_estimate_declined", baselineMetric: 42 }) is called
Then REPORT.md is written with "Iterations run | 0" and "Improvements kept | 0" without crashing, and cost-per-improvement shows "N/A"
```

### 2. [HIGH] workflows/optimize.md loop state not re-initialized on partial baseline failure

**Plan element:** `workflows/optimize.md`
**Category:** error_path

Step 6 (Capture Baseline Metric) runs `eval-metric` and parses JSON output. If the eval-metric command produces a CRASH outcome (non-zero exit, timeout, malformed output), the workflow proceeds to Step 7 with an undefined `baselineMetric`. The iteration loop then runs with no reference point, and REPORT.md will have a blank baseline metric field.

**BDD Acceptance Criteria Candidate:**
```
Given experiment eval-metric returns CRASH status (non-zero exit code)
When Step 6 of workflows/optimize.md processes the eval-metric output
Then the workflow aborts with a clear error: "Baseline metric evaluation failed: <reason>. Fix the verify command before retrying."
```

### 3. [MEDIUM] checkCircuitBreakers priority order not tested for time_budget vs consecutive_failures simultaneous fire

**Plan element:** `_checkCircuitBreakers`
**Category:** boundary_condition

Test 14 in Plan 01 verifies that iteration_budget fires before time_budget when both would fire. However, there is no test case for the case where time_budget and consecutive_failures both exceed their limits simultaneously. The function checks iteration_budget first, then time_budget, then consecutive_failures — but only the iteration_budget priority is tested. If the priority order is wrong for cases 2 and 3, bugs will be silent.

### 4. [MEDIUM] diff truncation in Step 9 of workflows/optimize.md has no line-count guard

**Plan element:** `workflows/optimize.md`
**Category:** boundary_condition

The action for Step 9 says "truncate to 50 lines if longer, with '... N more lines' footer." The acceptance criteria grep only checks that `diff-summary` appears. If the diff is extremely large (e.g., 10,000 lines for a mutable file with many changes), the truncation logic may not be implemented or may be inconsistently applied across different execution environments.

### 5. [LOW] experiment-report.cjs cmdDiffSummary exports under inconsistent name

**Plan element:** `bin/lib/experiment-report.cjs`
**Category:** error_path

The module exports `_cmdDiffSummary` (with underscore) in the module.exports block shown in the plan's action skeleton. However, Plan 02's interface block refers to it as `_cmdDiffSummary(cwd, slug, raw)`. The pde-tools.cjs dispatch calls `report._cmdDiffSummary(cwd, slug, raw)`. This is consistent within the plans — but the acceptance criteria for Plan 02 only check `grep -q "diff-summary" bin/pde-tools.cjs` and do not verify the export name matches. A rename during implementation would silently break dispatch.
