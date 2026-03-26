# Architecture Research: Distributed Execution (v0.18)

**Domain:** Distributed execution — git worktree session isolation, CLI subprocess dispatch, Agent SDK orchestration, remote SSH/managed dispatch
**Researched:** 2026-03-26
**Confidence:** HIGH — derived directly from approved design spec and verified existing codebase

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                   USER / PDE ORCHESTRATOR                         │
│  /gsd:execute-phase N --parallel  |  /gsd:autonomous --parallel  │
└──────────────────────┬───────────────────────────────────────────┘
                       │ invokes
┌──────────────────────▼───────────────────────────────────────────┐
│                  packages/dispatcher/                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐   │
│  │ Agent SDK    │  │ SessionRegistry│  │  WorktreeManager     │   │
│  │ Orchestrator │  │ (in-memory)    │  │  (git worktree ops)  │   │
│  │ (reasoning)  │  │               │  │                      │   │
│  └──────┬───────┘  └───────┬───────┘  └──────────┬───────────┘   │
│         │                  │                     │               │
│  ┌──────▼───────────────────▼─────────────────────▼───────────┐  │
│  │                   DispatchCoordinator                       │  │
│  │  - builds dependency DAG from ROADMAP.md                   │  │
│  │  - static file-overlap analysis (PLAN.md extraction)       │  │
│  │  - routes units: local CLI | remote managed | remote SSH   │  │
│  │  - respects max_local_sessions / max_remote_sessions       │  │
│  └────────────────────────┬────────────────────────────────────┘  │
└───────────────────────────┼───────────────────────────────────────┘
                            │ spawns
          ┌─────────────────┼─────────────────────────────┐
          │                 │                             │
┌─────────▼────────┐  ┌─────▼────────┐  ┌───────────────▼──────────┐
│  claude --print  │  │  claude      │  │  SSH: claude --print      │
│  (local wt-A)    │  │  --remote    │  │  on remote-host/wt-C      │
│  .sessions/abc/  │  │  (managed)   │  │  .sessions/def/           │
└─────────┬────────┘  └─────┬────────┘  └───────────────┬──────────┘
          │                 │                            │
          │ NDJSON          │ relay events               │ relay events
          ▼                 ▼                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Relay Infrastructure (UNCHANGED)                     │
