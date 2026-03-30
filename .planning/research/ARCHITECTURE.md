# Architecture Research

**Domain:** Cloud dispatch, git-based state sync, intelligent routing, Docker containers, dashboard integration for PDE
**Researched:** 2026-03-30
**Confidence:** HIGH (existing modules read directly; Claude ecosystem verified against current docs)

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Dispatch Decision Layer                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  coordinator.cjs  ──  remote-router.cjs  ──  [MOD] cloud-router.cjs    │ │
│  │  (DAG, overlap,   →   (local / ssh /     →   (+ cloud-web / docker     │ │
│  │   failure summary)     managed routing)        routing targets)         │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────┤
│                         Execution Backends                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  spawn.cjs  │  │ remote-ssh   │  │ [NEW]        │  │ [NEW]            │   │
│  │  (local     │  │ .cjs (SSH    │  │ remote-cloud │  │ remote-docker    │   │
│  │  subprocess)│  │  subprocess) │  │ .cjs (claude │  │ .cjs (container  │   │
│  │             │  │              │  │  --remote    │  │  lifecycle)      │   │
│  └──────┬──────┘  └──────┬───────┘  │  + polling)  │  └────────┬─────────┘   │
│         │               │          └──────┬───────┘           │             │
├─────────┴───────────────┴────────────────┴────────────────────┴─────────────┤
│                        Session Lifecycle Layer                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  worktree.cjs  ──  registry.cjs  ──  merge.cjs  ──  [NEW] sync.cjs    │  │
│  │  (git worktree     (crash-recover   (3-way merge   (+cloud state sync, │  │
│  │   lifecycle)        session state)   on merge-back)  planning/ push/   │  │
│  │                                                       fetch protocol)  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────────────────┤
│                       Observability & Event Layer                              │
│  ┌──────────────┐  ┌──────────────────────────────────────────────────────┐   │
│  │ aggregator   │  │  relay.cjs  ──  relay-protocol.cjs  ──  ingest API  │   │
│  │ .cjs (NDJSON │  │  (TailCursor    (WireEnvelopeSchema    (Vercel /     │   │
│  │  multiplexer)│  │   poll→batch    zod validation)         Upstash      │   │
│  │              │  │   HTTP post)                             Redis SSE)  │   │
│  └──────────────┘  └──────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────────────┤
│                     Dashboard (Next.js 16 PWA)                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/ingest │  │  /api/events SSE  ──  /app/sessions  ──  [NEW]      │   │
│  │  (WireEnv    │  │  (Redis ZADD        (session list,     cloud-session │   │
│  │   validation  │  │   sorted set        detail view,      management   │   │
│  │   → Redis)   │  │   poll+stream)       approval gates)   panel)       │   │
│  └──────────────┘  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Status | Responsibility | Integration Touch |
|-----------|--------|----------------|-------------------|
| `coordinator.cjs` | MODIFY | Session lifecycle orchestrator, DAG analysis, dispatch routing | Add cloud/docker cases to `dispatch()` flow |
| `remote-router.cjs` | MODIFY | Routing decision tree (local/ssh/managed) | Add `cloud-web` and `docker` return values |
| `remote-managed.cjs` | REPLACE | Was stub for `claude --remote` (deferred v0.18) | Replace with functional cloud-web probe |
| `spawn.cjs` | KEEP | Local subprocess launch via `claude --print` | No change |
| `remote-ssh.cjs` | KEEP | SSH remote execution backend | No change |
| `[NEW] remote-cloud.cjs` | CREATE | `claude --remote` cloud web session dispatch | Push task to cloud, poll `/tasks`, teleport results |
| `[NEW] remote-docker.cjs` | CREATE | Docker container lifecycle + dispatch | `docker run` with isolated env, mount project, stream NDJSON |
| `worktree.cjs` | KEEP | Git worktree lifecycle, session isolation | No change |
| `merge.cjs` | KEEP | Merge-back with .planning/ conflict resolution | No change |
| `[NEW] sync.cjs` | CREATE | Git-based `.planning/` state sync protocol | Push pre-dispatch, fetch post-completion |
| `aggregator.cjs` | KEEP | NDJSON TailCursor multiplexer | New watchers for cloud/docker polling |
| `relay.cjs` | KEEP | TailCursor, BatchQueue, CircuitBreaker, HTTP post | No change |
| `registry.cjs` | MODIFY | Crash-recoverable session registry | Add `cloud-web` and `docker` backend values |
| `orchestrator.cjs` | MODIFY | `analyzeDag`, `checkFileOverlap`, task classifier | Add `autonomous` classification heuristics for routing |
| `tmux-fanout.cjs` | MODIFY | Multi-session tmux pane writer | Add [C]/[D] source labels for cloud/docker |
| Dashboard `/api/ingest` | KEEP | WireEnvelope validation → Redis | No change |
| Dashboard `/api/sessions` | KEEP | Session list from Redis | No change |
| Dashboard `/api/events` SSE | KEEP | Redis sorted-set stream to browser | No change |
| Dashboard session UI | MODIFY | Session detail + health matrix | Add cloud status, Docker status, sync state indicator |
| `[NEW] Dashboard /api/planning/sync` | CREATE | Accept `.planning/` state push from cloud sessions | Git apply or file-write, conflict detection |
| `mcp-bridge.cjs` | KEEP | MCP server adapter, probe/degrade | No change |
| `context-sync.cjs` | KEEP | 6 emitters for editor context files | No change |

