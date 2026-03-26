# Phase 139: Production Hardening - Research

**Researched:** 2026-03-25 (initial) / 2026-03-25 (maxdepth update)
**Domain:** Redis TTL/expiry, rate limiting, in-memory buffers, event downsampling, Vercel cron jobs
**Confidence:** HIGH (all five domains verified against official docs and source code)

---

## Summary

Phase 139 adds five production safety mechanisms to the existing Next.js/Upstash/relay-daemon stack. The work is purely additive — no existing behavior changes unless a guard condition triggers. Each domain is self-contained and can ship in a separate plan.

**Domain 1 — Redis TTL:** Redis key-level `EXPIRE` is the correct primitive. There is no per-member TTL in sorted sets; TTL applies to the key (the entire sorted set). The pattern is to call `expire` on two keys per session inside the existing ingest pipeline — the events sorted set and the session metadata hash. The global sessions registry sorted set must NOT be expired as a key. Seven days = 604800 seconds.

**Domain 2 — Rate Limiting:** `@upstash/ratelimit@2.0.8` is a first-class serverless library designed for exactly this use case. The sliding window algorithm is the right choice for this relay-to-ingest pattern: it tolerates burst without the boundary-spike problem of fixed window. The `limit()` return value includes a `reset` field in Unix milliseconds, which directly feeds the `Retry-After` header (convert: `Math.ceil((reset - Date.now()) / 1000)`). **Rate limit key: use global `'ingest'` key** — avoids body-parse ordering problems and is correct for single-user PDE.

**Domain 3 — Buffer Caps:** The `BatchQueue` in `relay.cjs` already has a `maxBufferSize = 1000` parameter with drop-oldest semantics via `queue.shift()`. **This requirement is already implemented AND already has a unit test** (Test 14 in `tests/phase-134/test-relay-batch.cjs` explicitly exercises `maxBufferSize: 3` with drop-oldest). HRD-03 is fully satisfied — no code and no new test file needed. The plan task should verify the existing test passes and add traceability.

**Domain 4 — Downsampling:** Use deterministic 1-in-N counter-based sampling (not reservoir sampling). **CRITICAL CORRECTION from maxdepth:** `tool_start` and `tool_complete` are NOT event types in the PDE system. The actual high-frequency events emitted during autonomous runs are `bash_called` (PostToolUse/Bash), `file_changed` (PostToolUse/Write+Edit), and `tool_called` (PostToolUse/other tools). `subagent_start`/`subagent_stop` are also emitted per-subagent. The downsample set should be `new Set(['bash_called', 'file_changed', 'tool_called'])`.

**Domain 5 — Cron GC:** Vercel cron jobs are configured in `vercel.json` under a `crons` array. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when invoking the endpoint. Hobby plan: once per day maximum, up to 100 cron jobs per project, with plus-or-minus 59 minute precision. The GC job should use `zrange` with `byScore: true` on the sessions sorted set (scored by last_event_ts) to find stale entries, then pipeline-delete their associated keys.

