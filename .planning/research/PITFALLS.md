# Pitfalls Research

**Domain:** Cloud dispatch, git-based state sync, and container orchestration added to existing local-first AI development platform
**Researched:** 2026-03-30
**Confidence:** HIGH (grounded in existing codebase analysis) / MEDIUM (cloud dispatch specifics where claude --remote API is still evolving)

---

## Critical Pitfalls

### Pitfall 1: Breaking the Local Dispatch Code Path When Adding Cloud Routing

**What goes wrong:**
The `DispatchCoordinator` currently has a clean single-writer path: `dispatch()` calls `routeSession()` before acquiring the lock, then routes to `_runSession` or `_runRemoteSession`. Adding a third cloud path (Docker/managed) by modifying `routeSession()` and `_handleExit()` inline risks breaking the existing local and SSH paths through shared control flow — particularly if cloud exit handling has different semantics (no worktree, no local PID, no git branch to merge).

**Why it happens:**
Developers treat cloud as just another backend and shoehorn it into `_runRemoteSession` or copy-paste that function. The existing `_handleExit` path assumes a git worktree exists and calls `mergeSession` / `removeWorktree` / `deleteBranch` unconditionally. Cloud sessions have no local worktree — calling those on a missing path will throw and corrupt the registry.

**How to avoid:**
Keep `_runLocalSession`, `_runRemoteSession (SSH)`, and `_runCloudSession` as fully separate execution paths with no shared `_handleExit`. Each path owns its own lifecycle: only local/SSH call `mergeSession`. The cloud path handles state sync via a separate mechanism. `routeSession()` returns a four-way enum (`local | ssh | managed | cloud`) — add the new value without modifying existing return branches.

**Warning signs:**
- Any test that stubs `mergeSession` suddenly fails for SSH sessions — shared path contamination
- `coordinator-smoke.test.cjs` Test 7 starts failing (the DI stub test already caught this once in v0.18)
- `removeWorktree` gets called with a path that does not start with `.sessions/`

**Phase to address:**
Cloud dispatch foundation phase — before any routing logic is wired.

---

### Pitfall 2: Stale Lock When Cloud Session Crashes Mid-Dispatch

**What goes wrong:**
`lock.cjs` uses process PID to detect stale locks. Cloud sessions have no local PID — if `acquireLock` is called while a cloud session is being dispatched and the local coordinator crashes, the lock file contains a now-dead PID but the cloud session may still be running. On restart, `isPidAlive` returns false, the stale-lock reclaim path fires, and a second dispatch starts on the same phase — creating a duplicate cloud session and double-applying the same changes.

**Why it happens:**
The lock was designed for local PID ownership. Cloud dispatch moves the "alive" concept to a remote endpoint whose health cannot be checked with `process.kill(pid, 0)`.

**How to avoid:**
For cloud sessions, extend the lock file format to include `{ pid, ts, cloudSessionId, backend }`. On reclaim, check the cloud backend's session status API before reclaiming — if `cloudSessionId` is still active, refuse to reclaim. Add a `maxLockAge` timeout (e.g., 30 minutes) as a backstop for sessions that become unreachable without a clean exit.

**Warning signs:**
- Duplicate session IDs appearing in `dispatcher.pids` after a coordinator restart
- Two sessions writing to the same `.planning/` path via git sync
- `registry.loadFromDisk()` showing a session both `running` and `orphaned` simultaneously

**Phase to address:**
Lock extension phase, before cloud session spawning is enabled in production.

---

### Pitfall 3: .planning/ State Sync Clobbering --ours Conflict Resolution

**What goes wrong:**
`merge.cjs` uses `--ours` for `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md`. This works for local worktrees where main branch is the single source of truth. With git-based cloud sync, the remote instance commits directly to `.planning/` on a different branch. When the remote sync branch is merged back, the `--ours` strategy silently discards agent-written progress updates (phase completion markers, task status, artifact paths) because "ours" is whatever was on main when the merge started — not the most recent state.

**Why it happens:**
`--ours` was chosen to protect orchestrator-written state from being overwritten by agent experiments. That invariant holds for worktree merges but inverts for cloud sync merges where the remote IS the authoritative state writer.

**How to avoid:**
Introduce a sync-direction flag in the merge context. Worktree merges (local agent to main): keep `--ours`. Cloud sync merges (remote state to main): use `--theirs` for `.planning/STATE.md` and key progress files, keep `--ours` for `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` (which should never be mutated remotely). Add field-level merge for `STATE.md` using a structured YAML merge script rather than raw git strategies.

