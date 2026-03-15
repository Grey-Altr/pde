---
name: pde:execute-plan
description: Execute a single plan within a phase
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
Execute the /pde:execute-plan workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/execute-plan.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/execute-plan.md.
Pass any $ARGUMENTS to the workflow process.
</process>
