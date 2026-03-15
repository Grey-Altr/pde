---
name: pde:research-phase
description: Research how to implement a phase (standalone - usually use /pde:plan-phase instead)
argument-hint: "[phase]"
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
Execute the /pde:research-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/research-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/research-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
