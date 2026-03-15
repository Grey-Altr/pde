---
name: pde:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - TodoWrite
  - AskUserQuestion
---
<objective>
Execute the /pde:execute-phase workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/execute-phase.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/execute-phase.md.
Pass any $ARGUMENTS to the workflow process.
</process>
