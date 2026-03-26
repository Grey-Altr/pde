# v0.18 Distributed Execution (Layers 2-3)

**Date:** 2026-03-26
**Status:** Approved
**Milestone:** v0.18
**Depends on:** v0.17 Remote Dashboard (shipped 2026-03-26)
**Supersedes:** 2026-03-25-remote-dashboard-layers-2-3-design.md (draft)

## Problem

PDE executes phases strictly sequentially in a single Claude Code session. Independent phases that could run in parallel are blocked behind each other. Long-running autonomous work (research, multi-phase execution) requires an attended terminal. Users cannot offload work to remote machines.

## Solution

Distributed execution with two layers:

- **Layer 2 (Local Agent SDK Dispatch):** Spawn parallel Claude Code CLI sessions on the same machine via git worktrees, with Agent SDK for lightweight orchestration. Phase-level and plan-level parallelism.
- **Layer 3 (Cloud Offloading):** Route autonomous work to remote machines (`claude --remote` or SSH server). Git for state sync, existing relay for real-time event streaming.

## Goals

1. Independent phases execute in parallel locally via CLI sessions
2. Plans within waves execute in parallel via CLI sessions in worktrees
3. Autonomous phases dispatch to remote machines (managed or SSH)
4. Real-time dashboard visibility for all sessions (local + remote)
5. All actions operable as touch-friendly buttons from phone/tablet
6. Zero merge conflicts for `.planning/` metadata by construction
7. Zero additional infrastructure cost (git + existing Upstash relay)

## Non-Goals

- Running the full PDE Claude Code plugin in the cloud (v1.0 Standalone CLI)
- Multi-user/team collaboration (single-user trust model)
- Cost controls and spend caps (placeholder only)
- Native iOS app (PWA covers mobile)

## Architecture

### Approach: Bottom-Up with Tiered Execution

Build session isolation first, then local parallelism, then remote dispatch. Each layer ships standalone value.

**Build order:** Session isolation -> Local CLI dispatch -> Agent SDK orchestrator -> Remote dispatch -> Dashboard integration

### Execution Tiers

| Tier | Engine | Use Case |
|------|--------|----------|
| CLI subprocess | `claude --print` in worktree | Heavyweight: execute plans, execute phases (needs filesystem, tools, git) |
| Agent SDK | `@anthropic-ai/agent-sdk` | Lightweight: dependency analysis, routing decisions, merge conflict resolution, progress summarization |

Agent SDK lives in `packages/dispatcher/` (isolated subdirectory). Plugin root stays zero-dep.

---

## Section 1: Session Isolation

Git worktrees as session containers. Each parallel session gets its own worktree + branch.

### Session Lifecycle

```
1. SPAWN
   - git worktree add .sessions/<session-id> -b pde/session/<session-id>
   - Start relay for this session (session-scoped NDJSON)

2. EXECUTE
   - Claude runs in worktree directory (isolated filesystem)
   - All .planning/ writes go to worktree's copy
   - Events stream via relay to dashboard (session-tagged)

3. COLLECT
   - Merge session branch back to parent
   - Auto-resolve .planning/ metadata (see Section 6)
   - Surface conflicts for manual resolution (should be rare)

4. CLEANUP
   - git worktree remove .sessions/<session-id>
   - Prune session branch
```

### Shared vs. Isolated Resources

| Resource | Shared | Isolated | Why |
|----------|--------|----------|-----|
| Source code | Read-only base | Worktree copy | Sessions read same codebase |
| `.planning/STATE.md` | | Dispatcher writes post-merge | Per-session tracking during execution |
| `.planning/agent-history.json` | | Per-session | Agent tracking per session |
| `.planning/agent-memory/` | Merge on complete | Per-session during execution | Append-only, auto-mergeable |
| `.planning/config.json` | Snapshot at spawn | | Config doesn't change during execution |
| `.planning/phases/{N}-*/` | | Session owns assigned phase | Dispatch never assigns same phase to two sessions |
| NDJSON events | | Separate files per session | Already session-scoped by design |
| Git commits | | On session branch | Merge at collection |

---

## Section 2: Local CLI Dispatch

The dispatcher spawns `claude` CLI subprocesses in worktrees. Lives in `packages/dispatcher/`.

### Architecture

