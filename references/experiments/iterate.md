---
slug: iterate-improvement
metric: a11y_score
direction: max
verify: node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/iterate.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/iterate.md` within `<!-- OPTIMIZABLE -->` markers. Focus on iteration action list processing, before/after visual delta improvement guidance, accessibility-focused iteration priorities, critique-to-action mapping quality. Do NOT modify: Step 1 (init), artifact schema writes, error messages, `<!-- LOCKED -->` sections.

## Constraints

Mutations stay within `<!-- OPTIMIZABLE -->` markers. Fixture measures a11y quality. For live measurement, update verify to `node bin/a11y-metric.cjs .planning/design/ux/wireframes/WFR-home-v2.html`.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
