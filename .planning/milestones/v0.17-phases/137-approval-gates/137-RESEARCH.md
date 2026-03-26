# Phase 137: Approval Gates - Research

**Researched:** 2026-03-25
**Domain:** Bidirectional approval flow — dashboard UI, Redis approval response keys, PDE relay polling, TOCTOU safety
**Confidence:** HIGH

## Summary

Phase 137 closes the bidirectional loop: PDE emits `approval_request` events through the existing relay pipeline (unchanged), the dashboard detects them from the event stream and surfaces an approval card, the user approves/denies via a confirmation dialog, and the response is written to a scoped Redis key. The PDE relay daemon polls a new `/api/approval-response` GET endpoint to pick up the response. No new transports are required — everything rides existing infrastructure.

The codebase is in excellent shape. The `approval_id` field already exists as `z.string().uuid().nullable()` in both `relay-protocol.cjs` and `dashboard/lib/wire-schema.ts`. The `EVENT_FILTER_GROUPS` pattern in `event-types.ts` auto-renders new filter tabs when a key is added — the approvals tab appears with zero changes to `event-log.tsx`. The `session-detail.tsx` render tree is clean for inserting an approval card above the existing components.

All decisions from CONTEXT.md are locked. The primary implementation work is: (1) adding the `approvals` filter group, (2) adding an `ApprovalCard` component with Base UI `AlertDialog`, (3) creating `/api/approval-response` (GET for PDE relay + POST for dashboard writes), (4) extending the PDE relay daemon with approval response polling, and (5) emitting `approval_request` events from `pde-tools.cjs` with a UUIDv4 `approval_id`.

**Primary recommendation:** Implement in four clean units: lib changes (event-types + queries), API routes (approval-response), dashboard components (ApprovalCard + session badge), and PDE relay extension (approval polling in relay.cjs).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Approval Notification Delivery**
- D-01: Approval requests detected via existing event stream. PDE emits an `approval_request` event type with non-null `approval_id` through the existing relay pipeline. Dashboard SSE/polling picks it up automatically. No new transport or push mechanism needed.
- D-02: Dashboard highlights pending approvals prominently. When an event with `event_type: 'approval_request'` arrives, the session card shows an approval badge and the session detail view presents the approval action card.

**Approval Response Flow**
- D-03: Dashboard writes approval responses to a Redis key `pde:{user}:approvals:{session_id}:{approval_id}` with the response payload (approved/denied, timestamp, approval_id).
- D-04: PDE-side relay polls Upstash for pending responses. New `/api/approval-response` endpoint lets PDE relay check for responses by session_id. PDE sends GET with session_id, dashboard returns any pending approval responses.
- D-05: Response payload includes: `{ approval_id, action: 'approved' | 'denied', responded_at, responder_id }`. PDE validates approval_id matches the original request before accepting.

**Confirmation UX**
- D-06: shadcn/ui AlertDialog for approve/deny. Prevents accidental taps (APR-02). Dialog shows approval context (what is being approved, phase, plan), two clear action buttons (Approve green, Deny red), and requires deliberate click/tap.
- D-07: Approval action card in session detail view. Full-width card with context summary, approve/deny buttons. Card appears at the top of the event stream when an approval is pending.
- D-08: 44px minimum touch targets on approve/deny buttons. Consistent with existing mobile-first design (Phase 136 established this pattern).

**Approval History**
- D-09: Approval events stored as regular events in the session event stream. `approval_request` and `approval_response` event types in the existing `pde:{user}:events:{session_id}` sorted set. Reuses existing infrastructure.
- D-10: Approval history view as filtered event log. Use the existing EventLog filter taxonomy (add `approvals` filter group to EVENT_FILTER_GROUPS) to show approval_request and approval_response events together.