**Primary recommendation:** Implement in two plans — (1) TTL + rate limiting on the dashboard side (HRD-01, HRD-02, HRD-05 cron), (2) downsampling on the relay side (HRD-04). HRD-03 is already complete — verify existing test passes in Plan 2.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HRD-01 | Redis sorted sets have 7-day TTL — events older than 7 days are automatically expired | Key-level EXPIRE on events + session keys in ingest pipeline; 604800 seconds |
| HRD-02 | Ingest endpoint has rate limiting via @upstash/ratelimit preventing abuse | @upstash/ratelimit@2.0.8 sliding window; 429 with Retry-After header; global 'ingest' key |
| HRD-03 | Relay daemon has buffer cap (max 1000 events in memory) | ALREADY COMPLETE: BatchQueue.maxBufferSize + shift() at relay.cjs lines 150-158; Test 14 in tests/phase-134/test-relay-batch.cjs already covers this |
| HRD-04 | Event downsampling reduces high-frequency event volume at 1-in-N | Deterministic counter-mod in relay onLine callback; types are bash_called/file_changed/tool_called (NOT tool_start/tool_complete — those don't exist) |
| HRD-05 | Vercel cron job runs daily to garbage-collect expired sessions from Redis | vercel.json crons + CRON_SECRET auth; zrange byScore stale detection + pipeline delete |
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
| Buffer cap (HRD-03) | Pure JS — already in BatchQueue, test already exists | Implementation and test complete; zero-dep constraint on relay |
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
└── relay-downsample.test.cjs     # create: unit test for HRD-04
# NOTE: tests/phase-134/test-relay-batch.cjs Test 14 already covers HRD-03 — NO new buffer test needed
```

### Pattern 1: Redis Key-Level TTL (HRD-01)

**What:** Call `expire` on two per-session keys inside the existing ingest pipeline — the events sorted set and the session metadata hash. Add the expire calls to the same pipeline as the existing zadd/hset commands so it is one HTTP round-trip to Upstash.

**TTL refresh semantics:** Redis overwrites TTL on every `expire` call. Because ingest calls expire on every batch, active sessions continuously extend their TTL. Only sessions that stop receiving events for 7 days will expire. This is correct behavior.

**What NOT to expire:** `pde:default:sessions` is the global sessions sorted set containing ALL session IDs scored by last_event_ts. Setting TTL on this key would delete every session at once after 7 days of any activity. Do not call expire on it. Stale members are pruned by the cron GC job instead.

**What about approvals keys?** `pde:default:approvals:{sessionId}:{approvalId}` already has `expire(key, 3600)` in `writeApprovalResponse()` in `lib/queries.ts` — already handled. No additional action needed.

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

**Identifier: global `'ingest'` key** — avoids body-parse ordering issues (see Pitfall 1). For a single-user system, global is correct and sufficient. Verified: parsing body before rate limit check would exhaust the request stream.

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

### Pattern 3: Buffer Cap — Already Complete (HRD-03)

**Status: DONE. No code changes or new test files needed.**

Reading `bin/lib/relay.cjs` directly confirms the implementation at **lines 150-158**:

```javascript
// bin/lib/relay.cjs — BatchQueue.push() lines 150-158 (verified by source read)
push(event) {
  if (this.queue.length >= this.maxBufferSize) {
    this.queue.shift(); // drop oldest — prefer recency
  }
  this.queue.push(event);
  if (this.queue.length >= this.maxBatchSize) {
    this._flush();
  }
}
```

The `BatchQueue` constructor at **line 136** defaults `maxBufferSize = 1000`. The parameter is documented in the JSDoc at lines 130-135.

**Test coverage already exists:** `tests/phase-134/test-relay-batch.cjs` **Test 14** (lines 94-119) explicitly exercises `maxBufferSize: 3`, pushes 5 events, and asserts that only the 3 newest are flushed (`[3, 4, 5]`). This test covers HRD-03 completely.

**Plan task for HRD-03:** Verify `npx vitest run tests/phase-134/test-relay-batch.cjs` passes. Add traceability note. No code, no new test file.

### Pattern 4: Corrected Downsampling (HRD-04)

**CRITICAL: `tool_start` and `tool_complete` do not exist in the PDE event system.**

Reading `hooks/emit-event.cjs` lines 19-31 reveals the actual event types emitted from PostToolUse hooks:

```javascript
// hooks/emit-event.cjs — toolNameToEventType() lines 27-31
function toolNameToEventType(toolName) {
  if (toolName === 'Write' || toolName === 'Edit') return 'file_changed';
  if (toolName === 'Bash') return 'bash_called';
  return 'tool_called';
}
```

**Complete event type inventory from hooks.json + emit-event.cjs:**

| Hook Event | PDE Event Type | Frequency During Autonomous Run |
|------------|---------------|-------------------------------|
| SessionStart | `session_start` | 1 per session |
| SessionEnd | `session_end` | 1 per session |
| SubagentStart | `subagent_start` | ~2-8 per plan (one per spawned agent) |
| SubagentStop | `subagent_stop` + `token_usage` | ~2-8 per plan |
| PostToolUse/Write | `file_changed` | HIGH — every file write |
| PostToolUse/Edit | `file_changed` | HIGH — every file edit |
| PostToolUse/Bash | `bash_called` | HIGH — every bash call |
| PostToolUse/other | `tool_called` | MEDIUM — Read, Grep, Glob, etc. |

**Event frequency estimate during autonomous phase execution:**
- A typical GSD autonomous plan runs 2-6 subagents
- Each subagent executes ~10-30 tool calls (mix of Read, Grep, Write, Bash)
- Per-plan throughput: ~60-180 events over ~5-15 minutes = ~12-24 events/minute
- Peak autonomous mode (multi-plan, back-to-back): up to ~60 events/minute

**Downsample targets — CORRECTED:** `bash_called`, `file_changed`, `tool_called` are the correct high-frequency targets. `subagent_start`/`subagent_stop` are important lifecycle events and must NOT be downsampled.

**Always preserve (never downsample):**
`session_start`, `session_end`, `subagent_start`, `subagent_stop`, `token_usage`, `error`, `critical_error`, `approval_request`, `approval_response`, `phase_started`, `phase_complete`, `plan_started`, `plan_complete`, `experiment.start`, `experiment.iteration`, `experiment.complete`

**Where to downsample:** In `relay.cjs` `startRelay()`, inside the `TailCursor` `onLine` callback, after `WireEnvelopeSchema.safeParse`, before `batchQueue.push`. Downsampling happens at the relay (before send), not at ingest (before store). This reduces bandwidth and Upstash write costs.

**Autonomous mode detection:** The relay has NO signal for autonomous mode — `hooks.json` does not configure a PreToolUse hook and the relay only sees NDJSON lines from the event file. The `autonomous` field exists in plan frontmatter but is NOT emitted as an event type. Therefore: always-on downsampling is the only viable design. `PDE_DOWNSAMPLE_RATE=1` disables it.

```javascript
// bin/lib/relay.cjs — add inside startRelay(), BEFORE TailCursor construction
// CORRECTED: tool_start/tool_complete do not exist; use actual PDE event types

const DOWNSAMPLE_TYPES = new Set(['bash_called', 'file_changed', 'tool_called']);
const DOWNSAMPLE_RATE = Number(process.env.PDE_DOWNSAMPLE_RATE ?? '5');
// typeCounters: Map<event_type, callCount> — counts ALL calls including dropped ones
const typeCounters = new Map();
```

```javascript
// In the TailCursor onLine callback, after WireEnvelopeSchema.safeParse, before batchQueue.push:

// Downsample high-frequency tool events (HRD-04)
if (DOWNSAMPLE_TYPES.has(parsedEvent.event_type)) {
  const count = typeCounters.get(parsedEvent.event_type) ?? 0;
  typeCounters.set(parsedEvent.event_type, count + 1);
  if (count % DOWNSAMPLE_RATE !== 0) {
    return; // drop this event
  }
}

batchQueue.push(envelope);
```

**Unit test:**
```javascript
// tests/relay-downsample.test.cjs — new file
// vitest globals:true — NO require('vitest') per Phase 134 decision

describe('downsampling counter-mod', () => {
  it('keeps every Nth event of high-frequency types', () => {
    const RATE = 5;
    const kept = [];
    const TYPES = new Set(['bash_called', 'file_changed', 'tool_called']);
    const counters = new Map();

    for (let i = 0; i < 10; i++) {
      const type = 'bash_called';
      const count = counters.get(type) ?? 0;
      counters.set(type, count + 1);
      if (count % RATE === 0) kept.push(i);
    }
    expect(kept).toEqual([0, 5]); // 1-in-5 at indices 0 and 5
  });

  it('never drops non-downsampled types', () => {
    const DOWNSAMPLE_TYPES = new Set(['bash_called', 'file_changed', 'tool_called']);
    const alwaysKept = [
      'session_start', 'session_end', 'subagent_start', 'subagent_stop',
      'token_usage', 'error', 'critical_error', 'approval_request',
      'approval_response', 'phase_started', 'phase_complete',
    ];
    for (const t of alwaysKept) {
      expect(DOWNSAMPLE_TYPES.has(t)).toBe(false);
    }
  });

  it('counter increments independently per type', () => {
    const RATE = 3;
    const TYPES = new Set(['bash_called', 'file_changed']);
    const counters = new Map();
    const keptBash = [];
    const keptFile = [];

    for (let i = 0; i < 6; i++) {
      for (const type of TYPES) {
        const count = counters.get(type) ?? 0;
        counters.set(type, count + 1);
        if (count % RATE === 0) {
          if (type === 'bash_called') keptBash.push(i);
          else keptFile.push(i);
        }
      }
    }
    expect(keptBash).toEqual([0, 3]);
    expect(keptFile).toEqual([0, 3]);
  });
});
```

### Pattern 5: Vercel Cron GC (HRD-05)

**What:** A daily cron endpoint that finds sessions with no activity for > 7 days and deletes their data from Redis. Uses `zrange` with `byScore` on the sessions sorted set (scored by last_event_ts) to identify stale members — this is O(stale_count) and avoids scanning the entire keyspace.

**vercel.json (modify existing file — currently only contains `fluid: true`):**
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

3 AM UTC daily. Hobby plan allows once-per-day; the ±59 min imprecision is acceptable for GC. Hobby allows up to 100 cron jobs per project — this one is well within limits.

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
- **Using `redis.keys()` in GC:** At 100k+ total keys in the Upstash instance, the KEYS command returns empty (not an error, but silently wrong). Use `zrange` on the sessions sorted set or `redis.scan()` with cursor.
- **Using `tool_start`/`tool_complete` as downsample targets:** These event types do not exist in PDE. Actual high-frequency types from PostToolUse hooks are `bash_called`, `file_changed`, `tool_called`.
- **Using reservoir sampling for downsampling:** Designed for offline unknown-N sampling. Counter-mod is simpler and correct for sequential streaming.
- **Calling `blockUntilReady()` on rate limiter:** This waits for the next window — wrong for an ingest endpoint. Return 429 immediately so the relay circuit breaker can detect the error and open.
- **Setting `analytics: true` on Ratelimit:** Adds extra Redis writes per request. Keep false on free tier.
- **Re-creating Ratelimit on every request:** Export a singleton from `lib/ratelimit.ts`. The object is stateless but instantiation has overhead in serverless cold starts.
- **Keying rate limiter on machine_id parsed from body:** Requires consuming request body before rate limit check, causing stream-exhausted errors. Use a global `'ingest'` key.
- **Creating new relay buffer cap test file:** Test 14 in `tests/phase-134/test-relay-batch.cjs` already covers HRD-03. Creating a duplicate is waste.

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

## Redis Key Map (Complete)

All Redis keys currently in use across the dashboard codebase, verified by reading source:

| Key Pattern | Type | Purpose | Who Writes | Who Reads | Has TTL? |
|-------------|------|---------|------------|-----------|----------|
| `pde:default:sessions` | Sorted Set (score = last_event_ts ms) | Global session registry — all session IDs | ingest/route.ts (zadd on every batch) | queries.ts getSessions(), cron GC | NO — never expire; GC prunes members |
| `pde:default:events:{sessionId}` | Sorted Set (score = relay_ts ms) | All events for a session | ingest/route.ts (zadd per event) | events/route.ts, poll/route.ts, queries.ts getRecentEvents() | ADD in HRD-01 — 7 days |
| `pde:default:session:{sessionId}` | Hash | Session metadata (status, phase, plan, pending_approval_id) | ingest/route.ts (hset on every batch) | queries.ts getSessionMeta(), getSessions() | ADD in HRD-01 — 7 days |
| `pde:default:approvals:{sessionId}:{approvalId}` | Hash | Approval response (action, responded_at, responder_id) | queries.ts writeApprovalResponse() | queries.ts readApprovalResponse() | YES — 3600s (1 hour) already set in writeApprovalResponse() |
| `pde:ratelimit:*` | String/Hash (managed by @upstash/ratelimit) | Rate limit sliding window counters | @upstash/ratelimit library | @upstash/ratelimit library | YES — managed internally by library |

**Key observations:**
- `pde:default:approvals:*` keys already have TTL via `queries.ts` line 104 — no HRD-01 action needed
- `pde:ratelimit:*` keys are new (added by HRD-02) — library manages their TTL automatically
- The GC cron must delete: `pde:default:events:{id}`, `pde:default:session:{id}`, and `zrem` from `pde:default:sessions`
- The GC cron does NOT need to touch `pde:default:approvals:*` — those are already auto-expiring at 1 hour

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
**Why it happens:** Vercel Hobby plan enforces once-per-day maximum (verified from https://vercel.com/docs/cron-jobs/usage-and-pricing).
**How to avoid:** Use `0 3 * * *` (daily at 3 AM UTC). Do not use hourly or sub-daily expressions.
**Warning signs:** `vercel deploy` fails with Hobby cron expression error.

### Pitfall 5: `redis.keys()` in GC silently returns empty above 100k keys
**What goes wrong:** `redis.keys('pde:default:session:*')` returns an empty result (not a thrown error) when the Upstash instance has more than 100,000 total keys. GC appears to succeed but deletes nothing.
**Why it happens:** Upstash ignores KEYS commands on large databases to protect database performance. This is a silent failure — no exception is thrown. Source: GitHub issue report in medusajs/medusa#7552.
**How to avoid:** Use `zrange` with `byScore` on the sessions sorted set (preferred). The sessions sorted set is bounded by the number of sessions, not total key count, and is O(stale_count).
**Warning signs:** GC cron returns 200 with `deleted.count: 0` even when stale sessions exist.

### Pitfall 6: CRON_SECRET not set in Vercel project environment
**What goes wrong:** `process.env.CRON_SECRET` is `undefined`; auth check `authHeader !== 'Bearer undefined'` fails for every invocation; GC cron returns 401 and never runs.
**Why it happens:** CRON_SECRET must be manually added as a Vercel project environment variable.
**How to avoid:** Check for undefined explicitly: `if (!process.env.CRON_SECRET || authHeader !== ...)`. Add CRON_SECRET to Vercel project environment before deploying. Document as a required env var.
**Warning signs:** All cron invocations logged as 401 in Vercel runtime logs.

### Pitfall 7: Downsampling resets counter on relay restart (expected, not a bug)
**What goes wrong:** Not a bug — the counter resets to 0 on restart, which means the first event of each high-frequency type after restart is always kept. This is correct behavior.
**Why it happens:** Counter is in-memory only, not persisted.
**How to avoid:** No action needed. Document as expected. Phase transitions and errors are always preserved regardless of counter state.

### Pitfall 8: Using `tool_start`/`tool_complete` as downsample targets (wrong event types)
**What goes wrong:** No events are ever sampled; downsampling appears to work but has no effect. Events `tool_start` and `tool_complete` are never written to the NDJSON event file by any hook script.
**Why it happens:** These names don't match any PDE hook event mapping. The actual types are `bash_called`, `file_changed`, `tool_called` (mapped in `hooks/emit-event.cjs` `toolNameToEventType()`).
**How to avoid:** Use `new Set(['bash_called', 'file_changed', 'tool_called'])` as the downsample set.
**Warning signs:** Event log shows no reduction in volume despite downsampling being active.

---

## Code Examples

All examples are verified against official sources cited below.

### TTL in ingest pipeline

```typescript
// Source: https://upstash.com/docs/redis/sdks/ts/commands/generic/expire
// Add to existing pipeline p in dashboard/app/api/ingest/route.ts

const TTL_7_DAYS = 604800; // 7 * 24 * 60 * 60
// pde:default:approvals:* keys already have 1-hour TTL in queries.ts — no action needed here

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

### Corrected downsampling in relay.cjs

```javascript
// bin/lib/relay.cjs — inside startRelay(), BEFORE TailCursor construction
// CORRECTED: uses actual PDE event type names from hooks/emit-event.cjs

const DOWNSAMPLE_TYPES = new Set(['bash_called', 'file_changed', 'tool_called']);
const DOWNSAMPLE_RATE = Number(process.env.PDE_DOWNSAMPLE_RATE ?? '5');
const typeCounters = new Map();

// In the onLine callback, after WireEnvelopeSchema.safeParse, before batchQueue.push:
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
| `redis.keys()` for enumeration | `zrange` on sessions sorted set | Upstash behavior (100k limit) | Bounded query O(stale_count) instead of full keyspace scan |
| `zrangebyscore` command | `zrange` with `byScore: true` | @upstash/redis v1.37 | Phase 135 decision — already used in codebase |
| Per-member sorted set TTL | Key-level TTL + cron member pruning | Redis baseline | Redis has no per-member TTL; this is the correct pattern |

**Deprecated/outdated:**
- `zrangebyscore`: Replaced by `zrange(..., { byScore: true })` in Upstash SDK v1.37. Phase 135 decision already standardized this pattern — use it consistently.
- `redis.keys()`: Silently returns empty above 100k total keys in Upstash; never use in production code.

---

## Maxdepth Deep-Dive Findings

> This section records findings from the second-pass `--maxdepth` research pass. Each deep-dive area is marked RESOLVED or CORRECTED.

### Deep-Dive 1: HRD-03 Buffer Cap — RESOLVED (already done + already tested)

**Claim to verify:** BatchQueue in relay.cjs already has maxBufferSize=1000 with queue.shift() drop-oldest.

**Verification:** Read `bin/lib/relay.cjs` source directly.

- **Line 136:** `constructor({ maxBatchSize = 50, flushIntervalMs = 2000, maxBufferSize = 1000, onFlush })`
- **Lines 150-158:** `push()` checks `this.queue.length >= this.maxBufferSize` and calls `this.queue.shift()` before pushing the new event.
- `maxBufferSize = 1000` is a default parameter, NOT hardcoded. It is configurable via the constructor `opts` object.
- The `startRelay` function does NOT pass `maxBufferSize` explicitly — uses the default of 1000.
- **No race conditions:** Node.js is single-threaded; `setInterval` callbacks for flush and the `TailCursor` poll interval both run in the same event loop. There is no concurrent access.

**Test coverage finding:** `tests/phase-134/test-relay-batch.cjs` **Test 14** (lines 94-119) already tests `maxBufferSize: 3`, pushes 5 events, and asserts `[3, 4, 5]` are kept. This test fully covers HRD-03.

**Resolution:** HRD-03 is DONE. No code changes. No new test file. Plan task = run `npx vitest run tests/phase-134/test-relay-batch.cjs` and verify green. Add traceability.

### Deep-Dive 2: Upstash redis.keys() Limit — RESOLVED (behavior clarified)

**Claim to verify:** redis.keys() is hard-blocked at 100k entries in Upstash.

**Verification:** Official Upstash docs do not document the limit explicitly. Cross-referenced with GitHub issue medusajs/medusa#7552 (May 2024):

> "Upstash is ignoring KEYS commands when redis sizes > 100k keys."

**Exact behavior:** The KEYS command **returns empty / is ignored** — it does NOT throw an error or return an error code. This is a silent failure. The 100k threshold is an implementation limit in Upstash's serverless infrastructure, not a documented API error.

**SCAN command:** Upstash lists SCAN as supported and recommended as the alternative to KEYS. No documented limit on SCAN found.

**Correct alternative for this codebase:** `zrange` with `byScore: true` on `pde:default:sessions` is superior to even SCAN here because:
1. It returns exactly the stale sessions (score < cutoff) in one query
2. It is bounded by session count, not total key count
3. No cursor iteration needed for normal session volumes

**Resolution:** The anti-pattern note is corrected — behavior is silent empty result, not an error. The solution (use zrange) remains unchanged.

### Deep-Dive 3: Rate Limit Key Strategy — RESOLVED (global 'ingest' key is correct)

**Question:** Global 'ingest' key vs per-machine-id key?

**Research findings:**

Reading `dashboard/app/api/ingest/route.ts`: machine_id is embedded in the `WireEnvelope` (validated by `WireEnvelopeSchema`) but is only accessible after `request.json()` and `BatchSchema.safeParse()` — both consume the request body stream. There is no way to extract machine_id without body parsing first.

The current ingest flow: (1) validate Bearer token, (2) parse JSON, (3) validate schema. Rate limiting must happen before step 2 to protect against large/malformed payloads. Body stream cannot be read twice.

**Calculated event volume:** A single relay in autonomous mode generates ~12-24 batches/minute (batch every 2s when active, idle periods in between). The relay's `flushIntervalMs = 2000` and `batchSize = 50` means:
- Peak: 1 batch every 2 seconds = 30 batches/minute
- Typical: 1 batch every 4-10 seconds = 6-15 batches/minute
- With a 120 req/min window: 4-8x safety margin on typical, 4x on peak

**Decision: global `'ingest'` key.** Rationale:
- Single-user PDE: only one relay per user per session
- Body parse ordering makes per-machine impossible without architectural change
- 120 req/min is 4x the peak throughput; circuit breaker opens before relay hammers the limit
- Multi-machine is an explicit non-goal for v0.17

**Resolution:** Use global `'ingest'` key. 120 req/min sliding window. No per-machine complexity needed.

### Deep-Dive 4: Downsampling Strategy — RESOLVED (always-on, corrected event types)

**Question:** Always-on vs autonomous-mode-only? What events to downsample?

**Research findings:**

1. **Autonomous mode detection is impossible at the relay.** The relay reads NDJSON events from a file. The `autonomous` field is plan frontmatter metadata, not an event. No `autonomous_mode_start` or similar event is ever emitted. There is no hook for `PreAgentStart` or similar signal. The relay cannot distinguish autonomous from interactive runs.

2. **Actual event types emitted by hooks (verified from hooks/emit-event.cjs):**
   - `session_start` — SessionStart hook
   - `session_end` — SessionEnd hook
   - `subagent_start` — SubagentStart hook
   - `subagent_stop`, `token_usage` — SubagentStop hook
   - `file_changed` — PostToolUse/Write, PostToolUse/Edit
   - `bash_called` — PostToolUse/Bash
   - `tool_called` — PostToolUse/other tools
   - **`tool_start` and `tool_complete` DO NOT EXIST** — confirmed by grepping all hook scripts and pde-tools.cjs

3. **Event frequency during autonomous GSD phase execution:**
   - Each subagent: ~15-40 tool calls (Read, Grep, Write, Bash, Edit)
   - `bash_called` and `file_changed` are highest frequency (Bash + Write/Edit per task)
   - `tool_called` is medium frequency (Read, Grep, Glob)
   - Estimated peak: 60-100 tool events per minute during active autonomous execution with multiple parallel subagents

4. **Dashboard need for tool-level granularity:** The live event log (MON-03) has type filtering. `bash_called`/`file_changed` events show activity but at 1-in-5, the dashboard still shows visible activity every ~10 seconds. Critical events (errors, approvals, phase transitions) are always shown.

**Decision: always-on downsampling** of `bash_called`, `file_changed`, `tool_called` at 1-in-5. `PDE_DOWNSAMPLE_RATE=1` disables. Rationale:
- Autonomous mode detection is architecturally impossible
- Always-on is simpler and still useful during interactive runs (prevents log flooding)
- Preserves all critical events unconditionally
- The first event of each type after relay start is always kept (count 0 % RATE === 0)

**Location: relay (before send)**, not ingest (before store). Reduces bandwidth to Upstash and write operations. No ingest-side changes needed.

**Resolution:** Always-on with corrected event types. DOWNSAMPLE_TYPES = `['bash_called', 'file_changed', 'tool_called']`.

### Deep-Dive 5: Vercel Plan Tier — RESOLVED (Hobby confirmed, design for Hobby)

**Question:** Hobby vs Pro plan?

**Research findings:**

Reading `dashboard/vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "fluid": true
}
```

The `"fluid": true` field is the only non-schema field. This tells us:
- Fluid Compute is enabled (allows up to 300s function duration, already used in events/route.ts `maxDuration = 300`)
- Fluid Compute is available on ALL plans including Hobby — this is NOT a Pro-only feature

**Cron limits confirmed from https://vercel.com/docs/cron-jobs/usage-and-pricing:**
| Plan | Cron jobs per project | Min interval | Precision |
|------|----------------------|--------------|-----------|
| Hobby | 100 | Once per day | ±59 min |
| Pro | 100 | Once per minute | Per-minute |

**No Pro-only features in current codebase.** The `maxDuration = 300` in events/route.ts is Fluid Compute, which is available on Hobby.

**Phase 139 plan-tier impact:**
- HRD-05 (cron GC): Hobby-compatible with `0 3 * * *` (once per day). Daily GC is sufficient — TTL handles per-key expiry; GC cleans the sessions registry.
- HRD-02 (rate limiting): No plan-tier impact — @upstash/ratelimit uses Upstash Redis, not Vercel infrastructure.

**Decision: design for Hobby.** The `0 3 * * *` cron schedule is safe on Hobby. No Pro-only features needed for Phase 139. If the project ever upgrades to Pro, the cron could run more frequently, but daily is sufficient.

**Resolution:** Hobby plan confirmed from `vercel.json` absence of Pro-only features. All Phase 139 work is Hobby-compatible.

### Deep-Dive 6: Complete Redis Key Structure — RESOLVED

**All keys documented in the Redis Key Map section above.** Summary:

- **4 key patterns** in use
- **2 key patterns** need HRD-01 TTL: `pde:default:events:{id}` and `pde:default:session:{id}`
- **1 key pattern** already has TTL: `pde:default:approvals:{sessionId}:{approvalId}` (1 hour, set in `lib/queries.ts:104`)
- **1 key pattern** must NEVER get TTL: `pde:default:sessions` (global registry — GC prunes members instead)
- **1 key pattern** added by HRD-02: `pde:ratelimit:*` (TTL managed by @upstash/ratelimit library)

The GC cron must delete exactly 3 things per stale session: `pde:default:events:{id}` (del), `pde:default:session:{id}` (del), and remove from `pde:default:sessions` (zrem).

---

## Open Questions

All open questions from the initial research are now resolved:

1. **Rate limit key: global vs per-machine-id** — RESOLVED: global `'ingest'` key. Body parse ordering makes per-machine impossible. Single-user constraint makes global correct.

2. **Downsampling always-on vs autonomous-mode-only** — RESOLVED: always-on with `DOWNSAMPLE_TYPES = ['bash_called', 'file_changed', 'tool_called']`. Autonomous mode is undetectable from relay. `PDE_DOWNSAMPLE_RATE=1` disables.

3. **Vercel plan (Hobby vs Pro)** — RESOLVED: Hobby confirmed. All Phase 139 features are Hobby-compatible. `0 3 * * *` cron schedule is safe.

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
| HRD-01 | ingest pipeline calls `expire` on `pde:default:events:{id}` and `pde:default:session:{id}` | unit | `cd dashboard && npm test -- ingest` | Extend existing ingest.test.ts |
| HRD-02 | 429 returned when rate limit exceeded; Retry-After header present | unit | `cd dashboard && npm test -- ingest` | Extend existing ingest.test.ts |
| HRD-02 | 2xx returned when under rate limit (mock success=true) | unit | `cd dashboard && npm test -- ingest` | Extend existing ingest.test.ts |
| HRD-03 | BatchQueue drops oldest at maxBufferSize; queue contains newest events | unit | `npx vitest run tests/phase-134/test-relay-batch.cjs` | YES — Test 14 in existing file |
| HRD-04 | bash_called/file_changed/tool_called sampled 1-in-5; session_start/error/approval_request always pass through | unit | `npx vitest run tests/relay-downsample.test.cjs` | New file |
| HRD-05 | GET /api/cron/gc returns 401 without CRON_SECRET | unit | `cd dashboard && npm test -- cron` | New file |
| HRD-05 | GET /api/cron/gc deletes stale session keys from Redis pipeline | unit | `cd dashboard && npm test -- cron` | New file |
| HRD-05 | GET /api/cron/gc returns ok:true with deleted count | unit | `cd dashboard && npm test -- cron` | New file |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm run test:coverage`
- **Phase gate:** All tests green (dashboard + relay CJS) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/lib/ratelimit.ts` — must exist before tests can import it (HRD-02)
- [ ] `dashboard/lib/__tests__/ingest.test.ts` — extend existing file: add mock for `@/lib/ratelimit`, add expire-call assertions on BOTH session keys, add 429 test cases (HRD-01, HRD-02)
- [ ] `dashboard/lib/__tests__/cron-gc.test.ts` — new file: mock `@/lib/redis` with zrange + pipeline; test 401 auth, 200 with deletions, 200 with zero stale sessions (HRD-05)
- [ ] `tests/relay-downsample.test.cjs` — new file: test counter-mod with CORRECTED type names (bash_called, file_changed, tool_called) (HRD-04)

**NOT a gap:** `tests/relay-buffer-cap.test.cjs` — do NOT create this; Test 14 in `tests/phase-134/test-relay-batch.cjs` already covers HRD-03.

**Note on relay CJS tests:** vitest `globals: true` is in `vitest.config.ts`. Do NOT use `require('vitest')` in any `.cjs` test file — globals are injected. This is a Phase 134 established decision.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/relay.cjs` lines 130-158 — BatchQueue source: maxBufferSize default 1000, shift() at lines 150-158, verified by direct source read
- `tests/phase-134/test-relay-batch.cjs` lines 94-119 — Test 14 verifies HRD-03 with maxBufferSize: 3 and drop-oldest assertion
- `hooks/emit-event.cjs` lines 19-31 — HOOK_TO_EVENT_TYPE map and toolNameToEventType(): actual PDE event types confirmed
- `hooks/hooks.json` — complete hook configuration: SubagentStart, SubagentStop, PostToolUse (Write|Edit|Bash), SessionStart, SessionEnd
- `dashboard/app/api/ingest/route.ts` — complete ingest pipeline: all Redis key writes and TTL insertion points
- `dashboard/lib/queries.ts` lines 90-118 — writeApprovalResponse() already calls expire(key, 3600) on approval keys
- `dashboard/vercel.json` — current vercel.json: `fluid: true` only (no crons array yet)
- `https://upstash.com/docs/redis/sdks/ts/commands/generic/expire` — EXPIRE signature `expire(key, seconds, option?)`, returns 1/0, pipeline integration confirmed
- `https://upstash.com/docs/redis/sdks/ratelimit-ts/methods` — `limit()` return type: success, limit, remaining, reset (Unix ms), pending
- `https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms` — slidingWindow, fixedWindow, tokenBucket signatures
- `https://vercel.com/docs/cron-jobs/manage-cron-jobs` — CRON_SECRET `Authorization: Bearer` header pattern
- `https://vercel.com/docs/cron-jobs/usage-and-pricing` — Hobby: once/day, ±59 min, 100 cron jobs/project max (verified 2026-03-25)

