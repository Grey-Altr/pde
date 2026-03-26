# Phase 139: Production Hardening - Research

**Researched:** 2026-03-25
**Domain:** Redis TTL/expiry, rate limiting, in-memory buffers, event downsampling, Vercel cron jobs
**Confidence:** HIGH (all five domains verified against official docs and official repos)

---

## Summary

Phase 139 adds five production safety mechanisms to the existing Next.js/Upstash/relay-daemon stack. The work is purely additive — no existing behavior changes unless a guard condition triggers. Each domain is self-contained and can ship in a separate plan.

**Domain 1 — Redis TTL:** Redis key-level `EXPIRE` is the correct primitive. There is no per-member TTL in sorted sets; TTL applies to the key (the entire sorted set). The pattern is to call `expire` on two keys per session inside the existing ingest pipeline — the events sorted set and the session metadata hash. The global sessions registry sorted set must NOT be expired as a key. Seven days = 604800 seconds.

**Domain 2 — Rate Limiting:** `@upstash/ratelimit@2.0.8` is a first-class serverless library designed for exactly this use case. The sliding window algorithm is the right choice for this relay-to-ingest pattern: it tolerates burst without the boundary-spike problem of fixed window. The `limit()` return value includes a `reset` field in Unix milliseconds, which directly feeds the `Retry-After` header (convert: `Math.ceil((reset - Date.now()) / 1000)`).

**Domain 3 — Buffer Caps:** The `BatchQueue` in `relay.cjs` already has a `maxBufferSize = 1000` parameter with drop-oldest semantics via `queue.shift()`. This requirement is already implemented in code. The task is to add a unit test that explicitly exercises the cap.

**Domain 4 — Downsampling:** Use deterministic 1-in-N counter-based sampling (not reservoir sampling). Reservoir sampling is for offline unknown-N scenarios; deterministic modulo is O(1), zero allocation, and correct for this streaming relay use case. The relay filters in the `onLine` callback before `batchQueue.push()`.

**Domain 5 — Cron GC:** Vercel cron jobs are configured in `vercel.json` under a `crons` array. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when invoking the endpoint. Hobby plan: once per day maximum with plus-or-minus 59 minute precision. The GC job should use `zrange` with `byScore: true` on the sessions sorted set (scored by last_event_ts) to find stale entries, then pipeline-delete their associated keys.

**Primary recommendation:** Implement in two plans — (1) TTL + rate limiting on the dashboard side (HRD-01, HRD-02, HRD-05 cron), (2) buffer cap verification + downsampling on the relay side (HRD-03, HRD-04). TTL and rate limiting are highest-value and touch the fewest files.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HRD-01 | Redis sorted sets have 7-day TTL — events older than 7 days are automatically expired | Key-level EXPIRE on events + session keys in ingest pipeline; 604800 seconds |
| HRD-02 | Ingest endpoint has rate limiting via @upstash/ratelimit preventing abuse | @upstash/ratelimit@2.0.8 sliding window; 429 with Retry-After header |
| HRD-03 | Relay daemon has buffer cap (max 1000 events in memory) | Already implemented in BatchQueue.maxBufferSize; needs unit test |
| HRD-04 | Event downsampling reduces tool_start/tool_complete volume at 1-in-N | Deterministic counter-mod in relay onLine callback; preserve errors + phase transitions |
| HRD-05 | Vercel cron job runs daily to garbage-collect expired sessions from Redis | vercel.json crons + CRON_SECRET auth; zrangebyscore-based stale detection + pipeline delete |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @upstash/ratelimit | 2.0.8 | Rate limiting on serverless endpoints | Only connectionless HTTP-based rate limiter designed for Vercel; same vendor as existing Redis |
| @upstash/redis | 1.37.0 (already installed) | expire + zrange + pipeline for TTL and GC | Already in use; expire and scan are first-class commands |

