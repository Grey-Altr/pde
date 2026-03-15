---
name: pde:map-codebase
description: Analyze existing codebases with parallel agents
argument-hint: "[optional: specific area to map, e.g., 'api' or 'auth']"
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
Execute the /pde:map-codebase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/map-codebase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/map-codebase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