**Warning signs:**
- Phase completion events arrive from the cloud session but phase status in STATE.md never updates
- RECONCILIATION.md shows completed tasks that STATE.md still marks as `in_progress`
- `recalculateFromArtifacts` produces different results than cloud-side state

**Phase to address:**
State sync protocol design phase — this must be settled before any git sync implementation begins.

---

### Pitfall 4: NDJSON Event Routing Breaks When Session Source Is Remote

**What goes wrong:**
`aggregator.cjs` polls `/tmp/pde-session-{sessionId}.ndjson` on the local machine. The relay daemon (`relay.cjs`) reads local NDJSON and POSTs to Upstash Redis. Cloud sessions have no `/tmp/pde-session-*.ndjson` on the local machine — they write NDJSON on the remote host. The dashboard will show cloud sessions as permanently idle (no events), and the TailCursor for those sessions will poll forever on a file that will never appear.

**Why it happens:**
The `Aggregator` was built assuming session files are always local (correct for local and SSH sessions where relay.cjs runs locally). Cloud sessions need a different ingestion path — either pulling from Redis directly or having the remote relay push to a different aggregator endpoint.

**How to avoid:**
Introduce a `RemoteAggregator` that polls the Redis key `pde:default:session:{id}` instead of a local file. The `DispatchCoordinator` registers cloud sessions with `RemoteAggregator` and local/SSH sessions with the file-based `Aggregator`. The `TmuxFanout` and SSE endpoints subscribe to both aggregators through a shared EventEmitter facade. Never start a `TailCursor` for a cloud session ID.

**Warning signs:**
- Cloud session health matrix in tmux shows all panes blank
- `agg._cursors` Map grows indefinitely for cloud session IDs (never gets `unwatch` called because file never arrives and exit never fires)
- Memory leak: TailCursor polling intervals accumulate for ghost sessions

**Phase to address:**
Dashboard integration for remote sessions phase.

---

### Pitfall 5: Container Startup Latency Hiding Behind "Routing Decision"

**What goes wrong:**
The routing decision in `routeSession()` currently resolves in under 1ms (local file read + process.kill probe). Cloud routing adds a `detectManagedBackend()` probe that makes a network call. If the cloud backend probe takes 2-5 seconds on a cold start (container not warm, network latency), the routing decision blocks the `acquireLock` call and holds up all subsequent dispatches in the concurrency queue. With `maxConcurrent=3`, three simultaneous dispatches each probing cloud availability creates three concurrent 5-second waits.

**Why it happens:**
`routeSession()` is called before `acquireLock` (by design — lock window must stay narrow). Adding a slow network probe into the routing decision violates the assumption that routing is fast.

**How to avoid:**
Cache the cloud backend availability probe with a 30-second TTL at the coordinator level. On first call: probe and cache. On subsequent calls within TTL: return cached result. Implement the probe with a 2-second timeout — if it times out, return `{ available: false }` rather than blocking. Background-refresh the cache asynchronously after TTL expires.

**Warning signs:**
- `pde --parallel` dispatch latency spikes from under 100ms to over 5s when cloud is configured
- `coordinator-smoke.test.cjs` timeouts when `_detectManaged` stub is removed in integration tests
- Dashboard shows sessions queued but not starting

**Phase to address:**
Cloud routing probe implementation phase.

---

### Pitfall 6: Git Sync Race Condition Between Concurrent Local Sessions and Cloud Sync Merge

**What goes wrong:**
Multiple local worktrees can be dispatched in parallel. Each merges back to main sequentially via the coordinator's lock. A cloud sync merge (remote state to main) can arrive at any time — including while a local session merge is in progress. The lock at `.planning/dispatcher.lock` only guards local dispatch operations; the cloud sync job runs as a separate process (git fetch + merge). If a cloud sync merge commits to main while a local session merge is also committing, the next local merge sees an unexpected parent and fails with "refusing to merge unrelated histories" or produces a corrupt merge commit.

**Why it happens:**
The lock protocol was designed for single-machine concurrency. Cloud sync is a second writer that runs outside the coordinator's lock scope.

**How to avoid:**
The cloud sync job must acquire the same `dispatcher.lock` before performing any git operations on main. Treat the cloud sync merge as a dispatch-equivalent operation. Alternatively, use a dedicated git remote branch (`pde/cloud-sync`) that is only merged during a "sync window" (no active local sessions in the registry). The registry can expose a `noActiveSessions()` check that the sync job polls.

**Warning signs:**
- `git merge` fails with "Already up to date" followed immediately by CONFLICT in the next operation
- `dispatcher.pids` shows `merge_failed` on sessions that should have succeeded
- Dashboard shows sessions completing but git log shows no corresponding merge commit

