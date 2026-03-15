# MCP Integration Reference Library

> Shared MCP middleware patterns for all PDE skills. Defines probe/use/degrade patterns,
> global flags, debug logging, and per-MCP enhancement recipes.
> Loaded via `@` reference from any skill that integrates with MCP servers.
>
> **Version:** 1.0
> **Scope:** MCP detection, usage, and degradation patterns for all 7 MCP servers (2 universal + 5 targeted)
> **Ownership:** Shared (all skills)
> **Boundary:** This file owns detection/usage/degradation patterns only. Skill-specific logic (what each skill does WITH MCP data) lives in individual skill files. Installation/setup lives in `/pde:setup`. Testing lives in `/pde:test`.

---

<!-- TIER: essentials -->

## Global Flags

All PDE skills support these MCP control flags. Check for flags in skill arguments BEFORE probing any MCP.

### --no-mcp

Skip ALL MCP probes. Run skill in pure baseline mode using only training knowledge and local files.

**Behavior:**
- No MCP tools are attempted
- All MCP-enhanced sections use degraded output
- Source tags show `[Baseline mode -- MCPs disabled via --no-mcp]`
- Faster execution (no probe overhead)
- Useful for: offline work, debugging, comparing baseline vs enhanced output

### --no-{name}

Skip a specific MCP while allowing others. Supported flags:

| Flag | MCP Skipped | Use Case |
|------|-------------|----------|
| `--no-playwright` | Playwright MCP | Skip browser validation when headless Chrome unavailable |
| `--no-axe` | Axe a11y MCP | Skip accessibility scanning when not needed |
| `--no-figma` | Figma MCP | Skip Figma import/sync when working offline |
| `--no-context7` | Context7 MCP | Skip library doc lookup when using known APIs |
| `--no-superpowers` | Superpowers MCP | Skip browser preview offers |
| `--no-sequential-thinking` | Sequential Thinking MCP | Skip enhanced reasoning (faster, fewer tokens) |
| `--no-reference-mcp` | Reference MCP (PDE) | Force @ inline loading instead of MCP queries |

### Flag Detection Pattern

```
Before ANY MCP probe:
1. Check if --no-mcp is present in skill arguments
   -> If yes: set ALL_MCP_DISABLED = true, skip all probes
2. Check if --no-{name} is present for the specific MCP about to be probed
   -> If yes: skip that MCP's probe, use degraded path
3. Otherwise: proceed with probe
```

## Debug Logging

All MCP interactions are logged for diagnostics. Skills MUST log every probe attempt, successful call, and failure.

### Log Location

```
${CLAUDE_PLUGIN_ROOT}/mcp-debug.log
```

### Log Format

Each entry is a single line:

```
{timestamp} | {skill_code} | {mcp_name} | {operation} | {result} | {duration_ms}
```

**Field definitions:**

| Field | Format | Example |
|-------|--------|---------|
| timestamp | ISO 8601 | 2026-03-11T14:30:00Z |
| skill_code | Skill code from registry | SYS, WFR, CRT |
| mcp_name | MCP identifier | playwright, axe, figma, context7, superpowers, sequential-thinking, reference-mcp |
| operation | What was attempted | probe, screenshot, audit, query, browser-preview, think |
| result | Outcome | success, failure, timeout, skipped |
| duration_ms | Milliseconds elapsed | 1234 |

### Log Management

- **Mode:** Append-only
- **Rotation:** Rotate when file exceeds 1MB (rename to mcp-debug.log.1, start fresh)
- **Retention:** Keep current + 1 rotated file (2MB max disk usage)
- **Read by:** `/pde:test` for MCP reliability tracking, `/pde:setup --health` for diagnostics

### Example Log Entries

