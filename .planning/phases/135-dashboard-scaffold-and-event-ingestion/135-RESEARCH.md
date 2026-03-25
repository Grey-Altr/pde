# Phase 135: Dashboard Scaffold and Event Ingestion — Research

**Researched:** 2026-03-25
**Domain:** Next.js 16 App Router · Upstash Redis · Clerk v7 · shadcn/ui · SSE · Vercel Fluid Compute
**Confidence:** HIGH (all major claims verified against official docs or npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dual-structure session registry — sorted set `pde:{user}:sessions` (session_id as member, last_event_ts as score) + hash `pde:{user}:session:{id}` for metadata
- **D-02:** User-scoped key namespace — `pde:{user}:events:{session_id}` for event sorted sets
- **D-03:** Ingest endpoint uses Upstash Redis `pipeline()` to batch all ZADD + HSET ops in one round-trip per POST
- **D-04:** SSE-first with auto-fallback — detect Vercel timeout via missed heartbeat (10s interval), auto-switch to 3s polling; client reconnects SSE on next attempt
- **D-05:** Polling interval 3 seconds when SSE falls back — ~20 reads/min per client
- **D-06:** Timestamp cursor — client tracks `last_seen_ts`, requests `ZRANGEBYSCORE(last_ts, +inf)` on reconnect
- **D-07:** Stacked full-width cards on home page — each shows status badge, phase name, elapsed time, last event age
- **D-08:** Four status badge states: active (green pulse), idle (amber), error (red), complete (gray)
- **D-09:** Live session status card: current phase name, plan name, session elapsed time, last event type + timestamp, plus mini-log of last 5-10 events
- **D-10:** shadcn/ui + Geist — Card, Badge, ScrollArea, Skeleton components; Geist Sans/Mono fonts; dark mode default
- **D-11:** Relay authenticates via `PDE_RELAY_TOKEN` env var (Bearer token); no token exchange protocol
- **D-12:** Clerk single-user only — owner login, no org/team features
- **D-13:** Dashboard lives in `dashboard/` at repo root — standalone Next.js app, separate `package.json`, deployed independently to Vercel

### Claude's Discretion
- Event batch size limits on the ingest endpoint
- Exact heartbeat timeout threshold for SSE fallback detection
- Session card mini-log event formatting and truncation
- Skeleton loading states and empty state design
- Clerk middleware configuration details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSH-01 | Next.js 16 App Router dashboard deployed to Vercel with `/api/ingest` endpoint that validates events with zod and stores in Upstash Redis sorted sets | Next.js 16 Route Handler pattern, Upstash pipeline API, Bearer token auth pattern all verified against official docs |
| DSH-02 | SSE Route Handler delivers events to browser with polling fallback for Vercel serverless timeout, including heartbeat detection and auto-reconnection | SSE ReadableStream pattern with heartbeat, Fluid Compute 300s Hobby timeout both verified |
| DSH-03 | Dashboard home page shows session list with status badges (active/idle/error/complete) and current phase name | shadcn/ui Card + Badge confirmed available; ZRANGE + HGETALL cursor pattern verified |
| DSH-04 | Live session status card displays current phase, plan, agent activity, and elapsed time | HGETALL for metadata hash; mini-log via ZRANGE tail; shadcn ScrollArea confirmed |
| DSH-05 | Clerk authentication restricts dashboard access to the PDE owner (single-user) | Clerk v7 `clerkMiddleware` + `proxy.ts` + `auth()` in Route Handlers all verified against clerk.com/docs |
| DSH-06 | Ingest endpoint authenticates PDE relay via Bearer token, rejecting unauthorized event pushes | `request.headers.get('authorization')?.split(' ')[1]` pattern confirmed; `/api/ingest` marked public in Clerk matcher |
</phase_requirements>

---

## Summary

Phase 135 builds a standalone Next.js 16 dashboard in `dashboard/` at the repo root. It is the first consumer of the relay events produced by Phase 134. The dashboard has three surfaces: an `/api/ingest` POST endpoint (receives relay batches, validates with zod, writes to Upstash Redis), an SSE streaming endpoint that pushes events to the browser with a polling fallback, and two UI pages (session list + session detail).

Next.js 16 introduced two major ecosystem changes that directly affect this phase. First, **`middleware.ts` is deprecated and renamed to `proxy.ts`** — the exported function must be named `proxy` (or use a default export). Clerk v7 supports this natively via `clerkMiddleware()`. Second, **Vercel Fluid Compute is now enabled by default for new projects and gives Hobby-tier accounts 300-second max function duration** (changed June 2025, previously 60s). The previously-feared 10-second serverless timeout is not an issue for SSE connections.

Upstash Redis is provisioned through the Vercel Marketplace (not a first-party Vercel product). Provisioning via the Vercel dashboard automatically injects env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) into the project. The pipeline API batches all ingest writes into a single HTTP round-trip: `const p = redis.pipeline(); p.zadd(...); p.hset(...); await p.exec()`.

