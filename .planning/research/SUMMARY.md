# Project Research Summary

**Project:** PDE Remote Dashboard (Layer 1)
**Domain:** Real-time monitoring PWA for local-first CLI agent orchestrator
**Researched:** 2026-03-24
**Confidence:** HIGH

## Executive Summary

The PDE Remote Dashboard is a phone-first PWA that lets users monitor agent sessions and respond to approval gates away from their desk. The core technical challenge is bridging a local CLI plugin (zero npm dependencies, ephemeral hook processes, 5-second timeout cap) to a cloud-hosted Next.js app with near-real-time event delivery. Research across transport, stack, features, architecture, and pitfalls converged on a clear recommendation: **Upstash Redis via its REST API** as the single transport and storage layer, with a **polling relay daemon** on the PDE side and **SSE delivery** to the browser via Next.js Route Handlers on Vercel.

The recommended approach is a push-based architecture where PDE writes events to local NDJSON files (already exists, unchanged) and a detached relay daemon tails those files, batching events into HTTP POST calls to the dashboard's `/api/ingest` endpoint. The dashboard stores events in Upstash Redis sorted sets and streams them to the browser via SSE. This architecture satisfies every hard constraint: zero npm deps on PDE (relay uses only `node:https`, `node:fs`, `node:os`, `node:path`), fire-and-forget semantics (relay never blocks PDE), durable local fallback (NDJSON files are ground truth), and $0/month hosting on Vercel Hobby + Upstash free tier (500K commands/month, 256MB storage).

The three highest-risk areas are: (1) **approval gate TOCTOU races** -- the multi-hop async path from PDE to phone and back creates a window where the pending action changes before the approval arrives, requiring cryptographic approval IDs validated at every hop; (2) **SSE timeout on Vercel serverless** -- Hobby plan kills functions at 10 seconds, so the real-time delivery must use polling with SSE as enhancement (or Edge Runtime), not long-lived SSE connections; and (3) **iOS push notification unreliability** -- Web Push has ~70-85% delivery on iOS, zero delivery in the EU, and requires home-screen installation, so push must be a secondary channel behind in-app polling. All three are solvable with known patterns but must be designed for from phase 1, not retrofitted.

## Key Findings

### Recommended Stack

Two codebases with a clean boundary. The PDE plugin gains only `lib/relay.cjs` (~100 LOC, zero deps). The dashboard is a separate Next.js app deployed to Vercel.

**PDE side (zero npm deps):**
- `node:https` + `node:fs`: relay daemon tails NDJSON, batches events, POSTs to dashboard ingest endpoint
- Upstash Redis REST API: event storage (sorted sets) + pub/sub (real-time notification), accessed via plain HTTP

**Dashboard app:**
- Next.js 16.2 + React 19 + TypeScript 5.7: App Router with SSE Route Handlers, Fluid Compute on Vercel
- @upstash/redis: type-safe Redis client for sorted set reads and pub/sub subscription
- Clerk (@clerk/nextjs v7): authentication -- single-user maps to free tier, pre-built components, 30-minute setup
- Serwist (@serwist/next v9): service worker generation for PWA installability and offline shell (requires Webpack for build)
- shadcn/ui + Tailwind CSS 4: card-based mobile-first dashboard components
- web-push: VAPID-based push notifications for approval gates (server-side only)
- zod: event schema validation at ingest endpoint

**Infrastructure ($0/month):**
- Vercel Hobby: 100GB transfer, 1M function invocations
- Upstash Redis free tier: 500K commands/month, 256MB storage
- Estimated usage: ~258K commands/month at 5 sessions/day

### Expected Features

**Must have (table stakes) -- P1:**
- Live session status (active/idle/error/complete with current phase and cost)
- Phase/plan progress display (progress bar, nested hierarchy)
- Token/cost meter (running total, visible at a glance)
- Approval gate actions (approve/deny from phone with confirmation dialog)
- PWA installability (web manifest + service worker)
- Session list with status badges
- Mobile-responsive card layout (touch targets >= 44px)
- Auto-reconnection with visual feedback ("reconnecting..." state)

**Should have (differentiators) -- P2:**
- Web Push notifications for approval gates and errors
- Live event log stream with type filtering
- File change feed (paths + operations)
- Session timeline (chronological view of phases, plans, waves, tool calls)
- Multi-session overview (dashboard-of-dashboards)
- Cost projection ("at this rate, this session will cost $X")

**Defer (v2+):**
- Sound/haptic alerts (iOS has no Vibration API)
- Offline action queueing (iOS has no Background Sync)
- Session comparison
- Team visibility / multi-user
- Native iOS/Android app

