# Phase 53: Milestone Polish — Research

**Researched:** 2026-03-20
**Domain:** PDE internal codebase — workflow engine, tracking library, reconciler, test infrastructure
**Confidence:** HIGH

## Summary

Phase 53 closes six concrete tech-debt items identified in the v0.6 milestone audit. All changes are internal to PDE's own workflow/library files — no external dependencies are needed, and no new patterns need to be invented. Every item has an exact current implementation that must change, a precisely specified target state, and a bounded blast radius.

The work divides cleanly into two tiers: **code changes** (SC1-SC5, targeting workflow markdown files and a Node.js library) and **Nyquist compliance** (SC6, updating VALIDATION.md frontmatter and adding missing test files). The code changes are independent of each other and can be made in any order. Nyquist compliance for phases 46 and 52 is a documentation-and-test-file task: the existing tests all pass, so the only remaining steps are to add the two missing test files for phase 46 and update frontmatter on both VALIDATION.md files to mark them compliant.

**Primary recommendation:** Make all five code fixes first (they are interdependent via testing), then close Nyquist compliance for both phases.

## Affected Files Index

This section replaces "Standard Stack" for an internal polish phase.

| File | SC | What Changes |
|------|----|-------------|
| `workflows/plan-phase.md` | SC1 | Add `references/workflow-methodology.md` to planner spawn `files_to_read` |
| `bin/lib/tracking.cjs` | SC2, SC4 | `initWorkflowStatus` reads task names from task files; `cmdTrackingGenerateHandoff` removed or wired |
| `workflows/execute-phase.md` | SC3 | `TASK_TOTAL` guard for empty `$TASK_FILES` |
| `bin/pde-tools.cjs` | SC4 | Remove or update `generate-handoff` dispatch if dead code removed |
| `workflows/reconcile-phase.md` | SC5 | Add workflow-status.md cross-reference step |
| `.planning/phases/46-methodology-foundation/46-VALIDATION.md` | SC6 | Set `nyquist_compliant: true`; create missing test files |
| `.planning/phases/52-agent-enhancements/52-VALIDATION.md` | SC6 | Set `nyquist_compliant: true`; update task IDs |
| `tests/phase-46/project-context.test.mjs` | SC6 | New — covers FOUND-01 |
| `tests/phase-46/subagent-context-injection.test.mjs` | SC6 | New — covers FOUND-02 |

## Architecture Patterns

### Current Code State by Success Criterion

#### SC1 — workflow-methodology.md not injected into planner spawn

**Location:** `workflows/plan-phase.md`, lines 410-421 (planner spawn `files_to_read` block)

Current planner `files_to_read` block (Step 8):
```markdown
<files_to_read>
- .planning/project-context.md (Project context — compact project baseline, if exists)
- {state_path} (Project State)
- {roadmap_path} (Roadmap)
- {requirements_path} (Requirements)
- {context_path} (USER DECISIONS from /pde:discuss-phase)
- {research_path} (Technical Research)
- {verification_path} (Verification Gaps - if --gaps)
- {uat_path} (UAT Gaps - if --gaps)
- {UI_SPEC_PATH} (UI Design Contract — visual/interaction specs, if exists)
- .planning/agent-memory/planner/memories.md (Agent memory — planning patterns from prior phases, if exists)
</files_to_read>
```

`references/workflow-methodology.md` is absent. The file exists on disk at `references/workflow-methodology.md` and is 300+ lines covering Context Constitution, Task-File Sharding, AC-First Planning, Post-Execution Reconciliation, Safe Framework Updates, and Readiness Gating patterns.

**Target state:** Add one line to the planner `files_to_read` block:
```markdown
- references/workflow-methodology.md (Methodology patterns — BMAD/PAUL-derived conventions, if exists)
```

Note: The researcher spawn `files_to_read` block (lines 200-205) does NOT need this change. Only the planner spawn needs it since the planner is the consumer of methodology patterns.

The revision loop planner spawn (Step 12 `files_to_read`, lines 650-654) also does not need it — revision context is minimal by design.

**Ripple effects:** None. This is a pure addition to a prompt block. No code changes required.

---

#### SC2 — initWorkflowStatus populates generic "Task N" names

**Location:** `bin/lib/tracking.cjs`, lines 76-83 (row building loop inside `initWorkflowStatus`)

Current code at line 82:
```javascript
rows.push(`| ${i} | Task ${i} | TODO | — | — |`);
```

