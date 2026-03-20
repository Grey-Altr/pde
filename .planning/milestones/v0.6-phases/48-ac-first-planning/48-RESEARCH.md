# Phase 48: AC-First Planning — Research

**Researched:** 2026-03-19
**Domain:** PDE planner/executor workflow internals — PLAN.md schema augmentation, acceptance criteria lifecycle, task boundary enforcement
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-03 | Planner output schema includes acceptance criteria section before task list; each AC has a unique identifier (AC-N) | plan-phase.md planner prompt deep_work_rules; PLAN.md XML schema; sharding.cjs buildTaskFileContent; pde-plan-checker prompt |
| PLAN-04 | Each task references specific AC-N identifiers it satisfies; tasks cannot be marked done without AC verification | execute-plan.md MANDATORY acceptance_criteria check step; task file schema; sharding.cjs extractField pattern |
| PLAN-05 | Task schema supports optional boundaries field listing protected paths/sections; executor respects DO NOT CHANGE sections | execute-plan.md execute step; sharding.cjs buildTaskFileContent; task-NNN.md schema |
</phase_requirements>

---

## Summary

Phase 48 is a schema augmentation phase with three integration points: the **planner prompt** (instructs the planner agent to emit an `<acceptance_criteria>` block before tasks), the **executor protocol** (enforces that AC-N refs are verified before a task can be marked done), and the **sharding library** (carries AC-N refs and boundaries data into task files). No new npm dependencies are needed and no new binaries are created.

The fundamental design: PLAN.md gains a top-level `<acceptance_criteria>` section (before `<tasks>`) containing BDD Given/When/Then items each with a unique `AC-N` identifier (AC-1, AC-2, ... AC-N). Each `<task>` gains an `<ac_refs>` field listing which AC-N items it satisfies. The executor checks all referenced AC-N items before marking a task done. Each `<task>` also gains an optional `<boundaries>` field listing protected paths/sections — the executor logs a warning if it modifies those paths and refuses to proceed without explicit acknowledgment.

The three files that change are: `workflows/plan-phase.md` (planner prompt schema + `deep_work_rules`), `workflows/execute-plan.md` (task execution step — mandatory AC-N verification + boundaries warning), and `bin/lib/sharding.cjs` (task file content builder — extract and copy `<ac_refs>` and `<boundaries>` fields). Phase 47 already established the forward-compatibility placeholder (`ac_refs` was mentioned as a Phase 47 forward-compatibility provision — the field just never appeared in the actual code, so this is a clean addition).

**Primary recommendation:** Add `<acceptance_criteria>` block to PLAN.md schema (with BDD format and AC-N IDs), add `<ac_refs>` and `<boundaries>` to each `<task>`, update the planner prompt to require these, update the executor to enforce AC verification before marking done, update sharding.cjs to copy the new fields, and update the plan-phase.md planner prompt's `downstream_consumer` and `quality_gate` sections to require AC coverage.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs (built-in) | Node 18+ | Read PLAN.md, extract fields, write task files | Already used throughout pde-tools.cjs; no new dep |
| bin/lib/sharding.cjs | Phase 47 (existing) | Extract `<ac_refs>` and `<boundaries>` from task blocks, include in task file content | Already the task file builder; all extraction helpers already in place |
| bin/lib/frontmatter.cjs | existing | Parse plan frontmatter for AC section | Already imported in sharding.cjs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| extractField() in sharding.cjs | existing | Extract `<ac_refs>` and `<boundaries>` from task XML blocks | Two more calls to the existing pattern; zero new code structure |
| MANDATORY acceptance_criteria check (execute-plan.md) | existing mechanism | Existing enforcement hook; Phase 48 extends it to include AC-N cross-referencing | The enforcement pattern exists; Phase 48 strengthens its AC-N check |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| XML `<acceptance_criteria>` block before `<tasks>` | YAML frontmatter `ac:` section | XML block matches the existing plan body structure (objective, context, tasks are all XML blocks); frontmatter changes require pde-tools schema updates. XML block is zero tooling change. |
| `<ac_refs>` XML field per task | BDD criteria embedded in each task's `<acceptance_criteria>` | Embedding duplicates AC prose in every task; `<ac_refs>` is a compact reference that links back to the canonical definition. Separation of definition (plan-level) from reference (task-level) is cleaner. |
| Text format for AC-N IDs | Numeric-only IDs, UUID-based IDs | `AC-N` (e.g., AC-1, AC-2) matches the existing requirement ID pattern (PLAN-03, VRFY-01, etc.) — already in the project's vocabulary. Numerics alone are ambiguous; UUIDs are unreadable. |
| Boundaries in task `<boundaries>` XML tag | Boundaries in PLAN.md frontmatter `protected_paths:` field | Task-level boundaries allow different tasks to protect different paths. Plan-level would be all-or-nothing. Task-level is more precise and matches the per-task nature of the protection. |

**Installation:** No new dependencies. All implementation uses existing Node.js built-ins and PDE's existing pde-tools.cjs infrastructure.

