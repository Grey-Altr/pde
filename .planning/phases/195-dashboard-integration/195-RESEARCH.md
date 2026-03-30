# Phase 195: Dashboard Integration - Research

**Researched:** 2026-03-30
**Domain:** Next.js dashboard UI — React Server Components, server actions, Redis hash extensions, Vitest source-inspection tests
**Confidence:** HIGH

## Summary

Phase 195 is a pure UI/data-layer extension phase. The dashboard already supports `remote-cloud` and `docker` source values in `SESSION_SOURCES`, `SessionListItem`, and `session-health-matrix.tsx`. The six DSH requirements are entirely additive: new columns in the health matrix, new Redis hash fields ingested through the existing `/api/ingest` pipeline, new server actions in `actions.ts`, a new `SyncStatePanel` component wired as pane 8, and an Infrastructure Cost card in `token-playground.tsx`.

No new libraries are needed. All patterns (source-inspection Vitest tests, server actions reading `dispatcher.pids`, shadcn Card/Badge/Progress, SSE via `use-event-stream`) are already established and proven in the codebase. The only architectural decision with non-trivial complexity is the `stopCloudSession` action, which must read `session_source` from Redis and branch: cloud sessions use a dispatcher HTTP call rather than `process.kill()`.

The `PaneGrid` component accepts `children: React.ReactNode[]` and currently renders a hard-coded 7-pane layout. Adding pane 8 requires updating `PaneGrid`'s `PANE_NAMES` array and the laptop grid layout (currently `grid-cols-3` with three rows). The `page.tsx` keyboard shortcut hint bar also shows panes 1-7 and must be extended to 8.

**Primary recommendation:** Follow the CONTEXT.md decisions verbatim. All six requirements map to targeted edits in ~6 existing files plus 2 new files (`sync-state-panel.tsx` and the test file). Write tests as source-inspection Vitest tests in `__tests__/`, consistent with the established project pattern.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard UI Approach**
- Health matrix enhancement: Extend existing SessionHealthMatrix -- source column with [C]/[D] badges (Phase 190 laid groundwork), add sync status column showing pending/synced/conflict, add cost column showing estimated $ from classify.cjs rate
- Cloud progress rendering: Synthetic event rendering -- derive progress from cloud_heartbeat events stored in Redis; phase-progress.tsx already handles indeterminate state; no local NDJSON needed
- Session control actions: Extend actions.ts with startCloudSession, stopCloudSession, inspectCloudSession server actions + API routes at /api/cloud/ -- stop calls coordinator kill method via local dispatcher
- Sync state panel: New SyncStatePanel component as pane 8 -- shows pending merges from registry, last sync timestamp from Redis, conflict indicators from merge results

