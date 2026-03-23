# Phase 103: Orchestrator, Command & Circuit Breakers - Research

**Researched:** 2026-03-23
**Domain:** Workflow orchestration, slash command creation, circuit breaker loop control, REPORT.md generation, promotion diff approval
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Claude's Discretion
All implementation choices.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BREAK-01 | Iteration budget: experiment halts after N iterations (configurable, default 50) | `experiment_defaults.iteration_budget` already in config.json; orchestrator reads from `parseExperimentFile` budget field; counter increments each loop iteration |
| BREAK-02 | Time budget: experiment halts after T minutes (configurable, default 60) | `experiment_defaults.time_budget_minutes` already in config.json; `Date.now()` start time captured at loop start; checked between iterations |
| BREAK-03 | Consecutive failure limit: experiment halts after K consecutive regressions (default 5) | `experiment_defaults.consecutive_failure_limit` = 5; orchestrator tracks `consecutiveFailures` counter; resets on KEEP, increments on DISCARD/CRASH |
| BREAK-04 | No-progress detection: experiment halts if best metric hasn't improved in last M iterations (default 10) | `experiment_defaults.no_progress_limit` = 10; orchestrator tracks `iterationsSinceImprovement` counter; resets on KEEP |
| BREAK-05 | Cost estimate gate: experiment displays estimated token cost before starting, requires user confirmation above threshold | `experiment_defaults.cost_estimate_enabled` = true; formula: `iterations * avg_haiku_cost`; AskUserQuestion for confirmation |
| CMD-01 | `/pde:optimize` slash command created as entry point — accepts experiment.md path or `--self` / `--skill {name}` presets | commands/ directory pattern: frontmatter + `@workflows/optimize.md` reference; `--self` and `--skill` parsed by workflow |
| CMD-02 | `workflows/optimize.md` orchestrates the full loop: parse experiment.md → init worktree → baseline metric → loop (mutate → eval → keep/discard) → finalize → report → offer promotion | Workflow markdown pattern from execute-phase.md, build.md; loop driven by Task() agent dispatch |
| CMD-04 | Stopping conditions enforced in orchestrator: all 5 circuit breakers checked between iterations | Checked after each Task() returns; before spawning next pde-experiment-runner iteration |
| SELF-04 | After experiment completes, promotion step generates a diff summary and requires user approval before merging experiment branch back to main | `_extractDiff` from experiment-runner.cjs; `_promote` from experiment.cjs; AskUserQuestion for approval |
| SELF-05 | Experiment REPORT.md generated at completion: iterations run, improvements kept, best metric achieved, files modified, diff summary | Written to `.planning/experiments/{slug}/REPORT.md`; reads results.jsonl + EXPERIMENT-BEST.json |
</phase_requirements>

---

## Summary

Phase 103 is the final integration layer for the AutoResearch loop. It takes all building blocks from Phases 100-102 (git state machine, schema parsing, mutation agent) and wires them into a user-facing command. The work divides into four areas: (1) the `/pde:optimize` slash command entry point, (2) the `workflows/optimize.md` orchestrator that runs the loop, (3) five circuit breaker checks enforced between iterations, and (4) REPORT.md generation and promotion approval at completion.

All infrastructure components exist. `experiment.cjs` provides `_init`, `_commit`, `_reset`, `_promote`, `_cleanup`. `experiment-runner.cjs` provides `_evalMetric`, `_writeJsonlRow`, `_extractDiff`. `experiment-schema.cjs` provides `parseExperimentFile` and the EXPERIMENT_DEFAULTS constants. `agents/pde-experiment-runner.md` is the mutation agent dispatched each iteration. The orchestrator's job is to call these in the right sequence with loop control logic.

The key architectural insight from the codebase: the orchestrator is a **workflow markdown file**, not a Node.js module. It runs as Claude itself reading `workflows/optimize.md`. It dispatches `pde-experiment-runner` as a Task() sub-agent per iteration. Circuit breakers are checked in the markdown workflow's loop logic, not in Node.js. REPORT.md is written by the orchestrator (Claude) directly after the loop ends. This matches the pattern established by `execute-phase.md`, `autonomous.md`, and `build.md`.

**Primary recommendation:** Implement Phase 103 as two files: `commands/optimize.md` (slash command, 25 lines) and `workflows/optimize.md` (orchestrator workflow, ~200 lines). Add two new pde-tools subcommands: `experiment generate-report` and `experiment diff-summary` to keep the report generation logic testable.

