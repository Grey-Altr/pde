---
name: pde:brief
description: Generate a structured product design brief
argument-hint: "[--from-github <issue-url-or-number>] [--source-url <url>] [--quick] [--dry-run] [--verbose] [--no-mcp] [--no-firecrawl] [--force]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__github__*
  - mcp__firecrawl__firecrawl_scrape
---
<objective>
Execute the /pde:brief command.
</objective>

<process>
If $ARGUMENTS contains `--from-github`, follow @workflows/brief-from-github.md exactly, passing all of $ARGUMENTS.
Otherwise, follow @workflows/brief.md exactly (existing behavior unchanged).

@references/skill-style-guide.md
</process>
