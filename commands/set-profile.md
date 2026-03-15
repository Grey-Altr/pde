---
name: pde:set-profile
description: Set model profile for agent selection
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
Execute the /pde:set-profile workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/set-profile.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/set-profile.md.
Pass any $ARGUMENTS to the workflow process.
</process>
