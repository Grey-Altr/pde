# Pitfalls Research

**Domain:** Adding event infrastructure and tmux monitoring dashboard to an existing Claude Code plugin (PDE v0.8)
**Researched:** 2026-03-19
**Confidence:** HIGH (grounded in PDE v0.1-v0.7 codebase patterns, first-principles analysis of the specific integration challenges, and verified patterns from Node.js/tmux ecosystem research)

---

## Critical Pitfalls

### Pitfall 1: Event Emission on the Synchronous Critical Path Blocks Workflow Execution

**What goes wrong:**
Every pde-tools.cjs command, every workflow bash block, and every agent spawn runs synchronously. When you add `emitEvent('phase:started', {...})` calls inline into these paths, Node.js EventEmitter fires all listeners synchronously before the original operation completes. If any listener does file I/O (writing to a log file, updating a structured summary), the synchronous write happens before the next line of the workflow can execute. A workflow that previously ran 50 bash commands in 3 seconds now runs in 8 seconds because each command emits an event that flushes a JSON log entry.

This slowdown is invisible at first because each individual emission adds only 5-20ms. Multiplied across 50 operations per phase, it accumulates to seconds. The developer does not connect the performance regression to the event infrastructure.

**Why it happens:**
Event infrastructure is instrumented inline with the operations it observes. The natural instinct is to write `emitEvent(...)` immediately before or after the operation it describes. No thought is given to whether the listener is synchronous or asynchronous. Node.js EventEmitter is synchronous by default — all listeners block the emitter before returning control.

**How to avoid:**
Fire-and-forget event emission. Use `setImmediate(() => emitEvent(...))` or `process.nextTick(() => emitEvent(...))` to push emission off the synchronous path. The event bus in PDE should be designed as write-only from the caller's perspective — callers emit and move on immediately. Log writers are asynchronous listeners that process the event queue independently. This is the difference between "inline telemetry" and "background telemetry." For PDE's use case, background telemetry is always correct.

**Warning signs:**
- Phase execution time increases more than 15% after adding event infrastructure
- pde-tools.cjs commands take longer when the dashboard is open versus when it is closed
- Profiling shows that `emitEvent` calls appear on the call stack during what should be pure computation
- Any event listener calls `fs.writeFileSync` (synchronous) instead of `fs.writeFile` (asynchronous)

**Phase to address:** Event bus design phase — the asynchronous-emit contract must be defined in the bus architecture before any instrumentation is added to existing files. Retrofitting async emission after synchronous listeners are established requires touching every listener.

---

### Pitfall 2: The tmux Dashboard Dies Silently When the PDE Operation Finishes

**What goes wrong:**
The `/pde:monitor` command launches a tmux session with 6 panes and starts tailing log files. When the PDE operation finishes, the agent session ends, the log file being tailed stops receiving new writes, and one or more panes enter an idle state. In the worst case, the tmux session itself exits if any pane process terminates and the `remain-on-exit` option is not set. The user is left with either a dead terminal or a tmux session that shows stale data with no indication that the operation completed.

The requirement says "persistent dashboard (stays open after operation finishes)" — but this requires deliberate lifecycle management that is easy to get wrong.

**Why it happens:**
tmux panes that tail files (`tail -f`) exit when the file descriptor is closed or when the tail process is killed. If the dashboard was launched from within the same shell session as the PDE operation (via a subshell), that subshell's exit may send SIGHUP to child processes including the tail processes. Shell scripting for process lifecycle management is subtle — the default behavior does not match the requirement.

**How to avoid:**
Set `remain-on-exit on` for all dashboard panes so they stay open and show final state after their process exits. Use `tail -F` (capital F) instead of `tail -f` — it follows the file by name and handles log rotation. Write a "OPERATION COMPLETE" sentinel line to the event log when the operation finishes; the dashboard's agent-activity pane should detect this and display a completion banner. The tmux session itself should be started with `new-session -d` (detached) and the monitor command should attach to it — not start embedded in the agent's own shell.

