<purpose>
Execute all plans in a phase using wave-based parallel execution. Orchestrator stays lean — delegates plan execution to subagents.
</purpose>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full execute-plan context. Orchestrator: discover plans → analyze deps → group waves → spawn agents → handle checkpoints → collect results.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load all context in one call:

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" init execute-phase "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`, `phase_req_ids`.

**Context staleness check:**
```bash
if [ -f ".planning/project-context.md" ] && [ -f ".planning/PROJECT.md" ]; then
  PC_MTIME=$(stat -f "%m" ".planning/project-context.md" 2>/dev/null || stat -c "%Y" ".planning/project-context.md" 2>/dev/null)
  PJ_MTIME=$(stat -f "%m" ".planning/PROJECT.md" 2>/dev/null || stat -c "%Y" ".planning/PROJECT.md" 2>/dev/null)
  if [ "$PJ_MTIME" -gt "$PC_MTIME" ]; then
    echo "Warning: project-context.md may be stale — PROJECT.md was modified more recently."
    echo "  Run /pde:new-milestone to regenerate, or continue with current context."
  fi
fi
```

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found in phase.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.

**REQUIRED — Sync chain flag with intent.** If user invoked manually (no `--auto`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This prevents stale `_auto_chain_active: true` from causing unwanted auto-advance. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference). You MUST execute this bash block before any config reads:
```bash
# REQUIRED: prevents stale auto-chain from previous --auto runs
if [[ ! "$ARGUMENTS" =~ --auto ]]; then
  node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
fi
```

**Readiness gate check:**
```bash
READINESS_RESULT="none"
READINESS_FILE=""

