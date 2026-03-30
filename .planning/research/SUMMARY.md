# Project Research Summary

**Project:** Platform Development Engine — v0.24 Cloud Dispatch & State Sync
**Domain:** Cloud AI agent dispatch, Docker container isolation, git-based planning state sync, intelligent task routing
**Researched:** 2026-03-30
**Confidence:** HIGH (stack and architecture grounded in direct codebase reads + official Anthropic docs); MEDIUM (cloud dispatch specifics — `claude --remote` is still research preview)

## Executive Summary

PDE v0.24 extends the existing distributed execution foundation (v0.17–v0.18) with three new execution backends: Anthropic-managed cloud sessions via `claude --remote`, Docker container isolation for local heavy workloads, and a git-native `.planning/` state sync protocol that works without SSH. The core architecture insight is that each backend is fundamentally different: local and Docker sessions produce real NDJSON streams that feed directly into the existing `TailCursor`-based aggregator, while cloud sessions return only a session ID and require a polling shim that emits synthetic NDJSON events. This asymmetry must be respected from day one — it drives the separation of `remote-cloud.cjs` (polling shim) from `remote-docker.cjs` (near-drop-in NDJSON), and it dictates that the existing `TailCursor` must never be started for cloud session IDs or the aggregator accumulates ghost cursors indefinitely.

The recommended approach is build-from-dependencies: Docker first (no OAuth requirement, real NDJSON, validates the container dispatch pattern and backend interface contract), then state sync (required by both Docker cross-machine sync and cloud scenarios before the cloud VM can receive current `.planning/` context), then cloud dispatch (most constrained — OAuth-only, polling-only, GitHub repos only), and finally intelligent routing (meaningless without all three backends implemented and testable). This order is explicitly prescribed by the architecture research build-order phases A through E and is confirmed by the feature dependency graph which shows routing intelligence requiring all three dispatch destinations.

The primary risk cluster is state integrity and the local dispatch path. The existing `--ours` merge strategy in `merge.cjs` silently drops remote-written progress updates when applied to cloud sync direction (where the remote is the authoritative writer, not the local machine). The `dispatcher.lock` does not cover cloud sync git operations, creating a second concurrent writer to main. And the routing decision in `routeSession()` currently resolves in under 1ms — adding a network probe for cloud availability without caching will block all parallel dispatch for 2–5 seconds per call. All three of these require explicit design decisions before implementation begins, not during it.

## Key Findings

### Recommended Stack

The stack is minimal by design. PDE has a zero-npm-dependency constraint at the plugin root and a convention of system-git over pure-JS alternatives. Three net-new packages are required: `dockerode@4.0.10` for structured Docker container lifecycle management (preferred over CLI subprocess for proper stream multiplexing via `modem.demuxStream`), `simple-git@3.33.0` for promise-based git operations in the sync protocol (wraps system git, DI-friendly, matches the pattern already used throughout `coordinator.cjs`), and `@anthropic-ai/claude-agent-sdk@0.2.87` for session ID queries. The `claude --remote` CLI flag (v2.1.51+) is the cloud execution primitive — invoked as a child process via `node:child_process`, not via SDK.

**Core technologies:**
- `claude --remote` CLI (v2.1.51+): Cloud VM dispatch — requires `claude.ai` OAuth (not `ANTHROPIC_API_KEY`), GitHub repos only, returns session ID immediately, task runs async on Anthropic-managed VM
- `dockerode@4.0.10`: Docker container lifecycle — structured API avoids string-parsing exit codes; stream demux via `modem.demuxStream`; 1,271 npm dependents; `socketPath` default works on macOS/Linux
- `simple-git@3.33.0`: Git state sync — promise API, DI-testable, wraps system git (guaranteed present in PDE environment); replaces raw `execFileSync` git calls in sync protocol
- `@anthropic-ai/claude-agent-sdk@0.2.87`: Session queries (`listSessions`, `getSessionInfo`) — TypeScript-first; use from `.mjs` or with ESM interop in `.cjs`
- `node:child_process` (built-in): Spawning `claude --remote` and `docker` CLI subprocesses — same pattern as existing `spawn.cjs`, zero dependencies

