---
name: pde:settings
description: View and modify PDE settings
argument-hint: ""
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
Execute the /pde:settings workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/settings.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/settings.md.
Pass any $ARGUMENTS to the workflow process.
</process>
