---
slug: pipeline-upstream-system
metric: dom_structure_score
direction: max
verify: node bin/pipeline-brief-wireframe-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/system.md
immutable_files: []
iteration_budget: 20
time_budget_minutes: 90
---

## Search Space

Optimize prose in `workflows/system.md` within `<!-- OPTIMIZABLE -->` markers. Focus on design token generation, color palette guidance, typography scale, spacing system definition. Do NOT modify: Step 1 (init), artifact schema writes, error messages, LOCKED sections.

## Upstream Isolation

This is one leg of a PIPE-03 upstream isolation experiment. The purpose is to attribute which upstream skill — `brief.md` or `system.md` — drives the largest improvement in downstream wireframe visual quality.

**How to use:** Compare the `metric_delta` values from this template's `results.jsonl` against the `results.jsonl` from `pipeline-brief-to-wireframe.md`. The template that achieves the higher cumulative `metric_delta` over its iteration budget is the upstream skill with the largest downstream visual impact.

Both templates use the same `pipeline-brief-wireframe-metric.cjs` wrapper (PIPE-04 multi-stage chain) and the same fixture (`good-wireframe.html`) — this ensures apples-to-apples comparison. The metric is identical (`dom_structure_score`, direction `max`), so results are directly comparable without normalization.

## Stopping Rationale

Halt at consecutive_failure_limit (3), no_progress_limit (8), or iteration_budget (20).
