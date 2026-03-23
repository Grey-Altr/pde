# Architecture Research

**Domain:** Autonomous experiment loop integration — PDE v0.13 AutoResearch
**Researched:** 2026-03-23
**Confidence:** HIGH (based on direct codebase analysis; all integration points verified against current source)

---

> **Scope note:** This file covers only the v0.13 AutoResearch integration architecture.
> The broader PDE architecture (event bus, tmux dashboard, workflow engine, state model, MCP layer)
> is documented in PROJECT.md. The v0.12 business type and v0.4 self-improvement fleet are the
> primary architectural precedents for patterns used here.

---

## Standard Architecture

### System Overview — Experiment Loop Integration

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Skills Layer (slash commands)                     │
│                                                                           │
│  EXISTING                               NEW                               │
│  /pde:research-phase                    /pde:optimize                     │
│  /pde:plan-phase (unmodified)           (experiment loop entry point)     │
│  /pde:execute-phase (unmodified)                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                    Workflow Engine (markdown workflow files)               │
│                                                                           │
│  EXISTING (unmodified)                  NEW                               │
│  ┌──────────────────┐                  ┌──────────────────────────────┐  │
│  │ execute-phase.md │                  │ optimize.md                  │  │
│  │ research-phase.md│                  │ (experiment orchestrator)    │  │
│  │ autonomous.md    │                  └──────────────────────────────┘  │
│  └──────────────────┘                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                        Agent Layer (YAML frontmatter)                     │
│                                                                           │
│  EXISTING (unmodified)                  NEW                               │
│  ┌────────────────────┐                ┌──────────────────────────────┐  │
│  │ pde-phase-researcher│               │ pde-experiment-runner        │  │
│  │ pde-executor        │               │ (mutate + measure subagent)  │  │
│  │ pde-plan-checker    │               └──────────────────────────────┘  │
│  └────────────────────┘                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                    Tool Layer (bin/pde-tools.cjs commands)                │
│                                                                           │
│  EXISTING (unmodified)                  NEW                               │
│  commit, state load/update             experiment init/status            │
│  roadmap get-phase                     experiment commit (tagged)        │
│  design manifest-read                  experiment reset (to tag)         │
│  tracking init/set-status              metric eval <file>                │
├──────────────────────────────────────────────────────────────────────────┤
│                     State Layer (.planning/)                               │
│                                                                           │
│  EXISTING (unmodified)                  NEW                               │
│  STATE.md, ROADMAP.md                  .planning/experiments/            │
│  phases/{N}-{slug}/                      {slug}-EXPERIMENT.md            │
│  config.json                             {slug}-EXPERIMENT-LOG.ndjson    │
│  design-manifest.json                    {slug}-EXPERIMENT-BEST.json     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|---------------|-----------------|
| `commands/optimize.md` | `/pde:optimize` entry point — parse metric + search space + budget, spawn optimize workflow | NEW |
| `workflows/optimize.md` | Experiment orchestrator — define spec, drive iteration loop, call runner, gate on keep/discard threshold | NEW |
| `agents/pde-experiment-runner.md` | Mutation subagent — receives single candidate mutation, applies it to mutable files, runs metric script, returns structured JSON result | NEW |
| `bin/lib/experiment.cjs` | State machine for exploratory commits — `init`, `commit-candidate`, `reset-to-baseline`, `promote-best` operations wrapping `execGit` from `core.cjs` | NEW |
| `pde-tools.cjs` (dispatch) | Expose experiment subcommands as top-level CLI (`experiment init`, `experiment commit`, `experiment reset`, `metric eval`) | MODIFIED — ~30 lines |
| `agents/pde-phase-researcher.md` | Gain `--empirical` mode flag: instead of returning RESEARCH.md, returns RESEARCH.md + `try_candidates: [...]` list for the optimize workflow to execute | MODIFIED — additive flag, ~40 lines |
| `.planning/experiments/` | Persisted experiment state directory — one subdirectory per experiment run | NEW (dir) |

---

## Recommended Project Structure

The experiment loop adds a single new state directory alongside the existing `.planning/phases/` tree:

```
.planning/
├── STATE.md                          (existing — unmodified)
├── ROADMAP.md                        (existing — unmodified)
├── config.json                       (existing — gains experiment_defaults section)
├── phases/                           (existing — unmodified)
│   └── {N}-{slug}/
├── experiments/                      (NEW)
│   └── {slug}/                       (one per /pde:optimize run)
│       ├── EXPERIMENT.md             (spec: metric, search space, budget, mutable files)
│       ├── EXPERIMENT-LOG.ndjson     (per-iteration results — append-only)
│       └── EXPERIMENT-BEST.json      (current best candidate snapshot)
└── design/                           (existing — unmodified)

agents/
├── pde-experiment-runner.md          (NEW — mutation + measurement subagent)
└── pde-phase-researcher.md           (MODIFIED — --empirical flag)

workflows/
├── optimize.md                       (NEW — experiment orchestrator workflow)
└── research-phase.md                 (MODIFIED — --empirical mode routing)

commands/
└── optimize.md                       (NEW — /pde:optimize slash command)

bin/
└── lib/
    └── experiment.cjs                (NEW — git state machine for exploratory commits)
```

### Structure Rationale

- **`.planning/experiments/` not inside `.planning/phases/`:** Experiments are not phases. They do not follow the phase lifecycle (PLAN.md → SUMMARY.md → VERIFICATION.md). A dedicated directory prevents the `roadmap analyze` and `phase complete` tooling from treating experiment state as incomplete phase work.
- **Per-run subdirectory `{slug}/`:** Multiple experiments can run in sequence (optimize workflow A, then optimize workflow B). The slug is derived from the metric + timestamp (`{metric}-{date}`). Each run is self-contained.
- **`EXPERIMENT-LOG.ndjson` as append-only:** Matches the NDJSON event bus pattern already established in v0.8. Each iteration writes one line — no locking needed for sequential experiments. The orchestrator reads the full log to compute trends and select the best candidate.
- **`EXPERIMENT-BEST.json`:** Snapshot of the best git hash + metric score seen so far. Written atomically after each improvement. Allows recovery if a session ends mid-experiment — the next session can read EXPERIMENT-BEST.json and continue from the best-known state.
- **`config.json` gains `experiment_defaults`:** Reuses the existing config pattern (already has `model_profile`, `commit_docs`, etc.). Adds: `experiment.max_iterations`, `experiment.improvement_threshold`, `experiment.protected_files_check`. No new config file needed.

---

## Architectural Patterns

### Pattern 1: Exploratory Commit State Machine (commit / tag / reset)

**What:** The experiment loop uses a two-tier git commit strategy. Normal PDE commits (`feat`, `fix`, `docs`) are permanent. Exploratory commits are tagged with `pde-exp/{slug}/{n}` and may be reset if the metric regresses. The `experiment.cjs` module wraps `execGit` from `core.cjs` to implement this.

**When to use:** Every time the experiment runner applies a candidate mutation, before running the metric. If metric improves: tag is kept (promoted to permanent commit). If metric regresses: `git reset --hard {baseline-hash}` reverts all mutable file changes.

**State machine transitions:**

```
BASELINE (known good hash, stored in EXPERIMENT.md)
    ↓ experiment commit-candidate
CANDIDATE (staged mutation, tagged pde-exp/{slug}/{n})
    ↓ metric eval returns score
    ├── score > (best_score + threshold)
    │       → PROMOTE: amend tag to pde-exp/{slug}/{n}-KEPT, update EXPERIMENT-BEST.json
    │         → new BASELINE = CANDIDATE hash
    └── score <= (best_score + threshold)
            → DISCARD: git reset --hard {baseline-hash}
              → BASELINE unchanged
```

**Critical constraint:** The state machine must verify that only `mutable_files` listed in EXPERIMENT.md are staged before any exploratory commit. Files in `immutable_boundaries` (see Pattern 3) must never be staged. The `experiment commit-candidate` command runs this check before committing.

**Implementation in `experiment.cjs`:**
```javascript
// Simplified — real impl adds boundary checks
function commitCandidate(cwd, slug, n, message) {
  const result = execGit(cwd, ['commit', '-m', `exp(${slug}): ${message}`]);
  if (result.exitCode !== 0) return { ok: false, error: result.stderr };
  execGit(cwd, ['tag', `pde-exp/${slug}/${n}`]);
  return { ok: true, hash: execGit(cwd, ['rev-parse', 'HEAD']).stdout };
}

function resetToBaseline(cwd, baselineHash) {
  return execGit(cwd, ['reset', '--hard', baselineHash]);
}
```

