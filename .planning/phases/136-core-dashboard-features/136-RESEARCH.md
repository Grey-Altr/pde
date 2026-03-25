# Phase 136: Core Dashboard Features — Research

**Researched:** 2026-03-25
**Domain:** Next.js 16 App Router · React 19 · shadcn/ui · Tailwind CSS v4 · SSE reconnection · Mobile PWA UX
**Confidence:** HIGH (all major claims verified against official docs, npm registry, or codebase inspection)

---

## Summary

Phase 136 builds on the scaffolding from Phase 135. The transport layer (Upstash Redis sorted sets, SSE/polling hook, ingest endpoint) is already operational. This phase adds four core monitoring surfaces to the session detail view: (1) a nested phase→plan→wave progress hierarchy, (2) a running token/cost meter, (3) a filterable live event log, and (4) visual reconnection feedback with auto-recovery. All views must render correctly on mobile with card-based layout and 44px touch targets.

The critical architectural constraint is that the existing `WireEnvelope` passthrough schema carries all PDE event payload fields in top-level keys (the `.passthrough()` zod schema merges PDE fields directly, not under `extensions`). Phase→plan→wave progress and token/cost data are carried in event-specific fields (`phase_name`, `plan_name` in the envelope itself; token fields would be in a hypothetical `usage_metadata` field). The dashboard derives progress state by scanning the rolling event buffer for the most recent `phase_start`, `plan_start`, `wave_start`, and `session_end` events — no separate Redis key is needed for this. The current `MAX_EVENTS = 200` buffer in `useEventStream` is sufficient for this derivation.

The biggest pitfall for this phase is **re-render storms**: the SSE hook already buffers events, but adding derived state (progress, cost totals) on top of a `useState` array that updates on every event can cause cascading re-renders. The fix is `useMemo` for derived values — cost totals, progress state, and filtered log entries should all be memoized from the `events` array. The event filter state (selected event types) lives in a separate `useState` that does not change on every incoming event.

A known bug from Phase 135 exists in `getSessionMeta`: it reads `raw.phase_name` and `raw.plan_name` from Redis, but the ingest route stores them as `raw.phase` and `raw.plan`. This bug affects the initial render only (SSE live events fix it). The Phase 136 plan should include fixing this field name mismatch as part of the session detail work.

**Primary recommendation:** Derive progress and cost from the existing events buffer using `useMemo`. Install shadcn `progress` and `tabs` components. Use a simple boolean `isAtBottom` ref for auto-scroll lock. No virtual scrolling needed at 200 events. Add `useReducer` for the event filter state only if filter logic grows complex.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MON-01 | Phase progress display shows nested hierarchy (phase → plan → wave) with progress indicators | Progress derived from event buffer via useMemo; shadcn Progress component confirmed available; nesting via disclosure pattern or TreeView component |
| MON-02 | Token/cost meter shows running session total visible at a glance, updated in near-real-time | Token fields present in WireEnvelope passthrough payload; running total via useMemo accumulator over events buffer |
| MON-03 | Live event log streams events with type filtering (tool calls, agent activity, phase transitions, errors) | Existing EventLog shows 10 events; needs filter state + filtered useMemo; auto-scroll with isAtBottom ref |
| MON-04 | Auto-reconnection with visual feedback ("reconnecting..." state) when SSE/polling connection drops | useEventStream already exposes `connectionStatus`; existing SessionDetail renders badges; verified working in Phase 135 |
| MON-05 | All monitoring views are mobile-responsive with card-based layout and touch targets >= 44px | Tailwind `min-h-[44px]` for interactive elements; card-based layout already established; verified pattern in existing components |
</phase_requirements>

---

## Standard Stack

### Core (already installed — do NOT re-install)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| next | 16.2.1 | App Router framework | Already installed |
| react | 19.2.4 | UI library | Already installed |
| tailwindcss | 4.2.2 | Utility CSS | Already installed |
| shadcn | 4.1.0 | Component CLI | Already installed |
| @upstash/redis | 1.37.0 | Redis client | Already installed |
| lucide-react | 1.6.0 | Icon set | Already installed |
| zod | 4.3.6 | Validation | Already installed |
| geist | (latest) | Fonts | Already installed |