```
+-------------------------------------+
|  PDE Orchestrator (execute-phase)   |
|  - decides what can run in parallel |
|  - calls dispatcher API             |
+----------------+--------------------+
                 |
         +-------v-------+
         |  Dispatcher    |
         |  (dispatcher/) |
         |  - session mgr |
         |  - worktree mgr|
         |  - merge mgr   |
         +---+-------+----+
             |       |
      +------v--+ +--v------+
      | claude  | | claude  |    <- CLI subprocesses
      | session | | session |
      | (wt-A)  | | (wt-B)  |    <- each in its own worktree
      +---------+ +---------+
```

### Dispatch Decisions

Two levels of parallelism:

1. **Phase-level:** Phases with no shared requirements or explicit dependencies run concurrently. Dispatcher reads ROADMAP.md, builds dependency DAG, identifies independent phases.
2. **Plan-level:** Plans within the same wave run as CLI sessions in worktrees (upgrade from Task() subagents).

### CLI Spawning

```javascript
// packages/dispatcher/lib/session.cjs
const { spawn } = require('node:child_process');

function spawnSession({ worktreePath, prompt, sessionId }) {
  const child = spawn('claude', [
    '--print',
    '--prompt', prompt,
    '--cwd', worktreePath
  ], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PDE_SESSION_ID: sessionId,
      PDE_REMOTE: process.env.PDE_REMOTE
    }
  });
  return { child, sessionId, worktreePath };
}
```

### Session Registry

```javascript
SessionRegistry {
  sessions: Map<sessionId, {
    type: 'cli' | 'agent-sdk',
    status: 'running' | 'completed' | 'failed',
    phase: number,
    plan: number | null,
    worktreePath: string,
    branch: string,
    startedAt: ISO,
    relayPid: number
  }>

  maxConcurrent: 3  // from config, configurable

  canSpawn(): boolean
  register(session): void
  complete(sessionId, result): void
  getActive(): Session[]
}
```

### Event Aggregation

One relay daemon per session (zero changes to relay.cjs). Each session writes to `/tmp/pde-session-{sessionId}.ndjson`. Events tagged with `session_id` — dashboard distinguishes them.

---

## Section 3: Agent SDK Orchestrator

Lightweight reasoning tier. Never writes files. Lives in `packages/dispatcher/`.

### Task Routing

| Task | Tier | Why |
|------|------|-----|
| Execute a plan | CLI | Needs filesystem, tools, git |
| Execute a phase | CLI | Heavyweight, long-running |
| Dependency analysis | Agent SDK | Read-only reasoning |
| Merge conflict resolution | Agent SDK | Analyze diffs, propose resolution |
| Session health monitoring | Agent SDK | Lightweight polling + decision |
| Progress summarization | Agent SDK | Read events, produce summary |
| Dispatch routing | Agent SDK | Decision logic, no filesystem writes |

### Orchestration Loop

1. User runs `/gsd:execute-phase N --parallel` or `/gsd:autonomous --parallel`
2. Agent SDK analyzes roadmap -> dependency DAG
3. Agent SDK identifies parallelizable work units
4. Dispatcher spawns CLI sessions for each unit (worktree isolation)
5. Agent SDK monitors sessions via relay events
6. On completion, Agent SDK assists with merge conflict resolution if needed
7. Agent SDK summarizes results

### Failure Handling

- CLI session crashes -> dispatcher detects via exit code, preserves worktree, surfaces failure
- Agent SDK call fails -> retry with backoff (3 attempts), then surface to user
- Multiple session failures -> circuit breaker pauses dispatch, asks user

---

## Section 4: Remote Dispatch

Hybrid sync: git push/pull for `.planning/` state, relay for real-time events. Two backends with fallback.

### Sync Architecture

```
+--------------+     git push      +--------------+
|  Local PDE   | ----------------> | Remote Host  |
|              |                   |              |
|  dispatcher  |     relay events  |  claude CLI  |
|  <-----------|  <--------------- |  (worktree)  |
|              |                   |              |
|  merge <-----|     git push      |  commits --> |
+--------------+ <---------------- +--------------+
```

### Backend A: `claude --remote` (Managed)

- Dispatcher calls `claude --remote --print --prompt "..." --cwd <repo>`
- Anthropic handles machine, Claude Code, execution
- PDE passes relay config so events stream to dashboard
- Git sync via repo's remote (push branch, remote pulls)
- Zero infrastructure for user

### Backend B: SSH Server (Self-hosted)

Config in `.planning/config.json`:
```json
{
  "dispatch": {
    "remote": {
      "preferred": "managed",
      "ssh": {
        "host": "user@server.example.com",
        "repo_path": "/home/user/pde-project",
        "claude_path": "claude"
      }
    }
  }
}
```

