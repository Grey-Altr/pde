# Architecture Research

**Domain:** Firecrawl CLI/API integration into existing PDE plugin architecture
**Researched:** 2026-03-30
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   PDE Plugin Layer (Claude Code)                      │
│  commands/*.md → workflows/*.md → references/*.md → agents/*.md      │
├───────────────────────────┬─────────────────────────────────────────┤
│  Firecrawl Plugin Skill   │   Existing MCP Layer (bin/lib/mcp-bridge)│
│  (firecrawl:firecrawl-cli │   APPROVED_SERVERS + TOOL_MAP            │
│   installed SKILL.md)     │   probe/degrade contracts                │
│                           │   per-server container blocks            │
│  /firecrawl:scrape        │  ┌─────────────────┐  ┌──────────────┐  │
│  /firecrawl:search        │  │ mcp__firecrawl  │  │ firecrawl    │  │
│  /firecrawl:crawl         │  │ __* (12 tools,  │  │ CLI binary   │  │
│  /firecrawl:map           │  │  MCP transport) │  │ (Bash        │  │
│  /firecrawl:agent         │  └─────────────────┘  │  subprocess) │  │
│  /firecrawl:setup         │                        └──────────────┘  │
├───────────────────────────┴─────────────────────────────────────────┤
│                    PDE Workflow Layer                                  │
│  competitive.md  → FIRECRAWL_AVAILABLE probe (replaces WEBSEARCH)    │
│  recommend.md    → firecrawl_search + existing WebSearch probes      │
│  brief.md        → --source-url flag + firecrawl_scrape ingestion    │
│  pde-phase-researcher → Firecrawl search loop for web evidence       │
│  [NEW] firecrawl.md → standalone orchestration skill                 │
├─────────────────────────────────────────────────────────────────────┤
│                    PDE Data Layer                                      │
│  .planning/design/strategy/  (CMP, IDT, OPP, BRF artifacts)         │
│  .planning/research/         (SUMMARY, STACK, FEATURES...)           │
│  .planning/phases/N-*/       (RESEARCH.md, PLAN.md per phase)        │
│  .planning/sources-manifest.json (source provenance registry)        │
│  .planning/firecrawl-cache/  [NEW] scraped content + snapshots       │
├─────────────────────────────────────────────────────────────────────┤
│                    Event Infrastructure                                │
│  hooks/emit-event.cjs → PostToolUse → NDJSON bus                     │
│  .planning/logs/*.ndjson (session-scoped event files)                │
│  bin/lib/firecrawl-cache.cjs [NEW] → emits firecrawl_* events        │
│  dashboard 7-pane tmux (real-time observability)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `firecrawl:firecrawl-cli` plugin skill | SKILL.md teaching Claude how to use CLI + MCP; injects `/firecrawl:*` commands | Installed (existing) |
| `mcp__firecrawl__*` MCP server | Structured tool calls: scrape, map, search, crawl, extract, agent, browser | Installed (existing) |
| `bin/lib/mcp-bridge.cjs` APPROVED_SERVERS | Security allowlist, probe/degrade contracts, container config | Needs `firecrawl` entry (NEW) |
| `bin/lib/mcp-bridge.cjs` TOOL_MAP | Canonical `firecrawl:*` → raw `mcp__firecrawl__*` name mapping | Needs 12 entries (NEW) |
| `bin/lib/firecrawl-cache.cjs` | On-disk cache I/O, sources-manifest updates, change-tracking diffs, event emission | New module (NEW) |
| `.planning/firecrawl-cache/` | On-disk store for scraped content, crawl results, change-tracking snapshots | New directory (NEW) |
| `templates/sources-manifest.json` | Schema for tracking ingested sources (existing template, zero usages today) | Extend schema (MODIFIED) |
| `workflows/competitive.md` | FIRECRAWL_AVAILABLE probe replaces WEBSEARCH_AVAILABLE for live competitor data | Modified |
| `workflows/recommend.md` | Add firecrawl_search alongside existing WebSearch probe for live MCP discovery | Modified |
| `workflows/brief.md` | Add `--source-url` flag alongside existing `--reference-url` Playwright path | Modified |
| `agents/pde-phase-researcher.md` | Add Firecrawl search + scrape step to Standard Mode for web-sourced evidence | Modified |
| `references/mcp-integration.md` | Add Firecrawl section (Path A/B docs, flag table, probe pattern) | Modified |
| `workflows/firecrawl.md` | Standalone Firecrawl orchestration skill for `/pde:firecrawl` command | New file (NEW) |
| `commands/firecrawl.md` | Slash command entry point for `/pde:firecrawl` | New file (NEW) |

---

## Integration Paths: MCP Server vs CLI vs Plugin Skill

Firecrawl exists in PDE's environment in three forms. Each serves a distinct role.

### Path A: MCP Server (`mcp__firecrawl__*`)

**Use for:** Inline tool calls from within workflows and agent tasks. Structured data extraction, search, scrape, asynchronous crawl jobs, browser sandbox sessions where JS rendering is needed.

The MCP tools are callable directly by Claude Code during workflow execution — no subprocess, no CLI invocation. This is the correct path for:
- `competitive.md` — `firecrawl_search` replaces WebSearch probe for live competitor data
- `recommend.md` — `firecrawl_search` for live MCP registry and library discovery
- `brief.md` — `firecrawl_scrape` for content ingestion from `--source-url`
- `pde-phase-researcher` agent — `firecrawl_search` + `firecrawl_scrape` for phase evidence
- `firecrawl_extract` for structured data extraction (competitor pricing, feature tables)
- `firecrawl_agent` + `firecrawl_agent_status` for autonomous multi-source research jobs
- `firecrawl_browser_create` + `firecrawl_browser_execute` for JS-heavy SPAs

**Registration required:** Add `firecrawl` to `APPROVED_SERVERS` in `mcp-bridge.cjs` (with container block for cloud sessions), populate `TOOL_MAP` with 12 canonical entries.

### Path B: CLI (`firecrawl` binary via Bash)

**Use for:** Bulk operations where the CLI's filesystem-output model is an advantage. Crawl an entire docs site saving to `.firecrawl/` directory tree; `firecrawl download` to produce local markdown files; change tracking runs on a schedule.

The CLI's `--output` flag writes directly to disk, avoiding large in-context payloads. This is the correct path for:
- `/pde:firecrawl crawl <url>` command — bulk site ingestion into `.planning/firecrawl-cache/`
- `firecrawl download` in competitive workflow to capture full competitor site snapshots
- Change tracking scrapes (`--format changeTracking`) executed on schedule or via watch command

**No APPROVED_SERVERS entry needed.** CLI runs as a Bash subprocess. Requires `FIRECRAWL_API_KEY` in environment.

### Path C: Plugin Skill (`firecrawl:firecrawl-cli` SKILL.md)

**Use for:** User-facing natural language invocations and Claude's own ad-hoc use when no workflow is orchestrating. The plugin skill file teaches Claude how to wire CLI + MCP together end-to-end, including auth setup.

**No PDE code changes needed.** The skill is already installed. PDE should reference it from `mcp-integration.md` as a first-class research tool.

### Decision Matrix

| Scenario | Integration Path |
|----------|----------------|
| Competitor data lookup in `competitive.md` | A — `firecrawl_search` + `firecrawl_extract` |
| Brief source URL content ingestion | A — `firecrawl_scrape` |
| Phase researcher web evidence lookup | A — `firecrawl_search` + `firecrawl_scrape` |
| Crawl entire competitor docs site | B — `firecrawl crawl --wait --output` |
| Bulk competitor site download | B — `firecrawl download` |
| Change tracking on watched URLs | B — `firecrawl scrape --format changeTracking` |
| JS-heavy SPA that needs browser | A — `firecrawl_browser_create` + `firecrawl_browser_execute` |
| Autonomous research from natural language | A — `firecrawl_agent` + poll `firecrawl_agent_status` |
| Structured data extraction with schema | A — `firecrawl_extract` with JSON schema |
| User-driven ad-hoc scraping | C — Plugin Skill `/firecrawl:*` |

---

## Recommended Project Structure Changes

```
bin/lib/
├── mcp-bridge.cjs          # MODIFIED: add firecrawl to APPROVED_SERVERS + TOOL_MAP
└── firecrawl-cache.cjs     # NEW: cache I/O, sources-manifest updates, diffs, events

workflows/
├── competitive.md          # MODIFIED: FIRECRAWL_AVAILABLE probe replaces WEBSEARCH_AVAILABLE
├── recommend.md            # MODIFIED: firecrawl_search alongside WebSearch probe
├── brief.md                # MODIFIED: --source-url flag, firecrawl_scrape path
├── firecrawl.md            # NEW: standalone Firecrawl orchestration workflow
└── ...

commands/
├── firecrawl.md            # NEW: /pde:firecrawl slash command entry
└── ...

references/
└── mcp-integration.md      # MODIFIED: add Firecrawl section (Path A + B docs)

agents/
└── pde-phase-researcher.md # MODIFIED: add Firecrawl search loop to Standard Mode

templates/
└── sources-manifest.json   # MODIFIED: extend schema for firecrawl source type

.planning/
├── firecrawl-cache/        # NEW directory: scraped content + change snapshots
│   ├── scrapes/            # Individual page scrapes (slug-keyed markdown files)
│   ├── crawls/             # Crawl job results (job-id keyed directories)
│   └── snapshots/          # Change-tracking baseline snapshots + diffs
└── sources-manifest.json   # Instance file wired to template
```

### Structure Rationale

- **`bin/lib/firecrawl-cache.cjs`:** Zero npm deps, CJS module matching existing bin/lib pattern (same as `mcp-bridge.cjs`, `core.cjs`). Handles all disk I/O so workflow files stay declarative.
- **`.planning/firecrawl-cache/`:** Mirrors `.planning/design/` and `.planning/phases/` pattern — all persistent state under `.planning/`. Separate from `design/` because scraped content is input material, not output artifacts.
- **`workflows/firecrawl.md`:** Follows existing skill workflow structure — `<purpose>`, `<skill_code>`, flags table, MCP probe section, step-by-step process, output format.
- **`commands/firecrawl.md`:** Thin command file following `competitive.md` pattern — YAML frontmatter + `@workflows/firecrawl.md` reference.

---

## Architectural Patterns

### Pattern 1: Firecrawl Probe/Degrade (mirrors existing WebSearch pattern)

**What:** All Firecrawl MCP usage in workflows follows the existing probe → use → degrade contract from `mcp-integration.md`. Probe once at workflow start, set `FIRECRAWL_AVAILABLE`, branch all subsequent Firecrawl calls behind that flag.

**When to use:** Every workflow that calls `mcp__firecrawl__*` tools. Not optional — this is the existing PDE contract for all MCP tools.

**Trade-offs:** Small overhead per workflow invocation. Enables graceful degradation to training knowledge when API key is missing or MCP server unreachable.

**Example (competitive.md replacement for WebSearch probe):**
```
IF --no-firecrawl NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false:
  Attempt: mcp__firecrawl__search with { query: "test", limit: 1 }
    Timeout: 10 seconds
    Success: SET FIRECRAWL_AVAILABLE = true
      Log: {timestamp} | CMP | firecrawl | probe | success | {ms}
    Failure: SET FIRECRAWL_AVAILABLE = false
      Log: {timestamp} | CMP | firecrawl | probe | failure | {ms}
      Tag: [Using training knowledge — install Firecrawl MCP for live data]
ELSE:
  SET FIRECRAWL_AVAILABLE = false
  Log: {timestamp} | CMP | firecrawl | probe | skipped | 0
```

### Pattern 2: Source Material Ingestion Flow

**What:** Scraped content enters PDE through a consistent pipeline: Firecrawl (scrape/search/crawl) → `firecrawl-cache.cjs` disk write → `sources-manifest.json` registration → workflow consumes by reading the cache file.

**When to use:** Any time a workflow needs to ingest URL content as upstream context (brief, competitive, recommend, researcher agent).

**Trade-offs:** Extra indirection vs inline content injection. Benefits: cached content survives session restarts; sources-manifest provides provenance; change-tracking diffs compare against the cache baseline.

**Data flow:**
```
Workflow requests URL ingestion
    ↓
firecrawl_scrape { url, formats: ["markdown"], onlyMainContent: true }
    ↓
firecrawl-cache.cjs.writeSource(url, markdown, metadata)
    → .planning/firecrawl-cache/scrapes/{slug}.md
    → .planning/sources-manifest.json updated with new entry
    ↓
Workflow reads .planning/firecrawl-cache/scrapes/{slug}.md as upstream context
    → Enriches artifact same way CMP/OPP context is consumed today
```

### Pattern 3: Firecrawl Browser Sandbox vs Playwright MCP (Hard Boundary)

**What:** These are architecturally separate tools serving different PDE layers. Firecrawl browser sandbox (`firecrawl_browser_create` + `firecrawl_browser_execute`) handles external content extraction. Playwright MCP handles PDE's internal design artifact evaluation.

**When to use:**
- Firecrawl browser: When `firecrawl_scrape` returns thin/empty content on a JS-rendered competitor site. Content extraction only.
- Playwright MCP: When PDE needs to evaluate its own design artifacts — wireframe screenshots, AOM snapshots, critique metric scripts, post-deploy smoke tests.

**Trade-offs:** Playwright MCP runs local Chromium with direct DOM access needed for PDE's `_evalMetric` scripts. Firecrawl browser is remote cloud Chromium — no local file access, higher latency, but zero local install requirement.

**Rule:** Never route PDE design evaluation tasks (wireframe, critique, mockup, deploy) through Firecrawl browser. Never route competitor site scraping through Playwright.

### Pattern 4: Asynchronous Crawl Jobs

**What:** `firecrawl_crawl` is asynchronous — returns a job ID immediately, crawl runs server-side. The `firecrawl_check_crawl_status` tool must be polled.

**When to use:** Any time a full site crawl is needed within an MCP workflow (Path A). For CLI-based crawls (Path B), use `firecrawl crawl --wait` which blocks the subprocess until complete.

**Trade-offs:** Polling adds workflow complexity. Async is unavoidable for large crawls.

**Implementation:**
```
firecrawl_crawl { url, maxDiscoveryDepth: 2, limit: 50 }
  → returns { id: "crawl-abc123" }
Poll loop (max 10 iterations, 15s interval):
  firecrawl_check_crawl_status { id: "crawl-abc123" }
    → { status: "scraping", completed: 12, total: 50 }  — continue
    → { status: "completed", data: [...] }              — consume results
    → { status: "failed" }                              — degrade gracefully
```

### Pattern 5: Change Tracking + Event Bus

**What:** Firecrawl's `changeTracking` scrape format produces a structured diff comparing the current page content against the cached baseline snapshot. PDE emits competitor content changes as events on the NDJSON bus.

**When to use:** Competitive monitoring, watched competitor URLs, pricing/feature change detection.

**Event emission (from `firecrawl-cache.cjs` — NOT from `emit-event.cjs`):**
```javascript
// firecrawl-cache.cjs emits application-level events via pde-tools.cjs subprocess
// (same pattern as existing emit-event.cjs for hooks)
if (diff && diff.length > 0) {
  spawnSync(pdeTools, ['event-emit', '--type', 'firecrawl_content_changed',
    '--extensions', JSON.stringify({ url, slug, word_count, diff_lines: diff.split('\n').length })
  ]);
}
```

---

## Data Flow

### Source Material Ingestion (Brief with `--source-url`)

```
/pde:brief --source-url https://competitor.com/about
    ↓
brief.md Step 3b: Probe firecrawl:probe
    ↓ FIRECRAWL_AVAILABLE = true
firecrawl_scrape { url, formats: ["markdown"], onlyMainContent: true }
    ↓
firecrawl-cache.cjs.writeSource(url, markdown)
    → .planning/firecrawl-cache/scrapes/competitor-com-about.md
    → .planning/sources-manifest.json: new entry { url, slug, scraped_at, word_count }
    ↓
brief.md Step 5: Read cached markdown as upstream context
    → Produces "## Source Material" section in BRF artifact
    → Enriches Brief same way CMP/OPP context is consumed today
```

### Competitive Research with Live Firecrawl Data

```
/pde:competitive
    ↓
competitive.md Step 3: Probe firecrawl:probe
    ↓ FIRECRAWL_AVAILABLE = true
Step 4: firecrawl_search { query: "top {category} tools 2026", limit: 10 }
    → Returns search results with scraped content summaries
Step 4b: firecrawl_extract { urls: [competitor_urls], schema: CompetitorSchema }
    → Extracts structured pricing, features, positioning data
    ↓
Step 5-7: Build CMP artifact using live Firecrawl data
    → Claims tagged [confirmed — firecrawl {date}]
    ↓ FIRECRAWL_AVAILABLE = false (degraded path)
Step 4: Use training knowledge, all claims tagged [inferred]
    → Same degradation path as existing WEBSEARCH_AVAILABLE = false path
```

### Phase Research Agent with Firecrawl

```
pde-phase-researcher agent (Standard Mode)
    ↓
Step 1: Read CONTEXT.md, REQUIREMENTS.md, STATE.md (unchanged)
Step 2: Codebase analysis — grep/read for integration points (unchanged)
Step 3 (NEW): IF phase requires external ecosystem knowledge:
    firecrawl_search { query: "{phase topic} best practices 2026", limit: 5 }
    firecrawl_scrape { url: official_docs_url, onlyMainContent: true }
    → Web-sourced evidence tagged HIGH confidence
Step 4: Write RESEARCH.md
    → New "## Web Evidence" section when Step 3 was executed
```

### Change Tracking Flow

```
/pde:firecrawl watch https://competitor.com/pricing
    ↓
firecrawl-cache.cjs.readSnapshot(url)
    ↓ snapshot exists
firecrawl_scrape { url, formats: ["markdown", "changeTracking"] }
    → response.changeTracking.gitDiff populated if content changed
    ↓
firecrawl-cache.cjs.updateSnapshot(url, newContent, diff)
    → .planning/firecrawl-cache/snapshots/{slug}-diff.md written
    → Emits firecrawl_content_changed event to NDJSON bus
    → Dashboard Pane 5 (log stream) surfaces change summary
    ↓ no snapshot yet
firecrawl_scrape { url, formats: ["markdown"] }
    → firecrawl-cache.cjs.writeSnapshot(url, content)
    → "Baseline captured — future watches will produce diffs"
```

---

## Integration Points

### New Entry in `mcp-bridge.cjs` APPROVED_SERVERS

Follows the Stitch/Playwright pattern exactly:

```javascript
firecrawl: {
  displayName: 'Firecrawl',
  transport: 'stdio',
  url: null,
  installCmd: 'claude mcp add firecrawl -e FIRECRAWL_API_KEY=your-key -- npx -y firecrawl-mcp',
  probeTimeoutMs: 10000,
  probeTool: 'mcp__firecrawl__search',  // lightest read-only tool, no side effects
  probeArgs: { query: 'test', limit: 1 },
  container: {
    image: 'node:20-slim',
    startupMs: 3000,
    cmd: ['npx', 'firecrawl-mcp'],
  },
},
```

### New TOOL_MAP entries (12 entries)

```javascript
// Firecrawl — verified against docs.firecrawl.dev/mcp-server 2026-03-30
'firecrawl:probe'              → 'mcp__firecrawl__search'
'firecrawl:scrape'             → 'mcp__firecrawl__scrape'
'firecrawl:search'             → 'mcp__firecrawl__search'
'firecrawl:map'                → 'mcp__firecrawl__map'
'firecrawl:crawl'              → 'mcp__firecrawl__crawl'
'firecrawl:check-crawl-status' → 'mcp__firecrawl__check_crawl_status'
'firecrawl:extract'            → 'mcp__firecrawl__extract'
'firecrawl:agent'              → 'mcp__firecrawl__agent'
'firecrawl:agent-status'       → 'mcp__firecrawl__agent_status'
'firecrawl:browser-create'     → 'mcp__firecrawl__browser_create'
'firecrawl:browser-execute'    → 'mcp__firecrawl__browser_execute'
'firecrawl:browser-delete'     → 'mcp__firecrawl__browser_delete'
```

### Modified: `workflows/competitive.md`

**Current:** `WEBSEARCH_AVAILABLE` probe against `mcp__websearch__search`. Flag: `--no-websearch`.

**New:** `FIRECRAWL_AVAILABLE` probe against `firecrawl:probe`. Flag: `--no-firecrawl`. The `--no-mcp` flag continues to disable all MCPs. Confidence label `[confirmed via WebSearch]` becomes `[confirmed via Firecrawl — {date}]`. The degradation path (training knowledge with `[inferred]` labels) is unchanged.

No new output format. The CMP artifact schema does not change.

### Modified: `workflows/recommend.md`

**Current:** WebSearch probe for MCP discovery.

**New:** Add `FIRECRAWL_AVAILABLE` probe alongside `WEBSEARCH_AVAILABLE`. When Firecrawl is available, scrape MCP registry pages (smithery.ai, mcpservers.org) directly for relevant server listings — full page content vs keyword search snippets. WebSearch remains as secondary fallback.

### Modified: `workflows/brief.md`

**Current flag:** `--reference-url` — Playwright screenshot capture for visual reference.

**New flag:** `--source-url` — Firecrawl content ingestion for semantic reference.

These are additive, not conflicting. `--reference-url` captures visual appearance; `--source-url` captures textual content. A user can pass both. The BRF artifact gains a `## Source Material` section when `--source-url` is used, mirroring the existing `## Reference Screenshot` section.

### Modified: `agents/pde-phase-researcher.md`

**Current Standard Mode:** read context files → codebase analysis → write RESEARCH.md.

**New Standard Mode:** read context files → codebase analysis → (if external ecosystem knowledge needed) Firecrawl search + scrape → write RESEARCH.md.

Trigger for web lookup: when the phase requires knowledge of external APIs, third-party libraries, or ecosystem patterns that cannot be resolved from the codebase alone. The researcher checks codebase first (unchanged), then uses Firecrawl search as the primary web evidence tool. The RESEARCH.md gains an optional `## Web Evidence` section.

### New: `workflows/firecrawl.md` + `commands/firecrawl.md`

Standalone orchestration skill for power-user Firecrawl operations. Subcommands:

| Subcommand | Path | Behavior |
|-----------|------|----------|
| `scrape <url>` | A (MCP) | Single page → cache + sources-manifest |
| `search <query>` | A (MCP) | Web search, optional auto-scrape of results |
| `map <url>` | A (MCP) | URL discovery, writes sitemap to cache |
| `crawl <url>` | A (MCP) or B (CLI) | Full site, async job with progress, writes to cache |
| `watch <url>` | A (MCP) | Change tracking: scrape + diff against snapshot |
| `agent <prompt>` | A (MCP) | Autonomous multi-source research, async |

### New: `bin/lib/firecrawl-cache.cjs`

Zero npm deps. CJS module matching existing `bin/lib/` pattern. Responsibilities:
- `readSource(slug)` — read scraped content from `.planning/firecrawl-cache/scrapes/`
- `writeSource(url, content, metadata)` — write markdown + update sources-manifest
- `readSnapshot(url)` — read change-tracking baseline content
- `writeSnapshot(url, content)` — write new baseline
- `diffSnapshots(oldContent, newContent)` — produce unified diff string (no git dependency)
- `slugify(url)` — deterministic URL → safe filename (replaces `://` and `/` with `-`)
- `emitEvent(type, extensions)` — call `pde-tools.cjs event-emit` as subprocess

### Boundary: Firecrawl Browser Sandbox vs Playwright MCP

Hard architectural boundary. Two browser systems, two PDE layers, no crossover:

| Concern | Firecrawl Browser Sandbox | Playwright MCP |
|---------|--------------------------|----------------|
| Layer | Content ingestion (external sources) | Design evaluation (PDE artifacts) |
| Trigger | Competitive research, source material | Wireframe, critique, deploy smoke tests |
| Access model | Remote cloud Chromium | Local Chromium via MCP |
| DOM tools | Python/Node/Bash code execution | PDE `_evalMetric` contract scripts |
| Screenshot purpose | Content capture only | Visual evaluation + circuit breaker |
| Workflows that use it | competitive, brief, firecrawl | wireframe, critique, mockup, deploy |

---

## Anti-Patterns

### Anti-Pattern 1: Replacing All WebFetch Calls with Firecrawl

**What people do:** Replace every `WebFetch` call in every workflow with `firecrawl_scrape` because "it's better."

**Why it's wrong:** WebFetch is built into Claude Code with no external API dependency. Firecrawl requires a paid API key (credits-based model). Replacing WebFetch wholesale increases API costs and creates a hard dependency on Firecrawl availability for tasks that don't need JS rendering, caching, or change tracking.

**Do this instead:** Use Firecrawl when JS rendering is needed, content must be cached or change-tracked, or structured extraction is required. Use WebFetch for one-off documentation lookups in research agents where content won't be stored or tracked.

### Anti-Pattern 2: Dual Registration in APPROVED_SERVERS and Dynamic Servers

**What people do:** Add Firecrawl to `APPROVED_SERVERS` for static workflows AND register it via `loadDynamicServers` for app wrappers.

**Why it's wrong:** The dynamic server path is for user-installed apps discovered via `app-registry.json`. Firecrawl is a first-class PDE integration (same tier as GitHub, Linear, Figma). Dual registration causes TOOL_MAP key collisions and ambiguous probe resolution.

**Do this instead:** Add Firecrawl only to the static `APPROVED_SERVERS` block. It is not a user-discovered dynamic app — it is a PDE-managed integration.

### Anti-Pattern 3: Blocking Inline on firecrawl_crawl

**What people do:** Call `firecrawl_crawl` inside a synchronous workflow step and await results inline.

**Why it's wrong:** `firecrawl_crawl` is asynchronous — returns a job ID immediately. The crawl runs server-side and may take minutes. Blocking inline causes timeouts.

**Do this instead:** Use the async poll pattern (crawl → store job ID → poll `firecrawl_check_crawl_status`). For workflows that need synchronous behavior, use the CLI `firecrawl crawl --wait` in a Bash subprocess where blocking is acceptable, or use `firecrawl_scrape` with limited depth for smaller surface areas.

### Anti-Pattern 4: Storing Raw HTML in firecrawl-cache

**What people do:** Store full HTML output from Firecrawl scrapes to "preserve fidelity."

**Why it's wrong:** HTML is large, not LLM-readable, and pollutes `.planning/` which feeds editor sync and context generation. All downstream consumers (competitive.md, brief.md, researcher agent) need markdown.

**Do this instead:** Always request `formats: ["markdown"]` with `onlyMainContent: true` for article content. Cache the markdown output only. Store structured JSON only when `firecrawl_extract` is used with a schema and the schema output is the artifact.

### Anti-Pattern 5: Emitting Firecrawl Events via emit-event.cjs HOOK_TO_EVENT_TYPE

**What people do:** Add `firecrawl_scrape_complete` to the `HOOK_TO_EVENT_TYPE` map in `emit-event.cjs`.

**Why it's wrong:** `emit-event.cjs` maps Claude Code hook events (SubagentStart, PostToolUse) — not application-level events. Firecrawl completion is an application event that originates from `firecrawl-cache.cjs`, not from a Claude Code hook.

**Do this instead:** Emit Firecrawl events from `firecrawl-cache.cjs` by calling `pde-tools.cjs event-emit` as a subprocess. Use the `extensions` field for `{ url, word_count, format, cached_path }`. This is the same pattern `emit-event.cjs` uses internally.

### Anti-Pattern 6: Using Firecrawl Browser for PDE Design Evaluation

**What people do:** Route PDE wireframe screenshot capture or mockup critique through `firecrawl_browser_execute` because "it also does browser automation."

**Why it's wrong:** PDE's design evaluation requires `_evalMetric` script execution against local artifact files. Firecrawl's browser sandbox is a remote cloud instance with no access to local `.planning/design/` files. It would require serving the artifacts over HTTP before the browser can reach them.

**Do this instead:** Use Playwright MCP for all PDE design artifact evaluation. Use Firecrawl browser only for scraping external URLs that require JS rendering.

---

## Suggested Build Order

Dependencies drive this ordering. Each phase unblocks the next.

### Phase 1: mcp-bridge Registration (Foundation)

**Deliverable:** `firecrawl` entry in `APPROVED_SERVERS` + 12 TOOL_MAP entries + container config block.

**Why first:** Every subsequent workflow integration calls `mcp-bridge.cjs` for tool name resolution. Without this registration, no workflow can probe or call Firecrawl MCP tools through the canonical name system. All downstream tests depend on TOOL_MAP being present.

**Files modified:** `bin/lib/mcp-bridge.cjs`

**Tests:** mcp-bridge unit tests — probe resolves correctly, TOOL_MAP maps all 12 names, degrade path returns empty tool name, container config present.

### Phase 2: firecrawl-cache.cjs + Sources Manifest Wiring (Data Layer)

**Deliverable:** `bin/lib/firecrawl-cache.cjs` with read/write/slug/diff/emit, `.planning/firecrawl-cache/` directory structure, extended `sources-manifest.json` schema with firecrawl source type.

**Why second:** Workflows need a stable place to write scraped content before any workflow modifications. The cache module also provides the event emission substrate for Phase 5 (change tracking).

**Files new:** `bin/lib/firecrawl-cache.cjs`
**Files modified:** `templates/sources-manifest.json`

**Tests:** Unit tests for slug generation, read/write round-trip, diff function, manifest update idempotency.

### Phase 3: competitive.md + recommend.md Firecrawl Probes (High-Value Workflow Integration)

**Deliverable:** `WEBSEARCH_AVAILABLE` → `FIRECRAWL_AVAILABLE` migration in competitive.md; Firecrawl search added to recommend.md alongside WebSearch; all flags and confidence labels updated; `mcp-integration.md` Firecrawl section added.

**Why third:** These are the highest-value integrations (live competitor data, live MCP discovery). They have no cache dependency — search results stay in-context. Depends only on Phase 1 (TOOL_MAP).

**Files modified:** `workflows/competitive.md`, `workflows/recommend.md`, `references/mcp-integration.md`

**Tests:** Nyquist structural tests for probe-available and probe-unavailable paths in both workflows; confidence label assertions; degradation path completeness checks.

### Phase 4: brief.md Source URL + pde-phase-researcher Firecrawl Loop (Research Integration)

**Deliverable:** `--source-url` flag on brief.md with scrape → cache write → context injection → BRF `## Source Material` section; pde-phase-researcher agent gains Firecrawl search step for external knowledge.

**Why fourth:** Depends on Phase 2 (cache write) and Phase 1 (TOOL_MAP). The researcher agent change influences all future phase research sessions — should be stable before Phase 5.

**Files modified:** `workflows/brief.md`, `agents/pde-phase-researcher.md`

**Tests:** Brief with `--source-url` produces source material section in BRF artifact; researcher RESEARCH.md contains `## Web Evidence` section when external lookup was triggered; both skip gracefully when FIRECRAWL_AVAILABLE = false.

### Phase 5: /pde:firecrawl Standalone Skill (Orchestration Layer)

**Deliverable:** `workflows/firecrawl.md` with 6 subcommands (scrape/crawl/search/map/watch/agent), `commands/firecrawl.md` slash command entry, event emission from cache module for all operations.

**Why fifth:** Depends on Phase 1 (TOOL_MAP) and Phase 2 (cache). Can run in parallel with Phases 3-4 since it exercises the same tool calls but benefits from those phases being tested first.

**Files new:** `workflows/firecrawl.md`, `commands/firecrawl.md`

**Tests:** Nyquist tests for all 6 subcommands; cache write verification; sources-manifest update verification; graceful degradation when `FIRECRAWL_AVAILABLE = false`; async crawl poll loop test.

### Phase 6: Change Tracking + Event Bus (Observability)

**Deliverable:** `firecrawl_content_changed` event emitted to NDJSON bus when diff is non-empty; `watch` subcommand in firecrawl.md fully wired to cache snapshot module; idle catalog updated with watch/change suggestions.

**Why sixth (last):** Optional observability layer. Depends on Phase 2 (snapshot module) and Phase 5 (watch subcommand). No other phase depends on this.

**Files modified:** `bin/lib/firecrawl-cache.cjs` (snapshot + event emit calls), `.planning/idle-catalog.md`

**Tests:** Event schema validation — `firecrawl_content_changed` only emitted when diff is non-empty; NDJSON line format correct; snapshot baseline write on first watch; diff write on subsequent watch.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Solo developer (current) | In-memory probe results, per-session cache, no expiry needed |
| Team / concurrent sessions | Cache reads are safe concurrent (read-only files). `writeSource` and `updateSnapshot` need advisory lock in `firecrawl-cache.cjs` — same pattern as `pde-tools.cjs` lock logic |
| High-frequency change tracking | Move from manual/cron triggers to Firecrawl Observer (open source). PDE emits to event bus regardless of trigger mechanism |
| API credit limits | Surface Firecrawl credit usage in `/pde:health` alongside existing Stitch quota display. Add `--max-credits` guard in firecrawl.md for expensive operations (crawl, agent) |

### Scaling Priorities

1. **First bottleneck:** Sources-manifest append is the only shared write when multiple parallel research agents scrape different URLs. Prevention: slug-based filenames ensure no file collisions; only the manifest JSON file needs an advisory lock.
2. **Second bottleneck:** Firecrawl API credits. `firecrawl_extract` (LLM-based, 5 credits/page) and `firecrawl_agent` (variable) are expensive. The standalone firecrawl.md skill should display credit estimate before executing and respect `--max-credits` flag.

---

## Sources

- Firecrawl MCP Server docs: https://docs.firecrawl.dev/mcp-server (verified 2026-03-30) — HIGH confidence
- Firecrawl CLI docs: https://docs.firecrawl.dev/sdks/cli (verified 2026-03-30) — HIGH confidence
- Firecrawl Claude Code integration: https://www.firecrawl.dev/integrations/claude-code (verified 2026-03-30) — HIGH confidence
- Firecrawl official Claude plugin: https://www.firecrawl.dev/blog/firecrawl-official-claude-plugin (verified 2026-03-30) — HIGH confidence
- Firecrawl Change Tracking: https://docs.firecrawl.dev/features/change-tracking (verified 2026-03-30) — HIGH confidence
- Firecrawl CLI GitHub: https://github.com/firecrawl/cli (verified 2026-03-30) — HIGH confidence
- PDE `bin/lib/mcp-bridge.cjs` — APPROVED_SERVERS + TOOL_MAP patterns — HIGH confidence (direct codebase read)
- PDE `hooks/hooks.json` — PostToolUse + event patterns — HIGH confidence (direct codebase read)
- PDE `workflows/competitive.md` — WEBSEARCH_AVAILABLE probe pattern — HIGH confidence (direct codebase read)
- PDE `agents/pde-phase-researcher.md` — Standard Mode research structure — HIGH confidence (direct codebase read)
- PDE `workflows/brief.md` — --reference-url Playwright pattern that --source-url mirrors — HIGH confidence (direct codebase read)

---
*Architecture research for: Firecrawl CLI/API integration into PDE*
*Researched: 2026-03-30*
