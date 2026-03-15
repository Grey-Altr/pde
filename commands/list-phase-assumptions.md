---
name: pde:list-phase-assumptions
description: List assumptions made during phase planning
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
Execute the /pde:list-phase-assumptions workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/list-phase-assumptions.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/list-phase-assumptions.md.
Pass any $ARGUMENTS to the workflow process.
</process>
