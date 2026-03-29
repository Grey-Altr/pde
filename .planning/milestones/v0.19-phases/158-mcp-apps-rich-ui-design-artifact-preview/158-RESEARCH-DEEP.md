# Phase 158: Deep Research — MCP Apps Rich UI + Design Artifact Preview

**Researched:** 2026-03-28 (maxdepth pass)
**Supplements:** 158-RESEARCH.md (standard research)
**Confidence:** HIGH — verified against official spec, SDK source, reference implementations

---

## 1. Client-Side App Class — Complete API

The `App` class from `@modelcontextprotocol/ext-apps` runs inside the iframe and communicates with the host via `PostMessageTransport` (JSON-RPC over `window.postMessage`).

### Import Paths

```
@modelcontextprotocol/ext-apps          → App, PostMessageTransport, types
@modelcontextprotocol/ext-apps/react    → useApp, useHostStyles, useDocumentTheme
@modelcontextprotocol/ext-apps/server   → registerAppTool, registerAppResource, RESOURCE_MIME_TYPE
```

### Constructor

```typescript
new App(
  appInfo: { name: string; version: string },
  capabilities?: { tools?: { listChanged?: boolean }; availableDisplayModes?: ("inline"|"fullscreen"|"pip")[] },
  options?: { autoResize?: boolean }  // default: true
)
```

### Lifecycle: `app.connect(transport?, options?): Promise<void>`

1. Creates default `PostMessageTransport(window.parent, window.parent)` if none provided
2. Sends `ui/initialize` with appInfo + capabilities
3. Receives `McpUiInitializeResult` — stores `hostCapabilities`, `hostInfo`, `hostContext`
4. Sends `ui/notifications/initialized`
5. Sets up `ResizeObserver` if `autoResize: true`

**If host doesn't support MCP Apps:** `connect()` throws. No graceful degradation — wrap in try/catch.

**CRITICAL:** Register all notification handlers BEFORE calling `connect()` — notifications arrive immediately after handshake.

### Notification Handlers (Setters — assign before connect)

| Setter | Fires when | Params |
|--------|-----------|--------|
| `app.ontoolinput` | Host sends complete tool call arguments | `{ arguments?: Record<string, unknown> }` |
| `app.ontoolinputpartial` | Host streams partial arguments (healed JSON) | `{ arguments?: Record<string, unknown> }` |
| `app.ontoolresult` | Tool execution completes on MCP server | `CallToolResult` with `content[]`, `structuredContent`, `isError` |
| `app.ontoolcancelled` | Tool execution cancelled | `{ reason?: string }` |
| `app.onhostcontextchanged` | Theme, locale, display mode, or dimensions change | `McpUiHostContext` |
| `app.onteardown` | Host requests graceful shutdown | `{}` → return `{}` |

**`app.ontoolresult` is the primary way the iframe receives `structuredContent`** from the server-side tool handler.

### Methods

| Method | Purpose | Requires Host Capability |
|--------|---------|------------------------|
| `app.callServerTool({ name, arguments })` | Call MCP tool on originating server | `serverTools` |
| `app.readServerResource({ uri })` | Read MCP resource from server | `serverResources` |
| `app.listServerResources({ cursor? })` | List server resources | `serverResources` |
| `app.sendMessage({ role: "user", content })` | Inject message into host chat | `message` |
| `app.updateModelContext({ content?, structuredContent? })` | Update context for next turn (last-write-wins) | `updateModelContext` |
| `app.openLink({ url })` | Ask host to open URL | `openLinks` |
| `app.downloadFile({ contents })` | Trigger file download via host | `downloadFile` |
| `app.requestDisplayMode({ mode })` | Switch inline/fullscreen/pip | — |
| `app.sendSizeChanged({ width?, height? })` | Manual size notification | — |
| `app.getHostCapabilities()` | Read capabilities from handshake | — |
| `app.getHostContext()` | Read full host context | — |

### Host Context Structure (`McpUiHostContext`)

```typescript
{
  theme?: "light" | "dark";
  styles?: {
    variables?: McpUiStyles;  // ~90+ CSS custom properties
    css?: { fonts?: string }; // @font-face/@import rules
  };
  displayMode?: "inline" | "fullscreen" | "pip";
  availableDisplayModes?: ("inline" | "fullscreen" | "pip")[];
  containerDimensions?: { height?: number; maxHeight?: number; width?: number; maxWidth?: number };
  locale?: string;       // BCP 47
  timeZone?: string;     // IANA
  platform?: "web" | "desktop" | "mobile";
  toolInfo?: { id?: RequestId; tool: Tool };
}
```

