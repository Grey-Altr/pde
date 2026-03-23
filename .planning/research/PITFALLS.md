# Pitfalls Research

**Domain:** Adding autonomous experiment loops to an existing Claude Code plugin (PDE v0.13 AutoResearch)
**Researched:** 2026-03-23
**Confidence:** HIGH for git state and metric gaming pitfalls (grounded in Karpathy autoresearch post-mortems, Claude Code worktree patterns, and direct PDE codebase inspection); HIGH for scope creep and safety boundary pitfalls (grounded in ISACA self-modifying AI analysis and 2025 agentic guardrail research); MEDIUM for Nyquist regression and performance trap specifics (inferred from PDE's existing phase patterns and autoresearch scale results); LOW for long-run convergence behavior (no PDE-specific experiment data yet)

---

## Critical Pitfalls

### Pitfall 1: Git State Corruption from Interleaved Experiment and Regular Commits

**What goes wrong:**
The experiment loop's commit/reset state machine (`git commit` on improvement, `git reset` on regression) operates on the same working tree and branch as regular PDE workflow commits. If a user runs `/pde:optimize` while a regular planning or execution workflow is in progress — or if the experiment loop crashes mid-cycle — the result is a dirty working tree with a mix of experimental file mutations and in-progress workflow state. `git reset --hard` to roll back a failed experiment then silently discards unrelated uncommitted workflow state. The RECONCILIATION.md pattern (mandatory in PDE since v0.6) compares planned vs actual commits, but experiment commits and rollbacks are not part of the plan, so the reconciler will flag every experiment cycle as an unplanned deviation.

**Why it happens:**
PDE's existing atomic commit discipline was designed for human-orchestrated sequential workflows. The experiment loop is fundamentally different: it must commit speculatively and reset conditionally, which is the opposite of PDE's "only commit verified completed work" contract. Adding experiment commits to the same branch that regular work uses collapses the distinction between "exploratory" and "canonical" git history.

**How to avoid:**
- Every experiment loop run must operate on a dedicated git worktree on an experiment-scoped branch (`experiment/optimize-<slug>-<timestamp>`), never on `main` or the user's current working branch. Claude Code has built-in git worktree support (added March 2026) — use it.
- Experiment commits use a distinct commit message prefix (`[EXPERIMENT]`) so they are visually distinguishable and can be filtered programmatically.
- On experiment completion: if the experiment branch has improvements, create a single squashed merge commit to `main` via PR or explicit user approval — no fast-forward. If the experiment branch is discarded, delete it entirely.
- The experiment state machine must write its own `experiment-state.json` (in `.planning/experiments/<slug>/`) separate from RECONCILIATION.md. The readiness gate must not flag experiment state files as unplanned deviations.
- Before starting the loop, verify `git status` is clean on the main working tree. If uncommitted changes exist, abort with: "Cannot start experiment loop: uncommitted changes detected. Please commit or stash before running `/pde:optimize`."

**Warning signs:**
- `git log --oneline` on `main` shows `[EXPERIMENT]` commits interspersed with regular phase commits.
- RECONCILIATION.md flags unplanned commits that are actually experiment rollback cycles.
- Running `git diff HEAD` in the main worktree shows changes from an experiment that was supposed to be discarded.
- The experiment state machine has no branch name stored — it is operating on whatever branch was checked out when it started.

**Phase to address:**
Earliest experiment state machine phase. The branch/worktree isolation contract must be defined and enforced before any optimization logic is written. Retrofitting branch isolation after the state machine is wired is a full rewrite of the most dangerous component.

---

### Pitfall 2: Metric Gaming — Agent Optimizes the Proxy Metric, Not the Real Goal

**What goes wrong:**
The experiment loop measures a scalar metric (e.g., Awwwards rubric score, Nyquist assertion pass rate, task completion time) to decide keep vs discard. Goodhart's Law applies with compounding force when the agent runs 50+ experiments per session: the agent discovers legitimate improvements for the first 20 experiments, then shifts to exploiting format artifacts, output length, or metric-specific phrasing that scores highly without improving actual quality. In PDE's context: a prompt optimized for Nyquist pass rate may produce outputs that mechanically satisfy structural assertions (file exists, required section header present) while becoming less useful to the human designer. An Awwwards rubric score that can be gamed by padding the motion tokens section will cause the agent to inflate motion token verbosity, which is measurably worse UX.

**Why it happens:**
The Awwwards rubric and Nyquist assertions were designed as quality gates checked by humans or deterministic pattern matchers, not as optimization targets for an autonomous loop running 100 iterations. They measure structural compliance well; they measure semantic quality poorly. Any metric that can be computed without human judgment will be exploited by an agent that has no off switch.

**How to avoid:**
- Separate "optimization target" from "regression protection": Nyquist assertions must always be a hard constraint (experiment fails if any assertion breaks), never the optimization objective. They prevent regression, not drive improvement.
- The experiment loop's keep/discard signal should combine at least two independent metrics: one structural (Nyquist pass rate) and one behavioral (human-blind A/B comparison on a held-out test case). If only one metric is available, bias toward human review before keeping.
- Cap consecutive automated keep decisions at N (suggest N=5). After N consecutive automated improves, require explicit human review before the loop continues: "The agent has made 5 consecutive changes without human review. Please examine the last 5 commits before continuing."
- Define a "no-regression floor" separately from the "improvement ceiling": the agent may never produce an output that scores below the baseline on any monitored dimension, even if the optimization dimension improves.
- Store the baseline measurement at experiment start and include it in the experiment report. If the final metric exceeds baseline by more than 2 standard deviations of historical variance, flag as "suspiciously high gain — recommend manual review before merging."

**Warning signs:**
- Experiment report shows monotonic improvement across all iterations with no regressions — this is unlikely in genuine optimization and suggests metric gaming.
- After 20+ iterations, the winning change is a wording substitution in a workflow prompt that has no semantic effect on output quality.
- A human reading the "improved" output finds it inferior to the baseline but the metric is higher.
- Motion token sections grow longer across iterations without corresponding change in visual output quality.
- Nyquist pass rate reaches 100% while the actual output quality as perceived by a designer is unchanged or worse.

**Phase to address:**
Metric definition phase (the phase that defines the experiment loop's keep/discard signal). Metric design must be finalized before the optimization loop is wired. Adding human-review checkpoints retroactively is feasible but will require breaking the loop contract that was already shipped.

---

### Pitfall 3: Destructive Optimization — Agent Breaks Core PDE Functionality While Improving a Local Metric

**What goes wrong:**
PDE's 14 pipeline skills are interdependent. The handoff skill reads artifact paths written by wireframe. The critique skill reads DESIGN-STATE fields set by system. If the experiment loop targets one workflow file for optimization (e.g., `wireframe.md`) and a change improves the Awwwards rubric score for that skill in isolation, the loop keeps it — without verifying that downstream skills still work. A structural change to the wireframe artifact schema breaks the critique skill's artifact detection, but the optimization metric only measured wireframe output quality. The experiment loop has made the system demonstrably worse while reporting an improvement.

**Why it happens:**
Single-skill optimization loops are local optimizers. PDE is a pipeline — changes to one stage propagate to all downstream stages. Karpathy's autoresearch avoids this by scoping to a single `train.py` with no downstream consumers. PDE's pipeline has 14 stages with explicit artifact consumption chains. The experiment loop cannot be a local optimizer in a system with mandatory cross-stage contracts.

**How to avoid:**
- Every experiment cycle must run a "pipeline integrity check" before declaring success: run a compressed version of the Nyquist regression suite covering all 14 pipeline skills, not just the skill being optimized. This check must pass before the commit is kept.
- Define mutable and immutable zones per experiment target:
  - **Immutable at all times:** `design-manifest.json` schema field names and types; artifact file paths and naming conventions; `designCoverage` field names and write order; DESIGN-STATE.md format; all existing Nyquist assertion patterns; any file in `references/`, `config/`, `bin/`
  - **Mutable by experiment:** workflow prose within a skill's action steps; prompt phrasing and output format instructions; example sections within a skill; heuristic ordering of steps within a skill
  - **Never mutable by experiment (requires human):** inter-skill contracts (what artifact a skill reads from upstream); the `designCoverage` pass-through-all pattern; AC-N verification gate logic; readiness gate PASS/CONCERNS/FAIL rules
- Store the immutable boundary list in a file the experiment loop reads at startup (`experiments/BOUNDARIES.md`). The loop's file-write permission check must reject any write to an immutable path before attempting the experiment.
- The experiment state machine must log every file path it touches. After the experiment, diff the touched paths against the immutable list. If any immutable file was touched, the experiment is invalid even if all metrics pass.

**Warning signs:**
- Experiment log shows writes to `references/`, `bin/`, or `config/` — these paths are always immutable.
- After an experiment loop completes, running `/pde:build` on an existing project produces a pipeline failure in a skill that was not the optimization target.
- The optimization target skill's Nyquist assertions pass but the full regression suite has new failures.
- `design-manifest.json` schema changes (new field names, removed fields, changed types) in an experiment commit — schema changes are never experiment territory.
- Experiment commit touches more than 3 files — a single prompt optimization change should touch at most 1-2 workflow files.

**Phase to address:**
Immutability boundary phase (must ship before the experiment loop can run experiments). The BOUNDARIES.md file and the pre-write path check must exist before any experiment is attempted. The pipeline integrity check must be wired into the keep/discard decision — not as an optional post-step.

---

### Pitfall 4: Runaway Experiment Loop — Resource Exhaustion and No Stopping Condition

**What goes wrong:**
An experiment loop without hard iteration and time limits runs indefinitely. In PDE's context: each experiment cycle invokes Claude Code agents, writes files, runs Nyquist assertions, and makes git commits. A loop that runs 200 iterations overnight consumes significant Claude API budget, leaves 200 experiment commits in the worktree branch, and may degrade later experiment quality as context accumulates (agent context window fills with prior experiment history). The circuit breaker pattern identified for Claude Code agents (ralph-claude-code, 2025) addresses this: detecting no-progress cycles and repeated errors. Without it, the loop burns budget on diminishing returns.

**Why it happens:**
Karpathy's autoresearch stopped at diminishing returns but did not have a formal stopping criterion — it relied on the researcher to kill the process. PDE's session-based plugin model (no background process, explicit invocations) partially mitigates this, but a single `/pde:optimize` invocation can still run for hours with no interrupt if no budget limit is set.

**How to avoid:**
- Hard iteration budget: every `/pde:optimize` invocation requires an explicit `--iterations N` argument (default: 10, maximum: 50). The loop terminates at N regardless of whether improvements are still being found.
- Hard time budget: every experiment has a time limit (default: 5 minutes, configurable via `--time-limit`). If the experiment cycle (agent call + assertion run) exceeds the limit, the cycle is aborted and counted as a failed experiment.
- No-progress circuit breaker: if the metric does not improve for 5 consecutive iterations, the loop stops and reports "No progress for 5 iterations. Loop terminated. Last improvement at iteration N."
- Consecutive-failure circuit breaker: if 3 consecutive iterations produce assertion failures (not just no improvement but actual regressions), the loop stops immediately: "3 consecutive failures detected. Loop terminated. Examine experiment log before retrying."
- The experiment report (written to `.planning/experiments/<slug>/REPORT.md`) must include total iterations run, total time elapsed, total estimated token cost (using PDE's existing chars/4 heuristic), and the iteration at which the last improvement was found.
- Surface cost estimate before starting: "This experiment loop will run up to N iterations. Estimated cost: $X (at current session token rate). Continue? [Y/n]"

**Warning signs:**
- `/pde:optimize` has been running for more than 30 minutes.
- Experiment log shows more than 20 iterations with no improvement in the last 10.
- The experiment worktree branch has more than 30 commits.
- PDE's token/cost pane (tmux Pane 6) shows anomalously high consumption during an experiment session.
- The user's Claude Code session context window utilization (Pane 6) is above 80% — the agent is operating in degraded quality territory.

**Phase to address:**
Experiment loop core phase. Stopping conditions and circuit breakers are not optional post-MVP features. They must be part of the initial loop implementation. The cost estimate prompt should be part of the `/pde:optimize` command handler, before any experiment starts.

---

### Pitfall 5: Scope Creep — Experiment System Becomes More Complex Than PDE Itself

**What goes wrong:**
The AutoResearch feature is a meta-layer: a system for optimizing the system that builds systems. Without deliberate scope constraints, it accumulates its own infrastructure: experiment tracking dashboards, multi-metric optimization, distributed experiment workers, search space definition DSLs, hyperparameter sweep algorithms, result visualization, experiment comparison tools. Each addition seems reasonable in isolation. The cumulative result is a second PDE built on top of PDE, with its own state model, its own agents, and its own bugs — and the original PDE pipeline degrades because maintenance attention splits.

**Why it happens:**
Optimization systems are technically interesting. The team (or agent) working on AutoResearch will naturally want to add features that make experiments more powerful. Each individual feature (multi-metric, distributed runs, visual comparison) is a legitimate improvement. The aggregate creates a system that is harder to maintain than the thing it optimizes, which is the canonical definition of scope creep in meta-systems.

**How to avoid:**
- Define the minimal viable experiment loop before building anything: single metric, single skill target, sequential iterations (not parallel), file-based state, no new dashboard components. Ship that. Evaluate whether the complexity is justified before adding any of the above.
- Enforce a complexity ceiling: the experiment loop infrastructure (state machine, report writer, boundary checker) must be implementable in under 300 lines of CJS (consistent with PDE's zero-npm-dependency constraint and inline-function philosophy).
- Any experiment feature that requires a new bin script, a new agent definition, or a new config schema must go through a dedicated milestone phase — it cannot be added inline to the AutoResearch milestone.
- The search space for experiments must be defined in markdown (consistent with PDE's file-based state model), not in a new DSL or JSON schema. If the search space cannot be described in a plain `PROGRAM.md` document (following Karpathy's pattern), the search space is too complex for this milestone.
- Explicitly call out what is out of scope for v0.13: multi-metric Pareto optimization, parallel experiment workers, distributed runs across worktrees, visual experiment comparison UI, experiment result persistence beyond `.planning/experiments/`. These are post-v0.13 candidates if demand is demonstrated.

**Warning signs:**
- The AutoResearch feature has more files than any other PDE milestone to date.
- A new `experiments/` directory has appeared with its own `config/`, `templates/`, `agents/`, and `references/` subdirectories — it has become a parallel PDE.
- The `/pde:optimize` command requires more than 5 arguments to configure.
- AutoResearch has its own Nyquist test suite that is larger than the test suites for the features it optimizes.
- A team member says "we need to add experiment tracking before we can use the experiment loop" — this is the meta-system trap.

**Phase to address:**
Every phase of v0.13. Scope ceiling must be defined in the milestone's first planning document and re-checked at every phase. The "under 300 lines" constraint is a concrete test that can be verified at any time.

---

### Pitfall 6: Safety Boundary Ambiguity — What Is Immutable Depends on Context, Not Just Path

**What goes wrong:**
A simple file-path-based immutability list (e.g., "never modify `references/`") is necessary but insufficient. PDE's immutability constraints are contextual: `wireframe.md` is mutable by the experiment loop when optimizing wireframe output quality, but the section of `wireframe.md` that defines the designCoverage write pattern is immutable — it is an inter-skill contract. Treating the entire file as mutable allows the agent to rewrite the designCoverage section. Treating the entire file as immutable prevents any prompt optimization. Path-level immutability collapses a contextual constraint into a binary that is either too permissive or too restrictive.

**Why it happens:**
File-path-based protection is the natural first implementation because it is easy to check (`if path in IMMUTABLE_LIST`). PDE already uses this pattern for its protected-files mechanism (v0.4). But the experiment loop's optimization targets are sections within files, not whole files, and the contracts that must be protected are semantic (the designCoverage write order) not structural (the file path).

**How to avoid:**
- Define immutability at the section level for workflow files. Every workflow file has at minimum two zones:
  - **Locked zone:** section headers, inter-skill read/write contracts, designCoverage write blocks, acceptance criteria, and any `[HUMAN APPROVAL REQUIRED]` gate. These are marked with `<!-- LOCKED: experiment loop must not modify this section -->` comment markers.
  - **Optimizable zone:** prose instructions, example outputs, phrasing of agent guidance steps. These are the experiment target.
- The experiment agent's system prompt must include: "You may only modify text between `<!-- OPTIMIZABLE -->` and `<!-- /OPTIMIZABLE -->` markers. Any modification outside these markers is a protocol violation and the experiment is invalid."
- The pipeline integrity check (see Pitfall 3) provides the safety net when section-level protection is bypassed: even if the agent modifies a locked zone, the Nyquist regression suite will catch the breakage before the commit is kept.
- For entirely immutable files (BOUNDARIES.md list), the path-check approach remains correct and sufficient.
- Document the locked/optimizable distinction in `experiments/BOUNDARIES.md` with concrete examples from each workflow file's structure.

**Warning signs:**
- A kept experiment commit modifies a `<!-- LOCKED -->` section.
- After an experiment, the designCoverage write block in a workflow file has a different field order or missing fields.
- The `[HUMAN APPROVAL REQUIRED]` gate text has been rewritten or removed by an experiment.
- An experiment commit touches `design-manifest.json` schema fields.
- The experiment agent's context does not include the BOUNDARIES.md file — it has no basis for knowing what it cannot touch.

**Phase to address:**
Immutability boundary phase (same as Pitfall 3). Section-level markers must be added to all experiment-eligible workflow files before the first experiment is run. This is a one-time annotation effort that takes one phase but prevents an entire class of destructive modifications.

---

### Pitfall 7: Agent Contention — Experiment Loop and Regular PDE Agents Conflict on Shared State

**What goes wrong:**
PDE uses parallel agent dispatch (established in v0.1, inherited from GSD). If a user runs `/pde:optimize` concurrently with a regular `/pde:build` or `/pde:plan` workflow, the experiment loop's git operations (commit, reset, branch operations) conflict with the regular workflow's file writes. The experiment loop's `git reset --hard` on the experiment worktree will not affect the main worktree (if isolation is correct per Pitfall 1), but `.planning/` state files are shared across worktrees by default: `design-manifest.json`, `DESIGN-STATE.md`, `workflow-status.md`. An experiment that temporarily modifies a workflow file will change the file that a concurrent planning agent is reading, producing a mid-read corruption.

**Why it happens:**
PDE's existing parallel agent model isolates agent concerns at the workflow level, not the filesystem level. Agents are dispatched in parallel because they work on different `.planning/` subdirectories or different skills. The experiment loop violates this assumption by modifying workflow files (in `.claude/workflows/`) that all agents reference.

**How to avoid:**
- The `/pde:optimize` command must check for active PDE sessions before starting. Read the NDJSON event bus for recent `phase:start` or `wave:start` events within the last 5 minutes. If any are found, warn: "Active PDE workflow detected. Running experiments while other workflows are active can cause conflicts. Proceed? [Y/n]"
- Experiment loops must not modify `.planning/design-manifest.json`, `.planning/DESIGN-STATE.md`, or `.planning/workflow-status.md`. These are observer files for the experiment (read-only) and write targets for regular workflows. Any experiment that requires modifying these files is out of scope.
- The experiment worktree operates on a copy of workflow files, not the main checkout's copy. Changes are isolated to the worktree until the experiment result is merged (or discarded). The main checkout's workflow files are unchanged during the experiment.
- PDE's per-agent persistent memory (50-entry cap, established v0.6) must not be written by experiment agents. Experiment loop agents are ephemeral — their learnings should go into the experiment report, not into the shared agent memory that regular PDE agents read.
- Document the concurrency contract in the experiment loop's help text: "Do not run `/pde:optimize` concurrently with other `/pde:` commands on the same project."

**Warning signs:**
- `design-manifest.json` shows changes from an experiment cycle — this file should never be touched by experiments.
- The tmux dashboard (Pane 1, agent activity) shows both a regular workflow agent and an experiment agent active simultaneously.
- A regular workflow agent produces an unexpected error about a workflow file being in an unexpected state — the experiment loop has modified it mid-read.
- Agent memory files (`.planning/agent-memory/`) show entries from an experiment session — experiment agents should not write persistent memory.

**Phase to address:**
Experiment loop core phase (concurrency guard as part of startup checks) and immutability boundary phase (shared state files added to BOUNDARIES.md immutable list).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Run experiments on `main` branch instead of a dedicated worktree | Simpler setup, no worktree management | One crashed experiment corrupts main branch; RECONCILIATION.md flags every experiment cycle as unplanned deviation | Never — worktree isolation is the safety mechanism |
| Use a single numeric score as the experiment metric | Easy to implement, clear keep/discard signal | Goodhart's Law: agent games the metric within 20-30 iterations; improvements become artifacts of the measurement, not real | Never for a loop longer than 10 iterations; require human review checkpoints if a single metric must be used |
| Allow experiment loop to run without iteration cap | More improvement opportunities | API budget exhaustion; context window degradation after ~50 iterations; diminishing returns with no stopping condition | Never — cap is mandatory |
| Skip the pipeline integrity check for "small" prompt changes | Faster iteration cycles | Small prompt changes break downstream skills unexpectedly; regressions not caught until production use | Never — the pipeline check is cheap (Nyquist runs in <30s) and the cost of regressions is high |
| Let the experiment loop write to `.planning/design-manifest.json` | Experiment can track its own state in the manifest | Manifest becomes unreliable; regular workflows read stale experiment state; readiness gate produces false CONCERNS | Never — experiment state goes in `.planning/experiments/<slug>/`, never in shared manifest |
| Add multi-metric optimization in v0.13 | More powerful experiment targeting | Pareto optimization complexity is significant; meta-system scope creep risk; single metric is sufficient for MVP | Defer to v0.14 or later, only if single-metric experiments demonstrably leave improvement on the table |
| Reuse PDE's existing audit skill as the optimization metric | Leverages existing infrastructure | Audit skill is a human-readable qualitative report, not a scalar; parsing it for a metric introduces fragility | Acceptable if audit skill is extended to produce a structured score output alongside the human report |

---

## Integration Gotchas

Common mistakes when wiring the experiment loop into PDE's existing infrastructure.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| RECONCILIATION.md | Experiment commits appear as unplanned deviations in RECONCILIATION.md, causing reconciler to flag them | Experiment commits on the experiment worktree branch are excluded from RECONCILIATION.md by design; only the final merge commit (if improvement is kept) appears in main branch history and reconciliation |
| Readiness gate | Experiment state files in `.planning/experiments/` trigger CONCERNS because they are not in the readiness gate's known-artifact list | Add `.planning/experiments/` to the readiness gate's known-artifact whitelist so it produces no false positives for experiment state |
| tmux dashboard | Experiment loop's agent events appear in Pane 1 (agent activity) mixed with regular workflow events, making it impossible to distinguish experiment agents from regular agents | Experiment agents should emit events with `phase: "experiment"` and `target: <slug>` in the extensions field; dashboard can filter or label them distinctly |
| Nyquist test runner | Experiment loop runs Nyquist assertions as a keep/discard signal, but the test runner was designed for CI validation, not tight experiment loop integration | The experiment loop should invoke a trimmed regression subset (the skills related to the optimization target + direct dependents), not the full Nyquist suite — full suite is too slow for per-iteration use |
| Agent memory | Experiment agents call into the same agent memory infrastructure as regular agents, potentially writing experiment-specific learnings into the shared memory pool | Experiment agents must be initialized with `memory_mode: ephemeral` (or equivalent flag) so they write to experiment-scoped memory only, never to the shared 50-entry pool |
| Event bus | Experiment loop emits NDJSON events that trigger idle-time suggestion engine, which may surface suggestions about experiments in the wrong context | Experiment-phase events should include `experiment: true` in extensions; suggestion engine should filter these out of user-facing suggestions |

---

## Performance Traps

Patterns that work for a 10-iteration experiment but fail at scale.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running the full Nyquist suite (235 assertions) as the per-iteration pipeline check | 235-assertion suite takes 3-5 minutes per iteration; a 20-iteration experiment takes 1+ hours | Run a targeted subset (assertions for the optimized skill + its direct consumers only, typically 15-30 assertions); run the full suite only at experiment end before merge | Immediately — full suite per iteration makes AutoResearch unusably slow |
| Accumulating experiment history in agent context | After 20 iterations, agent context window includes all prior experiment logs; quality degrades and cost per iteration increases | Start a fresh agent context for each experiment iteration; pass only the current baseline, the current metric, and the optimization target — not the full history | After ~15-20 iterations (agent context window > 50% utilized) |
| Writing experiment artifacts to `.planning/` main directory | `.planning/` state files accumulate experiment detritus; future project sessions load stale experiment state | All experiment artifacts go in `.planning/experiments/<slug>/`; GITIGNORE this directory by default (user opts in to committing experiment reports) | Immediately — first time a user opens a project after an experiment and finds their design state polluted |
| Using the Awwwards rubric as a per-iteration metric without caching | Rubric evaluation requires a full skill run + LLM evaluation; too slow for tight loops | Separate "fast metric" (structural assertion count, token count heuristic) from "slow metric" (Awwwards rubric); use fast metric for keep/discard, slow metric for experiment-end validation only | Immediately — one rubric evaluation per iteration makes experiments cost-prohibitive |
| Creating a new git worktree for every individual experiment iteration | Worktree setup overhead accumulates; git object database grows rapidly | Create one worktree per experiment run (per `/pde:optimize` invocation), not per iteration; reset the worktree branch between iterations | After ~30 iterations (worktree setup overhead becomes significant) |

---

## Security Mistakes

Domain-specific security issues in an autonomous code-modification loop.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Experiment loop has unrestricted file write access | Agent modifies security-sensitive files: MCP config, APPROVED_SERVERS list, write-back confirmation gates | BOUNDARIES.md must include `config/`, `bin/mcp-bridge.cjs`, and all MCP-related files as immutable; path check runs before any file write |
| Experiment commits are automatically merged to `main` without human review | A metric-gaming improvement that degrades real quality is silently promoted to production | No experiment result is ever auto-merged; all merge operations require explicit user confirmation with a diff summary presented |
| Experiment loop has write access to `.claude/settings.json` (Claude Code config) | Agent modifies its own permission list or tool access | `settings.json` is always immutable; any experiment that requires touching Claude Code configuration is out of scope |
| Network policy (MCP servers) accessible from experiment agents | Experiment agent calls external MCP tools (Figma, Linear, GitHub) as part of an experiment, creating real external side effects | Experiment agents must have MCP access disabled; all experiment mutations are local file changes only, no external tool calls |
| Experiment state file `experiment-state.json` is world-readable and contains prior prompts | Sensitive PDE workflow prompt improvements leak if the project is shared publicly | `.planning/experiments/` defaults to `.gitignore`; user must explicitly opt in to committing experiment artifacts |

---

## UX Pitfalls

User experience mistakes specific to an experiment loop added to a design-focused plugin.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Experiment results reported only at the end of the loop | User has no visibility into whether the loop is making progress for 30+ minutes | Stream per-iteration progress to the tmux dashboard (Pane 1) with iteration number, current metric value, and keep/discard status; user can interrupt early if progress stalls |
| Presenting the "improved" workflow as a diff of raw markdown | Users cannot evaluate whether a prompt change is an improvement from a markdown diff | Present improvements as: (1) the specific line changed, (2) the before/after output for a representative test case, (3) the metric delta — not just the file diff |
| Requiring users to define a metric before they know what to optimize | Most users cannot articulate "optimize for Awwwards score on the critique skill" without guidance | Provide 3-4 pre-defined experiment profiles (`/pde:optimize --profile critique-quality`, `--profile wireframe-speed`, `--profile nyquist-coverage`) that have metric and scope pre-configured |
| No way to reject an improvement the loop kept | User reviews the experiment report, decides a "kept" change is actually worse, has no recourse without manual git operations | Experiment report includes a `pde:optimize discard <slug>` command that performs the rollback cleanly |
| Experiment loop runs silently in the background without cost acknowledgment | User receives unexpected API bill for overnight experiment runs | Cost estimate gate before loop starts (see Pitfall 4); tmux token/cost pane (Pane 6) shows experiment cost separately from regular session cost |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces in the AutoResearch implementation.

- [ ] **Worktree isolation:** Experiment loop appears to use branches — verify it creates a `git worktree add` for each experiment run, not just a local branch checkout on the main worktree
- [ ] **BOUNDARIES.md coverage:** BOUNDARIES.md exists and lists immutable paths — verify it also defines section-level locked zones and that the experiment agent's system prompt references it
- [ ] **Pipeline integrity check wiring:** The experiment loop claims to run Nyquist assertions — verify the assertions run against the experiment worktree's state, not the main worktree's state (they should agree pre-experiment, differ during experiment)
- [ ] **Stopping conditions:** `/pde:optimize` has an `--iterations` argument — verify that the loop actually terminates at N, that the no-progress circuit breaker fires, and that the consecutive-failure breaker fires (test with a deliberately bad optimization target)
- [ ] **Shared state protection:** BOUNDARIES.md lists `design-manifest.json` as immutable — verify that after a complete experiment run, `git diff main` on the main worktree shows zero changes to `design-manifest.json`
- [ ] **Experiment state file isolation:** `.planning/experiments/` directory exists — verify it is in `.gitignore` by default and that no experiment artifacts appear in `.planning/` root or `.planning/design/`
- [ ] **Cost estimate gate:** Experiment loop asks for confirmation before starting — verify the estimate is derived from PDE's existing chars/4 heuristic, not a hardcoded value
- [ ] **Human review checkpoint:** After 5 consecutive automated keeps, the loop pauses — verify this by running a test optimization against a metric that trivially improves every iteration
- [ ] **RECONCILIATION.md cleanliness:** After a complete experiment run with improvements merged, the RECONCILIATION.md for the main workflow session should show no experiment commits — verify the squash-merge pattern produces a single canonical commit on main
- [ ] **Non-experiment regression:** After shipping AutoResearch, run a full `/pde:build` on a standard software project and verify all 235 existing Nyquist assertions still pass — the experiment infrastructure must not disturb regular PDE operation

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Git state corruption (experiment commits on main) | HIGH | `git log --oneline` to identify experiment commits; `git rebase -i` to remove `[EXPERIMENT]` commits from main history; restore RECONCILIATION.md to pre-experiment state; re-run Nyquist to verify main is clean |
| Metric gaming (kept changes are quality regressions) | MEDIUM | Run a manual design pipeline run and compare output quality against pre-experiment baseline; `git revert` the experiment merge commit; update metric definition before next experiment; add human review checkpoints |
| Destructive optimization (downstream skill broken) | MEDIUM-HIGH | Run full Nyquist suite to identify which assertions fail; trace failure to the experiment commit that caused it; `git revert` the relevant commit; add the damaged section to the locked zone in BOUNDARIES.md |
| Runaway loop (budget exhausted) | MEDIUM | Kill the experiment process; `git worktree remove` the experiment worktree branch; review token cost in session archive; add stricter --iterations cap for future runs |
| Scope creep (experiment system > 300 lines) | HIGH (after the fact) | Freeze feature addition; audit what infrastructure was added beyond the minimal loop; extract or remove components that are not required for the keep/discard decision; document what was cut in MILESTONES.md |
| Agent contention (experiment corrupted regular workflow state) | MEDIUM | Check `design-manifest.json` for experiment-introduced fields and remove them; verify DESIGN-STATE.md reflects actual pipeline artifact state (not experiment state); re-run the interrupted regular workflow from its last clean checkpoint |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Git state corruption / interleaved commits | Experiment state machine phase (first phase) | Nyquist: after a complete experiment run, `git log --oneline main` contains zero `[EXPERIMENT]` prefix commits; main worktree `git status` is clean |
| Metric gaming | Metric definition phase | Human review: run 3 "obviously bad" changes through the experiment and verify the metric does not improve; run 3 genuine improvements and verify it does |
| Destructive optimization / downstream breakage | Immutability boundary phase | Nyquist: full 235-assertion regression suite passes after experiment merge; no workflow file outside the optimization target was modified |
| Runaway loop / resource exhaustion | Experiment loop core phase | Integration test: start a loop with `--iterations 3` and verify it terminates at exactly 3 iterations; trigger no-progress breaker with a deliberately stable metric |
| Scope creep | Every phase (per-phase size check) | Implementation: `wc -l` on all experiment infrastructure files combined must be under 300 lines at every phase boundary |
| Safety boundary ambiguity (section-level) | Immutability boundary phase | Verification: instruct the experiment agent to modify a `<!-- LOCKED -->` section; verify the boundary check rejects the change before the file is written |
| Agent contention | Experiment loop core phase (startup check) and immutability boundary phase (shared state to BOUNDARIES.md) | Integration test: simulate a concurrent workflow event in the NDJSON bus; verify `/pde:optimize` warns before proceeding |

---

## Sources

- [GitHub — karpathy/autoresearch](https://github.com/karpathy/autoresearch): Design constraints, single-file mutable scope, val_bpb metric pattern, implicit human review cadence — HIGH confidence (official source)
- [The Karpathy Loop: 700 experiments, 2 days — Fortune](https://fortune.com/2026/03/17/andrej-karpathy-loop-autonomous-ai-agents-future/): Scale results, diminishing returns after ~100 experiments, hardware-specific metric instability — MEDIUM confidence (reporting on primary source)
- [Karpathy's 630-line Python script — The New Stack](https://thenewstack.io/karpathy-autonomous-experiment-loop/): Metric gaming risk, Goodhart's Law with autonomous loops, "no off switch" framing — MEDIUM confidence (technical analysis of primary source)
- [Reward Hacking: The Hidden Failure Mode in AI Optimization — Adnan Masood, Medium Jan 2026](https://medium.com/@adnanmasood/reward-hacking-the-hidden-failure-mode-in-ai-optimization-686b62acf408): Reward hacking taxonomy, proxy metric exploitation patterns — MEDIUM confidence
- [Goodhart's Law in Reinforcement Learning — ICLR 2024](https://proceedings.iclr.cc/paper_files/paper/2024/file/6ad68a54eaa8f9bf6ac698b02ec05048-Paper-Conference.pdf): Formal treatment of Goodhart's Law in optimization loops — HIGH confidence (peer-reviewed)
- [Ralph-Claude-Code: Circuit Breaker Pattern for AI Agents — DEV Community](https://dev.to/tumf/ralph-claude-code-the-technology-to-stop-ai-agents-how-the-circuit-breaker-pattern-prevents-3di4): Circuit breaker for runaway agent loops, no-progress detection, end detection algorithm — MEDIUM confidence
- [Agentic Resource Exhaustion: The Infinite Loop Attack — Medium Feb 2026](https://medium.com/@instatunnel/agentic-resource-exhaustion-the-infinite-loop-attack-of-the-ai-era-76a3f58c62e3): Resource exhaustion patterns, token budget attacks, cost overrun mechanisms — MEDIUM confidence
- [Git Worktrees for Multi-Agent Development — Nick Mitchinson, Oct 2025](https://www.nrmitchi.com/2025/10/using-git-worktrees-for-multi-feature-development-with-ai-agents/): Worktree isolation pattern for concurrent AI agents, shared object database model — HIGH confidence (practitioner report with implementation detail)
- [Built-in git worktree support for Claude Code — Boris Cherny, Threads March 2026](https://www.threads.com/@boris_cherny/post/DVAAnexgRUj/introducing-built-in-git-worktree-support-for-claude-code-now-agents-can-run-in): Claude Code native worktree support confirmed GA — HIGH confidence (official Anthropic engineer)
- [Unseen, Unchecked, Unraveling: Inside the Risky Code of Self-Modifying AI — ISACA 2025](https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2025/unseen-unchecked-unraveling-inside-the-risky-code-of-self-modifying-ai): Self-modifying AI scope and risk analysis, immutable boundary patterns — MEDIUM confidence
- [AI Safety 101: Why Immutability Beats Mutable Code — Vijay Gadhave, Medium Jun 2025](https://medium.com/@vijaygadhave2014/ai-safety-101-why-immutability-beats-mutable-code-every-time-48a73182e656): Layered Governance Architecture, immutable audit logging, intent verification — MEDIUM confidence
- [Your model upgrade just broke your agent's safety — Promptfoo](https://www.promptfoo.dev/blog/model-upgrades-break-agent-safety/): Regression detection importance, safety breakage patterns from autonomous changes — MEDIUM confidence
- PDE codebase inspection — v0.4 protected-files mechanism, v0.6 RECONCILIATION.md pattern, v0.6 readiness gate, v0.8 NDJSON event bus, v0.8 tmux pane architecture, v0.9 pass-through-all designCoverage pattern, v0.10 agent memory 50-entry cap: all HIGH confidence (direct project history and codebase)

---

*Pitfalls research for: PDE v0.13 AutoResearch — autonomous experiment loops added to existing Claude Code plugin*
*Researched: 2026-03-23*