**TOCTOU Safety (APR-03)**
- D-11: UUIDv4 approval_id per request. Already in WireEnvelopeSchema as `z.string().uuid().nullable()`. PDE generates a unique UUID for each approval request, includes it in the event.
- D-12: Redis key TTL prevents replay. Approval response keys expire after 1 hour. PDE rejects responses with mismatched approval_ids.
- D-13: One-shot response. Once PDE reads an approval response, it deletes the Redis key. Duplicate responses are idempotent (approved stays approved, key already gone).

### Claude's Discretion
- Exact approval request event payload schema (extensions fields for approval context)
- Approval polling interval on PDE side
- Approval card styling details beyond the AlertDialog pattern
- Error states when approval times out or network fails
- Whether to show a toast/notification banner in addition to the card

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APR-01 | Approval gate notifications appear in-app when PDE requests human approval | `approval_request` event_type rides existing SSE/polling; `ApprovalCard` inserted at top of session detail; approval badge on `SessionCard` |
| APR-02 | User can approve or deny from the dashboard with a confirmation dialog preventing accidental taps | Base UI `AlertDialog` already installed (`@base-ui/react` has `./alert-dialog` export confirmed); two-step deliberate interaction |
| APR-03 | Each approval request uses unique cryptographic approval_id — PDE rejects stale or mismatched IDs (TOCTOU-safe) | `randomUUID()` available in Node.js built-in (already used in event-bus.cjs); Redis key TTL 1h; PDE reads then deletes key |
| APR-04 | Approval responses flow back to PDE via relay polling Upstash for pending responses | New `/api/approval-response` GET endpoint; relay daemon gains approval polling loop; bearer-token auth via existing `validateRelayToken` |
| APR-05 | Approval history log shows past approvals per session with timestamp, action, and context | Add `approvals` key to `EVENT_FILTER_GROUPS` with `['approval_request', 'approval_response']`; existing `EventLog` auto-renders new tab via `Object.keys` |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new deps required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | ^1.3.0 | AlertDialog for confirmation UX | Already in package.json; `./alert-dialog` export confirmed in node_modules |
| `@upstash/redis` | latest | Approval response Redis key storage | Already used throughout dashboard |
| `zod` | latest | Schema validation for new API endpoints | Established pattern; all API boundaries use zod |
| `crypto.randomUUID` | Node built-in | UUIDv4 approval_id generation on PDE side | Already used in event-bus.cjs |

### No New Dependencies
All required functionality is covered by the existing stack. AlertDialog is NOT in the existing shadcn/ui components directory (no `dashboard/components/ui/alert-dialog.tsx` exists) but `@base-ui/react` exports `./alert-dialog` and is installed. Use Base UI AlertDialog directly.

**Installation:** None required.

---

## Architecture Patterns

### Existing File Map (what gets changed vs. created)

```
dashboard/
  lib/
    event-types.ts               MODIFY — add approvals key to EVENT_FILTER_GROUPS
    queries.ts                   MODIFY — add approval response query functions
    __tests__/
      event-filters.test.ts      MODIFY — add approvals group coverage
      approval-response.test.ts  CREATE — new test file for approval query functions
  app/api/
    approval-response/
      route.ts                   CREATE — GET (relay polls) + POST (dashboard writes response)
  components/
    approval-card.tsx            CREATE — card with Base UI AlertDialog
    session-card.tsx             MODIFY — add approval badge when pending approval exists
    session-detail.tsx           MODIFY — insert ApprovalCard above PhaseProgress when pending
bin/lib/
  relay.cjs                      MODIFY — add approval response polling loop
bin/
  pde-tools.cjs                  NO CHANGE NEEDED — existing event-emit with approval_id in payload works
```

### Pattern 1: Approval Filter Group Addition
**What:** Add `approvals` key to `EVENT_FILTER_GROUPS` with value `['approval_request', 'approval_response']`
**When to use:** This single change makes the EventLog auto-render an "Approvals" tab via `Object.keys(EVENT_FILTER_GROUPS)`

