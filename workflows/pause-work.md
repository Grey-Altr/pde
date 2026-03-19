<purpose>
Create `.planning/HANDOFF.md` handoff file to preserve complete work state across sessions. Enables seamless resumption with full context restoration.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="detect">
Find current phase directory from most recently modified files:

```bash
# Find most recent phase directory with work
ls -lt .planning/phases/*/PLAN.md 2>/dev/null | head -1 | grep -oP 'phases/\K[^/]+'
```

If no active phase detected, ask user which phase they're pausing work on.
</step>

<step name="gather">
**Collect complete state for handoff:**

1. **Current position**: Which phase, which plan, which task
2. **Work completed**: What got done this session
3. **Work remaining**: What's left in current plan/phase
4. **Decisions made**: Key decisions and rationale
5. **Blockers/issues**: Anything stuck
6. **Mental context**: The approach, next steps, "vibe"
7. **Files modified**: What's changed but not committed
8. **Task status**: If active sharded plan exists, read workflow-status.md via `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking read --tasks-dir "${TASKS_DIR}"`

Use pde-tools to gather state context:
```bash
STATE_JSON=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" state json)
timestamp=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" current-timestamp full --raw)
```

Check for active sharded plan:
```bash
TASKS_DIR=$(ls -d .planning/phases/${PHASE_DIR}/*-tasks 2>/dev/null | head -1)
WORKFLOW_STATUS=""
if [ -n "$TASKS_DIR" ] && [ -f "${TASKS_DIR}/workflow-status.md" ]; then
  WORKFLOW_STATUS=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" tracking read --tasks-dir "${TASKS_DIR}")
fi
```

Ask user for clarifications if needed via conversational questions.
</step>

<step name="write">
**Write handoff to `.planning/HANDOFF.md`:**

```markdown
---
phase: {phase-slug}
plan: {plan-number}
task: {current-task-number}
task_of: {total-tasks}
status: {in_progress|blocked}
last_updated: {ISO timestamp}
---

# Handoff: Phase {N} -- {Phase Name}

## Current Position

- **Phase:** {N} -- {phase-name}
- **Plan:** {NN} of {total-plans}
- **Task:** {X} of {Y} -- {task name}
- **Status:** {IN_PROGRESS|BLOCKED}

## Last Action Taken

{Description of what was just completed, including commit hash if available}

## Next Step to Resume

{Specific instruction: which task to execute next, which file to read first}

## Active Blockers

{List blockers or "None."}

## Key Decisions This Session

{List of decisions made during this session}

## Task Status Snapshot

{Include workflow-status table if sharded plan is active; omit section if not}
```

Be specific enough for a fresh Claude to understand immediately.

Use `current-timestamp` for last_updated field:
```bash
timestamp=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" current-timestamp full --raw)
```
</step>

<step name="commit">
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" commit "wip: {phase-name} paused at task {X}/{Y}" --files .planning/HANDOFF.md
```
</step>

<step name="confirm">
```
Handoff created: .planning/HANDOFF.md

Current state:

- Phase: {phase-slug}
- Plan: {plan-number}
- Task: {X} of {Y}
- Status: {in_progress/blocked}
- Committed as WIP

To resume: /pde:resume-work
```
</step>

</process>

<success_criteria>
- [ ] .planning/HANDOFF.md created at project root
- [ ] All sections filled with specific content (Current Position, Last Action Taken, Next Step to Resume, Active Blockers, Key Decisions This Session)
- [ ] Task Status Snapshot included if sharded plan is active
- [ ] Committed as WIP
- [ ] User knows location and how to resume
</success_criteria>