**What NOT to add:** `isomorphic-git` (pure-JS overhead, no SSH support), `nodegit` (native C++ bindings break on Node version change), `ws` (dashboard already uses SSE), `bullmq` (`queue.cjs` already handles dispatch queuing), Docker Compose (single-container per-session dispatch, Compose adds YAML overhead with no benefit), Kubernetes (developer tool, not multi-tenant SaaS).

### Expected Features

The feature landscape splits cleanly into a P1 launch set (minimum for the milestone to be shippable) and two deferred tiers. All P1 features are interconnected — cloud dispatch without state sync means cloud agents operate on stale planning context; dashboard visibility without proper `session_source` typing means cloud sessions masquerade as local.

**Must have (table stakes — P1):**
- Cloud container dispatch via `claude --remote` — the milestone's primary deliverable; users can `--dispatch=cloud` on an autonomous plan phase
- Git-native `.planning/` state sync — cloud agents that cannot sync state back render the local orchestrator blind to phase completions and task transitions
- Dashboard visibility for cloud sessions — cloud sessions must appear in the existing health matrix with `[C]` source label and distinct icon
- Graceful fallback chain (cloud → SSH → local) — same degradation UX as v0.18 SSH fallback; emit explicit `routing_fallback` event to dashboard so users know why cloud was bypassed
- Ephemeral container cleanup — auto-teardown on `ResultMessage`; containers left running incur ongoing cost
- Cost tracking for container layer — container uptime × provider rate emitted alongside existing token cost metering

**Should have (competitive — P2, after P1 validated):**
- Intelligent task router — automatic local-vs-cloud routing from PLAN.md frontmatter signals (`agent_type`, `estimated_minutes`); static regex heuristics, zero LLM, under 100ms per routing call
- Containerized MCP server isolation — pinned-runtime containers per `APPROVED_SERVERS` entry; Docker already a confirmed dependency from cloud dispatch, so incremental cost is low
- Cross-host session resume — Upstash Redis (already used in v0.19 Token Playground) for session `.jsonl` portability; enables true multi-machine agent continuity

**Defer (v2+ — P3):**
- Docker deploy sandbox for Stage 14 — low priority until host environment drift causes reported failures attributable to the deploy path
- AutoResearch pinned container for visual metrics — defer until metric reproducibility failures are reported; solves a real problem but only if it is actually occurring
- Multi-provider cloud dispatch abstraction (Modal, E2B, Fly) — anti-feature risk; start with one provider, add second only if user demand validates provider-specific needs

**Anti-features to reject outright:** always-cloud by default (adds 5–15s cold start to every `/pde:quick`), real-time filesystem sync to cloud (NFS/SSHFS introduces race conditions with the event bus), container for every PDE operation (pure file I/O tasks gain no isolation benefit), stateless cloud agents without `.planning/` sync-back (disconnects cloud execution from the planning state machine entirely).

### Architecture Approach

The architecture extends the existing 5-layer dispatcher stack (Decision → Execution → Session Lifecycle → Observability → Dashboard) with two new execution backends and one new state sync module. The key structural decision is strict separation of execution paths: `_runLocalSession`, `_runRemoteSession (SSH)`, and `_runCloudSession` must not share `_handleExit` logic because cloud sessions have no local worktree, no local PID, and no git branch to merge. Calling `mergeSession` or `removeWorktree` on a cloud session path throws and corrupts the registry. Docker dispatch is a near-drop-in replacement for local: same `onLine`/`onExit` callbacks, same NDJSON streaming, only the container wrapper changes. Cloud dispatch requires a `CloudPoller` shim that emits synthetic NDJSON events by polling `claude /tasks` output — synthetic events have lower fidelity (no tool-level events) but are compatible with the existing aggregator and relay pipeline.

