---
name: pde:add-phase
description: Add a new phase to the roadmap
argument-hint: "<description>"
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
Execute the /pde:add-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/add-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/add-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
