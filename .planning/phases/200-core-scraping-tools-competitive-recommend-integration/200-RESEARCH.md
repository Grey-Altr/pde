# Phase 200: Core Scraping Tools + Competitive/Recommend Integration - Research

**Researched:** 2026-03-30
**Domain:** Firecrawl MCP tool surface, firecrawl-cache.cjs, competitive/recommend workflow integration
**Confidence:** HIGH

## Summary

Phase 200 has three separable work streams that can be planned in parallel tasks: (1) expose all five Firecrawl scraping/search tools inline with full credit guard + cache integration, (2) enforce the credit safety cap on firecrawl_crawl via FIRECRAWL_CRAWL_MAX_PAGES, and (3) upgrade two existing workflows (competitive.md, recommend.md) to use Firecrawl as their primary web intelligence layer with graceful WebSearch fallback.

The infrastructure from Phases 198 and 199 is complete. TOOL_MAP entries for all Firecrawl tools already exist in mcp-bridge.cjs (lines 262-274, all marked TOOL_MAP_VERIFY_REQUIRED). The credit guard functions (`checkFirecrawlCredits`, `incrementFirecrawlUsage`, `acquireFirecrawlSemaphore`, `probeFirecrawl`) are all implemented in mcp-bridge.cjs. The firecrawl-cache.cjs module provides `writeSource`, `writeCrawl`, `readSource`, and `readManifest` for disk I/O. What Phase 200 adds is the workflow layer: command files, workflow prose files, and edits to competitive.md and recommend.md.

The competitive.md and recommend.md workflows currently have zero FIRECRAWL references — confirmed by grep against the worktree copies. Phase 200 adds the probe block (check FIRECRAWL_AVAILABLE), the Firecrawl-enhanced paths (firecrawl_search + firecrawl_extract for competitor data), and the fallback path (WebSearch if unavailable). The recommend.md workflow requires a dual-probe (both WebSearch and Firecrawl) per the CONTEXT.md constraint.