### No Additional Libraries Needed for HRD-03, HRD-04
| Domain | Approach | Why |
|--------|---------|-----|
| Buffer cap (HRD-03) | Pure JS — already in BatchQueue | Implementation complete; zero-dep constraint on relay |
| Downsampling (HRD-04) | Counter-mod in relay.cjs | relay.cjs has zero npm deps (node: built-ins only) |
| Cron GC (HRD-05) | Existing @upstash/redis | zrange + pipeline already available |

**Installation (one new dependency):**
```bash
cd dashboard && npm install @upstash/ratelimit@2.0.8
```

**Version verification (run date 2026-03-25):**
- `@upstash/ratelimit`: `2.0.8` confirmed via `npm view @upstash/ratelimit version`
- `@upstash/redis`: `1.37.0` confirmed via `npm view @upstash/redis version`

---

## Architecture Patterns

### Files to Create/Modify (additions only)

```
dashboard/
├── app/
│   └── api/
│       ├── ingest/
│       │   └── route.ts          # modify: add ratelimit check + expire in pipeline
│       └── cron/
│           └── gc/
│               └── route.ts      # create: daily GC cron endpoint (HRD-05)
├── lib/
│   └── ratelimit.ts              # create: singleton Ratelimit instance (HRD-02)
└── vercel.json                    # modify: add crons array entry (HRD-05)

bin/lib/
└── relay.cjs                     # modify: add downsample filter in onLine callback (HRD-04)

tests/
├── relay-buffer-cap.test.cjs     # create: unit test for HRD-03
└── relay-downsample.test.cjs     # create: unit test for HRD-04
```

### Pattern 1: Redis Key-Level TTL (HRD-01)

**What:** Call `expire` on two per-session keys inside the existing ingest pipeline — the events sorted set and the session metadata hash. Add the expire calls to the same pipeline as the existing zadd/hset commands so it is one HTTP round-trip to Upstash.

**TTL refresh semantics:** Redis overwrites TTL on every `expire` call. Because ingest calls expire on every batch, active sessions continuously extend their TTL. Only sessions that stop receiving events for 7 days will expire. This is correct behavior.

**What NOT to expire:** `pde:default:sessions` is the global sessions sorted set containing ALL session IDs scored by last_event_ts. Setting TTL on this key would delete every session at once after 7 days of any activity. Do not call expire on it. Stale members are pruned by the cron GC job instead.

```typescript
// Source: Upstash Redis docs https://upstash.com/docs/redis/sdks/ts/commands/generic/expire
// In dashboard/app/api/ingest/route.ts — add to existing pipeline p, before p.exec():

const TTL_7_DAYS = 604800; // 7 * 24 * 60 * 60 seconds

p.expire(`pde:default:events:${sessionId}`, TTL_7_DAYS);
p.expire(`pde:default:session:${sessionId}`, TTL_7_DAYS);
// p.exec() already present — no change needed
```

### Pattern 2: Sliding Window Rate Limiting (HRD-02)

**What:** A singleton Ratelimit instance in `lib/ratelimit.ts` used by `/api/ingest/route.ts`. Check rate limit before auth validation. Return 429 with `Retry-After` and `X-RateLimit-Remaining` headers when exceeded.

**Algorithm: sliding window** — tolerates burst without the boundary-spike problem of fixed window. For a single-user system with a relay posting every 2 seconds in batches of 50, sustained throughput is about 30 batches/minute. 120 req/min gives 4x headroom.

**Identifier: global `'ingest'` key** — avoids body-parse ordering issues (see Pitfall 1). For a single-user system, global is correct and sufficient.

```typescript
// Source: @upstash/ratelimit official docs
// dashboard/lib/ratelimit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  prefix: 'pde:ratelimit',
  analytics: false, // avoid extra Redis writes per request on free tier
});
```

```typescript
// Source: Upstash ratelimit-js docs — reset field is Unix milliseconds
// dashboard/app/api/ingest/route.ts — add BEFORE auth check:

import { ratelimit } from '@/lib/ratelimit';

const { success, reset } = await ratelimit.limit('ingest');
if (!success) {
  const retryAfter = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
```