SSH dispatch sequence:
1. `git push origin pde/session/{id}`
2. SSH: `git fetch && git worktree add .sessions/{id} pde/session/{id}`
3. SSH: `PDE_SESSION_ID={id} PDE_REMOTE={relay_url} claude --print --prompt "{...}" --cwd .sessions/{id}`
4. SSH: `git add -A && git commit && git push origin pde/session/{id}`
5. Local: `git fetch && git merge pde/session/{id}`
6. Cleanup: remove worktree and branch on both ends

### Relay on Remote

Remote machine runs same `relay.cjs` pointed at same dashboard ingest URL. Events tagged with session_id. Dashboard doesn't care where events originate. Handles circuit breaking and batching.

### Fallback Logic

```javascript
async function dispatch(unit) {
  const config = loadConfig();
  if (config.dispatch.remote.preferred === 'managed') {
    const result = await tryManaged(unit);
    if (result.ok) return result;
    if (config.dispatch.remote.ssh) return trySSH(unit);
    throw new Error('Managed dispatch failed, no SSH fallback');
  }
  return trySSH(unit);
}
```

### Routing Decision

| Work type | Local | Remote | Why |
|-----------|-------|--------|-----|
| Interactive (user input needed) | Y | | Can't prompt user remotely |
| Phases with approval gates | Y | | Gates need immediate response |
| Autonomous (no checkpoints) | | Y | Fire and forget |
| Research phases | | Y | Independent, long-running |
| Phases touching shared state heavily | Y | | Merge complexity |

Dispatcher tags each unit as `interactive` or `autonomous` based on plan's checkpoint field.

---

## Section 5: Dashboard Integration

Multi-session views in existing v0.17 PWA. No new infrastructure.

### Session-Aware UI

- Session cards show source tag: `local`, `remote-managed`, `remote-ssh`
- Session cards show relationship: "Phase 5, Plan 2"
- Parallel session indicator: "3 active" badge
- Session group view: group by parent dispatch

### Event Log Aggregation

- Filter by session dropdown
- Color-coded session tags for visual distinction
- Interleaved timeline (default: all sessions chronological)

### Progress View

- Multi-phase progress bars (one per active phase)
- Aggregate: "3/7 phases complete, 2 running, 2 queued"

### Merge Notifications

- Push: "Phase 5 complete - merged successfully"
- Push: "Phase 5 complete - merge conflict needs attention"
- Merge conflict card with "Resolve locally" action

---

## Section 6: Merge Conflict Prevention

Non-overlapping writes by construction. Shared metadata files written only by dispatcher post-merge.

### Shared File Elimination

| File | Today | With dispatch | Conflict risk |
|------|-------|--------------|---------------|
| `STATE.md` | Executor writes inline | Dispatcher writes post-merge | Zero |
| `ROADMAP.md` | Executor updates progress | Dispatcher recalculates from disk | Zero |
| `REQUIREMENTS.md` | Executor marks complete | Phase-local COMPLETED-REQS.md -> dispatcher merges | Zero |
| `agent-memory/` | Executor appends | Session-scoped files -> dispatcher merges | Zero |
| `phases/{N}-*/` | Executor owns | Session owns (same) | Zero |
| Source code | Executor writes | Session in worktree | Minimized by static analysis |

### How It Works

- **STATE.md:** Sessions don't update it. Executor sets completion marker in phase directory (`COMPLETE` file). Dispatcher reads markers post-merge, updates STATE.md once. Single writer.
- **ROADMAP.md:** Sessions don't modify it. Dispatcher recalculates progress from disk (counts SUMMARY.md files). Single writer.
- **REQUIREMENTS.md:** Sessions write phase-local `COMPLETED-REQS.md`. Dispatcher reads these post-merge, updates REQUIREMENTS.md once. Single writer.
- **agent-memory/:** Sessions write to `memories-{session-id}.md`. Dispatcher merges into `memories.md` post-merge, deduplicating, respecting 50-entry cap.

### Source Code Conflict Mitigation

1. **Static analysis at dispatch:** Read each phase's PLAN.md, extract file lists. If two phases mention same source file, they run sequentially.
2. **Conservative default:** Only parallelize when confident there's no overlap.
3. **Fallback:** Git detects conflict at merge time. Dispatcher surfaces as failure card. User resolves in terminal.