```typescript
// dashboard/lib/event-types.ts
export const EVENT_FILTER_GROUPS = {
  all:       null,
  tools:     ['tool_called', 'bash_called', 'file_changed'],
  agents:    ['subagent_start', 'subagent_stop'],
  phases:    ['session_start', 'session_end'],
  errors:    ['error'],
  tokens:    ['token_usage'],
  approvals: ['approval_request', 'approval_response'],  // ADD — Phase 137
} as const;
// FilterGroup type auto-expands to include 'approvals' — no manual type update needed
```

### Pattern 2: Approval Response Redis Key
**What:** Store and retrieve approval responses using scoped hash key with TTL
**When to use:** When dashboard user approves/denies (POST); when PDE relay polls for response (GET)

```typescript
// Key pattern (D-03): pde:default:approvals:{session_id}:{approval_id}
// TTL: 3600 seconds (1 hour) per D-12

// Write (POST handler in dashboard/app/api/approval-response/route.ts):
const key = `pde:default:approvals:${sessionId}:${approvalId}`;
const p = redis.pipeline();
p.hset(key, { approval_id, action, responded_at, responder_id });
p.expire(key, 3600);
await p.exec();

// Read + delete (GET handler — one-shot per D-13):
const key = `pde:default:approvals:${sessionId}:${approvalId}`;
const data = await redis.hgetall(key) as Record<string, string> | null;
if (data && Object.keys(data).length > 0) {
  await redis.del(key);  // one-shot deletion prevents replay
  return data;
}
return null;
```

### Pattern 3: /api/approval-response Route Structure
**What:** Dual-method endpoint — POST writes approval (dashboard user, Clerk auth), GET reads approval (PDE relay, Bearer token auth)
**Auth model:** POST uses Clerk `auth()` matching `/api/poll`; GET uses `validateRelayToken` matching `/api/ingest`

```typescript
// dashboard/app/api/approval-response/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateRelayToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { z } from 'zod';

const ApprovalResponseSchema = z.object({
  session_id:  z.string().uuid(),
  approval_id: z.string().uuid(),
  action:      z.enum(['approved', 'denied']),
});

// POST — user submits approval/denial (Clerk auth)
export async function POST(request: Request): Promise<NextResponse> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // parse + validate body, write to Redis, store responded_at server-side
}

// GET — PDE relay polls for pending response (Bearer token auth)
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!validateRelayToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // read session_id + approval_id from query params, fetch + delete Redis key
}
```

### Pattern 4: ApprovalCard with Base UI AlertDialog
**What:** Client component that shows pending approval context and triggers AlertDialog on approve/deny click
**When to use:** Rendered in SessionDetail when events contain an unresponded `approval_request`

```typescript
// dashboard/components/approval-card.tsx
"use client";
import * as AlertDialog from '@base-ui/react/alert-dialog';

// Pending approval detection — build a Map to handle out-of-order events:
function findPendingApproval(events: WireEnvelope[]): WireEnvelope | null {
  const responded = new Set(
    events
      .filter(e => e.event_type === 'approval_response' && e.approval_id)
      .map(e => e.approval_id)
  );
  return (
    events.find(e => e.event_type === 'approval_request' && e.approval_id && !responded.has(e.approval_id))
    ?? null
  );
}

// Base UI AlertDialog pattern (Portal required for z-index escape):
<AlertDialog.Root>
  <AlertDialog.Trigger render={<button className="min-h-[44px]">Approve</button>} />
  <AlertDialog.Portal>
    <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
    <AlertDialog.Popup className="fixed ...">
      <AlertDialog.Title>Confirm Approval</AlertDialog.Title>
      <AlertDialog.Description>{context}</AlertDialog.Description>
      <AlertDialog.Close render={<button onClick={handleApprove} className="min-h-[44px]">Confirm Approve</button>} />
      <AlertDialog.Close render={<button className="min-h-[44px]">Cancel</button>} />
    </AlertDialog.Popup>
  </AlertDialog.Portal>
</AlertDialog.Root>
```

### Pattern 5: PDE Relay Approval Polling
**What:** After flushing a batch containing an `approval_request` event, store the pending approval_id and poll the approval-response endpoint
**When to use:** Inside `startRelay` onFlush callback; when any event in the flushed batch has `event_type === 'approval_request'`