---

## New Components: Detailed Specifications

### `[NEW] remote-cloud.cjs`

**What it does:** Implements the `cloud-web` execution backend. Uses `claude --remote "<prompt>"` to kick off a task in Anthropic-managed cloud infrastructure, then polls for completion via `/tasks` and teleports the result branch back locally.

**Key protocol facts (verified against current docs):**
- `claude --remote "<prompt>"` creates a new cloud web session. Returns immediately — task runs asynchronously on Anthropic-managed VMs.
- `CLAUDE_CODE_REMOTE=true` is set in cloud sessions — detectable in SessionStart hooks.
- Cloud session clones the repo from GitHub; requires `dispatch.cloud.github_repo` config and GitHub App installed.
- On completion, cloud session pushes a result branch. PDE fetches that branch back locally.
- Teleport: `claude --teleport <session-id>` brings web session into local terminal. For programmatic use, PDE instead does a plain `git fetch origin` + checkout of the result branch.
- NDJSON streaming is NOT available from cloud sessions (no stdout pipe). Polling is required.
- Authentication requires claude.ai OAuth (not API key). Must be Pro/Max/Team/Enterprise.

**Session flow:**
```
cloud dispatch call
  → git push pde/session branch to origin
  → run: claude --remote "<prompt>" (captures session-url from stdout)
  → store session-url in registry
  → poll: claude /tasks (or parse session-url) until complete
  → git fetch result branch
  → registry.update(status: 'completed')
  → merge via merge.cjs
```

**Confidence:** MEDIUM — `claude --remote` behavior verified in docs but cloud dispatch is "research preview"; NDJSON unavailability from cloud is inferred from architecture (no local process stdout), not explicitly stated.

---

### `[NEW] remote-docker.cjs`

**What it does:** Implements the `docker` execution backend. Runs `claude --dangerously-skip-permissions --print --output-format stream-json` inside an isolated Docker container with the project mounted. Container is the Anthropic devcontainer image or a custom PDE image.

**Key protocol facts (verified against current docs):**
- Devcontainer spec: official `anthropics/claude-code` `.devcontainer/` Dockerfile, Node.js 20, firewall rules restricting outbound to allowlisted domains.
- `--dangerously-skip-permissions` is safe inside devcontainer due to filesystem isolation.
- NDJSON streaming via `--output-format stream-json` works normally (local Docker stdout pipe).
- No OAuth required for Docker — API key authentication works.
- `docker run --rm -v $(pwd):/workspace -e ANTHROPIC_API_KEY=...` mounts the worktree.
- Container image: either pull `ghcr.io/anthropics/claude-code:devcontainer-latest` or build a PDE-specific image with `claude` pre-installed.