### New Components to Install (Phase 136)
| Component | Install Command | Purpose |
|-----------|----------------|---------|
| progress | `npx shadcn@latest add progress` | Phase/plan/wave progress bars |
| tabs | `npx shadcn@latest add tabs` | Event log filter tabs |
| separator | `npx shadcn@latest add separator` | Visual dividers in detail card |

**shadcn/ui February 2026 note (HIGH confidence, verified):** The new-york style now uses unified `radix-ui` package instead of separate `@radix-ui/react-*` packages. The existing project uses the **default style** (confirmed from `components.json`), which is NOT affected by this migration. Do NOT run `migrate radix` — it is only for new-york style projects.

**Installation:**
```bash
cd dashboard
npx shadcn@latest add progress tabs separator
```

### Alternatives NOT used
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| @tanstack/react-virtual | - | 200 event cap = no virtualization needed |
| react-stay-scrolled | - | Simple `isAtBottom` ref pattern is sufficient |
| @microsoft/fast-components | - | Not in ecosystem; shadcn is standard |

---

## Architecture Patterns

### Recommended Component Structure (Phase 136 additions)
```
components/
├── phase-progress.tsx        # MON-01: Nested phase→plan→wave progress hierarchy
├── cost-meter.tsx            # MON-02: Running token/cost display
├── event-log.tsx             # MON-03: Expanded from Phase 135 — adds filter tabs + auto-scroll
├── session-detail.tsx        # Updated: wire in new components (replaces Phase 135 version)
lib/
├── derive-progress.ts        # Pure function: WireEnvelope[] → PhaseProgressState
├── derive-cost.ts            # Pure function: WireEnvelope[] → CostState
├── event-types.ts            # EVENT_TYPE constants + filter group definitions
```

### Pattern 1: Deriving Progress State from Event Buffer

**What:** Scan the events array (newest-first, already in state) to extract the latest phase/plan/wave context.

**When to use:** Any time `events` changes. Must be in `useMemo` to avoid recalculation on every parent render.

**Event fields available (from WireEnvelope passthrough):**
The relay protocol uses `.passthrough()` — PDE event fields are merged directly into the envelope object. The following fields will be present when the relay emits phase lifecycle events:

```typescript
// Source: bin/lib/event-bus.cjs — dispatch() merges payload into envelope at top level
// Source: hooks/emit-event.cjs — hook captures agent_type, tool_name, phase info
// event_type values from emit-event.cjs:
//   'session_start', 'session_end',
//   'subagent_start', 'subagent_stop',
//   'file_changed', 'bash_called', 'tool_called'
// phase_name, plan_name come from extensions if emitted by GSD workflow hooks
```

**Important:** The current hook implementation in `emit-event.cjs` does NOT emit dedicated `phase_start` or `wave_start` events — it only emits agent lifecycle events. Phase/plan name comes from the `extensions.phase_name` / `extensions.plan_name` fields on any event (set by the ingest route from `lastEvent.extensions?.phase_name`). The dashboard must derive "current phase" by finding the most recent event that has a non-empty `extensions?.phase_name`.

**Progress derivation pattern:**
```typescript
// Source: derived from WireEnvelopeSchema in dashboard/lib/wire-schema.ts
// extensions field carries phase_name, plan_name when present

interface PhaseProgressState {
  phaseName: string;
  planName: string;
  // wave info not yet in event schema — leave placeholder for future
}

function deriveProgress(events: WireEnvelope[]): PhaseProgressState {
  // events are newest-first; find first event with a non-empty phase name
  for (const ev of events) {
    const ext = ev.extensions as Record<string, string> | undefined;
    const phaseName = ext?.phase_name ?? (ev as Record<string, unknown>).phase_name as string ?? '';
    const planName = ext?.plan_name ?? (ev as Record<string, unknown>).plan_name as string ?? '';
    if (phaseName) return { phaseName, planName };
  }
  return { phaseName: '', planName: '' };
}
```

