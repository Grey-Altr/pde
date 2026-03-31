# Phase 201: Brief + Phase Researcher + Design Reference Integration - Research

**Researched:** 2026-03-31
**Domain:** Workflow integration — wiring Firecrawl into brief.md, pde-phase-researcher.md, wireframe.md, mockup.md, and system.md
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
N/A — infrastructure phase, all decisions at Claude's discretion.

### Claude's Discretion
All implementation choices. Use ROADMAP phase goal, success criteria, and codebase conventions.

Key constraints from STATE.md and ROADMAP:
- Depends on Phase 199 (firecrawl-cache.cjs) and Phase 200 (Firecrawl tools available)
- brief.md --source-url flag: scrape URL via Firecrawl, write to firecrawl-cache, inject ## Source Material section into BRF
- pde-phase-researcher.md: add ## Web Evidence section from firecrawl_search + firecrawl_scrape when FIRECRAWL_AVAILABLE is true; section absent (not empty) when false
- Design reference URLs in wireframe/mockup/system: scrape via Firecrawl, feed into design context; don't use WebFetch when Firecrawl is available
- All output must flow through firecrawl-cache.cjs (writeSource/readSource)
- Graceful fallback to WebFetch when Firecrawl unavailable

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIP-02 | Research agents (project-researcher, phase-researcher) use Firecrawl scrape/search with escalation ladder (WebSearch free → Firecrawl when JS rendering or structured extraction needed) | pde-phase-researcher.md gets Firecrawl probe + ## Web Evidence section wired to firecrawl_search results |
| PIP-03 | Design reference URLs scraped via Firecrawl feed into wireframe, mockup, and system skill context | wireframe.md, mockup.md, system.md each get --design-reference-url flag + Firecrawl scrape in Step 2 prereq section |
| PIP-04 | Brief workflow accepts URLs and scrapes them as reference material via Firecrawl, stored in source pipeline | brief.md gets --source-url flag + Firecrawl probe in Step 3 + Source Material injection before artifact write |
</phase_requirements>

---

## Summary

Phase 201 wires Firecrawl into three categories of workflows that consume external source material: (1) the brief workflow, which gets a new `--source-url` flag; (2) the pde-phase-researcher agent, which gets a `## Web Evidence` section; and (3) the design reference consumers (wireframe, mockup, system), which get a `--design-reference-url` flag. All three patterns follow the same probe-then-cache contract established in Phase 200: probe `probeFirecrawl()` from `mcp-bridge.cjs`, call `mcp__firecrawl__firecrawl_scrape` when available, write through `firecrawl-cache.cjs`'s `writeSource()`, and fall back to WebFetch when Firecrawl is unavailable.

The reference implementation in Phase 200 is workflows/competitive.md and workflows/recommend.md. Phase 201 should replicate the same structural patterns — LOCKED section boundaries respected, probe block inserted in the MCP probe step, enhancement block inserted in the content generation step, and the Firecrawl MCP tools added to the command file allowed-tools frontmatter.

**Primary recommendation:** Implement Phase 201 as three separate tasks that each follow the competitive.md/recommend.md reference pattern. Each task touches one category of workflow: (1) brief, (2) pde-phase-researcher, (3) wireframe+mockup+system. Use the exact `writeSource()` call pattern from `workflows/source.md` and the exact `probeFirecrawl()` call pattern from `workflows/competitive.md`.

---

## Standard Stack

### Core Infrastructure (Already Built — Phase 199 + 200)

| Module | Path | Purpose | API |
|--------|------|---------|-----|
| firecrawl-cache.cjs | bin/lib/firecrawl-cache.cjs | All disk I/O for scraped content | `writeSource(url, content, metadata, opts)`, `readSource(slug)` |
| mcp-bridge.cjs | bin/lib/mcp-bridge.cjs | Firecrawl probe + concurrency guard | `probeFirecrawl(opts) -> { available, reason, credits, warning }` |
| firecrawl_scrape | MCP tool | Scrape a single URL to clean markdown | `mcp__firecrawl__firecrawl_scrape` |
| firecrawl_search | MCP tool | Web search with optional scrapeOptions | `mcp__firecrawl__firecrawl_search` |

