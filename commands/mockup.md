---
name: pde:mockup
description: Generate high-fidelity interactive HTML/CSS mockups
argument-hint: "[--design-reference-url <url>] [--no-firecrawl]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__firecrawl__firecrawl_scrape
---
<objective>
Execute the /pde:mockup command.
</objective>

<process>
@workflows/mockup.md
@references/skill-style-guide.md
</process>