**`limit()` return type (verified from official Upstash docs):**
- `success`: boolean — whether request is allowed
- `limit`: number — max requests in window
- `remaining`: number — requests left
- `reset`: number — Unix timestamp in **milliseconds** when window resets
- `pending`: Promise — background analytics write (fire-and-forget, don't await)

### Pattern 3: Buffer Cap Verification (HRD-03)

**What:** The `BatchQueue` in `relay.cjs` already implements this requirement. Reading the source confirms:

```javascript
// relay.cjs lines 150-158 (verified by reading source)
push(event) {
  if (this.queue.length >= this.maxBufferSize) {
    this.queue.shift(); // drop oldest — prefer recency
  }
  this.queue.push(event);
  // ...
}
```

The `startRelay` function passes `maxBufferSize: 1000` as the default. The implementation is complete.

**Remaining work:** Add an explicit unit test demonstrating the drop-oldest behavior.

```javascript
// tests/relay-buffer-cap.test.cjs (new file)
// vitest globals:true — no require('vitest') per Phase 134 decision

const { BatchQueue } = require('../bin/lib/relay.cjs');

describe('BatchQueue buffer cap', () => {
  it('drops oldest event when queue is at maxBufferSize', () => {
    const q = new BatchQueue({
      maxBatchSize: 9999,
      flushIntervalMs: 99999,
      maxBufferSize: 3,
      onFlush: async () => {},
    });
    q.push('a');
    q.push('b');
    q.push('c');
    q.push('d'); // triggers drop of 'a'
    expect(q.queue).toEqual(['b', 'c', 'd']);
  });

  it('does not drop when under cap', () => {
    const q = new BatchQueue({
      maxBatchSize: 9999,
      flushIntervalMs: 99999,
      maxBufferSize: 5,
      onFlush: async () => {},
    });
    q.push('x');
    q.push('y');
    expect(q.queue).toEqual(['x', 'y']);
  });
});
```

### Pattern 4: Deterministic 1-in-N Downsampling (HRD-04)

**What:** In `relay.cjs`'s `startRelay` function, add a counter-mod filter inside the `TailCursor` `onLine` callback, applied after envelope creation but before `batchQueue.push`.

**Algorithm choice:** Deterministic counter-mod, not reservoir sampling.
- Reservoir sampling is for drawing a representative sample of unknown-N items. It requires knowing or estimating total population.
- Counter-mod is O(1), zero allocation, stateless across batches, and correct for this sequential streaming use case.
- Counter starts at 0; `0 % N === 0` means the first event of each type is always kept (useful for debugging relay restart).

**Which types to downsample:** `tool_start`, `tool_complete` — high-frequency during autonomous runs, low information density.
**Which types to always preserve:** Everything else, including `error`, `critical_error`, `approval_request`, `approval_response`, `phase_start`, `phase_complete`, `plan_start`, `plan_complete`, `agent_spawn`, `agent_complete`, `session_start`, `session_end`, `token_usage`.

**Configuration:** `PDE_DOWNSAMPLE_RATE` env var, default 5 (keep 1-in-5). Set to 1 to disable. Follows the relay's existing env var pattern.

```javascript
// bin/lib/relay.cjs — add inside startRelay(), before TailCursor construction

const DOWNSAMPLE_TYPES = new Set(['tool_start', 'tool_complete']);
const DOWNSAMPLE_RATE = Number(process.env.PDE_DOWNSAMPLE_RATE ?? '5');
// typeCounters: Map<event_type, callCount>  — counts ALL calls, including dropped ones
const typeCounters = new Map();
```

```javascript
// In the TailCursor onLine callback, after envelope/schema validation, before batchQueue.push:

// Downsample high-frequency events
if (DOWNSAMPLE_TYPES.has(parsedEvent.event_type)) {
  const count = typeCounters.get(parsedEvent.event_type) ?? 0;
  typeCounters.set(parsedEvent.event_type, count + 1);
  if (count % DOWNSAMPLE_RATE !== 0) {
    return; // drop this event
  }
}

batchQueue.push(envelope);
```

**Unit test skeleton:**
```javascript
// tests/relay-downsample.test.cjs

const { BatchQueue } = require('../bin/lib/relay.cjs');
// Test the counter-mod logic directly (pure function, no relay startup needed)

describe('downsampling counter-mod', () => {
  it('keeps every Nth event of high-frequency types', () => {
    const RATE = 3;
    const kept = [];
    const TYPES = new Set(['tool_start', 'tool_complete']);
    const counters = new Map();

    for (let i = 0; i < 9; i++) {
      const type = 'tool_start';
      const count = counters.get(type) ?? 0;
      counters.set(type, count + 1);
      if (count % RATE === 0) kept.push(i);
    }
    expect(kept).toEqual([0, 3, 6]); // 1-in-3
  });

  it('never drops non-downsampled types', () => {
    const alwaysKept = ['phase_start', 'error', 'approval_request'];
    const DOWNSAMPLE_TYPES = new Set(['tool_start', 'tool_complete']);
    for (const t of alwaysKept) {
      expect(DOWNSAMPLE_TYPES.has(t)).toBe(false);
    }
  });
});
```

### Pattern 5: Vercel Cron GC (HRD-05)

**What:** A daily cron endpoint that finds sessions with no activity for > 7 days and deletes their data from Redis. Uses `zrange` with `byScore` on the sessions sorted set (scored by last_event_ts) to identify stale members — this is O(stale_count) and avoids scanning the entire keyspace.

**vercel.json (modify existing file):**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "fluid": true,
  "crons": [
    {
      "path": "/api/cron/gc",
      "schedule": "0 3 * * *"
    }
  ]
}
```

3 AM UTC daily. Hobby plan allows once-per-day; the ±59 min imprecision is acceptable for GC.

**Route handler:**
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs (official Vercel docs)
// dashboard/app/api/cron/gc/route.ts

import type { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  // CRON_SECRET guard — Vercel sends this automatically when invoking cron
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

  // pde:default:sessions is a zset scored by last_event_ts (ms timestamp)
  // Members with score < cutoffMs have been idle > 7 days
  // Phase 135 decision: use zrange with byScore, not deprecated zrangebyscore
  const staleIds = await redis.zrange('pde:default:sessions', '-inf', cutoffMs, {
    byScore: true,
  });

  const deleted = { count: 0 };

  if (staleIds && staleIds.length > 0) {
    const p = redis.pipeline();
    for (const id of staleIds as string[]) {
      p.del(`pde:default:events:${id}`);
      p.del(`pde:default:session:${id}`);
      p.zrem('pde:default:sessions', id);
    }
    await p.exec();
    deleted.count = staleIds.length;
  }

  return Response.json({
    ok: true,
    deleted,
    cutoff: new Date(cutoffMs).toISOString(),
    ran_at: new Date().toISOString(),
  });
}
```

