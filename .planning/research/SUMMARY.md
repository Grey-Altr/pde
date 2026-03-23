# Project Research Summary

**Project:** PDE v0.13 AutoResearch — Autonomous Experiment Loop
**Domain:** Agentic self-optimization primitive — Karpathy-pattern experiment loop integrated into existing Claude Code plugin
**Researched:** 2026-03-23
**Confidence:** HIGH (Karpathy autoresearch repo verified; multiple independent implementations cross-referenced; PDE codebase analyzed directly; pitfall research grounded in alignment literature and post-mortems)

## Executive Summary

PDE v0.13 adds an autonomous experiment loop — the Karpathy AutoResearch pattern — as a native primitive for self-optimizing PDE workflows. The pattern is well-established: loop over (propose hypothesis → commit speculatively → measure metric → keep if improved, reset if not → log result → repeat). The key insight is that the LLM agent is the optimizer, not a numerical algorithm — it reasons over experiment history to pick the next hypothesis, which makes it far more useful for prompt and workflow optimization than Bayesian search. The entire primitive requires zero new npm packages: it runs on Node.js built-ins, git CLI, and a new CJS module (`experiment.cjs`) that must stay under 300 lines.

The recommended implementation is an additive layering on existing PDE infrastructure. Four new files (command, workflow, agent, CJS module) and five small modifications to existing files (~80-100 total lines changed across existing files). The state model is a new `.planning/experiments/` directory alongside `.planning/phases/` — kept separate because experiments are not phases and must never be treated as incomplete phase work by roadmap tooling. The git state machine uses exploratory commits with `exp({slug}):` prefix and `git reset --hard` on regression — this is the single most dangerous component and must be built first, in isolation, before any agent uses it.

The primary risks are all pre-identified with clear prevention strategies: git state corruption from running experiments on the wrong branch (prevent with branch isolation), metric gaming via Goodhart's Law (prevent with deterministic evaluation harnesses and human-review checkpoints), destructive optimization breaking downstream pipeline skills (prevent with full Nyquist regression check before any commit is promoted), and scope creep turning the experiment system into a parallel PDE (prevent with a hard 300-line ceiling on experiment infrastructure). Safety and stopping conditions are not optional post-MVP features — they must ship in the first experiment loop phase.

## Key Findings

### Recommended Stack

The stack decision is clear and simple: zero new npm packages. All experiment loop capabilities are implementable on Node.js 18+ built-ins (`child_process.spawnSync`, `fs.appendFileSync`, `crypto.randomUUID`) plus the git CLI that PDE already requires. The new CJS module (`experiment.cjs`) follows the established pattern of `event-bus.cjs` and other lib modules. This maintains PDE's zero-external-dependency constraint and keeps the entire addition auditable.

**Core technologies:**
- `child_process.spawnSync` (Node.js built-in): Run metric evaluation commands and git operations — safer than exec due to argument separation, same pattern already used for git in `pde-tools.cjs`
- `fs.appendFileSync` (Node.js built-in): Append experiment result rows to `experiments.jsonl` — same pattern as `safeAppendEvent()` in `event-bus.cjs`
- `crypto.randomUUID` (Node.js built-in): Generate stable experiment IDs — same as existing session ID generation
- Git CLI (already required): Experiment state machine via `git reset --hard HEAD~1` and `git log --oneline --grep` — no new version requirement
- `bin/lib/frontmatter.cjs` (existing): Parse `experiment.md` YAML frontmatter — same format already used for STATE.md and PLAN.md

Explicitly ruled out: MLflow/W&B/Comet (require external services), Bayesian optimization libraries (Claude IS the optimizer), DSPy/Ax (over-engineering for markdown workflow targets), git worktrees per iteration (worktree overhead; Claude Code has a confirmed `/ide` bug with worktrees as of March 2026), and parallel experiment execution (destroys causal attribution).

### Expected Features

**Must have (P1 — loop cannot function without these):**
- `/pde:optimize` slash command — entry point with explicit `--iterations N` budget (required arg, default 10, max 50)
- `experiment.md` config file — YAML frontmatter + prose (metric, mutable/immutable file lists, eval command, budget, objective)
- Git exploratory commit + `git reset --hard` state machine with `exp({slug}):` commit prefix
- Baseline capture (iteration 0) — metric run before any modification
- Append-only `experiments.jsonl` results log (iteration, commit hash, metric, delta, status, hypothesis)
- Iteration budget enforcement — hard cap, no-progress circuit breaker at 5 consecutive non-improvements, consecutive-failure breaker at 3 regressions
- Mutable/immutable file boundary enforcement — pre-commit check, explicit file paths only (no globs)
- Readiness gate — validate eval harness runs, baseline is extractable, mutable boundary is non-empty, budget is set
- Cost estimate gate — user confirmation before loop starts using PDE's chars/4 heuristic