**Anti-features (explicitly do NOT build):**
- Full terminal emulation (unreadable on mobile)
- Remote code editing (scope explosion)
- WebSocket bidirectional streaming (SSE + REST POST is simpler and sufficient)
- Chat/messaging with agent (scope creep into IDE territory)

### Architecture Approach

Push-based, fire-and-forget. PDE writes to local NDJSON (unchanged). A detached relay daemon tails the NDJSON files, batches events on a 500ms timer, and POSTs them to the dashboard's `/api/ingest` Route Handler. The ingest endpoint validates with zod, stores in Upstash Redis sorted sets (score = epoch ms), and publishes to a Redis channel for SSE fan-out. The browser connects via EventSource to an SSE Route Handler that replays history then polls for new events.

**Major components:**
1. `lib/relay.cjs` (PDE side) -- polling daemon, NDJSON tail, batched HTTP push, circuit breaker, zero deps
2. `/api/ingest` (dashboard) -- event validation, Upstash ZADD + PUBLISH, rate limiting, auth
3. `/api/events/[sessionId]/stream` (dashboard) -- SSE Route Handler, history replay via ZRANGEBYSCORE, poll for new events
4. `/api/approvals/[approvalId]` (dashboard) -- approval gate POST endpoint, idempotent, validates approval_id + session_id
5. React dashboard components -- card-based status feed, bottom tab navigation, progressive disclosure (glance/summary/detail)
6. Service worker (Serwist) -- PWA shell, push notification handler, offline caching

**Key architectural decisions:**
- Relay is a polling daemon (not per-event hook) -- avoids adding latency to every Claude Code tool call
- Upstash sorted sets (not LISTs) -- enables time-range queries and natural ordering by timestamp score
- Polling as primary real-time delivery (not long-lived SSE) -- avoids Vercel serverless timeout issue
- Approval gates use separate REST endpoint (not bidirectional transport) -- SSE for notification, POST for action

### Critical Pitfalls

1. **Approval gate TOCTOU race** -- Every approval request gets a unique `approval_id` (UUID v4). PDE only accepts responses matching the currently pending ID. Cloud relay rejects stale approvals before forwarding. Must be designed into the wire protocol from phase 1.

2. **SSE timeout on Vercel serverless (10s Hobby / 60s Pro)** -- Do not rely on long-lived SSE connections. Use client-side polling every 2-3 seconds as primary, SSE as enhancement. Implement heartbeat detection: if no event in 10 seconds, reconnect. Show "reconnecting" UI state. Consider Edge Runtime for longer connections in a later phase.

3. **iOS push notification unreliability (~70-85% delivery, zero in EU)** -- Push must never be the sole notification channel. Tiered strategy: (1) in-app polling primary, (2) email secondary, (3) Web Push tertiary for opted-in users. Show clear "push not available" status on unsupported platforms.

4. **Blocking PDE hook execution** -- Relay must be a separate detached process, never inline in the hook path. The 5-second hook timeout is a hard cap. All relay failures must be swallowed -- PDE must never know or care if the relay is broken.

5. **Unbounded resource growth** -- Redis sorted sets need TTL (7 days), relay needs buffer cap (max 1000 events in memory), /tmp/ NDJSON files need size awareness. Without these, autonomous runs (10K-50K events) can exhaust free tier or fill disk.

6. **Security surface of cloud endpoint** -- The ingest endpoint is a public URL. Must have auth from day one (Bearer token minimum for MVP, Clerk for dashboard). Approval responses require re-authentication. Never expose Upstash tokens to client-side code. Scrub secrets from event payloads before push.

## Implications for Roadmap

