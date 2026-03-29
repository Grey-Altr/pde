# Phase 158: MCP Apps Rich UI + Design Artifact Preview - Research

**Researched:** 2026-03-28
**Domain:** MCP Apps extension protocol, resource registration, CSP configuration, dual-mode tool responses
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from STATE.md Accumulated Decisions)

### Locked Decisions
- Phase 158: All tool handlers emit both type: 'resource' rich blocks AND type: 'text' fallbacks — preserves stdio backward compatibility
- Phase 156: Use stateless per-request transport (sessionIdGenerator: undefined) for Vercel compatibility — NOT module-level session state
- Phase 156: server-factory.ts is pure (registers tools only, no transport) - HTTP route handler owns transport lifecycle

### Claude's Discretion
- Choice of `ui://` URI path structure (arbitrary per spec)
- Which design artifact types get resource handlers first (start with handoff specs)
- Whether to inline HTML or self-fetch from a Next.js page route

### Deferred Ideas (OUT OF SCOPE)
- Token playground (RUI-04, RUI-05) — Phase 159
- Workflow integration with --webmcp flags — Phase 160
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUI-01 | Tool handlers return type: 'resource' blocks with text/html;profile=mcp-app MIME plus text fallback | registerAppTool + registerAppResource pattern from vercel mcp-apps-nextjs-starter, confirmed with official MCP Apps docs |
| RUI-02 | MCP App HTML resources declare required origins in _meta.ui.csp.connectDomains | CSP pattern verified via official ext-apps spec + sunpeak.ai docs |
| RUI-03 | Design artifacts accessible via ui://pde/[artifact] resource scheme in AI chat clients | server.registerResource with ui:// URI scheme, verified via typescript-sdk docs |
</phase_requirements>

---

## Summary

MCP Apps (SEP-1865) is the official extension to MCP for interactive HTML UIs. It stabilized as a spec on 2026-01-26 and is supported today by Claude (web + desktop), VS Code Copilot, Goose, Postman, and MCPJam. The pattern is: a tool declares `_meta.ui.resourceUri` pointing to a `ui://` resource URI; a resource handler serves bundled HTML with MIME type `text/html;profile=mcp-app`; the host renders that HTML in a sandboxed iframe.

The canonical Next.js integration (`vercel-labs/mcp-apps-nextjs-starter`) uses `mcp-handler` alongside `@modelcontextprotocol/ext-apps/server` and confirms that `createMcpHandler`'s server callback accepts `registerAppResource` and `registerAppTool` from `@modelcontextprotocol/ext-apps/server`. Both functions take the same `McpServer` instance that `mcp-handler` manages. This is the integration path for Phase 158.

For RUI-03, design artifacts are served by registering resources at `ui://pde/[artifact-name]` URIs via `server.registerResource()` (the underlying MCP SDK method). The resource handler reads the artifact file from disk and returns it as `text/html;profile=mcp-app`. For file-based artifacts (Markdown, JSON design tokens), a lightweight HTML wrapper renders the artifact content. For the path `ui://pde/[artifact]`, the artifact name maps to a file in `.planning/design/handoff/`.

**Primary recommendation:** Install `@modelcontextprotocol/ext-apps@^1.3.2`. Add `registerAppResource` + `registerAppTool` calls inside the `server-factory.ts` `registerPdeTools` function, which already receives an `McpServer` instance. Update `next.config.ts` to allow iframe embedding by removing the `X-Frame-Options: SAMEORIGIN` default (use `frame-ancestors *` CSP instead). Declare `connectDomains: [baseURL]` in `_meta.ui.csp`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/ext-apps` | `^1.3.2` (latest: 1.3.2, published 2026-03-27) | `registerAppTool`, `registerAppResource`, `RESOURCE_MIME_TYPE` constant | Official MCP Apps SDK from modelcontextprotocol org |
| `mcp-handler` | `^1.1.0` (already installed) | createMcpHandler + McpServer callback — already in use | Already installed in Phase 156 |
| `@modelcontextprotocol/sdk` | `1.26.0` (pinned in node_modules) | McpServer base class, ResourceTemplate | Already installed transitively |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | Already installed | Input schema for tool validation | All tool handlers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@modelcontextprotocol/ext-apps/server` | `@mcp-ui/server` (MCP-UI-Org) | MCP-UI is a community package; ext-apps is official Anthropic/OpenAI |
| `registerAppTool` | `server.tool` with manual `_meta` | registerAppTool normalizes legacy `_meta["ui/resourceUri"]` key for older host compatibility |
| Self-fetch HTML (Next.js page → MCP resource) | Inline HTML string in resource handler | Self-fetch enables rich React UI; inline HTML is simpler for file-based artifacts |