**Guarantee:** `.planning/` metadata files have zero merge conflict risk. Source code conflicts minimized by static analysis.

---

## Section 7: Observability & Debugging

### Dispatcher Events

```
dispatch.session_spawned    { session_id, type, phase, plan, target }
dispatch.session_completed  { session_id, exit_code, duration_s, commits }
dispatch.session_failed     { session_id, error, worktree_path }
dispatch.merge_started      { session_id, branch, conflicts }
dispatch.merge_completed    { session_id, strategy, auto_resolved }
dispatch.merge_conflict     { session_id, files, needs_human }
dispatch.routing_decision   { unit, target, reason }
dispatch.queue_status       { active, queued, max }
```

### tmux Dashboard Extension

Existing 7-pane layout updated:

| Pane | Today | With dispatch |
|------|-------|---------------|
| 1: Agent Activity | Local agent spawns | All session spawns (local + remote) with [L]/[R] tags. Dispatcher events appear here. |
| 2: Pipeline Progress | Single phase progress | Multi-phase progress, one line per active phase with session source |
| 3: File Changes | Local file watch | Local + remote file changes (git diff stats post-merge) |
| 4: Log Stream | One session NDJSON tail | All active sessions multiplexed with session color prefix |
| 5: Token/Cost | Single session cost | Aggregate across all sessions |
| 6: Context Window | Single session utilization | Per-session context bars (stacked) |
| 7: Suggestions | Idle-time suggestions | Includes "Phase 7 completed remotely - merge ready" |

**Multi-source aggregation:** Dispatcher writes `/tmp/pde-dispatch-{dispatcher-id}.ndjson` merging events from all local session NDJSON files + mirrored remote relay events. Pane scripts tail this file via `PDE_NDJSON_PATH` env var.

**Session switching:** `s` key cycles sessions (filters to one), `a` shows all.

### Failure Debugging

Each session preserves on failure:
- Exit log (last 50 lines stderr)
- NDJSON tail (last 100 events)
- Worktree preserved (not cleaned up)
- Agent SDK generates failure summary

For remote failures: SSH command to inspect, option to pull worktree locally.

### Orphan Detection

On PDE session startup:
1. Scan `.sessions/` for existing worktree directories
2. Check if processes still running (PID from registry)
3. Prompt: "Found N active sessions. Adopt / Kill / Ignore?"
4. Completed but unmerged: "Found completed work. Merge now?"
5. Dead sessions: "Found abandoned session. Clean up?"

---

## Section 8: Mobile-First Multi-Session UI

### Responsive Pane Navigation

**Phone (<640px): Tab bar + swipe**

Bottom tab bar with 4 primary tabs:
- **Sessions** -> Pane 1+2: agent activity + pipeline progress (stacked cards)
- **Progress** -> Pane 2+6: phase progress bars + context utilization per session
- **Events** -> Pane 4: log stream with session filter chips (horizontally scrollable)
- **Cost** -> Pane 5: aggregate token/cost + per-session breakdown

Swipe left/right between tabs. Pane 3 (files) and Pane 7 (suggestions) via overflow.

**Tablet (640px-1024px): 2x2 grid**

Four panes visible simultaneously. Each tappable to expand full-screen.

**Laptop (>1024px): Full pane layout**

All 7 panes as CSS grid. Each pane resizable by dragging borders. Click header to expand full-width.

### Session Filter

Persistent session selector pill at top of every tab:
```
[dot] All sessions [chevron]
```
Tap to filter to specific session. Persists across tab switches.

### Action Buttons (Not Commands)

| Action | Phone/Tablet | Laptop |
|--------|-------------|--------|
| Retry session | Button: `Retry` | Button + command shown |
| Stop session | Button: `Stop` (destructive red) | Button + command |
| Abandon failed | Button: `Abandon` (destructive) | Button + command |
| Merge completed | Button: `Merge Now` | Button + command |
| Approve gate | Button: `Approve` / `Deny` | Same |
| View branch | Button: `View Branch` | Link + git command |
| Clean up orphans | Button: `Adopt` / `Kill` / `Ignore` | Button + command |
| Nuclear reset | Button: `Reset All Sessions` (double-confirm AlertDialog) | Same |

Rules:
- Phone/Tablet: buttons only, no commands shown, 44px min touch target
- Destructive actions always behind AlertDialog confirmation
- No swipe-to-reveal for destructive actions (too easy to trigger accidentally)
- Max 3 visible actions per card, additional behind "Details"