```
2026-03-11T14:30:00Z | WFR | playwright | probe | success | 450
2026-03-11T14:30:01Z | WFR | playwright | screenshot | success | 2340
2026-03-11T14:30:04Z | WFR | axe | probe | failure | 5012
2026-03-11T14:30:04Z | WFR | axe | audit | skipped | 0
2026-03-11T14:31:00Z | SYS | figma | probe | timeout | 15000
2026-03-11T14:31:00Z | SYS | figma | token-import | skipped | 0
```

## Universal MCPs

Universal MCPs enhance EVERY skill. They are probed on every skill invocation unless disabled via flags.

### Superpowers MCP

**Purpose:** Browser preview for HTML output and file operations.
**Package:** Local install at `~/.claude/mcp-servers/superpower-mcp/`
**Transport:** stdio

#### Probe

Attempt to use the Superpowers browser preview tool with a minimal test:

```
Attempt: mcp__superpower__browser_preview (or equivalent tool name)
  with minimal HTML content ("<html><body>probe</body></html>")
Result:
  - Tool responds: SUPERPOWERS_AVAILABLE = true
  - Tool not found or errors: SUPERPOWERS_AVAILABLE = false
```

**Timeout:** 10 seconds
**Retry:** 1 (retry once on failure before degrading)

#### Enhancement Recipes

**HTML-Producing Skills** (wireframe, mockup, system, hig, handoff, docs):
After generating HTML output, offer browser preview:

```
"Open {file_name} in browser? (y/n)"
```

- NEVER auto-open. Always ask user first (per CONTEXT.md decision)
- If user confirms: open via Superpowers browser preview tool
- If user declines or MCP unavailable: provide file path for manual opening
- For multi-screen output: offer preview of index page, not individual screens

**File Operations:**
- Use Superpowers file operations for writing large output files when available
- Falls back to standard file writing when unavailable

#### Degradation

When unavailable:
- Skip browser preview offer
- Provide file path with manual opening instruction: "Open {absolute_path} in your browser to preview"
- No source tag needed (preview is an interactive offer, not output content)

#### Log Entry

```
{timestamp} | {skill_code} | superpowers | browser-preview | {result} | {duration_ms}
```

### Sequential Thinking MCP

**Purpose:** Deeper multi-step reasoning for complex analysis tasks.
**Package:** `@modelcontextprotocol/server-sequential-thinking`
**Transport:** stdio

#### Probe

```
Attempt: mcp__sequential-thinking__think
  with test prompt ("Analyze the following: test")
Result:
  - Tool responds with reasoning: SEQUENTIAL_THINKING_AVAILABLE = true
  - Tool not found or errors: SEQUENTIAL_THINKING_AVAILABLE = false
```

**Timeout:** 30 seconds
**Retry:** 1 (retry once on failure before degrading)

#### Enhancement Recipes

**Subagent Complex Analysis** (use in Task() subagents for deeper reasoning):

| Skill | Enhancement Point | What Sequential Thinking Adds |
|-------|------------------|-------------------------------|
| /pde:critique | Perspective analysis | Deeper reasoning per perspective (7 perspectives), cross-perspective synthesis |
| /pde:hig | WCAG audit pipeline | Step-by-step criterion evaluation, edge case identification |
| /pde:system | Category generation | Cross-category coherence analysis (7 categories), dependency reasoning |
| /pde:mockup | Interaction planning | State machine analysis, edge case flows, animation sequencing |
| /pde:hardware | DFM analysis | Manufacturing constraint reasoning, material compatibility |
| /pde:wireframe | Layout decisions | Responsive breakpoint strategy, component hierarchy |

**Main Conversation** (use in main thread for orchestration decisions):

| Context | Enhancement Point | What Sequential Thinking Adds |
|---------|------------------|-------------------------------|
| /pde:setup | Troubleshooting | Systematic diagnosis of failed installations, root cause analysis |
| /pde:test | Failure diagnosis | Pattern recognition across test failures, regression identification |
| /pde:iterate | Revision strategy | Optimal revision approach selection (full re-run vs targeted edit) |
| /pde:opportunity | RICE scoring | Multi-factor scoring calibration, market signal synthesis |

