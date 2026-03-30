# Phase 199: Data Layer -- Cache Module + Source Pipeline - Research

**Researched:** 2026-03-30
**Domain:** CJS disk I/O module for Firecrawl scraped content, atomic manifest updates, source pipeline
**Confidence:** HIGH

## Summary

This phase creates `bin/lib/firecrawl-cache.cjs` -- a zero-dependency CJS module that all Firecrawl-consuming workflows (brief, researcher, /pde:source, competitive) use to write and read scraped content on disk. The module manages the `.planning/research/firecrawl-cache/` directory tree (scrapes/, crawls/, snapshots/), provides deterministic URL-to-slug mapping, atomic sources-manifest.json updates, and idempotent write semantics. No workflow touches disk directly -- all I/O routes through this single module.

The codebase already has all the patterns needed: atomic JSON write via tmp+rename (mcp-bridge.cjs line 788-790), filesystem semaphore with PID-stamped lockfiles (mcp-bridge.cjs line 815-857), `safeReadFile` from core.cjs, and the `pde-tools.cjs event-emit` subprocess pattern for application-level events. The sources-manifest.json template exists but is empty (schema_version 1.0.0, sources: []). The `/pde:source` command does not currently exist as a file -- it is documented in FEATURES.md and ROADMAP.md as a new command to be created in this phase.

**Primary recommendation:** Build firecrawl-cache.cjs following the exact CJS pattern of mcp-bridge.cjs (require core.cjs for safeReadFile, zero npm deps, sync fs operations, atomic writes). Use the ROADMAP-specified path `.planning/research/firecrawl-cache/` (not `.planning/firecrawl-cache/`). Add the directory to .gitignore. Extend sources-manifest.json with a firecrawl source type. Create the /pde:source add command entry point.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- auto-generated infrastructure phase. All implementation choices at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion -- pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from STATE.md:
- Cache module before workflow integrations -- brief, researcher, and /pde:source all write to firecrawl-cache; cache module must exist before any workflow touches disk
- firecrawl-cache.cjs must be a single tested CJS module (matching existing bin/lib/ pattern)
- .planning/research/firecrawl-cache/ directory must be gitignored

