# Phase 137: Approval Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 137-approval-gates
**Areas discussed:** Approval notification delivery, Approval response flow, Confirmation UX, Approval history, TOCTOU safety
**Mode:** --auto (all areas auto-selected with recommended defaults)

---

## Approval Notification Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Polling detection from event stream | PDE emits approval_request event, dashboard picks up via existing SSE/poll | [auto] |
| WebSocket dedicated channel | Separate WebSocket for low-latency approval notifications | |
| Push notification trigger | Web Push notification on approval request event | |

**User's choice:** [auto] Polling detection from event stream (recommended — consistent with existing architecture)
**Notes:** Reuses existing SSE/poll infrastructure. No new transport mechanism needed.

---

## Approval Response Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Redis queue with relay polling | Dashboard writes response to Redis, PDE relay polls for it | [auto] |
| Webhook callback to PDE | Dashboard POSTs response directly to PDE machine | |
| SSE reverse channel | PDE opens SSE connection to dashboard for responses | |

**User's choice:** [auto] Redis queue with relay polling (recommended — mirrors push architecture in reverse)
**Notes:** PDE relay already communicates with Upstash. Adding a poll for approval responses is natural extension.

---

## Confirmation UX

| Option | Description | Selected |
|--------|-------------|----------|
| AlertDialog confirmation modal | shadcn/ui AlertDialog with approve/deny buttons, prevents accidental taps | [auto] |
| Inline card actions | Approve/deny buttons directly on the approval card, no modal | |
| Slide-to-confirm | iOS-style slide gesture for approval, button for deny | |

**User's choice:** [auto] AlertDialog confirmation modal (recommended — explicit confirmation per APR-02)
**Notes:** APR-02 requires preventing accidental taps. AlertDialog is the standard shadcn/ui pattern.

---

## Approval History

| Option | Description | Selected |
|--------|-------------|----------|
| Events in session stream | approval_request/response as event types in existing sorted set | [auto] |
| Separate approval sorted set | Dedicated Redis sorted set for approvals per session | |
| Session hash metadata | Store approval history in session hash fields | |

**User's choice:** [auto] Events in session stream (recommended — reuses existing infrastructure)
**Notes:** Approval events are just another event type. EventLog filter group handles display.

---

## TOCTOU Safety

| Option | Description | Selected |
|--------|-------------|----------|
| UUIDv4 per request with Redis TTL | UUID already in wire schema, Redis key expiry prevents replay | [auto] |
| HMAC-signed tokens | Cryptographically signed approval tokens with expiry | |
| Nonce table with sequence validation | Server-side nonce tracking with sequential validation | |

**User's choice:** [auto] UUIDv4 per request with Redis TTL (recommended — approval_id field already exists)
**Notes:** WireEnvelopeSchema already has approval_id as nullable UUID. Simplest path.

---

## Claude's Discretion

- Exact approval request event payload schema
- Approval polling interval on PDE side
- Approval card styling details
- Error/timeout states
- Toast/notification banner addition

## Deferred Ideas

None