The `dashboard/` directory is a fully standalone Next.js app with its own `package.json`. It is NOT a workspace package — the repo root `package.json` has no `workspaces` field. Vercel deployment is configured by setting Root Directory to `dashboard` in the Vercel project settings, which Vercel auto-detects as a Next.js project.

**Primary recommendation:** Use `proxy.ts` (not `middleware.ts`). Enable Fluid Compute via `vercel.json` (`"fluid": true`). Set SSE heartbeat to 15-second interval with 30-second client-side missed-heartbeat detection before falling back to 3-second polling. Re-declare `WireEnvelopeSchema` in TypeScript in `dashboard/lib/wire-schema.ts` rather than importing across the CJS/ESM boundary from `bin/lib/relay-protocol.cjs`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | App Router framework | Deployed target; Turbopack is default in Next.js 16 |
| react | ^19.0.0 | UI library | Peer dependency of Next.js 16 |
| react-dom | ^19.0.0 | DOM renderer | Peer dependency of Next.js 16 |
| @upstash/redis | 1.37.0 | Serverless Redis client | HTTP-based, zero TCP connection state — required for Vercel serverless |
| @clerk/nextjs | 7.0.6 | Authentication | Only version with native `proxy.ts` / Next.js 16 support |
| zod | 4.3.6 | Schema validation | Already used in relay-protocol.cjs (v3); dashboard uses v4 — see Open Questions |
| geist | 1.7.0 | Vercel font package | Exports GeistSans/GeistMono; `geist/font/sans`, `geist/font/mono` |
| next-themes | latest | Dark mode theme provider | shadcn/ui official recommendation for dark mode |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | ^4.x | Utility CSS | shadcn/ui v4 requires Tailwind CSS v4 |
| shadcn (CLI) | 4.1.0 | Component library CLI | Used to scaffold Card, Badge, ScrollArea, Skeleton |
| typescript | ^5.1.0 | Type safety | Required by Next.js 16 (minimum TS 5.1) |

### Test Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| vitest | 4.1.1 | Test runner (project standard) |
| next-test-api-route-handler | 5.0.4 | Route Handler integration testing |
| @vitejs/plugin-react | 6.0.1 | React support for vitest component tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @upstash/redis | ioredis or node-redis | TCP clients cannot maintain connections across serverless invocations; Upstash HTTP is the only viable option |
| @clerk/nextjs | NextAuth.js | Clerk requires no database, simpler for single-user; NextAuth adds complexity |
| SSE + polling fallback | WebSocket | WebSocket requires persistent bi-directional server; not supported on Vercel serverless functions |
| shadcn/ui | Radix primitives directly | shadcn/ui is the standard; components are copied into project for full control — no reinvention needed |
| Upstash (Vercel Marketplace) | Vercel KV | Vercel KV is Upstash under the hood; direct Upstash provisioning gives more control and direct console access |

**Installation (from `dashboard/` directory):**
```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# Data and auth
npm install @upstash/redis@latest @clerk/nextjs@latest zod@latest

# UI
npm install geist next-themes

# Dev dependencies
npm install -D typescript tailwindcss@latest

# After project created, initialize shadcn/ui
npx shadcn@latest init
npx shadcn@latest add card badge scroll-area skeleton

# Test tooling
npm install -D vitest @vitejs/plugin-react next-test-api-route-handler
```

**Version verification (verified 2026-03-25 via npm registry):**
```
next@16.2.1
@upstash/redis@1.37.0
@clerk/nextjs@7.0.6
zod@4.3.6
geist@1.7.0
shadcn@4.1.0
vitest@4.1.1
next-test-api-route-handler@5.0.4
@vitejs/plugin-react@6.0.1
```

---

## Architecture Patterns

### Recommended Project Structure
```
dashboard/
├── app/
│   ├── layout.tsx                    # ClerkProvider + ThemeProvider + Geist fonts
│   ├── page.tsx                      # Session list home page (Clerk-protected)
│   ├── sessions/
│   │   └── [id]/
│   │       └── page.tsx              # Session detail / live status card (Clerk-protected)
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx              # Clerk sign-in catch-all route
│   └── api/
│       ├── ingest/
│       │   └── route.ts              # POST: relay → dashboard (Bearer auth + zod + Redis pipeline)
│       ├── events/
│       │   └── route.ts              # GET: SSE stream to browser (Clerk-protected)
│       └── poll/
│           └── route.ts              # GET: polling fallback (Clerk-protected, cursor param)
├── components/
│   ├── ui/                           # shadcn/ui scaffolded components (do not hand-edit)
│   ├── session-card.tsx              # Session list card
│   ├── status-badge.tsx              # Four-state status badge
│   ├── session-detail.tsx            # Live session status card
│   ├── event-log.tsx                 # Mini event log (last 5-10 events)
│   └── theme-provider.tsx            # next-themes wrapper component
├── lib/
│   ├── redis.ts                      # Upstash Redis singleton
│   ├── auth.ts                       # Bearer token validation helper
│   └── wire-schema.ts                # WireEnvelopeSchema (TypeScript mirror of relay-protocol.cjs)
├── proxy.ts                          # Clerk clerkMiddleware — NOT middleware.ts
├── next.config.ts                    # Minimal config (no serverRuntimeConfig in Next.js 16)
├── vercel.json                       # fluid: true
├── components.json                   # shadcn/ui config (generated by init)
├── package.json                      # Standalone app — NOT a workspace package
└── tsconfig.json
```

