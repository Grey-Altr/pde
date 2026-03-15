---
name: pde:verify-work
description: Validate built features against requirements and success criteria
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
Execute the /pde:verify-work workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/verify-work.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/verify-work.md.
Pass any $ARGUMENTS to the workflow process.
</process>
