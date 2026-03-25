# Stack Research: PDE Remote Dashboard

**Domain:** Real-time monitoring PWA for CLI agent orchestrator
**Researched:** 2026-03-24
**Confidence:** HIGH (core stack), MEDIUM (PWA tooling)

## Architecture Boundary: Two Codebases

The dashboard is a **separate Next.js app** in its own repo/directory, deployed to Vercel. The PDE plugin gains only a small relay module that uses Node.js built-ins (zero npm deps). This boundary is load-bearing -- never add npm dependencies to the plugin root.

```
PDE Plugin (zero deps)          Vercel Cloud              Browser
+-----------------------+    +------------------+    +----------------+
| hooks/emit-event.cjs  |    | Next.js App      |    | PWA Dashboard  |
| bin/lib/event-bus.cjs  |    |   /api/ingest    |    |   EventSource  |
|                        |    |   /api/stream    |    |   Push Notifs  |
| lib/relay.cjs  --------+--->|   Upstash Redis  |    |   Home Screen  |
|  (node:https POST)     |    |   Clerk Auth     |    |                |
+-----------------------+    +------------------+    +----------------+
      /tmp/*.ndjson              Sorted Sets              SSE Client
```

---

## Recommended Stack

### Dashboard App (Next.js)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x | App framework | Current stable. App Router SSE route handlers, Fluid Compute on Vercel, Turbopack dev. Verified: [next-16-2 release](https://nextjs.org/blog/next-16-2) |
| React | 19.x | UI runtime | Ships with Next.js 16. Server Components for dashboard layout, client components for live panels |
| TypeScript | 5.7+ | Type safety | Next.js 16 default. Catches event schema drift between relay and dashboard |
| Node.js | 24 LTS | Runtime | Vercel default runtime as of 2025. Required for Fluid Compute |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @clerk/nextjs | ^7.0.5 | Auth provider | 30-min setup. Vercel Marketplace integration. Pre-built sign-in/sign-up components. Middleware-based route protection. Single-user use case (PDE owner) maps to Clerk free tier (10k MAU). Verified: [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) |