**Major components (new or modified):**
1. `remote-cloud.cjs` (NEW): Cloud web session backend — spawns `claude --remote`, captures session URL, starts `CloudPoller` for synthetic events, fetches result branch on completion via `sync.cjs`
2. `remote-docker.cjs` (NEW): Docker container backend — mirrors `spawn.cjs` with `docker run` wrapper; real NDJSON streaming via stdout pipe; identical `onLine`/`onExit` wiring
3. `sync.cjs` (NEW): Git-based `.planning/` state sync — `pushPlanningState()` pre-dispatch (cloud and SSH), `fetchPlanningState()` post-completion; wraps existing `merge.cjs` 3-way merge with sync-direction flag
4. `remote-managed.cjs` (REPLACE): Functional `detectManagedBackend()` probe — checks CLI version ≥ 2.1.51, OAuth auth status (not API key), GitHub repo connectivity; cached with 30-second TTL
5. `remote-router.cjs` (MODIFY): Extended routing decision tree returning `'local' | 'ssh' | 'managed' | 'cloud-web' | 'docker'`; receives `cloudConfig` and `dockerConfig` alongside existing `remoteConfig`
6. `coordinator.cjs` (MODIFY): Cloud and Docker dispatch branches in `dispatch()` with per-backend `_handle*Exit` paths; separate concurrency queues per backend type
7. `registry.cjs` (MODIFY): Extended backend enum; `sessionUrl` field for cloud sessions; new status values `cloud_running | cloud_complete | docker_running`
8. `dashboard/components/cloud-session-panel.tsx` (NEW): Cloud instance management widget with sessionUrl display, sync state indicator, pull-local action for completed cloud sessions

### Critical Pitfalls

1. **Breaking local dispatch path by shoehorning cloud into existing `_handleExit`** — Keep `_runLocalSession`, `_runRemoteSession`, and `_runCloudSession` as fully separate execution paths with no shared post-exit logic. `routeSession()` adds new return values without modifying existing return branches. Verify with `coordinator-smoke.test.cjs` Test 7 after every routing change.

2. **`--ours` merge strategy clobbering cloud-written STATE.md** — The existing `--ours` strategy is correct for worktree merges (local agent to main) but inverts for cloud sync (remote is the authoritative state writer). Introduce a sync-direction flag in `merge.cjs` before any git sync code is written: cloud sync uses `--theirs` for `STATE.md`, `--ours` for `REQUIREMENTS.md` and `ROADMAP.md` (which must never be mutated remotely).

3. **Git sync race condition — cloud sync as unguarded second writer to main** — The `dispatcher.lock` covers local dispatch operations only. The cloud sync merge job runs as a separate process and is not lock-protected. Cloud sync must acquire `dispatcher.lock` before any `git fetch/merge` on main, treating sync as a dispatch-equivalent operation.

4. **TailCursor accumulation for ghost cloud sessions** — `aggregator.cjs` polls `/tmp/pde-session-*.ndjson` files that will never exist for cloud sessions. Register cloud sessions with a `RemoteAggregator` (Redis poll); never start a `TailCursor` for a cloud session ID. Failure mode: ~500 bytes per ghost cursor per poll interval accumulates until coordinator restart.

5. **Uncached cloud backend probe blocking parallel dispatch** — `routeSession()` currently resolves in under 1ms. Adding a synchronous network probe to `detectManagedBackend()` without caching creates 2–5 second routing latency per call — multiplied by 3 parallel dispatches. Cache with 30-second TTL; 2-second timeout returning `{ available: false }` on timeout.

6. **Zero-npm dependency constraint at plugin root violated by cloud SDK** — Cloud/Docker SDK calls belong in a separate package (`packages/cloud-adapter/`); `coordinator.cjs` invokes via spawn, never via `require()`. Verify with `node -e "require('./bin/lib/coordinator.cjs')"` on a clean machine with no extra packages.

7. **`session_source` type drift between coordinator and dashboard** — Define `SessionSource` as a shared const in `wire-schema.ts` and import in both `coordinator.cjs` and `queries.ts`. Without this, new backend values written in the coordinator fall back silently to `'local'` in the dashboard query coercion (confirmed in `queries.ts` lines 57–58).

## Implications for Roadmap

Based on the dependency graph in FEATURES.md, the explicit A–E build order in ARCHITECTURE.md, and the pitfall-to-phase mapping in PITFALLS.md, the recommended phase structure is five phases.

