---
name: pde:validate-phase
description: Retroactively audit and fill Nyquist validation gaps for a completed phase
argument-hint: "[phase number]"
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
Execute the /pde:validate-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/validate-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/validate-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
