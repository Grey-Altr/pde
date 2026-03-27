# Phase 147: Dashboard Integration - Research

**Researched:** 2026-03-27
**Domain:** Next.js 16 / React 19 / Tailwind v4 / Base UI 1.3 — real-time multi-session dashboard
**Confidence:** HIGH (all findings verified against installed versions and live docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSH-01 | Session health matrix shows all active sessions with status, phase, source, runtime | `getSessions()` pipeline pattern extended; `session_source` field added to ingest + Redis hash; source column added to matrix table |
| DSH-02 | Event log supports filtering by individual session or all sessions | `nuqs` v2 `useQueryState` for persistent session filter; event log component refactored to consume filter |
| DSH-03 | Color-coded session tags distinguish events from different sessions | Deterministic palette assignment (session index → Tailwind color class); badge per row |
| DSH-04 | Multi-phase progress view with one progress bar per active phase | New `MultiPhaseProgress` component; one `<Progress>` per active session derived from events |
| DSH-05 | Aggregate status bar shows active count, queued count, total cost | New `AggregateStatusBar` component; derived from `getSessions()` metadata; cost summed via `deriveCost` |
| DSH-06 | Failure cards with retry/abandon buttons (touch-friendly, 44px targets) | Existing `ApprovalCard` pattern extended; `shadcn/ui` `AlertDialog` for Kill confirmation |
| DSH-07 | Merge notifications via Web Push | Existing push infra (`web-push 3.6.7`, `serwist 9.5.7`, `sendPushToOwner`) extended for session_end events |
| DSH-08 | Tiered action chevron showing current + last two state transitions per session | New `ActionChevron` component; last three `event_type` values from session events array |
| DSH-09 | Striped animated progress bars (speed-as-signal) | CSS `repeating-linear-gradient` + `@keyframes` on `ProgressIndicator`; `data-indeterminate` for active; animation-duration CSS variable controls speed |
| DSH-10 | Actions render as buttons on phone/tablet, buttons+commands on laptop | Responsive: `hidden md:flex` for keyboard command labels; breakpoint `md` = tablet/laptop boundary |
| DSH-11 | Responsive pane navigation (tab bar on phone, 2x2 grid on tablet, full grid on laptop) | Breakpoint strategy: `sm` hidden, `md` 2-col, `lg` 7-pane grid; `BottomNav` extends to tablet breakpoint |
| DSH-12 | Persistent session filter across all tabs | `nuqs` v2 `useQueryState('session')` in root layout; filter survives tab/route navigation via URL |
| DSH-13 | Keyboard shortcuts on laptop (1-7 pane focus, s/a session cycle, f expand, Esc collapse) | `react-hotkeys-hook` v5.2.4; `HotkeysProvider` wraps app; scopes prevent input-field conflicts |
</phase_requirements>

---

## Summary

The v0.17 dashboard already ships a Next.js 16 / React 19 / Tailwind v4 app with Clerk auth, Upstash Redis as the event store, SSE + polling fallback, and Web Push via Serwist. Phase 147 extends this foundation rather than replacing it. The current architecture is per-session (single `useEventStream(sessionId)`) — Phase 147 adds a multi-session aggregated view with session-scoped filtering, responsive layout tiers, and new UI primitives.

All new dependencies are small and compatible with the installed stack. `react-hotkeys-hook@5.2.4` handles keyboard shortcuts declaratively without runtime conflicts. `nuqs@2.8.9` provides URL-persisted session filter state that survives tab navigation and page reload. Striped animated progress bars are purely CSS — no new library needed; Base UI's `data-indeterminate` attribute is the hook for the animation state.

The one data gap requiring backend work: DSH-01 needs `session_source` (local/remote-ssh) in the Redis session hash. The `machine_id` field in `WireEnvelope` is the hostname of the relay host but not the backend type. The ingest route must be extended to store a `session_source` field written by the relay daemon (or derived from the machine_id pattern).

**Primary recommendation:** Extend the existing per-session dashboard into a multi-session grid by adding two new hooks (`useAllSessions`, `useGlobalFilter`), three new components (`SessionHealthMatrix`, `MultiPhaseProgress`, `AggregateStatusBar`, `FailureCard`, `ActionChevron`), and two new layout modes driven by Tailwind breakpoints.

---

## Standard Stack

### Core (already installed — DO NOT reinstall)

| Library | Installed Version | Purpose | Notes |
|---------|------------------|---------|-------|
| next | 16.2.1 | App router, SSE routes, server actions | Already in use |
| react | 19.2.4 | UI rendering | Already in use |
| tailwindcss | 4.2.2 | Utility CSS, breakpoints | Already in use |
| @base-ui/react | 1.3.0 | Progress, Tabs primitives | Already in use — `data-indeterminate` available |
| shadcn (cli) | 4.1.0 | Component scaffolding | Already in use |
| lucide-react | 1.6.0 | Icons | Already in use |
| clsx + tailwind-merge | 2.1.1 / 3.5.0 | Class composition | Already in use |
| @upstash/redis | 1.37.0 | Event + session store | Already in use |
| @clerk/nextjs | 7.0.6 | Auth | Already in use |
| web-push | 3.6.7 | Web Push VAPID | Already in use |
| serwist | 9.5.7 | Service worker / PWA | Already in use |
| zod | 4.3.6 | Schema validation | Already in use |
| vitest | 4.1.1 | Test runner | Already in use |

### New Dependencies to Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hotkeys-hook | ^5.2.4 | Keyboard shortcuts (DSH-13) | Industry standard; 5.x supports React 19; built-in input-focus guard |
| nuqs | ^2.8.9 | URL-persisted session filter (DSH-12) | Type-safe search params for Next.js App Router; zero runtime deps; survives navigation |

**Installation:**
```bash
cd dashboard && npm install react-hotkeys-hook@^5.2.4 nuqs@^2.8.9
```

**Version verification (confirmed 2026-03-27):**
- `react-hotkeys-hook@5.2.4` — last published ~2 months ago
- `nuqs@2.8.9` — last published ~1 month ago; supports `next>=14.2.0` and `react@^18.3 || ^19`

### Supporting (already installed)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| tw-animate-css | Tailwind animation utilities | For enter/exit transitions on failure cards |
| next-themes | Dark mode | Already wired; no changes needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nuqs | React Context + useState | Context state does not survive tab navigation; URL state does |
| nuqs | zustand persist | Zustand adds a dependency; nuqs URL state is automatically shareable |
| react-hotkeys-hook | Native keydown listeners | Hand-rolling requires focus tracking, input guard, teardown — unnecessary complexity |
| CSS striped progress | framer-motion | CSS-only is lighter; framer-motion is a large dep for a visual-only effect |

---

## Architecture Patterns

### Recommended Project Structure

```
dashboard/
├── app/
│   ├── layout.tsx               # ADD: NuqsAdapter wrapper
│   ├── page.tsx                 # EXTEND: use session filter; add AggregateStatusBar
│   ├── api/
│   │   ├── events/route.ts      # EXTEND: support ?session=all for multi-session SSE
│   │   └── ingest/route.ts      # EXTEND: store session_source in Redis hash
├── components/
│   ├── session-health-matrix.tsx  # NEW: DSH-01
│   ├── multi-phase-progress.tsx   # NEW: DSH-04
│   ├── aggregate-status-bar.tsx   # NEW: DSH-05
│   ├── failure-card.tsx           # NEW: DSH-06 (extends approval-card pattern)
│   ├── action-chevron.tsx         # NEW: DSH-08
│   ├── layout/
│   │   ├── bottom-nav.tsx         # EXTEND: 7-tab layout; responsive breakpoints DSH-11
│   │   └── pane-grid.tsx          # NEW: responsive 2x2 / 7-pane grid DSH-11
│   └── ui/
│       └── progress.tsx           # EXTEND: add striped-animated variant DSH-09
├── hooks/
│   ├── use-event-stream.ts        # EXTEND: support sessionId='all' for aggregated stream
│   ├── use-all-sessions.ts        # NEW: polls getSessions() for health matrix
│   ├── use-global-filter.ts       # NEW: wraps nuqs useQueryState('session')
│   └── use-hotkeys-dashboard.ts   # NEW: registers all DSH-13 shortcuts
└── lib/
    ├── queries.ts                 # EXTEND: add session_source to SessionListItem
    ├── session-status.ts          # EXTEND: add 'failed' | 'queued' status variants
    └── wire-schema.ts             # EXTEND: add session_source optional field
```

### Pattern 1: URL-Persisted Session Filter (DSH-12)

**What:** Single `?session=<uuid>|all` query param drives all dashboard views. All components read the same nuqs state.
**When to use:** Any filter that must survive tab-to-tab navigation.

```typescript
// Source: https://nuqs.dev/docs/adapters — NuqsAdapter in layout.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}

// hooks/use-global-filter.ts
import { useQueryState, parseAsString } from 'nuqs';

export function useGlobalFilter() {
  return useQueryState('session', parseAsString.withDefault('all'));
}
```

### Pattern 2: Keyboard Shortcuts with HotkeysProvider (DSH-13)

**What:** Wrap the app in `HotkeysProvider`; register shortcuts in a single hook.
**When to use:** Any page with laptop-only keyboard navigation.

```typescript
// Source: https://react-hotkeys-hook.vercel.app/docs/api/use-hotkeys
import { HotkeysProvider, useHotkeys } from 'react-hotkeys-hook';

// In layout.tsx or root client component:
<HotkeysProvider>{children}</HotkeysProvider>

// hooks/use-hotkeys-dashboard.ts
export function useHotkeysDashboard({ onPaneSelect, onSessionCycle, onExpand, onCollapse }) {
  // 1-7 pane focus — only fires when not in input
  useHotkeys(['1','2','3','4','5','6','7'], (_, handler) => {
    onPaneSelect(Number(handler.key));
  });
  useHotkeys('s', () => onSessionCycle('next'));
  useHotkeys('a', () => onSessionCycle('prev'));
  useHotkeys('f', () => onExpand());
  useHotkeys('escape', () => onCollapse());
  // enableOnFormTags defaults false — safe inside inputs automatically
}
```

### Pattern 3: Striped Animated Progress Bar via CSS (DSH-09)

**What:** Speed-as-signal: animated stripes for executing, slow stripes for waiting, no animation for failed.
**When to use:** Any indeterminate progress bar where animation speed communicates state.

```css
/* In globals.css — @layer utilities */
@keyframes progress-stripes {
  from { background-position: 1rem 0; }
  to   { background-position: 0 0; }
}

/* Applied to ProgressIndicator via className when value is null */
[data-indeterminate] .progress-striped {
  background-image: repeating-linear-gradient(
    45deg,
    currentColor 25%,
    transparent 25%,
    transparent 50%,
    currentColor 50%,
    currentColor 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-stripes var(--progress-stripe-duration, 0.6s) linear infinite;
}

/* Speed variants via CSS custom property */
.progress-executing { --progress-stripe-duration: 0.6s; }
.progress-waiting   { --progress-stripe-duration: 2s;   }
.progress-failed    { animation: none; opacity: 0.4;    }
```

**Important:** Base UI `Progress` uses `data-indeterminate` when `value={null}`. Set `value={null}` for all in-progress sessions; animate using the CSS selector above on `ProgressIndicator`. The existing `<Progress value={null} />` in `phase-progress.tsx` already passes `value={null}` — this is the correct hook point.

### Pattern 4: Multi-Session SSE Aggregation (DSH-02, DSH-03)

**What:** The existing `/api/events` SSE endpoint is per-session (`?session=<uuid>`). For the multi-session view, either (a) open N parallel EventSource connections (one per active session) or (b) extend the route with `?session=all` that fans out across Redis sorted set.

**Recommendation: N parallel EventSource connections, one per session.** This is simpler, avoids rewriting the SSE route, and the browser limit (6 connections per origin) is not a concern because active sessions are typically 3-6 (matches concurrency limit from DSP-06). Aggregated hook:

```typescript
// hooks/use-all-sessions.ts — polls Redis via a new /api/sessions endpoint
export function useAllSessions(pollIntervalMs = 5000): SessionListItem[] {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  useEffect(() => {
    const tick = () => fetch('/api/sessions').then(r => r.json()).then(setSessions);
    tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);
  return sessions;
}
```

Add `/api/sessions` route that calls `getSessions()` and returns JSON. This is the lightweight polling path for the health matrix. Live event stream per session is only opened when user drills into a session detail.

### Pattern 5: Responsive Pane Layout (DSH-11)

**What:** Phone = bottom tab bar, Tablet = 2x2 grid, Laptop = 7-pane full grid.
**Breakpoints (Tailwind v4 defaults):** `sm=640px`, `md=768px`, `lg=1024px`

```tsx
// components/layout/pane-grid.tsx
// Phone: BottomNav + single active pane (existing pattern)
// Tablet (md): 2-column CSS grid, 2 rows
// Laptop (lg): CSS grid-template-areas for 7-pane layout

<div className="
  grid grid-cols-1
  md:grid-cols-2 md:grid-rows-2
  lg:grid-cols-3 lg:grid-rows-3
  gap-4
">
  {/* Panes show/hide with responsive classes */}
</div>
```

Pane numbering for DSH-13 keyboard shortcuts: panes 1-7 map to named grid areas. Use `useRef` array to focus-scroll to each pane when shortcut fires.

### Pattern 6: Failure Cards with AlertDialog Kill Confirmation (DSH-06)

**What:** Retry and Abandon are direct buttons (no confirmation). Kill requires `AlertDialog` because it's destructive.
**Pattern:** Mirrors existing `ApprovalCard` — server action + optimistic UI.

```tsx
// components/failure-card.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogDescription,
         AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
         AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Kill button opens AlertDialog; Retry + Abandon fire server actions directly
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" className="min-h-[44px] min-w-[44px]">Kill</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Kill session?</AlertDialogTitle>
      <AlertDialogDescription>
        This will terminate the session immediately. The worktree will be removed.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={onKill}>Kill session</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Note: `shadcn/ui` provides `AlertDialog` — run `npx shadcn add alert-dialog` to scaffold it. This is a missing UI component from the current `components/ui/` directory.

### Pattern 7: Color-Coded Session Tags (DSH-03)

**What:** Each session gets a consistent color derived from its index in the sorted session list.
**Don't hand-roll a hash function.** Use a fixed palette of N Tailwind colors; index mod N.

```typescript
// lib/session-colors.ts
const SESSION_PALETTE = [
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
] as const;

export function sessionColor(index: number): string {
  return SESSION_PALETTE[index % SESSION_PALETTE.length];
}
```

Tag applied in event log rows: `<Badge className={sessionColor(sessionIndex)}>{sessionId.slice(0, 8)}</Badge>`.

### Anti-Patterns to Avoid

- **Opening one EventSource per event log row**: SSE connections are per-session at the detail level, not per-event. The health matrix uses polling.
- **Global Zustand store for session filter**: URL state (nuqs) is superior because it survives page reload, is shareable, and avoids hydration mismatches in RSC.
- **Hand-rolling keyboard shortcut deduplication**: `react-hotkeys-hook` handles focus guard, modifier conflicts, and cleanup automatically.
- **Using `value={0}` for indeterminate progress**: Base UI sets `data-indeterminate` only when `value={null}`. Using `0` gives a zero-width deterministic bar — wrong state signal.
- **Adding animation to `ProgressTrack`**: Animate `ProgressIndicator`, not the track. The track is the container; the indicator is the fill that shows progress state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard shortcut registration + input guard | Custom `keydown` event listener | `react-hotkeys-hook` | Built-in input-field guard, cleanup, modifier handling, scope system |
| URL-persisted filter state | `useSearchParams` + `router.push` | `nuqs` `useQueryState` | Manual URLSearchParams is verbose, not type-safe, and error-prone on server |
| Striped progress bar animation | Custom animation library | CSS `@keyframes` + `repeating-linear-gradient` | Pure CSS; no dependency; Base UI `data-indeterminate` is the hook |
| Destructive action confirmation | Custom modal/dialog | `shadcn/ui` `AlertDialog` | Focus trap, ARIA, keyboard dismiss handled by Radix primitive underneath |
| Session color assignment | Hash function over session UUID | Deterministic palette (index mod N) | UUIDs look random but index order is stable; avoids color collisions adjacent in list |
| Multi-session SSE fan-out | Custom Redis pub/sub route | N parallel per-session EventSource | Browser limit is 6 per origin; PDE concurrency limit is also 3-6; no fan-out needed |
| Touch target enforcement | Per-button `padding` overrides | `min-h-[44px] min-w-[44px]` Tailwind utilities | Consistent pattern already used in existing `EventLog` and `BottomNav` |

**Key insight:** The existing dashboard already solved the hardest problems (SSE, Redis pipeline, rate limiting, service workers). Phase 147 adds UI surface, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: `session_source` Missing from Redis Hash

**What goes wrong:** DSH-01 requires displaying `source: local | remote-ssh | remote-managed`. The current ingest route does NOT store this field in the Redis session hash (`pde:default:session:{id}`).
**Why it happens:** The `WireEnvelope` has `machine_id` (hostname) but not `session_source` (dispatch backend type). The dispatcher registry has `backend: 'local' | 'ssh'` but the relay daemon doesn't propagate this to the wire envelope.
**How to avoid:** Two options:
  1. (Preferred) Have the relay daemon include `session_source` in the first event envelope's `extensions` field. The ingest route stores it in Redis on first `session_start` event.
  2. Alternatively, infer source from `machine_id` — if `machine_id === os.hostname()` it's local; otherwise remote-ssh. Fragile if the dashboard server has a different hostname.
**Action required:** Wave 0 plan task must add `session_source` to the relay daemon event output and ingest storage.
**Warning signs:** Source column always shows "unknown" or "local" regardless of actual dispatch backend.

### Pitfall 2: nuqs Requires `NuqsAdapter` in `layout.tsx`

**What goes wrong:** `useQueryState` throws a runtime error if `NuqsAdapter` is not present in the component tree.
**Why it happens:** nuqs v2 requires an adapter per framework. The Next.js App Router adapter wraps the layout.
**How to avoid:** Add `<NuqsAdapter>` inside `<body>` in `app/layout.tsx` before any component that calls `useQueryState`.
**Warning signs:** `Error: NuqsAdapter not found` at runtime when navigating to pages using the filter.

### Pitfall 3: `HotkeysProvider` Must Wrap the Entire App for Scopes

**What goes wrong:** Keyboard shortcuts fire even when user is typing in a text input (e.g., search box, session ID input).
**Why it happens:** Without `HotkeysProvider`, the `scopes` option is ignored and all hotkeys are global by default.
**How to avoid:** Wrap with `<HotkeysProvider>` in `app/layout.tsx` (or the outermost client component). Default behavior of `react-hotkeys-hook` already guards against form inputs — `enableOnFormTags` defaults to `false`.
**Warning signs:** Number keys 1-7 fire pane switches while user is typing in a filter input.

### Pitfall 4: Progress Bar Animation on Static Value

**What goes wrong:** Striped animation plays even when session is `failed` (no-animation state) because the CSS class is applied unconditionally.
**Why it happens:** `value={null}` always sets `data-indeterminate` regardless of session status. Animation is driven by CSS class, not by data attribute alone.
**How to avoid:** The animation class must be conditional on session status, not just on `value={null}`. Pass a `variant` prop to the progress component: `executing | waiting | failed`.
**Warning signs:** Failed sessions show animated stripes instead of static dimmed bar.

### Pitfall 5: Tailwind v4 `@keyframes` Must Use `@theme inline` Syntax

**What goes wrong:** Custom `@keyframes` defined at top level in `globals.css` don't produce usable Tailwind animation utilities.
**Why it happens:** Tailwind v4 uses `@theme inline` for custom properties and animations. The existing `globals.css` already uses this pattern (`@theme inline { @keyframes accordion-down {...} }`).
**How to avoid:** Define new `@keyframes progress-stripes` inside an `@theme inline` block, not at the root CSS level.
**Warning signs:** `animate-progress-stripes` class has no effect; the keyframe is not referenced by any utility.

### Pitfall 6: SSE `/api/events` Route Has `maxDuration: 300` — Don't Create Long-Lived All-Sessions Stream

**What goes wrong:** A `?session=all` SSE endpoint that fans out to all sessions would consume one Vercel function slot for the entire dashboard session (up to 300s). With 3+ dashboard users, this exhausts Hobby plan compute.
**Why it happens:** Vercel SSE routes are long-lived functions. Each open connection holds a compute slot.
**How to avoid:** Use short-lived polling for the health matrix (`/api/sessions` GET, 5s interval) and per-session SSE only for the detail pane. This is the architecture described in Pattern 4.
**Warning signs:** Dashboard loads slowly or times out for second simultaneous user.

### Pitfall 7: `shadcn add alert-dialog` Needed Before Implementing FailureCard

**What goes wrong:** `components/ui/alert-dialog.tsx` does not exist in the current codebase. Importing it causes a module-not-found error.
**Why it happens:** shadcn components are installed on demand, not all at once.
**How to avoid:** Add to Wave 0 setup task: `npx shadcn@latest add alert-dialog`. Also needed: `dialog` (if not already present) and potentially `dropdown-menu` for the action chevron.
**Warning signs:** TypeScript/webpack error `Cannot find module '@/components/ui/alert-dialog'`.

---

## Code Examples

### Striped Animated Progress — Full CSS Pattern

```css
/* In dashboard/app/globals.css — inside existing @theme inline block */
@theme inline {
  @keyframes progress-stripes {
    from { background-position-x: 1rem; }
    to   { background-position-x: 0; }
  }
}

/* Utility classes for the three speed states */
.progress-striped {
  background-image: repeating-linear-gradient(
    45deg,
    currentColor 0,
    currentColor 0.25rem,
    transparent 0.25rem,
    transparent 0.5rem
  );
  background-size: 1rem 1rem;
}
.progress-executing {
  animation: progress-stripes 0.6s linear infinite;
}
.progress-waiting {
  animation: progress-stripes 2s linear infinite;
}
/* progress-failed: no animation, handled by opacity in component */
```

```tsx
// components/ui/progress.tsx — extend ProgressIndicator to accept variant
type ProgressVariant = 'executing' | 'waiting' | 'failed' | 'complete';

function ProgressIndicator({ className, variant, ...props }: ProgressPrimitive.Indicator.Props & { variant?: ProgressVariant }) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "h-full bg-primary transition-all",
        variant === 'executing' && "progress-striped progress-executing",
        variant === 'waiting'   && "progress-striped progress-waiting",
        variant === 'failed'    && "opacity-30",
        className
      )}
      {...props}
    />
  );
}
```

### Nuqs Session Filter — Complete Integration

```typescript
// hooks/use-global-filter.ts
"use client";
import { useQueryState, parseAsString } from 'nuqs';