### Files Modified in This Phase

| File | Modification Type | What Changes |
|------|-------------------|-------------|
| commands/brief.md | Frontmatter + Edit | Add `--source-url` flag description; add `mcp__firecrawl__firecrawl_scrape` to allowed-tools |
| workflows/brief.md | Edit (3 locations) | 1) Add `--source-url` to flags table, 2) Add Firecrawl probe in Step 3 block, 3) Add Step 3c source URL scraping before Step 4 |
| agents/pde-phase-researcher.md | Edit (3 locations) | 1) Add Firecrawl probe block, 2) Add ## Web Evidence section instructions, 3) Conditionally include section in RESEARCH.md structure |
| commands/wireframe.md | Frontmatter Edit | Add `--design-reference-url` flag; add `mcp__firecrawl__firecrawl_scrape` to allowed-tools |
| workflows/wireframe.md | Edit (2 locations) | 1) Add `--design-reference-url` to flags table, 2) Add design reference scrape block in Step 2 prerequisites |
| commands/mockup.md | Frontmatter Edit | Add `--design-reference-url` flag; add `mcp__firecrawl__firecrawl_scrape` to allowed-tools |
| workflows/mockup.md | Edit (2 locations) | 1) Add `--design-reference-url` to flags table, 2) Add design reference scrape block in Step 2 prerequisites |
| commands/system.md | Frontmatter Edit | Add `--design-reference-url` flag; add `mcp__firecrawl__firecrawl_scrape` to allowed-tools |
| workflows/system.md | Edit (2 locations) | 1) Add `--design-reference-url` to flags table, 2) Add design reference scrape block in Step 2 prerequisites |

---

## Architecture Patterns

### Pattern 1: The Phase 200 Reference Pattern (Replicate This Exactly)

This is the established pattern from competitive.md and recommend.md. All Phase 201 changes MUST follow it.

**Probe block** — inserted inside the existing Step 3 MCP probe section, BEFORE the `<!-- /LOCKED -->` boundary:

```markdown
**Probe Firecrawl MCP:**

```
IF --no-firecrawl NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false:
  Run probeFirecrawl() via node --input-type=module pattern:
  ```bash
  node --input-type=module <<'PROBE_EOF'
  import { createRequire } from 'module';
  const req = createRequire(import.meta.url);
  const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
  const result = probeFirecrawl();
  process.stdout.write(JSON.stringify(result));
  PROBE_EOF
  ```
  If result.available === true: SET FIRECRAWL_AVAILABLE = true
    Log: {timestamp} | {SKILL_CODE} | firecrawl | probe | success | {duration_ms}
    IF result.warning: emit credit warning to user
  If result.available === false: SET FIRECRAWL_AVAILABLE = false
    Log: {timestamp} | {SKILL_CODE} | firecrawl | probe | failure | reason={result.reason} | 0
    Tag: [Firecrawl unavailable ({reason}) -- using WebFetch fallback]
ELSE:
  SET FIRECRAWL_AVAILABLE = false
  Log: {timestamp} | {SKILL_CODE} | firecrawl | probe | skipped | 0
```
```

**writeSource call pattern** — from workflows/source.md (the canonical write pattern):

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const content = require('fs').readFileSync('/tmp/pde-source-content.md', 'utf-8');
const r = c.writeSource('THE_URL', content, { type: 'scrape', added_by: 'SOURCE_LABEL' }, {});
console.log(JSON.stringify(r));
"
```

**Cache-first read pattern** — check cache before calling Firecrawl (idempotent, saves credits):

```bash
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const slug = c.slugifyUrl('THE_URL');
const cached = c.readSource(slug);
process.stdout.write(cached ? 'CACHED' : 'MISS');
"
```

### Pattern 2: brief.md — Adding --source-url

The brief workflow currently has `--reference-url` (Playwright screenshot). Phase 201 adds `--source-url` (Firecrawl text scrape). These are SEPARATE flags with SEPARATE purposes:
- `--reference-url` → Playwright screenshot capture (visual reference for design)
- `--source-url` → Firecrawl text scrape (content reference for brief synthesis)

**Where to insert in brief.md:**

1. **Flags table** (inside LOCKED section, lines ~14-26): Add `--source-url` and `--no-firecrawl` rows to the flags table.

2. **Flag parse block** (line ~32-41, after the `--reference-url` parse block): Add SOURCE_URL parse block:
```
Parse `--source-url` flag value:
IF --source-url in $ARGUMENTS:
  SET SOURCE_URL = value following --source-url
