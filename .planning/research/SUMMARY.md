# Project Research Summary

**Project:** PDE v0.18 — Distributed Execution (Layers 2-3)
**Domain:** Distributed task execution — git worktree session isolation, CLI subprocess orchestration, multi-session monitoring, remote dispatch
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

PDE v0.18 adds two layers of distributed execution to an established single-session CLI orchestration tool: Layer 2 (local parallel session dispatch via git worktrees) and Layer 3 (remote dispatch over SSH and managed endpoints). The ecosystem has converged on git worktrees as the standard session isolation primitive for parallel AI coding agents in 2026, validated by ccswarm, Mux, Anthropic's own Agent Teams feature, and community tooling. PDE's architecture is more controlled than Claude Code's native Agent Teams (experimental, no session resumption, no nested teams) and more observable than generic CLI parallel tools. The single biggest architectural constraint — placing all new code in a new packages/dispatcher/ package rather than the plugin root — is non-negotiable: the plugin root is zero-npm-dependency by design, and that constraint must not be violated.

The recommended approach is a five-phase build sequence that maps directly to the feature dependency graph: Session Isolation first (worktree lifecycle, completion marker protocol, executor agent migration), then Local CLI Dispatch (spawn, merge, aggregation), then Agent SDK Orchestrator (DAG analysis, routing intelligence), then Remote Dispatch (SSH + managed backend), then Dashboard Integration (additive UI on top of proven data). This order is enforced by hard dependencies — you cannot safely dispatch CLI sessions until worktrees are atomic, cannot route intelligently until dispatch is proven, cannot dispatch remotely until routing tags sessions correctly, and cannot build the dashboard correctly until real session_id-tagged events exist to test against.

The highest risk in this milestone is not the new code — it is the migration of existing executor agents away from direct STATE.md/ROADMAP.md writes. Every parallel execution path breaks if even a single existing workflow still writes to shared planning files directly. The STATE.md single-writer invariant (dispatcher post-merge only, never inside a session) must be enforced and verified with Nyquist tests before any parallel session is spawned. Secondary risks are worktree bootstrap atomicity (partial failures leave permanent orphans), git index lock contention (concurrent dispatcher + session git operations on shared repo objects), and SSE connection explosion in the dashboard (one connection per session defeats the browser 6-connection limit).

## Key Findings

### Recommended Stack

The packages/dispatcher/ package is CJS Node.js with exactly one external npm dependency: @anthropic-ai/claude-agent-sdk ^0.2.84. All other dispatcher functionality (subprocess spawning, worktree operations, lock files, session monitoring) is covered by Node.js built-ins (node:child_process, node:fs, node:path, node:os, node:timers). No TypeScript, no build step — plain .cjs files matching the existing relay.cjs and plugin root patterns. The Agent SDK is used strictly for lightweight reasoning (DAG analysis, routing decisions, merge triage, summarization) and never for work that writes files. All file-writing work goes to claude --print CLI subprocesses in dedicated worktrees.

**Core technologies:**
- @anthropic-ai/claude-agent-sdk ^0.2.84: In-process reasoning tier — dependency DAG analysis, routing decisions, merge conflict triage, progress summarization. persistSession: false, maxTurns: 3-5, allowedTools: [] for analysis calls. The only external dep in the entire new package.
- node:child_process (spawn, execFile): CLI subprocess spawning for heavyweight work; all git/SSH calls. spawn with detached: true + .unref() for fire-and-forget sessions. execFile (not exec) for all git and SSH to prevent shell injection.
- node:fs / node:fs/promises: Lock file creation (O_EXCL atomic), session registry persistence, NDJSON archival, completion marker reads.
- Existing relay.cjs + NDJSON event bus: Zero changes to wire protocol. extensions field absorbs new session_id enrichment. One relay daemon per session, aggregated to a single multiplexed endpoint by aggregator.cjs.
- Existing Next.js 16 dashboard: Additive UI only — new session cards, filter pills, chevron progress, action buttons. No infrastructure changes. No new npm deps in dashboard/.

**Critical version constraint:** @anthropic-ai/claude-agent-sdk ^0.2.84 requires Node.js 18.0.0+. The bypassPermissions + allowDangerouslySkipPermissions: true pair is required for headless operation — both fields must be set together.

### Expected Features