**Trade-offs:** Tags accumulate in the local repo. After experiment completion, `experiment cleanup` should delete `pde-exp/{slug}/*` tags. Tags are local-only (not pushed) so they don't pollute remotes.

### Pattern 2: Metric-as-Script (measure via shell, not LLM)

**What:** The experiment metric is defined as a shell command or Node.js script that returns a numeric score to stdout. The experiment runner executes it via `Bash` tool and parses the output. The metric script is the single source of truth for improvement — no LLM judgment in the keep/discard decision.

**When to use:** Every iteration. The metric command is stored in `EXPERIMENT.md` as a string (e.g., `node tests/quality-score.cjs`, `grep -c "VERIFIED" .planning/phases/99-*/RESEARCH-VALIDATION.md`). The runner executes it before and after mutation and compares.

**Metric spec in EXPERIMENT.md:**
```yaml
metric:
  command: "node tests/workflow-quality.cjs --phase 30 --score-only"
  baseline_score: 72.4
  improvement_threshold: 2.0    # minimum delta to keep (prevents noise promotions)
  higher_is_better: true
  timeout_seconds: 60
```

**Why not LLM-as-judge:** LLM scoring is non-deterministic and cannot serve as a reliable keep/discard gate — the same output may score 72 or 79 on two calls. Shell scripts and test runners are deterministic. The v0.4 self-improvement fleet already uses this principle: Nyquist tests are the ground truth, not LLM opinion.

**Existing precedent:** `tests/*.cjs` using `node:test` — already the PDE test convention. The metric script follows the same pattern.

### Pattern 3: Mutable/Immutable File Boundary Enforcement

**What:** The experiment spec declares which files the runner may modify (`mutable_files`) and which it must never touch (`immutable_boundaries`). The `experiment commit-candidate` command reads `EXPERIMENT.md`, diffs `git status`, and aborts if any staged file is not in the mutable list.

**When to use:** Before every exploratory commit. This is the primary safety mechanism preventing experiments from corrupting PDE infrastructure files.

**Boundary spec in EXPERIMENT.md:**
```yaml
mutable_files:
  - "workflows/critique.md"
  - "workflows/iterate.md"
boundaries:
  immutable:
    - "bin/pde-tools.cjs"          # core tool — changes affect all phases
    - "bin/lib/"                    # library modules
    - ".planning/STATE.md"          # phase state
    - ".planning/ROADMAP.md"        # phase structure
    - "protected-files.json"        # PDE's own protected list
    - "agents/"                     # all agent definitions (circular risk)
    - "tests/"                      # test files (metric scripts must not change)
```

**Relationship to `protected-files.json`:** PDE already has `protected-files.json` as a prompt-level enforcement mechanism. The experiment boundary check adds a pre-commit enforcement layer that is tool-verified (not prompt-only). The two mechanisms are complementary — `protected-files.json` prevents the agent from writing, the boundary check prevents exploratory commits from staging.

**Trade-offs:** The mutable list must be explicit — no globs. This is intentional: a typo in a glob that accidentally includes `bin/pde-tools.cjs` would be catastrophic. Explicit lists are auditable.

### Pattern 4: Researcher Empirical Mode (`--empirical` flag)

**What:** `pde-phase-researcher` gains an `--empirical` flag. When set, instead of returning only a RESEARCH.md with implementation recommendations, the researcher also returns a `try_candidates` list — specific, bounded mutations to test in the experiment loop. Each candidate is a self-contained description of one change: which files, what to change, expected effect.

**When to use:** Only when invoked from the optimize workflow. Standard `research-phase.md` invocations are unaffected.

**Return structure (empirical mode only):**
```json
{
  "status": "RESEARCH_COMPLETE",
  "research_file": ".planning/phases/99-optimize/RESEARCH.md",
  "try_candidates": [
    {
      "id": "C1",
      "description": "Add explicit chain-of-thought prompt to critique Step 3",
      "mutable_files": ["workflows/critique.md"],
      "change_summary": "Insert 4-line reasoning scaffold before the scoring rubric",
      "expected_delta": "+3 to +8 quality score points",
      "confidence": "MEDIUM"
    }
  ]
}
```

