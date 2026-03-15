---
name: pde:audit-milestone
description: Audit milestone completion against original intent
argument-hint: "[version]"
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
Execute the /pde:audit-milestone workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/audit-milestone.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/audit-milestone.md.
Pass any $ARGUMENTS to the workflow process.
</process>