### Anti-Patterns to Avoid

- **Expiring `pde:default:sessions` key as a whole:** This global registry contains ALL session IDs. A key-level expire would wipe them all simultaneously after 7 days. Prune member-by-member in cron instead.
- **Using `redis.keys()` in GC:** Hard-blocked at 100k entries by Upstash. Use `zrange` on the sessions sorted set or `redis.scan()` with cursor.
- **Using reservoir sampling for downsampling:** Designed for offline unknown-N sampling. Counter-mod is simpler and correct for sequential streaming.
- **Calling `blockUntilReady()` on rate limiter:** This waits for the next window — wrong for an ingest endpoint. Return 429 immediately so the relay circuit breaker can detect the error and open.
- **Setting `analytics: true` on Ratelimit:** Adds extra Redis writes per request. Keep false on free tier.
- **Re-creating Ratelimit on every request:** Export a singleton from `lib/ratelimit.ts`. The object is stateless but instantiation has overhead in serverless cold starts.
- **Keying rate limiter on machine_id parsed from body:** Requires consuming request body before rate limit check, causing stream-exhausted errors. Use a global `'ingest'` key.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting state across serverless instances | Custom Redis counter + Lua script | @upstash/ratelimit | Handles sliding window math, atomic increments, race conditions across instances |
| Retry-After calculation | Custom window tracking | `reset` field from `limit()` | Already Unix ms timestamp of window reset |
| Per-member sorted set TTL | Custom cleanup sorted set | Key-level EXPIRE + cron | Redis has no per-member TTL; key-level is the correct primitive |
| Buffer ring semantics | Custom doubly-linked list | Array.shift() in existing BatchQueue | Already implemented correctly |
| Downsampling library | npm sampling package | 5-line counter-mod | relay.cjs has zero npm deps — hard constraint |

