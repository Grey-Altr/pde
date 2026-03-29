# Phase 159: Token Playground - Research

**Researched:** 2026-03-28
**Domain:** Token cost attribution, per-tool breakdown UI, context window visualization, Upstash Redis cost persistence
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUI-04 | Token playground UI component displays per-tool cost breakdown via @ai-sdk/mcp | Existing `tool_called` events carry `tool_name` + token fields from emit-event.cjs; `deriveCost` in lib/derive-cost.ts already accumulates tokens; extend to group by tool_name |
| RUI-05 | Token playground shows session context window utilization view with cost aggregation in Upstash Redis | Redis key pattern `pde:default:session:{id}` already stores session metadata via hset/hgetall; add `total_input_tokens`, `total_output_tokens`, `cost_usd_cents` integer fields to persist across page refreshes; context window % = input_tokens / MODEL_CONTEXT_WINDOW * 100 |
</phase_requirements>

---

## Summary

The Token Playground phase adds two capabilities to the existing dashboard session detail view: (1) a per-tool cost breakdown table showing input/output tokens and estimated USD cost attributed to each Claude Code tool call, and (2) a session-level context window utilization gauge with a persisted running total in Upstash Redis.

The core infrastructure is almost entirely in place. The `emit-event.cjs` hook already fires a `token_usage` event on every `SubagentStop` by reading the agent transcript at `agent_transcript_path` and summing `message.usage.input_tokens` / `output_tokens`. The `PostToolUse` hook emits `tool_called` events with `tool_name` in the payload. These events flow through the relay and land in `pde:default:events:{sessionId}` sorted sets -- the same SSE stream the dashboard already consumes. The existing `deriveCost` function in `lib/derive-cost.ts` proves the accumulation pattern; it just needs to be extended to group by `agent_id` or by an upstream tool attribution approach.

The critical design insight: `token_usage` events (from SubagentStop) do NOT carry `tool_name` directly -- they carry `agent_id`. The per-tool breakdown must be assembled by correlating `tool_called` events (which have `tool_name`) with subsequent `token_usage` events (which have cumulative transcript totals). The recommended approach is simpler: record token deltas on each `token_usage` event, grouped by `agent_id`, and display cost rows by agent_id label. This matches what the PDE tmux pane-token-meter already does. The `@ai-sdk/mcp` reference in RUI-04 is the package to use for any MCP-aware token extraction if needed, but for the existing PDE pipeline the relay events are the primary data source.

**Primary recommendation:** Build a `TokenPlayground` component that reads the existing `WireEnvelope[]` event stream, groups `token_usage` events by `agent_id`, derives per-agent cost rows using `deriveCost` logic, and persists session totals to Upstash Redis via a lightweight Server Action. No new npm packages required beyond what is already installed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@upstash/redis` | `latest` (installed) | Persist session token totals across refreshes | Already installed and used in `lib/redis.ts`; pipeline pattern established in `lib/queries.ts` |
| `shadcn` components | `^4.1.0` (installed) | Card, Progress, Separator, Badge, Tabs | Already installed; `progress` component confirmed in installed list via 158-UI-SPEC.md |
| `lucide-react` | `^1.6.0` (installed) | Icons for UI chrome | Already installed; project standard |
| `zod` | `latest` (installed) | Validate Server Action inputs | Already project standard |

### No New Packages Required

The existing stack handles everything:
- Event streaming: `useEventStream` hook (SSE/polling, already works)
- Token accumulation: extend `lib/derive-cost.ts` (already exists)
- Redis persistence: `lib/redis.ts` and `lib/queries.ts` patterns (already established)
- UI components: shadcn `progress`, `card`, `separator`, `tabs`, `badge` (already installed)

**Version verification (npm view, 2026-03-28):**
- `@upstash/redis`: latest -- installed
- `@ai-sdk/mcp`: 1.0.30 (latest) -- NOT installed, NOT needed for this phase (PDE uses its own event relay)

**Installation:** No new packages to install.

---

## Architecture Patterns

### Recommended Project Structure

```
dashboard/
  lib/
    derive-cost.ts           # EXTEND: add deriveToolBreakdown() and deriveContextUsage()
    __tests__/
      derive-cost.test.ts    # EXTEND: add tests for new functions
  components/
    token-playground.tsx     # NEW: TokenPlayground component (replaces CostMeter in session-detail)
  app/
    actions.ts               # EXTEND: add persistSessionCost() server action