**Should have (P2 — improves quality and usability, loop works without these):**
- Nyquist as guard condition — dual-metric keep logic (primary metric improves AND Nyquist holds)
- Awwwards rubric score extraction — domain-specific quality metric for PDE self-improvement
- tmux dashboard experiment events — 6 event types for live progress visibility
- Session resumability — `experiments.jsonl` + `experiment.md` persist across session breaks
- Simplicity tie-breaking — line-count delta as KEEP signal when metric is equal
- Human review checkpoint — pause after 5 consecutive automated keeps

**Defer to v2+:**
- Research agent empirical mode — highest complexity, depends on loop primitive being stable first
- Parallel experiments with worktree isolation — substantial complexity, serial is sufficient for PDE's use case
- Population-based optimization — requires merge logic for multi-winner scenarios
- Multi-metric Pareto optimization — scope creep risk; single primary metric with one guard is sufficient

### Architecture Approach

The experiment loop is a new vertical slice through the existing layer architecture: new slash command → new workflow orchestrator → new mutation subagent → new git state machine module → new state directory. Existing components are minimally modified (pde-tools.cjs dispatch +30 lines, pde-phase-researcher +40 lines additive, research-phase workflow +10 lines, event-bus +6 lines). The build order is strictly bottom-up: git state machine first, then mutation agent, then orchestrator + command, then researcher empirical mode, then event bus polish.

**Major components:**
1. `bin/lib/experiment.cjs` — Git state machine: `commitCandidate`, `resetToBaseline`, `promoteBest`, boundary check. The lowest-level dependency; all other components call it.
2. `agents/pde-experiment-runner.md` — Mutation + measurement subagent: applies one candidate change, runs metric command, returns structured JSON. Read-only for metric execution. Never writes SUMMARY.md.
3. `workflows/optimize.md` — Experiment orchestrator: scaffolds EXPERIMENT.md, drives iteration loop, makes keep/discard decisions, finalizes result.
4. `commands/optimize.md` — `/pde:optimize` slash command entry point: parses args, presents cost estimate, spawns optimize workflow.
5. `.planning/experiments/{slug}/` — Isolated state: EXPERIMENT.md (spec), EXPERIMENT-LOG.ndjson (append-only results), EXPERIMENT-BEST.json (current best snapshot). Never inside `.planning/phases/` — roadmap tooling must not scan this directory.

### Critical Pitfalls

1. **Git state corruption from experiment commits on main branch** — The experiment loop's commit/reset state machine must never operate on the main working tree. Prevent with branch isolation: every `/pde:optimize` run operates on an `experiment/{slug}-{ts}` branch; experiment commits use `exp({slug}):` prefix; only the final squash-merge commit appears on main. Verify: `git log --oneline main` contains zero `exp():` commits after a complete run.

2. **Metric gaming via Goodhart's Law** — The agent will exploit any scalar metric within 20-30 iterations if it has no off switch. Prevent with: (a) deterministic eval harness only — no LLM-as-judge in the keep/discard gate, (b) Nyquist as a hard guard condition, (c) human review checkpoint at 5 consecutive automated keeps, (d) "suspiciously high gain" flag if metric improvement exceeds 2 standard deviations of historical variance.

3. **Destructive optimization breaking downstream pipeline skills** — PDE is a 14-stage pipeline; local optimization of one workflow can break downstream consumers. Prevent with: pipeline integrity check (trimmed Nyquist subset covering optimization target + direct consumers) run before every KEEP decision. Full 235-assertion suite runs at experiment end before merge.

4. **Runaway loop and resource exhaustion** — Hard iteration budget is mandatory, not optional. Implement: `--iterations N` (default 10, max 50), per-iteration time limit (default 5 min), no-progress breaker (5 consecutive non-improvements), consecutive-failure breaker (3 regressions). Cost estimate gate before loop starts.