ELSE:
  SET SOURCE_URL = empty
```

3. **Step 3 MCP probe block** (lines ~146-178, before `<!-- /LOCKED -->` at line 370): Insert Firecrawl probe block. Brief Step 3 only probes Sequential Thinking — Firecrawl probe must be added after the Sequential Thinking probe block and before `<!-- /LOCKED -->`.

4. **Step 3c: Source URL scrape** (new step, inserted after Step 3b at line ~235): New step executing ONLY when SOURCE_URL is not empty:

```markdown
### Step 3c: Source URL scrape

IF SOURCE_URL is empty:
  Skip silently — no source URL provided.

IF SOURCE_URL is not empty AND FIRECRAWL_AVAILABLE is false:
  IF WebFetch is available:
    Fetch SOURCE_URL via WebFetch tool.
    Write content to /tmp/pde-source-content.md using Bash.
    Write to cache via writeSource() with { added_by: 'brief-source-url' }.
    SET SOURCE_MATERIAL_CONTENT = content
    Log: "  -> Source URL fetched via WebFetch fallback: {SOURCE_URL}"
  ELSE:
    SET SOURCE_MATERIAL_CONTENT = null
    Log: "  -> Source URL skipped — Firecrawl and WebFetch both unavailable"

IF SOURCE_URL is not empty AND FIRECRAWL_AVAILABLE is true:
  Check cache first for SOURCE_URL slug.
  IF CACHED:
    Read from cache via readSource(slug).
    SET SOURCE_MATERIAL_CONTENT = cached_content
    Log: "  -> Source URL cache hit: {slug}"
  ELSE:
    Call mcp__firecrawl__firecrawl_scrape with { url: SOURCE_URL, onlyMainContent: true }.
    Write content to /tmp/pde-source-content.md.
    Write to cache via writeSource(SOURCE_URL, content, { type: 'scrape', added_by: 'brief-source-url' }).
    SET SOURCE_MATERIAL_CONTENT = content
    Log: "  -> Source URL scraped via Firecrawl: {SOURCE_URL} ({slug})"
```

5. **Step 5: Synthesize brief** (inside OPTIMIZABLE section): After all brief sections are written, inject `## Source Material` section into the BRF artifact BEFORE the footer. This section is written ONLY when SOURCE_MATERIAL_CONTENT is not null:

```markdown
## Source Material

> Scraped via Firecrawl and stored in firecrawl-cache. Content summarized below.

**Source URL:** {SOURCE_URL}
**Cached at:** {slug}.md
**Method:** {Firecrawl | WebFetch fallback}

{First 2000 characters of SOURCE_MATERIAL_CONTENT, with truncation notice if longer}
```

**CRITICAL:** The `## Source Material` section must appear BEFORE the `---` footer line in the BRF file so it is a proper artifact section, not appended metadata.

### Pattern 3: pde-phase-researcher.md — Adding ## Web Evidence

The pde-phase-researcher is a standalone agent file (not a workflow invoked via command). It has different structural rules from the workflow files.

**Current structure of pde-phase-researcher.md:**
- Standard mode RESEARCH.md sections: Architecture, Recommended Approach, Integration Points, Anti-Patterns, Sources
- Empirical mode adds: Experiments Attempted section

**What to add:**
1. **Firecrawl probe instructions** — Insert into the agent's standard research process (after Step 1 "Read the phase context files"). The probe should happen early, before the main analysis.

2. **## Web Evidence section** — Added to the RESEARCH.md output structure ONLY when `FIRECRAWL_AVAILABLE = true`. The section is **absent entirely** (not an empty placeholder) when `FIRECRAWL_AVAILABLE = false`.

