# Feature Research

**Domain:** Autonomous experiment loop — self-optimizing agent primitive for PDE (v0.13 AutoResearch)
**Researched:** 2026-03-23
**Confidence:** HIGH (Karpathy autoresearch repo + program.md verified via GitHub; uditgoenka/autoresearch Claude Code skill verified via WebFetch; autoexp generalization verified via GitHub Gist; multiple ecosystem sources cross-referenced; Goodhart's Law failure modes confirmed via alignment literature; PDE infrastructure dependencies verified against PROJECT.md and codebase structure)

---

> **Scope note:** This file covers ONLY what v0.13 adds to PDE. The autonomous experiment loop is a new primitive — a `/pde:optimize` skill, an experiment phase type, a git state machine, and a metric-driven keep/discard mechanism. All existing PDE infrastructure (14-stage design pipeline, atomic commit model, Nyquist tests, self-improvement fleet, event bus, tmux dashboard, worktree isolation, readiness gate, plan-phase, execute-phase) is treated as stable dependency layer. Features are categorized as: table stakes (loop cannot function without them), differentiators (what makes PDE's loop better than a bare Karpathy-style script), and anti-features (commonly requested, would undermine the loop's reliability).

---

## The Karpathy AutoResearch Pattern

Karpathy released autoresearch on 2026-03-06 — a 630-line Python script plus `program.md` that runs an autonomous hill-climbing loop on a single GPU. The core insight: you can run 50–100 ML experiments overnight without a human. The generalized pattern (confirmed across autoresearch, autoexp, uditgoenka/autoresearch, pi-autoresearch, drivelineresearch/autoresearch-claude-code):

```
loop forever:
  1. Read git log + results log (understand what worked and what failed)
  2. Pick next hypothesis (one atomic change, based on history)
  3. Make the change + git commit
  4. Run the eval harness (fixed time budget or test suite)
  5. Extract metric value(s)
  6. If improved → advance baseline (keep commit)
     If equal or worse → git reset (discard commit, log outcome)
  7. Record result in TSV log (iteration, commit hash, metric, delta, status, description)
  8. Repeat
```

**Four required inputs (autoexp, verified):**
1. Target file(s) — what the agent may modify
2. Eval harness — immutable script that produces the metric
3. Metric — one or two scalar values, direction (lower/higher is better)
4. Budget — time, cost, or iteration count limit

**Critical constraint (Karpathy + autoexp):** the eval harness is read-only. The agent cannot game its own measurement. This is the single most important architectural rule.

---

## Feature Landscape

### Table Stakes (Loop Cannot Function Without These)

| Feature | Why Required | Complexity | Dependency on Existing PDE |
|---------|--------------|------------|---------------------------|
| **Single scalar metric definition** | Loop needs an unambiguous improvement signal. Without it the agent cannot compare run N to run N-1. Karpathy: val_bpb. PDE: Nyquist pass count, Awwwards rubric score, or custom assertion count. | LOW | Nyquist infrastructure (existing). Metric extraction is new — lightweight parser reading test output. |
| **Mutable / immutable file boundary declaration** | Agent must know which files it may change and which are locked. The eval harness (Nyquist runner, critique rubric) must never be agent-editable — or the agent will optimize the scorer rather than the quality. program.md in Karpathy; autoexp "target file" parameter. | LOW | Existing protected-files mechanism (v0.4) provides the model. Extend it for experiment scope. |
| **Git exploratory commit before eval** | Change must be committed before running eval so that `git reset --hard HEAD~1` cleanly reverts it. Karpathy: commit → run → keep or reset. Not the same as PDE's existing atomic commits — this is tentative/reversible by design. | MEDIUM | Existing git commit pattern. New: experiment: commit prefix to distinguish from regular atomic commits; new state machine wrapping commit/reset. |
| **Git reset on regression** | Failed experiments must be completely discarded — no partial state. `git reset --hard HEAD~1` returns working tree to previous baseline. This is the loop's safety guarantee. | LOW | Native git. PDE has no reset-on-fail pattern today — this is new. |
| **Results log (TSV/NDJSON append-only)** | The agent reads experiment history before choosing its next hypothesis. Without a persistent log, it has no memory across iterations within a session. Columns: iteration, commit hash, metric value, delta vs baseline, status (KEEP/DISCARD/CRASH), description of change. | LOW | Event bus NDJSON pattern (existing v0.8). Extend: new experiment-log.ndjson in .planning/ (not /tmp — must survive session). |
| **Iteration budget enforcement** | Loop must stop. Unbounded loops consume tokens and API budget without limit. Budget = one of: max iterations, max wall-clock time, or max cost. Agent reads remaining budget before each iteration. | LOW | No existing equivalent. New: budget counter in experiment state file. |
| **Baseline capture (iteration 0)** | Before any modification, run the eval harness once and record the metric. This is the baseline all future iterations compare against. Without it, the agent cannot compute delta. | LOW | Nyquist runner (existing). New: explicit "iteration 0" phase in optimize workflow. |
| **Eval harness invocation** | The optimize workflow must know how to run the metric. For PDE self-improvement: `node bin/nyquist.cjs` or `pde:pressure-test`. For user targets: configurable command. | MEDIUM | Nyquist runner (existing). New: configurable eval command in experiment config. |
| **Hypothesis generation from history** | The agent reads git log + results log, reasons about what has not been tried, and proposes the next atomic change. This is the "intelligent" part vs grid search — LLM reasoning over experiment history. | MEDIUM | No equivalent. New: agent prompt template that ingests history and proposes next hypothesis. |
| **One-change-per-iteration discipline** | Atomic changes are required so that the keep/discard signal is attributable. Multiple simultaneous changes make causality ambiguous. Enforced by instruction, not technically. | LOW | AC-first planning model (existing) provides the pattern. New: enforce atomicity in experiment loop prompt. |

### Differentiators (What Makes PDE's Loop Better Than a Bare Script)

| Feature | Value Proposition | Complexity | Dependency on Existing PDE |
|---------|-------------------|------------|---------------------------|
| **program.md analog — experiment.md config file** | A human-editable markdown file (like Karpathy's program.md) that simultaneously carries: objective, mutable file list, immutable file list, metric definition, eval command, budget, stopping criteria, and "what has been tried" running notes. Survives session breaks. The agent reads this before every iteration. | LOW | DESIGN-STATE.md pattern (existing). New: .planning/experiment.md schema. |
| **Awwwards rubric as native metric** | PDE already has a multi-dimensional quality rubric (v0.4). The optimize loop can target rubric dimensions directly — Visual Hierarchy, Motion Quality, Typography, Component Architecture. This makes PDE self-improvement far more domain-relevant than generic test pass counts. | MEDIUM | Awwwards rubric + quality references (existing v0.4). New: rubric score extraction for use as loop metric. |
| **Nyquist count as stability guard** | While optimizing for one metric (e.g., rubric score), Nyquist pass count acts as a guard condition. If Nyquist regressions occur, the change is discarded even if the primary metric improved. Prevents the agent from breaking structural invariants while chasing quality. | MEDIUM | Nyquist runner (existing). New: dual-metric keep logic (improve primary AND maintain guard). |
| **Self-improvement targeting PDE's own workflows** | Primary use case is PDE optimizing its own workflow markdown files and agent prompts. This is domain-specific knowledge PDE already has — it knows which files are mutable (workflows/*.md, agents/*.md, skills/*.md) and which are immutable (bin/*.cjs, nyquist tests). No user configuration needed for self-improvement mode. | MEDIUM | Workflow + agent file structure (existing). New: pre-configured self-improvement experiment preset in optimize skill. |
| **Session-resumable experiment state** | Experiment state (.planning/experiment-log.ndjson, .planning/experiment.md) persists across Claude Code session breaks. Agent can resume mid-loop without losing baseline or history. Karpathy's script loses state on restart. | MEDIUM | Persistent agent memory pattern (existing v0.6). New: experiment state files in .planning/ (not /tmp). |
| **tmux dashboard integration** | Experiment loop emits structured events (experiment_start, iteration_start, hypothesis, eval_complete, keep, discard) consumed by existing event bus and tmux dashboard. User sees live progress without watching the terminal. | LOW | Event bus + tmux dashboard (existing v0.8). New: 6 experiment event types added to event schema. |
| **Readiness gate before loop start** | Before running the experiment loop, validate: eval harness exists and runs, baseline metric is extractable, mutable file list is non-empty, immutable file list excludes eval harness, budget is specified. Prevents starting a loop that will immediately crash. | LOW | Readiness gate pattern (existing v0.6). New: experiment-specific readiness checks. |
| **Simplicity tie-breaking** | If metric is equal after a change, KEEP if the change reduces code/complexity, DISCARD otherwise. Prevents the agent from accumulating complexity without measurable gain. From uditgoenka/autoresearch Rule 6: "simplicity wins — equal results + less code = KEEP". | LOW | No equivalent. New: line-count delta as tie-breaker in keep/discard logic. |
| **Dead-end logging and hypothesis diversity** | Results log records not just metric values but the description of each hypothesis. Agent reads this log before proposing next change and avoids re-trying dead ends. Enables longer autonomous runs without repetition. | MEDIUM | No equivalent. New: structured hypothesis field in results log, prompt instruction to avoid dead ends. |
| **Research agent empirical mode** | pde-phase-researcher gains a "try and measure" mode: instead of just researching what should be done, it proposes a hypothesis, executes it, measures the outcome, and reports empirical evidence rather than desk research alone. | HIGH | pde-phase-researcher agent (existing). New: empirical mode flag + integration with experiment loop primitive. |

### Anti-Features (Commonly Requested, Would Undermine Reliability)

| Feature | Why Requested | Why Problematic | What to Do Instead |
|---------|---------------|-----------------|-------------------|
| **Multi-file simultaneous modification** | "Let the agent change everything related to the hypothesis at once" | Destroys attributability. If 5 files change and metric moves, you don't know which change caused it. Reverting is also harder. Karpathy deliberately constrains to one file (train.py). | Enforce one-change-per-iteration. If a feature genuinely spans multiple files, structure the experiment to change them sequentially across iterations. |
| **LLM-judged quality as sole metric** | "Have Claude score the output quality directly" | Goodhart's Law failure: the agent learns to produce outputs that Claude-the-judge scores highly, not outputs that are actually better. The judge and the optimizer are the same model — trivially gameable. OpenAI literature confirms reward hacking under LLM self-evaluation. | Use binary assertions (Nyquist tests) or the existing Awwwards rubric as structured scorer, not free-form LLM judgment. LLM judgment is acceptable only as a tie-breaker or secondary signal, never the primary metric. |
| **Continuous background self-improvement loop** | "Run the loop automatically whenever PDE is idle" | Claude Code is session-based. Background loops have no session context, cannot read Claude's tool state, and would consume API budget invisibly. PROJECT.md explicitly out-of-scopes this. | Explicit invocation only: `/pde:optimize` starts a bounded loop. User controls when it runs. tmux dashboard shows it running visibly. |
| **Modifying the eval harness** | "The agent should be able to improve its own tests" | Directly enables metric gaming. If the agent can edit Nyquist tests, it will delete the failing assertions rather than fix the underlying issue. This is the canonical self-improvement failure mode. | Immutable boundary: all eval harness files (bin/nyquist.cjs, tests/, quality rubric references) are permanently in the immutable list. Non-negotiable. |
| **Multi-metric optimization without hierarchy** | "Optimize for quality AND speed AND token efficiency simultaneously" | Without a metric hierarchy, the agent has no clear improvement signal. Pareto-front optimization across 3+ dimensions produces inconsistent keep/discard decisions. | Define one primary metric with one optional guard condition. Secondary metrics are logged but do not affect keep/discard. If priorities change, start a new experiment. |
| **Generic MLOps experiment tracking (MLflow, W&B)** | "Integrate with standard experiment tracking tools" | Adds an external dependency with auth, network, and configuration overhead. PDE is a zero-external-service plugin. Users do not have MLflow running locally. | Append-only NDJSON log in .planning/ is sufficient. The git commit history is itself an experiment tracker. No external tooling needed. |
| **Population-based / parallel experiments** | "Run multiple hypotheses at once for faster convergence" | Requires worktree isolation per experiment, parallel metric collection, and merge logic for the winner. The surface area for bugs is large and the implementation complexity is HIGH for MEDIUM gain. PDE worktrees exist but are currently for human-parallelism, not autonomous parallel loops. | Sequential hill-climbing is sufficient for PDE's self-improvement use case. Parallel experiments are a v2+ consideration after the sequential loop is validated. |
| **Automatic rollout without human review** | "If the loop finds an improvement, apply it automatically to main" | Removes the human from the loop for code that modifies PDE's own workflows. An agent-improved workflow could introduce subtle regressions that pass Nyquist but degrade real output quality. | Experiment commits land on a dedicated branch. Human reviews the diff and decides to merge. The loop is an exploration tool, not an autopilot. |
| **Generic hyperparameter grid search** | "Try all combinations of N parameters systematically" | Grid search is O(N^k) — exponential in parameter count. For prompt optimization, the parameter space is not discrete and grid search misses semantic dimensions. | LLM-guided hypothesis generation from history is strictly better for prompt/workflow optimization. The agent reasons about which dimensions are most promising, not which grid cell is next. |

---

## Feature Dependencies

```
Metric Definition
    └──requires──> Eval Harness Invocation
                       └──requires──> Baseline Capture (iteration 0)
                                          └──requires──> Results Log

Git Exploratory Commit
    └──requires──> Mutable / Immutable Boundary Declaration
    └──enables──>  Git Reset on Regression

Hypothesis Generation from History
    └──requires──> Results Log
    └──requires──> Git log access (existing git infrastructure)

Iteration Budget Enforcement
    └──requires──> Results Log (to count completed iterations)

Experiment.md Config File
    └──enables──> Session-Resumable State
    └──enables──> Readiness Gate

Nyquist Guard Condition
    └──requires──> Primary Metric Definition
    └──depends-on──> Nyquist runner (existing PDE infrastructure)

Awwwards Rubric as Native Metric
    └──depends-on──> Quality rubric references (existing v0.4)
    └──requires──> Rubric score extraction (new)

tmux Dashboard Integration
    └──depends-on──> Event bus (existing v0.8)
    └──requires──> 6 new experiment event types

Research Agent Empirical Mode
    └──depends-on──> pde-phase-researcher (existing)
    └──depends-on──> Experiment loop primitive (new — all of the above)
```

### Dependency Notes

- **Metric definition requires eval harness:** A metric with no way to measure it is meaningless. The eval harness command must be defined before the loop can start. This drives the readiness gate.
- **Git exploratory commit requires boundary declaration:** The agent cannot commit changes to immutable files without knowing the boundary. Boundary must be declared first (in experiment.md) and enforced before commit.
- **Hypothesis generation requires results log:** Without history the agent cannot avoid dead ends or build on near-misses. The log is the agent's working memory within an experiment run.
- **Research agent empirical mode requires the full experiment loop primitive:** The empirical mode is a thin layer on top of all table-stakes features. It cannot be built before the core loop exists.
- **Nyquist guard depends on primary metric:** The guard is additive logic on top of the keep/discard decision. Without a primary metric, there is nothing to guard.

---

## MVP Definition

### Must Have for v0.13 Launch (Experiment Loop Primitive)

- [ ] `/pde:optimize` skill — entry point that reads experiment.md, validates readiness, runs the loop
- [ ] experiment.md config file schema — objective, mutable list, immutable list, eval command, metric, budget, notes
- [ ] Git state machine — experiment: commit prefix, git reset --hard HEAD~1 on discard, baseline commit tracking
- [ ] Baseline capture (iteration 0) — run eval harness before any modification, record as iteration #0 in log
- [ ] Results log (.planning/experiment-log.ndjson) — append-only, includes iteration/commit/metric/delta/status/hypothesis
- [ ] Iteration budget enforcement — max_iterations or max_minutes field in experiment.md, loop terminates cleanly
- [ ] Self-improvement preset — pre-configured experiment.md targeting PDE workflows/*.md with Nyquist as eval
- [ ] Readiness gate — validate eval harness runs, baseline extractable, boundary non-empty, budget specified

### Add After Core Loop Validates

- [ ] Awwwards rubric score extraction — extend optimize to target rubric dimensions as primary metric
- [ ] Nyquist as guard condition — dual-metric keep logic (primary improves AND guard holds)
- [ ] tmux dashboard experiment events — 6 event types emitted during loop iterations
- [ ] Dead-end logging and diversity enforcement — structured hypothesis field + prompt instruction
- [ ] Simplicity tie-breaking — line-count delta as KEEP signal when metric is equal
- [ ] Session resumability — agent re-reads experiment-log.ndjson and experiment.md on restart

### Defer to v2+

- [ ] Research agent empirical mode — highest complexity; depends on loop primitive being stable first
- [ ] Parallel experiments with worktree isolation — substantial complexity, unproven value for PDE's use case
- [ ] Population-based optimization — requires merge logic for multi-winner scenarios

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `/pde:optimize` skill entry point | HIGH | LOW | P1 |
| experiment.md config schema | HIGH | LOW | P1 |
| Git exploratory commit + reset state machine | HIGH | MEDIUM | P1 |
| Baseline capture (iteration 0) | HIGH | LOW | P1 |
| Results log (NDJSON) | HIGH | LOW | P1 |
| Iteration budget enforcement | HIGH | LOW | P1 |
| Self-improvement preset | HIGH | LOW | P1 |
| Readiness gate | MEDIUM | LOW | P1 |
| Awwwards rubric as native metric | HIGH | MEDIUM | P2 |
| Nyquist as guard condition | HIGH | MEDIUM | P2 |
| tmux dashboard integration | MEDIUM | LOW | P2 |
| Dead-end logging + diversity | MEDIUM | MEDIUM | P2 |
| Simplicity tie-breaking | LOW | LOW | P2 |
| Session resumability | MEDIUM | MEDIUM | P2 |
| Research agent empirical mode | HIGH | HIGH | P3 |
| Parallel experiments | LOW | HIGH | P3 |

**Priority key:**
- P1: Required for loop to function at all — ship in v0.13 core phases
- P2: Loop works without these, but quality and usability improve — ship in later v0.13 phases
- P3: Defer — requires P1+P2 stable, HIGH complexity, or architectural decision needed

---

## Analogous System Analysis

PDE's experiment loop is most similar to these existing patterns, ordered by relevance:

| System | What PDE Borrows | What's Different |
|--------|-----------------|-----------------|
| Karpathy autoresearch (github.com/karpathy/autoresearch) | Core loop structure, program.md analog, git commit/reset state machine, fixed time budget | PDE targets workflow markdown/prompts, not ML training scripts; metric is Nyquist count or rubric score, not val_bpb |
| uditgoenka/autoresearch Claude skill | 8-phase protocol, TSV results log, experiment: commit prefix, simplicity tie-breaking, guard conditions | PDE integrates natively with existing event bus, tmux, readiness gate — not standalone |
| autoexp gist (adhishthite) | 4-parameter interface (target, harness, metric, budget), single-file constraint, crash handling | PDE supports multi-file mutable boundary (constrained list), not single-file only |
| PDE self-improvement fleet (v0.4) | 3-agent audit/validate/elevate pattern, Awwwards rubric | Fleet is human-invoked per-skill; experiment loop is autonomous multi-iteration; fleet output becomes loop's eval harness |
| PDE readiness gate (v0.6) | Pre-execution validation with PASS/CONCERNS/FAIL | Experiment readiness has different checks (eval harness runs? baseline extractable?) but same gate pattern |
| PDE atomic commits (existing) | One change per commit, clean git history | Experiment commits are tentative — they may be reset. Distinct from atomic commits that always persist. |

---

## Sources

- [GitHub: karpathy/autoresearch](https://github.com/karpathy/autoresearch) — original loop structure, program.md schema, metric/budget/harness pattern (HIGH confidence)
- [GitHub: karpathy/autoresearch program.md](https://github.com/karpathy/autoresearch/blob/master/program.md) — instructions, constraints, stopping criteria, metric definition (HIGH confidence, verified via WebFetch)
- [The New Stack: Karpathy autonomous experiment loop](https://thenewstack.io/karpathy-autonomous-experiment-loop/) — loop mechanics summary (MEDIUM confidence)
- [GitHub: uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) — Claude Code skill generalization, 8-phase protocol, guard conditions, TSV log schema (HIGH confidence, verified via WebFetch)
- [GitHub Gist: autoexp by adhishthite](https://gist.github.com/adhishthite/16d8fd9076e85c033b75e187e8a6b94e) — minimal 4-parameter API, single-file constraint, keep/discard logic (HIGH confidence, verified via WebFetch)
- [NextBigFuture: Karpathy on Code Agents and the Self-Improvement Loopy Era](https://www.nextbigfuture.com/2026/03/andrej-karpathy-on-code-agents-autoresearch-and-the-self-improvement-loopy-era-of-ai.html) — strategic framing (MEDIUM confidence)
- [VentureBeat: Karpathy autoresearch implications](https://venturebeat.com/technology/andrej-karpathys-new-open-source-autoresearch-lets-you-run-hundreds-of-ai) — ecosystem context (MEDIUM confidence)
- [arxiv 2510.02840: Take Goodhart Seriously](https://arxiv.org/abs/2510.02840) — Goodhart's Law in optimization systems, metric gaming failure modes (HIGH confidence)
- [OpenAI: Measuring Goodhart's Law](https://openai.com/index/measuring-goodharts-law/) — reward hacking under self-evaluation (HIGH confidence)
- [OpenAI Cookbook: Self-Evolving Agents](https://developers.openai.com/cookbook/examples/partners/self_evolving_agents/autonomous_agent_retraining) — self-improvement agent retraining patterns (MEDIUM confidence)
- [GitHub: AmirLayegh/agentic-ablation](https://github.com/AmirLayegh/agentic-ablation) — automated ablation study patterns with LLM agents (MEDIUM confidence)
- [MindStudio: AutoResearch Eval Loop](https://www.mindstudio.ai/blog/autoresearch-eval-loop-binary-tests-claude-code-skills) — binary assertions as reliable metrics vs LLM judgment (MEDIUM confidence)
- PDE PROJECT.md — existing infrastructure inventory, out-of-scope constraints, v0.13 target features (HIGH confidence, primary source)

---
*Feature research for: v0.13 AutoResearch — autonomous experiment loops for PDE self-optimization*
*Researched: 2026-03-23*