### Host CSS Custom Properties (provided via `styles.variables`)

The host provides ~90+ design tokens:
- `--color-background-{primary|secondary|tertiary|inverse|ghost|info|danger|success|warning|disabled}`
- `--color-text-{primary|secondary|...}`, `--color-border-{...}`, `--color-ring-{...}`
- `--font-sans`, `--font-mono`
- `--font-weight-{normal|medium|semibold|bold}`
- `--font-text-{xs|sm|md|lg}-size`, `--font-heading-{xs|sm|md|lg|xl|2xl|3xl}-size`
- `--border-radius-{xs|sm|md|lg|xl|full}`, `--shadow-{hairline|sm|md|lg}`

Use `applyHostStyleVariables(ctx.styles.variables)` to set them on `:root`.

---

## 2. Host Rendering Architecture

### Double-Iframe Sandbox (All Web Hosts)

```
Host page → outer sandbox.html iframe (separate origin) → inner content iframe
```

- Outer iframe: `sandbox="allow-scripts allow-same-origin allow-forms"`, runs on dedicated origin (e.g., `{hash}.claudemcpcontent.com`)
- Inner iframe: same sandbox attrs, HTML injected by the sandbox proxy
- CSP set as HTTP response headers on sandbox origin (tamper-proof, not `<meta>` tags)
- Security self-test: proxy verifies it cannot reach `window.top`

### CSP Mapping — What Domains Actually Translate To

| `_meta.ui.csp` field | CSP directive(s) |
|----------------------|------------------|
| `connectDomains` | `connect-src 'self' <domains>` |
| `resourceDomains` | `script-src`, `style-src`, `img-src`, `font-src`, `media-src`, `worker-src` |
| `frameDomains` | `frame-src` (omitted = `frame-src 'none'`) |
| `baseUriDomains` | `base-uri` (omitted = `base-uri 'none'`) |

**Default CSP (when `csp` omitted entirely):**
```
default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; media-src 'self' data:; connect-src 'none'
```

This blocks ALL external network requests. For PDE artifact viewers that inline all JS, this default is fine — no `connectDomains` needed.

### Host-Specific Rendering

| Host | Container | Display |
|------|-----------|---------|
| Claude web | Inline card in chat flow | `prefersBorder` controls card border. Width = chat column width. Sample: `containerDimensions: { width: 400, maxHeight: 600 }` |
| Claude desktop | Same as web, app-native | `hostInfo.name: "claude-desktop"` |
| VS Code Copilot | Inline in Copilot chat panel | Webview API with native OS-level process isolation |
| Goose | Chat panel | Standard AppBridge |
| basic-host (dev) | Full-width test panel | `maxHeight: 6000`, 300ms ease-out resize animation |

### Theme Delivery

**Theme is via postMessage, NOT `prefers-color-scheme`:**
1. Initial: `hostContext.theme` in `ui/initialize` response
2. Runtime: `ui/notifications/host-context-changed` with `{ theme: "dark" }`
3. App uses `applyDocumentTheme(theme)` → sets `data-theme` + `color-scheme` on `<html>`

### Dev Testing

**basic-host** (official reference): Two local servers (host :8080, sandbox :8081). Form to select tool, call it, view iframe. URL params: `?server=name&tool=name&call=true` for auto-call.

**MCPJam Inspector**: Widget emulator with device/locale/CSP/theme simulation, multi-LLM playground. Connects directly to localhost MCP servers.

---

## 3. PDE Artifact Inventory — What Gets Previewed

Complete inventory of design pipeline artifacts by type:

### HTML Artifacts (pass-through — no rendering library needed)

| Code | Path | Notes |
|------|------|-------|
| `WFR-*.html` | `ux/wireframes/WFR-{screen}-v*.html` | **Has `<link>` to `../../assets/tokens.css`** — must inline tokens CSS |
| `MCK-*.html` | `ux/mockups/mockup-{screen}.html` | Self-contained |
| `STH-*.html` | `ux/wireframes/STH-{slug}.html` | Stitch-generated, self-contained |
| `SYS-preview.html` | `visual/SYS-preview.html` | Self-contained token preview |