### Pattern 1: Next.js 16 SSE Route Handler with Heartbeat
**What:** Server pushes events to browser over a streaming HTTP response using `ReadableStream`. Heartbeat comment lines (`: heartbeat`) keep the Vercel proxy from closing idle connections. `export const maxDuration` sets the Fluid Compute cap.
**When to use:** `/api/events/route.ts` — all real-time event delivery to browser.

```typescript
// dashboard/app/api/events/route.ts
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route
// Heartbeat pattern: https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Fluid Compute Hobby max is 300s

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send connection confirmation event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      // Heartbeat every 15 seconds — SSE comment lines, not dispatched to message handlers
      // Client detects missed heartbeat at 30s and falls back to polling (D-04)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Prevents nginx/Vercel edge proxy buffering
    },
  });
}
```

### Pattern 2: SSE Event Format with ID for Resume
**What:** Events carry an `id` field so the browser's EventSource API automatically sends `Last-Event-ID` on reconnect, enabling cursor-based resume. The ID is the Redis sorted set score (Unix ms timestamp as string).
**When to use:** Every event sent through the SSE stream.

```typescript
// Utility: encode a named SSE event with id
function encodeSSEEvent(id: string, eventType: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `id: ${id}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
  );
}
// id = String(redisScore) — the relay_ts in ms cast to string
// On reconnect, EventSource automatically sends: Last-Event-ID: <id>
// Server reads: req.headers.get('last-event-id') ?? '0'
```

### Pattern 3: Upstash Redis Pipeline for Ingest
**What:** Batch all ingest writes into a single HTTP call to Upstash. Non-atomic (pipeline is not a transaction) but acceptable for append-only event ingestion.
**When to use:** `/api/ingest/route.ts` — after Bearer auth and zod validation pass.

```typescript
// dashboard/lib/redis.ts
import { Redis } from '@upstash/redis';
// Source: https://upstash.com/docs/redis/sdks/ts/pipelining/pipeline-transaction

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// In /api/ingest/route.ts — pipeline pattern for D-03
const nowMs = Date.now();
const p = redis.pipeline();

for (const event of validatedBatch) {
  const score = new Date(event.relay_ts).getTime();
  p.zadd(`pde:${userId}:events:${event.session_id}`, {
    score,
    member: JSON.stringify(event),
  });
}

// Update session index with latest event timestamp as score (D-01)
p.zadd(`pde:${userId}:sessions`, { score: nowMs, member: sessionId });

// Update session metadata hash (D-01)
p.hset(`pde:${userId}:session:${sessionId}`, {
  last_event_ts: nowMs,
  last_event_type: lastEventInBatch.event_type,
  // status derived on read, not stored
});

// exec() returns array of results in same order as commands
await p.exec();
```

### Pattern 4: proxy.ts with Clerk (Next.js 16)
**What:** In Next.js 16, the file is `proxy.ts` (not `middleware.ts`). Clerk's `clerkMiddleware()` is a drop-in — only the file name and export name change. Mark `/api/ingest` as public so relay Bearer-token requests bypass Clerk.
**When to use:** Required for all Clerk-protected dashboard routes.

```typescript
// dashboard/proxy.ts  (NOT middleware.ts)
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Routes that bypass Clerk — relay push uses Bearer token, not Clerk session
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/ingest',    // Bearer token authenticated; Clerk must NOT intercept this
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

> **Critical:** The export must be `export default clerkMiddleware(...)`. Do not write `export function proxy(...)` — Clerk's wrapper returns the correct function signature automatically.

### Pattern 5: Bearer Token Auth in the Ingest Route Handler
**What:** `/api/ingest` validates relay auth independently from Clerk. `proxy.ts` marks it public; the Route Handler checks the Bearer token itself.
**When to use:** Every POST to `/api/ingest`.

```typescript
// dashboard/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WireEnvelopeSchema } from '@/lib/wire-schema';
import { redis } from '@/lib/redis';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  // 1. Bearer token auth (D-11, DSH-06)
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || token !== process.env.PDE_RELAY_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Validate batch (batch size limit is Claude's discretion — 100 is reasonable)
  const batchSchema = z.array(WireEnvelopeSchema).min(1).max(100);
  const result = batchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 422 });
  }

  // 4. Pipeline writes (see Pattern 3)
  // ...

  return NextResponse.json({ ok: true, count: result.data.length });
}
```

