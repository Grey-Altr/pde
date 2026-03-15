---
name: pde:update
description: Update PDE plugin to latest version
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
Execute the /pde:update workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/update.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/update.md.
Pass any $ARGUMENTS to the workflow process.
</process>
