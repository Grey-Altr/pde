# Phase 51: Workflow Tracking — Research

**Researched:** 2026-03-19
**Domain:** Task-level status tracking, progress display, session handoff for PDE executor workflows
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRCK-01 | Executor updates per-task status (TODO/IN_PROGRESS/DONE/SKIPPED) in tasks/workflow-status.md as each task completes | Status file format and write timing defined in Architecture Patterns; pde-tools `tracking` CLI command spec defined in Standard Stack |
| TRCK-02 | /pde:progress displays task-level granularity when inside an active phase with story files | Progress workflow step additions defined in Architecture Patterns; task count detection logic described |
| TRCK-03 | Auto-generated HANDOFF.md captures current position, last action, next step, blockers, and key decisions when session ends or /pde:pause-work is invoked | HANDOFF.md schema and generation flow defined in Architecture Patterns; differs from .continue-here.md in location, audience, and trigger |
</phase_requirements>

---

## Summary

Phase 51 adds real-time task-level tracking to PDE's execution workflow. Currently, granularity stops at the plan level: SUMMARY.md signals plan completion, ROADMAP.md shows plan counts, and STATE.md records session position. There is no file tracking which individual tasks within a sharded plan are TODO/IN_PROGRESS/DONE/SKIPPED, no /pde:progress display of task-level status, and no HANDOFF.md generated on pause.

The primary implementation surface is three coordinated additions: (1) a `tasks/workflow-status.md` file written by the execute-phase.md orchestrator as it processes each sharded task, (2) a reading step in `workflows/progress.md` that detects and displays this file when inside an active phase, and (3) a `workflows/pause-work.md` rewrite that produces `.planning/HANDOFF.md` at the project root rather than `{phase}/.continue-here.md`.

The key dependency is Phase 47 (story file sharding). Tasks directories (`{plan-prefix}-tasks/`) and per-task files (`task-NNN.md`) must exist for TRCK-01 to have anything to track. Non-sharded plans (Mode B, no tasks directory) are explicitly out of scope for per-task tracking — those plans continue to use SUMMARY.md for completion signaling.

**Primary recommendation:** Add `workflow-status.md` as a companion to `tasks/` — written by the orchestrator (not individual task subagents) in sharded Mode A, because only the orchestrator sees all task completions sequentially. HANDOFF.md at `.planning/HANDOFF.md` replaces `.continue-here.md` for the pause-work flow; the older per-phase `.continue-here.md` approach is superseded but should be detected by resume-work for backwards compatibility.

---

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `tasks/workflow-status.md` | New file | Per-task status ledger | Companion to existing `tasks/` directory from Phase 47; same location as task-NNN.md files |
| `.planning/HANDOFF.md` | New file | Project-root session handoff | Single canonical location; readable by `/pde:resume-work` without knowing which phase was active |
| `workflows/progress.md` | Existing | Progress display | Already the routing layer for /pde:progress; extend with task-level section |
| `workflows/pause-work.md` | Existing | Session pause | Current implementation writes `.continue-here.md` in phase dir; this phase replaces the logic |
| `bin/lib/tracking.cjs` | New module | CLI helpers for status updates | Follows existing `bin/lib/readiness.cjs`, `bin/lib/sharding.cjs` pattern |
| `bin/pde-tools.cjs` | Existing | CLI router | Register `tracking` subcommand; same dispatch pattern as `shard-plan`, `validate`, `readiness` |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `node:fs` (sync) | Node built-in | Read/write workflow-status.md | All tracking reads/writes; file is small, no async needed |
| `bin/lib/frontmatter.cjs` | Existing | Parse frontmatter | Read tasks directory task counts; used by every existing lib module |
| `bin/lib/sharding.cjs` | Existing | `extractTaskBlocks()`, `derivePlanPrefix()` | Count total tasks when initializing workflow-status.md |

### What Does NOT Need to Change

