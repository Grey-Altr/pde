# Architecture Research: WebMCP Integration (v0.19)

**Domain:** MCP protocol extension — browser-native agent interface, Streamable HTTP transport
**Researched:** 2026-03-27
**Confidence:** HIGH (all integration points traced to source files)

---

## Existing Architecture Summary

Before detailing each integration point, a map of the live system:

```
Plugin root (CJS, zero-dep)
├── workflows/          <- Prompt programs: wireframe, mockup, critique, competitive, etc.
├── references/         <- Shared reusable blocks (@-imported by workflows)
│   └── mcp-integration.md  <- Probe/degrade contracts for all 7 MCP servers
├── bin/lib/
│   ├── mcp-bridge.cjs  <- APPROVED_SERVERS (7+1 playwright), TOOL_MAP (57 entries),
│   │                      probe/degrade coordination layer (does NOT call MCPs directly)
│   └── context-sync.cjs <- 6 emitters: AGENTS.md, Cursor rules (.mdc), .cursorrules,
│                           GEMINI.md, Antigravity SKILL.md, DESIGN.md
└── packages/pde-mcp-server/  <- ESM TypeScript, @modelcontextprotocol/sdk ^1.27.1
    └── src/index.ts    <- StdioServerTransport ONLY; 10 read tools + 4 write tools (gated)

dashboard/ (Next.js 16, Clerk auth, Upstash Redis, Serwist PWA)
├── app/api/
│   ├── ingest/route.ts     <- Bearer token auth, WireEnvelope batch -> Redis sorted set
│   ├── events/route.ts     <- SSE stream from Redis (Clerk auth), 15s heartbeat
│   ├── approval-response/  <- POST (Clerk auth), GET (Bearer) -- dual-auth split pattern
│   ├── sessions/           <- session list/metadata
│   └── poll/               <- polling fallback for SSE-incapable clients
├── app/page.tsx            <- "use client" home: 7-pane PaneGrid, session filter
│   └── hooks/
│       ├── use-event-stream.ts   <- SSE consumer with heartbeat detection + fallback
│       ├── use-all-sessions.ts   <- polling sessions every 5s
│       └── use-global-filter.ts  <- session filter state (nuqs-based)
└── components/             <- shadcn/ui base, approval-card, failure-card, phase-progress
```

---

## Integration Point Analysis: All 11 Questions

### Q1: Dual Transport — stdio + Streamable HTTP in pde-mcp-server

**Finding:** The installed `@modelcontextprotocol/sdk` v1.27.1 already ships `WebStandardStreamableHTTPServerTransport` in `dist/esm/server/webStandardStreamableHttp.js`. This was confirmed by reading the installed package directly. The transport accepts a standard `Request` object and returns a standard `Response` — exactly what a Next.js Route Handler provides. Confidence: HIGH.

**Key principle:** Both transports share the same `McpServer` instance. Tool handlers are registered once and execute identically regardless of which transport delivered the message. The transport abstraction is the entire point of the MCP SDK design.

**Pattern — minimal index.ts change:**

