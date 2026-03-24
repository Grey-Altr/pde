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
- `candidateCount` = experiment.md `candidates` if present, else 3 (MULTI-04 default)

Store: slug, metric, direction, verify, mutable_files, iterationBudget, timeBudget, consecutiveFailureLimit, noProgressLimit, costEstimateEnabled, candidateCount, dryRun flag.
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
node bin/pde-tools.cjs event-emit experiment.start '{"slug":"{slug}","iteration":0,"metric_value":null,"best_metric":null,"status":"","budget_used":0,"budget_total":{iterationBudget}}' 2>/dev/null || true
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

**6b.** If the parsed experiment config has `visual_regression.enabled === true` AND `visual_regression.target` is not null:
  - Check if Playwright MCP is available by running: `node bin/pde-tools.cjs mcp-probe --tool playwright:screenshot 2>/dev/null`
  - If Playwright available:
    - Call `captureAndStoreBaseline(cwd, slug, visual_regression.target)` from `bin/lib/visual-regression.cjs`
    - Display: "Visual regression baseline captured for {visual_regression.target}"
  - If Playwright not available:
    - Display: "Visual regression guard enabled but Playwright unavailable — guard will be inactive this run."
  - Store `visualRegressionGuard = true` and `visualRegressionTarget = visual_regression.target` in loop state.
