# Phase 135: Dashboard Scaffold and Event Ingestion - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Next.js 16 App Router dashboard deployed to Vercel. Receives events from PDE relay daemon via /api/ingest, stores in Upstash Redis, delivers to browser via SSE with polling fallback. Shows session list with status badges and live session status card. Clerk authenticates dashboard access, Bearer token authenticates relay pushes.

</domain>

<decisions>
## Implementation Decisions

### Redis Key Design
- **D-01:** Dual-structure session registry — sorted set `pde:{user}:sessions` (session_id as member, last_event_ts as score) for listing/ordering + hash `pde:{user}:session:{id}` for metadata (status, phase, started_at, etc.)
- **D-02:** User-scoped key namespace — `pde:{user}:events:{session_id}` for event sorted sets, future-proof for multi-user
- **D-03:** Ingest endpoint uses Upstash Redis pipeline() to batch all ZADD + HSET ops in one round-trip per POST

### SSE and Polling Strategy
- **D-04:** SSE-first with auto-fallback — start with SSE Route Handler, detect Vercel timeout via missed heartbeat (10s interval), auto-switch to polling. Client reconnects SSE on next attempt.
- **D-05:** Polling interval is 3 seconds when SSE falls back — ~20 reads/min per client, acceptable Upstash cost for single-user
- **D-06:** Timestamp cursor for stream position — client tracks last_seen_ts, requests ZRANGEBYSCORE(last_ts, +inf) on reconnect

### Session List and Status Card UI
- **D-07:** Stacked full-width cards in vertical stack on home page — each card shows session status badge, phase name, elapsed time, last event age. Tap to open detail view.
- **D-08:** Four status badge states: active (green pulse, events in last 60s), idle (amber, no events 60s+), error (red, last event was error type), complete (gray, session_end received)
- **D-09:** Live session status card shows: current phase name, current plan name, session elapsed time, last event type + timestamp, plus a mini-log of the last 5-10 events below the card
- **D-10:** shadcn/ui + Geist for all UI — Card, Badge, ScrollArea, Skeleton components. Geist Sans/Mono fonts. Dark mode default.

### Auth and Token Flow
- **D-11:** Relay authenticates via env var `PDE_RELAY_TOKEN` — user generates a random token, sets as Vercel env var for dashboard and local env for relay. No token exchange protocol.
- **D-12:** Clerk single-user only — owner login, no org/team features. Simplest auth for v0.17 personal monitoring.
- **D-13:** Dashboard app lives in `dashboard/` at repo root — standalone Next.js app with separate package.json, deployed independently to Vercel.

### Claude's Discretion
- Event batch size limits on the ingest endpoint
- Exact heartbeat timeout threshold for SSE fallback detection
- Session card mini-log event formatting and truncation
- Skeleton loading states and empty state design
- Clerk middleware configuration details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Relay protocol (Phase 134 output)
- `bin/lib/relay-protocol.cjs` — WireEnvelopeSchema (zod), createEnvelope factory. Defines the event envelope format that /api/ingest must validate.
- `bin/lib/relay.cjs` — TailCursor, BatchQueue, CircuitBreaker, postEvents. Shows how relay daemon batches and POSTs events.
- `bin/lib/event-bus.cjs` — Session ID management, NDJSON append, event schema. Defines event_type values and extensions field.

### Requirements
- `.planning/REQUIREMENTS.md` — DSH-01 through DSH-06 define acceptance criteria for this phase

### Architecture decisions (STATE.md)
- `.planning/STATE.md` — Accumulated Decisions section has relay architecture choices: push-based relay, Upstash Redis sorted sets, polling-first delivery, Clerk + Bearer token auth, Serwist for PWA

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/lib/relay-protocol.cjs` — WireEnvelopeSchema can be imported server-side in the dashboard to validate ingest payloads with the exact same zod schema the relay uses
- `bin/lib/event-bus.cjs` — Event type constants and schema_version can inform dashboard event parsing

### Established Patterns
- Zero npm dependency philosophy in PDE plugin code (relay uses only node: built-ins) — dashboard is separate and CAN use npm packages freely
- Zod used for schema validation throughout relay protocol — continue using zod in dashboard for ingest validation
- NDJSON event format with schema_version, ts, event_type, extensions fields — dashboard must understand this structure

### Integration Points
- `/api/ingest` endpoint receives HTTP POST from relay daemon (bin/lib/relay.cjs postEvents function)
- Relay sends batches as JSON array of WireEnvelope objects in POST body
- Relay sets `Authorization: Bearer {PDE_RELAY_TOKEN}` header
- Relay sets `Content-Type: application/json` header

</code_context>

<specifics>
## Specific Ideas

- Mini-log of last 5-10 events on the session status card — user wants to see recent activity at a glance, not just metadata
- Dark mode default aligns with Vercel ecosystem aesthetic
- Phone-first layout with stacked cards — designed for monitoring from mobile

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 135-dashboard-scaffold-and-event-ingestion*
*Context gathered: 2026-03-25*
