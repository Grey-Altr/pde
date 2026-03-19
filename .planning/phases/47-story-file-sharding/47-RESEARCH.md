# Phase 47: Story-File Sharding — Research

**Researched:** 2026-03-19
**Domain:** PDE planner and executor internals — plan document decomposition, task file generation, context reduction
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-01 | Planner emits tasks/ directory alongside PLAN.md with one self-contained task-NNN.md file per task, each including AC references, file paths, and relevant schema snippets | Planner agent spawn site in plan-phase.md; PLAN.md XML task structure; task field inventory; 5-task threshold logic |
| PLAN-02 | Executor loads only the current task file (not full PLAN.md), reducing context consumption by ~90% for phases with 5+ tasks | Execute-phase.md executor spawn prompt; files_to_read injection pattern; conditional task file loading; PLAN.md size measurements |
</phase_requirements>

---

## Summary

Phase 47 modifies two points in the PDE workflow: the planner (which generates PLAN.md files) adds a post-generation step that shards large plans into per-plan task directories, and the executor (which receives a spawn prompt from execute-phase.md) switches from loading the full PLAN.md to loading only the relevant task file when a tasks directory exists.

The implementation is a pure augmentation: PLAN.md continues to exist unchanged as the source of truth. The tasks directory is a derivative artifact produced by the planner from the existing PLAN.md content. The executor uses a conditional: if `{plan-prefix}-tasks/task-NNN.md` exists for the current task, load it instead of the full PLAN.md. Plans with fewer than 5 tasks skip sharding entirely — no tasks directory is created and the executor behaves exactly as today.

The context reduction claim (~90%) is grounded in real numbers. Phase 46 plans average 250-400 lines. A self-contained task file for a single task is approximately 80-120 lines. At 5 tasks, the full PLAN.md is approximately 500-700 lines; each task file at ~100 lines represents a 75-85% reduction. At 10+ tasks, a single task file at ~100 lines against a 1,000+ line plan achieves 90%+ reduction.

**Primary recommendation:** Add a post-generation sharding step to plan-phase.md (after planner returns) and a conditional task-file loader to the execute-phase.md executor spawn prompt. All changes are additive — no existing behavior changes for plans under 5 tasks.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs (built-in) | Node 18+ | Read PLAN.md, write task files, check directory existence | Already used by pde-tools.cjs for all file operations |
| Node.js path (built-in) | Node 18+ | Resolve tasks directory path relative to phase dir | Already used throughout pde-tools.cjs |
| frontmatter.cjs (PDE) | existing | Extract YAML frontmatter from PLAN.md | Already exists at bin/lib/frontmatter.cjs, used by phase.cjs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pde-tools.cjs CLI | existing | Orchestrator calls for shard generation | Used in plan-phase.md for init, commit, config-get |
| extractFrontmatter() | existing (phase.cjs) | Parse PLAN.md frontmatter for must_haves, files_modified | Already imported in phase.cjs cmdPhasePlanIndex |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pde-tools shard subcommand | Planner agent writes task files directly | Agent-written files are slower and non-deterministic; pde-tools ensures consistent format and is testable |
| Modifying pde-planner agent system prompt | Modifying plan-phase.md spawn logic | System prompt changes are fragile; spawn logic changes are surgical and scoped |
| XML parsing library | Regex on PLAN.md content | PLAN.md task structure is consistent enough for regex; no npm dependency needed |

**Installation:** No new dependencies. All implementation uses existing Node.js built-ins and PDE's existing pde-tools.cjs infrastructure.

---

## Architecture Patterns

### Recommended Project Structure

The sharding feature adds two new file types to the existing structure:

```
.planning/phases/47-story-file-sharding/
├── 47-01-PLAN.md             # Unchanged — still the source of truth
├── 47-01-SUMMARY.md          # Unchanged
├── 47-01-tasks/              # NEW — only created if plan has 5+ tasks
│   ├── task-001.md           # One file per task
│   ├── task-002.md
│   └── task-003.md
├── 47-02-PLAN.md
└── 47-02-tasks/              # NEW — per-plan naming avoids collisions
    ├── task-001.md
    └── task-002.md
```

Directory naming convention: `{plan-prefix}-tasks/` alongside each PLAN.md. This co-locates tasks with their plan and matches the existing `{phase}-{plan}-PLAN.md` naming convention. Using a plan-scoped directory (not a shared `tasks/`) is necessary because phases regularly have 2-4 plans and task number sequences would collide.