### Pattern 6: WireEnvelopeSchema in TypeScript (Recommended Over CJS Import)
**What:** Re-declare the schema in TypeScript rather than importing from `bin/lib/relay-protocol.cjs`. This avoids CJS/ESM interop and zod version mismatch (relay uses zod v3; dashboard installs zod v4).
**When to use:** `dashboard/lib/wire-schema.ts` — used by the ingest Route Handler.

```typescript
// dashboard/lib/wire-schema.ts
// Mirror of bin/lib/relay-protocol.cjs WireEnvelopeSchema
// Must match relay schema field-for-field — verify against bin/lib/relay-protocol.cjs on any relay changes
import { z } from 'zod';

export const WireEnvelopeSchema = z.object({
  seq:            z.number().int().nonnegative(),
  session_id:     z.string().uuid(),
  machine_id:     z.string().min(1),
  relay_ts:       z.string().datetime(),
  approval_id:    z.string().uuid().nullable(),
  schema_version: z.string(),
  ts:             z.string().datetime(),
  event_type:     z.string().min(1),
  extensions:     z.record(z.unknown()).optional(),
}).passthrough();

export type WireEnvelope = z.infer<typeof WireEnvelopeSchema>;
```

If CJS import is truly required (fallback, avoid if possible):
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { WireEnvelopeSchema } = require('../../bin/lib/relay-protocol.cjs');
```

### Pattern 7: Geist Font + Tailwind + shadcn/ui Dark Mode Default
```typescript
// dashboard/app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning  // Required for next-themes; prevents hydration mismatch
      >
        <body className="font-sans bg-background text-foreground">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"     // D-10: dark mode default
            enableSystem={false}    // Single-user monitoring app; ignore system preference
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

// dashboard/components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from 'next-themes';
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Pattern 8: Client-Side SSE with Polling Fallback
**What:** Browser starts EventSource. If no heartbeat comment received within 30 seconds, close SSE and switch to 3-second polling (`/api/poll`). On next reconnect cycle, retry SSE.
**When to use:** Any component that needs live event updates (session detail page, D-04).

```typescript
// Pseudocode — hook for SSE with polling fallback
// Native EventSource retry: browser waits 3s and reconnects automatically on error
// Our addition: missed heartbeat detection causes explicit fallback to polling

function useEventStream(sessionId: string, lastTs: number) {
  const [usingPolling, setUsingPolling] = useState(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    // 30 seconds: 2x heartbeat interval (15s) = detected missed heartbeat
    heartbeatTimerRef.current = setTimeout(() => setUsingPolling(true), 30_000);
  }, []);

  useEffect(() => {
    if (usingPolling) {
      const poll = setInterval(async () => {
        const res = await fetch(`/api/poll?session=${sessionId}&last_ts=${lastTs}`);
        const data = await res.json();
        // process events...
        // Optional: attempt SSE reconnect after N polls
      }, 3_000); // D-05: 3-second polling interval
      return () => clearInterval(poll);
    }

    const es = new EventSource(`/api/events?session=${sessionId}`);
    es.onmessage = (e) => {
      resetHeartbeatTimer(); // Any message resets the missed-heartbeat timer
      // process e.data...
    };
    es.onerror = () => setUsingPolling(true);
    resetHeartbeatTimer();

    return () => {
      es.close();
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    };
  }, [sessionId, usingPolling, resetHeartbeatTimer]);
}
```

### Pattern 9: Session Status Derivation (D-08)
```typescript
// dashboard/lib/session-status.ts
export type SessionStatus = 'active' | 'idle' | 'error' | 'complete';

export function deriveStatus(
  lastEventType: string,
  lastEventTsMs: number,
  nowMs: number = Date.now()
): SessionStatus {
  if (lastEventType === 'session_end') return 'complete';
  if (lastEventType.includes('error')) return 'error';
  const ageMs = nowMs - lastEventTsMs;
  if (ageMs < 60_000) return 'active';  // events in last 60s
  return 'idle';
}
```

### Pattern 10: Vercel + Fluid Compute Configuration
```json
// dashboard/vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "fluid": true
}
```

```typescript
// dashboard/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No serverRuntimeConfig/publicRuntimeConfig — removed in Next.js 16
  // Use process.env.* directly; Vercel injects all env vars automatically
};

export default nextConfig;
```