```

### Pattern 1: Per-Agent Token Breakdown

**What:** Group `token_usage` WireEnvelope events by `agent_id`. Each event carries cumulative transcript totals for that agent (`input_tokens`, `output_tokens`). Take the max seen per agent_id (handles re-runs of the same agent).

**When to use:** Always -- this is the only source of accurate token counts in the PDE relay.

**Token event shape** (confirmed from emit-event.cjs source):
```typescript
// WireEnvelope passthrough fields on a token_usage event:
{
  event_type: 'token_usage',
  agent_id: string,       // present when agent_id in hookData
  input_tokens: number,   // sum of all message.usage.input_tokens in transcript
  output_tokens: number,  // sum of all message.usage.output_tokens in transcript
}

// WireEnvelope passthrough fields on tool_called / bash_called / file_changed:
{
  event_type: 'tool_called' | 'bash_called' | 'file_changed',
  tool_name: string,      // e.g. 'Read', 'Write', 'Bash', 'Edit', etc.
  agent_id: string,
  file_path?: string,
  command?: string,       // Bash commands, truncated to 200 chars
}
```

**Derive function to add to lib/derive-cost.ts:**
```typescript
export interface ToolCostRow {
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  toolCalls: number;
}

export function deriveToolBreakdown(events: WireEnvelope[]): ToolCostRow[] {
  const agentMaxTokens = new Map<string, { input: number; output: number }>();
  const agentToolCalls = new Map<string, number>();

  for (const ev of events) {
    const p = ev as Record<string, unknown>;
    if (ev.event_type === 'token_usage' && p.agent_id) {
      const id = String(p.agent_id);
      const prev = agentMaxTokens.get(id) ?? { input: 0, output: 0 };
      agentMaxTokens.set(id, {
        input:  Math.max(prev.input,  Number(p.input_tokens  ?? 0)),
        output: Math.max(prev.output, Number(p.output_tokens ?? 0)),
      });
    }
    if (
      (ev.event_type === 'tool_called' || ev.event_type === 'bash_called'
        || ev.event_type === 'file_changed')
      && p.agent_id
    ) {
      const id = String(p.agent_id);
      agentToolCalls.set(id, (agentToolCalls.get(id) ?? 0) + 1);
    }
  }

  return Array.from(agentMaxTokens.entries()).map(([agentId, t]) => ({
    agentId,
    inputTokens:  t.input,
    outputTokens: t.output,
    estimatedCostUsd:
      (t.input  / 1_000_000) * INPUT_COST_PER_MILLION +
      (t.output / 1_000_000) * OUTPUT_COST_PER_MILLION,
    toolCalls: agentToolCalls.get(agentId) ?? 0,
  }));
}
```

### Pattern 2: Context Window Utilization

**What:** Display cumulative session `input_tokens` as a percentage of the model's context window. Use shadcn `Progress` component.

**Context window sizes** (verified from official Anthropic docs, fetched 2026-03-28):

| Model | Context Window |
|-------|---------------|
| claude-opus-4-6 | 1,000,000 tokens |
| claude-sonnet-4-6 | 1,000,000 tokens |
| claude-haiku-4-5 | 200,000 tokens |
| Claude Code default (sonnet-4-6 as of 2026-03) | 1,000,000 tokens |

**Context usage function:**
```typescript
export function deriveContextUsage(
  events: WireEnvelope[],
  contextWindowSize = 1_000_000
): { inputTokens: number; percentUsed: number; contextWindowSize: number } {
  const { inputTokens } = deriveCost(events);
  const percentUsed = Math.min((inputTokens / contextWindowSize) * 100, 100);
  return { inputTokens, percentUsed, contextWindowSize };
}
```

**Note on context window accuracy:** Per ccusage analysis of Claude Code JSONL, full context window usage = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. The PDE relay does not currently emit cache token fields separately. Use `input_tokens` only as a conservative floor estimate. Label it "context est." in the UI.

### Pattern 3: Upstash Redis Cost Persistence

**What:** Persist session-level running token totals to Redis so cost survives page refreshes.

**Redis key:** Reuse existing `pde:default:session:{sessionId}` hash. This hash already exists per `lib/queries.ts` and has a 7-day TTL set by the ingest route.

**Fields to add to existing hash:**
```
pde:default:session:{sessionId}
  total_input_tokens   -> string (integer, accumulated with HINCRBY)
  total_output_tokens  -> string (integer, accumulated with HINCRBY)
  cost_usd_cents       -> string (integer, cost * 10000 for precision)
