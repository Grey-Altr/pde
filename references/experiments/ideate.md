---
slug: ideate-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/ideate.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/ideate.md` within `<!-- OPTIMIZABLE -->` markers. Focus on ideation prompts, concept framing, divergent thinking guidance, output format diversity. Do NOT modify: Step 1 (init), artifact schema writes (IDT code), error messages, `<!-- LOCKED -->` sections.

## Constraints

Only modify `<!-- OPTIMIZABLE -->` sections. Nyquist pass count measures structural quality of ideation output. Mutations must remain within annotated zones — no changes to tool call blocks, schema field names, or error message format strings.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