**Installation:**

```bash
npm install @modelcontextprotocol/ext-apps@^1.3.2
```

**Version verification (confirmed):**
- `@modelcontextprotocol/ext-apps`: `1.3.2` (published 2026-03-27) — CURRENT
- `@modelcontextprotocol/sdk`: `1.26.0` installed, `1.28.0` latest; no upgrade needed for this phase
- `mcp-handler`: `1.1.0` — already installed

---

## Architecture Patterns

### Recommended Project Structure

```
dashboard/
├── lib/mcp/
│   ├── server-factory.ts          # Add registerAppResource + registerAppTool calls here
│   ├── tools/
│   │   ├── index.ts
│   │   └── pipeline-tools.ts      # Existing tools (keep as-is, add dual-mode)
│   └── apps/
│       ├── index.ts               # NEW: register all MCP App resources
│       ├── artifact-preview.ts    # NEW: ui://pde/[artifact] resource handler
│       └── html/
│           └── artifact-viewer.html  # NEW: static HTML template for artifact display
```

### Pattern 1: Two-Part Tool + Resource Registration (RUI-01)

**What:** Every tool that supports rich UI registers (1) a tool with `_meta.ui.resourceUri` and (2) a resource handler that serves the HTML.
**When to use:** Any tool that should render a visual panel in Claude/VS Code instead of raw text.
**Source:** Official build guide + `vercel-labs/mcp-apps-nextjs-starter`

```typescript
// Source: https://modelcontextprotocol.io/extensions/apps/build
// Source: https://raw.githubusercontent.com/vercel-labs/mcp-apps-nextjs-starter/main/app/mcp/route.ts
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const RESOURCE_URI = 'ui://pde/pipeline-status';

export function registerRichPdeTools(server: McpServer): void {
  // Step 1: Register the resource that serves the HTML
  registerAppResource(
    server,
    'pipeline-status-view',   // human-readable name
    RESOURCE_URI,             // must match tool's _meta.ui.resourceUri
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const html = buildStatusHtml(); // or fs.readFile(...)
      return {
        contents: [
          {
            uri: RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  connectDomains: [process.env.NEXT_PUBLIC_APP_URL ?? ''],
                  resourceDomains: [process.env.NEXT_PUBLIC_APP_URL ?? ''],
                },
              },
            },
          },
        ],
      };
    },
  );

  // Step 2: Register the tool that links to the resource
  registerAppTool(
    server,
    'get_pipeline_status',
    {
      title: 'Pipeline Status',
      description: 'Returns pipeline status. Displays a rich panel in MCP Apps-capable clients.',
      inputSchema: {},
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async () => ({
      // RUI-01 requirement: BOTH content types always returned
      content: [
        { type: 'text' as const, text: '...plain text fallback for stdio clients...' },
      ],
      // Structured data for the UI iframe (optional, passed via ontoolresult)
      structuredContent: { status: 'running', stage: 'wireframe' },
    }),
  );
}
```

### Pattern 2: Design Artifact Resource URI (RUI-03)

**What:** Static design artifacts served at `ui://pde/[filename]` so AI chat clients can render them directly.
**When to use:** Any file in `.planning/design/handoff/` that should be previewable without downloading.

