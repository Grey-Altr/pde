---
name: pde:handoff
description: Synthesize design pipeline artifacts into implementation specifications
argument-hint: "[--create-prs] [--quick] [--dry-run] [--verbose] [--no-mcp] [--no-sequential-thinking] [--force]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__sequential-thinking__*
  - mcp__github__*
---
<objective>
Execute the /pde:handoff command.
</objective>

<process>
If $ARGUMENTS contains `--create-prs`, follow @workflows/handoff-create-prs.md exactly, passing all of $ARGUMENTS.
Otherwise, follow @workflows/handoff.md exactly (existing behavior unchanged).

Pass all of $ARGUMENTS to the workflow.
</process>