| Component | Reason |
|-----------|--------|
| `bin/lib/sharding.cjs` | Only adds task files; tracking is a separate responsibility |
| Individual task-NNN.md format | Task files have no awareness of status; orchestrator writes status externally |
| `execute-plan.md` | Mode B (non-sharded) plans are out of scope; Mode A orchestration in `execute-phase.md` handles status writes |
| SUMMARY.md format | SUMMARY.md is plan-level completion; workflow-status.md is task-level in-progress tracking |

**Installation:** No new npm packages. All implementation uses Node.js built-ins and existing PDE lib modules.

---

## Architecture Patterns

### Recommended File Layout

```
.planning/
  HANDOFF.md                    <- new, project root, written on /pde:pause-work
  phases/
    51-workflow-tracking/
      51-01-tasks/
        task-001.md
        task-002.md
        workflow-status.md      <- new, companion to task files
bin/lib/
  tracking.cjs                  <- new module
tests/
  phase-51/
    workflow-status.test.mjs    <- TRCK-01 unit tests
    handoff.test.mjs            <- TRCK-03 unit tests
```

### Pattern 1: workflow-status.md Format

**What:** A markdown file in the `{plan-prefix}-tasks/` directory that acts as a live ledger of task status. Updated by the execute-phase.md orchestrator (not individual subagents) after each task executor returns.

**Why orchestrator, not subagent:** In sharded Mode A, each task subagent has an isolated context and cannot read or write status for tasks it did not execute. The orchestrator is the only entity that sees all task completions in sequence. This is consistent with the existing design decision that "orchestrator stays lean — delegates plan execution to subagents."

**Format:**

```markdown
---
phase: 51-workflow-tracking
plan: 01
generated: "2026-03-19T22:00:00Z"
last_updated: "2026-03-19T22:05:00Z"
---

# Workflow Status: 51-01

| Task | Name | Status | Commit | Updated |
|------|------|--------|--------|---------|
| 1 | Create tracking library | DONE | abc1234 | 2026-03-19T22:02:00Z |
| 2 | Register CLI command | IN_PROGRESS | — | 2026-03-19T22:04:00Z |
| 3 | Update progress workflow | TODO | — | — |
| 4 | Update pause-work workflow | TODO | — | — |
```

**Status values:** `TODO` | `IN_PROGRESS` | `DONE` | `SKIPPED`

**When written:**
- Initialized (all tasks `TODO`) by orchestrator before spawning first task executor for a sharded plan
- Updated to `IN_PROGRESS` just before spawning each task executor
- Updated to `DONE` or `SKIPPED` after each task executor returns
- File is idempotent: re-initializing preserves existing DONE/SKIPPED rows (recovery from interrupted runs)

**Anti-pattern:** Subagents must NOT write workflow-status.md. Only the orchestrator (execute-phase.md) touches it. Subagents cannot coordinate — they run in isolated contexts.

### Pattern 2: execute-phase.md Integration Points

The execute-phase.md orchestrator gains three new bash blocks in the `execute_waves` step, wrapping the existing Mode A sharded task spawn loop.

**Before spawning task 1 of a sharded plan** — initialize status file:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking init \
  --tasks-dir "${TASKS_DIR}" \
  --plan "${PLAN_PREFIX}" \
  --phase "${PHASE_SLUG}" \
  --total "${TASK_TOTAL}"
```

**Before spawning each task executor** — mark IN_PROGRESS:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking set-status \
  --tasks-dir "${TASKS_DIR}" \
  --task "${TASK_NUM}" \
  --status "IN_PROGRESS"
```

**After each task executor returns** — mark DONE or SKIPPED:

```bash
# TASK_FINAL_STATUS is "DONE" or "SKIPPED" based on executor return / user skip
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking set-status \
  --tasks-dir "${TASKS_DIR}" \
  --task "${TASK_NUM}" \
  --status "${TASK_FINAL_STATUS}" \
  --commit "${TASK_COMMIT_HASH}"
```