---

## Architecture Patterns

### PLAN.md Schema After Phase 48

The augmented PLAN.md structure adds two sections to what Phase 47 established:

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
  truths: [...]
  artifacts: [...]
---

<objective>
{Multi-sentence objective}
</objective>

<execution_context>
...
</execution_context>

<context>
...
</context>

<!-- NEW: AC section BEFORE <tasks> — the source of truth for this plan's ACs -->
<acceptance_criteria>

**AC-1:** Given {condition}, when {action}, then {verifiable outcome}
**AC-2:** Given {condition}, when {action}, then {verifiable outcome}
...

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task N: {task name}</name>
  <files>{comma-separated files}</files>
  <ac_refs>AC-1, AC-3</ac_refs>          <!-- NEW: which ACs this task satisfies -->
  <boundaries>                            <!-- NEW (optional): DO NOT CHANGE paths -->
    - path/to/protected/file.ts
    - path/to/protected/section (comment pattern for sections)
  </boundaries>
  <read_first>...</read_first>
  <action>...</action>
  <verify>...</verify>
  <acceptance_criteria>                   <!-- EXISTING: per-task grep-verifiable checks -->
    - {grep-verifiable check}
  </acceptance_criteria>
  <done>...</done>
</task>

</tasks>

<verification>...</verification>
<success_criteria>...</success_criteria>
<output>...</output>
```

**Key design decisions:**

1. `<acceptance_criteria>` at plan level (between `<context>` and `<tasks>`) uses BDD Given/When/Then format with **AC-N** IDs. This is the **definition** of what the plan achieves.

2. `<ac_refs>` per task is a **compact reference** (e.g., `AC-1, AC-3`) — not a copy of the AC prose. The executor cross-references back to the plan-level block to get the full text.

3. Per-task `<acceptance_criteria>` continues to exist for grep-verifiable implementation checks. These are **not** the same as BDD ACs — they're low-level code-level criteria. Both must pass.

4. `<boundaries>` is optional. When present, lists paths or comment-section patterns the executor must not modify during this task.

### Pattern 1: Plan-Level AC Block Format

**What:** A new XML block between `<context>` and `<tasks>` in PLAN.md.

**Format:**

```xml
<acceptance_criteria>

**AC-1:** Given the planner has produced a PLAN.md, when it contains an `<acceptance_criteria>` block, then every AC entry has a unique AC-N identifier in BDD format

**AC-2:** Given a task in PLAN.md, when it references AC-N identifiers in its `<ac_refs>` field, then those identifiers exist in the plan-level `<acceptance_criteria>` block

**AC-3:** Given the executor completes a task, when that task has `<ac_refs>`, then it verifies all referenced ACs before marking the task done

**AC-4:** Given a task file has a `<boundaries>` field, when the executor runs, then it logs a warning before modifying any listed paths and refuses to proceed without explicit acknowledgment

</acceptance_criteria>
```

**Rules for the planner:**
- Each AC must have a unique sequential identifier: AC-1, AC-2, etc.
- Format: `**AC-N:** Given {pre-condition}, when {trigger/action}, then {observable outcome}`
- The `then` clause must be grep-verifiable or behaviorally observable (no "it works")
- Number of ACs: typically 3-8 per plan; one AC per significant capability delivered

### Pattern 2: Task-Level `<ac_refs>` Field

**What:** A new XML field inside each `<task>` listing which plan-level ACs this task satisfies.

**Format:**

```xml
<task type="auto">
  <name>Task 1: Add AC section to PLAN.md schema</name>
  <files>workflows/plan-phase.md</files>
  <ac_refs>AC-1, AC-2</ac_refs>
  ...
</task>
```

**Rules:**
- Must reference at least one AC-N from the plan's `<acceptance_criteria>` block
- All plan-level ACs must be referenced by at least one task (coverage requirement)
- AC-N references must match exactly (case-sensitive: "AC-1", not "ac-1" or "AC1")
- Tasks that perform plumbing/infrastructure work reference ACs that depend on their output

### Pattern 3: Boundaries Field

**What:** An optional XML field inside `<task>` listing protected paths.

**Format:**

```xml
<boundaries>
  - workflows/execute-phase.md
  - bin/lib/phase.cjs
  - # Protected section: Phase 47 sharding logic in sharding.cjs (lines 24-67)