---

## Standard Stack

### Core (Phase 100-102 — already implemented)

| Module | Location | Purpose | Phase 103 Use |
|--------|----------|---------|--------------|
| `experiment.cjs` | `bin/lib/experiment.cjs` | Git state machine | `_init` (branch setup), `_promote` (merge to main), `_cleanup` (branch delete), `_status` (current state) |
| `experiment-runner.cjs` | `bin/lib/experiment-runner.cjs` | Iteration helpers | `_extractDiff` (diff for promotion approval), `_writeJsonlRow` (REPORT generation reads jsonl) |
| `experiment-schema.cjs` | `bin/lib/experiment-schema.cjs` | Schema + constants | `parseExperimentFile` (validate experiment.md at startup), `EXPERIMENT_DEFAULTS` (circuit breaker defaults) |
| `pde-experiment-runner` | `agents/pde-experiment-runner.md` | Mutation agent | Dispatched per iteration via Task() with experiment.md path, iteration number, baseline SHA, context mode |
| `pde-tools.cjs` | `bin/pde-tools.cjs` | CLI dispatch | New subcommands: `experiment generate-report`, `experiment diff-summary` |

### New Files (Phase 103)

| File | Purpose | Pattern |
|------|---------|---------|
| `commands/optimize.md` | Slash command entry point | Matches `commands/execute-phase.md` structure |
| `workflows/optimize.md` | Full loop orchestrator | Matches `workflows/execute-phase.md` and `workflows/build.md` patterns |
| `bin/lib/experiment-report.cjs` | REPORT.md generation logic | New module; under 300-line ceiling; reads results.jsonl + EXPERIMENT-BEST.json |
| `tests/phase-103/` | Test directory | `node:test` + `node:assert/strict` pattern matching phase-102 tests |

### Config Defaults Already Set (Phase 101)

All five circuit breaker defaults live in `.planning/config.json` under `experiment_defaults`:

```json
{
  "experiment_defaults": {
    "iteration_budget": 50,
    "time_budget_minutes": 60,
    "consecutive_failure_limit": 5,
    "no_progress_limit": 10,
    "cost_estimate_enabled": true
  }
}
```

`parseExperimentFile` in `experiment-schema.cjs` already reads `iteration_budget` and `time_budget_minutes` from the experiment.md frontmatter with these same defaults. The orchestrator reads the parsed config; it does NOT hardcode defaults.

---

## Architecture Patterns

### Recommended Project Structure

```
commands/
└── optimize.md              # New — /pde:optimize slash command

workflows/
└── optimize.md              # New — loop orchestrator

bin/lib/
└── experiment-report.cjs    # New — REPORT.md generation

tests/phase-103/
├── experiment-report.test.mjs      # Unit tests for report generation
├── experiment-circuit-breakers.test.mjs  # Unit tests for breaker logic
└── experiment-orchestrator-tools.test.mjs  # pde-tools dispatch tests
```

### Pattern 1: Slash Command Structure

Every PDE slash command follows an identical template. `commands/optimize.md` is 25 lines:

```markdown
---
name: pde:optimize
description: Run an autonomous optimization experiment loop against an experiment.md file
argument-hint: "<experiment.md path> [--self] [--skill <name>] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
Execute the /pde:optimize workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/optimize.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/optimize.md.
Pass any $ARGUMENTS to the workflow process.
</process>
```

**Source:** Direct pattern from `commands/execute-phase.md` and `commands/build.md` (both verified by reading the files).

### Pattern 2: Workflow Orchestrator Structure

`workflows/optimize.md` follows the step-based structure used in `execute-phase.md`. Steps in order:

1. **Initialize** — parse arguments, read experiment.md via `parseExperimentFile`, validate, load `experiment_defaults` from config.json
2. **Concurrency check** — detect any active `experiment/*` branch (use `git branch --list 'experiment/*'`); warn if found
3. **Cost estimate gate** (BREAK-05) — calculate estimated cost, display, ask for confirmation if `cost_estimate_enabled`
4. **Baseline** — run `experiment init --slug`, run `eval-metric` for baseline, store in EXPERIMENT-BEST.json
5. **Loop** — dispatch `pde-experiment-runner` per iteration; check all 5 breakers after each return
6. **Finalize** — generate REPORT.md, extract diff summary
7. **Promote or discard** — show diff, ask user approval, run `experiment promote` or `experiment cleanup`