**Must have (table stakes — Layer 2 launch):**
- Git worktree per session — universal isolation primitive; anything less causes file conflicts
- Session lifecycle management (spawn/track/complete/cleanup) — users need confidence nothing leaks
- Exit code detection and failure surfacing — silent crashes are unrecoverable
- --parallel opt-in flag — existing sequential flow must be completely untouched without the flag
- Session-scoped event tagging — events from parallel sessions must be distinguishable in the dashboard
- Orphan detection on startup — detached processes surviving dispatcher crash are a hazard
- Nuclear reset command (/gsd:sessions reset) — escape hatch when parallel execution goes wrong
- Non-overlapping phase assignment — dispatching the same phase twice is a correctness violation
- Zero merge conflict guarantee for .planning/ files — single-writer pattern via completion markers
- Graceful degradation when dispatch.enabled: false — zero behavioral change from today

**Should have (competitive differentiators):**
- Two-tier execution routing (CLI for work, Agent SDK for orchestration) — cost-optimized; routing stays in-process
- Static file analysis at dispatch — detect file overlap before execution, not at merge time
- Interactive vs autonomous routing — sessions with approval gates stay local; autonomous route to remote
- SSH remote dispatch with fallback chain (managed to SSH to local) — Layer 3 value
- Tiered chevron progress per session card and striped animated progress bars — at-a-glance session health
- Failure preservation with Agent SDK summary — preserved worktree + human-readable failure explanation
- Session context window utilization per session — visible in dashboard per-session; no other tool shows this

**Defer (v2+):**
- Cost controls and spend caps — requires accurate token counting and API integration; placeholder only in v0.18
- Cross-session state sharing during execution — distributed consensus problem; defeats isolation purpose
- Nested dispatcher (remote spawning local sessions) — full distributed systems scope; out of v0.18

### Architecture Approach

The system adds one new package (packages/dispatcher/) as a sibling to the existing packages/pde-mcp-server/. The dispatcher is the only component that coordinates parallel work; the plugin root (bin/) invokes it via require('../../packages/dispatcher/index.cjs') and has no knowledge of internal dispatcher modules. This boundary is enforced by the zero-dep constraint on the plugin root. Existing infrastructure — relay.cjs, event-bus.cjs, relay-protocol.cjs — is completely unchanged. The dashboard receives additive UI components only.

**Major components:**
1. packages/dispatcher/lib/worktree.cjs — atomic addWorktree() / removeWorktree() / listOrphans(); .sessions/ gitignored; rollback on partial failure
2. packages/dispatcher/lib/registry.cjs — in-memory SessionRegistry with concurrency cap enforcement; persisted to .planning/dispatcher.pids for crash recovery
3. packages/dispatcher/lib/session.cjs — spawnSession() via claude --print with detached: true + .unref(); PID tracked in registry
4. packages/dispatcher/lib/merge.cjs — post-session git merge + auto-resolve strategies for .planning/ files; flags any STATE.md writes from inside sessions
5. packages/dispatcher/lib/orchestrator.cjs — Agent SDK calls: analyzeDag(), routingDecision(), summarize() — one-time at dispatch start, never on polling schedule
6. packages/dispatcher/lib/router.cjs — route each unit: local CLI | remote managed | remote SSH; uses autonomy tag from PLAN.md checkpoint field
7. packages/dispatcher/lib/remote.cjs — fallbackChain(): tryManaged() to trySSH() to local; git push/fetch/pull round-trip for state sync
8. packages/dispatcher/lib/aggregator.cjs — MuxAggregator: tails N session NDJSON files into one multiplexed dispatch NDJSON; pane scripts use PDE_NDJSON_PATH override
9. packages/dispatcher/lib/lock.cjs — dispatcher.lock with PID + UUID token + heartbeat sentinel; prevents PID-recycling false locks
10. Executor agents (agents/executor.md) — MODIFIED: write COMPLETE marker + COMPLETED-REQS.md instead of updating STATE.md/REQUIREMENTS.md inline

### Critical Pitfalls

1. **Worktree bootstrap leak on partial failure** — git worktree add succeeds, then relay spawn or registry write fails; orphaned directory permanently blocks the same session path on future runs. Prevent with atomic try/finally bootstrap: run git worktree remove --force on any exception before registry write succeeds.

2. **STATE.md / ROADMAP.md write-back race** — Existing executor agents write to STATE.md inline; this behavior is deeply embedded and easy to miss in partial migrations. Two sessions modifying STATE.md concurrently produces unreliable three-way merges. Audit ALL write paths (including error handlers), add a PostToolUse hook that fires on STATE.md writes inside sessions, and verify via Nyquist test that session branches contain no STATE.md diff.

