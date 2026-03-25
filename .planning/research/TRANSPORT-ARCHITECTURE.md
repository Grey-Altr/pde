# Architecture Research: PDE Remote Dashboard Event Transport

**Domain:** Real-time event transport from local CLI plugin to cloud-hosted PWA
**Researched:** 2026-03-24
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
LOCAL MACHINE                              CLOUD (Vercel)
┌──────────────────────┐                   ┌──────────────────────────────┐
│  Claude Code         │                   │  Next.js PWA (Vercel)        │
│  ┌────────────────┐  │                   │  ┌────────────────────────┐  │
│  │  PDE Plugin    │  │   node:https      │  │ /api/events/[sid]      │  │
│  │  event-bus.cjs │──│──── POST ────────>│  │ /stream (SSE Route)    │  │
│  │  transport.cjs │  │   (fire+forget)   │  └───────────┬────────────┘  │
│  └────────────────┘  │                   │              │               │
│         │            │                   │              │ LRANGE +      │
│         v            │                   │              │ poll/subscribe│
│  ┌────────────────┐  │                   │              v               │
│  │ /tmp/pde-      │  │                   │  ┌────────────────────────┐  │
│  │ session-{sid}  │  │                   │  │  Upstash Redis         │  │
│  │ .ndjson        │  │                   │  │  LIST: events:{sid}    │  │
│  │ (local backup) │  │                   │  │  CHANNEL: pde:{sid}    │  │
│  └────────────────┘  │                   │  └────────────────────────┘  │
└──────────────────────┘                   │              │               │
                                           │              v               │
                                           │  ┌────────────────────────┐  │
                                           │  │  Browser (PWA)         │  │
                                           │  │  EventSource API       │  │
                                           │  │  Dashboard Components  │  │
                                           │  └────────────────────────┘  │
                                           └──────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `event-bus.cjs` (existing, modified) | Emit events locally + trigger remote push | Add `pushToUpstash()` call in dispatch() |
| `transport.cjs` (new, PDE side) | HTTP transport: Upstash REST API via `node:https` | Fire-and-forget POST, batching, retry |
| `/api/events/[sid]/stream` (new, PWA) | SSE endpoint for browser consumption | Next.js Route Handler, ReadableStream |
| `/api/auth/connect` (new, PWA) | Session link creation, token exchange | Generates sessionId + connection config |
| React dashboard components (new, PWA) | Render event stream as live UI | EventSource API, state management |
| Upstash Redis (external) | Durable event storage + real-time channel | LIST for history, PUBLISH for live push |

## Recommended Architecture: Upstash Redis via REST API

### Why Upstash

PDE's hardest constraint is **zero npm dependencies** at the plugin root. Upstash Redis is the only option that satisfies all constraints simultaneously:

1. **Pure HTTP REST API** -- any Redis command via `POST REST_URL/command/arg1/arg2`. No SDK needed.
2. **Dual-mode storage**: `LPUSH` for durable event list + `PUBLISH` for real-time notification, in a single `/pipeline` HTTP call.
3. **Free tier covers hobby use**: 500K commands/month. At 10 sessions/day x 1000 events x 2 commands = ~600K/month (and realistic usage is far lower).
4. **SSE subscribe endpoint** built into Upstash for the PWA side.
5. **Vercel ecosystem alignment**: Upstash powers Vercel KV. Same infrastructure, direct access.

### Recommended Project Structure

```
# PDE Plugin (existing repo, additions only)
lib/
├── transport.cjs        # Upstash REST client, zero deps, ~60 lines
└── telemetry.cjs        # Existing (unchanged)

hooks/
└── emit-event.cjs       # Existing (unchanged -- calls event-bus)

bin/lib/
└── event-bus.cjs        # Modified: add transport.pushToUpstash() in dispatch()

# PWA (new repo or monorepo package)
app/
├── api/
│   ├── events/
│   │   └── [sessionId]/
│   │       └── stream/
│   │           └── route.ts    # SSE endpoint
│   └── auth/
│       └── connect/
│           └── route.ts        # Session link creation
├── dashboard/
│   ├── page.tsx                # Main dashboard view
│   └── components/
│       ├── EventStream.tsx     # Live event feed
│       ├── PhaseProgress.tsx   # Phase tracker
│       ├── AgentActivity.tsx   # Agent pane
│       └── CostMetrics.tsx     # Token/cost display
├── layout.tsx
└── page.tsx                    # Landing / session selector
lib/
├── upstash.ts                  # Upstash client (can use @upstash/redis here)
├── events.ts                   # Event type definitions, parsing
└── sse.ts                      # SSE stream utilities
```

