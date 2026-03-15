---
name: pde:transition
description: Transition between project phases
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
Execute the /pde:transition workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/transition.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/transition.md.
Pass any $ARGUMENTS to the workflow process.
</process>
