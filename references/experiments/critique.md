---
slug: critique-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/critique.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/critique.md` within `<!-- OPTIMIZABLE -->` markers. Focus on critique perspective ordering, rubric description text, accessibility analysis guidance, visual hierarchy evaluation prose. Do NOT modify: Step 1 (init), artifact schema writes (CRT code, designCoverage), error messages, MCP probe blocks (AOM/Axe), `<!-- LOCKED -->` sections.

## Constraints

Uses Nyquist pass count as proxy metric. Nyquist tests validate critique output structure, perspective coverage, and finding quality. For browser-backed critique detection, a Phase 113 pipeline experiment can measure a11y-metric.cjs on defective fixtures.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
