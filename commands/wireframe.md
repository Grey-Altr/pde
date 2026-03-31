---
name: pde:wireframe
description: Generate browser-viewable HTML/CSS wireframes for specified screens
argument-hint: '"screen1, screen2, ..." lofi|midfi|hifi [--design-reference-url <url>] [--no-firecrawl]'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - mcp__figma__*
  - mcp__firecrawl__firecrawl_scrape
---
<objective>
Execute the /pde:wireframe command.
</objective>

<process>
Follow @workflows/wireframe.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