</boundaries>
```

**When present:**
- Executor must log a warning before touching any listed path: `"BOUNDARY WARNING: This task's boundaries field lists {path} as DO NOT CHANGE. Proceeding would require explicit confirmation."`
- If the executor's task requires modifying a listed path: stop, report, ask user for confirmation
- If the executor's task would not touch the listed path: proceed normally (boundaries are informational)

**When to use:**
- When a task modifies a file that other tasks in the same plan also touch — boundaries protect the other tasks' work
- When a task is adjacent to recently-completed Phase 47 work that must not regress

### Pattern 4: Executor AC-N Verification (execute-plan.md)

**What:** Extends the existing "MANDATORY acceptance_criteria check" in `execute-plan.md` to also verify AC-N referenced by the task.

**Current behavior (line 142 in execute-plan.md):**
```
MANDATORY acceptance_criteria check: After completing each task, if it has
<acceptance_criteria>, verify EVERY criterion before moving to the next task.
```

**Phase 48 extension:**
```
MANDATORY AC-N verification: After completing each task, if it has <ac_refs>,
retrieve the corresponding AC-N entries from the plan's <acceptance_criteria>
block. Verify that each referenced AC is satisfied (Given/When/Then all true).
If any AC is not satisfied, do not mark the task done — fix the implementation.
```

**Execution flow for a task with `<ac_refs>AC-1, AC-3</ac_refs>`:**
1. Complete task implementation
2. Run per-task `<acceptance_criteria>` checks (existing)
3. **New:** Read plan-level `<acceptance_criteria>` block
4. **New:** For each AC-N in `<ac_refs>`, verify the "then" clause is true
5. Only mark task done if all per-task checks AND all referenced AC-N "then" clauses pass

### Pattern 5: Sharding Updates for New Fields

The `buildTaskFileContent()` function in `sharding.cjs` needs to:

1. Accept and include `ac_refs` content from the task block
2. Accept and include `boundaries` content from the task block
3. Include the plan-level `<acceptance_criteria>` block in every task file (so the executor doesn't need to read PLAN.md to resolve AC-N references)

**Updated task file schema:**

```markdown
---
phase: {fm.phase}
plan: {fm.plan}
task: {task-number}
task_of: {total-tasks}
---

# Task {N}: {task-name}

**Phase:** {fm.phase}
**Plan:** {fm.plan} — {objectiveOneLine}
**Task:** {N} of {totalTasks}
**Files this task modifies:** {taskFiles}
**ACs this task satisfies:** {ac_refs}        <-- NEW

## Plan Objective (Context)
{objectiveText}

## Plan Acceptance Criteria (Reference)          <-- NEW SECTION
{plan-level <acceptance_criteria> block verbatim}

## Read First
Before making any changes, read these files:
{readFirstContent}

## Task Boundaries (DO NOT CHANGE)              <-- NEW SECTION (if non-empty)
{boundaries content}

## Task Action
{actionContent}

## Acceptance Criteria (Task-Level)
{acceptanceCriteriaContent}

## Verification
{verifyContent}

## Done Condition
{doneContent}