### Structure Rationale

- **`lib/transport.cjs`:** Isolated from event-bus so transport concerns don't pollute event emission. Can be swapped (Upstash today, direct HTTP tomorrow) without touching event-bus.
- **`app/api/events/[sessionId]/stream/`:** Dynamic route per session. SSE via Route Handler. sessionId in URL enables multi-session monitoring.
- **`app/dashboard/`:** Single dashboard page with component-per-pane pattern matching the existing tmux dashboard's mental model.

## Architectural Patterns

### Pattern 1: Fire-and-Forget with Local Fallback

**What:** PDE pushes events to Upstash asynchronously via `node:https`. If the push fails (network down, Upstash outage), the event is still written to local NDJSON. No event is ever lost.
**When to use:** Every event emission. This is the core transport pattern.
**Trade-offs:** Events may arrive at PWA out of order during retries. Acceptable for a monitoring dashboard -- timestamps in the envelope allow client-side reordering.

**Example:**
```javascript
// lib/transport.cjs -- zero npm dependencies
'use strict';
const https = require('node:https');

function pushToUpstash(url, token, sessionId, envelope) {
  const body = JSON.stringify([
    ['LPUSH', `events:${sessionId}`, JSON.stringify(envelope)],
    ['PUBLISH', `pde:${sessionId}`, JSON.stringify(envelope)]
  ]);
  const parsed = new URL(`${url}/pipeline`);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  const req = https.request(options, () => {});
  req.on('error', () => {}); // swallow -- local NDJSON is ground truth
  req.write(body);
  req.end();
}
module.exports = { pushToUpstash };
```

### Pattern 2: Batched Pipeline Pushes

**What:** Buffer events for 100ms, then send as single Upstash `/pipeline` request. Reduces HTTP calls during burst activity (rapid file changes, multiple tool calls).
**When to use:** High-frequency event periods. Optional optimization for free tier conservation.
**Trade-offs:** Adds up to 100ms latency. Reduces Upstash command count significantly. A batch of 10 events = 20 commands in 1 HTTP call vs 10 HTTP calls with 20 commands each.

**Example:**
```javascript
let buffer = [];
let flushTimer = null;

function queueEvent(url, token, sessionId, envelope) {
  buffer.push(envelope);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      const batch = buffer.splice(0);
      flushTimer = null;
      if (batch.length === 0) return;
      const commands = [];
      for (const env of batch) {
        const json = JSON.stringify(env);
        commands.push(['LPUSH', `events:${sessionId}`, json]);
        commands.push(['PUBLISH', `pde:${sessionId}`, json]);
      }
      pushPipeline(url, token, commands);
    }, 100);
  }
}
```

### Pattern 3: SSE via Next.js Route Handler with History Replay

**What:** PWA Route Handler opens a ReadableStream for SSE. On connect, replays all historical events via LRANGE, then polls for new events every 1 second.
**When to use:** Browser connects to dashboard.
**Trade-offs:** Polling at 1s interval means up to 1s delay for new events. True server-push would require persistent connection (Edge Runtime can help). 1s is acceptable for a monitoring dashboard.

```typescript
// app/api/events/[sessionId]/stream/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  let lastIndex = 0;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Replay history
      const history = await redis.lrange(`events:${sessionId}`, 0, -1);
      for (const event of history.reverse()) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        lastIndex++;
      }
      // Poll for new events
      const interval = setInterval(async () => {
        const events = await redis.lrange(`events:${sessionId}`, 0, -1);
        const newEvents = events.slice(0, events.length - lastIndex).reverse();
        for (const event of newEvents) {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          lastIndex++;
        }
      }, 1000);
      request.signal.addEventListener('abort', () => clearInterval(interval));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Data Flow

### Event Emission Flow

```
[Claude Code Hook fires]
    |
    v
