---
name: pde:portfolio
description: "Synthesize a cross-project portfolio from multiple .planning/ directories"
argument-hint: "[path1] [path2] ... [--pdf] [--dry-run]"
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
Execute the /pde:portfolio command.
</objective>

<process>
Follow @workflows/portfolio.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
