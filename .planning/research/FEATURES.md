# Feature Research: PDE v0.18 Distributed Execution

**Domain:** Distributed task execution — git worktree session isolation, CLI subprocess orchestration, multi-session monitoring, remote dispatch
**Researched:** 2026-03-26
**Confidence:** HIGH (core patterns verified against Claude Code official docs and 2026 ecosystem research)

---

## Context: What Already Exists (Not in Scope)

These features are the foundation this milestone builds on — do NOT re-build:

- Single-session phase execution with wave-based plan parallelism (Task() subagents)
- NDJSON event streaming via relay daemon to Upstash Redis
- PWA dashboard with real-time monitoring via SSE, session cards, event log
- Approval gate push notifications (Web Push + VAPID)
- Production hardening: rate limiting, TTL, downsampling, GC on relay
- Existing tmux 7-pane monitoring dashboard

The v0.18 milestone adds **parallel session dispatch** (Layer 2) and **remote execution** (Layer 3).

---

## Ecosystem Context (2026)

The ecosystem has converged on git worktrees as the standard session isolation primitive for parallel AI coding agents. Tools validated this year: ccswarm (Rust, CLI orchestrator), Mux (desktop with conflict visualization), Superset (multi-agent dispatcher), Parallel Worktrees (GitHub), and critically, Anthropic's own experimental "Agent Teams" feature (v2.1.32+). The pattern is proven and table stakes — the differentiation is in the orchestration logic, merge conflict prevention, and observability layer on top.

