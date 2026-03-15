---
name: pde:new-milestone
description: Start a new milestone cycle
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Execute the /pde:new-milestone workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/new-milestone.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/new-milestone.md.
Pass any $ARGUMENTS to the workflow process.
</process>