**Why modify researcher rather than add new agent:** The researcher already understands PDE's file structure, workflow patterns, and which changes are safe. Adding empirical mode reuses that domain knowledge. A new "candidate generator" agent would need to learn all the same context from scratch. The modification is additive — the researcher returns everything it always returned, plus the candidate list. No existing callers are affected because they ignore unknown fields.

---

## Data Flow: Experiment Lifecycle End to End

### Invocation to First Candidate

```
User: /pde:optimize --metric "node tests/quality.cjs" \
                    --target workflows/critique.md \
                    --budget 8
    ↓
commands/optimize.md: parse args, resolve models, spawn optimize workflow
    ↓
optimize.md Step 1: scaffold EXPERIMENT.md
  → writes .planning/experiments/{slug}/EXPERIMENT.md
  → stores: metric command, mutable_files, baseline_score (from first metric run),
            improvement_threshold, max_iterations=8
  → git commit "exp({slug}): initialize experiment baseline"
  → stores baseline_hash in EXPERIMENT.md
    ↓
optimize.md Step 2: spawn pde-phase-researcher --empirical
  → researcher reads mutable_files, reads metric spec
  → returns RESEARCH.md + try_candidates list (C1..CN)
    ↓
optimize.md Step 3: enter iteration loop
```

### Iteration Loop (per candidate)

```
optimize.md: take next candidate Ci from try_candidates queue
    ↓
spawn pde-experiment-runner with:
  - candidate spec (description, mutable_files, change_summary)
  - experiment slug
  - iteration number i
  - baseline_hash (from EXPERIMENT.md)
    ↓
pde-experiment-runner:
  Step 1: apply mutation to mutable_files (Write/Edit tool)
  Step 2: node pde-tools.cjs experiment commit-candidate {slug} {i}
    → boundary check: abort if staged files outside mutable list
    → git commit -m "exp({slug}): {change_summary}"
    → git tag pde-exp/{slug}/{i}
    → returns: candidate_hash, ok/fail
  Step 3: run metric command via Bash tool
    → parse numeric score from stdout
    → timeout enforced ({timeout_seconds} from spec)
  Step 4: return structured JSON to optimize.md orchestrator:
    {
      "iteration": i,
      "candidate_id": "C1",
      "candidate_hash": "abc123",
      "metric_score": 77.2,
      "baseline_score": 72.4,
      "delta": 4.8,
      "status": "metric_collected"
    }
    ↓
optimize.md: keep/discard decision
    ├── delta > improvement_threshold (2.0)?
    │     → KEEP: update EXPERIMENT-BEST.json, new baseline = candidate_hash
    │       append EXPERIMENT-LOG.ndjson: {iteration, delta, decision: "KEEP", hash}
    │       display: "Iteration {i}: KEPT +{delta} (score: {score})"
    └── delta <= improvement_threshold?
          → DISCARD: node pde-tools.cjs experiment reset {baseline_hash}
            → git reset --hard {baseline_hash}
            append EXPERIMENT-LOG.ndjson: {iteration, delta, decision: "DISCARD"}
            display: "Iteration {i}: DISCARDED (delta {delta} < threshold {threshold})"
    ↓
Check budget: iterations_used < max_iterations AND try_candidates queue not empty?
  → YES: spawn next pde-experiment-runner (next candidate)
  → NO: finalize experiment
```

### Finalization

```
optimize.md Step 4: finalize
    ↓
Read EXPERIMENT-BEST.json: best_hash, best_score, best_candidate_id
    ↓
git checkout {best_hash} -- {mutable_files}   (if best_hash != HEAD)
git commit -m "feat: promote best experiment candidate {best_candidate_id}
               score {best_score} (+{best_delta} vs baseline)"
    ↓
experiment cleanup: delete pde-exp/{slug}/* tags
    ↓
append EXPERIMENT.md with ## Results section:
  - iterations run
  - improvements found (N)
  - best candidate, score, delta
  - promoted commit hash
    ↓
node pde-tools.cjs commit "exp({slug}): finalize experiment" \
  --files .planning/experiments/{slug}/
    ↓
display summary table:
  | Iteration | Candidate | Score | Delta | Decision |
  |-----------|-----------|-------|-------|----------|
  | 1         | C1        | 77.2  | +4.8  | KEPT     |
  | 2         | C2        | 71.1  | -1.3  | DISCARDED|
  ...
  Best result: {score} (+{delta}) — committed as {hash}
```

