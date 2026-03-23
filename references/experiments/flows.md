---
slug: flows-mermaid
metric: mermaid_readability_score
direction: max
verify: node bin/mermaid-metric.cjs references/experiments/fixtures/mermaid-simple.md
mutable_files:
  - workflows/flows.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 60
---

## Search Space

Optimize prose in `workflows/flows.md` within `<!-- OPTIMIZABLE -->` markers. Focus on node count guidance (prevent >15 nodes), edge density instructions, diagram scope per persona (one journey per diagram), Mermaid syntax quality. Do NOT modify: artifact schema writes (FLW code, FLW-screen-inventory.json), Step 1 (init), `<!-- LOCKED -->` sections.

## Constraints

Mutations stay within `<!-- OPTIMIZABLE -->` markers. Fixture measures Mermaid readability. For live measurement, update verify to `node bin/mermaid-metric.cjs .planning/design/ux/FLW-flows-v1.md`.

## Stopping Rationale

Halt at consecutive_failure_limit (5), no_progress_limit (10), or iteration_budget (30).