**Phase to address:**
State sync implementation phase — must be the first thing designed before any git sync code is written.

---

### Pitfall 7: Dashboard Session Source Field Misidentifying Cloud Sessions

**What goes wrong:**
`queries.ts` reads `session_source` from the Redis hash and coerces it to `'local' | 'remote-ssh' | 'remote-managed'`. A new cloud backend (Docker containers, managed cloud) needs a fourth value. If the relay code writes `'remote-cloud'` but the dashboard query only allows three values, the source falls back to `'local'` (the else branch on lines 57-58 of `queries.ts`). Cloud sessions appear in the dashboard as local sessions — wrong icons, wrong retry behavior, wrong approval gate routing.

**Why it happens:**
The type union in `session_source` was locked to three values when the managed backend was a stub. Any new source value added in the coordinator must be added simultaneously to the dashboard TypeScript type, the Redis writer, and the query coercion. These three locations are in different packages and easy to update inconsistently.

**How to avoid:**
Define `SessionSource` as a shared const in `wire-schema.ts` and import it in both `coordinator.cjs` and `queries.ts`. Any new source value added in one place propagates via TypeScript compile errors. Add a test that asserts the relay writes a source value that is in the allowed enum — catches mismatches before runtime.

**Warning signs:**
- Cloud sessions appear in the dashboard with a local session icon
- Retry button becomes enabled for cloud sessions (correctly disabled for remote via aria-disabled, but only if source is detected as remote)
- TypeScript compiles without error but runtime source is `'local'` for cloud sessions

**Phase to address:**
Dashboard integration for cloud sessions phase — before any cloud session is wired end-to-end.

---

### Pitfall 8: Zero-npm Dependency Constraint Violated by Cloud SDK

**What goes wrong:**
The relay daemon and coordinator are zero-npm-dependency (only `node:` built-ins). Cloud dispatch likely needs an HTTP client for the cloud backend API, a JWT signer for auth, or a Docker SDK. If these are added as `require('some-cloud-sdk')` in `coordinator.cjs` or `relay.cjs`, they violate the constraint and break installation for users who do not have that package. The constraint exists because the plugin root cannot assume npm packages are available.

**Why it happens:**
Cloud APIs typically require auth tokens, signed requests, and structured HTTP bodies that are tedious to implement with raw `node:https`. Reaching for a package feels natural.

**How to avoid:**
Cloud SDK calls belong in a separate package (e.g., `packages/cloud-adapter/`) that is npm-installable independently. `coordinator.cjs` calls the cloud adapter through a thin file-based IPC or by spawning `node packages/cloud-adapter/cli.cjs ...` as a child process. The coordinator never `require()`s the cloud adapter directly — only invokes it via spawn. The zero-npm contract at the plugin root is preserved.

**Warning signs:**
- `require('some-package')` appears in any file under `bin/`, `lib/`, or `hooks/`
- A new `node_modules/` directory appears at the project root (not inside `packages/`)
- `relay.cjs` file size grows by over 50 lines for HTTP auth logic

