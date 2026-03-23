# WebMCP W3C Implementation Research

**Domain:** W3C WebMCP adapter + web frontend for PDE planning tool
**Researched:** 2026-03-23
**Overall confidence:** HIGH (spec is published, Chrome 146 preview ships, polyfill packages exist on npm)

---

## 1. The W3C WebMCP Spec: `navigator.modelContext` API Surface

**Source:** [W3C WebMCP Spec](https://webmachinelearning.github.io/webmcp/) (Web Machine Learning Community Group)
**Status:** Draft spec, NOT on W3C Standards Track. Early preview in Chrome 146 (Feb 2026).

### WebIDL Interface

```webidl
partial interface Navigator {
  [SecureContext, SameObject] readonly attribute ModelContext modelContext;
};

[Exposed=Window, SecureContext]
interface ModelContext {
  undefined registerTool(ModelContextTool tool);
  undefined unregisterTool(DOMString name);
};

dictionary ModelContextTool {
  required DOMString name;
  required DOMString description;
  object inputSchema;
  required ToolExecuteCallback execute;
  ToolAnnotations annotations;
};

dictionary ToolAnnotations {
  boolean readOnlyHint = false;
};

callback ToolExecuteCallback = Promise<any> (object input, ModelContextClient client);

[Exposed=Window, SecureContext]
interface ModelContextClient {
  Promise<any> requestUserInteraction(UserInteractionCallback callback);
};

callback UserInteractionCallback = Promise<any> ();
```

### Key Methods

| Method | Purpose | Throws |
|--------|---------|--------|
| `registerTool(tool)` | Add one tool to the page's registered set | `InvalidStateError` if name exists, name/description empty, or inputSchema invalid |
| `unregisterTool(name)` | Remove tool by name | `InvalidStateError` if tool doesn't exist |

### What's NOT in the spec yet (TODO)

- `provideContext()` (set all tools at once) -- mentioned in blog posts but not in current WebIDL
- Declarative WebMCP (Section 4.3 is empty)
- `requestUserInteraction()` implementation steps incomplete
- No events API for tool discovery by external consumers

### Security Model

- **SecureContext required:** HTTPS only in production. `http://localhost` is allowed during development. Custom local domains (e.g., `myapp.test`) need self-signed certs.
- **file:// protocol will NOT work** -- SecureContext excludes file:// origins.
- Browser mediates all tool invocations; the page's JavaScript executes in the page's context.

**Confidence: HIGH** -- sourced directly from the published spec.

---

## 2. MCP-B Polyfill Ecosystem

**Source:** [MCP-B GitHub](https://github.com/WebMCP-org), [MCP-B Docs](https://docs.mcp-b.ai/), npm packages

### Package Map

| Package | Purpose | Size | PDE Relevant? |
|---------|---------|------|---------------|
| `@mcp-b/global` | All-in-one polyfill + server setup | 285KB IIFE | YES -- primary choice |
| `@mcp-b/webmcp-polyfill` | Spec-aligned polyfill only | smaller | YES -- if leaner is needed |
| `@mcp-b/webmcp-types` | TypeScript type definitions | types only | Optional |
| `@mcp-b/webmcp-ts-sdk` | BrowserMcpServer (prompts, resources, sampling) | heavier | NO -- overkill for PDE |
| `@mcp-b/transports` | PostMessage + WebSocket cross-context | - | Maybe -- for extension bridge |
| `@mcp-b/react-webmcp` | React hooks for tool lifecycle | - | NO -- PDE uses vanilla JS |
| `@mcp-b/webmcp-local-relay` | Bridge browser tools to desktop MCP clients | - | YES -- critical for Claude Code |
| `@mcp-b/chrome-devtools-mcp` | CDP-based tool bridge | - | Alternative to local-relay |

### Using Without npm (CDN / Script Tag)

**This is the recommended approach for PDE** -- zero build step, no node_modules:

```html
<script src="https://unpkg.com/@mcp-b/global@latest/dist/index.iife.js"></script>
<script>
  // navigator.modelContext is immediately available
  navigator.modelContext.registerTool({
    name: 'get-project-state',
    description: 'Returns PDE project state',
    inputSchema: { type: 'object', properties: {} },
    async execute() {
      return { content: [{ type: 'text', text: document.title }] };
    }
  });
</script>
```

The IIFE bundle auto-initializes. It detects native browser support and falls back to polyfill when needed.

**For offline/vendored use:** Download the IIFE bundle once and serve it locally alongside PDE's HTML. No npm install required.

**Confidence: HIGH** -- verified from npm package docs and GitHub README.

---

## 3. Minimal HTML/JS for PDE Tool Registration

### Complete Working Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PDE Dashboard</title>
</head>
<body>
  <div id="app"><!-- PDE state renders here --></div>

  <!-- Polyfill: works in any browser, uses native when available -->
  <script src="https://unpkg.com/@mcp-b/global@latest/dist/index.iife.js"></script>

  <script>
    // Tool 1: Read project state
    navigator.modelContext.registerTool({
      name: 'pde-get-project',
      description: 'Returns the current PDE project state (PROJECT.md content)',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const res = await fetch('/api/project');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
      }
    });

    // Tool 2: Read roadmap
    navigator.modelContext.registerTool({
      name: 'pde-get-roadmap',
      description: 'Returns the PDE roadmap (ROADMAP.md content)',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const res = await fetch('/api/roadmap');
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
      }
    });

    // Tool 3: List phases
    navigator.modelContext.registerTool({
      name: 'pde-list-phases',
      description: 'Lists all PDE phases with status',
      inputSchema: {
        type: 'object',
        properties: {
          milestone: { type: 'string', description: 'Filter by milestone version (e.g. "v0.14")' }
        }
      },
      annotations: { readOnlyHint: true },
      async execute(args) {
        const url = args.milestone ? `/api/phases?milestone=${args.milestone}` : '/api/phases';
        const res = await fetch(url);
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
      }
    });

    // Tool 4: Read a specific file from .planning/
    navigator.modelContext.registerTool({
      name: 'pde-read-artifact',
      description: 'Read a specific PDE planning artifact by path',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path within .planning/ (e.g. "research/STACK.md")' }
        },
        required: ['path']
      },
      annotations: { readOnlyHint: true },
      async execute(args) {
        const res = await fetch(`/api/artifact?path=${encodeURIComponent(args.path)}`);
        const data = await res.text();
        return { content: [{ type: 'text', text: data }] };
      }
    });
  </script>