**Warning signs:**
- Running `/pde:monitor` without `remain-on-exit on` in the pane configuration
- Dashboard panes use `tail -f` on files that may be rotated or renamed during a long operation
- The tmux session is started in the same process group as the Claude Code session
- No "operation complete" sentinel is written to the event log

**Phase to address:** tmux dashboard implementation phase — the remain-on-exit and tail -F options must be in the initial pane creation script, not added later as a fix for reported silently-dying panes.

---

### Pitfall 3: Running `/pde:monitor` From Inside an Existing tmux Session Creates a Nested Session Error

**What goes wrong:**
The user is already running Claude Code inside a tmux session (common for developers who use tmux as their primary terminal). When `/pde:monitor` runs `tmux new-session -s pde-monitor`, tmux detects the `$TMUX` environment variable and refuses: "sessions should be nested with care, unset $TMUX to force." The monitor command fails with an error that is confusing to users who may not know they are inside tmux. Alternatively, if the command forces creation by unsetting $TMUX, the user ends up with unexpected nested sessions where key bindings and scrolling behave differently.

**Why it happens:**
The launch script checks `which tmux` to confirm tmux is installed but does not check `$TMUX` to determine whether the current process is already inside a tmux session. The nested session error is not documented in most tmux tutorials and surprises developers who have not encountered it.

**How to avoid:**
Before creating a new session, check `$TMUX`. If set, use `tmux switch-client -t pde-monitor` to switch to the monitor session instead of trying to create a new one from inside tmux. If the monitor session does not exist yet, create it with `TMUX= tmux new-session -d -s pde-monitor` (unset TMUX for the creation call only) then switch to it. This gives the user the monitor in a separate tmux session without a nested session. Document this behavior explicitly — it is the most common launch failure.

**Warning signs:**
- Monitor launch script contains `tmux new-session` without first checking `[ -n "$TMUX" ]`
- No switch-client fallback path in the launch logic
- Testing was only done from a non-tmux terminal (iTerm2 directly), not from within an existing tmux session

**Phase to address:** tmux dashboard launch phase — the $TMUX detection and switch-client path must be implemented in the initial launch script. It cannot be treated as an edge case because the majority of developer users who want a monitoring dashboard are already running tmux.

---

### Pitfall 4: The 6-Pane Layout Requires More Terminal Real Estate Than Most Terminals Provide

**What goes wrong:**
The 6-pane layout is designed on a large external monitor at 240x60 characters. On a MacBook 13" with a standard terminal at 80x24, tmux cannot split the window into 6 usable panes — each pane would be 12 characters wide (after separators), which is insufficient for any meaningful output. tmux enforces a minimum pane size of 2 lines and similar minimum widths. At small terminal sizes, tmux silently collapses panes or refuses to create them with "terminal too small" errors. The dashboard that works in development does not work for a large portion of users.

**Why it happens:**
Dashboard layouts are designed at the developer's screen size and tested only at that size. The minimum viable terminal size for 6 panes (3 columns × 2 rows) is roughly 120×30 characters. This is not the default for most terminal emulators and is certainly not the standard in CI or remote SSH environments.

**How to avoid:**
Add a terminal size check before creating the dashboard layout. Detect `$(tput cols)` and `$(tput lines)`. Define a minimum: 120 columns × 30 lines for the 6-pane layout. If the terminal is below this threshold, offer a degraded 4-pane or 2-pane layout instead of failing silently. Better: make the layout adaptive — a 2-pane "essential" layout (agent activity + pipeline progress) that works in any terminal, upgrading to 6 panes only when space is available. The most useful information (what is running, what succeeded/failed) must be visible in the degraded layout.

**Warning signs:**
- Dashboard script contains hardcoded `split-window -p 50` without terminal size guards
- No fallback layout code path exists in the pane creation script
- Dashboard was only tested at terminal widths > 160 characters
- No documentation of minimum terminal size requirements

**Phase to address:** tmux dashboard layout phase — the adaptive layout and terminal size guard must be implemented before the initial launch script is shipped. A dashboard that crashes on small terminals will be reported as "broken" by users who do not read the minimum size requirement.