export function useGlobalFilter() {
  // 'all' = show all sessions; any UUID = filter to that session
  const [sessionFilter, setSessionFilter] = useQueryState(
    'session',
    parseAsString.withDefault('all')
  );
  return { sessionFilter, setSessionFilter };
}
```

```tsx
// app/layout.tsx — add NuqsAdapter
import { NuqsAdapter } from 'nuqs/adapters/next/app';

// Inside RootLayout body (after ThemeProvider):
<NuqsAdapter>{children}</NuqsAdapter>
```

### react-hotkeys-hook — Dashboard Registration

```typescript
// hooks/use-hotkeys-dashboard.ts
"use client";
import { useHotkeys } from 'react-hotkeys-hook';

interface UseDashboardHotkeysOptions {
  onPaneSelect: (n: number) => void;
  onSessionNext: () => void;
  onSessionPrev: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  enabled: boolean; // true on laptop only (check via window.innerWidth or media query)
}

export function useDashboardHotkeys(opts: UseDashboardHotkeysOptions) {
  const { onPaneSelect, onSessionNext, onSessionPrev, onExpand, onCollapse, enabled } = opts;
  useHotkeys(['1','2','3','4','5','6','7'], (_, h) => onPaneSelect(Number(h.key)), { enabled });
  useHotkeys('s', onSessionNext, { enabled });
  useHotkeys('a', onSessionPrev, { enabled });
  useHotkeys('f', onExpand, { enabled });
  useHotkeys('escape', onCollapse, { enabled, preventDefault: true });
}
```

### Session Health Matrix — Redis Data Shape

The health matrix (DSH-01) displays: status, phase, source, runtime. Current Redis hash fields:

```
pde:default:session:{id} HSET fields:
  last_event_ts      — ms timestamp of last event
  last_event_type    — string
  phase              — phase name string
  plan               — plan name/id string
  started_at         — ms timestamp
  pending_approval_id — UUID or empty string
  [MISSING] session_source — 'local' | 'remote-ssh' | 'remote-managed'
