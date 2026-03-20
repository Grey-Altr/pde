<purpose>
Gather execution evidence from git history, compare against planned tasks, and produce RECONCILIATION.md.
</purpose>

<required_reading>
Read STATE.md and project-context.md (if exists) before any operation to load project context.
</required_reading>

<process>

<step name="collect_planned_tasks">
Read all PLAN.md files in the phase directory (passed via `{phase_dir}` input).

```bash
ls "{phase_dir}"/*-PLAN.md 2>/dev/null | sort
```

For each PLAN.md file:
- Extract all `<task>` blocks
- For each task: extract task name (from `<name>` tag), files list (from `<files>` tag), ac_refs (from `<ac_refs>` tag)
- Note the plan ID from the filename (e.g., `49-01` from `49-01-PLAN.md`)

Build an array of objects:
```
{plan_id, task_name, task_files, ac_refs}
```

Example:
```
[
  { plan_id: "49-01", task_name: "Task 1: Create reconcile-phase.md workflow", task_files: ["workflows/reconcile-phase.md"], ac_refs: "AC-1, AC-3, AC-4" },
  { plan_id: "49-01", task_name: "Task 2: Add reconcile_phase step to execute-phase.md", task_files: ["workflows/execute-phase.md"], ac_refs: "AC-1, AC-2" }
]
```

If no PLAN.md files found: note "No plan files found in phase directory" and proceed to git evidence collection. Reconciliation will report incomplete status.
</step>

<step name="collect_workflow_status">
Check for workflow-status.md in plan tasks directories:

```bash
for STATUS_FILE in $(ls "{phase_dir}"/*-tasks/workflow-status.md 2>/dev/null); do
  echo "=== $STATUS_FILE ==="
  cat "$STATUS_FILE"
done
```

Parse each file using the standard table pattern:
`| num | name | status | commit | updated |`

Build status_map keyed by `{plan_prefix}:{task_num}`:
- status: DONE/SKIPPED/IN_PROGRESS/TODO
- commit: the hash in the commit column (may be "---" if not set)

If no workflow-status.md files found: note "No workflow-status.md found --- task tracking not used for this phase" and proceed normally. This step is advisory; its absence does not change reconciliation status.
</step>

<step name="collect_git_evidence">
Gather all commits associated with this phase using the parenthesis-anchored grep pattern (per Pitfall 5 — avoids cross-phase matches like phase 4 matching phase 40, 41, 42):

```bash
git log --oneline --grep="({phase_number}-" --all
```

For each commit hash returned, collect the changed files:
```bash
git show --stat {hash} --name-only | tail -n +2 | grep "^[^|]" | grep -v "^$" | grep -v "files changed"
```

Or more reliably:
```bash
git diff-tree --no-commit-id -r --name-only {hash}
```

Build an array of objects:
```
{hash, message, files}
```

Example:
```
[
  { hash: "a1b2c3d", message: "feat(49-01): create reconcile-phase.md workflow", files: ["workflows/reconcile-phase.md"] },
  { hash: "e4f5g6h", message: "feat(49-01): add reconcile_phase step to execute-phase.md", files: ["workflows/execute-phase.md"] }
]
```

Also collect all files changed since the phase's first commit:
```bash
PHASE_FIRST_COMMIT=$(git log --oneline --grep="({phase_number}-" --reverse --all | head -1 | cut -d' ' -f1)
git diff --name-only {PHASE_FIRST_COMMIT}^..HEAD 2>/dev/null
```

Note: `{PHASE_FIRST_COMMIT}` may be passed as an input from the orchestrator. If it is, use the provided value. Otherwise, compute it from git log as shown above.

If zero phase commits found: immediately write RECONCILIATION.md with `status: incomplete` and the message "No execution commits found for this phase" in all body sections, then skip remaining steps.
</step>

<step name="match_tasks_to_commits">
Match each planned task to its corresponding commit(s) using a four-tier algorithm. For each planned task, attempt each tier in order until a match is found.

