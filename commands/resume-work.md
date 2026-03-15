---
name: pde:resume-work
description: Resume work from a previous session with full context restoration
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
Execute the /pde:resume-work workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/resume-project.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/resume-project.md.
Pass any $ARGUMENTS to the workflow process.
</process>
