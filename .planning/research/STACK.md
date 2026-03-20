# Stack Research

**Domain:** Google Stitch AI design tool integration into PDE (Claude Code plugin)
**Researched:** 2026-03-20
**Confidence:** MEDIUM — SDK is very new (v0.0.3), official MCP server is remote HTTP; tool names cross-verified across official Google AI forum, GitHub issues, and SDK source. Rate limits from community sources only (LOW confidence for quotas).

---

## Scope

This document covers ONLY the net-new stack additions required for the v0.9 Stitch integration milestone. The existing PDE stack (Node.js CommonJS, zero npm deps at plugin root, mcp-bridge.cjs, 36-entry TOOL_MAP, 5 APPROVED_SERVERS) is already validated and out of scope.

---

## Recommended Stack

### Core Technologies: New Additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@google/stitch-sdk` | `0.0.3` | TypeScript/Node.js SDK for programmatic Stitch API access from workflow scripts | Official Google Labs SDK; only sanctioned programmatic path to Stitch API. Enables `generate`, `edit`, `variants`, `getHtml`, `getImage` without raw HTTP. Note: zero-npm-deps constraint means this installs in an isolated subdirectory (e.g., `bin/lib/stitch/`), NOT at plugin root. |
| Stitch Remote MCP Server | N/A (cloud-hosted) | Official MCP endpoint at `https://stitch.googleapis.com/mcp` via HTTP transport | Google-operated, not a third-party package — zero install footprint. API-key auth (simpler than OAuth). Integrates with Claude Code exactly like existing Figma/Linear/GitHub HTTP servers. This is the PRIMARY integration path for MCP-level tool calls in workflows. |
| `STITCH_API_KEY` env var | N/A | Authentication credential for both the SDK and the remote MCP server | API key replaces OAuth dance. Generated at stitch.withgoogle.com → Settings → API Keys. No Google Cloud project required (uses Google Cloud Managed Projects internally). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@google/stitch-sdk/ai` | bundled with `@google/stitch-sdk@0.0.3` | Vercel AI SDK adapter (`stitchTools()`) | Do NOT use in PDE — PDE has zero npm deps at plugin root and does not use Vercel AI SDK. Listed here only to document what to avoid. |
| `@_davideast/stitch-mcp` | latest on npm | Alternative stdio-based MCP proxy with 3 tools (`build_site`, `get_screen_code`, `get_screen_image`) | Do NOT use as primary — the official remote MCP server is the correct integration. Use only as fallback reference if official server has outages; tool surface is limited to 3 tools vs ~7 on official server. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Stitch web UI (stitch.withgoogle.com) | API key generation; project/screen ID retrieval | Project IDs and screen IDs must be obtained here before SDK/MCP calls; `list_projects` MCP tool also works once connected |
| `claude mcp add` (existing) | Register the Stitch remote MCP server with Claude Code | Follows the same `--transport http` pattern as Figma and Linear already in APPROVED_SERVERS |

---

## Authentication Flow

Stitch supports two auth methods. Use API key exclusively for PDE.

### API Key (Recommended — Use This)

1. User visits `stitch.withgoogle.com` → profile icon → Settings → API Keys → Create
2. User sets `STITCH_API_KEY=<key>` in their environment (shell profile or `.env`)
3. SDK reads from env automatically via singleton `stitch` instance
4. MCP server authenticates via HTTP header `X-Goog-Api-Key: <key>`

**Claude Code MCP registration command (add to `AUTH_INSTRUCTIONS` in mcp-bridge.cjs):**
```bash
claude mcp add --transport http stitch https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: ${STITCH_API_KEY}"
```

### Application Default Credentials / gcloud (Do NOT Use in PDE)

Requires users to have a Google Cloud project with billing, `gcloud` CLI installed, IAM permissions configured, and `GOOGLE_CLOUD_PROJECT` set. Wrong path for a Claude Code plugin used by general developers. Google's own Stitch announcement framed API keys as the replacement: "say goodbye to the OAuth dance."

---

## MCP Tool Names (Official Remote Server)

Verified across: official Google AI forum (`discuss.ai.google.dev`), `google-labs-code/stitch-sdk` README, and SDK source (which wraps the same MCP endpoint via `callTool`).

| MCP Tool Name | Purpose | Key Parameters |
|---------------|---------|----------------|
| `create_project` | Create a new Stitch project | `title: string` |
| `list_projects` | List all user projects | none |
| `get_project` | Get project metadata by ID | `projectId: string` |
| `generate_screen_from_text` | Generate a screen from a text prompt | `projectId: string`, `prompt: string`, `deviceType?: DeviceType`, `modelId?: ModelId` |
| `list_screens` | List all screens in a project | `projectId: string` |
| `get_screen` | Get screen metadata and artifact URLs | `projectId: string`, `screenId: string` |
| `extract_design_context` | Extract design DNA (fonts, colors, layout patterns) from a screen | `projectId: string`, `screenId: string` |

**Confidence:** MEDIUM. Tool names `create_project`, `generate_screen_from_text`, `list_screens`, `get_screen`, `get_project` confirmed by official Google AI developer forum thread. `extract_design_context` confirmed by community Stitch MCP implementations that wrap the same underlying Google API. `list_projects` inferred from SDK `stitch.projects()` which calls the same endpoint.

Raw MCP tool names in Claude Code follow the pattern `mcp__stitch__<tool_name>`.

**TOOL_MAP additions for mcp-bridge.cjs:**
```javascript
// Stitch — Phase 6X (verify raw names against live server before shipping)
'stitch:probe':                   'mcp__stitch__list_projects',
'stitch:list-projects':           'mcp__stitch__list_projects',
'stitch:get-project':             'mcp__stitch__get_project',
'stitch:create-project':          'mcp__stitch__create_project',
'stitch:generate-screen':         'mcp__stitch__generate_screen_from_text',
'stitch:list-screens':            'mcp__stitch__list_screens',
'stitch:get-screen':              'mcp__stitch__get_screen',
'stitch:extract-design-context':  'mcp__stitch__extract_design_context',
```

**APPROVED_SERVERS addition for mcp-bridge.cjs:**
```javascript
stitch: {
  displayName: 'Stitch',
  transport: 'http',
  url: 'https://stitch.googleapis.com/mcp',
  installCmd: 'claude mcp add --transport http stitch https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: ${STITCH_API_KEY}"',
  probeTimeoutMs: 10000,
  probeTool: 'mcp__stitch__list_projects',
  probeArgs: {},
},
```

---

## SDK Method Signatures

Source: `google-labs-code/stitch-sdk` README and GitHub (MEDIUM confidence — verified against official repo).

```typescript
// Root singleton — reads STITCH_API_KEY from env automatically
import { stitch } from '@google/stitch-sdk';