```
Tier 0: workflow-status hash lookup
- If status_map exists and has an entry for this task with status DONE or SKIPPED and a non-empty commit hash (not "---"):
  - Look up that commit hash in the git evidence
  - If found: MATCH --- assign commit to this task with match_method "workflow_status"
  - If not found in git evidence: flag as "status_claimed_done_no_git_evidence" (do NOT mark as matched)
- If status_map shows TODO or IN_PROGRESS: skip Tier 0, fall through to slug matching
- If no status_map exists: skip Tier 0 entirely

Primary: slug matching
- Normalize task name to slug:
  - Take the text AFTER "Task N: " prefix if present
  - Lowercase
  - Replace all non-alphanumeric characters with hyphens
  - Remove leading/trailing hyphens
  - Remove duplicate hyphens
  Example: "Task 1: Create reconcile-phase.md workflow" → "create-reconcile-phase-md-workflow"

- For each commit message:
  - Take the text AFTER the closing parenthesis and colon: "feat(49-01): {description}" → "{description}"
  - Normalize with same rules: lowercase, replace non-alphanumeric with hyphens, collapse duplicates
  - Split both the task slug and commit message slug by hyphens to get word arrays
  - Check if any 3+ consecutive words from the task slug appear consecutively in the commit message slug
  - If yes: MATCH — assign commit to this task

Fallback: file overlap
- If slug match fails for all commits, check file overlap
- For each commit's changed files: check if any file appears in the task's <files> list
- If any overlap found: MATCH — assign commit to that task

Weak match: phase-plan prefix
- If both slug and file overlap fail for all commits
- Check if any commit message contains "({phase_number}-{plan_id_suffix})"
  where plan_id_suffix is the plan number portion (e.g., "01" from "49-01")
- If yes: mark as "likely associated" with the plan (not a specific task)
- If no match via any tier: classify commit as "unplanned"
```

After matching:
- A task may have multiple commits (e.g., initial implementation + deviation fix)
- A commit may match only one task (use first/best match)
- Commits with "likely associated" are noted but not attributed to a specific task
- "Unplanned" commits are collected for the Unplanned Changes section

Build a task status map:
```
{task_name → {status, matched_commits: [{hash, message}], match_method}}
```

Status values per task:
- `matched` — has at least one commit via slug or file overlap
- `plan_prefix_only` — matched via phase-plan prefix only
- `unmatched` — no commit found by any method
- `status_claimed_done_no_git_evidence` --- workflow-status.md says DONE but no corresponding commit found in git
</step>

<step name="derive_ac_status">
Read deviation data from SUMMARY.md files in the phase directory:

```bash
ls "{phase_dir}"/*-SUMMARY.md 2>/dev/null | sort
```

If SUMMARY.md does not exist: skip deviation derivation, note "No SUMMARY.md found — pre-reconciliation execution or failed aggregate" in the report.

For each task with ac_refs, derive AC satisfaction status:
```
if task has a matching commit AND SUMMARY.md shows NO deviation for this task:
  → ac_status = "likely satisfied"

if task has a matching commit AND SUMMARY.md shows a deviation for this task:
  → ac_status = "completed with deviation — verify"

if task has no matching commit:
  → ac_status = "not executed"
```

Extract deviation data from SUMMARY.md by reading the "Deviations from Plan" section. A task has a deviation if its name appears under an auto-fixed issue entry in SUMMARY.md.

Build an ac_status map: `{ac_ref → {description, status}}`

To get AC descriptions: read back from the PLAN.md `<acceptance_criteria>` block. Extract the first 60 characters of each AC-N criterion text.
</step>

<step name="detect_unplanned_changes">
Compare all files changed since phase start (from `git diff --name-only` in collect_git_evidence) against the union of all task `<files>` lists.

Build the declared files set: flatten all `task_files` arrays from all planned tasks into a single set.

