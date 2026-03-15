---
name: pde:set-profile
description: Switch model profile for PDE agents (quality/balanced/budget/inherit)
argument-hint: "<profile (quality|balanced|budget|inherit)>"
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