---

## Integration Points with Existing PDE Components

### Touches vs Does Not Touch

| Existing Component | Relationship | Modification |
|-------------------|-------------|-------------|
| `bin/lib/core.cjs` | `experiment.cjs` calls `execGit` from here | NOT modified — experiment.cjs imports it |
| `bin/pde-tools.cjs` | Dispatch block gains `experiment` and `metric` subcommands | MODIFIED — ~30 lines in the case dispatch |
| `agents/pde-executor.md` | Normal plan execution, not involved in experiments | NOT modified |
| `agents/pde-phase-researcher.md` | Gains `--empirical` flag and `try_candidates` return field | MODIFIED — additive, ~40 lines |
| `workflows/execute-phase.md` | Normal phase execution, not involved in experiments | NOT modified |
| `workflows/research-phase.md` | Gains routing for `--empirical` flag to pass to researcher | MODIFIED — ~10 lines |
| `bin/lib/event-bus.cjs` | Experiment events (`exp_iteration_started`, `exp_iteration_complete`) can be emitted for dashboard visibility | MODIFIED — add 2 event types |
| `.planning/config.json` (schema) | Gains `experiment_defaults` section | MODIFIED — template updated |
| `protected-files.json` | Read by experiment boundary checker but not modified | NOT modified |
| `workflows/autonomous.md` | Not involved — experiments are explicit invocations, not autonomous phases | NOT modified |
| `bin/lib/design.cjs` | Not involved | NOT modified |
| MCP bridge layer | Not involved | NOT modified |

### Agent Interaction Model

The experiment runner is a distinct agent type from `pde-executor`. The distinction matters:

| Capability | pde-executor | pde-experiment-runner |
|-----------|-------------|----------------------|
| Allowed tools | Read, Write, Edit, Bash, Glob, Grep | Read, Write, Edit, Bash (metric only), Glob, Grep |
| Commits | Regular `feat/fix/docs` commits (permanent) | Exploratory commits via `pde-tools experiment commit-candidate` only |
| Scope | Full plan file (all tasks) | Single candidate mutation (one bounded change) |
| File boundaries | Protected-files.json (prompt enforcement) | EXPERIMENT.md `mutable_files` (tool-verified) |
| Returns | SUMMARY.md written to disk | Structured JSON to orchestrator (does not write SUMMARY) |
| Context model | Fresh context per plan (Pattern A from execute-plan.md) | Fresh context per iteration (same pattern, smaller scope) |

The runner is explicitly READ-ONLY for metric execution. It runs `node tests/quality.cjs` via Bash but must not modify test files. This mirrors the `pde-research-validator` READ-ONLY constraint.

### Git Layer Integration

The experiment commit state machine integrates below the existing `pde-tools.cjs commit` wrapper:

```
Existing:
  pde-tools.cjs commit <msg> --files f1 f2
    → calls execGit(cwd, ['add', ...files])
    → calls execGit(cwd, ['commit', '-m', msg])

New (experiment.cjs):
  experiment commit-candidate {slug} {n}
    → reads EXPERIMENT.md for mutable_files list
    → calls execGit(cwd, ['diff', '--cached', '--name-only'])
    → validates staged files are subset of mutable_files
    → calls execGit(cwd, ['commit', '-m', msg])
    → calls execGit(cwd, ['tag', `pde-exp/${slug}/${n}`])

  experiment reset {baseline-hash}
    → calls execGit(cwd, ['reset', '--hard', baselineHash])
    → DOES NOT call pde-tools.cjs commit (no commit on reset)
```

The two paths are independent — the experiment state machine never calls through `pde-tools.cjs commit` because it needs tag management and boundary checks that the existing commit wrapper does not have.

---

## New vs Modified File Inventory

### New Files