---

### Pitfall 5: Deep Instrumentation Requires Touching 40+ Files and Each Touch is a Regression Risk

**What goes wrong:**
The event infrastructure design calls for instrumentation across agents, executor, and tools. PDE has ~70+ workflow files, ~10 agent files, and ~20 pde-tools.cjs library modules. Adding `emitEvent(...)` calls to each of these requires touching a large fraction of the codebase. Each touch is a potential regression. A workflow that previously had 8 bash blocks now has 9 (the event emission). If any emission call has a syntax error, the entire workflow fails. If the event bus import fails to resolve, every instrumented file fails at import time.

The risk is not any single change — it is the multiplicative regression surface across all changes made simultaneously.

**Why it happens:**
Instrumentation is often treated as a cross-cutting concern that can be added in one pass without careful per-file validation. The developer adds imports and emission calls across all files, runs a single end-to-end test, considers it done. But each file has unique context, and the "obvious" emission point in one file may be in a code path that is only executed under specific conditions — never exercised by the single end-to-end test.

**How to avoid:**
Instrument in layers, not in one pass. Phase 1: instrument the single most critical path (agent spawning in execute-phase.md). Validate that path fully before touching anything else. Phase 2: add instrumentation to pde-tools.cjs commands, which are centralized — one file, maximum coverage. Phase 3: extend to individual workflow files. This layered approach means the event infrastructure is tested end-to-end before the surface area explodes. It also means that if something goes wrong, the blast radius is limited to the current layer. Use a guard pattern: wrap all emission calls in a try-catch that swallows errors silently — the event infrastructure must NEVER cause the primary workflow to fail.

**Warning signs:**
- All instrumentation is added in a single commit across 30+ files
- No guard pattern (try-catch) around event emission calls in workflow files
- The event bus module is imported at the top level of pde-tools.cjs without a conditional require
- The first validation test attempts to verify the entire instrumented surface at once

**Phase to address:** Instrumentation rollout phase — the layered approach (centralized first, distributed second) must be the explicit implementation strategy. Acceptance criteria should require per-layer validation before the next layer begins.

---

### Pitfall 6: Named Pipes Become Stale or Block When No Reader is Attached

**What goes wrong:**
The event bus uses a named pipe (FIFO) to stream events from the PDE operation to the tmux dashboard panes. This works when the dashboard is open. When the user runs a PDE operation WITHOUT opening `/pde:monitor` first, writes to the named pipe block indefinitely — a FIFO write blocks until a reader opens the other end. The PDE operation hangs at the first event emission. The user has no indication of why the operation stopped responding.

Alternatively: the pipe is created but the reader exits (the tail process in the pane is killed by the user). Subsequent writes to the pipe either block (if the FIFO mode blocks) or produce EPIPE errors (if the writer detects a broken pipe). Neither case is handled gracefully by default.

**Why it happens:**
Named pipes feel like log files but they are not. Unlike a regular file, a FIFO write operation blocks until a reader is available. Developers who prototype with log files and then switch to named pipes for lower latency discover this behavior only when the reader is absent. The broken-pipe failure mode (EPIPE) is also not obvious — it manifests as an unhandled exception in the event writer, not as an error in the PDE operation itself.

**How to avoid:**
Do not use named pipes as the primary event transport. Use append-only log files in `/tmp/pde-events-{session}.jsonl` as the event store, with the tmux dashboard tailing those files. This is resilient to reader absence (writes always succeed), resilient to reader restarts (tail -F picks up from the current file end), and debuggable (the log file can be inspected directly). If lower latency is needed for the dashboard, use `inotifywait` or the macOS FSEvents equivalent to watch the log file for changes rather than a named pipe. Named pipes add complexity with no meaningful benefit for a monitoring use case where 100ms latency is acceptable.

**Warning signs:**
- Event bus implementation uses `mkfifo` or named pipe paths
- Event emission code does not have EPIPE error handling
- The test suite only runs with the dashboard open (reader always present)
- No documentation about what happens when `/pde:monitor` is not running

