<purpose>
Run an autonomous optimization experiment loop: parse experiment.md, init branch, capture baseline, iterate (mutate/eval/keep-discard), enforce circuit breakers, generate report, and offer promotion with diff approval.
</purpose>

<core_principle>
Orchestrator reads config and dispatches agents — it does NOT mutate files or track git state directly. Circuit breakers are checked as workflow IF conditionals after each Task() returns. All git state machine calls go through pde-tools subcommands. REPORT.md is a post-loop artifact generated after the loop completes.
</core_principle>

<process>

<step name="step-1-parse-and-validate" priority="first">
## Step 1: Parse Arguments and Validate

Parse $ARGUMENTS:
- Extract the experiment.md path (first positional argument)
- Check for `--self` flag
- Check for `--skill <name>` flag
- Check for `--dry-run` flag

If `--self` flag is present AND no explicit experiment.md path was provided:

  **--self Preset Resolution (SELF-01, SELF-02):**

  1. Auto-discover mutable_files by running:
     ```bash
     grep -rl '<!-- OPTIMIZABLE -->' workflows/ | sort
     ```

  2. Cross-reference the discovered files against the 14 authorized files listed in the
     "Experiment-Eligible Workflow Files" section of `references/experiment-boundaries.md`.
     Use ONLY the intersection — never include a file that is not in the authorized list
     even if it has an OPTIMIZABLE marker (guards against Pitfall 2 from RESEARCH.md).

     The 14 authorized workflow files are:
     - workflows/brief.md
     - workflows/system.md
     - workflows/flows.md
     - workflows/ideate.md
     - workflows/wireframe.md
     - workflows/critique.md
     - workflows/hig.md
     - workflows/iterate.md
     - workflows/recommend.md
     - workflows/mockup.md
     - workflows/competitive.md
     - workflows/opportunity.md
     - workflows/handoff.md
     - workflows/deploy.md

  3. Construct the preset experiment.md content with this frontmatter:
     ```yaml
     slug: pde-self-improve
     metric: nyquist_pass_count
     direction: max
     verify: node bin/nyquist-metric.cjs
     mutable_files:
       - workflows/brief.md
       - workflows/system.md
       - workflows/flows.md
       - workflows/ideate.md
       - workflows/wireframe.md
       - workflows/critique.md
       - workflows/hig.md
       - workflows/iterate.md
       - workflows/recommend.md
       - workflows/mockup.md
       - workflows/competitive.md
       - workflows/opportunity.md
       - workflows/handoff.md
       - workflows/deploy.md
     immutable_files: []
     iteration_budget: 20
     time_budget_minutes: 60
     ```

  4. Include the search space prose section after the frontmatter:
     ```markdown
     ## Search Space

     Optimize the prose guidance sections in the 14 OPTIMIZABLE design skill workflows.
     Only content within `<!-- OPTIMIZABLE -->` markers is eligible for mutation.

     ## Constraints

     Only modify sections marked with `<!-- OPTIMIZABLE -->` markers.
     Do NOT touch locked sections (init steps, schema writes, error message formats, MCP probe patterns).
     Nyquist pass count baseline: ~1075 (full suite ~3.5s runtime — safely within 30s eval timeout).

     ## Stopping Rationale

     Halt when 5 consecutive iterations produce no improvement, or when 20 iterations are reached.
     ```

  5. Write the generated file to `/tmp/pde-self-improve-experiment.md` using the Write tool.

  6. Set the experiment.md path to `/tmp/pde-self-improve-experiment.md` and continue to field validation below.