**Token Playground & Testing**
- Infrastructure cost display: Extend token-playground.tsx -- add "Infrastructure Cost" card below existing cards; show container uptime (from session start/end events) x configured rate from dispatch config
- Test strategy: Vitest for server-side logic (queries, actions, derive functions) + unit tests for components -- no E2E browser tests for this phase
- Redis schema changes: Add fields to existing session hash -- sync_status, sync_last_ts, sync_conflicts, cloud_session_url, container_uptime_s -- no new Redis keys needed

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- Live cloud container logs streaming -- requires direct cloud VM connection
- Dashboard-initiated scaling -- out of scope (single session per dispatch)
- Real-time cost alerts/notifications -- future milestone
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSH-01 | Cloud sessions appear in dashboard health matrix with [C] source label | session-health-matrix.tsx already has sourceLabels['remote-cloud'] = 'Cloud'; add styled Badge for [C]/[D] and new sync/cost columns |
| DSH-02 | Cloud session progress bars and agent activity display using CloudPoller synthetic events | derive-progress.ts reads phase_name from events; cloud_heartbeat events stored via ingest route already populate the ZSET; no new derivation logic needed |
| DSH-03 | User can start, stop, and inspect cloud sessions from dashboard UI | Add startCloudSession, stopCloudSession, inspectCloudSession to actions.ts; add /api/cloud/[action]/route.ts; stop must branch on session_source to avoid process.kill for cloud |
| DSH-04 | Sync state display shows pending merges, last sync time, and conflict indicators | New SyncStatePanel component reads sync_status, sync_last_ts, sync_conflicts from Redis session hash; wired as pane 8 in page.tsx |
| DSH-05 | Container cost tracking shows uptime x rate alongside token cost in Token Playground | Extend token-playground.tsx with Infrastructure Cost card; read infra_cost_usd_cents from session hash; formatCost from derive-cost.ts is reusable |
| DSH-06 | session_source union type extended with 'remote-cloud' and 'docker' values | Already complete in wire-schema.ts (SESSION_SOURCES) and queries.ts (VALID_SOURCES, SessionListItem union); verify ingest route stores value correctly |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (current) | App Router, server actions, API routes | Project baseline |
| React | 19.x | UI components | Project baseline |
| @upstash/redis | current | Redis pipeline for session hash reads | Established in queries.ts |
| zod | 3.x / 4.x | WireEnvelope schema validation | Already in wire-schema.ts |
| shadcn (Card, Badge, Progress) | n/a | Component primitives | Used throughout dashboard |
| Tailwind CSS | 4.x | Styling | Project baseline |
| Vitest | current | Unit tests (node environment) | vitest.config.ts configured, npm test runs it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @base-ui/react/alert-dialog | current | Confirm dialogs for destructive actions | Use for stopCloudSession confirm dialog (matches FailureCard pattern) |
| lucide-react | current | Icons | Use for sync status icons if needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Source-inspection Vitest tests | @testing-library/react | Project explicitly uses node environment; no DOM renderer available |
| Extending actions.ts | Separate cloud-actions.ts | Unnecessary split; existing pattern keeps all session control in one file |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

New and modified files for this phase:

```
dashboard/
├── components/
│   ├── session-health-matrix.tsx     MODIFY -- add sync-status + cost columns, badge styling for [C]/[D]
│   ├── token-playground.tsx          MODIFY -- add Infrastructure Cost card (Card 4)
│   └── sync-state-panel.tsx          CREATE -- new SyncStatePanel component (pane 8)
├── lib/
│   └── queries.ts                    MODIFY -- extend SessionListItem with sync/cost fields
├── app/
│   ├── page.tsx                      MODIFY -- wire SyncStatePanel as pane 8, extend PaneGrid children
│   ├── actions.ts                    MODIFY -- add startCloudSession, stopCloudSession, inspectCloudSession
│   └── api/
│       ├── ingest/route.ts           MODIFY -- store sync_status, cloud_session_url, infra_cost_usd_cents on ingest
│       └── cloud/
│           └── [action]/route.ts     CREATE (optional) -- if server actions need HTTP relay to local dispatcher
├── components/layout/
│   └── pane-grid.tsx                 MODIFY -- add pane 8 name, extend laptop grid layout
└── __tests__/
    └── dsh-dashboard-integration.test.ts  CREATE -- source-inspection tests for all DSH requirements
```

### Pattern 1: Redis Hash Field Extension

**What:** Add new fields to existing pde:default:session:{id} hash without schema migration. Fields default to empty string ('') if not present -- same pattern as pending_approval_id.

**When to use:** Adding optional session metadata that arrives via the ingest pipeline.

**Reading in queries.ts:**
```typescript
// Source: existing queries.ts pattern
const syncStatus = (raw.sync_status || null) as 'pending' | 'synced' | 'conflict' | null;
const syncLastTs = raw.sync_last_ts || null;
const syncConflicts: string[] = raw.sync_conflicts ? JSON.parse(raw.sync_conflicts) : [];
const cloudSessionUrl = raw.cloud_session_url || null;
const infraCostUsdCents = raw.infra_cost_usd_cents ? Number(raw.infra_cost_usd_cents) : 0;
```

