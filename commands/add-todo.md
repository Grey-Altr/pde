---
name: pde:add-todo
description: Add a todo item to project tracking
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
Execute the /pde:add-todo workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/add-todo.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/add-todo.md.
Pass any $ARGUMENTS to the workflow process.
</process>