### Pattern 3: Loop Dispatch

Each iteration dispatches the mutation agent as a Task():

```
Task(
  prompt="<objective>
Run experiment iteration {N} for slug: {slug}
</objective>

<files_to_read>
- .planning/experiments/{slug}/experiment.md
</files_to_read>

<additional_context>
Iteration: {N}
Baseline SHA: {baselineSha}
Context mode: {full|diff}
Last 3 JSONL rows: {last3rows}
{if diff mode: diff content}
</additional_context>",
  subagent_type="pde-experiment-runner"
)
```

Parse the JSON code block from the Task() response. Extract `status`, `metric_value`, `metric_delta`, `description`.

**Context mode rule (SELF-08):** Iteration 1 uses `full`, iterations 2+ use `diff`. Pass `context_mode` in the prompt.

### Pattern 4: Circuit Breaker Checks

Checked sequentially after each Task() returns. First breaker to fire halts the loop:

```
After each iteration:
  1. BREAK-01: if currentIteration >= budget.iterations → halt("iteration_budget")
  2. BREAK-02: if (Date.now() - startTimeMs) / 60000 >= budget.minutes → halt("time_budget")
  3. BREAK-03: if result.status !== 'KEEP': consecutiveFailures++; if consecutiveFailures >= consecutive_failure_limit → halt("consecutive_failures")
             else: consecutiveFailures = 0
  4. BREAK-04: if result.status === 'KEEP': iterationsSinceImprovement = 0
             else: iterationsSinceImprovement++; if iterationsSinceImprovement >= no_progress_limit → halt("no_progress")
  5. Any breaker fires → set haltReason, break loop
```

Circuit breaker state variables are tracked **in the workflow markdown** as numbered state, not in EXPERIMENT-BEST.json. EXPERIMENT-BEST.json is updated by the `experiment commit` subcommand (called inside the runner agent), not by the orchestrator.

### Pattern 5: REPORT.md Generation (SELF-05)

REPORT.md is written to `.planning/experiments/{slug}/REPORT.md` by the orchestrator after the loop completes. Content:

```markdown
# Experiment Report: {slug}

**Completed:** {timestamp}
**Status:** {COMPLETED | HALTED — {reason}}

## Summary

| Metric | Value |
|--------|-------|
| Iterations run | {N} |
| Improvements kept | {K} |
| Best metric | {value} ({direction} from baseline {baseline}) |
| Total tokens used | {sum from results.jsonl tokens_used} |
| Cost per improvement | {total_tokens / K} tokens |
| Files modified | {list from mutable_files that were changed} |

## Circuit Breaker

{If halted: "Halted by: {reason} at iteration {N}"}
{If completed: "Completed full iteration budget"}

## Diff Summary

{git diff output between baseline and bestCommit for mutable_files}

## Iteration Log

| # | Status | Metric | Delta | Description |
|---|--------|--------|-------|-------------|
{rows from results.jsonl}
```

The `experiment-report.cjs` module reads `results.jsonl` line by line (streaming), reads `EXPERIMENT-BEST.json`, calls `_extractDiff` for the diff section, and writes REPORT.md. It is testable as a pure function receiving a slug and cwd.

### Pattern 6: Promotion Approval (SELF-04)

After REPORT.md is written:

1. Run `_extractDiff(cwd, baseline, mutableFiles)` — get the full diff
2. Display diff inline to user (truncated if >50 lines, with "... {N} more lines" footer)
3. Display REPORT.md summary table
4. Ask: "Merge these changes to main? Review the diff above. [yes/no]"
5. If yes: run `experiment promote --slug {slug}` (cherry-picks bestCommit onto main)
6. If no: run `experiment cleanup --slug {slug}` (deletes experiment branch)

**Concurrency check at startup (SELF-04 adjacent):** Before initializing, check for any existing `experiment/*` branch:

```bash
ACTIVE=$(node bin/pde-tools.cjs experiment list-active 2>/dev/null)
```

Or alternatively use git directly:
```bash
git branch --list 'experiment/*'
```

If any active experiment branch exists, warn the user: "Active experiment branch found: experiment/{slug}. Running a new experiment while another is active risks git conflicts. Continue? [yes/no]"

This requires a new pde-tools subcommand: `experiment list-active` — or the workflow can call git directly (simpler, since this is a workflow-level concern, not a library function).