### Markdown Artifacts (need marked library)

| Code | Path | Content Notes |
|------|------|--------------|
| `BRF-*.md` | `strategy/BRF-brief-v*.md` | Prose + tables |
| `FLW-*.md` | `ux/FLW-flows-v*.md` | Tables + **Mermaid diagrams** |
| `SYS-guide.md` | `visual/SYS-usage-guide.md` | Usage guide |
| `HIG-audit-*.md` | `review/HIG-audit-v*.md` | Audit report |
| `CRT-*.md` | `review/CRT-critique-v*.md` | Tables |
| `ITR-*.md` | `review/ITR-changelog-v*.md` | Changelog |
| `HND-spec-*.md` | `handoff/HND-handoff-spec-v*.md` | Tables + TypeScript code blocks |
| `LKT-*.md` | `handoff/LKT-launch-kit-v*.md` | Launch kit |

### JSON Artifacts

| Code | Path | Content Notes |
|------|------|--------------|
| `SYS-tokens.json` | `visual/SYS-tokens.json` | DTCG 2025.10 design tokens — nested `$value/$type/$description` |
| `FLW-screen-inventory.json` | `ux/FLW-screen-inventory.json` | Screen list |
| `STR-*.json` | `launch/STR-stripe-pricing-v*.json` | Pricing config |

### Other Artifacts

| Code | Path | Content Notes |
|------|------|--------------|
| `HND-*.ts` | `handoff/HND-types-v*.ts` | TypeScript interfaces |
| `HND-*.svg` | `handoff/HND-*-view-v*.svg` | Hardware dimension drawings |
| `HND-*.csv` | `handoff/HND-bom-export-v*.csv` | Bill of materials |
| `SYS-*.css` | `visual/SYS-*.css` (8 files) | CSS custom properties |

### Rendering Strategy per Type

| Type | Strategy | Library | Weight |
|------|----------|---------|--------|
| `.html` | Pass-through + inline tokens.css | None | 0 |
| `.md` (no Mermaid) | Inline `marked` UMD | marked v17 (~40KB min) | Inline |
| `.md` (with Mermaid) | marked + lazy-load mermaid ESM from CDN | mermaid@11 (~136KB gz) | CDN on demand |
| `.json` (tokens) | Purpose-built DTCG viewer (inline JS, color swatches) | None | 0 |
| `.json` (other) | Syntax-highlighted `<pre>` | None (inline) | 0 |
| `.ts` | Syntax-highlighted code block | None (inline) | 0 |
| `.svg` | Inline SVG into HTML body | None | 0 |
| `.css` | Syntax-highlighted `<pre>` | None (inline) | 0 |
| `.csv` | Parse + render HTML table (inline JS) | None | 0 |

**Key decision: Inline all JS vs CDN.**
- Inlining `marked` UMD (40KB) is recommended — eliminates CDN dependency and CSP requirements
- Mermaid (502KB min) is too large to inline — use CDN with `connectDomains: ["https://cdn.jsdelivr.net"]`, load only when Markdown contains mermaid code blocks (detectable server-side)

---

## 4. Current Codebase Integration Points

### Server-Factory Architecture

`dashboard/lib/mcp/server-factory.ts` → `registerPdeTools(server: McpServer)`:
- Calls `registerPipelineTools(server)` from `tools/pipeline-tools.ts`
- Pipeline tools: `get_project_state`, `start_pipeline_run`, `check_pipeline_run`
- Tool handler signature: `async (args, { authInfo }) => ({ content: [{ type: 'text', text: '...' }] })`
- Registration is synchronous and pure — no I/O during registration

### Phase 158 Integration Plan

Add new file: `dashboard/lib/mcp/apps/artifact-preview.ts`
- Export `registerArtifactPreviewTools(server: McpServer)`
- Call from `server-factory.ts` alongside `registerPipelineTools`
- Use `registerAppResource` + `registerAppTool` from `@modelcontextprotocol/ext-apps/server`

### Environment Variable Gap

`NEXT_PUBLIC_APP_URL` is used in `origin-guard.ts` but **missing from `.env.example`**. Phase 158 must:
1. Add `NEXT_PUBLIC_APP_URL` to `.env.example`
2. Use it for `connectDomains` in resource CSP
3. Fall back to `process.env.VERCEL_URL ? \`https://${process.env.VERCEL_URL}\` : 'http://localhost:3000'`

