# Pitfalls Research: PDE v0.18 Distributed Execution

**Domain:** Adding parallel session execution, git worktree orchestration, and remote dispatch to an existing single-session CLI tool
**Researched:** 2026-03-26
**Confidence:** HIGH (patterns verified across Node.js process management docs, git worktree real-world issue threads, multi-agent parallelism community reports, and Upstash/SSE scaling literature)

---

## Context: The Integration Trap

The most dangerous pitfall category for v0.18 is not greenfield complexity — it is the assumption that a working single-session system composes cleanly into a parallel one. PDE's existing behavior (single executor, one NDJSON file, STATE.md as single writer, sequential phases) will fight distributed execution at every boundary. The failures below are ranked by how much damage they cause before they are noticed.

---

## Critical Pitfalls

### Pitfall 1: Worktree Bootstrap Leak on Partial Failure

**What goes wrong:**
The dispatcher runs `git worktree add .sessions/<id> -b pde/session/<id>`, then something fails before the session is registered (config snapshot write fails, relay spawn errors, Claude CLI not found). The worktree directory and branch now exist with no registry entry. On the next run, `git worktree add` for a new session with the same path will fail with `fatal: '.sessions/<id>' already exists`. Each partial failure leaves a permanent artifact. On machines with slow disks or quota limits, these accumulate into "can't create worktree" errors with no clear root cause.