The section content:
```markdown
## Web Evidence

> Generated via Firecrawl search and scrape. Included only when FIRECRAWL_AVAILABLE is true.

### Searches Performed
| Query | Top Result | Relevance |
|-------|-----------|-----------|
| {query} | {url} | {1-sentence summary} |

### Scraped Content
For each URL scraped:
**[{url}]**
{150-word summary of scraped content}
Cached at: {slug}
```

**PIP-02 escalation ladder:** The requirement specifies an escalation ladder: WebSearch free → Firecrawl when JS rendering or structured extraction is needed. The agent instructions should say:
- Default: use WebSearch for general research
- Escalate to Firecrawl when: competitor site prices behind JS, SPA frameworks, structured data extraction needed, or WebSearch returns inadequate results

### Pattern 4: Design Reference URL for wireframe/mockup/system

All three design workflows (wireframe.md, mockup.md, system.md) need the same pattern. The `--design-reference-url` flag triggers a Firecrawl scrape in Step 2 (prerequisites), and the scraped content is stored as `DESIGN_REFERENCE_CONTENT` for use during generation.

**Insertion points for each workflow:**

For **wireframe.md** (Step 2 has sub-sections 2a through 2h):
- New Step 2a.1 (after screen inventory, before fidelity): Parse `--design-reference-url` flag, scrape if present.

For **mockup.md** (Step 2 has sub-sections 2a through 2f):
- New Step 2d.1 (after design system/brief reads): Parse `--design-reference-url` flag, scrape if present.

For **system.md** (Step 2 has brief detection only):
- After Step 2 prerequisite reads: Parse `--design-reference-url` flag, scrape if present.

**Design reference scrape block** (reused in all three):

```markdown
#### Parse --design-reference-url flag

Check $ARGUMENTS for `--design-reference-url`:
- If absent: SET DESIGN_REFERENCE_URL = empty. SET DESIGN_REFERENCE_CONTENT = null.
- If present: SET DESIGN_REFERENCE_URL = value following --design-reference-url.

IF DESIGN_REFERENCE_URL is not empty:
  IF FIRECRAWL_AVAILABLE = true:
    Check cache first (slugifyUrl + readSource).
    IF CACHED: SET DESIGN_REFERENCE_CONTENT = cached_content. Log: "  -> Design reference cache hit: {slug}"
    ELSE:
      Call mcp__firecrawl__firecrawl_scrape with { url: DESIGN_REFERENCE_URL, onlyMainContent: true }.
      Write to cache via writeSource(DESIGN_REFERENCE_URL, content, { type: 'scrape', added_by: '{skill}-design-ref' }).
      SET DESIGN_REFERENCE_CONTENT = content.
      Log: "  -> Design reference scraped via Firecrawl: {DESIGN_REFERENCE_URL}"
  ELSE (FIRECRAWL_AVAILABLE = false):
    Fetch DESIGN_REFERENCE_URL via WebFetch tool as fallback.
    SET DESIGN_REFERENCE_CONTENT = WebFetch result (do NOT write to cache — WebFetch content is not cache-quality).
    Log: "  -> Design reference fetched via WebFetch fallback (Firecrawl unavailable)"
```

**CRITICAL DISTINCTION:** The design reference content must NOT replace WebFetch for the SAME URL when Firecrawl is available. The requirement says: "the workflow does not fetch the URL inline via WebFetch when Firecrawl is available." This means the Firecrawl path replaces the existing `--reference-url` WebFetch fetch path if the URL was previously handled that way. Since wireframe/mockup/system don't currently have any URL-fetching, this is additive only — Firecrawl is the primary path, WebFetch is fallback.

**Using DESIGN_REFERENCE_CONTENT during generation:** Each workflow must reference DESIGN_REFERENCE_CONTENT in its generation step guidance. This is an enrichment hint to the model — it should inform visual style, component patterns, layout approaches based on the scraped design reference.

---

## Integration Points

### LOCKED Section Boundaries (Do Not Move)

Each workflow file has LOCKED comment boundaries. The Firecrawl probe MUST be inserted INSIDE the LOCKED section (in the MCP probe step), not after it.

