---
name: pde:add-tests
description: Add tests for existing code
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
Execute the /pde:add-tests workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/add-tests.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/add-tests.md.
Pass any $ARGUMENTS to the workflow process.
</process>
