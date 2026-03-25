# Roadmap: PDE v0.17 Remote Dashboard

## Overview

Transform PDE from a local-only CLI tool into a remotely monitorable platform. A relay daemon pushes events from the local machine to a cloud-hosted Next.js dashboard, enabling phone-based session monitoring and approval gate responses. The architecture is push-based and fire-and-forget: PDE never knows or cares if the relay is working. Six phases deliver the pipeline incrementally -- relay protocol first (testable independently), then dashboard scaffold proving end-to-end flow, then monitoring features, then bidirectional approval gates, then PWA/push enhancement, then production hardening.

## Phases

**Phase Numbering:**
- Integer phases (134, 135, ...): Planned milestone work
- Decimal phases (134.1, 134.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 134: Relay Protocol and Transport Module** - PDE relay daemon tails NDJSON and pushes batched events to cloud via HTTP (completed 2026-03-25)
- [x] **Phase 134.1: Session ID Fix & Phase 134 Tech Debt** - Fix session ID namespace mismatch blocking production relay, clean up Phase 134 artifacts (INSERTED — gap closure) (completed 2026-03-25)
- [x] **Phase 135: Dashboard Scaffold and Event Ingestion** - Next.js app receives events, stores in Redis, delivers to browser, with auth (completed 2026-03-25)
- [x] **Phase 136: Core Dashboard Features** - Phase progress, cost meter, event log, mobile layout, auto-reconnection (completed 2026-03-25)
- [x] **Phase 136.1: Extensions Path Fix & Token Event Source** - Fix extensions field path mismatch and add token usage event emission (INSERTED — gap closure) (completed 2026-03-25)
- [x] **Phase 136.2: Documentation Tech Debt & Nyquist Compliance** - Fix ROADMAP checkboxes, SUMMARY frontmatter gaps, REQUIREMENTS traceability, and Nyquist validation for phases 134.1 and 135 (INSERTED — gap closure) (completed 2026-03-25)
- [ ] **Phase 136.3: Final Documentation & Filter Cleanup** - Close remaining traceability gaps and add token_usage to EventLog filter (INSERTED — gap closure)
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
- [x] 134-03-PLAN.md -- Hook integration, PDE_REMOTE env gate, zero-impact isolation, e2e test (RLY-04, RLY-05)

### Phase 134.1: Session ID Fix & Phase 134 Tech Debt
**Goal**: Fix session ID namespace mismatch that blocks production relay, and clean up Phase 134 artifact gaps
**Depends on**: Phase 134
**Requirements**: RLY-01 (re-verify after fix)
**Gap Closure**: Closes critical integration gap from v0.17 milestone audit
**Success Criteria** (what must be TRUE):
  1. start-relay.cjs and event-bus.cjs use the same session ID source — relay tails the correct NDJSON file in production
  2. Integration tests exercise the hook spawn path (not just direct startRelay() calls) to catch namespace mismatches
  3. SUMMARY frontmatter for Plans 02 and 03 includes requirements-completed field
  4. ROADMAP.md Plan 03 checkbox reflects completed status
  5. REQUIREMENTS.md traceability table has correct Plan and Verified columns for Phase 134 requirements
**Plans**: 2 plans
Plans:
- [x] 134.1-01-PLAN.md -- Fix session ID source in hook scripts + integration test for hook spawn path (RLY-01)
- [x] 134.1-02-PLAN.md -- Documentation tech debt: SUMMARY frontmatter, ROADMAP checkbox, REQUIREMENTS traceability

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
**Plans**: 4 plans
Plans:
- [x] 135-01-PLAN.md -- Next.js 16 scaffold, dependencies, Clerk auth, shadcn/ui, Geist fonts, shared libs, vitest (DSH-01, DSH-05)
- [x] 135-02-PLAN.md -- /api/ingest POST endpoint with Bearer auth, zod validation, Redis pipeline (DSH-01, DSH-06)
- [x] 135-03-PLAN.md -- SSE streaming endpoint, polling fallback, useEventStream client hook (DSH-02)
- [x] 135-04-PLAN.md -- Session list page, session detail page, custom components, visual verification (DSH-03, DSH-04)
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
**Plans**: 2 plans
Plans:
- [x] 136-01-PLAN.md -- Install shadcn deps, create pure lib functions (deriveProgress, deriveCost, filterEvents) with unit tests (MON-01, MON-02, MON-03)
- [x] 136-02-PLAN.md -- Build PhaseProgress, CostMeter, expanded EventLog components, wire into SessionDetail, fix field name bug, visual verification (MON-01, MON-02, MON-03, MON-04, MON-05)
**UI hint**: yes

### Phase 136.1: Extensions Path Fix & Token Event Source
**Goal**: Fix the extensions field path mismatch that breaks phase/plan display across ingest, dashboard components, and live event paths, and add token usage event emission so CostMeter displays real data
**Depends on**: Phase 136
**Requirements**: DSH-03, DSH-04, MON-01, MON-02
**Gap Closure**: Closes gaps from v0.17 milestone audit — extensions?.phase_name path mismatch and missing token data source
**Success Criteria** (what must be TRUE):
  1. Ingest route, deriveProgress, and session-detail-client read phase_name/plan_name from top-level wire envelope fields (not extensions sub-object) — session list and detail show correct phase/plan names
  2. PDE emits token_usage events with input_tokens and output_tokens fields via event-bus, and deriveCost reads these fields correctly — CostMeter shows non-zero values during real sessions
  3. All existing tests pass plus new integration tests verify the field path fix end-to-end
  4. SUMMARY frontmatter gaps filled, REQUIREMENTS.md traceability table updated, ROADMAP plan counts corrected
**Plans**: 2 plans
Plans:
- [x] 136.1-01-PLAN.md -- Fix extensions path + token_usage emission + tests (DSH-03, DSH-04, MON-01, MON-02)
- [x] 136.1-02-PLAN.md -- Documentation tech debt: SUMMARY frontmatter, ROADMAP, REQUIREMENTS (DSH-03, DSH-04, MON-01, MON-02)

### Phase 136.2: Documentation Tech Debt & Nyquist Compliance
**Goal**: Fix accumulated documentation gaps and achieve Nyquist validation compliance for all completed phases
**Depends on**: Phase 136.1
**Gap Closure**: Closes tech debt from v0.17 milestone audit
**Success Criteria** (what must be TRUE):
  1. ROADMAP.md checkboxes for 136-02 and 136.1-02 are checked, progress counters correct
  2. SUMMARY frontmatter for plans 135-01 and 135-02 includes requirements-completed field
  3. REQUIREMENTS.md traceability table has Plan and Verified columns filled for DSH-01, DSH-05, DSH-06, MON-03, MON-04, MON-05
  4. Phase 134.1 Nyquist VALIDATION.md is compliant (nyquist_compliant: true)
  5. Phase 135 Nyquist VALIDATION.md is compliant (nyquist_compliant: true)
**Plans**: 2 plans
Plans:
- [x] 136.2-01-PLAN.md -- ROADMAP checkboxes, SUMMARY field name fix, REQUIREMENTS traceability (SC-1, SC-2, SC-3)
- [x] 136.2-02-PLAN.md -- Nyquist VALIDATION compliance for phases 134.1 and 135 (SC-4, SC-5)

### Phase 136.3: Final Documentation & Filter Cleanup
**Goal**: Close remaining documentation traceability gaps and add token_usage to EventLog filter taxonomy
**Depends on**: Phase 136.2
**Gap Closure**: Closes tech debt from v0.17 milestone audit (INT-01 + documentation gaps)
**Success Criteria** (what must be TRUE):
  1. REQUIREMENTS.md traceability table: DSH-02 has Plan=135-03, Verified=Yes; DSH-03, DSH-04, MON-01, MON-02 have Verified=Yes; RLY-01 has Verified=Yes
  2. 134-01-SUMMARY.md and 135-01-SUMMARY.md have requirements-completed in YAML frontmatter block (between --- delimiters), not buried in file body
  3. ROADMAP.md Phase 136.2 top-level checkbox is [x], plan checkboxes are [x], progress table shows 2/2 Complete
  4. 136.2-VALIDATION.md has nyquist_compliant: true
  5. EVENT_FILTER_GROUPS in dashboard/lib/event-types.ts includes token_usage in a named filter tab
**Plans**: TBD

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
| 134. Relay Protocol and Transport Module | 3/3 | Complete    | 2026-03-25 |
| 134.1. Session ID Fix & Phase 134 Tech Debt | 2/2 | Complete    | 2026-03-25 |
| 135. Dashboard Scaffold and Event Ingestion | 4/4 | Complete    | 2026-03-25 |
| 136. Core Dashboard Features | 2/2 | Complete    | 2026-03-25 |
| 136.1. Extensions Path Fix & Token Event Source | 2/2 | Complete    | 2026-03-25 |
| 136.2. Documentation Tech Debt & Nyquist Compliance | 2/2 | Complete    | 2026-03-25 |
| 136.3. Final Documentation & Filter Cleanup | 0/TBD | Not started | - |
| 137. Approval Gates | 0/TBD | Not started | - |
| 138. PWA and Push Notifications | 0/TBD | Not started | - |
| 139. Production Hardening | 0/TBD | Not started | - |