**Placement:** These three calls wrap the existing Mode A sharded task spawn loop. No changes to Mode B (non-sharded) flow. No changes to task-NNN.md files.

### Pattern 3: /pde:progress Task-Level Display

Current `workflows/progress.md` shows: recent work, current position (phase/plan), blockers, todos, and a routing step. The task-level display adds a new conditional section in the `report` step.

**Detection logic:**

```bash
# Check for active sharded plan with workflow-status.md
ACTIVE_STATUS_FILES=$(ls "${CURRENT_PHASE_DIR}"/*-tasks/workflow-status.md 2>/dev/null)
```

**When ACTIVE_STATUS_FILES is non-empty and plan has no SUMMARY.md**, add a `## Active Task Status` section:

```
## Active Task Status
Phase 51 — Plan 01

| Task | Name | Status |
|------|------|--------|
| 1 | Create tracking library | DONE |
| 2 | Register CLI command | IN_PROGRESS |
| 3 | Update progress workflow | TODO |
| 4 | Update pause-work workflow | TODO |

Progress: 1/4 tasks complete (25%)
```

**When ACTIVE_STATUS_FILES is empty** (no tasks directory or no workflow-status.md), the current phase-level display is unchanged — no regression for non-sharded phases.

**Completed plan guard:** Before showing task-level status, check that the plan does not have a corresponding SUMMARY.md. If `{plan-prefix}-SUMMARY.md` exists, the plan is complete — do not display task-level status for it.

```bash
PLAN_HAS_SUMMARY=$(ls "${PHASE_DIR}/${PLAN_PREFIX}-SUMMARY.md" 2>/dev/null)
# Only show task status if plan is not yet complete
```

### Pattern 4: HANDOFF.md — Replacing .continue-here.md

**Current mechanism:** `workflows/pause-work.md` writes `.planning/phases/{XX-name}/.continue-here.md`. Location is inside the phase directory. The resume workflow looks for this file.

**New mechanism:** Write `.planning/HANDOFF.md` at project root. This is the canonical pause artifact for Phase 51+. The resume workflow should check project root first, then fall back to per-phase `.continue-here.md` for backwards compatibility with pauses from before Phase 51.

**Why project root?** A developer returning from a break opens the project and runs `/pde:progress` or `/pde:resume-work`. They should not need to know which phase directory to look in. The handoff file is project-level context, not phase-level context.

**HANDOFF.md schema:**

```markdown
---
phase: 51-workflow-tracking
plan: 01
task: 2
task_of: 4
status: in_progress
last_updated: "2026-03-19T22:05:00Z"
---

# Handoff: Phase 51 — Workflow Tracking

## Current Position

- **Phase:** 51 — workflow-tracking
- **Plan:** 01 of 2
- **Task:** 2 of 4 — Register tracking CLI command
- **Status:** IN_PROGRESS

## Last Action Taken

Completed Task 1 (Create tracking library — bin/lib/tracking.cjs). Commit: abc1234.
The library exports: initWorkflowStatus(), setTaskStatus(), readWorkflowStatus().

## Next Step to Resume

Execute Task 2: Register the `tracking` subcommand in bin/pde-tools.cjs.
Read bin/pde-tools.cjs around line 654 for the dispatch pattern.
Add case 'tracking': following the shard-plan pattern.

## Active Blockers

None.

## Key Decisions This Session

- tracking.cjs uses synchronous fs reads/writes — file is small, no async needed
- workflow-status.md written by orchestrator (not subagents) — only orchestrator sees all completions

## Task Status Snapshot

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create tracking library | DONE | abc1234 |
| 2 | Register CLI command | IN_PROGRESS | — |
| 3 | Update progress workflow | TODO | — |
| 4 | Update pause-work workflow | TODO | — |
```

**Generation:** `pause-work.md` uses pde-tools CLI calls and STATE.md content to assemble HANDOFF.md. It also reads the nearest `workflow-status.md` (if any sharded plan is active) to populate the task status snapshot. If no sharded plan is active, the Task Status Snapshot section is omitted.

