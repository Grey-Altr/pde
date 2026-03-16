---
name: pde:handoff
description: Synthesize design pipeline artifacts into implementation specifications
argument-hint: "[--quick] [--dry-run] [--verbose] [--no-mcp] [--no-sequential-thinking] [--force]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__sequential-thinking__*
---
<objective>
Execute the /pde:handoff command.
</objective>

<process>
Follow @workflows/handoff.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
