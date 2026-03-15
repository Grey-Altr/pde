---
name: pde:plan-milestone-gaps
description: Plan closure for milestone gaps
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Execute the /pde:plan-milestone-gaps workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/plan-milestone-gaps.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/plan-milestone-gaps.md.
Pass any $ARGUMENTS to the workflow process.
</process>