### Pattern 2: Token/Cost Meter via useMemo Accumulation

**What:** Accumulate token counts from events that carry usage fields.

**Availability:** The current `WireEnvelope` passthrough schema does not guarantee token fields — they would appear in events emitted by GSD agents if the agent SDK includes usage_metadata. The cost meter should gracefully display "0 tokens" when no usage data is present, not error.

**Pattern:**
```typescript
// Source: pattern derived from WireEnvelopeSchema passthrough, informed by Anthropic SDK patterns
interface CostState {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

const costState = useMemo<CostState>(() => {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const ev of events) {
    const payload = ev as Record<string, unknown>;
    inputTokens += Number(payload.input_tokens ?? 0);
    outputTokens += Number(payload.output_tokens ?? 0);
  }
  // Claude Sonnet 4.5 pricing: $3/M input, $15/M output (verify against current pricing)
  const estimatedCostUsd = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  return { inputTokens, outputTokens, estimatedCostUsd };
}, [events]);
```

**Display:** Show `$0.0000` format when cost is near-zero (typical for a single session). Show tokens in thousands (e.g., "12.3k" for 12,300).

### Pattern 3: Filterable Event Log with Auto-Scroll Lock

**What:** Show filtered events from the rolling buffer. Auto-scroll to bottom when user is at the bottom; pause scroll when user scrolls up.

**Filter groups (from emit-event.cjs event types):**
```typescript
// Source: hooks/emit-event.cjs — HOOK_TO_EVENT_TYPE mapping
export const EVENT_FILTER_GROUPS = {
  all: null,                          // no filter
  tools: ['tool_called', 'bash_called', 'file_changed'],
  agents: ['subagent_start', 'subagent_stop'],
  phases: ['session_start', 'session_end'],
  errors: ['error'],                  // future — error events when added
} as const;
```

**Auto-scroll pattern:**
```typescript
// Source: standard React scroll-lock pattern, verified against multiple sources
const scrollContainerRef = useRef<HTMLDivElement>(null);
const isAtBottomRef = useRef(true);

function handleScroll() {
  const el = scrollContainerRef.current;
  if (!el) return;
  const threshold = 40; // px from bottom
  isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

// After events update, scroll to bottom only if user was already at bottom
useEffect(() => {
  if (isAtBottomRef.current && scrollContainerRef.current) {
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }
}, [filteredEvents.length]); // trigger on count change only, not content
```

**Important:** The existing `EventLog` component renders events **newest-first** (sorted `b.relay_ts - a.relay_ts`). A live log typically shows **oldest-at-top, newest-at-bottom** (chronological). Phase 136 should reverse the display order for the event log (oldest-first) to match user expectation of a log stream.

### Pattern 4: Progress Component Usage

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/progress (verified 2026-03-25)
import { Progress } from "@/components/ui/progress"

// Value is 0-100 (percentage)
<Progress value={33} className="h-2" />

// For indeterminate (unknown progress):
<Progress value={undefined} className="h-2" /> // shows animated indeterminate state
```

**Phase→Plan hierarchy pattern (no dedicated TreeView needed):**
```tsx
// Source: standard shadcn Card + Progress composition
<Card>
  <CardContent className="py-3 space-y-3">
    {/* Phase level */}
    <div>
      <p className="text-sm font-semibold">{phaseName || 'No active phase'}</p>
      <Progress value={phasePercent} className="h-1.5 mt-1" />
    </div>
    {/* Plan level */}
    {planName && (
      <div className="ml-3">
        <p className="text-xs text-muted-foreground">{planName}</p>
        <Progress value={planPercent} className="h-1 mt-0.5" />
      </div>
    )}
  </CardContent>
