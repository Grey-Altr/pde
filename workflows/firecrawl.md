<purpose>
Direct Firecrawl MCP tool access — scrape, search, map, extract, and crawl with credit guards, cache integration, and crawl cap enforcement. All Firecrawl output flows through firecrawl-cache.cjs for disk I/O.
</purpose>

<required_reading>
@bin/lib/firecrawl-cache.cjs
@bin/lib/mcp-bridge.cjs
</required_reading>

<process>

## /pde:firecrawl — Firecrawl MCP Tool Dispatcher

Parse the first token of $ARGUMENTS to determine the subcommand:

- `scrape` → [Subcommand: scrape](#subcommand-scrape-url---force)
- `search` → [Subcommand: search](#subcommand-search-query---limit-n---category-cat---since-date)
- `map` → [Subcommand: map](#subcommand-map-url---search-filter---subdomains)
- `extract` → [Subcommand: extract](#subcommand-extract-url---schema-json)
- `crawl` → [Subcommand: crawl](#subcommand-crawl-url---limit-n---max-depth-n)
- No subcommand or unrecognized → [Usage help](#default-no-subcommand-or-help)

---

### Subcommand: scrape URL [--force]

**Purpose:** Scrape a single URL to clean markdown via Firecrawl, cache the result.

**Step 1: Credit guard check**

```bash
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

Parse the JSON result:
- If `result.available === false`: Display `Error: Firecrawl unavailable — {result.reason}. Falling back to WebFetch.` Use WebFetch to fetch the URL content, write to cache via writeSource, then halt Firecrawl path.
- If `result.warning === true`: Display `Warning: Firecrawl credits at {result.credits.remaining}/{result.credits.total} — approaching limit.` Continue.
- If `result.available === true`: Continue.

**Step 2: Acquire concurrency semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); const s = m.acquireFirecrawlSemaphore(); console.log(JSON.stringify({lockPath: s.lockPath}));"
```

Record the semaphore handle. Release after Step 4.

**Step 3: Call mcp__firecrawl__firecrawl_scrape**

```
mcp__firecrawl__firecrawl_scrape({
  url: URL,
  onlyMainContent: true
})
```

`onlyMainContent: true` is always the default (SCR-01).

If `--force` flag present, skip the cache check in Step 5 (force overwrite).

**Step 4: Track credits + release semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(1);"
```

Scrape costs 1 credit. Release semaphore.

**Step 5: Write to cache**

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const content = require('fs').readFileSync('/tmp/pde-firecrawl-scrape.md', 'utf-8');
const r = c.writeSource('THE_URL', content, { type: 'scrape', added_by: 'pde:firecrawl scrape' }, { force: FORCE_FLAG });
console.log(JSON.stringify(r));
"
```

**Step 6: Display result**

```
Scraped {url}
  Cached at: .planning/research/firecrawl-cache/scrapes/{slug}.md
  Word count: {word_count}
  Status: {cached|written}
```

Display the scraped markdown content.

---

### Subcommand: search QUERY [--limit N] [--category CAT] [--since DATE]

**Purpose:** Search the web via Firecrawl with optional filters. Cache any scraped result content from search results.

**Step 1: Parse arguments**

```
SET QUERY = all tokens before first -- flag (or all tokens if no flags)
SET LIMIT = value after --limit (default: 5)
SET CATEGORY = value after --category (optional)
SET SINCE = value after --since (optional, ISO date string)
```

**Step 2: Credit guard check**

```bash
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

If `result.available === false`: Display `Error: Firecrawl unavailable — {result.reason}. Falling back to WebSearch.` Use WebSearch with QUERY, display results, halt Firecrawl path.
If `result.warning === true`: Display credit warning. Continue.

**Step 3: Call mcp__firecrawl__firecrawl_search**

```
mcp__firecrawl__firecrawl_search({
  query: QUERY,
  limit: LIMIT,
  searchOptions: {
    ...(CATEGORY && { category: CATEGORY }),
    ...(SINCE && { after: SINCE })
  }
})
```

**Step 4: Track credits**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(0.2);"
```

**Step 5: Cache scraped results (SCR-05)**

If the search results contain scraped content (i.e., individual result items have a `content` or `markdown` field from scrapeOptions), cache each via writeSource:

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const r = c.writeSource('RESULT_URL', 'RESULT_CONTENT', { type: 'search-scrape', added_by: 'pde:firecrawl search' });
console.log(JSON.stringify(r));
"
```

Run for each result with content. Track credits for each scraped result: `incrementFirecrawlUsage(1)` per page scraped.

**Step 6: Display results**

Format as table:

```
Search results for: {query}
Found {N} results

| # | Title | URL | Description |
|---|-------|-----|-------------|
| 1 | ...   | ... | ...         |
...
```

---

### Subcommand: map URL [--search FILTER] [--subdomains]

**Purpose:** Discover all URLs on a site via Firecrawl map tool.

**Step 1: Parse arguments**

```
SET URL = first argument after "map"
SET SEARCH_FILTER = value after --search (optional)
SET INCLUDE_SUBDOMAINS = true if --subdomains flag present, else false
```

**Step 2: Credit guard check**

```bash
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

If `result.available === false`: Display `Error: Firecrawl unavailable — {result.reason}. Attempting WebFetch on sitemap.xml.` Fetch `{URL}/sitemap.xml` via WebFetch and display URLs found. Halt Firecrawl path.
If `result.warning === true`: Display credit warning. Continue.

**Step 3: Call mcp__firecrawl__firecrawl_map**

```
mcp__firecrawl__firecrawl_map({
  url: URL,
  ...(SEARCH_FILTER && { search: SEARCH_FILTER }),
  ...(INCLUDE_SUBDOMAINS && { includeSubdomains: true })
})
```

**Step 4: Track credits**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(0.5);"
```

**Step 5: Display results**

```
Found {N} URLs on {url}
{optionally filtered by: SEARCH_FILTER}

URLs:
  1. https://example.com/page1
  2. https://example.com/page2
  ...
```

---

### Subcommand: extract URL --schema JSON

**Purpose:** Extract structured data from a page using Firecrawl's LLM-powered extraction with a user-supplied JSON schema.

**Step 1: Parse arguments**

```
SET URL = first argument after "extract"
SET SCHEMA_STRING = value after --schema flag
```

**Validate --schema:**
- If `--schema` is missing: Display the following and halt:
  ```
  Error: --schema is required for the extract subcommand.
  Usage: /pde:firecrawl extract URL --schema '{"type":"object","properties":{...}}'
  Example: /pde:firecrawl extract https://example.com/pricing --schema '{"type":"object","properties":{"tiers":{"type":"array"},"price":{"type":"string"}}}'
  ```
- Parse SCHEMA_STRING as JSON. If invalid JSON: Display `Error: Invalid JSON in --schema: {parse error}` and halt.

**CRITICAL (SCR-04): The schema is ALWAYS passed as a parameter from $ARGUMENTS. Never hard-code a schema in this workflow.**

**Step 2: Credit guard check**

```bash
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

If `result.available === false`: Display `Error: Firecrawl extract requires Firecrawl MCP — {result.reason}. No fallback available for structured extraction. Resolve and retry.` Halt.
If `result.warning === true`: Display credit warning. Note that extract costs 5 credits. Continue.

**Step 3: Call mcp__firecrawl__firecrawl_extract**

```
mcp__firecrawl__firecrawl_extract({
  url: URL,
  schema: PARSED_SCHEMA
})
```

The PARSED_SCHEMA is the JSON object parsed from `--schema` in Step 1.

**Step 4: Track credits**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(5);"
```

Extract costs 5 credits (LLM extraction).

**Step 5: Display results**

```
Extracted structured data from {url}
Schema keys: {schema_top_level_keys}

{extracted JSON data, pretty-printed}
```

---

### Subcommand: crawl URL [--limit N] [--max-depth N]

**Purpose:** Crawl an entire site via Firecrawl, enforcing the FIRECRAWL_CRAWL_MAX_PAGES cap to prevent runaway credit burn (CRL-01).

**Step 1: Parse and cap limit**

Parse arguments:
```
SET REQUESTED_LIMIT = value after --limit (default: 50)
SET MAX_DEPTH = value after --max-depth (default: 3)
```

Read the crawl cap from environment:
```bash
node -e "console.log(parseInt(process.env.FIRECRAWL_CRAWL_MAX_PAGES || '50', 10))"
```

Apply cap enforcement:
```
IF REQUESTED_LIMIT > FIRECRAWL_CRAWL_MAX_PAGES:
  Display: "Warning: Requested {REQUESTED_LIMIT} pages exceeds FIRECRAWL_CRAWL_MAX_PAGES cap ({FIRECRAWL_CRAWL_MAX_PAGES}). Truncating to {FIRECRAWL_CRAWL_MAX_PAGES}."
  SET EFFECTIVE_LIMIT = FIRECRAWL_CRAWL_MAX_PAGES
ELSE:
  SET EFFECTIVE_LIMIT = REQUESTED_LIMIT
```

**Step 2: Credit guard check**

```bash
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

If `result.available === false`: Display `Error: Firecrawl unavailable — {result.reason}. No fallback available for multi-page crawl.` Halt.
If `result.warning === true`: Display `Warning: Firecrawl credits at {result.credits.remaining}/{result.credits.total} — crawl will cost up to {EFFECTIVE_LIMIT} credits.` Continue.

**Step 3: Acquire semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); const s = m.acquireFirecrawlSemaphore(); console.log(JSON.stringify({lockPath: s.lockPath}));"
```

**Step 4: Call mcp__firecrawl__firecrawl_crawl**

```
mcp__firecrawl__firecrawl_crawl({
  url: URL,
  limit: EFFECTIVE_LIMIT,
  maxDepth: MAX_DEPTH,
  scrapeOptions: {
    formats: ["markdown"],
    onlyMainContent: true
  }
})
```

This returns a `jobId` (crawl is asynchronous).

**Step 5: Poll for completion (5-minute timeout)**

Track start time. Poll every 5 seconds:

```
mcp__firecrawl__firecrawl_check_crawl_status({
  id: JOB_ID
})
```

After each poll:
- If status is `completed` or all pages are done: Exit loop.
- If status is `scraping` or `crawling`: Display `Crawled {completed_count} pages so far...` Continue polling.
- If elapsed time > 300 seconds (5 minutes): Display `Warning: Crawl timed out after 5 minutes. Collecting {N} partial results.` Break loop.

**Step 6: Track credits + release semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(PAGE_COUNT);"
```

Replace PAGE_COUNT with the actual number of pages crawled (1 credit per page). Release semaphore.

**Step 7: Write to cache**

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const pages = JSON.parse(require('fs').readFileSync('/tmp/pde-firecrawl-crawl.json', 'utf-8'));
const r = c.writeCrawl('THE_URL', pages, { added_by: 'pde:firecrawl crawl' });
console.log(JSON.stringify(r));
"
```

**Step 8: Display result**

```
Crawled {N} pages from {url}
  Cached at: .planning/research/firecrawl-cache/crawls/{slug}/
  Page count: {N}
  Credits used: {N}
  {if timeout warning: "Note: Partial results — crawl timed out after 5 minutes."}
```

---

### Default: No subcommand or help

Display usage:

```
/pde:firecrawl — Direct Firecrawl MCP tool access

Usage: /pde:firecrawl <subcommand> [options]

Subcommands:
  scrape URL [--force]
    Scrape a URL to clean markdown. Caches result.
    Cost: 1 credit/call

  search QUERY [--limit N] [--category CAT] [--since DATE]
    Search the web. Caches scraped result content if included.
    Cost: 0.2 credits/search
    Default limit: 5

  map URL [--search FILTER] [--subdomains]
    Discover all URLs on a site.
    Cost: ~0.5 credits/call

  extract URL --schema JSON
    Extract structured JSON from a page using an LLM-powered schema.
    Cost: 5 credits/call (IMPORTANT: schema is required — never hard-coded)

  crawl URL [--limit N] [--max-depth N]
    Crawl entire sites. Enforces FIRECRAWL_CRAWL_MAX_PAGES cap (default: 50).
    Cost: 1 credit/page
    Default limit: 50, default max-depth: 3

Examples:
  /pde:firecrawl scrape https://example.com/docs
  /pde:firecrawl scrape https://example.com/pricing --force
  /pde:firecrawl search "competitor pricing 2026" --limit 10
  /pde:firecrawl search "react state management" --category technology --since 2026-01-01
  /pde:firecrawl map https://example.com --search pricing --subdomains
  /pde:firecrawl extract https://example.com/pricing --schema '{"type":"object","properties":{"tiers":{"type":"array"},"price":{"type":"string"}}}'
  /pde:firecrawl crawl https://example.com --limit 20 --max-depth 2

Credit guard: Every subcommand checks Firecrawl credit balance before calling the API.
Cache: All output is stored in .planning/research/firecrawl-cache/ via firecrawl-cache.cjs.
Cap: Crawl requests above FIRECRAWL_CRAWL_MAX_PAGES are automatically truncated.
```

</process>
