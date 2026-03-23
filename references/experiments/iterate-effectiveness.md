---
slug: iterate-effectiveness
metric: iterate_improvement_delta
direction: max
verify: node bin/iterate-effectiveness-metric.cjs --fixture references/experiments/fixtures/bad-wireframe.html references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/iterate.md
immutable_files: []
iteration_budget: 20
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/iterate.md` within `<!-- OPTIMIZABLE -->` markers. Focus on iteration action list processing, before/after visual delta improvement guidance, accessibility-focused iteration priorities, critique-to-action mapping quality. Do NOT modify: Step 1 (init), artifact schema writes, error messages, `<!-- LOCKED -->` sections.

## Fixture Rationale

The fixture pair (`bad-wireframe.html` as pre-iterate, `good-wireframe.html` as post-iterate) simulates a before/after iterate scenario. The metric measures how much DOM quality improves between the pair. Larger delta = better iterate guidance prose. The `iterate-effectiveness-metric.cjs` script calls `dom-metric.cjs` on both fixtures and computes `post_score - pre_score`.

For live measurement (Phase 116+), update `verify` to invoke `/pde:iterate` on actual wireframes and measure the delta on real output rather than the fixture pair.

## Convergence Speed

ITER-04 convergence speed tracking: the primary `metric_value` in `results.jsonl` is the delta score per iteration. Convergence speed (iterations until delta plateaus below threshold of 2.0 points for 3 consecutive iterations) is a derived statistic computed from the JSONL history in the experiment report. This is NOT a separate metric output — it is a post-hoc analysis performed after the experiment run completes.

## Stopping Rationale

Halt at consecutive_failure_limit (3), no_progress_limit (8), or iteration_budget (20).