**Phase to address:** Event bus design phase — the log-file-based transport decision must be made before any IPC mechanism is implemented. Switching from named pipes to log files after consumers are built requires changing both the writer and all reader configurations.

---

### Pitfall 7: tmux Auto-Install Script Breaks on Non-Standard Linux Distributions and WSL

**What goes wrong:**
The auto-install check detects macOS and runs `brew install tmux`. It detects Debian/Ubuntu and runs `apt-get install tmux`. But a user on Fedora gets `apt-get: command not found`. A WSL user on Windows with a custom distribution gets neither path. A user in a corporate environment where `sudo` is restricted gets a permissions error. In each case, the "helpful" auto-install silently fails, produces a confusing error message, and the user is left without tmux and without a clear path to resolution.

**Why it happens:**
Auto-install scripts are written against the two most common platforms (macOS Homebrew + Debian apt) and tested only on those platforms. Edge cases (Fedora dnf, Arch pacman, Alpine apk, WSL, NixOS, restricted sudo) are not considered because they are individually rare — but collectively they represent a significant fraction of the developer population.

**How to avoid:**
Do not auto-install. Instead: detect tmux presence with `command -v tmux`. If absent, print a clear, platform-aware error message with copy-paste install commands for the four most common platforms (macOS/Homebrew, Debian/Ubuntu, Fedora/RHEL, Arch). Offer to attempt installation only with explicit user confirmation (`--auto-install` flag). Never silently fail the install — if the attempt fails, print the error and the manual install command. The detection and messaging path is more important than the install path. Most developers would rather have a clear "run this command" message than a failing auto-installer.

**Warning signs:**
- The install script calls `brew` or `apt-get` without first checking if those commands exist
- Testing was done only on macOS and Ubuntu
- The script does not differentiate between "tmux not installed" and "tmux install failed"
- No `--auto-install` flag — the script attempts installation unconditionally

**Phase to address:** tmux availability detection phase — the detection script must be tested on macOS, Ubuntu, Fedora, and in a simulated WSL environment before shipping. The install attempt path should be opt-in via flag, not default behavior.

---

### Pitfall 8: Context Window Tracking Produces Systematically Wrong Numbers for Multi-Agent Sessions

**What goes wrong:**
The context window pane shows "42% context used" based on a token estimate calculated from the current prompt size. But PDE operations spawn subagents, and each subagent has its own independent context window. The "42%" is only the orchestrator's context — the subagents may be at 85% independently. When a subagent is close to its context limit, it starts truncating earlier turns and loses references to task files it was supposed to read. This causes subtle behavioral degradation that the user cannot see because the dashboard is showing the wrong agent's context usage.

Additionally, the token estimate itself uses a character-count approximation (3.5 chars per token) that can be off by 20-30% for code-heavy context versus prose-heavy context.

**Why it happens:**
Context window tracking is implemented for the primary agent's perspective because that is the only process the monitoring system has direct access to. Subagent contexts are invisible from the orchestrator level — Claude Code does not expose per-subagent token counts. The approximation heuristic is chosen because Anthropic does not provide a local tokenizer for Claude 3+ models, and calling the official token-count API on every operation would add latency and cost.

**How to avoid:**
Be explicit about what the context window pane measures. Label it "Orchestrator context" not "Session context." Add a secondary indicator for "subagent depth" (how many nested subagents are currently active) so the user has a signal that context pressure may be higher than the orchestrator view shows. For the token estimate, use 4 chars per token (more conservative) and display as a range ("~35-45% used") rather than a single precise number. The range communicates the inherent imprecision and prevents users from trusting a false precision. Document that actual subagent context cannot be tracked from outside the model.

**Warning signs:**
- The context pane label says "Session context" or "Total context" without qualification
- Token estimate displays as a single percentage with no range or uncertainty indicator
- The implementation assumes one context window covers all spawned agents
- No documentation of what the context estimate is measuring and what it is not