#### Degradation

When unavailable:
- Use standard Claude reasoning (still produces good output, just less structured multi-step analysis)
- No source tag needed (reasoning enhancement is internal, not visible in output sections)
- Log the degradation for MCP reliability tracking

#### Log Entry

```
{timestamp} | {skill_code} | sequential-thinking | think | {result} | {duration_ms}
```

---

<!-- TIER: standard -->

## Targeted MCPs

Targeted MCPs enhance specific skills. They are probed only when the current skill has recipes for them.

### Figma MCP

**Purpose:** Import design tokens from Figma files, push PDE-generated tokens back.
**URL:** `https://mcp.figma.com/mcp`
**Transport:** HTTP (special -- not stdio like others)
**Auth:** Requires Figma account with file access permissions
**Stability:** STABLE

#### Probe

```
Attempt: Figma MCP read operation (e.g., get_variable_defs or list files)
Result:
  - Tool responds: FIGMA_MCP_AVAILABLE = true
  - Tool not found, auth error, or timeout: FIGMA_MCP_AVAILABLE = false
```

**Timeout:** 15 seconds
**Retry:** 0 (degrade immediately -- network-dependent, retry unlikely to help)

#### Enhancement Recipes

**Token Import** (/pde:system):
1. Read design variables from Figma file (colors, spacing, typography)
2. Map Figma variables to PDE token format (OKLCH color values, rem spacing, modular scale)
3. Generate tokens.css with Figma-sourced values
4. Report mapping coverage: "Imported {N} of {M} Figma variables"
5. Tag: `[Enhanced by Figma MCP -- tokens imported from Figma file]`

**Token Push** (/pde:system --push-figma):
1. Read PDE-generated tokens from tokens.css
2. Map PDE tokens to Figma variable format
3. Push variables to specified Figma file
4. Report: "Pushed {N} tokens to Figma file {name}"
5. Tag: `[Tokens pushed to Figma via Figma MCP]`

**Component Reading** (/pde:system, /pde:wireframe):
1. Read component definitions from Figma file
2. Map to PDE component patterns
3. Use as input for component generation

#### Degradation

When unavailable:
- Generate tokens from PDE algorithms (color-systems.md, typography.md)
- Tag: `[Generated from PDE algorithms -- install Figma MCP to import from your Figma file]`
- Push operations fail gracefully: "Figma MCP not available. Export tokens.css manually to Figma."

#### Auth Requirements

- Figma account with access to target file
- Added via: `claude mcp add --transport http figma https://mcp.figma.com/mcp`
- Auth is handled through Figma's own OAuth flow during first use
- `/pde:setup` guides through this process

#### Log Entry

```
{timestamp} | {skill_code} | figma | {token-import|token-push|component-read|probe} | {result} | {duration_ms}
```

### Playwright MCP

**Purpose:** Browser automation for screenshot capture, responsive validation, link testing, interaction testing.
**Package:** `@playwright/mcp@latest`
**Transport:** stdio (via npx)
**Install:** `claude mcp add playwright -- npx @playwright/mcp@latest`
**Stability:** STABLE

#### Probe

```
Attempt: browser_navigate to about:blank
Result:
  - Navigation succeeds: PLAYWRIGHT_AVAILABLE = true
  - Tool not found or browser launch fails: PLAYWRIGHT_AVAILABLE = false
```

**Timeout:** 30 seconds
**Retry:** 0 (degrade immediately -- browser operations vary in duration)

#### Enhancement Recipes

**Post-Generation Validation** (/pde:wireframe, /pde:mockup -- auto-run after generation):
1. Open generated HTML in headless browser
2. Take screenshots at three breakpoints:
   - Mobile: 375px width
   - Tablet: 768px width
   - Desktop: 1440px width
3. Check for: broken layouts, missing assets, overflow content
4. Verify accessibility tree completeness
5. Report findings inline in skill output
6. Tag: `[Validated by Playwright MCP]`