### Anti-Patterns to Avoid
- **Using `middleware.ts` for new Next.js 16 projects:** Creates a deprecation warning. Use `proxy.ts` from the start.
- **`export function middleware()` export name in proxy.ts:** Next.js 16 expects `proxy` (named) or default export. The `middleware` name was the old convention.
- **Missing `export const dynamic = 'force-dynamic'` on SSE and poll routes:** Vercel caches Route Handlers without dynamic signals. SSE will serve a stale response to every client.
- **Missing `X-Accel-Buffering: no` header on SSE:** Nginx/Vercel edge proxies buffer SSE chunks, breaking real-time delivery.
- **TCP Redis client (ioredis, node-redis) in serverless:** TCP connections cannot survive Vercel cold starts. Only `@upstash/redis` (HTTP) is viable.
- **Making `dashboard/` a workspace package:** The repo root has no `workspaces` field and must not gain one. Dashboard is a standalone app deployed by setting Root Directory in Vercel project settings to `dashboard`.
- **Clerk intercepting `/api/ingest`:** `clerkMiddleware` with default `auth.protect()` rejects relay Bearer token requests with 401 before the Route Handler runs. Must mark `/api/ingest` as public in `createRouteMatcher`.
- **Importing `relay-protocol.cjs` directly in ESM context:** Causes ERR_REQUIRE_ESM or module resolution errors. Re-declare the schema in TypeScript in `dashboard/lib/wire-schema.ts`.
- **`defaultTheme="system"` when dark mode default is required (D-10):** Use `defaultTheme="dark"` and `enableSystem={false}`.
- **Missing `suppressHydrationWarning` on `<html>` tag:** `next-themes` sets a `class="dark"` attribute server-side; React detects mismatch on client and throws hydration error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP Redis client for serverless | Custom fetch wrapper around Upstash REST API | `@upstash/redis` | TTL, pipeline, sorted sets, TypeScript generics, error handling all built-in |
| Clerk JWT validation | Custom JWKS fetch + JWT decode | `@clerk/nextjs` `auth()` | JWKS rotation, session expiry, multi-device, `isAuthenticated` flag all handled |
| CSS variables for dark mode | Manual CSS theme switching | `next-themes` + shadcn/ui CSS vars | shadcn components reference `--background`, `--foreground` etc. — they require this exact pattern |
| shadcn component primitives | Raw Radix UI + Tailwind styling | `npx shadcn@latest add card` | Components are copied into project; fully customizable with no reinvention |
| Font loading optimization | `<link rel="preload">` font tags | `geist` npm package | Automatic subset loading, zero layout shift, CSS variable injection |
| SSE heartbeat state machine | Complex reconnection manager | Simple `setInterval` + `setTimeout` | EventSource handles native reconnect; only need heartbeat timer to detect missed beats |
| Relay wire schema | Custom field validation | `WireEnvelopeSchema.safeParse()` | Schema is already defined and tested in Phase 134; re-use exactly |

**Key insight:** `@upstash/redis` is the non-negotiable choice for Vercel serverless. Any TCP-based Redis client silently fails or leaks connections across cold starts.

---

## Common Pitfalls

### Pitfall 1: middleware.ts vs proxy.ts in Next.js 16
**What goes wrong:** File still works if named `middleware.ts` (deprecated, not yet removed), but creates build warnings and confuses future contributors. Clerk documentation examples already use `proxy.ts`.
**Why it happens:** Next.js 16 deprecated `middleware.ts` in October 2025; most community tutorials predate this.
**How to avoid:** Always create `proxy.ts` for new Next.js 16 projects. The export is either `export default clerkMiddleware(...)` or `export function proxy(...)`.
**Warning signs:** Build output shows "The middleware file has been renamed to proxy."

### Pitfall 2: Vercel SSE Response Buffering
**What goes wrong:** SSE events arrive in batches instead of real-time, or the connection appears open but no events reach the browser until it closes.
**Why it happens:** Vercel's edge proxy and nginx upstreams buffer HTTP responses by default.
**How to avoid:** Always set `X-Accel-Buffering: no` on SSE responses. Also `Cache-Control: no-cache, no-transform`.
**Warning signs:** `curl -N https://.../api/events` streams but browser receives nothing until the connection closes.

### Pitfall 3: Missing `force-dynamic` on SSE/Polling Routes
**What goes wrong:** Vercel caches the Route Handler response; second client receives the identical stale response as the first.
**Why it happens:** Next.js 16's default caching model is opt-in for dynamic routes. Route Handlers without a `Request` reference or `no-store` directive may be treated as static.
**How to avoid:** Always `export const dynamic = 'force-dynamic'` on SSE and polling route handlers.
**Warning signs:** Multiple clients receive identical data; Redis is not queried on repeat requests.

### Pitfall 4: Clerk Intercepting Relay POST Requests
**What goes wrong:** Relay daemon receives 401 responses without reaching the Route Handler's Bearer token check.
**Why it happens:** `clerkMiddleware` with `auth.protect()` intercepts all routes including `/api/ingest` unless explicitly marked public.
**How to avoid:** Include `/api/ingest` in `createRouteMatcher([...publicRoutes])`. The Route Handler performs its own Bearer token validation independently.
**Warning signs:** Relay circuit breaker trips; relay logs show 401 from requests that never reach the route; Clerk logs show no auth events.

### Pitfall 5: Zod Version Mismatch at the Schema Boundary
**What goes wrong:** `safeParse` returns unexpected failures on valid relay envelopes. TypeScript errors when importing the CJS schema into ESM context.
**Why it happens:** `relay-protocol.cjs` resolves zod from `packages/pde-mcp-server/node_modules` (zod ^3.25.0). Dashboard installs zod 4.3.6. Different major versions have different schema APIs and instance identity.
**How to avoid:** Re-declare `WireEnvelopeSchema` in `dashboard/lib/wire-schema.ts` as native TypeScript/ESM. This avoids cross-module zod instance problems entirely. Validate the mirror matches the original field-for-field.
**Warning signs:** Valid relay events fail zod validation in the ingest endpoint; TypeScript type errors on zod method calls.