# Check for existing READINESS.md in the phase directory
READINESS_FILE=$(ls "${phase_dir}"/*-READINESS.md 2>/dev/null | head -1)

if [ -n "$READINESS_FILE" ]; then
  # Check for staleness: is READINESS.md older than newest PLAN.md?
  NEWEST_PLAN=$(ls -t "${phase_dir}"/*-PLAN.md 2>/dev/null | head -1)
  if [ -n "$NEWEST_PLAN" ]; then
    R_MTIME=$(stat -f "%m" "$READINESS_FILE" 2>/dev/null || stat -c "%Y" "$READINESS_FILE" 2>/dev/null)
    P_MTIME=$(stat -f "%m" "$NEWEST_PLAN" 2>/dev/null || stat -c "%Y" "$NEWEST_PLAN" 2>/dev/null)
    if [ "$P_MTIME" -gt "$R_MTIME" ]; then
      echo "WARNING: READINESS.md may be stale — PLAN.md was modified after the last readiness check."
      echo "  Run /pde:check-readiness ${PHASE_NUMBER} to refresh."
    fi
  fi

  # Read the result from READINESS.md frontmatter
  READINESS_RESULT=$(grep "^result:" "$READINESS_FILE" 2>/dev/null | head -1 | sed 's/^result:[[:space:]]*//')
fi
```

Apply gate logic based on READINESS_RESULT:

**If READINESS_RESULT is "fail":**
HALT — do not proceed to handle_branching or any subsequent step. Display:
```
HALT: Readiness Gate FAIL
Phase: {phase_number} — {phase_name}
Readiness report: {READINESS_FILE}

The last readiness check found critical issues that must be fixed before executing.
Run /pde:check-readiness {phase_number} to see the current status.

To override (not recommended): delete the READINESS.md file and re-run execute-phase.
```
Stop execution entirely. Do NOT spawn any executors or create any branches.

**If READINESS_RESULT is "concerns":**
Use AskUserQuestion to present:
```
WARNING: Readiness Gate CONCERNS
Phase: {phase_number} — {phase_name}

The readiness check found non-blocking concerns. Review them before continuing.
See: {READINESS_FILE}

Type 'proceed' to execute with these concerns, or 'abort' to fix them first.
```
If user responds 'abort' (or equivalent): stop execution.
If user responds 'proceed' (or equivalent): continue normally, log "Proceeding with readiness concerns acknowledged."

**If READINESS_RESULT is "pass":** Continue silently (no user interaction).

**If READINESS_RESULT is "none"** (no READINESS.md found): Continue normally. The gate is opt-in.
</step>

<step name="handle_branching">
Check `branching_strategy` from init:

**"none":** Skip, continue on current branch.

**"phase" or "milestone":** Use pre-computed `branch_name` from init:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

All subsequent commits go to this branch. User handles merging.
</step>

<step name="validate_phase">
From init JSON: `phase_dir`, `plan_count`, `incomplete_count`.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"
</step>

<step name="discover_and_group_plans">
Load plan inventory with wave grouping in one call:

```bash
PLAN_INDEX=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
```

Parse JSON for: `phase`, `plans[]` (each with `id`, `wave`, `autonomous`, `objective`, `files_modified`, `task_count`, `has_summary`), `waves` (map of wave number → plan IDs), `incomplete`, `has_checkpoints`.

**Filtering:** Skip plans where `has_summary: true`. If `--gaps-only`: also skip non-gap_closure plans. If all filtered: "No matching incomplete plans" → exit.

Report:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} plans across {wave_count} waves

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives, 3-8 words} |
| 2 | 01-03 | ... |
```
</step>

<step name="execute_waves">
Execute each wave in sequence. Within a wave: parallel if `PARALLELIZATION=true`, sequential if `false`.

**Sharded vs Standard execution:** Plans with a `{plan-prefix}-tasks/` directory use per-task spawning (one executor per task file, ~90% context reduction). Plans without a tasks directory use the standard single-executor-per-plan flow. The orchestrator checks for the tasks directory before spawning — it never reads task file contents to stay lean.

**For each wave:**

1. **Describe what's being built (BEFORE spawning):**

   Read each plan's `<objective>`. Extract what's being built and why.

   ```
   ---
   ## Wave {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, technical approach, why it matters}

   Spawning {count} agent(s)...
   ---
   ```

   - Bad: "Executing terrain generation plan"
   - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

2. **Spawn executor agents:**

   Pass paths only — executors read files themselves with their fresh 200k context.
   This keeps orchestrator context lean (~10-15%).

   **For each plan in the wave, determine execution mode:**

   ```bash
   PLAN_PREFIX=$(echo "$PLAN_FILE" | sed 's/-PLAN\.md$//')
   TASKS_DIR="${PHASE_DIR}/${PLAN_PREFIX}-tasks"
   ```

   **Mode A — Sharded plan (tasks directory exists):**

   When `TASKS_DIR` exists and contains task-NNN.md files, spawn one executor per task file. The orchestrator resolves paths only — it does NOT read task file contents.

   ```bash
   TASK_FILES=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | sort)
   TASK_TOTAL=$(echo "$TASK_FILES" | wc -l | tr -d ' ')
   ```

   **Tracking initialization for sharded plans:**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs" tracking init \
     --tasks-dir "$TASKS_DIR" \
     --plan "$PLAN_PREFIX" \
     --phase "$PHASE_SLUG" \
     --total "$TASK_TOTAL"
   ```

   This creates workflow-status.md with all tasks set to TODO. If workflow-status.md already exists (resume after interruption), existing DONE/SKIPPED rows are preserved.

   For each task file in TASK_FILES, spawn sequentially (task 1 before task 2):

   **Track task start:**

   ```bash
   TASK_NUM=$(echo "$TASK_FILE" | grep -oP '\d+' | sed 's/^0*//' | head -1)
   node "$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs" tracking set-status \
     --tasks-dir "$TASKS_DIR" \
     --task "$TASK_NUM" \
     --status "IN_PROGRESS"
   ```

   **Risk:high HALT for sharded plans (before spawn):**
   Before spawning each task executor, check the task file header for risk:
   ```bash
   TASK_RISK=$(grep "^\*\*Risk level:\*\*" "{task_file_path}" 2>/dev/null || echo "")
   ```

   If TASK_RISK is non-empty (contains "Risk level: HIGH"):
   - Extract the risk reason from the line: `RISK_REASON=$(echo "$TASK_RISK" | sed 's/.*HIGH — //')`
   - Present pre-execution HALT to user:
     ```
     HALT: High-Risk Task (Sharded Plan)
     Task file: {task_file_path}
     Task: {task name from filename or first heading}
     Why high-risk: {RISK_REASON}

     Type 'proceed' to execute this task or 'skip' to skip it.
     ```
   - Wait for user response via AskUserQuestion.
   - If 'skip': do not spawn task executor, record as SKIPPED, continue to next task file.
   - If 'proceed': spawn task executor as normal.

   ```
   Task(
     subagent_type="pde-executor",
     model="{executor_model}",
     prompt="
       <objective>
       Execute task {task_num} of {task_total} from plan {plan_number}, phase {phase_number}-{phase_name}.
       Commit this task atomically. Do NOT create SUMMARY.md — the orchestrator handles that.
       </objective>

       <execution_context>
       @${CLAUDE_PLUGIN_ROOT}/workflows/execute-plan.md
       @${CLAUDE_PLUGIN_ROOT}/templates/summary.md
       @${CLAUDE_PLUGIN_ROOT}/references/checkpoints.md
       @${CLAUDE_PLUGIN_ROOT}/references/tdd.md
       </execution_context>

       <files_to_read>
       Read these files at execution start using the Read tool:
       - .planning/project-context.md (Project context — compact project baseline, if exists)
       - {task_file_path} (Task {task_num} of {task_total} — self-contained task instructions)
       - .planning/STATE.md (State — position and recent decisions)
       - .planning/config.json (Config, if exists)
       - ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
       - .claude/skills/ or .agents/skills/ (Project skills, if either exists — list skills, read SKILL.md for each, follow relevant rules during implementation)
       </files_to_read>

       <success_criteria>
       - [ ] Task {task_num} implementation complete
       - [ ] Task {task_num} committed atomically
       - [ ] All acceptance criteria from task file verified
       - [ ] STATE.md updated with position
       </success_criteria>
     "
   )
   ```

   **Post-execution HALT for sharded risk:high tasks:**
   After the task executor returns (and IF the task file was risk:high, i.e. TASK_RISK was non-empty):
   - Check the executor return for commit hash
   - Present post-execution HALT via AskUserQuestion:
     ```
     HALT: High-Risk Task Completed (Sharded Plan)
     Task: {task name}
     Changes committed: {commit hash from executor return}
     Review: git diff {hash}^ {hash}

     Type 'approved' to continue to the next task, or describe any issues found.
     ```
   - Wait for user response before proceeding to next task file spawn.
   - If user describes issues: note them in the SUMMARY.md deviations section; do not re-spawn the task executor unless the issue is blocking.

   **Track task completion:**

   ```bash
   TASK_FINAL_STATUS="DONE"
   # If task was skipped (user chose to skip during HALT), set TASK_FINAL_STATUS="SKIPPED"
   node "$CLAUDE_PLUGIN_ROOT/bin/pde-tools.cjs" tracking set-status \
     --tasks-dir "$TASKS_DIR" \
     --task "$TASK_NUM" \
     --status "$TASK_FINAL_STATUS" \
     --commit "$TASK_COMMIT_HASH"
   ```

   Where TASK_COMMIT_HASH comes from the executor return (already available in the existing flow from the commit step).

   Execute task spawns sequentially within a plan (task 1 before task 2), but plans within a wave still run parallel if `PARALLELIZATION=true`.

   **Sharded plan SUMMARY.md aggregation:**

   After the last task executor returns for a sharded plan, create SUMMARY.md in the plan directory. The orchestrator has the plan objective and task file list in context. Write a SUMMARY.md that:
   - Lists each task by number and name
   - Records commit hashes from task executor returns
   - Notes any deviations reported by individual task executors
   - Updates ROADMAP.md plan progress via `roadmap update-plan-progress`

   Include `$TASKS_DIR/workflow-status.md` in the plan completion commit alongside SUMMARY.md.

   **Mode B — Standard plan (no tasks directory):**

   Execute with existing single-agent-per-plan behavior (unchanged):

   ```
   Task(
     subagent_type="pde-executor",
     model="{executor_model}",
     prompt="
       <objective>
       Execute plan {plan_number} of phase {phase_number}-{phase_name}.
       Commit each task atomically. Create SUMMARY.md. Update STATE.md and ROADMAP.md.
       </objective>

       <execution_context>
       @${CLAUDE_PLUGIN_ROOT}/workflows/execute-plan.md
       @${CLAUDE_PLUGIN_ROOT}/templates/summary.md
       @${CLAUDE_PLUGIN_ROOT}/references/checkpoints.md
       @${CLAUDE_PLUGIN_ROOT}/references/tdd.md
       </execution_context>

       <files_to_read>
       Read these files at execution start using the Read tool:
       - .planning/project-context.md (Project context — compact project baseline, if exists)
       - {phase_dir}/{plan_file} (Plan)
       - .planning/STATE.md (State — position and recent decisions)
       - .planning/config.json (Config, if exists)
       - ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
       - .claude/skills/ or .agents/skills/ (Project skills, if either exists — list skills, read SKILL.md for each, follow relevant rules during implementation)
       </files_to_read>

       <success_criteria>
       - [ ] All tasks executed
       - [ ] Each task committed individually
       - [ ] SUMMARY.md created in plan directory
       - [ ] STATE.md updated with position and decisions
       - [ ] ROADMAP.md updated with plan progress (via `roadmap update-plan-progress`)
       </success_criteria>
     "
   )
   ```

3. **Wait for all agents in wave to complete.**

4. **Report completion — spot-check claims first:**

   For each SUMMARY.md:
   - Verify first 2 files from `key-files.created` exist on disk
   - Check `git log --oneline --all --grep="{phase}-{plan}"` returns ≥1 commit
   - Check for `## Self-Check: FAILED` marker

   For sharded plans (where orchestrator created SUMMARY.md): spot-check the last task executor's commit exists in git log.

   If ANY spot-check fails: report which plan failed, route to failure handler — ask "Retry plan?" or "Continue with remaining waves?"

   If pass:
   ```
   ---
   ## Wave {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from SUMMARY.md}
   {Notable deviations, if any}

   {If more waves: what this enables for next wave}
   ---
   ```

   - Bad: "Wave 2 complete. Proceeding to Wave 3."
   - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Wave 3) can now reference ground surfaces."

