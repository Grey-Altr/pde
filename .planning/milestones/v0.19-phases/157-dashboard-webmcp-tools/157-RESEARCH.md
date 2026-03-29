# Phase 157: Dashboard WebMCP Tools - Research

**Researched:** 2026-03-28
**Domain:** WebMCP (@mcp-b), React lifecycle, MCP JSON-RPC fetch client, context-sync.cjs emitter extension
**Confidence:** HIGH (core stack verified against npm registry and official docs; key API decisions confirmed against project STATE.md locked decisions)

---

<user_constraints>
## User Constraints (from STATE.md Accumulated Context)

### Locked Decisions
- Phase 157: `useMcpTool()` central hook is the only registration path — `provideContext()` is deprecated since March 5, 2026
- Phase 156: mcp-handler@1.1.0 installed with --legacy-peer-deps to resolve SDK version pin conflict (1.26.0 vs 1.28.0, backward-compatible)
- Phase 156: server-factory.ts is pure (registers tools only, no transport) — HTTP route handler owns transport lifecycle

### Claude's Discretion
- Exact tool schemas for design state, project info, artifact listing
- .webmcp/config.json structure (PDE-specific, not an external standard — design freely)
- MONITORED_FILES entry format for .webmcp/config.json
- How use-mcp-client.ts handles auth tokens (Bearer forwarding pattern)

### Deferred Ideas (OUT OF SCOPE)
- Full OAuth provider (PDE issuing tokens) — validate-only via mcp-auth
- Remote collaboration / cross-session state sharing
- MCP Tasks SEP-1686 (experimental)
- Rich UI resource blocks (Phase 158)
- Token playground (Phase 159)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRW-01 | Dashboard registers WebMCP tools via `useWebMCP()` hooks with `@mcp-b/global` polyfill initialization | `@mcp-b/react-webmcp` v2.2.0 `useWebMCP` hook; `@mcp-b/global` v2.2.0 `initializeWebModelContext()` in providers.tsx |
| BRW-02 | `useMcpTool()` hook enforces strict mount/unmount lifecycle preventing zombie tool registrations | `useWebMCP` automatically registers on mount and unregisters on unmount — no manual cleanup needed |
| BRW-03 | Dashboard provides initial tool registrations for design state, project info, and artifact listing | Three tool definitions in `dashboard/lib/mcp/browser-tools/` client components |
| BRW-04 | `use-mcp-client.ts` provides thin fetch-based MCP JSON-RPC hook (no SDK in browser bundle) | Hand-rolled fetch hook against the MCP Streamable HTTP spec — `use-mcp` npm has `@modelcontextprotocol/sdk` as a dep so is disqualified |
| BRW-05 | 7th context-sync.cjs emitter writes `.webmcp/config.json` for WebMCP client discovery | New `emitWebMcpConfig()` function added to `bin/lib/context-sync.cjs` following existing emitter pattern |
| BRW-06 | `.webmcp/config.json` added to `MONITORED_FILES` for auto-regeneration on `.planning/` changes | Add entry to `MONITORED_FILES` array in `context-sync.cjs` with `parser: 'webmcp'` |
</phase_requirements>

---

## Summary

Phase 157 bridges the PDE dashboard (Next.js App Router) with browser-based AI agents via the WebMCP API (`navigator.modelContext`). The standard stack for this is `@mcp-b/react-webmcp` v2.2.0 + `@mcp-b/global` v2.2.0. The React hook `useWebMCP()` handles tool registration/unregistration automatically via React component lifecycle — no manual cleanup or `useEffect` teardown is required, which is the correct prevention for zombie tool registrations (BRW-02).

The critical constraint on BRW-04 is that `use-mcp` (the Anthropic-maintained npm package) ships `@modelcontextprotocol/sdk` as a hard dependency, which violates the "no SDK in browser bundle" requirement. The correct approach is a hand-rolled `use-mcp-client.ts` hook that issues JSON-RPC 2.0 POST requests directly per the MCP Streamable HTTP spec. The spec requires `Accept: application/json, text/event-stream` and `Content-Type: application/json` headers with a Bearer token. The PDE server (Phase 156) runs in stateless mode (`sessionIdGenerator: undefined`), so the client never needs to track `Mcp-Session-Id`.

