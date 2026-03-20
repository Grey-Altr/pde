<purpose>
Discover and recommend MCP servers, tools, and integrations tailored to the user's project context. Reads PROJECT.md (required), REQUIREMENTS.md, package.json, and any STACK.md files to understand the tech stack, product goals, and existing tooling. Produces REC-recommendations-v{N}.md in .planning/design/strategy/ — a ranked, installation-ready artifact covering 7 MCP/tool categories. This skill is callable as a standalone command (/pde:recommend) and as a subroutine from /pde:ideate (Phase 27) via Skill() invocation. When invoked by the ideation skill, the recommendations artifact is used to surface tooling gaps relevant to new feature ideation. Writes the hasRecommendations coverage flag to design-manifest.json via the 13-field pass-through-all pattern.
</purpose>

<skill_code>REC</skill_code>

<skill_domain>strategy</skill_domain>

<context_routing>
Detect the following context files before beginning the pipeline:

| File | Path | Requirement | Purpose |
|------|------|-------------|---------|
| PROJECT.md | .planning/PROJECT.md | HARD — halt if missing | Product type, tech stack, goals, constraints |
| REQUIREMENTS.md | .planning/REQUIREMENTS.md | SOFT — enrich feature area detection | Feature areas, integration needs |
| package.json | package.json (project root) | SOFT — enrich dependency detection | Existing npm dependencies and devDependencies |
| STACK.md | .planning/codebase/STACK.md | SOFT — enrich stack detection | Confirmed tech stack from codebase mapping |
| DESIGN-STATE (root) | .planning/design/DESIGN-STATE.md | SOFT — read existing coverage | Prior artifact coverage, product type already classified |
| DESIGN-STATE (strategy) | .planning/design/strategy/DESIGN-STATE.md | SOFT — check for existing REC artifact | Existing recommendations version |

Hard requirement: PROJECT.md must exist. All others degrade gracefully if absent.
</context_routing>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-3 (init, prerequisites, MCP probe) but writes NO files. Displays planned file paths, detected stack, category coverage outline, estimated token usage. |
| `--quick` | Boolean | Skip MCP enhancements (mcp-compass, WebSearch, Sequential Thinking probes) for faster execution. Uses inline catalog only. |
| `--verbose` | Boolean | Show detailed progress, MCP probe results, timing per step, catalog match scoring details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode — uses inline catalog and training knowledge only. |
| `--no-compass` | Boolean | Skip mcp-compass probe specifically while allowing other MCPs. |
| `--no-websearch` | Boolean | Skip WebSearch MCP probe specifically while allowing other MCPs. |
| `--force` | Boolean | Skip the confirmation prompt when a REC artifact already exists and auto-increment to the next version. |
</flags>

<process>

## /pde:recommend — Tool & MCP Recommendations Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-compass`, `--no-websearch`, `--force`.

---

### Step 1/7: Initialize design directories

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse the JSON result. If the result contains an error field or the command exits non-zero:

```
Error: Failed to initialize design directories.
  The design directory structure could not be created.
  Check that .planning/ exists and is writable, then re-run /pde:recommend.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and determine artifact version

**Read PROJECT.md:**

Use the Read tool to load `.planning/PROJECT.md`.

If PROJECT.md does not exist, display the following error and HALT immediately (hard stop, NOT a warning):

```
Error: PROJECT.md not found at .planning/PROJECT.md
  /pde:recommend requires a project description to discover relevant tools.
  Run /pde:new-project first to initialize your project, then re-run /pde:recommend.
