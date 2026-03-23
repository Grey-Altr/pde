---
name: pde:optimize
description: Run an autonomous optimization experiment loop against an experiment.md file
argument-hint: "<experiment.md path> [--self] [--skill <name>] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
Execute the /pde:optimize workflow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/optimize.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/optimize.md.
Pass any $ARGUMENTS to the workflow process.
</process>