## Plan Must-Haves (Relevant to This Task)
{filtered must_haves}
```

**Critical:** Including the full plan-level AC block in every task file means Mode A executors (sharded, task-file mode) can verify AC-N references without needing to read PLAN.md. Self-contained.

### Anti-Patterns to Avoid

- **Embedding AC prose in every task:** Don't copy the full AC-N text into each `<ac_refs>` — the field is a reference list only. The plan-level block is the canonical definition.
- **Using the existing per-task `<acceptance_criteria>` as AC-N:** These are different things. Per-task acceptance criteria are grep-verifiable code-level checks (e.g., `bin/lib/sharding.cjs contains 'function shardPlan'`). Plan-level ACs are BDD behavioral statements about what the system does after all tasks complete.
- **Conflating plan-level ACs with requirements:** PLAN-03 is a project requirement. AC-1 is a plan-level behavioral acceptance criterion for a specific plan. They operate at different levels.
- **Making every task satisfy every AC:** ACs should be distributed across tasks. A task that creates a schema change satisfies the AC for "schema includes X". A task that updates the executor satisfies "executor enforces Y". No single task should reference all ACs.
- **Allowing empty `<ac_refs>`:** Every task must reference at least one AC. This is enforced by the plan checker.
- **Using `<boundaries>` as a security gate:** Boundaries warn and require confirmation — they do not cryptographically prevent modification. The pattern is procedural, not cryptographic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AC-N extraction from plan-level block | Custom parser | `extractField(content, 'acceptance_criteria')` already in sharding.cjs | Same XML extraction pattern — one more extractField call on the plan body (not task inner) |
| AC-N reference validation | Separate validation lib | Plan checker agent instruction (existing pde-plan-checker) | The checker is already spawned and already validates `<acceptance_criteria>` presence; add AC-N cross-reference check to its instructions |
| Task file AC section | Separate template | Extend `buildTaskFileContent()` with `planAcBlock` param | The function already builds the full task file; add two more fields to the params object |
| Boundaries warning logic | Separate middleware | Inline in `execute-plan.md` step "execute" | The executor already has a mandatory acceptance_criteria check inline; add boundaries check inline in the same step |
| AC coverage check (all ACs referenced by some task) | New validation script | pde-plan-checker agent instruction | The plan checker already validates structural requirements; add "every AC-N in plan-level block must appear in at least one task's ac_refs" to its checklist |

**Key insight:** Phase 48 is primarily a schema and instruction change, not a new algorithm. The infrastructure for extraction (sharding.cjs), enforcement (execute-plan.md), and validation (pde-plan-checker) already exists. The work is adding fields, copying content, and strengthening instructions.

---

## Common Pitfalls

### Pitfall 1: Plan-level AC block extracted with wrong field name

**What goes wrong:** `sharding.cjs` tries to extract the plan-level `<acceptance_criteria>` block using `extractField(content, 'acceptance_criteria')`, but this same tag name is also used for per-task `<acceptance_criteria>`. The extractor returns the first match — which might be a task-level block if tasks come before the plan-level block.

**Why it happens:** `extractField()` uses a non-greedy regex on the full content. If the plan's `<acceptance_criteria>` block appears after `<tasks>` (wrong order), or if the extraction is done on full plan content rather than the plan body before `<tasks>`.

**How to avoid:** The plan-level `<acceptance_criteria>` block MUST appear BEFORE `<tasks>` in PLAN.md (this is a schema requirement, not an implementation choice). `sharding.cjs` should extract the plan-level AC block from the plan content BEFORE the `<tasks>` block — specifically: extract the content between `</context>` (or `</objective>` if no context) and `<tasks>`. Or use a more specific regex: `/<acceptance_criteria>([\s\S]*?)<\/acceptance_criteria>/i` applied to the plan body before `<tasks>`. A simpler approach: extract using the same regex but position-check that the match occurs before the first `<task` occurrence.

**Warning signs:** Task file shows task-level "contains X" criteria in the plan-level AC section instead of BDD Given/When/Then statements.

**Implementation approach:**

```javascript
// Extract plan-level AC block (before <tasks>)
function extractPlanAcBlock(content) {
  // Find position of first <task
  const tasksIdx = content.search(/<tasks[\s>]/i);
  const bodyBefore = tasksIdx > -1 ? content.slice(0, tasksIdx) : content;
  const match = bodyBefore.match(/<acceptance_criteria>([\s\S]*?)<\/acceptance_criteria>/i);
  return match ? match[1].trim() : '';
}
```

### Pitfall 2: Task files from sharding don't include plan-level AC block

**What goes wrong:** Sharded task files (Mode A execution in execute-phase.md) don't include the plan-level `<acceptance_criteria>` block. An executor running task-003.md with `<ac_refs>AC-1, AC-3</ac_refs>` cannot find the AC-1 and AC-3 definitions — they're in PLAN.md, which the executor does not read in Mode A.

**Why it happens:** `buildTaskFileContent()` in sharding.cjs only copies the fields explicitly passed to it. The plan-level AC block is a new addition not covered by the Phase 47 task file schema.

**How to avoid:** Pass `planAcBlock` as a new parameter to `buildTaskFileContent()`. Include it as a "## Plan Acceptance Criteria (Reference)" section in every task file, regardless of whether the task has `<ac_refs>`. This makes the task file fully self-contained for AC verification.

**Warning signs:** Mode A executor fails to verify "then" clauses because it cannot find AC-1 text; executor marks task done without AC-N verification.

### Pitfall 3: AC-N IDs not globally unique within a plan

**What goes wrong:** Two different ACs have the same identifier (e.g., both listed as AC-2). When a task references AC-2, it's ambiguous.

**Why it happens:** The planner generates ACs sequentially but may restart numbering in revision cycles, or may duplicate when copy-editing plan content.

**How to avoid:** The plan checker validates AC uniqueness: "Every **AC-N:** entry in the plan-level `<acceptance_criteria>` block must have a unique N value." This is an addition to pde-plan-checker's checklist. The plan-phase.md planner prompt's `deep_work_rules` section must state: "AC identifiers must be globally unique within a plan. If a revision produces new ACs, renumber from AC-1 to maintain consistency."

**Warning signs:** Plan checker passes but executor reports `<ac_refs>` has ambiguous references.

### Pitfall 4: `<boundaries>` and `<ac_refs>` missing from sharding.cjs extractField calls

**What goes wrong:** `sharding.cjs` extracts task fields using `extractField(taskInner, tag)` calls. If `ac_refs` and `boundaries` are not added to the extraction list in `shardPlan()`, these fields are silently omitted from task files.

**Why it happens:** `shardPlan()` has an explicit list of field extractions (lines 218-225). New fields must be manually added.

**How to avoid:** Add two lines to the per-task loop in `shardPlan()`:
```javascript
const acRefs = extractField(taskInner, 'ac_refs');
const boundaries = extractField(taskInner, 'boundaries');
```
And add these to the `buildTaskFileContent()` call parameters.

**Warning signs:** Task files have "**ACs this task satisfies:** " with an empty value; task files have no "## Task Boundaries" section when the source PLAN.md had a non-empty `<boundaries>` block.

### Pitfall 5: Plan checker doesn't validate AC coverage (orphaned ACs)

**What goes wrong:** A plan has AC-1 through AC-5 in its plan-level block, but AC-4 and AC-5 are not referenced by any task's `<ac_refs>`. These ACs are defined but never verified.

**Why it happens:** The planner writes ACs and then writes tasks, but may not maintain the mapping. Revision iterations can add ACs without updating task refs.

**How to avoid:** Add to pde-plan-checker instructions: "For every AC-N identifier in the plan-level `<acceptance_criteria>` block, verify that at least one task's `<ac_refs>` field contains that identifier. Report any 'orphaned' ACs (defined but not referenced by any task)."

**Warning signs:** Phase delivers all task outputs but misses a behavioral capability that was articulated in an AC nobody verified.

### Pitfall 6: Boundaries in sharded task files shows empty section

**What goes wrong:** PLAN.md tasks with empty `<boundaries>` fields produce task files with a "## Task Boundaries (DO NOT CHANGE)" section that says "none" or is empty — visually confusing and wastes space.

**Why it happens:** `buildTaskFileContent()` always includes the boundaries section regardless of content.

**How to avoid:** `buildTaskFileContent()` should conditionally include the boundaries section:
```javascript
const boundariesSection = boundaries
  ? '\n## Task Boundaries (DO NOT CHANGE)\n\n' + boundaries + '\n'
  : '';
