---
name: pde:present
description: "Generate a stakeholder presentation for the specified persona, or list all available personas"
argument-hint: "[persona-slug] [--dry-run] [--verbose]"
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
Execute the /pde:present command.
</objective>

<process>
Follow @workflows/present.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