**Responsive Verification** (/pde:wireframe, /pde:mockup):
1. Navigate to each generated screen
2. Resize viewport through breakpoints
3. Check for layout breakage, text truncation, hidden content
4. Report responsive issues per breakpoint

**Link Testing** (/pde:wireframe, /pde:mockup, /pde:handoff):
1. Crawl all internal links in generated HTML
2. Verify each resolves to an existing file or anchor
3. Report broken links with source location

**Interaction Testing** (/pde:mockup):
1. Test interactive elements (modals, dropdowns, tabs, forms)
2. Verify state transitions work correctly
3. Report broken interactions

**Accessibility Tree** (/pde:hig):
1. Extract accessibility tree from generated HTML
2. Compare against expected ARIA roles and landmarks
3. Report missing or incorrect accessibility semantics

#### Degradation

When unavailable:
- Skip automated validation
- Tag: `[Not validated -- install Playwright MCP for automated browser testing]`
- Suggest manual check: "Open {absolute_path} in your browser to verify layout and responsiveness"

#### Log Entry

```
{timestamp} | {skill_code} | playwright | {probe|screenshot|navigate|click|accessibility-tree} | {result} | {duration_ms}
```

### Axe a11y MCP

**Purpose:** Automated WCAG 2.2 accessibility audits via axe-core engine.
**Package:** `a11y-mcp` (open source, free, MPL-2.0)
**Transport:** stdio (via npx)
**Install:** `claude mcp add a11y -- npx -y a11y-mcp`
**Stability:** STABLE

> **Note:** Use `a11y-mcp` (free, MPL-2.0), NOT Deque `axe-mcp-server` (requires paid Axe DevTools subscription). Both use the same axe-core engine. `/pde:setup` offers both options, defaulting to a11y-mcp.

#### Probe

```
Attempt: Accessibility audit on minimal test HTML
Result:
  - Audit returns results: AXE_AVAILABLE = true
  - Tool not found or errors: AXE_AVAILABLE = false
```

**Timeout:** 20 seconds
**Retry:** 0 (degrade immediately -- scan complexity varies)

#### Enhancement Recipes

**Deep WCAG Scan** (/pde:hig):
1. Run axe-core audit on all generated HTML artifacts
2. Map violations to WCAG 2.2 success criteria
3. Categorize by severity: critical, serious, moderate, minor
4. Provide remediation guidance per violation
5. Include HTML snippet showing violation context
6. Tag: `[Enhanced by Axe MCP -- automated WCAG 2.2 scan]`

**Compliance Perspective** (/pde:critique):
1. Run axe-core on all HTML artifacts in current project
2. Summarize findings for the Compliance perspective group
3. Severity-weighted scoring (critical violations weight 1.5x)
4. Tag: `[Enhanced by Axe MCP -- automated accessibility audit]`

**Post-Generation Check** (/pde:wireframe, /pde:mockup):
1. Quick accessibility scan after HTML generation
2. Report critical and serious violations only (skip moderate/minor for speed)
3. Tag: `[Accessibility checked by Axe MCP]`

#### Degradation

When unavailable:
- Use manual WCAG checklist from wcag-baseline.md reference
- Perform best-effort analysis based on HTML structure inspection
- Tag: `[Manual accessibility review -- install a11y MCP for automated WCAG scanning]`

#### Log Entry

```
{timestamp} | {skill_code} | axe | {probe|audit|quick-check} | {result} | {duration_ms}
```

### Context7 MCP

**Purpose:** Fetch current library documentation for artifact accuracy.
**Package:** `@upstash/context7-mcp@latest`
**Transport:** stdio (via npx)
**Install:** Already installed globally (verified in ~/.claude/.mcp.json)
**Stability:** STABLE

#### Probe

```
Attempt: mcp__context7__resolve-library-id with a known library (e.g., "react")
Result:
  - Returns library ID: CONTEXT7_AVAILABLE = true
  - Tool not found or errors: CONTEXT7_AVAILABLE = false
```