### Pattern 1: Post-Generation Sharding Step in plan-phase.md

**What:** After the planner agent writes PLAN.md and returns "PLANNING COMPLETE", plan-phase.md calls `pde-tools.cjs shard-plan` for each generated PLAN.md. The command counts tasks, and if count >= 5, creates the tasks directory and writes individual task files.

**Where in plan-phase.md:** Step 9 (Handle Planner Return) — immediately after receiving "PLANNING COMPLETE" and before spawning pde-plan-checker (Step 10). This ensures task files exist before the checker runs.

**Implementation flow:**

```
pde-planner returns PLANNING COMPLETE
  plan-phase.md: for each new PLAN.md:
    node bin/pde-tools.cjs shard-plan {plan_path}
      reads task count
      if count >= 5: writes task files, returns { sharded: true, task_count: N, ... }
      if count < 5: returns { sharded: false, task_count: N, reason: "below threshold" }
  proceed to pde-plan-checker
```

The sharding step also runs inside the revision loop (Step 12) after each revision — task files must stay in sync with the current version of PLAN.md.

### Pattern 2: Conditional Task File Loading in execute-phase.md

**What:** The executor spawn prompt in execute-phase.md checks whether a `{plan-prefix}-tasks/` directory exists. If it does, the orchestrator resolves the path to the current task file and passes that to the executor instead of the full PLAN.md. The executor agent receives the pre-resolved path and loads it unconditionally — it does not need to know about sharding.

**Where:** In the `execute_waves` step of execute-phase.md, before spawning each executor. The orchestrator loop iterates through task files (N spawns per plan) when a tasks directory exists, or spawns once per plan (current behavior) when it does not.

**Current executor spawn (from execute-phase.md, confirmed):**

```
<files_to_read>
- .planning/project-context.md (Project context, if exists)
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State)
...
</files_to_read>
```

**Modified executor spawn (Phase 47 output):**

```
<files_to_read>
- .planning/project-context.md (Project context, if exists)
- {task_file_path} (Task {task_num} of {task_total} — self-contained task instructions)
- .planning/STATE.md (State)
...
</files_to_read>
```

When no tasks directory exists, `{task_file_path}` falls back to `{phase_dir}/{plan_file}` — identical to current behavior.

### Pattern 3: Task File Schema

Each task-NNN.md file must be self-contained: an executor reading only this file should be able to complete the task correctly without reading PLAN.md.

**Mandatory fields:**
1. Task number and name (from `<name>` tag)
2. Files to be modified (from `<files>` tag)
3. Read-first prerequisites (from `<read_first>` tag) — verbatim
4. Action (from `<action>` tag) — verbatim, ALL concrete values preserved
5. Verification commands (from `<verify>` tag) — verbatim
6. Acceptance criteria (from `<acceptance_criteria>` tag) — verbatim
7. Done condition (from `<done>` tag)
8. Task position in plan (e.g., "Task 2 of 5") — so executor knows context
9. Plan objective (short form) — executor needs to understand the overall goal
10. Relevant must_haves from plan frontmatter — subset relevant to files this task modifies

**Fields to NOT include in task files:**
- Full `<context>` block (heavy @-file references — task files reference individual files via read_first)
- Other tasks (executor should not see adjacent tasks to avoid context contamination)
- Full plan frontmatter (wave, depends_on, requirements — plan-level metadata)

**Task file format:**

```markdown
---
phase: {phase-slug}
plan: {plan-number}
task: {task-number}
task_of: {total-tasks}
---

# Task {N}: {task-name}

**Phase:** {phase_number} — {phase_name}
**Plan:** {plan_number} — {plan_objective_one_line}
**Task:** {N} of {total_tasks}
**Files this task modifies:** {comma-separated list from <files> tag}

## Plan Objective (Context)

{2-3 sentence plan objective — why this task exists}

## Task Action

{verbatim content of <action> tag — ALL concrete values preserved}

## Read First

Before making any changes, read these files:
{verbatim content of <read_first> tag}

## Acceptance Criteria

{verbatim content of <acceptance_criteria> tag}

## Verification

{verbatim content of <verify> tag}

## Done Condition

{verbatim content of <done> tag}

## Plan Must-Haves (Relevant to This Task)

{subset of must_haves.truths and must_haves.artifacts
 that relate to files this task modifies}
```

