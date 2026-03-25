# Requirements — v0.17 Remote Dashboard

## Transport & Relay

- [ ] **RLY-01**: PDE relay daemon tails local NDJSON files and batches events into HTTP POST calls to the dashboard ingest endpoint using only `node:https` (zero npm deps)
- [ ] **RLY-02**: Event wire protocol includes envelope with sequence number, session_id, machine_id, timestamp, and approval_id fields validated by zod schema
- [ ] **RLY-03**: Relay daemon includes circuit breaker that stops pushing after N consecutive failures and auto-recovers after cooldown period
- [ ] **RLY-04**: Relay is gated behind `PDE_REMOTE` environment variable — disabled by default, existing local-only flow unchanged
- [ ] **RLY-05**: Relay failures are fully swallowed — PDE session never blocks, slows, or errors due to relay issues

## Dashboard Core

- [ ] **DSH-01**: Next.js 16 App Router dashboard deployed to Vercel with `/api/ingest` endpoint that validates events with zod and stores in Upstash Redis sorted sets
- [ ] **DSH-02**: SSE Route Handler delivers events to browser with polling fallback for Vercel serverless timeout, including heartbeat detection and auto-reconnection
- [ ] **DSH-03**: Dashboard home page shows session list with status badges (active/idle/error/complete) and current phase name
- [ ] **DSH-04**: Live session status card displays current phase, plan, agent activity, and elapsed time
- [ ] **DSH-05**: Clerk authentication restricts dashboard access to the PDE owner (single-user)
- [ ] **DSH-06**: Ingest endpoint authenticates PDE relay via Bearer token, rejecting unauthorized event pushes

## Monitoring

- [ ] **MON-01**: Phase progress display shows nested hierarchy (phase → plan → wave) with progress indicators
- [ ] **MON-02**: Token/cost meter shows running session total visible at a glance, updated in near-real-time
- [ ] **MON-03**: Live event log streams events with type filtering (tool calls, agent activity, phase transitions, errors)
- [ ] **MON-04**: Auto-reconnection with visual feedback ("reconnecting..." state) when SSE/polling connection drops
- [ ] **MON-05**: All monitoring views are mobile-responsive with card-based layout and touch targets >= 44px

## Approval Gates

- [ ] **APR-01**: Approval gate notifications appear in-app when PDE requests human approval (deploy, write-back, etc.)
- [ ] **APR-02**: User can approve or deny from the dashboard with a confirmation dialog preventing accidental taps
- [ ] **APR-03**: Each approval request uses a unique cryptographic approval_id — PDE rejects responses with stale or mismatched IDs (TOCTOU-safe)
- [ ] **APR-04**: Approval responses flow back to PDE via relay polling Upstash for pending responses
- [ ] **APR-05**: Approval history log shows past approvals per session with timestamp, action, and context

## PWA & Notifications

- [ ] **PWA-01**: Dashboard is installable as PWA with web manifest, Serwist service worker, and offline shell caching
- [ ] **PWA-02**: Web Push notifications fire for approval gates and critical errors using VAPID keys
- [ ] **PWA-03**: Platform capability detection shows "push not available" on unsupported platforms (iOS EU, non-installed PWA)
- [ ] **PWA-04**: Mobile-first responsive UI with bottom tab navigation, card-based layout, and Geist typography

## Production Hardening

- [ ] **HRD-01**: Redis sorted sets have 7-day TTL — events older than 7 days are automatically expired
- [ ] **HRD-02**: Ingest endpoint has rate limiting via @upstash/ratelimit preventing abuse
- [ ] **HRD-03**: Relay daemon has buffer cap (max 1000 events in memory) preventing unbounded growth during autonomous runs
- [ ] **HRD-04**: Event downsampling reduces volume during autonomous mode (tool_start/tool_complete events sampled at 1-in-N)
- [ ] **HRD-05**: Vercel cron job runs daily to garbage-collect expired sessions from Redis

## Future Requirements

- File change feed with paths and operations
- Session timeline (chronological view of all events)
- Multi-session overview (dashboard-of-dashboards)
- Cost projection ("at this rate, session will cost $X")
- Sound/haptic alerts
- Offline action queueing
- Session comparison
- Team visibility / multi-user
- Native iOS/Android app

## Out of Scope

- Full terminal emulation — unreadable on mobile, wrong abstraction for monitoring
- Remote code editing — scope explosion, not a monitoring tool
- WebSocket bidirectional streaming — SSE + REST POST is simpler and sufficient
- Chat/messaging with agent — scope creep into IDE territory
- Email notification channel — adds SMTP complexity for minimal value in v0.17

## Traceability

| REQ-ID | Phase | Plan | Verified |
|--------|-------|------|----------|
| RLY-01 | 134 | — | — |
| RLY-02 | 134 | — | — |
| RLY-03 | 134 | — | — |
| RLY-04 | 134 | — | — |
| RLY-05 | 134 | — | — |
| DSH-01 | 135 | — | — |
| DSH-02 | 135 | — | — |
| DSH-03 | 135 | — | — |
| DSH-04 | 135 | — | — |
| DSH-05 | 135 | — | — |
| DSH-06 | 135 | — | — |
| MON-01 | 136 | — | — |
| MON-02 | 136 | — | — |
| MON-03 | 136 | — | — |
| MON-04 | 136 | — | — |
| MON-05 | 136 | — | — |
| APR-01 | 137 | — | — |
| APR-02 | 137 | — | — |
| APR-03 | 137 | — | — |
| APR-04 | 137 | — | — |
| APR-05 | 137 | — | — |
| PWA-01 | 138 | — | — |
| PWA-02 | 138 | — | — |
| PWA-03 | 138 | — | — |
| PWA-04 | 138 | — | — |
| HRD-01 | 139 | — | — |
| HRD-02 | 139 | — | — |
| HRD-03 | 139 | — | — |
| HRD-04 | 139 | — | — |
| HRD-05 | 139 | — | — |
