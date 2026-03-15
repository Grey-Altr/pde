---
name: pde:check-todos
description: Check and display outstanding todos
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
Execute the /pde:check-todos workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/check-todos.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/check-todos.md.
Pass any $ARGUMENTS to the workflow process.
</process>