│  One relay.cjs daemon per session → /api/ingest → Upstash Redis  │
│  SSE → dashboard                                                  │
│  Wire envelope: { session_id, type, data, extensions }           │
└──────────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────┐
│              Dashboard (Next.js, UNCHANGED infrastructure)        │
│  Multi-session views, session filter, dispatch action buttons     │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| `packages/dispatcher/lib/session.cjs` | Spawn `claude --print` subprocesses in worktrees; track lifecycle (running/completed/failed) | NEW |
| `packages/dispatcher/lib/worktree.cjs` | `git worktree add/remove`; branch lifecycle; orphan detection on startup | NEW |
| `packages/dispatcher/lib/registry.cjs` | In-memory `SessionRegistry` with concurrency cap enforcement and session metadata | NEW |
| `packages/dispatcher/lib/merge.cjs` | Post-session merge strategies per file type; auto-resolve `.planning/` metadata; surface source conflicts | NEW |
| `packages/dispatcher/lib/orchestrator.cjs` | Agent SDK calls for DAG analysis, routing decisions, conflict resolution assistance, progress summarization | NEW |
| `packages/dispatcher/lib/router.cjs` | Routing logic: local vs managed vs SSH based on `interactive`/`autonomous` tag and config | NEW |
| `packages/dispatcher/lib/remote.cjs` | SSH dispatch sequence: git push → SSH exec → git pull; managed dispatch via `claude --remote` | NEW |
| `packages/dispatcher/lib/aggregator.cjs` | Multiplex NDJSON from all session files → `/tmp/pde-dispatch-{id}.ndjson` for tmux panes | NEW |
| `packages/dispatcher/index.cjs` | Public API surface consumed by plugin orchestrator; zero npm deps in public interface | NEW |
| `bin/lib/config.cjs` | Add `dispatch` config block with validation; add new valid keys | MODIFIED |
| `bin/lib/event-bus.cjs` | No change — already session-scoped NDJSON; dispatcher creates one bus per session | UNCHANGED |
| `bin/lib/relay.cjs` | No change — one daemon instance per session; remote machines run same binary | UNCHANGED |
| `bin/lib/relay-protocol.cjs` | No change — `extensions` field absorbs `session_id` enrichment | UNCHANGED |
| `bin/lib/model-profiles.cjs` | Add dispatcher agent types (`pde-dispatcher`, `pde-merge-resolver`) | MODIFIED |
| `workflows/execute-phase.md` | Add `--parallel` flag handling; call dispatcher API when flag present | MODIFIED |
| `workflows/autonomous.md` | Add `--parallel` flag; phase-level and plan-level parallelism path | MODIFIED |
| `agents/executor.md` | Write `COMPLETE` marker file instead of updating STATE.md inline | MODIFIED |
| `agents/executor.md` | Write phase-local `COMPLETED-REQS.md` instead of updating REQUIREMENTS.md inline | MODIFIED |
| `agents/executor.md` | Write `memories-{session-id}.md` instead of appending to shared `memories.md` | MODIFIED |
| `bin/pane-*.sh` | Accept `PDE_NDJSON_PATH` env override to tail aggregated dispatch NDJSON | MODIFIED |
| `dashboard/` | Multi-session cards, session filter, dispatch action buttons, tiered chevron | MODIFIED |

---

## Recommended Project Structure

```
packages/
└── dispatcher/               # NEW — isolated subdirectory, CAN have npm deps
    ├── package.json          # @anthropic-ai/sdk, no other runtime deps
    ├── index.cjs             # Public API: dispatch(unit), sessions(), reset()
    ├── lib/
    │   ├── session.cjs       # spawnSession(), killSession(), waitSession()
    │   ├── worktree.cjs      # addWorktree(), removeWorktree(), listOrphans()
    │   ├── registry.cjs      # SessionRegistry class, concurrency enforcement
    │   ├── merge.cjs         # mergeSession(), autoResolvePlanning(), detectConflicts()
    │   ├── orchestrator.cjs  # Agent SDK calls: analyzeDag(), routingDecision(), summarize()
    │   ├── router.cjs        # routeUnit(): local | managed | ssh
    │   ├── remote.cjs        # tryManaged(), trySSH(), fallbackChain()
    │   ├── aggregator.cjs    # MuxAggregator: N session NDJSON → 1 dispatch NDJSON
    │   └── lock.cjs          # dispatcher.lock PID management, stale lock cleanup
    └── test/
        └── *.test.cjs        # node:test, Nyquist assertions, real git worktree tests

bin/lib/
├── config.cjs                # MODIFIED: new dispatch.* config keys
├── model-profiles.cjs        # MODIFIED: dispatcher agent types
├── event-bus.cjs             # UNCHANGED
├── relay.cjs                 # UNCHANGED
└── relay-protocol.cjs        # UNCHANGED

.planning/
├── config.json               # MODIFIED: dispatch block
├── dispatcher.lock           # NEW: PID lock, ephemeral
└── phases/{N}-*/
    ├── COMPLETE               # NEW: completion marker (replaces inline STATE.md write)
    └── COMPLETED-REQS.md      # NEW: phase-local reqs (replaces inline REQUIREMENTS.md write)

.sessions/                    # NEW: ephemeral, gitignored at project root
└── {session-id}/             # git worktree checkout on pde/session/{id} branch
```

### Structure Rationale