```typescript
// packages/pde-mcp-server/src/index.ts (MODIFIED)

// Extract server construction into shared factory (new file server-factory.ts)
import { createPdeMcpServer } from './server-factory.js';

const mode = process.env.PDE_MCP_TRANSPORT ?? 'stdio';

const server = createPdeMcpServer(planningDir, { enableWrites });

if (mode === 'http') {
  // WebStandardStreamableHTTPServerTransport -- stateless, Vercel-compatible
  // Stateless: sessionIdGenerator: undefined -- no server-side session memory
  // The Route Handler calls transport.handleRequest(req) and returns the Response
  const { WebStandardStreamableHTTPServerTransport } =
    await import('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js');
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // REQUIRED for Vercel -- see Q1 rationale
  });
  await server.connect(transport);
  // Note: HTTP mode does NOT call transport.start() here -- the Route Handler drives it
} else {
  // Existing stdio path -- unchanged
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

**Why `sessionIdGenerator: undefined`:** Vercel functions are per-request processes. Session state in `WebStandardStreamableHTTPServerTransport`'s in-memory `_streamMapping` does not persist between requests. Using stateless mode means each request is a self-contained tool call — correct for serverless deployment.

**What changes:**
- `src/index.ts`: Transport selection branch (~20 lines new, no existing lines removed)
- `src/server-factory.ts`: NEW file extracting `McpServer` construction for reuse
- `package.json`: Add `exports` map exposing `./handlers` path for dashboard import

**What does NOT change:**
- All tool handler files (`tools/*.ts`, `write-tools.ts`) — zero modifications
- Local stdio invocation (`npx pde-mcp-server`) — unchanged behavior
- `McpServer` registration logic — unchanged

---

### Q2: Where Does the Remote MCP Endpoint Live

**Decision: Co-locate in `dashboard/app/api/mcp/route.ts`** (not a separate Vercel project).

**Rationale from existing code:**
- Clerk auth is already wired and battle-tested in the dashboard (`@clerk/nextjs` in dependencies)
- `@upstash/ratelimit` is already in `dashboard/lib/ratelimit.ts` — reuse without duplication
- `maxDuration = 300` pattern is established in `events/route.ts` for long-running responses
- CORS headers for browser clients need to live alongside the Clerk domain
- Separate Vercel project = two `.env.example` files, two CI configs, split auth domain for cookies

**Route handler pattern:**

```typescript
// dashboard/app/api/mcp/route.ts (NEW FILE)
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { auth } from '@clerk/nextjs/server';
import { WebStandardStreamableHTTPServerTransport } from
  '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createPdeMcpServer } from 'pde-mcp-server/handlers';
import { resolvePlanningDir } from '@/lib/planning-dir';  // reads from Redis or env

export async function POST(req: Request): Promise<Response> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return new Response('Unauthorized', { status: 401 });

  const planningDir = await resolvePlanningDir();  // see Q2 note on planningDir
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createPdeMcpServer(planningDir);
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: Request): Promise<Response> {
  // SSE GET for server-initiated notifications (optional stream)
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return new Response('Unauthorized', { status: 401 });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createPdeMcpServer(await resolvePlanningDir());
  await server.connect(transport);
  return transport.handleRequest(req);
}
```

**Note on `planningDir` in Vercel context:** The current `pde-mcp-server` reads local filesystem paths. On Vercel, the filesystem is ephemeral and project files are not present. `resolvePlanningDir()` must read artifact snapshots from Redis (mirrored by `relay-daemon.cjs`) rather than the local filesystem. This is a non-trivial architecture decision — the relay daemon already writes events to Redis; extend it to also snapshot key `.planning/` artifacts at workflow milestones.

---

### Q3: MCP Apps Content Types Through Tool Handlers

**Finding:** MCP SDK v1.27.1 `CallToolResult` defines `content` as an array of typed blocks. The MCP Apps extension adds `ResourceContent` (`type: "resource"`) for rich HTML/binary artifacts. Clients that support MCP Apps render the resource block; stdio clients receive only the text fallback.

**The rule:** Always emit both a rich block AND a `type: 'text'` fallback as the last array element.

**Pattern — additive return format change:**

```typescript
// Before (existing tools — text only):
return {
  content: [{ type: 'text', text: JSON.stringify(result) }]
};

// After (MCP Apps enhanced — rich + text fallback):
return {
  content: [
    {
      type: 'resource',
      resource: {
        uri: `pde://artifact/${artifactCode}`,
        mimeType: 'text/html',
        text: htmlContent,
      }
    },
    // Fallback for stdio clients that don't render resource blocks:
    { type: 'text', text: `Artifact ${artifactCode}: ${summary}` }
  ]
};
```

**What changes:** Selected tool handlers in `packages/pde-mcp-server/src/tools/` gain an enhanced return path. The tools most appropriate for rich content are `get-artifact`, `get-tokens` (JSON → visual token table), `get-handoff` (HTML spec preview), and `list-artifacts` (rich artifact grid).

**What does NOT change:** Transport, server setup, handler signatures, no breaking changes to existing tool behavior.

---

### Q4: WebMCP Tools Registration in Dashboard React Components

**Finding:** The dashboard home page (`app/page.tsx`) is `"use client"` with a hook-per-concern pattern. All data fetching goes through custom hooks (`use-event-stream`, `use-all-sessions`). New WebMCP tools follow this exact pattern.

**No npm MCP SDK in the browser.** The MCP JSON-RPC 2.0 wire format is simple enough for a thin custom hook. Importing the full SDK adds Node.js-incompatible modules to the browser bundle.

**New hook architecture:**

```typescript
// dashboard/hooks/use-mcp-client.ts (NEW)
// Manages stateless fetch-based MCP calls to /api/mcp
// Uses ReadableStream for SSE responses, plain fetch for JSON responses

export function useMcpClient() {
  const callTool = useCallback(async (name: string, args: unknown) => {
    const res = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });
    if (!res.ok) throw new Error(`MCP error: ${res.status}`);
    return res.json();
  }, []);
  return { callTool };
}
```

**Integration with PaneGrid:** The existing `PaneGrid` accepts children — no changes to the grid layout. A new `McpToolPane` component can be inserted as Pane 8 or added to the existing pane set without touching `pane-grid.tsx`.

**Auth:** The hook inherits Clerk session cookie from the dashboard browser context. No extra auth token configuration needed.

---

### Q5: WebMCP Polyfill Injection Into Generated HTML Artifacts

**Finding:** Wireframe HTML is generated inline in `workflows/wireframe.md` Step 4c. The current HTML template close (around line 1148) is:

```html
<script>
  /* Theme toggle (hi-fi only — present in all fidelity files for structural completeness) */
  function toggleTheme() { ... }