**Writing in ingest/route.ts:**
```typescript
// On cloud_sync_complete event:
if (event.event_type === 'cloud_sync_complete') {
  const evPayload = event as Record<string, unknown>;
  p.hset(`pde:default:session:${sessionId}`, {
    sync_status: String(evPayload.sync_status ?? 'synced'),
    sync_last_ts: String(evPayload.sync_ts ?? new Date().toISOString()),
    sync_conflicts: JSON.stringify(evPayload.conflicts ?? []),
  });
}
// On session_start for cloud/docker:
if (event.event_type === 'session_start') {
  const evPayload = event as Record<string, unknown>;
  if (evPayload.cloud_session_url) {
    p.hset(`pde:default:session:${sessionId}`, {
      cloud_session_url: String(evPayload.cloud_session_url),
    });
  }
}
```

### Pattern 2: Server Action with source-aware branching

**What:** stopCloudSession must not call process.kill() for cloud sessions. Instead it dispatches an HTTP request to the local PDE dispatcher.

**Critical detail from STATE.md:** killSession in actions.ts uses process.kill(entry.pid, 'SIGTERM'). Cloud sessions have no local PID. The registry entry source field (read from Redis hash session_source) determines the branch.

```typescript
// Source: actions.ts pattern extended
export async function stopCloudSession(sessionId: string): Promise<ActionResult> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return { ok: false, error: 'Unauthorized' };

  // Read cloud_session_url from Redis (not from dispatcher.pids -- cloud has no local PID)
  const raw = await redis.hgetall(`pde:default:session:${sessionId}`) as Record<string,string> | null;
  if (!raw) return { ok: false, error: 'Session not found' };

  const dispatcherUrl = process.env.PDE_DISPATCHER_URL;
  if (!dispatcherUrl) return { ok: false, error: 'PDE_DISPATCHER_URL not set' };

  // POST to local dispatcher kill endpoint
  const res = await fetch(`${dispatcherUrl}/api/sessions/${sessionId}/kill`, { method: 'POST' });
  if (!res.ok) return { ok: false, error: `Dispatcher kill failed: ${res.status}` };
  return { ok: true };
}
```

### Pattern 3: PaneGrid Extension

**What:** PaneGrid currently hardcodes 7 panes. Adding pane 8 requires updating PANE_NAMES and the laptop grid layout. Tablet and phone layouts show panes 0-3 only -- pane 8 is laptop-only.

**Key constraint:** PaneGrid takes children: React.ReactNode[]. page.tsx passes exactly N children in order. Currently 7 children map to indices 0-6. SyncStatePanel becomes index 7.

**Laptop grid update needed:** The current 3-row layout renders children[0-2], children[3-5], then children[6] full-width. With 8 panes, the cleanest approach: add pane 7 as a second full-width row, or make the final row 2-column with children[6] and children[7].

### Pattern 4: Source-Inspection Vitest Tests

**What:** The entire test suite uses readFileSync to inspect source files rather than rendering React components. This is the established pattern because vitest.config.ts sets environment: 'node' with no DOM.

```typescript
// Source: __tests__/page-wiring.test.ts, failure-card.test.ts pattern
import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(
  path.resolve(import.meta.dirname, '../components/sync-state-panel.tsx'),
  'utf-8'
);

describe('SyncStatePanel (DSH-04)', () => {
  it('is a "use client" component', () => {
    expect(source).toContain('"use client"');
  });
  it('renders sync_status badge', () => {
    expect(source).toContain('sync_status');
  });
});
```

For logic tests (queries, actions, derive functions), use pure function calls:
```typescript
// Source: __tests__/derive-variant.test.ts pattern
import { deriveSyncStatus } from '@/lib/derive-sync';
describe('deriveSyncStatus', () => { ... });
```

### Anti-Patterns to Avoid