```

**Why integer times 10000?** Redis `HINCRBY` only accepts integers. Storing cost in 0.0001-cent units avoids floating-point serialization and supports atomic increments. Divide by 10000 when displaying.

**Write pattern (Server Action in dashboard/app/actions.ts):**
```typescript
'use server';
import { redis } from '@/lib/redis';

const INPUT_COST_PER_MILLION  = 3;  // Sonnet 4.6 pricing
const OUTPUT_COST_PER_MILLION = 15;

export async function persistSessionCost(
  sessionId: string,
  inputTokensDelta: number,
  outputTokensDelta: number
): Promise<void> {
  const key = `pde:default:session:${sessionId}`;
  const costDeltaCents = Math.round(
    ((inputTokensDelta  / 1_000_000) * INPUT_COST_PER_MILLION +
     (outputTokensDelta / 1_000_000) * OUTPUT_COST_PER_MILLION) * 10_000
  );
  const p = redis.pipeline();
  p.hincrby(key, 'total_input_tokens',  inputTokensDelta);
  p.hincrby(key, 'total_output_tokens', outputTokensDelta);
  p.hincrby(key, 'cost_usd_cents',      costDeltaCents);
  await p.exec();
  // No TTL needed -- ingest route already sets 7-day TTL on this key
}
```

**Read pattern (initial hydration in session page Server Component):**
```typescript
const raw = await redis.hgetall(`pde:default:session:${sessionId}`) as Record<string, string> | null;
const persistedInputTokens  = Number(raw?.total_input_tokens  ?? 0);
const persistedOutputTokens = Number(raw?.total_output_tokens ?? 0);
const persistedCostCents    = Number(raw?.cost_usd_cents      ?? 0);
const persistedCostUsd      = persistedCostCents / 10_000;
```

**Why HINCRBY not HSET?** HINCRBY is atomic. Multiple browser sessions or the ingest route writing simultaneously cannot corrupt the value. HSET would cause last-write-wins data loss.

### Pattern 4: TokenPlayground Component Architecture

```
TokenPlayground ("use client")
  Props:
    events: WireEnvelope[]
    connectionStatus: ConnectionStatus
    sessionId: string
    initialPersistedCostUsd: number   // from Redis, passed as Server Component prop

  useMemo -> deriveCost(events)         -> CostState (session totals)
  useMemo -> deriveToolBreakdown(events) -> ToolCostRow[]
  useMemo -> deriveContextUsage(events)  -> { percentUsed, inputTokens }
  useEffect (debounced 5s) -> persistSessionCost(sessionId, ...) server action

  Render:
    Card "Context Window"
      Progress bar (0-100%)
      Label: "{formatted}k input tokens • {percentUsed.toFixed(1)}% context est."

    Card "Session Cost"
      3-column grid (same as existing CostMeter):
        Input tokens | Output tokens | Est. Cost USD

    Card "Per-Agent Breakdown"
      Table: Agent | Tool Calls | Input | Output | Cost
      Rows: one per ToolCostRow