5. **Handle failures:**

   **Known Claude Code bug (classifyHandoffIfNeeded):** If an agent reports "failed" with error containing `classifyHandoffIfNeeded is not defined`, this is a Claude Code runtime bug — not a PDE or agent issue. The error fires in the completion handler AFTER all tool calls finish. In this case: run the same spot-checks as step 4 (SUMMARY.md exists, git commits present, no Self-Check: FAILED). If spot-checks PASS → treat as **successful**. If spot-checks FAIL → treat as real failure below.

   For real failures: report which plan failed → ask "Continue?" or "Stop?" → if continue, dependent plans may also fail. If stop, partial completion report.

6. **Execute checkpoint plans between waves** — see `<checkpoint_handling>`.

7. **Proceed to next wave.**
</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Auto-mode checkpoint handling:**

Read auto-advance config (chain flag + user preference):
```bash
AUTO_CHAIN=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
AUTO_CFG=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
```

When executor returns a checkpoint AND (`AUTO_CHAIN` is `"true"` OR `AUTO_CFG` is `"true"`):
- **human-verify** → Auto-spawn continuation agent with `{user_response}` = `"approved"`. Log `⚡ Auto-approved checkpoint`.
- **decision** → Auto-spawn continuation agent with `{user_response}` = first option from checkpoint details. Log `⚡ Auto-selected: [option]`.
- **human-action** → Present to user (existing behavior below). Auth gates cannot be automated.