The `.webmcp/config.json` discovery file (BRW-05/BRW-06) is a PDE-specific convention — not an external standard. The file should follow the `@mcp-b/webmcp-local-relay` client discovery pattern: a JSON object with a `mcpServer.url` field pointing to the `/api/mcp` endpoint. This integrates as the 7th emitter in `context-sync.cjs`, following the exact same `emitAll()` + `MONITORED_FILES` pattern as the existing 6 emitters.

**Primary recommendation:** Use `@mcp-b/react-webmcp@2.2.0` + `@mcp-b/global@2.2.0` for WebMCP registration. Write `use-mcp-client.ts` as a thin fetch hook (no external deps). Extend `context-sync.cjs` with `emitWebMcpConfig()` following the existing emitter pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mcp-b/react-webmcp` | 2.2.0 | `useWebMCP()` hook for tool registration with automatic lifecycle | Official MCP-B React package; handles register/unregister on mount/unmount |
| `@mcp-b/global` | 2.2.0 | Polyfill for `navigator.modelContext`; creates `BrowserMcpServer` | Required initialization before any `useWebMCP()` call works |
| `zod-to-json-schema` | 3.25.2 (current) | Converts Zod schemas to JSON Schema at registration time | Peer dependency of `@mcp-b/react-webmcp` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | already installed (latest) | Tool input schema definition | Define tool parameter schemas for BRW-03 tools |
| `use-mcp` | 0.0.21 | Browser MCP client hook | **NOT for BRW-04** — ships full `@modelcontextprotocol/sdk`; hand-roll fetch hook instead |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled fetch hook | `use-mcp` npm | `use-mcp` bundles `@modelcontextprotocol/sdk` — violates BRW-04; hand-roll avoids SDK in browser bundle |
| `@mcp-b/react-webmcp` | `usewebmcp` (strict-core package) | `usewebmcp` omits Zod object-map support; react-webmcp is the full-featured option |
| `initializeWebModelContext()` | `provideContext()` | `provideContext()` deprecated March 5, 2026 — locked decision from STATE.md |

**Installation (new packages only):**
```bash
cd dashboard
npm install @mcp-b/react-webmcp@2.2.0 @mcp-b/global@2.2.0 zod-to-json-schema@3.25.2
```

**Version verification (confirmed 2026-03-28):**
- `@mcp-b/react-webmcp`: npm latest = `2.2.0`
- `@mcp-b/global`: npm latest = `2.2.0`
- `zod-to-json-schema`: npm latest = `3.25.2`
- `use-mcp`: npm latest = `0.0.21` (do NOT install for BRW-04)

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 157:

```
dashboard/
├── lib/
│   └── mcp/
│       ├── server-factory.ts         # existing (Phase 156)
│       ├── use-mcp-client.ts         # NEW: thin fetch-based JSON-RPC hook (BRW-04)
│       └── browser-tools/            # NEW: WebMCP client-side tool registrations
│           ├── index.ts              # barrel: exports all browser tool hooks
│           ├── use-design-state-tool.ts   # BRW-03: design state tool
│           ├── use-project-info-tool.ts   # BRW-03: project info tool
│           └── use-artifact-list-tool.ts  # BRW-03: artifact listing tool
├── components/
│   └── providers.tsx                 # MODIFIED: add WebMCP initialization
├── hooks/
│   └── use-webmcp-tools.ts           # OPTIONAL: composite hook registering all 3 tools
bin/lib/
└── context-sync.cjs                  # MODIFIED: add emitWebMcpConfig() + MONITORED_FILES entry
.webmcp/
└── config.json                       # GENERATED: WebMCP client discovery file (BRW-05)
```

### Pattern 1: WebMCP Initialization in providers.tsx (BRW-01)

**What:** Initialize `@mcp-b/global` once at app startup so `navigator.modelContext` is available before any component calls `useWebMCP()`.
**When to use:** Must happen at the top of the React tree, in a `'use client'` component, before any tool-registering component mounts.

```typescript
// dashboard/components/providers.tsx
'use client';