**Why it happens:**
Developers add cleanup to the happy path only. When bootstrap is a multi-step procedure (mkdir + git worktree + relay spawn + registry write), any exception after step 1 exits without reversing steps 1-N. This is documented in the wild: bootstrap failure in Opencode left orphaned directories that caused disk fillup (GitHub issue #14648).

**How to avoid:**
Implement an atomic bootstrap protocol with rollback:
1. Allocate session ID
2. Open a try/finally or try/catch block BEFORE any git command
3. On any exception: run `git worktree remove --force .sessions/<id>`, `git branch -D pde/session/<id>`, then rethrow
4. Only write to the registry after all setup succeeds
5. Add a startup audit that scans `.sessions/` against the registry and flags directory-without-registry-entry as orphan

**Warning signs:**
- `git worktree list` shows sessions not in the dispatcher registry
- `.sessions/` directory count grows across runs
- Tests only cover the happy path of session creation

**Phase to address:**
Session Isolation phase (Layer 1). Foundation must be atomic before parallelism is added.

---

### Pitfall 2: Orphaned Detached Processes After Dispatcher Death

**What goes wrong:**
The design spawns Claude CLI subprocesses with `detached: true`. When the dispatcher process is killed (Ctrl-C, OOM, crash), those detached children keep running — consuming tokens, writing to the worktree, and potentially attempting git commits. The next dispatcher startup finds completed worktrees with no matching registry entry. Worse: if the new dispatcher spawns a new session for the same phase, two sessions may produce conflicting artifacts for phase N. The design notes orphan detection on startup, but detection alone does not prevent the window of concurrent execution.

**Why it happens:**
`detached: true` without a corresponding process-group kill strategy means SIGTERM to the parent does nothing to the children. Node.js's `subprocess.unref()` (used to allow parent to exit) also severs the kill chain. Most implementations add the shutdown signal handler as an afterthought after the happy path is proven.

**How to avoid:**
- Track all spawned child PIDs in the session registry and in a persistent `.planning/dispatcher.pids` file (survives dispatcher crash)
- On dispatcher startup: read `.planning/dispatcher.pids`, check each PID with `process.kill(pid, 0)`, offer Adopt/Kill for any live PIDs found
- On graceful shutdown: send SIGTERM to the entire process group (`process.kill(-child.pid, 'SIGTERM')`) before exiting
- On the PDE CLI side: implement a `preStop` hook that writes a `STOPPING` marker to the session's worktree; Claude CLI should check for this marker and exit cleanly
- Set a hard timeout: if a session runs longer than `max_session_duration` (e.g., 90 minutes), the dispatcher sends SIGTERM even without explicit shutdown

**Warning signs:**
- `ps aux | grep claude` shows more claude processes than the registry claims are active
- Worktrees have uncommitted changes from sessions the registry marks as unknown
- Tests don't simulate parent crash mid-execution

**Phase to address:**
Session Isolation phase (Layer 1), then validated again in Local CLI Dispatch (Layer 2).

---

### Pitfall 3: Shared Git Index Lock Contention

**What goes wrong:**
Git creates an `index.lock` file before any write operation. Worktrees have their own index at `.git/worktrees/<name>/index.lock` — so concurrent sessions don't contend on the main index. However, they DO share the main `.git/objects/` pack database and the main `.git/config`. If the dispatcher performs git operations on the main repo (e.g., `git branch`, `git fetch`, `git merge`) while a session is doing git operations in its worktree, both may contend on the shared pack-refs lock or the main `config.lock`. This appears as `fatal: Unable to create '.git/refs/heads/.lock': File exists` — an error message that looks like a different problem than "two concurrent git operations."

**Why it happens:**
The distinction between worktree-scoped locks and main-repo-shared locks is non-obvious. Teams test single worktree isolation and conclude "worktrees prevent contention" without testing concurrent dispatcher + session git operations.

**How to avoid:**
- The dispatcher must never run git commands on the main repository while a session is actively running in a worktree spawned from it
- Serialize all dispatcher-level git operations (branch pruning, fetching, merging) through a single async queue — one operation at a time
- For the merge phase: collect all sessions to merge, then execute merges sequentially with exponential backoff on lock errors (not retries in a tight loop)
- Use `git worktree lock` on active sessions to prevent the main repo from garbage-collecting their objects

**Warning signs:**
- `fatal: Unable to create '.../.lock'` errors in dispatcher logs
- Merge operations that succeed in isolation but fail when N sessions complete simultaneously
- No serialization mechanism in the dispatcher for main-repo git operations

**Phase to address:**
Local CLI Dispatch phase (Layer 2), merge manager component.

---

### Pitfall 4: STATE.md / ROADMAP.md Write-Back Race

**What goes wrong:**
The design correctly assigns STATE.md and ROADMAP.md updates to the dispatcher post-merge (single writer). However, the existing executor agents (running inside CLI sessions) may still write to these files — they have always written to them, and the code change to stop doing so must be surgical and complete. If even one executor workflow path still writes STATE.md directly (e.g., an error handler, a compatibility path, the session-start header), the post-merge write will overwrite or be overwritten by the session write. Result: phases appear re-opened, progress reverts, or agent memory is clobbered.

**Why it happens:**
Existing behavior is deeply embedded. Searching for "STATE.md" in workflow files will find the happy-path writes, but miss indirect writes through helper functions or emergency fallback paths. Developers who partially migrate the protocol will introduce exactly one execution path that still writes directly.

**How to avoid:**
- Audit ALL writes to STATE.md and ROADMAP.md in the existing codebase before building the dispatcher — not just the obvious ones
- Add a file-write hook (PostToolUse) in the Claude Code hooks configuration for sessions that fires when STATE.md or ROADMAP.md is written from inside a session — it should log a WARNING and ideally no-op the write
- The dispatcher's merge phase should use `git diff HEAD..session-branch -- .planning/STATE.md` to detect whether the session wrote to STATE.md; if so, flag for review before merging
- Add a Nyquist test that simulates a session completing and verifies STATE.md was NOT modified in the session branch

**Warning signs:**
- STATE.md shows phase completion before the dispatcher has run its post-merge recalculation
- ROADMAP.md progress bars update mid-session without dispatcher involvement
- Executor agents emit `agent.memory_saved` events for the global memories.md (not session-scoped file)

**Phase to address:**
Session Isolation phase (Layer 1) — the write protocol change must land before any parallel sessions are spawned.

---

### Pitfall 5: Static File Analysis Misses Runtime-Generated Paths

**What goes wrong:**
The design uses static analysis of PLAN.md to detect which source files each phase will modify, then serializes phases that mention the same file. This works for `src/components/Button.tsx` listed explicitly. It fails for paths generated at runtime: a phase that creates a new file based on a naming convention, a phase that writes to `dist/` (not mentioned in PLAN.md), or a phase that modifies a file discovered via glob. Two phases both running `npm install` modify `package-lock.json` — not mentioned in either PLAN.md. The static analysis reports "no overlap" and both run concurrently. The merge produces a lockfile conflict.

**Why it happens:**
PLAN.md is authored by agents who describe intent, not execution. Agents regularly omit build artifacts, generated files, and files modified as side effects. The static analysis is conservative by design, but "conservative by design" fails silently when the conservative case is wrong.

**How to avoid:**
- Add a blocklist of always-conflict paths to the dispatcher's static analysis: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.tsbuildinfo`, `dist/`, `build/`, `.next/`, any generated directory listed in `.gitignore`
- These paths auto-serialize any two phases that both involve package changes or build steps
- Add a "phase category" heuristic: phases with `install`, `build`, or `compile` in their description run sequentially even if file lists don't overlap
- Post-merge: if a non-.planning/ conflict is detected, surface the specific conflicting file paths in the dashboard merge conflict card so the user can update PLAN.md to be accurate

**Warning signs:**
- Merge conflicts in `package-lock.json` despite static analysis claiming clean parallel execution
- Phases that run `npm install` or build steps scheduled concurrently
- Static analysis coverage rate never validated with integration tests

**Phase to address:**
Local CLI Dispatch phase (Layer 2), routing/scheduling component.

---

### Pitfall 6: SSH Dispatch Round-Trip State Divergence

**What goes wrong:**
The remote dispatch flow is: (1) `git push` session branch, (2) SSH remote fetches + creates worktree, (3) Claude runs on remote, (4) remote commits + pushes session branch, (5) local fetches + merges. Between steps 1 and 5, the local main branch may receive other commits (from another session completing, from the user making a local change). When step 5 runs `git merge pde/session/<id>`, the merge base has shifted. This is not a git conflict (git handles it), but it means the post-merge state recalculation runs against a different base than what the remote session saw during execution. The remote session's COMPLETE markers and COMPLETED-REQS.md reference a world that no longer exists exactly.

**Why it happens:**
Remote execution has a longer round-trip than local. The window for the main branch to advance is much larger. Developers test with sequential sessions (where the base doesn't shift) and only discover the shifted-base problem when running two remote sessions concurrently.

**How to avoid:**
- The dispatcher must record the exact commit hash of main at session spawn time in the session registry
- At merge time, compare the current main HEAD with the spawn-time commit: if they differ, run the post-merge state recalculation from scratch against the full current state rather than applying deltas
- REQUIREMENTS.md merging must use a union strategy (collect all COMPLETED-REQS.md entries) rather than a "apply this session's changes" strategy — union is idempotent and base-shift-safe
- Test explicitly: spawn two remote sessions concurrently, have one complete and merge before the other finishes, verify the second merge succeeds

**Warning signs:**
- Post-merge STATE.md shows fewer completed requirements than the COMPLETE markers indicate
- ROADMAP.md progress bars regress after a second session merges
- Integration tests only ever run one remote session at a time

**Phase to address:**
Remote Dispatch phase (Layer 3), merge manager + state recalculation.

---

### Pitfall 7: Relay Event Loss for Sessions That Complete Before Dashboard Subscribes

**What goes wrong:**
A local CLI session spawns, executes, and completes in 8 minutes. The dashboard opens 10 minutes later (user was away). The relay daemon for that session wrote events to `/tmp/pde-session-<id>.ndjson` while running, but the relay's in-memory buffer (the Upstash Redis stream) has already expired the events via TTL. The dashboard shows the session as "completed" with zero events — no timeline, no progress, no cost breakdown. For remote sessions, the gap is worse: the remote relay daemon exits when the session completes, and its events are only in the remote `/tmp/` file, not accessible locally.

**Why it happens:**
The existing relay was designed for a live-monitoring use case (user watching during execution). Session archival (keeping events for post-hoc review) was an add-on. With multiple parallel sessions, users will frequently miss live execution and need replay.

**How to avoid:**
- Before a session is cleaned up, the dispatcher must copy the session's NDJSON file to a persistent location: `.planning/sessions/<id>/events.ndjson`
- For remote sessions: after the remote session commits and pushes, add the NDJSON file to the git commit (or push it as a separate artifact). The local merge step pulls it down
- The dashboard's session detail view should fall back to reading `.planning/sessions/<id>/events.ndjson` when the live relay has no data
- Do not rely on Upstash TTL alone as the only event store — the TTL is correct for live streaming, not for archival

**Warning signs:**
- Session detail pages in the dashboard show empty event logs for completed sessions
- Remote session histories are unavailable locally
- NDJSON files in `/tmp/` are not backed up before relay daemon exits

**Phase to address:**
Session Isolation phase (Layer 1) for local archival; Remote Dispatch phase (Layer 3) for remote event retrieval.

---

### Pitfall 8: Dispatcher Lock File Stale PID False Negatives

**What goes wrong:**
The design prevents two dispatchers with `.planning/dispatcher.lock` containing the PID of the running dispatcher. On startup, the new dispatcher reads the lock file, finds a PID, checks if it is alive with `process.kill(pid, 0)`, and if alive, exits. This works correctly when the previous dispatcher is still running. It fails in two ways: (a) the PID has been recycled — the OS assigned the same PID to a completely different process, which is alive, so the new dispatcher incorrectly exits; (b) the lock file was written on a different machine (SSH server), and the PID namespace is different.

**Why it happens:**
PID recycling is a real phenomenon on systems that run many short-lived processes (common on dev machines). The check `process.kill(pid, 0)` only confirms a process with that PID exists — it does not confirm it is the PDE dispatcher.

**How to avoid:**
- Write the lock file with both PID AND a randomly generated session token (UUID v4) and a timestamp
- On startup: read PID + token + timestamp. Check if PID is alive. If alive, also check for a PDE-specific sentinel: the dispatcher should write a second file `.planning/dispatcher.sentinel` with the same token, updated every 30 seconds (heartbeat). If the PID is alive but the sentinel is stale (older than 90 seconds), the process is not the dispatcher — steal the lock
- For remote: never check remote PIDs from local; remote locks are scoped to the remote machine and are not relevant to the local dispatcher

**Warning signs:**
- Dispatcher refuses to start on a machine that runs many short processes (Docker, CI)
- Two dispatcher processes occasionally co-exist despite the lock mechanism
- Lock files on remote machines are not cleaned up after SSH sessions complete

**Phase to address:**
Local CLI Dispatch phase (Layer 2), dispatcher coordination.

---

## Moderate Pitfalls

### Pitfall 9: Context Window Exhaustion in Long-Running Parallel Sessions

**What goes wrong:**
The design routes "execute a phase" to CLI subprocess (heavyweight). A complex phase may run long enough to fill the Claude context window. The current single-session behavior handles this gracefully (PDE has context management in the executor). But in a parallel session, the context fills in a worktree where the orchestrator is not watching. The session exits with a non-zero code or produces an incomplete SUMMARY.md. The dispatcher records it as "failed" and surfaces a retry card. If the user retries without adjusting the phase scope, the same failure recurs.

**How to avoid:**
- Add a missing-SUMMARY.md detection to the failure recovery path (the design mentions this, but make it active: check for SUMMARY.md existence BEFORE checking exit code)
- Surface "context window exhausted" as a distinct failure reason in the dashboard (not generic "failed")
- Provide a "Split this phase" action on the failure card that re-routes the user to the plan-phase workflow
- Log the final context window utilization in the session's event archive

**Phase to address:**
Local CLI Dispatch phase (Layer 2), failure handling.

---

### Pitfall 10: Dashboard SSE Connection Count Explosion

**What goes wrong:**
The existing v0.17 dashboard opens one SSE connection to the relay endpoint. With N concurrent sessions, the dashboard opens N SSE connections (one per session's relay). Each SSE connection is a long-lived HTTP connection. On mobile (the stated target), browsers enforce 6 concurrent HTTP/1.1 connections per origin. At 7+ sessions, new SSE connections queue behind the 6-connection limit, causing some sessions to appear offline. On the server side, Upstash Redis has a concurrent connection limit (documented); N parallel sessions each polling Redis creates N×(poll interval) reads.

**Why it happens:**
The v0.17 architecture was optimized for one session. The "one relay daemon per session" model multiplies connection count linearly. HTTP/2 would allow multiplexing, but most local dev environments use HTTP/1.1 for the relay.

**How to avoid:**
- The dispatcher writes a multiplexed NDJSON file (`/tmp/pde-dispatch-<id>.ndjson`) that merges all session events — the dashboard should subscribe to this SINGLE file/endpoint, not N per-session endpoints
- The dashboard uses the `session_id` tag in each event to filter/route to per-session views — no per-session connections needed
- For Upstash: the relay aggregator (one process) reads from all Redis streams and fans out to the single multiplexed file — reduces Redis connections from N to 1
- Test explicitly with 3+ concurrent sessions before shipping the dashboard update

**Warning signs:**
- Dashboard shows some sessions as "offline" when 4+ are active
- Browser DevTools shows 6+ open SSE connections
- Dashboard performance degrades with each additional session

**Phase to address:**
Dashboard Integration phase, event aggregation component.

---

### Pitfall 11: PLAN.md File List Is an Estimate, Not a Contract

**What goes wrong:**
The merge conflict prevention strategy relies on each phase "owning" its files. But PLAN.md is written by an agent at plan-time, and the agent may write an optimistic plan. During execution, the agent discovers it needs to modify an additional file (refactor dependency, fix failing test, update a shared util). Two sessions are now both writing to a file that neither declared. The static analysis passed, the merge conflicts.

**How to avoid:**
- Treat PLAN.md file lists as a soft lock, not a hard lock
- At merge time, use `git diff --name-only session-branch..main` to produce the actual file list for the session (not the planned list)
- Compare actual file lists between sessions being merged: if overlap is found, pause and surface it before completing the merge
- Do not retroactively block the session — the work is done. Surface the overlap, auto-resolve if the changes are in different hunks, escalate to user only on true line-level conflicts
- The static analysis pre-dispatch check is a best-effort serialization helper, not a correctness guarantee

**Phase to address:**
Local CLI Dispatch phase (Layer 2), merge manager.

---

### Pitfall 12: Agent SDK Token Cost Explosion for Routing Decisions

**What goes wrong:**
The design uses Agent SDK for lightweight orchestration tasks: dependency analysis, routing decisions, progress summarization. These are described as "lightweight." In practice, dependency analysis of a full ROADMAP.md for a 20-phase project, read at every dispatch decision, will send 10-15k tokens per call. If the orchestration loop runs frequently (polling for session status every 60 seconds), Agent SDK costs can exceed the cost of the actual work sessions within a few hours.

**Why it happens:**
"Lightweight" is conflated with "cheap." Agent SDK calls are lightweight in latency (no tool use) but not necessarily in token cost. Orchestration loops that run continuously are a known cost sink in multi-agent systems (the token consumption 15x multiplier in Anthropic's own multi-agent testing data confirms this).

**How to avoid:**
- Dependency analysis and routing decisions are ONE-TIME operations at dispatch start — do not re-run them on every session status poll
- Session health monitoring (is the process alive?) must use PID checks and relay heartbeat checks — NOT Agent SDK calls
- Progress summarization should be triggered on explicit user request or on session completion — not on a polling schedule
- Add a token counter for dispatcher Agent SDK calls; log a warning if any single orchestration run consumes more than 5k tokens

**Phase to address:**
Agent SDK Orchestrator phase (Layer 2), orchestration loop design.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling session status via file mtime instead of relay events | Simple, no relay dependency | Misses events between polls, slow to detect failure | Never — relay events are already in place |
| Writing STATE.md directly from session "just for now" | Unblocks development | Races with dispatcher; creates subtle state corruption bugs | Never |
| Skipping bootstrap rollback in early prototypes | Faster iteration | Orphaned worktrees accumulate; harder to clean up as they age | Only in throwaway local spikes |
| One SSE connection per session in dashboard | Simple implementation | Browser connection limit at 6+; Upstash Redis connection flood | Never in the shipped product |
| Reusing the same session ID on retry | Simpler registry | Old artifacts in `.sessions/<id>/` contaminate the retry | Never |
| Using `kill -9` to stop a session | Immediate termination | Leaves index.lock files, uncommitted partial writes, orphaned relay daemon | Only as absolute last resort via "Force Kill" button |
| Skipping the sentinel heartbeat on the dispatcher lock | Simpler startup check | PID recycling causes false "dispatcher already running" exits | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Git worktree + existing plugin hooks | Plugin hooks that scan `.planning/` fire in worktree context and write to the worktree's copy — but hooks configured at the repo level may also fire in the main repo unexpectedly. | Ensure PostToolUse and other hooks that write to `.planning/` are session-aware. Add a `PDE_SESSION_ID` env check: if set, write to session-scoped paths only. |
| Claude CLI `--print` flag + worktree CWD | `claude --print --cwd <worktree>` requires the worktree to have a valid `.claude/` plugin directory (or inherit from the main repo). If the skills/hooks aren't found in the worktree, the session runs without them. | Use the `--worktree` flag (recently fixed in March 2026 to load skills from worktree) OR ensure the main repo's plugin config is inherited. The fix in Claude Code that addressed "worktree not loading skills" is recent — verify it is present in the installed version. |
| Upstash Redis + multiple relay daemons | Each relay daemon opens a Redis connection. N parallel sessions = N connections. Upstash free tier has a 1000 concurrent connection limit — easy to hit if each relay also uses pooling. | One relay aggregator connects to Redis; per-session relay daemons write to NDJSON only, do not connect to Redis directly. The aggregator tails all NDJSON files and pushes to Redis. |
| SSH dispatch + git push race | The dispatcher pushes `pde/session/<id>` to origin. The remote machine fetches the branch. If the push hasn't propagated to origin by the time SSH runs `git fetch`, the branch is not found. | Add a 3-second delay + retry loop (up to 5 attempts) between push and SSH fetch command. This is not ideal but is the practical mitigation for remote Git propagation lag on shared origins. |
| `process.kill(-child.pid)` on macOS | Sending SIGTERM to a process group works on Linux but behaves differently on macOS when the child was spawned with `detached: true` but not as a process group leader. | Verify process group leadership with `getpgid`. If the child's PID equals its PGID, use `process.kill(-child.pid)`. Otherwise, walk the process tree using `pgrep -P <pid>` and kill children individually. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Linear scan of `.sessions/` on every status poll | Dispatcher slows as abandoned worktrees accumulate | Registry is the source of truth; scan `.sessions/` only on startup for orphan detection, not on every tick | At 20+ abandoned sessions |
| NDJSON tail with `fs.watch` per file | N concurrent sessions = N `fs.watch` file descriptors; macOS kqueue limit is 256 by default | Single aggregator process using a glob watch on `/tmp/pde-session-*.ndjson` | At 6+ concurrent sessions |
| Git merge on large repos with many worktrees | `git worktree list` becomes slow; merge time scales with repo size | Keep `.sessions/` worktrees sparse (only checkout `.planning/` + source files the phase touches) | On repos with 10k+ files |
| Relay event buffer unlimited growth | Memory pressure on dispatcher after hours of parallel execution | Implement rolling window on in-memory event buffer (keep last 1000 events per session); flush to NDJSON continuously | After ~4 hours of concurrent execution |
| Agent SDK dependency analysis called at every routing decision | Token cost scales with phase count × dispatch events | Cache the dependency DAG; invalidate only when ROADMAP.md changes | At 15+ phases, frequent dispatch |

---

## Security Considerations

| Concern | Risk | Prevention |
|---------|------|------------|
| SSH credentials in config.json | If `.planning/config.json` is committed to git, SSH host details and credentials are exposed | Add `.planning/config.json` to `.gitignore`; use environment variables for SSH credentials; document this clearly in setup |
| Session IDs in worktree branch names | `pde/session/<uuid>` branches pushed to origin are visible to anyone with repo access | Use short random tokens (not full UUIDs) for branch names in any shared repo context; document that session branches should be treated as temporary |
| Relay URL in remote environment | `PDE_REMOTE` env var passed to SSH session contains the full Upstash relay URL including auth token | Treat `PDE_REMOTE` as a secret; do not log it; ensure SSH command does not end up in shell history (use `-o LogLevel=QUIET`) |
| Stale session branches | After a session completes, its branch may persist on origin with sensitive plan content | Prune session branches from origin as part of cleanup; never leave `pde/session/*` branches on origin longer than 24 hours |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "3 active sessions" without indicating which phases they correspond to | User cannot tell what is happening — "active" means nothing without context | Each session card must show phase number + plan description; "Session 2: Phase 5, Plan 3 — refactor auth module" |
| Destructive "Kill Session" accessible with one tap | User accidentally kills a 45-minute session while scrolling | Single-tap shows preview: "Kill session? This will discard N uncommitted changes." Confirm requires explicit tap on destructive button inside AlertDialog — not just dismiss |
| Merge conflict notification with no actionable next step | User sees "conflict" but has no idea what to do | Merge conflict card must always show: (a) the specific files in conflict, (b) a "View Diff" button, (c) a git command they can paste to resolve locally, (d) an "Abandon session and keep main" escape hatch |
| Progress bars showing % based on event count, not actual phase completion | Bars jump around unpredictably; a phase with many quick events looks "faster" than one with few slow events | Progress bars for phases are binary step counters (waves complete, not event rates); only show animated stripe for "active" state, not as a % proxy |
| Session filter chip defaulting to "All Sessions" with interleaved events | With 3+ concurrent sessions, the event log is unreadable | Default to "All Sessions" on the Sessions tab, but default to the most recently active session on the Events tab; persist filter preference in localStorage |

---

## "Looks Done But Isn't" Checklist

- [ ] **Worktree cleanup:** Session completes AND merge succeeds AND `.sessions/<id>/` is removed AND `pde/session/<id>` branch is pruned from local AND origin. Verify: `git worktree list` shows no stale entries after session completes.
- [ ] **Orphan detection:** Dispatcher startup scans `.sessions/`, `.planning/dispatcher.pids`, and the registry. Verify: kill dispatcher mid-session, restart, confirm orphan is detected within 5 seconds.
- [ ] **STATE.md single writer:** No executor agent writes to STATE.md during session execution. Verify: git diff on the session branch shows no STATE.md changes.
- [ ] **Event archival:** After session cleanup, `.planning/sessions/<id>/events.ndjson` exists and is non-empty. Verify: dashboard shows event history for completed sessions opened after the fact.
- [ ] **Lock file heartbeat:** Dispatcher lock file's sentinel is updated every 30 seconds while dispatcher is alive. Verify: `stat .planning/dispatcher.sentinel` shows mtime within 60 seconds while dispatcher runs.
- [ ] **Relay aggregation:** With 3 concurrent sessions, the dashboard SSE connection count in DevTools is 1, not 3. Verify in browser Network panel.
- [ ] **SSH cleanup:** After remote session completes and merges, the remote machine has no `.sessions/<id>/` directory and no `pde/session/<id>` branch. Verify via SSH inspection.
- [ ] **Package lock conflict prevention:** Two sessions that both run `npm install` (or equivalent) are serialized, not run in parallel. Verify by inspecting dispatch decision logs for phases with install steps.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned worktrees with uncommitted work | MEDIUM | 1. `git worktree list` to identify; 2. Inspect each for useful work; 3. `git worktree remove --force` for abandoned ones; 4. `git branch -D pde/session/<id>` to prune branches; 5. Clean `.planning/dispatcher.pids` |
| STATE.md corrupted by session write race | HIGH | 1. `git log --oneline -20` to find last good STATE.md; 2. `git show <hash>:.planning/STATE.md > /tmp/state-backup.md`; 3. Re-run dispatcher's `recalculateState()` from scratch using COMPLETE markers in phase directories |
| Two dispatchers ran concurrently, duplicate phases executed | HIGH | 1. Both session branches should exist; 2. Inspect each for completeness; 3. Keep the more complete one; 4. Manually merge any unique artifacts from the other; 5. Delete the duplicate session's branch |
| SSH session completed but push failed, work is stranded | MEDIUM | 1. SSH to remote; 2. `git log --oneline` in the session's worktree; 3. `git push origin pde/session/<id> --force-with-lease`; 4. Resume local merge flow |
| Dashboard shows stale session state after dispatcher restart | LOW | 1. Hard-reload dashboard; 2. Dashboard reads registry via API on load — fresh registry will be accurate; 3. If stale, check that dispatcher rebuilt registry correctly from disk on startup |
| merge conflict in source code (non-.planning/) | MEDIUM | 1. Dashboard merge conflict card surfaces the files; 2. User runs `git checkout -b pde/resolve-<id>`; 3. Manually resolves; 4. Dispatcher resumes with resolved branch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Worktree bootstrap leak on partial failure | Phase: Session Isolation (Layer 1) | Nyquist test: simulate exception during bootstrap, verify no orphaned worktree |
| Orphaned detached processes after dispatcher death | Phase: Session Isolation (Layer 1) + Local CLI Dispatch (Layer 2) | Integration test: SIGKILL parent, restart, verify orphan detection within 5s |
| Shared git index lock contention | Phase: Local CLI Dispatch (Layer 2) | Integration test: 3 concurrent sessions all completing simultaneously, zero lock errors |
| STATE.md / ROADMAP.md write-back race | Phase: Session Isolation (Layer 1) | Nyquist test: session branch contains no STATE.md diff |
| Static analysis misses runtime-generated paths | Phase: Local CLI Dispatch (Layer 2) | Integration test: two phases with npm install, verify serialization |
| SSH dispatch round-trip state divergence | Phase: Remote Dispatch (Layer 3) | Integration test: two remote sessions, first merges before second completes |
| Relay event loss for sessions completing before dashboard | Phase: Session Isolation (Layer 1) for archival | Manual test: session completes, open dashboard 30 minutes later, events visible |
| Dispatcher lock file stale PID false negatives | Phase: Local CLI Dispatch (Layer 2) | Unit test: mock PID recycling scenario, verify heartbeat check prevents false block |
| Context window exhaustion in parallel sessions | Phase: Local CLI Dispatch (Layer 2) | Integration test: simulate missing SUMMARY.md, verify distinct failure reason in dashboard |
| Dashboard SSE connection count explosion | Phase: Dashboard Integration | Browser DevTools test: 3+ sessions, verify single SSE connection |
| Agent SDK token cost explosion | Phase: Agent SDK Orchestrator (Layer 2) | Log token count per orchestration run; alert if >5k |
| SSH credentials in config.json | Phase: Remote Dispatch (Layer 3) | Verify `.planning/config.json` is in `.gitignore` before remote config is documented |

---

## Sources

- [Git Worktrees: Advanced Topics — Git Cheat Sheet](https://gitcheatsheet.dev/docs/advanced/worktrees/)
- [Git Worktree Conflicts with Multiple AI Agents: Diagnosis and Fixes — Termdock](https://www.termdock.com/en/blog/git-worktree-conflicts-ai-agents)
- [Worktree bootstrap failures leak orphaned directories — anomalyco/opencode Issue #14648](https://github.com/anomalyco/opencode/issues/14648)
- [Stale `.git/index.lock` files created by CC's background git operations — anthropics/claude-code Issue #11005](https://github.com/anthropics/claude-code/issues/11005)
- [Killing process families with Node — Almenon, Medium](https://medium.com/@almenon214/killing-processes-with-node-772ffdd19aad)
- [Node.js child_process docs — Official](https://nodejs.org/api/child_process.html)
- [Node.js race conditions — nodejsdesignpatterns.com](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/)
- [Preventing Race Conditions in Node.js with Distributed Locks — DEV Community](https://dev.to/koistya/preventing-race-conditions-in-nodejs-with-distributed-locks-48fp)
- [proper-lockfile — Node.js inter-process lockfile utility](https://github.com/moxystudio/node-proper-lockfile)
- [How to Build LLM Streams That Survive Reconnects, Refreshes, and Crashes — Upstash Blog](https://upstash.com/blog/resumable-llm-streams)
- [ERR max concurrent connections exceeded — Upstash Documentation](https://upstash.com/docs/redis/troubleshooting/max_concurrent_connections)
- [Clash: avoid merge conflicts across git worktrees for parallel AI agents](https://github.com/clash-sh/clash)
- [Building agents with the Claude Agent SDK — Anthropic Engineering](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Claude Code Worktrees: Run Parallel Sessions Without Conflicts](https://claudefa.st/blog/guide/development/worktree-guide)
- [Claude Code Release Notes — March 2026 (worktree skills fix)](https://releasebot.io/updates/anthropic/claude-code)
- [Git Worktrees for Parallel AI Coding Agents — Upsun Developer Center](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/)

---

*Pitfalls research for: PDE v0.18 Distributed Execution — adding parallel session execution to single-session CLI*
*Researched: 2026-03-26*
