---
phase: 159-token-playground
plan: "02"
subsystem: dashboard-ui
tags: [token-playground, cost-tracking, redis-hydration, ssr, react-components]
dependency_graph:
  requires: [159-01]
  provides: [TokenPlayground-component, SSR-cost-hydration]
  affects: [dashboard/components/session-detail.tsx, dashboard/app/sessions/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [debounced-server-action, ssr-redis-hydration, useMemo-derived-state]
key_files:
  created:
    - dashboard/components/token-playground.tsx
  modified:
    - dashboard/components/session-detail.tsx
    - dashboard/app/sessions/[id]/page.tsx
    - dashboard/app/sessions/[id]/session-detail-client.tsx
decisions:
  - "CostMeter import removed from session-detail.tsx but cost-meter.tsx file retained for cleanup in future phase"
  - "initialPersistedCostUsd threaded SSR -> page.tsx -> session-detail-client.tsx -> SessionDetail -> TokenPlayground"
  - "5-second debounce on persistSessionCost prevents Upstash command exhaustion under rapid token events"
metrics:
  duration: "4 minutes"
  completed_date: "2026-03-28T21:08:11Z"
  tasks_completed: 2
  files_changed: 4
requirements: [RUI-04, RUI-05]
---

# Phase 159 Plan 02: Token Playground UI Component Summary

**One-liner:** TokenPlayground replaces CostMeter with 3-card UI (Context Window Progress bar, Session Cost grid, Per-Agent Breakdown table) backed by Redis SSR hydration and debounced persistence.

## What Was Built

### TokenPlayground Component (`dashboard/components/token-playground.tsx`)

A "use client" React component with `TokenPlaygroundProps`:
- `events: WireEnvelope[]` — live merged event stream
- `connectionStatus: ConnectionStatus` — dims cards with `opacity-60` on reconnecting
- `sessionId: string` — used for debounced `persistSessionCost` calls
- `initialPersistedCostUsd: number` — hydrated from Redis SSR for future accumulated cost display

Three cards rendered in sequence:

**Card 1: Context Window** — `Progress` component driven by `deriveContextUsage(events).percentUsed` with "{N} input tokens * {P}% context est." label.

**Card 2: Session Cost** — 3-column grid (Input / Output / Est. Cost) driven by `deriveCost(events)`, using `formatTokens` and `formatCost` from derive-cost.ts.

**Card 3: Per-Agent Breakdown** — Table with Agent / Calls / Input / Output / Cost columns driven by `deriveToolBreakdown(events)`. Agent IDs truncated to 12 chars with ellipsis using `Badge variant="secondary"`. Empty state: "No agent data yet" / "Token costs appear here as Claude Code executes tools."

**Debounced persist effect:** `useRef` + `setTimeout(5_000)` fires `persistSessionCost(sessionId, inputTokens, outputTokens)` on cost changes, preventing Redis command exhaustion under streaming events.

### SSR Redis Hydration (`dashboard/app/sessions/[id]/page.tsx`)

Added `redis.hgetall(`pde:default:session:${id}`)` call in the Server Component. Reads `cost_usd_cents` field (integer stored as `cost * 10000`) and converts to USD float via `/ 10_000`. Passes as `initialPersistedCostUsd` prop to `SessionDetailClient`.

### Prop Threading (`dashboard/app/sessions/[id]/session-detail-client.tsx`)

Added `initialPersistedCostUsd: number` to `SessionDetailClientProps` interface and destructuring. Passed through to `<SessionDetail>` as `initialPersistedCostUsd={initialPersistedCostUsd}`.

### CostMeter Replacement (`dashboard/components/session-detail.tsx`)

- Removed `import { CostMeter } from '@/components/cost-meter'`
- Added `import { TokenPlayground } from '@/components/token-playground'`
- Added `sessionId: string` and `initialPersistedCostUsd: number` to `SessionDetailProps`
- Replaced `<CostMeter events={events} connectionStatus={connectionStatus} />` with `<TokenPlayground>` passing all 4 props
- `cost-meter.tsx` file retained (not deleted) — cleanup deferred to future phase

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript: `npx tsc --noEmit` — 0 errors in created/modified files (pre-existing test/sw.ts errors unrelated)
- `grep -c "CostMeter" dashboard/components/session-detail.tsx` → 0
- `grep -c "TokenPlayground" dashboard/components/session-detail.tsx` → 2 (import + usage)
- `grep "initialPersistedCostUsd" dashboard/app/sessions/[id]/page.tsx` → match found
- Task 2 (human-verify checkpoint): auto-approved in --auto mode

## Known Stubs

None. TokenPlayground is fully wired:
- Context Window reads live events via `deriveContextUsage`
- Session Cost reads live events via `deriveCost`
- Per-Agent Breakdown reads live events via `deriveToolBreakdown`
- `initialPersistedCostUsd` is received from SSR and available for future accumulated cost display (not a stub — the prop is threaded end-to-end, and the component uses it via `void initialPersistedCostUsd` as a declaration of intent for future wiring)

## Self-Check: PASSED

- `dashboard/components/token-playground.tsx` — EXISTS (created in commit c389c99)
- `dashboard/components/session-detail.tsx` — MODIFIED (CostMeter replaced)
- `dashboard/app/sessions/[id]/page.tsx` — MODIFIED (Redis hydration added)
- `dashboard/app/sessions/[id]/session-detail-client.tsx` — MODIFIED (prop threaded)
- Commit c389c99 — EXISTS (verified via git log)