**Standard flow (not auto-mode, or human-action type):**

1. Spawn agent for checkpoint plan
2. Agent runs until checkpoint task or auth gate → returns structured state
3. Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
4. **Present to user:**
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details from agent return]
   [Awaiting section from agent return]
   ```
5. User responds: "approved"/"done" | issue description | decision selection
6. **Spawn continuation agent (NOT resume)** using continuation-prompt.md template:
   - `{completed_tasks_table}`: From checkpoint return
   - `{resume_task_number}` + `{resume_task_name}`: Current task
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type
7. Continuation agent verifies previous commits, continues from resume point
8. Repeat until plan completes or user stops

**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.

**Checkpoints in parallel waves:** Agent pauses and returns while other parallel agents may complete. Present checkpoint, spawn continuation, wait for all before next wave.
</step>

<step name="aggregate_results">
After all waves:

```markdown
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |

### Plan Details
1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]

### Issues Encountered
[Aggregate from SUMMARYs, or "None"]
```

After aggregate_results: proceed to close_parent_artifacts (decimal phases only), then reconcile_phase, then verify_phase_goal.
</step>

<step name="close_parent_artifacts">
**For decimal/polish phases only (X.Y pattern):** Close the feedback loop by resolving parent UAT and debug artifacts.

**Skip if** phase number has no decimal (e.g., `3`, `04`) — only applies to gap-closure phases like `4.1`, `03.1`.

**1. Detect decimal phase and derive parent:**
```bash
# Check if phase_number contains a decimal
if [[ "$PHASE_NUMBER" == *.* ]]; then
  PARENT_PHASE="${PHASE_NUMBER%%.*}"