### Phase 1: Relay Protocol and Transport Module
**Rationale:** Everything depends on events flowing from PDE to cloud. The wire format (event envelope with sequence numbers, approval IDs, session metadata) and the relay daemon (`lib/relay.cjs`) must be built and tested independently before any dashboard UI exists. This phase can be validated by pushing events to Upstash and inspecting them in the Upstash console.
**Delivers:** `lib/relay.cjs` (polling daemon with resilient fetch, batching, circuit breaker), event schema (zod), session ID format, approval wire protocol with `approval_id`, relay opt-in gating (`PDE_REMOTE` env var)
**Addresses features:** Fire-and-forget push, local NDJSON fallback (verify unchanged), session isolation, graceful degradation
**Avoids pitfalls:** Blocking hook execution (#1 transport), zero-dep relay fragility (#7 dashboard), backward compatibility (#10 dashboard), unbounded /tmp/ growth (#2 dashboard)

### Phase 2: Dashboard Scaffold and Event Ingestion
**Rationale:** With events flowing to Upstash, build the Next.js app that receives and displays them. Focus on the ingest API, SSE/polling delivery, and minimal dashboard UI (session list + live status card). This phase proves the full pipeline works end-to-end.
**Delivers:** Next.js app with `/api/ingest` (auth + validation + Upstash write), `/api/events/[sid]/stream` (SSE with polling fallback), session list page, live session status card, Vercel deployment, Clerk auth
**Uses stack:** Next.js 16.2, @upstash/redis, @clerk/nextjs, zod, shadcn/ui Card + Badge + Progress
**Avoids pitfalls:** SSE timeout (#3 dashboard) via polling-first approach, token leakage (#6 transport) via server-only Upstash access, state divergence (#4 dashboard) via staleness indicators

### Phase 3: Core Dashboard Features
**Rationale:** With the pipeline proven, build the monitoring features that make the dashboard useful day-to-day. Phase progress, cost meter, event log, and file change feed are all read-only projections of the event stream -- they can be built in parallel.
**Delivers:** Phase progress display, token/cost meter, live event log with filtering, file change feed, mobile-responsive card layout with bottom tab navigation, auto-reconnection UI
**Addresses features:** All remaining P1 table stakes features
**Avoids pitfalls:** Latency perception (#11 dashboard) via "last updated" indicators and latency bars

### Phase 4: Approval Gates
**Rationale:** The highest-value feature but also the deepest dependency chain (SSE for notification + REST for action + push for background alerts). Requires the full pipeline from phases 1-3 to be working. Approval gates also introduce bidirectional communication (PWA to PDE), which needs the approval_id protocol from phase 1.
**Delivers:** Approval gate notification (in-app), approve/deny/defer actions with confirmation dialog, idempotent approval endpoint, approval timeout handling, "pull on demand" fresh-check before approving
**Addresses features:** Approval gate actions (P1), approval context display
**Avoids pitfalls:** TOCTOU race (#1 dashboard) via approval_id validation, security surface (#5 dashboard) via re-authentication for approval actions

### Phase 5: PWA and Push Notifications
**Rationale:** PWA installability and push notifications are enhancement layers on top of a working dashboard. Service worker setup (Serwist), Web Push (VAPID keys), and offline shell can be added without changing the core architecture. Deliberately last because push is unreliable on iOS and the dashboard must work perfectly without it.
**Delivers:** PWA manifest + service worker (Serwist), Web Push for approval gates and errors, offline shell caching, iOS install instructions banner, push subscription management, platform capability detection and graceful degradation
**Addresses features:** PWA installability (P1), push notifications (P2)
**Avoids pitfalls:** iOS push unreliability (#6 dashboard) via tiered notification strategy, service worker lifecycle (#12 dashboard) via skipWaiting + version check

### Phase 6: Production Hardening
**Rationale:** Polish phase. Cost monitoring, event downsampling for autonomous mode, session cleanup/GC, rate limiting, load testing. Only meaningful after real usage data from phases 1-5.
**Delivers:** Upstash spend cap + cost dashboard, event downsampling for autonomous mode, session expiry and garbage collection (Vercel cron), rate limiting (@upstash/ratelimit), "looks done but isn't" checklist verification
**Addresses features:** Session history (P2), cost projection (P2)
**Avoids pitfalls:** Cost surprise (#8 dashboard), session identity collisions (#9 dashboard)

### Phase Ordering Rationale

- **Relay first** because it can be tested independently (push events, verify in Upstash console) and defines the wire protocol that everything else depends on
- **Dashboard scaffold second** because it proves end-to-end pipeline and establishes the deployment infrastructure
- **Core features third** because they are read-only projections of the event stream -- low risk, high value, can parallelize
- **Approval gates fourth** because they are the highest-complexity feature (bidirectional communication, TOCTOU, idempotency) and benefit from all prior infrastructure
- **PWA/push fifth** because they are enhancement layers -- the dashboard must work as a regular web app first
- **Hardening last** because it requires real usage data to calibrate (rate limits, cost monitoring, downsampling thresholds)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (SSE delivery):** Vercel serverless SSE timeout behavior needs production testing. Edge Runtime vs Fluid Compute for long-lived connections. Upstash's built-in SSE subscribe endpoint as alternative to custom Route Handler.
- **Phase 4 (Approval gates):** Bidirectional communication pattern needs protocol research. How PDE polls for approval responses (relay pushes events out, but how do approvals flow back in?). Likely needs a Redis-based polling mechanism on the PDE side.
- **Phase 5 (PWA/push):** Serwist + Turbopack compatibility. iOS push subscription persistence across service worker updates. EU PWA degradation testing on real devices.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Relay module):** Well-documented `node:https` patterns. Upstash REST API is straightforward. Circuit breaker and retry are standard patterns.
- **Phase 3 (Core features):** Standard React dashboard components. shadcn/ui provides most primitives. Event stream rendering is well-trodden ground.
- **Phase 6 (Hardening):** Rate limiting, TTL, cron cleanup are all commodity patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Upstash REST API verified via official docs. Next.js 16.2 confirmed current. Clerk v7 confirmed Next.js 16 compatible. All version compatibility verified. |
| Features | HIGH | Core features derived from direct PDE code review. Dashboard patterns validated against Vercel, Railway, GitHub Actions, Linear mobile apps. PWA browser support matrix verified across multiple 2026 sources. |
| Architecture | HIGH | Push-based pattern is standard. Upstash pipeline/sorted set APIs verified. Relay daemon approach validated against PDE's hook execution model (spawnSync, 5s timeout). |
| Pitfalls | HIGH | TOCTOU bug confirmed via real-world Codex CLI 0.98.0 vulnerability. SSE timeout confirmed via Vercel community docs. iOS push limitations confirmed via Apple DMA docs and multiple PWA guides. |
| Cost estimates | MEDIUM | Based on projected usage at 5 sessions/day. Autonomous mode could 10-50x command volume. Free tier math is sound but real-world usage will vary. |
| Approval gate protocol | MEDIUM | The outbound path (PDE to cloud) is well-understood. The inbound path (cloud to PDE) for approval responses needs more design. |

**Overall confidence:** HIGH

### Gaps to Address

- **Approval response delivery to PDE:** The relay pushes events out, but how do approval responses get back to PDE? Options: (a) PDE polls Upstash directly via `node:https` while waiting for approval, (b) relay daemon polls and writes response to a local file that PDE watches, (c) separate approval-specific endpoint. This needs design during phase 4 planning.
- **Vercel SSE duration in production:** Documentation says 10s timeout on Hobby, but streaming responses may behave differently with Fluid Compute. Needs real deployment testing in phase 2.
- **Serwist + Turbopack compatibility:** Serwist requires Webpack for service worker generation. Next.js 16 defaults to Turbopack. The documented workaround (Webpack for build, Turbopack for dev) needs validation in phase 5.
- **Upstash sorted sets vs Redis Streams:** Transport research recommended LISTs, dashboard stack research recommended sorted sets, and the pitfalls integration gotchas section recommended Streams (XADD/XREAD). Decision: sorted sets are the best fit -- they give time-range queries and natural ordering without the complexity of consumer groups. Validate during phase 2.
- **Multi-machine session namespacing:** Session IDs need machine discrimination for users running PDE on desktop + laptop simultaneously. Format `${machineId}-${crypto.randomUUID()}` is proposed but needs validation against PDE's current session model.

## Sources

### Primary (HIGH confidence)
- Upstash Redis REST API: https://upstash.com/docs/redis/features/restapi
- Upstash pricing: https://upstash.com/pricing/redis
- Vercel function limits: https://vercel.com/docs/limits
- Vercel pricing: https://vercel.com/docs/functions/usage-and-pricing
- Next.js 16.2 release: https://nextjs.org/blog/next-16-2
- Clerk Next.js quickstart: https://clerk.com/docs/nextjs/getting-started/quickstart
- Apple DMA and Apps in the EU: https://developer.apple.com/support/dma-and-apps-in-the-eu/
- Node.js backpressuring in streams: https://nodejs.org/en/learn/modules/backpressuring-in-streams
- PDE source code: event-bus.cjs, emit-event.cjs (direct code review)

### Secondary (MEDIUM confidence)
- Codex CLI 0.98.0 TOCTOU bug analysis: https://codefix.dev/2026/02/09/codex-cli-0-98-0-approval-swap-parallel-tool-calls-toctou/
- PWA iOS Limitations 2026: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- PWA push delivery rates: https://edana.ch/en/2026/03/19/push-notifications-on-web-applications-pwa-is-it-really-reliable-on-ios-and-android/
- Serwist Next.js docs: https://serwist.pages.dev/docs/next/getting-started
- Upstash SSE streaming: https://upstash.com/blog/sse-streaming-llm-responses
- Vercel SSE community discussion: https://community.vercel.com/t/sse-time-limits/5954

### Tertiary (needs validation)
- Ably pricing/capabilities: https://ably.com/pricing (backup real-time provider if SSE proves insufficient)
- shadcn-timeline community component (unverified compatibility with shadcn CLI v4)

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