**Phase to address:** Context window tracking implementation phase — the labeling and range-display decisions must be made in design, not after user feedback reports "the numbers are always wrong."

---

### Pitfall 9: Concurrent PDE Operations Write to the Same Event Log and Corrupt the Session History

**What goes wrong:**
Two parallel PDE operations are running (e.g., two execute-phase calls in different terminal tabs, or a wave of parallel plan executors). Both write to the same event log file at `/tmp/pde-events.jsonl`. Without file locking, their JSON lines interleave at the byte level — a partial line from one process appears mid-line from another. The log file is now unparseable JSONL. The structured summary generation fails with a JSON parse error. The session history is lost.

Additionally: the dashboard is tailing this corrupted file and may display garbage in the log stream pane, confusing the user about what is actually happening.

**Why it happens:**
File writes from multiple processes to the same file are not atomic beyond a single write() system call of at most PIPE_BUF bytes (typically 4096 bytes on Linux). Event payloads larger than PIPE_BUF will interleave. Most developers know about this risk in theory but assume their individual events are small enough to be safe — until they are not.

**How to avoid:**
Use session-scoped log files, not a single global log file. The event log path should include a session identifier derived from the PDE session start time or a random UUID: `/tmp/pde-events-{session-id}.jsonl`. Each PDE invocation creates its own log file. The dashboard monitors the most recently created log file by default. Alternatively, use a single log file with atomic append via the O_APPEND flag (which provides atomic appends for writes up to PIPE_BUF bytes) and keep event payloads under 4096 bytes. The session-scoped approach is simpler and eliminates the problem entirely.

**Warning signs:**
- Event log path is a fixed global path like `/tmp/pde-events.jsonl`
- Event payloads can exceed 4096 bytes (large metadata objects, multi-line content)
- No session ID is generated at operation start
- Multi-process concurrent execution is not tested as part of the event infrastructure validation

**Phase to address:** Event bus design phase — session-scoped log paths must be part of the initial log file schema. Adding session IDs after consumers are built requires updating both writers and the dashboard's file-discovery logic.

---

### Pitfall 10: Structured Log Summaries Accumulate Without Bounds and Fill /tmp

**What goes wrong:**
Every PDE operation writes a raw event stream to `/tmp`. The session history requirement also writes structured summaries to `.planning/logs/`. Over time, a user running PDE multiple times per day accumulates hundreds of log files. The `/tmp` directory eventually fills up (especially on systems with tmpfs with limited size). The `.planning/logs/` directory in the project becomes a significant git noise source — `git status` shows dozens of untracked files and `git diff` is polluted with log entries.

**Why it happens:**
Log file management is not considered a feature during implementation — it is "just write to a file." The team focuses on making logs useful, not on managing their lifecycle. Cleanup is treated as "we'll add that later" and never gets added.

**How to avoid:**
Define log retention policy at implementation time, not as a future enhancement. For `/tmp` raw streams: write to timestamped files and implement a cleanup function that removes files older than 7 days, called at session start. For `.planning/logs/` structured summaries: keep only the last 20 sessions by default (configurable). Add `.planning/logs/` to the PDE `.gitignore` or at minimum document that users should add it — log files should not be committed. The `/pde:monitor` cleanup command should include a "clear old logs" option.

**Warning signs:**
- No retention/cleanup logic in the initial event infrastructure implementation
- `.planning/logs/` is not in `.gitignore`
- A single week of PDE usage accumulates more than 100MB in `/tmp`
- The test suite creates log files but never cleans them up between runs