```javascript
// bin/lib/relay.cjs — addition using existing node:https/http pattern (zero new deps)
// Derive approval-response URL from ingest URL:
//   'https://example.com/api/ingest' -> 'https://example.com/api/approval-response'

function getApprovalResponse(approvalUrl, bearerToken, sessionId, approvalId) {
  return new Promise((resolve) => {
    const url = new URL(approvalUrl);
    url.searchParams.set('session_id', sessionId);
    url.searchParams.set('approval_id', approvalId);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${bearerToken}` },
      timeout: 10000,
    };
    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        } else { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.end();
  });
}
```

### Pattern 6: Emitting approval_request from PDE
**What:** Use existing `event-emit` pathway in `pde-tools.cjs` — pass `approval_id` in the JSON payload
**When to use:** When PDE workflow needs human approval before proceeding

The `createEnvelope` factory in `relay-protocol.cjs` already extracts `approval_id` from the PDE event:
```javascript
// relay-protocol.cjs line 99 — already handles approval_id passthrough:
approval_id: (pdeEvent && pdeEvent.approval_id != null) ? pdeEvent.approval_id : null,
```

So pde-tools.cjs needs no changes. The caller generates a UUID and passes it in the payload:
```bash
# From pde-tools.cjs or a Claude Code tool call:
node bin/pde-tools.cjs event-emit approval_request \
  '{"approval_id":"<uuidv4>","context":"Deploy to production","phase":"137","plan":"137-01"}'