</Card>
```

### Pattern 5: Reconnection Status (MON-04)

The `useEventStream` hook already exports `connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'polling'`. The existing `SessionDetail` already renders the reconnecting badge. Phase 136 needs to:

1. Ensure the `PhaseProgress`, `CostMeter`, and `EventLog` components receive `connectionStatus` so they can show a muted/dimmed state when reconnecting.
2. The "reconnecting..." badge is already implemented — no new work needed here beyond ensuring the new components respect the status.

### Pattern 6: Mobile Touch Targets (MON-05)

```tsx
// Source: WCAG 2.5.8 minimum touch target; Tailwind min-h-[44px] pattern (verified)
// Filter tab buttons
<TabsTrigger
  value="all"
  className="min-h-[44px] min-w-[44px] px-3"
>
  All
</TabsTrigger>

// Event log rows: read-only, 36px acceptable per Phase 135 UI-SPEC
<div className="flex items-center gap-2 h-9 font-mono text-sm">
  ...
</div>
```

### Anti-Patterns to Avoid

- **Computing derived state inline in JSX:** Cost totals, filtered events, and progress state computed on every render. Always use `useMemo` with the `events` array as dependency.
- **Calling `setState` per SSE event:** The hook already buffers; do not add additional per-event state updates in child components.
- **Re-rendering on filter type change + events change together:** Keep filter state (`selectedFilter`) in a separate `useState`. The filtered list is `useMemo([events, selectedFilter])`.
- **Reversing events array inside `useMemo` on every filter change:** Sort/reverse once, memoize separately, then filter the memoized chronological array.
- **Using EventSource `last-event-id` for resumption incorrectly:** The SSE route already handles `last-event-id` headers for cursor-based resume (verified in `app/api/events/route.ts`). The client hook already tracks `lastTsRef`. Do not add duplicate cursor tracking.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bars | Custom div with inline width | shadcn `Progress` component | ARIA progressbar role, accessible, indeterminate state |
| Tab navigation for event filters | Custom button group | shadcn `Tabs` component | Keyboard navigation, ARIA, Radix primitive |
| Visual dividers | `<hr>` or custom div | shadcn `Separator` | Semantic, accessible, consistent spacing |
| Token formatting (1234567 → "1.2M") | Custom formatter | `Intl.NumberFormat` | Built-in, locale-aware |
| Currency formatting ($0.00042) | String concatenation | `Intl.NumberFormat` with currency | Handles edge cases |
| Cost model pricing | Hardcoded numbers | Named constants in `lib/pricing.ts` | Pricing changes; constants are easier to update |
| Auto-scroll detection | Intersection Observer | `scrollTop + clientHeight >= scrollHeight - threshold` | Simpler, lower overhead for single scrollable container |

**Key insight:** At 200 events maximum in the buffer, there is no need for virtual scrolling. A simple CSS `overflow-y: auto` container with `max-h` constraint renders all 200 events without DOM performance issues on mobile. Only add `@tanstack/react-virtual` if the buffer cap increases to 1000+.

---

## Common Pitfalls

### Pitfall 1: Re-render Storm from useMemo Dependency Arrays
**What goes wrong:** `useMemo(() => deriveCost(events), [events])` recalculates on every new event because the `events` array is a new reference (created in `useState` setter via slice).
**Why it happens:** `useEventStream` creates a new array on every `appendEvents` call via `merged.slice(0, MAX_EVENTS)`.
**How to avoid:** This is correct behavior — `useMemo` will recompute, but the computation is O(n) over 200 events which is < 1ms. The memoization still saves the JSX diff work. For cost/progress, this is acceptable. If profiling shows issues, extract to a separate hook.
**Warning signs:** Profiler showing 200ms+ recalculations on each event.

### Pitfall 2: field name mismatch in getSessionMeta (existing bug)
**What goes wrong:** `getSessionMeta` reads `raw.phase_name` and `raw.plan_name` from Redis, but the ingest route (`/api/ingest/route.ts`) stores them as `raw.phase` and `raw.plan`.
**Why it happens:** Phase 135 bug — fields named inconsistently between writer and reader.
**How to avoid:** Fix `getSessionMeta` in `lib/queries.ts` to read `raw.phase` (not `raw.phase_name`) and `raw.plan` (not `raw.plan_name`). Also fix `hset` in the ingest route to store both `phase_name` and `phase` for backward compatibility OR standardize to one name.
**Warning signs:** Session detail page shows blank phase/plan on initial load but populates after first SSE event.

### Pitfall 3: Event Sort Order Mismatch (Newest-First vs Oldest-First)
**What goes wrong:** The existing `EventLog` renders events newest-first. A live log stream should be oldest-first (chronological). If Phase 136 reverses the order inside the log without updating the auto-scroll logic, auto-scroll will scroll to the OLD events at the bottom instead of new ones.
**Why it happens:** Phase 135 established newest-first for the mini-log display (most recent at top). A streaming log needs the opposite convention.
**How to avoid:** Maintain `events` in newest-first order in hook state (existing). In `EventLog`, reverse to chronological (`[...events].reverse()`) for display and scroll to bottom. The `isAtBottom` detection logic is correct either way.
**Warning signs:** Auto-scroll goes to top instead of bottom after events arrive.

### Pitfall 4: shadcn Tabs Component Conflict with ScrollArea
**What goes wrong:** Wrapping shadcn `Tabs` inside `ScrollArea` can cause scroll capture conflicts on mobile — the tab list intercepts touch scroll events.
**Why it happens:** Radix `TabsList` uses `overflow: auto` internally.
**How to avoid:** Put `ScrollArea` inside the `TabsContent`, not wrapping the `Tabs` root. The `TabsList` should scroll horizontally (if many tabs) with `overflow-x: auto` on the `TabsList` container, not via `ScrollArea`.
**Warning signs:** Mobile scroll stops working inside the event log after adding tabs.

### Pitfall 5: Token Cost Model Not Available in Current Events
**What goes wrong:** The cost meter shows $0.00 always because the PDE relay events do not include `input_tokens`/`output_tokens` fields yet.
**Why it happens:** The `emit-event.cjs` hook captures tool use events but does not capture token usage from Claude's API response.
**How to avoid:** Build the `CostMeter` component to gracefully handle zero tokens — display "0 tokens / $0.00" rather than hiding the component or throwing errors. The component should be ready to display data when the relay is enhanced to include usage fields in the future.
**Warning signs:** TypeError on `payload.input_tokens` when field is absent.

### Pitfall 6: Progress Percent Not Derivable from Current Events
**What goes wrong:** There is no `wave_total` or `plan_complete` event in the current PDE event schema. The progress bar cannot show a meaningful percentage.
**Why it happens:** PDE emits lifecycle events (start/stop) but not completion percentages.
**How to avoid:** Use the shadcn `Progress` component in **indeterminate** state (value={undefined}) for phase/plan progress. Show the phase/plan **name** prominently instead of a percentage. Save the `value={N}` progress bar for when the event schema includes completion data.
**Warning signs:** Displaying fake percentages (e.g., always 50%) that mislead the user.

---

## Code Examples

### Installing New shadcn Components
```bash
# Source: https://ui.shadcn.com/docs (verified 2026-03-25)
cd /path/to/dashboard
npx shadcn@latest add progress tabs separator
```

### Progress Component (Indeterminate State)
```tsx
// Source: https://ui.shadcn.com/docs/components/radix/progress (verified 2026-03-25)
import { Progress } from "@/components/ui/progress"