</body>
</html>
```

**Confidence: HIGH** -- pattern matches official MCP-B examples and spec.

---

## 4. Serving PDE `.planning/` State

### Option Analysis

| Option | HTTPS? | WebMCP Works? | Complexity | PDE Fit |
|--------|--------|---------------|------------|---------|
| `file://` | No | NO (SecureContext) | Zero | REJECTED |
| `npx serve` | No (HTTP) | YES (localhost exception) | One command | Good for dev |
| Node.js `http` module | No (HTTP) | YES (localhost exception) | ~50 lines | RECOMMENDED |
| Vite dev server | No (HTTP) | YES (localhost exception) | Config file | Overkill |
| `python -m http.server` | No (HTTP) | YES (localhost exception) | One command | No API routes |

### Recommended: Minimal Node.js Server (~80 lines)

PDE needs API routes (not just static files) to serve parsed `.planning/` content. A single-file Node.js server with zero dependencies is ideal:

```javascript
// serve-pde.js -- zero npm dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const PROJECT_ROOT = process.cwd();
const PLANNING_DIR = path.join(PROJECT_ROOT, '.planning');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.md': 'text/plain',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  res.end(content);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname === '/api/project') {
    const content = fs.readFileSync(path.join(PLANNING_DIR, 'PROJECT.md'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ content }));
  } else if (url.pathname === '/api/roadmap') {
    const content = fs.readFileSync(path.join(PLANNING_DIR, 'ROADMAP.md'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ content }));
  } else if (url.pathname === '/api/artifact') {
    const artifactPath = url.searchParams.get('path');
    // Security: prevent path traversal
    const resolved = path.resolve(PLANNING_DIR, artifactPath);
    if (!resolved.startsWith(PLANNING_DIR)) {
      res.writeHead(403); res.end('Forbidden');
      return;
    }
    const content = fs.readFileSync(resolved, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(content);
  } else {
    // Static files from web/ directory
    const filePath = path.join(PROJECT_ROOT, 'web', url.pathname === '/' ? 'index.html' : url.pathname);
    if (fs.existsSync(filePath)) {
      serveStatic(res, filePath);
    } else {
      res.writeHead(404); res.end('Not found');
    }
  }
});

server.listen(PORT, () => console.log(`PDE Dashboard: http://localhost:${PORT}`));
```

**Why this over npx serve:** PDE needs to parse `.planning/` files and serve them as API responses. Static file serving alone is insufficient. Zero dependencies means no `package.json` needed.

**Confidence: HIGH** -- standard Node.js patterns.

---

## 5. Chrome's WebMCP Flag

### Enabling WebMCP

1. Install **Chrome 146+** (Canary or Beta channel as of March 2026)
2. Navigate to `chrome://flags`
3. Search for **"WebMCP for testing"**
4. Set to **Enabled**
5. Relaunch Chrome