3. **Orphaned detached processes after dispatcher death** — detached: true + unref() means SIGTERM to the dispatcher does not kill child sessions. Prevent by writing all child PIDs to .planning/dispatcher.pids, sending process.kill(-child.pid, 'SIGTERM') on graceful shutdown, and enforcing a max_session_duration hard timeout.

4. **Shared git index lock contention** — Worktrees share the main repo's .git/objects/ pack database and config lock. Concurrent dispatcher + session git operations produce fatal: Unable to create '.../.lock' errors. Prevent by serializing all dispatcher-level git operations through an async queue with exponential backoff.

5. **Dashboard SSE connection count explosion** — One SSE per session hits the browser 6-connection HTTP/1.1 limit at 7+ sessions; some sessions appear offline. Prevent with MuxAggregator single multiplexed endpoint — dashboard subscribes to ONE SSE connection and filters by session_id tag.

## Implications for Roadmap

The build sequence is determined by hard feature dependencies. The five-phase order below is fixed — each phase is a prerequisite for the next.

### Phase 1: Session Isolation (Foundation)
**Rationale:** Nothing works without atomic worktree lifecycle and the single-writer protocol for shared planning files. This phase eliminates the two highest-severity pitfalls before any parallel execution is attempted. Executor agent migration (stop writing STATE.md inline) must land here — it is a cross-cutting change that is harder to retrofit later and correctness-blocking for all subsequent phases.
**Delivers:** worktree.cjs, registry.cjs, lock.cjs, orphan detection on startup, .sessions/ gitignore, completion marker protocol (COMPLETE file + COMPLETED-REQS.md + memories-{id}.md), executor agent write protocol migration away from inline STATE.md/REQUIREMENTS.md writes.
**Addresses:** Git worktree per session, orphan detection, zero merge conflict guarantee (infrastructure), nuclear reset (foundation).
**Avoids:** Pitfall 1 (worktree bootstrap leak), Pitfall 2 (STATE.md write-back race), Pitfall 3 (orphaned processes — foundation), Pitfall 7 (relay event loss — local archival path).
**Research flag:** Standard patterns. No research-phase needed. One verification task: confirm March 2026 --worktree skills-loading fix is present in installed Claude Code version before Phase 1 execution.

### Phase 2: Local CLI Dispatch
**Rationale:** Core value delivery. Proves the parallel execution pattern with real sessions before adding Agent SDK complexity or network risk. Merge strategies and event aggregation can be validated against actual parallel runs in isolation.
**Delivers:** session.cjs, merge.cjs, aggregator.cjs, --parallel opt-in flag on /gsd:execute-phase, dispatch.enabled and dispatch.max_local_sessions config keys, pane script PDE_NDJSON_PATH override, package-lock.json and build artifact conflict blocklist.
**Addresses:** CLI subprocess spawning, exit code detection, dispatcher events in event bus, session-scoped event tagging, non-overlapping phase assignment, graceful degradation when disabled.
**Avoids:** Pitfall 3 (shared git index lock — async queue for dispatcher git ops), Pitfall 5 (static analysis missing runtime paths — blocklist for package-lock.json and build artifacts), Pitfall 8 (dispatcher lock stale PID — sentinel heartbeat), Pitfall 11 (PLAN.md file list as soft not hard lock — actual git diff check at merge time).
**Research flag:** Standard patterns. No research-phase needed.

### Phase 3: Agent SDK Orchestrator
**Rationale:** Replaces hardcoded parallelism heuristics from Phase 2 with proper dependency analysis. Phase 2 shipped something real; Phase 3 makes it smarter. The Agent SDK enters the codebase here — isolated to packages/dispatcher/package.json only.
**Delivers:** orchestrator.cjs, router.cjs, packages/dispatcher/package.json with @anthropic-ai/claude-agent-sdk, DAG analysis replacing parallelism heuristics, interactive vs autonomous session tagging, failure retry with backoff, circuit breaker on multiple session failures, pde-dispatcher and pde-merge-resolver model profile entries.
**Addresses:** Two-tier execution routing, interactive vs autonomous routing, static file analysis at dispatch, failure preservation with Agent SDK summary.
**Avoids:** Pitfall 12 (Agent SDK token cost explosion — one-time DAG analysis per dispatch, not polling; session health via PID checks only).
**Research flag:** Agent SDK query() API patterns are verified against official docs. No research-phase needed. Watch: DAG analysis token cost must be logged from day one; alert if any single orchestration run exceeds 5k tokens.

