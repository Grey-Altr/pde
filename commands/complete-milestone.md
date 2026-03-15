---
name: pde:complete-milestone
description: Archive and complete the current milestone
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
Execute the /pde:complete-milestone workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/complete-milestone.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/complete-milestone.md.
Pass any $ARGUMENTS to the workflow process.
</process>