```typescript
// Source: verified via typescript-sdk docs + ext-apps spec
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Register a resource template that handles ui://pde/{artifact}
server.registerResource(
  'design-artifact',
  new ResourceTemplate('ui://pde/{artifact}', {
    list: async () => {
      // Returns known artifacts for resource discovery
      const dir = path.join(process.cwd(), '.planning', 'design', 'handoff');
      try {
        const files = await fs.readdir(dir);
        return {
          resources: files.map((f) => ({
            uri: `ui://pde/${encodeURIComponent(f)}`,
            name: f,
            mimeType: RESOURCE_MIME_TYPE,
          })),
        };
      } catch {
        return { resources: [] };
      }
    },
  }),
  {
    title: 'PDE Design Artifact',
    description: 'Renders a design artifact from .planning/design/handoff/ as an HTML preview',
    mimeType: RESOURCE_MIME_TYPE,
  },
  async (uri, { artifact }) => {
    const artifactName = decodeURIComponent(String(artifact));
    const filePath = path.join(process.cwd(), '.planning', 'design', 'handoff', artifactName);
    const raw = await fs.readFile(filePath, 'utf-8');
    const html = wrapArtifactHtml(artifactName, raw); // wrap Markdown/JSON in viewer HTML
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: {
                connectDomains: [process.env.NEXT_PUBLIC_APP_URL ?? ''],
              },
            },
          },
        },
      ],
    };
  },
);
```

### Pattern 3: Dual-Mode Response — Rich + Plain Text Fallback (RUI-01)

**What:** Every tool handler returns BOTH a `content` array (for stdio clients) AND `structuredContent` (for MCP Apps UI iframe via `ontoolresult`).
**When to use:** All tool handlers for this phase. The plain text content is ignored by MCP Apps hosts (they show the iframe instead), and the resource URI is ignored by stdio clients.

```typescript
// The content[] array = what stdio MCP clients see
// The _meta.ui.resourceUri = what MCP Apps hosts use to decide which iframe to render
// structuredContent = data passed to the iframe via app.ontoolresult
async (args) => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify({ status: 'ok', data: computedData }),
    },
  ],
  structuredContent: computedData, // typed data for the iframe
})
```

### Pattern 4: Inline HTML for Simple Artifact Viewers

For design artifacts (Markdown files, design tokens JSON), generate a self-contained HTML viewer:

```typescript
// Source: Official build guide pattern — inline HTML for simple views
function wrapArtifactHtml(name: string, content: string): string {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1rem; margin: 0; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <h2>${name}</h2>
  <pre>${escaped}</pre>
</body>
</html>`;
}
```

### Pattern 5: Next.js Headers for Iframe Embedding

The dashboard's Next.js app must allow MCP host clients (Claude web, VS Code) to embed its pages in iframes. Add to `next.config.ts`:

```typescript
// In next.config.ts async headers()
{
  source: '/(.*)',
  headers: [
    // Override default SAMEORIGIN to allow MCP host iframe embedding
    { key: 'X-Frame-Options', value: 'ALLOWALL' },
    // Modern replacement — frame-ancestors * permits any host to embed
    { key: 'Content-Security-Policy', value: "frame-ancestors *" },
  ],
}
```

Note: Only apply this to routes that serve MCP App HTML — not to the entire app. Scope with `source: '/api/mcp/(.*)'` or a dedicated viewer route.

### Anti-Patterns to Avoid

- **Returning only `type: 'resource'` in `content[]`**: The content block can contain `{ type: 'resource' }` referencing the UI resource, but since the spec says the UI is triggered via `_meta.ui.resourceUri` in the tool declaration, not the content block — do NOT confuse this. RUI-01 says "text fallback": the `content[]` array must contain a `type: 'text'` item.
- **Using `text/html` without `profile=mcp-app`**: Plain `text/html` MIME type will NOT trigger iframe rendering. Hosts require exactly `text/html;profile=mcp-app`.
- **Sharing a single McpServer instance across requests**: SDK 1.26.0+ enforces per-request fresh instances. mcp-handler already handles this, but any global `server` variable will throw.
- **Declaring `_meta.ui.resourceUri` in `server.tool()`**: The base `server.tool()` doesn't normalize legacy metadata keys. Use `registerAppTool()` from `@modelcontextprotocol/ext-apps/server` for cross-host compatibility.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MIME type constant | `const MIME = 'text/html;profile=mcp-app'` string literal | `RESOURCE_MIME_TYPE` from `@modelcontextprotocol/ext-apps/server` | Typos silently break host detection |
| Tool + resource linking | Manual `_meta` object construction | `registerAppTool` from ext-apps | Normalizes legacy `_meta["ui/resourceUri"]` key for older hosts |
| Resource registration with MCP Apps metadata | `server.registerResource()` with raw mimeType | `registerAppResource` from ext-apps | Defaults MIME type, cleaner callback API |
| iframe postMessage bridge | Custom postMessage protocol | `App` class from `@modelcontextprotocol/ext-apps` | The UI-to-host JSON-RPC dialect is complex; App class handles all protocol states |
| CSP enforcement | Manually crafting Content-Security-Policy header strings | `_meta.ui.csp.connectDomains[]` declarative config | Host reads CSP metadata from `_meta`, applies its own enforcement; server doesn't set CSP headers directly |

**Key insight:** The entire MCP Apps protocol (iframe postMessage, ui/initialize handshake, tool call proxying) is complex and spec-defined. The `@modelcontextprotocol/ext-apps` package handles it. Don't replicate the wire format.

---

## Common Pitfalls

### Pitfall 1: Wrong MIME Type — Most Common Failure

**What goes wrong:** Resource is registered and served correctly, but the host shows raw text or nothing. Zero error messages in logs.
**Why it happens:** Using `text/html` instead of `text/html;profile=mcp-app`. Or a trailing space. Or wrong case.
**How to avoid:** Always use the `RESOURCE_MIME_TYPE` constant. Never hard-code the string.
**Warning signs:** Tool returns successfully, no console errors, but no iframe renders.

### Pitfall 2: CSP Blocks Fetch Calls — Silent Network Failures

**What goes wrong:** The iframe renders but clicking buttons or loading data silently fails.
**Why it happens:** The iframe sandbox's default CSP is `connect-src 'none'`. Fetch calls from the iframe to `NEXT_PUBLIC_APP_URL` are blocked unless that origin is in `connectDomains`.
**How to avoid:** Add the app's base URL to `_meta.ui.csp.connectDomains` in the resource's contents `_meta` object (not the `registerAppResource` config object — they are separate).
**Warning signs:** DevTools shows CSP violations like `Refused to connect to 'https://...' because it violates the following Content Security Policy directive: "connect-src 'none'"`.

### Pitfall 3: X-Frame-Options Blocks Host from Embedding Page

**What goes wrong:** When using the self-fetch pattern (fetching a Next.js page as HTML for the resource), the page cannot be embedded by the MCP host.
**Why it happens:** Next.js sets `X-Frame-Options: SAMEORIGIN` by default via its security headers.
**How to avoid:** For routes that serve MCP App HTML, override the header in `next.config.ts` with `frame-ancestors *`.
**Warning signs:** `Refused to display '...' in a frame because it set 'X-Frame-Options' to 'sameorigin'`.

### Pitfall 4: resourceUri in Tool NOT Matching Resource URI

**What goes wrong:** Tool is called, but host cannot find the resource to render.
**Why it happens:** The URI string in `_meta.ui.resourceUri` (in the tool) doesn't exactly match the URI registered in `registerAppResource`. One character difference = no UI.
**How to avoid:** Define URI as a module-level `const RESOURCE_URI = 'ui://...'` and share it between both calls.
**Warning signs:** Tool result returns successfully but no iframe appears.

### Pitfall 5: resource _meta Lives in contents[], Not Config

**What goes wrong:** CSP settings declared in `registerAppResource`'s `config` parameter have no effect.
**Why it happens:** The CSP `_meta.ui` must be in the `contents[0]._meta` of the resource handler's return value, not in the `config` object passed to `registerAppResource`.
**How to avoid:** Place `_meta.ui.csp` inside the `contents` array items returned by the read callback.
**Warning signs:** No CSP errors (config is silently ignored), but fetch calls from iframe still fail.

### Pitfall 6: Stateless Per-Request — registerResource Must Be Idempotent

**What goes wrong:** Under Vercel's per-request model (sessionIdGenerator: undefined), each request creates a fresh McpServer. If `registerAppResource` or `registerAppTool` are async and have side effects, they re-run on every request.
**Why it happens:** mcp-handler creates a new server instance per request. All registrations happen synchronously in the callback before connect().
**How to avoid:** Keep all registration code synchronous/pure (no DB calls, no file I/O during registration). Resource _read handlers_ can be async — registration itself must be fast.
**Warning signs:** Slow response times (hundreds of ms) on simple `tools/list` calls.

### Pitfall 7: Silent Failure of MCP Apps Bridge

**What goes wrong:** The UI loads in the iframe but postMessage events (tool results, context updates) never arrive.
**Why it happens:** The host only activates the MCP Apps bridge when the loaded resource has exactly `text/html;profile=mcp-app` MIME type. If MIME type is wrong or the resource 404s, the bridge is never established.
**How to avoid:** Always verify the resource is reachable (resources/read returns 200 with correct mimeType) before testing the UI interaction.
**Warning signs:** `app.connect()` resolves immediately but `app.ontoolresult` never fires.

---

## Code Examples

### Complete server-factory.ts Integration (Verified Pattern)

```typescript
// Source: https://raw.githubusercontent.com/vercel-labs/mcp-apps-nextjs-starter/main/app/mcp/route.ts
// Adapted for PDE server-factory.ts pattern

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const ARTIFACT_RESOURCE_URI = 'ui://pde/artifact-viewer';

export function registerPdeRichTools(server: McpServer): void {
  // Resource first (must be registered before tool per convention)
  registerAppResource(
    server,
    'pde-artifact-viewer',
    ARTIFACT_RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: ARTIFACT_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildArtifactViewerHtml(),
          _meta: {
            ui: {
              csp: {
                connectDomains: [BASE_URL],
                resourceDomains: [BASE_URL],
              },
            },
          },
        },
      ],
    }),
  );

  // Tool with UI linkage + text fallback (satisfies RUI-01)
  registerAppTool(
    server,
    'preview_artifact',
    {
      title: 'Preview Design Artifact',
      description: 'Opens a design artifact preview panel. Shows rendered HTML in MCP Apps clients, text path in stdio clients.',
      inputSchema: {
        name: z.string().describe('Artifact filename from .planning/design/handoff/'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
      _meta: { ui: { resourceUri: ARTIFACT_RESOURCE_URI } },
    },
    async ({ name }) => {
      // RUI-01: text fallback always included
      const artifactPath = `.planning/design/handoff/${name}`;
      return {
        content: [
          {
            type: 'text' as const,
            text: `Design artifact: ${artifactPath}. Use an MCP Apps-capable client to view the rendered preview.`,
          },
        ],
        structuredContent: { artifactName: name, artifactPath },
      };
    },
  );
}
```

### registerAppResource With connectDomains (RUI-02)

```typescript
// Source: Official spec + vercel-labs/mcp-apps-nextjs-starter
// _meta.ui.csp MUST be in contents[].meta, NOT in the config parameter
registerAppResource(server, 'name', uri, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
  contents: [{
    uri,
    mimeType: RESOURCE_MIME_TYPE,
    text: html,
    _meta: {
      ui: {
        csp: {
          connectDomains: ['https://your-pde-domain.vercel.app'], // RUI-02
          resourceDomains: ['https://your-pde-domain.vercel.app'],
          // frameDomains: [] — only needed for nested iframes
        },
      },
    },
  }],
}));
```

### ResourceTemplate for Dynamic ui:// URIs (RUI-03)

```typescript
// Source: typescript-sdk docs — ResourceTemplate for parameterized URIs
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

server.registerResource(
  'pde-design-artifact',
  new ResourceTemplate('ui://pde/{artifact}', {
    list: async () => ({ resources: await listArtifacts() }),
  }),
  { title: 'PDE Design Artifact', mimeType: RESOURCE_MIME_TYPE },
  async (uri, { artifact }) => {
    const html = await readArtifactAsHtml(String(artifact));
    return {
      contents: [{
        uri: uri.href,
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        _meta: { ui: { csp: { connectDomains: [BASE_URL] } } },
      }],
    };
  },
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Text-only tool responses | MCP Apps with `_meta.ui.resourceUri` + `text/html;profile=mcp-app` | 2026-01-26 (stable spec) | Enables iframe rendering in Claude, VS Code, Goose |
| `@mcp-ui/server` (community) | `@modelcontextprotocol/ext-apps/server` (official) | Jan 2026 | Prefer official; community may drift |
| `server.tool()` manual `_meta` | `registerAppTool()` from ext-apps | Jan 2026 | Normalizes legacy `_meta["ui/resourceUri"]` key |
| Standalone resource endpoints | `ui://` URI scheme via `registerAppResource` | Jan 2026 | Resources served by MCP protocol, not HTTP |
| Text listing of artifacts | ui:// resource URIs for direct rendering | Jan 2026 | AI clients can render artifacts without file download |

**Deprecated/outdated:**
- `text/html+mcp` MIME type: Early pre-spec drafts used this; current stable spec uses `text/html;profile=mcp-app`
- `mcp-ui` package (`@mcp-ui/server`, `@mcp-ui/client`): Community predecessor; superseded by official `@modelcontextprotocol/ext-apps`

---

## Open Questions

1. **Does mcp-handler's server callback expose the full McpServer API including registerResource?**
   - What we know: The vercel-labs/mcp-apps-nextjs-starter uses `registerAppResource` (which wraps `server.registerResource`) inside `createMcpHandler`'s callback — confirmed working.
   - What's unclear: Exact TypeScript type exposed by mcp-handler's callback (may need to cast as `McpServer`).
   - Recommendation: In `server-factory.ts`, the parameter type is already `McpServer`. `registerAppTool` and `registerAppResource` accept `Pick<McpServer, 'registerTool'>` and `Pick<McpServer, 'registerResource'>` respectively — they will work with the existing parameter type.

2. **What is the base URL in production vs. local?**
   - What we know: `process.env.NEXT_PUBLIC_APP_URL` is the pattern from mcp-apps-nextjs-starter.
   - What's unclear: Whether PDE has this env var defined or uses a different convention.
   - Recommendation: Check existing env config. Fall back to `process.env.VERCEL_URL` (set automatically by Vercel) with `https://` prefix.

3. **Are handoff directory artifacts always HTML-renderable?**
   - What we know: `.planning/design/handoff/` currently empty (no files). The artifact list tool returns filenames.
   - What's unclear: Actual file formats when populated (Markdown, HTML, JSON, SVG?).
   - Recommendation: Build a generic `wrapArtifactHtml()` helper that detects format and wraps appropriately. Prioritize Markdown and HTML for initial implementation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@modelcontextprotocol/ext-apps` | RUI-01, RUI-02, RUI-03 | Not yet installed | — (1.3.2 on npm) | None — required |
| `@modelcontextprotocol/sdk` | McpServer types | Yes (transitive) | 1.26.0 | — |
| `mcp-handler` | Route handler | Yes | 1.1.0 | — |
| MCP Apps-capable client (Claude web) | Testing RUI-01/02/03 | Yes (external) | — | MCPJam basic-host for dev testing |

**Missing dependencies with no fallback:**
- `@modelcontextprotocol/ext-apps` — must be installed before implementation

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `dashboard/vitest.config.js` |
| Quick run command | `cd dashboard && npx vitest run __tests__/server-factory.test.ts --reporter=verbose` |
| Full suite command | `cd dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUI-01 | `registerPdeTools` registers tools that return BOTH `content[0].type === 'text'` AND `structuredContent` | unit | `cd dashboard && npx vitest run __tests__/server-factory.test.ts -t "rich tool"` | ❌ Wave 0 |
| RUI-01 | `registerAppTool` called with `_meta.ui.resourceUri` | unit | `cd dashboard && npx vitest run __tests__/server-factory.test.ts -t "_meta"` | ❌ Wave 0 |
| RUI-02 | Resource contents include `_meta.ui.csp.connectDomains` array | unit | `cd dashboard && npx vitest run __tests__/server-factory.test.ts -t "connectDomains"` | ❌ Wave 0 |
| RUI-03 | Resource handler at `ui://pde/{artifact}` returns `text/html;profile=mcp-app` | unit | `cd dashboard && npx vitest run __tests__/mcp-rich-ui.test.ts -t "design artifact"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd dashboard && npx vitest run __tests__/server-factory.test.ts --reporter=verbose`
- **Per wave merge:** `cd dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/__tests__/server-factory.test.ts` — extend existing file with RUI-01 / RUI-02 tests covering `_meta.ui.resourceUri` and `connectDomains` assertions
- [ ] `dashboard/__tests__/mcp-rich-ui.test.ts` — new file for RUI-03 artifact resource handler tests

---

## Sources

### Primary (HIGH confidence)

- `https://modelcontextprotocol.io/extensions/apps/build` — Official MCP Apps build guide, full server.ts + UI patterns
- `https://apps.extensions.modelcontextprotocol.io/api/functions/server-helpers.registerAppResource.html` — Official API docs for registerAppResource
- `https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx` — MCP Apps specification (draft), full UIResourceMeta interface
- `https://raw.githubusercontent.com/vercel-labs/mcp-apps-nextjs-starter/main/app/mcp/route.ts` — Official Vercel + MCP starter, confirmed working integration of mcp-handler + ext-apps
- `https://ts.sdk.modelcontextprotocol.io/documents/server.html` — MCP TypeScript SDK docs, registerResource API

### Secondary (MEDIUM confidence)

- `https://sunpeak.ai/blogs/mcp-app-csp-external-api-calls/` — CSP domain types (connectDomains / resourceDomains / frameDomains) — verified against spec
- `https://sunpeak.ai/docs/mcp-apps/server/register-app-tool` — registerAppTool signature and visibility options
- `https://zenn.dev/naokky/articles/202601-mcpapp-sample?locale=en` — Lessons learned: MIME type gotcha, silent failures, CORS scope

### Tertiary (LOW confidence)

- NPM publish metadata for `@modelcontextprotocol/ext-apps@1.3.2` — version confirmed via `npm view`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official package from modelcontextprotocol org, version confirmed via npm
- Architecture (registerAppTool + registerAppResource): HIGH — verified via official build guide + working starter code
- CSP configuration: HIGH — verified via spec + sunpeak.ai (agrees with spec)
- Dual-mode response pattern: HIGH — confirmed in spec and multiple sources
- ResourceTemplate for ui://pde/{artifact}: MEDIUM — API pattern from SDK docs, no MCP Apps-specific example found (but it's the standard MCP SDK resource pattern)
- mcp-handler + ext-apps interop: HIGH — confirmed via official vercel-labs starter which uses both

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (ext-apps is under active development — version 1.3.2 published just yesterday; re-verify before implementation)
