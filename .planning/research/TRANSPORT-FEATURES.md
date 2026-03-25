# Feature Landscape: PDE Event Transport

**Domain:** Real-time event transport from local CLI plugin to cloud PWA
**Researched:** 2026-03-24

## Table Stakes

Features the transport layer must have. Missing = architecture doesn't work.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fire-and-forget push from PDE | Hook timeout is 5s. Transport must never block. | Low | `node:https` request with no response handling |
| Local NDJSON fallback | Events must never be lost, even if network is down | Low | Already exists. No changes needed. |
| Event history replay | PWA must show full session when opened mid-session | Low | Upstash LRANGE on Redis LIST |
| Near-real-time delivery (<2s) | Dashboard must feel "live" not "stale" | Low | 1s polling interval achieves this |
| Zero npm deps on PDE side | Hard project constraint | Low | `node:https` + Upstash REST API |
| Session isolation | Events from different sessions must not mix | Low | Redis key namespacing: `events:{sessionId}` |
| Graceful degradation | If Upstash unreachable, PDE continues normally | Low | Fire-and-forget pattern. Errors swallowed. |

## Differentiators

Features that improve the transport but aren't strictly required for v1.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Batched pipeline pushes | Reduce HTTP calls 5-10x during bursts, conserve free tier | Low | 100ms buffer window, single `/pipeline` call |
| Event deduplication | Prevent duplicates if PDE retries | Low | Include event UUID in envelope, LPOS check or SET-based dedup |
| Automatic TTL/expiry | Clean up old sessions from Redis | Low | `EXPIRE events:{sid} 86400` after each push |
| Backpressure detection | Alert PWA if PDE is producing faster than transport can deliver | Medium | Track buffer depth in transport.cjs |
| Connection health indicator | PWA shows "connected" / "last event 5s ago" / "offline" | Low | Heartbeat events every 30s from PDE |
| Multi-session aggregation | PWA monitors multiple PDE sessions simultaneously | Medium | Multiple EventSource connections, unified state |
| Compression | Reduce bandwidth for large event payloads | Medium | gzip Content-Encoding on HTTPS requests |

## Anti-Features

Features to explicitly NOT build in the transport layer.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Bidirectional communication | Transport is one-way (PDE -> PWA). Adding PWA -> PDE creates complexity and security risk. | Build approval gates as separate feature with its own auth flow |
| Guaranteed delivery / exactly-once | Overkill for monitoring. Some duplicate or missed events are acceptable. | At-most-once with local NDJSON as ground truth |
| Event transformation in transport | Transport should be a dumb pipe. Don't parse/filter/transform events in transit. | PWA does all event interpretation |
| Custom protocol | Don't invent a protocol. Use HTTP + Redis commands. | Upstash REST API is the protocol |
| Persistent connections from PDE | PDE hooks are ephemeral processes. No long-lived connections possible. | Stateless HTTP POST per event/batch |
| Encryption beyond TLS | Events are monitoring data, not secrets. TLS (HTTPS) is sufficient. | Use HTTPS for Upstash REST API (default) |

## Feature Dependencies

```
Zero npm deps ──> node:https transport ──> Upstash REST API
                                              │
                                              ├──> LPUSH (durable storage)
                                              │       │
                                              │       └──> LRANGE (history replay)
                                              │
                                              └──> PUBLISH (real-time notification)
                                                      │
                                                      └──> SSE/polling in PWA

Local NDJSON fallback ──> independent (already exists, no changes)

Session isolation ──> Redis key namespacing ──> events:{sessionId}

Batched pushes ──> requires: buffer + flush timer in transport.cjs
                   enables: free tier conservation

TTL/expiry ──> requires: EXPIRE command after LPUSH
               enables: automatic cleanup

Heartbeat ──> requires: periodic timer in PDE (if long-running process exists)
              NOTE: may not be feasible with ephemeral hook processes
```

## MVP Recommendation

Prioritize for v1 transport:

1. **Fire-and-forget push** (table stakes -- transport doesn't work without this)
2. **Local NDJSON fallback** (already exists, just verify it still works alongside remote push)
3. **Event history replay** (table stakes -- PWA is useless without session history)
4. **Session isolation** (table stakes -- key namespacing, trivial)
5. **Automatic TTL** (differentiator but nearly free to implement -- one EXPIRE command)
6. **Batched pipeline pushes** (differentiator -- important for free tier, ~20 extra lines)

Defer:
- **Multi-session aggregation:** PWA feature, not transport feature. Transport handles one session at a time.
- **Backpressure detection:** Only matters at scale. Single user will never hit this.
- **Compression:** Events are <1KB each. Not worth the complexity.
- **Heartbeat:** Requires long-running process. PDE hooks are ephemeral. Reconsider when PDE v1 (standalone CLI) exists.

## Sources

- PDE event-bus.cjs source code (reviewed 2026-03-24)
- PDE emit-event.cjs hook handler (reviewed 2026-03-24)
- Upstash Redis REST API: https://upstash.com/docs/redis/features/restapi
- Upstash pricing: https://upstash.com/pricing/redis
