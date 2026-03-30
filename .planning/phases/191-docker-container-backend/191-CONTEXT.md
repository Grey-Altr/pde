# Phase 191: Docker Container Backend - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Smart discuss (grey area proposals accepted)

<domain>
## Phase Boundary

Users can dispatch a plan to a local Docker container that streams real NDJSON events through the existing event bus, with the same onLine/onExit interface as local spawn.

</domain>

<decisions>
## Implementation Decisions

### Docker Integration Approach
- **Docker interaction:** dockerode npm package added to dispatcher/package.json — battle-tested Docker Engine API client, avoids CLI parsing
- **Base image:** Pre-built PDE image with Claude Code CLI + Node.js baked in, referenced by tag `pde-session:latest` — faster startup, reproducible
- **Code mounting:** Bind-mount the worktree directory as read-write at `/workspace` — same pattern as local, no copy overhead
- **Resource limits:** No default limits — user configures via dispatch.docker.memory and dispatch.docker.cpus config keys (added in Phase 190)

### Container Lifecycle & Cleanup
- **Success cleanup:** Auto-remove container (`AutoRemove: true`) — no dangling containers
- **Failure cleanup:** Preserve container for 10min then auto-remove via setTimeout — allows log inspection
- **Idle timeout:** Configurable via dispatch.docker.idle_timeout, defaulting to 300s — matches existing function timeout
- **Exit detection:** dockerode container.wait() promise + container.logs() stream — clean async, matches SSH channel.on('close') pattern

### Testing Strategy
- **Test approach:** Both mocked and real — unit tests with mocked dockerode for CI/fast iteration, one integration test with real Docker gated by `DOCKER_AVAILABLE` env
- **Dangling verification:** `docker ps -a --filter label=pde-session` after test — success criteria SC-4
- **Dashboard label:** Extend session-source.test.ts with 'docker' value assertions — existing SS-01-SS-10 pattern

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/dispatcher/lib/remote-ssh.cjs` — THE pattern Docker must mirror: async IIFE + sync kill handle return, NDJSON file write, onLine/onExit callbacks, channel stdin.end()
- `packages/dispatcher/lib/spawn.cjs` — onLine/onExit contract: `onLine(sessionId, parsedEvent)`, `onExit(sessionId, exitCode)`, returns `{ pid, kill }`
- `packages/dispatcher/lib/coordinator.cjs` — dispatch site lines 191-265, exit handler lines 386-454, needs `_runDockerSession()` method
- `packages/dispatcher/lib/remote-router.cjs` — routing decision tree, needs 'docker' route between rules 2 and 3
- `packages/dispatcher/lib/aggregator.cjs` — watch(sessionId, 'docker') routes to RemoteAggregator (Phase 190 stub)
- `packages/cloud-adapter/index.cjs` — Phase 190 scaffold, receives spawnDockerSession() implementation
- `packages/dispatcher/lib/tmux-fanout.cjs` — sourceLabel() returns 'R' for docker backend
- `dashboard/lib/queries.ts` — SessionListItem.source includes 'docker' (Phase 190)
- `dashboard/components/session-health-matrix.tsx` — sourceLabels includes 'docker': 'Docker' (Phase 190 gap fix)

### Established Patterns
- Async IIFE + synchronous return of kill handle (remote-ssh.cjs pattern)
- NDJSON written to `/tmp/pde-session-{relayId}.ndjson` — aggregator polls every 500ms
- Environment: delete CLAUDECODE, set PDE_SESSION_ID=relayId, PDE_PHASE, PDE_PLAN, PDE_BACKEND
- Lock file sessionType: 'docker' — prevents stale reclamation (Phase 190 INF-01)
- Registry backend field: 'docker' (coordinator stores this)
- channel.stdin.end() equivalent: container stdin must be closed immediately
- Tests: node:test for dispatcher CJS, vitest for dashboard TS

### Integration Points
- `coordinator.cjs` dispatch() method — add `backend === 'docker'` branch after ssh branch
- `coordinator.cjs _handleExit()` — Docker uses same exit handler as SSH (merge, cleanup, etc.)
- `remote-router.cjs` — add docker detection with configurable preferred_backend
- `RemoteAggregator` stub in aggregator.cjs — needs event bus wiring for real Docker events
- `packages/dispatcher/package.json` — add dockerode dependency
- `dashboard/__tests__/session-source.test.ts` — extend for 'docker' source label verification

</code_context>

<specifics>
## Specific Ideas

### Docker Container Environment Setup
```
Environment variables for container:
  CLAUDECODE=              (empty — prevents nested session)
  PDE_SESSION_ID={relayId} (UUID)
  PDE_PHASE={phase}
  PDE_PLAN={plan}
  PDE_BACKEND=docker
  PDE_SESSION_START={isoTimestamp}
  PDE_REMOTE={ingestUrl}   (if dashboard running)
  PDE_RELAY_TOKEN={token}  (if available)

Docker container config:
  Image: pde-session:latest (or dispatch.docker.image config)
  WorkingDir: /workspace
  HostConfig.Binds: [worktreePath:/workspace]
  Labels: { 'pde-session': sessionId }
  OpenStdin: false (prevents hang)
  Tty: false (prevents escape sequence corruption in NDJSON)
```

### Container Label for Cleanup Verification
All PDE containers get label `pde-session={sessionId}` — enables `docker ps -a --filter label=pde-session` for dangling container verification.

</specifics>

<deferred>
## Deferred Ideas

- Dockerfile/image build automation — Phase 196 (Containerized MCP Servers)
- Multi-container orchestration — out of scope for v0.24
- Docker Compose integration — future milestone

</deferred>
