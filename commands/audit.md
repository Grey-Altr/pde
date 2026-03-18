---
name: pde:audit
description: Audit PDE's own artifacts for quality gaps, generate improvement proposals, and optionally apply validated fixes
argument-hint: '[--fix] [--deep] [--save-baseline] [--category "commands,workflows,agents"]'
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
Execute the /pde:audit command.
</objective>

<process>
Follow @workflows/audit.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