</script>
</body>
</html>
```

There is no external file template — the HTML scaffold lives in workflow prose. Injection means adding conditional prose to the workflow.

**Pattern — workflow prose modification:**

In `wireframe.md` Step 1 (flags table), add:
```
| `--webmcp` | Boolean | Inject WebMCP browser SDK before </body> for interactive artifact preview. |
```

In Step 4c (HTML template, after the theme toggle script):
```
<!-- If --webmcp flag is present in $ARGUMENTS, append this block before </body>: -->
<script
  type="module"
  src="https://webmcp.dev/dist/webmcp.js"
  data-server-url="{PDE_DASHBOARD_URL}/api/mcp"
  data-tools="get-tokens,get-design-state,list-artifacts,get-artifact"
  data-context='{"artifactCode": "{ARTIFACT_CODE}", "screen": "{SCREEN_SLUG}"}'
></script>
<!-- end WebMCP injection -->
```

Where `{PDE_DASHBOARD_URL}` resolves from env at workflow time (or is left as a placeholder for local development).

**Mirror in mockup.md:** The same flag and injection block appear at the equivalent HTML close in `mockup.md` Step 4. Same ~15 lines of prose.

**What does NOT change:** HTML file writing, annotation injection (Step 5), Stitch paths, fidelity logic, accessibility requirements — all unaffected.

---

### Q6: Critique Pipeline — WebMCP as 5th Probe Path

**Finding:** The critique workflow Step 3 has this probe structure:
- Step 3a: Sequential Thinking MCP probe
- Step 3b: Playwright AOM probe (sets `PLAYWRIGHT_A11Y_AVAILABLE`)
- Step 3.5: Pencil canvas screenshot (conditional — `PEN-02`)
- Pre-Step 3 (Step 2g): Stitch artifact classification

Axe a11y runs inside HIG (`/pde:hig --light`), not as a direct critique probe. The Stitch comparison adds a conditional delta section. The "4-way merge" is: perspective analysis + Sequential Thinking enrichment + Playwright AOM + Stitch delta.

**Adding WebMCP as a 5th source is a non-breaking probe:**

```
#### 3c. WebMCP instrumentation probe (NEW — conditional on --webmcp flag or artifact detection)

Check if any WIREFRAME_FILES contain the WebMCP injection marker:
  Scan each HTML artifact for: data-server-url=".*api/mcp"

If marker found in any artifact: SET WEBMCP_INSTRUMENTED = true
  Log: "  -> WebMCP instrumentation: detected in {N} artifact(s)"
Else if --webmcp flag present: SET WEBMCP_INSTRUMENTED = true
  Log: "  -> WebMCP instrumentation: flag active, treating as instrumented"
Else: SET WEBMCP_INSTRUMENTED = false
  Log: "  -> WebMCP instrumentation: not detected (skipping)"
