---
name: pde:resume-project
description: Resume a paused project from saved state
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
Execute the /pde:resume-project workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/resume-project.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/resume-project.md.
Pass any $ARGUMENTS to the workflow process.
</process>