| File | First LOCKED | /LOCKED | OPTIMIZABLE start | /OPTIMIZABLE |
|------|-------------|---------|------------------|-------------|
| workflows/brief.md | Line 1 | Line 370 | Line 372 | Line 829 |
| workflows/wireframe.md | Line 1 | Line 952 | Line 956 | Line 2052 |
| workflows/mockup.md | Line 1 | Line 455 | Line 459 | Line 1368 |
| workflows/system.md | Line 1 | Line 1238 | Line 1240 | Line 2046 |

### Flags Table Location

All flags tables are inside the LOCKED section. Adding `--source-url`, `--design-reference-url`, and `--no-firecrawl` flags requires editing inside the LOCKED section — this is expected and correct. LOCKED protects the _behavior contract_, not the flags list which expands the contract.

### Command File allowed-tools

Each command file needs Firecrawl tools added. The double-prefix pattern `mcp__firecrawl__firecrawl_*` is confirmed by commands/source.md.

| Command file | Tools to Add |
|-------------|-------------|
| commands/brief.md | `mcp__firecrawl__firecrawl_scrape` |
| commands/wireframe.md | `mcp__firecrawl__firecrawl_scrape` |
| commands/mockup.md | `mcp__firecrawl__firecrawl_scrape` |
| commands/system.md | `mcp__firecrawl__firecrawl_scrape` |

Note: pde-phase-researcher.md is an agent file, not a command file. It has an `allowed-tools` list in its YAML frontmatter. Add `mcp__firecrawl__firecrawl_scrape` and `mcp__firecrawl__firecrawl_search` there.

### Firecrawl Probe Location in Each File

| File | Probe Insertion Location |
|------|--------------------------|
| workflows/brief.md | After Sequential Thinking probe block (Step 3), before `<!-- /LOCKED -->` at line 370 |
| workflows/wireframe.md | After Playwright probe block (Step 3), before `<!-- /LOCKED -->` at line 952 |
| workflows/mockup.md | After Playwright probe block (Step 3), before `<!-- /LOCKED -->` at line 455 |
| workflows/system.md | After Sequential Thinking probe block (Step 3), before `<!-- /LOCKED -->` at line 1238 |
| agents/pde-phase-researcher.md | New paragraph in Standard Mode step 1 (before codebase analysis begins) |

### The --no-firecrawl Flag

All workflow files that get a Firecrawl probe MUST also get `--no-firecrawl` added to their flags table. Pattern from competitive.md and recommend.md:
```
| `--no-firecrawl` | Boolean | Skip Firecrawl MCP specifically while allowing other MCPs. |
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL to filesystem path | Custom slug logic | `firecrawl-cache.cjs slugifyUrl()` | Already tested, handles edge cases |
| Content write to cache dir | Direct `fs.writeFileSync` to .planning/research/ | `firecrawl-cache.cjs writeSource()` | Atomic manifest update, idempotent, gitignore-aware |
| Content read from cache | Direct `fs.readFileSync` | `firecrawl-cache.cjs readSource(slug)` | Consistent path resolution |
| Firecrawl availability check | Custom env check | `mcp-bridge.cjs probeFirecrawl()` | Handles API key, credit guard, concurrency limit |
| WebFetch fallback logic | Custom HTTP fetch | WebFetch MCP tool | Established pattern across all existing fallbacks |

---

## Common Pitfalls

### Pitfall 1: Inserting Probe Block AFTER the LOCKED Boundary
**What goes wrong:** Probe block added after `<!-- /LOCKED -->` — optimize workflow can delete or reorder it
**Why it happens:** LOCKED boundary looks like "end of infrastructure section" but the probe IS infrastructure
**How to avoid:** Always insert probe block before `<!-- /LOCKED -->` comment, as in competitive.md reference pattern

### Pitfall 2: Writing WebFetch Content to Cache
**What goes wrong:** WebFetch fallback content written via `writeSource()` — pollutes cache with inferior content
**Why it happens:** Copy-paste from Firecrawl path
**How to avoid:** For design reference workflows, WebFetch fallback content should be stored in memory (DESIGN_REFERENCE_CONTENT) but NOT written to cache — only Firecrawl scrape results are cache-worthy. For brief's `--source-url`, this decision is less critical but should be documented.

### Pitfall 3: Empty ## Source Material Section Instead of Absent ## Web Evidence
**What goes wrong:** Section written with placeholder text when Firecrawl is unavailable
**Why it happens:** Defensive "always write the section" pattern
**How to avoid:** Success criteria specifically says "section is absent (not empty) when FIRECRAWL_AVAILABLE is false." Use conditional logic: only write the section when content exists.

### Pitfall 4: Forgetting --no-firecrawl in ALL_MCP_DISABLED Check
**What goes wrong:** `--no-firecrawl` flag doesn't skip Firecrawl when `--no-mcp` was not passed
**Why it happens:** Probe block boilerplate doesn't check `--no-firecrawl` properly
**How to avoid:** Probe block pattern from competitive.md uses `IF --no-firecrawl NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false` — replicate exactly.

### Pitfall 5: --source-url vs --reference-url Collision in brief.md
**What goes wrong:** New `--source-url` conflicts with existing `--reference-url` (Playwright screenshot)
**Why it happens:** Similar naming, both are "URL" flags
**Why it doesn't actually collide:** They serve different MCPs and different artifact sections. `--reference-url` → Playwright screenshot → `## Reference Material`. `--source-url` → Firecrawl scrape → `## Source Material`. Both can be used in the same run.