### Phase 4: Remote Dispatch
**Rationale:** Highest-risk layer. Built after local dispatch is proven so session lifecycle, merge strategies, and aggregation patterns are all validated before adding network complexity. Interactive vs autonomous routing tag (Phase 3) is required before remote dispatch is meaningful.
**Delivers:** remote.cjs, SSH dispatch round-trip (git push to SSH exec to git pull), claude --remote managed backend, fallback chain (managed to SSH to local), dispatch.remote.* config keys, /gsd:autonomous --parallel command, relay.cjs on remote machine via PDE_REMOTE env var, SSH failure fallback to local.
**Addresses:** Tiered remote dispatch with fallback, remote relay integration.
**Avoids:** Pitfall 6 (SSH round-trip state divergence — record spawn-time commit hash; union strategy for REQUIREMENTS.md), SSH credentials in config.json (verify .planning/config.json is in .gitignore before writing remote config docs), SSH push/fetch race (3s delay + retry loop between push and SSH fetch).
**Research flag:** Needs /gsd:research-phase. claude --remote managed backend stability and API surface need verification before building tryManaged(). SSH failure mode coverage under concurrent load is less documented than local patterns.

### Phase 5: Dashboard Integration
**Rationale:** Purely additive on top of v0.17 UI. Requires real session_id-tagged event data from Phases 2+ to test correctly. Building last means the data contract (wire envelope, session_id, source_tag) is stable and visual work is not chasing a moving target.
**Delivers:** Multi-session session cards with source tag chips (local / remote-managed / remote-ssh), session filter pill (persistent, localStorage), tiered action chevron, striped animated progress bars, dispatch action buttons (Stop, Retry, Merge Now, Abandon, Reset All), new API routes (/api/sessions CRUD), mobile tab bar (Sessions / Progress / Events / Cost), responsive layout (phone tab bar, tablet 2x2, laptop 7-pane).
**Addresses:** Session status in dashboard, aggregate multi-session progress view, session context window bars, tiered chevron progress per session card, merge notifications.
**Avoids:** Pitfall 10 (SSE connection explosion — single SSE to multiplexed endpoint; session_id filtering in client), UX pitfalls (destructive kill requires confirmation AlertDialog; merge conflict card shows files + diff button + git command + escape hatch; Events tab defaults to most recent session not All).
**Research flag:** Standard Next.js + Tailwind CSS patterns. No research-phase needed. Test explicitly with 3+ concurrent sessions in browser before shipping.

### Phase Ordering Rationale

- **Session Isolation before everything:** The atomic worktree bootstrap and single-writer migration are correctness prerequisites. A single surviving executor write path corrupts all parallel state.
- **Local CLI Dispatch before Agent SDK:** Proves the parallel execution model with no reasoning overhead. Makes Agent SDK a progressive enhancement, not a foundation dependency.
- **Agent SDK before Remote Dispatch:** The interactive vs autonomous routing tag produced by the orchestrator is required before remote dispatch is meaningful — you cannot safely route to remote without knowing a session has no approval gates.
- **Remote Dispatch after local is proven:** SSH + git sync adds failure modes that are much harder to debug when session lifecycle and merge strategies are still being validated locally.
- **Dashboard last:** Visual work against a stable, known data contract is predictable and requires no rework. The existing v0.17 dashboard continues to work correctly throughout all prior phases.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Remote Dispatch):** claude --remote managed backend stability and API surface need verification before building tryManaged(). SSH failure mode coverage under concurrent load is less documented. Recommend /gsd:research-phase before Phase 4 planning.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Session Isolation):** Git worktree lifecycle and atomic lock file patterns are well-documented. One pre-execution verification: confirm March 2026 --worktree skills-loading fix is present.
- **Phase 2 (Local CLI Dispatch):** Node.js subprocess management and git merge strategies are well-documented. Package-lock conflict blocklist is a known pattern.
- **Phase 3 (Agent SDK Orchestrator):** Official Agent SDK docs verified. Token cost logging needed but not a research-phase blocker.
- **Phase 5 (Dashboard Integration):** Standard Next.js + Tailwind patterns. No novel infrastructure.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Agent SDK verified against official Anthropic docs 2026-03-26. All Node.js built-ins verified against official Node.js docs. Package versions confirmed on npm. |
| Features | HIGH | Core patterns verified against official Claude Code docs and real-world parallel agent tools (ccswarm, Mux, Agent Teams limitations). MVP feature set derived from the approved design spec (primary source). |
| Architecture | HIGH | Derived directly from the approved docs/superpowers/specs/2026-03-26-distributed-execution-design.md and verified against the existing codebase (relay.cjs, event-bus.cjs, config.cjs, model-profiles.cjs inspected directly). |
| Pitfalls | HIGH | Patterns verified across Node.js process management docs, git worktree real-world issue threads (opencode/claude-code GitHub issues), Upstash scaling docs, and multi-agent community reports. |