[emit-event.cjs] --> parse hook payload --> call pde-tools event-emit
    |
    v
[event-bus.cjs dispatch()]
    |
    +--> emit(eventType, envelope)    # in-process subscribers
    +--> emit('*', envelope)          # wildcard (NDJSON writer)
    +--> safeAppendEvent()            # /tmp/pde-session-{sid}.ndjson (LOCAL)
    +--> pushToUpstash()              # Upstash REST /pipeline (REMOTE, fire-and-forget)
```

### PWA Consumption Flow

```
[Browser opens dashboard]
    |
    v
[EventSource('/api/events/{sid}/stream')]
    |
    v
[Route Handler]
    +--> LRANGE events:{sid} 0 -1     # History replay
    +--> setInterval(1000)             # Poll for new events
    |
    v
[SSE stream to browser]
    |
    v
[React state update] --> [Dashboard re-render]
```

### Authentication (Simplified v1)

```
1. User creates Upstash Redis database (free)
2. Gets UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
3. Configures PDE: export PDE_UPSTASH_URL=... PDE_UPSTASH_TOKEN=...
4. Configures PWA: same credentials in Vercel env vars
5. PDE writes with token, PWA reads with same token
6. Single-user system: Upstash token IS the authentication
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, 10 sessions/day | Current architecture. $0/month. Polling at 1s. |
| 5 users, 50 sessions/day | Still within Upstash free tier. Add per-user namespacing. |
| 50+ users | Upgrade to Upstash pay-as-you-go (~$5/month). Consider WebSocket for lower latency. |

### Scaling Priorities

1. **First bottleneck:** Upstash free tier command limit (500K/month). Fix: Enable batching, or upgrade to pay-as-you-go ($0.20/100K commands).
2. **Second bottleneck:** Vercel serverless function duration for SSE. Fix: Move SSE to Edge Runtime or dedicated WebSocket service (Ably/Pusher) for real-time push, keep Upstash for storage.

## Anti-Patterns

### Anti-Pattern 1: Adding npm Dependencies to PDE Plugin

**What people do:** Install `@upstash/redis`, `ioredis`, `supabase-js`, or `pusher` in the PDE plugin root.
**Why it's wrong:** Violates zero-dependency constraint. Claude Code plugins must load fast. Supply chain risk in plugin root.
**Do this instead:** Use `node:https` to call Upstash REST API directly. The API accepts any Redis command as URL path or JSON body.

### Anti-Pattern 2: Synchronous HTTP in Event Path

**What people do:** `await fetch()` in the event emission path, blocking until HTTP response arrives.
**Why it's wrong:** Network latency (50-200ms) blocks Claude Code hook execution. The 5000ms timeout in emit-event.cjs exists because hooks must not hang.
**Do this instead:** Fire-and-forget with `https.request()`. Don't await response. Local NDJSON is the source of truth.

### Anti-Pattern 3: WebSocket Server in PDE Plugin

**What people do:** Try to run a persistent WebSocket server inside the Claude Code plugin process.
**Why it's wrong:** Plugin hooks are ephemeral processes spawned via `spawnSync`. There is no long-running process to host a WebSocket server.
**Do this instead:** Stateless HTTP POST per event (or batched). Push TO the cloud, don't serve FROM local.

### Anti-Pattern 4: Tunnel-Based Connectivity

**What people do:** Run ngrok or Cloudflare Tunnel to expose a local endpoint to the PWA.
**Why it's wrong:** Requires separate process management, URL changes per session, breaks when laptop sleeps, large security surface area.
**Do this instead:** Push-based architecture. PDE pushes events TO Upstash. PWA reads FROM Upstash. No inbound connections needed.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Upstash Redis | REST API via `node:https` (PDE) and `@upstash/redis` (PWA) | Free tier: 500K cmds/month |
| Vercel | Hosting for Next.js PWA | Hobby plan sufficient for single user |
| Claude Code Hooks | stdin JSON -> emit-event.cjs -> event-bus.cjs | Existing integration, unchanged |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| event-bus.cjs <-> transport.cjs | Direct function call | Lazy-require when UPSTASH env vars present |
| PDE plugin <-> Upstash | HTTPS POST (fire-and-forget) | No response handling needed |
| Upstash <-> PWA Route Handler | @upstash/redis SDK or REST | PWA has no dep restrictions |
| Route Handler <-> Browser | Server-Sent Events (SSE) | EventSource API, auto-reconnect |

