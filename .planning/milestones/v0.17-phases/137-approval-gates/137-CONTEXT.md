# Phase 137: Approval Gates - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Bidirectional approval flow from dashboard to PDE. When PDE requests human approval (deploy, write-back, etc.), a notification appears in the dashboard. User can approve or deny with cryptographic safety guarantees. Approval responses flow back to PDE via relay polling Upstash. Approval history log shows past approvals per session.

</domain>

<decisions>
## Implementation Decisions

### Approval Notification Delivery
- **D-01:** Approval requests detected via existing event stream — PDE emits an `approval_request` event type with non-null `approval_id` through the existing relay pipeline. Dashboard SSE/polling picks it up automatically. No new transport or push mechanism needed.
- **D-02:** Dashboard highlights pending approvals prominently — when an event with `event_type: 'approval_request'` arrives, the session card shows an approval badge and the session detail view presents the approval action card.

### Approval Response Flow
- **D-03:** Dashboard writes approval responses to a Redis key `pde:{user}:approvals:{session_id}:{approval_id}` with the response payload (approved/denied, timestamp, approval_id).
- **D-04:** PDE-side relay polls Upstash for pending responses — new `/api/approval-response` endpoint lets PDE relay check for responses by session_id. PDE sends GET with session_id, dashboard returns any pending approval responses.
- **D-05:** Response payload includes: `{ approval_id, action: 'approved' | 'denied', responded_at, responder_id }`. PDE validates approval_id matches the original request before accepting.

### Confirmation UX
- **D-06:** Base UI AlertDialog (`@base-ui/react/alert-dialog`) for approve/deny — prevents accidental taps (APR-02). Dialog shows approval context (what's being approved, phase, plan), two clear action buttons (Approve green, Deny red), and requires deliberate click/tap.
- **D-07:** Approval action card in session detail view — full-width card with context summary, approve/deny buttons. Card appears at the top of the event stream when an approval is pending.
- **D-08:** 44px minimum touch targets on approve/deny buttons — consistent with existing mobile-first design (Phase 136 established this pattern).

### Approval History
- **D-09:** Approval events stored as regular events in the session event stream — `approval_request` and `approval_response` event types in the existing `pde:{user}:events:{session_id}` sorted set. Reuses existing infrastructure.
- **D-10:** Approval history view as filtered event log — use the existing EventLog filter taxonomy (add `approvals` filter group to EVENT_FILTER_GROUPS) to show approval_request and approval_response events together.

### TOCTOU Safety (APR-03)
- **D-11:** UUIDv4 approval_id per request — already in WireEnvelopeSchema as `z.string().uuid().nullable()`. PDE generates a unique UUID for each approval request, includes it in the event.
- **D-12:** Redis key TTL prevents replay — approval response keys expire after 1 hour. PDE rejects responses with mismatched approval_ids.
- **D-13:** One-shot response — once PDE reads an approval response, it deletes the Redis key. Duplicate responses are idempotent (approved stays approved, key already gone).

### Claude's Discretion
- Exact approval request event payload schema (extensions fields for approval context)
- Approval polling interval on PDE side
- Approval card styling details beyond the AlertDialog pattern
- Error states when approval times out or network fails
- Whether to show a toast/notification banner in addition to the card

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wire protocol
- `dashboard/lib/wire-schema.ts` — WireEnvelopeSchema with approval_id field (already nullable UUID)
- `bin/lib/relay-protocol.cjs` — Relay-side WireEnvelopeSchema, createEnvelope factory

### Dashboard architecture (Phase 135)
- `.planning/phases/135-dashboard-scaffold-and-event-ingestion/135-CONTEXT.md` — Redis key design (D-01/D-02), SSE/poll strategy (D-04/D-05), auth model (D-11/D-12)
- `dashboard/lib/redis.ts` — Redis client configuration
- `dashboard/lib/queries.ts` — Existing query patterns for events and sessions
- `dashboard/lib/session-status.ts` — Session status derivation logic
- `dashboard/lib/event-types.ts` — EVENT_FILTER_GROUPS taxonomy (add approvals group)

### API routes
- `dashboard/app/api/ingest/` — POST endpoint for relay events (pattern for new approval-response endpoint)
- `dashboard/app/api/poll/` — GET endpoint for polling (pattern for approval-response polling endpoint)
- `dashboard/app/api/events/` — SSE endpoint

### Requirements
- `.planning/REQUIREMENTS.md` — APR-01 through APR-05 define acceptance criteria

### Architecture decisions
- `.planning/STATE.md` — Accumulated Decisions section: relay architecture, Upstash sorted sets, polling-first delivery

### Event filter taxonomy
- `dashboard/components/event-log.tsx` — Dynamic tab rendering via Object.keys(EVENT_FILTER_GROUPS)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/lib/wire-schema.ts` — WireEnvelopeSchema already has `approval_id: z.string().uuid().nullable()` — just needs non-null values for approval events
- `dashboard/lib/event-types.ts` — EVENT_FILTER_GROUPS pattern for adding `approvals` filter group
- `dashboard/lib/redis.ts` — Existing Redis client for Upstash
- `dashboard/lib/queries.ts` — Existing ZRANGEBYSCORE and HSET patterns for event storage
- `dashboard/components/event-log.tsx` — Dynamic filter tabs render from Object.keys (new group appears automatically)
- `dashboard/components/session-detail.tsx` — Session detail view where approval card will be inserted
- `dashboard/components/status-badge.tsx` — Status badge component (extend with approval-pending state)
- `dashboard/components/ui/` — Base UI components (@base-ui/react)

### Established Patterns
- SSE-first with polling fallback (3s interval) — approval notifications ride this existing transport
- User-scoped Redis keys `pde:{user}:*` — approval response keys follow same namespace
- Zod schema validation at API boundary — new endpoints validate with zod
- Event types as string literals in wire envelope — approval_request/approval_response follow pattern
- TDD red-green discipline — established in phases 134-136

### Integration Points
- PDE relay daemon (bin/lib/relay.cjs) — needs to poll for approval responses (new responsibility)
- PDE event bus (bin/lib/event-bus.cjs) — needs to emit approval_request events with non-null approval_id
- Dashboard ingest endpoint — already stores events with approval_id field, no change needed
- Dashboard SSE/poll endpoints — already deliver events including ones with approval_id

</code_context>

<specifics>
## Specific Ideas

- Approval card should appear prominently at top of session detail view — not buried in the event stream
- Confirmation dialog must be deliberate — no single-tap approve (APR-02 requirement)
- Approval badge on session card in list view — user can see at a glance which sessions need attention
- Phone-first design — approval flow optimized for mobile (quick approve from notification)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 137-approval-gates*
*Context gathered: 2026-03-25*