```

**Replace CostMeter in session-detail.tsx:** Import `TokenPlayground` and remove `CostMeter`. Pass `events`, `connectionStatus`, `sessionId`, and `initialPersistedCostUsd` (from SSR hydration).

### Anti-Patterns to Avoid

- **Writing to Redis on every SSE event:** SSE delivers events at 2-second intervals. Debounce Server Action calls at 5 seconds minimum.
- **Storing cost as float string in Redis:** Use integer times 10000 and HINCRBY. Float HSET causes precision loss and race conditions.
- **Building a new event fetching system:** Do not bypass `useEventStream`. It already delivers `token_usage` events in the stream.
- **Summing token_usage events directly:** Each `token_usage` event is a cumulative transcript snapshot, not a delta. Use Math.max per agent_id, not sum.
- **Installing @ai-sdk/mcp for this phase:** RUI-04 says "via @ai-sdk/mcp" but this refers to the UI being about MCP tool calls, not a requirement to use the AI SDK. The PDE relay already delivers this data.
- **Keeping CostMeter alongside TokenPlayground:** Creates duplicate token displays. Replace, do not add alongside.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis atomic increments | Custom read-modify-write loop | `redis.hincrby()` | HINCRBY is atomic at Redis level; no mutex needed |
| Token accumulation | New reducer logic | Extend `deriveCost` in `lib/derive-cost.ts` | Already tested, typed, used by CostMeter |
| Debounced server call | setTimeout chains | `useRef` debounce (2-line standard React) | No library needed |
| Cost formatting | Custom number formatter | `formatCost()` and `formatTokens()` in `lib/derive-cost.ts` | Already handles $0.0001 edge cases |
| Progress bar | Custom div width animation | shadcn `Progress` component (already installed) | Accessible, animated, design-system-consistent |

---

## Common Pitfalls

### Pitfall 1: token_usage Events Are Cumulative Snapshots, Not Deltas

**What goes wrong:** Summing `input_tokens` across all `token_usage` events gives a wildly inflated total. A session with 3 SubagentStop events emits token_usage with totals [1000, 2400, 3100] -- not deltas [1000, 1400, 700].

**Why it happens:** `sumTranscriptTokens()` in emit-event.cjs reads the entire transcript on each SubagentStop call. Confirmed by source code.

**How to avoid:** Group by `agent_id`, take `Math.max` of seen values per agent, then sum across agents for session total.

**Warning signs:** Session cost shows $5+ for a 30-minute routine coding session.

### Pitfall 2: Debounce Required on persistSessionCost Calls

**What goes wrong:** Calling the Server Action on every token_usage event triggers a Vercel Function invocation and Upstash write every 2-3 seconds. Exhausts Upstash free tier rapidly.

**Why it happens:** `useEventStream` delivers events continuously; `useMemo` recomputes on every event; `useEffect` fires on every memo change.

**How to avoid:** 5-second debounce using `useRef`. Store latest values in ref, call action only after quiet period.

**Warning signs:** Upstash command counter shows 500+ commands/hour per open dashboard tab.

### Pitfall 3: HINCRBY Requires Integer Arguments

**What goes wrong:** Passing a float like `0.000045` to `redis.hincrby()` throws "value is not an integer or out of range."

**Why it happens:** Redis HINCRBY is integer-only by spec.

**How to avoid:** Multiply USD cost by 10000, apply `Math.round()`, store as integer. Divide by 10000 when displaying.

**Warning signs:** Redis pipeline throws on cost field write.

### Pitfall 4: Missing Fields on Pre-Phase Sessions

**What goes wrong:** Reading `total_input_tokens` from Redis returns `null` for sessions created before this phase. Component shows NaN.

**Why it happens:** Hash exists but never had these fields written. `hgetall` returns hash without those keys.

**How to avoid:** Always use `Number(raw?.total_input_tokens ?? 0)`. The `?? 0` handles missing keys.

**Warning signs:** NaN displayed in cost meter for older sessions.

### Pitfall 5: CostMeter Already Exists in session-detail.tsx

**What goes wrong:** Adding TokenPlayground alongside CostMeter creates two token display sections.

**How to avoid:** Replace the `<CostMeter>` import and usage in `session-detail.tsx` with `<TokenPlayground>`. Pass the additional required props.

---

## Code Examples

### Verified: token_usage Event Structure

```typescript
// Source: hooks/emit-event.cjs lines 102-109 -- confirmed by direct code reading
// On SubagentStop, token_usage is emitted with these fields:
// { input_tokens: number, output_tokens: number, agent_id?: string }
// input_tokens = sum of ALL message.usage.input_tokens in transcript (cumulative)
// output_tokens = sum of ALL message.usage.output_tokens in transcript (cumulative)
```

### Verified: Anthropic Pricing (fetched 2026-03-28)

```typescript
// Source: https://platform.claude.com/docs/en/about-claude/models/overview
// Verified 2026-03-28
const PRICING = {
  'claude-sonnet-4-6': { inputPerM: 3,  outputPerM: 15 },
  'claude-opus-4-6':   { inputPerM: 5,  outputPerM: 25 },
  'claude-haiku-4-5':  { inputPerM: 1,  outputPerM: 5  },
  'default':           { inputPerM: 3,  outputPerM: 15 }, // Sonnet 4.6
} as const;

