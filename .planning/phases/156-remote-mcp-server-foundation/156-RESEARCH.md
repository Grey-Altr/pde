# Phase 156: Remote MCP Server Foundation - Research

**Researched:** 2026-03-28
**Domain:** MCP Streamable HTTP / Vercel Functions / Clerk OAuth / Upstash Redis
**Confidence:** HIGH (core stack verified against official docs and npm registry)

---

<user_constraints>
## User Constraints (from STATE.md Accumulated Context)

### Locked Decisions
- Use stateless per-request transport (`sessionIdGenerator: undefined`) for Vercel compatibility — NOT module-level session state
- Origin header validation is MUST-level per MCP spec — enforce on every request type including GET/SSE

### Claude's Discretion
- Polling pattern implementation details (Redis schema, TTL, tool split)
- Server factory file location and naming
- Exact CORS allowlist configuration
- Specific Upstash Redis key schema for job state

### Deferred Ideas (OUT OF SCOPE)
- Full OAuth provider (PDE issuing its own tokens) — use validate-only via mcp-auth
- Remote collaboration / cross-session state sharing
- MCP Tasks SEP-1686 (experimental, not yet in released SDK)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RMT-01 | User can access PDE tools via Streamable HTTP endpoint at `app/api/mcp/route.ts` | mcp-handler createMcpHandler + Next.js App Router route |
| RMT-02 | Remote MCP server authenticates requests via Clerk-issued tokens with mcp-auth RFC 9728 validation | withMcpAuth + @clerk/mcp-tools verifyClerkToken + .well-known endpoints |
| RMT-03 | Remote MCP server validates Origin header against explicit allowlist on every request | MCP spec MUST requirement + custom Origin check in handler |
| RMT-04 | Remote MCP server uses stateless per-request transport (`sessionIdGenerator: undefined`) | StreamableHTTPServerTransport stateless mode — verified in SDK docs |
| RMT-05 | Shared server-factory.ts extracts McpServer construction for reuse by both stdio and HTTP transports | Factory pattern — server registers tools once, transport layer is swapped |
| RMT-06 | Long-running tool calls use polling pattern to stay within Vercel timeout limits | Two-tool pattern: start_* returns job_id, check_* queries Upstash Redis |
| RMT-07 | Desktop clients can connect via documented `npx @mcp-b/webmcp-local-relay` bridge (zero code change) | @mcp-b/webmcp-local-relay v2.2.0 — bridges browser WebMCP to stdio MCP clients |
</phase_requirements>

---

## Summary

