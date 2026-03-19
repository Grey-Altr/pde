---
name: pde:handoff
description: Synthesize design pipeline artifacts into implementation specifications
argument-hint: "[--create-prs] [--create-linear-issues] [--create-jira-tickets] [--quick] [--dry-run] [--verbose] [--no-mcp] [--no-sequential-thinking] [--force]"
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
  - mcp__linear__*
  - mcp__atlassian__*
  - mcp__figma__*
---
<objective>
Execute the /pde:handoff command.
</objective>

<process>
If $ARGUMENTS contains `--create-prs`, follow @workflows/handoff-create-prs.md exactly, passing all of $ARGUMENTS.
If $ARGUMENTS contains `--create-linear-issues`, follow @workflows/handoff-create-linear-issues.md exactly, passing all of $ARGUMENTS.
If $ARGUMENTS contains `--create-jira-tickets`, follow @workflows/handoff-create-jira-tickets.md exactly, passing all of $ARGUMENTS.
Otherwise, follow @workflows/handoff.md exactly (existing behavior unchanged).

Pass all of $ARGUMENTS to the workflow.
</process>