### Next.js Headers — NOT Needed

`dashboard/next.config.ts` has **no custom headers**. Since Phase 158 serves HTML via `registerAppResource` (MCP protocol, not HTTP), **no `next.config.ts` header changes are required**. The MCP host's sandbox handles iframe embedding. The `X-Frame-Options` concern only applies to the self-fetch pattern (fetching a Next.js page URL), which we're NOT using.

### Test Patterns

Follow **Pattern A** (mock server):
```typescript
const mockServer = { tool: vi.fn(), registerResource: vi.fn() };
registerArtifactPreviewTools(mockServer as any);
// Capture handler by name, invoke directly
```

Extend `dashboard/__tests__/server-factory.test.ts` for RUI-01/02, create `dashboard/__tests__/mcp-rich-ui.test.ts` for RUI-03.

---

## 5. Wire Protocol Reference

### Handshake Sequence

```
App                              Host
 │── ui/initialize ─────────────→ │  (appInfo, capabilities)
 │← response ────────────────── │  (hostInfo, hostCapabilities, hostContext)
 │── ui/notifications/initialized → │
 │                                 │
 │← ui/notifications/tool-input ── │  (complete arguments)
 │← ui/notifications/tool-result ─ │  (CallToolResult + structuredContent)
 │                                 │
 │── tools/call ──────────────────→ │  (callServerTool proxy)
 │── ui/message ──────────────────→ │  (sendMessage)
 │── ui/notifications/size-changed → │  (auto-resize)
 │                                 │
 │← ui/resource-teardown ────────── │  (graceful shutdown)
 │── response ────────────────────→ │  ({} = done)
```

### Size Notifications

`autoResize: true` (default) sets up `ResizeObserver` on `document.body` + `document.documentElement`. Debounced via `requestAnimationFrame`. Host listens on `ui/notifications/size-changed` and animates iframe height (basic-host: 300ms ease-out).

---

## 6. Critical Gotchas (Expanded from Standard Research)

### Gotcha: WFR HTML Files Reference External CSS

Wireframe HTML files use `<link rel="stylesheet" href="../../assets/tokens.css">`. This relative path does NOT resolve inside MCP App iframes (injected by the sandbox proxy).

**Fix:** Server-side, read `tokens.css`, replace the `<link>` tag with inlined `<style>` block containing the actual CSS content before returning the HTML.

### Gotcha: Mermaid `securityLevel: 'sandbox'` Creates Nested Iframes

Mermaid's sandbox security mode creates its own iframe per diagram — this conflicts with the double-iframe architecture. Use `securityLevel: 'strict'` instead (HTML encoding, no click events).

### Gotcha: `updateModelContext` is Last-Write-Wins

Each `app.updateModelContext()` call overwrites the previous. Call once with complete state, not incrementally.

### Gotcha: No `prefers-color-scheme` in Iframes

Hosts do NOT set `prefers-color-scheme` on iframes. Theme comes via `hostContext.theme` postMessage. CSS `prefers-color-scheme` media queries in iframe HTML will reflect the OS setting, not the host's theme.

However, for Phase 158's read-only artifact previews (no App SDK client-side JS), `color-scheme: light dark` on `:root` combined with `light-dark()` CSS function is sufficient — it follows the OS setting which typically matches the host theme.

### Gotcha: `NEXT_PUBLIC_APP_URL` Missing

Used in `origin-guard.ts` but absent from `.env.example`. Must add before Phase 158 implementation.

### Gotcha: No Header Changes Needed for MCP Protocol Resources

Since we serve HTML via `registerAppResource` (MCP protocol), not HTTP routes, `X-Frame-Options` and CSP headers in `next.config.ts` are irrelevant. The host's sandbox handles all iframe security. Only add headers if implementing the self-fetch pattern (Phase 158 does NOT).

---

## 7. Recommended HTML Template — Markdown Artifact Viewer