5. **Scope creep turning AutoResearch into a parallel PDE** — Enforce a 300-line ceiling on all experiment infrastructure (experiment.cjs + new pde-tools dispatch blocks) combined. Any feature requiring a new bin script, new agent definition, or new config schema goes through a separate milestone phase. Check at every phase boundary.

6. **Safety boundary ambiguity at section level** — File-path immutability is insufficient; some workflow files are partially mutable (optimizable prose sections) with locked zones (inter-skill contracts, designCoverage write patterns). Mark locked zones with `<!-- LOCKED: experiment loop must not modify this section -->` and optimizable zones with `<!-- OPTIMIZABLE -->`. Section-level markers must be added to all experiment-eligible workflow files before any experiment runs.

7. **Agent contention with active regular workflows** — Experiment loop must check for active PDE sessions (recent `phase:start` events in NDJSON bus) before starting. Shared state files (`design-manifest.json`, `DESIGN-STATE.md`, `workflow-status.md`) are always immutable for experiments. Experiment agents must not write to persistent agent memory pool.

## Implications for Roadmap

The build order is architecturally determined. The git state machine is the lowest-level dependency; nothing else can be tested without it. Each subsequent phase depends on the previous one being functional. Safety components (stopping conditions, boundary enforcement, cost estimate gate) are embedded throughout Phases 1-3, not deferred to a polish phase — PITFALLS research is unambiguous on this.

### Phase 1: Git State Machine and Safety Boundaries

**Rationale:** The exploratory commit/reset pattern is the most dangerous component and the dependency for all other phases. Building it first allows isolated testing before any agent interacts with it. Immutability boundaries — both file-path level and section level — must ship here. Retrofitting boundary enforcement after agents are wired is a full rewrite of the safety layer.
**Delivers:** `bin/lib/experiment.cjs` (commitCandidate, resetToBaseline, promoteBest, boundary check); `experiment` and `metric` subcommands in `pde-tools.cjs`; `experiment.md` file schema; `.planning/experiments/` directory structure; `BOUNDARIES.md` with section-level locked zone markers added to all experiment-eligible workflow files.
**Addresses:** P1 table-stakes features: git state machine, mutable/immutable boundary declaration, baseline capture.
**Avoids:** Pitfall 1 (git corruption), Pitfall 3 (destructive optimization), Pitfall 6 (section-level boundary ambiguity).
**Research flag:** Standard patterns — no deeper research needed. Git operations are well-understood; boundary check follows existing protected-files pattern from `pde-tools.cjs`.

### Phase 2: Mutation Subagent and Metric Evaluation

**Rationale:** The runner agent depends on Phase 1's tool commands. It can be built and tested independently before the orchestrator exists by invoking it directly. The metric-as-script pattern (deterministic shell command → numeric output) must be proven here before the orchestrator automates it.
**Delivers:** `agents/pde-experiment-runner.md` (mutation + measurement subagent, read-only for metrics, returns structured JSON to orchestrator); `metric eval` command in pde-tools.cjs; timeout enforcement for metric scripts; section-level locked zone markers added to experiment-eligible workflow files (if not shipped in Phase 1).
**Uses:** `experiment.cjs` from Phase 1.
**Avoids:** Pitfall 2 (metric gaming — deterministic eval harness enforced, no LLM-as-judge), Pitfall 3 (boundary check runs before every commit).
**Research flag:** Standard patterns — subagent architecture follows established `pde-research-validator` read-only pattern exactly.

### Phase 3: Experiment Orchestrator, Command Entry Point, and Stopping Conditions

**Rationale:** The orchestrator assembles the full iteration loop and depends on both Phase 1 (git state machine) and Phase 2 (runner agent). All stopping conditions and safety gates ship here — they are part of the loop, not post-MVP additions.
**Delivers:** `workflows/optimize.md` (full iteration orchestrator: baseline capture, loop, keep/discard logic with Nyquist guard, budget enforcement, no-progress breaker, consecutive-failure breaker, finalization + results table); `commands/optimize.md` (`/pde:optimize` with cost estimate gate, `--iterations` argument, concurrency check); `EXPERIMENT-LOG.ndjson` results logging; human review checkpoint at 5 consecutive auto-keeps.
**Implements:** All P1 features; readiness gate; concurrency guard (Pitfall 7 prevention).
**Avoids:** Pitfall 4 (runaway loop — all circuit breakers ship here), Pitfall 7 (agent contention — concurrency check in command handler).
**Research flag:** Standard patterns — orchestrator follows `autonomous.md` iteration loop and `execute-phase.md` subagent dispatch.