**Phase to address:** Event infrastructure design phase — retention policy is part of the log file schema decision, not an operational concern to handle later. The cleanup function should be in the first shipped version.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Synchronous event emission inline with operations | Simpler code, no async management | Adds 5-20ms per emission; multiplied across 50+ operations per phase, creates noticeable slowdown | Never for log writes; acceptable only for in-memory counters with no I/O |
| Named pipes instead of log files for event transport | Lower latency, "feels like real-time" | Blocks indefinitely when no reader; EPIPE errors on reader exit; no way to replay missed events | Never — log files with tail -F provide equivalent latency for monitoring use |
| Single global event log file | No session management needed | Concurrent operations corrupt the file; log is unreadable after first parallel execution | Only for single-operation-at-a-time workflows confirmed in config |
| Auto-install tmux unconditionally | User never sees "tmux not found" | Fails on non-standard distros; runs package manager commands without explicit consent; cannot be reversed | Never — always require explicit opt-in with --auto-install flag |
| Hardcoded 6-pane layout with no size check | Simpler implementation | Fails or produces unusable output on small terminals; most reported bugs will be layout crashes | Never — terminal size guard is required from the first implementation |
| Single context window measurement for all agents | No complexity in subagent tracking | Systematically misleads user; shows low usage while subagents are at limit | Acceptable only if the pane is labeled "Orchestrator context" with a documented caveat |
| Instrument all files in one pass | Faster to implement in bulk | Regression risk multiplied across all files; single syntax error in any file breaks all workflows | Never — instrument in layers with per-layer validation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Event bus + pde-tools.cjs | Importing the event bus at the top level of pde-tools.cjs — if the bus fails to load, all pde-tools.cjs commands fail | Lazy require inside the emit function with a try-catch; pde-tools.cjs must work without the event bus |
| tmux dashboard + Claude Code sandbox | Claude Code's sandbox may block `tmux` commands that modify the terminal outside the working directory scope | Test all tmux commands through the actual Claude Code Bash tool, not directly in the shell; detect sandbox mode and warn if tmux commands are restricted |
| Event log + .planning/ directory | Writing event logs to .planning/logs/ puts log files in the same directory as state files — git picks them up | Add .planning/logs/ to .gitignore before writing first log file; or use /tmp exclusively for raw streams |
| tmux session naming + multiple projects | A fixed session name like "pde-monitor" collides when two projects run PDE simultaneously | Session name should include project slug: "pde-monitor-{project-slug}" derived from config.json |
| Token counting + model profiles | PDE supports multiple model profiles with different context sizes (executor model vs verifier model) | Context window display must read the current active model's context limit from model-profiles.cjs, not a hardcoded value |
| Log rotation + tail -f | The dashboard uses `tail -f` which stops following after the file is truncated or renamed | Use `tail -F` (capital F) in all dashboard pane scripts |
| Event bus import + zero-npm-deps constraint | Adding an npm package for async event handling violates PDE's zero-npm-deps-at-plugin-root constraint | Implement the event bus as a pure Node.js module in bin/lib/ using built-in EventEmitter with process.nextTick for async dispatch |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous log file write per event | Phase execution time grows proportionally with number of instrumented operations; 50 operations × 10ms = 500ms added latency | Use async fs.appendFile with no await; write to buffer and flush on interval | Immediately — any synchronous file I/O in the hot path is perceptible |
| Log file JSON serialization of large objects | Token/cost meter events include full context snapshots; each event is 50KB; log file grows to GB in a single session | Define maximum event payload size (1KB); trim large fields to summaries before emission | Any session with more than 20 operation cycles |
| Dashboard pane refresh rate too high | Terminal renders 60 updates/second; tmux send-keys overhead at high frequency; observable CPU usage from dashboard process | Use file-tail approach (terminal handles refresh rate natively) rather than polling-and-sending | At refresh rates above 10Hz; worst on battery-constrained laptops |
| tmux new-window per event type | Creating a new tmux window/pane for each event category results in dozens of panes | Pre-create all 6 panes at dashboard launch; route events to the correct pane by writing to separate log files | Immediately — tmux has UI overhead per pane that grows with count |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Writing API keys or secrets to event log files | Secrets in .planning/logs/ or /tmp are readable by any process on the system | Event schema must explicitly exclude fields from config.json that contain tokens or API keys; audit emit() call sites before shipping |
| Executing user-controlled content in tmux send-keys | If event payloads contain shell metacharacters and are sent via send-keys, they could execute arbitrary commands in the dashboard pane | Never use send-keys with event content; write to files that are tailed by panes — file content is not interpreted as shell input by tail |
| Session name predictability enabling session hijack | A fixed predictable tmux session name (pde-monitor) allows a malicious co-process to attach to the session | Include a random component or project-specific identifier in the session name |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual indication that the dashboard is connected to a live operation | User opens dashboard, sees empty panes, does not know if it is working | Show a "Waiting for PDE events..." message in each pane at startup; replace with first live event |
| Dashboard exits when the user runs any PDE command without opening monitor first | User accidentally runs execute-phase without monitor; the monitor they open afterward shows no history | Event log files persist; opening the dashboard after an operation should tail from the beginning of the most recent session's log |
| Token/cost meter shows raw numbers with no context | User sees "42,891 tokens" with no reference to model limits or cost implications | Show percentage of context window used and estimated cost delta since session start |
| Auto-advance and monitor interact confusingly | User enables auto_advance and opens monitor; phases advance automatically while the user is watching; no indication that this is expected | Display a "AUTO-ADVANCE ACTIVE" indicator in the pipeline progress pane when workflow.auto_advance is true |
| Log stream pane shows raw JSONL that requires JSON parsing to read | Unformatted JSONL in a terminal pane is unreadable for most users | The log stream pane should pretty-print key fields (timestamp, event type, summary) using jq or a purpose-built formatter |