// Project reference (no API call — lazy)
const project: Project = stitch.project(projectId: string)

// List all projects
const projects: Project[] = await stitch.projects()

// Generate a screen from a text prompt
const screen: Screen = await project.generate(
  prompt: string,
  deviceType?: 'MOBILE' | 'DESKTOP' | 'TABLET' | 'AGNOSTIC'
)

// Edit an existing screen
const edited: Screen = await screen.edit(
  prompt: string,
  deviceType?: DeviceType,
  modelId?: 'GEMINI_3_PRO' | 'GEMINI_3_FLASH'
)

// Generate design variants (diverge mode)
const variants: Screen[] = await screen.variants(
  prompt: string,
  variantOptions: {
    variantCount?: number,          // 1–5, default 3
    creativeRange?: 'REFINE' | 'EXPLORE' | 'REIMAGINE',  // default 'EXPLORE'
    aspects?: Array<'LAYOUT' | 'COLOR_SCHEME' | 'IMAGES' | 'TEXT_FONT' | 'TEXT_CONTENT'>
  },
  deviceType?: DeviceType,
  modelId?: ModelId
)

// Retrieve artifacts — both return download URLs, NOT inline content
const htmlUrl: string = await screen.getHtml()    // URL to fetch HTML string from
const imageUrl: string = await screen.getImage()  // URL to fetch PNG buffer from