The standard pattern for deploying an MCP server on Vercel in 2026 is `mcp-handler` (Vercel's own package, v1.1.0) wrapping `@modelcontextprotocol/sdk` (v1.28.0). The `createMcpHandler()` function produces a Next.js route handler that natively supports Streamable HTTP transport. Clerk OAuth token validation is handled by `withMcpAuth` from `mcp-handler` plus `verifyClerkToken` from `@clerk/mcp-tools/next`. The stateless constraint (`sessionIdGenerator: undefined`) is satisfied by mcp-handler's default mode — each POST spawns a fresh transport instance with no module-level session map.

Origin header validation is a MUST in the MCP Streamable HTTP spec (explicitly to prevent DNS rebinding). It must be implemented manually in the route handler as a guard before `createMcpHandler` processes the request — it cannot be delegated to the SDK's built-in DNS rebinding protection (which is localhost-only and disabled by default). Two `.well-known` endpoints are required for RFC 9728 compliance: `oauth-protected-resource/mcp` and `oauth-authorization-server`. These are provided as ready-made handlers by `@clerk/mcp-tools/next`.

For long-running tool calls that exceed Vercel's 300s Hobby limit or require background execution, the established pattern is a two-tool split: `start_<operation>` enqueues work and returns a `job_id` immediately, and `check_<operation>` queries Upstash Redis for status. This project already has Upstash Redis wired up (`lib/redis.ts`) making this pattern low-effort to implement.

Desktop clients (Claude Code, Cursor) connect via `npx @mcp-b/webmcp-local-relay@latest` added to their MCP config — no PDE code changes required.

**Primary recommendation:** Use `mcp-handler` + `@clerk/mcp-tools/next` as the complete stack. Do not hand-roll JSON-RPC parsing, session ID generation, OAuth metadata endpoints, or CORS headers.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp-handler` | 1.1.0 | Creates Next.js route handler for MCP Streamable HTTP | Vercel's own package; handles JSON-RPC dispatch, SSE, stateless mode |
| `@modelcontextprotocol/sdk` | 1.28.0 | MCP protocol primitives (McpServer, transports, types) | Official Anthropic SDK; peerDep of mcp-handler |
| `@clerk/mcp-tools` | 0.3.1 | `verifyClerkToken`, OAuth metadata handlers | Clerk's official MCP bridge; eliminates custom JWT plumbing |
| `@clerk/nextjs` | 7.0.7 (already installed) | `auth({ acceptsToken: 'oauth_token' })` | Already in project; provides token context |
| `zod` | 3.x (already installed) | Tool parameter schemas | Already in project; mcp-handler uses it for tool definitions |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@upstash/redis` | latest (already installed) | Job state for polling pattern | Required for RMT-06 long-running tool calls |
| `@mcp-b/webmcp-local-relay` | 2.2.0 | npx relay for desktop clients | Referenced in client config only — no server-side install |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `mcp-handler` | Raw `@modelcontextprotocol/sdk` StreamableHTTPServerTransport | More control but hand-rolls all routing, SSE teardown, auth hooks, and GET handling |
| `@clerk/mcp-tools` | Manual Clerk JWT verify via `clerkClient.authenticateRequest()` | Works but misses RFC 9728 metadata handlers and token scope extraction |
| Upstash Redis for jobs | In-memory (not viable on serverless) / QStash | Redis is already wired; QStash adds complexity for this phase |

**Installation (new packages only):**
```bash
cd dashboard
npm install mcp-handler @clerk/mcp-tools
# Note: mcp-handler peerDep requires @modelcontextprotocol/sdk@1.26.0
# but project already has 1.28.0 installed — verify compatibility before locking
```

**Version verification (confirmed 2026-03-28):**
- `mcp-handler`: npm latest = `1.1.0` (released 2025-03-24)
- `@modelcontextprotocol/sdk`: npm latest = `1.28.0`
- `@clerk/mcp-tools`: npm latest = `0.3.1`
- `@mcp-b/webmcp-local-relay`: npm latest = `2.2.0`

> **Pin note from STATE.md:** mcp-handler npm (v1.1.0) vs GitHub main (snapshot `0.0.0-1eb6f79c`) gap — pin explicitly at install time: `npm install mcp-handler@1.1.0`

---

## Architecture Patterns

### Recommended Project Structure

```
dashboard/
├── app/
│   ├── api/
│   │   └── mcp/
│   │       └── route.ts          # RMT-01: Streamable HTTP handler
│   └── .well-known/
│       ├── oauth-protected-resource/
│       │   └── mcp/
│       │       └── route.ts      # RMT-02: RFC 9728 protected resource metadata
│       └── oauth-authorization-server/
│           └── route.ts          # RMT-02: Clerk AS metadata
├── lib/
│   ├── mcp/
│   │   ├── server-factory.ts     # RMT-05: McpServer construction — shared by stdio + HTTP
│   │   └── tools/
│   │       └── index.ts          # Tool registrations (imported by server-factory)
│   ├── redis.ts                  # (existing)
│   └── auth.ts                   # (existing)
└── proxy.ts                      # (existing — add /api/mcp + /.well-known to public routes)
```

### Pattern 1: Stateless Route Handler (RMT-01, RMT-04)

`mcp-handler` produces a Next.js fetch handler. The `[transport]` dynamic segment allows the package to route both Streamable HTTP and SSE variants, but for Vercel stateless mode the route is fixed at `/api/mcp`.

```typescript
// app/api/mcp/route.ts
// Source: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyClerkToken } from '@clerk/mcp-tools/next';
import { auth } from '@clerk/nextjs/server';
import { registerPdeTools } from '@/lib/mcp/server-factory';

export const maxDuration = 300; // Fluid Compute Hobby max

const handler = createMcpHandler(
  (server) => {
    registerPdeTools(server);
  },
  {},
  { basePath: '/api' },
);

const authHandler = withMcpAuth(
  handler,
  async (_, token) => {
    const clerkAuth = await auth({ acceptsToken: 'oauth_token' });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  },
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
```

**Critical:** `export const maxDuration = 300` must be present — Vercel uses this to configure the function timeout. Without it, the default applies (also 300s on Hobby with Fluid Compute, but explicit is required for Pro's 800s option).

### Pattern 2: Origin Header Allowlist (RMT-03)

The MCP spec's Security Warning section states: "Servers MUST validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks." This is enforced at the route level, not via SDK config.

```typescript
// lib/mcp/origin-guard.ts
const ALLOWED_ORIGINS = [
  'https://your-domain.vercel.app',
  process.env.NEXT_PUBLIC_APP_URL,  // deployed URL
  'http://localhost:3000',           // local dev
  'https://claude.ai',              // Claude web
  // Add desktop client origins as needed
].filter(Boolean) as string[];

export function validateOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');
  // GET requests (SSE opens) and POST requests both require origin validation
  // Allow requests with no origin only from non-browser contexts (stdio relay)
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return null;
}
```

**Important nuance:** Browser-originated requests always include an `Origin` header. The npx relay (desktop clients) does NOT send an Origin header — it is a local process making HTTP requests. The guard must therefore allow `origin === null` for relay/CLI contexts while rejecting unlisted origins from browsers.

### Pattern 3: Server Factory for Dual Transport (RMT-05)

The factory exports a function that registers all PDE tools on any McpServer instance. This enables the same tool set to be used by both the HTTP route handler and the existing stdio transport.

```typescript
// lib/mcp/server-factory.ts
// Source: https://techcommunity.microsoft.com/blog/azuredevcommunityblog/one-mcp-server-two-transports-stdio-and-http/4443915
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPdeTools(server: McpServer): void {
  // Tool registrations here — identical whether transport is stdio or HTTP
  server.tool(
    'get_project_state',
    'Returns current PDE project state from .planning/',
    {},
    async (_, { authInfo }) => {
      // authInfo.extra.userId available from Clerk token
      return { content: [{ type: 'text', text: '...' }] };
    },
  );
  // ... additional tools
}
```

**Key principle:** The factory function is pure — it only registers tools. It does NOT create a transport or call `server.connect()`. The caller (HTTP route or stdio entry point) owns the transport lifecycle.

### Pattern 4: Long-Running Tool Polling (RMT-06)

For tool calls that may exceed 30s (e.g., running a PDE design pipeline), expose two tools per operation. This is the established pattern verified in MCP community practice and Vercel's own docs.

```typescript
// Tool 1: Enqueue work, return job_id immediately (completes in <1s)
server.tool(
  'start_pipeline_run',
  'Starts a PDE design pipeline and returns a job_id for polling',
  { stage: z.string(), args: z.record(z.unknown()).optional() },
  async ({ stage, args }, { authInfo }) => {
    const jobId = crypto.randomUUID();
    await redis.hset(`pde:mcp:job:${jobId}`, {
      status: 'pending',
      stage,
      args: JSON.stringify(args ?? {}),
      createdAt: Date.now(),
      userId: authInfo?.extra?.userId ?? 'unknown',
    });
    await redis.expire(`pde:mcp:job:${jobId}`, 3600); // 1hr TTL
    // Trigger background execution (fire-and-forget via /api/mcp/run-job)
    // or accept that the AI client will poll and a separate worker picks up
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ job_id: jobId, status: 'pending', poll_interval_ms: 5000 }),
      }],
    };
  },
);

// Tool 2: Poll status — returns immediately (<100ms) regardless of job state
server.tool(
  'check_pipeline_run',
  'Checks the status of a running pipeline job',
  { job_id: z.string().uuid() },
  async ({ job_id }) => {
    const job = await redis.hgetall(`pde:mcp:job:${job_id}`);
    if (!job || Object.keys(job).length === 0) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job not found' }) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(job) }] };
  },
);
```

**AI client behavior:** The MCP client (Claude Code, Cursor) will call `check_pipeline_run` in a loop with the `poll_interval_ms` from the first response. Each check call is a fresh Vercel function invocation — no connection held open.

### Pattern 5: RFC 9728 Metadata Endpoints (RMT-02)

Required by MCP spec for OAuth discovery. Use the ready-made handlers from `@clerk/mcp-tools/next` — do not hand-roll.

```typescript
// app/.well-known/oauth-protected-resource/mcp/route.ts
// Source: https://clerk.com/docs/nextjs/guides/development/mcp/build-mcp-server
import {
  protectedResourceHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from '@clerk/mcp-tools/next';

const handler = protectedResourceHandlerClerk({
  scopes_supported: ['profile', 'email'],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

```typescript
// app/.well-known/oauth-authorization-server/route.ts
import {
  authServerMetadataHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from '@clerk/mcp-tools/next';

const handler = authServerMetadataHandlerClerk();
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

### Pattern 6: Middleware Public Routes Update (proxy.ts)

The MCP route and `.well-known` paths must bypass Clerk's `auth.protect()` middleware — they handle their own auth via `withMcpAuth`.

```typescript
// proxy.ts (existing file — add new entries)
export const PUBLIC_ROUTES = [
  '/sign-in(.*)',
  '/api/ingest',
  '/api/approval-response',
  '/api/cron/gc',
  '/api/mcp',                              // RMT-01: MCP handles own auth via withMcpAuth
  '/.well-known/oauth-protected-resource(.*)', // RMT-02: must be public for MCP client discovery
  '/.well-known/oauth-authorization-server(.*)', // RMT-02: same
] as const;
```

### Pattern 7: Desktop Client Config (RMT-07)

The `@mcp-b/webmcp-local-relay` bridges browser WebMCP tool registrations to stdio MCP clients. For Claude Code and Cursor connecting to the *remote HTTP server* (not browser WebMCP), the standard Streamable HTTP config is used directly.

**Claude Code (`~/.config/claude-code/mcp_servers.json` or `.mcp.json`):**
```json
{
  "mcpServers": {
    "pde-remote": {
      "url": "https://your-dashboard.vercel.app/api/mcp"
    }
  }
}
```

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "pde-remote": {
      "url": "https://your-dashboard.vercel.app/api/mcp"
    }
  }
}
```

**When stdio-only clients need a relay** (older clients that don't support Streamable HTTP natively):
```json
{
  "mcpServers": {
    "pde-remote-relay": {
      "command": "npx",
      "args": ["-y", "@mcp-b/webmcp-local-relay@latest"]
    }
  }
}
```

**Important distinction:** `@mcp-b/webmcp-local-relay` is for the *browser WebMCP* use case (Phase 157). For the remote HTTP server in Phase 156, direct Streamable HTTP URL config is the primary path. The relay is the fallback for clients that cannot use HTTP URLs. RMT-07 requires documenting both.

### Anti-Patterns to Avoid

- **Module-level session map:** Do NOT store `transports: { [sessionId]: StreamableHTTPServerTransport }` at module scope — Vercel function instances do not share memory. Each invocation gets a fresh instance.
- **Calling `server.connect()` outside the request handler:** For stateless mode, connect/disconnect must happen within the single request lifecycle.
- **Using Clerk middleware `auth.protect()` on the MCP route:** This breaks MCP clients sending OAuth tokens. The MCP route must be public in the middleware and use `withMcpAuth` instead.
- **SSE transport for stateless Vercel:** The old SSE transport (2024-11-05 spec) required a persistent connection and a separate `/message` endpoint. Streamable HTTP replaces this and works per-request.
- **Omitting Origin validation on GET requests:** SSE GET requests are a DNS rebinding vector. The guard must check Origin on ALL methods.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP JSON-RPC dispatch | Custom switch on `method` field | `createMcpHandler()` from mcp-handler | Edge cases in initialize/notifications/cancellation handling |
| OAuth token extraction from Authorization header | `req.headers.get('authorization').slice(7)` | `withMcpAuth` in mcp-handler | Handles missing header, malformed tokens, 401 with WWW-Authenticate |
| Clerk token verification in MCP context | `clerkClient.authenticateRequest()` direct | `verifyClerkToken` from `@clerk/mcp-tools/next` | Maps Clerk auth result to MCP `AuthInfo` type correctly |
| RFC 9728 metadata JSON | Custom JSON object | `protectedResourceHandlerClerk` / `authServerMetadataHandlerClerk` | Must match exact schema; Clerk's handler auto-populates issuer URL |
| CORS preflight for `.well-known` | Custom OPTIONS handler | `metadataCorsOptionsRequestHandler()` | MCP spec requires specific CORS headers on metadata endpoints |
| Session ID generation | `crypto.randomUUID()` at module scope | `sessionIdGenerator: undefined` (stateless) | Per-request instantiation is the correct serverless pattern |
| SSE heartbeat / retry logic | Custom interval + encoder | Built into mcp-handler's transport layer | Complex teardown on client disconnect; already handled |

**Key insight:** The MCP protocol has many edge cases around session lifecycle, transport upgrade negotiation, and error code semantics. Every edge case that mcp-handler handles is a potential bug if re-implemented.

---

## Common Pitfalls

### Pitfall 1: mcp-handler peerDep Version Conflict

**What goes wrong:** `npm install mcp-handler` resolves `@modelcontextprotocol/sdk@1.26.0` as a peerDep, but the project already has `1.28.0`. npm may warn or silently use the wrong version.

**Why it happens:** mcp-handler pins a specific SDK version as a peerDep. The project has a newer version installed globally.

**How to avoid:** Install with `--legacy-peer-deps` OR verify that mcp-handler 1.1.0 works with SDK 1.28.0 (both are the Vercel/Anthropic maintained stack — minor version increment should be backward compatible). Pin explicitly: `npm install mcp-handler@1.1.0`.

**Warning signs:** TypeScript errors on `AuthInfo` type import; `withMcpAuth` type mismatch on `verifyToken` return.

### Pitfall 2: Clerk Middleware Blocking MCP Requests

**What goes wrong:** Requests to `/api/mcp` return 307 redirect to sign-in page instead of 401/403.

**Why it happens:** `proxy.ts` uses `auth.protect()` on all non-public routes. MCP clients send Bearer tokens, not Clerk session cookies — `auth.protect()` doesn't recognize OAuth tokens unless explicitly configured.

**How to avoid:** Add `/api/mcp` and `/.well-known/oauth-protected-resource(.*)` and `/.well-known/oauth-authorization-server(.*)` to `PUBLIC_ROUTES` in `proxy.ts`. The `withMcpAuth` wrapper handles authentication for these routes.

**Warning signs:** MCP Inspector shows "Connection refused" or HTML in response body; curl returns `text/html` instead of `application/json`.

### Pitfall 3: Connection Held Open After Response

**What goes wrong:** Vercel function runs for the full `maxDuration` (300s) even after the tool response is sent, causing unexpected compute costs.

**Why it happens:** A bug in earlier versions of mcp-handler's streaming transport did not close the SSE stream after sending the final response. Fixed in mcp-handler latest.

**How to avoid:** Use `mcp-handler@1.1.0` (latest). Do not downgrade to earlier versions. Verify in Vercel logs that functions complete quickly for simple tool calls.

**Warning signs:** Vercel function logs show 300s duration for `list_tools` calls; billing spikes.

### Pitfall 4: Origin Guard Blocking the npx Relay

**What goes wrong:** Desktop clients using `npx @mcp-b/webmcp-local-relay` cannot connect because their HTTP requests have no `Origin` header.

**Why it happens:** The relay is a Node.js process making standard HTTP requests — browsers set Origin, Node.js does not.

**How to avoid:** The origin guard must allow `null` origin (no Origin header) while blocking explicitly wrong origins. The check is: `if (origin !== null && !ALLOWED_ORIGINS.includes(origin)) reject`.

**Warning signs:** Desktop client connection works locally (same machine) but fails from relay; error is 403 with "Origin not allowed".

### Pitfall 5: Missing `export const dynamic = 'force-dynamic'`

**What goes wrong:** Vercel caches the MCP endpoint response, causing stale tool lists or repeated initialization errors.

**Why it happens:** Next.js App Router aggressively caches GET responses by default.

**How to avoid:** Add `export const dynamic = 'force-dynamic'` to `app/api/mcp/route.ts`. The existing project routes (`events/route.ts`, `poll/route.ts`) all use this pattern.

**Warning signs:** `tools/list` returns cached response; new tool registrations don't appear until redeploy.

### Pitfall 6: mcp-auth vs Session Token in Clerk

**What goes wrong:** `auth()` returns `isAuthenticated: false` even with a valid Clerk OAuth token in the Authorization header.

**Why it happens:** Clerk's `auth()` defaults to `acceptsToken: 'session_token'` — it ignores OAuth tokens unless explicitly configured.

**How to avoid:** Always call `auth({ acceptsToken: 'oauth_token' })` (not `auth()`) inside `verifyToken` for the MCP route. The `verifyClerkToken` helper from `@clerk/mcp-tools/next` does this correctly.

**Warning signs:** `withMcpAuth` always returns 401 even with a token that works in MCP Inspector; `clerkAuth.isAuthenticated` is false.

### Pitfall 7: .well-known Routes Under App Router Catch-All

**What goes wrong:** Routes at `app/.well-known/...` conflict with Next.js static file serving or middleware.

**Why it happens:** `.well-known` is a valid URL path but an unusual directory name for App Router.

**How to avoid:** The directory name with `.` is valid in Next.js App Router — create `app/.well-known/oauth-protected-resource/mcp/route.ts` directly. No special configuration needed.

**Warning signs:** 404 on `GET /.well-known/oauth-protected-resource`; MCP clients fail during auth discovery.

---

## Code Examples

### Full Route Handler with Auth and Origin Guard

```typescript
// app/api/mcp/route.ts
// Source: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
//         https://clerk.com/docs/nextjs/guides/development/mcp/build-mcp-server
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyClerkToken } from '@clerk/mcp-tools/next';
import { auth } from '@clerk/nextjs/server';
import { registerPdeTools } from '@/lib/mcp/server-factory';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Origin allowlist — enforced on every request type (MCP spec MUST requirement)
const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  // Add Claude.ai, Cursor origins as needed
].filter(Boolean));