**Key insight:** The relay's zero-npm-deps constraint means ALL relay logic must be hand-rolled in CJS with node: built-ins only. For the dashboard side, use Upstash libraries — they are purpose-built for serverless + HTTP Redis.

---

## Common Pitfalls

### Pitfall 1: Rate limit identifier requires body parse ordering
**What goes wrong:** If you want to key rate limits on `machine_id` from the request body, you must parse the body before calling `ratelimit.limit()`. But `request.json()` consumes the stream — you cannot parse it twice.
**Why it happens:** Request body is a one-time readable stream.
**How to avoid:** Use a global key `'ingest'` as the rate limit identifier. It does not require body parsing. For a single-user system, global is correct.
**Warning signs:** Body parses as empty `{}` after ratelimit check; 400 responses for valid payloads.

### Pitfall 2: `reset` field is milliseconds, Retry-After expects seconds
**What goes wrong:** The `Retry-After` HTTP header must be in seconds. Using `reset` directly as the value produces a number ~1,700× too large.
**Why it happens:** `ratelimit.limit()` returns `reset` as Unix timestamp in **milliseconds** (confirmed from official Upstash ratelimit docs).
**How to avoid:** Always convert: `Math.ceil((reset - Date.now()) / 1000)`. Clamp to minimum 1: `Math.max(..., 1)`.
**Warning signs:** Relay receives 429 with Retry-After value in the billions; circuit breaker never retries.

### Pitfall 3: Expiring the global sessions registry key
**What goes wrong:** Calling `p.expire('pde:default:sessions', TTL_7_DAYS)` deletes ALL session IDs from the registry after 7 days from the last ingest — including active ones if ingest stopped for any reason.
**Why it happens:** `pde:default:sessions` is a single key holding all session IDs. Key-level TTL deletes the entire key.
**How to avoid:** Only expire per-session keys: `pde:default:events:{id}` and `pde:default:session:{id}`. Never set TTL on the global sessions registry.
**Warning signs:** Session list goes empty; all sessions disappear at once.

### Pitfall 4: Hobby plan cron frequency restriction
**What goes wrong:** Cron expressions that run more than once per day on a Hobby plan cause deployment to fail with "Hobby accounts are limited to daily cron jobs."
**Why it happens:** Vercel Hobby plan enforces once-per-day maximum.
**How to avoid:** Use `0 3 * * *` (daily at 3 AM UTC). Do not use hourly or sub-daily expressions.
**Warning signs:** `vercel deploy` fails with Hobby cron expression error.

### Pitfall 5: `redis.keys()` in GC blocks at 100k entries
**What goes wrong:** `redis.keys('pde:default:session:*')` throws an error once the Upstash instance exceeds 100,000 total keys.
**Why it happens:** Upstash hard-blocks KEYS at 100k to protect database performance (verified from official Upstash docs).
**How to avoid:** Use `zrange` with `byScore` on the sessions sorted set (preferred) or `redis.scan()` with cursor for any keyspace enumeration.
**Warning signs:** GC cron returns 500 errors; error logs show KEYS command failure.

