<purpose>
Ingest a web URL as source material into the firecrawl-cache pipeline. Scrapes content via Firecrawl MCP (with WebFetch fallback), writes through firecrawl-cache.cjs for all disk I/O, and updates the sources manifest. Supports idempotent caching with --force override.
</purpose>

<required_reading>
@bin/lib/firecrawl-cache.cjs
@bin/lib/mcp-bridge.cjs
</required_reading>

<flags>

## Supported Flags

| Flag | Type | Default | Behavior |
|------|------|---------|----------|
| `--force` | Boolean | false | Re-scrape and overwrite existing cached content even if already cached |
| `--type` | String | scrape | Ingestion type: `scrape` (single page) or `crawl` (multi-page site crawl, up to 50 pages) |

</flags>

<process>

## /pde:source add — Source Material Ingestion Pipeline

### Step 1/6: Validate Input

Parse URL and flags from $ARGUMENTS:

```
SET URL = first argument after "add" that starts with http:// or https://
SET FORCE = true if --force flag present, else false
SET TYPE = value after --type flag if present, else "scrape"
```

**Validate URL format:**
- Must start with `http://` or `https://`
- If invalid, display error and halt:
  ```
  Error: Invalid URL format. URL must start with http:// or https://
  Usage: /pde:source add https://example.com [--force] [--type scrape|crawl]
  ```

**Validate --type value:**
- Must be `scrape` or `crawl`
- If invalid, display error and halt:
  ```
  Error: Invalid type "VALUE". Must be "scrape" or "crawl".
  ```

---

### Step 2/6: Check Cache (Idempotent)

Compute the slug for the URL:

```bash
node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); console.log(c.slugifyUrl('THE_URL'))"
```

Check if content is already cached:

```bash
node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); const r = c.readSource('THE_SLUG'); console.log(r ? 'CACHED' : 'MISS')"
```

**If CACHED and FORCE is false:**
- Display: "Source already cached at slug: THE_SLUG. Use --force to re-scrape."
- Show the cached file path and exit early (no re-scrape needed).

**If CACHED and FORCE is true:**
- Display: "Force flag set. Re-scraping THE_URL..."
- Continue to Step 3.

**If MISS:**
- Display: "Source not cached. Scraping THE_URL..."
- Continue to Step 3.

---

### Step 3/6: Probe Firecrawl Availability

Check Firecrawl credit status before making any API calls:

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); const r = m.checkFirecrawlCredits(); console.log(JSON.stringify(r))"
```

Parse the result:

- **If `allowed: false` (quota_exhausted):** Display warning, fall back to WebFetch path (Step 4b).
- **If `reason: 'quota_warning'`:** Display credit warning with percentage, then proceed with Firecrawl (Step 4a).
- **If `allowed: true`:** Proceed with Firecrawl (Step 4a).

---

### Step 4a/6: Scrape/Crawl via Firecrawl

**For TYPE = scrape (default):**

Call the Firecrawl scrape MCP tool:

```
mcp__firecrawl__firecrawl_scrape({
  url: "THE_URL",
  formats: ["markdown"],
  onlyMainContent: true
})
```

Extract the markdown content from the response.

**For TYPE = crawl:**

Call the Firecrawl crawl MCP tool:

```
mcp__firecrawl__firecrawl_crawl({
  url: "THE_URL",
  limit: 50,
  scrapeOptions: {
    formats: ["markdown"],
    onlyMainContent: true
  }
})
```

Extract the pages array from the response. Each page should have a `url` and markdown `content`.

**After successful scrape/crawl, track credit usage:**

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(1)"
```

For crawl, use the actual page count as the credit cost:

```bash
node -e "const m = require('./bin/lib/mcp-bridge.cjs'); m.incrementFirecrawlUsage(PAGE_COUNT)"
```

Proceed to Step 5.

---

### Step 4b/6: Fallback — WebFetch (when Firecrawl unavailable)

If Firecrawl credits are exhausted or Firecrawl MCP is not available:

Use the WebFetch tool to fetch the URL content:

```
WebFetch({ url: "THE_URL" })
```

Extract the text/markdown content from the response.

**Note:** WebFetch does not render JavaScript — content quality may be lower for JS-rendered sites. Display a notice:

```
Note: Content fetched via WebFetch fallback (Firecrawl unavailable).
JS-rendered content may be incomplete. Re-run with Firecrawl when credits are available.
```

Proceed to Step 5.

---

### Step 5/6: Write to Cache

All disk I/O goes through firecrawl-cache.cjs. Never write directly to .planning/research/firecrawl-cache/.

**For TYPE = scrape:**

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const content = require('fs').readFileSync('/tmp/pde-source-content.md', 'utf-8');
const r = c.writeSource('THE_URL', content, { type: 'scrape', added_by: 'source-add' }, { force: FORCE_FLAG });
console.log(JSON.stringify(r));
"
```

**For TYPE = crawl:**

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const pages = JSON.parse(require('fs').readFileSync('/tmp/pde-source-pages.json', 'utf-8'));
const r = c.writeCrawl('THE_URL', pages, { added_by: 'source-add' }, { force: FORCE_FLAG });
console.log(JSON.stringify(r));
"
```

Parse the result to get slug, path, and written status.

---

### Step 6/6: Confirm

Display a summary of what was done:

```
Source added successfully.

  Slug:        THE_SLUG
  URL:         THE_URL
  Type:        scrape|crawl
  Cached at:   THE_PATH
  Word count:  WORD_COUNT
  Method:      Firecrawl|WebFetch fallback

Manifest now contains N source(s).
```

Read the manifest to get the source count:

```bash
node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); const m = c.readManifest(); console.log(m.sources.length)"
```

</process>
