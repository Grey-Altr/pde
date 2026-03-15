---
name: pde:pause-work
description: Pause current work and save state for resume
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
Execute the /pde:pause-work workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/pause-work.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/pause-work.md.
Pass any $ARGUMENTS to the workflow process.
</process>
