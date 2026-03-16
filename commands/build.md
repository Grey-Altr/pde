---
name: pde:build
description: Run the full design pipeline (brief → system → flows → wireframe → critique → iterate → handoff). Resumes from last complete stage.
argument-hint: "[--dry-run] [--quick] [--verbose] [--force]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion
---
<objective>
Execute the /pde:build pipeline orchestrator.
</objective>

<process>
Follow @workflows/build.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
