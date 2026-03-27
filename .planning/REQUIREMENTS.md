# Requirements: Platform Development Engine

**Defined:** 2026-03-26
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.18 Requirements

Requirements for Distributed Execution milestone. Each maps to roadmap phases.

### Session Isolation

- [x] **ISO-01**: Dispatcher can create a git worktree with dedicated branch for a new session
- [x] **ISO-02**: Dispatcher can merge a completed session branch back to parent with auto-resolve for .planning/ metadata
- [x] **ISO-03**: Dispatcher can clean up worktrees and branches after successful merge
- [x] **ISO-04**: Orphaned sessions detected on PDE startup with adopt/kill/ignore options
- [x] **ISO-05**: Nuclear reset command kills all sessions, removes all worktrees, prunes all branches
- [x] **ISO-06**: Executor agents write completion markers to phase directory instead of STATE.md
- [x] **ISO-07**: Executor agents write phase-local COMPLETED-REQS.md instead of REQUIREMENTS.md
- [x] **ISO-08**: Executor agents write session-scoped agent-memory files instead of shared memories.md
- [x] **ISO-09**: Dispatcher recalculates STATE.md, ROADMAP.md progress, and REQUIREMENTS.md from disk post-merge

### Local Dispatch

- [x] **DSP-01**: Dispatcher spawns `claude` CLI subprocesses in worktrees with session-scoped env vars
- [x] **DSP-02**: Dispatcher tracks active sessions in registry (Map + JSON file for crash recovery)
- [x] **DSP-03**: Dispatcher detects session completion/failure via exit codes
- [x] **DSP-04**: `--parallel` flag on execute-phase enables dispatcher (opt-in, zero change without flag)
- [x] **DSP-05**: `--parallel` flag on autonomous enables phase-level + plan-level parallelism
- [x] **DSP-06**: Dispatcher enforces concurrency limit (configurable, default 3)
- [x] **DSP-07**: Dispatcher never assigns same phase to two concurrent sessions
- [x] **DSP-08**: One relay daemon per session streams events to dashboard
- [x] **DSP-09**: Failed sessions preserve worktree for debugging

### Agent SDK Orchestration

- [x] **SDK-01**: Agent SDK installed in packages/dispatcher/ (isolated subdirectory, plugin root stays zero-dep)
- [x] **SDK-02**: Agent SDK analyzes ROADMAP.md to build dependency DAG and identify parallelizable phases
- [x] **SDK-03**: Agent SDK performs static file-overlap analysis on PLAN.md to prevent source code conflicts
- [x] **SDK-04**: Agent SDK generates failure summaries from session NDJSON tail
- [x] **SDK-05**: Agent SDK assists with merge conflict resolution when auto-resolve fails

### Remote Dispatch

- [x] **RMT-01**: SSH backend dispatches sessions to configured remote server
- [x] **RMT-02**: Remote sessions use git push/pull for .planning/ state sync
- [x] **RMT-03**: Remote sessions run relay daemon for real-time event streaming to dashboard
- [x] **RMT-04**: Managed backend (`claude --remote`) dispatches when available, falls back to SSH
- [x] **RMT-05**: Dispatcher routes autonomous work to remote, interactive work stays local
- [x] **RMT-06**: Remote dispatch configurable in .planning/config.json (host, repo_path, preferred backend)

### Dashboard

- [x] **DSH-01**: Session health matrix shows all active sessions with status, phase, source, runtime
- [x] **DSH-02**: Event log supports filtering by individual session or all sessions
- [x] **DSH-03**: Color-coded session tags distinguish events from different sessions
- [x] **DSH-04**: Multi-phase progress view with one progress bar per active phase
- [x] **DSH-05**: Aggregate status bar shows active count, queued count, total cost
- [x] **DSH-06**: Failure cards with retry/abandon buttons (touch-friendly, 44px targets)
- [x] **DSH-07**: Merge notifications via Web Push
- [x] **DSH-08**: Tiered action chevron showing current + last two state transitions per session
- [x] **DSH-09**: Striped animated progress bars (speed-as-signal: normal=executing, slow=waiting, none=failed)
- [x] **DSH-10**: Actions render as buttons on phone/tablet, buttons+commands on laptop
- [x] **DSH-11**: Responsive pane navigation (tab bar on phone, 2x2 grid on tablet, full grid on laptop)
- [x] **DSH-12**: Persistent session filter across all tabs
- [x] **DSH-13**: Keyboard shortcuts on laptop (1-7 pane focus, s/a session cycle, f expand, Esc collapse)

### tmux Integration

- [x] **TMX-01**: Dispatcher writes aggregated NDJSON for multi-session tmux pane consumption
- [x] **TMX-02**: Pane 1 (agent activity) shows all session spawns with [L]/[R] tags
- [x] **TMX-03**: Pane 4 (log stream) multiplexes all active sessions with color prefix
- [x] **TMX-04**: Pane 5 (token/cost) shows aggregate across all sessions
- [x] **TMX-05**: Session switching via `s` key (cycle) and `a` key (all)

### Configuration

- [x] **CFG-01**: New `dispatch` config block with enabled, max_local_sessions, max_remote_sessions, remote, routing fields
- [x] **CFG-02**: `/gsd:sessions` command lists active sessions
- [x] **CFG-03**: `/gsd:sessions stop <id>` stops a specific session
- [x] **CFG-04**: `/gsd:settings` exposes dispatch configuration
- [x] **CFG-05**: Graceful degradation: dispatch disabled = exact current behavior

