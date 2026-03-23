---
slug: mockup-visual
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/mockup.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/mockup.md` within `<!-- OPTIMIZABLE -->` markers. Focus on visual fidelity layer guidance, color and typography styling instructions, component detail rendering, interactive state representation. Do NOT modify: Step 1 (init), artifact schema writes (mockup-* code, designCoverage), error messages, MCP probe blocks, `<!-- LOCKED -->` sections.

## Constraints

Mutations stay within `<!-- OPTIMIZABLE -->` markers. Same fixture pattern as wireframe. For live measurement, update verify to `node bin/dom-metric.cjs .planning/design/ux/mockups/mockup-dashboard.html`.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
