# Phase 49: Reconciliation & HALT Checkpoints — Research

**Researched:** 2026-03-19
**Domain:** PDE executor/verifier workflow — git-based plan reconciliation, HALT checkpoints for high-risk tasks, RECONCILIATION.md report format
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VRFY-01 | Mandatory reconciliation step runs after executor completion and before verifier; compares planned tasks vs actual git commits; produces RECONCILIATION.md | execute-phase.md `verify_phase_goal` step is the hook; reconciliation agent spawns between wave completion and verifier spawn; git log --grep pattern already established in codebase |
| VRFY-02 | RECONCILIATION.md reports: tasks completed vs planned, AC satisfaction status, deviations found, and unplanned changes detected | Report schema defined in Architecture Patterns; git diff --name-only provides file delta; task file ac_refs from Phase 48 provides AC data |
| VRFY-05 | Planner tags tasks with risk:high based on file patterns (migrations, auth, CI/CD, destructive refactors); executor pauses for user confirmation before and after high-risk tasks | execute-plan.md MANDATORY checks pattern already established; AskUserQuestion tool available; risk:high tag in PLAN.md frontmatter/task type attr; auto-patterns defined in research |
</phase_requirements>

---

## Summary

Phase 49 is a workflow augmentation phase with three integration points: a **reconciliation agent** that runs between executor completion and verifier spawn (execute-phase.md), **HALT confirmation logic** in the executor (execute-plan.md), and a **RECONCILIATION.md schema** consumed by the verifier.

The core mechanism is straightforward: after all waves complete in execute-phase.md, before the verifier is spawned, a new reconciliation step is inserted. This step runs `git log` to gather all commits since the phase started, compares them against the plan's declared tasks, identifies which ACs were satisfied (leveraging Phase 48's `ac_refs` data already in task files), detects unplanned changes via `git diff --name-only`, and writes RECONCILIATION.md. The verifier then reads RECONCILIATION.md and surfaces its deviation summary in the VERIFICATION.md report.

HALT logic is simpler: the `risk:high` tag is added to the `<task>` XML element's type attribute (e.g., `type="auto" risk="high"`), and the executor — which already has a MANDATORY boundaries check and MANDATORY acceptance_criteria check pattern — gains a third MANDATORY gate: a pre-task confirmation prompt and a post-task confirmation prompt for any task with `risk="high"`. The `AskUserQuestion` tool (already available in execute-phase's allowed-tools) handles the blocking confirmation.

The three files that change: `workflows/execute-phase.md` (reconciliation step inserted before `verify_phase_goal`), `workflows/execute-plan.md` (MANDATORY HALT check before and after risk:high tasks), and `workflows/plan-phase.md` (planner instructions for auto-tagging risk:high based on file patterns).

**Primary recommendation:** Insert a reconciliation agent spawn in execute-phase.md between `aggregate_results` and `verify_phase_goal`; add MANDATORY HALT confirmation in execute-plan.md using the same pattern as existing MANDATORY checks; add risk:high auto-tagging rules to the planner prompt's `deep_work_rules`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in (child_process / Bash tool) | Node 18+ | Run `git log`, `git diff --name-only`, `git show` to collect execution evidence | Already used throughout pde-tools.cjs and executor; no new dep |
| bin/pde-tools.cjs | existing | CLI coordination — init, commit, state operations | Already the execution coordinator; reconciliation reads git via Bash tool |
| AskUserQuestion tool | Claude Code built-in | Block executor until user confirms risk:high task proceed/continue | Already in execute-phase.md allowed-tools list; the right tool for HALT confirmation |
| Node.js fs (built-in) | Node 18+ | Write RECONCILIATION.md to .planning/ | Already used in all plan artifacts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `git log --oneline --grep="{phase}-{plan}"` | git | Collect all task commits for a plan/phase | Primary evidence source for reconciliation; already used in execute-phase.md spot-check |
| `git diff --name-only {first_commit}^..HEAD` | git | Detect files changed since phase start | Used in execute-phase.md update_codebase_map step — exact same pattern |
| `git show --stat {commit}` | git | Determine which files a specific commit touched | Bridges task commits to file changes for unplanned-change detection |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Git log grep by phase-plan convention | Parsing SUMMARY.md commit hashes | Git log is the authoritative record; SUMMARY.md may be incomplete if executor crashed mid-run. Git log survives interruptions. |
| AskUserQuestion for HALT | checkpoint:human-action in task type | AskUserQuestion is synchronous and inline; checkpoint:human-action adds orchestrator round-trip. For HALT we want zero latency between "task about to run" and "user confirms". AskUserQuestion is the right tool. |
| RECONCILIATION.md in phase dir | RECONCILIATION.md in .planning/ root | Phase dir is correct — reconciliation is per-phase, collocated with PLAN.md and SUMMARY.md. Verifier already reads from phase dir. |
| Reconciliation as separate binary | Reconciliation as workflow step (agent instruction) | The reconciliation logic is comparison and report writing — an agent can do this with git Bash calls + Write tool in one shot. No binary needed. |

**Installation:** No new dependencies. All implementation uses existing Node.js built-ins, git CLI (already present), and PDE's existing pde-tools.cjs infrastructure.

---

## Architecture Patterns

### Where Reconciliation Slots In (execute-phase.md flow)

The current execute-phase.md flow after all waves complete:

```
execute_waves → aggregate_results → verify_phase_goal → update_roadmap → offer_next
```

Phase 49 inserts one step:

```
execute_waves → aggregate_results → [NEW: reconcile_phase] → verify_phase_goal → update_roadmap → offer_next
```

The reconciliation step MUST run after all wave executors complete (so all commits exist) and BEFORE the verifier (so RECONCILIATION.md exists when the verifier reads it).

### Pattern 1: Reconciliation Agent Spawn (execute-phase.md)

**What:** A new `reconcile_phase` step in execute-phase.md that spawns a subagent to gather execution evidence and write RECONCILIATION.md.

**When to use:** After every successful wave execution, before verifier spawn.

**Implementation in execute-phase.md:**

```
<step name="reconcile_phase">
Gather execution evidence and produce RECONCILIATION.md before verification.

1. Find the first commit from the phase execution:
```bash
PHASE_FIRST_COMMIT=$(git log --oneline --grep="${PHASE_NUMBER}-" --reverse --all | head -1 | cut -d' ' -f1)
```

2. Spawn reconciliation agent:
```
Task(
  subagent_type="pde-reconciler",
  model="{executor_model}",
  prompt="
    <objective>
    Generate RECONCILIATION.md for Phase {phase_number}.
    </objective>

    <files_to_read>
    - {phase_dir}/*-PLAN.md (plans with task definitions and ac_refs)
    - {phase_dir}/*-SUMMARY.md (executor reports with deviations)
    - .planning/STATE.md
    </files_to_read>

    <execution_context>
    @${CLAUDE_PLUGIN_ROOT}/workflows/reconcile-phase.md
    </execution_context>

    <inputs>
    Phase dir: {phase_dir}
    Phase number: {phase_number}
    Phase first commit: {PHASE_FIRST_COMMIT}
    </inputs>
  "
)
```

3. Read status from RECONCILIATION.md:
```bash
grep "^status:" {phase_dir}/*-RECONCILIATION.md | cut -d: -f2 | tr -d ' '
```

4. If deviations_found: surface summary to user before proceeding to verifier.
   If clean: proceed silently.
</step>
```

### Pattern 2: Reconciliation Logic (reconcile-phase.md workflow)

**What:** A new workflow file that the reconciliation agent follows to gather evidence and write RECONCILIATION.md.

**Execution flow:**

```
1. Collect planned tasks from PLAN.md files (task names, ac_refs, files)
2. Collect actual commits via git log grep
3. Match commits to tasks via slug heuristic (primary) + file overlap (fallback)
4. Check git diff for files changed outside any task's declared file list
5. Derive AC satisfaction status from executor verification claims in SUMMARY.md
6. Write RECONCILIATION.md
```

**Task-to-commit matching algorithm (resolves STATE.md blocker):**

```
Primary: slug matching
  - For each task name (e.g., "Task 1: Add reconciliation step to execute-phase.md")
  - Normalize to slug: "add-reconciliation-step-to-execute-phase"
  - Match against git log commit messages: feat(49-01): add reconciliation step to execute-phase.md
  - Commit message after "): " normalized to slug must share 3+ consecutive words

Fallback: file overlap
  - If slug match fails, check commit's changed files (git show --stat {hash} --name-only)
  - If any file appears in the task's <files> list: it's a match
  - If still no match: commit is "unplanned"
```

**AC satisfaction derivation:**

```
For each task with ac_refs:
1. Check SUMMARY.md for the task's "Accomplished" items
2. Check SUMMARY.md for "Deviations" entries under that task
3. If task is in "completed" commits: AC refs status is "likely satisfied" (not verified independently)
4. If task has deviation: AC refs status is "completed with deviation — verify"
5. If task commit not found: AC refs status is "not executed"
```

### Pattern 3: RECONCILIATION.md Schema

**What:** The report file written by the reconciliation agent. Lives at `.planning/phases/XX-name/{phase_num}-RECONCILIATION.md`.

**Format:**

```markdown
---
phase: {phase-slug}
generated: {ISO-timestamp}
status: clean | deviations_found | unplanned_changes | incomplete
---

# Phase {X}: Reconciliation Report

**Generated:** {timestamp}
**Phase:** {phase_number} — {phase_name}
**Status:** clean | deviations_found | unplanned_changes | incomplete

## Tasks: Planned vs Completed

| Task | Plan | Status | Commit | AC Refs | AC Status |
|------|------|--------|--------|---------|-----------|
| Task 1: {name} | {plan_id} | completed | {hash} | AC-1, AC-2 | likely satisfied |
| Task 2: {name} | {plan_id} | completed_with_deviation | {hash} | AC-3 | completed with deviation — verify |
| Task 3: {name} | {plan_id} | not_executed | — | AC-4 | not executed |

**Summary:** {N} of {M} planned tasks completed

## Deviations from Plan

{If none: "None — all tasks executed as planned"}

{If deviations exist:}
### Deviation 1: {title}
- **Task:** {task name}
- **Type:** Rule 1 (Bug) | Rule 2 (Missing Critical) | Rule 3 (Blocking) | Rule 4 (Architectural)
- **Description:** {from SUMMARY.md}
- **Files affected:** {list}
- **Commits:** {hash(es)}

## Unplanned Changes

{If none: "None — all committed files were declared in task <files> lists"}

{If unplanned changes:}
### Unplanned Change 1
- **Files:** {list of files not in any task's <files>}
- **Commit:** {hash}
- **Message:** {commit message}
- **Assessment:** minor support file | potentially significant

## AC Satisfaction Summary

| AC | Description (first 60 chars) | Status |
|----|------------------------------|--------|
| AC-1 | Given... | likely satisfied |
| AC-2 | Given... | completed with deviation — verify |
| AC-3 | Given... | not executed |

## Verifier Handoff

{Summary paragraph for verifier to surface in VERIFICATION.md}
Status: {clean | deviations_found | unplanned_changes | incomplete}
Items requiring human review: {N}
```

**Key field: `## Verifier Handoff`**

This section is specifically for the verifier. It's a plain-language summary the verifier copies into its VERIFICATION.md deviation section. The verifier does NOT re-run all the git analysis — it reads this handoff section.

### Pattern 4: HALT Confirmation (execute-plan.md)

**What:** Two MANDATORY gates added to the executor for tasks tagged `risk="high"` in the task type attribute.

**Task XML format with risk tag:**

```xml
<task type="auto" risk="high">
  <name>Task 3: Run database migration</name>
  ...
</task>
```

**In sharded task files**, the risk attribute propagates as a header line:

```markdown
**Risk level:** HIGH — confirmation required before and after execution
```

**The two gates in execute-plan.md:**

Gate 1 — Before execution:
```
MANDATORY HALT (pre-task): If a task has risk="high" (or "**Risk level:** HIGH" in
a task file), STOP before executing. Display:

  "HALT: High-Risk Task
   Task: {task name}
   Why high-risk: {risk reason if provided, or 'tagged risk:high in plan'}
   Files to be modified: {task files}

   Type 'proceed' to continue or 'skip' to mark this task as skipped."

Wait for user acknowledgment before executing. Do not proceed until user responds.
If user responds 'skip': mark task as SKIPPED, do not execute, continue to next task.
```

Gate 2 — After execution (before marking done):
```
MANDATORY HALT (post-task): After completing a risk:high task (and after acceptance
criteria checks pass), STOP before moving to the next task. Display:

  "HALT: High-Risk Task Completed
   Task: {task name}
   Changes committed: {commit hash}

   Review the changes above. Type 'approved' to continue to the next task,
   or describe any issues found."

Wait for user acknowledgment. If user describes issues: treat as Rule 1 (Bug) and
fix before final acknowledgment. Do not move to the next task without approval.
```

**AskUserQuestion is the implementation tool.** The command `execute-phase.md` already lists `AskUserQuestion` in its allowed-tools. The executor (pde-executor), spawned as a subagent, also needs this tool available.

**Note:** In Mode A (sharded, one executor per task), the HALT pattern simplifies: the executor for a risk:high task file runs the pre-execution HALT at the start and post-execution HALT before its done signal. The orchestrator (execute-phase.md) handles presenting this to the user via its checkpoint_handling step.

**However:** Sharded task executors are subagents — they cannot directly invoke AskUserQuestion with the user. They must return a structured checkpoint to the orchestrator, which then presents the HALT to the user. This follows the same `checkpoint_return_for_orchestrator` pattern already in execute-plan.md (line 302-308).

**Practical implication:** For risk:high tasks in sharded plans, the HALT is implemented as a `type="checkpoint:human-verify"` checkpoint in the task. The task XML gains `type="checkpoint:human-verify" risk="high"` or the orchestrator detects `risk="high"` in the task file header and adds a pre-execution checkpoint step. The simpler approach: pre-execution HALT in the orchestrator (execute-phase.md) before spawning the task executor, by reading the task file header for "Risk level: HIGH". Post-execution HALT: orchestrator reads the returned summary and if risk was high, presents the checkpoint before proceeding to the next task executor spawn.

### Pattern 5: Risk Tagging in the Planner (plan-phase.md)

**What:** The planner auto-tags tasks `risk="high"` based on file patterns and task characteristics.

**Auto-tag rules (added to `deep_work_rules` in plan-phase.md):**

```
7. **`risk` attribute on high-risk tasks** — Tag tasks `risk="high"` when any of these
   apply to the task's <files> list or action description:

   Auto-tag criteria:
   - Files matching: */migrations/*, *migration*.sql, *migration*.ts/js
   - Files matching: */auth/*, *authentication*, *oauth*, *jwt*, *session*, *password*
   - Files matching: *.github/workflows/*, .circleci/*, Jenkinsfile, *ci*.yml
   - Files matching: *seed*.sql, *seed*.ts/js, *data-loss*, *drop-table*, *DELETE FROM*
   - Actions containing: "delete all", "truncate", "drop table", "destroy", "irrecoverable"
   - Files matching: */scripts/deploy*, *deploy.sh*, *release.sh*
   - Files modifying external integrations with live production data

   Format: <task type="auto" risk="high">

   When tagging risk:high, add a <risk_reason> field explaining why:
   <risk_reason>Database migration — potentially irreversible schema change</risk_reason>

   Tasks that are NOT risk:high even if they touch adjacent files:
   - Test files only (*.test.ts, *.spec.ts)
   - Documentation only (*.md)
   - Configuration comment updates (no logic changes)
```

**Risk reason in task files (sharding.cjs extension):**

The sharding.cjs `extractField` pattern handles `risk_reason` extraction:

```javascript
const riskReason = extractField(taskInner, 'risk_reason');
```

And `buildTaskFileContent` adds to the header:

```markdown
**Risk level:** HIGH — {risk_reason}
```

Or if no risk attribute: this line is omitted.

### Pattern 6: Verifier Consuming RECONCILIATION.md

**What:** The verifier (spawned in execute-phase.md `verify_phase_goal`) reads RECONCILIATION.md and surfaces its deviation summary.

**Change to verifier spawn prompt in execute-phase.md:**

```
<files_to_read>
- {phase_dir}/*-RECONCILIATION.md (Reconciliation report — read ## Verifier Handoff section)
...
</files_to_read>
```

**Change to verifier instructions:**

The verifier reads the `## Verifier Handoff` section from RECONCILIATION.md and includes it in VERIFICATION.md under a new section:

```markdown
## Reconciliation Summary

{Verbatim content from RECONCILIATION.md ## Verifier Handoff}
```

If RECONCILIATION.md does not exist (pre-Phase-49 execution or reconciliation step failed): verifier notes "No RECONCILIATION.md found — reconciliation step may not have run" and continues with its normal verification.

### Recommended Project Structure Changes

```
.planning/phases/49-reconciliation-halt-checkpoints/
├── 49-01-PLAN.md      # Plan 1: reconcile-phase.md workflow + execute-phase.md integration
├── 49-02-PLAN.md      # Plan 2: execute-plan.md HALT + plan-phase.md risk tagging + sharding
workflows/
├── reconcile-phase.md  # NEW: reconciliation agent workflow
execute-phase.md        # MODIFIED: add reconcile_phase step, update verifier spawn
execute-plan.md         # MODIFIED: add HALT gates for risk:high tasks
plan-phase.md           # MODIFIED: add risk auto-tag rules to deep_work_rules
bin/lib/sharding.cjs    # MODIFIED: extract risk, risk_reason fields; include in task files
tests/phase-49/
├── reconciliation.test.mjs   # Unit tests for reconciliation matching algorithm
├── halt-risk-tagging.test.mjs # Unit tests for risk attr extraction in sharding.cjs
```

### Anti-Patterns to Avoid

- **Running reconciliation AFTER the verifier:** The verifier must read RECONCILIATION.md. If reconciliation runs after verify, the verifier has no reconciliation data.
- **Reconciliation that re-runs verification:** Reconciliation is observational (what did git record?) not evaluative (did the plan succeed?). The verifier does the evaluation. Keep them separate.
- **HALT prompts that auto-timeout:** A HALT for a risk:high task must block indefinitely until the user responds. No timeout. No auto-proceed.
- **Risk tagging based only on file name suffix:** A file named `utils.ts` that contains auth logic should be risk:high if the task action description involves auth, not just based on filename. Apply both file pattern AND action description scanning.
- **Reconciliation matching by commit timestamp only:** Timestamps are unreliable if the executor batches commits or if the system clock drifts. Use `git log --grep` with the phase-plan convention as primary key.
- **HALT in Mode A (sharded) as inline AskUserQuestion:** Subagents cannot directly ask the user. HALT for sharded plans must be handled by the orchestrator via the existing checkpoint_return_for_orchestrator pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File change detection since phase start | Custom file watcher or manifest | `git diff --name-only {first_commit}^..HEAD` | Git is already the source of truth; already used in execute-phase.md update_codebase_map step (line 445) |
| Task-to-commit matching | Separate NLP/fuzzy matching library | Slug matching + file overlap heuristic (pure string operations) | No external lib needed; PDE commit convention (`{type}({phase}-{plan}): {description}`) makes the phase-plan prefix a reliable key |
| HALT blocking prompt | Custom readline/stdin listener | AskUserQuestion tool (built-in) | Already in execute-phase.md allowed-tools; designed for exactly this use case |
| RECONCILIATION.md templating | Handlebars/template engine | Inline string concatenation (same pattern as task file generation in sharding.cjs) | sharding.cjs builds task files with inline string concat; reconciliation report follows the same pattern |
| AC satisfaction verification in reconciliation | Re-running all AC checks | Reading SUMMARY.md "Deviations" + task commit presence | The executor already verified ACs; reconciliation observes the outcome, it does not re-verify |
| Risk auto-detection | Static analysis tooling | Planner prompt file pattern rules + agent reasoning | The planner already reads files and reasons about them; explicit rules in deep_work_rules are sufficient and maintainable |

**Key insight:** Reconciliation is observation (git log) + comparison (plan tasks vs commits) + reporting (markdown). All three are within a single agent's capability with Bash and Write tools. No new binary or library is needed.

---

## Common Pitfalls

### Pitfall 1: Reconciliation spawned but RECONCILIATION.md location is wrong

**What goes wrong:** The reconciliation agent writes RECONCILIATION.md to the wrong path (e.g., `.planning/RECONCILIATION.md` instead of `.planning/phases/49-name/{phase_num}-RECONCILIATION.md`). The verifier cannot find it.

**Why it happens:** The execute-phase.md verifier spawn uses `{phase_dir}/*-RECONCILIATION.md` glob — if reconciliation writes to a different path, the glob fails silently.

**How to avoid:** Explicitly pass `phase_dir` and `phase_number` to the reconciliation agent in its prompt. The output path MUST be `{phase_dir}/{phase_num}-RECONCILIATION.md`. Add path verification after reconciliation spawn:

```bash
ls "{phase_dir}"/*-RECONCILIATION.md 2>/dev/null || echo "WARNING: RECONCILIATION.md not found"
```

**Warning signs:** Verifier reports "No RECONCILIATION.md found" for a phase that ran reconciliation.

### Pitfall 2: HALT in sharded plans silently skipped

**What goes wrong:** In Mode A execution (sharded plans, one executor per task file), the executor subagent cannot invoke AskUserQuestion to reach the user. A task file with "Risk level: HIGH" runs to completion without HALT confirmation.

**Why it happens:** Subagents in Task() calls do not have direct user interaction — they interact through the orchestrator checkpoint mechanism. If the HALT is implemented only as an AskUserQuestion call in execute-plan.md, it silently fails in sharded mode.

**How to avoid:** Two-layer HALT implementation:
1. **Orchestrator layer (execute-phase.md):** Before spawning a task executor, the orchestrator checks the task file's "Risk level:" header. If "HIGH", the orchestrator presents the pre-execution HALT to the user BEFORE spawning the task executor. After the task executor returns, if the task was risk:high, present the post-execution HALT.
2. **Executor layer (execute-plan.md):** The MANDATORY HALT check in execute-plan.md handles non-sharded (Mode B) plans where the executor runs interactively. In sharded Mode A, the orchestrator HALT replaces this.

**Warning signs:** Risk:high task commits appear in git log without any HALT confirmation record in the execution transcript.

### Pitfall 3: Reconciliation matching creates false "unplanned" entries

**What goes wrong:** Legitimate task commits are classified as "unplanned" because the slug matching fails. This happens when the commit message doesn't follow the `{type}({phase}-{plan}): {description}` convention closely.

**Why it happens:** The executor's deviation handling (Rule 1-3 auto-fixes) produces commits like `fix(49-01): correct boundary check in task 2` — these don't match `Task 2: Correct boundary check` directly.

**How to avoid:**
1. File overlap fallback: if slug match fails, check if the commit's changed files overlap with any task's `<files>` list — if yes, assign to that task.
2. Phase-plan prefix as weak match: any commit with the correct `({phase}-{plan})` prefix is considered "likely associated" with the plan even without task match.
3. Only flag as "unplanned" when both slug AND file overlap AND phase-plan prefix all fail to match.

**Warning signs:** RECONCILIATION.md has many "unplanned" entries for commits that clearly belong to the phase (correct phase-plan prefix in commit message).

### Pitfall 4: Risk tagging causes plan-checker failures on pre-Phase-49 plans

**What goes wrong:** The plan checker validates task structure. If `risk="high"` is added as an XML attribute but the plan checker doesn't recognize it, it may flag all risk:high tasks as malformed.

**Why it happens:** The plan checker agent instruction may not be updated to allow the new `risk` attribute on `<task>` elements.

**How to avoid:** Update the pde-plan-checker instructions to allow `type="auto" risk="high"` as a valid `<task>` opening tag variant. The checker uses pattern matching, not strict XML schema validation — add `risk` to the list of recognized task attributes.

**Warning signs:** Plan checker returns "ISSUES FOUND" citing malformed task XML for plans with risk:high tasks.

### Pitfall 5: RECONCILIATION.md references commits outside the phase

**What goes wrong:** `git log --grep="{phase_number}-"` matches commits from other phases that happen to contain the phase number in their message (e.g., phase 4 grep matches phase 40, 41, 42, etc.).

**Why it happens:** The grep pattern is not anchored to the commit convention prefix.

**How to avoid:** Use a more specific grep pattern that matches the exact phase-plan prefix format:

```bash
git log --oneline --grep="({phase_number}-" --all
```

The parenthesis anchors the match — `(49-01)` is distinct from `(490-01)` or `(149-01)`. Also add a date range using `--after={phase_start_time}` as a secondary filter when PLAN_START_TIME is known.

**Warning signs:** RECONCILIATION.md lists commits from other phases.

### Pitfall 6: Post-task HALT blocks executor from committing task

**What goes wrong:** The HALT gate fires AFTER the executor completes task work but BEFORE the task commit. The user sees the HALT, approves, but the commit then fails (pre-commit hook error, for instance). The task is then in a "HALT approved but not committed" limbo state.

**Why it happens:** The task commit protocol in execute-plan.md runs commit AFTER done criteria verification. If HALT fires between done criteria and commit, the approval may not be connected to the commit outcome.

**How to avoid:** The post-task HALT should fire AFTER the commit, not before it. The sequence for risk:high tasks:

```
1. Execute task
2. Run acceptance_criteria checks
3. Run AC-N verification
4. Commit (atomically — task output is now in git)
5. [HALT: Post-task] "Changes committed as {hash}. Review and approve."
6. User approves
7. Proceed to next task
```

The HALT shows the commit hash so the user can run `git diff {hash}^ {hash}` to review the actual changes before approving.

**Warning signs:** User is asked to approve a risk:high task but sees no commit hash in the HALT message.

### Pitfall 7: Reconciliation reads SUMMARY.md for deviation data but SUMMARY is not yet created

**What goes wrong:** In sharded Mode A execution, the SUMMARY.md is created by the orchestrator AFTER all task executors complete. The reconciliation agent runs after wave completion — at that point, only individual task executor returns exist, not yet a final SUMMARY.md.

**Why it happens:** The reconciliation step is inserted before `verify_phase_goal` but AFTER `aggregate_results`. The `aggregate_results` step creates SUMMARY.md. If reconciliation relies on SUMMARY.md data, and SUMMARY isn't created until aggregate_results, the ordering matters.

**How to avoid:** Reconciliation runs AFTER `aggregate_results` (which creates SUMMARY.md). The execute-phase.md step ordering:

```
execute_waves → aggregate_results → reconcile_phase → verify_phase_goal
```

`aggregate_results` is responsible for creating SUMMARY.md. `reconcile_phase` reads SUMMARY.md for deviation data. This ordering is correct. The reconciliation agent's `files_to_read` MUST list `{phase_dir}/*-SUMMARY.md`.

**Warning signs:** Reconciliation agent reports "no deviation data found" even though executors reported deviations.

---

## Code Examples

Verified patterns from existing PDE codebase:

### Git log grep for phase commits (from execute-phase.md line 445)

```bash
# Source: execute-phase.md update_codebase_map step
FIRST_TASK=$(git log --oneline --grep="feat({phase}-{plan}):" --grep="fix({phase}-{plan}):" \
  --grep="test({phase}-{plan}):" --reverse | head -1 | cut -d' ' -f1)
git diff --name-only ${FIRST_TASK}^..HEAD 2>/dev/null
```

Phase 49 adaptation for full-phase reconciliation:

```bash
# All commits for the phase (any plan within phase)
PHASE_COMMITS=$(git log --oneline --grep="({phase_number}-" --all)
# First commit (oldest)
PHASE_FIRST=$(echo "$PHASE_COMMITS" | tail -1 | cut -d' ' -f1)
# All files changed since phase start
ALL_CHANGED=$(git diff --name-only ${PHASE_FIRST}^..HEAD 2>/dev/null)
```

### Spot-check pattern (from execute-phase.md line 239)

```bash
# Source: execute-phase.md execute_waves step — spot-check after each wave
git log --oneline --all --grep="{phase}-{plan}" | head -5
```

### Risk attribute extraction in sharding.cjs (new — follows existing extractField pattern)

```javascript
// Source: sharding.cjs extractField() — existing utility at line 44
// Phase 49 additions to shardPlan() task extraction loop:
const riskLevel = ''; // Extract from task opening tag, not inner content
const taskOpenMatch = taskBlocks[i].fullMatch.match(/<task[^>]*risk\s*=\s*["']([^"']+)["'][^>]*>/i);
const risk = taskOpenMatch ? taskOpenMatch[1] : '';
const riskReason = extractField(taskInner, 'risk_reason');

// In buildTaskFileContent params: pass risk and riskReason
// Conditional header line:
const riskSection = risk === 'high'
  ? '**Risk level:** HIGH — ' + (riskReason || 'tagged risk:high in plan') + '\n'
  : '';
```

Note: `risk` is an XML attribute on `<task>`, not a child element. It requires attribute extraction (regex on fullMatch) rather than the existing `extractField()` (which extracts child element content). This is the same pattern needed for the existing `type` attribute, but `type` isn't currently surfaced in task files.

### AskUserQuestion for HALT (non-sharded executor)

```
// Source: execute-phase.md allowed-tools list (AskUserQuestion present)
// In execute-plan.md MANDATORY HALT check:

AskUserQuestion(
  header="HALT: High-Risk Task",
  options=[
    "proceed — I understand this task makes potentially irreversible changes",
    "skip — skip this task and continue with the plan"
  ]
)
```

The response drives the executor: "proceed" continues execution, "skip" marks the task SKIPPED and moves to the next task.

### RECONCILIATION.md status values

```javascript
// The four valid status values for RECONCILIATION.md frontmatter:
// "clean"              — all tasks completed, no deviations, no unplanned changes
// "deviations_found"   — tasks completed but executor used Rule 1-3 deviation handling
// "unplanned_changes"  — files modified that weren't in any task's <files> list
// "incomplete"         — one or more planned tasks not executed (no matching commit)
//
// Multiple conditions: "deviations_found" takes precedence over "unplanned_changes";
// "incomplete" takes precedence over both.
```

### Verifier spawn update (execute-phase.md verify_phase_goal step)

```
// Source: execute-phase.md verify_phase_goal step — add RECONCILIATION.md to files_to_read

Task(
  prompt="Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
...
<files_to_read>
- {phase_dir}/*-RECONCILIATION.md (Reconciliation report — read ## Verifier Handoff section and include in VERIFICATION.md)
</files_to_read>
",
  subagent_type="pde-verifier",
  model="{verifier_model}"
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No reconciliation — verifier runs directly after executor | Reconciliation step between executor and verifier | Phase 49 | Systematic detection of what actually happened vs what was planned before verification |
| No HALT — all tasks execute autonomously | HALT confirmation for risk:high tasks | Phase 49 | User control point before and after potentially irreversible changes |
| No risk tagging — planner has no concept of risk level | risk:high auto-tagging based on file patterns | Phase 49 | Planner surfaces task risk in plan structure; executor uses it for HALT decisions |
| Verifier works only from SUMMARY.md (executor self-report) | Verifier reads RECONCILIATION.md (git-grounded independent evidence) | Phase 49 | Verification based on git truth, not just executor claims |

**Deprecated/outdated patterns after Phase 49:**
- None: Phase 49 is purely additive. No existing patterns are deprecated.

**Forward compatibility (Phase 50):**
- RECONCILIATION.md `status` field feeds the readiness gate (Phase 50 VRFY-03/04): if reconciliation `status: incomplete`, the Phase 50 readiness gate should surface this as a concern.
- Phase 51 (TRCK-01) per-task status tracking will read from both RECONCILIATION.md and workflow-status.md for its progress display.

---

## Open Questions

1. **Should reconciliation run when there are zero phase commits?**
   - What we know: If a phase is in planning-only state (no execution happened), git log grep returns nothing.
   - What's unclear: Should reconciliation produce an empty RECONCILIATION.md or skip entirely?
   - Recommendation: Produce a minimal RECONCILIATION.md with `status: incomplete` and "No execution commits found for this phase" — provides a useful signal to the verifier that execution didn't run.

2. **Risk:high HALT for Mode A (sharded) — orchestrator vs executor layer?**
   - What we know: Mode A executors are subagents that cannot directly AskUserQuestion. The orchestrator has AskUserQuestion access.
   - What's unclear: Does the orchestrator read each task file header before spawning to check for risk:high, or does the task executor return a structured checkpoint?
   - Recommendation: Orchestrator reads task file header before spawn (it's a one-line grep on the task file). If "Risk level: HIGH" found, orchestrator presents pre-execution HALT before spawning. Post-execution: if the task file was risk:high, orchestrator presents post-execution HALT after the task executor returns. This is simpler than the full checkpoint_return_for_orchestrator round-trip and keeps HALT logic in one place.
   - This is the **plan-defining decision** — the plan must specify which approach to implement.

3. **Reconciliation agent type — new pde-reconciler or inline orchestrator?**
   - What we know: The execute-phase.md orchestrator spawns subagents for execution and verification. The verifier is a named subagent type (pde-verifier). Reconciliation is comparably complex.
   - What's unclear: Does reconciliation need a full subagent (with its own workflow file) or can it be done inline in the orchestrator (orchestrator runs git commands and writes RECONCILIATION.md)?
   - Recommendation: New `reconcile-phase.md` workflow consumed by a pde-reconciler subagent. Reasons: (1) reconciliation logic is non-trivial (git analysis + report writing), (2) the orchestrator should stay lean (~10-15% context), (3) consistent with how verification is handled. If context overhead is a concern, the orchestrator can run the git commands and pass evidence to the reconciler rather than having the reconciler run git itself.

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — tests run directly with `node --test {file}` |
| Quick run command | `node --test tests/phase-49/*.test.mjs` |
| Full suite command | `node --test tests/phase-49/*.test.mjs && node --test tests/phase-48/*.test.mjs && node --test tests/phase-47/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VRFY-01 | Reconciliation step is defined in execute-phase.md between aggregate_results and verify_phase_goal | unit (grep) | `grep -n "reconcile_phase" workflows/execute-phase.md` | Wave 0 check |
| VRFY-01 | reconcile-phase.md workflow file exists | unit (file check) | `test -f workflows/reconcile-phase.md` | Wave 0 check |
| VRFY-02 | RECONCILIATION.md status values are one of: clean, deviations_found, unplanned_changes, incomplete | unit | `node --test tests/phase-49/reconciliation.test.mjs` | Wave 0 |
| VRFY-02 | Task-to-commit slug matching returns correct task for standard commit message | unit | `node --test tests/phase-49/reconciliation.test.mjs` | Wave 0 |
| VRFY-02 | Task-to-commit file overlap fallback returns correct task when slug fails | unit | `node --test tests/phase-49/reconciliation.test.mjs` | Wave 0 |
| VRFY-02 | Commit with no task match is classified as "unplanned" | unit | `node --test tests/phase-49/reconciliation.test.mjs` | Wave 0 |
| VRFY-05 | sharding.cjs extracts risk attribute from task opening tag | unit | `node --test tests/phase-49/halt-risk-tagging.test.mjs` | Wave 0 |
| VRFY-05 | Task file includes "Risk level: HIGH" header when risk="high" | unit | `node --test tests/phase-49/halt-risk-tagging.test.mjs` | Wave 0 |
| VRFY-05 | Task file omits risk level header when no risk attribute | unit | `node --test tests/phase-49/halt-risk-tagging.test.mjs` | Wave 0 |
| VRFY-05 | Task file includes risk_reason in risk level header | unit | `node --test tests/phase-49/halt-risk-tagging.test.mjs` | Wave 0 |
| VRFY-05 | HALT instruction present in execute-plan.md for risk:high tasks | unit (grep) | `grep -n "MANDATORY HALT" workflows/execute-plan.md` | Wave 0 check |
| PLAN-01,04 | Phase 48 sharding tests still pass (regression) | regression | `node --test tests/phase-48/*.test.mjs` | Existing |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-49/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-49/*.test.mjs && node --test tests/phase-48/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-49/reconciliation.test.mjs` — covers VRFY-02 matching algorithm
  - Synthetic commit log data (array of `{hash, message, files}` objects)
  - Synthetic plan task list (`{name, files, ac_refs}` objects)
  - Tests: slug match success, slug match failure + file overlap success, both fail → unplanned, no commits → incomplete
- [ ] `tests/phase-49/halt-risk-tagging.test.mjs` — covers VRFY-05 sharding.cjs risk extraction
  - Synthetic PLAN.md with `<task type="auto" risk="high">` and `<risk_reason>` field
  - Verifies task file output contains "**Risk level:** HIGH" header
  - Verifies task file omits risk header when no risk attribute
  - Verifies risk_reason text appears in task file header

*(Framework install not needed — `node --test` is built-in, same as Phase 46/47/48)*

---

## Files to Modify / Create

### New Files

1. **`workflows/reconcile-phase.md`** — Reconciliation agent workflow. Documents the algorithm for collecting git evidence, matching tasks to commits, and writing RECONCILIATION.md.

### Files to Modify

2. **`workflows/execute-phase.md`** — Add `reconcile_phase` step between `aggregate_results` and `verify_phase_goal`; update verifier spawn prompt to include `{phase_dir}/*-RECONCILIATION.md` in files_to_read; add risk:high HALT check before/after sharded task executor spawns.

3. **`workflows/execute-plan.md`** — Add MANDATORY HALT (pre-task) and MANDATORY HALT (post-task) checks for risk:high tasks; ensure HALT (post-task) fires AFTER commit (shows user the commit hash).

4. **`workflows/plan-phase.md`** — Add item 7 to `deep_work_rules`: risk auto-tagging rules with file patterns and action description criteria.

5. **`bin/lib/sharding.cjs`** — Extract `risk` attribute from task opening tag (attribute regex, not extractField); extract `risk_reason` using extractField; add risk header line to buildTaskFileContent output (conditional on risk === 'high').

### Files NOT to Modify

- **`bin/pde-tools.cjs`** — No new CLI subcommand needed; reconciliation is a workflow agent, not a CLI operation
- **`bin/lib/frontmatter.cjs`** — RECONCILIATION.md frontmatter is minimal (status, phase, generated) — no schema validation needed
- **`bin/lib/phase.cjs`** — Plan index / task counting logic unchanged
- **`workflows/verify-work.md`** — UAT workflow is separate from automated verification; unaffected
- Any existing PLAN.md files — no retroactive risk tagging; existing plans without risk attribute run without HALT

---

## Sources

### Primary (HIGH confidence)

- `workflows/execute-phase.md` (PDE, full file read) — `verify_phase_goal` step (line 390+), `execute_waves` step, `aggregate_results` step, `checkpoint_handling`, `update_codebase_map` (git diff pattern at line 445)
- `workflows/execute-plan.md` (PDE, full file read) — MANDATORY acceptance_criteria check (line 143), MANDATORY AC-N verification (line 144), MANDATORY boundaries check (line 140), checkpoint_return_for_orchestrator (lines 302-308), task_commit protocol (lines 250-284)
- `workflows/plan-phase.md` (PDE, deep_work_rules items 1-6 from Phase 48) — rule structure pattern for item 7
- `bin/lib/sharding.cjs` (PDE, full file read) — extractField (line 44), buildTaskFileContent (line 98), shardPlan task extraction loop (lines 244-281), extractTaskBlocks (lines 24-36)
- `.planning/REQUIREMENTS.md` (PDE) — VRFY-01, VRFY-02, VRFY-05 definitions
- `.planning/STATE.md` (PDE) — Phase 49 blocker: "Reconciliation matching heuristic unspecified — recommend defining in plan-phase: slug matching as primary, file-path overlap as fallback" → resolved in this research
- `.planning/phases/48-ac-first-planning/48-RESEARCH.md` — Phase 48 architecture decisions (AC structure in task files, Phase 49 integration notes at line 602-604)
- `.planning/config.json` — nyquist_validation: true confirmed

### Secondary (MEDIUM confidence)

- `commands/execute-phase.md` — allowed-tools list (AskUserQuestion confirmed present for execute-phase command)
- `.planning/phases/48-ac-first-planning/48-02-SUMMARY.md` — confirmed execute-plan.md structure after Phase 48 changes
- `.planning/phases/48-ac-first-planning/48-VERIFICATION.md` — confirmed Phase 48 is complete; reconciliation can depend on its outputs

### Tertiary (LOW confidence)

- None — all findings based on direct reading of PDE codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all implementation uses existing PDE infrastructure; no external dependencies
- Architecture: HIGH — based on direct reading of execute-phase.md, execute-plan.md, sharding.cjs; patterns extrapolated from established conventions
- Pitfalls: HIGH — identified by tracing the complete execution flow for both sharded (Mode A) and non-sharded (Mode B) paths; HALT-in-subagent pitfall identified from execute-plan.md checkpoint_return_for_orchestrator documentation
- Validation architecture: HIGH — same test framework as Phase 46/47/48; risk attribute extraction follows same pattern as existing sharding tests

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable — all implementation targets internal PDE framework files with no external dependencies)

**Unresolved blocker from STATE.md:** "Reconciliation matching heuristic unspecified" — **RESOLVED** in this research: slug matching as primary, file-path overlap as fallback, phase-plan prefix as weak match. Plan should specify this algorithm explicitly.

**One plan-defining decision for the planner:** The risk:high HALT implementation for sharded Mode A plans — orchestrator reads task file header before spawn (recommended) vs task executor returns checkpoint. The planner must pick one approach and implement consistently.