```

**Optionally read supporting context:**

- Use the Read tool to load `.planning/REQUIREMENTS.md` if it exists (soft — enriches feature area detection). If absent, log at verbose level: `  -> REQUIREMENTS.md not found — continuing without it`.
- Use the Read tool to load `package.json` if it exists at the project root (soft — enriches dependency detection to avoid recommending already-installed tools). If absent, log at verbose level: `  -> package.json not found — continuing without it`.
- Use the Glob tool to find `.planning/codebase/STACK.md`. If found, load it (soft — provides confirmed tech stack). If absent, infer stack from PROJECT.md and package.json.

**Check for existing REC artifact and determine version N:**

Use the Glob tool to find all `.planning/design/strategy/REC-recommendations-v*.md` files.

- If **no REC artifact exists**: proceed with version N = 1.
- If **REC artifact exists AND `--force` flag NOT present**: prompt the user:
  ```
  A recommendations artifact already exists (REC-recommendations-v1.md). Generate a new version?
  This will create REC-recommendations-v2.md without modifying the existing v1.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing recommendations preserved at .planning/design/strategy/REC-recommendations-v1.md` and halt.
  If user answers "yes": determine N = max existing version + 1.
- If **REC artifact exists AND `--force` flag present**: auto-increment. Scan for all `REC-recommendations-v*.md` files, find the maximum version number, set N = max + 1. Log: `  -> --force flag detected, auto-incrementing to v{N}.`

Display: `Step 2/7: Prerequisites satisfied. PROJECT.md loaded. Recommendations version: v{N}.`

---

### Step 3/7: Probe MCP capabilities

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET MCP_COMPASS_AVAILABLE = false
  SET WEBSEARCH_AVAILABLE = false
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SET ALL_MCP_DISABLED = true
  SKIP all MCP probes
  Log: [Baseline mode -- MCPs disabled via --no-mcp]
  continue to Step 4

IF --quick in $ARGUMENTS:
  SET MCP_COMPASS_AVAILABLE = false
  SET WEBSEARCH_AVAILABLE = false
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP all MCP probes (quick mode -- inline catalog only)
  continue to Step 4
```

**Probe mcp-compass (targeted MCP):**

```
IF --no-compass NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false:
  Attempt: mcp-compass search tool (or equivalent: mcp__mcp-compass__search)
    with query built from project type + top 2-3 stack keywords from PROJECT.md
    Timeout: 10 seconds
    Result:
      - Tool responds with MCP results: MCP_COMPASS_AVAILABLE = true
        Log: {timestamp} | REC | mcp-compass | probe | success | {duration_ms}
      - Tool not found or errors: MCP_COMPASS_AVAILABLE = false (degrade immediately -- targeted MCP)
        Log: {timestamp} | REC | mcp-compass | probe | failure | {duration_ms}
        Tag: [Using offline catalog -- install mcp-compass for live MCP registry search]
ELSE:
  SET MCP_COMPASS_AVAILABLE = false
  Log: {timestamp} | REC | mcp-compass | probe | skipped | 0
```

**Probe WebSearch MCP:**

```
IF --no-websearch NOT in $ARGUMENTS AND ALL_MCP_DISABLED = false:
  Attempt: WebSearch tool (mcp__websearch__search or built-in WebSearch)
    with query: "MCP servers for {detected_stack_keywords} development 2026"
    Timeout: 15 seconds
    Result:
      - Tool responds with search results: WEBSEARCH_AVAILABLE = true
        Log: {timestamp} | REC | websearch | probe | success | {duration_ms}
      - Tool not found or errors: WEBSEARCH_AVAILABLE = false (degrade immediately -- targeted MCP)
        Log: {timestamp} | REC | websearch | probe | failure | {duration_ms}
        Tag: [Using training knowledge -- install WebSearch MCP for live tool discovery]
ELSE:
  SET WEBSEARCH_AVAILABLE = false
  Log: {timestamp} | REC | websearch | probe | skipped | 0
```

**Probe Sequential Thinking MCP (universal):**

```
IF ALL_MCP_DISABLED = false AND --no-sequential-thinking NOT in $ARGUMENTS:
  Attempt: mcp__sequential-thinking__think
    with test prompt ("Analyze the following: test")
    Timeout: 30 seconds
    Result:
      - Tool responds with reasoning: SEQUENTIAL_THINKING_AVAILABLE = true
      - Tool not found or errors: retry once (same 30s timeout)
        If retry fails: SEQUENTIAL_THINKING_AVAILABLE = false
ELSE:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
```

Display: `Step 3/7: MCP probes complete. mcp-compass: {available|unavailable}. WebSearch: {available|unavailable}. Sequential Thinking: {available|unavailable}.`

---

### Step 4/7: Analyze project context and build recommendations

This is the core logic of the skill. Extract project signals, then match against the inline catalog.

**4a. Extract project signals from context files:**

From PROJECT.md: product type, tech stack, stated goals, stated constraints, target users.
From REQUIREMENTS.md (if available): feature areas (e.g., auth, real-time, search, payments), integration needs.
From package.json (if available): existing dependencies and devDependencies — build a SET of already-installed tools to EXCLUDE from recommendations.
From STACK.md (if available): confirmed stack components to refine matching.