**Where /pde:progress surfaces it:** The `edge_cases` step in progress.md already says "Handoff file exists — mention it, offer `/pde:resume-work`". Update this to look for `.planning/HANDOFF.md` first (new), then `.planning/phases/*/.continue-here.md` (legacy).

### Pattern 5: tracking.cjs Module Structure

Follows the exact pattern established by `readiness.cjs`. The module uses CommonJS (`'use strict'`, `module.exports`), `fs` and `path` from Node built-ins, and `output`/`error` from `core.cjs`. Imports follow the same pattern as all other lib modules.

**Module skeleton:**

```
File: bin/lib/tracking.cjs
Style: CommonJS, 'use strict', same as readiness.cjs and sharding.cjs

Dependencies (all existing):
  - node:fs (built-in)
  - node:path (built-in)
  - ./core.cjs  (output, error helpers)

Exports:
  - initWorkflowStatus(tasksDir, opts)
  - setTaskStatus(tasksDir, taskNum, status, commitHash)
  - readWorkflowStatus(tasksDir)
  - cmdTrackingInit(cwd, args, raw)     <- CLI dispatch wrapper
  - cmdTrackingSetStatus(cwd, args, raw)
  - cmdTrackingRead(cwd, args, raw)
```

**CLI dispatch in pde-tools.cjs** — follows the `case 'shard-plan':` pattern already in the switch statement:

```
case 'tracking':
  load ./lib/tracking.cjs as tracking
  subCmd = args[1]
  if subCmd === 'init'       -> tracking.cmdTrackingInit(cwd, args[2..], raw)
  if subCmd === 'set-status' -> tracking.cmdTrackingSetStatus(cwd, args[2..], raw)
  if subCmd === 'read'       -> tracking.cmdTrackingRead(cwd, args[2..], raw)
  else error('tracking: unknown subcommand')
  break
```

### Anti-Patterns to Avoid

- **Subagents writing workflow-status.md:** Task executors run in isolated contexts with no knowledge of other tasks. If subagents wrote status files they would race or overwrite each other. The orchestrator is the correct writer.
- **Using workflow-status.md as execution source:** The planner cannot rely on workflow-status.md to find what to execute next. Task file order (`ls tasks/ | sort`) is the authoritative sequence. workflow-status.md is display and recovery metadata only.
- **Overwriting DONE rows on re-run:** If execute-phase resumes after interruption, the init call must preserve existing DONE/SKIPPED rows (idempotent re-initialization). A fresh overwrite would lose evidence of already-completed work.
- **workflow-status.md inside non-sharded plans:** Mode B plans have no tasks directory. Never create a workflow-status.md for them. Only create it alongside task-NNN.md files.
- **Committing workflow-status.md per-update:** Commit it once as part of the plan completion commit (alongside SUMMARY.md). It is ephemeral tracking state, not a durable per-task artifact.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Custom YAML parser | `extractFrontmatter()` from frontmatter.cjs | Already handles all PDE frontmatter edge cases |
| Task file discovery | Custom file finder | `ls "${TASKS_DIR}"/task-*.md 2>/dev/null \| sort` | Same pattern in execute-phase.md; consistent with orchestrator design |
| Plan prefix derivation | Custom regex | `derivePlanPrefix()` from sharding.cjs | Shared function handles `47-01-PLAN.md` to `47-01` correctly |
| Timestamp generation | Custom date format | `node pde-tools.cjs current-timestamp full --raw` | Already used everywhere for ISO timestamps |
| Status file commit | Custom git staging | `node pde-tools.cjs commit "..." --files ...` | Existing commit helper handles file staging and commit format |
| Handoff context assembly | Full plan re-read | `state-snapshot` + `state json` from pde-tools | STATE.md already has current phase, plan, position — no need to re-read PLAN.md |