```

The 5-way synthesis merge in Step 6:
```
[1] Perspective analysis (always)
[2] Sequential Thinking enrichment (if SEQUENTIAL_THINKING_AVAILABLE)
[3] Playwright AOM findings (if PLAYWRIGHT_A11Y_AVAILABLE)
[4] Stitch comparison delta (if STITCH_ARTIFACTS non-empty)
[5] WebMCP token/state divergence (if WEBMCP_INSTRUMENTED)  <- NEW
```

**Mode line update** (end of critique output):
```
Mode: "{full|quick|focused} (Stitch-aware: {N} artifact(s), WebMCP: {yes|no})"
```

**What changes in critique.md:**
- Step 1 flags: add `--webmcp`
- After Step 3b: add Step 3c (~20 lines)
- Step 6 synthesis commentary: update to reference 5 sources (~5 lines)
- Mode footer line: add `WebMCP: {yes|no}` (~1 line)

**What does NOT change:** All 8 critique perspectives, HIG delegation pattern, Stitch token suppression gate, WCAG checklist, all other step logic.

---

### Q7: Local Relay Bridge to mcp-bridge.cjs

**Finding:** `mcp-bridge.cjs` is explicitly documented as a "coordination and policy layer" that does NOT call MCP tools — it validates server names against `APPROVED_SERVERS` and returns `toolName` strings for Claude Code's MCP runtime to execute. The remote `/api/mcp` endpoint is reached by:

| Consumer | Access path | mcp-bridge involved? |
|----------|-------------|----------------------|
| Dashboard React components | `fetch('/api/mcp', ...)` via `use-mcp-client` | No |
| Browser clients (WebMCP) | Direct HTTP to `/api/mcp` | No |
| Workflow scripts (if needed) | `mcp__pde_remote__*` via Claude Code runtime | Only if registered |
| Existing relay daemon | `relay-daemon.cjs` → `/api/ingest` (events only) | No change |

**Recommendation for v0.19: Do NOT add a new `APPROVED_SERVER` entry.** The remote endpoint is consumed by browser clients and dashboard components, not by the Claude Code MCP runtime. Adding it to `APPROVED_SERVERS` would cause every workflow's probe phase to check a remote HTTP endpoint unnecessarily.

**If workflow-layer invocation becomes needed in a future phase:**

```javascript
// Future addition to mcp-bridge.cjs APPROVED_SERVERS -- NOT needed for v0.19
pde_remote: {
  displayName: 'PDE Remote MCP',
  transport: 'http',
  url: process.env.PDE_REMOTE_MCP_URL ?? null,
  installCmd: 'claude mcp add --transport http pde_remote {PDE_REMOTE_MCP_URL}',
  probeTimeoutMs: 10000,
  probeTool: 'mcp__pde_remote__list_artifacts',
  probeArgs: {},
},
```

**What changes in mcp-bridge.cjs for v0.19:** Nothing.

---

### Q8: context-sync.cjs — 7th Emitter

**Finding:** The 6 current emitters called in `emitAll()` (line 1213) are:
1. `emitAgentsMd` → `AGENTS.md`
2. `emitCursorRules` → `.cursor/rules/*.mdc`
3. `emitCursorrules` → `.cursorrules`
4. `emitGeminiMd` → `GEMINI.md`
5. `emitAntigravitySkill` → `.agent/skills/pde-design/SKILL.md`
6. `emitDesignMd` → `DESIGN.md`

The pattern for each emitter: function takes `(ir, projectRoot, planningDir?)`, reads from the IR, writes one or more files, returns `{ path, written }`.

**7th emitter — additive, does not replace any existing emitter:**

```javascript
// bin/lib/context-sync.cjs (MODIFIED — new function only)

function emitWebMcpConfig(ir, projectRoot) {
  // Emit .webmcp/config.json for WebMCP clients to discover the server and project
  const serverUrl = process.env.PDE_REMOTE_MCP_URL ?? null;
  const config = {
    server: serverUrl,
    project: ir.projectName,
    artifacts: (ir.artifacts || []).map(a => ({ code: a.code, type: a.type })),
    tools: [
      'get-project', 'get-design-state', 'get-manifest', 'get-tokens',
      'get-handoff', 'get-artifact', 'get-roadmap', 'get-requirements',
      'get-pipeline-status', 'list-artifacts'
    ],
    generatedAt: new Date().toISOString(),
  };
  const outDir = path.join(projectRoot, '.webmcp');
  const outPath = path.join(outDir, 'config.json');
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n');
    return { path: '.webmcp/config.json', written: true };
  } catch (err) {
    return { path: '.webmcp/config.json', written: false, error: String(err) };
  }
}

// In emitAll() -- add after emitDesignMd line:
const webMcpConfig = emitWebMcpConfig(ir, projectRoot);

// In module.exports -- add:
emitWebMcpConfig,
```

**MONITORED_FILES** (reverse-sync detection array at line 49): Add `.webmcp/config.json` with `parser: 'json'` to track external modifications.

**What changes in context-sync.cjs:**
- New `emitWebMcpConfig` function (~35 lines)
- One line in `emitAll()` call sequence
- One entry in `module.exports`
- One entry in `MONITORED_FILES`

**What does NOT change:** All 6 existing emitters, IR building, hash computation, loop-break logic.

---

### Q9: Auto-Generated Competitor Tools and competitive.md

**Finding:** The competitive workflow (`workflows/competitive.md`) produces `CMP-competitive-v{N}.md` with competitor profiles, feature comparison matrix, and an "Opportunity Highlights" section (the downstream contract for `/pde:opportunity`). Auto-generating MCP tool stubs from competitor sites is entirely new capability.

**Pattern — new optional Step 7 at end of competitive.md:**

```
#### Step 7 (conditional — only when --webmcp flag active): Competitor Tool Stub Generation

For each TOP_COMPETITORS entry with a live URL in the CMP artifact:

  1. Analyze the competitor URL structure (from prior research in Steps 4-6 — no new fetch needed)
  2. Generate a TypeScript MCP tool stub file:
     Path: .planning/design/strategy/competitor-tools/{Slug}-tool.ts
     Exports: name, description, inputSchema, handler (fetch skeleton with placeholder logic)

  3. Register in .webmcp/competitor-tools-registry.json:
     { slug, name, url, toolFile, generatedAt }

  4. Append ## Competitor Tools section to the CMP artifact:
     Table: Slug | Tool File | Capability | Status

Tool stub template:
  import { z } from 'zod';
  export const {Slug}Tool = {
    name: '{slug}-probe',
    description: 'Probe {CompetitorName} for {primaryCapability}',
    inputSchema: z.object({ query: z.string() }),
    handler: async (args: { query: string }) => {
      // TODO: implement fetch to {competitorUrl}
      return { content: [{ type: 'text', text: `Stub: ${args.query}` }] };
    },
  };
```

**What changes in competitive.md:**
- Step 1 flags: add `--webmcp` (mirrors wireframe, critique, mockup)
- After current final step: add Step 7 (~40 lines prose)

**What does NOT change:** Steps 1-6 (existing analysis pipeline), CMP artifact format, `## Opportunity Highlights` contract for downstream `/pde:opportunity`.

---

### Q10: Role-Based Access for Remote Collaboration (Clerk Scoping)

**Finding:** The current dashboard has a single-user model. In `events/route.ts`:
```typescript
const redisKey = `pde:default:events:${sessionId}`;
// Comment: "single-user dashboard — namespace is always 'default' for now."
```
In `approval-response/route.ts`, `userId` is captured but only used for logging. The auth infrastructure is already Clerk, which supports organizations and `orgRole` natively.

**The RBAC extension point is the Redis namespace and the `/api/mcp` write-tool gate:**

```typescript
// Namespace migration pattern (events/route.ts, ingest/route.ts):
const { isAuthenticated, userId, orgId } = await auth();
const namespace = orgId ?? 'default';  // backward-compatible: no org = 'default'
const redisKey = `pde:${namespace}:events:${sessionId}`;
```

```typescript
// Write-tool RBAC gate (mcp/route.ts -- new route):
const { isAuthenticated, orgRole } = await auth();
const role = orgRole === 'org:admin' ? 'owner'
           : orgRole === 'org:member' ? 'reviewer'
           : 'viewer';  // no org = single-user owner effectively

const WRITE_TOOLS = ['update-constraints', 'update-tech-stack', 'append-context-note', 'flag-divergence'];
const requestedTool = parsedBody?.params?.name;
if (WRITE_TOOLS.includes(requestedTool) && role === 'viewer') {
  return new Response('Forbidden: viewer role cannot invoke write tools', { status: 403 });
}
```

**What changes:**
- `dashboard/app/api/mcp/route.ts` (NEW): role gating on write tools
- `dashboard/app/api/events/route.ts` (MODIFIED): `'default'` → `orgId ?? 'default'` (~2 lines)
- `dashboard/app/api/ingest/route.ts` (MODIFIED): same namespace change (~2 lines)
- `dashboard/lib/queries.ts` (MODIFIED): namespace parameter in Redis key builders

**No Clerk plan changes needed for development** — org features available on Clerk Free/Dev.

---

### Q11: Suggested Build Order

Dependencies govern order. Full dependency graph:

```
[A] Streamable HTTP transport (pde-mcp-server/src/index.ts + server-factory.ts)
    -> No dependencies. Foundation for all HTTP-path features.

[B] /api/mcp Route Handler (dashboard/app/api/mcp/route.ts)
    -> Depends on [A] for transport module
    -> Depends on Redis planningDir mirroring decision

[C] MCP Apps content types (tool handler return format)
    -> Depends on [A] (same McpServer instance)
    -> Can be built alongside [A] since it only modifies tool files

[D] Dashboard WebMCP hook (use-mcp-client.ts, use-mcp-tool.ts)
    -> Depends on [B] for the /api/mcp endpoint

[E] Token Playground + Artifact Preview + Approval Gate UI
    -> Depends on [D] — all three consume use-mcp-client

[F] Wireframe script injection (wireframe.md --webmcp flag)
    -> No code dependencies. Workflow prose change only.

[G] Mockup script injection (mockup.md --webmcp flag)
    -> Mirrors [F]. Same pattern.

[H] Critique WebMCP probe (critique.md Step 3c)
    -> Depends on [F] — detects injected marker from wireframe

[I] Declarative Approval Gates (MCP-based form submission)
    -> Depends on [B],[D] — submits approval via MCP tool call

[J] Auto-Generated Competitor Tools (competitive.md Step 7)
    -> Depends on [B],[C] — stubs served via /api/mcp

[K] Multi-Editor Universal Bridge
    -> Depends on [A] — routes editor traffic through HTTP transport

[L] Remote Collaboration RBAC (Clerk org scoping)
    -> Depends on [B] — namespace scoping in /api/mcp and events routes

[M] context-sync 7th emitter (.webmcp/config.json)
    -> Depends on [B] stable URL (emits server URL into config)
```

**Recommended phase sequence:**

```
Phase 1: [A] + [C]
  pde-mcp-server dual transport + MCP Apps content types
  Rationale: Single package, no dashboard changes. Unlocks all HTTP-path features.
  All tool handler changes co-located. Validates stdio unchanged.

Phase 2: [B] + [L]
  /api/mcp route handler + RBAC skeleton (Clerk namespace)
  Rationale: Auth and namespace scoping must be built together. Adding RBAC later
  would require revisiting every Redis key pattern across multiple files.

Phase 3: [D] + [E] + [I]
  Dashboard hooks + Token Playground + Approval Gates UI
  Rationale: One hook (use-mcp-client), three UI features. All consume /api/mcp.
  Build the foundation once, then hang all three features off it.

Phase 4: [F] + [G] + [H]
  Wireframe injection + Mockup injection + Critique probe
  Rationale: Pure workflow prose changes. No code dependencies. Wireframe and
  mockup are mirrors; critique depends on the marker wireframe injects.

Phase 5: [M]
  context-sync 7th emitter
  Rationale: Needs stable /api/mcp URL from Phase 2 to emit meaningful config.json.
  Minimal risk -- additive function, no existing emitters modified.

Phase 6: [J]
  Auto-Generated Competitor Tools
  Rationale: Depends on Phases 1+2 for serving stubs via /api/mcp and MCP Apps
  return format for rich display. New output directory; touches competitive.md.

Phase 7: [K]
  Multi-Editor Universal Bridge
  Rationale: Validates the full stack end-to-end. Requires all transports and
  browser clients to be stable. Appropriate final integration phase.
```

---

## System Overview: Post-Integration Architecture

```
┌────────────────────────────── PDE v0.19 ───────────────────────────────────┐
│                                                                              │
│  Claude Code Plugin (CJS, local)                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────────────┐       │
│  │  workflows/   │  │  mcp-bridge  │  │  context-sync.cjs           │       │
│  │  (wireframe,  │  │  (unchanged  │  │  7 emitters (6 + NEW        │       │
│  │  mockup,      │  │  in v0.19)   │  │  emitWebMcpConfig ->        │       │
│  │  critique,    │  │              │  │  .webmcp/config.json)       │       │
│  │  competitive) │  └──────────────┘  └─────────────────────────────┘       │
│  └───────┬───────┘                                                           │
│          │ stdio / file                                                       │
│          ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │               pde-mcp-server (ESM TypeScript, v0.19)                  │   │
│  │  McpServer (shared) <- 10 read tools + 4 write tools                  │   │
│  │  ┌─────────────────────────┐  ┌──────────────────────────────────┐   │   │
│  │  │  StdioServerTransport   │  │  WebStandardStreamableHTTP       │   │   │
│  │  │  (existing, unchanged)  │  │  (NEW -- stateless, Vercel mode) │   │   │
│  │  └─────────────────────────┘  └──────────────────┬───────────────┘   │   │
│  └────────────────────────────────────────────────── │ ─────────────────┘   │
│                                                       │ Vercel deploy         │
└───────────────────────────────────────────────────── │ ─────────────────────┘
                                                        │ HTTP (Streamable MCP)
                                             ┌──────────▼──────────────────────┐
                                             │  dashboard/ (Next.js 16, Vercel) │
                                             │  ┌──────────────────────────┐   │
                                             │  │  /api/mcp (NEW)           │   │
                                             │  │  WebStandardStreamableHTTP│   │
                                             │  │  Clerk auth + RBAC gate   │   │
                                             │  └─────────────┬────────────┘   │
                                             │                │                 │
                                             │  ┌─────────────▼────────────┐   │
                                             │  │  /api/events /api/ingest  │   │
                                             │  │  (existing, namespace-    │   │
                                             │  │  extended for multi-user) │   │
                                             │  └──────────────────────────┘   │
                                             │                                  │
                                             │  React (browser)                 │
                                             │  ┌──────────────────────────┐   │
                                             │  │  use-mcp-client (NEW)     │   │
                                             │  │  Token Playground          │   │
                                             │  │  Artifact Preview          │   │
                                             │  │  Declarative Approvals     │   │
                                             │  │  Competitor Tools          │   │
                                             │  └──────────────────────────┘   │
                                             └──────────────────────────────────┘
                                                          │
                                                ┌─────────┴────────────────┐
                                                │  External MCP Clients     │
                                                │  Claude.ai web            │
                                                │  Cursor (HTTP transport)  │
                                                │  Any WebMCP browser app   │
                                                └──────────────────────────┘
```

---

## Component Responsibilities

| Component | Existing/New | Responsibility | Key Boundary |
|-----------|-------------|----------------|--------------|
| `pde-mcp-server/src/index.ts` | MODIFIED | Transport selection: stdio vs HTTP | Does not know about Vercel; env-var driven |
| `pde-mcp-server/src/server-factory.ts` | NEW | `createPdeMcpServer(planningDir)` for reuse | Shared by CLI and Route Handler |
| `dashboard/app/api/mcp/route.ts` | NEW | Per-request transport, Clerk auth, RBAC gate | Stateless — no memory between invocations |
| `bin/lib/mcp-bridge.cjs` | UNCHANGED | APPROVED_SERVERS, TOOL_MAP, probe/degrade | Stays stdio-runtime focused for v0.19 |
| `bin/lib/context-sync.cjs` | +1 emitter | 7th emitter: `.webmcp/config.json` | Reads IR, writes projectRoot |
| `workflows/wireframe.md` | +flag +prose | `--webmcp` flag: inject script tag before `</body>` | Flag-gated; no effect when absent |
| `workflows/mockup.md` | +flag +prose | Mirror of wireframe injection | Same pattern |
| `workflows/critique.md` | +Step 3c | Detect WebMCP marker; 5-way merge | Non-breaking for non-instrumented artifacts |
| `workflows/competitive.md` | +Step 7 | `--webmcp` flag: auto-gen competitor stubs | New subdirectory; does not touch Steps 1-6 |
| `dashboard/hooks/use-mcp-client.ts` | NEW | Browser-native MCP client via fetch | No npm MCP SDK in browser bundle |
| `dashboard/app/api/events/route.ts` | MODIFIED | orgId namespace for multi-user | Backward-compatible: falls back to 'default' |
| `dashboard/app/api/ingest/route.ts` | MODIFIED | orgId namespace | Same 2-line change |

---

## Data Flow: Tool Call Through Streamable HTTP

```
Browser (React dashboard or external WebMCP client)
    │
    │  POST /api/mcp
    │  Content-Type: application/json
    │  { jsonrpc: "2.0", id: "uuid", method: "tools/call",
    │    params: { name: "get-tokens", arguments: {} } }
    ▼
dashboard/app/api/mcp/route.ts
    │
    ├── auth() -> Clerk session validation
    ├── orgId namespace resolution
    ├── RBAC gate (write tools: owner/reviewer only)
    │
    ▼
WebStandardStreamableHTTPServerTransport.handleRequest(req)
    │
    ▼
McpServer (per-request instance, stateless)
    │
    ▼
getTokensTool(planningDir).handler({})
    │
    ├── reads .planning/design/SYS-tokens.json
    │   (via Redis snapshot on Vercel, local FS on localhost)
    │
    ▼
CallToolResult {
  content: [
    { type: 'resource', resource: { uri: 'pde://tokens/...', mimeType: 'application/json', text: tokensJson } },
    { type: 'text', text: 'Design tokens: 42 entries across 6 groups' }  // stdio fallback
  ]
}
    │
    ▼
Response (SSE stream if client requests it, JSON otherwise)
    │
    ▼
MCP Apps client: renders token table as rich UI
stdio client: receives text fallback string
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Stateful Transport on Vercel

**What people do:** Use `sessionIdGenerator: () => randomUUID()` on a Vercel serverless function.
**Why it's wrong:** Vercel functions are per-request. The transport's in-memory `_streamMapping` session state is lost between invocations. Second requests get 404 "session not found."
**Do this instead:** `sessionIdGenerator: undefined` (stateless mode). Each request is a complete self-contained tool call cycle.

### Anti-Pattern 2: Importing npm MCP SDK Into Browser Bundle

**What people do:** `import { Client } from '@modelcontextprotocol/sdk/client'` in a React component.
**Why it's wrong:** The SDK has Node.js-specific imports that do not tree-shake cleanly for browsers. Bundle size impact is significant; runtime errors from missing Node builtins are likely.
**Do this instead:** Write a thin `use-mcp-client` hook (~50 lines) using native `fetch` and `ReadableStream`. The JSON-RPC 2.0 wire format is simple enough to inline.

### Anti-Pattern 3: Registering Remote Endpoint in APPROVED_SERVERS Pre-emptively

**What people do:** Add `pde_remote` to `APPROVED_SERVERS` in `mcp-bridge.cjs` as part of v0.19 setup.
**Why it's wrong:** `mcp-bridge.cjs` drives Claude Code's MCP runtime probe-on-every-run behavior. Adding a remote endpoint causes every workflow to check an external HTTP endpoint during its MCP probe phase, adding latency and a new failure mode.
**Do this instead:** Keep `mcp-bridge.cjs` unchanged for v0.19. Browser and dashboard clients reach `/api/mcp` directly without the bridge.

### Anti-Pattern 4: Transport-Conditional Logic Inside Tool Handlers

**What people do:** `if (transport === 'http') { return richContent; } else { return textContent; }`
**Why it's wrong:** Tool handlers don't have transport visibility — that's the abstraction. This couples handlers to deployment topology.
**Do this instead:** Always return `[richBlock, textFallback]`. Clients that support MCP Apps render the rich block; clients that don't ignore unknown content types and fall through to the text fallback.

### Anti-Pattern 5: planningDir Pointing to Ephemeral Vercel Filesystem

**What people do:** Pass a local `.planning/` filesystem path as `planningDir` to the server factory in the Vercel Route Handler.
**Why it's wrong:** Vercel's ephemeral filesystem has no project files. Every tool call returns empty or errors.
**Do this instead:** Implement `resolvePlanningDir()` that reads from Redis-mirrored artifact snapshots when running on Vercel (`VERCEL=1` env), and from local filesystem when running locally. The relay daemon already writes events to Redis — extend it to snapshot key `.planning/` artifacts.

---

## Integration Points

### New Files

| File | Purpose |
|------|---------|
| `packages/pde-mcp-server/src/server-factory.ts` | `createPdeMcpServer(planningDir)` — shared by stdio CLI and HTTP route handler |
| `dashboard/app/api/mcp/route.ts` | Streamable HTTP transport endpoint with Clerk auth and RBAC |
| `dashboard/lib/planning-dir.ts` | `resolvePlanningDir()` — Redis vs filesystem routing |
| `dashboard/hooks/use-mcp-client.ts` | Browser-native MCP client over fetch (no npm SDK) |
| `dashboard/hooks/use-mcp-tool.ts` | Tool-call hook wrapping use-mcp-client with loading/error state |
| `dashboard/components/mcp-tool-panel.tsx` | Generic shadcn Card for tool invocation UI |
| `dashboard/components/token-playground.tsx` | Design token exploration component |
| `dashboard/components/artifact-preview.tsx` | Interactive artifact preview component |
| `.webmcp/config.json` | Generated by context-sync 7th emitter |
| `.planning/design/strategy/competitor-tools/` | Competitor tool stubs from competitive workflow |
| `.webmcp/competitor-tools-registry.json` | Registry of generated competitor tools |

### Modified Files

| File | Modification | Scope |
|------|-------------|-------|
| `packages/pde-mcp-server/src/index.ts` | Transport selection branch + import from server-factory | ~20 lines |
| `packages/pde-mcp-server/package.json` | Add `exports` map for `./handlers` path | 5 lines |
| Selected `tools/*.ts` in pde-mcp-server | MCP Apps rich return content alongside text fallback | Per-tool, additive |
| `bin/lib/context-sync.cjs` | `emitWebMcpConfig` function + `emitAll()` call + export | ~40 lines |
| `workflows/wireframe.md` | `--webmcp` flag + Step 4c injection prose | ~15 lines |
| `workflows/mockup.md` | Same injection pattern as wireframe | ~15 lines |
| `workflows/critique.md` | Step 3c probe + 5-way merge update | ~25 lines |
| `workflows/competitive.md` | `--webmcp` flag + Step 7 stub generation | ~40 lines |
| `dashboard/app/api/events/route.ts` | orgId namespace | ~5 lines |
| `dashboard/app/api/ingest/route.ts` | orgId namespace | ~5 lines |
| `dashboard/lib/queries.ts` | namespace parameter in Redis key builders | ~10 lines |

### Unchanged Files

| File | Reason unchanged |
|------|----------------|
| `bin/lib/mcp-bridge.cjs` | APPROVED_SERVERS not extended until workflow-layer tool calls needed |
| All existing `tools/*.ts` in pde-mcp-server | MCP Apps return format is additive; handlers are transport-agnostic |
| `dashboard/app/page.tsx` | PaneGrid extensible by adding children; home page unchanged |
| `dashboard/components/approval-card.tsx` | Declarative gates use new MCP channel; existing card still functions |
| `dashboard/hooks/use-event-stream.ts` | Event streaming is separate from MCP tool calls |

---

## Scaling Considerations

| Scale | Architecture Note |
|-------|-----------------|
| Single user (current v0.18 baseline) | Redis namespace = 'default'; Vercel Hobby maxDuration 300s adequate |
| Multi-user team (v0.19 RBAC) | orgId namespace per Clerk org; no quota change needed at team scale |
| Multiple projects | planningDir selection must be request-scoped (project ID in header or query param); not addressed in v0.19 |
| High tool call volume | Stateless transport means no connection pooling needed; Vercel auto-scales; Redis is the bottleneck |

---

## Sources

- `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.d.ts` — transport API (HIGH confidence — read directly)
- `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.d.ts` — Node.js wrapper (HIGH confidence — read directly)
- `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/package.json` — version 1.27.1 (HIGH confidence — read directly)
- `packages/pde-mcp-server/src/index.ts` — current stdio-only implementation (HIGH confidence — read directly)
- `bin/lib/mcp-bridge.cjs` lines 1-95 — APPROVED_SERVERS (8 entries) and TOOL_MAP pattern (HIGH confidence — read directly)
- `bin/lib/context-sync.cjs` lines 1213-1230 — `emitAll()` and emitter list (HIGH confidence — read directly)
- `dashboard/app/api/events/route.ts` — Redis namespace `'default'` pattern, SSE streaming (HIGH confidence — read directly)
- `dashboard/app/api/ingest/route.ts` — WireEnvelope batch, Redis pipeline, Bearer auth (HIGH confidence — read directly)
- `dashboard/app/api/approval-response/route.ts` — dual auth split pattern, userId capture (HIGH confidence — read directly)
- `dashboard/app/page.tsx` — hook pattern, PaneGrid structure (HIGH confidence — read directly)
- `dashboard/package.json` — dependencies: Clerk, Upstash, shadcn, nuqs, Serwist (HIGH confidence — read directly)
- `workflows/critique.md` lines 195-252 — AOM probe pattern, Step 3 structure (HIGH confidence — read directly)
- `workflows/wireframe.md` lines 1140-1190 — HTML template close, script block position (HIGH confidence — read directly)

---

*Architecture research for: PDE v0.19 WebMCP Integration*
*Researched: 2026-03-27*