### Pattern 4: pde-tools shard-plan Subcommand

**What:** A new subcommand in pde-tools.cjs (the PDE fork of gsd-tools.cjs) that reads a PLAN.md, extracts all `<task>` blocks, and writes individual task files. This keeps the orchestrator lean and makes the sharding logic testable.

**Command signature:**

```bash
node bin/pde-tools.cjs shard-plan {plan_path} [--threshold N]
# Default threshold: 5
# Successful sharding:
#   { "sharded": true, "task_count": 7, "tasks_dir": "...", "files": ["task-001.md", ...] }
# Below threshold:
#   { "sharded": false, "task_count": 3, "reason": "below threshold" }
# TDD exemption:
#   { "sharded": false, "task_count": 6, "reason": "tdd plan" }
```

**Implementation location:** New file `bin/lib/sharding.cjs` exporting `shardPlan()`. Dispatch registered in `bin/pde-tools.cjs` as `case 'shard-plan':` following the `case 'manifest':` pattern from Phase 46.

**Core algorithm:**

```
1. Read plan file content
2. Count <task elements using /\<task[\s>]/gi (same regex as phase.cjs:251)
3. Check for tdd="true" attribute on any task — if found, return { sharded: false, reason: "tdd plan" }
4. If count < threshold, return { sharded: false, reason: "below threshold" }
5. Extract plan objective from <objective>...</objective>
6. Extract frontmatter (phase, plan, must_haves, files_modified)
7. Extract each <task>...</task> block
8. For each task block:
   a. Extract: name, files, read_first, action, verify, acceptance_criteria, done
   b. Build task file content using the schema above
   c. Write to {plan_dir}/{plan_prefix}-tasks/task-{NNN}.md
9. Return { sharded: true, task_count: N, tasks_dir: "...", files: [...] }
```

### Anti-Patterns to Avoid

- **Having the planner agent write task files directly:** The planner's job is to produce a complete, high-quality PLAN.md. Adding "now write N task files" to its prompt increases failure surface and makes output non-deterministic. The pde-tools approach is deterministic and testable.
- **Storing task files in a shared `tasks/` directory (not plan-scoped):** Phases with 2+ plans would have task number collisions (two plan-001 files both writing `task-001.md`). The `{plan-prefix}-tasks/` naming is mandatory.
- **Omitting the `<action>` content from task files:** The entire purpose of task files is that the executor reads ONLY the task file. If the action is absent, the executor must fall back to PLAN.md. The verbatim action copy is not duplication — it is the feature.
- **Making task files the source of truth:** PLAN.md is and remains canonical. If the planner revision loop produces a new PLAN.md, task files must be regenerated. shard-plan overwrites any existing task files on each call, making it idempotent.
- **Letting the orchestrator read task file contents:** The execute-phase.md orchestrator must NOT read task files to decide which to pass. It resolves the path from the filesystem (list and sort), passes the path to the executor, and moves on. Orchestrator context stays at 10-15%.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML block extraction from PLAN.md | Custom recursive XML parser | Regex on `<task` tag (same proven pattern at phase.cjs:251) | PLAN.md uses XML-like markup consistently; a tested regex suffices |
| Task file writing | fs.writeFileSync scattered across orchestrator | Single `shard-plan` subcommand in pde-tools.cjs | Centralizes logic, enables unit testing, keeps plan-phase.md lean |
| Task count detection | Line counting or "Task N" heading search | `/\<task[\s>]/gi` (already in cmdPhasePlanIndex, phase.cjs:251) | Already proven in the codebase; counts both `<task>` and `<task type="auto">` |
| Conditional loading decision | Agent-side if/else logic | Pre-resolved path in execute-phase.md orchestrator | The orchestrator has filesystem access; pass the answer to the agent, not the question |
| Frontmatter extraction | Manual string parsing | `extractFrontmatter()` from frontmatter.cjs | Already exists, handles edge cases, already imported in phase.cjs |
| TDD plan detection | Ad-hoc parsing | Check for `tdd="true"` attribute in any `<task` tag | TDD tasks require sequential RED-GREEN-REFACTOR and cannot be split |

**Key insight:** The sharding problem is a document transformation problem, not an AI reasoning problem. Deterministic Node.js code in pde-tools.cjs is faster, cheaper, and more reliable than having a planning agent write N task files one at a time.

---

## Common Pitfalls