- **process.kill() for cloud sessions:** Cloud sessions have no local PID. stopCloudSession MUST use HTTP dispatch to local PDE process, not process.kill(). Calling process.kill(0, 'SIGTERM') sends SIGTERM to the Next.js process itself.
- **Storing sync_conflicts as a bare string:** Must be JSON.stringify(array) when writing and JSON.parse(string) when reading, because Redis hashes only store strings.
- **Adding pane 8 without updating PANE_NAMES:** PaneGrid uses PANE_NAMES[index] for aria-label. Missing name produces undefined which breaks accessibility.
- **Importing SessionSource type from wire-schema.ts in queries.ts:** The STATE.md decision (Phase 190) locks SessionListItem.source as an inline union, not an imported type, to avoid TypeScript/CJS cross-module import chain issues.
- **Using @testing-library/react:** Not installed. Tests must use node environment + source inspection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost formatting | Custom formatter | formatCost() from derive-cost.ts | Already handles $0.00, sub-cent, and full dollar formatting |
| Token formatting | Custom formatter | formatTokens() from derive-cost.ts | Handles k/M suffixes consistently |
| Redis pipeline batching | Sequential hset calls | redis.pipeline() + p.exec() | Established ingest pattern; single HTTP round-trip to Upstash |
| Relative time display | Custom Date arithmetic | formatElapsed() pattern from session-health-matrix.tsx | Reuse existing time formatting logic |
| Source label display | Hardcode strings inline | sourceLabels map in session-health-matrix.tsx | Already maps all 5 sources including 'remote-cloud' and 'docker' |

---

## Runtime State Inventory

Phase 195 is not a rename/refactor phase. Included to note Redis schema additions.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Existing pde:default:session:* Redis hashes lack sync_status, sync_last_ts, sync_conflicts, cloud_session_url, container_uptime_s, infra_cost_usd_cents fields | Code edit only -- fields are optional, read with fallback. No migration needed; old sessions show null values. |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | PDE_DISPATCHER_URL -- required for stopCloudSession to reach local dispatcher | Document in .env.example; action returns graceful error if not set |
| Build artifacts | None | None |

---

## Common Pitfalls

### Pitfall 1: PaneGrid children count mismatch
**What goes wrong:** Adding pane 8 to page.tsx without updating PaneGrid's PANE_NAMES array causes aria-label={undefined} on the new pane. The phone view indexes into children[activePane] -- if activePane can reach 7, the hotkeys hook must also be updated.
**Why it happens:** PaneGrid is a dumb renderer; the pane count is distributed across three places: PANE_NAMES, the laptop grid layout, and the keyboard shortcut hint bar in page.tsx.
**How to avoid:** Update all three in the same task. Search for [1, 2, 3, 4, 5, 6, 7] in page.tsx (the shortcut hint bar) and extend to 8.
**Warning signs:** TypeScript won't catch this -- it's a runtime index issue.

### Pitfall 2: JSON.parse on empty string from Redis
**What goes wrong:** Redis returns '' (empty string) for unset hash fields when using hgetall. JSON.parse('') throws a SyntaxError.
**Why it happens:** hgetall returns empty string for fields set with empty value, not null.
**How to avoid:** Always guard: raw.sync_conflicts ? JSON.parse(raw.sync_conflicts) : []

### Pitfall 3: stopCloudSession calling process.kill on PID 0 or -1
**What goes wrong:** If dispatcher.pids has a cloud session entry with pid: 0 or pid: -1 (cloud sessions have no local PID), calling process.kill(0, 'SIGTERM') sends SIGTERM to the process group -- potentially killing the Next.js server.
**Why it happens:** The existing killSession action doesn't check source before calling process.kill.
**How to avoid:** stopCloudSession must read session_source from Redis hash directly, not from dispatcher.pids. Never call process.kill when source is 'remote-cloud' or 'docker'.

### Pitfall 4: Pane 8 visible on phone/tablet unexpectedly
**What goes wrong:** PaneGrid phone view renders children[activePane]. If activePane state reaches 7, the phone view tries to render children[7] which may be undefined.
**Why it happens:** Phone/tablet pane selectors only show the first N panes visually but activePane state is shared.
**How to avoid:** Add 'Sync' to PANE_NAMES array in pane-grid.tsx so the undefined case is handled, and clamp activePane to valid range.

---

## Code Examples

Verified patterns from the codebase:

### Extended SessionListItem with sync fields
```typescript
// queries.ts -- add to interface and getSessions/getSessionMeta
export interface SessionListItem {
  id: string;
  status: SessionStatus;
  phase: string;
  plan: string;
  lastEventType: string;
  lastEventTs: number;
  startedAt: number;
  pendingApprovalId: string | null;
  source: 'local' | 'remote-ssh' | 'remote-managed' | 'remote-cloud' | 'docker';
  // New in Phase 195:
  syncStatus: 'pending' | 'synced' | 'conflict' | null;
  syncLastTs: string | null;
  syncConflicts: string[];
  cloudSessionUrl: string | null;
  infraCostUsdCents: number;
}
```

### Source badge rendering pattern for health matrix
```tsx
// session-health-matrix.tsx -- replace sourceLabels with richer sourceBadge config
const sourceBadges: Record<SessionListItem['source'], { label: string; className: string }> = {
  'local':          { label: 'Local', className: 'text-muted-foreground' },
  'remote-ssh':     { label: 'SSH',   className: 'text-blue-500' },
  'remote-managed': { label: 'Mgd',   className: 'text-purple-500' },
  'remote-cloud':   { label: '[C]',   className: 'text-orange-500 font-mono font-bold' },
  'docker':         { label: '[D]',   className: 'text-cyan-500 font-mono font-bold' },
};
```

### SyncStatePanel skeleton (follows Card pattern from token-playground.tsx)
```tsx
"use client";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SessionListItem } from '@/lib/queries';

interface SyncStatePanelProps {
  sessions: SessionListItem[];
}

export function SyncStatePanel({ sessions }: SyncStatePanelProps) {
  const pending = sessions.filter(s => s.syncStatus === 'pending');
  const conflicts = sessions.flatMap(s => s.syncConflicts);
  const lastSync = sessions
    .map(s => s.syncLastTs)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return (
    <Card className="w-full">
      <CardContent className="py-4 space-y-3">
        <p className="text-sm font-semibold">State Sync</p>
        {/* pending count, last sync timestamp, conflict list */}
      </CardContent>
    </Card>
  );
}
```

### Dispatcher HTTP relay pattern for stopCloudSession
```typescript
// actions.ts -- stopCloudSession must not process.kill cloud sessions
export async function stopCloudSession(sessionId: string): Promise<ActionResult> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return { ok: false, error: 'Unauthorized' };

  const dispatcherUrl = process.env.PDE_DISPATCHER_URL;
  if (!dispatcherUrl) {
    return { ok: false, error: 'PDE_DISPATCHER_URL not configured -- session control only works locally' };
  }

  try {
    const res = await fetch(`${dispatcherUrl}/api/sessions/${sessionId}/kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `Dispatcher returned ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
```

---

## Environment Availability

Phase 195 is a pure Next.js UI/Redis extension. All dependencies (Next.js, Redis/Upstash, Vitest) are already installed and running. No external tools need probing.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Upstash Redis | Session hash reads/writes | Already in production | @upstash/redis current | -- |
| Vitest | Test suite | Already installed | see vitest.config.ts | -- |
| PDE_DISPATCHER_URL | stopCloudSession action | Runtime-only (not in dashboard deploy) | env var | Action returns graceful error |

**Missing dependencies with no fallback:** None blocking.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment, no DOM) |
| Config file | dashboard/vitest.config.ts |
| Quick run command | cd dashboard && npm test |
| Full suite command | cd dashboard && npm test |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DSH-01 | Health matrix renders [C]/[D] source labels with styled badges | source-inspection | cd dashboard && npm test | Wave 0 |
| DSH-02 | Cloud heartbeat events derive progress (no local NDJSON needed) | unit (derive function) | cd dashboard && npm test | Wave 0 |
| DSH-03 | stopCloudSession action branches on source, never calls process.kill for cloud | source-inspection + logic | cd dashboard && npm test | Wave 0 |
| DSH-04 | SyncStatePanel renders pending count, last sync time, conflict list | source-inspection | cd dashboard && npm test | Wave 0 |
| DSH-05 | Infrastructure Cost card appears in token-playground.tsx | source-inspection | cd dashboard && npm test | Wave 0 |
| DSH-06 | SESSION_SOURCES includes 'remote-cloud' and 'docker'; queries.ts VALID_SOURCES matches | unit (import + assert) | cd dashboard && npm test | Wave 0 |