**Key insight:** The tracking subsystem is thin by design. It writes a status ledger and reads it back for display. Complexity belongs in the orchestrator logic (execute-phase.md), not in a new tracking engine.

---

## Common Pitfalls

### Pitfall 1: Re-initialization Overwrites DONE Rows

**What goes wrong:** execute-phase.md resumes after an interruption. It re-runs the init command for the sharded plan. A naive init would overwrite existing DONE rows with TODO, making all tasks appear unstarted.

**Why it happens:** The `tracking init` command is called before spawning the first task. If the orchestrator doesn't check for an existing workflow-status.md, it reinitializes fresh.

**How to avoid:** `tracking init` must read existing workflow-status.md first (if it exists). For each task already marked DONE or SKIPPED, preserve that row. Only set unset or TODO tasks to TODO. This makes init idempotent.

**Warning signs:** SUMMARY.md says tasks completed, but workflow-status.md shows all TODO after a resume run.

### Pitfall 2: /pde:progress Reads Stale workflow-status.md

**What goes wrong:** Execution finished (SUMMARY.md created) but workflow-status.md still exists in the tasks directory. /pde:progress shows task-level status from a completed plan as if it is still in progress.

**Why it happens:** workflow-status.md is never deleted — it is a historical artifact of execution.

**How to avoid:** In the progress workflow, check whether the plan is actually complete (SUMMARY.md exists for the plan) before displaying task-level status. If SUMMARY.md exists, skip the task-level display for that plan.

```bash
SUMMARY_FILE="${PHASE_DIR}/${PLAN_PREFIX}-SUMMARY.md"
if [ ! -f "$SUMMARY_FILE" ]; then
  # Show task-level status from workflow-status.md
fi
```

**Warning signs:** /pde:progress shows IN_PROGRESS tasks for a phase that already has SUMMARY.md.

### Pitfall 3: HANDOFF.md Is Stale After Resume

**What goes wrong:** Developer creates HANDOFF.md via /pde:pause-work, then resumes and continues working. Old HANDOFF.md still exists at project root. Next /pde:progress surfaces it as if a pause is still active.

**Why it happens:** Nothing deletes or invalidates HANDOFF.md on resume.

**How to avoid:** The progress `edge_cases` step should check if the `last_updated` timestamp in HANDOFF.md frontmatter is older than the most recent commit. If so, surface it with a staleness warning. The resume-work workflow should optionally archive HANDOFF.md after successfully restoring context.

**Warning signs:** /pde:resume-work keeps offering HANDOFF.md resume even after work has continued.

### Pitfall 4: Missing workflow-status.md When Tasks Dir Exists

**What goes wrong:** A tasks directory exists (created by sharding) but no workflow-status.md was written (execution has not started, or the plan was sharded before Phase 51 was deployed). /pde:progress tries to read workflow-status.md and fails.

**How to avoid:** All reads of workflow-status.md must gracefully handle file-not-found. If workflow-status.md is absent but tasks directory exists, /pde:progress should display: "Tasks directory found but no status tracked yet." The tracking init call is the first thing the orchestrator does before spawning any executors — so if execution has run at all, workflow-status.md will exist.

### Pitfall 5: Parallel Plans Share Tasks Directory (False Concern)

**What it might seem:** Two plans in the same wave both have tasks directories. If both run in parallel, they might race on workflow-status.md.

**Why it is not a real problem:** workflow-status.md is scoped to `{plan-prefix}-tasks/workflow-status.md`. Each plan has a unique prefix (e.g., `51-01-tasks/`, `51-02-tasks/`). There is no shared file. The design is inherently safe when properly namespaced.

**Warning signs:** This pitfall only becomes real if two plans somehow share a tasks directory — which cannot happen given the naming convention.

---

## Code Examples

Verified patterns from direct source reading. All patterns follow established conventions from phases 47-50.

These are **implementation reference patterns** for the executor — showing the algorithm and file format the planner should spec in task actions.

