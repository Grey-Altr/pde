---
name: pde:build
description: Run the full design pipeline (recommend -> competitive -> opportunity -> ideate -> brief -> system -> flows -> wireframe -> critique -> iterate -> mockup -> hig -> handoff). Resumes from last complete stage.
argument-hint: "[--from stage] [--dry-run] [--quick] [--verbose] [--force]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion
  - Skill
---
<objective>
Execute the /pde:build pipeline orchestrator.
</objective>

<process>
Follow @workflows/build.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