```
This section only appears if `boundaries` is non-empty.

### Pitfall 7: Existing plans (Phase 46, 47) break due to schema requirement

**What goes wrong:** After Phase 48, the plan checker requires `<ac_refs>` on every task. Existing PLAN.md files from Phase 46 and 47 don't have this field. Re-running plan-phase for those phases would fail.

**Why it happens:** New schema requirements applied retroactively to old plans.

**How to avoid:** The plan checker requirement for `<ac_refs>` should only apply to PLAN.md files created after Phase 48 deploys. Implementation: the plan checker checks for `<acceptance_criteria>` plan-level block existence FIRST; if the block exists, then it validates `<ac_refs>` on tasks. If no plan-level block exists, the plan is treated as pre-Phase-48 and the ac_refs check is skipped. This is a conditional enforcement pattern: "validate AC-N coverage only when the plan declares it".

---

## Code Examples

Verified patterns from the existing PDE codebase:

### Extract plan-level AC block (new helper in sharding.cjs)

```javascript
// Source: sharding.cjs extension pattern — extractObjective() is the model
function extractPlanAcBlock(content) {
  // Must appear BEFORE <tasks> to avoid matching per-task <acceptance_criteria>
  const tasksIdx = content.search(/<tasks[\s>]/i);
  const bodyBefore = tasksIdx > -1 ? content.slice(0, tasksIdx) : content;
  const match = bodyBefore.match(/<acceptance_criteria>([\s\S]*?)<\/acceptance_criteria>/i);
  return match ? match[1].trim() : '';
}
```

### Extract ac_refs and boundaries from task inner content (new calls in shardPlan)

```javascript
// Source: sharding.cjs — extractField() is already defined (line 44)
// These are two new calls added to the per-task extraction loop (around line 218)
const acRefs = extractField(taskInner, 'ac_refs');
const boundaries = extractField(taskInner, 'boundaries');
```

### Updated buildTaskFileContent with AC and boundaries (sharding.cjs)

```javascript
// Source: sharding.cjs buildTaskFileContent() — add two new parameters
function buildTaskFileContent(params) {
  const {
    taskNum, totalTasks, fm, objectiveText, planAcBlock,  // planAcBlock is NEW
    taskName, taskFiles, acRefs, boundaries,              // acRefs, boundaries are NEW
    readFirst, action, acceptanceCriteria, verify, done, mustHavesText
  } = params;

  const phase = fm.phase || '';
  const plan = fm.plan || '';
  const objectiveOneLine = objectiveText.split(/\.\s+/)[0].replace(/\n/g, ' ').trim();

  // Conditional boundaries section
  const boundariesSection = boundaries
    ? '\n## Task Boundaries (DO NOT CHANGE)\n\nThe following paths/sections must not be modified by this task:\n' + boundaries + '\n'
    : '';

  // Conditional plan AC reference section
  const planAcSection = planAcBlock
    ? '\n## Plan Acceptance Criteria (Reference)\n\nACs this task must help satisfy (see ac_refs above for which apply):\n\n' + planAcBlock + '\n'
    : '';

  return '---\n' +
    'phase: ' + phase + '\n' +
    'plan: ' + plan + '\n' +
    'task: ' + taskNum + '\n' +
    'task_of: ' + totalTasks + '\n' +
    '---\n\n' +
    '# Task ' + taskNum + ': ' + taskName + '\n\n' +
    '**Phase:** ' + phase + '\n' +
    '**Plan:** ' + plan + ' \u2014 ' + objectiveOneLine + '\n' +
    '**Task:** ' + taskNum + ' of ' + totalTasks + '\n' +
    '**Files this task modifies:** ' + taskFiles + '\n' +
    '**ACs this task satisfies:** ' + (acRefs || '(none — pre-Phase-48 plan)') + '\n\n' +
    '## Plan Objective (Context)\n\n' +
    objectiveText + '\n' +
    planAcSection +
    '## Read First\n\n' +
    'Before making any changes, read these files:\n' +
    readFirst + '\n\n' +
    boundariesSection +
    '## Task Action\n\n' +
    action + '\n\n' +
    '## Acceptance Criteria (Task-Level)\n\n' +
    acceptanceCriteria + '\n\n' +
    '## Verification\n\n' +
    verify + '\n\n' +
    '## Done Condition\n\n' +
    done + '\n\n' +
    '## Plan Must-Haves (Relevant to This Task)\n\n' +
    mustHavesText + '\n';
}
```

### execute-plan.md MANDATORY AC-N verification extension (text patch)

The existing check at execute-plan.md line 142 is:

```
MANDATORY acceptance_criteria check: After completing each task, if it has
<acceptance_criteria>, verify EVERY criterion before moving to the next task.
```

Phase 48 extends this to:

```
MANDATORY acceptance_criteria check: After completing each task, if it has
<acceptance_criteria>, verify EVERY criterion before moving to the next task.
Use grep, file reads, or CLI commands to confirm each criterion. If any criterion
fails, fix the implementation before proceeding.