- **`packages/dispatcher/`:** Isolated so it can freely depend on `@anthropic-ai/sdk` without violating the zero-dep plugin root constraint. The plugin root (`bin/`) requires only node: built-ins. The dispatcher is invoked by the plugin orchestrator but lives outside the `bin/lib/` boundary.
- **`packages/dispatcher/index.cjs`:** Thin public API surface. Orchestrator calls `dispatcher.dispatch(unit)`, `dispatcher.sessions()`, `dispatcher.reset()`. Internal modules are not exposed.
- **`.sessions/`:** Gitignored directory at project root (not inside `.planning/`). Keeps worktrees out of planning state and makes manual inspection easy.
- **Completion markers in phase dirs:** Allows sessions to signal completion without writing shared files. Dispatcher is the single writer for STATE.md and ROADMAP.md post-merge.

---

## Architectural Patterns

### Pattern 1: Dispatcher as Single Writer for Shared State

**What:** Sessions never write STATE.md, ROADMAP.md, or REQUIREMENTS.md directly. Instead they drop marker files into their phase directory. The dispatcher reads all markers after each session merge and performs a single atomic update to shared state.

**When to use:** Any file that multiple parallel sessions would otherwise both modify. Eliminates merge conflicts by construction.

**Trade-offs:** Slight delay in state visibility (updated post-merge, not during execution). Worth it for zero merge conflict guarantee.

**Example:**
```javascript
// packages/dispatcher/lib/merge.cjs
async function mergeSession(sessionId) {
  await gitMerge(registry.get(sessionId).branch);
  // Session wrote .planning/phases/N-*/COMPLETE — read it now
  const markers = scanCompletionMarkers();
  updateStateFile(markers);         // single writer
  recalculateRoadmapFromDisk();     // single writer
  mergeCompletedReqs(sessionId);    // single writer
  mergeAgentMemory(sessionId);      // single writer
}
```

### Pattern 2: Two-Tier Execution (CLI for work, Agent SDK for orchestration)

**What:** All filesystem-touching work (executing plans, running phases) goes to `claude --print` subprocesses. Lightweight reasoning tasks (dependency analysis, routing decisions, merge conflict triage, summarization) go to Agent SDK calls inside the dispatcher process.

**When to use:** Always. Never use Agent SDK for work that writes files or needs Claude Code tools. Never spawn full CLI sessions just for a routing decision.

**Trade-offs:** Adds `@anthropic-ai/sdk` dependency to dispatcher package. Justified by eliminating a whole class of complexity: routing logic stays in process, observable, fast.

**Example — task routing:**
```javascript
// packages/dispatcher/lib/orchestrator.cjs
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

async function analyzeDependencies(roadmapContent) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `Analyze this roadmap and return a JSON dependency DAG:\n${roadmapContent}` }]
  });
  return JSON.parse(response.content[0].text);
}
```

### Pattern 3: Session-Scoped NDJSON with Dispatcher Aggregation

**What:** Each CLI session writes to its own `/tmp/pde-session-{id}.ndjson` (existing pattern). The dispatcher's `MuxAggregator` tails all active session files and merges events — with session_id prefix — into one dispatch-scoped NDJSON file. Pane scripts use `PDE_NDJSON_PATH` to point at the aggregated file.

**When to use:** Any time multiple sessions are active. Single-session mode continues to work exactly as today (no aggregation needed, `PDE_NDJSON_PATH` unset).

**Trade-offs:** One extra tail process per active session inside the aggregator. Acceptable — each tail is a `setInterval` polling 500ms with byte-offset cursor (same as existing `TailCursor`).

### Pattern 4: Orphan Detection on Startup

**What:** On every PDE startup (or dispatcher initialization), scan `.sessions/` for existing worktree directories. Cross-reference against a persisted registry snapshot. Classify each orphan as: alive (process still running), completed (COMPLETE marker present), or dead (process gone, no marker). Prompt user with adopt/merge/kill/ignore per orphan.

**When to use:** Defensive pattern — dispatcher crash, terminal killed, machine rebooted. Prevents `.sessions/` from accumulating stale worktrees silently.

