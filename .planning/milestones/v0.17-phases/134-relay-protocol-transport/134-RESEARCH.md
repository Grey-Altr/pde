# Phase 134: Relay Protocol and Transport Module — Research

**Researched:** 2026-03-24
**Domain:** Node.js file-tailing relay daemon, circuit breaker, Upstash Redis sorted sets, zero-dep HTTPS transport
**Confidence:** HIGH (all 10 domains verified against official sources or official npm packages)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RLY-01 | Relay daemon tails local NDJSON files and batches events via HTTP POST using only `node:https` (zero npm deps) | Domain 1 (file tailing), Domain 5 (node:https POST), Domain 2 (batching) |
| RLY-02 | Event wire protocol envelope with seq, session_id, machine_id, timestamp, approval_id validated by zod | Domain 6 (wire protocol), Domain 3 (zod) — zod is already in packages/pde-mcp-server |
| RLY-03 | Circuit breaker: stop pushing after N consecutive failures, auto-recover after cooldown | Domain 3 (circuit breaker state machine) |
| RLY-04 | Gated behind `PDE_REMOTE` env var — disabled by default, local-only flow unchanged | Domain 4 (env gate), Domain 7 (daemon lifecycle) |
| RLY-05 | Relay failures fully swallowed — PDE session never blocks, slows, or errors due to relay | Domain 8 (zero-impact isolation) |
</phase_requirements>

---

## Summary

The relay module is a push-based fire-and-forget daemon that tails `/tmp/pde-session-{sessionId}.ndjson` files (written by the existing `event-bus.cjs` `safeAppendEvent` function) and POSTs batched events to the dashboard ingest endpoint. The key architectural insight is that this daemon must be completely detached from PDE's execution path — it is a side-car process that observes without interfering.

The zero-npm-deps constraint (RLY-01) is the defining constraint for the transport layer. Node.js `node:https` is fully capable of making POST requests to Upstash REST API with keep-alive connections and socket timeouts. The Upstash `/pipeline` REST endpoint accepts multiple ZADD commands in a single HTTP POST as a 2D JSON array, making batching straightforward. The relay daemon never touches Upstash directly — it POSTs to the dashboard's `/api/ingest` endpoint, which handles Redis.

For file tailing, `@logdna/tail-file` (v4.0.2, zero dependencies of its own, uses only Node.js core) is the standard, but since RLY-01 requires zero npm deps, a custom polling tailing loop using `fs.open`/`fs.read` with byte-offset cursor tracking is required. This is a well-understood 30-line pattern. The critical edge cases (file rotation, truncation, deletion) are documented and manageable with inode/size stat checks.

The circuit breaker (RLY-03) must be hand-rolled because adding `opossum` (9.0.0) would violate the zero-npm-deps constraint. A minimal circuit breaker with CLOSED/OPEN/HALF-OPEN states is approximately 50 lines of code and is sufficient for this use case — the full opossum feature set (prometheus metrics, event emitters, rolling windows) is not needed.

**Primary recommendation:** Implement a single `bin/lib/relay.cjs` module with three sub-components: `TailCursor` (polling file reader), `BatchQueue` (time+count batching), and `CircuitBreaker` (hand-rolled, 3-state). Gate the whole thing behind `process.env.PDE_REMOTE`. Start via a dedicated `start-relay.cjs` hook or from `session-start` hook using `child_process.spawn` with `detached: true` and `unref()`.

---

## Standard Stack

### Core (all zero additional npm deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in | File open/read/stat for cursor-based tailing | Only reliable zero-dep option for file I/O |
| `node:https` | built-in | HTTP POST to ingest endpoint | Required by RLY-01; Node v20+ `globalAgent` has `keepAlive: true` and 5s timeout by default |
| `node:crypto` | built-in | `randomUUID()` for idempotency keys | Same pattern already in event-bus.cjs |
| `node:os` | built-in | `os.tmpdir()`, `os.hostname()` for machine_id | Same pattern already in event-bus.cjs |
| `node:child_process` | built-in | `spawn` with `detached: true` / `unref()` for daemon isolation | Standard Node.js daemon pattern |

### Supporting (existing project deps — not new)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.25.0 (already in pde-mcp-server) | Wire protocol envelope validation | Use for RLY-02 schema definition and runtime validation of outbound events |