**Timeout:** 10 seconds
**Retry:** 0 (degrade immediately -- simple lookups)

#### Enhancement Recipes

**Library Doc Lookup** (all artifact-producing skills: /pde:system, /pde:wireframe, /pde:mockup, /pde:handoff, /pde:hardware):
1. Identify libraries/frameworks referenced in current project or being generated
2. Resolve library IDs via resolve-library-id
3. Fetch current API docs for referenced libraries
4. Use current docs to ensure generated code uses correct, non-deprecated APIs
5. Tag: `[API accuracy enhanced by Context7 MCP]`

**Framework-Specific Patterns** (/pde:handoff):
1. Detect target framework from project context (React, Vue, Svelte, etc.)
2. Fetch current component patterns, hooks API, lifecycle methods
3. Generate component stubs using verified current API
4. Tag: `[Component stubs verified against current {framework} docs via Context7 MCP]`

#### Degradation

When unavailable:
- Use training knowledge for library APIs (may be slightly outdated)
- Tag: `[Using training knowledge -- install Context7 MCP for current library docs]`
- Note: training knowledge is still high quality; Context7 adds recency, not fundamentally different content

#### Caching

- Cache resolved library IDs and fetched docs per session
- Same library queried by multiple skills in one session reuses cached response
- Cache invalidated at session end (fresh docs each new session)

#### Log Entry

```
{timestamp} | {skill_code} | context7 | {probe|resolve-library|get-docs} | {result} | {duration_ms}
```

### Reference MCP (PDE)

**Purpose:** Efficient section-level queries into PDE reference files with tier-aware filtering.
**Location:** `${CLAUDE_PLUGIN_ROOT}/mcp-server/`
**Transport:** stdio
**Install:** Bundled with PDE-OS. Auto-installed by `/pde:setup`. Lives at `${CLAUDE_PLUGIN_ROOT}/mcp-server/`
**Stability:** STABLE

#### Probe

```
Attempt: list_references (no arguments)
Result:
  - Returns file/section listing: REFERENCE_MCP_AVAILABLE = true
  - Tool not found or errors: REFERENCE_MCP_AVAILABLE = false
```

**Timeout:** 5 seconds
**Retry:** 1 (local server, should be near-instant; retry once in case of startup delay)

#### Enhancement Recipes

**Tier-Aware Reference Loading** (all skills):
1. Instead of loading entire reference file via `@`, query specific sections at needed depth
2. Use query_reference with tier parameter:
   - `tier: "essentials"` -- load only essential sections (smallest token footprint)
   - `tier: "standard"` -- load essentials + standard sections
   - `tier: "comprehensive"` -- load everything (equivalent to full @ include)
3. Tag: `[Reference loaded via PDE Reference MCP -- {tier} tier]`

**Section-Level Queries** (skills needing specific reference content):
```
query_reference({
  path: "pde/typography.md",
  section: "Scale Algorithms > Modular Scale",
  tier: "standard"
})
```

**Reference Metadata** (/pde:test, /pde:setup):
1. Check reference file versions, last modified dates, tier sizes
2. Verify reference integrity as part of health checks

#### Degradation (Hybrid Approach)

When Reference MCP is unavailable, fall back to `@` inline loading:
- Load entire reference file via `@` include (higher token cost but equivalent content)
- No section filtering available in fallback mode
- Tag: `[Reference loaded via @ inline -- install Reference MCP for section-level queries]`

This hybrid approach ensures skills ALWAYS have access to references regardless of MCP availability.

#### Caching

- In-memory cache with file-watcher invalidation (chokidar)
- Queries for same section return cached content until file changes on disk
- Cache invalidated immediately when reference file is modified
- No manual cache management needed

#### Log Entry

```
{timestamp} | {skill_code} | reference-mcp | {probe|list|query|metadata} | {result} | {duration_ms}
```