### Pitfall 6: Cache-Check Skip
**What goes wrong:** Every workflow call scrapes the same URL again, burning credits
**Why it happens:** Probe + scrape pattern without checking cache first
**How to avoid:** Always check `readSource(slugifyUrl(url))` before calling `firecrawl_scrape`. Return cached content if hit.

### Pitfall 7: Modifying LOCKED Section Content vs Adding to It
**What goes wrong:** Existing LOCKED content modified instead of new content inserted
**Why it happens:** Misreading LOCKED semantics
**How to avoid:** LOCKED sections can have new content inserted; they cannot have existing content deleted or reordered. The flag table addition and probe block addition are insertions only.

---

## Code Examples

### writeSource() Call Pattern (Canonical — from workflows/source.md)

```bash
# Source: workflows/source.md Step 5
node -e "
const c = require('./bin/lib/firecrawl-cache.cjs');
const content = require('fs').readFileSync('/tmp/pde-source-content.md', 'utf-8');
const r = c.writeSource('THE_URL', content, { type: 'scrape', added_by: 'brief-source-url' }, {});
console.log(JSON.stringify(r));
"
```

### Cache-First Check Pattern (from workflows/source.md)

```bash
# Source: workflows/source.md Step 3
SLUG=$(node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); console.log(c.slugifyUrl('THE_URL'))")
CACHED=$(node -e "const c = require('./bin/lib/firecrawl-cache.cjs'); const r = c.readSource('${SLUG}'); console.log(r ? 'CACHED' : 'MISS')")
```

### probeFirecrawl() Call Pattern (Canonical — from workflows/competitive.md)

```bash
# Source: workflows/competitive.md Step 3
node --input-type=module <<'PROBE_EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { probeFirecrawl } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = probeFirecrawl();
process.stdout.write(JSON.stringify(result));
PROBE_EOF
```

### firecrawl_search call for pde-phase-researcher (based on PIP-02 escalation ladder)

```
Call mcp__firecrawl__firecrawl_search with:
  query: "{phase_name} implementation patterns {primary_language} 2026"
  limit: 5
  scrapeOptions: { formats: ["markdown"] }
Cache each result via writeSource(result.url, result.markdown, { type: 'search-scrape', added_by: 'pde-phase-researcher' })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--reference-url` (Playwright screenshot only) in brief.md | Adding `--source-url` (Firecrawl text scrape) alongside it | Phase 201 | Brief can now ingest textual source material from URLs, not just screenshots |
| pde-phase-researcher uses WebSearch/training knowledge only | Adds Firecrawl search + scrape when available | Phase 201 | Phase research gains live web evidence from JS-rendered sites |
| Design reference = Playwright screenshot | Adding Firecrawl scrape for design reference text content | Phase 201 | Wireframe/mockup generation can use scraped content from design inspiration URLs |
| writeSource used only by /pde:source and competitive.md | Used by brief, researcher, wireframe, mockup, system | Phase 201 | Cache module becomes the standard data lake for all URL-derived content |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 201 is code/prose changes only. No new external dependencies beyond the Firecrawl MCP already validated in Phase 198 + 200.