**Session flow:**
```
docker dispatch call
  → createWorktree (same as local)
  → pull/verify container image
  → docker run [opts] <image> claude --print --output-format stream-json ...
  → stream NDJSON via stdout pipe (same onLine callback as spawn.cjs)
  → on exit: mergeSession → removeWorktree (same as local path)
```

**Confidence:** HIGH — Docker approach mirrors existing `spawn.cjs` pattern with container wrapper; devcontainer spec is official and stable.

---

### `[NEW] sync.cjs`

**What it does:** Git-based `.planning/` state sync protocol. Used in two scenarios:
1. Pre-dispatch to cloud/SSH: push current `.planning/` state to the session branch so the remote has current ROADMAP/STATE/REQUIREMENTS.
2. Post-completion: fetch remote `.planning/` changes back and merge using existing `merge.cjs` logic.

**Protocol:**
```
sync.pushPlanningState(projectRoot, branch)
  → git add .planning/
  → git stash (if dirty)
  → git checkout branch
  → git checkout main -- .planning/ (copy planning state into branch)
  → git commit "chore: sync .planning/ state pre-dispatch"
  → git push origin branch
  → git checkout main (restore)
  → git stash pop (if stashed)

sync.fetchPlanningState(projectRoot, branch)
  → git fetch origin branch
  → diff .planning/ between HEAD and branch
  → apply non-conflicting changes via merge.cjs
  → return { applied: [], conflicts: [] }
```

**Design note:** This extends the v0.16 3-way merge engine (`merge.cjs`) rather than replacing it. The existing `OURS_ON_CONFLICT` list (`STATE.md`, `REQUIREMENTS.md`, `ROADMAP.md`) already handles the critical files correctly for state sync.

**Confidence:** HIGH — builds directly on existing merge.cjs and worktree.cjs patterns, no new protocols needed.

---

### `[NEW] Dashboard /api/planning/sync`

**What it does:** Accepts `.planning/` state pushes from remote sessions (SSH or cloud) that cannot use git directly. The dashboard becomes a state sync endpoint for sessions running in environments without git remote access to the origin.

**When used:** Only needed for cloud web sessions where the remote VM cannot push directly to origin. SSH sessions already use git push/fetch natively.

**Protocol:**
```
POST /api/planning/sync
  Authorization: Bearer <PDE_RELAY_TOKEN>
  Body: {
    session_id: string,
    files: Array<{ path: string, content: string }>,  // relative to .planning/
    timestamp: string
  }

Response: { applied: string[], conflicts: string[] }
```

**Confidence:** MEDIUM — protocol design is straightforward; exact needs depend on whether cloud VMs can push to GitHub origin directly (likely yes via GitHub App proxy, so this endpoint may be optional).

---

## Routing Decision Tree Extension

The existing `remote-router.cjs` decision tree must be extended with two new routing targets. The new tree:

```
routeSession({ isAutonomous, remoteConfig, cloudConfig, dockerConfig })

  1. !isAutonomous                     → 'local'         (RMT-05: interactive always local)
  2. dockerConfig.enabled
       && taskClassifier.prefersDocker  → 'docker'        (NEW: heavy/isolated workloads)
  3. cloudConfig.enabled
       && taskClassifier.prefersCloud   → 'cloud-web'     (NEW: GitHub-connected cloud)
  4. !remoteConfig.host                → 'local'          (no SSH target)
  5. remoteConfig.preferred_backend === 'managed'
       → probe managed backend
       → if available: 'managed'
  6. remoteConfig.host set             → 'ssh'
  7. default                           → 'local'
```

The `taskClassifier` is new logic in `orchestrator.cjs` that scores tasks for cloud vs docker vs local vs ssh preference based on:
- Task resource requirements (Docker preferred for asset pipeline, 3D, video)
- GitHub availability (cloud-web requires GitHub repo connected)
- Interactive vs autonomous flag (already in PLAN.md frontmatter)
- User-override via `dispatch.cloud.force = true` or `dispatch.docker.force = true` in config

