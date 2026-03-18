---
name: pde:pressure-test
description: Run the full 13-stage design pipeline on a product concept and evaluate output for process compliance and Awwwards-rubric design quality
argument-hint: '[--fixture greenfield|partial|rerun] [--skip-build] [--verbose]'
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - Skill
---
<objective>
Execute the /pde:pressure-test command.
</objective>

<process>
Follow @workflows/pressure-test.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