### Pitfall 6: dashboard/ Accidentally Configured as Workspace Package
**What goes wrong:** Root `package.json` gains a `workspaces` field; Vercel tries to build from root; can't resolve `dashboard/` node_modules; build fails.
**Why it happens:** Monorepo guides suggest workspace configuration for code sharing.
**How to avoid:** `dashboard/` is a standalone app — separate `package.json`, separate `node_modules`, separate lock file. Deploy by setting Vercel project Root Directory to `dashboard`. Never modify root `package.json` to reference `dashboard/`.
**Warning signs:** `vercel --prod` from repo root deploys the wrong project; Vercel dashboard shows build errors about missing Next.js config.

### Pitfall 7: Hydration Mismatch from next-themes
**What goes wrong:** React console error "Hydration failed because the initial UI does not match what was rendered on the server."
**Why it happens:** `next-themes` adds `class="dark"` to the `<html>` element via JavaScript after hydration; React detects the mismatch.
**How to avoid:** Add `suppressHydrationWarning` to the `<html>` element in `layout.tsx`. This is documented as the correct pattern in shadcn/ui dark mode setup.
**Warning signs:** Hydration error in browser console on every page load.

### Pitfall 8: ResponseAborted Errors on SSE Stream
**What goes wrong:** Node.js logs unhandled promise rejection `ResponseAborted` at regular 15-second intervals matching heartbeat timing.
**Why it happens:** `controller.enqueue()` throws when the stream controller is already closed (client disconnected) but the heartbeat interval is still running.
**How to avoid:** Wrap `controller.enqueue()` in try/catch. Always clear the heartbeat interval in the `req.signal.addEventListener('abort', ...)` handler before it fires again.
**Warning signs:** Server logs show `ResponseAborted` errors at regular 15-second intervals.

### Pitfall 9: Upstash Free Tier Command Limits
**What goes wrong:** Dashboard stops working mid-session; Upstash returns quota exceeded errors.
**Why it happens:** Upstash free tier has 10,000 commands/day. At D-05 polling rate (20 reads/min), that is 28,800 reads/day from polling alone — exceeds free tier.
**How to avoid:** Use Upstash Pay-as-you-go plan ($0.20 per 100k commands, no monthly fee). At continuous active monitoring, cost is approximately $0.06/day — effectively free for personal use.
**Warning signs:** Ingest or poll endpoints return 429; Upstash console shows quota exceeded.

---

## Runtime State Inventory

This is a greenfield phase (no existing dashboard). No runtime state exists to inventory.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware` | `proxy.ts` + default export or `export function proxy` | Next.js 16, Oct 2025 | All new projects must use `proxy.ts` |
| Vercel Hobby 60s function timeout | Fluid Compute Hobby 300s max duration | June 2025 | SSE connections survive 5 minutes; no heartbeat needed purely for timeout avoidance |
| shadcn/ui with Tailwind v3 + HSL colors | shadcn/ui v4 with Tailwind CSS v4 + OKLCH colors | shadcn v4, early 2025 | CSS variable format changed; `@theme inline` directive; color format is OKLCH not HSL |
| `experimental.ppr` Next.js flag | `cacheComponents: true` config | Next.js 16 | SSE routes unaffected (they are `force-dynamic`); new caching model is opt-in |
| `serverRuntimeConfig`, `publicRuntimeConfig` | `process.env.*` directly | Next.js 16 (removed) | These config options no longer exist; use env vars |
| Turbopack via `next dev --turbo` flag | Turbopack is the default | Next.js 16 | No flag needed; `next build --webpack` to opt out |
| Upstash via Vercel KV first-party | Upstash directly via Vercel Marketplace | Current | Vercel Marketplace provisions Upstash and auto-injects env vars — use this path |

**Deprecated/outdated:**
- `middleware.ts`: Deprecated in Next.js 16; rename to `proxy.ts`
- `authMiddleware()` from `@clerk/nextjs`: Long deprecated; replaced by `clerkMiddleware()`
- `next/legacy/image`: Use `next/image`
- `images.domains` config: Use `images.remotePatterns`
- `revalidateTag()` single argument: Use `revalidateTag(tag, profile)` in Next.js 16

---

## Open Questions

1. **zod v3 (relay) vs zod v4 (dashboard) version mismatch**
   - What we know: `relay-protocol.cjs` resolves zod from `packages/pde-mcp-server/node_modules` locked at `^3.25.0`; dashboard will install zod 4.3.6 (current latest); zod v3 and v4 have different APIs
   - What's unclear: Whether there is any cross-package import scenario that could cause runtime collision
   - Recommendation: Re-declare `WireEnvelopeSchema` in `dashboard/lib/wire-schema.ts` as native TypeScript. No cross-module import. Validate mirror matches original on each relay protocol change.

2. **Clerk keyless mode vs production keys**
   - What we know: Clerk v7 supports "keyless mode" for local development (auto-generates temporary credentials)
   - What's unclear: Whether keyless credentials work on Vercel preview deployments
   - Recommendation: Provision a free-tier Clerk application before Wave 1. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` as Vercel env vars. Use production keys even for development deploy.

