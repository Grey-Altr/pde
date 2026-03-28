---
phase: 159-token-playground
plan: "01"
subsystem: dashboard/lib
tags: [derive-cost, token-playground, tdd, server-actions, redis]
dependency_graph:
  requires: []
  provides: [deriveToolBreakdown, deriveContextUsage, persistSessionCost]
  affects: [dashboard/lib/derive-cost.ts, dashboard/app/actions.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, Redis HINCRBY pipeline, Math.max token aggregation]
key_files:
  created: []
  modified:
    - dashboard/lib/derive-cost.ts
    - dashboard/lib/__tests__/derive-cost.test.ts
    - dashboard/app/actions.ts
decisions:
  - "Math.max per agent for token_usage events (cumulative snapshots, not deltas)"
  - "Cost stored as integer * 10000 in Redis to avoid HINCRBY float limitation"
  - "persistSessionCost has no auth gate — page-level Clerk auth is sufficient"
  - "INPUT_COST_PER_MILLION and OUTPUT_COST_PER_MILLION exported for UI reuse"
metrics:
  duration: "91 seconds"
  completed: "2026-03-28T21:03:53Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 159 Plan 01: Token Playground Data Layer Summary

**One-liner:** Per-agent cost attribution using Math.max token aggregation, context window percentage, and atomic Redis HINCRBY persistence for the Token Playground UI.

## What Was Built

Two new exported functions added to `dashboard/lib/derive-cost.ts` and one new server action added to `dashboard/app/actions.ts`.

### deriveToolBreakdown (derive-cost.ts)

Groups `token_usage` events by `agent_id` using `Math.max` — not sum — because token_usage events are cumulative snapshots. Counts `tool_called`, `bash_called`, and `file_changed` events per agent in a `toolCalls` field. Returns `ToolCostRow[]` with per-agent cost attribution. Missing `agent_id` fields are grouped under `"unknown"`.

### deriveContextUsage (derive-cost.ts)

Returns `{ inputTokens, percentUsed, contextWindowSize }` by calling `deriveCost()` internally. `percentUsed` is clamped to 100 via `Math.min`. Accepts optional `contextWindowSize` parameter defaulting to `1_000_000`.

### persistSessionCost (actions.ts)

Atomically increments three fields on the existing session hash key `pde:default:session:{sessionId}` using a Redis pipeline with HINCRBY. Cost is stored as `integer * 10000` (i.e., `costDeltaCents`) to work around HINCRBY's integer-only constraint. No TTL — the ingest route already sets a 7-day TTL on the session hash.

### Additional changes

- `INPUT_COST_PER_MILLION` and `OUTPUT_COST_PER_MILLION` changed from `const` to `export const` for UI reuse.
- Pricing comment updated from "Sonnet 4.5" to "Sonnet 4.6" (same rates, cosmetic fix).
- `ToolCostRow` interface added and exported.

## Tests

10 new tests added across two new describe blocks:

- `describe('deriveToolBreakdown')` — 6 tests: empty array for no token_usage, max-not-sum grouping, tool call counting, cost calculation ($18 for 1M/1M), missing agent_id handling, multi-agent max verification.
- `describe('deriveContextUsage')` — 4 tests: zero for empty events, 50% at 500k/1M, clamp to 100 at 1.5M/1M, custom window size.

All 22 tests in the file pass. Full suite: 303 tests pass, 0 failures.

## Commits

| Hash | Message |
|------|---------|
| 29bc57e | feat(159-01): implement deriveToolBreakdown and deriveContextUsage |
| 14b26e0 | feat(159-01): add persistSessionCost server action |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented with real logic. No hardcoded empty values or placeholder data.

## Self-Check

Files exist:
- `dashboard/lib/derive-cost.ts` — contains `deriveToolBreakdown`, `deriveContextUsage`, `ToolCostRow`, `export const INPUT_COST_PER_MILLION`
- `dashboard/lib/__tests__/derive-cost.test.ts` — contains `describe('deriveToolBreakdown'` and `describe('deriveContextUsage'`
- `dashboard/app/actions.ts` — contains `export async function persistSessionCost(`
