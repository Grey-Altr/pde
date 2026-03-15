---
name: pde:cleanup
description: Clean up project artifacts
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
Execute the /pde:cleanup workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/cleanup.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/cleanup.md.
Pass any $ARGUMENTS to the workflow process.
</process>