### Dashboard Hardening (Gap Closure)

- [x] **HDN-01**: `/api/sessions` route requires Clerk authentication — unauthenticated requests return 401
- [x] **HDN-02**: FailureCard Retry/Abandon/Kill buttons trigger server actions that interact with dispatcher SessionRegistry

### Test & Validation Cleanup (Gap Closure)

- [x] **CLN-01**: coordinator-smoke.test.cjs Test 7 passes with analyzeDag and routeSession stubs injected into makeCoordWithDeps
- [x] **CLN-02**: Phase 149 VALIDATION.md reaches nyquist_compliant: true with wave_0_complete: true

### Parallel Session Relay Wiring (Gap Closure)

- [x] **RLY-01**: Coordinator spawns a relay.cjs child process per dispatched session tagged with session_id that POSTs NDJSON events to /api/ingest
- [x] **RLY-02**: Dashboard /api/sessions returns parallel-dispatched sessions with live status updates from Redis

### Dashboard Auth UX (Gap Closure)

- [ ] **AUX-01**: When /api/sessions returns 401, dashboard redirects to sign-in page instead of rendering empty state

## Future Requirements

Deferred to future release.

### Cost Controls

- **COST-01**: Per-session token budget with enforcement
- **COST-02**: Aggregate spend cap across all sessions
- **COST-03**: Cost dashboard with historical trends

### Multi-User

- **TEAM-01**: Scoped short-lived tokens per execution
- **TEAM-02**: Audit log of all dispatch/merge actions
- **TEAM-03**: Multi-user session claiming

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native Claude Code Agent Teams | Experimental, no session resumption, no worktree isolation — PDE's pattern is sounder |
| Shared .planning/ state during parallel execution | Creates race conditions by definition — violates isolation model |
| Auto-resolve source code conflicts silently | User trust requires visibility for code conflicts; .planning/ auto-resolve is sufficient |
| Real-time cross-session state sharing | Coupling defeats isolation purpose; coordinate at dispatch and merge only |
| Native iOS app | PWA covers mobile; revisit in future milestone |
| Running full PDE plugin in cloud | That's v1.0 Standalone CLI |
| Multi-user collaboration | Single-user trust model for v0.18 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ISO-01 | Phase 143 | Complete |
| ISO-02 | Phase 143 | Complete |
| ISO-03 | Phase 143 | Complete |
| ISO-04 | Phase 143 | Complete |
| ISO-05 | Phase 143 | Complete |
| ISO-06 | Phase 143 | Complete |
| ISO-07 | Phase 143 | Complete |
| ISO-08 | Phase 143 | Complete |
| ISO-09 | Phase 143 | Complete |
| DSP-01 | Phase 144 | Complete |
| DSP-02 | Phase 144 | Complete |
| DSP-03 | Phase 144 | Complete |
| DSP-04 | Phase 144 | Complete |
| DSP-05 | Phase 144 | Complete |
| DSP-06 | Phase 144 | Complete |
| DSP-07 | Phase 144 | Complete |
| DSP-08 | Phase 144 | Complete |
| DSP-09 | Phase 144 | Complete |
| SDK-01 | Phase 145 | Complete |
| SDK-02 | Phase 145 | Complete |
| SDK-03 | Phase 145 | Complete |
| SDK-04 | Phase 145 | Complete |
| SDK-05 | Phase 145 | Complete |
| RMT-01 | Phase 146 | Complete |
| RMT-02 | Phase 146 | Complete |
| RMT-03 | Phase 146 | Complete |
| RMT-04 | Phase 146 | Complete |
| RMT-05 | Phase 146 | Complete |
| RMT-06 | Phase 146 | Complete |
| DSH-01 | Phase 147 | Complete |
| DSH-02 | Phase 147 | Complete |
| DSH-03 | Phase 147 | Complete |
| DSH-04 | Phase 147 | Complete |
| DSH-05 | Phase 147 | Complete |
| DSH-06 | Phase 147 | Complete |
| DSH-07 | Phase 147 | Complete |
| DSH-08 | Phase 147 | Complete |
| DSH-09 | Phase 147 | Complete |
| DSH-10 | Phase 147 | Complete |
| DSH-11 | Phase 147 | Complete |
| DSH-12 | Phase 147 | Complete |
| DSH-13 | Phase 147 | Complete |
| TMX-01 | Phase 148 | Complete |
| TMX-02 | Phase 148 | Complete |
| TMX-03 | Phase 148 | Complete |
| TMX-04 | Phase 148 | Complete |
| TMX-05 | Phase 148 | Complete |
| CFG-01 | Phase 149 | Complete |
| CFG-02 | Phase 149 | Complete |
| CFG-03 | Phase 149 | Complete |
| CFG-04 | Phase 149 | Complete |
| CFG-05 | Phase 149 | Complete |

| HDN-01 | Phase 150 | Complete |
| HDN-02 | Phase 150 | Complete |
| CLN-01 | Phase 151 | Complete |
| CLN-02 | Phase 151 | Complete |
| RLY-01 | Phase 152 | Complete |
| RLY-02 | Phase 152 | Complete |
| AUX-01 | Phase 153 | Pending |

**Coverage:**
- v0.18 requirements: 54 total (47 original + 7 gap closure)
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 — traceability mapped after roadmap creation*