Self-contained, all JS inlined, theme-aware via CSS `light-dark()`. Note: marked.parse() is used on server-generated content (PDE design artifacts), not user input, so XSS risk is controlled at the source level. For defense-in-depth, DOMPurify can be added if needed.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{artifact_name}}</title>
<style>
:root {
  color-scheme: light dark;
  --bg: var(--color-background-primary, light-dark(#fff, #0f1117));
  --fg: var(--color-text-primary, light-dark(#1a1a1a, #e8e8e8));
  --muted: var(--color-text-secondary, light-dark(#666, #999));
  --surface: var(--color-background-secondary, light-dark(#f5f5f5, #1e2028));
  --border: light-dark(#e0e0e0, #333);
  --code-bg: light-dark(#f0f0f0, #1e2028);
  --accent: var(--color-text-info, #2563eb);
  --font-body: var(--font-sans, system-ui, -apple-system, sans-serif);
  --font-code: var(--font-mono, ui-monospace, Menlo, Consolas, monospace);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-family: var(--font-body); font-size: 14px; line-height: 1.6;
       background: var(--bg); color: var(--fg); }
body { max-width: 780px; margin: 0 auto; padding: 1rem; }
h1,h2,h3,h4 { line-height: 1.3; margin: 1.5em 0 0.5em; font-weight: 600; }
h1 { font-size: 1.75rem; } h2 { font-size: 1.35rem; } h3 { font-size: 1.1rem; }
p, li { margin-bottom: 0.75em; }
a { color: var(--accent); }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.875rem; }
th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
th { background: var(--surface); font-weight: 600; }
tr:nth-child(even) td { background: var(--surface); }
code { font-family: var(--font-code); font-size: 0.875em;
       background: var(--code-bg); padding: 0.15em 0.35em; border-radius: 3px; }
pre { background: var(--code-bg); border: 1px solid var(--border);
      border-radius: 6px; padding: 1rem; overflow-x: auto; margin: 1em 0; }
pre code { background: none; padding: 0; font-size: 0.825rem; }
blockquote { border-left: 3px solid var(--border); padding-left: 1rem;
             color: var(--muted); margin: 1em 0; }
hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
</style>
</head>
<body>
<div id="content">{{SERVER_RENDERED_HTML}}</div>
</body>
</html>
```

Server-side rendering approach: Use `marked.parse(markdown)` on the server (Node.js) to convert Markdown to HTML before injecting into the template. This avoids any client-side JS execution in the iframe for read-only previews — simpler, faster, and avoids CSP concerns entirely.

---

## 8. React Hooks for Interactive Viewers (Future)

If Phase 158 or later phases need interactive MCP App UIs (not just read-only previews):

```typescript
import { useApp, useHostStyles, useDocumentTheme } from "@modelcontextprotocol/ext-apps/react";

function ArtifactViewer() {
  const { app, isConnected, error } = useApp({
    appInfo: { name: "pde-artifact-viewer", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        setArtifactData(result.structuredContent);
      };
    },
  });

  useHostStyles(app, app?.getHostContext());
  const theme = useDocumentTheme();

  if (error) return <div>Not in MCP Apps host</div>;
  if (!isConnected) return <div>Connecting...</div>;
  return <ArtifactContent data={artifactData} theme={theme} />;
}
```

Phase 158 scope is read-only artifact preview — React hooks are NOT needed. The server-rendered HTML approach is correct.

---

## Sources

### Primary (verified against source code)
- `@modelcontextprotocol/ext-apps` v1.3.2 source (GitHub + npm)
- MCP Apps Specification 2026-01-26 (`specification/2026-01-26/apps.mdx`)
- `basic-host` reference implementation (`examples/basic-host/`)
- Official API docs (`apps.extensions.modelcontextprotocol.io/api/`)
- Official build guide (`modelcontextprotocol.io/extensions/apps/build`)

### Secondary (cross-referenced)
- MCPJam Inspector (`github.com/MCPJam/inspector`)
- MCP Apps for Claude Figma design file
- VS Code MCP Apps blog post (Jan 2026)
- Goose MCP Apps docs (`block.github.io/goose/docs/tutorials/building-mcp-apps/`)
- sunpeak.ai CSP deep dive

### Codebase (current state verified)
- `dashboard/lib/mcp/server-factory.ts` — tool registration patterns
- `dashboard/app/api/mcp/route.ts` — handler + auth wrapping
- `dashboard/next.config.ts` — no custom headers
- `dashboard/.env.example` — missing `NEXT_PUBLIC_APP_URL`
- `.planning/design/` — artifact structure and formats

**Research date:** 2026-03-28
**Valid until:** 2026-04-28