**Primary recommendation:** Build the five inline tool commands as thin wrappers that call Firecrawl MCP tools, pass output through firecrawl-cache.cjs, and enforce credit guard. Edit competitive.md and recommend.md to add Firecrawl probe blocks before their existing Step 3 MCP probe sections. Add the crawl cap guard as a parameter validation step in the firecrawl crawl command wrapper.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None explicitly locked — this is an auto-generated infrastructure phase with all decisions at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md (treated as locked):
- Phases 200 and 201 can run in parallel once 198+199 are done — Phase 200 only needs TOOL_MAP (Phase 198)
- firecrawl_crawl must enforce FIRECRAWL_CRAWL_MAX_PAGES limit (50 pages default) — requests above cap truncated with user notification
- competitive.md must check FIRECRAWL_AVAILABLE before calling Firecrawl tools — graceful fallback to WebSearch
- recommend.md dual-probe: check both WebSearch and Firecrawl availability
- CRL-01 (full site crawl) belongs in Phase 200 with scraping tools — crawl is superset of map+scrape
- All Firecrawl output must flow through firecrawl-cache.cjs (Phase 199 dependency)

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCR-01 | User can scrape any URL to clean markdown via firecrawl_scrape MCP tool with onlyMainContent default | mcp__firecrawl__scrape tool in TOOL_MAP; firecrawl-cache.cjs writeSource for storage; command wrapper needed |
| SCR-02 | User can search the web via firecrawl_search MCP tool with source, category, and time filters | mcp__firecrawl__search tool in TOOL_MAP; no cache write needed (search results are ephemeral) |
| SCR-03 | User can discover all URLs on a site via firecrawl_map MCP tool with search filtering and subdomain control | mcp__firecrawl__map tool in TOOL_MAP; output is URL list, no cache write needed |
| SCR-04 | User can extract structured JSON from pages via firecrawl_extract with schema definitions | mcp__firecrawl__extract tool in TOOL_MAP; schema passed as parameter, not hard-coded |
| SCR-05 | User can search and immediately scrape top results in a single firecrawl_search call with scrapeOptions | Single firecrawl_search call with scrapeOptions param; cache each scraped result via writeSource |
| CRL-01 | User can crawl entire sites via firecrawl_crawl with enforced --limit and --max-depth defaults preventing runaway credit burn | FIRECRAWL_CRAWL_MAX_PAGES=50 cap enforced in workflow prose; truncate + notify user |
| PIP-01 | Competitive analysis workflow uses Firecrawl to crawl competitor sites and extract pricing, features, and positioning | competitive.md needs FIRECRAWL_AVAILABLE probe block + firecrawl_search/extract enhancement in Step 4 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp-bridge.cjs` (existing) | n/a | TOOL_MAP lookup, probeFirecrawl(), checkFirecrawlCredits(), acquireFirecrawlSemaphore() | All Phase 198 credit guard infrastructure lives here — Phase 200 calls it, does not extend it |
| `firecrawl-cache.cjs` (existing) | n/a | writeSource(), writeCrawl(), readSource(), readManifest() | Phase 199 delivered this; Phase 200 consumes it for all disk I/O |
| `mcp__firecrawl__*` tools (existing) | n/a | The five Firecrawl MCP tools exposed to Claude Code | Already in TOOL_MAP (TOOL_MAP_VERIFY_REQUIRED entries) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `commands/*.md` (existing pattern) | n/a | Thin command dispatcher files that route to workflow prose | One per new /pde:firecrawl subcommand |
| `workflows/competitive.md` (existing) | n/a | Must be edited to add FIRECRAWL_AVAILABLE probe block | Edit, not replace |
| `workflows/recommend.md` (existing) | n/a | Must be edited to add dual-probe (WebSearch + Firecrawl) | Edit, not replace |

**Installation:** No new dependencies. Phase 200 is pure workflow prose + command file creation.

## Architecture Patterns

### Recommended File Structure (changes only)

```
commands/
  firecrawl.md           # NEW: dispatcher for /pde:firecrawl subcommands (scrape/search/map/extract/crawl)
workflows/
  competitive.md         # MODIFIED: add FIRECRAWL_AVAILABLE probe block in Step 3, enhance Step 4 with firecrawl_search + firecrawl_extract
  recommend.md           # MODIFIED: add dual-probe (WebSearch + Firecrawl) in Step 3, enhance Step 4c catalog with Firecrawl-discovered tools
  firecrawl.md           # NEW: workflow prose for /pde:firecrawl command (five subcommands)
tests/
  phase-200/
    firecrawl-scrape-command.test.mjs   # NEW: credit guard call, cache write, onlyMainContent default
    firecrawl-crawl-cap.test.mjs        # NEW: FIRECRAWL_CRAWL_MAX_PAGES enforcement
    competitive-firecrawl-probe.test.mjs # NEW: FIRECRAWL_AVAILABLE probe + fallback contract
    recommend-dual-probe.test.mjs        # NEW: dual-probe contract
```

### Pattern 1: Firecrawl Command Dispatcher (commands/firecrawl.md)

**What:** Single command file routing /pde:firecrawl subcommands
**When to use:** Mirrors the /pde:source command pattern (commands/source.md routes to @workflows/source.md)

```markdown
---
name: pde:firecrawl
description: Direct Firecrawl MCP tool access — scrape, search, map, extract, crawl
argument-hint: "scrape URL [--force] | search QUERY [--limit N] | map URL | extract URL --schema JSON | crawl URL [--limit N] [--max-depth N]"
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
  - WebSearch
  - WebFetch
---
<objective>
Execute the /pde:firecrawl command. Parse $ARGUMENTS to determine the subcommand and route to @workflows/firecrawl.md.
</objective>

<process>
Follow @workflows/firecrawl.md exactly, passing all of $ARGUMENTS.
</process>
```

**Note:** The allowed-tools list for the command file determines what MCP tools Claude can actually call. All five Firecrawl MCP tools must be listed here. The tool names in allowed-tools must match the raw MCP tool names (verified against TOOL_MAP).

### Pattern 2: Firecrawl Workflow Prose (workflows/firecrawl.md) — scrape subcommand

**What:** Credit guard, MCP call, cache write, output display
**Source:** probeFirecrawl() from mcp-bridge.cjs; writeSource() from firecrawl-cache.cjs

```
### Subcommand: scrape URL [--force]

Step 1: Credit guard check
  Run probeFirecrawl() pattern:
  ```bash
  node --input-type=module <<'PROBE_EOF'
  import { createRequire } from 'module';
  const req = createRequire(import.meta.url);
  const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
  const result = probeFirecrawl();
  process.stdout.write(JSON.stringify(result));
  PROBE_EOF
  ```
  If result.available === false: display error with reason, fall back to WebFetch, halt Firecrawl path.
  If result.warning === true: display warning "Firecrawl credits at {N}/{total} — approaching limit".

Step 2: Acquire concurrency semaphore
  Call acquireFirecrawlSemaphore() before MCP call. Release in Step 4.

Step 3: Call mcp__firecrawl__firecrawl_scrape
  Parameters: { url: URL, onlyMainContent: true }
  (onlyMainContent: true is always the default per SCR-01)

Step 4: Decrement credits + release semaphore
  Call incrementFirecrawlUsage(1) — scrape costs 1 credit.
  Release semaphore.

Step 5: Write to cache
  Call writeSource(url, content, { type: 'scrape', added_by: 'pde:firecrawl scrape' })
  Display: "Scraped {url} -> cached at .planning/research/firecrawl-cache/scrapes/{slug}.md ({word_count} words)"
```

### Pattern 3: Crawl Cap Enforcement (CRL-01)

**What:** FIRECRAWL_CRAWL_MAX_PAGES enforcement before calling mcp__firecrawl__firecrawl_crawl
**Source:** CONTEXT.md constraint "firecrawl_crawl must enforce FIRECRAWL_CRAWL_MAX_PAGES limit (50 pages default)"

```
### Subcommand: crawl URL [--limit N] [--max-depth N]

Step 1: Parse and cap limit
  Parse --limit from $ARGUMENTS (default: 50)
  Read FIRECRAWL_CRAWL_MAX_PAGES from environment (default: 50 if not set)
  IF parsed_limit > FIRECRAWL_CRAWL_MAX_PAGES:
    Display: "Warning: Requested {parsed_limit} pages exceeds FIRECRAWL_CRAWL_MAX_PAGES cap ({cap}). Truncating to {cap}."
    SET effective_limit = FIRECRAWL_CRAWL_MAX_PAGES
  ELSE:
    SET effective_limit = parsed_limit

Step 2: Credit guard check (same as scrape)

Step 3: Call mcp__firecrawl__firecrawl_crawl
  Parameters: { url: URL, limit: effective_limit, maxDepth: max_depth || 3 }
  The crawl is async — returns a jobId.

Step 4: Poll mcp__firecrawl__firecrawl_check_crawl_status until complete
  Poll every 5 seconds. Display progress: "Crawled {N} pages so far..."
  On completion: collect all page results.

Step 5: Decrement credits + release semaphore
  Call incrementFirecrawlUsage(page_count) — crawl costs 1 credit/page.

Step 6: Write to cache via writeCrawl()
  Call writeCrawl(url, pages, { added_by: 'pde:firecrawl crawl' })
  Display: "Crawled {N} pages from {url} -> cached at .planning/research/firecrawl-cache/crawls/{slug}/"
```

### Pattern 4: Extract with Dynamic Schema (SCR-04)

**What:** firecrawl_extract with schema passed as parameter, not hard-coded
**Source:** SCR-04 success criterion "the schema is passed as a parameter, not hard-coded"

```
### Subcommand: extract URL --schema '{"type":"object","properties":{...}}'

Step 1: Parse --schema from $ARGUMENTS
  IF --schema not present: display usage and halt.
  Parse JSON from --schema value. If invalid JSON: display error and halt.

Step 2: Credit guard check

Step 3: Call mcp__firecrawl__firecrawl_extract
  Parameters: { url: URL, schema: parsedSchema }

Step 4: Decrement credits (extract costs 5 credits in JSON mode — use 5 as default)
  Display: "Extracted structured data from {url} (schema: {schema_keys})"
  Display the JSON result.
```

**Important:** The schema is NOT hard-coded in the workflow. The user passes it as a JSON string via --schema. This satisfies the SCR-04 success criterion.

### Pattern 5: competitive.md FIRECRAWL_AVAILABLE Probe Block

**What:** Add Firecrawl probe to competitive.md Step 3 — before the existing analysis step
**Source:** mcp-integration.md "Probe WebSearch MCP" pattern (lines 211-219 of competitive.md already handle WebSearch); CONTEXT.md "competitive.md must check FIRECRAWL_AVAILABLE before calling Firecrawl tools"

Insert this block after the existing Sequential Thinking probe in Step 3/8 of competitive.md:

```
**Probe Firecrawl MCP:**

IF --no-firecrawl NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false:
  Run probeFirecrawl() via node --input-type=module pattern (see mcp-integration.md)
  If result.available === true: SET FIRECRAWL_AVAILABLE = true
    Log: {timestamp} | CMP | firecrawl | probe | success | {duration_ms}
    IF result.warning: emit credit warning to user
  If result.available === false: SET FIRECRAWL_AVAILABLE = false
    Log: {timestamp} | CMP | firecrawl | probe | failure | reason={result.reason} | 0
    Tag: [Firecrawl unavailable ({reason}) -- using WebSearch for competitor intelligence]
ELSE:
  SET FIRECRAWL_AVAILABLE = false
  Log: {timestamp} | CMP | firecrawl | probe | skipped | 0
```

Then in Step 4/8 (competitor profiles, 4a-4f), add Firecrawl enhancement paths:

```
IF FIRECRAWL_AVAILABLE:
  For each competitor URL (from Step 4a):
    1. Call firecrawl_search with query: "{competitor_name} pricing features"
       -> Use top result URLs to get current pricing page
    2. Call firecrawl_extract on competitor pricing page with schema:
       { type: "object", properties: {
           pricing_tiers: { type: "array" },
           features: { type: "array" },
           positioning: { type: "string" }
       }}
    3. Cache extracted data via writeSource() if content is substantial
    Tag: [Enhanced by Firecrawl MCP -- competitor data extracted from live site]
ELSE (WebSearch fallback):
  Use existing WebSearch path (lines 276-288 of competitive.md — this code already exists)
  Tag: [Baseline mode -- Firecrawl unavailable, using WebSearch]
```

**Surgical edit guidance:** The LOCK comments in competitive.md protect Steps 1-3 header, init, prerequisites, and MCP probe sections. The Firecrawl probe addition goes INSIDE the existing Step 3 MCP probe section (which is already OPTIMIZABLE or unlocked for probe additions). Step 4 is marked `<!-- OPTIMIZABLE -->`, so Firecrawl enhancement paths can be added freely.

### Pattern 6: recommend.md Dual-Probe Block

**What:** Add Firecrawl probe to recommend.md Step 3 alongside existing WebSearch probe
**Source:** CONTEXT.md "recommend.md dual-probe: check both WebSearch and Firecrawl availability"

The recommend.md Step 3 already probes mcp-compass, WebSearch, and Sequential Thinking. Add Firecrawl as a fourth probe:

```
**Probe Firecrawl MCP:**

IF --no-firecrawl NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false:
  Run probeFirecrawl() via node --input-type=module pattern
  If result.available === true: SET FIRECRAWL_AVAILABLE = true
  If result.available === false: SET FIRECRAWL_AVAILABLE = false
    Tag: [Firecrawl unavailable -- Firecrawl tool discovery disabled]
ELSE:
  SET FIRECRAWL_AVAILABLE = false
```

Then in Step 4/7 (catalog enrichment), add:

```
IF FIRECRAWL_AVAILABLE:
  After mcp-compass results and WebSearch results, use Firecrawl for deeper tool discovery:
  Call firecrawl_search with query: "MCP servers for {primary_language} {framework} 2026"
    with category: "technology", limit: 10
  Extract tool names, install commands, and star counts from results.
  Deduplicate against catalog results already found.
  Tag: [Enhanced by Firecrawl MCP -- live tool discovery via structured search]
```

**Note:** The recommend.md workflow Firecrawl path augments (does not replace) the existing WebSearch path. Both can run together if both are available.

### Anti-Patterns to Avoid

- **Hard-coding firecrawl_extract schemas in workflow prose:** SCR-04 explicitly requires schema as a parameter. Any hard-coded schema in competitive.md for competitor extraction must be presented as a suggested starting schema the user can override, not a fixed schema.
- **Skipping the cache write:** All Firecrawl output must flow through firecrawl-cache.cjs. Displaying Firecrawl results without caching loses them between sessions.
- **Calling Firecrawl in competitive.md without FIRECRAWL_AVAILABLE check:** The probe must happen in Step 3 before Step 4 begins. Calling MCP tools without the guard risks credit burn if the API key is missing or credits are low.
- **Adding Firecrawl allowed-tools to the command files that already exist:** competitive.md and recommend.md command files currently do NOT list Firecrawl tools in allowed-tools. They must be added or the MCP calls will fail.
- **Polling firecrawl_crawl indefinitely:** The crawl subcommand must time out after a reasonable period (e.g., 5 minutes) and display partial results rather than hanging forever.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Credit check before tool call | Custom credit tracking | `checkFirecrawlCredits()` from mcp-bridge.cjs | Already implemented in Phase 198 |
| Concurrency guard | New queue system | `acquireFirecrawlSemaphore()` from mcp-bridge.cjs | Filesystem semaphore already implemented |
| Cache write after scrape | Direct fs.writeFile calls | `writeSource()` from firecrawl-cache.cjs | Atomic manifest update, slug deduplication, all built in |
| Cache write after crawl | Directory creation logic | `writeCrawl()` from firecrawl-cache.cjs | Per-page file creation and manifest tracking built in |
| URL-to-filename conversion | Custom slug function | `slugifyUrl()` from firecrawl-cache.cjs | Already implemented with deterministic slugging |
| Probe pattern | Inline API key check | `probeFirecrawl()` from mcp-bridge.cjs | Returns `{available, reason, credits, warning}` — all fields needed |

**Key insight:** Phases 198 and 199 built all the plumbing. Phase 200 is entirely about wiring that plumbing into command files and workflow prose. No new utility functions are needed.

## Common Pitfalls

### Pitfall 1: TOOL_MAP_VERIFY_REQUIRED Entries May Have Wrong Prefix

**What goes wrong:** All 12 Firecrawl TOOL_MAP entries are marked TOOL_MAP_VERIFY_REQUIRED because the raw MCP tool name prefix was inferred, not verified against a live server probe. Playwright turned out to use `mcp__plugin_playwright_playwright__*` instead of `mcp__playwright__*`. Firecrawl may similarly have a different prefix.

**Why it happens:** Claude Code assigns MCP tool name prefixes based on the server registration name (`firecrawl` in `claude mcp add firecrawl`). If the npx package uses a different internal name, the prefix changes.

**How to avoid:** The executor for Plan 1 (the first plan that actually calls a Firecrawl MCP tool) MUST run a live probe and verify the prefix. If `mcp__firecrawl__scrape` produces "No such tool available", try `mcp__firecrawl__firecrawl_scrape` (the source.md command file already lists `mcp__firecrawl__firecrawl_scrape` as the tool name — this is a clue that the actual tool name has the double-firecrawl prefix).

**Warning signs:** "No such tool available" when calling the first Firecrawl tool. The source.md allowed-tools list uses `mcp__firecrawl__firecrawl_scrape` (with double `firecrawl`) while TOOL_MAP maps to `mcp__firecrawl__scrape` (single). This discrepancy is a critical find that must be resolved in Plan 1.

**Resolution:** If tools use `mcp__firecrawl__firecrawl_*` pattern, update all 12 TOOL_MAP entries accordingly and mark as TOOL_MAP_VERIFIED.

### Pitfall 2: Missing Firecrawl Tools in Command File allowed-tools

**What goes wrong:** The existing `commands/competitive.md` and `commands/recommend.md` do not list any `mcp__firecrawl__*` tools in their `allowed-tools` frontmatter. Without these entries, Claude Code will refuse to call the tools even if the workflow prose asks it to.

**Why it happens:** The command files were written before Firecrawl integration existed.

**How to avoid:** Edit both command files to add the required Firecrawl tool names to their `allowed-tools` lists. Required additions:
- `commands/competitive.md`: add `mcp__firecrawl__firecrawl_scrape`, `mcp__firecrawl__firecrawl_search`, `mcp__firecrawl__firecrawl_extract`
- `commands/recommend.md`: add `mcp__firecrawl__firecrawl_search`

**Note:** Use the double-firecrawl prefix (`mcp__firecrawl__firecrawl_*`) based on evidence from source.md, pending live verification.

### Pitfall 3: firecrawl_crawl is Async — Requires Poll Loop

**What goes wrong:** firecrawl_crawl returns a jobId immediately, not results. If the workflow treats it like a synchronous scrape, it will receive only the jobId and display nothing useful.

**Why it happens:** Large crawls take minutes. The API uses async job pattern.

**How to avoid:** The crawl workflow prose must:
1. Call firecrawl_crawl -> get jobId
2. Loop: call firecrawl_check_crawl_status with jobId every 5s
3. When status = "completed": collect results array
4. Pass results to writeCrawl()

**Timeout handling:** If status is not "completed" after 5 minutes, collect partial results and display: "Crawl timed out after 5 minutes — {N} pages collected so far."

### Pitfall 4: firecrawl_extract Credit Cost is Variable

**What goes wrong:** Passing `formats: ["extract"]` costs 5 credits/page (LLM extraction). Passing just URL without schema may return an error or unusable output.

**Why it happens:** Extract uses LLM processing, not just markdown conversion.

**How to avoid:** Document the 5 credit/page cost clearly in the workflow. Default to scrape (1 credit) when only markdown is needed. Only call extract when structured JSON is explicitly needed. The competitive.md integration should use scrape + Claude's own analysis as the primary path, with firecrawl_extract as an enhancement when the user confirms cost.

**Credit cost table for reference:**
| Tool | Credits/call |
|------|-------------|
| firecrawl_scrape | 1 |
| firecrawl_search | 0.2 (varies by limit) |
| firecrawl_map | ~0.5 |
| firecrawl_extract | 5 |
| firecrawl_crawl | 1/page |

### Pitfall 5: competitive.md LOCKED Sections Must Not Be Modified

**What goes wrong:** competitive.md has explicit `<!-- LOCKED: ... -->` comments protecting Steps 1-3 header, init, prerequisites, and MCP probe sections. Editing inside those LOCKED blocks violates the workflow contract.

**Why it happens:** The LOCKED pattern is established in competitive.md (and recommend.md) to prevent accidental breakage of the skill's core structure.

**How to avoid:** The Firecrawl probe addition goes INSIDE Step 3's existing MCP probe section, which shows `<!-- /LOCKED -->` at the end of the sequential thinking probe block. The Firecrawl probe is appended before the `<!-- /LOCKED -->` comment. Step 4 is fully `<!-- OPTIMIZABLE -->` — Firecrawl paths can be added anywhere in Step 4 without restriction.

## Code Examples

Verified patterns from existing codebase:

### probeFirecrawl() call pattern (from mcp-integration.md)

```bash
# Source: mcp-integration.md lines 501-513
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

Parse: `if result.available === true` -> FIRECRAWL_AVAILABLE = true.
If `result.warning === true` -> emit: `Warning: Firecrawl credits at {result.credits.remaining}/{result.credits.total} -- approaching limit`.

### writeSource() call pattern (from firecrawl-cache.cjs)

```javascript
// Source: bin/lib/firecrawl-cache.cjs lines 113-157
// Call after mcp__firecrawl__firecrawl_scrape returns content:
node -e "
  const cache = require('./bin/lib/firecrawl-cache.cjs');
  const result = cache.writeSource(
    '{url}',
    '{content}',
    { type: 'scrape', added_by: 'pde:firecrawl scrape' },
    {},
    process.cwd()
  );
  console.log(JSON.stringify(result));
"
```

Returns `{ slug, path, cached: boolean, written: boolean }`.

### writeCrawl() call pattern (from firecrawl-cache.cjs)

```javascript
// Source: bin/lib/firecrawl-cache.cjs lines 182-227
// pages is array from firecrawl_crawl result: [{url, markdown}, ...]
// Call after all pages collected:
node -e "
  const cache = require('./bin/lib/firecrawl-cache.cjs');
  const pages = JSON.parse(process.argv[1]);
  const result = cache.writeCrawl(
    '{rootUrl}',
    pages,
    { added_by: 'pde:firecrawl crawl' },
    {},
    process.cwd()
  );
  console.log(JSON.stringify(result));
" '{pages_json}'
```

Returns `{ slug, path, page_count }`.

### Crawl cap enforcement (new logic for workflows/firecrawl.md)

```
# Parse effective_limit from arguments
effective_limit=$(
  node -e "
    const args = process.argv.slice(1).join(' ');
    const limitMatch = args.match(/--limit\s+(\d+)/);
    const requestedLimit = limitMatch ? parseInt(limitMatch[1]) : 50;
    const cap = parseInt(process.env.FIRECRAWL_CRAWL_MAX_PAGES || '50');
    if (requestedLimit > cap) {
      process.stderr.write('Warning: Requested ' + requestedLimit + ' pages exceeds cap (' + cap + '). Truncating.\n');
      process.stdout.write(String(cap));
    } else {
      process.stdout.write(String(requestedLimit));
    }
  " -- $ARGUMENTS
)
```

### Test file pattern (from tests/phase-199/test-firecrawl-cache.cjs)

Phase 200 tests follow the .mjs pattern from phase-198:

```javascript
// tests/phase-200/firecrawl-crawl-cap.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('crawl cap enforcement', () => {
  test('limit above FIRECRAWL_CRAWL_MAX_PAGES is truncated to cap', () => {
    // Test that effective_limit = min(requested, cap)
    const cap = 50;
    const requested = 100;
    const effective = Math.min(requested, cap);
    assert.equal(effective, 50);
  });

  test('limit below cap passes through unchanged', () => {
    const cap = 50;
    const requested = 10;
    const effective = Math.min(requested, cap);
    assert.equal(effective, 10);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebSearch-only competitor research | firecrawl_search + firecrawl_extract for live pricing/features | Phase 200 | Competitor data is JS-rendered-accurate, structured, cacheable |
| Manual URL management | firecrawl_map before crawl to discover scope | Phase 200 | User can preview site structure before committing crawl credits |
| Single search tool | firecrawl_search with category/time filters | Phase 200 | Technology category filter reduces noise in competitive searches |

**Deprecated/outdated:**
- `firecrawl_browser_create` / `firecrawl_browser_delete`: Deprecated, replaced by `firecrawl_interact`. These are in TOOL_MAP but deferred to Phase 202 scope — do not use in Phase 200 workflows.

## Open Questions

1. **Actual MCP tool name prefix for Firecrawl**
   - What we know: TOOL_MAP entries use `mcp__firecrawl__scrape` but source.md allowed-tools lists `mcp__firecrawl__firecrawl_scrape`
   - What's unclear: Which prefix does the actual Claude Code MCP runtime assign? The double-firecrawl pattern (`mcp__firecrawl__firecrawl_*`) is what source.md uses — this was written by the Phase 199 executor who may have verified it
   - Recommendation: Plan 1 executor must call `mcp__firecrawl__firecrawl_scrape` first. If it works, update all TOOL_MAP entries to the double-firecrawl prefix and mark TOOL_MAP_VERIFIED. If it fails, try `mcp__firecrawl__scrape`.

2. **firecrawl_search category and time filter parameter names**
   - What we know: SCR-02 requires category and time filters; mcp-integration.md mentions these capabilities
   - What's unclear: Exact parameter names — `category` vs `searchOptions.category`, `fromDate` vs `after`
   - Recommendation: Check Firecrawl MCP docs at docs.firecrawl.dev/mcp-server during Plan 1 execution; use WebFetch to verify if needed.

3. **competitive.md LOCKED section boundary**
   - What we know: Step 3 has a `<!-- /LOCKED -->` comment; adding the Firecrawl probe before that comment is safe
   - What's unclear: Whether the executor can identify the exact insertion point in a 600-line file
   - Recommendation: Use Grep to find the `/LOCKED` comment in Step 3, then use Edit to insert the Firecrawl probe block immediately before it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bin/lib/firecrawl-cache.cjs` | All cache writes | ✓ | Phase 199 | None — blocking dependency |
| `bin/lib/mcp-bridge.cjs` | probeFirecrawl, credit guards | ✓ | Phase 198 | None — blocking dependency |
| `mcp__firecrawl__*` tools | All SCR-*/CRL-01 requirements | Unknown | Requires live verification | WebSearch/WebFetch fallback |
| Node.js | Bash invocations of cjs modules | ✓ | Project-wide dependency | None needed |