If `--skill <name>` flag is present AND no explicit experiment.md path was provided:

  **--skill Preset Resolution (SELF-03):**

  1. Extract the skill name from the `--skill` argument value.

  2. Validate the skill name against the known skills list — the 14 workflow names derived
     from the authorized OPTIMIZABLE files:
     `brief, system, flows, ideate, wireframe, critique, hig, iterate, recommend, mockup, competitive, opportunity, handoff, deploy`

  3. If the skill name is NOT in the known list, abort with:
     "Unknown skill '{name}'. Known skills: brief, system, flows, ideate, wireframe, critique, hig, iterate, recommend, mockup, competitive, opportunity, handoff, deploy"

  4. Construct the preset experiment.md targeting `workflows/{name}.md` as the single mutable file:
     ```yaml
     slug: pde-skill-{name}
     metric: nyquist_pass_count
     direction: max
     verify: node bin/nyquist-metric.cjs
     mutable_files:
       - workflows/{name}.md
     immutable_files: []
     iteration_budget: 20
     time_budget_minutes: 30
     ```

  5. Include the search space prose:
     ```markdown
     ## Search Space

     Optimize the prose guidance sections in `workflows/{name}.md`.
     Only content within `<!-- OPTIMIZABLE -->` markers is eligible for mutation.

     ## Constraints

     Only modify sections marked with `<!-- OPTIMIZABLE -->` markers.

     ## Stopping Rationale

     Halt when 5 consecutive iterations produce no improvement, or when 20 iterations are reached.
     ```

  6. Write the generated file to `/tmp/pde-skill-{name}-experiment.md` using the Write tool.

  7. Set the experiment.md path to `/tmp/pde-skill-{name}-experiment.md` and continue to field validation below.

Read the experiment.md file using the Read tool. Extract the `slug` from frontmatter. Validate these required fields are present and non-empty:
- `metric`
- `direction` (must be "min" or "max")
- `verify`
- `mutable_files` (must be a non-empty list)

If any required field is missing or invalid, abort with:
"Cannot start experiment: experiment.md is missing required fields: {list}. Fix experiment.md and try again."

Read `.planning/config.json` using the Read tool to load experiment_defaults:
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

Merge with experiment.md frontmatter (experiment.md overrides config.json for iteration_budget and time_budget_minutes only):
- `iterationBudget` = experiment.md `iteration_budget` if present, else config.json `iteration_budget` (default 50)
- `timeBudget` = experiment.md `time_budget_minutes` if present, else config.json `time_budget_minutes` (default 60)
- `consecutiveFailureLimit` = config.json `consecutive_failure_limit` (default 5) — NOT overridable per-experiment
- `noProgressLimit` = config.json `no_progress_limit` (default 10) — NOT overridable per-experiment
- `costEstimateEnabled` = config.json `cost_estimate_enabled` (default true) — NOT overridable per-experiment

Store: slug, metric, direction, verify, mutable_files, iterationBudget, timeBudget, consecutiveFailureLimit, noProgressLimit, costEstimateEnabled, dryRun flag.
</step>

<step name="step-2-clean-working-tree">
## Step 2: Clean Working Tree Check

Run:
```bash
git status --porcelain
```

If any output lines exist that do NOT start with `?? .planning/experiments/`, abort:
"Cannot start experiment: uncommitted changes detected. Commit or stash all changes before running /pde:optimize."

(Untracked files under .planning/experiments/ are safe to ignore — they are experiment state files.)
</step>

<step name="step-3-concurrency-check">
## Step 3: Concurrency Check

Run:
```bash
git branch --list 'experiment/*'
```

If any branch names are returned:
- Ask via AskUserQuestion: "Active experiment branch found: {branch-name}. Running a new experiment while another is active risks git conflicts. Continue? [yes/no]"
- If the user answers "no" (or any negative), abort: "Experiment cancelled due to active experiment branch conflict."
- If the user answers "yes", continue.
</step>

<step name="step-4-cost-estimate-gate">
## Step 4: Cost Estimate Gate (BREAK-05)

Calculate estimated token cost:
- `estimatedTokens` = iterationBudget * 2000

Display to the user:
"Estimated token cost: ~{estimatedTokens} tokens ({iterationBudget} iterations x ~2000 tokens/iteration)"

If `--dry-run` flag was passed:
- Display: "Dry run complete. No iterations will be executed."
- Abort (dry run succeeded — this is not an error).

If `costEstimateEnabled` is true:
- Ask via AskUserQuestion: "Proceed with experiment? [yes/no]"
- If the user answers "no" (or any negative), abort: "Experiment cancelled by user at cost estimate gate."
- If the user answers "yes", continue.
</step>

<step name="step-5-initialize-experiment-branch">
## Step 5: Initialize Experiment Branch

Copy the experiment.md file to `.planning/experiments/{slug}/experiment.md` so the runner agent can read it from the standard path:
```bash
mkdir -p .planning/experiments/{slug}
cp {experiment-md-path} .planning/experiments/{slug}/experiment.md
```