---

## Recommended Project Structure

```
packages/dispatcher/lib/
├── coordinator.cjs         # MODIFY: add cloud/docker dispatch cases
├── remote-router.cjs       # MODIFY: add cloud-web/docker routing targets
├── remote-managed.cjs      # REPLACE: functional claude --remote probe
├── remote-cloud.cjs        # NEW: cloud web session backend
├── remote-docker.cjs       # NEW: Docker container backend
├── sync.cjs                # NEW: .planning/ git state sync protocol
├── orchestrator.cjs        # MODIFY: task classifier for routing hints
├── registry.cjs            # MODIFY: add cloud/docker backend enum values
├── tmux-fanout.cjs         # MODIFY: [C]/[D] source labels
│
│   [unchanged]
├── spawn.cjs               # local subprocess — no change
├── remote-ssh.cjs          # SSH backend — no change
├── worktree.cjs            # git worktree lifecycle — no change
├── merge.cjs               # 3-way merge — no change
├── aggregator.cjs          # NDJSON multiplexer — no change (cloud uses polling shim)
├── queue.cjs               # concurrency queue — no change
├── lock.cjs                # mutex lock — no change
└── sdk-bridge.cjs          # Agent SDK query — no change

dashboard/app/api/
├── ingest/route.ts         # no change
├── events/route.ts         # no change (cloud sessions use relay same as local)
├── sessions/route.ts       # no change
├── planning/
│   ├── sync/route.ts       # NEW: .planning/ state push from remote sessions
│   └── design-state/route.ts # no change
└── [existing endpoints]    # no change

dashboard/app/sessions/
├── [id]/                   # MODIFY: add cloud/docker status indicators, sync state
│   └── page.tsx
└── page.tsx                # MODIFY: filter by backend type (local/ssh/cloud/docker)

dashboard/components/
└── cloud-session-panel.tsx # NEW: cloud instance management widget
```

---

## Architectural Patterns

### Pattern 1: Polling Shim for Cloud Sessions (No NDJSON Pipe)

**What:** Cloud sessions (`claude --remote`) run on Anthropic VMs — there is no stdout pipe. The aggregator is designed for TailCursor polling of local `/tmp/pde-session-*.ndjson` files. For cloud sessions, a `CloudPoller` shim emits synthetic NDJSON events by polling `claude /tasks` output or the session metadata API.

**When to use:** Any cloud-web dispatch backend where direct process stdout is unavailable.

**Trade-offs:** Synthetic events have lower fidelity than real NDJSON. Status events (started, completed, failed) are reliable; tool-level events (file_changed, bash_call) are unavailable from cloud.

**Example:**
```javascript
// remote-cloud.cjs: emit synthetic events compatible with aggregator
function startCloudPoller(sessionId, sessionUrl, onLine) {
  const interval = setInterval(async () => {
    const status = await probeCloudSession(sessionUrl);
    const syntheticEvent = {
      event_type: status.running ? 'cloud_heartbeat' : 'session_end',
      session_id: sessionId,
      ts: new Date().toISOString(),
      schema_version: '1.0',
      extensions: { cloud_url: sessionUrl, backend: 'cloud-web' }
    };
    onLine(sessionId, syntheticEvent);
    if (!status.running) clearInterval(interval);
  }, 5000);
  return { stop: () => clearInterval(interval) };
}
```

---

### Pattern 2: Docker Dispatch as Near-Drop-In for Local

**What:** Docker dispatch mirrors `spawn.cjs` exactly — same NDJSON stdout streaming, same worktree mount, same `onLine`/`onExit` callbacks. The only difference is the container wrapper around the `claude` process.

**When to use:** Heavy workloads (asset pipeline, 3D, video) that benefit from isolation; when the host machine lacks required tools (FFmpeg, Blender); when reproducibility is required.

**Trade-offs:** Container startup adds 2-5s latency. Image pull on first use adds 30-60s. Container must have claude CLI installed and ANTHROPIC_API_KEY injected.