---

## Data Flow

### Local Dispatch Flow

```
User runs /gsd:execute-phase 5 --parallel
    │
    ▼
execute-phase.md workflow
    │ reads ROADMAP.md, identifies parallelizable plans within phase 5
    │ calls dispatcher.dispatch([{unit: plan-1}, {unit: plan-2}])
    ▼
DispatchCoordinator
    │ Agent SDK: analyze plan file lists for overlap
    │ route each unit: local (both plans, no overlap detected)
    ▼
WorktreeManager
    │ git worktree add .sessions/abc -b pde/session/abc
    │ git worktree add .sessions/def -b pde/session/def
    ▼
session.cjs: spawn claude --print in each worktree (detached)
    │
    ├── wt-abc: claude executes plan 1, writes files in worktree
    │   emits NDJSON → /tmp/pde-session-abc.ndjson
    │   relay.cjs tails → HTTP POST /api/ingest
    │
    └── wt-def: claude executes plan 2, writes files in worktree
        emits NDJSON → /tmp/pde-session-def.ndjson
        relay.cjs tails → HTTP POST /api/ingest
    │
    ▼ (both complete)
MuxAggregator: merges both NDJSON streams into dispatch NDJSON (in-flight)
    │
merge.cjs:
    │ git merge pde/session/abc → clean (no source overlap)
    │ git merge pde/session/def → clean
    │ reads COMPLETE markers from both phase dirs
    │ updateStateFile(), recalculateRoadmap(), mergeReqs()
    ▼
WorktreeManager cleanup: git worktree remove, prune branches
```

### Remote SSH Dispatch Flow

```
DispatchCoordinator: unit tagged autonomous → try remote
    │
remote.cjs:
    │ git push origin pde/session/xyz
    │ ssh user@host "git fetch && git worktree add .sessions/xyz pde/session/xyz"
    │ ssh: PDE_SESSION_ID=xyz PDE_REMOTE=<relay_url> claude --print --cwd .sessions/xyz
    │                   └── remote relay.cjs streams events → /api/ingest (same endpoint)
    │ ssh: git add -A && git commit && git push origin pde/session/xyz
    ▼
Local: git fetch && git merge pde/session/xyz
    │ same merge.cjs strategies apply
    ▼
Cleanup: ssh worktree remove + local worktree remove + branch prune (both ends)
```

### Dashboard Event Flow (unchanged wire, new session tags)

```
relay.cjs (per session) → HTTP POST /api/ingest
    │ wire envelope: { session_id, type, data, extensions: { phase, plan, source_tag } }
    ▼
/api/ingest route handler → Upstash Redis sorted set (session_id as key segment)
    ▼
SSE stream → dashboard Next.js client
    │ filter by session_id dropdown
    │ render session cards with source tag (local | remote-managed | remote-ssh)
    ▼
action buttons → /api/sessions/{id}/stop|merge|retry → dispatcher API
```

---

## Integration Points

### Plugin Root → Dispatcher

The plugin root (`bin/`) invokes the dispatcher by requiring `packages/dispatcher/index.cjs`. This is the only cross-boundary call. The dispatcher's internal use of `@anthropic-ai/sdk` does not leak into the plugin root.

```javascript
// Inside execute-phase.md / workflow scripts (called via pde-tools.cjs or direct require)
const dispatcher = require('../../packages/dispatcher/index.cjs');
await dispatcher.dispatch({ type: 'plan', phase: 5, plan: 2, interactive: false });
```

The plugin root never calls any internal dispatcher modules directly.

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| `bin/` → `packages/dispatcher/` | CJS `require()` of `index.cjs` only | dispatcher cannot require anything from `bin/lib/` (would create circular dep) |
| dispatcher → relay | dispatcher passes session NDJSON path to relay subprocess; does not import relay.cjs | keeps relay zero-dep |
| dispatcher → event-bus | dispatcher passes session_id as env var to CLI subprocess; subprocess's event-bus picks it up | no direct import |
| dispatcher → config | dispatcher calls `bin/pde-tools.cjs config-get dispatch` via child_process for config reads, or reads config.json directly (safe read-only) | avoids requiring plugin root |