Run experiment init:
```bash
node bin/pde-tools.cjs experiment init --slug {slug}
```

This creates the `experiment/{slug}` branch and the initial EXPERIMENT-BEST.json file.

Display: "Experiment branch initialized: experiment/{slug}"

Emit `experiment.start` event:
```bash
node bin/pde-tools.cjs event-emit experiment.start '{"slug":"{slug}","iteration":0,"metric_value":null,"best_metric":null,"status":"","budget_used":0,"budget_total":{iterationBudget}}'
```
</step>

<step name="step-6-capture-baseline-metric">
## Step 6: Capture Baseline Metric

Run the metric evaluation against the current (baseline) state:
```bash
node bin/pde-tools.cjs experiment eval-metric --slug {slug}
```

Parse the JSON output to extract `metric_value` — this is the baseline.

If the eval returns `status: "CRASH"`:
- Display: "Baseline metric evaluation failed: {reason}. Check your verify command before running an experiment."
- Run cleanup: `node bin/pde-tools.cjs experiment cleanup --slug {slug}`
- Abort.

Store `baselineMetric` = metric_value from the eval result.

Display: "Baseline metric: {baselineMetric}"
</step>

<step name="step-7-iteration-loop">
## Step 7: Iteration Loop

Initialize loop state:
- `currentIteration` = 0
- `consecutiveFailures` = 0
- `iterationsSinceImprovement` = 0
- `consecutiveViolations` = 0
- `currentModel` = "pde-experiment-runner"
- `haltReason` = null
- Capture `startTimeSeconds` via: `date +%s`

LOOP (while haltReason is null):

  **a.** Increment `currentIteration`.

  **b.** Determine `context_mode`: "full" if currentIteration === 1, else "diff".

  **c.** If context_mode is "diff", get the current diff:
  ```bash
  git diff {baseline-sha} HEAD -- {mutable_files}
  ```
  Where baseline-sha is read from EXPERIMENT-BEST.json.

  **d.** Read last 3 rows from `.planning/experiments/{slug}/results.jsonl` (using Read tool or Bash tail). If file does not exist yet, last3rows = [].

  **e.** Dispatch runner agent via Task():
  ```
  Task(
    prompt="<objective>
  Run experiment iteration {currentIteration} for slug: {slug}
  </objective>

  <files_to_read>
  - .planning/experiments/{slug}/experiment.md
  </files_to_read>

  <additional_context>
  Iteration: {currentIteration}
  Baseline SHA: {baseline-sha}
  Context mode: {context_mode}
  Last 3 results: {last3rows as JSON}
  {if context_mode === 'diff': include diff output here}
  </additional_context>",
    subagent_type="{currentModel}"
  )
  ```

  **f.** Parse the JSON code block from the Task() response. Extract:
  - `status` (KEEP / DISCARD / CRASH / BOUNDARY_VIOLATION)
  - `metric_value`
  - `metric_delta`
  - `description`
  - `tokens_used`

  **g.** Display iteration result:
  "Iteration {currentIteration}: {status} | metric={metric_value} | delta={metric_delta}"

  **g2.** Emit per-iteration and outcome events based on status:
  - Always emit `experiment.iteration`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.iteration '{"slug":"{slug}","iteration":{currentIteration},"metric_value":{metric_value},"best_metric":{bestMetricSoFar},"status":"{status}","budget_used":{currentIteration},"budget_total":{iterationBudget}}'
    ```
  - If status === "KEEP": emit `experiment.keep`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.keep '{"slug":"{slug}","iteration":{currentIteration},"metric_value":{metric_value},"best_metric":{metric_value},"status":"KEEP","budget_used":{currentIteration},"budget_total":{iterationBudget}}'
    ```
  - If status === "DISCARD": emit `experiment.discard`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.discard '{"slug":"{slug}","iteration":{currentIteration},"metric_value":{metric_value},"best_metric":{bestMetricSoFar},"status":"DISCARD","budget_used":{currentIteration},"budget_total":{iterationBudget}}'
    ```
  - If status === "CRASH" or status === "BOUNDARY_VIOLATION": emit `experiment.crash`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.crash '{"slug":"{slug}","iteration":{currentIteration},"metric_value":null,"best_metric":{bestMetricSoFar},"status":"{status}","budget_used":{currentIteration},"budget_total":{iterationBudget}}'
    ```

  **h.** Update loop state counters based on status:
  - If status === "KEEP":
    - `consecutiveFailures` = 0
    - `iterationsSinceImprovement` = 0
    - `consecutiveViolations` = 0
  - If status === "DISCARD":
    - `consecutiveFailures`++
    - `iterationsSinceImprovement`++
    - `consecutiveViolations` = 0
  - If status === "CRASH" or status === "BOUNDARY_VIOLATION":
    - `consecutiveFailures`++
    - `iterationsSinceImprovement`++
    - `consecutiveViolations`++

  **i.** Model escalation check (SELF-07):
  - If `consecutiveViolations` >= 3 AND `currentModel` === "pde-experiment-runner":
    - Set `currentModel` = "pde-experiment-runner-sonnet"
    - Display: "Escalating to Sonnet model after {consecutiveViolations} consecutive violations"

  **j.** Calculate `elapsedMinutes`:
  ```bash
  currentTimeSeconds=$(date +%s)
  elapsedMinutes=$(( (currentTimeSeconds - startTimeSeconds) / 60 ))
  ```

  **k.** Check circuit breakers in order (first to fire halts the loop):
  1. BREAK-01 (iteration_budget): if currentIteration >= iterationBudget → haltReason = "iteration_budget"
  2. BREAK-02 (time_budget): if elapsedMinutes >= timeBudget → haltReason = "time_budget"
  3. BREAK-03 (consecutive_failures): if consecutiveFailures >= consecutiveFailureLimit → haltReason = "consecutive_failures"
  4. BREAK-04 (no_progress): if iterationsSinceImprovement >= noProgressLimit → haltReason = "no_progress"

  If any circuit breaker fires:
  - Display: "Circuit breaker fired: {haltReason} at iteration {currentIteration}"
  - Break the loop.