### Pattern 7: Model Escalation Tracking

The runner agent documents that the orchestrator tracks `consecutive_violations` in EXPERIMENT-BEST.json (pde-experiment-runner.md lines 76-83). The orchestrator must:

1. Read EXPERIMENT-BEST.json after each iteration
2. If `consecutive_violations` >= 3 AND current model is `haiku` → switch to `sonnet` for next Task() dispatch
3. Once escalated, do NOT de-escalate

The model is passed to Task() via the `subagent_type` parameter. Haiku maps to `pde-experiment-runner` (default model in frontmatter). Sonnet dispatch requires overriding the model — this may need a new agent variant `pde-experiment-runner-sonnet` OR the orchestrator can pass model as an argument that the agent reads.

**Key decision for planner:** How does the orchestrator switch models? Options:
- Option A: Two agent files — `pde-experiment-runner.md` (haiku) and `pde-experiment-runner-sonnet.md` (same prompt, different frontmatter model). Orchestrator picks which to dispatch.
- Option B: Single agent file with `model: haiku`, orchestrator passes `--model sonnet` flag that the agent reads. But agent frontmatter is parsed at dispatch time, and Task() doesn't support model override.
- **Recommended (Option A):** Create `agents/pde-experiment-runner-sonnet.md` as a copy of the runner with `model: sonnet`. The orchestrator dispatches based on the `consecutive_violations` counter. This is how PDE handles model profiles elsewhere (distinct agent files per model tier).

### Anti-Patterns to Avoid

- **Do not put circuit breaker logic in Node.js modules.** The loop runs in the markdown workflow (Claude), not in a Node.js process. Putting breaker logic in `.cjs` files means the loop cannot halt without calling a subprocess — unnecessary round-trip. Breakers are checked as workflow IF conditionals.
- **Do not update EXPERIMENT-BEST.json from the orchestrator.** The runner agent (via `experiment commit`) updates it. The orchestrator only reads it to check `consecutive_violations` and `bestMetric`.
- **Do not hardcode circuit breaker defaults.** Always read from `experiment_defaults` in config.json, merged with experiment.md frontmatter overrides. experiment.md frontmatter takes precedence over config.json defaults.
- **Do not write REPORT.md inside the runner agent.** REPORT.md is a post-loop artifact generated by the orchestrator, not per-iteration output. The runner writes rows to results.jsonl; the orchestrator assembles REPORT.md at the end.
- **Do not skip the cost estimate gate for `--dry-run`.** Dry run should not invoke any runner iterations, but the cost estimate display is still useful for user planning.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git branch init and cleanup | Custom git commands in workflow | `pde-tools experiment init/cleanup/promote` | Already implemented in Phase 100; prefix guard and force-checkout edge cases handled |
| Metric evaluation | Inline `spawnSync` in workflow | `pde-tools experiment eval-metric --slug` | Already implemented in Phase 102; timeout detection, signal vs ETIMEDOUT handled |
| JSONL row writing | fs.appendFileSync in workflow | `pde-tools experiment write-row --slug` | Already implemented in Phase 102; JSONL_ROW_FIELDS contract enforced |
| Experiment.md parsing | Manual YAML parse in workflow | `parseExperimentFile` from experiment-schema.cjs | Already implemented in Phase 101; validation, defaults, type coercion handled |
| Diff extraction | Inline git diff in workflow | `_extractDiff` from experiment-runner.cjs (via new pde-tools subcommand) | Already implemented in Phase 102; handles empty diff, git failure gracefully |
| Token cost estimation | Complex formula | Simple: `iterations * 2000 * haiku_cost_per_1k` — display as estimate, not exact | Exact token prediction is impossible pre-execution; a rough estimate is sufficient for the gate |

**Key insight:** Everything needed for the loop exists. Phase 103 is orchestration glue: call existing functions in the right order with the right loop control. Do not add functionality to existing modules.

---

## Common Pitfalls

### Pitfall 1: EXPERIMENT-BEST.json Mutation Race

**What goes wrong:** The orchestrator reads EXPERIMENT-BEST.json after each Task() returns to check `consecutive_violations`. But `experiment commit` (called inside the runner) also writes EXPERIMENT-BEST.json. If the orchestrator reads stale state, it may miscount violations.

