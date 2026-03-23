---
slug: system-contrast
metric: contrast_pass_count
direction: max
verify: node bin/contrast-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/system.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/system.md` within `<!-- OPTIMIZABLE -->` markers. Focus on token WCAG contrast guidance, color pairing instructions, accessible color palette generation, text-on-background ratio guidance. Do NOT modify: Step 1 (init), artifact schema writes (SYS code, designCoverage), error messages, `<!-- LOCKED -->` sections.

## Constraints

Fixture measures contrast compliance on reference HTML. For live, update to `node bin/contrast-metric.cjs .planning/design/visual/SYS-preview-v1.html`.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