**Zod is already a project dependency** (in `packages/pde-mcp-server/package.json`). The relay module lives in `bin/lib/` which uses CJS `require()`. If the relay is a standalone CJS file that does not go through the mcp-server package's node_modules, zod must either be (a) required from the mcp-server package's node_modules path, or (b) the envelope validation is done without zod and zod is used only in the dashboard ingest endpoint (Phase 135). Given RLY-02 says "validated by zod schema," the schema definition should live in a shared location. **Recommendation: define the zod schema in the relay module and validate outbound envelopes there; resolve zod from pde-mcp-server/node_modules or install it at the project root.**

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled tailing | `@logdna/tail-file` v4.0.2 | @logdna/tail-file has zero deps and excellent inode/rotation handling, but adding any npm dep violates RLY-01 |
| Hand-rolled circuit breaker | `opossum` v9.0.0 | Opossum requires Node >=20 (met), provides prometheus metrics and event emitters; rejected because it adds an npm dep |
| `node:https` | `fetch` global (Node 18+) | fetch is available in Node 20; simpler API but `node:https` is more explicit about socket/agent control and is well-documented for keep-alive |
| Polling tailing | `fs.watch` or `fs.watchFile` | fs.watch emits `rename` for all events on macOS, does not provide filenames reliably; fs.watchFile is simpler but polling-only; for a single known file, polling with `setInterval` + `fs.stat` is most portable |

**Version verification (2026-03-24):**
- `@logdna/tail-file`: 4.0.2 (last published ~1 year ago, maintenance stable)
- `opossum`: 9.0.0 (last published ~10 months ago)
- `@upstash/redis`: 1.37.0 (active)
- `zod`: 4.3.6 (active — note: zod v4 is the current major, though pde-mcp-server pins `^3.25.0` which resolves v3)

---

## Architecture Patterns

### Recommended Project Structure

```
bin/lib/
├── relay.cjs                # Main relay module: TailCursor + BatchQueue + CircuitBreaker
│                            # Exported: startRelay(sessionId, opts), stopRelay()
hooks/
├── start-relay.cjs          # SessionStart hook: spawns relay daemon if PDE_REMOTE is set
└── stop-relay.cjs           # SessionEnd hook: sends SIGTERM to relay PID (pid file in /tmp)
tests/phase-134/
├── test-relay-tail.cjs      # TailCursor unit tests: cursor advance, rotation, truncation
├── test-relay-circuit.cjs   # CircuitBreaker unit tests: state transitions, cooldown
├── test-relay-protocol.cjs  # Wire protocol / envelope schema tests
└── test-relay-e2e.cjs       # Integration: write NDJSON -> relay -> mock HTTP endpoint
```

### Pattern 1: Zero-Dep File Tailing with Byte-Offset Cursor

**What:** Poll a single known file path with `setInterval`, track read position via byte offset, read new bytes with `fs.read`, split on newlines, parse JSON.

**When to use:** When the file path is known at startup, zero npm deps are required, and the file is append-only (NDJSON from `safeAppendEvent`).

**Key considerations:**
- The NDJSON file is at `/tmp/pde-session-{sessionId}.ndjson` (from `event-bus.cjs`)
- `fs.appendFileSync` in `safeAppendEvent` writes one complete JSON line terminated by `\n` atomically under normal conditions
- Use `fs.stat` to detect file growth before opening a read stream
- Track `lastPosition` (byte offset) and only read bytes >= lastPosition
- On `stat.size < lastPosition`: file was truncated — reset cursor to 0
- On `stat.ino !== lastIno`: file was rotated/replaced — reset cursor to 0, update inode

```javascript
// Source: Node.js fs docs + @logdna/tail-file-node pattern
// bin/lib/relay.cjs — TailCursor implementation sketch

const fs = require('node:fs');
const path = require('node:path');

class TailCursor {
  constructor(filePath, onLine) {
    this.filePath = filePath;
    this.onLine = onLine;  // callback(lineString)
    this.position = 0;     // byte offset cursor
    this.lastIno = null;   // inode for rotation detection
    this.remainder = '';   // incomplete line buffer
    this._interval = null;
  }

  start(intervalMs = 500) {
    this._interval = setInterval(() => this._poll(), intervalMs);
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  _poll() {
    let stat;
    try { stat = fs.statSync(this.filePath); } catch { return; } // file not yet created

    // Rotation detection: inode changed
    if (this.lastIno !== null && stat.ino !== this.lastIno) {
      this.position = 0;
      this.remainder = '';
    }
    this.lastIno = stat.ino;

    // Truncation detection: file shrank
    if (stat.size < this.position) {
      this.position = 0;
      this.remainder = '';
    }

    if (stat.size === this.position) return; // no new data

    const length = stat.size - this.position;
    const buf = Buffer.allocUnsafe(length);
    const fd = fs.openSync(this.filePath, 'r');
    try {
      const bytesRead = fs.readSync(fd, buf, 0, length, this.position);
      this.position += bytesRead;
    } finally {
      fs.closeSync(fd);
    }

    const chunk = this.remainder + buf.toString('utf8');
    const lines = chunk.split('\n');
    this.remainder = lines.pop(); // last element may be incomplete
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this.onLine(trimmed);
    }
  }
}
```

### Pattern 2: Event Batch Queue (Time + Count Window)

**What:** Accumulate events in an array, flush when either `maxBatchSize` is reached or `flushIntervalMs` elapses, whichever comes first.