- Else:
  - Store `visualRegressionGuard = false` in loop state.
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

  **d.** Capture iteration baseline SHA:
  ```bash
  iterationBaselineSha=$(git rev-parse HEAD)
  ```
  Initialize empty `candidateResults` array.

  **e.** Candidate loop (FOR candidate_index = 1 to candidateCount):

  If candidate_index > 1:
    Reset to iteration baseline to give this candidate a clean starting point:
    ```bash
    node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {iterationBaselineSha}
    ```

  Read last 3 rows from `.planning/experiments/{slug}/results.jsonl` (using Read tool or Bash tail). If file does not exist yet, last3rows = [].

  Compute strategy weights from JSONL history (META-01 through META-04).
  The script reads results.jsonl files, computes keep_rate per strategy tag, and
  outputs a strategy_hint XML block listing top strategies by KEEP rate:
  ```bash
  STRATEGY_HINT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/lib/strategy-weights.cjs" --strategy-hint 2>/dev/null || echo "")
  ```

  IF STRATEGY_HINT is not empty, inject it into the <additional_context> block of the Task() prompt below. Otherwise, omit the strategy_hint tag entirely.

  Dispatch runner agent via Task():
  ```
  Task(
    prompt="<objective>
  Run experiment iteration {currentIteration} for slug: {slug}
  Candidate {candidate_index} of {candidateCount}.
  {if candidate_index > 1: "Generate a DIFFERENT mutation than previous candidates in this iteration. Vary your approach — try a different strategy, target different sections, or apply a contrasting optimization philosophy."}
  </objective>

  <files_to_read>
  - .planning/experiments/{slug}/experiment.md
  </files_to_read>

  <additional_context>
  Iteration: {currentIteration}
  Candidate: {candidate_index} of {candidateCount}
  Baseline SHA: {baseline-sha}
  Context mode: {context_mode}
  Last 3 results: {last3rows as JSON}
  {if context_mode === 'diff': include diff output here}
  {if STRATEGY_HINT is not empty: STRATEGY_HINT}
  </additional_context>",
    subagent_type="{currentModel}"
  )
  ```

  Parse the JSON code block from the Task() response. Extract:
  - `status` (KEEP / DISCARD / CRASH / BOUNDARY_VIOLATION)
  - `metric_value`
  - `metric_delta`
  - `description`
  - `tokens_used`

  If status is 'KEEP' or 'DISCARD' (candidate scored successfully):
    Capture candidate SHA:
    ```bash
    candidateSha=$(git rev-parse HEAD)
    ```
    Append to candidateResults: { index: candidate_index, status, metric_value, sha: candidateSha, description, tokens_used }

  If status is 'CRASH' or 'BOUNDARY_VIOLATION':
    Reset to iteration baseline:
    ```bash
    node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {iterationBaselineSha}
    ```
    Append to candidateResults: { index: candidate_index, status: 'CRASH', metric_value: null, sha: null }

  END candidate loop

  **f.** Candidate selection phase:

  Filter surviving candidates: `surviving = candidateResults where metric_value is not null`

  IF surviving is empty (all candidates crashed):
    Reset to iteration baseline:
    ```bash
    node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {iterationBaselineSha}
    ```
    Set iterationStatus = 'CRASH', bestMetricValue = null, iterationDescription = 'all candidates crashed'
    Set bestCandidateIndex = null
    Set candidates_evaluated = candidateResults.length
    Set candidates_scores = candidateResults.map(c => c.metric_value)  // all null

  ELSE:
    Select best candidate:
    - If direction === 'max': best = surviving candidate with highest metric_value
    - If direction === 'min': best = surviving candidate with lowest metric_value
    - On ties: select the candidate with the lowest index (first wins)

    Reset branch to best candidate's SHA:
    ```bash
    node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {best.sha}
    ```

    Read bestMetric from EXPERIMENT-BEST.json. Compare best candidate's metric against bestMetric:
    - If bestMetric is null (first iteration): decision = 'KEEP'
    - If direction === 'max' and best.metric_value > bestMetric: decision = 'KEEP'
    - If direction === 'min' and best.metric_value < bestMetric: decision = 'KEEP'
    - Otherwise: decision = 'DISCARD'

    If decision === 'DISCARD':
      Reset to iteration baseline (do NOT keep the best candidate — it was worse than historical best):
      ```bash
      node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {iterationBaselineSha}
      ```

    Set iterationStatus = decision, bestMetricValue = best.metric_value
    Set iterationDescription = best.description
    Set bestCandidateIndex = best.index - 1  // 0-indexed

    Build candidates_scores array: for each candidate in candidateResults (ordered by index), include metric_value (null for crashed).
    Set candidates_evaluated = candidateResults.length

  **g.** Display iteration result:
  "Iteration {currentIteration}: {iterationStatus} | metric={bestMetricValue} | candidates={candidates_evaluated} | best=#{bestCandidateIndex} | scores={candidates_scores}"

  **g2.** Emit per-iteration and outcome events based on iterationStatus:
  - Always emit `experiment.iteration`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.iteration '{"slug":"{slug}","iteration":{currentIteration},"metric_value":{bestMetricValue},"best_metric":{bestMetricSoFar},"status":"{iterationStatus}","budget_used":{currentIteration},"budget_total":{iterationBudget}}' 2>/dev/null || true
    ```
  - If iterationStatus === "KEEP": emit `experiment.keep`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.keep '{"slug":"{slug}","iteration":{currentIteration},"metric_value":{bestMetricValue},"best_metric":{bestMetricValue},"status":"KEEP","budget_used":{currentIteration},"budget_total":{iterationBudget}}' 2>/dev/null || true
    ```
  - If iterationStatus === "DISCARD": emit `experiment.discard`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.discard '{"slug":"{slug}","iteration":{currentIteration},"metric_value":{bestMetricValue},"best_metric":{bestMetricSoFar},"status":"DISCARD","budget_used":{currentIteration},"budget_total":{iterationBudget}}' 2>/dev/null || true
    ```
  - If iterationStatus === "CRASH" or iterationStatus === "BOUNDARY_VIOLATION": emit `experiment.crash`:
    ```bash
    node bin/pde-tools.cjs event-emit experiment.crash '{"slug":"{slug}","iteration":{currentIteration},"metric_value":null,"best_metric":{bestMetricSoFar},"status":"{iterationStatus}","budget_used":{currentIteration},"budget_total":{iterationBudget}}' 2>/dev/null || true
    ```

  Write JSONL row with multi-candidate extension fields. Include in the row write:
  - `candidates_evaluated`: candidates_evaluated (total candidates including crashed)
  - `candidates_scores`: JSON.stringify(candidates_scores) (array of metric values, null for crashed)
  - `best_candidate_index`: bestCandidateIndex (0-indexed winner, null if all crashed)

  **h.** Update loop state counters based on iterationStatus:
  - If iterationStatus === "KEEP":
    - `consecutiveFailures` = 0
    - `iterationsSinceImprovement` = 0
    - `consecutiveViolations` = 0
    - If `visualRegressionGuard === true`:
      - Copy `/tmp/pde-experiment-{slug}/current-screenshot.png` to `/tmp/pde-experiment-{slug}/baseline-screenshot.png`
      - (The new KEEP result becomes the baseline for subsequent regression checks)
  - If iterationStatus === "DISCARD":
    - `consecutiveFailures`++
    - `iterationsSinceImprovement`++
    - `consecutiveViolations` = 0
  - If iterationStatus === "CRASH" or iterationStatus === "BOUNDARY_VIOLATION":
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
  5. BREAK-05 (visual_regression): Only if `visualRegressionGuard === true` AND iterationStatus is not "CRASH" AND iterationStatus is not "BOUNDARY_VIOLATION":
     - Capture current screenshot: call `captureAndStoreBaseline(cwd, slug, visualRegressionTarget)` from `bin/lib/visual-regression.cjs` but save to `/tmp/pde-experiment-{slug}/current-screenshot.png` instead of baseline
     - Call `checkVisualRegression({ cwd, slug, currentScreenshotPath: '/tmp/pde-experiment-{slug}/current-screenshot.png', currentScore: metricValue, baselineScore: baselineMetric, direction })` from `bin/lib/visual-regression.cjs`
     - If `result.fired === true`:
       → haltReason = "visual_regression"
       → Display: "Visual regression circuit breaker fired: {result.reason} (score delta: {result.scoreDelta})"
       → Run: `node bin/pde-tools.cjs experiment reset --slug {slug}`
     - If `visualRegressionGuard === true`, pass `screenshot_hash` and `baseline_hash` fields from the checkVisualRegression result to the JSONL row write. These are optional fields — null when guard is disabled.

  If any circuit breaker fires:
  - Display: "Circuit breaker fired: {haltReason} at iteration {currentIteration}"
  - Break the loop.

END LOOP

After the loop exits (haltReason is set or loop condition is false), emit `experiment.complete`:
```bash
node bin/pde-tools.cjs event-emit experiment.complete '{"slug":"{slug}","iteration":{currentIteration},"metric_value":null,"best_metric":{bestMetricSoFar},"status":"complete","budget_used":{currentIteration},"budget_total":{iterationBudget}}' 2>/dev/null || true
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