### Pitfall 1: Task files become stale after planner revision

**What goes wrong:** plan-phase.md has a revision loop (max 3 iterations). If shard-plan only runs after the first PLANNING COMPLETE, task files reflect the pre-revision plan content.

**Why it happens:** The revision loop in plan-phase.md Step 12 re-spawns the planner and receives another PLANNING COMPLETE. If the sharding step only fires in Step 9 (first pass), revision output is never sharded.

**How to avoid:** Run shard-plan after every PLANNING COMPLETE — both in Step 9 (initial) and in Step 12 (each revision iteration). Since shard-plan overwrites existing task files, idempotency is free.

**Warning signs:** Task file count does not match `<task>` count in the final PLAN.md; task file content diverges from PLAN.md action blocks.

### Pitfall 2: SUMMARY.md creation breaks with per-task spawning

**What goes wrong:** execute-plan.md instructs the executor to create SUMMARY.md after all tasks complete. With per-task spawning (N executor agents per plan), no single executor has completed all tasks — no executor can write a complete SUMMARY.md.

**Why it happens:** The SUMMARY.md step in execute-plan.md was written for the one-agent-per-plan model.

**How to avoid:** When executing a sharded plan, the execute-phase.md orchestrator creates SUMMARY.md after the entire task-file loop completes (all N task files executed). Individual task executors commit code only and do NOT create SUMMARY.md. Task executors should include in their prompt: "Do NOT create SUMMARY.md — the orchestrator handles aggregation."

**Warning signs:** Multiple partial SUMMARY.md files; SUMMARY.md missing task details for tasks 2-N.

**Implementation note:** The `task_of` field in task file frontmatter provides a signal: when the orchestrator processes the last task file (`task == task_of`), it aggregates results into SUMMARY.md. Alternatively, the orchestrator can create SUMMARY.md unconditionally after the loop — simpler and safer.

### Pitfall 3: Executor metadata is missing from task files

**What goes wrong:** The executor uses PLAN.md for more than task instructions. It also reads `must_haves` (for self-check verification), `phase`/`plan` identifiers (for commit message format `feat({phase}-{plan}): ...`), and `requirements` (for REQUIREMENTS.md marking).

**Why it happens:** A naive implementation copies only the `<task>` XML block into the task file, omitting this metadata.

**How to avoid:** Task file frontmatter MUST include `phase`, `plan`, `task`, `task_of`. Task file body MUST include plan objective and task-relevant must_haves. The shard-plan command must extract these from the source PLAN.md and inject them.

**Warning signs:** Executor commit messages missing the `({phase}-{plan}):` prefix; REQUIREMENTS.md not updated after task completion; executor self-check failing due to missing must_haves.

### Pitfall 4: TDD plans must not be sharded

**What goes wrong:** TDD plans use a RED-GREEN-REFACTOR sequence where each step depends on the previous step's test output. If a TDD plan is sharded into individual task files, the executor for task 2 (GREEN) does not have the context from task 1 (RED) — specifically, which tests are failing and what the failure messages are.

**Why it happens:** The 5-task threshold check does not account for task type.

**How to avoid:** shard-plan checks for `tdd="true"` attribute in any `<task` tag. If found, it returns `{ sharded: false, reason: "tdd plan" }` regardless of task count. The plan is executed with the current single-agent pattern via execute-plan.md.

**Warning signs:** TDD plan sharded into task files; executor for GREEN task cannot find failing tests; RED test does not exist when GREEN executor runs.

### Pitfall 5: Plans with fewer than 5 tasks must not be affected

**What goes wrong:** The conditional in execute-phase.md accidentally passes a non-existent task file path to the executor when no tasks directory was created (small plans).

**Why it happens:** The orchestrator path resolution logic has a bug where `{plan-prefix}-tasks/` resolves to a directory that was never created.

**How to avoid:** The executor conditional is: check if directory `{plan-prefix}-tasks/` exists AND check if the specific `task-NNN.md` file exists. If either check fails, fall back to the full PLAN.md path. The fall-through must be hardened at both the directory check and file check levels.

```bash
TASKS_DIR="${PHASE_DIR}/${PLAN_PREFIX}-tasks"
TASK_FILE="${TASKS_DIR}/task-$(printf '%03d' ${TASK_NUM}).md"
if [ -d "$TASKS_DIR" ] && [ -f "$TASK_FILE" ]; then
  LOAD_TARGET="$TASK_FILE"
else
  LOAD_TARGET="${PHASE_DIR}/${PLAN_FILE}"
fi
```

