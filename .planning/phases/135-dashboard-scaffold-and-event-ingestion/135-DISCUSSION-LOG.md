# Phase 135: Dashboard Scaffold and Event Ingestion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 135-dashboard-scaffold-and-event-ingestion
**Areas discussed:** Redis key design, SSE vs polling strategy, Session list & status card UI, Auth & token flow

---

## Redis Key Design

### Session registry structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single sorted set registry | One sorted set pde:sessions with session_id as member, last_event_ts as score | |
| Hash-per-session registry | Hash pde:session:{id} with metadata fields (status, phase, started_at) | |
| Both — sorted set index + hash metadata | Sorted set for listing/ordering + hash per session for metadata | ✓ |

**User's choice:** Both — sorted set index + hash metadata
**Notes:** Most flexible approach, enables both time-range queries and rich per-session metadata

### Key naming convention

| Option | Description | Selected |
|--------|-------------|----------|
| pde:{user}:events:{session_id} | User-scoped keys, future-proof for multi-user | ✓ |
| pde:events:{session_id} | Flat namespace, single-user assumption | |
| You decide | Claude picks during planning | |

**User's choice:** pde:{user}:events:{session_id}
**Notes:** Future-proof for multi-user

### Batch ingest approach

| Option | Description | Selected |
|--------|-------------|----------|
| Redis pipeline | Upstash Redis pipeline() to batch all ops in one round-trip | ✓ |
| Sequential writes | Write each event individually | |
| You decide | Claude picks during implementation | |

**User's choice:** Redis pipeline
**Notes:** None

---

## SSE vs Polling Strategy

### Event delivery method

| Option | Description | Selected |
|--------|-------------|----------|
| SSE-first with auto-fallback | SSE Route Handler with heartbeat detection, auto-switch to polling | ✓ |
| Polling only | Poll /api/events every 2-3s, skip SSE entirely | |
| SSE with manual toggle | Default SSE, user can manually switch to polling in UI | |

**User's choice:** SSE-first with auto-fallback
**Notes:** None

### Polling interval

| Option | Description | Selected |
|--------|-------------|----------|
| 3 seconds | ~20 reads/min per client, good balance | ✓ |
| 1 second | Lowest latency, 60 reads/min | |
| 5 seconds | Conservative, lower cost but laggy | |
| You decide | Claude picks based on Upstash pricing research | |

**User's choice:** 3 seconds
**Notes:** None

### Stream position tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Timestamp cursor | Client tracks last_seen_ts, ZRANGEBYSCORE(last_ts, +inf) | ✓ |
| Sequence number cursor | Client tracks last_seen_seq, filter by seq > N | |
| You decide | Claude picks during implementation | |

**User's choice:** Timestamp cursor
**Notes:** None

---

## Session List & Status Card UI

### Session list layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked cards | Full-width cards in vertical stack, tap to open detail | ✓ |
| Compact list rows | Dense list, one line per session | |
| You decide | Claude designs during UI planning | |

**User's choice:** Stacked cards
**Notes:** Phone-first layout

### Status badges

| Option | Description | Selected |
|--------|-------------|----------|
| 4 states: active/idle/error/complete | Green pulse, amber, red, gray | ✓ |
| 3 states: active/inactive/complete | Simpler, no error distinction | |
| You decide | Claude defines state machine | |

**User's choice:** 4 states: active/idle/error/complete
**Notes:** None

### Live status card content

| Option | Description | Selected |
|--------|-------------|----------|
| Phase + plan + elapsed + last event | Minimal, quick glance monitoring | |
| Full event stream preview | Same plus last 5-10 events in mini-log | ✓ |
| You decide | Claude designs, Phase 136 adds full log | |

**User's choice:** Full event stream preview
**Notes:** User wants to see recent activity at a glance

### UI framework

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui + Geist | Card, Badge, ScrollArea, Skeleton. Dark mode default. | ✓ |
| Custom Tailwind only | Hand-built, lighter, no shadcn dependency | |
| You decide | Claude picks during planning | |

**User's choice:** shadcn/ui + Geist
**Notes:** None

---

## Auth & Token Flow

### Relay token provisioning

| Option | Description | Selected |
|--------|-------------|----------|
| Env var PDE_RELAY_TOKEN | User generates token, sets on both sides | ✓ |
| Clerk-issued API key | Dashboard generates key tied to Clerk user | |
| You decide | Claude picks simplest secure approach | |

**User's choice:** Env var PDE_RELAY_TOKEN
**Notes:** Simple, no token exchange protocol needed

### Clerk scope

| Option | Description | Selected |
|--------|-------------|----------|
| Single user only | Owner-only login, no org/team features | ✓ |
| Owner + read-only viewers | Clerk organizations for viewer invites | |
| You decide | Claude picks based on complexity | |

**User's choice:** Single user only
**Notes:** Simplest for v0.17 personal monitoring

### Dashboard app location

| Option | Description | Selected |
|--------|-------------|----------|
| dashboard/ at repo root | Standalone Next.js app, separate package.json | ✓ |
| packages/dashboard/ | Under packages/ for monorepo convention | |
| Separate repo | Cleanest isolation, harder to sync types | |

**User's choice:** dashboard/ at repo root
**Notes:** None

---

## Claude's Discretion

- Event batch size limits on the ingest endpoint
- Exact heartbeat timeout threshold for SSE fallback detection
- Session card mini-log event formatting and truncation
- Skeleton loading states and empty state design
- Clerk middleware configuration details

## Deferred Ideas

None — discussion stayed within phase scope