Derive a **project profile** with these fields:
- `product_type`: software / hardware / hybrid
- `primary_language`: TypeScript / JavaScript / Python / Go / Rust / etc.
- `framework`: React / Vue / Next.js / Express / FastAPI / etc. (or "unknown")
- `database`: PostgreSQL / MySQL / MongoDB / SQLite / Redis / etc. (or "none detected")
- `deployment_target`: web / mobile / desktop / embedded / cloud / edge / etc.
- `feature_areas`: array of detected feature needs (e.g., ["auth", "real-time", "testing", "CI/CD"])
- `already_installed`: array of tool names detected from package.json / STACK.md
- `primary_goals`: 2-3 key goals extracted from PROJECT.md

**4b. Collect MCP/tool candidates:**

Priority order:
1. **mcp-compass results** (if MCP_COMPASS_AVAILABLE = true): Use results from Step 3 probe. Map each result to the catalog categories below.
2. **WebSearch results** (if WEBSEARCH_AVAILABLE = true): Search for "best MCP servers for {primary_language} {framework} development" and "essential developer tools for {product_type} {deployment_target}". Extract tool names and install commands.
3. **Sequential Thinking analysis** (if SEQUENTIAL_THINKING_AVAILABLE = true): Use `mcp__sequential-thinking__think` to reason about which tool categories are most critical for this specific project profile. The reasoning helps prioritize the ranking in Step 4c.
4. **Inline catalog fallback** (always available): Match the project profile against the curated catalog below.

**4c. Inline Curated MCP & Tool Catalog:**

This catalog is the fallback when no live MCPs are available. It is organized by the 7 categories from mcp-integration.md. For each project profile, match the entry against the project's stack and feature needs. Entries with higher stack signal match get higher relevance scores.

---

**CATEGORY 1: AI & Reasoning (ai)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| Sequential Thinking MCP | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | All stacks | Always recommend — enhances all design skills |
| Context7 MCP | `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest` | Node.js, Python, any framework | Project uses any npm or pip library |
| mcp-compass | `claude mcp add mcp-compass -- npx -y mcp-compass` | All stacks | User wants live MCP registry search |

---

**CATEGORY 2: Design & Prototyping (design)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| Figma MCP | `claude mcp add --transport http figma https://mcp.figma.com/mcp` | All frontend stacks | Project has UI/UX, wireframes, or design system work |
| Playwright MCP | `claude mcp add playwright -- npx @playwright/mcp@latest` | React, Vue, Next.js, web apps | Automated browser testing, screenshot validation |
| Superpowers MCP | See `/pde:setup` for local install | All HTML-generating skills | Preview generated HTML artifacts |

---

**CATEGORY 3: Code Quality & Testing (code-quality)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| Axe a11y MCP | `claude mcp add a11y -- npx -y a11y-mcp` | React, Vue, web, Next.js | Project has frontend and accessibility requirements |
| Sentry MCP | `claude mcp add sentry -- npx -y @sentry/mcp-server@latest` | Node.js, Python, React, mobile | Production app needing error monitoring |
| ESLint (npm) | `npm install -D eslint` | JavaScript, TypeScript | Any JS/TS project without linting |
| Prettier (npm) | `npm install -D prettier` | JavaScript, TypeScript | Any JS/TS project without formatting |
| Vitest (npm) | `npm install -D vitest` | Vite, React, Vue | Unit testing for Vite-based projects |
| Jest (npm) | `npm install -D jest @types/jest` | Node.js, React, TypeScript | Unit testing for Node/React projects |
| Pytest (pip) | `pip install pytest` | Python | Unit testing for Python projects |

---

**CATEGORY 4: Data & Databases (data)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| Postgres MCP | `claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres` | PostgreSQL | Project uses PostgreSQL |
| SQLite MCP | `claude mcp add sqlite -- npx -y @modelcontextprotocol/server-sqlite` | SQLite | Project uses SQLite or local storage |
| MySQL MCP | `claude mcp add mysql -- npx -y mysql-mcp-server` | MySQL, MariaDB | Project uses MySQL or MariaDB |
| Redis MCP | `claude mcp add redis -- npx -y redis-mcp-server` | Redis, caching, sessions | Project uses Redis for caching or queues |
| Prisma (npm) | `npm install -D prisma && npx prisma init` | Node.js + any relational DB | TypeScript projects needing ORM |
| Drizzle ORM (npm) | `npm install drizzle-orm drizzle-kit` | TypeScript, edge runtime | TypeScript-first ORM for serverless/edge |