function originGuard(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (origin !== null && !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  return null;
}

const mcpHandler = createMcpHandler(
  (server) => { registerPdeTools(server); },
  {},
  { basePath: '/api' },
);

const authHandler = withMcpAuth(
  mcpHandler,
  async (_, token) => {
    const clerkAuth = await auth({ acceptsToken: 'oauth_token' });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  },
);

// Wrap to inject origin guard before mcp-handler processes the request
async function guardedHandler(req: Request) {
  const rejection = originGuard(req);
  if (rejection) return rejection;
  return authHandler(req);
}

export { guardedHandler as GET, guardedHandler as POST, guardedHandler as DELETE };
```

### Server Factory (Dual Transport)

```typescript
// lib/mcp/server-factory.ts
// Source: dual-transport pattern — https://medium.com/@kumaran.isk/dual-transport-mcp-servers-stdio-vs-http-explained
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPdeTools(server: McpServer): void {
  server.tool(
    'get_project_state',
    'Returns current PDE project state',
    {},
    async () => ({ content: [{ type: 'text', text: 'state' }] }),
  );
  // Additional tools...
}

// For stdio use: createMcpServer() + StdioServerTransport
// For HTTP use:  registerPdeTools(server) inside createMcpHandler callback
```

### Polling Tool Pair

```typescript
// lib/mcp/tools/pipeline-tools.ts
import { z } from 'zod';
import { redis } from '@/lib/redis';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPipelineTools(server: McpServer): void {
  server.tool(
    'start_pipeline_run',
    'Starts a PDE pipeline stage. Returns job_id immediately — use check_pipeline_run to poll.',
    { stage: z.string().describe('Pipeline stage name e.g. wireframe, mockup') },
    async ({ stage }, { authInfo }) => {
      const jobId = crypto.randomUUID();
      await redis.hset(`pde:mcp:job:${jobId}`, {
        status: 'pending',
        stage,
        userId: String(authInfo?.extra?.userId ?? 'unknown'),
        created_at: String(Date.now()),
      });
      await redis.expire(`pde:mcp:job:${jobId}`, 3600);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ job_id: jobId, status: 'pending', poll_interval_ms: 5000 }),
        }],
      };
    },
  );

  server.tool(
    'check_pipeline_run',
    'Checks status of a pipeline run started with start_pipeline_run.',
    { job_id: z.string().uuid() },
    async ({ job_id }) => {
      const job = await redis.hgetall(`pde:mcp:job:${job_id}`);
      if (!job || !job.status) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'job_not_found' }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(job) }] };
    },
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE transport (separate `/sse` + `/message` endpoints) | Streamable HTTP (single MCP endpoint handles GET + POST) | March 2025 (spec 2025-03-26) | Simpler serverless deployment; no Redis pub/sub needed for routing |
| `@vercel/mcp-adapter` | `mcp-handler` | July 2024 (mcp-handler v1.0.0) | Same package, renamed; existing examples using old name still work |
| `auth()` session token only | `auth({ acceptsToken: 'oauth_token' })` | Clerk 2025 OAuth machine tokens | Required for MCP bearer token acceptance |
| `provideContext()` for WebMCP | `useMcpTool()` central hook | March 5, 2026 (per STATE.md) | `provideContext()` is deprecated — affects Phase 157, not 156 |