### Phase 4: Researcher Empirical Mode and Event Bus Integration

**Rationale:** Additive and decoupled. The basic loop is functional after Phase 3; empirical mode enriches it with researcher-generated candidates rather than requiring human-specified candidates. Event bus additions give tmux dashboard visibility. Both are independent of each other and of the loop's core correctness.
**Delivers:** `pde-phase-researcher.md` updated with `--empirical` flag and `try_candidates` return block; `workflows/research-phase.md` routing for empirical flag; `event-bus.cjs` with 6 experiment event types; `config.json` template updated with `experiment_defaults` section; experiment events distinguished from regular workflow events in dashboard.
**Avoids:** Experiment agents writing to shared persistent agent memory pool (Pitfall 7).
**Research flag:** Needs brief research. The `try_candidates` schema must be validated against how the orchestrator will consume it. Mismatches between what the researcher produces and what the orchestrator iterates over are a likely integration bug source. Recommend a research-phase run examining the existing researcher return schema.

### Phase 5: Nyquist Tests for Experiment Infrastructure

**Rationale:** Verification phase. After the complete loop is functional, regression tests confirm that experiment infrastructure does not disturb regular PDE operation and that all safety constraints actually fire as specified.
**Delivers:** New Nyquist assertions covering: branch isolation (no experiment commits on main), boundary check rejection of out-of-bounds files, no-progress breaker termination at exactly N, consecutive-failure breaker termination at 3, shared state protection (design-manifest unchanged after experiment), RECONCILIATION.md cleanliness (single squash-merge commit on main), full 235-assertion regression suite passes after AutoResearch ships.
**Avoids:** "Looks done but isn't" failure modes from PITFALLS.md checklist — each checklist item becomes a verifiable test.
**Research flag:** Standard patterns — follows existing Nyquist test conventions.

### Phase Ordering Rationale

- Phase 1 before Phase 2 because the runner depends on `experiment commit-candidate` tool commands existing.
- Phase 2 before Phase 3 because the orchestrator spawns runner agents; testing the loop without a working runner conflates two failure modes.
- Phase 3 before Phase 4 because empirical mode depends on the loop being functional — the researcher's `try_candidates` feed into the loop's iteration queue.
- Phase 5 last because it tests the complete assembled system across all prior phases.
- Safety components are embedded in Phases 1-3 rather than collected into a separate "safety phase." This is intentional: the PITFALLS research demonstrates that all seven critical pitfalls require prevention before the first experiment runs, not after.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (researcher empirical mode):** The `try_candidates` schema is novel and its contract with the orchestrator's iteration loop is not yet fully specified. A research-phase run examining the researcher's existing return format and the orchestrator's consumption pattern is recommended to prevent schema mismatch bugs.

Phases with standard patterns (skip research-phase):
- **Phase 1 (git state machine):** Git operations are well-understood. PDE's existing `execGit` + protected-files patterns provide the complete implementation template.
- **Phase 2 (mutation subagent):** Follows `pde-research-validator` read-only subagent pattern exactly. No novel architecture.
- **Phase 3 (orchestrator):** Follows `autonomous.md` iteration loop and `execute-phase.md` subagent dispatch patterns. Stopping conditions follow the circuit-breaker pattern described in PITFALLS.md with sufficient specificity to implement directly.
- **Phase 5 (Nyquist tests):** Follows existing Nyquist test conventions; checklist in PITFALLS.md provides the test cases.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages confirmed via direct codebase analysis and cross-referenced against Karpathy repo + 3 independent implementations. Node.js built-in usage follows proven PDE patterns in event-bus.cjs and pde-tools.cjs. |
| Features | HIGH | Karpathy autoresearch verified; uditgoenka/autoresearch Claude skill verified; autoexp gist verified; Goodhart's Law pitfalls grounded in arxiv and OpenAI alignment literature. P1/P2/P3 distinction is well-grounded in dependency analysis. |
| Architecture | HIGH | Based on direct codebase analysis of core.cjs, event-bus.cjs, pde-tools.cjs, pde-research-validator.md, execute-phase.md, and autonomous.md. All integration points verified against current source. |
| Pitfalls | HIGH (critical pitfalls 1-7), MEDIUM (performance traps), LOW (long-run convergence) | Critical and safety pitfalls grounded in primary sources and direct codebase analysis. Performance trap specifics (Nyquist runtime at 3-5 min/iteration) are inferred estimates. Long-run convergence behavior has no PDE-specific experiment data yet. |