### Tiered Action Chevron

Each session card shows a 3-step chevron: current state + last two transitions.

```
+--------+  +----------+  +--------+
|Spawned |> | Wave 1 Y |> |Wave 2 *|
+--------+  +----------+  +--------+
```

Chevron states:
- Completed step: muted/zinc, Y symbol
- Active step: accent/primary, * symbol
- Failed step: destructive/red, X symbol
- Queued step: border-only/ghost, o symbol

Chevron vocabulary: `Spawned`, `Wave N`, `Plan N`, `Complete`, `Merge`, `Merged`, `Failed`

Tap a chevron for detail popover: timestamp, duration, key events.

### Striped Progress Bars

Active work distinguished by animated diagonal stripes:

```
Completed:  [solid fill, muted]          100%
Active:     [striped animated, accent]    45%
Queued:     [empty, border only]           0%
Failed:     [solid fill, red, stopped]    60%
```

Stripe animation speed as signal:
- Normal (2s cycle): executing, events flowing
- Slow (6s cycle): idle/waiting (approval gate)
- No animation, solid accent: paused by user
- No animation, solid red: failed

```css
.progress-active {
  background: repeating-linear-gradient(
    -45deg,
    var(--accent) 0px, var(--accent) 8px,
    var(--accent-muted) 8px, var(--accent-muted) 16px
  );
  background-size: 22.6px 100%;
  animation: stripe-slide 2s linear infinite;
}
.progress-waiting { animation-duration: 6s; }
@keyframes stripe-slide { to { background-position: 22.6px 0; } }
```

Accessibility: `prefers-reduced-motion: reduce` disables animation. Color never sole differentiator (symbols always present). `role="progressbar"` with `aria-valuenow`.

### Real-Time Indicators

- Green pulse dot on panes/tabs with new unread events
- Event count badge on Events tab when filtered
- "Live" / "Polling" / "Offline" connection indicator

### Keyboard Shortcuts (Laptop)

| Key | Action |
|-----|--------|
| `1`-`7` | Focus pane by number |
| `s` | Cycle session filter |
| `a` | Reset to all sessions |
| `f` | Expand focused pane full-screen |
| `Esc` | Collapse to grid |

---

## Section 9: Configuration & UX

### New Config Fields

```json
{
  "dispatch": {
    "enabled": false,
    "max_local_sessions": 3,
    "max_remote_sessions": 2,
    "remote": {
      "preferred": "managed",
      "ssh": {
        "host": null,
        "repo_path": null,
        "claude_path": "claude"
      }
    },
    "routing": "auto"
  }
}
```

- `dispatch.enabled`: feature gate, disabled by default
- `routing`: `"auto"` (dispatcher decides), `"local"` (force local), `"remote"` (force remote-eligible to remote)

### User-Facing Commands

| Command | Purpose |
|---------|---------|
| `/gsd:execute-phase N --parallel` | Execute with parallel dispatch |
| `/gsd:autonomous --parallel` | Run remaining phases with phase + plan parallelism |
| `/gsd:sessions` | List active sessions (status, phase, plan, source) |
| `/gsd:sessions stop <id>` | Stop a session |
| `/gsd:sessions reset` | Nuclear: kill all, remove worktrees, prune branches |
| `/gsd:settings` | Configure dispatch |

### The `--parallel` Flag

Opt-in at every level. Without it, execution works exactly as today. Zero risk to existing workflows.

### Graceful Degradation

- `dispatch.enabled: false` -> everything works as today
- No remote configured -> all work runs locally
- `claude` CLI not found -> error with install instructions
- SSH connection fails -> fall back to local, notify via dashboard
- `--remote` not available -> fall back to SSH, then local

---

## Section 10: Error Handling

### Session Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| CLI crashes | Exit code != 0 | Preserve worktree, failure card, offer retry |
| CLI hangs | Timeout (default 30min) | Kill process, same as crash |
| Out of context | Missing SUMMARY.md | Retry with fresh context |
| SSH drops mid-execution | Relay heartbeat timeout (60s) | Mark `unknown`, reconnect, resume or restart |
| Remote machine dies | SSH refused + relay timeout | Mark unhealthy, re-route to local |

### Merge Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Clean merge | Exit 0 | Auto-complete, recalculate state |
| .planning/ metadata conflict | Exit 1, .planning/ files | Auto-resolve (Section 6 strategies) |
| Source code conflict | Exit 1, non-.planning/ files | Surface to user, preserve both branches |
| Broken state post-merge | Validation fails | Recalculate from disk |

