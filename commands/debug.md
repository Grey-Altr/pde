---
name: pde:debug
description: Diagnose and fix issues in your project
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
Execute the /pde:debug workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/diagnose-issues.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/diagnose-issues.md.
Pass any $ARGUMENTS to the workflow process.
</process>