### Sampling Rate
- **Per task commit:** cd dashboard && npm test
- **Per wave merge:** cd dashboard && npm test
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] dashboard/__tests__/dsh-dashboard-integration.test.ts -- covers DSH-01 through DSH-06

All existing test infrastructure is in place. Only the new test file needs creation.

---

## Open Questions

1. **Does the local dispatcher expose an HTTP kill endpoint for cloud sessions?**
   - What we know: actions.ts reads dispatcher.pids and calls process.kill for local sessions. No HTTP kill endpoint is documented in the read files.
   - What is unclear: The exact URL scheme of the dispatcher's HTTP API for cloud session termination.
   - Recommendation: Plan should define the dispatcher endpoint contract explicitly. If not yet implemented, stopCloudSession can use the cleanup-requests/ file-based handshake pattern (matching abandonSession) as a fallback.

2. **Which wire event type carries sync_status into the ingest pipeline?**
   - What we know: CONTEXT.md says "sync_status from registry" and "last sync timestamp from Redis." Phase 192 (complete) pushes .planning/ via git after lock release.
   - What is unclear: Whether Phase 192 emits a structured wire event (e.g., cloud_sync_complete) or updates Redis via a separate mechanism outside the ingest pipeline.
   - Recommendation: Plan should define the event type. Default assumption: cloud_sync_complete event with sync_status, sync_ts, conflicts fields in the WireEnvelope payload.

3. **Where is the infrastructure cost rate configured?**
   - What we know: CONTEXT.md says "container uptime x configured rate from dispatch config." formatCost from derive-cost.ts is reusable.
   - What is unclear: Whether the rate is a process.env var, a config file, or hardcoded. The dispatch config lives in CJS modules, not directly accessible from Next.js server actions.
   - Recommendation: Use process.env.PDE_INFRA_COST_RATE_CENTS_PER_HOUR (default: 0 if unset). Document in .env.example. Planner should add this env var definition as an explicit task.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| sourceLabels as plain text in health matrix | Styled [C]/[D] Badge with color coding | Phase 195 | Cloud/Docker sessions visually distinct |
| 7-pane grid | 8-pane grid with SyncStatePanel | Phase 195 | PaneGrid PANE_NAMES, laptop layout, and keyboard shortcuts all need extending |
| Token cost only in TokenPlayground | Token cost + Infrastructure cost side by side | Phase 195 | New Card 4 below existing 3 cards |

---

## Sources

### Primary (HIGH confidence)
- Direct source reads: dashboard/components/session-health-matrix.tsx, dashboard/lib/queries.ts, dashboard/app/actions.ts, dashboard/app/api/ingest/route.ts, dashboard/app/page.tsx, dashboard/components/token-playground.tsx, dashboard/lib/derive-cost.ts, dashboard/lib/wire-schema.ts, dashboard/components/layout/pane-grid.tsx, dashboard/components/failure-card.tsx
- Direct source reads: dashboard/vitest.config.ts, dashboard/__tests__/page-wiring.test.ts, dashboard/__tests__/failure-card.test.ts, dashboard/__tests__/derive-variant.test.ts
- .planning/phases/195-dashboard-integration/195-CONTEXT.md
- .planning/REQUIREMENTS.md -- DSH-01 through DSH-06
- .planning/STATE.md -- accumulated decisions (Phase 190 inline union, Phase 192 push-after-lock)

### Secondary (MEDIUM confidence)
- None required -- all findings from direct source inspection

### Tertiary (LOW confidence)
- Dispatcher HTTP API shape for cloud session kill (inferred from CONTEXT.md description; not documented in read files)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- confirmed from package.json and existing imports
- Architecture: HIGH -- confirmed from direct source inspection of all critical files
- Pitfalls: HIGH -- confirmed from source (process.kill PID 0 risk, JSON.parse empty string, PaneGrid index issues)
- Open questions: MEDIUM -- 3 gaps that planner must define explicitly

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable Next.js/Redis stack; UI code changes only on feature work)
