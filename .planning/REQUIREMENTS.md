# Requirements: PDE v0.13 AutoResearch

**Defined:** 2026-03-23
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.13 Requirements

Requirements for the AutoResearch milestone. Each maps to roadmap phases.

### Git State Machine & Safety

- [x] **GIT-01**: `bin/lib/experiment.cjs` module implements commit-candidate / tag / reset-to-baseline / promote-best state machine using `execGit` from existing `core.cjs`
- [x] **GIT-02**: Experiment commits use `experiment({slug}):` prefix — `git reset --hard HEAD~1` fires ONLY on commits matching this prefix, never on `planning:` or regular commits
- [x] **GIT-03**: Experiments run in isolated git worktree (not main branch) — experiment commits never appear in main branch history until explicitly promoted
- [x] **GIT-04**: `EXPERIMENT-BEST.json` tracks the current best metric value, commit hash, and iteration number — enables session resumption
- [x] **GIT-05**: Six new `experiment` subcommands added to `pde-tools.cjs`: `init`, `commit`, `reset`, `promote`, `status`, `cleanup`

### Safety Boundaries

- [x] **SAFE-01**: `references/experiment-boundaries.md` defines locked zones (eval harness, core infrastructure, protected-files list) and optimizable zones (workflow prose, agent prompts, skill instructions)
- [x] **SAFE-02**: `<!-- LOCKED -->` / `<!-- OPTIMIZABLE -->` section-level markers added to experiment-eligible workflow files — experiment runner enforces these boundaries pre-commit
- [x] **SAFE-03**: Eval harness (Nyquist test files, Awwwards rubric references) is permanently immutable during experiments — added to protected-files list
- [x] **SAFE-04**: Mutable file list in experiment.md frontmatter is validated against boundaries before experiment starts — rejects experiments targeting locked files

### Circuit Breakers

- [x] **BREAK-01**: Iteration budget: experiment halts after N iterations (configurable, default 50)
- [x] **BREAK-02**: Time budget: experiment halts after T minutes (configurable, default 60)
- [x] **BREAK-03**: Consecutive failure limit: experiment halts after K consecutive regressions (default 5)
- [x] **BREAK-04**: No-progress detection: experiment halts if best metric hasn't improved in last M iterations (default 10)
- [x] **BREAK-05**: Cost estimate gate: experiment displays estimated token cost before starting, requires user confirmation above threshold

### Experiment Definition & Execution

- [x] **EXEC-01**: `experiment.md` file format: YAML frontmatter (metric name, direction min/max, verify command, mutable files, immutable files, budget) + markdown prose (search space description, constraints, stopping rationale)
- [x] **EXEC-02**: `pde-experiment-runner` agent type created — reads experiment.md, makes one atomic change per iteration, returns structured JSON (iteration, metric_value, metric_delta, status, description)
- [x] **EXEC-03**: Experiment runner enforces file boundaries: pre-commit hook validates only mutable files were modified, rejects commit and retries if boundary violated
- [x] **EXEC-04**: Metric evaluation runs the verify command via `spawnSync` with configurable timeout (default 30s) — three outcomes: KEEP (metric improved), DISCARD (metric regressed), CRASH (eval harness error)
- [x] **EXEC-05**: JSONL results log at `.planning/experiments/{slug}/results.jsonl` — each row: `{id, iteration, ts, commit, metric_value, metric_delta, status, description}`
- [x] **EXEC-06**: Experiment state directory at `.planning/experiments/{slug}/` with experiment.md copy, results.jsonl, EXPERIMENT-BEST.json, and final REPORT.md

### Self-Improvement & Skill Optimization

- [x] **SELF-01**: Self-improvement preset: pre-configured experiment targeting PDE's own workflow files with Nyquist assertion pass count as regression guard
- [x] **SELF-02**: `/pde:optimize --self` mode auto-discovers PDE workflow files eligible for optimization based on OPTIMIZABLE markers
- [x] **SELF-03**: Skill optimization mode: `/pde:optimize --skill {name}` targets a specific skill's SKILL.md and workflow files with skill-specific eval (e.g., skill test suite, pressure test score)
- [x] **SELF-04**: After experiment completes, promotion step generates a diff summary and requires user approval before merging experiment branch back to main
- [x] **SELF-05**: Experiment REPORT.md generated at completion: iterations run, improvements kept, best metric achieved, files modified, diff summary
- [x] **SELF-06**: Experiment runner uses minimal context window — only experiment.md, target file(s), last N iteration results, and metric output are loaded per iteration (no full project context)
- [x] **SELF-07**: Haiku-first model selection: experiment runner defaults to haiku for mutation attempts, escalates to sonnet only when haiku produces 3+ consecutive boundary violations or crashes
- [x] **SELF-08**: Diff-based context: after iteration 1, runner receives only the diff of the current best vs baseline (not the full file) to minimize token consumption
- [x] **SELF-09**: Token usage tracked per experiment in results.jsonl — each row includes `tokens_used` field; REPORT.md includes total token cost and cost-per-improvement ratio

### Command & Orchestration

- [x] **CMD-01**: `/pde:optimize` slash command created as entry point — accepts experiment.md path or `--self` / `--skill {name}` presets
- [x] **CMD-02**: `workflows/optimize.md` orchestrates the full loop: parse experiment.md → init worktree → baseline metric → loop (mutate → eval → keep/discard) → finalize → report → offer promotion
- [x] **CMD-03**: Experiment phase type recognized in ROADMAP.md — defined by target metric, search space, iteration budget, and keep/discard threshold
- [x] **CMD-04**: Stopping conditions enforced in orchestrator: all 5 circuit breakers (BREAK-01..05) checked between iterations