**Example:**
```javascript
// remote-docker.cjs mirrors spawn.cjs with container wrapper
function spawnDockerSession(opts) {
  const { worktreePath, sessionId, phase, plan, pluginDir } = opts;
  const prompt = `Execute phase ${phase}, plan ${plan}. Run /gsd:execute-plan ${phase} ${plan}.`;
  const env = { ...process.env };
  delete env.CLAUDECODE;

  const args = [
    'run', '--rm',
    '-v', `${worktreePath}:/workspace`,
    '-v', `${pluginDir}:/plugin`,
    '-w', '/workspace',
    '-e', `ANTHROPIC_API_KEY=${env.ANTHROPIC_API_KEY}`,
    '-e', `PDE_SESSION_ID=${sessionId}`,
    opts.dockerImage || 'ghcr.io/anthropics/claude-code:devcontainer-latest',
    'claude', '--print', '--bare', '--output-format', 'stream-json', '--verbose',
    '--dangerously-skip-permissions',
    '--plugin-dir', '/plugin',
    prompt
  ];

  const child = childProcess.spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  // ... same readline/onLine/onExit wiring as spawn.cjs
}
```

---

### Pattern 3: Hybrid Auto+Override Routing

**What:** The coordinator automatically classifies tasks as local/ssh/cloud/docker based on PLAN.md frontmatter signals, then respects user overrides in `config.json`.

**When to use:** Default behavior for all dispatched sessions.

**Signals used for auto-classification (in `orchestrator.cjs`):**
```javascript
function classifyTaskRouting(planContent, dispatchConfig) {
  // Heavy asset tasks → Docker preferred
  const isHeavyAsset = /\b(video|3d|blender|ffmpeg|remotion|tripo)\b/i.test(planContent);
  // Autonomous + GitHub repo connected → cloud-web eligible
  const isGithubConnected = !!dispatchConfig?.cloud?.github_repo;
  // Explicit overrides win
  if (dispatchConfig?.cloud?.force) return { prefersCloud: true, prefersDocker: false };
  if (dispatchConfig?.docker?.force) return { prefersCloud: false, prefersDocker: true };
  // Auto hints
  return { prefersDocker: isHeavyAsset, prefersCloud: !isHeavyAsset && isGithubConnected };
}
```

---

### Pattern 4: Unified Session Source Labels in Dashboard

**What:** The `session_source` field in Redis session metadata already supports `'local' | 'remote-ssh' | 'remote-managed'` (verified in `queries.ts`). Extend to `'cloud-web' | 'docker'`.

**When to use:** All new sessions dispatched via cloud or Docker backends write their source at registration time.

**Trade-offs:** No schema migration needed — Redis hash fields are untyped. Only the TypeScript discriminated union in `queries.ts` needs updating.

**Example:**
```typescript
// queries.ts — extend the existing union (only change needed in queries layer)
export type SessionSource = 'local' | 'remote-ssh' | 'remote-managed' | 'cloud-web' | 'docker';
```

---

## Data Flow

### Cloud Dispatch Data Flow

```
coordinator.dispatch(phase, plan, { isAutonomous: true })
  ↓
routeSession({ ..., cloudConfig: { enabled: true, github_repo: 'org/repo' } })
  → returns 'cloud-web'
  ↓
sync.pushPlanningState(projectRoot, branch)   [NEW: sync .planning/ pre-dispatch]
  ↓
remote-cloud.spawnCloudSession({ sessionId, prompt, branch, ... })
  ↓  (returns { sessionUrl, kill })
registry.register(sessionId, { backend: 'cloud-web', sessionUrl })
  ↓
CloudPoller.start → synthetic NDJSON → aggregator.emit('event')
  ↓
relay.cjs batches → POST /api/ingest → Redis ZADD
  ↓
Dashboard SSE → browser session view (status: running)
  ↓
  [... task runs on Anthropic VM, cloud session pushes result branch ...]
  ↓
CloudPoller detects completion
  ↓
git fetch origin <result-branch>
  ↓
sync.fetchPlanningState(projectRoot, result-branch)   [NEW: sync post-completion]
  ↓
merge.cjs (same 3-way merge as local sessions)
  ↓
registry.update(sessionId, { status: 'completed' })
relay emits session_end → Dashboard (status: completed)
```