**Deprecated/outdated:**
- HTTP+SSE transport: still supported by Anthropic SDK for backward compat, but do not use for new deployments
- Module-level `transports` map: was correct for SSE (stateful), wrong for serverless Streamable HTTP
- `experimental_withMcpAuth`: older name; stable export is `withMcpAuth` in mcp-handler v1.0.0+

---

## Open Questions

1. **mcp-handler peerDep SDK version**
   - What we know: mcp-handler@1.1.0 has `peerDependencies: { "@modelcontextprotocol/sdk": "1.26.0" }` but project has 1.28.0
   - What's unclear: Whether this is a hard pin or a minimum — npm semver treats exact pins as `>=1.26.0 <2.0.0` when using `^`, but the peerDep here has no `^`
   - Recommendation: Test install with `--legacy-peer-deps` flag; if TypeScript types are compatible, proceed. If not, downgrade SDK to 1.26.0.

2. **Origin allowlist for Clerk OAuth flow**
   - What we know: When Claude Desktop or Cursor initiates the Clerk OAuth flow, the browser redirects through `clerk.com` — the Origin may be `https://clerk.com` or the app's own origin
   - What's unclear: Whether Clerk's OAuth redirect adds origins that need to be in the allowlist
   - Recommendation: Start with strict allowlist (app URL + localhost). Monitor 403 errors in Vercel logs during first OAuth flow test. Add origins as needed.