**Warning signs:** Executor fails with "file not found" for a task file on a 2-task plan; executor for a small plan receives empty task context.

### Pitfall 6: Orchestrator context grows if it reads task files

**What goes wrong:** If execute-phase.md reads all task files to validate them before spawning, orchestrator context grows proportionally to task count — defeating the context reduction goal.

**Why it happens:** The orchestrator might try to validate task file content or summarize what the executor will do.

**How to avoid:** The orchestrator resolves the path only (via `ls {plan-prefix}-tasks/ | sort`), passes the path, and does NOT read the file content. Context stays at 10-15% regardless of task count.

---

## Code Examples

Verified patterns from the existing PDE codebase:

### Task count detection (from phase.cjs:251 — already proven)

```javascript
// Source: bin/lib/phase.cjs lines 251-253
const xmlTasks = content.match(/<task[\s>]/gi) || [];
const mdTasks = content.match(/##\s*Task\s*\d+/gi) || [];
const taskCount = xmlTasks.length || mdTasks.length;
```

### Frontmatter extraction (from frontmatter.cjs — already in use)

```javascript
// Source: bin/lib/frontmatter.cjs (used throughout phase.cjs)
const { extractFrontmatter } = require('./frontmatter.cjs');
const fm = extractFrontmatter(planContent);
// fm.phase, fm.plan, fm.wave, fm.requirements, fm.files_modified, fm.must_haves
```

### Objective extraction (follows extractObjective pattern in phase.cjs)

```javascript
// Source: bin/lib/phase.cjs — extractObjective function
function extractObjective(content) {
  const match = content.match(/<objective>([\s\S]*?)<\/objective>/i);
  return match ? match[1].trim() : null;
}
```

### Task XML block extraction (new function for sharding.cjs)

```javascript
// Extract all <task>...</task> blocks from PLAN.md content
// Note: PLAN.md uses nested XML-like tags spanning multiple lines
function extractTaskBlocks(content) {
  const blocks = [];
  const taskPattern = /<task[^>]*>([\s\S]*?)<\/task>/gi;
  let match;
  while ((match = taskPattern.exec(content)) !== null) {
    blocks.push({
      fullMatch: match[0],
      inner: match[1],
      index: match.index,
    });
  }
  return blocks;
}
```

### Individual field extraction from a task block (new helper for sharding.cjs)

```javascript
function extractField(taskInner, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = taskInner.match(pattern);
  return match ? match[1].trim() : '';
}

// Usage:
const name = extractField(task.inner, 'name');
const action = extractField(task.inner, 'action');
const readFirst = extractField(task.inner, 'read_first');
const acceptanceCriteria = extractField(task.inner, 'acceptance_criteria');
const done = extractField(task.inner, 'done');
const verify = extractField(task.inner, 'verify');
const files = extractField(task.inner, 'files');
```

### TDD exemption check

```javascript
function hasTddTasks(content) {
  return /\<task[^>]*tdd\s*=\s*["']true["'][^>]*>/i.test(content);
}
```

### shard-plan command dispatch (follows manifest case from Phase 46)

```javascript
// Source pattern: bin/pde-tools.cjs — case 'manifest' from Phase 46-02
case 'shard-plan': {
  const sharding = require('./lib/sharding.cjs');
  const planPath = path.resolve(cwd, args[1]);
  const thresholdIdx = args.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 5;
  const result = sharding.shardPlan(planPath, { threshold });
  output(result, raw);
  break;
}
```

### Conditional task file path resolution in execute-phase.md orchestrator

```bash
# Before spawning executor for each task, resolve the load target
# PLAN_PREFIX is derived from plan filename: 47-01-PLAN.md -> 47-01
TASKS_DIR="${PHASE_DIR}/${PLAN_PREFIX}-tasks"
TASK_PAD=$(printf '%03d' "${TASK_NUM}")
TASK_FILE="${TASKS_DIR}/task-${TASK_PAD}.md"

if [ -d "${TASKS_DIR}" ] && [ -f "${TASK_FILE}" ]; then
  LOAD_TARGET="${TASK_FILE}"
  echo "Task file mode: ${TASK_FILE}"
else
  LOAD_TARGET="${PHASE_DIR}/${PLAN_FILE}"
  echo "Full plan mode: ${PLAN_FILE}"
fi
```