| File | Purpose | Why New (Not Modified) |
|------|---------|----------------------|
| `commands/optimize.md` | `/pde:optimize` slash command entry point | New user-facing command — follows existing command bootstrap pattern |
| `workflows/optimize.md` | Experiment orchestrator — full iteration loop | Too different from execute-phase to modify it; experiment lifecycle has distinct states (BASELINE, CANDIDATE, PROMOTE, DISCARD) not present in normal execution |
| `agents/pde-experiment-runner.md` | Mutation + measurement subagent | Different tool permissions, different output format, different scope from pde-executor. Reusing pde-executor would require conditional logic that degrades both |
| `bin/lib/experiment.cjs` | Git state machine for exploratory commits | The exploratory commit pattern (tag, reset, promote) is not supported by existing `core.cjs` execGit or the `commit` command in pde-tools.cjs. New module follows the established CJS lib pattern |
| `.planning/experiments/` | Runtime experiment state storage | Experiments are not phases — they must not appear in roadmap analyze output or confuse phase tooling |

### Modified Files

| File | Modification | Estimated Scope |
|------|-------------|-----------------|
| `bin/pde-tools.cjs` | Add `experiment` and `metric` subcommand dispatch blocks | ~30 lines |
| `agents/pde-phase-researcher.md` | Add `--empirical` flag handling section + `try_candidates` return block in empirical mode | ~40 lines (additive) |
| `workflows/research-phase.md` | Add `--empirical` flag detection + pass to researcher spawn | ~10 lines |
| `bin/lib/event-bus.cjs` | Add `exp_iteration_started` and `exp_iteration_complete` event type constants | ~6 lines |
| `.planning/config.json` template | Add `experiment_defaults` section with `max_iterations`, `improvement_threshold`, `protected_files_check` | ~8 lines |

---

## Anti-Patterns

### Anti-Pattern 1: Using Regular `pde-tools commit` for Exploratory Commits

**What people do:** Route experiment commits through the existing `pde-tools.cjs commit` wrapper (same as task commits).

**Why it's wrong:** Regular commits have no rollback mechanism and are not tagged. If a metric regresses, you cannot `git reset --hard` back to baseline without also discarding any non-experiment changes that happened to be committed nearby. The exploratory commit state machine exists precisely to create an isolated, reversible commit layer.

**Do this instead:** Use `pde-tools experiment commit-candidate` exclusively for all experiment mutations. Never use `pde-tools commit` inside the experiment runner.

### Anti-Pattern 2: LLM-as-Metric-Judge

**What people do:** Ask Claude to "score" the mutated workflow file and use that score as the keep/discard signal.

**Why it's wrong:** LLM scoring is non-deterministic. The same workflow text can score 72 on one call and 79 on the next. Basing keep/discard on a non-deterministic signal makes the experiment loop a random walk rather than an optimization. The v0.4 quality fleet demonstrated this: Nyquist test counts are reliable, "is this better" LLM ratings are not.

**Do this instead:** The metric command must be a deterministic script (`node tests/quality.cjs`, `grep -c VERIFIED`). LLM judgment belongs in the researcher's candidate generation phase (where non-determinism is acceptable) not in the keep/discard gate.

### Anti-Pattern 3: Placing Experiment State Inside `.planning/phases/`

**What people do:** Store `EXPERIMENT.md` in a new phase directory (e.g., `.planning/phases/99-optimize/EXPERIMENT.md`).

**Why it's wrong:** `pde-tools roadmap analyze` scans `.planning/phases/` for all directories and checks if they have PLAN.md + SUMMARY.md. An experiment directory has neither. The analyzer will flag it as an incomplete phase, the readiness gate will fire, and `autonomous.md` will try to plan and execute it as a normal phase. The confusion propagates through every tool that iterates over phases.

**Do this instead:** Use the dedicated `.planning/experiments/` directory, which exists outside the phase scanning path.

### Anti-Pattern 4: Allowing Mutable File Globs in Experiment Spec

**What people do:** Specify `mutable_files: ["workflows/*.md"]` in EXPERIMENT.md to give the runner flexibility.

**Why it's wrong:** A glob boundary is unauditable at commit time. The `experiment commit-candidate` boundary check would need to expand the glob against the working tree — and a new file created by the runner that matches the glob would silently be included. The accidental modification of `workflows/build.md` or `workflows/deploy.md` would corrupt production workflows with no easy audit trail.

**Do this instead:** Require explicit file paths in `mutable_files`. The optimize workflow should reject EXPERIMENT.md specs that contain globs or directory paths. If the experiment needs to touch multiple files, list each one explicitly.

### Anti-Pattern 5: Running Experiments Inside Active Phase Execution