### Data Store

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @upstash/redis | ^1.37.0 | Event store + pub/sub | HTTP-based (works in serverless). Sorted sets for time-series events (score = timestamp). Pub/sub for SSE fan-out. Free tier: 10k commands/day. Vercel Marketplace one-click. Verified: [Upstash Redis docs](https://upstash.com/docs/redis/tutorials/nextjs_with_redis) |

### Real-Time Delivery

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SSE (built-in) | -- | Server-to-browser streaming | Native ReadableStream in Next.js route handlers. No WebSocket server needed. Unidirectional (server->client) matches our read-heavy dashboard. Works on Vercel Fluid Compute with `X-Accel-Buffering: no` header. Verified: [SSE streaming guide](https://upstash.com/blog/sse-streaming-llm-responses) |

**SSE route handler pattern (App Router):**
```typescript
// app/api/stream/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Upstash Redis pub/sub or poll sorted set
      // Send events as: `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
    },
    cancel() {
      // Cleanup Redis subscription
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

### PWA Tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Serwist (@serwist/next) | ^9.x | Service worker generation | Successor to next-pwa (unmaintained). Workbox-based. Handles caching strategies, offline fallback. Note: requires Webpack (not Turbopack) for build step. Verified: [Serwist docs](https://serwist.pages.dev/docs/next/getting-started) |
| web-push | ^3.6.x | Push notifications (server) | VAPID-based push to service worker. Used from Next.js API route to notify on approval gates. Mature, well-documented. Verified: [web-push npm](https://www.npmjs.com/package/web-push) |

**Serwist/Turbopack workaround:** Next.js 16 defaults to Turbopack, but Serwist needs Webpack. Use `next build` (Webpack) for production and `next dev --turbopack` for dev (service worker tested via production builds only). This is a known pattern documented in community guides.

### UI Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn/ui (CLI v4) | latest | Component library | Copy-paste components, not a dependency. Tailwind + Radix primitives. Dashboard-grade components (tables, cards, charts). Verified: [shadcn CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) |
| Tailwind CSS | 4.x | Styling | Ships with shadcn init for Next.js. Utility-first, no CSS-in-JS runtime cost |
| Geist (font) | -- | Typography | Vercel's system font. `next/font` optimized. First-class shadcn registry type |
| Recharts | ^2.x | Charts/graphs | Token cost charts, phase progress timelines. Lightweight, React-native. shadcn/ui has chart components built on Recharts |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.x | Schema validation | Validate NDJSON event payloads at ingest endpoint. Share schema types between relay docs and dashboard |
| @upstash/ratelimit | ^2.x | Rate limiting | Protect /api/ingest from abuse. Token bucket per API key |
| sonner | ^2.x | Toast notifications | In-app notifications for approval gates, phase completions. Ships with shadcn |

---

## PDE Relay Module (Zero NPM Deps)

The relay lives inside the PDE plugin at `lib/relay.cjs`. It uses ONLY Node.js built-ins.

### Design: Polling Daemon, Not Per-Event Hook

**Decision:** The relay is a **polling daemon** that reads `/tmp/pde-session-*.ndjson` files periodically, not a per-event hook.

**Why:**
- Hooks run synchronously via `spawnSync` with 5s timeout (see `hooks/emit-event.cjs`). Adding HTTP POST to each hook invocation would add latency to every Claude Code tool call.
- NDJSON files are already being written by the event bus (`bin/lib/event-bus.cjs` line 50). The relay just tails them.
- Batching is natural: read all new lines since last position, POST as batch. More efficient than per-event HTTP.
- Failure isolation: if the Vercel endpoint is down, events accumulate in /tmp/ and get sent on next poll.

### Implementation Sketch

```javascript
// lib/relay.cjs — Node.js built-ins only
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// State: byte offset per file (in-memory, resets on restart)
const offsets = new Map();

function pushBatch(endpoint, apiKey, events) {
  const body = JSON.stringify({ events });
  const url = new URL(endpoint);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

function pollAndPush(sessionId, endpoint, apiKey) {
  const logPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
  try {
    const stat = fs.statSync(logPath);
    const offset = offsets.get(logPath) || 0;
    if (stat.size <= offset) return; // no new data

    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(stat.size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);

    const lines = buf.toString('utf-8').trim().split('\n').filter(Boolean);
    const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    if (events.length > 0) {
      pushBatch(endpoint, apiKey, events)
        .then(() => { offsets.set(logPath, stat.size); })
        .catch(() => { /* retry next poll */ });
    }
  } catch { /* file doesn't exist yet — normal */ }
}
```

### Relay Configuration

The relay reads config from environment variables (set in `~/.pde/config.json` or shell profile):

| Variable | Purpose | Example |
|----------|---------|---------|
| `PDE_DASHBOARD_URL` | Vercel app ingest endpoint | `https://pde-dashboard.vercel.app/api/ingest` |
| `PDE_DASHBOARD_KEY` | Shared secret for auth | `pde_sk_...` (generated during dashboard setup) |
| `PDE_RELAY_INTERVAL` | Poll interval in ms | `3000` (default) |

### How the Relay Starts

Option A (recommended): The `SessionStart` hook in `hooks/emit-event.cjs` spawns the relay as a detached background process:
```javascript
// In SessionStart handler, after session-start:
const relay = spawn(process.execPath, [path.join(pluginRoot, 'lib', 'relay.cjs')], {
  detached: true, stdio: 'ignore', env: { ...process.env, PDE_SESSION_ID: sessionId }
});
relay.unref(); // don't block hook exit
```

Option B: User starts manually via `pde-tools.cjs relay-start`.

---

## Ingest API Design

The dashboard's `/api/ingest` route handler receives batched events from the relay:

```typescript
// app/api/ingest/route.ts
import { Redis } from '@upstash/redis';
import { z } from 'zod';

const EventSchema = z.object({
  schema_version: z.string(),
  ts: z.string().datetime(),
  event_type: z.string(),
  session_id: z.string(),
}).passthrough(); // allow extensions

export async function POST(req: Request) {
  // 1. Verify Bearer token matches PDE_DASHBOARD_KEY
  // 2. Parse and validate event batch with Zod
  // 3. ZADD to Upstash sorted set (score = unix timestamp)
  // 4. PUBLISH to Redis channel for SSE fan-out
  // Returns 200 with { accepted: N }
}
```

**Redis data model:**
- `events:{sessionId}` — Sorted set. Score = epoch ms. Member = JSON event string.
- `channel:events:{sessionId}` — Pub/sub channel for real-time SSE push.
- `sessions:{userId}` — Set of active session IDs for the user.
- TTL: 7 days on sorted sets (configurable). Events are ephemeral monitoring data, not permanent storage.

---

## Installation

### Dashboard App (new Next.js project)

```bash
# Create project
npx create-next-app@latest pde-dashboard --typescript --tailwind --app --src-dir

# Auth
npm install @clerk/nextjs

# Data store
npm install @upstash/redis @upstash/ratelimit

# PWA
npm install @serwist/next serwist
npm install web-push

# UI (shadcn is a CLI, not a dependency)
npx shadcn@latest init
npx shadcn@latest add card table badge chart tabs

# Validation
npm install zod

# Dev
npm install -D @types/web-push
```

### PDE Plugin (zero new deps)

```bash
# Nothing to install. Relay uses node:https, node:fs, node:os, node:path only.
# Add lib/relay.cjs to the plugin.
# Add PDE_DASHBOARD_URL and PDE_DASHBOARD_KEY env vars to ~/.pde/config.json.
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Clerk | NextAuth.js (Auth.js) | If you need database-backed sessions or want to avoid vendor lock-in. More config, fewer pre-built components |
| Clerk | Simple shared secret only (no UI auth) | For MVP/prototype phase. Skip Clerk entirely, just validate Bearer token. Upgrade to Clerk when adding multi-device access |
| Upstash Redis | Neon Postgres | If you need complex querying (aggregations, joins across sessions). Overkill for time-series event streaming |
| Upstash Redis | Vercel Blob | For storing large artifacts (screenshots, logs). Not suitable for real-time sorted sets |
| SSE | WebSockets | If dashboard needs to send commands back (approval gates). SSE is simpler for read-only monitoring. Can add WS for bidirectional control later |
| SSE | @upstash/realtime | Upstash's SSE abstraction. Adds convenience but another dependency. Raw SSE route handler is ~30 lines and gives full control |
| Serwist | Manual service worker | If Serwist's Webpack requirement becomes a blocker. Next.js has official PWA guide with manual SW registration |
| Serwist | next-pwa-pack | Newer alternative claiming Next.js 15+ support. Less proven than Serwist. Monitor but don't adopt yet |
| Polling relay | Per-event webhook | If latency <1s matters. But adds ~200ms to every Claude Code tool call via spawnSync. Not worth it for monitoring |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @vercel/postgres | Sunset product, no longer offered | Upstash Redis (Vercel Marketplace) or Neon Postgres if SQL needed |
| @vercel/kv | Sunset product, no longer offered | @upstash/redis directly |
| Edge Runtime | Compatibility issues, not recommended by Vercel | Fluid Compute (Node.js runtime, default) |
| next-pwa (shadowwalker) | Unmaintained since 2023, incompatible with Next.js 15+ | Serwist (@serwist/next) |
| Socket.io / ws | Requires persistent WebSocket server, complex on serverless | SSE via ReadableStream in route handler |
| Firebase Cloud Messaging | Google vendor lock-in, overkill for single-user push | web-push with VAPID (standards-based) |
| Any npm package in PDE plugin | Breaks zero-deps constraint | Node.js built-ins only for relay.cjs |

---

## Stack Patterns by Variant

**If MVP (fastest to ship):**
- Skip Clerk. Use shared secret Bearer token only.
- Skip Serwist/PWA. Ship as regular web app first.
- Skip web-push notifications. Rely on SSE + browser tab.
- Total new deps in dashboard: `next`, `@upstash/redis`, `zod`, `tailwindcss`, shadcn components.

**If full PWA with notifications:**
- Add Clerk for proper auth (needed before push subscription).
- Add Serwist for service worker + offline shell.
- Add web-push for VAPID push notifications on approval gates.
- Add `@upstash/ratelimit` to protect public endpoints.

**If multi-user / team visibility (future):**
- Upgrade Clerk to organization-based auth.
- Add per-user session scoping in Redis.
- Consider Neon Postgres for persistent session history / analytics.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2 | React 19, Node.js 24 LTS | Current stable as of 2026-03-18 |
| @clerk/nextjs ^7.0 | Next.js 16.x, React 19 | Clerk v7 released for Next.js 16 compatibility |
| @upstash/redis ^1.37 | Node.js 18+, all serverless | HTTP-based, no native deps. Works everywhere |
| @serwist/next ^9.x | Next.js 15-16 (Webpack mode) | Must use Webpack for build, Turbopack for dev |
| shadcn/ui CLI v4 | Next.js 16, Tailwind CSS 4 | Not a runtime dependency, generates source files |
| web-push ^3.6 | Node.js 18+ | Server-side only, used in API routes |

---

## Deployment: Vercel Configuration

```typescript
// vercel.ts (recommended over vercel.json)
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'next build',  // Webpack mode for Serwist SW generation
  crons: [
    { path: '/api/cleanup', schedule: '0 0 * * *' },  // Purge old sessions
  ],
};
```

**Environment variables (Vercel dashboard):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key
- `CLERK_SECRET_KEY` — Clerk secret key
- `UPSTASH_REDIS_REST_URL` — From Vercel Marketplace Upstash integration
- `UPSTASH_REDIS_REST_TOKEN` — From Vercel Marketplace Upstash integration
- `PDE_INGEST_SECRET` — Shared secret the relay sends as Bearer token
- `VAPID_PUBLIC_KEY` — Generated once via `npx web-push generate-vapid-keys`
- `VAPID_PRIVATE_KEY` — Generated once via `npx web-push generate-vapid-keys`

---

## Sources

- [Next.js 16.2 release blog](https://nextjs.org/blog/next-16-2) -- verified current version, HIGH confidence
- [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) -- v7 setup, HIGH confidence
- [Upstash Redis Next.js tutorial](https://upstash.com/docs/redis/tutorials/nextjs_with_redis) -- integration patterns, HIGH confidence
- [Upstash time-series blog](https://upstash.com/blog/redis-timeseries) -- sorted set pattern for events, MEDIUM confidence
- [Upstash SSE streaming blog](https://upstash.com/blog/sse-streaming-llm-responses) -- SSE + Redis pattern, HIGH confidence
- [Serwist Next.js docs](https://serwist.pages.dev/docs/next/getting-started) -- PWA setup, MEDIUM confidence (Webpack caveat)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) -- official manual SW approach, HIGH confidence
- [shadcn/ui CLI v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) -- current CLI version, HIGH confidence
- [web-push npm](https://www.npmjs.com/package/web-push) -- VAPID push library, HIGH confidence
- [Vercel Knowledge Base: application authentication](https://vercel.com/kb/guide/application-authentication-on-vercel) -- auth options overview, MEDIUM confidence
- [SSE in Next.js discussion](https://github.com/vercel/next.js/discussions/48427) -- buffering gotchas, MEDIUM confidence

---
*Stack research for: PDE Remote Dashboard*
*Researched: 2026-03-24*