### Session Registry → Event Bus

The existing `event-bus.cjs` path (`/tmp/pde-session-{id}.ndjson`) is already scoped by session ID. The dispatcher creates a new session ID per worktree spawn and passes it as `PDE_SESSION_ID` env var. The CLI subprocess inside the worktree reads this env var to name its NDJSON file. No changes to event-bus.cjs.

### Agent SDK → Model Resolution

The Agent SDK orchestrator in `packages/dispatcher/lib/orchestrator.cjs` does NOT go through `bin/lib/model-profiles.cjs`. It calls the Anthropic SDK directly with a hardcoded model selection appropriate for lightweight reasoning (e.g. `claude-sonnet-4-5`). The model-profiles system is for the plugin's Task()-spawned agents, not the dispatcher's in-process SDK calls.

However, `bin/lib/model-profiles.cjs` should receive two new entries (`pde-dispatcher`, `pde-merge-resolver`) for any future cases where the orchestrator wants to respect user's profile preference.

### Remote Dispatch → Existing Relay

Remote machines run the same `bin/lib/relay.cjs` binary (copied or installed). The relay is configured with `PDE_REMOTE` env var pointing at the same `/api/ingest` endpoint. The dashboard does not know or care that events originate from a remote machine — the `session_id` in the wire envelope is sufficient to route and display correctly.

### Dashboard → Dispatcher API

New action buttons in the dashboard (Stop, Retry, Merge Now, Abandon) call new API routes:

| Route | Dispatcher Call | Dashboard UI |
|-------|-----------------|--------------|
| POST `/api/sessions/{id}/stop` | `dispatcher.sessions.kill(id)` | "Stop" button on session card |
| POST `/api/sessions/{id}/retry` | `dispatcher.sessions.retry(id)` | "Retry" button on failed card |
| POST `/api/sessions/{id}/merge` | `dispatcher.sessions.merge(id)` | "Merge Now" button on completed card |
| POST `/api/sessions/{id}/abandon` | `dispatcher.sessions.abandon(id)` | "Abandon" destructive button |
| POST `/api/sessions/reset` | `dispatcher.reset()` | "Reset All Sessions" nuclear button |
| GET `/api/sessions` | `dispatcher.sessions.list()` | Session list, filter dropdown |

These routes are NEW in the existing Next.js dashboard app. The existing approval gate route pattern is the model to follow.

---

## Anti-Patterns

### Anti-Pattern 1: Dispatcher Importing plugin root modules

**What people do:** `require('../../bin/lib/config.cjs')` inside dispatcher modules to read config.

**Why it's wrong:** Creates a circular dependency risk and pulls plugin root CJS semantics into the npm-dep-permitted dispatcher package. If plugin root ever changes its module structure, dispatcher breaks silently.

**Do this instead:** Dispatcher reads `.planning/config.json` directly via `fs.readFileSync` for config access. It's a plain JSON file. No abstraction layer needed for a read-only consumer.

### Anti-Pattern 2: Updating STATE.md or ROADMAP.md inside a session worktree

**What people do:** Executor agent writes inline progress to STATE.md during phase execution (existing behavior). Naively extended to distributed sessions.

**Why it's wrong:** Two sessions modifying STATE.md concurrently produces merge conflicts. Git's three-way merge on structured markdown is unreliable.

**Do this instead:** Sessions drop a `COMPLETE` file in their phase directory. Dispatcher is the single writer for STATE.md and ROADMAP.md, executing post-merge. This is the core merge-conflict-prevention guarantee.

### Anti-Pattern 3: Using Agent SDK for filesystem-writing work

