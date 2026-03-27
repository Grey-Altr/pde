# Roadmap: Platform Development Engine

## Milestones

- ✅ **v0.1 PDE MVP** — Phases 1-11 (shipped 2026-03-15)
- ✅ **v0.2 Design Pipeline** — Phases 12-22 (shipped 2026-03-16)
- ✅ **v0.3 Advanced Design Skills** — Phases 24-28 (shipped 2026-03-17)
- ✅ **v0.4 Self-Improvement & Design Excellence** — Phases 29-38 (shipped 2026-03-18)
- ✅ **v0.5 MCP Integrations** — Phases 39-45 (shipped 2026-03-19)
- ✅ **v0.6 Advanced Workflow Methodology** — Phases 46-53 (shipped 2026-03-20)
- ✅ **v0.7 Pipeline Reliability & Validation** — Phases 54-57 (shipped 2026-03-20)
- ✅ **v0.8 Observability & Event Infrastructure** — Phases 58-63 (shipped 2026-03-20)
- ✅ **v0.9 Google Stitch Integration** — Phases 64-69 (shipped 2026-03-21)
- ✅ **v0.10 Idle Time Productivity** — Phases 70-73 (shipped 2026-03-21)
- ✅ **v0.11 Experience Product Type** — Phases 74-83 (shipped 2026-03-22)
- ✅ **v0.12 Business Product Type** — Phases 84-98 (shipped 2026-03-23)
- ✅ **v0.13 AutoResearch** — Phases 99-107 (shipped 2026-03-23)
- ✅ **v0.14 Visual AutoResearch** — Phases 108-117 (shipped 2026-03-24)
- ✅ **v0.15 Multi-Editor Integration** — Phases 118-125 (shipped 2026-03-24)
- ✅ **v0.16 Multi-Editor Context Sync** — Phases 126-133 (shipped 2026-03-24)
- ✅ **v0.17 Remote Dashboard** — Phases 134-142 (shipped 2026-03-26)
- 🚧 **v0.18 Distributed Execution** — Phases 143-149 (in progress)

## Phases

### v0.18 Distributed Execution (In Progress)

**Milestone Goal:** PDE can dispatch parallel sessions to git worktrees (local and remote), coordinate them with Agent SDK intelligence, and surface all session activity in a unified dashboard — delivering hands-off autonomous execution at scale while the user watches progress from any device.

- [x] **Phase 143: Session Isolation** - Establish atomic worktree lifecycle and single-writer protocol for .planning/ files — correctness prerequisite for all parallel execution (completed 2026-03-26)
- [x] **Phase 144: Local CLI Dispatch** - Spawn, track, merge, and aggregate parallel claude CLI sessions in dedicated worktrees on the local machine (completed 2026-03-26)
- [x] **Phase 145: Agent SDK Orchestrator** - Add in-process reasoning via Agent SDK for DAG analysis, routing decisions, conflict triage, and failure summaries (completed 2026-03-26)
- [x] **Phase 146: Remote Dispatch** - Dispatch autonomous sessions to a configured remote server via SSH or managed backend with git-based state sync (completed 2026-03-27)
- [ ] **Phase 147: Dashboard Integration** - Extend the v0.17 dashboard with multi-session session cards, filter pills, chevron progress, animated progress bars, and responsive action controls
- [ ] **Phase 148: tmux Integration** - Multiplex all active session events into the existing tmux panes with color-prefixed session tags and aggregate cost/token display
- [ ] **Phase 149: Configuration & Commands** - Wire the dispatch config block, session management slash commands, and graceful degradation path

## Phase Details

### Phase 143: Session Isolation
**Goal**: Executor agents can write completion artifacts to session-scoped paths, and the dispatcher can create, merge, and clean up git worktrees without race conditions or orphaned state
**Depends on**: Nothing (first v0.18 phase — builds on v0.17 foundation)
**Requirements**: ISO-01, ISO-02, ISO-03, ISO-04, ISO-05, ISO-06, ISO-07, ISO-08, ISO-09
**Success Criteria** (what must be TRUE):
  1. Running `/gsd:execute-phase` inside a worktree writes a COMPLETE marker and COMPLETED-REQS.md to the phase directory — no writes to shared STATE.md or REQUIREMENTS.md occur during execution
  2. Dispatcher can create a worktree + branch, execute work, merge back to parent with auto-resolve for .planning/ metadata, and remove the worktree — all in sequence without leaving artifacts
  3. PDE startup detects any orphaned worktrees left from a previous crashed session and presents adopt/kill/ignore options before proceeding
  4. `/gsd:sessions reset` kills all active sessions, removes all worktrees, and prunes all associated branches in one command
  5. Post-merge, STATE.md and ROADMAP.md progress are recalculated from disk artifacts — not written during session execution
