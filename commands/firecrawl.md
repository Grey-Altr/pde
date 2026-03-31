---
name: pde:firecrawl
description: Direct Firecrawl MCP tool access — scrape, search, map, extract, crawl, agent, interact
argument-hint: "scrape URL [--force] | search QUERY [--limit N] | map URL | extract URL --schema JSON | crawl URL [--limit N] [--max-depth N] | agent QUERY [--max-credits N] | agent-status JOB_ID | interact URL [--playwright CODE_FILE | --prompt TEXT]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - mcp__firecrawl__firecrawl_scrape
  - mcp__firecrawl__firecrawl_search
  - mcp__firecrawl__firecrawl_map
  - mcp__firecrawl__firecrawl_extract
  - mcp__firecrawl__firecrawl_crawl
  - mcp__firecrawl__firecrawl_check_crawl_status
  - mcp__firecrawl__firecrawl_agent
  - mcp__firecrawl__firecrawl_agent_status
  - mcp__firecrawl__firecrawl_interact
  - WebSearch
  - WebFetch
---
<objective>
Execute the /pde:firecrawl command. Parse $ARGUMENTS to determine the subcommand and route to @workflows/firecrawl.md.
</objective>

<process>
Follow @workflows/firecrawl.md exactly, passing all of $ARGUMENTS.
</process>
