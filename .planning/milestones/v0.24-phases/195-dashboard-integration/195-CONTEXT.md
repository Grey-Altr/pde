# Phase 195: Dashboard Integration - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Smart discuss (grey area proposals accepted)

<domain>
## Phase Boundary

Cloud and Docker sessions are visible in the dashboard health matrix with source labels, sync state, and cost tracking, and users can start, stop, and inspect cloud sessions from the dashboard UI.

</domain>

<decisions>
## Implementation Decisions

### Dashboard UI Approach
- **Health matrix enhancement:** Extend existing SessionHealthMatrix — source column with [C]/[D] badges (Phase 190 laid groundwork), add sync status column showing pending/synced/conflict, add cost column showing estimated $ from classify.cjs rate
- **Cloud progress rendering:** Synthetic event rendering — derive progress from cloud_heartbeat events stored in Redis; phase-progress.tsx already handles indeterminate state; no local NDJSON needed
- **Session control actions:** Extend actions.ts with startCloudSession, stopCloudSession, inspectCloudSession server actions + API routes at /api/cloud/ — stop calls coordinator kill method via local dispatcher
- **Sync state panel:** New SyncStatePanel component as pane 8 — shows pending merges from registry, last sync timestamp from Redis, conflict indicators from merge results

### Token Playground & Testing
- **Infrastructure cost display:** Extend token-playground.tsx — add "Infrastructure Cost" card below existing cards; show container uptime (from session start/end events) × configured rate from dispatch config
- **Test strategy:** Vitest for server-side logic (queries, actions, derive functions) + unit tests for components — no E2E browser tests for this phase
- **Redis schema changes:** Add fields to existing session hash — sync_status, sync_last_ts, sync_conflicts, cloud_session_url, container_uptime_s — no new Redis keys needed

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dashboard/components/session-health-matrix.tsx` — Main session table with sourceLabels already including 'remote-cloud' and 'docker'
- `dashboard/components/token-playground.tsx` — 3-card layout (Context Window, Session Cost, Per-Agent Breakdown)
- `dashboard/lib/queries.ts` — getSessions/getSessionMeta with SessionListItem including source union
- `dashboard/lib/wire-schema.ts` — SESSION_SOURCES, WireEnvelopeSchema
- `dashboard/lib/derive-cost.ts` — Token cost calculation
- `dashboard/lib/derive-progress.ts` — Phase/plan progress extraction
- `dashboard/app/actions.ts` — killSession, abandonSession, persistSessionCost server actions
- `dashboard/app/api/ingest/route.ts` — Event ingestion pipeline
- `dashboard/components/failure-card.tsx` — Session control UI pattern (Retry/Abandon/Kill)

### Established Patterns
- Server components for data fetching, client components for interactivity
- SSE via use-event-stream.ts hook for real-time updates
- Redis HASH for session metadata, ZSET for events
- Server actions for mutations, API routes for streaming
- Tailwind + shadcn components (Card, Progress, Badge, etc.)
- 7-pane grid with PaneGrid, keyboard shortcuts 1-7

### Integration Points
- `session-health-matrix.tsx` — extend with sync status + cost columns
- `token-playground.tsx` — add Infrastructure Cost card
- `actions.ts` — add cloud session control actions
- `queries.ts` — extend getSessions to include sync/cost fields
- `app/api/ingest/route.ts` — store sync_status, cloud_session_url in Redis hash
- `dashboard/app/page.tsx` — add SyncStatePanel as pane 8

</code_context>

<specifics>
## Specific Ideas

### New Redis Session Hash Fields
```
sync_status: 'pending' | 'synced' | 'conflict' | null
sync_last_ts: ISO8601 timestamp | null
sync_conflicts: JSON array of conflict file paths | null
cloud_session_url: string (claude.ai session URL) | null
container_uptime_s: number (seconds of container runtime) | null
infra_cost_usd_cents: number (uptime × rate) | null
```

### SyncStatePanel Component Structure
```tsx
<Card>
  <CardHeader>
    <h3>State Sync</h3>
    <StatusBadge status={overallSyncStatus} />
  </CardHeader>
  <CardContent>
    <div>Pending Merges: {pendingCount}</div>
    <div>Last Sync: {formatRelativeTime(lastSyncTs)}</div>
    {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
  </CardContent>
</Card>
```

### Cloud Session Actions
```typescript
// actions.ts additions
export async function startCloudSession(phase: number, plan: number): Promise<ActionResult>
  // POST to local dispatcher /api/dispatch with backend='cloud'
  // Returns { ok: true, sessionId } or error

export async function stopCloudSession(sessionId: string): Promise<ActionResult>
  // Look up cloud_session_url from Redis
  // Kill via coordinator kill() method (which calls spawnCloudSession kill handle)

export async function inspectCloudSession(sessionId: string): Promise<{ url: string; status: string }>
  // Read cloud_session_url + status from Redis hash
  // Return for dashboard link rendering
```

</specifics>

<deferred>
## Deferred Ideas

- Live cloud container logs streaming — requires direct cloud VM connection
- Dashboard-initiated scaling — out of scope (single session per dispatch)
- Real-time cost alerts/notifications — future milestone

</deferred>