**When to use:** Always — batching reduces HTTP round-trips and amortizes connection setup cost.

**Key considerations:**
- Hard cap at 1000 events in memory (HRD-03 requirement, Phase 139 — but implement the cap in Phase 134 for safety)
- When cap is reached, drop oldest events (ring-buffer semantics), not newest — monitoring data prefers recency
- Use `setInterval` for time-based flush, clear interval on `stop()`

```javascript
// Source: Optimizely SDK event batching pattern (verified)
class BatchQueue {
  constructor({ maxBatchSize = 50, flushIntervalMs = 2000, maxBufferSize = 1000, onFlush }) {
    this.queue = [];
    this.maxBatchSize = maxBatchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize = maxBufferSize;
    this.onFlush = onFlush; // async (events[]) => void
    this._timer = null;
  }

  push(event) {
    if (this.queue.length >= this.maxBufferSize) {
      this.queue.shift(); // drop oldest when buffer is full
    }
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      this._flush();
    }
  }

  start() {
    this._timer = setInterval(() => this._flush(), this.flushIntervalMs);
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    return this._flush(); // flush remaining events on shutdown
  }

  _flush() {
    if (this.queue.length === 0) return Promise.resolve();
    const batch = this.queue.splice(0, this.maxBatchSize);
    return this.onFlush(batch).catch(() => {}); // swallow — circuit breaker handles errors
  }
}
```

### Pattern 3: Hand-Rolled Circuit Breaker (3-State)

**What:** Track consecutive failures; open the circuit after N failures; attempt recovery after cooldown; return to closed on success.

**When to use:** This exact pattern — not opossum — because zero npm deps.

**Key difference from opossum:** No rolling window, no error percentage threshold — just consecutive failure count. Simpler and sufficient for a single downstream endpoint.

```javascript
// Source: Circuit breaker pattern literature (verified structure)
// States: CLOSED (normal) | OPEN (failing fast) | HALF_OPEN (testing recovery)
const CB_CLOSED = 'CLOSED';
const CB_OPEN = 'OPEN';
const CB_HALF_OPEN = 'HALF_OPEN';

class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownMs = 30000 }) {
    this.state = CB_CLOSED;
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this._openedAt = null;
  }

  // Returns true if the call should be allowed through
  canAttempt() {
    if (this.state === CB_CLOSED) return true;
    if (this.state === CB_OPEN) {
      if (Date.now() - this._openedAt >= this.cooldownMs) {
        this.state = CB_HALF_OPEN;
        return true; // let one probe through
      }
      return false; // still in cooldown
    }
    if (this.state === CB_HALF_OPEN) return true; // probe attempt allowed
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = CB_CLOSED;
  }

  recordFailure() {
    this.failureCount++;
    if (this.state === CB_HALF_OPEN) {
      // probe failed — re-open
      this.state = CB_OPEN;
      this._openedAt = Date.now();
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CB_OPEN;
      this._openedAt = Date.now();
    }
  }
}
```

### Pattern 4: Zero-Dep HTTP POST with node:https

**What:** Use `https.request()` with a keep-alive `Agent` to POST JSON batches to the ingest endpoint.

**Key considerations:**
- Node.js v19+ `https.globalAgent` already has `keepAlive: true` and 5s timeout by default — no custom Agent needed for basic use
- Use explicit `timeout` option in request options for per-request socket timeout
- Always register `req.on('error')` — socket errors throw if unhandled
- Drain the response body to release the socket back to the connection pool
- Use `AbortSignal.timeout(ms)` for request-level timeout (Node 18+ via `node:https` timeout option)