**Why it happens:** EXPERIMENT-BEST.json is written by the runner agent (inside the Task() call) via `pde-tools experiment commit`. By the time Task() returns, the write is complete. There is no true race — Task() is sequential.

**How to avoid:** Always re-read EXPERIMENT-BEST.json after Task() returns. Do not cache state across iterations. The orchestrator's loop state (consecutiveFailures, iterationsSinceImprovement) is tracked from the Task() return JSON, NOT from EXPERIMENT-BEST.json — they are separate concerns.

**Warning signs:** Circuit breakers fire early or late relative to expected iteration counts in test runs.

### Pitfall 2: Baseline Metric Not Captured

**What goes wrong:** Orchestrator starts the loop without recording the baseline metric. REPORT.md has no reference point. The "delta" calculation in iteration 1 is meaningless.

**Why it happens:** `_compareMetric` returns 'KEEP' when `bestMetric === null` (first iteration). If the orchestrator doesn't explicitly run eval-metric before starting the loop, the first iteration's "improvement" is always 0 delta.

**How to avoid:** Run `pde-tools experiment eval-metric --slug` BEFORE dispatching iteration 1. Store the baseline metric value. Write it into EXPERIMENT-BEST.json via a new `pde-tools experiment set-baseline --slug --value N` subcommand, OR initialize EXPERIMENT-BEST.json with a `baselineMetric` field alongside `bestMetric`.

**Warning signs:** Iteration 1 always shows `metric_delta: 0` and status `KEEP` regardless of the actual change.

### Pitfall 3: Loop Runs on Dirty Working Tree

**What goes wrong:** User runs `/pde:optimize` while uncommitted changes exist on the current branch. The experiment branch branches from dirty HEAD. `git reset --hard` on DISCARD iterations discards these unrelated changes silently.

**Why it happens:** `experiment init` creates the branch from current HEAD, but doesn't verify cleanliness first.

**How to avoid:** At startup, check `git status --porcelain`. If any modified files exist (not in `.planning/experiments/`), abort with: "Cannot start experiment: uncommitted changes detected. Commit or stash before running /pde:optimize."

**Warning signs:** User reports that non-experiment files were reverted unexpectedly after running the experiment loop.

### Pitfall 4: Cost Estimate Gate Never Fires