```

### Anti-Patterns to Avoid
- **Using shadcn AlertDialog:** No `dashboard/components/ui/alert-dialog.tsx` exists. Do not run `npx shadcn add alert-dialog`. Use `@base-ui/react/alert-dialog` which is already installed.
- **Omitting AlertDialog.Portal:** AlertDialog.Popup must be wrapped in `AlertDialog.Portal` to escape overflow/stacking context of parent cards.
- **Polling all approvals on every relay tick:** The GET endpoint should accept a specific `approval_id` query param. Do not scan all pending approvals — this leaks data and is not one-shot safe.
- **Breaking `as const` on EVENT_FILTER_GROUPS:** The `as const` assertion is required for TypeScript to infer `FilterGroup` as a union type. Adding `approvals` key without `as const` breaks the type.
- **Assuming event order in findPendingApproval:** Events in the rolling buffer are newest-first from `useEventStream`. Build a Set of responded approval_ids first, then scan for unresponded requests — do not rely on positional ordering.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal with React state | Base UI `AlertDialog` | Accessibility, focus trap, keyboard dismiss — already installed |
| UUID generation | `Math.random()` hex string | `crypto.randomUUID()` | Cryptographic quality, RFC 4122, zero deps — already in event-bus.cjs |
| HTTP requests in relay daemon | `fetch` or npm http client | `node:https` + `node:http` | relay.cjs has strict zero-npm-dep constraint; `postEvents` already uses this pattern |
| Auth on approval POST | Custom token | Clerk `auth()` | Established pattern matching `/api/poll` |
| Auth on approval GET | Custom session | `validateRelayToken` | Established pattern matching `/api/ingest` |
| Redis TTL management | Manual cleanup cron | `redis.expire(key, 3600)` | Upstash SDK supports expire natively; prevents replay per D-12 |

**Key insight:** Every new capability in Phase 137 has an established pattern in the existing codebase. This is integration work, not infrastructure work.

---

## Common Pitfalls

### Pitfall 1: Approval badge on SessionCard requires session-hash signal
**What goes wrong:** `SessionCard` is server-rendered from `SessionListItem` which has no events array. It cannot detect a pending approval without additional data.
**Why it happens:** The session list queries `pde:default:session:{id}` hash which only tracks `last_event_type` — an approval_request may not be the most recent event.
**How to avoid:** Add a `pending_approval_id` field to the session hash in the ingest route when `event_type === 'approval_request'` arrives, and clear it (set to empty string) when `event_type === 'approval_response'` arrives for the same approval_id. `SessionListItem` gains `pendingApprovalId: string | null`. This keeps SessionCard as a server component.
**Warning signs:** Badge shows stale state after user approves; badge never appears even when approval is pending.

### Pitfall 2: AlertDialog requires Portal for z-index stacking
**What goes wrong:** AlertDialog renders behind other cards or gets clipped by containers with `overflow-hidden`.
**Why it happens:** Without `AlertDialog.Portal`, the popup renders in the normal DOM position inside the card hierarchy.
**How to avoid:** Always include `<AlertDialog.Portal>` wrapping both `<AlertDialog.Overlay>` and `<AlertDialog.Popup>`.

### Pitfall 3: Relay daemon cannot use Clerk auth for GET endpoint
**What goes wrong:** GET `/api/approval-response` blocks with 401 if implementation uses Clerk `auth()`.
**Why it happens:** Clerk auth requires a browser session and cookies — the relay daemon has neither.
**How to avoid:** GET uses `validateRelayToken(req)` (Bearer token), same as `/api/ingest`. POST uses Clerk `auth()` (browser user). This is already established by the dual-auth pattern.

### Pitfall 4: approval_id type narrowing in TypeScript
**What goes wrong:** TypeScript code using `event.approval_id` may fail type checks because it is `string | null`.
**Why it happens:** `WireEnvelopeSchema` defines `approval_id: z.string().uuid().nullable()` — null is valid for non-approval events.
**How to avoid:** Always guard: `if (event.approval_id) { /* string here */ }`. Do not assert `event.approval_id!` — that bypasses the null safety that makes TOCTOU detection reliable.

### Pitfall 5: findPendingApproval must handle deduplication edge cases
**What goes wrong:** If approval_response arrives in the events buffer before approval_request (due to newest-first ordering and buffer size), detection returns a false positive.
**Why it happens:** `useEventStream` prepends new events (`[...incoming, ...prev]`) — newest events are at index 0. Scanning arrays in order will find a response before its matching request if both arrived recently.
**How to avoid:** Build a Set of all responded approval_ids first, then find the first request whose approval_id is not in the Set. Order-independent.

### Pitfall 6: vitest globals:true required for CJS test extensions
**What goes wrong:** Tests added to relay.cjs test files fail with `describe is not defined` or similar.
**Why it happens:** Established Phase 134 decision: vitest v4 does not support `require('vitest')` in CJS files. Globals must be injected via config.
**How to avoid:** Root `vitest.config.ts` and `dashboard/vitest.config.ts` both already have `globals: true`. CJS test files use globals directly. TypeScript test files import from `vitest` explicitly (as seen in `poll.test.ts` imports).

---

## Code Examples

### Approval Response Zod Schema
```typescript
// Source: established pattern from ingest/route.ts
import { z } from 'zod';