**Overall confidence:** HIGH

### Gaps to Address

- **claude --remote managed backend:** The managed dispatch path (tryManaged()) depends on claude --remote being stable and its API surface being fully specified. Marked MEDIUM confidence in features research. Validate before Phase 4 planning begins.
- **March 2026 worktree skills-loading fix:** ARCHITECTURE.md notes a recent Claude Code fix (verified in March 2026 release notes) that addressed "worktree not loading skills." Confirm this fix is present in the installed Claude Code version before Phase 1 execution.
- **Token cost of DAG analysis at scale:** Pitfalls research flags that Agent SDK DAG analysis of a 20-phase ROADMAP.md can consume 10-15k tokens per call. The mitigation (one-time analysis, cache by ROADMAP.md hash) is specified but not tested. Add token logging from day one in Phase 3 and verify against a real 20-phase roadmap.
- **Upstash Redis concurrent connection limit:** The MuxAggregator single-connection approach mitigates the free-tier 1000-connection limit, but the architecture must be tested with 3+ concurrent sessions before any multi-session load hits Redis.

## Sources

### Primary (HIGH confidence)
- docs/superpowers/specs/2026-03-26-distributed-execution-design.md — PRIMARY: approved v0.18 design spec; authoritative source for feature definitions, architecture decisions, build order
- https://platform.claude.com/docs/en/agent-sdk/quickstart — Agent SDK installation, query() API, Options fields, permission modes (verified 2026-03-26)
- https://platform.claude.com/docs/en/agent-sdk/typescript — Full TypeScript SDK reference: cwd, persistSession, maxTurns, permissionMode, allowDangerouslySkipPermissions, systemPrompt, allowedTools
- https://platform.claude.com/docs/en/agent-sdk/sessions — Session management: persistSession, session ID capture, cwd encoding
- https://nodejs.org/api/child_process.html — spawn() with detached + unref pattern; execFile() vs exec() injection safety
- https://code.claude.com/docs/en/agent-teams — Agent Teams architecture, limitations, token cost guidance, session resumption known issues
- Existing codebase: bin/lib/relay.cjs, bin/lib/event-bus.cjs, bin/lib/config.cjs, bin/lib/model-profiles.cjs, packages/pde-mcp-server/package.json — all verified directly

### Secondary (MEDIUM confidence)
- https://deepwiki.com/anthropics/claude-agent-sdk-typescript — Version 0.2.84, Node.js 18+ requirement
- https://zylos.ai/research/2026-02-20-process-supervision-health-monitoring-ai-agents — Application-level heartbeats vs crude metrics; state persistence across restarts
- https://www.confluent.io/blog/event-driven-multi-agent-systems/ — Orchestrator-worker, parallel fan-out/gather, event aggregation patterns
- https://www.termdock.com/en/blog/git-worktree-conflicts-ai-agents — Git worktree conflict diagnosis and fixes
- https://upstash.com/docs/redis/troubleshooting/max_concurrent_connections — Concurrent connection limit documentation
- https://claudefa.st/blog/guide/development/remote-control-guide — Remote control architecture, limitations
- https://releasebot.io/updates/anthropic/claude-code — March 2026 Claude Code release notes (worktree skills fix)

### Tertiary (LOW confidence, needs validation)
- https://crates.io/crates/ccswarm — Community orchestration tool; session persistence patterns (WebSearch summary only)
- https://medium.com/@sean0628/parallel-coding-agents-with-git-worktree-x-tmux-be2a5a290f18 — Confirms tmux + worktree as standard pattern
- https://github.com/anomalyco/opencode/issues/14648 — Worktree bootstrap failure leak (real-world data point for Pitfall 1)
- https://github.com/anthropics/claude-code/issues/11005 — Stale .git/index.lock from CC background git operations (real-world data for Pitfall 4)

---
*Research completed: 2026-03-26*
*Ready for roadmap: yes*