---

## "Looks Done But Isn't" Checklist

- [ ] **Event bus async dispatch:** Verify that adding an event listener that calls `fs.writeFileSync` does NOT slow down a workflow — test by timing a 10-plan phase execution with and without the event bus active
- [ ] **Dashboard persistence after operation:** After `/pde:execute-phase` completes, the dashboard tmux session should still be open and show the final state — verify by running a complete phase and then checking `tmux ls`
- [ ] **Nested tmux detection:** Run `/pde:monitor` from inside an existing tmux session — it should switch to the monitor session, not error with "sessions should be nested with care"
- [ ] **Small terminal degradation:** Resize terminal to 80×24 and run `/pde:monitor` — it should either use a degraded layout or print a clear minimum-size error, not crash or show an empty window
- [ ] **No-dashboard operation:** Run `/pde:execute-phase` WITHOUT opening the monitor first — the operation should complete normally with zero perceptible performance impact from the event infrastructure
- [ ] **Concurrent operation safety:** Run two phases in parallel (if parallelization is enabled) and verify that the event log files are readable JSONL after both complete
- [ ] **Log file cleanup:** After a week of simulated PDE usage (create 30+ session log files), verify that old files are cleaned up and the .planning/logs/ directory does not grow unboundedly
- [ ] **Zero-npm constraint preserved:** Run `npm ls` at the plugin root after implementing the event bus — no new npm dependencies should appear
- [ ] **tmux not installed:** On a fresh environment without tmux, run `/pde:monitor` — it should detect the absence and print clear install instructions, not crash with a `command not found` error
- [ ] **Context pane labeling:** The context window pane must explicitly say "Orchestrator" or "Current agent" — not "Session" or "Total" which would imply it covers subagents

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Synchronous event emission causing latency | MEDIUM | Audit all emit() call sites; wrap each in setImmediate(); profile before/after; test listener I/O is async |
| Dashboard dies after operation | LOW | Add remain-on-exit to pane config; write completion sentinel to event log; retest lifecycle |
| Named pipes blocking operations | HIGH | Replace named pipe transport with log files; update all writer and reader code; regression test all workflow operations |
| Corrupted event log from concurrent writes | MEDIUM | Switch to session-scoped log files; replay affected operations; add concurrent-write test to validation suite |
| Deep instrumentation regression in a workflow file | MEDIUM | Add try-catch guard around all emit() calls; identify and fix the breaking file; confirm event infrastructure cannot propagate failures to primary workflows |
| Log files filling /tmp | LOW | Implement cleanup function with 7-day TTL; run once to clear accumulated files; add to session-start routine |
| Auto-install script broke a user's environment | HIGH | Document the restoration steps for each affected package manager; implement explicit --auto-install flag to prevent recurrence |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Synchronous emission blocks workflows (Pitfall 1) | Event bus design | Time a 10-plan phase with bus active; must be within 5% of baseline |
| Dashboard dies after operation (Pitfall 2) | tmux dashboard implementation | Run complete phase; confirm tmux session survives with remain-on-exit |
| Nested tmux session error (Pitfall 3) | tmux launch script | Test from inside existing tmux; confirm switch-client path executes |
| 6-pane layout on small terminals (Pitfall 4) | tmux layout implementation | Test at 80×24; adaptive/degraded layout must render without error |
| Deep instrumentation regression risk (Pitfall 5) | Instrumentation rollout | Layer-by-layer validation; no cross-file bulk instrumentation commits |
| Named pipe blocking (Pitfall 6) | Event bus design | Test operation without dashboard open; must complete with zero blocking |
| Auto-install failures on non-standard platforms (Pitfall 7) | tmux availability detection | Test on macOS, Ubuntu, Fedora; --auto-install opt-in required |
| Inaccurate context window tracking (Pitfall 8) | Context window pane implementation | Label review; range display; documented caveat about subagent contexts |
| Concurrent log corruption (Pitfall 9) | Event bus design | Run two parallel phases; verify JSONL is parseable after both complete |
| Log file accumulation (Pitfall 10) | Event infrastructure design | 30-session simulation; cleanup function runs; /tmp does not grow unboundedly |

