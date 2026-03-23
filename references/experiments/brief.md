---
slug: brief-downstream
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/brief.md` within `<!-- OPTIMIZABLE -->` markers. Focus on brief generation prompts, question phrasing, output structure guidance, downstream wireframe quality hints. Do NOT modify: Step 1 (init), artifact schema writes (BRF code, designCoverage), error messages, `<!-- LOCKED -->` sections.

## Constraints

Fixture measures DOM structure as proxy for downstream wireframe quality. Full brief-to-wireframe pipeline measurement is a Phase 113 concern. For live, update verify to point to actual wireframe output.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