---

## Validation Architecture

nyquist_validation is enabled in .planning/config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash grep/verification checks (no unit test framework — workflow integration testing is prose verification) |
| Config file | none — verification is inline grep checks in plan tasks |
| Quick run command | `grep "FIRECRAWL_AVAILABLE" workflows/brief.md && grep "source-url" workflows/brief.md` |
| Full suite command | Verification block in each plan task |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIP-04 | brief.md accepts --source-url flag | grep | `grep "source-url" commands/brief.md workflows/brief.md` | ✅ (files exist, test new) |
| PIP-04 | brief.md writes ## Source Material section | grep | `grep "Source Material" workflows/brief.md` | ✅ |
| PIP-04 | brief.md probes Firecrawl and writes to cache | grep | `grep "FIRECRAWL_AVAILABLE" workflows/brief.md && grep "writeSource" workflows/brief.md` | ✅ |
| PIP-02 | pde-phase-researcher has ## Web Evidence section | grep | `grep "Web Evidence" agents/pde-phase-researcher.md` | ✅ |
| PIP-02 | pde-phase-researcher section absent when unavailable | grep | `grep "absent" agents/pde-phase-researcher.md` | ✅ (new) |
| PIP-03 | wireframe accepts --design-reference-url | grep | `grep "design-reference-url" commands/wireframe.md workflows/wireframe.md` | ✅ |
| PIP-03 | mockup accepts --design-reference-url | grep | `grep "design-reference-url" commands/mockup.md workflows/mockup.md` | ✅ |
| PIP-03 | system accepts --design-reference-url | grep | `grep "design-reference-url" commands/system.md workflows/system.md` | ✅ |
| PIP-03 | Design reference uses Firecrawl not WebFetch when available | grep | `grep "FIRECRAWL_AVAILABLE" workflows/wireframe.md` | ✅ |

### Wave 0 Gaps

None — existing file infrastructure covers all phase requirements. No new test files needed.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/firecrawl-cache.cjs` — Full module read; writeSource(), readSource(), slugifyUrl(), writeManifest() APIs confirmed
- `bin/lib/mcp-bridge.cjs` — probeFirecrawl() signature and return shape confirmed (lines 877-918)
- `workflows/competitive.md` — Reference pattern for probe block, FIRECRAWL_AVAILABLE variable, Firecrawl enrichment block
- `.planning/phases/200-core-scraping-tools-competitive-recommend-integration/200-02-PLAN.md` — Exact task structure and patterns from Phase 200
- `workflows/brief.md` — Full structure read; LOCKED boundaries at lines 1/370; flags table; Step 3 probe section; Step 5 synthesis section
- `workflows/wireframe.md` — LOCKED at 1/952; Step 3 MCP probe at line 242; flags table
- `workflows/mockup.md` — LOCKED at 1/455; Step 3 MCP probe at line 202; flags table
- `workflows/system.md` — LOCKED at 1/1238; Step 3 MCP probe at line 140; flags table
- `agents/pde-phase-researcher.md` — Full agent file read; RESEARCH.md structure; allowed-tools list
- `workflows/source.md` — writeSource() call pattern confirmed (lines 174-181)
- `workflows/recommend.md` — Second reference implementation; probeFirecrawl() + FIRECRAWL_AVAILABLE pattern confirmed

### Secondary (MEDIUM confidence)
- `workflows/firecrawl.md` — Confirms writeSource() patterns for search-scrape results

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules are live code already present from Phase 199/200
- Architecture patterns: HIGH — reference implementations exist in competitive.md and recommend.md
- Pitfalls: HIGH — derived from direct reading of LOCKED boundaries and success criteria

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable — no external dependencies)