3. **Upstash provisioning path — Vercel Marketplace vs direct**
   - What we know: Vercel Marketplace provisions Upstash and auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars; direct Upstash provisioning requires manual env var setup
   - What's unclear: Whether Vercel Marketplace provisioning during Wave 0 is faster than direct signup
   - Recommendation: Use Vercel Marketplace path (dashboard → Storage → Add → Upstash Redis) to get automatic env var injection and avoid manual copy-paste.

4. **`next-test-api-route-handler` compatibility with Next.js 16 proxy.ts**
   - What we know: NTARH 5.0.4 claims auto-testing against Next.js releases; Next.js 16 released Oct 2025
   - What's unclear: Whether NTARH supports `proxy.ts` route matching in tests
   - Recommendation: Test Route Handlers directly by importing and calling `GET`/`POST` with `new Request(...)` — simpler than NTARH and sufficient for unit tests. Reserve NTARH for integration tests only if needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 20.9 | Next.js 16 minimum | ✓ | v20.20.0 | — |
| npm | Package management | ✓ | 10.8.2 | — |
| Vercel CLI | Deployment linking | ✓ | 50.28.0 | Deploy via Vercel dashboard UI |
| Git | Source control | ✓ | 2.48.1 | — |
| Upstash Redis instance | Data storage | ✗ | — | Must provision via Vercel Marketplace before Wave 1 |
| Clerk application | Auth | ✓ | clerk-apricot-school (provisioned) | `vercel integration add clerk` — auto-injects `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` |
| `PDE_RELAY_TOKEN` env var | Relay auth | ✗ | — | Generate: `openssl rand -hex 32` |
| `UPSTASH_REDIS_REST_URL` | Redis connection | ✗ | — | Auto-injected by Vercel Marketplace provisioning |
| `UPSTASH_REDIS_REST_TOKEN` | Redis connection | ✗ | — | Auto-injected by Vercel Marketplace provisioning |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (client) | ✗ | — | Auto-injected by `vercel integration add clerk` |
| `CLERK_SECRET_KEY` | Clerk auth (server) | ✗ | — | Auto-injected by `vercel integration add clerk` |

**Missing dependencies with no fallback:** None — all can be provisioned before Wave 1.

**Wave 0 provisioning steps:**
```bash
# 1. Generate relay token
openssl rand -hex 32  # copy output as PDE_RELAY_TOKEN

# 2. Create Vercel project for dashboard/
cd dashboard/
vercel link   # links dashboard/ as standalone project; sets Root Directory automatically

# 3. Provision Upstash via Vercel Marketplace (auto-injects UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
vercel integration add upstash    # interactive; select region, connect to dashboard project

# 4. Connect pre-provisioned Clerk resource to dashboard project (already provisioned: clerk-apricot-school)
# From dashboard/ after vercel link, run:
vercel integration add clerk      # will detect existing resource and connect it to the dashboard project
# Or from Vercel dashboard: Integrations → Clerk → clerk-apricot-school → Connect to project

# 5. Set remaining env var (not auto-injected)
vercel env add PDE_RELAY_TOKEN production preview development

# 6. Pull all env vars locally
vercel env pull .env.local
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (repo root — shared for all phases) |
| Quick run command | `npx vitest run tests/phase-135/ --reporter=verbose` |
| Full suite command | `npx vitest run` |
| Test file location | `tests/phase-135/` (consistent with phase-134 pattern) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSH-01 | `/api/ingest` accepts valid Bearer + valid batch → 200, pipeline written | unit | `npx vitest run tests/phase-135/test-ingest.ts -t "DSH-01 valid batch"` | ❌ Wave 0 |
| DSH-01 | `/api/ingest` rejects invalid JSON → 400 | unit | `npx vitest run tests/phase-135/test-ingest.ts -t "invalid JSON"` | ❌ Wave 0 |
| DSH-01 | `/api/ingest` rejects zod-invalid envelope → 422 | unit | `npx vitest run tests/phase-135/test-ingest.ts -t "invalid schema"` | ❌ Wave 0 |
| DSH-02 | SSE route returns `Content-Type: text/event-stream` | unit | `npx vitest run tests/phase-135/test-sse.ts -t "DSH-02 headers"` | ❌ Wave 0 |
| DSH-02 | SSE route returns `X-Accel-Buffering: no` | unit | `npx vitest run tests/phase-135/test-sse.ts -t "buffering header"` | ❌ Wave 0 |
| DSH-03 / DSH-04 | Session list and detail pages render with mocked data | manual | `vercel dev` in `dashboard/`; verify in browser | manual-only |
| DSH-05 | Auth-protected routes redirect unauthenticated users | manual | Requires Clerk session; verify in browser | manual-only |
| DSH-06 | `/api/ingest` returns 401 for missing Bearer token | unit | `npx vitest run tests/phase-135/test-ingest.ts -t "DSH-06 no token"` | ❌ Wave 0 |
| DSH-06 | `/api/ingest` returns 401 for wrong Bearer token | unit | `npx vitest run tests/phase-135/test-ingest.ts -t "DSH-06 wrong token"` | ❌ Wave 0 |

> **Testing approach for Route Handlers:** Import the handler and call it directly with `new Request(...)` — no framework needed. This matches the existing phase-134 CJS test pattern adapted for TypeScript:
> ```typescript
> // tests/phase-135/test-ingest.ts
> import { POST } from '../../dashboard/app/api/ingest/route';
>
> it('DSH-06 no token returns 401', async () => {
>   const req = new Request('http://localhost/api/ingest', { method: 'POST', body: '[]' });
>   const res = await POST(req as any);
>   expect(res.status).toBe(401);
> });
> ```

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-135/ --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-135/test-ingest.ts` — covers DSH-01, DSH-06 (ingest validation and auth)
- [ ] `tests/phase-135/test-sse.ts` — covers DSH-02 (SSE headers, heartbeat format)
- [ ] `tests/phase-135/test-wire-schema.ts` — validates dashboard TS schema mirrors relay CJS schema field-for-field
- [ ] Provision Upstash + Clerk + PDE_RELAY_TOKEN before any Wave 1 tasks
- [ ] `dashboard/` directory does not yet exist — Wave 0 includes `npx create-next-app@latest` scaffold

