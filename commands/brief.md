---
name: pde:brief
description: Generate a structured product design brief
argument-hint: "[--from-github <issue-url-or-number>] [--quick] [--dry-run] [--verbose] [--no-mcp] [--force]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__github__*
---
<objective>
Execute the /pde:brief command.
</objective>

<process>
If $ARGUMENTS contains `--from-github`, follow @workflows/brief-from-github.md exactly, passing all of $ARGUMENTS.
Otherwise, follow @workflows/brief.md exactly (existing behavior unchanged).

@references/skill-style-guide.md
</process>
