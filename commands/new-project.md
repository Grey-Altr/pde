---
name: pde:new-project
description: Initialize a new project with deep context gathering and PROJECT.md
argument-hint: "[--auto]"
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
Execute the /pde:new-project workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md.
Pass any $ARGUMENTS to the workflow process.
</process>
