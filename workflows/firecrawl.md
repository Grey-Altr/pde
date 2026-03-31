<purpose>
Direct Firecrawl MCP tool access — scrape, search, map, extract, crawl, autonomous agent research, and browser sandbox (interact) with credit guards, consent gates, cache integration, and crawl cap enforcement. All Firecrawl output flows through firecrawl-cache.cjs for disk I/O. Agent and interact subcommands require explicit user consent before dispatch due to variable and potentially high credit costs.
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
- `agent` → [Subcommand: agent](#subcommand-agent-query---max-credits-n---model-minipro---urls-url1url2)
- `agent-status` → [Subcommand: agent-status](#subcommand-agent-status-job_id)
- `interact` → [Subcommand: interact](#subcommand-interact-url---playwright-code_file---prompt-text)
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

### Subcommand: agent QUERY [--max-credits N] [--model mini|pro] [--urls URL1,URL2]

**Purpose:** Delegate autonomous natural language web research to Firecrawl's agent with a mandatory consent gate and credit cap. The agent performs multi-domain research across multiple URLs and returns structured results.

**Step 1: Parse arguments**

```
SET QUERY = all tokens before first -- flag (or all tokens if no flags)
SET MAX_CREDITS = value after --max-credits (default: 500)
SET MODEL = value after --model ("spark-1-mini" default, "spark-1-pro" if "pro" specified)
SET URLS = comma-split value after --urls (optional, list of URLs to restrict research to)
SET SCHEMA_STRING = value after --schema (optional, JSON schema for structured output)
```

If `--schema` is provided, parse SCHEMA_STRING as JSON. If invalid JSON: Display `Error: Invalid JSON in --schema: {parse error}` and halt.

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

If `result.available === false`: Display `Error: Firecrawl unavailable — {result.reason}. Cannot dispatch agent.` Halt.
If `result.warning === true`: Display `Warning: Firecrawl credits at {result.credits.remaining}/{result.credits.total} — approaching limit. Agent may use up to {MAX_CREDITS} credits.` Continue.

**Step 3: Consent gate (REQUIRED — agent does NOT proceed without explicit user confirmation)**

Display the following consent prompt:

```
Firecrawl Agent Research
  Query: {QUERY}
  Credit cap: {MAX_CREDITS} (use --max-credits N to adjust)
  Model: {MODEL}
  Current balance: {result.credits.remaining} credits
  Estimated cost: up to {MAX_CREDITS} credits (most runs: a few hundred)

  Note: maxCredits may be advisory-only if the MCP tool does not accept this parameter.
  The consent gate is the primary safety mechanism regardless.

  Proceed? Type "yes" to confirm, anything else to cancel.
```

Wait for user response.

IF user does not respond "yes": Display "Agent dispatch cancelled." and halt immediately. Do NOT proceed to Step 4.

**Step 4: Acquire semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); const s = m.acquireFirecrawlSemaphore(); console.log(JSON.stringify({lockPath: s.lockPath}));"
```

Record the semaphore handle. Release after Step 7.

**Step 5: Call mcp__firecrawl__firecrawl_agent**

```
mcp__firecrawl__firecrawl_agent({
  prompt: QUERY,
  maxCredits: MAX_CREDITS,
  ...(URLS && URLS.length > 0 && { urls: URLS }),
  ...(SCHEMA_STRING && { schema: PARSED_SCHEMA })
})
```

This returns `{ id: "agent-job-xxxx" }` immediately (asynchronous dispatch). Record JOB_ID from `result.id`.

**Step 6: Poll mcp__firecrawl__firecrawl_agent_status (5-minute timeout)**

Track start time (POLL_START). Poll every 15 seconds:

```
mcp__firecrawl__firecrawl_agent_status({ id: JOB_ID })
```

After each poll:
- Calculate elapsed = (current time - POLL_START) in seconds.
- If status is `processing`: Display `Agent processing... ({elapsed}s elapsed)` Continue polling.
- If status is `completed`: Exit loop and continue to Step 7.
- If status is `failed`: Display `Agent job failed: {result.error}` Release semaphore. Halt.
- If status is `cancelled`: Display `Agent job was cancelled.` Release semaphore. Halt.
- If elapsed > 300 seconds (5 minutes): Display the following and halt:
  ```
  Agent timed out after 5 minutes. Job is still running.
  Job ID: {JOB_ID}
  To check status later: /pde:firecrawl agent-status {JOB_ID}
  Results are retained for 24 hours.
  ```
  Release semaphore. Halt.

**Step 7: Track credits + release semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(CREDITS_USED || MAX_CREDITS);"
```

Replace CREDITS_USED with `result.creditsUsed` from the completed agent status response. If `result.creditsUsed` is absent or zero, fall back to MAX_CREDITS as a conservative over-deduct. Release semaphore.

**Step 8: Cache results**

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const content = JSON.stringify(RESULT_DATA, null, 2);
const r = c.writeSource('firecrawl-agent-JOB_ID', content,
  { type: 'agent', added_by: 'pde:firecrawl agent' });
console.log(JSON.stringify(r));
"
```

Replace RESULT_DATA with `result.data` from the completed status response. Replace JOB_ID with the actual job ID string.

**Step 9: Display results**

```
Agent completed — {JOB_ID}
  Credits used: {result.creditsUsed}
  Cached at: .planning/research/firecrawl-cache/scrapes/firecrawl-agent-{JOB_ID}.md

  {pretty-printed result.data}
```

---

### Subcommand: agent-status JOB_ID

**Purpose:** Check the status of an in-progress or completed agent job and display results when complete.

**Step 1: Parse arguments**

```
SET JOB_ID = first argument after "agent-status"
```

If JOB_ID is missing: Display the following and halt:
```
Error: job ID required.
Usage: /pde:firecrawl agent-status <job-id>
Example: /pde:firecrawl agent-status agent-job-abc123
```

**Step 2: Call mcp__firecrawl__firecrawl_agent_status**

```
mcp__firecrawl__firecrawl_agent_status({ id: JOB_ID })
```

**Step 3: Display result based on status**

If status is `processing`:
```
Agent {JOB_ID} is still running.
Re-run /pde:firecrawl agent-status {JOB_ID} to check again.
Note: Firecrawl retains results for 24 hours after completion.
```

If status is `completed`:
```
Agent {JOB_ID} completed.
  Credits used: {result.creditsUsed}

  {pretty-printed result.data}
```

If status is `failed`:
```
Agent {JOB_ID} failed.
  Error: {result.error}
```

If status is `cancelled`:
```
Agent job {JOB_ID} was cancelled.
```

---

### Subcommand: interact URL [--playwright CODE_FILE | --prompt TEXT] [--language node|python|bash]

**Purpose:** Launch a cloud browser sandbox session via Firecrawl to extract content from auth-gated or JavaScript-heavy pages. Supports both natural language prompts and Playwright code execution inside the live session.

**Note:** This subcommand is documented here for routing purposes. Full implementation is in Plan 02.

**Step 1: Parse arguments**

```
SET URL = first argument after "interact"
SET CODE_FILE = path after --playwright (optional)
SET NATURAL_PROMPT = value after --prompt (optional)
SET LANGUAGE = value after --language (default: "node")
```

If neither `--playwright` nor `--prompt` is provided: Display the following and halt:
```
Error: --playwright or --prompt is required for the interact subcommand.
Usage: /pde:firecrawl interact URL [--playwright CODE_FILE | --prompt "TEXT"] [--language node|python|bash]
Example: /pde:firecrawl interact https://example.com --prompt "extract the pricing table"
Example: /pde:firecrawl interact https://app.example.com --playwright my-script.js --language node
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

If `result.available === false`: Display `Error: Firecrawl unavailable — {result.reason}. Cannot launch browser session.` Halt.
If `result.warning === true`: Display credit warning noting browser sessions cost 2–7 credits/minute. Continue.

**Step 3: Consent gate (REQUIRED — interact does NOT proceed without explicit user confirmation)**

Determine rate: If `--prompt` is provided (AI-assisted), rate = 7 credits/min. If `--playwright` only, rate = 2 credits/min.

Display:
```
Firecrawl Browser Sandbox
  URL: {URL}
  Session TTL: 10 minutes (auto-terminated)
  Idle TTL: 5 minutes (auto-terminated if no activity)
  Credit cost: {rate} credits/minute
  Estimated max cost (full 10min session): {10 * rate} credits
  Current balance: {result.credits.remaining} credits

  Proceed? Type "yes" to confirm, anything else to cancel.
```

IF user does not respond "yes": Display "Browser session cancelled." and halt immediately. Do NOT proceed to Step 4.

**Step 4: Acquire semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); const s = m.acquireFirecrawlSemaphore(); console.log(JSON.stringify({lockPath: s.lockPath}));"
```

**Step 5: Scrape URL to obtain scrapeId**

```
mcp__firecrawl__firecrawl_scrape({
  url: URL,
  onlyMainContent: false
})
```

Extract `scrapeId` from `response.metadata.scrapeId`. Track 1 credit for the scrape:

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(1);"
```

If `scrapeId` is absent from response: Display `Error: Could not obtain scrapeId from initial scrape. The interact subcommand requires a valid scrapeId.` Release semaphore. Halt.

**Step 6: Read code if --playwright flag used**

If `--playwright` provided: Read CODE_FILE content as CODE_STRING.
If `--prompt` provided: CODE_STRING = null; NATURAL_PROMPT is used as the prompt parameter.

**Step 7: Call mcp__firecrawl__firecrawl_interact**

```
mcp__firecrawl__firecrawl_interact({
  scrapeId: SCRAPE_ID,
  ...(CODE_STRING && { code: CODE_STRING, language: LANGUAGE }),
  ...(NATURAL_PROMPT && { prompt: NATURAL_PROMPT }),
  timeout: 30
})
```

**Step 8: Track credits + release semaphore**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(2);"
```

Track 2 credits as a floor estimate (conservative minimum). Actual billing is determined by Firecrawl cloud based on session duration and mode. Users should verify actual usage in the Firecrawl dashboard. Release semaphore.

**Step 9: Cache result**

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const r = c.writeSource('SCRAPE_ID', RESULT_CONTENT,
  { type: 'interact', added_by: 'pde:firecrawl interact' });
console.log(JSON.stringify(r));
"
```

Replace SCRAPE_ID with the actual scrape ID and RESULT_CONTENT with the returned markdown or structured data.

**Step 10: Display result**

```
Browser session completed
  Session: {SCRAPE_ID}
  Cached at: .planning/research/firecrawl-cache/scrapes/{slug}.md
  Note: Session TTL is 10 minutes. Re-run /pde:firecrawl interact {URL} for a new session.

  {result markdown or structured data}
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

  agent QUERY [--max-credits N] [--model mini|pro] [--urls URL1,URL2]
    Delegate autonomous multi-domain web research to Firecrawl's agent.
    Requires explicit consent before dispatch. Results cached on completion.
    Cost: variable (up to max-credits cap, default 500)
    Default max-credits: 500 (use --max-credits N to adjust)

  agent-status JOB_ID
    Check the status of an in-progress or completed agent job and display results.
    Cost: free (status check only)

  interact URL [--playwright CODE_FILE | --prompt TEXT] [--language node|python|bash]
    Launch a cloud browser sandbox session for auth-gated or JS-heavy content.
    Requires explicit consent before dispatch. Session auto-terminates at TTL.
    Cost: 2–7 credits/minute (code-only: 2/min; with AI prompt: 7/min)
    Session TTL: 10 minutes total, 5 minutes idle
    (Implemented in Plan 02)

Examples:
  /pde:firecrawl scrape https://example.com/docs
  /pde:firecrawl scrape https://example.com/pricing --force
  /pde:firecrawl search "competitor pricing 2026" --limit 10
  /pde:firecrawl search "react state management" --category technology --since 2026-01-01
  /pde:firecrawl map https://example.com --search pricing --subdomains
  /pde:firecrawl extract https://example.com/pricing --schema '{"type":"object","properties":{"tiers":{"type":"array"},"price":{"type":"string"}}}'
  /pde:firecrawl crawl https://example.com --limit 20 --max-depth 2
  /pde:firecrawl agent "research React server components vs Next.js App Router" --max-credits 500
  /pde:firecrawl agent-status agent-job-abc123
  /pde:firecrawl interact https://example.com --prompt "extract the pricing table"

Credit guard: Every subcommand checks Firecrawl credit balance before calling the API.
Consent gate: agent and interact subcommands require explicit "yes" confirmation before dispatch.
Cache: All output is stored in .planning/research/firecrawl-cache/ via firecrawl-cache.cjs.
Cap: Crawl requests above FIRECRAWL_CRAWL_MAX_PAGES are automatically truncated.
```

</process>