**Plans**: 3 plans
Plans:
- [x] 143-01-PLAN.md — Dispatcher package scaffold, worktree lifecycle, merge-back with recalculation
- [x] 143-02-PLAN.md — Orphan detection and nuclear reset
- [x] 143-03-PLAN.md — Executor write protocol migration (session-scoped artifacts)

### Phase 144: Local CLI Dispatch
**Goal**: Users can run `/gsd:execute-phase --parallel` or `/gsd:autonomous --parallel` to spawn multiple claude CLI sessions in dedicated worktrees with live tracking, failure preservation, and merge-back on completion
**Depends on**: Phase 143
**Requirements**: DSP-01, DSP-02, DSP-03, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09
**Success Criteria** (what must be TRUE):
  1. `--parallel` flag spawns separate claude CLI processes in individual worktrees; omitting the flag produces identical behavior to today with zero changes
  2. The dispatcher registry (in-memory Map + JSON file) survives a dispatcher crash — on restart, previously tracked sessions are recoverable from .planning/dispatcher.pids
  3. The dispatcher enforces the configured concurrency limit and never assigns the same phase to two concurrent sessions
  4. Failed sessions preserve their worktree intact for debugging; exit code and failure reason are visible in the event stream
  5. One relay daemon per session tags all its events with a session_id, and an aggregator daemon multiplexes all session event streams into one endpoint
**Plans**: 3 plans
Plans:
- [x] 144-01-PLAN.md — Subprocess spawn module and crash-recoverable session registry
- [x] 144-02-PLAN.md — Concurrency queue and NDJSON aggregator
- [x] 144-03-PLAN.md — Coordinator orchestrator and --parallel flag wiring

### Phase 145: Agent SDK Orchestrator
**Goal**: The dispatcher uses the Agent SDK for one-time DAG analysis at dispatch time, interactive vs autonomous session tagging, and failure summarization — replacing hardcoded heuristics with reasoned routing decisions
**Depends on**: Phase 144
**Requirements**: SDK-01, SDK-02, SDK-03, SDK-04, SDK-05
**Success Criteria** (what must be TRUE):
  1. The Agent SDK dependency exists only in packages/dispatcher/package.json — the plugin root (bin/) has zero new npm dependencies
  2. Before dispatching, the orchestrator analyzes ROADMAP.md once to identify parallelizable phases and flags any with overlapping file sets as unsafe to run concurrently
  3. When a session fails, the orchestrator produces a human-readable failure summary from the session's NDJSON tail — visible in the event log without the user digging through raw files
  4. Merge conflict triage assistance is available when auto-resolve fails — the orchestrator surfaces the conflicting files and a suggested resolution strategy
**Plans**: 2 plans
Plans:
- [x] 145-01-PLAN.md — SDK install, ESM bridge, and orchestrator module with all four functions
- [ ] 145-02-PLAN.md — Wire orchestrator into DispatchCoordinator and update package exports

### Phase 146: Remote Dispatch
**Goal**: Autonomous sessions can be routed to a configured remote server via SSH or claude --remote managed backend, with fallback chain to local execution and git-based state sync
**Depends on**: Phase 145
**Requirements**: RMT-01, RMT-02, RMT-03, RMT-04, RMT-05, RMT-06
**Success Criteria** (what must be TRUE):
  1. Dispatcher dispatches an autonomous session to a configured SSH remote host: pushes .planning/ state, executes claude --print in a remote worktree, pulls results back, and merges — without manual user steps
  2. When claude --remote managed backend is available, it is used in preference to SSH; on failure it falls back to SSH, then to local execution
  3. Interactive sessions (containing approval gates) always stay local — only sessions tagged autonomous by the router are eligible for remote dispatch
  4. Remote dispatch configuration (host, repo path, preferred backend) lives in .planning/config.json under a dispatch.remote block
