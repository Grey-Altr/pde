---
slug: deploy-quality
metric: nyquist_pass_count
direction: max
verify: node bin/nyquist-metric.cjs
mutable_files:
  - workflows/deploy.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/deploy.md` within `<!-- OPTIMIZABLE -->` markers. Focus on deploy checklist framing, pre-deploy verification guidance, post-deploy smoke test instructions, environment configuration prose. Do NOT modify: Step 1 (init), artifact schema writes (deploy-manifest.json fields, designCoverage), error messages, MCP probe blocks, `<!-- LOCKED -->` sections.

## Constraints

Only modify `<!-- OPTIMIZABLE -->` sections. Nyquist pass count measures structural quality of deploy workflow output. Mutations must remain within the annotated optimizable zones — no changes to tool call blocks, schema writes, or error message format strings.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