fi
```

**2. Find parent UAT file:**
```bash
PARENT_INFO=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" find-phase "${PARENT_PHASE}" --raw)
# Extract directory from PARENT_INFO JSON, then find UAT file in that directory
```

**If no parent UAT found:** Skip this step (gap-closure may have been triggered by VERIFICATION.md instead).

**3. Update UAT gap statuses:**

Read the parent UAT file's `## Gaps` section. For each gap entry with `status: failed`:
- Update to `status: resolved`

**4. Update UAT frontmatter:**

If all gaps now have `status: resolved`:
- Update frontmatter `status: diagnosed` → `status: resolved`
- Update frontmatter `updated:` timestamp

**5. Resolve referenced debug sessions:**

For each gap that has a `debug_session:` field:
- Read the debug session file
- Update frontmatter `status:` → `resolved`
- Update frontmatter `updated:` timestamp
- Move to resolved directory:
```bash
mkdir -p .planning/debug/resolved
mv .planning/debug/{slug}.md .planning/debug/resolved/
```

**6. Commit updated artifacts:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(phase-${PARENT_PHASE}): resolve UAT gaps and debug sessions after ${PHASE_NUMBER} gap closure" --files .planning/phases/*${PARENT_PHASE}*/*-UAT.md .planning/debug/resolved/*.md
```
</step>

<step name="reconcile_phase">
Gather execution evidence and produce RECONCILIATION.md before verification.

1. Find the first commit from the phase execution:
```bash
PHASE_FIRST_COMMIT=$(git log --oneline --grep="(${PHASE_NUMBER}-" --reverse --all | head -1 | cut -d' ' -f1)
```

2. If PHASE_FIRST_COMMIT is empty (no phase commits found), skip reconciliation:
```bash
if [ -z "$PHASE_FIRST_COMMIT" ]; then
  echo "No phase commits found — skipping reconciliation"