### Executor spawn prompt for sharded task (modified from execute-phase.md)

```
Task(
  subagent_type="pde-executor",
  model="{executor_model}",
  prompt="
    <objective>
    Execute task {task_num} of plan {plan_number}, phase {phase_number}.
    Commit this task atomically. Do NOT create SUMMARY.md.
    </objective>

    <execution_context>
    @${CLAUDE_PLUGIN_ROOT}/workflows/execute-plan.md
    </execution_context>

    <files_to_read>
    - .planning/project-context.md (Project context, if exists)
    - {task_file_path} (Task {task_num} of {task_total} — self-contained)
    - .planning/STATE.md (State)
    - .planning/config.json (Config, if exists)
    - ./CLAUDE.md (Project instructions, if exists)
    </files_to_read>

    <success_criteria>
    - [ ] Task {task_num} implementation complete
    - [ ] Task {task_num} committed atomically
    - [ ] All acceptance criteria from task file verified
    </success_criteria>
  "
)
```

---

## Current Architecture: What the Planner Produces

### PLAN.md Structure (fully documented from Phase 46 real plans)

A PLAN.md file has this structure:

```
---
phase: {phase-slug}
plan: {plan-number}
type: execute
wave: {N}
depends_on: [{plan-ids}]
files_modified:
  - {relative/path/to/file}
autonomous: true
requirements: [{REQ-IDS}]
must_haves:
  truths:
    - "{verifiable truth string}"
  artifacts:
    - path: "{file path}"
      provides: "{description}"
      contains: "{grep-verifiable string}"
  key_links:
    - from: "{source file}"
      to: "{target file}"
      via: "{mechanism}"
      pattern: "{grep pattern}"
---

<objective>
{Multi-sentence objective}
</objective>

<execution_context>
@{executor_workflow_path}
@{summary_template_path}
</execution_context>

<context>
@{project_file_path}
@{roadmap_path}
</context>

<tasks>

<task type="auto" [tdd="true"]>
  <name>Task N: {task name}</name>
  <files>{comma-separated files this task modifies}</files>
  <read_first>
    - {file} ({why to read it})
  </read_first>
  <behavior>     <!-- TDD tasks only -->
    - {testable behavior}
  </behavior>
  <action>
    {Verbose concrete action with all values}
  </action>
  <verify>
    <automated>{bash verify command}</automated>
  </verify>
  <acceptance_criteria>
    - {grep-verifiable criterion}
  </acceptance_criteria>
  <done>{one-line done condition}</done>
</task>

</tasks>

<verification>
{Phase-level verification commands}
</verification>

<success_criteria>
{Human-readable success conditions}
</success_criteria>

<output>
After completion, create {SUMMARY.md path}
</output>
```

### Task Count Profile (from Phase 46 actual plans)

| Plan | Tasks | Lines | Approximate Size |
|------|-------|-------|------------------|
| 46-01 | 2 | ~270 lines | ~7KB |
| 46-02 | 2 (TDD) | ~420 lines | ~11KB |
| 46-03 | 1 | ~130 lines | ~3KB |

A hypothetical 5-task plan at similar density: ~600-900 lines (~16-24KB).
A single task file for one task from that plan: ~80-130 lines (~2-3KB).
Context reduction for a 5-task plan: 75-85%.
Context reduction for a 10-task plan: ~90%.

---

## Current Architecture: How the Executor Loads Plans

### Executor Spawn (from workflows/execute-phase.md, lines 118-159, confirmed)