import { useEffect } from 'react';
import { initializeWebModelContext } from '@mcp-b/global';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { HotkeysProvider } from 'react-hotkeys-hook';

// Initialize once — idempotent, safe for SSR (no-op in non-browser environments)
// Must be called before any useWebMCP() hook executes
function WebMcpInitializer() {
  useEffect(() => {
    initializeWebModelContext();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <HotkeysProvider>
        <WebMcpInitializer />
        {children}
      </HotkeysProvider>
    </NuqsAdapter>
  );
}
```

**SSR note:** `initializeWebModelContext()` is a no-op in non-browser environments. Using `useEffect` ensures it only runs client-side, preventing `navigator is not defined` errors during Next.js SSR.

### Pattern 2: Tool Registration with useWebMCP (BRW-01, BRW-02, BRW-03)

**What:** Each tool is a custom hook that calls `useWebMCP()`. Automatic lifecycle — registers on mount, unregisters on unmount. No zombie tools.
**When to use:** Any `'use client'` component that should expose a tool to browser AI agents.

```typescript
// dashboard/lib/mcp/browser-tools/use-project-info-tool.ts
// Source: https://docs.mcp-b.ai/packages/react-webmcp and STATE.md locked decision
'use client';

import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Define schema OUTSIDE component — prevents re-registration on every render
const inputSchema = {};  // no params for project info

export function useProjectInfoTool() {
  useWebMCP({
    name: 'get_project_info',
    description: 'Returns PDE project name, milestone, current phase, and overall status from .planning/PROJECT.md',
    inputSchema,
    handler: async () => {
      const res = await fetch('/api/mcp/project-info');
      const data = await res.json();
      return data;
    },
  });
}
```

**Critical:** Schema objects defined outside the component body prevent `useWebMCP()` from seeing a new object reference on every render, which would cause repeated re-registration.

### Pattern 3: Thin Fetch-Based MCP JSON-RPC Client (BRW-04)

**What:** A custom `use-mcp-client.ts` hook that makes raw MCP Streamable HTTP requests without importing `@modelcontextprotocol/sdk`.
**When to use:** Whenever the dashboard needs to call tools on the PDE MCP server (for BRW-03 tool handlers, or any direct server calls).

The MCP Streamable HTTP spec (official, verified 2026-03-28) requires:
- `POST` to MCP endpoint
- `Accept: application/json, text/event-stream`
- `Content-Type: application/json`
- `Authorization: Bearer <token>` for authenticated endpoints
- Body: JSON-RPC 2.0 object `{ jsonrpc: "2.0", id: <number>, method: <string>, params: <object> }`
- Response is either `application/json` (direct result) or `text/event-stream` (SSE with result event)

Since Phase 156 uses stateless mode (`sessionIdGenerator: undefined`), there is no `Mcp-Session-Id` to track.

```typescript
// dashboard/lib/mcp/use-mcp-client.ts
// Hand-rolled per MCP Streamable HTTP spec — no @modelcontextprotocol/sdk dependency
'use client';

import { useState, useCallback } from 'react';

export type McpCallState = 'idle' | 'calling' | 'done' | 'error';

export interface UseMcpClientOptions {
  endpoint: string;  // e.g. '/api/mcp'
  getToken?: () => Promise<string | null>;  // Clerk token getter
}

export function useMcpClient({ endpoint, getToken }: UseMcpClientOptions) {
  const [state, setState] = useState<McpCallState>('idle');
  const [error, setError] = useState<string | null>(null);

  const callTool = useCallback(async (name: string, args: Record<string, unknown> = {}) => {
    setState('calling');
    setError(null);
    try {
      const token = getToken ? await getToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args },
      });

      const res = await fetch(endpoint, { method: 'POST', headers, body });
      if (!res.ok) throw new Error(`MCP error: ${res.status}`);

      const contentType = res.headers.get('Content-Type') ?? '';
      let result: unknown;
      if (contentType.includes('application/json')) {
        result = await res.json();
      } else {
        // SSE response — read the stream for the result event
        const text = await res.text();
        const dataLine = text.split('\n').find(l => l.startsWith('data: '));
        result = dataLine ? JSON.parse(dataLine.slice(6)) : null;
      }
      setState('done');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setState('error');
      throw err;
    }
  }, [endpoint, getToken]);

  return { callTool, state, error };
}
```

### Pattern 4: 7th Emitter — emitWebMcpConfig (BRW-05, BRW-06)

**What:** New function `emitWebMcpConfig(ir, projectRoot)` added to `context-sync.cjs`, following the exact same pattern as the existing 6 emitters.
**When to use:** Called from `emitAll()` alongside the other emitters; also called individually via `--editor webmcp`.

```javascript
// In bin/lib/context-sync.cjs