MANDATORY AC-N verification: After completing each task, if it has <ac_refs>,
retrieve the corresponding AC-N entries from the plan's <acceptance_criteria>
block (in the task file under "## Plan Acceptance Criteria (Reference)" or in
PLAN.md directly if not sharded). For each referenced AC-N, verify that the
"then" clause is true — the behavioral outcome must be observable. If any
referenced AC is not satisfied, the task is NOT done — fix the implementation
first. Do not move to the next task with an unsatisfied AC.
```

### execute-plan.md boundaries enforcement (new instruction in execute step)

Added to execute-plan.md step "execute", after read_first gate:

```
MANDATORY boundaries check: Before executing a task, if it has a <boundaries>
field (or "## Task Boundaries" section in a task file), check whether your
planned changes would touch any listed path. If yes: STOP. Log:
"BOUNDARY WARNING: Task {N} boundaries field lists {path} as DO NOT CHANGE.
This task would modify that path. Confirm to proceed or adjust scope."
Wait for user confirmation before modifying a listed path. If no conflict:
proceed normally — boundaries are informational, not restrictive when no
overlap exists.
```

### Planner prompt addition for deep_work_rules (plan-phase.md)

New item added to the `<deep_work_rules>` section in plan-phase.md:

```
4. **`<acceptance_criteria>` (plan-level, BEFORE `<tasks>`)** — BDD-format behavioral
   statements that define what success looks like for the plan as a whole. Rules:
   - Place the block AFTER `<context>` and BEFORE `<tasks>` — this is the definition,
     not a per-task check
   - Each entry: `**AC-N:** Given {condition}, when {action}, then {observable outcome}`
   - Sequential numbering starting at AC-1, unique within the plan
   - The "then" clause must be observable/verifiable (not subjective)
   - Typical count: 3-8 ACs per plan (one per significant capability delivered)

5. **`<ac_refs>` per task** — lists which plan-level AC-N identifiers this task satisfies.
   Rules:
   - Every task MUST reference at least one AC-N
   - Every AC-N in the plan's <acceptance_criteria> block MUST appear in some task's
     <ac_refs> (full coverage required — no orphaned ACs)
   - Format: comma-separated (e.g., `AC-1, AC-3`) — exact match, case-sensitive

6. **`<boundaries>` per task (optional)** — lists paths/sections this task must NOT modify.
   Rules:
   - Use when a task is adjacent to fragile/recently-changed code that must not regress
   - Each entry is a file path or a comment describing a section (e.g.,
     `# Phase 47 sharding logic in sharding.cjs`)
   - Executor will warn and require confirmation before modifying listed paths
```

New item in `<quality_gate>` in plan-phase.md:

```
- [ ] Plan-level `<acceptance_criteria>` block exists BEFORE `<tasks>`, with each AC in
      **AC-N:** Given/When/Then format
