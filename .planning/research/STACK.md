# Stack Research

**Domain:** Autonomous experiment loop — AutoResearch integration into existing PDE plugin (v0.13)
**Researched:** 2026-03-23
**Confidence:** HIGH for core loop pattern (Karpathy's pattern verified against official repo and multiple independent implementations); MEDIUM for metric tracking format conventions (no dominant standard — TSV/JSONL both work, verified against autoexp and uditgoenka/autoresearch implementations); LOW for any external experiment tracking libraries (none are needed — see What NOT to Add)

---

## Scope

This document covers ONLY the net-new stack additions required for the v0.13 AutoResearch milestone. The existing PDE stack is validated and out of scope:

- Node.js CommonJS, zero npm deps at plugin root
- `pde-tools.cjs` — atomic git commits, state management, file operations
- `event-bus.cjs` — NDJSON event appends, session scoping
- `mcp-bridge.cjs` — MCP probe/degrade/consent pattern
- Markdown-based state management (`.planning/` directory)
- 235 Nyquist structural regression tests (node:test runner)

**Core verdict: zero new npm packages.** The AutoResearch pattern is a workflow primitive that runs on Node.js built-ins (`fs`, `child_process.spawnSync`, `crypto`) plus git CLI calls. All new capabilities are implemented as a new CJS module (`experiment-loop.cjs`) and markdown workflow files following existing PDE patterns. No external experiment tracking library is warranted.

---

## The Karpathy AutoResearch Pattern — What It Actually Is

Before recommending stack, it is essential to understand what the pattern does and does not require.

**The pattern (from `github.com/karpathy/autoresearch`, March 2026):**

1. Define one quantifiable metric (direction: lower or higher is better)
2. Define a fixed time/iteration budget per experiment
3. Define one mutable file boundary (what the agent can modify)
4. Define one immutable evaluation harness (what measures the metric)
5. Loop forever (or N times):
   a. Agent reads current state + results log + git history
   b. Agent proposes one focused change (hypothesis)
   c. Agent makes the change to the mutable file(s)
   d. `git commit` the change (creates an immutable experiment record)
   e. Run the evaluation harness command
   f. Extract metric value from output
   g. If improved: keep the commit (it stands)
   h. If degraded: `git reset --hard HEAD~1` (discard the commit)
   i. Append result row to `experiments.jsonl`
   j. Repeat
6. Human reviews results log and adjusts `program.md` (the agent's instruction file) to guide future iterations

**What the pattern does NOT require:**

- External experiment tracking service (MLflow, W&B, Comet)
- Database
- HTTP server
- Python
- GPU / ML dependencies
- Any library beyond what already exists in PDE

**What is genuinely novel for PDE:**

- Formalized git state machine for experiment commits vs regular commits (different prefix, different rollback behavior)
- Experiment definition file (analogous to `program.md` in Karpathy's repo)
- Metric extraction from command output (shell command → numeric value)
- Results log in an append-only JSONL format
- Keep/discard decision logic in a CJS module
- `/pde:optimize` slash command entry point
- "Empirical testing mode" for the pde-phase-researcher agent

---

## Recommended Stack

### Core Technologies: New Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js `child_process.spawnSync` (built-in) | Node.js 18+ (already required) | Run experiment evaluation commands and git operations | `spawnSync` from `child_process` avoids shell injection by separating command from arguments — safer than `exec`. PDE already uses this pattern for git invocations. The experiment loop runs the verify command and git reset with `spawnSync('git', ['reset', '--hard', 'HEAD~1'])`. Zero new dependency. |
| Node.js `fs` (built-in) | Node.js 18+ (already required) | Append experiment result rows to `experiments.jsonl` | Same pattern as `safeAppendEvent()` in `event-bus.cjs` — `fs.appendFileSync()` for the results log. Already proven in PDE's observability infrastructure. |
| Node.js `crypto` (built-in) | Node.js 18+ (already required) | Generate experiment IDs (UUID v4) | Same as `randomUUID()` in `event-bus.cjs`. Each experiment gets a stable ID for the JSONL row and git commit message. |
| Git CLI (already required) | Git 2.x+ (already assumed) | Experiment state machine: commit, reset, log inspection | Git is already the PDE state machine for atomic commits via `pde-tools.cjs commit`. The experiment loop needs two additional git operations: `git reset --hard HEAD~1` (discard regression) and `git log --oneline -N --grep` (read experiment history). No new git version requirement. |

### New Module: `experiment-loop.cjs`

The single new CJS module to create. It encapsulates the state machine logic and keeps experiment concerns isolated from the existing `pde-tools.cjs` command surface.

| Module | Location | Purpose | Integration Point |
|--------|----------|---------|-------------------|
| `experiment-loop.cjs` | `bin/lib/experiment-loop.cjs` | Core experiment state machine: parse experiment definition, run verify command, extract metric, keep/discard decision, results log append | Imported by `pde-tools.cjs` for new `experiment` subcommands; also usable directly from workflow markdown files via `node bin/lib/experiment-loop.cjs` |

**Responsibilities of `experiment-loop.cjs`:**

- Parse `experiment.md` (the PDE equivalent of Karpathy's `program.md`)
- Validate: metric name, direction, verify command, mutable file list, budget (max iterations or max wall-clock seconds)
- Execute one iteration: make change → commit → run verify → extract metric → keep or discard
- Append result to `experiments.jsonl` (one JSON object per line, append-only)
- Read experiment history for the agent's context (last N experiments, best metric so far)
- Enforce protected-files boundary (cannot modify files in the immutable list)

### New File Format: `experiment.md`

The PDE equivalent of Karpathy's `program.md`. Human-authored. Defines the experiment space. The agent reads this before every iteration.

```markdown
---
metric: pde_test_pass_rate
metric_direction: higher
verify_command: node --test tests/nyquist/
verify_extract: grep "passing" | awk '{print $1}'
mutable_files:
  - workflows/critique.md
  - workflows/iterate.md
immutable_files:
  - tests/nyquist/
  - bin/pde-tools.cjs
budget_iterations: 25
budget_wall_clock_minutes: 120
improvement_threshold: 0.01
---

## Experiment Objective

Improve the critique workflow's output quality score on the Awwwards rubric
without regressing the Nyquist test suite pass rate.

## Search Space

Focus on: critique perspective ordering, prompt specificity for APCA contrast
guidance, motion token recommendations.

## Stopping Criteria

Stop when pass rate exceeds 95% or after budget_iterations, whichever comes first.
Do NOT stop to ask the human during the loop. Report results at end.

## Constraints

Never modify the test files. Never change the metric extraction command.
One focused change per iteration. Prefer simpler solutions over complex ones.
```

This file format is pure markdown with YAML frontmatter — exactly the same pattern as PDE's existing workflow files. No new parser needed; the existing `bin/lib/frontmatter.cjs` handles YAML frontmatter already.

### New File Format: `experiments.jsonl`

The results log. Append-only, one JSON object per line. Human-readable and machine-parseable.

```json
{"id":"uuid-v4","iteration":1,"ts":"ISO8601","commit":"abc1234","metric_value":93.2,"metric_delta":0,"status":"baseline","description":"Initial measurement"}
{"id":"uuid-v4","iteration":2,"ts":"ISO8601","commit":"def5678","metric_value":94.1,"metric_delta":0.9,"status":"kept","description":"Reordered critique perspectives: contrast first"}
{"id":"uuid-v4","iteration":3,"ts":"ISO8601","commit":"ghi9012","metric_value":92.8,"metric_delta":-1.3,"status":"discarded","description":"Added verbose APCA formula — regressed"}
```

Stored at `.planning/experiments/{slug}/experiments.jsonl`. The `slug` is derived from the experiment name in `experiment.md`.

This format mirrors the existing `pde-session-{id}.ndjson` pattern in `event-bus.cjs` — same infrastructure philosophy, same append approach.

### New `pde-tools.cjs` Subcommands

Extend the existing `pde-tools.cjs` command surface with experiment operations:

| Command | Description |
|---------|-------------|
| `experiment init <slug>` | Create `.planning/experiments/{slug}/` directory, validate `experiment.md` frontmatter |
| `experiment status <slug>` | Read `experiments.jsonl`, output current best metric, iteration count, budget remaining |
| `experiment history <slug> --last N` | Output last N experiment rows as JSON for agent context |
| `experiment commit <slug> <message>` | Git commit with `experiment({slug}):` prefix — distinct from regular `planning:` commits |
| `experiment discard` | `git reset --hard HEAD~1` — rollback last experiment commit |
| `experiment append <slug> <json-row>` | Append one result row to `experiments.jsonl` (used by the loop agent) |

These commands follow the exact same pattern as existing subcommands (`design manifest-update`, `tracking init`, `readiness check`) — they're case blocks in the `pde-tools.cjs` switch statement, each loading their module lazily.

---

## Supporting Libraries: None Required

The research found multiple Node.js experiment tracking libraries (MLflow.js, various npm packages). None are needed.

| Why Libraries Are Not Needed | What PDE Uses Instead |
|------------------------------|----------------------|
| MLflow / W&B / Comet require HTTP servers, databases, or external services | `experiments.jsonl` is zero-infra, file-based, and diffable |
| Metric parsing libraries require schema definitions per-metric | `verify_command` in `experiment.md` already handles extraction via shell command output; `parseFloat()` on the extracted string is sufficient |
| Experiment orchestration frameworks (Optuna, Ax) add optimization algorithms | The agent (Claude) is the optimizer — it reads history, reasons about what to try next, proposes the change. No Bayesian optimization library needed. |
| TSV/CSV parsing libraries | PDE uses JSONL (chosen for consistency with existing NDJSON infrastructure). `JSON.parse()` is already in every PDE module. |

---

## Integration Points with Existing PDE Infrastructure

These are the integration surfaces the experiment loop touches. No new npm packages required at any of them.

| Existing Infrastructure | How AutoResearch Integrates |
|------------------------|----------------------------|
| `pde-tools.cjs commit` | Experiment commits use a new prefix `experiment({slug}):` to distinguish from `planning:` commits. The existing commit logic is reused — only the message prefix changes. |
| `event-bus.cjs` | Each experiment iteration emits a structured event (`experiment:iteration`, `experiment:kept`, `experiment:discarded`) to the existing NDJSON session log. The tmux dashboard Pane 1 (agent activity) and Pane 2 (pipeline progress) display experiment progress without any dashboard changes. |
| `bin/lib/frontmatter.cjs` | Parse `experiment.md` YAML frontmatter. The existing frontmatter parser handles this — same format as STATE.md and PLAN.md frontmatter. |
| `.planning/experiments/` | New directory alongside `.planning/design/` and `.planning/logs/`. No manifest registration needed — experiments are ephemeral optimization runs, not design artifacts. |
| `idle-suggestions.cjs` | After an experiment run, the idle suggestion engine can surface "Review experiment results" when `experiments.jsonl` exists with recent activity. Low-priority integration — not required for v0.13 launch. |
| Nyquist tests (`tests/nyquist/`) | Experiments that modify workflow files use the Nyquist test suite as their `verify_command`. The existing `node --test tests/nyquist/` is the correct evaluation harness for PDE self-optimization. |
| Protected-files mechanism | `immutable_files` in `experiment.md` extends the existing protected-files concept. `experiment-loop.cjs` checks that proposed changes do not touch immutable paths before committing. |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Git CLI (`git log --oneline --grep`) | Read experiment history for agent context | Already required by PDE. The experiment loop reads commits with `experiment({slug}):` prefix to build the "what has already been tried" context block. Invoked via `spawnSync('git', [...])` — no shell injection risk. |
| `node --test` (built-in, Node.js 18+) | Run Nyquist regression suite as the evaluation harness | Already required for PDE's 235 regression tests. The primary verify command for PDE self-optimization experiments. |

---

## Installation

The plugin itself installs nothing new. All experiment loop capabilities are implemented in:

1. `bin/lib/experiment-loop.cjs` — new module, uses only Node.js built-ins
2. New case blocks in `bin/pde-tools.cjs` — existing command dispatch pattern
3. `commands/optimize.md` — new slash command
4. `workflows/optimize.md` — new workflow markdown

```bash
# PDE plugin v0.13: zero new npm packages
# Same installation as v0.12

# The experiment loop runs entirely on:
# - Node.js built-ins (fs, child_process.spawnSync, crypto, path, os)
# - Git CLI (already required)
# - node --test (already required for Nyquist)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `experiments.jsonl` (NDJSON append) | TSV (`results.tsv`) | TSV is what Karpathy's autoresearch uses — it is simpler and more diffable in git. PDE uses JSONL because: (1) consistent with the existing NDJSON event bus infrastructure, (2) JSON rows handle arbitrary metadata fields without schema migration, (3) `JSON.parse()` is already in every PDE module. Use TSV if building a standalone tool outside of PDE. |
| `experiment.md` (YAML frontmatter + markdown) | Separate `experiment.json` config | JSON config works but is less human-editable and cannot contain prose (search space notes, constraints, stopping rationale). Karpathy's `program.md` demonstrates that prose instructions are essential — the agent reads them to reason about what to try next. Markdown with YAML frontmatter is the correct format for agent-readable + human-editable config. |
| `experiment-loop.cjs` (new isolated module) | Inline logic in `pde-tools.cjs` | The existing `pde-tools.cjs` is already 500+ lines. Experiment loop logic (state machine, metric extraction, keep/discard decision) is cohesive and deserves its own module, following the same pattern as `event-bus.cjs`, `idle-suggestions.cjs`, etc. |
| `git reset --hard HEAD~1` | `git revert HEAD` | `git revert` creates a new commit preserving history — right choice for public branches. Experiment branches are local and private; `git reset --hard` discards the experiment cleanly. This matches the autoexp pattern exactly. Experiment commits should use prefix `experiment({slug}):` so they are identifiable in the log even after discard. |
| Claude as the optimizer (LLM reasoning) | Bayesian optimization / Optuna / Ax | External optimization libraries optimize numerical hyperparameters efficiently but cannot generate code changes, understand PDE's workflow structure, or reason about design tradeoffs. Claude's reasoning IS the optimization algorithm — this is the core insight of Karpathy's pattern. External optimizers add complexity without benefit for code/prompt optimization. |
| Nyquist test suite as primary evaluation harness | Custom metric extraction script | PDE already has 235 structural regression tests as the canonical quality gate. Using `node --test tests/nyquist/` as the `verify_command` means experiments that degrade test pass rate are automatically discarded. This is the correct harness for PDE self-optimization. Custom metrics (Awwwards rubric score, critique quality) can be added as secondary verify commands in specific experiment definitions. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| MLflow, W&B, Comet, or any experiment tracking service | These require HTTP servers, databases, or external SaaS accounts. They solve the "hundreds of parallel GPU training runs" problem — not the "50 serial workflow optimization iterations overnight" problem. Zero-infra `experiments.jsonl` is sufficient and keeps PDE's zero-npm-deps constraint intact. | `experiments.jsonl` with `fs.appendFileSync()` — same pattern as `event-bus.cjs` |
| Optuna, Ax, Hyperopt, or any Bayesian optimization library | PDE's optimization target is code and prompt quality — not numerical hyperparameter search. The LLM agent is the optimizer. Adding a numerical optimization library conflates ML hyperparameter tuning with code/prompt improvement. | Claude as the optimizer — it reads experiment history and proposes the next change based on reasoning |
| Automatic branching to a separate git branch for experiments | Experiments on a separate branch cannot verify against the live codebase (workflows, tests, agents all on main). The experiment must modify main branch files and reset on failure — that is the entire point of the state machine. | `experiment({slug}):` commit prefix to distinguish experiment commits from planning commits in git log |
| Parallel experiment execution | Karpathy's pattern deliberately runs experiments serially. Parallel experiments cannot isolate causality — if two changes land simultaneously, you cannot know which one caused improvement or regression. Serial is correct for causal attribution. Parallel would also require worktrees and concurrent file access — significant complexity for zero benefit in a session-based environment. | Serial loop with one change per iteration, full reset before next experiment |
| LLM-as-judge for experiment metric scoring | Generic LLM evaluation scores are noisy and non-deterministic — running the same experiment twice gives different scores. The metric MUST be deterministic: test pass count, benchmark score, or a structured rubric with forced numeric output at temperature=0. PDE's Nyquist suite is deterministic. | Deterministic `verify_command` — a shell command producing a stable numeric output. For Awwwards-style quality scoring: rubric with integer scales (1-10), forced structured JSON output, judge runs at temperature=0. |
| Continuous background optimization loop | PROJECT.md explicitly calls this out of scope: "Continuous background self-improvement loop — Claude Code is session-based; explicit invocations are correct." The experiment loop runs when `/pde:optimize` is invoked, not as a background process. | `/pde:optimize` as the explicit entry point; the loop runs within the session and stops when budget is exhausted or user interrupts |
| Writing experiment results to `design-manifest.json` | Experiments are optimization runs, not design artifacts. The manifest tracks deliverables (wireframes, briefs, tokens). Experiments are ephemeral — their value is in the kept commits that improve the codebase. | `.planning/experiments/{slug}/experiments.jsonl` — isolated from the design artifact pipeline |
| DSPy, Ax TypeScript framework, or prompt optimization frameworks | These frameworks require users to define programs as DSPy modules — a significant departure from PDE's markdown-workflow paradigm. The Karpathy pattern is simpler and more direct: agent proposes changes to workflow markdown files, runs tests, keeps improvements. | Direct agent modification of workflow markdown files with Nyquist tests as the evaluation harness |
| Git worktrees for experiment isolation | Worktrees are for parallel agents working on different branches simultaneously. Experiment loops are serial by design. Worktrees add directory management overhead with zero benefit for the serial experiment pattern. Additionally, Claude Code's `/ide` command fails to recognize worktrees (reported bug, March 2026). | Single working directory; `experiment({slug}):` prefix identifies experiment commits in main branch history |

---

## Stack Patterns by Experiment Type

**If optimizing PDE workflow quality (primary use case):**
- Mutable: workflow markdown files (`workflows/*.md`)
- Immutable: test files (`tests/nyquist/`), binary tools (`bin/*.cjs`)
- Verify command: `node --test tests/nyquist/`
- Metric: test pass count or pass percentage
- Direction: higher is better
- Budget: 20-30 iterations (sufficient for one overnight run at ~5 min/iteration)

**If optimizing agent prompt quality:**
- Mutable: agent system prompt markdown files (`agents/*.md`)
- Immutable: test harnesses, workflow files being tested against
- Verify command: a deterministic rubric evaluation script scoring agent output against the Awwwards rubric (integer 1-10 per dimension, summed), temperature=0
- Metric: composite rubric score
- Direction: higher is better
- Budget: 10-15 iterations (agent prompt evaluation is slower than test suite runs)

**If optimizing a user's external codebase (general use case):**
- Mutable: user-specified files
- Immutable: user-specified test suite
- Verify command: user-specified benchmark command
- Metric: user-specified (benchmark score, test pass rate, response time ms)
- Direction: user-specified
- Budget: user-specified (1-100 iterations)

---

## Version Compatibility

| Component | Version Requirement | Notes |
|-----------|--------------------|----|
| Node.js | 18+ (already required by PDE) | `child_process.spawnSync`, `fs.appendFileSync`, `crypto.randomUUID` — all available in Node.js 18. No new version requirement. |
| Git | 2.x+ (already required by PDE) | `git reset --hard HEAD~1`, `git log --oneline --grep="experiment("` — standard Git 2.x operations. No new version requirement. |
| `node:test` runner | Node.js 18+ (already required by PDE) | PDE's 235 Nyquist tests already run on `node --test`. The experiment loop uses this as the primary verify command for PDE self-optimization. |

---

## Sources

- `github.com/karpathy/autoresearch` — official repository, March 2026: core loop pattern, program.md role, 5-minute time budget, val_bpb metric, git keep/discard state machine (HIGH confidence — primary source, fetched via WebFetch)
- `github.com/karpathy/autoresearch/blob/master/program.md` — mutable/immutable boundaries, stopping criteria, metric definition, agent operation loop — "Do NOT pause to ask the human if you should continue" (HIGH confidence — fetched via WebFetch)
- `gist.github.com/adhishthite/16d8fd9076e85c033b75e187e8a6b94e` — autoexp generalized implementation: TSV zero-infra results tracking, `autoexp/<tag>` branch pattern, 4 prerequisites (metric, fast feedback, single file, immutable harness) (HIGH confidence — fetched via WebFetch)
- `github.com/uditgoenka/autoresearch` — Claude Code skill implementation: JSONL results tracking (`autoresearch.jsonl`), git state machine (commit before verify, revert on failure), TSV columns (iteration, commit hash, metric value, delta, status, description), mechanical-only verification requirement (HIGH confidence — fetched via WebFetch)
- `github.com/drivelineresearch/autoresearch-claude-code` — Claude Code plugin port: pure skill implementation (no MCP server), plugin manifest pattern, `autoresearch.jsonl` line-delimited JSON (HIGH confidence — fetched via WebFetch)
- VentureBeat / Fortune: Shopify CEO applied autoresearch to templating engine — 53% faster rendering from 93 automated commits; confirms pattern generalizes beyond ML (MEDIUM confidence — secondary sources)
- WebSearch March 2026: DSPy TypeScript ports (`ax-llm/ax`, `ruvnet/dspy.ts`) — confirmed available but explicitly excluded as over-engineering for PDE's use case (MEDIUM confidence — search results)
- WebSearch March 2026: MLflow.js Node.js client — confirmed available but excluded as zero-infra JSONL is sufficient (MEDIUM confidence — search results)
- WebSearch March 2026: Claude Code git worktree bug — `/ide` command fails to recognize worktrees (source: multiple community reports, March 2026) — reason to avoid worktrees for experiment isolation (MEDIUM confidence — search results)
- PDE codebase `bin/lib/event-bus.cjs` — existing `safeAppendEvent()` with `fs.appendFileSync()` pattern, `randomUUID()` session ID — confirms zero-dependency NDJSON append is proven PDE infrastructure (HIGH confidence — read directly from codebase)
- PDE codebase `bin/pde-tools.cjs` — existing `commit`, `tracking init`, `design manifest-update` subcommand patterns — confirms integration approach for new `experiment` subcommands (HIGH confidence — read directly from codebase)

---

*Stack research for: PDE v0.13 AutoResearch — autonomous experiment loop additions only*
*Researched: 2026-03-23*
