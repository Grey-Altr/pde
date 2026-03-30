# Requirements: PDE v0.24 Cloud Dispatch & State Sync

**Defined:** 2026-03-30
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.24 Requirements

Requirements for Cloud Dispatch & State Sync. Each maps to roadmap phases.

### Cloud Dispatch

- [ ] **CLD-01**: User can dispatch an autonomous phase to an ephemeral cloud container via Agent SDK
- [ ] **CLD-02**: Cloud container is automatically torn down on task completion with configurable idle timeout
- [ ] **CLD-03**: Cloud session emits NDJSON events consumable by existing event bus infrastructure
- [ ] **CLD-04**: User can dispatch a plan to a local Docker container via dockerode with NDJSON stdout relay
- [ ] **CLD-05**: Docker container dispatch mirrors spawn.cjs interface (onLine/onExit callbacks, same NDJSON format)
- [x] **CLD-06**: Cloud adapter package lives in isolated `packages/cloud-adapter/` respecting zero-npm root constraint
- [ ] **CLD-07**: Graceful fallback chain: cloud → SSH → local with same degradation UX as v0.18 SSH fallback
- [ ] **CLD-08**: Cloud session auth uses claude.ai OAuth (not ANTHROPIC_API_KEY), with probe before dispatch

### State Sync

- [ ] **SYN-01**: Cloud container pushes .planning/ changes to a remote git branch on task completion
- [ ] **SYN-02**: Local orchestrator merges cloud branch using 3-way merge (v0.16 engine)
- [ ] **SYN-03**: Merge direction is cloud-to-local aware (not --ours for STATE.md on inbound sync)
- [ ] **SYN-04**: Concurrent cloud sessions push to separate branches with sequential merge ordering
- [ ] **SYN-05**: Agent SDK session .jsonl files can be persisted to shared storage for cross-host resume
- [ ] **SYN-06**: Session resume on different host uses matching cwd encoding for session portability
- [ ] **SYN-07**: simple-git integration in isolated `packages/` directory for git sync operations

### Intelligent Routing

- [ ] **RTG-01**: User can manually set dispatch target via `--dispatch=cloud|local|ssh|docker` flag
- [ ] **RTG-02**: Auto-classify tasks as interactive/autonomous from PLAN.md metadata (agent_type, estimated_minutes)
- [ ] **RTG-03**: User can override auto-classification for any plan or phase
- [ ] **RTG-04**: Cost-aware routing respects user-configured cost ceiling per dispatch target
- [ ] **RTG-05**: Routing decision is logged as a structured event for observability
- [ ] **RTG-06**: Fast-path commands (/pde:quick, /pde:fast) always route to local regardless of config

### Dashboard Integration

- [ ] **DSH-01**: Cloud sessions appear in dashboard health matrix with [C] source label
- [ ] **DSH-02**: Cloud session progress bars and agent activity display using CloudPoller synthetic events
- [ ] **DSH-03**: User can start, stop, and inspect cloud sessions from dashboard UI
- [ ] **DSH-04**: Sync state display shows pending merges, last sync time, and conflict indicators
- [ ] **DSH-05**: Container cost tracking shows uptime × rate alongside token cost in Token Playground
- [ ] **DSH-06**: session_source union type extended with 'remote-cloud' and 'docker' values

### Infrastructure

- [x] **INF-01**: lock.cjs extended with cloud-aware PID handling (no process.kill for cloud sessions)
- [x] **INF-02**: aggregator.cjs uses RemoteAggregator for cloud sessions instead of file-based TailCursor
- [ ] **INF-03**: SessionSource registry enum extended for cloud and docker dispatch types
- [ ] **INF-04**: Containerized MCP servers wrap APPROVED_SERVERS in per-server Docker containers with pinned runtimes
- [ ] **INF-05**: MCP probe/degrade contracts extended for container startup latency
- [x] **INF-06**: Dispatch configuration block extended with cloud and docker settings

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Deploy Sandbox

- **DPL-01**: Stage 14 deploy workflow runs in ephemeral Docker container with scoped credentials
- **DPL-02**: Deploy sandbox uses deploy-staging/ directory isolation (v0.12) as volume mount

### AutoResearch Container

- **ARC-01**: Visual metric scripts (_evalMetric) run in pinned Playwright container for reproducibility
- **ARC-02**: Visual regression circuit breaker (v0.14) produces consistent deltas across environments

### Multi-Provider

- **MPR-01**: Second cloud provider adapter (E2B or Modal) when user demand validates it

## Out of Scope

| Feature | Reason |
|---------|--------|
| Always-cloud by default | Adds container startup latency to every task; kills event bus locality |
| Real-time filesystem sync | Network volume mounts introduce race conditions; git boundary sync is sufficient |
| Kubernetes orchestration | PDE is a dev tool, not multi-tenant SaaS; K8s ops burden exceeds concurrency needs |
| Multi-provider abstraction layer | Start with one provider; abstraction layer becomes maintenance burden |
| Stateless cloud agents | Disconnects cloud execution from PDE planning state machine |
| Container for every PDE operation | Skill authoring and planning are pure file I/O; containerizing adds overhead with no benefit |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLD-01 | Phase 193 | Pending |
| CLD-02 | Phase 193 | Pending |
| CLD-03 | Phase 191 | Pending |
| CLD-04 | Phase 191 | Pending |
| CLD-05 | Phase 191 | Pending |
| CLD-06 | Phase 190 | Complete |
| CLD-07 | Phase 193 | Pending |
| CLD-08 | Phase 193 | Pending |
| SYN-01 | Phase 192 | Pending |
| SYN-02 | Phase 192 | Pending |
| SYN-03 | Phase 192 | Pending |
| SYN-04 | Phase 192 | Pending |
| SYN-05 | Phase 197 | Pending |
| SYN-06 | Phase 197 | Pending |
| SYN-07 | Phase 192 | Pending |
| RTG-01 | Phase 194 | Pending |
| RTG-02 | Phase 194 | Pending |
| RTG-03 | Phase 194 | Pending |
| RTG-04 | Phase 194 | Pending |
| RTG-05 | Phase 194 | Pending |
| RTG-06 | Phase 194 | Pending |
| DSH-01 | Phase 195 | Pending |
| DSH-02 | Phase 195 | Pending |
| DSH-03 | Phase 195 | Pending |
| DSH-04 | Phase 195 | Pending |
| DSH-05 | Phase 195 | Pending |
| DSH-06 | Phase 195 | Pending |
| INF-01 | Phase 190 | Complete |
| INF-02 | Phase 190 | Complete |
| INF-03 | Phase 190 | Pending |
| INF-04 | Phase 196 | Pending |
| INF-05 | Phase 196 | Pending |
| INF-06 | Phase 190 | Complete |

**Coverage:**
- v0.24 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 — traceability updated after roadmap creation*