**What people do:** Try to save cost by routing "lightweight" plan execution through Agent SDK instead of full CLI subprocess.

**Why it's wrong:** Agent SDK calls cannot use Claude Code tools (filesystem, git, bash). Any plan that writes files, runs tests, or commits must use a CLI subprocess in a worktree.

**Do this instead:** Enforce the two-tier rule: Agent SDK = reasoning only (DAG analysis, routing, summarization, merge triage). CLI subprocess = all execution work. There is no gray area.

### Anti-Pattern 4: Placing packages/dispatcher/ inside bin/

**What people do:** Put dispatcher modules in `bin/lib/dispatcher/` for proximity.

**Why it's wrong:** `bin/` is the zero-dep plugin root. Adding `@anthropic-ai/sdk` there breaks the constraint. Claude Code installs the plugin and expects `bin/` to have zero npm deps.

**Do this instead:** `packages/dispatcher/` is a sibling package with its own `package.json`. The plugin root requires only its public `index.cjs`.

---

## Build Order with Dependency Justification

The spec states the build order: Session isolation → Local CLI dispatch → Agent SDK orchestrator → Remote dispatch → Dashboard integration. Here is the dependency justification for each phase:

### Phase A: Session Isolation (Foundation)

Build first. Nothing else works without worktree lifecycle management and the session registry.

**Delivers:**
- `worktree.cjs`: `addWorktree()`, `removeWorktree()`, `listOrphans()`
- `registry.cjs`: `SessionRegistry` with concurrency cap
- `lock.cjs`: dispatcher.lock PID management
- Orphan detection on startup
- `.sessions/` gitignore entry
- Completion marker protocol (COMPLETE file, COMPLETED-REQS.md, memories-{id}.md)
- Modify executor agents to use markers instead of direct writes

**Why first:** All subsequent layers depend on worktree isolation. Agent executor changes (writing markers) must ship before any parallel execution is possible. Without this, phases A-D of a parallel run would race on shared files.

**Zero-dep constraint:** All of this is `node:child_process`, `node:fs`, `node:path`. No npm deps yet.

### Phase B: Local CLI Dispatch

Build second. Depends on session isolation (worktrees must exist before spawning CLI in them).

**Delivers:**
- `session.cjs`: `spawnSession()` with `--print`, `--cwd`, detached
- `merge.cjs`: post-session git merge + auto-resolve strategies for `.planning/` files
- `aggregator.cjs`: MuxAggregator tailing N session NDJSON files → 1 dispatch NDJSON
- Modify `bin/pane-*.sh`: respect `PDE_NDJSON_PATH` env override
- `--parallel` flag on `/gsd:execute-phase` wired to dispatcher
- Config additions: `dispatch.enabled`, `dispatch.max_local_sessions`

**Why second:** CLI dispatch is the core value delivery. Proves the pattern works before adding reasoning (Agent SDK) or remote complexity. Can ship and validate with real parallel executions.

**Constraint:** Still zero npm deps in dispatcher at this stage (CLI spawning is `node:child_process`).

### Phase C: Agent SDK Orchestrator

Build third. Depends on CLI dispatch (orchestrator drives the dispatch loop).

**Delivers:**
- `packages/dispatcher/package.json` with `@anthropic-ai/sdk`
- `orchestrator.cjs`: `analyzeDag()`, `routingDecision()`, `monitorSessions()`, `summarizeResults()`
- `router.cjs`: plugs into orchestrator decisions, tags units as interactive/autonomous
- Replace hardcoded parallelism heuristics with Agent SDK DAG analysis
- Failure handling: retry with backoff, circuit breaker on multiple session failures
- Add `pde-dispatcher` and `pde-merge-resolver` to model-profiles.cjs

**Why third:** Routing heuristics in Phase B can be simple (e.g. assume all plans in a wave are parallel). Phase C replaces these with proper dependency analysis. Building it third means Phase B shipped something real; Phase C makes it smarter.

