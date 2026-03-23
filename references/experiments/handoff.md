---
slug: handoff-completeness
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/handoff.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/handoff.md` within `<!-- OPTIMIZABLE -->` markers. Focus on TypeScript interface completeness guidance, component annotation instructions, developer guidance prose, rendered component coverage. Do NOT modify: Step 1 (init), artifact schema writes (HND code, designCoverage), error messages, `<!-- LOCKED -->` sections.

## Constraints

Mutations stay within `<!-- OPTIMIZABLE -->` markers. DOM structure used as proxy for wireframe quality influenced by handoff guidance. For live measurement, update verify path to project wireframes.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