The execute-phase.md orchestrator spawns one `pde-executor` agent per plan:

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
    ...
    </execution_context>

    <files_to_read>
    - .planning/project-context.md (Project context, if exists)
    - {phase_dir}/{plan_file} (Plan)           <-- THIS LINE changes for sharded plans
    - .planning/STATE.md (State)
    - .planning/config.json (Config, if exists)
    - ./CLAUDE.md (Project instructions, if exists)
    </files_to_read>
  "
)
```

The executor reads execute-plan.md and follows its task-by-task execution protocol. It reads the FULL PLAN.md via the `{phase_dir}/{plan_file}` entry. Phase 47 changes this single line to a conditional that resolves to either a task file path or the full PLAN.md path.

### Plan Tracking (current state, unchanged by Phase 47)

The `phase-plan-index` command groups plans by wave. The `incomplete_plans` field in `init execute-phase` identifies which plans need execution. Completion is detected by SUMMARY.md existence. There is currently NO per-task tracking — the unit of completion is the plan, not the task. Phase 51 (Workflow Tracking) adds per-task status tracking; Phase 47 does not require it.

---

## Scope: What Phase 47 Changes

### Files to Modify

1. **`bin/pde-tools.cjs`** — add `case 'shard-plan':` dispatch (5-10 lines)
2. **`bin/lib/sharding.cjs`** (NEW) — `shardPlan()` function: reads PLAN.md, extracts tasks, writes task files
3. **`workflows/plan-phase.md`** — add post-planner sharding step after each PLANNING COMPLETE (in Step 9 and Step 12)
4. **`workflows/execute-phase.md`** — modify executor spawn loop: when tasks directory exists, loop through task files with N spawns; add SUMMARY.md aggregation after task loop

### Files NOT to Modify

- **`workflows/execute-plan.md`** — executor's internal workflow; task file loading is handled by passing the correct path in the spawn prompt, not by modifying execute-plan.md. Plans without task files (< 5 tasks) continue using execute-plan.md unchanged.
- **`bin/lib/phase.cjs`** — phase-plan-index tracks plans, not tasks; task tracking is Phase 51
- **`bin/lib/init.cjs`** — execute-phase init returns plan-level data; task-level changes are not needed for Phase 47
- Any existing PLAN.md files — sharding is forward-only; existing plans are not retroactively sharded

### How Phase 47 Fits With Downstream Phases

- **Phase 48 (AC-First Planning):** Phase 48 adds `<ac>` references to task files. The task file schema established in Phase 47 should include an empty `ac_refs` placeholder so Phase 48 can populate it without a schema change. This is a forward-compatibility provision.
- **Phase 51 (Workflow Tracking):** Phase 51 adds per-task status tracking in `tasks/workflow-status.md`. The `task_of` field in Phase 47 task file frontmatter provides the total task count that Phase 51 needs to initialize `workflow-status.md`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Load full PLAN.md per executor spawn | Load single task file per executor spawn | Phase 47 | ~90% context reduction for 5+ task plans |
| Planner produces only PLAN.md | Planner triggers pde-tools to produce PLAN.md + task files | Phase 47 | Task files become executor's primary context source for large plans |
| One executor spawn per plan (all tasks) | N executor spawns per plan (one per task file) for sharded plans | Phase 47 | Executors stay focused on one task; SUMMARY aggregated by orchestrator |

**Patterns unchanged after Phase 47:**
- Plans with fewer than 5 tasks — identical flow, no tasks directory created
- TDD plans — always execute in single-agent mode regardless of task count
- PLAN.md as source of truth — task files are always derivatives

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — tests run directly with `node --test {file}` |
| Quick run command | `node --test tests/phase-47/*.test.mjs` |
| Full suite command | `node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | shardPlan() creates tasks directory for 5+ task plans | unit | `node --test tests/phase-47/sharding.test.mjs` | Wave 0 |
| PLAN-01 | shardPlan() writes correct number of task files | unit | `node --test tests/phase-47/sharding.test.mjs` | Wave 0 |
| PLAN-01 | Each task file contains verbatim action content | unit | `node --test tests/phase-47/task-file-content.test.mjs` | Wave 0 |
| PLAN-01 | shardPlan() skips plans with fewer than 5 tasks | unit | `node --test tests/phase-47/sharding.test.mjs` | Wave 0 |
| PLAN-01 | shardPlan() skips TDD plans regardless of task count | unit | `node --test tests/phase-47/sharding.test.mjs` | Wave 0 |
| PLAN-02 | Path resolution selects task file when tasks directory exists | integration | `node --test tests/phase-47/executor-path-resolution.test.mjs` | Wave 0 |
| PLAN-02 | Path resolution falls back to PLAN.md when no tasks directory | integration | `node --test tests/phase-47/executor-path-resolution.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-47/sharding.test.mjs`
- **Per wave merge:** `node --test tests/phase-47/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-47/sharding.test.mjs` — covers PLAN-01 (shardPlan unit tests: count, write, skip, TDD exemption)
- [ ] `tests/phase-47/task-file-content.test.mjs` — covers PLAN-01 task file schema validation (verbatim action, frontmatter fields)
- [ ] `tests/phase-47/executor-path-resolution.test.mjs` — covers PLAN-02 conditional path logic

*(Framework install not needed — `node --test` is built-in, same framework used in Phase 46)*

---

## Open Questions

1. **N executor spawns per plan vs. single executor with task files as context**

   What we know: Two valid approaches exist. Option A: N spawns, one task file each (clean isolation). Option B: single spawn, executor receives all task file paths and processes them in sequence (matches current one-agent-per-plan pattern).

   What's unclear: Option B would not reduce context by 90% since the executor still loads all task files. Option A achieves the goal but adds N-1 extra spawn overhead per large plan.

   Recommendation: Use Option A (N spawns). The context reduction goal requires the executor to see only one task's context. The spawn overhead (~10-15s per agent) is acceptable for the quality gain and sets up Phase 51 task tracking cleanly.

2. **SUMMARY.md aggregation responsibility**

   What we know: execute-plan.md currently creates SUMMARY.md at the executor level. With N-spawn Option A, no single executor has seen all tasks.

   What's unclear: Whether the orchestrator should create SUMMARY.md with summary-level metadata it already has (plan ID, objective, task list), or whether the final task executor should create it (using `task == task_of` signal from frontmatter).

   Recommendation: Orchestrator creates SUMMARY.md after the task-file loop completes. It has all executor returns in context and can construct a complete SUMMARY without additional file reads. Task executors include "Do NOT create SUMMARY.md" in their prompt.

3. **TDD plan exemption scope**

   What we know: Phase 46-02 is TDD. The RED-GREEN-REFACTOR sequence requires the GREEN executor to have RED's test failure output.

   What's unclear: Whether TDD can be made compatible with sharding by including test failure context in each task file (e.g., task-002.md includes "expected test failures from task-001: ..."). This would require the executor for task 1 to output test results back to the orchestrator.

   Recommendation: Exempt TDD plans entirely for Phase 47. This is the simplest correct behavior. TDD compatibility with sharding can be addressed in a future phase if needed.

---

## Sources

### Primary (HIGH confidence)

- `workflows/execute-phase.md` (PDE, lines 118-159) — executor spawn prompt with files_to_read structure
- `/Users/greyaltaer/.claude/get-shit-done/workflows/execute-phase.md` (GSD upstream, lines 113-158) — confirms spawn structure
- `/Users/greyaltaer/.claude/get-shit-done/workflows/plan-phase.md` (GSD upstream) — planner spawn, revision loop structure
- `/Users/greyaltaer/.claude/get-shit-done/workflows/execute-plan.md` (GSD upstream) — executor internal protocol, SUMMARY.md creation
- `/Users/greyaltaer/.claude/get-shit-done/bin/lib/phase.cjs` lines 201-309 — cmdPhasePlanIndex, task counting regex
- `/Users/greyaltaer/.claude/get-shit-done/bin/lib/init.cjs` lines 10-81 — cmdInitExecutePhase return shape
- `.planning/phases/46-methodology-foundation/46-01-PLAN.md` — real PLAN.md (2 tasks, 270 lines)
- `.planning/phases/46-methodology-foundation/46-02-PLAN.md` — real TDD PLAN.md (2 tasks, 420 lines)
- `.planning/phases/46-methodology-foundation/46-03-PLAN.md` — real PLAN.md (1 task, 130 lines)
- `.planning/config.json` — nyquist_validation enabled confirmed

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — PLAN-01, PLAN-02 definitions and success criteria
- `.planning/ROADMAP.md` — Phase 47 goal, Phase 48/51 downstream context

### Tertiary (LOW confidence)

- Context size reduction estimates (75-90%) — extrapolated from Phase 46 plan sizes to hypothetical 5-10 task plans; validated against the actual plan structure but not against a measured 5+ task real plan; should be confirmed once Phase 48 produces larger plans

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all implementation uses existing PDE infrastructure (Node.js built-ins, established lib modules, proven patterns from Phase 46)
- Architecture: HIGH — based on direct reading of execute-phase.md, execute-plan.md, plan-phase.md, and pde-tools.cjs source code
- Pitfalls: HIGH — identified by tracing the complete execution flow and every integration point the sharding change touches
- Context reduction estimate: MEDIUM — extrapolated from Phase 46 plan sizes; the 90% claim is reasonable but should be validated against a real 5+ task plan during Phase 48

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable — these are internal PDE framework files with no external dependencies that could change)