**Key finding from official Claude Code Agent Teams docs (HIGH confidence):** Agent teams use significantly more tokens than single sessions, require experimental flag (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`), have known limitations around session resumption, and are not recommended for sequential tasks, same-file edits, or work with many dependencies. PDE's CLI-subprocess + worktree approach is architecturally sounder than the native Agent Teams feature for its use case.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any parallel execution system. Missing these = system feels broken.

| Feature | Why Expected | Complexity | Infrastructure Dependency |
|---------|--------------|------------|---------------------------|
| **Git worktree per session** | The universal isolation primitive — every parallel agent tool uses this; anything less causes file conflicts | LOW | git CLI (always present) |
| **Session lifecycle management (spawn/track/complete/cleanup)** | Users need to know which sessions are running, which finished, and have confidence nothing is leaked | MEDIUM | Dispatcher session registry |
| **Exit code detection + failure surfacing** | If a CLI subprocess crashes silently, user cannot recover; must be visible | LOW | Node.js child_process exit event |
| **Opt-in flag (`--parallel`)** | Without explicit opt-in, parallel execution changes behavior in surprising ways; users expect existing sequential flow to be untouched | LOW | PDE plugin config |
| **Session-scoped event tagging** | Events from parallel sessions must be distinguishable in the dashboard; unlabeled events from multiple sessions are unusable | LOW | Existing NDJSON `session_id` field (already supported) |
| **Orphan detection on startup** | Detached processes surviving a PDE crash are a hazard; users expect the system to find and surface these on next launch | MEDIUM | `.sessions/` dir scan + PID check |
| **Nuclear reset command** | When parallel execution goes wrong (stuck sessions, bad merges), users need a single command to restore clean state | LOW | Session registry + worktree cleanup |
| **Non-overlapping phase assignment** | Dispatching the same phase to two sessions simultaneously is a fundamental correctness violation; must be prevented by construction | MEDIUM | Dispatcher routing logic |
| **Session status in dashboard** | "What is each session doing right now?" is the baseline query for any multi-session system | LOW | Existing SSE pipeline + session card component |
| **Graceful degradation when dispatch is disabled** | `dispatch.enabled: false` must make the system behave exactly as today with zero behavioral change | LOW | Feature gate in config |

### Differentiators (Competitive Advantage)

Features that distinguish PDE's distributed execution from generic parallel agent tools.

| Feature | Value Proposition | Complexity | Infrastructure Dependency |
|---------|-------------------|------------|---------------------------|
| **Zero merge conflict guarantee for `.planning/` metadata** | Generic tools surface conflicts as a problem; PDE eliminates them by construction (single-writer pattern per shared file, session-scoped writes during execution) | HIGH | Dispatcher post-merge collector; requires changing STATE.md, ROADMAP.md, REQUIREMENTS.md write semantics in executor agents |
| **Static file analysis at dispatch** | Most tools discover conflicts at merge time; PDE detects file overlap at dispatch time by reading PLAN.md file lists, preventing conflicts before they start | MEDIUM | Agent SDK (read-only reasoning); PLAN.md file-list convention |
| **Two-tier execution routing (CLI vs Agent SDK)** | Heavyweight work (filesystem, tools, git) runs as CLI subprocesses; lightweight work (dependency analysis, routing decisions, merge resolution, summarization) runs as Agent SDK. Cost-optimized: SDK calls are cheaper than full CLI sessions | HIGH | `@anthropic-ai/agent-sdk` in `packages/dispatcher/` |
| **Tiered remote dispatch with fallback (managed → SSH → local)** | Most agent tools are local-only; PDE routes autonomous work to remote machines with zero additional infrastructure cost (git + existing relay) and automatic fallback | HIGH | git push/pull for state sync; existing relay for real-time events; SSH or `claude --remote` |
| **Session-source tagging in dashboard** | Users can see whether a session is `local`, `remote-managed`, or `remote-ssh` with relationship context ("Phase 5, Plan 2") | LOW | Existing SSE pipeline; new `dispatch.session_spawned` event type |
| **Interactive vs autonomous routing** | Sessions with approval gates stay local (can't prompt user remotely); fully autonomous sessions route to remote. Routing decision is automatic based on PLAN.md checkpoint field | MEDIUM | Dispatcher routing; PLAN.md checkpoint convention |
| **Tiered chevron progress per session card** | Visual state machine showing last 3 transitions (Spawned → Wave 1 → Wave 2, each with Y/*/X/o symbols) gives at-a-glance session state without opening detail views | MEDIUM | Dashboard session card component; existing dispatch events |
| **Aggregate multi-session progress view** | "3/7 phases complete, 2 running, 2 queued" — single-number summary across all active sessions for the phone home screen widget use case | LOW | Dashboard state derived from session registry events |
| **Dispatcher events in existing event bus** | New `dispatch.*` event types flow through the existing NDJSON → relay → Redis → SSE pipeline with zero wire protocol changes; extensions field absorbs new data | LOW | Existing relay + SSE pipeline (no changes needed) |
| **Session context window utilization per session (stacked bars)** | Token visibility for multiple sessions simultaneously; no CI/CD tool or agent orchestration tool shows this | MEDIUM | Existing token/cost events; multi-session aggregation in dashboard |
| **Failure preservation + Agent SDK failure summary** | Failed sessions preserve exit log (last 50 lines stderr), NDJSON tail (last 100 events), and worktree; Agent SDK generates human-readable failure summary | MEDIUM | Agent SDK; worktree lifecycle (no cleanup on failure) |
| **Concurrent phase + plan parallelism** | Two levels: independent phases run as separate sessions; plans within a wave run as sessions in worktrees. Most tools offer one level | HIGH | Dependency DAG from ROADMAP.md; Dispatcher routing logic |
| **Striped animated progress bars with speed-as-signal** | Active work: animated diagonal stripes; slow animation = waiting at gate; no animation + solid = failed. Animation speed communicates health, not just progress | LOW | Dashboard CSS; existing progress bar component |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem beneficial but create problems in this context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Using native Claude Code Agent Teams feature** | Anthropic already built multi-agent coordination — why not use it? | Experimental, gated behind env flag, no session resumption, task status lags, no nested teams, all teammates inherit lead's permissions, does not support worktree-isolated subprocess execution model PDE needs | PDE's own CLI-subprocess + worktree pattern; more control, no experimental flags |
| **Shared `.planning/` state during parallel execution** | "All sessions should see the same state" | Creates race conditions and merge conflicts by definition; the whole point of worktree isolation is independent writes | Single-writer pattern: sessions write completion markers to their own phase dir; dispatcher aggregates post-merge |
| **Auto-resolve all merge conflicts silently** | "Zero interruptions during autonomous execution" | Silent auto-resolution of source code conflicts corrupts state in ways that are hard to diagnose; user trust requires visibility when conflicts occur | Auto-resolve only `.planning/` metadata (provably safe strategies); surface source code conflicts to user with worktree preserved |
| **Real-time cross-session state sharing during execution** | "Sessions should know what other sessions are doing" | Cross-session communication during execution adds synchronization overhead and coupling that defeats the purpose of isolation; the only safe shared state is the pre-dispatch snapshot | Sessions are fully isolated during execution; coordination happens at dispatch (pre-execution) and merge (post-execution) |
| **More than 3 concurrent local sessions** | "Maximize parallelism = maximize speed" | Claude Code sessions are memory-intensive; 3+ concurrent sessions on a typical developer machine causes resource contention, slowdowns, and context thrashing that negates parallelism gains | Configurable `max_local_sessions: 3` default; queue excess work; user can raise limit explicitly |
| **Persistent background dispatcher daemon** | "Dispatcher should always be running to pick up new work" | A persistent daemon creates orphan processes, complicates session model, conflicts with Claude Code's session-based execution model | Lock-file-based single-dispatcher pattern; dispatcher spawns on demand, runs until all sessions complete |
| **Bidirectional relay between remote and local dispatchers** | "Remote sessions should be able to spawn more sessions locally" | Creates a distributed coordination problem with failure modes that require a full distributed systems solution (leader election, network partition handling) | One-way dispatch: local dispatcher → remote session. Remote session reports back via git push + relay events |
| **Real-time streaming of remote session filesystem** | "Show me what files the remote session is changing in real-time" | Streaming filesystem events over SSH adds bandwidth, latency, and complexity; file changes on remote are meaningful only after merge | Show git diff stats post-merge; relay events show logical progress (phase/plan/wave); file changes visible in dashboard after session completes |
| **Cost controls and spend caps** | "Stop sessions when they exceed budget" | Requires real-time token counting accuracy (current heuristic is chars/4, labeled ~est.) and Anthropic API rate-limit integration; incorrect cutoffs abort work mid-execution in hard-to-recover states | Placeholder only; surface aggregate cost per session; let user stop sessions manually from dashboard |
| **Running full PDE plugin in the cloud** | "I want zero local dependencies" | Requires packaging the entire Claude Code plugin as a deployable artifact, MCP server hosting, auth, and multi-tenant isolation — v1.0 Standalone CLI milestone scope | SSH to a machine that has Claude Code installed; that machine runs PDE locally |

---

## Feature Dependencies

```
[Git Worktree Per Session]
    |-- requires --> [git CLI]
    |-- enables --> [Session Lifecycle Management]
    |-- enables --> [Non-Overlapping Phase Assignment]
    |-- enables --> [Static File Analysis at Dispatch]

[Session Lifecycle Management]
    |-- requires --> [Git Worktree Per Session]
    |-- requires --> [Session Registry (in-memory Map)]
    |-- enables --> [Exit Code Detection]
    |-- enables --> [Orphan Detection]
    |-- enables --> [Nuclear Reset Command]
    |-- enables --> [Session Status in Dashboard]

[Dispatcher Events in Existing Event Bus]
    |-- requires --> [Session Lifecycle Management]
    |-- requires --> [Existing NDJSON relay pipeline (NO CHANGES)]
    |-- enables --> [Session Source Tagging in Dashboard]
    |-- enables --> [Tiered Chevron Progress per Session Card]
    |-- enables --> [Aggregate Multi-Session Progress View]

[Two-Tier Execution Routing]
    |-- requires --> [@anthropic-ai/agent-sdk]
    |-- requires --> [packages/dispatcher/ isolation]
    |-- enables --> [Interactive vs Autonomous Routing]
    |-- enables --> [Static File Analysis at Dispatch]
    |-- enables --> [Failure Preservation + Agent SDK Summary]
    |-- enables --> [Tiered Remote Dispatch with Fallback]

[Zero Merge Conflict Guarantee (.planning/)]
    |-- requires --> [Non-Overlapping Phase Assignment]
    |-- requires --> [Single-writer pattern for STATE.md, ROADMAP.md, REQUIREMENTS.md]
    |-- requires --> [Session-scoped COMPLETED-REQS.md and memories-{id}.md]
    |-- enables --> [Auto-resolve .planning/ metadata conflicts]
    |-- conflicts_with --> [Shared .planning/ state during execution]

[Tiered Remote Dispatch]
    |-- requires --> [Session Lifecycle Management]
    |-- requires --> [Two-Tier Execution Routing]
    |-- requires --> [Interactive vs Autonomous Routing]
    |-- requires --> [git push/pull for state sync]
    |-- requires --> [Existing relay (zero changes, remote points to same ingest URL)]
    |-- enables --> [SSH dispatch sequence]
    |-- enables --> [managed dispatch (claude --remote)]

[Multi-Session Dashboard Integration]
    |-- requires --> [Dispatcher Events in Existing Event Bus]
    |-- requires --> [Session source tagging]
    |-- enhances --> [Existing v0.17 PWA (additive, no rewrites)]
    |-- enables --> [Striped Animated Progress Bars]
    |-- enables --> [Tiered Chevron Progress per Session Card]
    |-- enables --> [Session Context Window Bars (stacked)]
    |-- enables --> [Merge Notifications (push)]

[Orphan Detection]
    |-- requires --> [Session Lifecycle Management]
    |-- requires --> [.sessions/ directory scan on startup]
    |-- requires --> [PID check from dispatcher.lock]
    |-- enables --> [Adopt / Kill / Ignore prompt on startup]
    |-- enables --> [Nuclear Reset Command]
```

### Dependency Notes

- **Git worktree is the root dependency.** Everything in Layer 2 flows from this. It must be the first thing built and tested.
- **Dispatcher events require zero wire protocol changes.** The extensions field in existing NDJSON envelope absorbs all new data. This is the lowest-risk integration point.
- **Zero merge conflict guarantee requires executor agent changes.** STATE.md, ROADMAP.md, REQUIREMENTS.md write semantics must change in executor agents — this is a cross-cutting change across existing workflows, not just new dispatcher code.
- **Remote dispatch depends on interactive vs autonomous routing.** Cannot safely dispatch to remote without first classifying each session's interactivity requirement. Build routing before remote.
- **Two-tier routing requires Agent SDK.** `packages/dispatcher/` must be an isolated subdirectory to keep plugin root zero-dependency. Do not add `@anthropic-ai/agent-sdk` to the plugin root.
- **Multi-session dashboard is additive.** The v0.17 PWA does not need rewrites — new session cards, chevrons, and progress bars extend the existing component tree.

---

## MVP Definition

### Launch With (Layer 2 — Local Parallel Execution)

Minimum viable: independent phases and plans execute in parallel locally, user can monitor all sessions from existing dashboard.

- [ ] **Git worktree lifecycle (spawn/track/complete/cleanup)** — Foundation; everything else depends on this
- [ ] **Session registry** — Track active sessions, status, phase/plan assignment; enable `canSpawn()` concurrency check
- [ ] **Non-overlapping phase assignment** — Dispatch never assigns the same phase to two sessions; correctness invariant
- [ ] **CLI subprocess spawning in worktree** — `spawn('claude', ['--print', '--prompt', '...', '--cwd', worktreePath])` with detached: true
- [ ] **Exit code detection and failure surfacing** — Dashboard failure card; worktree preserved on failure
- [ ] **Dispatcher events in event bus** — `dispatch.session_spawned`, `dispatch.session_completed`, `dispatch.session_failed` through existing NDJSON pipeline
- [ ] **Session-scoped event tagging in dashboard** — Filter dropdown; color-coded session tags; interleaved chronological timeline
- [ ] **Zero merge conflict guarantee for `.planning/`** — Single-writer pattern; session-scoped COMPLETED-REQS.md and memories-{id}.md; dispatcher aggregates post-merge
- [ ] **Orphan detection on startup** — Scan `.sessions/`, PID check, Adopt/Kill/Ignore prompt
- [ ] **`--parallel` opt-in flag** — Zero behavioral change without flag; existing sequential flow untouched
- [ ] **Nuclear reset command (`/gsd:sessions reset`)** — Kill all, remove worktrees, prune branches, restore clean state

### Add After Layer 2 Validates (Layer 3 — Remote Dispatch)

Add once local parallel execution is stable and merged conflicts are confirmed zero.

- [ ] **Two-tier execution routing (CLI vs Agent SDK)** — `packages/dispatcher/` with Agent SDK; routing table for task types
- [ ] **Interactive vs autonomous routing** — Tag sessions based on PLAN.md checkpoint field; interactive stays local
- [ ] **SSH remote dispatch** — git push branch → SSH execute → git push result → local merge; full round-trip
- [ ] **Managed remote dispatch (`claude --remote`)** — Try managed first, fallback to SSH, fallback to local
- [ ] **Remote relay integration** — Remote machine runs relay.cjs pointed at same dashboard ingest URL; no dashboard changes
- [ ] **SSH failure fallback** — Graceful local re-routing on SSH refused or relay heartbeat timeout

### Future Consideration (v2+)

Defer until Layer 2 + Layer 3 have real usage data.

- [ ] **Cost controls and spend caps** — Requires accurate token counting and API integration; placeholder only in v0.18
- [ ] **Cross-session state sharing during execution** — Dangerous without distributed consensus; not worth the complexity
- [ ] **Nested dispatcher (remote spawning local sessions)** — Full distributed systems problem; out of scope for single-user trust model

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Git worktree lifecycle | HIGH | LOW | P1 |
| Session registry | HIGH | LOW | P1 |
| Non-overlapping phase assignment | HIGH | LOW | P1 |
| CLI subprocess spawning | HIGH | LOW | P1 |
| Exit code detection + failure surfacing | HIGH | LOW | P1 |
| Dispatcher events in event bus | HIGH | LOW | P1 |
| Session-scoped event tagging in dashboard | HIGH | LOW | P1 |
| Zero merge conflict guarantee (.planning/) | HIGH | HIGH | P1 |
| Orphan detection | MEDIUM | MEDIUM | P1 |
| `--parallel` opt-in flag | HIGH | LOW | P1 |
| Nuclear reset command | HIGH | LOW | P1 |
| Interactive vs autonomous routing | HIGH | MEDIUM | P2 |
| Two-tier execution routing (CLI vs Agent SDK) | HIGH | HIGH | P2 |
| Tiered chevron progress per session card | MEDIUM | MEDIUM | P2 |
| Aggregate multi-session progress view | MEDIUM | LOW | P2 |
| Striped animated progress bars | LOW | LOW | P2 |
| SSH remote dispatch | HIGH | HIGH | P2 |
| Managed remote dispatch | MEDIUM | MEDIUM | P2 |
| Remote relay integration | MEDIUM | LOW | P2 |
| Static file analysis at dispatch | MEDIUM | MEDIUM | P2 |
| Session context window bars (stacked) | MEDIUM | LOW | P2 |
| Failure preservation + Agent SDK summary | MEDIUM | MEDIUM | P2 |
| Cost controls / spend caps | LOW | HIGH | P3 |
| Session comparison view | LOW | MEDIUM | P3 |
| Nested dispatcher | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for Layer 2 launch — local parallel execution
- P2: Layer 3 launch — remote dispatch + dashboard polish
- P3: Future consideration — defer until usage data exists

---

## Ecosystem Comparison

| Feature | ccswarm | Mux | Claude Code Agent Teams | PDE v0.18 (Our Approach) |
|---------|---------|-----|------------------------|--------------------------|
| Session isolation | Git worktrees | Git worktrees (auto) | Separate context windows (no worktrees by default) | Git worktrees (explicit `.sessions/<id>`) |
| Merge conflict prevention | Manual | Visual divergence detection | Task claiming with file locks | Zero by construction for `.planning/`; static analysis for source |
| Remote execution | No | No | No | Yes (SSH + managed) |
| Event observability | Terminal UI | Desktop app | In-process or tmux split panes | Existing NDJSON/SSE/PWA pipeline (no new infra) |
| Mobile control | No | No | No | Existing PWA (action buttons on session cards) |
| Failure recovery | Manual | Manual | Manual worktree inspection | Worktree preserved; Agent SDK summary; retry button in dashboard |
| Token cost visibility | No | No | Per-session (experimental) | Per-session + aggregate; existing cost infrastructure |
| Routing intelligence | None | None | Claude decides team structure | Dispatcher: interactive vs autonomous; file overlap analysis |
| Orphan handling | Manual | Manual | Prompt on conflict | Auto-detect on startup; Adopt/Kill/Ignore |
| Infrastructure cost | Runtime only | Desktop app required | None | Runtime only (git + existing Upstash relay) |

---

## Sources

- [Claude Code Agent Teams (official docs, current)](https://code.claude.com/docs/en/agent-teams) — Architecture, limitations, session resumption known issues, token cost guidance
- [Claude Code Worktrees Guide](https://claudefa.st/blog/guide/development/worktree-guide) — Standard isolation patterns, subagent isolation, cleanup mechanics (MEDIUM confidence)
- [Claude Code Remote Control Guide](https://claudefa.st/blog/guide/development/remote-control-guide) — Remote control architecture, limitations (single session restriction, no SSH dispatch) (HIGH confidence)
- [ccswarm: AI Multi-Agent Orchestration](https://crates.io/crates/ccswarm) — Community orchestration tool; session persistence patterns (LOW confidence, WebSearch only)
- [Process Supervision for AI Agents (Zylos Research, 2026-02-20)](https://zylos.ai/research/2026-02-20-process-supervision-health-monitoring-ai-agents) — Application-level heartbeats vs crude metrics; state persistence across restarts (MEDIUM confidence)
- [Parallel Coding Agents with Git Worktree x tmux (Medium, 2026)](https://medium.com/@sean0628/parallel-coding-agents-with-git-worktree-x-tmux-be2a5a290f18) — Confirms tmux + worktree as standard parallel agent pattern (LOW confidence, WebSearch summary)
- [Four Design Patterns for Event-Driven Multi-Agent Systems (Confluent)](https://www.confluent.io/blog/event-driven-multi-agent-systems/) — Orchestrator-worker, parallel fan-out/gather, event aggregation (MEDIUM confidence)
- [Design spec: 2026-03-26-distributed-execution-design.md](../docs/superpowers/specs/2026-03-26-distributed-execution-design.md) — PRIMARY SOURCE for v0.18 feature definitions

---
*Feature research for: PDE v0.18 Distributed Execution (Layers 2-3)*
*Researched: 2026-03-26*
