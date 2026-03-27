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
- 🚧 **v0.18 Distributed Execution** — Phases 143-153 (in progress)

## Phases

### v0.18 Distributed Execution (In Progress)

**Milestone Goal:** PDE can dispatch parallel sessions to git worktrees (local and remote), coordinate them with Agent SDK intelligence, and surface all session activity in a unified dashboard — delivering hands-off autonomous execution at scale while the user watches progress from any device.

- [x] **Phase 143: Session Isolation** - Establish atomic worktree lifecycle and single-writer protocol for .planning/ files — correctness prerequisite for all parallel execution (completed 2026-03-26)
- [x] **Phase 144: Local CLI Dispatch** - Spawn, track, merge, and aggregate parallel claude CLI sessions in dedicated worktrees on the local machine (completed 2026-03-26)
- [x] **Phase 145: Agent SDK Orchestrator** - Add in-process reasoning via Agent SDK for DAG analysis, routing decisions, conflict triage, and failure summaries (completed 2026-03-26)
- [x] **Phase 146: Remote Dispatch** - Dispatch autonomous sessions to a configured remote server via SSH or managed backend with git-based state sync (completed 2026-03-27)
- [x] **Phase 147: Dashboard Integration** - Extend the v0.17 dashboard with multi-session session cards, filter pills, chevron progress, animated progress bars, and responsive action controls (completed 2026-03-27)
- [x] **Phase 148: tmux Integration** - Multiplex all active session events into the existing tmux panes with color-prefixed session tags and aggregate cost/token display (completed 2026-03-27)
- [x] **Phase 149: Configuration & Commands** - Wire the dispatch config block, session management slash commands, and graceful degradation path (completed 2026-03-27)
- [x] **Phase 150: Dashboard Hardening** - Add auth guard to /api/sessions, wire FailureCard action handlers with server actions, close integration gaps from milestone audit (completed 2026-03-27)
- [x] **Phase 151: Test & Validation Cleanup** - Fix coordinator-smoke Test 7 SDK stubs and complete Phase 149 Nyquist validation (completed 2026-03-27)
- [x] **Phase 152: Parallel Session Relay Wiring** - Launch relay process alongside spawned sessions so dashboard receives parallel session data (completed 2026-03-27)
- [x] **Phase 153: Dashboard Auth UX** - Surface 401 errors in useAllSessions with sign-in redirect instead of blank dashboard (completed 2026-03-27)
- [x] **Phase 154: SSH Source Propagation** - Propagate remote-ssh source through event stream so dashboard shows correct session origin (completed 2026-03-27)
- [ ] **Phase 155: Retry & Documentation Polish** - Disable retry button when unavailable, document PDE_REMOTE env var for dispatcher

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
- [x] 147-02-PLAN.md — Data components: SessionHealthMatrix, AggregateStatusBar, MultiPhaseProgress, ActionChevron
- [x] 147-03-PLAN.md — Event log multi-session filter, color tags, FailureCard, merge push notifications
- [ ] 147-04-PLAN.md — Responsive PaneGrid layout, extended BottomNav, keyboard shortcuts hook
- [x] 147-05-PLAN.md — Integration wiring: page assembly, HotkeysProvider, responsive verification checkpoint
**UI hint**: yes

### Phase 148: tmux Integration
**Goal**: The existing tmux dashboard panes consume aggregated multi-session event streams with color-prefixed session tags and per-session [L]/[R] source labels
**Depends on**: Phase 144
**Requirements**: TMX-01, TMX-02, TMX-03, TMX-04, TMX-05
**Success Criteria** (what must be TRUE):
  1. Pane 1 (agent activity) displays all session spawn events with [L] for local and [R] for remote tags so the user can see which machine each session is running on
  2. Pane 4 (log stream) multiplexes all active session output with a distinct color prefix per session — no session's output is lost or mixed with another's
  3. Pane 5 (token/cost) shows aggregate cost across all active sessions and supports cycling to a single-session view with the `s` key
**Plans**: 3 plans
Plans:
- [x] 148-01-PLAN.md — TmuxFanout module, coordinator wiring, and unit tests
- [x] 148-02-PLAN.md — tmux-cycle-session.cjs helper for session filter cycling
- [x] 148-03-PLAN.md — Upgrade pane scripts (agent activity, log stream, token meter) and monitor-dashboard.sh

### Phase 149: Configuration & Commands
**Goal**: Users can configure dispatch behavior in config.json and manage active sessions via slash commands — and disabling dispatch results in exactly the current single-session behavior
**Depends on**: Phase 143
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05
**Success Criteria** (what must be TRUE):
  1. .planning/config.json accepts a dispatch block with enabled, max_local_sessions, max_remote_sessions, remote, and routing fields — schema is documented and validated on load
  2. `/gsd:sessions` lists all active sessions with their phase, status, source, and runtime; `/gsd:sessions stop <id>` stops a specific session cleanly
  3. `/gsd:settings` exposes and allows editing of the dispatch configuration block
  4. Setting dispatch.enabled: false produces zero behavioral difference from the current pre-v0.18 workflow — no extra steps, no new prompts, no changed output
**Plans**: 3 plans
Plans:
- [x] 149-01-PLAN.md — Config keys extension, dispatch wiring fix, and graceful degradation guards
- [x] 149-02-PLAN.md — Session list/stop subcommands and /pde:sessions command
- [ ] 149-03-PLAN.md — Settings workflow dispatch configuration extension