## Full Transport Options Comparison

| Criterion | Upstash Redis REST | Vercel KV | Local WS + Tunnel | Supabase Realtime | Pusher | Ably | Vercel Queues | Direct HTTP Push |
|-----------|-------------------|-----------|-------------------|-------------------|--------|------|---------------|------------------|
| **Latency** | 50-150ms | 50-150ms | 10-50ms | 100-300ms | 50-100ms | 50-100ms | 100-500ms | 50-200ms |
| **Zero npm deps (PDE)** | YES | YES | NO | NO | NO (HMAC signing) | MAYBE (bearer) | NO (Node 22+) | YES |
| **Monthly cost** | $0 (500K cmds) | $0 (30K req) | $0 + tunnel | $0 (auto-pauses) | $0 (200K msg/day) | $0 (6M msg/mo) | ~$0.01 | $0 |
| **Reliability** | HIGH | HIGH | LOW | POOR (hobby) | HIGH | HIGH | HIGH | MEDIUM |
| **History replay** | YES (LRANGE) | YES | NO | YES (SQL) | NO | NO | NO | Only if stored |
| **PWA pattern** | SSE/polling | Polling | WebSocket | WebSocket | WebSocket | WebSocket | Callback fn | SSE/polling |
| **VERDICT** | RECOMMENDED | Too few free reqs | Rejected | Rejected (pause) | Viable backup | Viable backup | Rejected (Node 22) | Incomplete alone |

### Key Disqualifications

- **Vercel KV:** Only 30K free requests on Hobby. 10 sessions would exhaust in ~1.5 days. Same Upstash backend but 16x fewer free commands.
- **Local WS + Tunnel:** No persistent process in PDE plugin. Laptop sleep kills tunnel. No event history.
- **Supabase Free:** Auto-pauses after 7 days of inactivity. Dealbreaker for intermittent-use dev tool.
- **Vercel Queues:** Requires `@vercel/queue` npm package AND Node 22+. PDE runs Node 20. Designed for async processing, not real-time streaming.
- **Direct HTTP Push alone:** Needs a storage backend anyway. If backend is Upstash, push directly.

## Node.js HTTP Capability (Confirmed)

| Method | Available on Node 20 | Stability | Recommendation |
|--------|---------------------|-----------|----------------|
| `node:https` | YES | Stable (all versions) | USE THIS for PDE transport |
| `fetch()` | YES | Experimental on v20, stable on v21+ | Use in PWA only |
| `node:http` | YES | Stable | Not needed (Upstash is HTTPS) |

PDE runs Node.js v20.20.0 (confirmed). `fetch()` works on v20 but is technically experimental. `node:https` is stable and risk-free. Use `node:https` for PDE transport; use `fetch()` freely in the PWA where Vercel controls the runtime.

## Sources

- Upstash Redis REST API: https://upstash.com/docs/redis/features/restapi (HIGH confidence)
- Upstash pricing: https://upstash.com/pricing/redis (HIGH confidence)
- Vercel KV pricing: https://vercel.com/docs/storage/vercel-kv/usage-and-pricing (HIGH confidence)
- Vercel Queues docs: https://vercel.com/docs/queues (HIGH confidence)
- Vercel Queues SDK: https://vercel.com/docs/queues/sdk (HIGH confidence)
- Supabase pricing: https://supabase.com/pricing (HIGH confidence)
- Pusher pricing: https://pusher.com/channels/pricing/ (HIGH confidence)
- Ably pricing: https://ably.com/pricing (MEDIUM confidence)
- Node.js fetch stability: https://blog.logrocket.com/fetch-api-node-js/ (HIGH confidence)

---
*Architecture research for: PDE Remote Dashboard Event Transport*
*Researched: 2026-03-24*