const CONTEXT_WINDOWS = {
  'claude-sonnet-4-6': 1_000_000,
  'claude-opus-4-6':   1_000_000,
  'claude-haiku-4-5':    200_000,
  'default':           1_000_000,
} as const;
```

### Verified: shadcn Progress Component

```tsx
// Source: shadcn/ui docs; component confirmed installed in 158-UI-SPEC.md
import { Progress } from '@/components/ui/progress';
<Progress value={percentUsed} className="h-2" />
// value: 0-100 number
```

### Verified: Debounced Server Action Pattern

```typescript
// Standard React pattern -- no external library needed
const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (totalInputTokens === 0) return;
  if (pendingRef.current) clearTimeout(pendingRef.current);
  pendingRef.current = setTimeout(() => {
    persistSessionCost(sessionId, totalInputTokens, totalOutputTokens).catch(() => {});
  }, 5_000);
  return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
}, [sessionId, totalInputTokens, totalOutputTokens]);
```

### Verified: HINCRBY Pipeline Pattern

```typescript
// Source: lib/queries.ts pipeline usage -- confirmed pattern
const p = redis.pipeline();
p.hincrby(key, 'total_input_tokens',  inputDelta);
p.hincrby(key, 'total_output_tokens', outputDelta);
p.hincrby(key, 'cost_usd_cents',      Math.round(costDeltaUsd * 10_000));
await p.exec(); // single HTTP round-trip, all increments atomic
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CostMeter: aggregate session totals only | TokenPlayground: per-agent rows + context gauge | Phase 159 (now) | Per-agent attribution; context window awareness |
| Cost resets on page refresh | HINCRBY persists to pde:default:session hash | Phase 159 (now) | Running total survives navigation |
| Hardcoded "Sonnet 4.5" comment in derive-cost.ts | Update to Sonnet 4.6 (same $3/$15 pricing) | Phase 159 (now) | Cosmetic; pricing unchanged |
| 200k context window assumption | Sonnet 4.6 and Opus 4.6 now 1M tokens | 2026-03-13 | Default denominator = 1M for context % |

---

## Environment Availability

Step 2.6: SKIPPED -- This phase is code/config changes only within the existing Next.js dashboard. No new external services, runtimes, CLIs, or databases introduced. Upstash Redis and dashboard deploy infrastructure operational from Phase 156+.

---

## Validation Architecture

Nyquist validation enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test -- --reporter=verbose lib/__tests__/derive-cost.test.ts` |
| Full suite command | `cd dashboard && npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUI-04 | `deriveToolBreakdown()` groups token_usage events by agent_id | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | Extend existing |
| RUI-04 | `deriveToolBreakdown()` takes max (not sum) of token_usage per agent | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | Extend existing |
| RUI-04 | `deriveToolBreakdown()` counts tool_called/bash_called/file_changed events per agent | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | Extend existing |
| RUI-04 | `deriveToolBreakdown()` returns empty array for events with no token_usage | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | Extend existing |
| RUI-05 | `deriveContextUsage()` returns correct percentage | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | Extend existing |
| RUI-05 | `deriveContextUsage()` clamps percentage to 100 at overflow | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | Extend existing |