**Overall confidence:** HIGH for the core implementation plan. The build order, component boundaries, and safety constraints are well-supported by research. Areas of lower confidence (performance tuning, long-run behavior) are appropriate to discover empirically once the loop is functional.

### Gaps to Address

- **Worktree vs. branch isolation conflict:** PITFALLS.md recommends `git worktree add` per experiment run (Pitfall 1 prevention); STACK.md and ARCHITECTURE.md recommend branch isolation without worktrees due to the confirmed Claude Code `/ide` worktree bug (March 2026). This tension must be resolved in Phase 1 planning. Recommendation: use branch isolation rather than worktree, but explicitly verify in Phase 5 tests that branch isolation is sufficient to prevent RECONCILIATION.md contamination.

- **Trimmed Nyquist subset composition:** PITFALLS.md recommends running a trimmed Nyquist subset per iteration (15-30 assertions covering the optimization target + direct consumers) rather than the full 235 (which takes 3-5 min/iteration, making a 20-iteration experiment last over an hour). The specific subset composition for each experiment profile is not yet defined. Address in Phase 2 or Phase 3 planning when the metric eval command is specified.

- **Metric extraction reliability:** The `verify_extract` pattern (shell command output → `parseFloat()`) is simple but potentially brittle if test runner output format changes between Node.js versions. Phase 1 or Phase 2 should validate metric extraction against the actual output format of `node --test tests/nyquist/` to confirm it is stable.

- **File naming inconsistency:** STACK.md uses lowercase `experiment.md`; ARCHITECTURE.md uses uppercase `EXPERIMENT.md`. Resolve in Phase 1 before the schema is finalized. Recommendation: follow PDE's existing convention where files created by agents are uppercase (PLAN.md, SUMMARY.md) and human-authored config files are lowercase (program.md analog = lowercase `experiment.md`).

## Sources

### Primary (HIGH confidence)
- `github.com/karpathy/autoresearch` (fetched via WebFetch, March 2026) — core loop pattern, program.md role, git keep/discard state machine
- `github.com/karpathy/autoresearch/blob/master/program.md` (fetched via WebFetch) — mutable/immutable boundaries, stopping criteria, metric definition, agent instruction format
- `github.com/uditgoenka/autoresearch` (fetched via WebFetch) — Claude Code skill generalization, 8-phase protocol, JSONL log schema, simplicity tie-breaking, guard conditions
- `github.com/drivelineresearch/autoresearch-claude-code` (fetched via WebFetch) — pure skill implementation, plugin manifest pattern, JSONL vs TSV decision
- `gist.github.com/adhishthite/16d8fd9076e85c033b75e187e8a6b94e` (fetched via WebFetch) — minimal 4-parameter API, single-file constraint, keep/discard logic
- PDE codebase (read directly): `bin/lib/core.cjs`, `bin/lib/event-bus.cjs`, `bin/pde-tools.cjs`, `agents/pde-research-validator.md`, `workflows/execute-phase.md`, `workflows/autonomous.md`, `references/git-integration.md`, `.planning/PROJECT.md`
- `arxiv.org/abs/2510.02840` (Take Goodhart Seriously) — metric gaming in optimization systems
- `openai.com/index/measuring-goodharts-law/` — reward hacking under self-evaluation

### Secondary (MEDIUM confidence)
- VentureBeat / Fortune: Shopify CEO applied autoresearch — 53% faster rendering from 93 automated commits; confirms pattern generalizes beyond ML
- The New Stack: metric gaming risk and Goodhart's Law framing for autonomous loops
- WebSearch March 2026: Claude Code git worktree bug (multiple community reports) — reason to avoid worktrees for experiment isolation
- WebSearch March 2026: DSPy TypeScript ports, MLflow.js — confirmed available but excluded as over-engineering
- Adnan Masood (Medium, Jan 2026): Reward hacking taxonomy, proxy metric exploitation patterns
- ISACA self-modifying AI analysis — scope creep and safety boundary pitfalls in meta-systems

### Tertiary (LOW confidence)
- Long-run convergence behavior after 50+ iterations — no PDE-specific experiment data; inferred from Karpathy's reported "700 experiments over 2 days" scale results

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
