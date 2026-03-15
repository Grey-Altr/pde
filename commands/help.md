---
name: pde:help
description: Display all available PDE commands with descriptions
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
Execute the /pde:help workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/help.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/help.md.
Pass any $ARGUMENTS to the workflow process.
</process>