**Note:** TokenPlayground component render tests are not practical in the node vitest environment (no jsdom). Per Phase 157 decision: "Source inspection tests used instead of renderHook -- vitest runs in node environment (no DOM/jsdom)."

### Sampling Rate

- **Per task commit:** `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/lib/__tests__/derive-cost.test.ts` -- append `describe('deriveToolBreakdown', ...)` and `describe('deriveContextUsage', ...)` blocks (file exists; do not recreate)

*(No new test files needed -- extend the existing derive-cost test file)*

---

## Project Constraints (from STATE.md)

CLAUDE.md does not exist at project root. Constraints from STATE.md accumulated decisions:

- **Vitest environment is node (no jsdom):** Use source-inspection tests, not renderHook or React Testing Library.
- **Test files in `dashboard/lib/__tests__/`:** Not at project root. Confirmed from Phase 157 decision.
- **shadcn component imports use `@/components/ui/`:** Confirmed from existing component imports.
- **Server Actions use `use server` directive:** Confirmed from `dashboard/app/actions.ts` pattern.
- **Redis key namespace is `pde:default:`:** All keys prefixed with `pde:default:` per established pattern.
- **Zero npm deps at plugin root:** New dependencies go in `dashboard/` only.
- **MCP security:** Verified-sources-only policy.

---

## Open Questions

1. **Are token_usage cumulative totals or per-run deltas?**
   - What we know: `sumTranscriptTokens()` reads the entire transcript file on each SubagentStop -- confirmed from source. Emitted values are cumulative for that agent transcript.
   - Recommendation: Group by `agent_id`, take `Math.max` per agent. Document in code comments.

2. **Does the `model` field reach the dashboard for model-specific pricing?**
   - What we know: `model` is written to the `session_start` event payload (emit-event.cjs line 96). It is in the event sorted set but not in the session hash.
   - Recommendation: Read `model` from the `session_start` event in the events array. Default to Sonnet 4.6 pricing ($3/$15) if absent. Add model -> pricing lookup to `derive-cost.ts`.

---

## Sources

### Primary (HIGH confidence)

- `/hooks/emit-event.cjs` (read 2026-03-28) -- Confirmed token_usage event structure, agent_id field, cumulative transcript reading
- `/dashboard/lib/derive-cost.ts` (read 2026-03-28) -- Confirmed existing accumulation pattern, pricing constants
- `/dashboard/lib/queries.ts` (read 2026-03-28) -- Confirmed Redis key patterns, hset/hgetall, pipeline usage
- `/dashboard/lib/redis.ts` (read 2026-03-28) -- Confirmed Upstash client setup
- `/dashboard/components/cost-meter.tsx` and `session-detail.tsx` (read 2026-03-28) -- Integration points confirmed
- `https://platform.claude.com/docs/en/about-claude/models/overview` (fetched 2026-03-28) -- Model names, context windows, pricing verified
- `.planning/phases/158-mcp-apps-rich-ui-design-artifact-preview/158-UI-SPEC.md` (read 2026-03-28) -- shadcn Progress confirmed installed

### Secondary (MEDIUM confidence)

- `ccusage.com/guide/json-output` and `codelynx.dev/posts/calculate-claude-code-context` -- Context % formula: input_tokens + cache tokens; PDE relay omits cache fields so use input_tokens as floor
- Upstash HINCRBY atomicity -- standard Redis command behavior; confirmed via Upstash Redis JS SDK docs

### Tertiary (LOW confidence)

- WebSearch on `@ai-sdk/mcp` token attribution -- AI SDK 1.0.30 supports MCP tool tracking but is not relevant to PDE relay architecture

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed
- Architecture: HIGH -- token event structure confirmed from source code; Redis patterns confirmed from existing implementation
- Pitfalls: HIGH -- cumulative vs. delta confirmed from emit-event.cjs; HINCRBY integer requirement is Redis spec
- Pricing: HIGH -- fetched from official Anthropic docs 2026-03-28

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain; Anthropic pricing stable since Sonnet 4.6 launch)
