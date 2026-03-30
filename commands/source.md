---
name: pde:source
description: Add and manage source material from web URLs via Firecrawl scraping
argument-hint: "add URL [--force] [--type scrape|crawl] | list | show SLUG"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - mcp__firecrawl__firecrawl_scrape
  - mcp__firecrawl__firecrawl_search
  - mcp__firecrawl__firecrawl_crawl
  - WebFetch
---
<objective>
Execute the /pde:source command. Parse $ARGUMENTS to determine the subcommand and route accordingly.
</objective>

<process>

## Subcommand Routing

Parse the first token of $ARGUMENTS to determine the subcommand:

### `add URL [--force] [--type scrape|crawl]`

Follow @workflows/source.md exactly, passing all of $ARGUMENTS.

### `list`

Read the sources manifest and display all sources as a formatted table:

```bash
node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); const m = c.readManifest(); if (m.sources.length === 0) { console.log('No sources in manifest.'); } else { console.log(JSON.stringify(m.sources, null, 2)); }"
```

Format the output as a table with columns: Slug, URL, Type, Words, Date Added.

If no sources exist, display: "No sources added yet. Use `/pde:source add URL` to add your first source."

### `show SLUG`

Read the cached content for the given slug and display it:

```bash
node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); const r = c.readSource('SLUG'); if (r) { console.log(r); } else { console.log('NOT_FOUND'); }"
```

If NOT_FOUND, display: "Source with slug 'SLUG' not found. Run `/pde:source list` to see available sources."

### No subcommand or unrecognized

Display usage help:
```
Usage: /pde:source <subcommand>

Subcommands:
  add URL [--force] [--type scrape|crawl]   Add a URL as source material
  list                                       List all sources in the manifest
  show SLUG                                  Display cached content for a source

Examples:
  /pde:source add https://example.com/docs
  /pde:source add https://example.com --force --type crawl
  /pde:source list
  /pde:source show example-com-docs
```

</process>