END LOOP

After the loop exits (haltReason is set or loop condition is false), emit `experiment.complete`:
```bash
node bin/pde-tools.cjs event-emit experiment.complete '{"slug":"{slug}","iteration":{currentIteration},"metric_value":null,"best_metric":{bestMetricSoFar},"status":"complete","budget_used":{currentIteration},"budget_total":{iterationBudget}}'
```
</step>

<step name="step-8-generate-report">
## Step 8: Generate REPORT.md (SELF-05)

Run:
```bash
node bin/pde-tools.cjs experiment generate-report --slug {slug}
```

Read the generated `.planning/experiments/{slug}/REPORT.md` using the Read tool.

Display the Summary table section from the REPORT.md to the user.

Display: "Full report saved to .planning/experiments/{slug}/REPORT.md"
</step>

<step name="step-9-promotion-approval">
## Step 9: Promotion Approval (SELF-04)

Run diff-summary to show the user what changed:
```bash
node bin/pde-tools.cjs experiment diff-summary --slug {slug}
```

Display the diff to the user. If the diff output is longer than 50 lines, truncate and append:
"... {N} more lines (see REPORT.md for full diff)"

Ask via AskUserQuestion:
"Merge these improvements to main? Review the diff above. [yes/no]"

If the user answers "yes":
- Run: `node bin/pde-tools.cjs experiment promote --slug {slug}`
- Display: "Experiment {slug} promoted to main successfully."

If the user answers "no" (or any negative):
- Run: `node bin/pde-tools.cjs experiment cleanup --slug {slug}`
- Display: "Experiment branch cleaned up. Changes discarded."

Display: "Experiment complete."
</step>

</process>

<anti_patterns>
- Do NOT put circuit breaker logic in Node.js modules — check as workflow IF conditionals in Step 7
- Do NOT update EXPERIMENT-BEST.json from the orchestrator — the runner updates it via experiment commit
- Do NOT hardcode circuit breaker defaults — always read from config.json merged with experiment.md
- Do NOT write REPORT.md inside the runner — it is a post-loop artifact generated in Step 8
- Do NOT skip the cost estimate display for --dry-run (display it, then abort after display)
</anti_patterns>