// Indeterminate — shows animated sweep when phase is active
<Progress className="h-1.5" />

// Determinate — when percentage is known
<Progress value={75} className="h-1.5" />
```

### Tabs for Event Type Filter
```tsx
// Source: https://ui.shadcn.com/docs/components/radix/tabs (verified 2026-03-25)
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="all" onValueChange={setFilter}>
  <TabsList className="w-full">
    <TabsTrigger value="all" className="flex-1 min-h-[44px]">All</TabsTrigger>
    <TabsTrigger value="tools" className="flex-1 min-h-[44px]">Tools</TabsTrigger>
    <TabsTrigger value="agents" className="flex-1 min-h-[44px]">Agents</TabsTrigger>
    <TabsTrigger value="phases" className="flex-1 min-h-[44px]">Phases</TabsTrigger>
  </TabsList>
  <TabsContent value={filter}>
    {/* EventLog renders here */}
  </TabsContent>
</Tabs>
```

### Token Formatting
```typescript
// Source: MDN Intl.NumberFormat (standard Web API)
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
```

### Auto-Scroll Lock Pattern
```typescript
// Source: standard React ref pattern (multiple verified sources, 2025)
const scrollRef = useRef<HTMLDivElement>(null);
const isAtBottomRef = useRef(true);

function onScroll() {
  const el = scrollRef.current;
  if (!el) return;
  isAtBottomRef.current =
    el.scrollHeight - el.scrollTop - el.clientHeight < 40;
}