const ApprovalResponseSchema = z.object({
  session_id:  z.string().uuid(),
  approval_id: z.string().uuid(),
  action:      z.enum(['approved', 'denied']),
});
// responded_at and responder_id added server-side — not trusted from client
```

### Redis One-Shot Read + Delete (D-13)
```typescript
// Source: Upstash Redis SDK pattern — matches existing queries.ts style
const key = `pde:default:approvals:${sessionId}:${approvalId}`;
const data = await redis.hgetall(key) as Record<string, string> | null;
if (data && Object.keys(data).length > 0) {
  await redis.del(key);  // one-shot — delete after first read, prevents replay
  return data;
}
return null;
```

### Relay HTTP GET (zero npm deps, matches postEvents style)
```javascript
// Source: relay.cjs postEvents pattern — same node:https/http approach
function getApprovalResponse(approvalUrl, bearerToken, sessionId, approvalId) {
  return new Promise((resolve) => {
    const url = new URL(approvalUrl);
    url.searchParams.set('session_id', sessionId);
    url.searchParams.set('approval_id', approvalId);
    const isHttps = url.protocol === 'https:';
    const httpMod = isHttps ? https : http;
    const req = httpMod.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${bearerToken}` },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(body)); } catch { resolve(null); }
          } else { resolve(null); }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.end();
  });
}
```

### Event Filter Group (APR-05)
```typescript
// Source: dashboard/lib/event-types.ts — existing as const pattern
export const EVENT_FILTER_GROUPS = {
  all:       null,
  tools:     ['tool_called', 'bash_called', 'file_changed'],
  agents:    ['subagent_start', 'subagent_stop'],
  phases:    ['session_start', 'session_end'],
  errors:    ['error'],
  tokens:    ['token_usage'],
  approvals: ['approval_request', 'approval_response'],  // Phase 137 addition
} as const;
// FilterGroup = 'all' | 'tools' | 'agents' | 'phases' | 'errors' | 'tokens' | 'approvals'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix UI primitives (shadcn default) | Base UI `@base-ui/react` | Phase 135-136 | Use `import * as AlertDialog from '@base-ui/react/alert-dialog'` — not shadcn/ui |
| `zrangebyscore` command | `zrange` with `byScore: true` | Phase 135 | Upstash SDK deprecated zrangebyscore; all queries use the unified `zrange` |
| `require('vitest')` in CJS | `globals: true` vitest config | Phase 134 | vitest v4 injects test globals; CJS files cannot require vitest |

**Deprecated/outdated:**
- `zrangebyscore`: replaced by `zrange(..., { byScore: true, withScores: true })` — already used in all existing routes
- `require('vitest')` in CJS test files: prohibited by vitest v4 — use globals

---

## Open Questions

1. **Approval badge data source for SessionCard**
   - What we know: SessionCard receives `SessionListItem` from a server query; no events array is available there.
   - What's unclear: Whether to add `pending_approval_id` to the session hash in the ingest route, or keep badge logic client-side in session list page.
   - Recommendation: Add `pending_approval_id` to the session hash. Ingest route already updates the hash per batch; add logic to set/clear `pending_approval_id` based on `event_type` in the last event. Planner should decide whether to do this in the ingest route or as a separate query on session list load.

2. **Relay approval polling — blocking vs. concurrent**
   - What we know: The relay daemon runs in a long-lived process with existing `setInterval` timers.
   - What's unclear: Should approval polling use a dedicated `setInterval`, or integrate into the existing batch flush callback.
   - Recommendation: Dedicated `setInterval` polling at 3-second intervals for pending approvals. Store pending `{sessionId, approvalId, callback}` tuples in a `Map`. On response received, invoke callback and remove from Map. On timeout (10 minutes), invoke callback with null (treated as denied). This is decoupled from the batch flush cycle.

3. **Approval timeout on PDE side**
   - What we know: D-12 sets Redis TTL to 1 hour. The relay daemon must not block indefinitely.
   - What's unclear: Exact timeout value and behavior when approval times out.
   - Recommendation (Claude's Discretion): 10-minute polling timeout. On timeout, emit an `approval_timeout` event via event-emit and treat as denied. This is fail-safe and consistent with the "approval gates block dangerous operations" intent.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd /Users/greyaltaer/code/projects/Platform\ Development\ Engine/dashboard && npm test -- --reporter=verbose` |
| Full suite command | `cd /Users/greyaltaer/code/projects/Platform\ Development\ Engine/dashboard && npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APR-01 | `approval_request` event stored with non-null approval_id via ingest | unit | `npm test -- ingest` | YES — extend `lib/__tests__/ingest.test.ts` |
| APR-01 | `findPendingApproval` returns pending approval from events array | unit | `npm test -- approval-detection` | NO — Wave 0 |
| APR-02 | ApprovalCard renders with approve/deny buttons | unit | `npm test -- approval-card` | NO — Wave 0 |
| APR-03 | POST /api/approval-response validates UUID approval_id | unit | `npm test -- approval-response` | NO — Wave 0 |
| APR-03 | GET /api/approval-response returns payload and deletes key | unit | `npm test -- approval-response` | NO — Wave 0 |
| APR-03 | GET /api/approval-response returns 404 when key absent | unit | `npm test -- approval-response` | NO — Wave 0 |
| APR-04 | GET /api/approval-response rejects non-relay auth | unit | `npm test -- approval-response` | NO — Wave 0 |
| APR-05 | EVENT_FILTER_GROUPS.approvals contains approval_request, approval_response | unit | `npm test -- event-filters` | YES — extend `lib/__tests__/event-filters.test.ts` |
| APR-05 | filterEvents with 'approvals' group filters correctly | unit | `npm test -- event-filters` | YES — extend existing tests |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test -- --reporter=verbose <pattern>`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/lib/__tests__/approval-response.test.ts` — covers APR-03 and APR-04 (GET + POST route unit tests with mocked redis and mocked auth)
- [ ] `dashboard/lib/__tests__/approval-detection.test.ts` — covers APR-01 `findPendingApproval` logic (pure function, no mocking needed)
- [ ] `dashboard/components/__tests__/approval-card.test.tsx` — covers APR-02 (render test; may be manual-only if component testing environment not configured)

Existing test infrastructure covers APR-01 ingest path (via ingest.test.ts extension) and APR-05 filter taxonomy (via event-filters.test.ts extension).

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `dashboard/lib/wire-schema.ts` — approval_id field confirmed as `z.string().uuid().nullable()`
- Direct codebase read: `dashboard/lib/event-types.ts` — EVENT_FILTER_GROUPS pattern, `as const`, FilterGroup type
- Direct codebase read: `dashboard/lib/queries.ts` — Redis key patterns, zrange usage, pipeline pattern
- Direct codebase read: `dashboard/lib/redis.ts` — Redis client configuration
- Direct codebase read: `dashboard/lib/auth.ts` — validateRelayToken pattern
- Direct codebase read: `dashboard/app/api/ingest/route.ts` — POST endpoint pattern, zod validation, pipeline
- Direct codebase read: `dashboard/app/api/poll/route.ts` — GET endpoint pattern, Clerk auth pattern
- Direct codebase read: `dashboard/app/api/events/route.ts` — SSE pattern, Redis polling
- Direct codebase read: `dashboard/components/event-log.tsx` — Object.keys(EVENT_FILTER_GROUPS) auto-render pattern
- Direct codebase read: `dashboard/components/session-detail.tsx` — render tree for insertion point
- Direct codebase read: `dashboard/components/session-card.tsx` — server component structure
- Direct codebase read: `dashboard/components/status-badge.tsx` — StatusBadge pattern with min-h-[44px]
- Direct codebase read: `dashboard/hooks/use-event-stream.ts` — events are newest-first, MAX_EVENTS=200
- Direct codebase read: `bin/lib/relay.cjs` — TailCursor, BatchQueue, postEvents, startRelay patterns
- Direct codebase read: `bin/lib/event-bus.cjs` — dispatch, safeAppendEvent, randomUUID usage
- Direct codebase read: `bin/lib/relay-protocol.cjs` — createEnvelope approval_id passthrough (line 99)
- Direct codebase read: `hooks/emit-event.cjs` — event-emit invocation pattern
- Direct codebase read: `dashboard/vitest.config.ts` — globals:true, include patterns
- Direct codebase read: all `dashboard/lib/__tests__/*.test.ts` files — established test patterns
- Node module inspection: `@base-ui/react` package exports — `./alert-dialog` confirmed available
- Direct codebase read: `dashboard/package.json` — dependency list, no @radix-ui in deps

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct package.json and node_modules inspection
- Architecture: HIGH — all integration points verified by direct code reading; no assumptions
- Pitfalls: HIGH — derived from actual code patterns and prior phase decisions in STATE.md
- Test infrastructure: HIGH — vitest.config.ts and all existing test files read directly

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack; no fast-moving external dependencies)