**npm dep introduced here:** `@anthropic-ai/sdk` enters `packages/dispatcher/package.json` only.

### Phase D: Remote Dispatch

Build fourth. Depends on Agent SDK routing (router must tag units as autonomous before remote dispatch is meaningful) and local CLI dispatch (same session lifecycle, just executed remotely).

**Delivers:**
- `remote.cjs`: `tryManaged()`, `trySSH()`, `fallbackChain()`
- SSH dispatch sequence (git push → SSH exec → git pull)
- `claude --remote` managed backend
- Config additions: `dispatch.remote.preferred`, `dispatch.remote.ssh.*`
- `/gsd:autonomous --parallel` command
- Relay on remote machine (same binary, `PDE_REMOTE` env var)
- Failure handling: SSH reconnect, relay heartbeat timeout, remote machine dead → re-route local

**Why fourth:** Remote dispatch is the highest-risk layer (SSH reliability, git sync, relay on remote machine). Building it after local dispatch is proven means the session lifecycle, merge strategies, and aggregation patterns are all validated before adding network complexity.

### Phase E: Dashboard Integration

Build fifth. Depends on all previous layers (needs real event data with session_id and source_tag to render correctly; needs dispatcher API for action buttons).

**Delivers:**
- Multi-session session cards with source tag chips (local / remote-managed / remote-ssh)
- Session filter pill (persistent across tabs)
- Tiered action chevron per session card
- Striped animated progress bars
- Dispatch action buttons: Stop, Retry, Merge Now, Abandon, Reset All
- New API routes: `/api/sessions` CRUD
- Mobile tab bar (Sessions / Progress / Events / Cost)
- Responsive layout: phone tab bar, tablet 2x2, laptop 7-pane

**Why fifth:** Dashboard changes are purely additive on top of existing v0.17 UI. They require real session_id event data to test correctly. Building last means visual work can proceed against a known, stable data contract from the dispatcher.

---

## Scaling Considerations

This is a single-user tool with bounded concurrency by design (`max_local_sessions: 3`, `max_remote_sessions: 2`). Scaling concerns are operational, not traffic-based.

| Concern | Current bound | With dispatch | Mitigation |
|---------|---------------|---------------|------------|
| Disk: worktree accumulation | N/A | Each worktree ≈ repo size on disk | Cleanup on merge; orphan detection prompts cleanup; `sessions reset` nuclear option |
| Memory: aggregator tailing N files | N/A | N TailCursor setInterval instances | Bounded by `max_local_sessions + max_remote_sessions` = 5 max; negligible |
| API cost: Agent SDK calls | N/A | 1 SDK call per dispatch decision | Lightweight model (`sonnet`); cache DAG analysis result per roadmap hash |
| Git: branch accumulation | N/A | Prune on cleanup | Add stale branch cleanup to orphan detection |
| Relay: remote event lag | Existing latency | SSH adds ~100-500ms per batch | Existing relay batching handles this; dashboard shows "last event Ns ago" |

---

## Sources

- Design spec: `docs/superpowers/specs/2026-03-26-distributed-execution-design.md` (approved, HIGH confidence)
- Existing relay: `bin/lib/relay.cjs` — TailCursor, BatchQueue, CircuitBreaker (verified in codebase)
- Existing event-bus: `bin/lib/event-bus.cjs` — session-scoped NDJSON at `/tmp/pde-session-{id}.ndjson` (verified)
- Existing config: `bin/lib/config.cjs` — VALID_CONFIG_KEYS, config.json structure (verified)
- Existing model resolution: `bin/lib/model-profiles.cjs` — agent-to-model map (verified)
- Existing pde-tools: `bin/pde-tools.cjs` — command surface, plugin root boundary (verified)
- Existing packages: `packages/pde-mcp-server/` — precedent for sibling package pattern (verified)

---
*Architecture research for: v0.18 Distributed Execution*
*Researched: 2026-03-26*