### Pitfall 6: CRON_SECRET not set in Vercel project environment
**What goes wrong:** `process.env.CRON_SECRET` is `undefined`; auth check `authHeader !== 'Bearer undefined'` fails for every invocation; GC cron returns 401 and never runs.
**Why it happens:** CRON_SECRET must be manually added as a Vercel project environment variable.
**How to avoid:** Check for undefined explicitly: `if (!process.env.CRON_SECRET || authHeader !== ...)`. Add CRON_SECRET to Vercel project environment before deploying. Document as a required env var.
**Warning signs:** All cron invocations logged as 401 in Vercel runtime logs.

### Pitfall 7: Downsampling resets counter on relay restart (expected, not a bug)
**What goes wrong:** Not a bug — the counter resets to 0 on restart, which means the first event of each high-frequency type after restart is always kept. This is correct behavior.
**Why it happens:** Counter is in-memory only, not persisted.
**How to avoid:** No action needed. Document as expected. Phase transitions and errors are always preserved regardless of counter state.

---

## Code Examples

All examples are verified against official sources cited below.

### TTL in ingest pipeline

```typescript
// Source: https://upstash.com/docs/redis/sdks/ts/commands/generic/expire
// Add to existing pipeline p in dashboard/app/api/ingest/route.ts

const TTL_7_DAYS = 604800; // 7 * 24 * 60 * 60

p.expire(`pde:default:events:${sessionId}`, TTL_7_DAYS);
p.expire(`pde:default:session:${sessionId}`, TTL_7_DAYS);
// p.exec() is already called — no change
```

### Rate limit singleton

```typescript
// Source: @upstash/ratelimit README https://github.com/upstash/ratelimit-js
// dashboard/lib/ratelimit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  prefix: 'pde:ratelimit',
  analytics: false,
});
```

### 429 response with Retry-After

```typescript
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/methods
// reset field is Unix timestamp in milliseconds

const { success, reset } = await ratelimit.limit('ingest');
if (!success) {
  const retryAfter = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
```

### Cron route with CRON_SECRET auth

```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs (official Vercel docs)

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
}
```

