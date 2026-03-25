# Domain Pitfalls: PDE Event Transport

**Domain:** Real-time event transport from local CLI plugin to cloud PWA
**Researched:** 2026-03-24

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Blocking Hook Execution with HTTP Calls

**What goes wrong:** Adding `await fetch()` or synchronous HTTP in the event emission path causes Claude Code hooks to timeout or hang. The 5000ms hard cap in emit-event.cjs exists because hooks that block can freeze the entire Claude Code session.

**Why it happens:** Natural instinct is to await the HTTP response to confirm delivery. In a normal server, this is fine. In a Claude Code hook, it is catastrophic.

**Consequences:** Claude Code hooks timeout (5000ms cap). User's entire coding session stutters or hangs. PDE gets blamed for degrading the host tool.

**Prevention:** Fire-and-forget pattern exclusively. `https.request()` without awaiting response. `req.on('error', () => {})` to swallow failures silently. Test by simulating network latency (add 3s delay to Upstash) and verify hooks still complete instantly.

**Detection:** Hook execution time > 100ms. Monitor via `console.time` in emit-event.cjs during development.

### Pitfall 2: Exceeding Upstash Free Tier Silently

**What goes wrong:** PDE sends 2 commands per event (LPUSH + PUBLISH). Without batching, a productive day (20 sessions x 1500 events) = 60,000 commands/day = 1.8M commands/month. Free tier is 500K. Upstash returns HTTP 429 errors. Events silently stop reaching the PWA with no user-visible error.

**Why it happens:** Fire-and-forget pattern swallows all errors including 429s. User doesn't know transport is broken until they check the PWA and see stale data.

**Consequences:** PWA shows stale/incomplete data. User loses trust in the dashboard. Debugging is difficult because errors are intentionally swallowed.

**Prevention:**
1. Implement batching (100ms buffer, `/pipeline` endpoint) to reduce commands 5-10x.
2. Log a local warning (to stderr or a file) when Upstash returns non-2xx, without blocking.
3. Track command count locally. Warn user at 80% of estimated monthly budget.
4. EXPIRE keys with 24h TTL to prevent unbounded storage growth.

**Detection:** Add a simple counter in transport.cjs. On session end, log total commands sent. If > 2000/session, batching is not working.

### Pitfall 3: Redis LIST Growing Unbounded

**What goes wrong:** LPUSH adds events to a Redis LIST without limit. A long session (2000+ events) or forgotten session accumulates data. Upstash free tier has 256MB storage. Multiple sessions can fill this.

**Why it happens:** No TTL or size cap on the event list. Easy to forget cleanup when the write path is fire-and-forget.

**Consequences:** Upstash storage fills up. New events fail to store. LRANGE on huge lists becomes slow.

**Prevention:**
1. Set `EXPIRE events:{sessionId} 86400` (24h TTL) on first event push.
2. Use `LTRIM events:{sessionId} 0 4999` periodically to cap list at 5000 events.
3. Add session cleanup: on session_end event, optionally archive and delete.

**Detection:** Monitor Upstash dashboard for storage usage. Alert if > 100MB.

## Moderate Pitfalls

### Pitfall 4: SSE Connection Timeout on Vercel Serverless

**What goes wrong:** Vercel Serverless Functions have a maximum execution time (10s on Hobby, 60s on Pro). An SSE Route Handler that polls Upstash in a loop will be killed after the timeout. The browser's EventSource reconnects, but there's a gap.

**Prevention:**
1. Accept the reconnection pattern -- EventSource auto-reconnects. Include `Last-Event-ID` support so the server can resume from where it left off.
2. Consider Edge Runtime (`export const runtime = 'edge'`) which has different timeout characteristics (up to 30s on Hobby, longer streaming allowed).
3. For v2: move to a dedicated WebSocket service if gaps are unacceptable.

### Pitfall 5: Event Envelope Size Exceeds Upstash Limits

**What goes wrong:** Upstash REST API has a maximum request body size (1MB). If an event envelope contains large payloads (e.g., full file contents, long command outputs), the push fails.

**Prevention:** PDE already truncates command output to 200 chars and excludes file contents. Keep this discipline. Event envelopes should be <1KB. Add a size check in transport.cjs: if `JSON.stringify(envelope).length > 4096`, log warning and truncate.

### Pitfall 6: Upstash REST Token Leaked in Client-Side Code

**What goes wrong:** The Upstash REST token (used for both read and write) gets bundled into client-side JavaScript. Anyone can read events from or write events to the Redis instance.

**Prevention:** Never use the Upstash token in browser code. Only use it in:
1. PDE plugin (local, never exposed)
2. Next.js Route Handlers (server-side only)
The browser communicates ONLY with the Next.js Route Handler, which proxies to Upstash.

### Pitfall 7: Node.js `fetch()` Experimental Breakage

**What goes wrong:** Using `fetch()` in PDE transport on Node 20 (where it's experimental). A future Node update or user's Node configuration could disable or break it.

**Prevention:** Use `node:https` exclusively in PDE transport code. It is stable across all Node versions. Reserve `fetch()` for the PWA where Vercel controls the runtime.

## Minor Pitfalls

### Pitfall 8: PUBLISH Without Subscribers is Wasted

**What goes wrong:** PDE PUBLISHes to a Redis channel, but if no one is subscribed (PWA not open), the PUBLISH command still counts against the free tier but delivers nothing.

**Prevention:** The LPUSH is the durable store. PUBLISH is a "nice to have" for instant notification. If free tier is a concern, skip PUBLISH and rely on PWA polling LRANGE. This halves command usage.

### Pitfall 9: Clock Skew Between PDE and PWA

**What goes wrong:** PDE timestamps events with local machine time. PWA displays them. If clocks are skewed, event ordering looks wrong.

**Prevention:** Use ISO 8601 timestamps (already done in event-bus.cjs). Sort by sequence number (event index in list) rather than timestamp for ordering. Timestamps are for display, not ordering.

### Pitfall 10: Multiple PDE Sessions Writing to Same Redis Key

**What goes wrong:** If sessionId generation has a collision (extremely unlikely with UUID v4) or if user manually reuses a sessionId, events from different sessions intermix.

**Prevention:** UUID v4 collision is astronomically unlikely. But add session metadata (start time, model, source) as the first event so the PWA can detect and flag mismatches.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Transport module (PDE) | Blocking hook execution (#1) | Test with simulated network latency |
| Free tier management | Silent 429 errors (#2) | Implement batching + local command counter |
| Redis data management | Unbounded LIST growth (#3) | EXPIRE + LTRIM on every push |
| PWA SSE endpoint | Serverless timeout (#4) | EventSource reconnection + Last-Event-ID |
| Security | Token leakage (#6) | Server-side only Upstash access |
| Node.js compatibility | fetch() breakage (#7) | Use node:https, not fetch() |

## Sources

- PDE emit-event.cjs: 5000ms timeout cap on hook spawnSync calls (code reviewed)
- PDE event-bus.cjs: setImmediate-deferred dispatch, swallowed errors (code reviewed)
- Upstash pricing: https://upstash.com/pricing/redis (500K free commands, 256MB storage)
- Upstash REST API limits: https://upstash.com/docs/redis/features/restapi
- Vercel function limits: https://vercel.com/docs/limits (10s Hobby, 60s Pro)
- Node.js fetch stability: https://blog.logrocket.com/fetch-api-node-js/ (experimental on v20, stable on v21+)