- [ ] Every task has `<ac_refs>` referencing at least one AC-N
- [ ] Every AC-N in the plan-level block is referenced by at least one task
```

---

## Scope: What Phase 48 Changes

### Files to Modify

1. **`workflows/plan-phase.md`** — add items 4-6 to `<deep_work_rules>`; add 3 items to `<quality_gate>`; update `<downstream_consumer>` note to mention AC section
2. **`workflows/execute-plan.md`** — extend "MANDATORY acceptance_criteria check" step with AC-N verification; add boundaries check before task execution
3. **`bin/lib/sharding.cjs`** — add `extractPlanAcBlock()` helper; add `acRefs` and `boundaries` extraction to task loop; add `planAcBlock` and new fields to `buildTaskFileContent()` params and template

### Files NOT to Modify

- **`bin/pde-tools.cjs`** — no new CLI subcommand needed; sharding is extended internally
- **`bin/lib/frontmatter.cjs`** — no frontmatter schema change; AC section is in plan body (XML), not YAML frontmatter
- **`bin/lib/phase.cjs`** — plan index / task counting logic unchanged
- **`workflows/execute-phase.md`** — Mode A/Mode B spawning logic unchanged; the improvement is in what the executor reads (task files now include AC context)
- Any existing PLAN.md files — no retroactive changes; plan checker skips AC-N validation for plans without a plan-level AC block

### Integration Points with Phase 47 (Sharding)

Phase 47's `sharding.cjs` is extended, not replaced. The forward-compatibility placeholder (`ac_refs`) mentioned in the Phase 47 research is now populated:

- `extractTaskBlocks()` — unchanged (already extracts full task XML)
- `extractField()` — unchanged (used for two new fields: ac_refs, boundaries)
- `buildTaskFileContent()` — extended with `planAcBlock`, `acRefs`, `boundaries` params
- `shardPlan()` — extended: extracts plan-level AC block once, passes to each task's file

### Integration Points with Downstream Phases

- **Phase 49 (Reconciliation):** RECONCILIATION.md should report AC satisfaction status — Phase 48's `<ac_refs>` field gives Phase 49 the data it needs to cross-reference. No Phase 48 action needed; Phase 49 will consume the structure.
- **Phase 51 (Tracking):** Per-task status in workflow-status.md can include "AC verification: pass/fail" fields. Phase 48's enforcement pattern is what Phase 51 will surface in tracking. No Phase 48 action needed.

---

## Current Architecture: What Exists Today

### execute-plan.md current acceptance_criteria check (HIGH confidence — directly read)

File: `workflows/execute-plan.md`, step "execute", item 2:

```
MANDATORY acceptance_criteria check: After completing each task, if it has
<acceptance_criteria>, verify EVERY criterion before moving to the next task.
Use grep, file reads, or CLI commands to confirm each criterion. If any criterion
fails, fix the implementation before proceeding. Do not skip criteria or mark
them as "will verify later".
```

This is the hook Phase 48 extends. It already fires on every task. Adding AC-N cross-referencing is a surgical addition to this step.

### sharding.cjs current per-task extraction (HIGH confidence — directly read)

File: `bin/lib/sharding.cjs`, `shardPlan()` function, lines 218-225:

```javascript
const taskName = extractField(taskInner, 'name');
const taskFiles = extractField(taskInner, 'files');
const readFirst = extractField(taskInner, 'read_first');
const action = extractField(taskInner, 'action');
const acceptanceCriteria = extractField(taskInner, 'acceptance_criteria');
const verify = extractField(taskInner, 'verify');
const done = extractField(taskInner, 'done');
```

Phase 48 adds two lines after `done`:
```javascript
const acRefs = extractField(taskInner, 'ac_refs');
const boundaries = extractField(taskInner, 'boundaries');
```

### plan-phase.md current deep_work_rules (HIGH confidence — directly read)

File: `workflows/plan-phase.md`, `<deep_work_rules>` block, items 1-3 exist:
1. `<read_first>` — mandatory, rules for what to include
2. `<acceptance_criteria>` — mandatory, verifiable conditions per-task
3. `<action>` — must include concrete values

Phase 48 adds items 4, 5, 6 for plan-level AC block, ac_refs, and boundaries.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-task acceptance_criteria as only AC mechanism | Plan-level BDD ACs + per-task AC-N refs | Phase 48 | Tasks explicitly linked to behavioral outcomes; executor verifies behavioral coverage, not just code presence |
| No task boundary enforcement | Optional `<boundaries>` field with executor warning | Phase 48 | Fragile files/sections protected across multi-task plans |
| Executor verifies code-level criteria only | Executor verifies both code criteria AND behavioral AC-N outcomes | Phase 48 | Task completion gate requires behavioral correctness, not just implementation presence |

**Patterns unchanged after Phase 48:**
- Per-task `<acceptance_criteria>` (code-level grep checks) — still mandatory, still runs first
- PLAN.md frontmatter schema — no changes
- sharding threshold, TDD exemption, idempotency — unchanged
- execute-phase.md Mode A/Mode B — unchanged

---

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — tests run directly with `node --test {file}` |
| Quick run command | `node --test tests/phase-48/*.test.mjs` |
| Full suite command | `node --test tests/phase-48/*.test.mjs && node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-03 | extractPlanAcBlock() returns AC block from plan body before `<tasks>` | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-03 | extractPlanAcBlock() returns empty string when no plan-level AC block | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-03 | extractPlanAcBlock() does NOT match per-task acceptance_criteria block | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-04 | shardPlan() includes planAcBlock in each task file | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-04 | shardPlan() includes ac_refs in each task file | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-04 | Task file "ACs this task satisfies:" header present when ac_refs non-empty | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-05 | shardPlan() includes boundaries section when task has non-empty `<boundaries>` | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-05 | shardPlan() omits boundaries section when task has empty/absent `<boundaries>` | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | Wave 0 |
| PLAN-03,04 | Phase 47 tests still pass after sharding.cjs extension | regression | `node --test tests/phase-47/*.test.mjs` | Existing |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-48/sharding-ac.test.mjs`
- **Per wave merge:** `node --test tests/phase-48/*.test.mjs && node --test tests/phase-47/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-48/sharding-ac.test.mjs` — covers PLAN-03, PLAN-04, PLAN-05 for sharding.cjs AC extraction
  - Synthetic PLAN.md with plan-level AC block + tasks with `<ac_refs>` and `<boundaries>`
  - Verifies task file content contains AC section, ac_refs header, conditional boundaries section
  - Verifies plan-level AC block not confused with per-task acceptance_criteria

*(Framework install not needed — `node --test` is built-in, same as Phase 46/47)*

---

## Open Questions

1. **Plan-level AC block — between `<context>` and `<tasks>`, or between `<objective>` and `<context>`?**

   What we know: The plan body order is currently: objective → execution_context → context → tasks → verification → success_criteria → output.

   Recommendation: Place after `<context>` and before `<tasks>`. The AC block describes behavioral outcomes (closer to tasks than to objective). This also makes the plan read naturally: "here's what we're doing (objective/context), here's what success looks like (ACs), here's how we get there (tasks)."

2. **Should the plan-checker validate AC-N IDs in `<ac_refs>` against plan-level block, or trust the planner?**

   What we know: The plan checker is already spawned after every PLANNING COMPLETE (and after every revision in the revision loop). Its instructions currently check for structural correctness.

   Recommendation: Yes — add AC coverage validation to pde-plan-checker instructions. This is the right place (structure validation is the checker's job). The specific checks: (a) plan-level AC block exists with at least one AC-N entry, (b) every task has `<ac_refs>`, (c) every AC-N in the plan-level block appears in at least one task's `<ac_refs>`. These are grep-able checks.

3. **How does the planner know to number ACs when generating revisions?**

   What we know: The revision loop in plan-phase.md re-spawns the planner with existing PLAN.md + checker issues. If the planner adds ACs during revision, it must not re-number ACs that existing tasks already reference.

   Recommendation: Add to the revision prompt in plan-phase.md: "If adding new ACs, append with higher numbers (do not renumber existing ACs that tasks already reference)." This is a one-line addition to the revision prompt's `<instructions>` block.

---

## Sources

### Primary (HIGH confidence)

- `workflows/plan-phase.md` (PDE, full file read) — planner prompt, deep_work_rules, quality_gate, revision loop
- `workflows/execute-phase.md` (PDE, full file read) — Mode A/B spawning, task file path injection
- `workflows/execute-plan.md` (PDE, full file read) — MANDATORY acceptance_criteria check (line 142), execute step, task_commit protocol
- `bin/lib/sharding.cjs` (PDE, full file read) — extractField, buildTaskFileContent, shardPlan, extractTaskBlocks — all Phase 47 implemented functions
- `bin/lib/frontmatter.cjs` (PDE, full file read) — extractFrontmatter, FRONTMATTER_SCHEMAS (plan schema has no ac field — confirmed)
- `bin/lib/phase.cjs` (PDE, lines 240-310) — cmdPhasePlanIndex, task counting regex
- `.planning/REQUIREMENTS.md` (PDE) — PLAN-03, PLAN-04, PLAN-05 definitions and success criteria
- `.planning/phases/47-story-file-sharding/47-RESEARCH.md` — Phase 47 architecture patterns, forward-compatibility mention
- `.planning/phases/47-story-file-sharding/47-01-PLAN.md` — Phase 47 task file schema (shows field extraction pattern, no ac_refs/boundaries present)
- `.planning/phases/47-story-file-sharding/47-02-PLAN.md` — Plan 02 task structure (workflow integration)
- `.planning/STATE.md` — current project state, Phase 47 decisions

### Secondary (MEDIUM confidence)

- BDD (Behavior-Driven Development) Given/When/Then format — established industry standard for acceptance criteria; Gherkin syntax is the canonical reference
- AC identifier convention (`AC-N`) — derived from project's existing REQ-ID pattern (PLAN-03, VRFY-01 etc.); consistent prefix+number format

### Tertiary (LOW confidence)

- None in this research — all findings are based on direct reading of the project codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all implementation uses existing PDE infrastructure (Node.js built-ins, established lib modules, proven patterns from Phase 46/47)
- Architecture: HIGH — based on direct reading of execute-plan.md, plan-phase.md, sharding.cjs; no external dependencies
- Pitfalls: HIGH — identified by tracing the complete execution flow (specifically the extractField/extractPlanAcBlock disambiguation and sharded task file self-containment requirement)
- Validation architecture: HIGH — same test framework as Phase 46/47, same patterns, Wave 0 gaps are well-defined

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable — all implementation targets internal PDE framework files with no external dependencies that could change)
