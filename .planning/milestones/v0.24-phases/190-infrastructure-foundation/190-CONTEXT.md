# Phase 190: Infrastructure Foundation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The type system, registry, lock, aggregator, and package structure accept cloud and Docker backends so all subsequent phases can be built without type drift or constraint violations.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/dispatcher/lib/lock.cjs` — Atomic lock with `process.kill(pid, 0)` liveness check (line 82)
- `packages/dispatcher/lib/aggregator.cjs` — NDJSON multiplexer using TailCursor exclusively, one per session
- `packages/dispatcher/lib/remote-router.cjs` — Session routing: local | ssh | managed
- `packages/dispatcher/lib/coordinator.cjs` — Full session lifecycle orchestration (524 lines)
- `dashboard/lib/wire-schema.ts` — Zod WireEnvelopeSchema (no SessionSource enum yet — source stored as payload string → Redis)
- `dashboard/lib/queries.ts` — Session source union: 'local' | 'remote-ssh' | 'remote-managed'
- `bin/lib/config.cjs` — 11 dispatch.* config keys in VALID_CONFIG_KEYS

### Established Patterns
- Session source extracted from event payload (`evPayload.source ?? 'local'`) and stored in Redis hash
- TailCursor polls `/tmp/pde-session-{sessionId}.ndjson` every 500ms
- Lock file at `.planning/dispatcher.lock` using O_EXCL atomic creation
- Remote-router injectable `detectManagedBackend` probe for testability
- Config values accessed via `bin/lib/config.cjs` with VALID_CONFIG_KEYS whitelist

### Integration Points
- `dashboard/app/api/ingest/route.ts` — Event ingestion, session source storage in Redis
- `dashboard/__tests__/session-source.test.ts` — SS-01 through SS-10 source validation tests
- `tests/dispatcher/config-dispatch.test.cjs` — All 11 dispatch.* key validation
- `packages/dispatcher/index.cjs` — Re-exports all public modules
- Zero-npm root constraint: cloud adapter must live in `packages/cloud-adapter/`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP success criteria:
1. SessionSource enum with 'remote-cloud' and 'docker' values
2. lock.cjs cloud-aware PID handling (no process.kill for cloud sessions)
3. aggregator.cjs RemoteAggregator routing for cloud sessions
4. packages/cloud-adapter/ with package.json
5. Dispatch config block with cloud and docker settings

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