### Phase 1: Routing Extension and Registry Foundation
**Rationale:** All subsequent backends depend on the registry and router accepting new backend values, and the `SessionSource` shared type must exist before any backend writes session data. This phase has zero external dependencies — no Docker daemon, no OAuth, no network calls. It also establishes the zero-npm contract verification and the probe caching design before any cloud code is written.
**Delivers:** Extended registry backend enum (`cloud-web`, `docker`), functional `detectManagedBackend()` probe with OAuth auth checks and 30-second TTL caching, extended `remote-router.cjs` with new routing targets and config shape, `classifyTaskRouting()` skeleton in `orchestrator.cjs`, shared `SessionSource` enum in `wire-schema.ts`, separate concurrency queue stubs per backend type.
**Addresses:** Anti-features (routing logic prevents always-cloud default from day one), graceful fallback chain infrastructure.
**Avoids:** Pitfall 1 (routing extension done in isolation before any dispatch code changes), Pitfall 5 (probe caching built from the start), Pitfall 7 (SessionSource defined once here, propagates via TypeScript errors).

### Phase 2: Docker Container Backend
**Rationale:** Docker dispatch uses real NDJSON streaming — identical integration path to `spawn.cjs`. No OAuth required, so full test coverage is achievable immediately. Validates the backend interface contract (`spawnDockerSession` → `{ pid, kill }`) before the harder cloud path, and makes Docker a confirmed project dependency before MCP server containerization is considered. Image pre-pull probe belongs at PDE initialization time, not at dispatch time.
**Delivers:** `remote-docker.cjs`, Docker dispatch branch in `coordinator.cjs` with separate `_handleDockerExit`, `[D]` source label in `tmux-fanout.cjs`, dashboard source label for Docker sessions, Docker image availability check at PDE startup (writes `docker-status.json`), `coordinator-docker.test.cjs` with DI stubs.
**Uses:** `dockerode@4.0.10`, `node:child_process` for `docker` CLI invocation.
**Implements:** Docker Dispatch as Near-Drop-In (Architecture Pattern 2).
**Avoids:** Pitfall 5 (container startup latency — image probe runs at init, not at dispatch time), Pitfall 8 (zero-npm: `docker` CLI subprocess only in coordinator, no `dockerode` import in plugin root files).

### Phase 3: Git-Based .planning/ State Sync
**Rationale:** State sync is a hard prerequisite for cloud dispatch (cloud VM clones from last pushed commit — if `ROADMAP.md` or `STATE.md` are ahead locally, the remote operates on stale context). Building sync standalone before cloud means it can be tested against real git worktree fixtures without OAuth dependencies. The merge direction problem must be fully resolved and tested in this phase, not discovered in cloud production.
**Delivers:** `sync.cjs` (`pushPlanningState`, `fetchPlanningState`), sync-direction flag added to `merge.cjs` (cloud sync direction uses `--theirs` for `STATE.md`), pre-dispatch sync wiring in `coordinator.cjs`, post-exit sync wiring in `_handleExit` for SSH sessions, `sync.test.cjs` against real git worktree fixtures, optional `POST /api/planning/sync` dashboard route with `validateRelayToken` auth.
**Uses:** `simple-git@3.33.0`.
**Avoids:** Pitfall 3 (`--ours` direction corrected here, verified with explicit test that remote-written STATE.md content survives the merge), Pitfall 6 (cloud sync lock acquisition designed and tested before cloud backend exists).

### Phase 4: Cloud Web Backend and Dashboard Integration
**Rationale:** Cloud dispatch is the highest-risk phase — `claude --remote` is research preview, requires OAuth, is GitHub-only, has no NDJSON pipe. All prerequisite patterns (container dispatch, state sync, registry extension) must be stable first. Dashboard integration for cloud sessions is included in this phase rather than deferred because cloud sessions without dashboard visibility are invisible to users and the `RemoteAggregator` must be built alongside the cloud backend (they share the same design constraint: no local file to tail).
**Delivers:** `remote-cloud.cjs` (`spawnCloudSession`, `CloudPoller` synthetic event emitter polling every 5 seconds), replacement `remote-managed.cjs` with functional OAuth probe, cloud dispatch branch in `coordinator.cjs` with separate `_handleCloudExit`, `RemoteAggregator` class (Redis poll, never creates `TailCursor`), `cloud-session-panel.tsx` dashboard component (sessionUrl, sync state, pull-local action for `cloud_complete` sessions), `coordinator-cloud.test.cjs` with CLI stubs.
**Implements:** CloudPoller Pattern (Architecture Pattern 1), Unified Session Source Labels (Architecture Pattern 4).
**Avoids:** Pitfall 4 (RemoteAggregator never creates TailCursor for cloud session IDs), Pitfall 2 (lock extended to include `cloudSessionId` for stale-lock reclaim check before reclaiming).