```javascript
// Source: Node.js HTTPS docs (nodejs.org/api/https.html)
const https = require('node:https');

function postEvents(url, bearerToken, events) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(events);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${bearerToken}`,
      },
      timeout: 10000, // socket inactivity timeout ms
    };

    const req = https.request(options, (res) => {
      // CRITICAL: drain response body to release socket
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ ok: true, status: res.statusCode });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      req.destroy(new Error('request timeout'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

**IMPORTANT — drain the response body:** If you do not consume or drain the response body (via `res.resume()` or reading it), Node.js will NOT release the underlying socket back to the keep-alive pool. This causes socket exhaustion over time.

### Pattern 5: Wire Protocol Envelope

**What:** Every event on the wire is wrapped in a relay envelope that adds relay-specific fields to the existing PDE event structure.

**Key fields required by RLY-02:**
- `seq` — monotonically increasing integer per session (not globally unique; just ordering within a session)
- `session_id` — PDE session UUID (already in event-bus.cjs envelopes)
- `machine_id` — `os.hostname()` or `crypto.createHash('sha256').update(os.hostname()).digest('hex').slice(0,16)` for privacy
- `timestamp` — ISO 8601 string (already in event-bus.cjs envelopes as `ts`)
- `approval_id` — `null` for non-approval events; UUID for approval request events

```javascript
// Source: zod docs (zod.dev) + RLY-02 requirements
// Zod schema for wire envelope (validate before sending)
const { z } = require('zod'); // from packages/pde-mcp-server/node_modules/zod

const WireEnvelopeSchema = z.object({
  // Relay metadata
  seq: z.number().int().nonnegative(),
  session_id: z.string().uuid(),
  machine_id: z.string().min(1),
  relay_ts: z.string().datetime(), // ISO 8601 when relay processed the event
  approval_id: z.string().uuid().nullable(),

  // Original PDE event fields (pass-through)
  schema_version: z.string(),
  ts: z.string().datetime(),       // original event timestamp from event-bus
  event_type: z.string().min(1),
  extensions: z.record(z.unknown()).optional(),
}).passthrough(); // allow additional PDE fields (tool_name, file_path, etc.)

// Use safeParse — never throw on validation failure
const result = WireEnvelopeSchema.safeParse(envelope);
if (!result.success) {
  // log and skip; never throw
}
```

### Pattern 6: Daemon Lifecycle — Spawn + Detach + PID File

**What:** Start the relay as a detached child process from the `SessionStart` hook; stop it from `SessionEnd` via a PID file.

**Why detached, not same-process:** The relay's `setInterval` polling and `setInterval` batching would keep a Node.js process alive even when Claude Code expects the hook to exit. The relay must not block hook exit.

**PID file location:** `/tmp/pde-relay-{sessionId}.pid` — same `/tmp` directory pattern as NDJSON files.

**Preventing duplicate relay instances:** Before spawning, check if a PID file exists and if the process at that PID is still alive (`process.kill(pid, 0)` — zero signal checks existence without killing).

```javascript
// Source: Node.js child_process docs (nodejs.org/api/child_process.html)
// hooks/start-relay.cjs (called from SessionStart hook)

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function startRelayDaemon(sessionId) {
  if (!process.env.PDE_REMOTE) return; // RLY-04: gate

  const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

  // Check for existing relay (nested session guard)
  if (fs.existsSync(pidFile)) {
    const existingPid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
    try {
      process.kill(existingPid, 0); // throws if process doesn't exist
      return; // relay already running
    } catch {
      // stale PID file — proceed to spawn
    }
  }

  const relayScript = path.join(__dirname, '..', 'bin', 'lib', 'relay.cjs');
  const child = spawn(process.execPath, [relayScript, sessionId], {
    detached: true,
    stdio: 'ignore', // CRITICAL: must not inherit parent stdio
    env: { ...process.env },
  });

  fs.writeFileSync(pidFile, String(child.pid), 'utf8');
  child.unref(); // allow parent (hook) to exit without waiting for child
}
```

### Pattern 7: Zero-Impact Error Isolation (RLY-05)

**What:** All relay code that could fail must be wrapped in try/catch that swallows exceptions. Unhandled rejections from relay operations must never propagate to PDE.

**The Node.js v15+ trap:** Since Node.js 15, unhandled promise rejections crash the process by default. Any async operation in the relay that is not `await`-ed or `.catch()`-ed can crash Claude Code itself.

**Mitigation:**
1. In the relay process (`relay.cjs`): register `process.on('unhandledRejection', () => {})` at startup
2. In the relay process: wrap all top-level async operations in try/catch
3. The relay is a separate process (`detached: true`) — even if it crashes, the parent Claude Code session is unaffected
4. In the SessionStart hook: any relay startup failure is caught and silently swallowed

```javascript
// Source: Node.js process docs
// relay.cjs top of file
process.on('unhandledRejection', (_reason, _promise) => {
  // Swallow — relay crash must never propagate
});
process.on('uncaughtException', (_err) => {
  // Swallow — relay crash must never propagate
  process.exit(0); // exit cleanly so parent sees normal exit
});
```

### Anti-Patterns to Avoid

- **`fs.watch` for the NDJSON file:** On macOS, `fs.watch` emits `rename` for every change and does not reliably report filenames. For a single known file in `/tmp`, `setInterval` + `fs.stat` polling is more reliable and simpler.
- **Reading the entire NDJSON file on each poll:** Always read from `lastPosition` offset only. Reading the whole file grows memory linearly with session length.
- **`req.write(body)` without registering `req.on('error')`:** This is an unhandled error in Node.js that crashes the process.
- **Not draining the response body:** Causes socket pool exhaustion — `res.resume()` is required even when you don't care about the response body.
- **Awaiting relay HTTP calls from the same process as PDE:** Any await in PDE's synchronous hook chain blocks Claude Code. The relay must be async-only, in a separate process.
- **Using `opossum` or any npm dep:** Violates RLY-01.
- **Starting relay inside the `event-bus.cjs` dispatch path:** Would add latency to every event emission. The relay polls the NDJSON file independently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NDJSON line parsing | Custom regex splitter | Split on `\n`, `JSON.parse()` each non-empty line | NDJSON spec IS newline-delimited JSON; no special parser needed |
| Event envelope validation | Manual field checks | Zod `safeParse()` | Zod already in project; safeParse returns discriminated union without throw |
| `machine_id` uniqueness | Custom UUID | `os.hostname()` or stable hash of hostname | Relay identifies the sending machine, not a session; hostname is sufficient |
| HTTP response reading | Full response body collector | `res.resume()` | You only need status code; draining releases the socket |
| Sequence numbers | Distributed sequence | Simple per-session counter starting at 0 | Sequence is per-session, not global; a module-level integer is sufficient |

**Key insight:** The relay does not talk to Upstash directly. It POSTs to `/api/ingest` on the dashboard. All Redis complexity lives in Phase 135. The relay's job is file → HTTP POST → done.

---

## Common Pitfalls

### Pitfall 1: macOS fs.watch Emits "rename" for Every Change

**What goes wrong:** Developer uses `fs.watch('/tmp/pde-session-X.ndjson', callback)` expecting `change` events. On macOS, `fs.watch` emits `rename` for nearly all events (create, write, rename, delete). The callback fires with `eventType: 'rename'` and `filename: null`. This is a 10+ year known Node.js issue.

**Why it happens:** Node.js `fs.watch` uses kqueue(2) on macOS, which tracks inodes. When a file is written via `O_APPEND` (as `safeAppendEvent` does), kqueue fires a rename-class event.

**How to avoid:** Use `setInterval` + `fs.stat()` polling. Poll every 500ms. Compare `stat.size` to `lastPosition`. If size grew, read the new bytes.

**Warning signs:** Tests pass on Linux CI but fail on macOS development machines.

### Pitfall 2: Socket Exhaustion from Undrained Response Bodies

**What goes wrong:** Relay makes many POST requests. Sockets accumulate in `CLOSE_WAIT` state. After hundreds of events, the process hangs waiting for sockets.

**Why it happens:** Node.js HTTP keep-alive keeps sockets open. If the response body is not consumed, the socket is not returned to the pool. With keep-alive, this eventually exhausts the pool.

**How to avoid:** Always call `res.resume()` after checking `res.statusCode`, even when you don't read the response body.

**Warning signs:** Relay works for a few minutes then silently stops sending, without the circuit breaker triggering.

### Pitfall 3: Unhandled Promise Rejection Crashes Claude Code

**What goes wrong:** An async function in the relay code (inside `setInterval` callback or `onFlush`) throws an unhandled rejection. Since Node.js 15, this crashes the process. The relay code runs in the same process as the hook if not properly detached, meaning Claude Code crashes.

**Why it happens:** `setInterval(async () => { ... })` — the async callback's returned promise is not awaited or `.catch()`-ed. If the async function throws, it becomes an unhandled rejection.

**How to avoid:** (1) Run relay in a detached subprocess. (2) Register `process.on('unhandledRejection', () => {})` in relay.cjs. (3) Wrap all `setInterval` async callbacks in try/catch.

**Warning signs:** Claude Code sessions silently crash when `PDE_REMOTE` is set; session never shows `SessionEnd`.

### Pitfall 4: Multiple Relay Instances for Nested Sessions

**What goes wrong:** PDE supports nested subagent sessions. `SessionStart` fires for each subagent. Without a guard, each `SessionStart` spawns a new relay for the same NDJSON file.

**Why it happens:** The `SessionStart` hook fires for every session, including subagent sessions. Multiple relays read the same file from position 0 and send duplicate events.

**How to avoid:** Write a PID file to `/tmp/pde-relay-{sessionId}.pid` when the relay starts. Before spawning, check if the PID file exists and the process is alive (`process.kill(pid, 0)` — no-op signal checks existence). Use the PDE `session_id` (not Claude Code's `session_id`) as the file key.

**Warning signs:** Dashboard shows duplicate events with identical content but different `seq` numbers from the same session.

### Pitfall 5: Circuit Breaker Blocks PDE When Called Synchronously

**What goes wrong:** Circuit breaker check or HTTP POST is called synchronously in the hook path, adding latency to every Claude Code operation.

**Why it happens:** Developer puts the relay flush call inside `event-bus.cjs` dispatch() rather than in the separate polling loop.

**How to avoid:** The relay daemon only reads the NDJSON file that `event-bus.cjs` writes. The relay has zero interaction with `event-bus.cjs`. All network I/O is in the relay's own `setInterval` loop in a detached process.

**Warning signs:** Claude Code feels slow; hook timing shows spikes > 5ms on tool calls.

### Pitfall 6: File Not Yet Created on Relay Startup

**What goes wrong:** Relay starts before the first event is emitted (i.e., before `SessionStart` triggers the first `safeAppendEvent`). `fs.statSync(filePath)` throws ENOENT.

**Why it happens:** The NDJSON file `/tmp/pde-session-{sessionId}.ndjson` is created lazily by the first `safeAppendEvent` call, which happens during `SessionStart` hook execution — concurrent with relay startup.

**How to avoid:** Wrap `fs.statSync` in try/catch; return early if file doesn't exist yet. The polling loop will retry on the next interval.

### Pitfall 7: Sorted Set Key TTL vs Member Expiry (Phase 135 concern, documented here)

**What goes wrong (Phase 135):** Developer uses `EXPIRE` on the sorted set key, which expires the entire key at once. Sessions within the 7-day window get deleted early if they were created close to an older session's expiry.

**Why it happens:** Redis `EXPIRE` applies to the whole key, not individual members. A sorted set like `events:{session_id}` should use `EXPIRE` set to 7 days from the last write, not from the key creation.

**How to avoid:** Use `ZADD` with `score = Date.now()`, and call `EXPIRE events:{session_id} 604800` (7 days in seconds) after each batch insertion, refreshing the TTL. Or use `ZREMRANGEBYSCORE` in a cron job to clean up old members within a shared key (Phase 139 pattern).

**Note:** Individual sorted set members cannot have independent TTLs in Redis — this is a known Redis limitation. The standard workaround is key-per-session + key-level TTL.

---

## Code Examples

### Complete relay.cjs Skeleton

```javascript
// Source: Synthesis of Node.js docs + patterns above
// bin/lib/relay.cjs — invoked as child process: node relay.cjs <sessionId>
'use strict';

const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

// Swallow all unhandled errors — relay must NEVER crash Claude Code
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => { process.exit(0); });

const sessionId = process.argv[2];
if (!sessionId) process.exit(0);

const NDJSON_PATH = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
const INGEST_URL = process.env.PDE_REMOTE_URL || '';
const BEARER_TOKEN = process.env.PDE_REMOTE_TOKEN || '';
const MACHINE_ID = crypto.createHash('sha256').update(os.hostname()).digest('hex').slice(0, 16);

// --- Circuit Breaker, TailCursor, BatchQueue instantiation ---
// (see patterns above)

// Graceful shutdown: flush remaining events then exit
process.on('SIGTERM', () => {
  tail.stop();
  queue.stop().then(() => process.exit(0));
});
```

### Envelope Schema (Zod)

```javascript
// Source: zod.dev docs + RLY-02 requirements
const { z } = require('../../packages/pde-mcp-server/node_modules/zod');

const RelayEnvelopeSchema = z.object({
  seq:         z.number().int().nonnegative(),
  session_id:  z.string().uuid(),
  machine_id:  z.string().min(1),
  relay_ts:    z.string().datetime(),
  approval_id: z.string().uuid().nullable().default(null),
  // Pass-through PDE event fields
  schema_version: z.string().default('1.0'),
  ts:          z.string().datetime(),
  event_type:  z.string().min(1),
}).passthrough();

function buildEnvelope(seq, pdeEvent) {
  return RelayEnvelopeSchema.safeParse({
    seq,
    session_id:  sessionId,
    machine_id:  MACHINE_ID,
    relay_ts:    new Date().toISOString(),
    approval_id: pdeEvent.approval_id || null,
    ...pdeEvent,
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fs.watch` for file change detection | `setInterval` + `fs.stat` polling for known files | Ongoing — fs.watch macOS issues are longstanding | More reliable on macOS; portable |
| Rolling-window circuit breaker (opossum) | Simple consecutive-failure counter for single-endpoint relays | Design choice for zero-dep | 50-line implementation vs 2MB dep |
| Chokidar for file watching | Built-in `fs` module polling for single known files | Chokidar v5 is now ESM-only (Nov 2025) | Chokidar v5 requires ESM; CJS projects cannot require it without dynamic import |
| Streaming NDJSON parsers | Manual `split('\n')` + `JSON.parse` | N/A | NDJSON spec IS newline splitting; libraries add no value |
| `http.Agent` with manual keepAlive config | Node.js v19+ `https.globalAgent` keepAlive: true by default | Node.js v19.0.0 | No custom Agent needed; just use default global agent |

**Deprecated/outdated:**
- `chokidar` v4 and earlier: Still CommonJS compatible, but v5 is ESM-only. Since PDE uses CJS (all `bin/lib/*.cjs` files), avoid chokidar for new code.
- `tail` npm package: Last significant maintenance 2020. Zero activity. Do not use.
- `node-tail` (github.com/lucagrulla/node-tail): Zero npm deps, but inactive since 2022. Do not use.

---

## Runtime State Inventory

This phase is greenfield — no existing relay infrastructure. No runtime state migration needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — relay module does not exist yet | None |
| Live service config | None — PDE_REMOTE not set by default | None |
| OS-registered state | None — no existing daemon PIDs | None |
| Secrets/env vars | `PDE_REMOTE` (gate), `PDE_REMOTE_URL`, `PDE_REMOTE_TOKEN` — new env vars to be defined | Document in GETTING-STARTED.md |
| Build artifacts | None | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Relay daemon runtime | ✓ | v20.20.0 | — |
| `node:https` | RLY-01 zero-dep HTTP | ✓ | built-in | — |
| `node:fs` | RLY-01 file tailing | ✓ | built-in | — |
| `node:crypto` | machine_id, approval_id | ✓ | built-in | — |
| `zod` | RLY-02 validation | ✓ (via pde-mcp-server) | 3.x (^3.25.0 pinned) | Omit schema validation in relay; validate at ingest endpoint (Phase 135) |
| Upstash Redis | RLY-01 (via ingest endpoint) | Not needed in Phase 134 | — | Phase 135 concern |
| vercel CLI | Deployment (Phase 135+) | ✓ | 50.28.0 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `zod` in relay.cjs: If zod cannot be resolved from the project root, validate envelope fields manually (check for required string/number fields) and defer full schema validation to the dashboard ingest endpoint.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 20.20.0) — consistent with all prior phases |
| Config file | None — tests run directly via `node` |
| Quick run command | `node tests/phase-134/test-relay-tail.cjs` |
| Full suite command | `node tests/phase-134/test-relay-tail.cjs && node tests/phase-134/test-relay-circuit.cjs && node tests/phase-134/test-relay-protocol.cjs && node tests/phase-134/test-relay-e2e.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RLY-01 | TailCursor advances byte offset correctly on new data | unit | `node tests/phase-134/test-relay-tail.cjs` | ❌ Wave 0 |
| RLY-01 | TailCursor detects file truncation and resets cursor | unit | `node tests/phase-134/test-relay-tail.cjs` | ❌ Wave 0 |
| RLY-01 | TailCursor detects file rotation (inode change) and resets cursor | unit | `node tests/phase-134/test-relay-tail.cjs` | ❌ Wave 0 |
| RLY-01 | BatchQueue flushes when maxBatchSize reached | unit | `node tests/phase-134/test-relay-tail.cjs` | ❌ Wave 0 |
| RLY-01 | BatchQueue flushes after flushIntervalMs regardless of count | unit | `node tests/phase-134/test-relay-tail.cjs` | ❌ Wave 0 |
| RLY-01 | HTTP POST to mock server receives correct Authorization header and JSON body | integration | `node tests/phase-134/test-relay-e2e.cjs` | ❌ Wave 0 |
| RLY-02 | WireEnvelopeSchema validates valid envelope with all required fields | unit | `node tests/phase-134/test-relay-protocol.cjs` | ❌ Wave 0 |
| RLY-02 | WireEnvelopeSchema rejects envelope missing session_id | unit | `node tests/phase-134/test-relay-protocol.cjs` | ❌ Wave 0 |
| RLY-02 | seq increments monotonically per processed event | unit | `node tests/phase-134/test-relay-protocol.cjs` | ❌ Wave 0 |
| RLY-03 | CircuitBreaker opens after N consecutive failures | unit | `node tests/phase-134/test-relay-circuit.cjs` | ❌ Wave 0 |
| RLY-03 | CircuitBreaker transitions OPEN→HALF_OPEN after cooldownMs | unit | `node tests/phase-134/test-relay-circuit.cjs` | ❌ Wave 0 |
| RLY-03 | CircuitBreaker transitions HALF_OPEN→CLOSED on success | unit | `node tests/phase-134/test-relay-circuit.cjs` | ❌ Wave 0 |
| RLY-03 | CircuitBreaker transitions HALF_OPEN→OPEN on failure | unit | `node tests/phase-134/test-relay-circuit.cjs` | ❌ Wave 0 |
| RLY-04 | Relay does not start when PDE_REMOTE is unset | unit | `node tests/phase-134/test-relay-e2e.cjs` | ❌ Wave 0 |
| RLY-05 | HTTP POST failure (mock 500) does not throw from relay onFlush | unit | `node tests/phase-134/test-relay-e2e.cjs` | ❌ Wave 0 |
| RLY-05 | Socket error does not propagate beyond relay process | integration | `node tests/phase-134/test-relay-e2e.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/phase-134/test-relay-tail.cjs && node tests/phase-134/test-relay-circuit.cjs && node tests/phase-134/test-relay-protocol.cjs`
- **Per wave merge:** Full suite command above
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-134/test-relay-tail.cjs` — covers RLY-01 (TailCursor unit tests)
- [ ] `tests/phase-134/test-relay-circuit.cjs` — covers RLY-03 (CircuitBreaker state machine)
- [ ] `tests/phase-134/test-relay-protocol.cjs` — covers RLY-02 (envelope schema)
- [ ] `tests/phase-134/test-relay-e2e.cjs` — covers RLY-01 HTTP, RLY-04, RLY-05 (uses `http.createServer` as mock endpoint — no external deps)

### Integration Test Pattern for HTTP POST (zero deps)

```javascript
// Source: Node.js http docs — use built-in http.createServer as mock endpoint
const http = require('node:http');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('relay posts events to ingest endpoint', async (t) => {
  let received = null;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      received = JSON.parse(body);
      res.writeHead(200);
      res.end('{}');
    });
  });

  await new Promise(resolve => server.listen(0, resolve)); // port 0 = OS-assigned
  const { port } = server.address();

  // Call relay postEvents with http:// (not https://) against localhost
  // ... relay sends events ...

  assert.ok(received.length > 0);
  server.close();
});
```

---

## Open Questions

1. **Zod resolution path in relay.cjs**
   - What we know: Zod 3.x is in `packages/pde-mcp-server/node_modules/zod`. The relay lives in `bin/lib/relay.cjs`.
   - What's unclear: Whether `require('zod')` resolves correctly from `bin/lib/` or whether an explicit path `require('../../packages/pde-mcp-server/node_modules/zod')` is needed. The project has no root-level `node_modules`.
   - Recommendation: Use the explicit path in relay.cjs. Alternatively, install zod at the project root with `npm install --no-save zod@^3` — but this adds a file to the repo. Best option: define the zod schema only in the Phase 135 ingest endpoint (Next.js, where zod is trivially available) and do lightweight manual field validation in relay.cjs.

2. **NDJSON file path when relay starts before SessionStart event**
   - What we know: NDJSON file is created by `safeAppendEvent` lazily on first event. Relay is spawned by `SessionStart` hook. Both happen "at session start."
   - What's unclear: Race condition window between relay spawn and first NDJSON write. `spawnSync` vs `spawn` for relay startup?
   - Recommendation: Relay polls every 500ms; ENOENT on first 1-2 polls is normal. Handle gracefully with try/catch in `_poll()`.

3. **approval_id field for Phase 134 scope**
   - What we know: RLY-02 requires `approval_id` in the envelope. Approval gate logic is Phase 137.
   - What's unclear: Should `approval_id` be `null` for all Phase 134 events, or should the relay populate it from a PDE hook payload?
   - Recommendation: Set `approval_id: null` for all events in Phase 134. Phase 137 will add the mechanism to populate it.

4. **PDE session_id vs Claude Code session_id**
   - What we know: `event-bus.cjs` generates a PDE session UUID independently. Claude Code's hook payload also contains a `session_id` field. The NDJSON filename uses the PDE session UUID.
   - What's unclear: Which session_id to use in the relay envelope's `session_id` field.
   - Recommendation: Use the PDE session UUID (from the NDJSON filename) — it is stable for the lifetime of the session and is already in every event envelope from `event-bus.cjs`.

---

## Sources

### Primary (HIGH confidence)
- Node.js HTTPS docs (nodejs.org/api/https.html) — https.request options, Agent, timeout
- Node.js File System docs (nodejs.org/api/fs.html) — fs.statSync, fs.readSync, fs.openSync
- Node.js child_process docs (nodejs.org/api/child_process.html) — spawn detached/unref, fork IPC
- Node.js test runner docs (nodejs.org/api/test.html) — node:test, mock.fn
- Opossum docs (nodeshift.dev/opossum/) — circuit breaker state machine, config options
- @logdna/tail-file README (github.com/logdna/tail-file-node) — TailFile API, events, rotation/truncation
- Upstash REST API docs (upstash.com/docs/redis/features/restapi) — pipeline, ZADD syntax
- Zod docs (zod.dev) — safeParse, discriminated unions, passthrough

### Secondary (MEDIUM confidence)
- npm registry versions verified 2026-03-24: @logdna/tail-file@4.0.2, opossum@9.0.0, zod@4.3.6
- Upstash Pipeline blog (upstash.com/blog/pipeline) — verified pipeline batching pattern
- Node.js GitHub issue #7420 — fs.watch rename event on macOS (confirmed longstanding)
- Circuit breaker pattern implementations — multiple sources cross-verify CLOSED/OPEN/HALF-OPEN state machine

### Tertiary (LOW confidence)
- WebSearch findings on batch queue patterns — general Node.js ecosystem consensus, not single authoritative source
- WebSearch findings on daemon lifecycle patterns — common practice, not official spec

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all built-in Node.js modules verified against official docs; zod version verified via npm view
- Architecture: HIGH — patterns synthesized from official docs and verified library READMEs
- Pitfalls: HIGH — macOS fs.watch issue verified against Node.js GitHub issues; socket drain issue from Node.js docs; unhandled rejection behavior from Node.js 15 release notes
- Testing: HIGH — consistent with project's established node:test pattern (phases 130-133)

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stable — Node.js built-ins and Upstash REST API are stable APIs; chokidar ESM status is now settled)