### Docker Dispatch Data Flow

```
coordinator.dispatch(phase, plan, { isAutonomous: true })
  ↓
routeSession({ ..., dockerConfig: { enabled: true } })
  → returns 'docker'
  ↓
createWorktree(projectRoot, sessionId)   [same as local]
  ↓
remote-docker.spawnDockerSession({ worktreePath, sessionId, ... })
  → docker run --rm -v <worktreePath>:/workspace ... claude --print --output-format stream-json
  → stdout pipe → readline → onLine(sessionId, event)
  ↓
aggregator.watch(sessionId)   [same as local — real NDJSON, not polling shim]
  ↓
relay → /api/ingest → Redis → SSE → browser
  ↓
  [... task runs in container ...]
  ↓
onExit → mergeSession → recalculate → removeWorktree   [same as local]
```

### .planning/ State Sync Data Flow

```
pre-dispatch sync (cloud and SSH):
  Local .planning/ (HEAD)
    → git add .planning/
    → git commit to pde/session/<sessionId> branch
    → git push origin pde/session/<sessionId>
  Remote (cloud VM or SSH machine) fetches branch
    → has current ROADMAP.md, STATE.md, REQUIREMENTS.md context

post-completion sync:
  Remote commits .planning/ changes to branch
  Remote pushes branch to origin
  Local: git fetch origin <branch>
    → diff .planning/ files (branch vs HEAD)
    → merge.cjs (OURS_ON_CONFLICT for STATE/REQUIREMENTS/ROADMAP)
    → auto-resolve .planning/agent-memory/ via append merge
    → commit resolved state
```

---

## Integration Points

### Existing Modules: What Changes, What Does Not

| Module | Change Type | What Changes |
|--------|-------------|--------------|
| `coordinator.cjs` | Modify | `dispatch()` and `_runSession()` gain cloud/docker branches; `routeSession()` receives extended config |
| `remote-router.cjs` | Modify | Return type extended to include `'cloud-web' \| 'docker'`; receives `cloudConfig`/`dockerConfig` |
| `remote-managed.cjs` | Replace | `detectManagedBackend()` becomes functional: probes `claude auth status`, checks remote availability |
| `registry.cjs` | Modify | `backend` field enum: add `'cloud-web' \| 'docker'`; `register()` writes `sessionUrl` for cloud sessions |
| `orchestrator.cjs` | Modify | Add `classifyTaskRouting()` for auto-routing hints |
| `tmux-fanout.cjs` | Modify | Source label map: add `[C]` for cloud-web, `[D]` for docker (alongside existing `[L]`/`[R]`) |
| `dashboard/lib/queries.ts` | Modify | `SessionSource` type union extended to include `'cloud-web' \| 'docker'` |
| `dashboard/app/sessions/[id]/page.tsx` | Modify | Cloud session panel: show sessionUrl, sync state, cloud VM status |

### New External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude cloud web sessions | `claude --remote "<prompt>"` CLI call | Requires claude.ai OAuth; research preview; GitHub App required on repo |
| Docker daemon | `docker run` subprocess (same pattern as `spawn.cjs`) | Docker Desktop or daemon must be running on dispatch machine |
| GitHub (for cloud sync) | git push/fetch to origin (already in `remote-ssh.cjs`) | Cloud VMs push result branch to origin; local fetches back |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| coordinator ↔ remote-cloud | Function call: `spawnCloudSession(opts)` returns `{ kill, sessionUrl }` | Same interface contract as `spawnRemoteSession` |
| coordinator ↔ remote-docker | Function call: `spawnDockerSession(opts)` returns `{ pid, kill }` | Same interface contract as `spawnSession` |
| remote-cloud ↔ aggregator | `CloudPoller` calls `onLine(sessionId, syntheticEvent)` callback | Synthetic events, not real NDJSON |
| remote-docker ↔ aggregator | Direct `onLine` from readline (real NDJSON) | Identical to local spawn path |
| sync ↔ merge | `sync.fetchPlanningState` calls `merge.cjs mergeSession` | Reuses existing conflict resolution logic |
| coordinator ↔ sync | `sync.pushPlanningState` called pre-dispatch; `sync.fetchPlanningState` called in `_handleExit` | Inserted into existing lifecycle points |
| dashboard ↔ planning sync | New `POST /api/planning/sync` route | Bearer token auth (same `validateRelayToken`) |