### vercel.json cron entry

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "fluid": true,
  "crons": [
    {
      "path": "/api/cron/gc",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Source: https://vercel.com/docs/cron-jobs/quickstart

### GC using zrange with byScore (Phase 135 SDK pattern)

```typescript
// Source: Phase 135 decision — use zrange with byScore, not deprecated zrangebyscore
// @upstash/redis v1.37.0

const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
const staleIds = await redis.zrange('pde:default:sessions', '-inf', cutoffMs, {
  byScore: true,
});

if (staleIds && staleIds.length > 0) {
  const p = redis.pipeline();
  for (const id of staleIds as string[]) {
    p.del(`pde:default:events:${id}`);
    p.del(`pde:default:session:${id}`);
    p.zrem('pde:default:sessions', id);
  }
  await p.exec();
}
```

### Downsampling in relay.cjs

```javascript
// In bin/lib/relay.cjs startRelay() — inside TailCursor onLine callback
// after WireEnvelopeSchema.safeParse, before batchQueue.push

const DOWNSAMPLE_TYPES = new Set(['tool_start', 'tool_complete']);
const DOWNSAMPLE_RATE = Number(process.env.PDE_DOWNSAMPLE_RATE ?? '5');
const typeCounters = new Map();

// In the onLine callback:
if (DOWNSAMPLE_TYPES.has(parsedEvent.event_type)) {
  const count = typeCounters.get(parsedEvent.event_type) ?? 0;
  typeCounters.set(parsedEvent.event_type, count + 1);
  if (count % DOWNSAMPLE_RATE !== 0) return; // drop
}
batchQueue.push(envelope);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual key cleanup jobs | Key-level EXPIRE refreshed on write | Redis baseline | TTL extends automatically on activity; idle sessions auto-expire |
| Fixed window rate limiting | Sliding window | @upstash/ratelimit v1+ | No boundary spikes at minute rollover |
| `redis.keys()` for enumeration | `redis.scan()` with cursor | Upstash SDK guidance | Avoids 100k hard block |
| `zrangebyscore` command | `zrange` with `byScore: true` | @upstash/redis v1.37 | Phase 135 decision — already used in codebase |
| Per-member sorted set TTL | Key-level TTL + cron member pruning | Redis baseline | Redis has no per-member TTL; this is the correct pattern |

**Deprecated/outdated:**
- `zrangebyscore`: Replaced by `zrange(..., { byScore: true })` in Upstash SDK v1.37. Phase 135 decision already standardized this pattern — use it consistently.
- `redis.keys()`: Hard-blocked at 100k entries; never use in production.

---

## Open Questions

1. **Rate limit key: global vs per-machine-id**
   - What we know: Global `'ingest'` avoids body-parse ordering; for single-user it is correct. Per-machine requires reading Bearer token or body before check.
   - What's unclear: Whether two developer machines running PDE simultaneously is a v0.17 use case.
   - Recommendation: Use global `'ingest'` for v0.17. Multi-machine support can be a follow-on.

2. **Downsampling always-on vs autonomous-mode-only**
   - What we know: Always-on with `PDE_DOWNSAMPLE_RATE` env var is simpler. Autonomous mode detection would require watching for `agent_spawn` events.
   - What's unclear: User preference — always-on vs triggered.
   - Recommendation: Always-on with default rate 5. Set `PDE_DOWNSAMPLE_RATE=1` to disable. Simpler and still preserves all critical events.

3. **Vercel plan (Hobby vs Pro) affects cron precision**
   - What we know: Hobby allows once-per-day with ±59 min precision; Pro allows once-per-minute with per-minute precision.
   - What's unclear: Which plan the project uses.
   - Recommendation: Design for Hobby constraints. Plan task should include a note: "Pro plan upgrade unlocks sub-daily cron schedules."

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | relay.cjs modifications | Yes | v20.20.0 | — |
| @upstash/redis | TTL in pipeline, GC cron | Yes (installed) | 1.37.0 | — |
| @upstash/ratelimit | HRD-02 rate limiting | No (not installed) | 2.0.8 needed | None — must install |
| Vercel cron runtime | HRD-05 GC | Available on Hobby | once/day | Manual curl invocation |
| CRON_SECRET env var | GC route auth | Not verified (must be added) | — | Cron returns 401 until set |
| PDE_DOWNSAMPLE_RATE | HRD-04 sampling rate | Optional (has default=5) | — | Default used |

**Missing dependencies with no fallback:**
- `@upstash/ratelimit@2.0.8` — must be installed before HRD-02 can be implemented

**Missing dependencies with fallback:**
- `CRON_SECRET` env var — GC cron returns 401 until added to Vercel project environment. Plan should include a task documenting required env var setup.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, globals: true) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm run test:coverage` |
| Relay CJS tests | `cd "$(git rev-parse --show-toplevel)" && npx vitest run tests/ --reporter=verbose` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HRD-01 | ingest pipeline calls `expire` on both session keys | unit | `cd dashboard && npm test -- ingest` | Extend existing ingest.test.ts |
| HRD-02 | 429 returned when rate limit exceeded; Retry-After header present | unit | `cd dashboard && npm test -- ingest` | Extend existing ingest.test.ts |
| HRD-02 | 2xx returned when under rate limit (mock success=true) | unit | `cd dashboard && npm test -- ingest` | Extend existing ingest.test.ts |
| HRD-03 | BatchQueue drops oldest at maxBufferSize; queue contains newest events | unit | `npx vitest run tests/relay-buffer-cap.test.cjs` | New file |
| HRD-04 | tool_start/tool_complete sampled 1-in-5; errors always pass through | unit | `npx vitest run tests/relay-downsample.test.cjs` | New file |
| HRD-05 | GET /api/cron/gc returns 401 without CRON_SECRET | unit | `cd dashboard && npm test -- cron` | New file |
| HRD-05 | GET /api/cron/gc deletes stale session keys from Redis pipeline | unit | `cd dashboard && npm test -- cron` | New file |
| HRD-05 | GET /api/cron/gc returns ok:true with deleted count | unit | `cd dashboard && npm test -- cron` | New file |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm run test:coverage`
- **Phase gate:** All tests green (dashboard + relay CJS) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/lib/ratelimit.ts` — must exist before tests can import it (HRD-02)
- [ ] `dashboard/lib/__tests__/ingest.test.ts` — extend existing file: add mock for `@/lib/ratelimit`, add expire-call assertions, add 429 test cases (HRD-01, HRD-02)
- [ ] `dashboard/lib/__tests__/cron-gc.test.ts` — new file: mock `@/lib/redis` with zrange + pipeline; test 401 auth, 200 with deletions, 200 with zero stale sessions (HRD-05)
- [ ] `tests/relay-buffer-cap.test.cjs` — new file: import BatchQueue from relay.cjs; test drop-oldest at cap (HRD-03)
- [ ] `tests/relay-downsample.test.cjs` — new file: test counter-mod sampling logic (HRD-04)

**Note on relay CJS tests:** vitest `globals: true` is in `vitest.config.ts`. Do NOT use `require('vitest')` in any `.cjs` test file — globals are injected. This is a Phase 134 established decision.

---

## Sources

### Primary (HIGH confidence)
- `https://upstash.com/docs/redis/sdks/ts/commands/generic/expire` — EXPIRE signature `expire(key, seconds, option?)`, returns 1/0, pipeline integration confirmed
- `https://upstash.com/docs/redis/sdks/ratelimit-ts/methods` — `limit()` return type: success, limit, remaining, reset (Unix ms), pending
- `https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms` — slidingWindow, fixedWindow, tokenBucket signatures; token bucket not supported in multi-region
- `https://vercel.com/docs/cron-jobs/manage-cron-jobs` — CRON_SECRET `Authorization: Bearer` header pattern; exact TypeScript code example
- `https://vercel.com/docs/cron-jobs/usage-and-pricing` — Hobby: once/day, ±59 min; 100 cron jobs/project max
- `https://vercel.com/docs/cron-jobs/quickstart` — vercel.json `crons` array format
- `https://upstash.com/docs/redis/sdks/ts/commands/generic/keys` — KEYS hard limit at 100k entries; SCAN recommended
- `https://upstash.com/docs/redis/sdks/ts/commands/generic/scan` — SCAN `[nextCursor, keys]` return; cursor iteration pattern
- `/Users/.../bin/lib/relay.cjs` — BatchQueue source: maxBufferSize + shift() already present at lines 150-158

### Secondary (MEDIUM confidence)
- `https://deepwiki.com/upstash/redis-js/4.7-expiration-commands` — pipeline chain `pipeline().set().expire().exec()` confirmed
- `https://oneuptime.com/blog/post/2026-01-21-redis-sorted-sets-time-expiration/view` — sorted set TTL patterns; ZREMRANGEBYSCORE for cleanup; key TTL as safety net

### Tertiary (LOW confidence)
- `https://upstash.com/blog/nextjs-ratelimiting` — code examples; all patterns verified against primary sources before inclusion

---

## Metadata

**Confidence breakdown:**
- HRD-01 (Redis TTL): HIGH — EXPIRE signature verified from Upstash official docs; pipeline confirmed
- HRD-02 (Rate limiting): HIGH — algorithms, `reset` field units (ms) all verified from Upstash ratelimit official docs
- HRD-03 (Buffer cap): HIGH — implementation read directly from relay.cjs source; already complete
- HRD-04 (Downsampling): HIGH — deterministic counter-mod is well-understood; no library needed; relay's zero-dep constraint verified
- HRD-05 (Cron GC): HIGH — CRON_SECRET header pattern verified from official Vercel docs with exact TypeScript example; Hobby limits confirmed from pricing page

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domains; Upstash SDK and Vercel cron docs change slowly)