// ─── Monitored editor output files (SYN-04, CUR-03) ─────────────────────────
const MONITORED_FILES = [
  // ... existing 7 entries ...
  { path: '.webmcp/config.json', parser: 'webmcp' },  // BRW-06: 8th entry
];

/**
 * Emit .webmcp/config.json for WebMCP client discovery.
 * Config file allows @mcp-b/webmcp-local-relay to find the PDE MCP server
 * without manual configuration.
 *
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Absolute path to project root
 * @returns {{ written: boolean, path: string }}
 */
function emitWebMcpConfig(ir, projectRoot) {
  const webmcpDir = path.join(projectRoot, '.webmcp');
  const configPath = path.join(webmcpDir, 'config.json');

  const config = {
    _generated: ir.generatedAt,
    _sourceHash: ir.sourceHash,
    mcpServer: {
      url: 'http://localhost:3000/api/mcp',
      name: `PDE — ${ir.projectName}`,
      transport: 'streamable-http',
    },
  };

  try {
    fs.mkdirSync(webmcpDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    return { written: true, path: '.webmcp/config.json' };
  } catch (err) {
    return { written: false, path: '.webmcp/config.json', error: err.message };
  }
}

// In emitAll():
function emitAll(cwd) {
  // ... existing emitters ...
  const webMcpConfig = emitWebMcpConfig(ir, projectRoot);
  return {
    // ... existing results ...
    webMcpConfig,
  };
}
```

### Pattern 5: MCP Tool Schema Design (BRW-03)

Three tools are required. Design follows the existing `get_project_state` pattern from `server-factory.ts`.

**Tool: `get_design_state`**
- Reads `.planning/design/DESIGN-STATE.md`
- Returns current design phase, active artifacts, review status
- No params needed

**Tool: `get_project_info`**
- Reads `.planning/PROJECT.md`
- Returns project name, milestone, current phase number, core value statement
- No params needed

**Tool: `list_artifacts`**
- Reads `.planning/design/handoff/` directory
- Returns list of handoff spec filenames with metadata
- Optional `filter` param (string, for filtering by type/name)

These browser tools call back to the MCP server via `useMcpClient` — the tool's `handler` function makes a `fetch` to a Next.js API route that reads the `.planning/` files server-side (not directly from browser, since `.planning/` is server-side).

### Anti-Patterns to Avoid

- **Defining inputSchema inline:** Placing `{ param: z.string() }` inside the hook call body creates a new object reference each render, causing `useWebMCP()` to re-register the tool on every render. Define schema constants above the component/hook.
- **Calling `initializeWebModelContext()` in a Server Component:** `@mcp-b/global` accesses `navigator` — must be in a `'use client'` component, wrapped in `useEffect`.
- **Using `provideContext()`:** Deprecated March 5, 2026. Logs deprecation warning; will be removed in next major version. Use `useWebMCP()` only.
- **Installing `use-mcp` for the client hook:** It bundles `@modelcontextprotocol/sdk` as a hard dep. BRW-04 explicitly requires no SDK in the browser bundle.
- **Registering tools in Server Components:** `useWebMCP()` requires browser context. All tool-registering components need `'use client'` directive.
- **Checking `navigator.modelContext` before `initializeWebModelContext()`:** Without the polyfill, `navigator.modelContext` may be undefined in non-Chrome browsers. Initialize first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool register/unregister lifecycle | Manual `useEffect` with `navigator.modelContext.registerTool` + cleanup | `useWebMCP()` from `@mcp-b/react-webmcp` | Hook handles lifecycle, Zod conversion, error handling, and test shim |
| `navigator.modelContext` polyfill | Custom polyfill | `@mcp-b/global` `initializeWebModelContext()` | Covers browser detection, SSR no-op, idempotent re-initialization |
| MCP JSON-RPC protocol framing | Custom JSON-RPC parser | Thin fetch hook following MCP spec headers exactly | The spec is simple (POST + JSON-RPC 2.0 + Accept header) — build the hook once, never touch it again |
| SSE stream parsing for tool results | Full streaming client | Minimal SSE text parse (split on 'data: ', parse JSON) | PDE's server returns `Content-Type: application/json` for simple tool calls; SSE only needed for streaming results |

**Key insight:** The WebMCP registration lifecycle is the genuinely complex part. `@mcp-b/react-webmcp` encapsulates all of it. The JSON-RPC client is simple enough to hand-roll correctly in ~50 lines.

---

## Common Pitfalls

### Pitfall 1: SSR Crash — `navigator is not defined`

**What goes wrong:** Importing `@mcp-b/global` at module level or calling `initializeWebModelContext()` outside `useEffect` causes a crash during Next.js server-side rendering.
**Why it happens:** Next.js App Router renders `'use client'` components on the server as well (for HTML streaming). `navigator` only exists in browsers.
**How to avoid:** Always call `initializeWebModelContext()` inside `useEffect(() => { ... }, [])` in a `'use client'` component. The function itself is a no-op in non-browser environments, but the `import` can still cause module evaluation issues.
**Warning signs:** `ReferenceError: navigator is not defined` in server logs; blank page on first load.

### Pitfall 2: Zombie Tools from Schema Object Recreation

**What goes wrong:** `useWebMCP()` detects a "changed" tool config because `inputSchema` is a new object reference on every render, causing rapid re-registration.
**Why it happens:** JavaScript object literals `{}` are never reference-equal across renders. `useWebMCP()` compares config to detect changes.
**How to avoid:** Define all schema objects as module-level constants outside the hook/component function body.
**Warning signs:** Browser console shows repeated tool registration events; `navigator.modelContextTesting.listTools()` shows duplicate tools.

### Pitfall 3: Missing Accept Header on MCP POST

**What goes wrong:** `fetch()` calls to `/api/mcp` without `Accept: application/json, text/event-stream` cause the server to return a non-standard response or 406 error.
**Why it happens:** MCP Streamable HTTP spec (verified 2026-03-28) mandates this Accept header. mcp-handler enforces it.
**How to avoid:** Always include both MIME types in the Accept header in `use-mcp-client.ts`.
**Warning signs:** 406 responses; empty response body from `/api/mcp`.

### Pitfall 4: Browser Tool Handler vs. Server Tool Handler Confusion

**What goes wrong:** `useWebMCP()` tool handlers are browser-side functions that cannot directly read `.planning/` files. Developers try to `fs.readFileSync()` from within a handler.
**Why it happens:** The hook runs in the browser context where Node.js `fs` is unavailable.
**How to avoid:** Browser tool handlers (BRW-03) must call Next.js API routes (e.g., `/api/planning/project-info`) which read files server-side, OR call the MCP server at `/api/mcp` via `useMcpClient`.
**Warning signs:** `TypeError: fs.readFileSync is not a function` in browser console.

### Pitfall 5: .webmcp/config.json Not Regenerating on .planning/ Changes

**What goes wrong:** Developer edits `.planning/PROJECT.md` but `.webmcp/config.json` is not updated automatically.
**Why it happens:** BRW-06 requires adding `.webmcp/config.json` to the `MONITORED_FILES` array. Without it, the reverse-sync watcher ignores it.
**How to avoid:** Add `{ path: '.webmcp/config.json', parser: 'webmcp' }` to `MONITORED_FILES`. The parser must be either `null` (no reverse parse) or a new `'webmcp'` parser that does nothing (generated-only file).
**Warning signs:** `.webmcp/config.json` has stale project name/sourceHash after `.planning/` edits.

---

## Code Examples

### Initialize WebMCP in Providers (verified pattern from docs.mcp-b.ai)

```typescript
// Source: https://docs.mcp-b.ai/packages/global/reference
'use client';
import { useEffect } from 'react';
import { initializeWebModelContext } from '@mcp-b/global';

// In a leaf component called from Providers:
useEffect(() => {
  initializeWebModelContext(); // No-op in SSR; idempotent
}, []);
```

### Register a Tool (verified pattern from docs.mcp-b.ai/tutorials/first-react-tool)

```typescript
// Source: https://docs.mcp-b.ai/tutorials/first-react-tool
'use client';
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

// Schema OUTSIDE component — prevents re-registration on re-render
const schema = { filter: z.string().optional().describe('Optional name filter') };

export function useArtifactListTool() {
  useWebMCP({
    name: 'list_artifacts',
    description: 'Lists PDE design artifacts from .planning/design/handoff/',
    inputSchema: schema,
    handler: async ({ filter }) => {
      const res = await fetch(`/api/planning/artifacts${filter ? `?filter=${filter}` : ''}`);
      return await res.json();
    },
  });
}
```

### Verify tool registration in browser console

```javascript
// Source: https://docs.mcp-b.ai/tutorials/first-react-tool (Testing section)
navigator.modelContextTesting.listTools();
// -> [{ name: 'list_artifacts', description: '...', ... }]
await navigator.modelContextTesting.executeTool('list_artifacts', {});
// -> { content: [{ type: 'text', text: '[...]' }] }
```

### MCP Streamable HTTP POST (official spec)

```typescript
// Source: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
const response = await fetch('/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'get_project_state', arguments: {} },
  }),
});
```

### context-sync emitter pattern (verified from source)

```javascript
// Source: bin/lib/context-sync.cjs (existing pattern — emitAgentsMd, emitCursorRules, etc.)
function emitWebMcpConfig(ir, projectRoot) {
  const webmcpDir = path.join(projectRoot, '.webmcp');
  fs.mkdirSync(webmcpDir, { recursive: true });
  const config = { _generated: ir.generatedAt, mcpServer: { url: '...' } };
  fs.writeFileSync(path.join(webmcpDir, 'config.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return { written: true, path: '.webmcp/config.json' };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `provideContext()` for tool registration | `useWebMCP()` hook | March 5, 2026 | `provideContext()` deprecated — logs warning; will be removed next major version |
| Manual `useEffect` + `registerTool()` + cleanup | `useWebMCP()` auto-lifecycle | @mcp-b/react-webmcp v2.x | Zero cleanup code; React lifecycle drives registration |
| HTTP+SSE transport (protocol 2024-11-05) | Streamable HTTP (protocol 2025-03-26) | 2025-03-26 spec | PDE server (Phase 156) already uses Streamable HTTP; client must match |

**Deprecated/outdated:**
- `provideContext()`: Removed from WebMCP upstream spec March 5, 2026. STATE.md confirms this is a locked decision.
- `@mcp-b/webmcp-local-relay` for desktop clients: Phase 156 VERIFICATION.md clarifies this is for browser bridge (Phase 157), not desktop relay (which uses `mcp-remote`).

---

## Open Questions

1. **`.webmcp/config.json` URL for deployed vs. local**
   - What we know: The PDE server runs at `http://localhost:3000/api/mcp` in dev and at the Vercel URL in prod.
   - What's unclear: Should `emitWebMcpConfig()` hardcode localhost or read the Vercel URL from environment?
   - Recommendation: Generate with `localhost:3000` for local dev. Document that Vercel URL needs manual override. A `NEXT_PUBLIC_MCP_URL` env var could be read but that adds complexity — keep simple for now.

2. **Browser tool handlers: direct fetch vs. MCP client**
   - What we know: BRW-03 tools need to return project data. BRW-04 provides `use-mcp-client.ts`. Tool handlers in `useWebMCP()` run in the browser.
   - What's unclear: Whether tool handlers should call `/api/mcp` (via use-mcp-client) for server data, or call a dedicated REST endpoint (e.g., `/api/planning/project-info`).
   - Recommendation: Use dedicated lightweight REST API routes (`/api/planning/*`) for the browser tool handlers. Simpler, no JSON-RPC overhead for simple GET-style reads. Reserve `use-mcp-client.ts` for AI agents calling tools programmatically.

3. **`MONITORED_FILES` reverse-sync parser for `.webmcp/config.json`**
   - What we know: `MONITORED_FILES` entries have a `parser` field that drives reverse-sync (editor → .planning/). Generated files like `.webmcp/config.json` are write-only from PDE.
   - What's unclear: Whether `parser: null` or `parser: 'webmcp'` is the right value for a generated-only file.
   - Recommendation: Use `parser: 'webmcp'` (or omit if parser is optional). The ingestAll code should treat unknown parsers as no-op reverse sync. Check `ingestAll` logic in context-sync.cjs to confirm.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | context-sync.cjs | Yes | Darwin 25.3.0 | — |
| npm | Package installs | Yes | (project has package-lock.json) | — |
| `@mcp-b/react-webmcp` | BRW-01, BRW-02, BRW-03 | Not installed yet | 2.2.0 (registry) | — |
| `@mcp-b/global` | BRW-01 | Not installed yet | 2.2.0 (registry) | — |
| `zod-to-json-schema` | Peer dep of react-webmcp | Not installed yet | 3.25.2 (registry) | — |
| Chrome (for navigator.modelContext) | BRW-01 testing | Implicit (dev browser) | Chrome Canary/146+ for native; any browser works with polyfill | @mcp-b/global polyfill covers all browsers |
| `use-mcp` | BRW-04 | Not needed | 0.0.21 | Hand-rolled fetch hook (required) |

**Missing dependencies with no fallback:**
- `@mcp-b/react-webmcp@2.2.0` — required for BRW-01/BRW-02/BRW-03; must install
- `@mcp-b/global@2.2.0` — required for BRW-01 polyfill; must install
- `zod-to-json-schema@3.25.2` — peer dep; must install

**Missing dependencies with fallback:**
- Native `navigator.modelContext` (Chrome 146+) → covered by `@mcp-b/global` polyfill for all browsers

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test -- --run __tests__/webmcp-*.test.ts` |
| Full suite command | `cd dashboard && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRW-01 | `initializeWebModelContext()` is called in providers; `useWebMCP()` hook called in browser tools | unit | `npm test -- --run __tests__/webmcp-browser-tools.test.ts` | No — Wave 0 |
| BRW-02 | Tool registers on mount, unregisters on unmount (no zombie tools) | unit | `npm test -- --run __tests__/webmcp-lifecycle.test.ts` | No — Wave 0 |
| BRW-03 | Three tools registered: `get_design_state`, `get_project_info`, `list_artifacts` | unit | `npm test -- --run __tests__/webmcp-browser-tools.test.ts` | No — Wave 0 |
| BRW-04 | `use-mcp-client.ts` calls POST with correct headers; handles JSON + SSE responses | unit | `npm test -- --run __tests__/use-mcp-client.test.ts` | No — Wave 0 |
| BRW-05 | `emitWebMcpConfig()` writes `.webmcp/config.json` with correct shape | unit | `npm test -- --run __tests__/context-sync-webmcp.test.ts` (root-level) | No — Wave 0 |
| BRW-06 | `MONITORED_FILES` includes `.webmcp/config.json` entry | unit | same as BRW-05 | No — Wave 0 |

**Testing note:** BRW-01/BRW-02/BRW-03 require mocking `navigator.modelContext`. Use `vi.stubGlobal('navigator', { modelContext: { registerTool: vi.fn(), unregisterTool: vi.fn() } })` in Vitest. The `@mcp-b/react-webmcp` test shim (`navigator.modelContextTesting`) is available when `installTestingShim: 'if-missing'` (default in `@mcp-b/global`).

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test -- --run __tests__/webmcp-*.test.ts`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/__tests__/webmcp-browser-tools.test.ts` — covers BRW-01, BRW-03
- [ ] `dashboard/__tests__/webmcp-lifecycle.test.ts` — covers BRW-02
- [ ] `dashboard/__tests__/use-mcp-client.test.ts` — covers BRW-04
- [ ] `dashboard/__tests__/context-sync-webmcp.test.ts` (or in root `__tests__/`) — covers BRW-05, BRW-06
- [ ] Install new packages: `cd dashboard && npm install @mcp-b/react-webmcp@2.2.0 @mcp-b/global@2.2.0 zod-to-json-schema@3.25.2`

---

## Sources

### Primary (HIGH confidence)
- `https://modelcontextprotocol.io/specification/2025-03-26/basic/transports` — Official MCP Streamable HTTP spec: POST requirements, Accept header, JSON-RPC 2.0 format, stateless mode behavior
- `https://docs.mcp-b.ai/packages/global/reference` — `initializeWebModelContext()` API, `WebModelContextInitOptions`, `cleanupWebModelContext()`
- `https://docs.mcp-b.ai/tutorials/first-react-tool` — `useWebMCP()` lifecycle tutorial (register on mount, unregister on unmount); `navigator.modelContextTesting` verification
- `npm view @mcp-b/react-webmcp` — Version 2.2.0 confirmed; peer deps: `zod ^3.25 || ^4.0`, `react ^17-19`, `zod-to-json-schema ^3.25.0`
- `npm view @mcp-b/global` — Version 2.2.0 confirmed; no peer deps
- `npm view use-mcp` — Version 0.0.21; deps include `@modelcontextprotocol/sdk ^1.13.3` (disqualifies for BRW-04)
- `bin/lib/context-sync.cjs` — Source-verified: `emitAll()`, `MONITORED_FILES`, emitter function pattern
- `.planning/STATE.md` — Locked decision: `useMcpTool()` / `provideContext()` deprecation March 5, 2026

### Secondary (MEDIUM confidence)
- `https://docs.mcp-b.ai/packages/react-webmcp/reference` — `useWebMCP()` hook parameters: `name`, `description`, `handler`, `inputSchema`, `outputSchema`, Zod support
- `https://github.com/WebMCP-org/examples` — Vanilla JS registration pattern; React hook code example with Zod schema

### Tertiary (LOW confidence)
- WebSearch results re: `.webmcp/config.json` standard — No external standard found; confirmed PDE-specific design. All search results reference `.well-known/mcp` for server discovery, not `.webmcp/`.
- `https://sumitagrawal.dev/blog/react-webmcp-guide/` — Lifecycle confirmation ("registers on mount, unregisters on unmount") for zombie tool prevention

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via `npm view`; peer deps verified
- Architecture: HIGH — patterns derived from official docs and project source code inspection
- Pitfalls: HIGH — SSR pitfall is a standard Next.js issue (multiple verified sources); schema recreation is documented in official @mcp-b docs; others derived from spec reading
- BRW-04 (hand-roll requirement): HIGH — `use-mcp` SDK dep confirmed via `npm view use-mcp --json`

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days; @mcp-b is actively maintained — recheck if v2.3+ releases before phase execution)