**Phase to address:**
Cloud adapter architecture phase — must be settled before any cloud API calls are written.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse existing `--ours` merge strategy for cloud sync | No new merge logic | Silently drops cloud-written state updates on every sync | Never — wrong semantics for cloud direction |
| Hardcode cloud backend URL in coordinator.cjs | Fast to ship | URL changes require code edit and plugin reinstall | Never — use config.json dispatch.cloud block |
| Poll Redis for cloud events directly in aggregator.cjs | Avoids new RemoteAggregator class | Mixes file-polling and HTTP polling in same class, breaks test doubles | MVP only — refactor before v1 |
| Use `session_source: 'remote-managed'` for Docker containers | No dashboard schema change | Misrepresents session type, breaks source-specific UI behavior | Never — add proper source value |
| Skip cloud session lock acquisition (use separate git remote) | Avoids lock contention | Two concurrent writers to main — data corruption risk | Never for `.planning/` mutations |
| Inline Docker startup command in coordinator.cjs | Ships fast | Zero-npm violation if Docker SDK needed; untestable without DI | CLI spawn only (no SDK import) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Upstash Redis (dashboard) | Writing new session_source values without updating TypeScript union type | Define source enum in wire-schema.ts, import in both coordinator and dashboard |
| Docker container | Assuming container is ready when `docker run` exits 0 | Poll container health endpoint or wait for ready signal on stdout before marking session as started |
| git sync merge | Running `git fetch && git merge` outside the dispatcher lock | Acquire dispatcher.lock before any git operation on main; treat sync as a dispatch-equivalent |
| Cloud relay | Assuming `/tmp/pde-session-*.ndjson` exists on local machine for cloud sessions | Register cloud sessions with RemoteAggregator (Redis poll), never with file-based TailCursor |
| `claude --remote` (managed backend) | Treating it as a programmatic dispatch API — it is not | Keep it behind the detectManagedBackend stub; only promote when NDJSON streaming is confirmed working |
| SSH + cloud routing | Configuring both `preferred_backend: managed` and `host:` simultaneously without clear priority | Document that managed takes priority; fall-through to SSH if managed unavailable is the intended behavior |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Uncached cloud availability probe in routeSession() | Every parallel dispatch adds 2-5s latency before lock acquisition | 30-second TTL cache at coordinator level with 2s probe timeout | First dispatch with 2+ parallel sessions |
| TailCursor accumulation for ghost cloud sessions | Memory grows ~500 bytes per ghost cursor per poll interval | Never create TailCursor for cloud session IDs; use RemoteAggregator instead | After ~100 completed cloud sessions without restart |
| Synchronous git operations blocking the concurrency queue | All 3 queue slots stalled during merge | mergeSession() and cloud sync must not block the event loop — use execFile with callback, not execFileSync in hot path | First long-running merge with 3 concurrent sessions |
| Redis pipeline queries for large session list | getSessions() makes one HGETALL per session | Preserve existing pipeline implementation (queries.ts lines 39-43); do not add per-event queries in hot path | Over 50 concurrent sessions |
| Docker image pull on every cloud dispatch | 30-60s cold start per dispatch | Pre-pull images to a warm registry; check local image cache before pull | First dispatch to a new machine or after image cache cleared |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Forwarding all environment variables to cloud container | Leaks local credentials, API keys, CLAUDE_API_KEY to remote host | Allowlist-only env forwarding — same pattern as SSH dispatch's `env` block in remote config; document explicitly |
| Storing cloud backend API key in dispatch.remote config block (plaintext JSON) | Key exposed in git history if config.json is committed | Use environment variable reference (`${CLOUD_API_KEY}`) — expand at runtime, never store literal key |
| Trusting session_id from cloud relay without validation | Malicious relay could inject events into any session | Validate relay signature or shared secret; cloud session events must include a token the coordinator issued at dispatch time |
| Allowing cloud sessions to write to .planning/REQUIREMENTS.md or .planning/ROADMAP.md | Cloud agent could modify requirements/roadmap without human review | Enforce in sync merge: cloud sync always uses `--ours` for REQUIREMENTS.md and ROADMAP.md regardless of sync direction |
| Docker container with host network mode | Container can reach local MCP servers, internal services | Always use bridge networking; only expose specific ports needed for relay and health check |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cloud session shows "local" icon in dashboard | User cannot distinguish cloud sessions from local; confusing health matrix | Proper session_source value + distinct icon/badge in dashboard UI |
| No feedback when cloud is unavailable and routing falls back to local | User expects cloud offloading; silently gets local dispatch; wastes local CPU | Emit an explicit `routing_fallback` event to the dashboard: "Cloud unavailable — running locally" |
| Retry button for cloud sessions behaves like local retry | Cloud sessions have no local PID to kill and re-spawn | Cloud retry must call cloud backend API to cancel + re-dispatch; INT-RETRY-STUB must be extended, not just un-stubbed |
| Container startup latency looks like a hang | User sees "dispatching" state for 30-60s with no progress events | Emit a `container_starting` event with estimated wait time; poll container logs during startup and forward to relay |
| Git sync merge conflict blocks all subsequent dispatches | User has no visibility; dispatcher.lock is held during conflict resolution | Emit `sync_conflict` event to dashboard; surface conflict details in health matrix; release lock after recording conflict |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cloud session routing:** `routeSession()` returns new source value — verify TypeScript enum is updated in wire-schema.ts AND queries.ts coercion AND coordinator routing branch simultaneously
- [ ] **State sync direction:** Merge strategy for `.planning/STATE.md` switches direction based on sync type — verify with a test that simulates remote writes then local merge; assert STATE.md contains remote updates
- [ ] **Lock coverage:** Cloud sync merge acquires `dispatcher.lock` — verify by running a cloud sync while a local session merge is in progress; assert no "refusing to merge" errors
- [ ] **TailCursor hygiene:** No TailCursor is created for cloud session IDs — verify `agg._cursors` does not contain cloud session IDs after dispatch
- [ ] **Zero-npm at root:** No new `require()` in bin/, lib/, hooks/ for cloud SDK — verify with `node -e "require('./bin/lib/relay.cjs')"` on a clean machine with no extra packages
- [ ] **Environment variable allowlist:** Cloud containers only receive explicitly listed env vars — verify by inspecting the container's env at runtime; HOME and CLAUDE_API_KEY must not appear unless explicitly added
- [ ] **Dashboard source field:** Cloud sessions show distinct source in dashboard — verify by dispatching a cloud session and checking `source` field in Redis `pde:default:session:{id}`
- [ ] **Graceful degradation:** System falls back to local dispatch when cloud is unavailable — verify by blocking network and dispatching with `preferred_backend: cloud`; assert session runs locally with routing_fallback event emitted

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Local dispatch path broken by cloud routing | HIGH | Revert routeSession() to previous return values; restore _handleExit to only call worktree ops for local/SSH; re-run coordinator-smoke.test.cjs |
| Stale lock from crashed cloud session | LOW | Manually delete `.planning/dispatcher.lock`; run `pde --parallel --status` to verify registry; re-dispatch failed session |
| STATE.md wiped by wrong --ours direction | HIGH | `git log --all -- .planning/STATE.md` to find last good cloud-written commit; `git checkout <sha> -- .planning/STATE.md`; manually reconcile with current main |
| Ghost TailCursors accumulating | LOW | Coordinator restart clears all cursors; add `stopAll()` call in coordinator `shutdown()` |
| Container image not available at dispatch time | MEDIUM | Pre-pull images to warm registry; add image check step to dispatch path with user-facing error if missing |
| Cloud sync merge conflict | MEDIUM | `git merge --abort`; emit conflict event to dashboard; user resolves via `pde:sync-resolve`; re-attempt sync |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Breaking local dispatch path | Cloud dispatch foundation | coordinator-smoke.test.cjs passes with no changes to existing test stubs |
| Stale lock with cloud PID | Lock extension | Test: crash coordinator mid-cloud-dispatch; verify lock reclaim checks cloud backend before reclaiming |
| --ours clobbering cloud state | State sync protocol design | Test: remote writes STATE.md; local merge; assert STATE.md contains remote content |
| NDJSON routing for cloud sessions | Dashboard integration for remote sessions | Test: dispatch cloud session; verify no TailCursor created; verify events appear in dashboard via Redis |
| Container startup latency in routing | Cloud routing probe | Benchmark: 3 parallel dispatches with cloud configured; assert total routing latency under 200ms (cached probe) |
| Git sync race condition | State sync implementation | Test: concurrent local merge + cloud sync merge; assert no merge abort or corrupt commit |
| Dashboard session_source mismatch | Dashboard integration phase | TypeScript compile + runtime test: cloud session shows correct source field in Redis |
| Zero-npm violation | Cloud adapter architecture | Test on clean machine: `node -e "require('./bin/lib/coordinator.cjs')"` with no cloud packages installed |

