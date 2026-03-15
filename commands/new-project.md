---
name: pde:new-project
description: Initialize new project through unified flow -- questioning, research, requirements, roadmap
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
Execute the /pde:new-project workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md.
Pass any $ARGUMENTS to the workflow process.
</process>