### Dispatch Coordination

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Dispatcher dies | Parent exits | Orphaned sessions continue (detached). Next startup: orphan detection. |
| Two dispatchers | Lock file check | `.planning/dispatcher.lock` with PID. Stale locks auto-cleaned. |
| Max sessions exceeded | Registry count | Queue excess, process as sessions complete |

---

## Section 11: Testing Strategy

### Tier 1: Nyquist Unit Tests

File-parse assertions using `node:test` + `readFileSync`:
- Session manager lifecycle (spawn/track/complete/fail)
- Worktree manager (create/merge/cleanup, conflict detection)
- Dispatcher routing (local vs remote, concurrency limits)
- Merge strategies (STATE.md latest-wins, REQUIREMENTS.md union, agent-memory append)
- Config (new dispatch fields, defaults, degradation)

### Tier 2: Local Integration Tests

Real git worktrees and real `claude` CLI spawning:
- Two sessions in parallel: dispatch, both complete, merge succeeds
- Session failure + recovery: one crashes, other unaffected
- Merge conflict: two sessions modify same file, detected, auto-resolve for .planning/
- Orphan lifecycle: spawn, kill dispatcher, restart, orphans detected
- Lock file: two dispatchers can't start simultaneously
- Event aggregation: two NDJSON files relay correctly

### Tier 3: Remote Integration Tests

SSH to localhost:
- Full round-trip: push -> execute -> pull
- Remote relay streams to dashboard
- SSH failure: graceful fallback
- Remote cleanup: worktrees and branches pruned

### Infrastructure

- Tiers 1-2 in CI (GitHub Actions)
- Tier 3 manual or SSH-to-self in CI
- All tests in `packages/dispatcher/test/*.test.cjs`
- CLI spawning mockable (dispatcher doesn't care if Claude actually runs)

---

## New Event Types

```
dispatch.session_spawned     - session created
dispatch.session_completed   - session finished
dispatch.session_failed      - session errored
dispatch.merge_started       - merge initiated
dispatch.merge_completed     - merge done
dispatch.merge_conflict      - needs human resolution
dispatch.routing_decision    - local vs remote choice
dispatch.queue_status        - active/queued/max counts
```

All flow through existing relay -> `/api/ingest` -> Redis -> SSE pipeline. Wire envelope unchanged (data in `extensions` field).

---

## What Changes in Existing Code

| Component | Change | Scope |
|-----------|--------|-------|
| PDE plugin config | New `dispatch` config block | config.cjs |
| execute-phase.md | `--parallel` flag, dispatcher integration | Workflow file |
| autonomous workflow | `--parallel` flag support | Workflow file |
| STATE.md writes | Defer to dispatcher (completion markers) | Executor agents |
| ROADMAP.md progress | Recalculate from disk post-merge | Dispatcher |
| REQUIREMENTS.md | Phase-local COMPLETED-REQS.md | Executor agents |
| agent-memory | Session-scoped files | Executor agents |
| tmux pane scripts | Multi-source NDJSON via PDE_NDJSON_PATH | Shell scripts |
| Dashboard | Multi-session views, dispatch UI, action buttons | Next.js app |

## What Doesn't Change

- Wire protocol schema (extensions field absorbs new data)
- Relay daemon core (one instance per session, unchanged)
- Approval gate flow
- PWA/push notification infrastructure
- All Layer 1 monitoring features
- Existing session detail page
- Zero-npm-dependency plugin root

---

## Risks

1. **Static file analysis may miss overlaps** - Two phases might modify files not listed in PLAN.md. Mitigation: conservative default (sequential when uncertain), git detects conflicts at merge.
2. **Agent SDK fidelity for orchestration** - Agent SDK reasoning may make poor routing decisions. Mitigation: simple heuristics as fallback, user override via routing config.
3. **Orphaned sessions after crash** - Detached processes continue after parent dies. Mitigation: orphan detection on startup, nuclear reset command.
4. **Remote relay latency** - Events from SSH server may lag. Mitigation: relay batching (existing), dashboard shows "last event: Ns ago" staleness indicator.
5. **Worktree accumulation** - Failed sessions leave worktrees on disk. Mitigation: cleanup on merge, periodic prompt to clean stale worktrees, `sessions reset`.

---

*Spec written: 2026-03-26*
*Supersedes: 2026-03-25 draft*
