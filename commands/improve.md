---
name: pde:improve
description: Create, improve, or evaluate PDE skills
argument-hint: 'create "description" [--for-pde] | improve skill-name [--rewrite] [--for-pde] | eval skill-name'
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
Execute the /pde:improve command.
</objective>

<process>
Follow @workflows/improve.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