### tracking.cjs — initWorkflowStatus() Algorithm

The function reads existing workflow-status.md first (idempotent), then writes a fresh status table:

```
Algorithm: initWorkflowStatus(tasksDir, opts)

Inputs: tasksDir (absolute path), opts.phase, opts.plan, opts.total (int)
Output: { initialized: true, total: N, preserved: M }

1. statusPath = path.join(tasksDir, 'workflow-status.md')
2. now = new Date().toISOString()
3. totalTasks = parseInt(opts.total, 10)

4. existingStatus = {}
5. IF statusPath exists:
     Read content from statusPath
     For each table row matching: | N | name | DONE|SKIPPED | commit | updated |
       existingStatus[N] = { status, name, commit, updated }

6. rows = []
7. For i = 1 to totalTasks:
     IF existingStatus[i]:  // preserve completed row
       rows.push(| i | name | status | commit | updated |)
     ELSE:
       rows.push(| i | Task i | TODO | — | — |)

8. Write frontmatter + table to statusPath:
     ---
     phase: opts.phase
     plan: opts.plan
     generated: now
     last_updated: now
     ---
     # Workflow Status: opts.plan
     | Task | Name | Status | Commit | Updated |
     |------|------|--------|--------|---------|
     ...rows

9. Return { initialized: true, total: totalTasks, preserved: Object.keys(existingStatus).length }
```

### tracking.cjs — setTaskStatus() Algorithm

```
Algorithm: setTaskStatus(tasksDir, taskNum, status, commitHash)

Inputs: tasksDir, taskNum (int), status (string), commitHash (optional)
Output: { updated: true|false, task: N, status: string }

1. statusPath = path.join(tasksDir, 'workflow-status.md')
2. IF statusPath does not exist: return { updated: false, reason: 'not found' }

3. content = read statusPath
4. now = new Date().toISOString()
5. commit = commitHash or '—'
6. num = parseInt(taskNum, 10)

7. Extract current task name from existing row for num
   (regex: | num | NAME | ... )

8. Build newRow = | num | taskName | status | commit | now |

9. Replace matching row in content using regex on "| num |...(4 cells)"

10. Replace last_updated in frontmatter: last_updated: now

11. Write updated content back to statusPath

12. Return { updated: true, task: num, status }
```

### tracking.cjs — readWorkflowStatus() Algorithm

```
Algorithm: readWorkflowStatus(tasksDir)

Output: { tasks: [{num, name, status, commit, updated}], total, done, inProgress }

1. statusPath = path.join(tasksDir, 'workflow-status.md')
2. IF not exists: return { tasks: [], total: 0, done: 0, inProgress: 0 }

3. content = read statusPath
4. Parse table rows matching: | N | name | STATUS | commit | updated |
5. tasks = array of parsed rows

6. Return {
     tasks,
     total: tasks.length,
     done: tasks.filter(t => t.status === 'DONE' || t.status === 'SKIPPED').length,
     inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length
   }
```

### pde-tools.cjs — tracking Dispatch Pattern

The switch case follows the same structure as `case 'shard-plan':` already in pde-tools.cjs.
Load `./lib/tracking.cjs` and dispatch to the appropriate `cmd*` function based on `args[1]`:

```
Subcommands:
  tracking init       -> cmdTrackingInit(cwd, remainingArgs, raw)
  tracking set-status -> cmdTrackingSetStatus(cwd, remainingArgs, raw)
  tracking read       -> cmdTrackingRead(cwd, remainingArgs, raw)
```

Each `cmd*` function parses `--flag value` pairs from `remainingArgs`, calls the core function, and emits JSON via `output()` following the same pattern as `cmdStateLoad`, `cmdTrackingInit` etc. in existing lib modules.

### execute-phase.md — Mode A Integration Pseudocode

These bash blocks are added inside the Mode A sharded task loop in the `execute_waves` step:

```bash
# BEFORE spawning first task of a sharded plan:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking init \
  --tasks-dir "${TASKS_DIR}" \
  --plan "${PLAN_PREFIX}" \
  --phase "${PHASE_SLUG}" \
  --total "${TASK_TOTAL}"

# BEFORE spawning task N (inside the per-task loop):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking set-status \
  --tasks-dir "${TASKS_DIR}" \
  --task "${TASK_NUM}" \
  --status "IN_PROGRESS"

# AFTER task executor returns (TASK_FINAL_STATUS = DONE or SKIPPED):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking set-status \
  --tasks-dir "${TASKS_DIR}" \
  --task "${TASK_NUM}" \
  --status "${TASK_FINAL_STATUS}" \
  --commit "${TASK_COMMIT_HASH}"
```

### pause-work.md — HANDOFF.md Generation Logic

The current `pause-work.md` gathers context and writes `.continue-here.md`. Replace with:

1. Gather via pde-tools: `state json`, `state-snapshot`, active workflow-status.md path
2. Read workflow-status.md (if exists) for task snapshot table
3. Use Write tool to write `.planning/HANDOFF.md` with the schema shown in Pattern 4
4. Commit: `node pde-tools.cjs commit "wip: pause at phase {N} task {X}/{Y}" --files .planning/HANDOFF.md`
5. Confirm to user: location is `.planning/HANDOFF.md`, resume with `/pde:resume-work`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.continue-here.md` in phase dir | `.planning/HANDOFF.md` at project root | Phase 51 (this phase) | Developer reads single known location; resume-work does not need to search phase dirs |
| No task-level tracking | `tasks/workflow-status.md` per sharded plan | Phase 51 (this phase) | /pde:progress can show task granularity; interrupted runs show which tasks remain |
| Progress = plan-count only | Progress = plan-count + per-task status (when sharded) | Phase 51 (this phase) | Developers see exact position within a long-running sharded plan |

**Deprecated/outdated:**
- `.continue-here.md` per phase: superseded by `.planning/HANDOFF.md`. Resume-work should still detect legacy `.continue-here.md` files for backwards compatibility with pre-Phase-51 pauses.

---

## Open Questions

1. **Task name population in tracking init**
   - What we know: Task names appear in task-NNN.md headers (`# Task N: Name`). The orchestrator is currently designed to "never read task file contents" (STATE.md decision from Phase 47).
   - What is unclear: Should tracking init read task file headers to get names, violating the "never reads task file contents" principle?
   - Recommendation: The Phase 47 decision applies to the orchestrator bash context to prevent context growth. The `tracking init` CLI call runs as a subprocess and does not grow orchestrator context. Therefore `tracking.cjs` can safely read task file headers to extract names. Alternatively, use `Task N` placeholders and update the name field when `set-status` is called. The simpler path is to have `tracking.cjs` read task file `# Task N:` headings directly.

2. **HANDOFF.md and resume-work compatibility**
   - What we know: `workflows/resume-work.md` was not found in the workflows directory (the file likely does not exist yet or was not created in scope of prior phases). The `commands/resume-work.md` delegates to a workflow.
   - What is unclear: How does the current `/pde:resume-work` find `.continue-here.md`?
   - Recommendation: The plan must update both `pause-work.md` (to write `.planning/HANDOFF.md`) and any resume workflow that reads handoff files. The progress.md `edge_cases` step already has a comment about detecting handoff files — give it a concrete path to check (`.planning/HANDOFF.md` first).

3. **workflow-status.md commit timing**
   - What we know: STATUS file changes happen after every task. Committing after every status update would add small chore commits.
   - Recommendation: Do NOT commit workflow-status.md per update. Commit it once as part of the plan completion commit alongside SUMMARY.md. Add `${TASKS_DIR}/workflow-status.md` to the `--files` list in the plan completion commit.

---

## Validation Architecture

