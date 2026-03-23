---
slug: opportunity-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/opportunity.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/opportunity.md` within `<!-- OPTIMIZABLE -->` markers. Focus on opportunity framing, analysis structure, gap identification instructions, prioritization guidance. Do NOT modify: Step 1 (init), artifact schema writes (OPP code), error messages, `<!-- LOCKED -->` sections.

## Constraints

Only modify `<!-- OPTIMIZABLE -->` sections. Nyquist pass count measures structural quality of opportunity analysis output. Mutations must remain within annotated zones — no changes to tool call blocks, schema field names, or error message format strings.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
