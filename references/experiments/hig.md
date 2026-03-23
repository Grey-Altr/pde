---
slug: hig-a11y-detection
metric: a11y_score
direction: max
verify: node bin/a11y-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/hig.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/hig.md` within `<!-- OPTIMIZABLE -->` markers. Focus on HIG evaluation prose, platform-specific accessibility guidance, control labeling instructions, landmark detection heuristics. Do NOT modify: Step 1 (init), artifact schema writes (HIG code, designCoverage), error messages, `<!-- LOCKED -->` sections.

## Constraints

Mutations stay within `<!-- OPTIMIZABLE -->` markers. Fixture measures a11y finding detection quality. For live measurement, update verify to `node bin/a11y-metric.cjs .planning/design/ux/wireframes/WFR-home.html`.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