3. **Background worker for RMT-06 polling jobs**
   - What we know: The start/check tool pair is confirmed. The `start_pipeline_run` enqueues a job_id in Redis but needs something to execute the actual pipeline work
   - What's unclear: Phase 156 scope — does "long-running tool" mean the tool triggers an existing PDE workflow (which runs as a separate process), or does it run directly in the Vercel function with the polling pattern providing the timeout buffer?
   - Recommendation: For Phase 156, implement the Redis job state schema and the two-tool pattern. Wire the actual execution in a subsequent task or note it as a stub — the requirement (RMT-06) is about the timeout-safe pattern, not a specific pipeline feature.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@modelcontextprotocol/sdk` | Core MCP protocol | ✓ | 1.28.0 | — |
| `@clerk/nextjs` | Auth middleware | ✓ | latest (7.0.7) | — |
| `@upstash/redis` | Job state polling | ✓ | latest | — |
| `mcp-handler` | MCP route handler | ✗ (not yet installed) | 1.1.0 available | Raw SDK (significant work) |
| `@clerk/mcp-tools` | Clerk MCP token verify | ✗ (not yet installed) | 0.3.1 available | Manual `clerkClient.authenticateRequest()` |
| `zod` | Tool schemas | ✓ | latest (3.x) | — |
| Vercel Fluid Compute | Long maxDuration | ✓ | `"fluid": true` in vercel.json | — |

**Missing dependencies with no fallback:**
- `mcp-handler@1.1.0` — install required before implementation
- `@clerk/mcp-tools@0.3.1` — install required before implementation

**Missing dependencies with fallback:**
- None — all fallbacks are more complex than the standard stack

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `npm test -- --run` (from `dashboard/`) |
| Full suite command | `npm test` (from `dashboard/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RMT-01 | `/api/mcp` route returns 200 for valid Streamable HTTP POST | integration | `npm test -- --run __tests__/mcp-route.test.ts` | ❌ Wave 0 |
| RMT-02 | `withMcpAuth` rejects missing/invalid token with 401 | unit | `npm test -- --run __tests__/mcp-auth.test.ts` | ❌ Wave 0 |
| RMT-02 | `/.well-known/oauth-protected-resource/mcp` returns valid metadata JSON | integration | `npm test -- --run __tests__/mcp-well-known.test.ts` | ❌ Wave 0 |
| RMT-03 | Origin guard rejects unlisted origin with 403 | unit | `npm test -- --run __tests__/mcp-origin-guard.test.ts` | ❌ Wave 0 |
| RMT-03 | Origin guard allows `null` origin (relay/CLI) | unit | same file | ❌ Wave 0 |
| RMT-04 | No `Mcp-Session-Id` header set in response (stateless) | integration | `npm test -- --run __tests__/mcp-route.test.ts` | ❌ Wave 0 |
| RMT-05 | `registerPdeTools` registers same tools on mock McpServer | unit | `npm test -- --run __tests__/server-factory.test.ts` | ❌ Wave 0 |
| RMT-06 | `start_pipeline_run` returns `job_id` and writes Redis hash | unit | `npm test -- --run __tests__/mcp-polling-tools.test.ts` | ❌ Wave 0 |
| RMT-06 | `check_pipeline_run` returns job state from Redis | unit | same file | ❌ Wave 0 |
| RMT-07 | Relay config documentation exists in project | manual | review docs | — |