### Deferred Ideas (OUT OF SCOPE)
None -- infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRL-03 | Scraped and crawled content is stored in .planning/research/firecrawl-cache/ via firecrawl-cache.cjs with slug-based access and gitignore | Codebase patterns for atomic writes (mcp-bridge.cjs), directory structure from ROADMAP (scrapes/, crawls/, snapshots/), .gitignore patterns from existing entries |
| CRL-02 | User can add URLs as source material via /pde:source add which scrapes/crawls content into the source pipeline | No existing /pde:source command -- must be created; sources-manifest.json template exists empty; Architecture Pattern 2 (Source Material Ingestion Flow) defines the pipeline |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs (built-in) | N/A | All file read/write operations | Zero-dep CJS pattern matching all bin/lib/*.cjs modules |
| Node.js path (built-in) | N/A | Cross-platform path construction | Already used by every bin/lib module |
| Node.js crypto (built-in) | N/A | SHA256 for content hashing (dedup/integrity) | Already used in manifest.cjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| core.cjs (internal) | N/A | safeReadFile, output, error helpers | Read operations, CLI output |
| pde-tools.cjs (internal) | N/A | event-emit subprocess, generate-slug | Event emission, slug generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sync fs ops | Async fs/promises | All existing bin/lib modules use sync -- consistency wins over theoretical perf; these are local disk ops on small files |
| Custom slug function | pde-tools.cjs generate-slug | generate-slug already exists but is a subprocess call; for hot-path URL slugification, a local function is faster. Use local function that matches generate-slug output. |

**Installation:** No installation needed -- zero npm dependencies.

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
  firecrawl-cache.cjs          # NEW: cache I/O, slug, manifest updates, event emission

.planning/research/
  firecrawl-cache/             # NEW: gitignored cache directory
    scrapes/                   # Single-page scrapes ({slug}.md)
    crawls/                    # Crawl job results ({slug}/ directories)
    snapshots/                 # Change-tracking baselines ({slug}.md, {slug}-diff.md)

.planning/
  sources-manifest.json        # NEW instance file (from existing template)

commands/pde/
  source.md                    # NEW: /pde:source add <url> command entry

workflows/
  source.md                    # NEW: source material ingestion workflow
```

### Pattern 1: Atomic JSON Manifest Updates (from mcp-bridge.cjs)
**What:** Read JSON, modify, write to .tmp, rename to target. Prevents concurrent corruption.
**When to use:** Every sources-manifest.json update.
**Example:**
```javascript
// Source: bin/lib/mcp-bridge.cjs lines 788-790 (existing pattern)
function updateManifest(manifestPath, newEntry) {
  let manifest = { schema_version: '1.0.0', sources: [] };
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch { /* missing or invalid */ }

  // Deduplicate by slug -- idempotent
  const idx = manifest.sources.findIndex(s => s.slug === newEntry.slug);
  if (idx >= 0) {
    manifest.sources[idx] = { ...manifest.sources[idx], ...newEntry, updated_at: new Date().toISOString() };
  } else {
    manifest.sources.push(newEntry);
  }
  manifest.updated_at = new Date().toISOString();

  // Atomic write: write to temp, rename
  const tmpPath = manifestPath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmpPath, manifestPath);
  return manifest;
}
```

### Pattern 2: Deterministic URL-to-Slug
**What:** Convert URL to filesystem-safe slug. Must be deterministic (same URL always produces same slug).
**When to use:** Every cache read/write operation.
**Example:**
```javascript
// URL slugification -- deterministic, reversible enough for debugging
function slugifyUrl(url) {
  return url
    .replace(/^https?:\/\//, '')     // strip protocol
    .replace(/[\/\?#&=:@]/g, '-')   // replace unsafe chars
    .replace(/\./g, '-')            // dots to dashes
    .replace(/-+/g, '-')            // collapse runs
    .replace(/^-|-$/g, '')          // trim leading/trailing
    .toLowerCase()
    .slice(0, 200);                  // filesystem length limit
}
// slugifyUrl('https://competitor.com/pricing?plan=pro')
// => 'competitor-com-pricing-plan-pro'
```

### Pattern 3: Idempotent Write with Force Flag
**What:** Writing the same slug twice is a no-op unless `force: true` is passed.
**When to use:** Cache write operations -- prevents accidental overwrites, enables re-scrape with explicit intent.
**Example:**
```javascript
function writeSource(url, content, metadata = {}, opts = {}) {
  const slug = slugifyUrl(url);
  const filePath = path.join(cacheDir, 'scrapes', slug + '.md');

  // Idempotent: skip if file exists and force not set
  if (fs.existsSync(filePath) && !opts.force) {
    return { slug, path: filePath, cached: true, written: false };
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');

  // Update manifest atomically
  updateManifest(manifestPath, {
    slug,
    url,
    type: metadata.type || 'scrape',
    word_count: content.split(/\s+/).length,
    scraped_at: new Date().toISOString(),
    ...metadata,
  });

  return { slug, path: filePath, cached: false, written: true };
}
```

### Pattern 4: Filesystem Semaphore for Concurrent Manifest Access
**What:** The mcp-bridge.cjs already uses PID+timestamp+counter lockfiles for concurrent-safe operations. For manifest updates, the atomic tmp+rename pattern is sufficient since rename is atomic on POSIX. For truly concurrent agents writing different sources simultaneously, each writes its own tmp file with PID suffix before rename.
**When to use:** When parallel agents may add sources simultaneously.

### Anti-Patterns to Avoid
- **Storing raw HTML in cache:** Always store markdown. All consumers need markdown. HTML is large and not LLM-readable. (Architecture ARCHITECTURE.md Anti-Pattern 4)
- **Emitting events via emit-event.cjs:** Firecrawl events are application-level, not hook-level. Use `pde-tools.cjs event-emit` subprocess. (Architecture ARCHITECTURE.md Anti-Pattern 5)
- **Inline content injection instead of cache write:** Never inject raw scrape/crawl output into context. Write to cache, read sections as needed. (Pitfall 3)
- **Overwriting without force flag:** Same slug twice must be idempotent no-op. Prevents duplicate fetches and accidental data loss.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic JSON file writes | Custom locking/journaling | tmp+rename pattern from mcp-bridge.cjs | POSIX rename is atomic; already proven in the codebase |
| URL slug generation | Complex URL parser | Simple regex chain (strip protocol, replace unsafe chars, lowercase, truncate) | Deterministic, debuggable, no external deps |
| Event emission | Custom event bus wiring | `pde-tools.cjs event-emit` subprocess | Matches existing NDJSON bus contract |
| Unified diff for snapshots | External diff library | Simple line-by-line diff (or defer to Phase 203) | Change tracking is Phase 203 scope; Phase 199 only needs snapshot read/write baseline |
| Concurrency-safe manifest | Database or file locking library | Atomic rename (tmp -> target) with PID-suffixed tmp files | rename() is atomic on same filesystem; lockfiles add complexity for a problem atomic rename already solves |

**Key insight:** This module is intentionally simple -- sync fs, zero deps, atomic rename. The complexity lives in the workflow layer (which URLs to scrape, when to force-refresh). The cache module is a dumb, reliable storage layer.

## Common Pitfalls

### Pitfall 1: Cache Directory Not Under .planning/research/
**What goes wrong:** The project architecture research doc (ARCHITECTURE.md) references `.planning/firecrawl-cache/` but the ROADMAP (authoritative, written later) consistently uses `.planning/research/firecrawl-cache/`. Using the wrong path breaks downstream phase expectations.
**Why it happens:** Two documents disagree on the path.
**How to avoid:** Use `.planning/research/firecrawl-cache/` as specified in the ROADMAP success criteria (lines 613-614). The ROADMAP is the authoritative source.
**Warning signs:** Any code referencing `.planning/firecrawl-cache/` without the `research/` segment.

### Pitfall 2: Slug Collisions on Similar URLs
**What goes wrong:** Two different URLs produce the same slug (e.g., `https://example.com/a-b` and `https://example.com/a/b` both slugify to `example-com-a-b`).
**Why it happens:** Aggressive character replacement collapses distinct URL structures.
**How to avoid:** After stripping protocol, replace `/` with `-`, `.` with `-`, but keep query params with their `=` replaced distinctly. Test edge cases: URLs differing only by protocol, trailing slash, query params, fragments.
**Warning signs:** readSource returning wrong content for a URL.

### Pitfall 3: Non-Atomic Manifest Update Under Concurrent Access
**What goes wrong:** Two agents read manifest, both add an entry, second write clobbers first entry.
**Why it happens:** Read-modify-write race condition.
**How to avoid:** The atomic tmp+rename pattern prevents partial writes but not lost updates. For true concurrent safety: use PID-suffixed tmp files (already in codebase pattern). For v0.25, concurrent source adds are rare enough that atomic rename is sufficient -- the ROADMAP success criterion #4 says "concurrent adds do not corrupt the manifest" which atomic rename satisfies (no partial JSON). Lost updates are acceptable if they retry.
**Warning signs:** sources-manifest.json with fewer entries than expected after parallel operations.

### Pitfall 4: Forgetting to Create Directory Structure Before Write
**What goes wrong:** `fs.writeFileSync` fails with ENOENT because parent directory doesn't exist.
**Why it happens:** `.planning/research/firecrawl-cache/scrapes/` doesn't exist on first use.
**How to avoid:** Always call `fs.mkdirSync(dir, { recursive: true })` before writing. The `recursive: true` flag is idempotent.
**Warning signs:** ENOENT errors on first cache write.

### Pitfall 5: sources-manifest.json Not Initialized
**What goes wrong:** First read of sources-manifest.json fails because file doesn't exist.
**Why it happens:** Template exists at `templates/sources-manifest.json` but instance at `.planning/sources-manifest.json` is never created.
**How to avoid:** Cache module should auto-initialize manifest on first write using the template schema. readManifest should return empty default if file missing.
**Warning signs:** JSON parse errors on null/undefined.

## Code Examples

### firecrawl-cache.cjs Module Structure
```javascript
// Source: Pattern derived from existing bin/lib/mcp-bridge.cjs and bin/lib/manifest.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const { safeReadFile } = require('./core.cjs');

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_DIR_NAME = 'firecrawl-cache';
const CACHE_SUBDIRS = ['scrapes', 'crawls', 'snapshots'];
const MANIFEST_FILENAME = 'sources-manifest.json';

function resolveCacheDir(projectRoot) {
  return path.join(projectRoot || process.cwd(), '.planning', 'research', CACHE_DIR_NAME);
}

function resolveManifestPath(projectRoot) {
  return path.join(projectRoot || process.cwd(), '.planning', MANIFEST_FILENAME);
}

// ─── Slug ────────────────────────────────────────────────────────────────────

function slugifyUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[\/\?#&=:@]/g, '-')
    .replace(/\./g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 200);
}

// ─── Ensure directories ──────────────────────────────────────────────────────

function ensureCacheDir(projectRoot) {
  const cacheDir = resolveCacheDir(projectRoot);
  for (const sub of CACHE_SUBDIRS) {
    fs.mkdirSync(path.join(cacheDir, sub), { recursive: true });
  }
  return cacheDir;
}

// ─── Manifest CRUD ───────────────────────────────────────────────────────────

function readManifest(projectRoot) {
  const manifestPath = resolveManifestPath(projectRoot);
  const raw = safeReadFile(manifestPath);
  if (!raw) return { schema_version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sources: [] };
  try { return JSON.parse(raw); } catch { return { schema_version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sources: [] }; }
}

function writeManifest(projectRoot, manifest) {
  const manifestPath = resolveManifestPath(projectRoot);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const tmpPath = manifestPath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmpPath, manifestPath);
}

// ─── Source I/O ──────────────────────────────────────────────────────────────

function writeSource(url, content, metadata, opts, projectRoot) { /* ... */ }
function readSource(slug, projectRoot) { /* ... */ }
function writeCrawl(url, pages, metadata, opts, projectRoot) { /* ... */ }
function writeSnapshot(url, content, projectRoot) { /* ... */ }
function readSnapshot(slug, projectRoot) { /* ... */ }

module.exports = {
  slugifyUrl,
  ensureCacheDir,
  resolveCacheDir,
  resolveManifestPath,
  readManifest,
  writeManifest,
  writeSource,
  readSource,
  writeCrawl,
  writeSnapshot,
  readSnapshot,
  CACHE_DIR_NAME,
  CACHE_SUBDIRS,
};
```

### sources-manifest.json Extended Schema
```json
{
  "schema_version": "1.1.0",
  "created_at": "2026-03-30T00:00:00.000Z",
  "updated_at": "2026-03-30T00:00:00.000Z",
  "sources": [
    {
      "slug": "competitor-com-pricing",
      "url": "https://competitor.com/pricing",
      "type": "scrape",
      "format": "markdown",
      "word_count": 1250,
      "scraped_at": "2026-03-30T12:00:00.000Z",
      "cached_path": ".planning/research/firecrawl-cache/scrapes/competitor-com-pricing.md",
      "added_by": "source-add"
    }
  ]
}
```

### .gitignore Entry
```gitignore
# Phase 199: Firecrawl scraped content cache (never committed)
.planning/research/firecrawl-cache/
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline content in context window | Write to cache, read sections as needed | Phase 199 (this phase) | Prevents 200K token overflow from crawl results |
| No source provenance tracking | sources-manifest.json with slug, URL, timestamp | Phase 199 (this phase) | Enables re-read without re-fetch, change tracking baseline |
| Each workflow manages own disk I/O | Single firecrawl-cache.cjs module | Phase 199 (this phase) | Consistent slug, atomic writes, single code path to test |

## Open Questions

1. **Crawl directory structure: flat files or subdirectories?**
   - What we know: ROADMAP says "job-id keyed directories" in crawls/. ARCHITECTURE says crawls/ directory.
   - What's unclear: Whether a crawl produces one file per page or one directory per crawl job.
   - Recommendation: Use one directory per crawl slug (e.g., `crawls/{slug}/`) with individual page files inside. This mirrors Firecrawl CLI output structure and prevents crawls/ from becoming a flat mess.

2. **Manifest location: .planning/ root vs .planning/research/?**
   - What we know: Template is at `templates/sources-manifest.json`. ARCHITECTURE shows instance at `.planning/sources-manifest.json`. ROADMAP references it in success criterion #4 without specifying path.
   - What's unclear: Whether it goes in .planning/ root (alongside config.json) or .planning/research/.
   - Recommendation: Place at `.planning/sources-manifest.json` (root of .planning/) since it is metadata about sources, not cached content. It should be committed to git (unlike the cache directory), matching config.json and other .planning/ state files.

3. **Event emission scope for Phase 199**
   - What we know: ARCHITECTURE says firecrawl-cache.cjs emits events. SUMMARY says event emission is Phase 203 scope.
   - What's unclear: Whether Phase 199 should wire event emission or defer it.
   - Recommendation: Defer event emission to Phase 203 (Change Tracking + Event Bus). Phase 199 should export an `emitEvent` placeholder or simply not wire it. The success criteria for Phase 199 do not mention events.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in assert (no test framework installed) |
| Config file | none -- tests use raw node execution |
| Quick run command | `node tests/phase-199/test-firecrawl-cache.cjs` |
| Full suite command | `node tests/phase-199/test-firecrawl-cache.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRL-03 | writeSource writes .md to scrapes/, readSource reads it back | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |
| CRL-03 | slugifyUrl is deterministic and filesystem-safe | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |
| CRL-03 | .gitignore contains firecrawl-cache entry | smoke | `grep firecrawl-cache .gitignore` | Wave 0 |
| CRL-03 | ensureCacheDir creates scrapes/, crawls/, snapshots/ | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |
| CRL-02 | writeSource + readSource round-trip without data loss | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |
| CRL-02 | Idempotent write (same slug twice, no overwrite without force) | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |
| CRL-02 | sources-manifest.json updated atomically on write | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |
| CRL-02 | Manifest not corrupted by concurrent PID-suffixed tmp writes | unit | `node tests/phase-199/test-firecrawl-cache.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/phase-199/test-firecrawl-cache.cjs`
- **Per wave merge:** `node tests/phase-199/test-firecrawl-cache.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-199/test-firecrawl-cache.cjs` -- covers CRL-03, CRL-02
- [ ] `tests/phase-199/` directory -- must be created

## Existing Codebase Patterns (Reference for Implementation)

### Atomic Write Pattern (from mcp-bridge.cjs)
```javascript
// bin/lib/mcp-bridge.cjs lines 788-790
const tmpPath = cfgPath + '.tmp';
fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
fs.renameSync(tmpPath, cfgPath);
```
Phase 199 should use PID-suffixed tmp files (`manifestPath + '.' + process.pid + '.tmp'`) for concurrent safety, matching the semaphore lockfile pattern.

### safeReadFile Pattern (from core.cjs)
```javascript
// bin/lib/core.cjs lines 44-50
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
```
Use for all read operations -- graceful null return on missing files.

### Module Export Pattern (from mcp-bridge.cjs)
```javascript
// All bin/lib modules export a flat object of functions
module.exports = {
  APPROVED_SERVERS,
  TOOL_MAP,
  lookupTool,
  probeFirecrawl,
  // ...
};
```

### .gitignore Entry Pattern (existing)
```gitignore
# Phase 126: Sync state file -- session-specific timestamps, not for git
.planning/.context-sync-state.json
.planning/.context-sync-state.json.*.tmp
.planning/sync-snapshots/

# Phase 143: PDE session worktrees (ephemeral, never committed)
.sessions/
```
Follow this comment+entry pattern for the firecrawl-cache entry.

## Sources

### Primary (HIGH confidence)
- `bin/lib/mcp-bridge.cjs` -- atomic write pattern (lines 788-790), semaphore pattern (lines 800-857), Firecrawl APPROVED_SERVERS and TOOL_MAP entries
- `bin/lib/core.cjs` -- safeReadFile helper, output/error patterns
- `bin/lib/event-bus.cjs` -- NDJSON append pattern, session ID management
- `templates/sources-manifest.json` -- existing empty template (schema_version 1.0.0)
- `.gitignore` -- existing entry patterns for .planning/ subdirectories
- `.planning/ROADMAP.md` lines 608-617 -- authoritative Phase 199 success criteria and path specifications
- `.planning/research/ARCHITECTURE.md` -- firecrawl-cache.cjs API surface, data flow diagrams, anti-patterns

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` -- phase ordering rationale, deliverables specification
- `.planning/research/PITFALLS.md` -- context overflow, credit burn pitfalls informing cache-first design

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero external deps, all patterns exist in codebase
- Architecture: HIGH -- ROADMAP + ARCHITECTURE research docs prescribe exact structure
- Pitfalls: HIGH -- well-documented in project research, all addressable with known patterns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable infrastructure -- internal module, no external API changes)