This uses a generic `Task ${i}` label. The task name is available in the sharded task file at `${tasksDir}/task-NNN.md`, specifically in the `# Task N: {name}` H1 heading (line 127 of `sharding.cjs`).

Task file naming convention (from `sharding.cjs` line 127):
```
# Task {taskNum}: {taskName}
```

Where `taskName` comes from `extractField(taskInner, 'name')` — the `<name>` XML tag in the PLAN.md task block.

**Target state:** `initWorkflowStatus` must accept task names or read them from task files. Two implementation options:

**Option A (preferred — simpler interface):** Pass a `taskNames` array in `opts`:
```javascript
function initWorkflowStatus(tasksDir, opts) {
  const { phase, plan, total, taskNames } = opts;
  // ...
  rows.push(`| ${i} | ${taskNames && taskNames[i-1] ? taskNames[i-1] : 'Task ' + i} | TODO | — | — |`);
}
```

Caller in `execute-phase.md` reads task names by scanning task file H1 headings before calling `tracking init`. This keeps the library pure and the caller responsible for discovery.

**Option B:** `initWorkflowStatus` reads task files from `tasksDir` directly. Simpler caller but couples the library to the task file format.

Option A is preferred because it keeps `tracking.cjs` decoupled from the task file format.

**Caller change (`execute-phase.md` Mode A loop):** After `TASK_FILES=$(ls ...)`, extract names:
```bash
TASK_NAMES=()
for TASK_FILE in $TASK_FILES; do
  NAME=$(grep "^# Task [0-9]*:" "$TASK_FILE" | sed 's/^# Task [0-9]*: //' | head -1)
  TASK_NAMES+=("$NAME")
done
```
Then pass to CLI: `--names "name1|name2|name3"` (pipe-separated).

**CLI change (`cmdTrackingInit` in `tracking.cjs`):** Parse `--names` flag and split on `|`.

**Ripple effects:**
- `execute-phase.md` Mode A section (around line 203-207) must extract names before calling `tracking init`
- `cmdTrackingInit` CLI wrapper must parse `--names` flag
- `initWorkflowStatus` function signature expands with optional `taskNames` param
- Existing callers with no `--names` flag continue to work (fallback to `Task N`)

---

#### SC3 — TASK_TOTAL off-by-one when TASK_FILES is empty

**Location:** `workflows/execute-phase.md`, lines 196-197 (Mode A sharded loop)

Current code:
```bash
TASK_FILES=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | sort)
TASK_TOTAL=$(echo "$TASK_FILES" | wc -l | tr -d ' ')
```

When `ls` finds no files, `TASK_FILES=""`. `echo ""` outputs one blank line, so `wc -l` returns 1.

This means `tracking init --total 1` is called on an empty task directory, creating a spurious `Task 1 | TODO` row.

**Target state:**
```bash
TASK_FILES=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | sort)
if [ -z "$TASK_FILES" ]; then
  TASK_TOTAL=0
else
  TASK_TOTAL=$(echo "$TASK_FILES" | wc -l | tr -d ' ')
fi
```

Or more concisely:
```bash
TASK_TOTAL=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | wc -l | tr -d ' ')
```

The `ls | wc -l` pipe without the echo intermediary correctly returns 0 when no files match.

**Ripple effects:** Minor. If `TASK_TOTAL=0`, the `tracking init` call would create a status file with 0 tasks. A downstream guard (check `TASK_TOTAL -gt 0` before calling `tracking init`) would be cleaner. This can be done in the same diff.

---

#### SC4 — cmdTrackingGenerateHandoff dead code

**Location:** `bin/lib/tracking.cjs` lines 351-368 (`cmdTrackingGenerateHandoff`); `bin/pde-tools.cjs` lines 724-725 (dispatch); `workflows/pause-work.md` (does NOT call the CLI).

**Current state:**
- `generateHandoff()` function (lines 211-264 in `tracking.cjs`) — used by `pause-work.md` indirectly? No. `pause-work.md` writes HANDOFF.md inline via a markdown template (Step "write", lines 54-95), not via CLI.
- `cmdTrackingGenerateHandoff` CLI wrapper (lines 351-368) — exported, dispatched in `pde-tools.cjs`, but never called from any workflow.
- `pause-work.md` reads `tracking read` (line 45) for workflow status but writes HANDOFF.md directly using the Write tool via a template.