---

**CATEGORY 5: Deployment & Infrastructure (deployment)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| GitHub MCP | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | Any GitHub-hosted project | Project uses GitHub for source control |
| Filesystem MCP | `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/project` | All projects | Read/write project files via Claude |
| Docker (CLI tool) | `brew install docker` or OS installer | Web apps, APIs, services | Containerized deployment |
| Vercel (CLI) | `npm install -g vercel` | Next.js, React, static sites | Frontend/full-stack deployment to Vercel |
| Railway (CLI) | `npm install -g @railway/cli` | Node.js, Python, databases | Full-stack app + database deployment |
| Fly.io (CLI) | `brew install flyctl` | Any Docker-based app | Global distributed deployment |

---

**CATEGORY 6: Research & Productivity (research)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| WebSearch MCP | Via Claude built-in or `claude mcp add websearch -- npx -y websearch-mcp` | All stacks | Live web research, competitor data, documentation lookup |
| Fetch MCP | `claude mcp add fetch -- npx -y @modelcontextprotocol/server-fetch` | All stacks | Fetch web pages and APIs directly from Claude |
| Brave Search MCP | `claude mcp add brave-search -- npx -y @modelcontextprotocol/server-brave-search` | All stacks | Privacy-focused web search via Claude |

---

**CATEGORY 7: Collaboration & Integrations (collaboration)**

| Tool | Install | Stack Signals | Relevance When |
|------|---------|--------------|----------------|
| Slack MCP | `claude mcp add slack -- npx -y @modelcontextprotocol/server-slack` | Team products, SaaS | Product has team collaboration features or team uses Slack |
| Linear MCP | `claude mcp add linear -- npx -y @linear/mcp-server` | SaaS, product teams | Project management via Linear |
| Notion MCP | `claude mcp add notion -- npx -y @notionhq/notion-mcp-server` | Documentation-heavy, wikis | Knowledge management via Notion |
| Stripe MCP | `claude mcp add stripe -- npx -y stripe-mcp-server` | SaaS, e-commerce, subscriptions | Project has payment or subscription features |
| Twilio MCP | `claude mcp add twilio -- npx -y twilio-mcp-server` | Mobile, notifications, SMS | Project has messaging or notification features |

---

**4d. Score and rank recommendations:**

For each candidate tool from the catalog (or live MCP results), compute a relevance score:

```
high    — direct stack match + critical for project goals (e.g., Postgres MCP for a PostgreSQL project)
medium  — partial match or generally useful for the project type (e.g., GitHub MCP for any project)
low     — tangentially useful but not a priority for this specific stack
```

Scoring rules:
- Tools already in `already_installed` set: EXCLUDE from output (don't recommend what's installed)
- Direct database match (e.g., `database = "PostgreSQL"` → Postgres MCP): HIGH
- Framework match (e.g., `framework = "Next.js"` → Vercel CLI): HIGH
- Universal MCPs not yet installed (Sequential Thinking, Context7): HIGH by default
- Feature area match (e.g., `feature_areas contains "auth"` → Sentry MCP for error monitoring): MEDIUM
- General productivity tools (Filesystem MCP, Fetch MCP): MEDIUM
- Speculative tools with low stack signal: LOW

Sort recommendations within each category by relevance score (HIGH first, then MEDIUM, then LOW). Omit LOW-scored tools unless fewer than 3 HIGH/MEDIUM tools are available in that category.

Display: `Step 4/7: Context analyzed. {N} recommendations compiled across {M} categories.`

---

### Step 5/7: Write recommendations artifact

Use the Write tool to create `.planning/design/strategy/REC-recommendations-v{N}.md`.

The artifact MUST contain these sections in this order:

**Frontmatter (YAML):**
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:recommend (REC)
Version: v{N}
Status: draft
Scope: "full"
Data Currency: "Recommendations based on project context as of {date}. Re-run with live MCPs for updated registry data."
Enhanced By: "{comma-separated MCPs actually used (mcp-compass, WebSearch MCP, Sequential Thinking MCP), or 'none -- inline catalog'}"
---
```

**`# Tool & MCP Recommendations`** — top-level heading with project name

**`## Executive Summary`** — 2-3 sentences: what was analyzed, total recommendations, highest-priority installs. Include data currency note if using training knowledge.

**`## Project Context Analysis`** — table showing detected project profile:

```markdown
| Signal | Detected Value | Source |
|--------|----------------|--------|
| Product type | {software/hardware/hybrid} | PROJECT.md |
| Primary language | {language} | package.json / PROJECT.md |
| Framework | {framework} | package.json / PROJECT.md |
| Database | {database or "none detected"} | PROJECT.md / REQUIREMENTS.md |
| Deployment target | {target} | PROJECT.md |
| Feature areas | {comma-separated list} | REQUIREMENTS.md / PROJECT.md |
| Already installed | {count} tools detected | package.json |
| Catalog mode | {Live (mcp-compass) / WebSearch / Inline catalog} | Step 3 probe results |
```

**`## Recommended Tools`** — ranked recommendations organized by category. For each category with at least one HIGH or MEDIUM relevance tool:

```markdown
### {Category Name} ({category_id})

#### {Tool Name}
- **Relevance:** {high | medium | low}
- **Why for this project:** {1-2 sentences explaining match to PROJECT.md goals/stack}
- **Install:**
  ```bash
  {install_command}
  ```
- **Configuration hint:** {brief note on first-run setup, e.g., "Set GITHUB_TOKEN env var after install"}
- **Category:** {ai | design | code-quality | data | deployment | research | collaboration}
```

Only include categories with at least one recommended tool. Present HIGH relevance tools first within each category.

**`## Installation Guide`** — consolidated install block:

```markdown
## Installation Guide

Copy-paste this block to install all HIGH relevance tools in order:

```bash
# AI & Reasoning
{install commands for HIGH ai tools}

# Design & Prototyping
{install commands for HIGH design tools}

# Code Quality
{install commands for HIGH code-quality tools}

# Data
{install commands for HIGH data tools}

# Deployment
{install commands for HIGH deployment tools}

# Research
{install commands for HIGH research tools}

# Collaboration
{install commands for HIGH collaboration tools}
```
```

**`## Integration Notes`** — 2-3 paragraphs: how these tools work together, any sequencing requirements (e.g., "Install GitHub MCP before running /pde:handoff for repository integration"), any auth steps needed.

**`## Category Coverage Map`** — quick reference table:

```markdown
| Category | Recommended | Installed | Gap |
|----------|-------------|-----------|-----|
| AI & Reasoning | {N} tools | {M} tools | {recommended - installed} |
| Design & Prototyping | {N} tools | {M} tools | {gap} |
| Code Quality & Testing | {N} tools | {M} tools | {gap} |
| Data & Databases | {N} tools | {M} tools | {gap} |
| Deployment & Infrastructure | {N} tools | {M} tools | {gap} |
| Research & Productivity | {N} tools | {M} tools | {gap} |
| Collaboration & Integrations | {N} tools | {M} tools | {gap} |
```

**Footer:**
```markdown
---

*Generated by PDE-OS /pde:recommend | {ISO 8601 date}*
```

Include data source tag at bottom of primary recommendations section:

- If MCP_COMPASS_AVAILABLE = true: `[Enhanced by mcp-compass MCP -- live MCP registry search]`
- If WEBSEARCH_AVAILABLE = true: `[Enhanced by WebSearch MCP -- live tool discovery]`
- If both unavailable: `[Using offline catalog -- install mcp-compass for live MCP registry search]`

**If `--dry-run` flag is active:** Display dry-run preview instead of writing files:

```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/strategy/REC-recommendations-v{N}.md
  File: .planning/design/strategy/DESIGN-STATE.md (if it does not exist)

Detected project profile:
  Product type: {product_type}
  Stack: {primary_language} / {framework}
  Feature areas: {feature_areas}

Estimated recommendations: ~{N} tools across {M} categories
MCP enhancements: {available MCPs}
```
HALT — do not write files in dry-run mode.

Display: `Step 5/7: Recommendations artifact written.  -> Created: .planning/design/strategy/REC-recommendations-v{N}.md`

---

### Step 6/7: Update strategy domain DESIGN-STATE

Check if `.planning/design/strategy/DESIGN-STATE.md` exists using the Glob tool.

**If it does NOT exist:** Create it from `templates/design-state-domain.md`:
- Replace `{domain_name}` with `strategy`
- Replace `{Domain}` with `Strategy`
- Replace `{date}` with current ISO 8601 date
- Use the Write tool to create `.planning/design/strategy/DESIGN-STATE.md`

**Add the REC artifact row to the Artifact Index table:**

If the file was just created: the Artifact Index table is empty. Add the REC row after the header row.