### Sampling Rate

- **Per task commit:** `npm test -- --run __tests__/mcp-*.test.ts`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/__tests__/mcp-route.test.ts` — covers RMT-01, RMT-04
- [ ] `dashboard/__tests__/mcp-auth.test.ts` — covers RMT-02 token validation
- [ ] `dashboard/__tests__/mcp-well-known.test.ts` — covers RMT-02 metadata endpoints
- [ ] `dashboard/__tests__/mcp-origin-guard.test.ts` — covers RMT-03
- [ ] `dashboard/__tests__/server-factory.test.ts` — covers RMT-05
- [ ] `dashboard/__tests__/mcp-polling-tools.test.ts` — covers RMT-06

Test infrastructure (Vitest, `next-test-api-route-handler`) is already installed. Use `next-test-api-route-handler` for route handler integration tests (same pattern as existing `__tests__/` files).

---

## Sources

### Primary (HIGH confidence)
- `https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel` — mcp-handler usage, createMcpHandler API, withMcpAuth
- `https://clerk.com/docs/nextjs/guides/development/mcp/build-mcp-server` — verifyClerkToken, @clerk/mcp-tools/next, well-known routes
- `https://modelcontextprotocol.io/docs/concepts/transports` — Streamable HTTP spec, Origin MUST requirement, sessionIdGenerator
- `https://vercel.com/docs/functions/configuring-functions/duration` — maxDuration limits (Hobby 300s, Pro 800s with Fluid)
- npm registry (2026-03-28): mcp-handler@1.1.0, @modelcontextprotocol/sdk@1.28.0, @clerk/mcp-tools@0.3.1, @mcp-b/webmcp-local-relay@2.2.0

