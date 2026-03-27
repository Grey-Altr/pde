# Phase 152: Parallel Session Relay Wiring - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Coordinator launches a relay.cjs child process per dispatched parallel session so the web dashboard receives real-time session data via Redis. Closes INT-RELAY gap and flow "Dashboard monitoring (parallel dispatch)".

</domain>

<decisions>
## Implementation Decisions

### UUID Strategy
- **D-01:** Keep relay UUID separate from coordinator sessionId. Coordinator sessionId (`p144-1-abc12345`) retains semantic meaning (phase/plan encoded) for registry, worktree path, branch name. Relay UUID is a proper v4 UUID used for dashboard/Redis correlation and NDJSON file paths.
- **D-02:** `_runSession` generates `relayId = crypto.randomUUID()` locally, passes it as `PDE_SESSION_ID` env var to spawned session and as argument to `_spawnRelay(relayId)`.

### Session-Start Modification
- **D-03:** Modify `session-start` in `pde-tools.cjs` to honor `PDE_SESSION_ID` when set. Single-line change: `const newSessionId = process.env.PDE_SESSION_ID || randomUUID()`. Unchanged behavior for single-session mode.

### Relay Spawning
- **D-04:** Follow `start-relay.cjs` pattern exactly: `detached: true`, `stdio: ['ignore', 'ignore', 'ignore']`, `child.unref()`.
- **D-05:** Use `opts._deps.spawnChildProcess` DI pattern for testability. No `vi.mock()`.
- **D-06:** `_spawnRelay` returns null silently when `PDE_REMOTE` not set (graceful degradation per CFG-05).
- **D-07:** Relay spawn failures never surface to PDE or crash coordinator. All relay code wrapped in try/catch.

### Relay Lifecycle
- **D-08:** Track relays in `_relays: Map<sessionId, { pid, kill }>` (same pattern as `_sessions` Map).
- **D-09:** Relay spawned after `_aggregator.watch()` in `_runSession`. Relay killed in `_handleExit` after `_aggregator.unwatch()`. `shutdown()` kills all relays.
- **D-10:** Only spawn relay in `_runSession` (local). `_runRemoteSession` already has its own relay path.

### Aggregator Path Alignment
- **D-11:** Pass `relayId` (the UUID) to `_aggregator.watch(relayId)` instead of coordinator sessionId, so aggregator watches the same NDJSON file as the relay. Only apply if this doesn't break existing aggregator tests.

### Claude's Discretion
- Exact test structure and assertion patterns in `coordinator-relay.test.cjs`
- Whether to add relay PID to coordinator registry entries or keep `_relays` Map standalone

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Coordinator & Dispatch
- `packages/dispatcher/lib/coordinator.cjs` — Dispatch flow, DI pattern, _runSession, _handleExit, shutdown
- `packages/dispatcher/lib/spawn.cjs` — Env construction, PDE_SESSION_ID assignment
- `packages/dispatcher/lib/aggregator.cjs` — NDJSON file path formula, watch/unwatch

### Relay Infrastructure
- `bin/lib/relay.cjs` — Daemon mode interface, TailCursor, BatchQueue, CircuitBreaker
- `bin/lib/relay-protocol.cjs` — WireEnvelopeSchema UUID validation
- `hooks/start-relay.cjs` — Reference spawn pattern (detached + unref)

### Session Start
- `bin/pde-tools.cjs` case 'session-start' — UUID generation, PDE_SESSION_ID gate

### Dashboard
- `dashboard/app/api/ingest/route.ts` — Redis pipeline, TTL, session_source
- `dashboard/lib/queries.ts` — getSessions(), deriveStatus()

### Tests
- `tests/dispatcher/coordinator-smoke.test.cjs` — makeCoordWithDeps DI pattern, existing stubs

### Research
- `.planning/phases/152-parallel-relay-wiring/152-RESEARCH.md` — Full architecture, pitfalls, code examples

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `relay.cjs` daemon mode: Full relay infrastructure already implemented (TailCursor, BatchQueue, CircuitBreaker, postEvents). Phase 152 only needs to spawn it.
- `start-relay.cjs`: Reference implementation for relay spawn pattern (detached, unref, argv passing).
- `coordinator.cjs` DI pattern: `opts._deps` injection for all external I/O.
- `_sessions: Map` pattern: Exact same lifecycle tracking needed for `_relays: Map`.

### Established Patterns
- CJS everywhere in dispatcher — no ESM
- DI via `opts._deps` for testability
- `vi.spyOn` or DI stubs for child_process mocking (no `vi.mock()`)
- Source inspection tests acceptable for structural properties

### Integration Points
- `_runSession` in coordinator.cjs — insert relay spawn after aggregator.watch()
- `_handleExit` in coordinator.cjs — insert relay cleanup after aggregator.unwatch()
- `shutdown()` in coordinator.cjs — add relay killall
- `session-start` in pde-tools.cjs — honor PDE_SESSION_ID env var

</code_context>

<specifics>
## Specific Ideas

No specific requirements — research provides complete implementation patterns with verified code examples. Follow research recommendations directly.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 152-parallel-relay-wiring*
*Context gathered: 2026-03-27*