---

## Build Order (Phase Dependencies)

Building v0.24 should proceed in this order to respect module dependencies:

**Phase A — Routing Extension (no external dependencies)**
1. Extend `registry.cjs` with `cloud-web`/`docker` backend enum values
2. Extend `remote-managed.cjs` with functional `detectManagedBackend()` probe
3. Extend `remote-router.cjs` with new routing targets and config shape
4. Add `classifyTaskRouting()` to `orchestrator.cjs`
5. Tests: extend `coordinator-remote.test.cjs` for new routing cases

**Phase B — Docker Backend (standalone, no cloud auth needed)**
6. Implement `remote-docker.cjs` (mirrors `spawn.cjs` with container wrapper)
7. Integrate into `coordinator.cjs` `dispatch()` flow
8. Tests: `coordinator-docker.test.cjs` with `docker` DI stub
9. tmux fan-out `[D]` label + dashboard source label

**Phase C — State Sync Protocol**
10. Implement `sync.cjs` (`pushPlanningState`, `fetchPlanningState`)
11. Wire into `coordinator.cjs` pre-dispatch and `_handleExit`
12. Tests: `sync.test.cjs` against real git worktree fixtures
13. Dashboard `POST /api/planning/sync` route (optional, for future cloud use)

**Phase D — Cloud Web Backend**
14. Implement `remote-cloud.cjs` (`spawnCloudSession`, `CloudPoller`)
15. Replace `remote-managed.cjs` with functional cloud probe
16. Integrate into `coordinator.cjs` `dispatch()` flow
17. Dashboard cloud session panel: sessionUrl display, sync state indicator
18. Tests: `coordinator-cloud.test.cjs` with DI stubs for `claude --remote` CLI

**Phase E — Intelligent Routing**
19. Integrate `classifyTaskRouting()` into coordinator decision flow
20. Config schema: `dispatch.cloud.*`, `dispatch.docker.*` blocks in `config.json`
21. Dashboard session filter by backend type
22. End-to-end validation: local → ssh → docker → cloud-web routing with forced overrides

**Rationale for this order:**
- Docker first because it uses real NDJSON (simpler integration), has no OAuth requirement, and validates the container pattern before cloud.
- State sync in phase C because it is needed by both docker (for cross-machine pre/post sync) and cloud (critical: cloud VM has no shared filesystem).
- Cloud last because it requires claude.ai OAuth (cannot be tested without auth), is research preview, and depends on sync being stable.
- Routing intelligence last because it depends on all backends being implemented and testable.

---

## Scaling Considerations

| Concern | Current (v0.23) | With Cloud/Docker |
|---------|-----------------|-------------------|
| Concurrent sessions | ConcurrencyQueue default 3 | Separate queues per backend type; cloud rate-limited by Anthropic |
| State sync conflicts | Local merge only | Cross-machine conflicts increase; OURS_ON_CONFLICT list already handles critical files |
| Dashboard Redis | 7-day TTL, 1000-event cap, daily cron GC | Cloud sessions produce fewer events (synthetic only); Docker sessions same as local |
| Auth surface | SSH key + relay Bearer token | Cloud adds claude.ai OAuth management; Docker adds no new auth |

**Scaling priorities:**
1. First bottleneck: concurrent cloud sessions share Anthropic rate limits — implement separate cloud queue with limit derived from subscription tier.
2. Second bottleneck: state sync git operations are synchronous and block dispatch — wrap in async with timeout guard to avoid stalling local sessions.