### Researcher Augmentation

- [x] **RSRCH-01**: `pde-phase-researcher` agent gains `--empirical` flag — when set, researcher generates candidate modifications and tests them against a metric instead of doing desk research only
- [x] **RSRCH-02**: `research-phase.md` workflow routes to empirical mode when phase CONTEXT.md or ROADMAP goal contains optimization/experimentation keywords
- [x] **RSRCH-03**: Empirical research produces RESEARCH.md with "Experiments Attempted" section listing candidates tried, metrics measured, and outcomes

### Observability & Integration

- [ ] **OBS-01**: Experiment lifecycle events emitted on NDJSON event bus: `experiment.start`, `experiment.iteration`, `experiment.keep`, `experiment.discard`, `experiment.crash`, `experiment.complete`
- [ ] **OBS-02**: tmux dashboard gains experiment pane showing current iteration, best metric, keep/discard ratio, and estimated remaining budget
- [x] **OBS-03**: `.planning/experiments/` directory created by `ensure-dirs` in `design.cjs` (or equivalent setup path)
- [x] **OBS-04**: Experiment config template added to `.planning/config.json` with default budgets, thresholds, and cost estimate toggle

### Pipeline Integrity

- [ ] **INTG-01**: Full Nyquist regression suite (235+ tests) runs as pipeline integrity check before any experiment commit is promoted to main
- [ ] **INTG-02**: Experiment commits that pass the metric but fail Nyquist regression are automatically discarded (Nyquist is a hard floor, not the optimization target)
- [ ] **INTG-03**: Existing PDE workflows produce byte-identical output when experiment infrastructure is present but no experiment is active (zero regression)
- [ ] **INTG-04**: Nyquist tests cover experiment infrastructure: boundary enforcement, reset behavior, metric timeout, circuit breaker triggers

## Future Requirements

Deferred to v0.13.x or later. Tracked but not in current roadmap.

### Advanced Optimization

- **ADV-01**: Multi-metric optimization (Pareto frontier across 2+ metrics)
- **ADV-02**: Parallel experiment candidates with tournament selection
- **ADV-03**: Experiment result transfer across model versions (model version tagging)
- **ADV-04**: Automated experiment scheduling (run overnight, report in morning)
- **ADV-05**: Experiment history comparison across slugs (which optimization strategies work best)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| External experiment tracking (MLflow, W&B) | Wrong problem class — PDE experiments are code mutations, not ML training runs |
| Parallel experiments in multiple worktrees | Cannot isolate causality; serial execution is a feature per Karpathy pattern |
| LLM-as-judge for metric evaluation | Non-deterministic; Goodhart's Law makes LLM-judge gaming inevitable at 50+ iterations |
| Experiment infrastructure exceeding 300 LOC per module | Scope creep prevention — experiment system must not become a second PDE |
| Autonomous promotion without human approval | Irreversible; user must review diff before experiment results merge to main |
| Modifying eval harness during experiments | Correctness requirement — agent must not edit its own scorer |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SAFE-01 | Phase 99 | Complete |
| SAFE-02 | Phase 99 | Complete |
| SAFE-03 | Phase 99 | Complete |
| SAFE-04 | Phase 99 | Complete |
| GIT-01 | Phase 100 | Complete |
| GIT-02 | Phase 100 | Complete |
| GIT-03 | Phase 100 | Complete |
| GIT-04 | Phase 100 | Complete |
| GIT-05 | Phase 100 | Complete |
| EXEC-01 | Phase 101 | Complete |
| EXEC-05 | Phase 101 | Complete |
| EXEC-06 | Phase 101 | Complete |
| CMD-03 | Phase 101 | Complete |
| OBS-03 | Phase 101 | Complete |
| OBS-04 | Phase 101 | Complete |
| EXEC-02 | Phase 102 | Complete |
| EXEC-03 | Phase 102 | Complete |
| EXEC-04 | Phase 102 | Complete |
| SELF-06 | Phase 102 | Complete |
| SELF-07 | Phase 102 | Complete |
| SELF-08 | Phase 102 | Complete |
| SELF-09 | Phase 102 | Complete |
| BREAK-01 | Phase 103 | Complete |
| BREAK-02 | Phase 103 | Complete |
| BREAK-03 | Phase 103 | Complete |
| BREAK-04 | Phase 103 | Complete |
| BREAK-05 | Phase 103 | Complete |
| CMD-01 | Phase 103 | Complete |
| CMD-02 | Phase 103 | Complete |
| CMD-04 | Phase 103 | Complete |
| SELF-04 | Phase 103 | Complete |
| SELF-05 | Phase 103 | Complete |
| SELF-01 | Phase 104 | Complete |
| SELF-02 | Phase 104 | Complete |
| SELF-03 | Phase 104 | Complete |
| RSRCH-01 | Phase 105 | Complete |
| RSRCH-02 | Phase 105 | Complete |
| RSRCH-03 | Phase 105 | Complete |
| OBS-01 | Phase 106 | Pending |
| OBS-02 | Phase 106 | Pending |
| INTG-01 | Phase 107 | Pending |
| INTG-02 | Phase 107 | Pending |
| INTG-03 | Phase 107 | Pending |
| INTG-04 | Phase 107 | Pending |

**Coverage:**
- v0.13 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Traceability updated: 2026-03-23 (roadmap created)*