**Missing dependencies with no fallback:**
- None. The two critical .cjs files exist. Firecrawl MCP tool availability is runtime-only (cannot pre-verify) but all workflows have graceful degradation to WebSearch/WebFetch.

**Missing dependencies with fallback:**
- Firecrawl MCP tools: if FIRECRAWL_AVAILABLE = false for any reason, competitive.md and recommend.md fall back to WebSearch (existing behavior is preserved).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none — run directly via `node --test` |
| Quick run command | `node --test tests/phase-200/*.test.mjs` |
| Full suite command | `node --test tests/**/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCR-01 | scrape calls writeSource with onlyMainContent:true default | unit | `node --test tests/phase-200/firecrawl-scrape-command.test.mjs` | ❌ Wave 0 |
| SCR-02 | search passes category and time filters to MCP tool | smoke | manual (requires live Firecrawl API) | N/A |
| SCR-03 | map returns URL list from live site | smoke | manual (requires live Firecrawl API) | N/A |
| SCR-04 | extract passes schema as parameter not hard-coded | unit | `node --test tests/phase-200/firecrawl-extract-schema.test.mjs` | ❌ Wave 0 |
| SCR-05 | search with scrapeOptions caches each result via writeSource | unit | `node --test tests/phase-200/firecrawl-scrape-command.test.mjs` | ❌ Wave 0 |
| CRL-01 | crawl limit above FIRECRAWL_CRAWL_MAX_PAGES is truncated | unit | `node --test tests/phase-200/firecrawl-crawl-cap.test.mjs` | ❌ Wave 0 |
| PIP-01 | competitive.md FIRECRAWL_AVAILABLE probe sets correct flag | unit | `node --test tests/phase-200/competitive-firecrawl-probe.test.mjs` | ❌ Wave 0 |

**Note:** SCR-02, SCR-03 are smoke-only (require live API). The functional correctness of search/map tools is verified by manual smoke test in the success criteria. Unit tests cover the infrastructure layer (credit guard, cache writes, cap enforcement).

### Sampling Rate

- **Per task commit:** `node --test tests/phase-200/*.test.mjs`
- **Per wave merge:** `node --test tests/**/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-200/firecrawl-scrape-command.test.mjs` — covers SCR-01, SCR-05 (credit guard call, cache write, onlyMainContent enforcement)
- [ ] `tests/phase-200/firecrawl-crawl-cap.test.mjs` — covers CRL-01 (FIRECRAWL_CRAWL_MAX_PAGES enforcement logic)
- [ ] `tests/phase-200/firecrawl-extract-schema.test.mjs` — covers SCR-04 (schema as parameter, not hard-coded)
- [ ] `tests/phase-200/competitive-firecrawl-probe.test.mjs` — covers PIP-01 (FIRECRAWL_AVAILABLE probe + fallback contract; mirrors tests/phase-198/firecrawl-integration.test.mjs pattern)
- [ ] `tests/phase-200/recommend-dual-probe.test.mjs` — covers dual-probe contract (both WebSearch and Firecrawl probed independently)

## Sources

### Primary (HIGH confidence)

- `bin/lib/mcp-bridge.cjs` (lines 262-274, 709-918) — TOOL_MAP Firecrawl entries, all credit guard functions, probeFirecrawl()
- `bin/lib/firecrawl-cache.cjs` (full file) — writeSource, writeCrawl, writeSnapshot, readManifest API
- `references/mcp-integration.md` (lines 473-565) — Firecrawl MCP probe/use/degrade patterns, fallback table, credit guard integration sequence
- `commands/source.md` — allowed-tools pattern with `mcp__firecrawl__firecrawl_*` prefix (double-firecrawl) — key evidence for TOOL_MAP prefix resolution
- `tests/phase-198/firecrawl-integration.test.mjs` — probeFirecrawl() test patterns to mirror
- `tests/phase-199/test-firecrawl-cache.cjs` — cache module test patterns to mirror

### Secondary (MEDIUM confidence)

- `workflows/competitive.md` (lines 1-500) — existing workflow structure, LOCKED/OPTIMIZABLE section boundaries, MCP probe patterns
- `workflows/recommend.md` (full file) — existing probe structure, catalog patterns, MCP flag handling
- `.planning/phases/198-foundation-mcp-registration-credit-guards/198-RESEARCH.md` — credit cost table (scrape:1, search:0.2, extract:5, crawl:1/page)

### Tertiary (LOW confidence)

- Firecrawl tool name double-prefix hypothesis (`mcp__firecrawl__firecrawl_*`) inferred from source.md allowed-tools — needs live verification in Plan 1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure modules verified from source code
- Architecture patterns: HIGH — patterns derived directly from existing mcp-bridge.cjs and firecrawl-cache.cjs implementations
- Workflow editing guidance: HIGH — LOCKED/OPTIMIZABLE boundaries confirmed from competitive.md source
- Tool name prefix: LOW — discrepancy between TOOL_MAP and source.md allowed-tools not yet resolved by live probe; flagged as open question

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Firecrawl API is stable; MCP tool names may change with package updates)