## Per-MCP Enhancement Recipes: Source Tags

All MCP-enhanced output sections MUST include source tags for transparency.

### When MCP Was Used

```
[Enhanced by {MCP_NAME} MCP]
```

Place at the end of the section that was enhanced. Examples:
- `[Enhanced by Axe MCP -- automated WCAG 2.2 scan]`
- `[Enhanced by Figma MCP -- tokens imported from Figma file]`
- `[Validated by Playwright MCP]`
- `[API accuracy enhanced by Context7 MCP]`

### When MCP Was Unavailable

```
[Manual check -- install {MCP_NAME} MCP for {specific benefit}]
```

Place at the end of the degraded section. Examples:
- `[Manual accessibility review -- install a11y MCP for automated WCAG scanning]`
- `[Not validated -- install Playwright MCP for automated browser testing]`
- `[Using training knowledge -- install Context7 MCP for current library docs]`
- `[Generated from PDE algorithms -- install Figma MCP to import from your Figma file]`

### Baseline Mode

When `--no-mcp` is active:
```
[Baseline mode -- MCPs disabled via --no-mcp]
```

### Tag Placement

- Tags are integrated into normal output, NOT in a separate section
- Place at the bottom of the relevant output section
- Use consistent formatting: square brackets, sentence case, em dashes for clauses

## Core Probe/Use/Degrade Pattern

Every MCP integration follows this exact pattern. Skills reference this section and customize per-MCP.

### Step 1: Check Flags

```
IF --no-mcp in arguments:
  SKIP all MCP probes
  SET all MCP availability to false
  CONTINUE with degraded paths

IF --no-{mcp_name} in arguments:
  SKIP probe for that specific MCP
  SET that MCP availability to false
  CONTINUE with degraded path for that MCP
```

### Step 2: Probe

```
ATTEMPT to call MCP's designated probe tool
  WITH timeout per MCP specification (see per-MCP sections above)

IF tool responds successfully:
  SET {MCP_NAME}_AVAILABLE = true
  LOG: {timestamp} | {skill_code} | {mcp_name} | probe | success | {duration_ms}

IF tool not found, errors, or times out:
  IF universal MCP (Superpowers, Sequential Thinking):
    RETRY once (same timeout)
    IF retry fails:
      SET {MCP_NAME}_AVAILABLE = false
      LOG: {timestamp} | {skill_code} | {mcp_name} | probe | failure | {duration_ms}
  IF targeted MCP (all others):
    SET {MCP_NAME}_AVAILABLE = false (degrade immediately)
    LOG: {timestamp} | {skill_code} | {mcp_name} | probe | failure | {duration_ms}
```

### Step 3: Use or Degrade

```
IF {MCP_NAME}_AVAILABLE = true:
  EXECUTE enhancement recipe for current skill step
  TAG output: "[Enhanced by {MCP_NAME} MCP]" (or specific variant)
  LOG: {timestamp} | {skill_code} | {mcp_name} | {operation} | success | {duration_ms}

IF {MCP_NAME}_AVAILABLE = false:
  EXECUTE degraded path (training knowledge, manual checks, @ loading)
  TAG output: "[Manual check -- install {MCP_NAME} MCP for {benefit}]"
  LOG: {timestamp} | {skill_code} | {mcp_name} | {operation} | skipped | 0
```

### Step 4: Handle Runtime Failures

```
IF MCP call fails DURING use (after successful probe):
  IF universal MCP:
    RETRY once
    IF retry fails: DEGRADE for this operation only
  IF targeted MCP:
    DEGRADE immediately for this operation

NOTE: No circuit breaker. Each MCP call is independent.
Even if probe succeeded but a later call fails, continue trying
subsequent calls to the same MCP in this skill run.
```

---

<!-- TIER: comprehensive -->

## Caching Strategy

Different MCP data has different freshness requirements.

### Cache (Reference Data)

