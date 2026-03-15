---
name: pde:progress
description: Show current project state and next recommended action
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
Execute the /pde:progress workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/progress.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/progress.md.
Pass any $ARGUMENTS to the workflow process.
</process>
