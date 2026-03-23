---
slug: pipeline-brief-wireframe
metric: dom_structure_score
direction: max
verify: node bin/pipeline-brief-wireframe-metric.cjs references/experiments/fixtures/good-wireframe.html
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 20
time_budget_minutes: 90
---

## Search Space

Optimize prose in `workflows/brief.md` within `<!-- OPTIMIZABLE -->` markers. Focus on brief generation prompts, output structure guidance, downstream wireframe quality hints. Do NOT modify: Step 1 (init), artifact schema writes, error messages, LOCKED sections.

## Proxy Rationale

This is a pipeline proxy experiment (PIPE-01, PIPE-02). The verify command uses `pipeline-brief-wireframe-metric.cjs` which chains two stages:

- **Stage 1** (upstream skill passthrough): In Phase 113 fixture mode, the upstream measurement is a passthrough — no live skill invocation. Future phases will replace this with actual `pde-tools.cjs invoke brief` and `pde-tools.cjs invoke wireframe` calls.
- **Stage 2** (terminal DOM metric): `dom-metric.cjs` evaluates the fixture wireframe HTML, measuring DOM structure quality (semantic elements, landmark coverage, heading hierarchy, interactive elements).

This multi-stage wrapper (PIPE-04) enables future live pipeline measurement by replacing Stage 1 with actual skill invocations without changing the experiment template. `brief.md` mutations that improve downstream wireframe structure are captured by this pipeline metric — the verify command provides an apples-to-apples comparison basis when compared against upstream isolation experiments targeting other skills (e.g., `pipeline-upstream-isolation.md`).

## Stopping Rationale

Halt at consecutive_failure_limit (3), no_progress_limit (8), or iteration_budget (20).