### Phase 5: Intelligent Routing and Cost Tracking
**Rationale:** Routing intelligence is only meaningful with all three backends (local, Docker, cloud) operational and testable with DI stubs. Cost tracking for containers requires cloud sessions generating real usage data. This phase also adds the user-facing config schema (`dispatch.cloud.*`, `dispatch.docker.*`) that makes routing configurable without code changes.
**Delivers:** Full `classifyTaskRouting()` integration into coordinator decision flow, static heuristics for `hasSecretFiles`/`estimatedTokens`/`requiresGUI`/`requiresGit` (regex + line-count, zero LLM, under 100ms), user config schema with `force` overrides in `config.json`, container cost events (uptime × provider rate) emitted alongside existing token cost metering, dashboard session filter by backend type, end-to-end routing validation with all four routing targets and forced overrides, `routing_fallback` event emitted to dashboard when cloud is unavailable.
**Implements:** Hybrid Auto+Override Routing (Architecture Pattern 3).
**Avoids:** Anti-feature "always-cloud by default" (router keeps interactive and fast-path tasks local by design).

### Phase Ordering Rationale

- **Registry and routing first:** Every phase depends on the type system being correct. Extending `SessionSource` and registry enums before writing backend code eliminates type-drift pitfalls at compile time rather than runtime.
- **Docker before cloud:** Real NDJSON streaming validates the backend interface without external auth dependencies. Container dispatch pattern is proven before the harder polling pattern. Full test coverage achievable from day one.
- **State sync before cloud:** Cloud VM clones from last pushed commit. Without pre-dispatch `.planning/` sync, the remote agent operates on stale context — the milestone's primary value is broken. Merge direction correctness must be tested offline before cloud introduces OAuth as a testing dependency.
- **Cloud with dashboard:** Cloud sessions that do not appear in the dashboard are invisible. `RemoteAggregator` and `CloudPoller` share the same design constraint (no local file), so building them together is more efficient than splitting across phases.
- **Routing last:** All three backends must be testable with DI stubs before routing classification logic can be validated end-to-end.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Cloud Web Backend):** `claude --remote` is documented as "research preview." The specific JSON schema of `claude auth status --output-format json`, the exact polling format of `claude tasks --output-format json`, and whether cloud VMs can push directly to GitHub origin (or require the dashboard `/api/planning/sync` endpoint as a fallback) should be verified against current CLI behavior immediately before Phase 4 begins — not at planning time.
- **Phase 3 (State Sync merge direction):** No standard pattern exists for sync-direction-aware merge strategies in `merge.cjs`. The `OURS_ON_CONFLICT` list and its interaction with cloud sync direction needs explicit test fixture design before the implementation begins.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Routing Extension):** Straightforward TypeScript enum extension and modification of known modules. All code paths exist; no new protocols needed. Direct codebase reads have identified the exact files and extension points.
- **Phase 2 (Docker Backend):** `spawn.cjs` is the reference implementation with identical interface. `dockerode` API is well-documented (1,271 dependents, stable API). Devcontainer spec is official and stable. Skip research.
- **Phase 5 (Intelligent Routing):** Static heuristics via regex — well-understood pattern already used in `idle-suggestions.cjs`. Config schema follows the existing `config.json` `dispatch.remote.*` block pattern. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `dockerode` and `simple-git` verified against npm registry; `claude --remote` CLI behavior verified against official Anthropic docs fetched 2026-03-30; all existing modules read directly from codebase |
| Features | HIGH | Feature landscape grounded in official Agent SDK docs, Docker Sandboxes docs, and direct reads of existing PDE infrastructure; P1/P2/P3 tiers supported by concrete dependency analysis |
| Architecture | HIGH | New component specs derived from direct reads of `coordinator.cjs`, `spawn.cjs`, `merge.cjs`, `registry.cjs`, `queries.ts`; build order validated against module dependency graph; interface contracts specified explicitly |
| Pitfalls | HIGH (existing codebase) / MEDIUM (cloud-specific) | Pitfalls 1, 3, 4, 6, 7, 8 grounded in direct codebase reads and specific line numbers; Pitfall 2 (cloud PID lock) and Pitfall 5 (probe latency) are architectural inference — not yet observed in production |