---

## Anti-Patterns

### Anti-Pattern 1: Treating Cloud Sessions as NDJSON-Transparent

**What people do:** Assume `claude --remote` produces a stdout NDJSON stream like `claude --print --output-format stream-json`.

**Why it's wrong:** Cloud sessions run on Anthropic-managed VMs with no stdout pipe to the local process. The CLI returns a session URL immediately. This was the exact blocker noted in `remote-managed.cjs` v0.18 stub comments.

**Do this instead:** Use a `CloudPoller` pattern that polls session status and emits synthetic NDJSON events. Accept that cloud sessions have lower event fidelity than local/docker sessions.

---

### Anti-Pattern 2: Skipping `.planning/` Pre-Dispatch Sync

**What people do:** Dispatch to cloud/SSH without pushing the current `.planning/` state to the session branch first.

**Why it's wrong:** The remote session clones from the last pushed commit. If `ROADMAP.md` or `STATE.md` are ahead locally (common mid-milestone), the remote agent operates on stale context.

**Do this instead:** `sync.pushPlanningState()` before every remote dispatch (cloud, SSH, Docker with detached volume). Docker with direct worktree mount is exempt because it shares the filesystem.

---

### Anti-Pattern 3: One Queue for All Backends

**What people do:** Route all cloud sessions through the same `ConcurrencyQueue(maxConcurrent=3)` as local sessions.

**Why it's wrong:** Cloud sessions are rate-limited by Anthropic (not the local machine). Blocking 3 local slots for cloud sessions that take 5-10 minutes starves local dispatch. Docker sessions are CPU-bound on the local machine (different constraint than cloud).

**Do this instead:** Separate queues per backend type: `localQueue(3)`, `dockerQueue(2)` (CPU-bound), `cloudQueue(5)` (I/O-bound, rate-limited separately).

---

### Anti-Pattern 4: Running Docker Sessions Without Image Pre-Pull

**What people do:** Include container image pull inside the session dispatch critical path.

**Why it's wrong:** First-time image pull adds 30-60 seconds to session startup. This blocks the ConcurrencyQueue slot and confuses timing metrics.

**Do this instead:** Pull the container image during PDE initialization (startup probe, same pattern as MCP server probes in `mcp-bridge.cjs`). Store image availability in a new `docker-status.json`. Warn but do not block if image is absent; fall back to local.

---

## Sources

- `packages/dispatcher/lib/coordinator.cjs` — v0.18 session lifecycle, routing integration points (read directly)
- `packages/dispatcher/lib/remote-managed.cjs` — v0.18 stub with documented reasons for deferral (read directly)
- `packages/dispatcher/lib/remote-router.cjs` — routing decision tree (read directly)
- `packages/dispatcher/lib/remote-ssh.cjs` — SSH backend pattern (read directly)
- `packages/dispatcher/lib/spawn.cjs` — local subprocess pattern, Docker mirrors this (read directly)
- `packages/dispatcher/lib/merge.cjs` — 3-way merge, OURS_ON_CONFLICT list (read directly)
- `dashboard/lib/queries.ts` — SessionSource type, Redis schema (read directly)
- `dashboard/app/api/ingest/route.ts` — WireEnvelope ingest pipeline (read directly)
- [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web) — `claude --remote` behavior, cloud session lifecycle, CLAUDE_CODE_REMOTE env var — HIGH confidence
- [Remote Control docs](https://code.claude.com/docs/en/remote-control) — `claude remote-control` vs `claude --remote` distinction, `--spawn worktree` flag — HIGH confidence
- [Development containers](https://code.claude.com/docs/en/devcontainer) — Dockerfile spec, firewall rules, `--dangerously-skip-permissions` in container — HIGH confidence
- [Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) — `@anthropic-ai/claude-agent-sdk`, session IDs, hooks, subagents — HIGH confidence

---
*Architecture research for: PDE v0.24 Cloud Dispatch & State Sync*
*Researched: 2026-03-30*
