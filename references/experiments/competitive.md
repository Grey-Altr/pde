---
slug: competitive-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/competitive.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/competitive.md` within `<!-- OPTIMIZABLE -->` markers. Focus on competitive analysis guidance, comparison framing, feature matrix instructions, market positioning prose. Do NOT modify: Step 1 (init), artifact schema writes (CMP code), error messages, `<!-- LOCKED -->` sections.

## Constraints

Only modify `<!-- OPTIMIZABLE -->` sections. Nyquist pass count measures structural quality of competitive analysis output. Mutations must stay within annotated zones — no changes to tool call blocks, schema field names, or error message format strings.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
