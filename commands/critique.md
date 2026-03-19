---
name: pde:critique
description: Run multi-perspective design critique on wireframes with severity-rated findings
argument-hint: '"screen1, screen2, ..." [--focused "ux,accessibility"] [--quick] [--force]'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__pencil__*
---
<objective>
Execute the /pde:critique command.
</objective>

<process>
Follow @workflows/critique.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