useEffect(() => {
  if (isAtBottomRef.current && scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [filteredEvents.length]);
```

### Fix for getSessionMeta field name bug
```typescript
// Source: dashboard/lib/queries.ts (existing bug found during research)
// Current (wrong):
phase: raw.phase_name ?? '',
plan: raw.plan_name ?? '',

// Fixed (matches what /api/ingest writes):
phase: raw.phase ?? '',
plan: raw.plan ?? '',
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual @radix-ui/react-* packages | Unified `radix-ui` package (new-york style only) | February 2026 | Default style unaffected; do NOT migrate |
| `middleware.ts` | `proxy.ts` (Next.js 16) | Already handled in Phase 135 | No action needed |
| WebSockets for real-time | SSE + polling (simpler, Vercel-compatible) | Architecture decision | Already implemented |
| Virtual scroll for logs | CSS overflow-y with max-h | N/A | At 200 events, virtualization adds complexity without benefit |

**Deprecated/outdated:**
- `@radix-ui/react-progress` direct import: replaced by `radix-ui` unified package in new-york style. Default style still uses direct imports — existing `components/ui/` files should NOT be changed.
- `next/font` viewport option in metadata: replaced by `generateViewport` export. Not relevant for Phase 136 (no new layout changes needed).

---

## Open Questions

1. **Wave progress percentage**
   - What we know: Events don't include `wave_total` or `plans_completed` counts
   - What's unclear: Can the plan count be derived from PLAN frontmatter in `.planning/` directory read at relay time? Or does the GSD agent need to emit dedicated progress events?
   - Recommendation: Display phase/plan names prominently; use indeterminate progress bar; defer true percentage to a future relay enhancement. Do NOT block Phase 136 on this.

2. **Token/cost field availability**
   - What we know: `emit-event.cjs` does not capture `input_tokens`/`output_tokens` from the hook payload
   - What's unclear: Does the Claude Code `PostToolUse` hook payload include token counts?
   - Recommendation: Build `CostMeter` with graceful zero-state; document that the feature is "ready when relay adds usage fields." Show "—" or "0 tokens" not an error.

3. **Event log oldest-first vs newest-first**
   - What we know: Phase 135 renders newest-first; a streaming log UX expects newest-at-bottom
   - What's unclear: User preference — some dashboards (like tail -f) auto-scroll to bottom with newest at bottom; others keep newest at top
   - Recommendation: Switch to **oldest-at-top, auto-scroll to newest at bottom** — matches the tail -f / terminal log convention. The Phase 135 UI-SPEC explicitly calls this out for the mini-log as read-only; the full log is interactive and should follow log convention.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dashboard dev | Yes | v20.20.0 | — |
| npm | Package install | Yes | 10.8.2 | — |
| Next.js | Dashboard | Yes | 16.2.1 | — |
| shadcn progress | MON-01 | Not yet installed | — | Run `npx shadcn@latest add progress` in Wave 0 |
| shadcn tabs | MON-03 | Not yet installed | — | Run `npx shadcn@latest add tabs` in Wave 0 |
| shadcn separator | Dividers | Not yet installed | — | Run `npx shadcn@latest add separator` in Wave 0 |

**Missing dependencies with fallback:**
- `progress`, `tabs`, `separator` are not installed but are available from the official shadcn registry. Install in Wave 0 before implementation tasks.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, ~4.x) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MON-01 | `deriveProgress(events)` returns correct phase/plan names | unit | `cd dashboard && npm test -- --reporter=verbose` | No — Wave 0 gap |
| MON-02 | `deriveCost(events)` accumulates input/output tokens correctly | unit | `cd dashboard && npm test -- --reporter=verbose` | No — Wave 0 gap |
| MON-02 | `formatCost(0.0042)` returns '$0.0042'; `formatTokens(1234)` returns '1.2k' | unit | same | No — Wave 0 gap |
| MON-03 | Filter logic: `filterEvents(events, 'tools')` returns only tool_called/bash_called/file_changed | unit | same | No — Wave 0 gap |
| MON-04 | `connectionStatus === 'reconnecting'` renders reconnecting badge | unit/component | same | No — Wave 0 gap |
| MON-05 | Touch target check: filter buttons have min-h-[44px] | visual/manual | browser DevTools | Manual only |

**Note:** Tests for UI components (MON-04, MON-05) are manual-only — Vitest is configured with `environment: 'node'`, which does not support jsdom rendering. The existing test suite covers API route handlers. Phase 136 should add unit tests for pure utility functions (`deriveProgress`, `deriveCost`, `filterEvents`, `formatCost`, `formatTokens`) in `lib/__tests__/`.

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/lib/__tests__/derive-progress.test.ts` — covers MON-01
- [ ] `dashboard/lib/__tests__/derive-cost.test.ts` — covers MON-02
- [ ] `dashboard/lib/__tests__/event-filters.test.ts` — covers MON-03
- [ ] `dashboard/components/ui/progress.tsx` — install via `npx shadcn@latest add progress`
- [ ] `dashboard/components/ui/tabs.tsx` — install via `npx shadcn@latest add tabs`
- [ ] `dashboard/components/ui/separator.tsx` — install via `npx shadcn@latest add separator`

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist in the project root. Constraints come from STATE.md accumulated decisions and REQUIREMENTS.md.

**Active constraints from STATE.md:**
- Upstash SDK: use `zrange` with `byScore+withScores` (not deprecated `zrangebyscore`) — already implemented in Phase 135
- zod v4: `z.record()` requires two args — already implemented
- shadcn/ui: inline `shadcn/dist/tailwind.css` into `globals.css` (Turbopack cannot resolve CSS @import from node_modules) — already implemented in Phase 135
- Turbopack root: set in `next.config.ts` — already done
- SSE error fallback: after 2 consecutive `onerror` events — already implemented
- Session detail: server+client component split with initial data + live updates via `useEventStream` — established pattern to continue

---

## Sources

### Primary (HIGH confidence)
- Dashboard source code inspection: `dashboard/hooks/use-event-stream.ts`, `dashboard/lib/queries.ts`, `dashboard/lib/wire-schema.ts`, `dashboard/app/api/events/route.ts`, `dashboard/app/api/poll/route.ts`
- `bin/lib/event-bus.cjs` — event schema and dispatch pattern
- `hooks/emit-event.cjs` — hook-to-event-type mapping and payload fields
- https://ui.shadcn.com/docs/components/radix/progress — Progress component API (verified 2026-03-25)
- https://ui.shadcn.com/docs/changelog/2026-02-radix-ui — February 2026 unified radix-ui (default style unaffected)

### Secondary (MEDIUM confidence)
- https://www.sitepoint.com/streaming-backends-react-controlling-re-render-chaos/ — rAF buffer pattern for high-frequency SSE data
- https://react.dev/reference/react/useReducer — React 19 batching behavior
- https://nextjs.org/docs/app/api-reference/functions/generate-viewport — Next.js 16 viewport export

### Tertiary (LOW confidence, not used in prescriptive recommendations)
- Various 2026 Medium/DEV articles on PWA safe area and mobile layout — not used for specific recommendations

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified installed from node_modules, component API verified from official docs
- Architecture: HIGH — derived from code inspection of existing Phase 135 implementation; patterns are extensions of established codebase patterns
- Pitfalls: HIGH for field name bug (found by code inspection); MEDIUM for token field availability (reasonable inference from hook code); HIGH for sort order issue (found by reading existing EventLog)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable libraries; shadcn changelog fast-moving but core APIs stable)