---

## Sources

- PDE PROJECT.md v0.8 milestone requirements (event bus, tmux dashboard) — HIGH confidence (primary source)
- PDE codebase direct inspection: bin/lib/core.cjs (synchronous fs patterns), bin/pde-tools.cjs (hot path), workflows/execute-phase.md (instrumentation surface) — HIGH confidence
- Node.js official documentation: EventEmitter synchronous dispatch, fs.appendFile async — HIGH confidence ([nodejs.org/api/events.html](https://nodejs.org/api/events.html))
- Node.js race conditions blog post (nodejsdesignpatterns.com): concurrent file write race conditions — MEDIUM confidence
- tmux/tmux GitHub issue #3124: nested session "sessions should be nested with care" behavior — HIGH confidence ([github.com/tmux/tmux/issues/3124](https://github.com/tmux/tmux/issues/3124))
- tmux/tmux GitHub issue #1480: minimum pane size constraints — MEDIUM confidence
- FreeCodeCamp: "Tmux in Practice: Local and Nested Remote Sessions" — MEDIUM confidence ([freecodecamp.org/news/tmux-in-practice-local-and-nested-remote-sessions](https://www.freecodecamp.org/news/tmux-in-practice-local-and-nested-remote-sessions-4f7ba5db8795/))
- Propel.ai: "Token Counting Explained: tiktoken, Anthropic, and Gemini" — MEDIUM confidence (Claude 3+ has no local tokenizer; 3.5 char/token approximation error rate documented)
- Node.js EPIPE error documentation (w3tutorials.net/blog/nodejs-epipe) — MEDIUM confidence
- AWS Architecture Blog: "Leave-and-Layer Pattern for Event-Driven Modernization" — MEDIUM confidence (layered instrumentation strategy)
- Sindre Sorhus emittery GitHub (async event emitter pattern): setImmediate-based async dispatch — MEDIUM confidence ([github.com/sindresorhus/emittery](https://github.com/sindresorhus/emittery))
- tmux.info installation documentation: platform-specific package manager differences — HIGH confidence ([tmux.info/docs/installation](https://tmux.info/docs/installation))
- Claude Code sandboxing documentation: Bash tool constraints, bwrap/seatbelt restrictions — HIGH confidence ([code.claude.com/docs/en/sandboxing](https://code.claude.com/docs/en/sandboxing))

---

*Pitfalls research for: Adding event infrastructure and tmux monitoring dashboard to PDE (v0.8 Observability milestone)*
*Researched: 2026-03-19*
