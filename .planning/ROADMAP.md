# Roadmap: PDE v0.17 Remote Dashboard

## Overview

Transform PDE from a local-only CLI tool into a remotely monitorable platform. A relay daemon pushes events from the local machine to a cloud-hosted Next.js dashboard, enabling phone-based session monitoring and approval gate responses. The architecture is push-based and fire-and-forget: PDE never knows or cares if the relay is working. Six phases deliver the pipeline incrementally -- relay protocol first (testable independently), then dashboard scaffold proving end-to-end flow, then monitoring features, then bidirectional approval gates, then PWA/push enhancement, then production hardening.

## Phases

**Phase Numbering:**
- Integer phases (134, 135, ...): Planned milestone work
- Decimal phases (134.1, 134.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 134: Relay Protocol and Transport Module** - PDE relay daemon tails NDJSON and pushes batched events to cloud via HTTP (completed 2026-03-25)
- [ ] **Phase 135: Dashboard Scaffold and Event Ingestion** - Next.js app receives events, stores in Redis, delivers to browser, with auth
- [ ] **Phase 136: Core Dashboard Features** - Phase progress, cost meter, event log, mobile layout, auto-reconnection
- [ ] **Phase 137: Approval Gates** - Bidirectional approval flow from dashboard to PDE with TOCTOU-safe protocol
- [ ] **Phase 138: PWA and Push Notifications** - Installable PWA with service worker, Web Push, and offline shell
- [ ] **Phase 139: Production Hardening** - Rate limiting, TTL, downsampling, garbage collection, buffer caps

## Phase Details

### Phase 134: Relay Protocol and Transport Module
**Goal**: Events flow reliably from PDE's local NDJSON files to Upstash Redis, with the relay being completely invisible to PDE's normal operation
**Depends on**: Nothing (first phase of v0.17)
**Requirements**: RLY-01, RLY-02, RLY-03, RLY-04, RLY-05
**Success Criteria** (what must be TRUE):
  1. Relay daemon tails local NDJSON files and events appear in Upstash Redis sorted sets within seconds
  2. Every event on the wire contains sequence number, session_id, machine_id, timestamp, and approval_id fields validated by zod
  3. When the dashboard endpoint is unreachable, relay stops pushing after N failures and resumes automatically after cooldown -- no data loss, no crash
  4. With PDE_REMOTE unset, PDE behaves identically to pre-v0.17 -- zero relay activity, zero network calls
  5. A deliberately broken relay endpoint causes zero impact on PDE session execution -- no slowdowns, no errors, no blocked hooks
**Plans**: 3 plans
Plans:
- [x] 134-01-PLAN.md -- Vitest setup + wire protocol zod schema + protocol unit tests (RLY-02)
- [x] 134-02-PLAN.md -- Core relay module: TailCursor, BatchQueue, CircuitBreaker, HTTP transport (RLY-01, RLY-03)
- [ ] 134-03-PLAN.md -- Hook integration, PDE_REMOTE env gate, zero-impact isolation, e2e test (RLY-04, RLY-05)

### Phase 135: Dashboard Scaffold and Event Ingestion
**Goal**: Users can open a deployed web dashboard, authenticate, and see live session data flowing from their PDE instance
**Depends on**: Phase 134
**Requirements**: DSH-01, DSH-02, DSH-03, DSH-04, DSH-05, DSH-06
**Success Criteria** (what must be TRUE):
  1. Next.js dashboard is deployed to Vercel with /api/ingest endpoint that validates and stores events in Upstash Redis
  2. Browser receives events via SSE with polling fallback -- connection survives Vercel serverless timeout via heartbeat detection and auto-reconnection
  3. Dashboard home page shows a list of sessions with status badges (active/idle/error/complete) and current phase name
  4. Clicking a session shows a live status card with current phase, plan, agent activity, and elapsed time
  5. Only the authenticated PDE owner can access the dashboard (Clerk), and only authenticated relay can push events (Bearer token)
**Plans**: TBD
**UI hint**: yes

### Phase 136: Core Dashboard Features
**Goal**: Users can monitor session progress, costs, and events in detail from their phone with a responsive mobile layout
**Depends on**: Phase 135
**Requirements**: MON-01, MON-02, MON-03, MON-04, MON-05
**Success Criteria** (what must be TRUE):
  1. Phase progress display shows nested hierarchy (phase to plan to wave) with visual progress indicators
  2. Token/cost meter shows running session total visible at a glance, updating in near-real-time as events arrive
  3. Live event log streams events with type filtering (tool calls, agent activity, phase transitions, errors)
  4. When SSE/polling connection drops, user sees "reconnecting..." state and connection restores automatically
  5. All monitoring views render correctly on mobile with card-based layout and touch targets at least 44px
**Plans**: TBD
**UI hint**: yes

### Phase 137: Approval Gates
**Goal**: Users can receive, review, and respond to PDE approval requests from their phone with cryptographic safety guarantees
**Depends on**: Phase 136
**Requirements**: APR-01, APR-02, APR-03, APR-04, APR-05
**Success Criteria** (what must be TRUE):
  1. When PDE requests human approval (deploy, write-back, etc.), a notification appears in the dashboard within seconds
  2. User can approve or deny from the dashboard with a confirmation dialog that prevents accidental taps
  3. Approval responses use unique cryptographic approval_id -- PDE rejects stale or mismatched IDs, preventing TOCTOU races
  4. Approval responses flow back to PDE via relay polling Upstash, completing the bidirectional loop
  5. Approval history log shows past approvals per session with timestamp, action taken, and context
**Plans**: TBD
**UI hint**: yes

### Phase 138: PWA and Push Notifications
**Goal**: Users can install the dashboard as a native-like app on their phone and receive push notifications for critical events
**Depends on**: Phase 137
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04
**Success Criteria** (what must be TRUE):
  1. Dashboard is installable as PWA via web manifest and Serwist service worker with offline shell caching
  2. Web Push notifications fire for approval gates and critical errors using VAPID keys
  3. On platforms where push is unavailable (iOS EU, non-installed PWA), user sees clear "push not available" message instead of silent failure
  4. Mobile-first responsive UI with bottom tab navigation, card-based layout, and Geist typography renders correctly across iOS Safari, Android Chrome, and desktop
**Plans**: TBD
**UI hint**: yes

### Phase 139: Production Hardening
**Goal**: The system handles real-world usage patterns without cost surprises, resource exhaustion, or data accumulation
**Depends on**: Phase 138
**Requirements**: HRD-01, HRD-02, HRD-03, HRD-04, HRD-05
**Success Criteria** (what must be TRUE):
  1. Redis sorted sets have 7-day TTL -- events older than 7 days are automatically expired without manual intervention
  2. Ingest endpoint rejects excessive requests via @upstash/ratelimit, returning appropriate error responses
  3. Relay daemon caps in-memory buffer at 1000 events -- during long autonomous runs, oldest unbatched events are dropped rather than consuming unbounded memory
  4. During autonomous mode, high-frequency tool_start/tool_complete events are downsampled at 1-in-N, reducing event volume without losing phase transitions or errors
  5. Vercel cron job runs daily to garbage-collect expired sessions from Redis
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 134 -> 134.1 -> 134.2 -> 135 -> ...

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 134. Relay Protocol and Transport Module | 2/3 | Complete    | 2026-03-25 |
| 135. Dashboard Scaffold and Event Ingestion | 0/TBD | Not started | - |
| 136. Core Dashboard Features | 0/TBD | Not started | - |
| 137. Approval Gates | 0/TBD | Not started | - |
| 138. PWA and Push Notifications | 0/TBD | Not started | - |
| 139. Production Hardening | 0/TBD | Not started | - |