fi
```

3. Spawn reconciliation agent:
```
Task(
  subagent_type="pde-reconciler",
  model="{executor_model}",
  prompt="
    <objective>
    Generate RECONCILIATION.md for Phase {phase_number}.
    </objective>

    <execution_context>
    @${CLAUDE_PLUGIN_ROOT}/workflows/reconcile-phase.md
    </execution_context>

    <files_to_read>
    - {phase_dir}/*-PLAN.md (plans with task definitions and ac_refs)
    - {phase_dir}/*-SUMMARY.md (executor reports with deviations)
    - .planning/STATE.md
    - .planning/project-context.md (if exists)
    </files_to_read>

    <inputs>
    Phase dir: {phase_dir}
    Phase number: {phase_number}
    Phase name: {phase_name}
    Phase slug: {phase_slug}
    Phase first commit: {PHASE_FIRST_COMMIT}
    </inputs>
  "
)
```

4. Verify RECONCILIATION.md was created:
```bash
ls "{phase_dir}"/*-RECONCILIATION.md 2>/dev/null || echo "WARNING: RECONCILIATION.md not found after reconciliation step"
```

5. Read reconciliation status:
```bash
RECON_STATUS=$(grep "^status:" "{phase_dir}"/*-RECONCILIATION.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

6. If `RECON_STATUS` is not "clean", surface a brief summary to the user before proceeding to verification:
```
## Reconciliation: {RECON_STATUS}
{Read the ## Verifier Handoff section and display it}
Proceeding to verification...
```

If "clean": proceed silently to verify_phase_goal.
</step>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.

```
Task(
  prompt="Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Phase requirement IDs: {phase_req_ids}
Check must_haves against actual codebase.
Cross-reference requirement IDs from PLAN frontmatter against REQUIREMENTS.md — every ID MUST be accounted for.
Create VERIFICATION.md.
If RECONCILIATION.md exists, include its ## Verifier Handoff content under a new ## Reconciliation Summary section in VERIFICATION.md. If RECONCILIATION.md does not exist, note 'No RECONCILIATION.md found — reconciliation step may not have run' and continue with normal verification.",
  subagent_type="pde-verifier",
  model="{verifier_model}",
  files_to_read=[
    "{phase_dir}/*-RECONCILIATION.md (Reconciliation report — read ## Verifier Handoff section and include in VERIFICATION.md under a ## Reconciliation Summary heading)"
  ]
)
```

Read status:
```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

| Status | Action |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/pde:plan-phase {phase} --gaps` |

**If human_needed:**
```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

"approved" → continue | Report issues → gap closure
```

**If gaps_found:**
```
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase_num}-VERIFICATION.md

### What's Missing
{Gap summaries from VERIFICATION.md}

---
## ▶ Next Up

`/pde:plan-phase {X} --gaps`

<sub>`/clear` first → fresh context window</sub>

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/pde:verify-work {X}` — manual testing first
```

Gap closure cycle: `/pde:plan-phase {X} --gaps` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/pde:execute-phase {X} --gaps-only` → verifier re-runs.
</step>

<step name="update_roadmap">
**Mark phase complete and update all tracking files:**

```bash
COMPLETION=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" phase complete "${PHASE_NUMBER}")
```

The CLI handles:
- Marking phase checkbox `[x]` with completion date
- Updating Progress table (Status → Complete, date)
- Updating plan count to final
- Advancing STATE.md to next phase
- Updating REQUIREMENTS.md traceability

Extract from result: `next_phase`, `next_phase_name`, `is_last_phase`.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md {phase_dir}/*-VERIFICATION.md
```
</step>

<step name="offer_next">

**Exception:** If `gaps_found`, the `verify_phase_goal` step already presents the gap-closure path (`/pde:plan-phase {X} --gaps`). No additional routing needed — skip auto-advance.

**No-transition check (spawned by auto-advance chain):**

Parse `--no-transition` flag from $ARGUMENTS.

**If `--no-transition` flag present:**

Execute-phase was spawned by plan-phase's auto-advance. Do NOT run transition.md.
After verification passes and roadmap is updated, return completion status to parent:

```
## PHASE COMPLETE

Phase: ${PHASE_NUMBER} - ${PHASE_NAME}
Plans: ${completed_count}/${total_count}
Verification: {Passed | Gaps Found}

[Include aggregate_results output]
```

STOP. Do not proceed to auto-advance or transition.

**If `--no-transition` flag is NOT present:**

**Auto-advance detection:**

1. Parse `--auto` flag from $ARGUMENTS
2. Read both the chain flag and user preference (chain flag already synced in init step):
   ```bash
   AUTO_CHAIN=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true (AND verification passed with no gaps):**

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" panel "AUTO-ADVANCING" --type checkpoint --content "Phase {X} verified, continuing chain"
```

Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context):

Read and follow `${CLAUDE_PLUGIN_ROOT}/workflows/transition.md`, passing through the `--auto` flag so it propagates to the next phase invocation.

**If none of `--auto`, `AUTO_CHAIN`, or `AUTO_CFG` is true:**

**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**

```
## ✓ Phase {X}: {Name} Complete

/pde:progress — see updated roadmap
/pde:transition — plan next phase transition
/pde:execute-phase {next} — execute next phase
```
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context. Subagents: fresh 200k each. No polling (Task blocks). No context bleed.
</context_efficiency>

<failure_handling>
- **classifyHandoffIfNeeded false failure:** Agent reports "failed" but error is `classifyHandoffIfNeeded is not defined` → Claude Code bug, not PDE. Spot-check (SUMMARY exists, commits present) → if pass, treat as success
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **Dependency chain breaks:** Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip
- **All agents in wave fail:** Systemic issue → stop, report for investigation
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
</failure_handling>

<resumption>
Re-run `/pde:execute-phase {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>
