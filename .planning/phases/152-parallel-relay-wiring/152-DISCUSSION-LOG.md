# Phase 152: Parallel Session Relay Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 152-parallel-relay-wiring
**Areas discussed:** UUID strategy, Aggregator path alignment
**Mode:** --auto (all decisions auto-selected from recommended defaults)

---

## UUID Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep separate | Coordinator sessionId retains semantic meaning; relay UUID is dashboard-facing | ✓ |
| Replace coordinator sessionId with UUID | Use UUID everywhere, lose phase/plan encoding | |

**User's choice:** [auto] Keep separate (recommended default)
**Notes:** Research recommends this approach. Coordinator sessionId encodes phase/plan semantics useful for registry, worktree path, branch name. Relay UUID is purely for dashboard/Redis correlation.

---

## Aggregator Path Alignment

| Option | Description | Selected |
|--------|-------------|----------|
| Fix — pass relayId to aggregator.watch() | Aggregator watches same NDJSON file as relay | ✓ |
| Leave as-is | Aggregator continues using coordinator sessionId (tmux path may break) | |

**User's choice:** [auto] Fix it (recommended default)
**Notes:** Consistent paths between relay and aggregator. Only apply if existing aggregator tests aren't broken.

---

## Claude's Discretion

- Test structure and assertion patterns in coordinator-relay.test.cjs
- Whether to merge relay PID into coordinator registry or keep _relays Map standalone

## Deferred Ideas

None — discussion stayed within phase scope