If the file already exists (re-run scenario, v2+): use the Edit tool to update the existing REC row's Version and Updated columns in place.

The REC row format:
```
| REC | Tool & MCP Recommendations | /pde:recommend | draft | v{N} | {comma-separated MCPs used, or "inline catalog"} | -- | {YYYY-MM-DD} |
```

Display: `Step 6/7: Strategy DESIGN-STATE.md updated with REC artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-recommend)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds, then retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-recommend)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:recommend.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add REC row if not already present:
   ```
   | REC | strategy | -- | current |
   ```

2. **Decision Log** — append entry:
   ```
   | REC | recommendations complete, {N} tools across {M} categories | {date} |
   ```

3. **Iteration History** — append entry:
   ```
   | REC-recommendations-v{N} | v{N} | Created by /pde:recommend | {date} |
   ```

**ALWAYS release write lock, even if an error occurred during the state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest — artifact fields:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC code REC
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC name "Tool & MCP Recommendations"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC type recommendations
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC path ".planning/design/strategy/REC-recommendations-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update REC version {N}
```

**Update designCoverage flag — 14-field pass-through-all pattern:**

First, read all existing coverage flags:

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract all 14 fields, defaulting any absent field to `false`:

| Field (in canonical order) | Default |
|----------------------------|---------|
| hasDesignSystem | false |
| hasWireframes | false |
| hasFlows | false |
| hasHardwareSpec | false |
| hasCritique | false |
| hasIterate | false |
| hasHandoff | false |
| hasIdeation | false |
| hasCompetitive | false |
| hasOpportunity | false |
| hasMockup | false |
| hasHigAudit | false |
| hasRecommendations | **true** (this skill sets this flag) |
| hasStitchWireframes | false |

Then write the full 14-field JSON in canonical order (preserving all existing flag values, setting hasRecommendations to true):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current_hasDesignSystem},"hasWireframes":{current_hasWireframes},"hasFlows":{current_hasFlows},"hasHardwareSpec":{current_hasHardwareSpec},"hasCritique":{current_hasCritique},"hasIterate":{current_hasIterate},"hasHandoff":{current_hasHandoff},"hasIdeation":{current_hasIdeation},"hasCompetitive":{current_hasCompetitive},"hasOpportunity":{current_hasOpportunity},"hasMockup":{current_hasMockup},"hasHigAudit":{current_hasHigAudit},"hasRecommendations":true,"hasStitchWireframes":{current_hasStitchWireframes}}'
```

Replace each `{current_*}` placeholder with the actual value read from `coverage-check` (or `false` if the field was absent).

IMPORTANT: Never use dot-notation (e.g., `designCoverage.hasRecommendations`) with `manifest-set-top-level`. Always pass the complete 14-field JSON object.

Display: `Step 7/7: Root DESIGN-STATE and manifest updated. Coverage flag hasRecommendations set to true.`

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/strategy/REC-recommendations-v{N}.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size, if created}) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:competitive |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {comma-separated list of MCPs actually used, or "none -- inline catalog"} |
```

---

## Anti-Patterns (Guard Against)

- NEVER reference `ecosystem-catalog.json` as a file to read — it does not exist in the codebase. The inline catalog in Step 4c IS the catalog.
- NEVER hard-fail when mcp-compass or WebSearch MCP are unavailable — the inline catalog always produces valid output.
- NEVER skip `coverage-check` before writing `designCoverage` — always read all 13 existing flags first, then pass the full merged JSON to `manifest-set-top-level`.
- NEVER use dot-notation with `manifest-set-top-level` (e.g., `designCoverage.hasRecommendations true`) — always pass the complete JSON object.
- NEVER use `hasRecommend` as the coverage flag name — the canonical name is `hasRecommendations`.
- NEVER write to root DESIGN-STATE.md without first acquiring the write lock via `pde-tools.cjs design lock-acquire`. ALWAYS release the lock even on error.
- NEVER recommend tools already detected in `package.json` or `STACK.md` — exclude installed tools from the output.
- NEVER overwrite an existing versioned REC artifact — always increment version (v1 → v2 → v3).

</process>

<output>
- `.planning/design/strategy/REC-recommendations-v{N}.md` — the primary recommendations artifact
- `.planning/design/strategy/DESIGN-STATE.md` — strategy domain state (created if absent, REC row added/updated)
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Map, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with REC artifact entry and hasRecommendations coverage flag
</output>