For each file in the git diff output:
- If it appears in the declared files set: skip (it's planned)
- If it does NOT appear: classify as an unplanned change

For each unplanned file:
1. Find which commit introduced it (check each commit's file list)
2. Assess the change type:
   - `minor support file` — criteria: test helper files, config tweaks, type-only fixes, .gitignore updates, small utility additions that support declared files
   - `potentially significant` — criteria: new feature files, schema changes, new workflow files, new CLI commands, new binary files

Build unplanned changes list:
```
[{files, commit_hash, commit_message, assessment}]
```
</step>

<step name="determine_status">
Apply precedence rules to determine the overall reconciliation status:

```
Status precedence (highest to lowest):
1. "incomplete"         — if ANY planned task has no matching commit (unmatched status)
2. "deviations_found"   — if ANY task has ac_status "completed with deviation — verify"
3. "unplanned_changes"  — if ANY unplanned files were detected
4. "clean"              — all tasks matched, no deviations, no unplanned changes

Check conditions in order. Return the FIRST condition that applies.
```

Note: a phase can have both deviations and unplanned changes — the higher-precedence status wins for the frontmatter field, but both are reported in the document body.
</step>

<step name="write_reconciliation_md">
Write the RECONCILIATION.md file to `{phase_dir}/{phase_number}-RECONCILIATION.md`.

Use this exact schema:

```markdown
---
phase: {phase-slug}
generated: {ISO-8601-timestamp}
status: {clean | deviations_found | unplanned_changes | incomplete}
---

# Phase {phase_number}: Reconciliation Report

**Generated:** {timestamp in readable format, e.g. "2026-03-19T20:45:43Z"}
**Phase:** {phase_number} — {phase_name}
**Status:** {status value}

## Tasks: Planned vs Completed

| Task | Plan | Status | Commit | AC Refs | AC Status |
|------|------|--------|--------|---------|-----------|
| {task name} | {plan_id} | {completed | completed_with_deviation | not_executed} | {hash or —} | {ac_status} |

**Summary:** {N} of {M} planned tasks completed

## Deviations from Plan

{If no deviations: "None — all tasks executed as planned"}

{If deviations exist, for each deviation found in SUMMARY.md:}
### Deviation {N}: {title from SUMMARY.md}
- **Task:** {task name this deviation belongs to}
- **Type:** {Rule 1 (Bug) | Rule 2 (Missing Critical) | Rule 3 (Blocking) | Rule 4 (Architectural)}
- **Description:** {description from SUMMARY.md}
- **Files affected:** {list of files from deviation entry}
- **Commits:** {hash(es) associated with the deviation fix}

## Unplanned Changes

{If no unplanned changes: "None — all committed files were declared in task <files> lists"}

{If unplanned changes exist, for each:}
### Unplanned Change {N}
- **Files:** {list of files not in any task's <files> list}
- **Commit:** {hash}
- **Message:** {commit message}
- **Assessment:** {minor support file | potentially significant}

## AC Satisfaction Summary

| AC | Description (first 60 chars) | Status |
|----|------------------------------|--------|
| {AC-N} | {first 60 chars of AC criterion text} | {likely satisfied | completed with deviation — verify | not executed} |

## Verifier Handoff

Reconciliation analysis for Phase {phase_number} ({phase_name}) completed.

Overall status: {status value}
Tasks completed: {N} of {M} planned
Deviations found: {count from Deviations section, or 0}
Unplanned changes: {count, or 0}
Items requiring human review: {count of deviations + count of "potentially significant" unplanned changes}

{If status is "clean": "All planned tasks were executed and committed as declared. No deviations or unplanned file changes detected. Git evidence matches plan declarations."}

{If status is "deviations_found": "Executor applied auto-fix rules during execution. {N} deviation(s) recorded. See ## Deviations from Plan for details. AC satisfaction statuses reflect any deviations."}

{If status is "unplanned_changes": "All planned tasks completed. {N} file change(s) were detected outside the declared task <files> lists. See ## Unplanned Changes for assessment."}

{If status is "incomplete": "One or more planned tasks have no corresponding git commit. {N} of {M} tasks completed. Tasks without commits may have been skipped, failed, or not yet executed."}
```

**Edge case: zero phase commits**

If no commits were found in collect_git_evidence, write:

```markdown
---
phase: {phase-slug}
generated: {ISO-8601-timestamp}
status: incomplete
---

# Phase {phase_number}: Reconciliation Report

**Generated:** {timestamp}
**Phase:** {phase_number} — {phase_name}
**Status:** incomplete

## Tasks: Planned vs Completed

No execution commits found for this phase.

| Task | Plan | Status | Commit | AC Refs | AC Status |
|------|------|--------|--------|---------|-----------|
{list all planned tasks with status "not_executed", hash "—", ac_status "not executed"}

**Summary:** 0 of {M} planned tasks completed

## Deviations from Plan

None — no tasks executed.

## Unplanned Changes

None — no commits found.

## AC Satisfaction Summary

| AC | Description (first 60 chars) | Status |
|----|------------------------------|--------|
{all ACs with "not executed" status}

## Verifier Handoff

Reconciliation analysis for Phase {phase_number} ({phase_name}) found NO execution commits.

Overall status: incomplete
Tasks completed: 0 of {M} planned
Items requiring human review: 0 (phase has not been executed)

No execution commits found for this phase. Either the phase has not been executed yet, or commits do not follow the ({phase_number}-) prefix convention.
```
</step>

<step name="report_result">
After writing RECONCILIATION.md, confirm the file was written successfully:

```bash
ls -la "{phase_dir}/{phase_number}-RECONCILIATION.md"
```

Print a completion report:

```
Reconciliation complete: {phase_dir}/{phase_number}-RECONCILIATION.md
Status: {status_value}
Tasks: {N}/{M} completed
```

If status is not "clean", add a one-line summary of the primary concern:
- `incomplete`: "WARNING: {count} task(s) have no matching git commit"
- `deviations_found`: "NOTE: {count} deviation(s) found — see ## Deviations from Plan"
- `unplanned_changes`: "NOTE: {count} unplanned file change(s) — see ## Unplanned Changes"
</step>

</process>
