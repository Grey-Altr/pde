---
gsd_state_version: 1.0
milestone: v0.24
milestone_name: Cloud Dispatch & State Sync
status: verifying
stopped_at: Completed 197-01-PLAN.md
last_updated: "2026-03-30T18:35:11.550Z"
last_activity: 2026-03-30
progress:
  total_phases: 29
  completed_phases: 7
  total_plans: 15
  completed_plans: 14
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** Phase 195 — Dashboard Integration

## Current Position

Phase: 197
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-03-30

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Prior milestone reference:**

- v0.23: 5 phases, 9 plans, 15 requirements (1 day)
- v0.22: 9 phases, 18 plans, 58 requirements (1 day)
- v0.21: 5 phases, 12 plans, ~20 requirements (1 day)
- v0.20: 8 phases, 23 plans, 41 requirements (1 day)

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [Roadmap]: Docker before cloud — Docker backend validates the container dispatch interface without OAuth, enabling full test coverage before the harder cloud path
- [Roadmap]: State sync before cloud — cloud VM clones from last pushed commit; stale .planning/ context breaks the milestone's primary value
- [Roadmap]: direction-aware merge — cloud sync uses --theirs for STATE.md, --ours for ROADMAP.md and REQUIREMENTS.md (remote must not mutate planning artifacts)
- [Roadmap]: cloud adapter in packages/ — zero-npm constraint at plugin root; coordinator invokes cloud SDK via spawn, never require()
- [Roadmap]: RemoteAggregator never creates TailCursor for cloud session IDs — prevents ghost cursor accumulation
- [Phase 190]: SessionListItem.source kept as inline union (not importing SessionSource type) to avoid TypeScript/CJS cross-module import chain per research anti-pattern guidance
- [Phase 191]: Docker sessions use TailCursor (not RemoteAggregator): container writes NDJSON to local /tmp/, RemoteAggregator reserved for cloud HTTP push (Phase 193)
- [Phase 192]: CLOUD_THEIRS=[STATE.md], CLOUD_OURS=[ROADMAP.md, REQUIREMENTS.md] — inverted from merge.cjs; cloud executor updates STATE.md but must not override orchestrator-owned planning artifacts
- [Phase 192]: CLOUD_BACKENDS=['docker','ssh','managed','cloud'] defined inline in coordinator dispatch() — no separate constant, matches research Pattern 5
- [Phase 192]: Push after releaseLock in dispatch(): push is a slow network op that must not hold the dispatcher mutex
- [Phase 192]: _handleExit cloud sync failure is non-fatal: session work stays in worktree, session merge recovers it — degraded mode not data loss
- [Phase 193]: cloud routing probe via _detectManaged injection — same managed probe path, cloud is an elevated managed backend
- [Phase 193]: routing_fallback emitted in coordinator (not router) — keeps router pure, router returns backend string only
- [Phase 194]: classify.cjs created in plan 02 (not plan 01) — worktree had no plan 01 artifacts, Rule 3 auto-fix
- [Phase 194]: routing_decision event emitted after classifyResult applied — event reflects final backend not initialBackend from routeSession
- [Phase 195]: stopCloudSession uses HTTP fetch to PDE_DISPATCHER_URL — never process.kill (cloud sessions have no local PID)
- [Phase 195]: infraCostUsdCents computed at ingest time from container_uptime_s using PDE_INFRA_COST_RATE_CENTS_PER_HOUR env var on session_end event
- [Phase 195]: formatCost takes USD float not cents — divide infraCostUsdCents by 100 at all call sites
- [Phase 195]: PaneGrid row 3 backwards-compat: col-span-3 on pane 6 when children[7] absent
- [Phase 196-containerized-mcp-servers]: container block absent from pencil (VS Code managed) and all HTTP/SSE servers; dockerode require() in try/catch; callers pass dockerAvailable boolean explicitly
- [Phase 197]: SHA256-base64url used for >200-char cwd hash suffix in session-persist.cjs (SDK vJ uses base-36 but source unavailable; divergence only affects paths >200 chars sanitized)
- [Phase 197]: restoreSession accepts optional storageSubDir — defaults to sanitizeCwdForProjectDir(resumingCwd); callers can override for cross-host restore where source cwd differs

### Pending Todos

None.

### Blockers/Concerns

- Phase 193 (Cloud Web Backend): claude --remote is research preview; verify claude auth status --output-format json schema and cloud VM GitHub push permissions before Phase 193 planning begins
- Phase 192 (State Sync): OURS_ON_CONFLICT list interaction with cloud sync direction needs explicit test fixture design before implementation

## Session Continuity

Last session: 2026-03-30T18:35:11.547Z
Stopped at: Completed 197-01-PLAN.md
Resume with: /gsd:plan-phase 190
Resume file: None