### Secondary (MEDIUM confidence)
- `https://clerk.com/docs/nextjs/guides/development/verifying-oauth-access-tokens` — `auth({ acceptsToken: 'oauth_token' })` API
- `https://community.vercel.com/t/mcp-servers-fluid-compute-and-800-second-timout/12069` — connection hold-open bug fixed in latest mcp-handler
- `https://workos.com/blog/mcp-async-tasks-ai-agent-workflows` — polling job pattern with Redis
- `https://medium.com/@kumaran.isk/dual-transport-mcp-servers-stdio-vs-http-explained` — server factory / dual transport TypeScript patterns

### Tertiary (LOW confidence — flag for validation)
- `@mcp-b/webmcp-local-relay` relay behavior for remote HTTP servers: GitHub README content not directly fetched; version confirmed from npm but CLI argument documentation was not found. The package's primary purpose is WebMCP browser-to-desktop bridge (Phase 157), not HTTP relay. **Validate:** whether RMT-07 intends the WebMCP relay or `mcp-remote` package for stdio clients connecting to HTTP servers.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mcp-handler, @clerk/mcp-tools, SDK versions all confirmed from npm registry and official Vercel/Clerk docs
- Architecture patterns: HIGH — createMcpHandler, withMcpAuth, verifyClerkToken code from official Clerk docs; stateless sessionIdGenerator from MCP spec
- Pitfalls: HIGH (pitfalls 1-4) / MEDIUM (pitfalls 5-7) — core pitfalls from community reports and official docs; edge cases from reasoning
- Polling pattern: MEDIUM — established community pattern; Redis key schema is Claude's discretion per STATE.md

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days — these libraries are active but stable)