**Overall confidence:** HIGH for Docker and state sync phases; MEDIUM for cloud web dispatch due to research-preview status of `claude --remote` and two unverified behavioral details.

### Gaps to Address

- **`claude --remote` NDJSON unavailability:** ARCHITECTURE.md notes that NDJSON unavailability from cloud sessions is inferred from architecture (no local process stdout), not explicitly stated in Anthropic docs. Verify before implementing `CloudPoller`. If a future CLI version adds streaming, the polling shim can be replaced with a real `TailCursor` at that point.
- **`claude auth status` JSON schema:** The `detectManagedBackend()` probe depends on the exact JSON output of `claude auth status --output-format json`. This schema is not confirmed in research. Read it from a real CLI invocation at the start of Phase 1 implementation.
- **Cloud VM GitHub push permissions:** Research assumes cloud VMs push result branches to the GitHub origin via the installed GitHub App. If the VM cannot push directly (auth model differs), `POST /api/planning/sync` becomes mandatory rather than optional. Validate before Phase 4 begins — this determines whether the dashboard sync endpoint is a P1 or P2 deliverable.
- **Container image public availability:** `ghcr.io/anthropics/claude-code:devcontainer-latest` is referenced in architecture. Verify the image is publicly pullable without auth on the target machines before committing to it as the Docker backend base image in Phase 2.

## Sources

### Primary (HIGH confidence)
- [Claude Code on the web docs](https://code.claude.com/docs/en/claude-code-on-the-web) — `claude --remote` architecture, GitHub-only repos, cloud VM lifecycle, setup scripts, teleport
- [Claude Code headless docs](https://code.claude.com/docs/en/headless) — `--output-format`, `--bare`, session ID capture, `stream-json` format
- [Remote Control docs](https://code.claude.com/docs/en/remote-control) — `claude remote-control`, `--spawn worktree`, outbound-only architecture, v2.1.51 requirement
- [Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) — subagents, hooks, MCP integration, TypeScript v0.2.71
- [Agent SDK sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) — session resume/fork, cross-host sync, `~/.claude/projects/<cwd>/*.jsonl` storage
- [Development containers docs](https://code.claude.com/docs/en/devcontainer) — Dockerfile spec, firewall rules, `--dangerously-skip-permissions` in container
- [Docker Sandboxes docs](https://docs.docker.com/ai/sandboxes/) — microVM isolation, ephemeral vs persistent, MCP server sandboxing
- Codebase (read directly): `coordinator.cjs`, `spawn.cjs`, `merge.cjs`, `registry.cjs`, `remote-router.cjs`, `remote-managed.cjs`, `remote-ssh.cjs`, `lock.cjs`, `aggregator.cjs`, `relay.cjs`, `dashboard/lib/queries.ts`, `wire-schema.ts`

### Secondary (MEDIUM confidence)
- [Claude Code Remote Control Guide](https://claudefa.st/blog/guide/development/remote-control-guide) — outbound HTTPS relay architecture, limitations, mobile access model
- [Docker — Sandboxing AI Agents Safety (2026)](https://www.docker.com/blog/docker-sandboxes-a-new-approach-for-coding-agent-safety/) — workspace sync, per-sandbox private Docker daemons
- [AWS Prescriptive Guidance — Routing Dynamic Dispatch Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/routing-dynamic-dispatch-patterns.html) — capability-based routing patterns, event-driven dispatch
- [Microsoft Swarm Diaries](https://techcommunity.microsoft.com/blog/appsonazureblog/the-swarm-diaries-what-happens-when-you-let-ai-agents-loose-on-a-codebase/4501393) — git branch per agent pattern, merge-first strategy
- [Northflank — How to sandbox AI agents (2026)](https://northflank.com/blog/how-to-sandbox-ai-agents) — MicroVM vs gVisor vs container isolation comparison
- npmjs.com registry: `dockerode@4.0.10` (1,271 dependents), `simple-git@3.33.0` (7,483 dependents)

### Tertiary (LOW confidence — verify during execution)
- `claude --remote` NDJSON unavailability — inferred from architecture (no local stdout pipe), not explicitly confirmed in documentation; verify at Phase 4 start
- GitHub App push permissions from cloud VMs — assumed from architecture description, not directly verified; validate before Phase 4 begins

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