### Phase 150: Dashboard Hardening
**Goal**: Close integration gaps from milestone audit — add auth to /api/sessions, wire FailureCard action handlers, and fix broken dashboard session action flow
**Depends on**: Phase 147, Phase 144
**Requirements**: HDN-01, HDN-02
**Gap Closure**: Closes INT-01, INT-02, and broken flow "Dashboard session action"
**Success Criteria** (what must be TRUE):
  1. `/api/sessions` route requires Clerk auth — unauthenticated requests receive 401
  2. FailureCard Retry/Abandon/Kill buttons trigger real server actions that interact with the dispatcher SessionRegistry
**Plans**: 1 plan
Plans:
- [x] 150-01-PLAN.md — Auth guard for /api/sessions + FailureCard server actions wiring

### Phase 151: Test & Validation Cleanup
**Goal**: Fix test infrastructure gap and complete Nyquist validation for Phase 149
**Depends on**: Phase 145, Phase 149
**Requirements**: CLN-01, CLN-02
**Gap Closure**: Closes INT-03 and Nyquist gap for Phase 149
**Success Criteria** (what must be TRUE):
  1. coordinator-smoke.test.cjs Test 7 passes with proper SDK stubs injected
  2. Phase 149 VALIDATION.md reaches nyquist_compliant: true
**Plans**: 1 plan
Plans:
- [x] 151-01-PLAN.md — Fix coordinator-smoke Test 7 SDK stubs and finalize Phase 149 VALIDATION.md

### Phase 152: Parallel Session Relay Wiring
**Goal**: Coordinator launches a relay process for each spawned parallel session so the web dashboard receives real-time session data via Redis
**Depends on**: Phase 144, Phase 147
**Requirements**: RLY-01, RLY-02
**Gap Closure**: Closes INT-RELAY and flow "Dashboard monitoring (parallel dispatch)"
**Success Criteria** (what must be TRUE):
  1. Coordinator spawns a relay.cjs child process per dispatched session, tagged with session_id, that POSTs NDJSON events to `/api/ingest`
  2. Dashboard `/api/sessions` returns parallel-dispatched sessions with live status updates from Redis
**Plans**: 1 plan
Plans:
- [x] 152-01-PLAN.md — Relay spawn wiring in coordinator, session-start UUID alignment, and relay lifecycle tests

### Phase 153: Dashboard Auth UX
**Goal**: useAllSessions hook surfaces 401 errors with a redirect to sign-in instead of showing a blank dashboard
**Depends on**: Phase 150
**Requirements**: AUX-01
**Gap Closure**: Closes INT-AUTH-SILENT and flow "Dashboard auth UX"
**Success Criteria** (what must be TRUE):
  1. When `/api/sessions` returns 401, the dashboard redirects to sign-in page instead of rendering empty state
**Plans**: 1 plan
Plans:
- [x] 153-01-PLAN.md — 401 detection in useAllSessions with sign-in redirect

### Phase 154: SSH Source Propagation
**Goal**: SSH-dispatched sessions display correct `source='remote-ssh'` in dashboard instead of defaulting to `'local'`
**Depends on**: Phase 146, Phase 147
**Requirements**: (none — DSH-01, RMT-03 already satisfied; this is correctness polish)
**Gap Closure**: Closes INT-SOURCE and flow "SSH session source display"
**Success Criteria** (what must be TRUE):
  1. SSH-dispatched sessions appear with `source='remote-ssh'` in the session health matrix and event log
  2. Ingest route propagates source field from relay NDJSON events instead of defaulting to `'local'`
**Plans**: 1 plan
Plans:
- [x] 154-01-PLAN.md — SSH source propagation: relayId wiring, PDE_BACKEND envPrefix, emit-event fallback

### Phase 155: Retry & Documentation Polish
**Goal**: Make retry limitation explicit in UI and document PDE_REMOTE env var for operator setup
**Depends on**: Phase 150, Phase 152
**Requirements**: (none — HDN-02, RLY-01, RLY-02 already satisfied; this is UX/doc polish)
**Gap Closure**: Closes INT-RETRY-STUB, INT-PDE-REMOTE-DOC, and flow "User clicks Retry"
**Success Criteria** (what must be TRUE):
  1. Retry button renders disabled with tooltip explaining the limitation when no local dispatcher is available
  2. PDE_REMOTE env var is documented in dispatcher help text and dashboard/.env.example
**Plans**: 0 plans

## Progress

**Execution Order:**
Phases execute in numeric order: 143 → 144 → 145 → 146 → 147 → 148 → 149 → 150 → 151 → 152 → 153 → 154 → 155
Note: Phase 154 and Phase 155 can execute in parallel (independent gap closure phases).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 143. Session Isolation | 3/3 | Complete    | 2026-03-26 |
| 144. Local CLI Dispatch | 3/3 | Complete    | 2026-03-26 |
| 145. Agent SDK Orchestrator | 1/2 | Complete    | 2026-03-26 |
| 146. Remote Dispatch | 2/3 | Complete    | 2026-03-27 |
| 147. Dashboard Integration | 4/5 | Complete    | 2026-03-27 |
| 148. tmux Integration | 3/3 | Complete    | 2026-03-27 |
| 149. Configuration & Commands | 2/3 | Complete    | 2026-03-27 |
| 150. Dashboard Hardening | 1/1 | Complete    | 2026-03-27 |
| 151. Test & Validation Cleanup | 1/1 | Complete    | 2026-03-27 |
| 152. Parallel Session Relay Wiring | 1/1 | Complete    | 2026-03-27 |
| 153. Dashboard Auth UX | 1/1 | Complete    | 2026-03-27 |
| 154. SSH Source Propagation | 1/1 | Complete   | 2026-03-27 |
| 155. Retry & Documentation Polish | 0/0 | Pending | — |
