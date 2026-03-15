---
name: pde:debug
description: Systematic debugging with persistent state across context resets
argument-hint: "[issue description]"
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
Execute the /pde:debug workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/diagnose-issues.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/diagnose-issues.md.
Pass any $ARGUMENTS to the workflow process.
</process>