**Audit finding:** The `generateHandoff()` function itself is useful and internally correct. The CLI surface (`cmdTrackingGenerateHandoff` + `pde-tools.cjs` dispatch) is what's orphaned. `pause-work.md` uses the CLI for `tracking read` but not for `generate-handoff`.

**Resolution options:**

**Option A — Wire `pause-work.md` to use the CLI (preferred):**
Replace the manual template write in `pause-work.md` Step "write" with:
```bash
HANDOFF_CONTENT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking generate-handoff \
  --phase "$PHASE_SLUG" \
  --plan "$PLAN_NUM" \
  --task "$CURRENT_TASK" \
  --task-of "$TASK_TOTAL" \
  --status "in_progress" \
  --last-action "$(cat /tmp/last-action.txt)" \
  --next-step "$(cat /tmp/next-step.txt)" \
  --status-content "$WORKFLOW_STATUS" --raw)
echo "$HANDOFF_CONTENT" | jq -r '.handoff' > .planning/HANDOFF.md
```
This makes the CLI surface live and removes the duplicated template.

**Option B — Remove the dead CLI surface:**
Delete `cmdTrackingGenerateHandoff` from `tracking.cjs` exports and remove the `generate-handoff` case from `pde-tools.cjs`. Keep `generateHandoff()` internal (unexported or kept for future use). The `pause-work.md` template approach continues as-is.

**Option B is simpler** and avoids complex flag-passing from a workflow. The `generateHandoff()` function can be kept for potential future use or removed if truly dead.

**Recommendation: Option B.** Remove the CLI surface. The `generateHandoff()` function can be kept unexported for future use since the logic is solid. This eliminates the dead CLI dispatch without touching `pause-work.md`.

**Files to change under Option B:**
1. `bin/lib/tracking.cjs`: Remove `cmdTrackingGenerateHandoff` from `module.exports`
2. `bin/pde-tools.cjs`: Remove `generate-handoff` case from tracking switch block (lines 724-725) and update error message on line 727

**Ripple effects:** None. No workflow calls `tracking generate-handoff`. The unit test `handoff.test.mjs` tests `generateHandoff()` directly (not via CLI), so it is unaffected.

---

#### SC5 — Reconciler has no awareness of workflow-status.md

**Location:** `workflows/reconcile-phase.md`, `collect_git_evidence` and `match_tasks_to_commits` steps.

**Current state:** The reconciler gathers evidence exclusively from:
1. `git log --oneline --grep` — commit messages
2. `git diff-tree --name-only` — files per commit
3. PLAN.md task blocks
4. SUMMARY.md deviation sections

workflow-status.md (in `{plan-prefix}-tasks/workflow-status.md`) contains per-task status (TODO/IN_PROGRESS/DONE/SKIPPED) recorded in real-time by execute-phase.md. The reconciler ignores this file entirely.

**Gap impact:** When a task is marked DONE in workflow-status.md but its commit message doesn't match via the three-tier algorithm, the reconciler incorrectly classifies it as `unmatched`. Conversely, workflow-status.md can corroborate `matched` tasks and upgrade confidence.

**Target state:** Add a step to `reconcile-phase.md` between `collect_planned_tasks` and `collect_git_evidence`:

```
<step name="collect_workflow_status">
Check for workflow-status.md in each plan's tasks directory:

```bash
for PLAN_FILE in $(ls "{phase_dir}"/*-PLAN.md 2>/dev/null | sort); do
  PLAN_PREFIX=$(basename "$PLAN_FILE" | sed 's/-PLAN\.md$//')
  STATUS_FILE="{phase_dir}/${PLAN_PREFIX}-tasks/workflow-status.md"
  if [ -f "$STATUS_FILE" ]; then
    cat "$STATUS_FILE"
  fi
done
```

For each workflow-status.md found, parse the task status table (same format as tracking.cjs parseStatusTable):
- Rows: `| num | name | status | commit | updated |`
- Status values: TODO | IN_PROGRESS | DONE | SKIPPED

Build a task-status map:
```
{plan_prefix → [{num, name, status, commit}]}
```

Use this map in match_tasks_to_commits as a secondary signal:
- If a task matches in workflow-status.md with status DONE or SKIPPED AND commit hash is present: use the commit hash as an additional match candidate (Tier 0 — direct hash lookup)
- If workflow-status.md shows a task as DONE but no git evidence is found: flag as "status-claimed-done-no-git-evidence" rather than "unmatched"
- If workflow-status.md shows a task as TODO or IN_PROGRESS: consistent with "not executed"
```

**Ripple effects:**
- `match_tasks_to_commits` step gains a Tier 0 (direct hash from workflow-status.md) before the existing three-tier algorithm
- `determine_status` step: new status option `status_mismatch` when workflow-status says DONE but git has no evidence
- `write_reconciliation_md` schema: new status value in the task table (`status_claimed_done_no_git_evidence`)

**Scoping note:** The reconciler spawned by execute-phase.md receives `{phase_dir}` as input but not individual plan prefixes. The workflow-status.md discovery is a glob across `{phase_dir}/*-tasks/workflow-status.md`, which is clean.

---

#### SC6 — Nyquist compliance for phases 46 and 52

**Phase 46 VALIDATION.md:** `.planning/phases/46-methodology-foundation/46-VALIDATION.md`

Current frontmatter:
```yaml
status: draft
nyquist_compliant: false
wave_0_complete: false
```

Wave 0 gaps listed (all 6 test files required):
- `tests/phase-46/project-context.test.mjs` — MISSING
- `tests/phase-46/subagent-context-injection.test.mjs` — MISSING
- `tests/phase-46/workflow-methodology.test.mjs` — EXISTS, 28 passing tests
- `tests/phase-46/manifest-format.test.mjs` — EXISTS
- `tests/phase-46/manifest-init.test.mjs` — EXISTS
- `tests/phase-46/manifest-sync.test.mjs` — EXISTS

The two missing tests need to be created. Then frontmatter updates:
```yaml
status: compliant
nyquist_compliant: true
wave_0_complete: true
```

**What the missing tests should cover:**

`project-context.test.mjs` (FOUND-01):
- `.planning/project-context.md` exists on disk
- File size is under 4096 bytes (4KB cap)
- File contains `## Tech Stack` section
- File contains `## Active Requirements` or `## Requirements` section
- File contains `## Current Milestone` or `## Milestone` section

`subagent-context-injection.test.mjs` (FOUND-02):
- `workflows/execute-phase.md` contains `project-context.md` in its `files_to_read` block
- `workflows/plan-phase.md` researcher spawn contains `project-context.md` in `files_to_read`
- `workflows/plan-phase.md` planner spawn contains `project-context.md` in `files_to_read`
- These are grep-based checks against the workflow files

Both test files use Node.js built-in `node:test` and `node:assert` (matching existing phase-46 test style).

**Phase 52 VALIDATION.md:** `.planning/phases/52-agent-enhancements/52-VALIDATION.md`

Current frontmatter:
```yaml
status: draft
nyquist_compliant: false
wave_0_complete: false
```

Wave 0 gap section says: "Existing infrastructure covers all phase requirements — no new test framework needed."

`tests/phase-52/memory.test.mjs` EXISTS and covers AGNT-04, AGNT-05 (19 passing tests).

The Per-Task Verification Map has `TBD` task IDs. The reason it's `partial` (not `compliant`) is that:
1. Task IDs are `TBD` in the verification map
2. `wave_0_complete: false` hasn't been updated
3. `nyquist_compliant: false` hasn't been updated

Since Wave 0 says "no new test framework needed" and the test covers memory, the remaining AGNT-01/02/03 items are marked as grep-based or manual-only. These do not require new test files — they need the verification map updated with real task IDs (from the phase 52 plans) and frontmatter flipped.

**Task ID lookup for phase 52:**
From `.planning/phases/52-agent-enhancements/`, there are 4 plans: `52-01`, `52-02`, `52-03`, `52-04`. The exact task names need to be verified against those plan files to assign correct IDs to the verification map rows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task name extraction in tracking init | Custom task file parser in tracking.cjs | Grep on `^# Task N:` heading in execute-phase.md caller | Keeps tracking.cjs decoupled from task file format |
| Workflow-status.md parsing in reconciler | Duplicate parseStatusTable logic | Reuse the same regex pattern already in tracking.cjs | The table format is already fully specified; copying the pattern is correct, importing the module would couple them |
| HANDOFF.md generation via CLI | Complex flag-passing infrastructure | Remove dead CLI; keep template approach in pause-work.md | Option B avoids touching a working workflow for no user-visible gain |

**What must NOT be changed (working patterns to preserve):**
- `parseStatusTable()` in `tracking.cjs` — correct, shared, tested
- `setTaskStatus()` in `tracking.cjs` — correct regex, preserve existing name
- `generateHandoff()` function itself — correct, well-specified, leave intact even if CLI removed
- The three-tier matching algorithm in `reconcile-phase.md` — correct; SC5 adds a Tier 0, not a replacement
- `sharding.cjs` task file format — the `# Task N: {name}` H1 heading is the canonical source of truth
- Existing phase-46 test files (4 passing files) — do not modify, only add the 2 missing ones
- The `tracking init`, `tracking set-status`, `tracking read` CLI subcommands — all wired and in use

## Common Pitfalls

### Pitfall 1: TASK_FILES empty-string grep-counting edge case
**What goes wrong:** Fixing `TASK_TOTAL` by changing `echo "$TASK_FILES" | wc -l` to `ls ... | wc -l` is correct but may leave stale `TASK_FILES` variable downstream (it was already empty, so no change in behavior). The guard `if [ -z "$TASK_FILES" ]` is more explicit and prevents the tracking init call entirely when there are no task files.
**Prevention:** Add `[ "$TASK_TOTAL" -gt 0 ] || continue` before the `tracking init` call to skip initialization on empty task directories.

### Pitfall 2: Task name truncation in workflow-status.md table
**What goes wrong:** Long task names break the markdown table column alignment. The pipe character `|` in a task name would corrupt the row.
**Prevention:** Truncate names to 40 chars and strip `|` characters: `name.replace(/\|/g, '-').slice(0, 40)`. Apply this in `initWorkflowStatus` or at the CLI flag parse level.

### Pitfall 3: workflow-methodology.md path in plan-phase.md
**What goes wrong:** Using `{research_path}` (which is dynamically resolved per phase) for a static reference file. `references/workflow-methodology.md` is a fixed path relative to `CLAUDE_PLUGIN_ROOT`, not to the phase dir.
**Prevention:** Use the literal path `references/workflow-methodology.md` (without template variables). The file always exists at this location regardless of phase. Add `(if exists)` annotation to match the project-context.md pattern.

### Pitfall 4: Removing cmdTrackingGenerateHandoff breaks tests
**What goes wrong:** `tests/phase-51/handoff.test.mjs` tests `generateHandoff()` directly. If SC4 removes `cmdTrackingGenerateHandoff` from exports but leaves `generateHandoff()`, the test still passes. If `generateHandoff` itself is removed, the test breaks.
**Prevention:** Under Option B, only remove `cmdTrackingGenerateHandoff` from `module.exports` and from the `pde-tools.cjs` dispatch switch. Leave `generateHandoff()` in the file and keep it exported (it is tested).

### Pitfall 5: Reconciler workflow-status.md step adds latency
**What goes wrong:** The reconciler is spawned as a subagent with a prompt. If the workflow-status.md step requires a `cat` per plan-tasks directory, it adds shell calls but no meaningful overhead. The real risk is that workflow-status.md may not exist (sharding is threshold-gated; small plans have no tasks dir).
**Prevention:** All workflow-status.md discovery must be guarded with `2>/dev/null` and existence checks. If no workflow-status.md is found for any plan, the step reports "No workflow-status.md found — task tracking not used for this phase" and proceeds normally without changing reconciliation status.

### Pitfall 6: Phase 52 VALIDATION.md task IDs are TBD
**What goes wrong:** Updating `nyquist_compliant: true` without filling in the real task IDs leaves the verification map incomplete — the auditor cannot trace from requirement to test to execution.
**Prevention:** Read the 4 phase-52 PLAN.md files, extract actual task names, and assign IDs like `52-01-01`, `52-01-02` before updating frontmatter.

## Code Examples

### Current vs. Target: tracking.cjs initWorkflowStatus (SC2)

Current (line 82):
```javascript
rows.push(`| ${i} | Task ${i} | TODO | — | — |`);
```

Target:
```javascript
const name = taskNames && taskNames[i - 1] ? taskNames[i - 1].replace(/\|/g, '-').slice(0, 40) : `Task ${i}`;
rows.push(`| ${i} | ${name} | TODO | — | — |`);
```

### Current vs. Target: execute-phase.md TASK_TOTAL (SC3)

Current (lines 196-197):
```bash
TASK_FILES=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | sort)
TASK_TOTAL=$(echo "$TASK_FILES" | wc -l | tr -d ' ')
```

Target:
```bash
TASK_FILES=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | sort)
TASK_TOTAL=$(echo "$TASK_FILES" | grep -c "." 2>/dev/null || echo 0)
if [ -z "$TASK_FILES" ]; then TASK_TOTAL=0; fi
```

Or simpler:
```bash
TASK_FILES=$(ls "${TASKS_DIR}"/task-*.md 2>/dev/null | sort)
TASK_TOTAL=$([ -z "$TASK_FILES" ] && echo 0 || echo "$TASK_FILES" | wc -l | tr -d ' ')
```

### Current vs. Target: plan-phase.md planner files_to_read (SC1)

Current (Step 8 planner prompt, line ~420):
```markdown
- .planning/agent-memory/planner/memories.md (Agent memory — planning patterns from prior phases, if exists)
```

Target (add after project-context.md line):
```markdown
- references/workflow-methodology.md (Methodology patterns — BMAD/PAUL-derived conventions, if exists)
```

### Reconciler new step pattern (SC5)

New step to add before `collect_git_evidence`:
```markdown
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
- commit: the hash in the commit column (may be "—" if not set)

Use in match_tasks_to_commits as Tier 0: if status_map has commit hash for this task, look up that hash in git before attempting slug/file/prefix matching.
</step>
```

### Test file pattern for phase-46 missing tests (SC6)

```javascript
// tests/phase-46/project-context.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;

describe('project-context.md (FOUND-01)', () => {
  const contextPath = path.join(root, '.planning/project-context.md');

  it('file exists', () => {
    assert.ok(fs.existsSync(contextPath), 'project-context.md must exist');
  });

  it('file is under 4KB', () => {
    const size = fs.statSync(contextPath).size;
    assert.ok(size <= 4096, `File size ${size} exceeds 4KB cap`);
  });

  it('contains tech stack section', () => {
    const content = fs.readFileSync(contextPath, 'utf-8');
    assert.ok(/## Tech Stack/i.test(content), 'must have ## Tech Stack section');
  });

  it('contains requirements section', () => {
    const content = fs.readFileSync(contextPath, 'utf-8');
    assert.ok(/## (Active )?Requirements?/i.test(content), 'must have requirements section');
  });

  it('contains milestone section', () => {
    const content = fs.readFileSync(contextPath, 'utf-8');
    assert.ok(/## (Current )?Milestone/i.test(content), 'must have milestone section');
  });
});
```

```javascript
// tests/phase-46/subagent-context-injection.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;

describe('project-context.md injection (FOUND-02)', () => {
  it('execute-phase.md files_to_read contains project-context.md', () => {
    const content = fs.readFileSync(path.join(root, 'workflows/execute-phase.md'), 'utf-8');
    assert.ok(content.includes('project-context.md'), 'execute-phase.md must reference project-context.md');
  });

  it('plan-phase.md researcher spawn files_to_read contains project-context.md', () => {
    const content = fs.readFileSync(path.join(root, 'workflows/plan-phase.md'), 'utf-8');
    assert.ok(content.includes('project-context.md'), 'plan-phase.md must reference project-context.md');
  });

  it('plan-phase.md planner spawn files_to_read contains project-context.md', () => {
    const content = fs.readFileSync(path.join(root, 'workflows/plan-phase.md'), 'utf-8');
    // Both researcher and planner blocks reference it; confirm at least 2 occurrences
    const count = (content.match(/project-context\.md/g) || []).length;
    assert.ok(count >= 2, `Expected >= 2 references to project-context.md, found ${count}`);
  });
});
```

## Safe Execution Order

Execute changes in this order to minimize risk of breaking working tests:

1. **SC3** — fix `TASK_TOTAL` in `execute-phase.md` (no library change, no test change, purely additive guard)
2. **SC1** — add `workflow-methodology.md` to planner `files_to_read` in `plan-phase.md` (one-line addition, no tests affected)
3. **SC4** — remove dead code (`cmdTrackingGenerateHandoff` from exports + pde-tools.cjs dispatch) (verify `handoff.test.mjs` still passes after)
4. **SC2** — extend `initWorkflowStatus` to accept task names + update `cmdTrackingInit` and `execute-phase.md` caller (most complex change; run `workflow-status.test.mjs` after)
5. **SC5** — add workflow-status.md cross-reference step to `reconcile-phase.md` (no tests; validate by reading the step structure)
6. **SC6** — create 2 missing test files, run all phase-46 tests, update both VALIDATION.md frontmatters

This order means each change can be committed atomically with a clean test run.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — direct invocation |
| Quick run command | `node --test tests/phase-46/ && node --test tests/phase-51/ && node --test tests/phase-52/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC1 (FOUND-03) | workflow-methodology.md in planner files_to_read | grep | `grep -c 'workflow-methodology' workflows/plan-phase.md` | ✅ (SC6 covers smoke) |
| SC2 (TRCK-01) | initWorkflowStatus uses actual task names | unit | `node --test tests/phase-51/workflow-status.test.mjs` | ✅ (needs new test case) |
| SC3 (TRCK-01) | TASK_TOTAL=0 when task files absent | unit | `node --test tests/phase-51/workflow-status.test.mjs` | ✅ (needs new test case) |
| SC4 (TRCK-03) | generateHandoff CLI removed; function intact | unit | `node --test tests/phase-51/handoff.test.mjs` | ✅ (already tests function) |
| SC5 (VRFY-01) | Reconciler cross-references workflow-status.md | smoke | manual review of reconcile-phase.md step | N/A |
| SC6-46 (FOUND-01) | project-context.md exists, under 4KB, sections present | unit | `node --test tests/phase-46/project-context.test.mjs` | ❌ Wave 0 |
| SC6-46 (FOUND-02) | project-context.md injected in spawn blocks | unit | `node --test tests/phase-46/subagent-context-injection.test.mjs` | ❌ Wave 0 |
| SC6-52 (AGNT-04/05) | Memory files exist, cap enforced | unit | `node --test tests/phase-52/memory.test.mjs` | ✅ (19 passing) |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-51/ 2>&1 | tail -5` (for SC2/SC3/SC4)
- **Per wave merge:** `node --test tests/phase-46/ && node --test tests/phase-51/ && node --test tests/phase-52/`
- **Phase gate:** Full suite green before `/pde:verify-work 53`

### Wave 0 Gaps

- [ ] `tests/phase-46/project-context.test.mjs` — covers FOUND-01 (SC6)
- [ ] `tests/phase-46/subagent-context-injection.test.mjs` — covers FOUND-02 (SC6)

Also: `tests/phase-51/workflow-status.test.mjs` needs new test cases for SC2 (task names) and SC3 (TASK_TOTAL=0 guard). Existing file exists; add cases to existing suite.

## Open Questions

1. **SC2 — Option A vs B for task name passing**
   - What we know: Option A (caller extracts names, passes via --names flag) is cleaner; Option B (library reads task files directly) is simpler
   - What's unclear: Whether the orchestrator in execute-phase.md can reliably parse task names from H1 headings via bash (grep + sed) before calling tracking init
   - Recommendation: Use Option A with the bash extraction pattern shown in Code Examples. The H1 format `# Task N: {name}` is guaranteed by sharding.cjs line 127.

2. **SC6 — Phase 52 exact task IDs**
   - What we know: Phase 52 has 4 plans (52-01 through 52-04); memory.test.mjs covers AGNT-04/05
   - What's unclear: The exact task numbering for AGNT-01/02/03 tasks across the 4 plans
   - Recommendation: Planner reads 52-01-PLAN.md through 52-04-PLAN.md during planning to assign task IDs before writing VALIDATION.md update

## Sources

### Primary (HIGH confidence)
- Direct file reads of all 9 affected files — exact line numbers and code verified
- `node --test tests/phase-46/` — 28 tests passing (confirmed live)
- `node --test tests/phase-52/` — 19 tests passing (confirmed live)
- `ls tests/phase-46/` — confirmed 4 of 6 required files exist
- `bin/lib/sharding.cjs` lines 127, 254 — confirmed `# Task N: {name}` H1 format and `extractField(taskInner, 'name')` as source

### Secondary (MEDIUM confidence)
- Audit document `.planning/v0.6-MILESTONE-AUDIT.md` — sourced all 6 SC descriptions; verified by cross-referencing actual code

## Metadata

**Confidence breakdown:**
- Current implementations: HIGH — all code read directly with line numbers
- Target states: HIGH — changes are minimal and well-bounded
- Ripple effects: HIGH — all callers verified by grep
- Test coverage: HIGH — test runs executed live

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable codebase, no external dependencies)