---

## Sources

### Primary (HIGH confidence — official docs verified 2026-03-25)
- Next.js 16 official docs — `proxy.ts` specification, Route Handler API, `dynamic`, `maxDuration`, SSE pattern — https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js 16 release blog — breaking changes table, proxy.ts rename, removed APIs, Node.js 20.9 minimum — https://nextjs.org/blog/next-16
- Vercel Fluid Compute docs — Default 300s/max 300s on Hobby; enabled by default for new projects — https://vercel.com/docs/fluid-compute
- Vercel Fluid Compute changelog — Hobby 300s confirmed (previously 60s), dated June 25 2025 — https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute
- Vercel Storage docs — Upstash via Vercel Marketplace; auto env var injection — https://vercel.com/docs/storage
- Upstash Redis pipeline docs — `redis.pipeline()`, `.exec()`, chain API — https://upstash.com/docs/redis/sdks/ts/pipelining/pipeline-transaction
- Clerk Route Handlers docs — `auth()` in Route Handlers, `isAuthenticated`, `userId` — https://clerk.com/docs/reference/nextjs/app-router/route-handlers
- Clerk clerkMiddleware docs — `createRouteMatcher`, public routes, `auth.protect()` — https://clerk.com/docs/reference/nextjs/clerk-middleware
- shadcn/ui Next.js installation — `npx shadcn@latest init`, component add commands — https://ui.shadcn.com/docs/installation/next
- shadcn/ui dark mode — `next-themes`, `ThemeProvider`, `suppressHydrationWarning` — https://ui.shadcn.com/docs/dark-mode/next
- shadcn/ui Tailwind v4 — OKLCH colors, `@theme inline`, migration steps — https://ui.shadcn.com/docs/tailwind-v4
- npm registry — All versions verified 2026-03-25

### Secondary (MEDIUM confidence — verified against official source)
- Pedro Alonso blog — SSE Route Handler with heartbeat and abort signal — https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/
- Vercel monorepos docs — Root Directory configuration, standalone project deployment — https://vercel.com/docs/monorepos
- javascript.info/server-sent-events — Last-Event-ID, native reconnect behavior, retry timing — https://javascript.info/server-sent-events
- geist npm — `geist/font/sans`, `geist/font/mono` exports — https://www.npmjs.com/package/geist

### Tertiary (LOW confidence — needs validation before implementation)
- NTARH + Next.js 16 compatibility — package claims auto-tested against all Next.js releases but proxy.ts interaction not explicitly confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry 2026-03-25
- proxy.ts API: HIGH — read directly from Next.js 16.2.1 official documentation
- Fluid Compute timeout: HIGH — Vercel official changelog June 2025, 300s Hobby confirmed
- Upstash pipeline API: HIGH — read directly from Upstash TS SDK official docs
- Clerk v7 integration: HIGH — read from clerk.com/docs route-handlers reference
- shadcn/ui + Tailwind v4: MEDIUM — official docs verified; known validation issues with some edge cases
- SSE heartbeat timing values: MEDIUM — multiple sources agree on pattern; 15s/30s thresholds are discretionary
- NTARH + Next.js 16: LOW — claimed but not explicitly verified against proxy.ts

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (Next.js 16 actively releasing patch versions; re-check if `next` version bumps before planning starts)