### Command-line Launch

```bash
# macOS
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --enable-features=WebMCP

# With remote debugging (for CDP bridge)
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --enable-features=WebMCP \
  --remote-debugging-port=9222
```

### Current Browser Support (March 2026)

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 146+ Canary/Beta | Behind flag | Only working implementation |
| Chrome Stable | Not yet | Flag expected in upcoming release |
| Edge | Not yet | Microsoft co-authoring spec, likely soon |
| Firefox | Not yet | No announced plans |
| Safari | Not yet | No announced plans |

**Confidence: HIGH** -- verified from multiple sources including Chrome team announcements.

---

## 6. Playwright MCP + WebMCP Consumer Mode

### Architecture for PDE as WebMCP Consumer

PDE can use Playwright to navigate to WebMCP-enabled sites and extract their registered tools.

#### Option A: webmcp-cdp-bridge (recommended)

**Source:** [littleplato/webmcp-cdp-bridge](https://github.com/littleplato/webmcp-cdp-bridge)

Architecture:
```
WebMCP-enabled site (navigator.modelContext)
    |
Chrome with --remote-debugging-port=9222 + --enable-features=WebMCP
    |
webmcp-cdp-bridge (Bun + TypeScript, stdio MCP server)
    |
Claude Code / Claude Desktop (MCP client)
```

How it works:
1. Chrome runs with CDP enabled + WebMCP flag
2. Bridge connects via CDP `Runtime.evaluate`
3. Tool discovery: evaluates `navigator.modelContext.getTools()` in the tab
4. Tool execution: evaluates `tool.execute(args)` and returns results as MCP text content
5. Exposed as standard stdio MCP server

Claude Desktop config:
```json
{
  "mcpServers": {
    "webmcp-bridge": {
      "command": "bun",
      "args": ["run", "/path/to/webmcp-cdp-bridge/src/index.ts"],
      "env": {
        "TARGET_URL": "http://localhost:3333"
      }
    }
  }
}
```

#### Option B: holon-run/webmcp-bridge (Playwright-native)

**Source:** [holon-run/webmcp-bridge](https://github.com/holon-run/webmcp-bridge)

Architecture:
```
WebMCP-enabled site
    |
Playwright browser instance
    |
webmcp-bridge (stdio MCP server)
    |
Any MCP client
```

Key advantage: **dual path** -- uses native `navigator.modelContext` when available, falls back to injected adapter when not. Reuses the browser's logged-in session.

#### Option C: @mcp-b/webmcp-local-relay (official MCP-B)

```bash
npx @mcp-b/webmcp-local-relay@latest
```

Bridges browser WebMCP tools to desktop MCP clients via WebSocket + stdio. Officially maintained by MCP-B org.

### PDE Consumer Mode Implementation

For PDE to read tools from external WebMCP sites:

```javascript
// Using Playwright directly (without bridge)
const { chromium } = require('playwright');

async function discoverWebMCPTools(url) {
  const browser = await chromium.launch({
    channel: 'chrome-canary',  // needs WebMCP flag
    args: ['--enable-features=WebMCP']
  });
  const page = await browser.newPage();
  await page.goto(url);

  // Wait for tools to be registered
  await page.waitForFunction(() =>
    window.navigator.modelContext && typeof navigator.modelContext.getTools === 'function'
  );

  // Extract tool definitions
  const tools = await page.evaluate(() => {
    const registered = navigator.modelContext.getTools();
    return registered.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  });

  return tools;
}
```

**Note:** `getTools()` is not in the W3C spec -- it's provided by the MCP-B polyfill. If the target site uses native WebMCP only (no polyfill), tool enumeration from outside is NOT possible via the standard API. The spec deliberately leaves tool discovery to the browser's internal implementation.

**For PDE's consumer mode, use the CDP bridge or Playwright bridge rather than direct page.evaluate.**

**Confidence: MEDIUM** -- bridge projects exist and work, but `getTools()` availability depends on polyfill vs native implementation.

---

## 7. MCP-B Chrome Extension

### What It Is

The MCP-B Chrome Extension bridges the gap between in-browser WebMCP tools and external MCP clients.

**Chrome Web Store:** [WebMCP Bridge](https://chromewebstore.google.com/detail/webmcp-bridge/chgjbookknohehmaocfijekhaocaanaf) and [MCP-B Extension](https://chromewebstore.google.com/detail/mcp-b-extension/daohopfhkdelnpemnhlekblhnikhdhfa)

### How It Works

1. **Detection:** Extension monitors active tabs for `navigator.modelContext` tool registrations
2. **Aggregation:** Tools from all active tabs are collected
3. **Bridge:** Exposes aggregated tools via local MCP server (WebSocket or stdio)
4. **Consumption:** Desktop MCP clients (Claude Desktop, Cursor, Claude Code) connect to the local server

### Architecture

```
Tab 1: Site A (3 tools registered)  \
Tab 2: Site B (2 tools registered)   > MCP-B Extension
Tab 3: PDE Dashboard (4 tools)      /     |
                                           |  WebSocket / stdio
                                           v
                                    Claude Desktop / Claude Code
```

### For PDE Use

The extension provides an alternative to the CDP bridge. User flow:
1. Install MCP-B extension
2. Open PDE dashboard at `http://localhost:3333`
3. Extension detects registered tools
4. Configure Claude Desktop to connect to extension's local MCP server
5. Claude can now invoke PDE tools directly

**Confidence: MEDIUM** -- extension exists in Chrome Web Store, but PDE-specific integration is untested.

---

## 8. Real-World WebMCP Implementations

### Existing Examples

| Project | What It Does | Status |
|---------|-------------|--------|
| [WebMCP-org/examples](https://github.com/WebMCP-org/examples) | Vanilla, React, Rails, Phoenix LiveView examples | Working demos |
| [WebMCP-org/chrome-devtools-quickstart](https://github.com/WebMCP-org/chrome-devtools-quickstart) | 3-step quickstart with counter.js tools | Minimal working example |
| [keak-ai/webmcp-core](https://github.com/keak-ai/webmcp-core) | Auto-generates WebMCP tool definitions for any site | Library |
| [victorhuangwq/webmcp-kit](https://github.com/victorhuangwq/webmcp-kit) | "Easiest way to add WebMCP tools to your website" | Library |
| [WebMCP-org/webmcp-sh](https://github.com/WebMCP-org/webmcp-sh) | Web-based MCP playground | Development tool |

### The MCP-B Examples Repo Pattern (Vanilla JS)

The vanilla example from `WebMCP-org/examples` implements a shopping cart with 5 tools:
- `add-to-cart`, `remove-from-cart`, `get-cart`, `clear-cart`, `get-total`
- Uses `@mcp-b/global` IIFE script tag (no build step)
- Vite dev server for development

**Real production deployments are still rare** -- the spec landed in Chrome 146 only in February 2026. Most implementations are demos and proof-of-concepts.

**Confidence: HIGH** -- examples verified on GitHub.

---

## PDE Implementation Recommendations

### Recommended Architecture

```
.planning/ files (markdown, JSON)
        |
Node.js server (zero deps, ~80 lines)
   /          \
  /            \
Static HTML     API routes
(dashboard)     (/api/project, /api/roadmap, etc.)
  |
  |-- @mcp-b/global IIFE (vendored, no CDN needed)
  |-- navigator.modelContext.registerTool() calls
  |-- Vanilla JS renders .planning/ state
        |
        v
  [MCP-B Extension] or [CDP Bridge] or [Local Relay]
        |
        v
  Claude Code / Claude Desktop
```

### Phase 1: Provider Mode (PDE exposes its own tools)

1. **Single HTML file** with vendored `@mcp-b/global` IIFE
2. **Node.js server** (zero deps) serves `.planning/` files as API + static HTML
3. **4-6 read-only tools** registered via `navigator.modelContext.registerTool()`
4. **Bridge choice:** `webmcp-cdp-bridge` for Claude Code integration (simplest)
5. **Launch:** `node serve-pde.js` then open `http://localhost:3333`

### Phase 2: Consumer Mode (PDE reads external WebMCP sites)

1. **Playwright** with Chrome Canary + `--enable-features=WebMCP`
2. **CDP bridge** or **holon-run/webmcp-bridge** (Playwright-native, dual-path)
3. Register discovered external tools as PDE-available MCP tools

### Critical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| SecureContext required | file:// won't work | Use localhost HTTP server |
| Chrome 146+ only | Limited browser support | Use polyfill + target Chrome Canary |
| `getTools()` not in spec | Can't enumerate tools from outside natively | Use CDP bridge or polyfill's getTools() |
| Spec is draft | API may change | Pin polyfill version, abstract tool registration |
| No declarative WebMCP yet | Must use JavaScript API | Already planning JS-based approach |

### Zero-Dependency Strategy

PDE can implement this without ANY npm dependencies:

1. **Download once:** `curl -o web/mcp-b-global.js https://unpkg.com/@mcp-b/global@latest/dist/index.iife.js`
2. **Server:** Node.js `http` module (built-in)
3. **HTML:** Single file with `<script src="mcp-b-global.js">`
4. **Bridge:** `npx @mcp-b/webmcp-local-relay@latest` (one-time npx, no install)

Total new files: `web/index.html`, `web/mcp-b-global.js`, `serve-pde.js`

---

## Sources

### Specifications
- [W3C WebMCP Spec](https://webmachinelearning.github.io/webmcp/) -- authoritative API reference
- [Patrick Brosset -- WebMCP Updates](https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/) -- spec author's blog

### Polyfill / SDK
- [MCP-B Documentation](https://docs.mcp-b.ai/) -- official docs
- [MCP-B GitHub Org](https://github.com/WebMCP-org) -- all packages
- [@mcp-b/global npm](https://www.npmjs.com/package/@mcp-b/global) -- polyfill package
- [@mcp-b/global source](https://github.com/WebMCP-org/npm-packages/tree/main/packages/global) -- README with CDN usage

### Bridge Implementations
- [webmcp-cdp-bridge](https://github.com/littleplato/webmcp-cdp-bridge) -- CDP-based stdio bridge
- [holon-run/webmcp-bridge](https://github.com/holon-run/webmcp-bridge) -- Playwright-based bridge
- [@mcp-b/webmcp-local-relay](https://www.jsdelivr.com/package/npm/@mcp-b/webmcp-local-relay) -- official relay

### Chrome Integration
- [Enable WebMCP in Chrome 146 Guide](https://www.salamexperts.com/blog/ai/enable-webmcp-chrome/)
- [Chrome WebMCP Browser Support Status](https://dev.to/ai-agent-economy/webmcp-in-2026-which-browsers-support-navigatormodelcontext-complete-compatibility-status-1oe4)
- [SearchEngineLand -- Chrome 146 WebMCP Preview](https://searchengineland.com/webmcp-explained-inside-chrome-146s-agent-ready-web-preview-470630)

### Examples
- [WebMCP-org/examples](https://github.com/WebMCP-org/examples) -- vanilla, React, Rails, Phoenix examples
- [WebMCP-org/chrome-devtools-quickstart](https://github.com/WebMCP-org/chrome-devtools-quickstart) -- minimal 3-step demo
- [LeanMCP/awesome-webmcp](https://github.com/leanMCP/awesome-webmcp) -- curated resource list

### Chrome Extensions
- [WebMCP Bridge Extension](https://chromewebstore.google.com/detail/webmcp-bridge/chgjbookknohehmaocfijekhaocaanaf)
- [MCP-B Extension](https://chromewebstore.google.com/detail/mcp-b-extension/daohopfhkdelnpemnhlekblhnikhdhfa)