### Secondary (MEDIUM confidence)
- `https://github.com/medusajs/medusa/issues/7552` — Upstash KEYS behavior at >100k keys: "ignoring KEYS commands" (silent empty result, not error)
- `https://deepwiki.com/upstash/redis-js/4.7-expiration-commands` — pipeline chain `pipeline().set().expire().exec()` confirmed

### Tertiary (LOW confidence)
- `https://upstash.com/blog/nextjs-ratelimiting` — code examples; all patterns verified against primary sources before inclusion

---

## Metadata

**Confidence breakdown:**
- HRD-01 (Redis TTL): HIGH — EXPIRE signature verified from Upstash official docs; pipeline confirmed; exact insertion point confirmed from ingest/route.ts source
- HRD-02 (Rate limiting): HIGH — algorithms, `reset` field units (ms) all verified from Upstash ratelimit official docs; global key strategy confirmed by source analysis
- HRD-03 (Buffer cap): HIGH — implementation AND test confirmed by direct source reads of relay.cjs and test-relay-batch.cjs
- HRD-04 (Downsampling): HIGH — event type names confirmed from hooks/emit-event.cjs source; counter-mod logic is well-understood; relay zero-dep constraint verified
- HRD-05 (Cron GC): HIGH — CRON_SECRET header pattern verified from official Vercel docs; Hobby limits confirmed from pricing page; vercel.json content confirmed from source read

**Research date:** 2026-03-25 (initial) / 2026-03-25 (maxdepth)
**Valid until:** 2026-04-25 (stable domains; Upstash SDK and Vercel cron docs change slowly)
