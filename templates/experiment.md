---
slug: improve-brief-quality
metric: awwwards_score
direction: max
verify: node bin/pde-tools.cjs experiment verify-metric
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 50
time_budget_minutes: 60
---

## Search Space

Optimize the brief generation prompts in `workflows/brief.md` to improve Awwwards rubric scores.

## Constraints

Only modify sections marked with `<!-- OPTIMIZABLE -->` markers.

## Stopping Rationale

Halt when 5 consecutive iterations produce no improvement, or when 50 iterations are reached.