Config confirms `workflow.nyquist_validation` is `true` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, used in phases 46-50) |
| Config file | none — invoked directly |
| Quick run command | `node --test tests/phase-51/*.test.mjs` |
| Full suite command | `node --test tests/phase-51/*.test.mjs && node --test tests/phase-47/*.test.mjs && node --test tests/phase-50/*.test.mjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRCK-01 | initWorkflowStatus() creates workflow-status.md with all tasks TODO | unit | `node --test tests/phase-51/workflow-status.test.mjs` | Wave 0 |
| TRCK-01 | initWorkflowStatus() is idempotent — preserves DONE/SKIPPED rows | unit | `node --test tests/phase-51/workflow-status.test.mjs` | Wave 0 |
| TRCK-01 | setTaskStatus() updates a single row status and timestamp | unit | `node --test tests/phase-51/workflow-status.test.mjs` | Wave 0 |
| TRCK-01 | setTaskStatus() records commit hash on DONE tasks | unit | `node --test tests/phase-51/workflow-status.test.mjs` | Wave 0 |
| TRCK-02 | readWorkflowStatus() returns structured task list | unit | `node --test tests/phase-51/workflow-status.test.mjs` | Wave 0 |
| TRCK-02 | pde-tools tracking read returns JSON for valid status file | unit | `node --test tests/phase-51/workflow-status.test.mjs` | Wave 0 |
| TRCK-03 | generateHandoff() produces .planning/HANDOFF.md with required frontmatter | unit | `node --test tests/phase-51/handoff.test.mjs` | Wave 0 |
| TRCK-03 | HANDOFF.md includes all required body sections | unit | `node --test tests/phase-51/handoff.test.mjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-51/*.test.mjs`
- **Per wave merge:** `node --test tests/phase-51/*.test.mjs && node --test tests/phase-47/*.test.mjs && node --test tests/phase-50/*.test.mjs`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-51/workflow-status.test.mjs` — covers TRCK-01 and TRCK-02
- [ ] `tests/phase-51/handoff.test.mjs` — covers TRCK-03
- [ ] `bin/lib/tracking.cjs` — the library under test

No new test framework install needed — node:test already in use across phases 46-50.

---

## Sources

### Primary (HIGH confidence)

- Direct source read: `workflows/execute-phase.md` — Mode A sharded execution loop, orchestrator task spawn pattern, risk HALT integration points
- Direct source read: `workflows/progress.md` — step structure, init context, report step, edge_cases step
- Direct source read: `workflows/pause-work.md` — current .continue-here.md write pattern, gather/write/commit/confirm steps
- Direct source read: `bin/lib/sharding.cjs` — extractTaskBlocks(), derivePlanPrefix(), resolveTaskPath() patterns
- Direct source read: `bin/lib/state.cjs` — writeStateMd() pattern, stateReplaceField(), idiomatic lib module structure
- Direct source read: `bin/lib/readiness.cjs` — runStructuralChecks() as template for new lib module structure
- Direct source read: `bin/pde-tools.cjs` — CLI dispatch pattern, case 'shard-plan': registration pattern
- Direct source read: `tests/phase-50/readiness-checks.test.mjs` — test file structure for new phase-51 tests
- Direct source read: `.planning/phases/47-story-file-sharding/47-01-PLAN.md` — actual task file format and orchestrator path patterns
- Direct source read: `.planning/config.json` — nyquist_validation: true confirmed; mode: yolo

### Secondary (MEDIUM confidence)

- Inferred from STATE.md decisions section: orchestrator path resolution uses `ls tasks-dir | sort`; Mode A HALT handled at orchestrator level; orchestrator never reads task file contents to prevent context growth

### Tertiary (LOW confidence)

- None — all findings verified from direct source reading

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified from direct source reading of existing implementations
- Architecture: HIGH — patterns derived from existing execute-phase.md, sharding.cjs, and readiness.cjs implementations
- Pitfalls: HIGH — identified by tracing actual data flow through execute-phase.md Mode A orchestration loop

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable, low-churn workflow infrastructure)
