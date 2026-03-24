---
name: pde:check-divergence
description: Detect drift between handoff specs and implemented components
argument-hint: '[--verbose]'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---
<objective>
Execute the /pde:check-divergence command.
</objective>

<process>
Follow @workflows/check-divergence.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