```

**Action required:** Add `session_source` to ingest route:

```typescript
// In app/api/ingest/route.ts — add to hset call:
p.hset(`pde:default:session:${sessionId}`, {
  // ...existing fields...
  // Set on first event only (session_start), preserve on subsequent events
  ...(lastEvent.event_type === 'session_start' && {
    session_source: String((lastEventPayload as Record<string,unknown>).session_source ?? 'local'),
  }),
});
```

**And extend `SessionListItem` in `queries.ts`:**

```typescript
export interface SessionListItem {
  // ...existing fields...
  source: 'local' | 'remote-ssh' | 'remote-managed';
}
```

### Web Push — Extending for Merge Notifications (DSH-07)

The existing push infrastructure already fires on `approval_request` and `error` events. Extending for `session_end` (merge complete):

```typescript
// In app/api/ingest/route.ts — add to the push notification block:
} else if (event.event_type === 'session_end') {
  const { sendPushToOwner } = await import('@/app/actions');
  const eventPayload = event as Record<string, unknown>;
  sendPushToOwner({
    title: 'Session Merged',
    body: `Phase ${String(eventPayload.phase_name ?? '')} completed and merged`,
    url: '/',
    tag: `merge-${event.session_id}`,
  }).catch(() => {});
  break;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual URLSearchParams | nuqs `useQueryState` | 2024-2025 | Type-safe, persistent, shareable filter state |
| Custom keydown listeners | `react-hotkeys-hook` v5 | 2024 | Declarative, input-safe, scope-aware |
| Radix UI Primitives directly | Base UI (from same team) | 2024-2025 | Base UI is the successor; same team, cleaner API |
| `@radix-ui/react-progress` | `@base-ui/react/progress` | 2024 | Already migrated in v0.17; `data-indeterminate` attribute |
| `tw-animate-css` for all animations | CSS `@keyframes` in globals.css | 2024 | `tw-animate-css` is for enter/exit; continuous animations use raw CSS |

**Deprecated/outdated:**
- `Radix UI` direct imports: This project already uses Base UI (`@base-ui/react`) which supersedes the older `@radix-ui` direct pattern. Do not add `@radix-ui/react-*` packages.
- `useSearchParams` + `router.replace` for filter state: nuqs replaces this pattern entirely.

---

## Open Questions

1. **How does `session_source` get into the wire envelope?**
   - What we know: The relay daemon (`bin/lib/relay.cjs`) creates envelopes via `createEnvelope()`. The `extensions` field is `z.record(z.unknown()).optional()`. The dispatcher registry has `backend: 'local' | 'ssh'`.
   - What's unclear: Does the relay daemon receive the backend type from the dispatcher at startup? The relay daemon is spawned per-session by `DSP-08` but the exact CLI args are not visible in this research.
   - Recommendation: Have the Wave 0 plan task inspect `bin/lib/relay.cjs` spawn invocation in `coordinator.cjs` to determine if `backend` is passed as an env var or CLI arg. If it is, the relay daemon can add `session_source` to `extensions` in `createEnvelope()`.

2. **7-pane grid layout content: what are the 7 panes?**
   - What we know: DSH-13 says "1-7 pane focus"; DSH-11 says "full grid on laptop". The requirements don't name the 7 panes explicitly.
   - What's unclear: The planner needs to define the 7 pane identities (e.g., Sessions List, Event Log, Progress, Costs, Failures, Settings, Details).
   - Recommendation: Plan task should define the 7 panes from existing components: (1) Session Matrix, (2) Event Log, (3) Phase Progress, (4) Cost Meter, (5) Failure Cards, (6) Action Chevron/Session Detail, (7) Settings/Push Config.

3. **`session_end` event reliability for merge notifications (DSH-07)**
   - What we know: The relay daemon fires `session_end` events. Push infra exists.
   - What's unclear: Is `session_end` fired before or after the merge? If after, the notification correctly signals "merged". If during (on exit before merge), it may be misleading.
   - Recommendation: Check `coordinator.cjs` `_handleExit` to confirm timing. The push should fire after `mergeSession()` succeeds, not on process exit.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, next dev | Yes | v20.20.0 | — |
| npm | Package install | Yes | 10.8.2 | — |
| Vercel CLI | Deployment | Yes | installed | — |
| react-hotkeys-hook | DSH-13 | Not yet (to install) | 5.2.4 available on npm | Native keydown (avoid) |
| nuqs | DSH-12 | Not yet (to install) | 2.8.9 available on npm | useSearchParams manual (avoid) |

**Missing dependencies with no fallback:** None blocking — both packages are on npm and compatible.

**Missing shadcn UI components (scaffold in Wave 0):**
- `alert-dialog` — required for DSH-06 Kill confirmation
- Verify: `dialog`, `dropdown-menu` — may be needed for ActionChevron (DSH-08)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm run test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSH-01 | `getSessions()` returns `source` field | unit | `cd dashboard && npm test -- --reporter=verbose` | Wave 0 — new test |
| DSH-02 | Session filter persists across navigation | unit (hook) | `cd dashboard && npm test` | Wave 0 — new test |
| DSH-03 | `sessionColor(index)` returns consistent palette entry | unit | `cd dashboard && npm test` | Wave 0 — new test |
| DSH-05 | Aggregate status bar sums active/queued/cost correctly | unit | `cd dashboard && npm test` | Wave 0 — new test |
| DSH-07 | Push fires on `session_end` event type | unit (ingest route) | `cd dashboard && npm test` | Wave 0 — extends hardening.test.ts |
| DSH-09 | `ProgressIndicator` variant classes applied per status | unit (component) | `cd dashboard && npm test` | Wave 0 — new test |
| DSH-06 | Failure card retry/abandon actions call server actions | unit | `cd dashboard && npm test` | Wave 0 — new test |
| DSH-13 | Hotkey hook fires callbacks on correct keys | manual-only | — | Manual — requires browser focus context |
| DSH-11 | Responsive pane layout | manual-only | — | Manual — visual breakpoint verification |

**Note:** DSH-13 and DSH-11 are browser-layout tests. Vitest runs in `environment: node` — keyboard and responsive layout tests require manual browser verification or a future Playwright suite.

### Sampling Rate

- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/__tests__/session-source.test.ts` — covers DSH-01 (`session_source` field in queries + ingest)
- [ ] `dashboard/__tests__/session-filter.test.ts` — covers DSH-02/12 (nuqs filter hook behavior)
- [ ] `dashboard/__tests__/session-colors.test.ts` — covers DSH-03 (palette assignment)
- [ ] `dashboard/__tests__/aggregate-status.test.ts` — covers DSH-05 (status bar derivation)
- [ ] `dashboard/__tests__/failure-card.test.ts` — covers DSH-06 (server action invocation)
- [ ] `dashboard/__tests__/progress-variant.test.ts` — covers DSH-09 (CSS class selection)
- [ ] Scaffold missing shadcn components: `npx shadcn@latest add alert-dialog`
- [ ] Install new deps: `cd dashboard && npm install react-hotkeys-hook@^5.2.4 nuqs@^2.8.9`

---

## Sources

### Primary (HIGH confidence)

- Base UI docs (live fetch 2026-03-27) — Progress component data attributes (`data-indeterminate`, `data-complete`, `data-progressing`), indeterminate state behavior
- react-hotkeys-hook official docs (live fetch 2026-03-27) — useHotkeys API, options, enableOnFormTags behavior
- nuqs official docs (live fetch 2026-03-27) — NuqsAdapter for Next.js App Router, useQueryState API
- Installed package.json + node_modules — exact versions: next@16.2.1, react@19.2.4, @base-ui/react@1.3.0, tailwindcss@4.2.2, web-push@3.6.7, serwist@9.5.7

### Secondary (MEDIUM confidence)

- npm registry (queried 2026-03-27) — react-hotkeys-hook@5.2.4 current, nuqs@2.8.9 current
- WebSearch verified — nuqs v2 supports `react@^18.3 || ^19` and `next>=14.2.0`
- WebSearch verified — react-hotkeys-hook v4+ renamed `enableOnTags` to `enableOnFormTags`; v5 supports React 19

### Tertiary (LOW confidence)

- WebSearch (unverified claim): nuqs v2 is 20% smaller than v1 due to ESM-only — cited from nuqs v2 release notes but not independently confirmed

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified against installed node_modules and npm registry
- Architecture: HIGH — patterns derived from existing codebase + verified library docs
- Pitfalls: HIGH — sourced from codebase inspection (ingest route missing `session_source`) and official docs
- Session source gap: HIGH — confirmed absence by grepping ingest route and wire schema

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable libraries; nuqs and react-hotkeys-hook are stable APIs)
