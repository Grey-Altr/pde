---
name: pde:pipeline-status
description: Display GitHub Actions CI status for the connected repo
argument-hint: '[--no-mcp]'
allowed-tools:
  - Read
  - Bash
---
<objective>
Execute the /pde:pipeline-status command.
</objective>

<process>
Follow @workflows/pipeline-status.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
