---
slug: wireframe-visual
metric: dom_structure_score
direction: max
verify: node bin/dom-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/wireframe.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/wireframe.md` within `<!-- OPTIMIZABLE -->` markers. Focus on semantic HTML guidance (landmark elements: nav, main, header, footer, aside), heading hierarchy instructions (h1-h2-h3 progression), interactive element labeling guidance (button, input, select with aria-label), anti-pattern guidance (div-soup prevention). Do NOT modify: Step 1 (init), artifact schema writes (WFR code, designCoverage), error message strings, MCP probe blocks, `<!-- LOCKED -->` sections.

## Constraints

Mutations stay within `<!-- OPTIMIZABLE -->` markers. Fixture measures mutation agent guidance quality. For live measurement, update verify to `node bin/dom-metric.cjs .planning/design/ux/wireframes/WFR-home.html`.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