| MCP | What to Cache | Cache Lifetime | Invalidation |
|-----|--------------|----------------|--------------|
| Context7 | Library docs (resolved IDs, fetched content) | Per session | Session end |
| Reference MCP | Section content queries | Until file change | chokidar file watcher |
| Figma MCP | Imported token values | Per skill run | Next skill invocation |

### Fresh Every Time (Live Scans)

| MCP | What's Always Fresh | Why |
|-----|-------------------|-----|
| Axe a11y | Accessibility audit results | HTML may have changed since last scan |
| Playwright | Screenshots, validation results | Browser state is ephemeral |
| Sequential Thinking | Reasoning output | Each analysis is unique to current context |

### No Caching Needed

| MCP | Why |
|-----|-----|
| Superpowers | Browser preview is a one-shot interactive operation |

## Troubleshooting

### Superpowers MCP

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | MCP not installed or not started | Check `~/.claude/mcp-servers/superpower-mcp/` exists. Run `/pde:setup` |
| Browser preview fails | Browser not available in environment | Provide file path for manual preview. Not an error |
| Timeout on preview | Large HTML file or slow system | Increase timeout. Consider `--no-superpowers` for large files |

### Sequential Thinking MCP

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | MCP not installed | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` |
| Timeout (>30s) | Complex prompt or overloaded server | Normal for deep analysis. Retry once then degrade |
| Empty response | Server issue | Retry once. If persistent, degrade and log for diagnosis |

### Figma MCP

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | MCP not added with HTTP transport | `claude mcp add --transport http figma https://mcp.figma.com/mcp` |
| Auth error | No Figma login or expired session | Re-authenticate via Figma. `/pde:setup` can guide through auth |
| File not found | Invalid Figma file URL or no access | Verify file URL and sharing permissions |
| Timeout (>15s) | Network issues or large Figma file | Check network. Consider working offline with `--no-figma` |
| Variable format mismatch | Figma variable structure differs from expected | Check Figma file uses Variables (not Styles). Report issue |

### Playwright MCP

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | MCP not installed | `claude mcp add playwright -- npx @playwright/mcp@latest` |
| Browser launch fails | Chromium not downloaded | Run `npx playwright install chromium` |
| Screenshot blank | Page not fully loaded | Playwright waits for load event; may need longer for complex pages |
| Navigation timeout | Invalid file path or broken HTML | Check generated HTML opens manually. Report skill bug if HTML is broken |
| Accessibility tree empty | Page has no semantic HTML | This IS the finding -- report as accessibility issue |

### Axe a11y MCP (a11y-mcp)

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | Package not installed | `claude mcp add a11y -- npx -y a11y-mcp` |
| Audit returns no results | Page is empty or all-images | Verify HTML has content. Images-only pages may need alt text audit separately |
| Unexpected violations | False positives from axe-core | Check against WCAG spec manually. axe-core errs on strict side |
| Timeout (>20s) | Very large or complex page | Normal for pages with many DOM nodes. Consider splitting pages |
| License/auth error | Wrong package (Deque axe-mcp-server) | Switch to `a11y-mcp` (free, open source). Deque requires paid subscription |

### Context7 MCP

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | MCP not installed | Already installed globally. Run `/pde:setup` to verify |
| Library not found | Library name not in Context7 index | Try alternative names (e.g., "reactjs" vs "react"). Fall back to training knowledge |
| Stale docs | Context7 index not updated | Clear session cache. Context7 updates their index independently |
| Timeout (>10s) | Network issues | Fall back to training knowledge. Context7 requires internet |

### Reference MCP (PDE)

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | Server not installed or not running | Run `/pde:setup` to install/repair. Check `${CLAUDE_PLUGIN_ROOT}/mcp-server/` |
| Section not found | Invalid section path | Use list_references to browse available sections |
| Stale content | File changed but cache not invalidated | Restart Reference MCP server. Check chokidar file watcher is running |
| Tier filter returns empty | No content at requested tier | Requested tier may not exist in this file. Try without tier filter |
| JSON parse errors | stdout corruption | Server MUST NOT use console.log. All logging to stderr or file |