**What people do:** Invoke `/pde:optimize` during an ongoing `execute-phase` run (from a checkpoint or nested Task call).

**Why it's wrong:** The experiment loop performs `git reset --hard` operations. If a parent `execute-phase` has uncommitted changes in flight, a reset would destroy them. The experiment runner's `git reset --hard` is scoped to `baseline_hash` which predates any in-flight work.

**Do this instead:** Experiments are standalone operations, not nested calls. The optimize workflow checks `git status` at the start and aborts if there are uncommitted changes outside the experiment's mutable files. The `/pde:optimize` command is safe to run between phases, not during them.

---

## Scalability Considerations

The experiment loop is bounded by design. Scalability is not a primary concern, but budget exhaustion and session limits are:

| Scale | Concern | Mitigation |
|-------|---------|------------|
| 8 iterations (default) | Session length — 8 runner spawns in one session | Each iteration is a fresh subagent. Total session cost is 8 × runner context. Default budget of 8 keeps total cost manageable. |
| 20+ iterations | Context accumulation in orchestrator | Orchestrator reads only EXPERIMENT-BEST.json and EXPERIMENT-LOG.ndjson (NDJSON is append-only, read line count not full content). Orchestrator context stays flat. |
| Multi-file mutations | Boundary complexity | Explicit mutable_files list must be validated at spec time. More files = more rollback surface. Recommend single-file experiments for first version. |
| Long-running metric scripts | Timeout | `timeout_seconds` in spec. Runner kills metric process and returns `metric_timeout` status after deadline. |

---

## Suggested Build Order

Dependencies run from bottom up: the git state machine must exist before the runner, the runner before the orchestrator, the orchestrator before the command.

| Phase | Files | Rationale |
|-------|-------|-----------|
| 1 | `bin/lib/experiment.cjs`, `pde-tools.cjs` dispatch additions | Git state machine is the lowest-level dependency. All other components call it. Build and test in isolation before agents exist. Analogous to how `event-bus.cjs` shipped in Phase 58 before any workflow consumed it. |
| 2 | `agents/pde-experiment-runner.md` | Runner depends on `experiment commit-candidate` and `metric eval` from Phase 1. Can be defined before the orchestrator — it is a pure subagent with no awareness of the outer loop. |
| 3 | `workflows/optimize.md`, `commands/optimize.md` | Orchestrator depends on runner (Phase 2) and git state machine (Phase 1). The command entry point is trivial (~20 lines) and ships in the same phase as the workflow. |
| 4 | `agents/pde-phase-researcher.md` (empirical flag), `workflows/research-phase.md` routing | Empirical mode is additive and decoupled. The researcher can be modified after the loop is functional. This allows testing the basic commit/reset/metric loop without needing candidates from the researcher. |
| 5 | Event bus additions, config template | Integration polish — emit experiment events to the tmux dashboard, add `experiment_defaults` to config template. Can ship in same phase as researcher modification or separately. |
| 6 | Nyquist regression tests | Verify: non-experiment workflows unaffected, boundary check rejects out-of-bounds files, reset restores baseline, metric timeout is respected, protected files are never staged. |

---

## Sources

- Direct codebase analysis — HIGH confidence:
  - `bin/lib/core.cjs` — `execGit` function, `loadConfig` structure, CJS module conventions
  - `bin/lib/event-bus.cjs` — NDJSON append pattern, session-scoped file naming, error swallowing contract
  - `bin/pde-tools.cjs` — dispatch block pattern, subcommand registration convention, `@file:` large-payload pattern
  - `agents/pde-research-validator.md` — read-only agent pattern, structured JSON return to orchestrator (not file write)
  - `agents/pde-experiment-runner.md` (does not exist yet) — modeled on `pde-executor` + `pde-research-validator` hybrid pattern
  - `workflows/execute-phase.md` — fresh-context-per-subagent Pattern A, agent tracking protocol
  - `workflows/autonomous.md` — iteration loop structure, phase re-read after each cycle, blocker handling
  - `references/git-integration.md` — commit format conventions, per-task commit principle, `git reset` usage in `complete-milestone.md`
  - `.planning/PROJECT.md` — v0.13 target features, out-of-scope list, existing architecture summary, constraints

---

*Architecture research for: PDE v0.13 — AutoResearch Experiment Loop Integration*
*Researched: 2026-03-23*