// Direct MCP tool call (agent-centric API)
await stitch.callTool('create_project', { title: 'My App' })
const tools = await stitch.listTools()
```

**Critical SDK nuance:** `getHtml()` and `getImage()` return **download URLs**, not inline content. PDE workflows must `fetch()` those URLs (using Node.js built-in `https` module — no npm dependency) to get the actual HTML string or PNG buffer. This matters for:
- `/pde:critique` — needs raw HTML to compare against design tokens
- `/pde:handoff` — needs HTML content for pattern extraction
- `/pde:ideate --diverge` — can use the image URL directly in markdown output without fetching

---

## Image Format Support

| Format | Source | How Delivered | PDE Pipeline Use |
|--------|--------|--------------|-----------------|
| PNG screenshot | `screen.getImage()` / MCP `get_screen` | Download URL (must `fetch()` for buffer) | `/pde:critique` visual comparison; `/pde:ideate --diverge` variant display |
| HTML (rendered UI) | `screen.getHtml()` / MCP `get_screen` | Download URL (must `fetch()` for string) | Pattern extraction in `/pde:handoff`; design token comparison in `/pde:critique` |

No base64 encoding from the official Stitch API — download URLs only. The `@_davideast/stitch-mcp` community server returns base64 for `get_screen_image`, but that server is not used in PDE.

---

## Rate Limits and Quotas

Source: community guides and Stitch announcement pages (LOW confidence — not documented in official API reference).

| Tier | Standard Mode (Gemini 2.5 Flash) | Experimental Mode (Gemini 2.5 Pro) | Reset |
|------|----------------------------------|-------------------------------------|-------|
| Free | 350 generations/month | 50 generations/month | UTC midnight, 1st of month |
| Enterprise | Custom (up to 5000 RPM reported) | Custom | — |

**Implications for PDE:**
- Each `generate_screen_from_text` call consumes one generation from monthly quota
- `/pde:ideate --diverge` with `variants(variantCount: 3)` uses 3 generations per invocation
- With 350/month free tier, automated multi-variant runs will exhaust quota if `/pde:build` is run repeatedly
- Workflows must warn users of generation cost at the start of Stitch-enabled stages
- Stitch generation must remain opt-in via `--use-stitch` flag; never auto-trigger during standard pipeline runs

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Official `https://stitch.googleapis.com/mcp` (HTTP transport) | `@_davideast/stitch-mcp` (stdio proxy, 3 tools) | Only if official remote server is unavailable; misses `extract_design_context` and `generate_screen_from_text` |
| API key auth | ADC / gcloud auth | Only for enterprise Google Cloud environments; impractical for general PDE users |
| `@google/stitch-sdk` in isolated `bin/lib/stitch/` subdir | At plugin root | Never — violates zero-npm-deps-at-plugin-root constraint |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `gemini-cli-extensions/stitch` | Requires Gemini CLI (v0.19.0+) as a runtime dependency — it is a Gemini CLI extension, not a standalone MCP server. PDE runs in Claude Code, not Gemini CLI. | Official `https://stitch.googleapis.com/mcp` HTTP server |
| `@google/stitch-sdk/ai` (Vercel AI SDK adapter) | PDE does not use Vercel AI SDK; importing it adds a dependency chain that violates the zero-npm constraint at plugin root | `stitch.callTool()` direct API when programmatic access is needed outside of MCP |
| `Kargatharaakash/stitch-mcp` as primary integration | Community-maintained, requires Google Cloud project with billing (adds a hard prerequisite most users don't have), gcloud auth required — violates PDE's verified-sources-only security policy | `https://stitch.googleapis.com/mcp` (official Google-operated endpoint) |
| `@_davideast/stitch-mcp` as primary integration | Community-maintained, stdio transport (inconsistent with existing HTTP-transport APPROVED_SERVERS), only 3 tools, misses `extract_design_context` and `generate_screen_from_text` | `https://stitch.googleapis.com/mcp` |
| Polling `list_screens` immediately after `generate_screen_from_text` | Confirmed state-sync bug: newly generated screens are invisible to `list_screens` until the project is opened in a browser. Automated sequential generate→list→get workflows WILL fail silently. | Store `screenId` returned directly from `generate_screen_from_text`; use `get_screen(projectId, screenId)` directly |

---

## Stack Patterns by Variant

**If workflow only needs MCP tools (no custom Node.js scripting):**
- Use `mcp__stitch__*` tools directly in workflow markdown via TOOL_MAP canonical names
- Zero additional npm installs needed — HTTP transport server is cloud-hosted
- This is the default path for all 5 target v0.9 features

**If workflow needs programmatic post-processing (fetching HTML from download URL, token extraction):**
- Install `@google/stitch-sdk` in `bin/lib/stitch/` subdirectory only (isolated from plugin root)
- Use `screen.getHtml()` URL + Node.js built-in `https` module to fetch actual content (no extra npm dep)
- Keep any conversion functions inline in the workflow file — matches the `figmaColorToCss` / `dtcgToPencilVariables` precedent from v0.5

**If user invokes `/pde:wireframe --use-stitch` or `/pde:mockup --use-stitch`:**
- Check `stitch` connection status via `getStatus('stitch')` before proceeding
- Degrade gracefully: if `status !== 'connected'`, skip Stitch stage and continue with existing HTML/CSS mockup generation
- Never block the pipeline on an optional design tool

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@google/stitch-sdk@0.0.3` | Node.js 18+ | Matches existing PDE runtime requirement; no explicit peer deps documented |
| `https://stitch.googleapis.com/mcp` | MCP protocol (any compliant client) | Claude Code's HTTP transport is MCP-compliant; no version constraint beyond Claude Code's current MCP runtime |
| `claude mcp add --transport http` | Claude Code (current) | Same command pattern as existing Figma/Linear/GitHub APPROVED_SERVERS |

---

## Known Bugs to Design Around

| Bug | Impact on PDE | Mitigation |
|-----|--------------|------------|
| `list_screens` returns empty after `generate_screen_from_text` until project opened in browser | Breaks generate → list → get automation; confirmed on Claude Code + Cursor + Gemini CLI | Always use `screenId` returned directly by `generate_screen_from_text`; pass to `get_screen` directly rather than re-listing |
| SDK v0.0.3 — early pre-release; `variantCount` field was named `numVariants` in earlier versions | Field name changes are breaking in automated calls | Pin to `@google/stitch-sdk@0.0.3` explicitly; re-verify field names against latest release before each PDE milestone that touches Stitch |

---

## Installation

MCP server requires no install (cloud-hosted). One-time user setup:

```bash
# User runs once to register Stitch MCP with Claude Code
claude mcp add --transport http stitch https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: ${STITCH_API_KEY}"
```

SDK installs in an isolated subdirectory only if programmatic post-processing is needed:

```bash
# In bin/lib/stitch/ subdirectory ONLY — never at plugin root
mkdir -p bin/lib/stitch && cd bin/lib/stitch
npm init -y
npm install @google/stitch-sdk@0.0.3
```

---

## Sources

- [google-labs-code/stitch-sdk GitHub](https://github.com/google-labs-code/stitch-sdk) — SDK API, method signatures, TypeScript types, authentication setup (HIGH confidence)
- [stitch-sdk Releases](https://github.com/google-labs-code/stitch-sdk/releases) — v0.0.3 confirmed as latest, `variantCount` field name fix documented (HIGH confidence)
- [Stitch by Google X — SDK announcement](https://x.com/stitchbygoogle/status/2033670811673108542) — Official SDK release, `npm i @google/stitch-sdk` (HIGH confidence)
- [Stitch by Google X — API Keys announcement](https://x.com/stitchbygoogle/status/2016567646180041166) — API key auth launch, "goodbye to the OAuth dance" (HIGH confidence for auth method)
- [Stitch MCP setup docs](https://stitch.withgoogle.com/docs/mcp/setup) — Official HTTP endpoint URL, `X-Goog-Api-Key` header, `claude mcp add` command; page returned JS shell on fetch but endpoint confirmed via multiple secondary sources (MEDIUM confidence)
- [Google AI Developers Forum — list_screens bug](https://discuss.ai.google.dev/t/list-screens-returns-empty-after-generate-screen-from-text-until-project-is-opened-in-browser/123348) — Confirmed tool names `generate_screen_from_text`, `list_screens`, `get_screen`, `get_project`, `create_project`; state-sync bug documented (HIGH confidence for tool names and bug)
- [davideast/stitch-mcp GitHub](https://github.com/davideast/stitch-mcp) — Community stdio MCP proxy, 3-tool surface, `STITCH_API_KEY` env auth, base64 image return pattern (MEDIUM confidence — documented as "do not use" rationale)
- [Kargatharaakash/stitch-mcp GitHub](https://github.com/Kargatharaakash/stitch-mcp) — Community MCP server, 9-tool surface including `extract_design_context`, gcloud auth requirement (MEDIUM confidence)
- [gemini-cli-extensions/stitch README](https://github.com/gemini-cli-extensions/stitch/blob/main/README.md) — Gemini CLI v0.19.0+ runtime dependency confirmed; API key vs ADC auth options (HIGH confidence — documented as "do not use" rationale)
- [Google Stitch free tier quota](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026) — 350 Standard + 50 Experimental generations/month (LOW confidence — community source only)
- [Google Stitch March 2026 redesign](https://winbuzzer.com/2026/03/20/google-redesigns-stitch-ai-voice-canvas-developer-integrations-xcxwbn/) — Claude Code integration confirmed as first-class target (MEDIUM confidence)
- Existing `mcp-bridge.cjs` (read directly from repo) — APPROVED_SERVERS structure, TOOL_MAP pattern, AUTH_INSTRUCTIONS format, zero-npm constraint, verified-sources-only security policy (HIGH confidence — primary architectural source)

---

*Stack research for: Google Stitch AI UI design tool integration (PDE v0.9)*
*Researched: 2026-03-20*