**What goes wrong:** `cost_estimate_enabled` is `true` in config.json but the orchestrator skips the gate because it reads from experiment.md frontmatter only (which doesn't have a `cost_estimate_enabled` field).

**Why it happens:** `parseExperimentFile` only parses `iteration_budget` and `time_budget_minutes` from experiment.md frontmatter. `cost_estimate_enabled` lives in config.json `experiment_defaults`. The orchestrator must read BOTH: experiment.md for per-experiment overrides, config.json for global defaults.

**How to avoid:** Orchestrator reads config.json directly (or via `pde-tools config-ensure-section`) to get `experiment_defaults`. Experiment.md frontmatter overrides only iteration/time budgets. Cost estimate flag is always read from config.json.

### Pitfall 5: 300-Line Ceiling on experiment-report.cjs

**What goes wrong:** REPORT.md generation requires reading results.jsonl, computing aggregates, formatting a table, and calling `_extractDiff`. This easily exceeds 300 lines if done carelessly.

**Why it happens:** Scope creep — trying to format everything in a single function.

**How to avoid:** Keep `experiment-report.cjs` focused: one function `generateReport(cwd, slug)` that reads, aggregates, and writes. The diff display (for promotion approval) happens in the workflow markdown, not in the module. Keep module under 200 lines to leave room for future additions.

---

## Code Examples

Verified patterns from existing code in this project:

### Slash Command (from commands/execute-phase.md)

```markdown
---
name: pde:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - TodoWrite
  - AskUserQuestion
---
<objective>
Execute the /pde:execute-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/execute-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/execute-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
```

Source: `commands/execute-phase.md` (verified by reading file)

### Reading experiment_defaults from config.json

```javascript
// From experiment-schema.cjs EXPERIMENT_DEFAULTS (verified)
const EXPERIMENT_DEFAULTS = {
  iteration_budget: 50,
  time_budget_minutes: 60,
  consecutive_failure_limit: 5,
  no_progress_limit: 10,
  cost_estimate_enabled: true,
};
```

The orchestrator reads the live config.json at startup:
```bash
CONFIG=$(node bin/pde-tools.cjs state load --raw)
# Extract experiment_defaults.consecutive_failure_limit etc.
```

Or more directly, the workflow reads `.planning/config.json` via the Read tool.

### _extractDiff call pattern (from experiment-runner.cjs)

```javascript
// Source: bin/lib/experiment-runner.cjs (verified)
function _extractDiff(cwd, baseline, files) {
  const args = ['diff', baseline, 'HEAD', '--'];
  if (files && files.length > 0) {
    args.push(...files);
  }
  const result = execGit(cwd, args);
  if (result.exitCode !== 0) {
    return null;
  }
  return result.stdout;
}
```

Add `experiment diff-summary` pde-tools subcommand that calls `_extractDiff(cwd, state.baseline, parsedExp.mutable_files)` and outputs the diff.

### Task() dispatch pattern (from workflows/execute-phase.md style)

```
Task(
  prompt="...",
  subagent_type="pde-experiment-runner"
)
```

For Sonnet escalation:
```
Task(
  prompt="...",
  subagent_type="pde-experiment-runner-sonnet"
)
```

### REPORT.md generation module interface

```javascript
// New: bin/lib/experiment-report.cjs
function generateReport(cwd, slug, options) {
  // options: { haltReason: string|null, baselineMetric: number }
  // Reads: .planning/experiments/{slug}/results.jsonl
  // Reads: .planning/experiments/{slug}/EXPERIMENT-BEST.json
  // Calls: _extractDiff(cwd, state.baseline, exp.mutable_files)
  // Writes: .planning/experiments/{slug}/REPORT.md
  // Returns: { path: string, iterations: number, improvements: number, bestMetric: number }
}

module.exports = { generateReport, _generateReport };
```

Add pde-tools dispatch: `experiment generate-report --slug {slug}` calls `generateReport(cwd, slug)`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Git worktrees for experiment isolation | Branch isolation (`experiment/{slug}`) on main worktree | Phase 100 decision (March 2026) | Simpler; worktree Claude Code bug confirmed; branch prefix guard prevents wrong-branch reset |
| Circuit breakers in Node.js subcommand | Circuit breakers as workflow IF conditionals | Phase 103 design | No subprocess round-trip; workflow IS the loop controller |
| Global AskUserQuestion for all gates | Inline cost estimate → confirm → loop | Phase 103 design | User sees estimate before committing to full run |

**Superseded by Phase 100 decisions:**
- Worktree isolation: rejected (Claude Code `/ide` bug March 2026; see STATE.md decisions)
- Per-iteration git worktree: rejected (overhead; serial execution means one branch suffices)

---

## Open Questions

1. **How does the orchestrator pass model override to the agent?**
   - What we know: `pde-experiment-runner.md` has `model: haiku` in frontmatter; Task() dispatches by `subagent_type`
   - What's unclear: Whether Claude Code's Task() supports runtime model override or only uses frontmatter model
   - Recommendation: Use Option A (two agent files) to avoid Task() model override uncertainty. Create `agents/pde-experiment-runner-sonnet.md` as identical content with `model: sonnet` in frontmatter. Planner should include this as a deliverable.

2. **Should `consecutive_violations` be tracked in EXPERIMENT-BEST.json or in the orchestrator's loop state?**
   - What we know: `pde-experiment-runner.md` line 77 says "The orchestrating workflow (Phase 103) tracks `consecutive_violations` in EXPERIMENT-BEST.json"
   - What's unclear: The runner cannot write to EXPERIMENT-BEST.json's `consecutive_violations` field — it only calls `experiment commit` or `experiment reset`. Only the orchestrator can write this field.
   - Recommendation: Orchestrator tracks `consecutive_violations` as a loop-local variable (alongside `consecutiveFailures`, `iterationsSinceImprovement`). When it increments to 3, it switches agent variant. No need to persist to EXPERIMENT-BEST.json unless session resumption is needed (Phase 104+ concern).

3. **What is the baseline metric capture step?**
   - What we know: `parseExperimentFile` gives us the `verify` command; `_evalMetric` can run it; first iteration `bestMetric === null` in EXPERIMENT-BEST.json means first KEEP is always free
   - What's unclear: Should baseline be run before loop starts, or derived from iteration 1?
   - Recommendation: Run `eval-metric` before loop start. Store as `baselineMetric` in a new field of EXPERIMENT-BEST.json (or local variable). This enables accurate delta calculation in iteration 1 and gives REPORT.md a reference point.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` |
| Config file | None — tests run with `node --test` |
| Quick run command | `node --test tests/phase-103/` |
| Full suite command | `node --test tests/` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BREAK-01 | `generateReport` includes iterations count; loop breaks at iteration budget | unit | `node --test tests/phase-103/experiment-circuit-breakers.test.mjs` | Wave 0 |
| BREAK-02 | Time budget check fires after elapsed minutes | unit | `node --test tests/phase-103/experiment-circuit-breakers.test.mjs` | Wave 0 |
| BREAK-03 | Consecutive failure counter increments on DISCARD/CRASH, resets on KEEP | unit | `node --test tests/phase-103/experiment-circuit-breakers.test.mjs` | Wave 0 |
| BREAK-04 | No-progress counter increments when bestMetric unchanged, resets on KEEP | unit | `node --test tests/phase-103/experiment-circuit-breakers.test.mjs` | Wave 0 |
| BREAK-05 | Cost estimate calculation returns a number; gate enabled/disabled by config flag | unit | `node --test tests/phase-103/experiment-circuit-breakers.test.mjs` | Wave 0 |
| CMD-01 | `commands/optimize.md` has valid YAML frontmatter with required allowed-tools | structural | `node --test tests/phase-103/experiment-orchestrator-tools.test.mjs` | Wave 0 |
| CMD-02 | `workflows/optimize.md` exists with required step sections | structural | `node --test tests/phase-103/experiment-orchestrator-tools.test.mjs` | Wave 0 |
| CMD-04 | All 5 breaker variable names referenced in workflow markdown | structural | `node --test tests/phase-103/experiment-orchestrator-tools.test.mjs` | Wave 0 |
| SELF-04 | `_extractDiff` called with baseline and mutable_files in promote step | unit | `node --test tests/phase-103/experiment-report.test.mjs` | Wave 0 |
| SELF-05 | `generateReport` writes REPORT.md with all required sections | unit | `node --test tests/phase-103/experiment-report.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-103/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-103/experiment-report.test.mjs` — covers SELF-04, SELF-05
- [ ] `tests/phase-103/experiment-circuit-breakers.test.mjs` — covers BREAK-01 through BREAK-05
- [ ] `tests/phase-103/experiment-orchestrator-tools.test.mjs` — covers CMD-01, CMD-02, CMD-04 structural checks
- [ ] `bin/lib/experiment-report.cjs` — new module; created in Wave 1

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/experiment.cjs` — Complete source read; git state machine interfaces verified
- `bin/lib/experiment-runner.cjs` — Complete source read; `_extractDiff`, `_evalMetric`, `_writeJsonlRow` interfaces verified
- `bin/lib/experiment-schema.cjs` — Complete source read; `EXPERIMENT_DEFAULTS`, `parseExperimentFile`, budget fields verified
- `agents/pde-experiment-runner.md` — Complete read; model escalation contract, consecutive_violations tracking, context-mode protocol verified
- `bin/pde-tools.cjs` — Partial read (experiment section verified lines 835-924); all experiment subcommands and their dispatch signatures confirmed
- `.planning/config.json` — Direct read; `experiment_defaults` block confirmed present
- `commands/execute-phase.md` — Complete read; slash command frontmatter pattern verified
- `commands/build.md` — Complete read; `@workflows/build.md` delegation pattern verified
- `.planning/research/PITFALLS.md` — Read; concurrency and dirty-tree pitfalls, circuit breaker rationale confirmed

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` decisions section — branch isolation decision (March 2026), circuit breakers with orchestrator confirmed
- `workflows/execute-phase.md` (partial) — Step structure pattern, AskUserQuestion usage, Task() dispatch confirmed
- `workflows/autonomous.md` (partial) — Loop-over-phases pattern; parallel dispatch model confirmed
- `templates/experiment.md` — Confirmed frontmatter fields: slug, metric, direction, verify, mutable_files, iteration_budget, time_budget_minutes

### Tertiary (LOW confidence)

- None — all claims are grounded in direct code reads.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all modules read directly; interfaces confirmed
- Architecture: HIGH — workflow markdown pattern confirmed from 3+ existing files; all dispatch patterns verified
- Pitfalls: HIGH — grounded in PITFALLS.md research + direct codebase analysis
- Open questions: MEDIUM — model escalation dispatch mechanism has uncertainty around Task() model override capability

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (stable codebase; 30-day window)