**Plans**: 3 plans
Plans:
- [x] 146-01-PLAN.md — Remote router and managed backend stub (RMT-04, RMT-05, RMT-06)
- [x] 146-02-PLAN.md — SSH remote execution backend (RMT-01, RMT-02, RMT-03)
- [ ] 146-03-PLAN.md — Wire remote dispatch into coordinator and update exports

### Phase 147: Dashboard Integration
**Goal**: The v0.17 dashboard surfaces all active parallel sessions with per-session health, progress, and action controls — responsive across phone, tablet, and laptop
**Depends on**: Phase 144
**Requirements**: DSH-01, DSH-02, DSH-03, DSH-04, DSH-05, DSH-06, DSH-07, DSH-08, DSH-09, DSH-10, DSH-11, DSH-12, DSH-13
**Success Criteria** (what must be TRUE):
  1. The session health matrix shows every active session with status, phase, source (local/remote-ssh/remote-managed), and runtime — updating live without page reload
  2. Users can filter the event log and all dashboard views to a single session or all sessions — the filter persists across tab navigation
  3. Striped animated progress bars communicate session state at a glance: normal speed for executing, slow for waiting, no animation for failed
  4. Failure cards display with Retry and Abandon buttons (44px touch targets); destructive Kill requires an AlertDialog confirmation
  5. On phone, navigation is a bottom tab bar; on tablet, a 2x2 grid; on laptop, the full 7-pane grid — all layouts share keyboard shortcuts on laptop (1-7 pane focus, s/a session cycle, Esc collapse)
**Plans**: 5 plans
Plans:
- [x] 147-01-PLAN.md — Foundation: deps, session_source gap, shared primitives (colors, filter hook, progress variant)
- [ ] 147-02-PLAN.md — Data components: SessionHealthMatrix, AggregateStatusBar, MultiPhaseProgress, ActionChevron
- [ ] 147-03-PLAN.md — Event log multi-session filter, color tags, FailureCard, merge push notifications
- [ ] 147-04-PLAN.md — Responsive PaneGrid layout, extended BottomNav, keyboard shortcuts hook
- [ ] 147-05-PLAN.md — Integration wiring: page assembly, HotkeysProvider, responsive verification checkpoint
**UI hint**: yes

### Phase 148: tmux Integration
**Goal**: The existing tmux dashboard panes consume aggregated multi-session event streams with color-prefixed session tags and per-session [L]/[R] source labels
**Depends on**: Phase 144
**Requirements**: TMX-01, TMX-02, TMX-03, TMX-04, TMX-05
**Success Criteria** (what must be TRUE):
  1. Pane 1 (agent activity) displays all session spawn events with [L] for local and [R] for remote tags so the user can see which machine each session is running on
  2. Pane 4 (log stream) multiplexes all active session output with a distinct color prefix per session — no session's output is lost or mixed with another's
  3. Pane 5 (token/cost) shows aggregate cost across all active sessions and supports cycling to a single-session view with the `s` key
**Plans**: TBD

### Phase 149: Configuration & Commands
**Goal**: Users can configure dispatch behavior in config.json and manage active sessions via slash commands — and disabling dispatch results in exactly the current single-session behavior
**Depends on**: Phase 143
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05
**Success Criteria** (what must be TRUE):
  1. .planning/config.json accepts a dispatch block with enabled, max_local_sessions, max_remote_sessions, remote, and routing fields — schema is documented and validated on load
  2. `/gsd:sessions` lists all active sessions with their phase, status, source, and runtime; `/gsd:sessions stop <id>` stops a specific session cleanly
  3. `/gsd:settings` exposes and allows editing of the dispatch configuration block
  4. Setting dispatch.enabled: false produces zero behavioral difference from the current pre-v0.18 workflow — no extra steps, no new prompts, no changed output
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 143 → 144 → 145 → 146 → 147 → 148 → 149
Note: Phase 147 (Dashboard) and Phase 148 (tmux) both depend on Phase 144 and can execute in parallel after it completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 143. Session Isolation | 3/3 | Complete    | 2026-03-26 |
| 144. Local CLI Dispatch | 3/3 | Complete    | 2026-03-26 |
| 145. Agent SDK Orchestrator | 1/2 | Complete    | 2026-03-26 |
| 146. Remote Dispatch | 2/3 | Complete    | 2026-03-27 |
| 147. Dashboard Integration | 1/5 | In Progress|  |
| 148. tmux Integration | 0/TBD | Not started | - |
| 149. Configuration & Commands | 0/TBD | Not started | - |