## Installation Commands

Quick reference for installing each MCP server.

```bash
# Universal MCPs (should already be installed)
# Superpowers: local install at ~/.claude/mcp-servers/superpower-mcp/
# Sequential Thinking:
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# Targeted MCPs
# Figma (HTTP transport -- special):
claude mcp add --transport http figma https://mcp.figma.com/mcp

# Playwright:
claude mcp add playwright -- npx @playwright/mcp@latest

# Axe a11y (open source, free):
claude mcp add a11y -- npx -y a11y-mcp

# Context7 (should already be installed):
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# Reference MCP (PDE -- bundled with PDE-OS):
# Installed automatically by /pde:setup or during PDE installation
# Lives at ${CLAUDE_PLUGIN_ROOT}/mcp-server/
```

## Stability Ratings

| MCP | Stability | Transport | Last Verified | Notes |
|-----|-----------|-----------|---------------|-------|
| Superpowers | STABLE | stdio | 2026-03-11 | Local install, well-tested |
| Sequential Thinking | STABLE | stdio | 2026-03-11 | Official MCP SDK example server |
| Figma MCP | STABLE | HTTP | 2026-03-11 | Official Figma server, HTTP transport |
| Playwright MCP | STABLE | stdio | 2026-03-11 | Official Microsoft, actively maintained |
| Axe a11y (a11y-mcp) | STABLE | stdio | 2026-03-11 | Open source, wraps axe-core |
| Context7 | STABLE | stdio | 2026-03-11 | Already installed globally |
| Reference MCP (PDE) | STABLE | stdio | 2026-03-11 | Custom, bundled with PDE-OS |

## MCP Integration Checklist for Skills

When adding MCP integration to a skill, verify:

- [ ] Global flags checked before any probe (--no-mcp, --no-{name})
- [ ] Each MCP probed with correct tool and timeout
- [ ] Universal MCPs get 1 retry; targeted MCPs degrade immediately
- [ ] Enhancement recipe produces tagged output with source attribution
- [ ] Degradation path produces tagged output with install suggestion
- [ ] All MCP interactions logged to mcp-debug.log
- [ ] Skill works correctly with --no-mcp (pure baseline)
- [ ] Skill works correctly when individual MCPs are unavailable
- [ ] No MCP is REQUIRED -- all are enhancement layers only

---

## Recommendation Engine Integration

**Skill:** `/pde:recommend` (REC)
**Purpose:** Discovers and recommends new MCP servers based on project context
**Stability:** ACTIVE

### How Recommend Uses MCPs

The recommendation engine uses two MCPs for live discovery:

1. **mcp-compass**: Searches the official MCP registry for servers relevant to project goals
   - Probe: Attempt to use mcp-compass search tool
   - Use: Query with project type and goal keywords
   - Degrade: Fall back to WebSearch for MCP discovery

2. **Context7**: Verifies recommended library APIs are current
   - Probe: Standard context7 probe
   - Use: Validate install commands and API patterns for recommended tools
   - Degrade: Use catalog-provided install commands without live verification

### How Recommend Updates This File

When `/pde:recommend` installs a new MCP, it appends a new section to this file following the standard probe/use/degrade pattern:
- Catalog MCPs: Uses pre-written integration entries from ecosystem-catalog.json
- Live-discovered MCPs: Generates minimal entry marked "UNVERIFIED"
- Skills that benefit from the new MCP are listed in Enhancement Recipes

### Dynamic MCP Entries

Entries below this line may be added automatically by `/pde:recommend`:

<!-- RECOMMEND-MANAGED: Do not manually edit below this line -->
<!-- New MCP entries added by /pde:recommend will appear here -->

---

*Version: 1.1.0*
*Last updated: 2026-03-13*
*Loaded by: all skills via @ reference for MCP integration patterns*