---

## Sources

- Existing codebase: `packages/dispatcher/lib/coordinator.cjs`, `lock.cjs`, `merge.cjs`, `aggregator.cjs`, `remote-router.cjs`, `remote-managed.cjs`, `registry.cjs`
- Existing codebase: `dashboard/lib/queries.ts`, `wire-schema.ts`, `redis.ts`
- Existing codebase: `bin/lib/relay.cjs`
- Memory: `project_remote_dashboard.md` — hybrid architecture decisions, Layer 2/3 scope
- Memory: `project_standalone_cli.md` — cloud dispatch research findings, `claude --remote` limitations
- `remote-managed.cjs` inline documentation: `claude --remote` research preview bugs (#38066, #38049, #37713), NDJSON streaming not confirmed, CLAUDE.md propagation not confirmed
- [Git Worktree Conflicts with Multiple AI Agents — Termdock](https://www.termdock.com/en/blog/git-worktree-conflicts-ai-agents) — worktrees share .git object database and lock files
- [Reducing Docker Container Start-up Latency — HackerNoon](https://hackernoon.com/reducing-docker-container-start-up-latency-practical-strategies-for-faster-aiml-workflows) — container cold start in AI/ML workflows
- [Addressing AI Container Cold Start with Kubernetes 2026 — DasRoot](https://dasroot.net/posts/2026/02/addressing-ai-container-cold-start-kubernetes-2026/) — pre-warmed containers, image caching
- [Design for graceful degradation — Google Cloud Architecture Center](https://cloud.google.com/architecture/framework/reliability/graceful-degradation) — fallback mechanisms

---
*Pitfalls research for: adding cloud dispatch, git-based state sync, Docker orchestration, and intelligent routing to PDE*
*Researched: 2026-03-30*
