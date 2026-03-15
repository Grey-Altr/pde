---
name: pde:quick
description: Execute single tasks without full planning overhead
argument-hint: "[--full] [--discuss] [--research]"
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
Execute the /pde:quick workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/quick.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/quick.md.
Pass any $ARGUMENTS to the workflow process.
</process>
