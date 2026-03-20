# Project Research Summary

**Project:** Platform Development Engine (PDE) — v0.8 Observability & Event Infrastructure
**Domain:** Developer tool observability — tmux monitoring dashboard, structured event bus, session history
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

PDE v0.8 is an observability milestone that adds real-time monitoring capability to an existing Claude Code plugin. The core challenge is building production-quality event infrastructure under a strict zero-npm-dependency constraint, fitting entirely into a Node.js v20 CommonJS runtime with no package.json at the plugin root. Research confirms this is achievable using only Node.js built-ins: `node:events` for the in-process event bus, `node:child_process` for tmux CLI invocation, `node:fs` for NDJSON append-only event logs, and Claude Code's native hooks system as the primary instrumentation mechanism. Every evaluated npm alternative (node-tmux, stmux, blessed, ink, pino, winston, mitt, node-ipc) was ruled out by direct investigation — they either violate the constraint, are incompatible with PDE's execution model, or solve problems PDE does not have.

The recommended architecture separates concerns into three independent layers: a hooks-based capture layer (emit-event.cjs receiving Claude Code hook payloads and routing to pde-tools.cjs), a file-based persistence layer (session-scoped NDJSON event logs in /tmp), and a display layer (6-pane tmux dashboard using `tail -F` to follow those files). This file-based IPC model eliminates daemons, sockets, and persistent background processes — the tmux session becomes self-sustaining once launched. The most important architectural decision is using Claude Code's built-in hooks system (SubagentStart, SubagentStop, PostToolUse, SessionEnd, etc.) as the primary event capture mechanism rather than manual instrumentation across 70+ workflow files. Hooks fire automatically for every tool call, providing comprehensive coverage with zero changes to existing files.

The primary risks center on hook handler latency (blocking Claude Code agents), tmux lifecycle edge cases (nested sessions, small terminals, session persistence), and event log integrity during concurrent parallel agent waves. All risks have well-defined mitigations: keep hook handlers to a single file-append operation targeting under 10ms, use session-scoped NDJSON files (UUID in filename) to prevent concurrent write corruption, and implement terminal size guards with adaptive layout fallback from the first shipped version. Context window tracking must be explicitly labeled as orchestrator-only estimates with a range display, never implied to cover subagent contexts.

## Key Findings

### Recommended Stack

The entire v0.8 stack uses zero new npm dependencies. Six new `bin/lib/` modules cover all new capabilities using only Node.js built-ins. The Claude Code hooks system is the instrumentation backbone — hook events fire automatically without modifying existing workflow files. tmux interaction uses `spawnSync('tmux', [...args])` with array arguments (execFile semantics, no shell injection risk), the same approach used by tmuxinator and tmuxp. Token estimation uses a chars/4 heuristic sufficient for a display-only monitoring pane, with tokenx 1.3.0 (2kB, zero deps, 96% accuracy, CJS build confirmed) available as a vendor candidate if the heuristic proves too coarse.

**Core technologies (zero changes to baseline):**
- `Node.js v20 LTS + CommonJS`: Runtime and module system — already pinned, immovable constraint
- `node:events EventEmitter`: In-process event bus — zero cost, synchronous, CJS native; setMaxListeners(20) prevents warning at 6-pane scale
- `node:child_process spawnSync`: tmux CLI invocation — full tmux feature access via array args, no shell injection
- `node:fs appendFileSync`: NDJSON event log writes — POSIX atomic per-call for single-process writes; no locking needed in PDE's model
- `Claude Code hooks system (hooks/hooks.json)`: Primary instrumentation — automatic capture of all tool/agent lifecycle events without touching workflow files

**New lib modules (all zero-dependency):**
- `event-bus.cjs` — PdeEventBus singleton + session ID generation (crypto.randomUUID); wildcard `'*'` subscriber for log writer
- `event-logger.cjs` — NDJSON append to /tmp + .planning/logs/; rotation at 10MB
- `tmux-manager.cjs` — session/pane lifecycle via spawnSync; $TMUX detection; adaptive layout
- `pane-renderer.cjs` — ANSI codes + progress bars as inline constants (no library)
- `token-estimator.cjs` — chars/4 heuristic; optional tokenx 1.3.0 vendor; reads model-profiles.cjs (existing)
- `session-archiver.cjs` — reads NDJSON via readline; writes .planning/logs/ markdown summary at session end

See `.planning/research/STACK.md` for full rationale and alternatives considered.

### Expected Features

See `.planning/research/FEATURES.md` for full behavioral specifications, dependency graph, and competitor analysis.

**Must have (v0.8 core — all P1):**
- Structured event bus (in-process EventEmitter + hook scripts writing session-scoped NDJSON to /tmp) — foundational; all other features blocked without it
- Deep instrumentation via Claude Code hooks (SubagentStart/Stop, PostToolUse, SessionStart/End, Stop, PreCompact) — hooks provide automatic coverage; ~8 manual emits in 2 workflow files cover semantic events hooks cannot express
- `/pde:monitor` slash command — discoverable entry point; follows existing command pattern
- Auto-install check for tmux — detection + platform-aware install instructions; required before any session creation attempt
- 6-pane tmux dashboard — agent activity, pipeline progress (scoped to .planning/), file changes, log stream, token/cost meter, context window
- Persistent dashboard — tmux session stays open after PDE operation completes (remain-on-exit + sentinel event)
- Session summaries in `.planning/logs/` — written at SessionEnd regardless of whether dashboard was ever opened
- Raw event stream in /tmp — session-scoped NDJSON; OS-managed cleanup
- Future-proof event schema — schema_version: "1.0", extensions: {} on every event envelope

**Should have (v0.8.x after validation — P2):**
- Wave-aware agent activity pane — shows wave N of M grouping once orchestrators emit wave_started/wave_complete events
- Per-agent token breakdown in cost meter — once SubagentStop events reliably carry token counts

**Defer (v0.9+ — P3):**
- Stakeholder presentation generator — consumes .planning/logs/ session summaries (memory: project_stakeholder_presentations.md)
- Idle-time productivity system — triggered by agent wait events; pairs with tmux integration (memory: project_idle_time_productivity.md)
- Context window pane accuracy improvements — requires tokenizer API surface not currently exposed by Claude Code

**Anti-features (explicitly ruled out):**
- Web-based dashboard — PROJECT.md rules it out; requires persistent server, port, browser; incompatible with plugin model
- Persistent background monitoring daemon — no daemon lifecycle management in Claude Code plugin system
- Named pipes (FIFOs) for event transport — blocks indefinitely when no reader; log files with tail -F are equivalent for monitoring latency requirements
- Streaming to Datadog/OpenTelemetry — violates zero-npm constraint; defer to opt-in exporter in future milestone

### Architecture Approach

V0.8 keeps all 9 agents, all 13 design pipeline skills, and all existing lib modules entirely untouched. New code is additive: 9 new files, 4 surgical modifications. The primary pattern is hooks-first instrumentation — Claude Code fires emit-event.cjs on every tool call automatically, capturing the full event stream with zero changes to workflow files. All event data flows through a single write path: hook/emit → pde-tools.cjs event-emit subcommand → NDJSON append to /tmp. Dashboard panes are shell processes that `tail -F` the NDJSON file — no Node.js IPC, no daemon, no socket server required.

**Major components:**
1. `hooks/hooks.json + hooks/emit-event.cjs` — Claude Code hook declarations + thin stdin-to-pde-tools adapter (must be fast: single file append, under 10ms)
2. `pde-tools.cjs event-emit subcommand` — single write path; resolves session log path from config.json; appends NDJSON envelope
3. `bin/lib/event-bus.cjs` — EventEmitter wrapper + session ID (crypto.randomUUID); session ID persisted to .planning/config.json at SessionStart
4. `/tmp/pde-session-{uuid}.ndjson` — raw event stream; session-scoped UUID prevents concurrent write corruption
5. `bin/lib/tmux-manager.cjs` — 6-pane layout via spawnSync array args; $TMUX detection + switch-client path; terminal size guard
6. `bin/lib/session-archiver.cjs` — spawned async at SessionEnd; reads NDJSON via readline; writes .planning/logs/ summary
7. `bin/lib/token-estimator.cjs` — proxy estimation from event stream byte lengths; reads model-profiles.cjs (existing) for per-model pricing
8. `bin/lib/event-renderer.cjs` — NDJSON → human-readable pane output (pure stdin/stdout transformer; no file I/O per event)
9. `.planning/logs/` — new directory; structured markdown session summaries; permanent project record

**Build wave structure (from ARCHITECTURE.md — dependency-driven):**
- Wave 1 (parallel): Plan A (event infrastructure core), Plan B (tmux dashboard layer), Plan C (session archival layer)
- Wave 2 (after Wave 1 Plan A): Plan D (token/cost estimation), Plan E (workflow instrumentation)

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, component boundaries, anti-patterns, and build order rationale.

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for full inventory with warning signs, recovery strategies, and the "looks done but isn't" verification checklist.

1. **Synchronous event emission blocks workflow execution** — EventEmitter listeners fire synchronously; fs.writeFileSync in a listener adds 5-20ms per event; 50 events per phase = 500ms+ regression invisible to the developer. Prevention: fire-and-forget via `process.nextTick(() => emitEvent(...))` and `fs.appendFile` (async, not appendFileSync) in listeners. Verify: time a 10-plan phase with and without the bus active — must be within 5% of baseline.

2. **Named pipes block indefinitely when no reader is attached** — FIFO writes block until a reader opens the other end; running any PDE operation without the dashboard open would hang silently. Prevention: use append-only log files in /tmp exclusively; tail -F is resilient to reader absence, reader restart, and file rotation.

3. **Nested tmux session error when user is already inside tmux** — $TMUX is set; `tmux new-session` refuses with "sessions should be nested with care." This is the most common launch failure for the target user population. Prevention: check `[ -n "$TMUX" ]` before creating; use `tmux switch-client -t pde-monitor` if inside tmux; create session with `TMUX= tmux new-session -d` then switch.

4. **6-pane layout fails or produces unusable output on small terminals** — minimum usable terminal for 6 panes is ~120×30; MacBook 13" default is 80×24. Prevention: check `$(tput cols)` and `$(tput lines)` before layout creation; implement adaptive fallback to 2-pane essential layout (agent activity + pipeline progress). Required from first ship — not a future fix.

5. **Concurrent parallel agents corrupt a shared event log** — fs.appendFileSync is atomic only up to PIPE_BUF bytes (~4096); larger payloads from concurrent processes interleave. Prevention: session-scoped log paths (`/tmp/pde-session-{uuid}.ndjson`) from day one so each PDE invocation writes to its own file.

6. **Deep instrumentation as a single-pass change across 40+ files** — each emit call added is a potential regression; one syntax error fails an entire workflow; one failed event-bus import at top level fails all commands. Prevention: instrument in layers (hooks cover most → pde-tools.cjs centralized → 2 specific workflow files); lazy require with try-catch so event bus failure never propagates to primary workflows.

7. **Context window pane misleads users about subagent context** — token estimate measures orchestrator context only; spawned subagents may be at 85% independently. Prevention: label as "Orchestrator context (~estimated)"; display as range ("~35-45% used") with explicit "(estimated)" caveat; document limitation.

## Implications for Roadmap

The dependency graph from ARCHITECTURE.md and the pitfall-to-phase mapping from PITFALLS.md converge on the same build order. The critical constraint is: the event write path (event-emit subcommand in pde-tools.cjs) must exist and be stable before any consumer (dashboard panes, session archiver) is built. Plans B and C of Wave 1 are genuinely independent of each other and can be developed in parallel once Plan A is done.

### Phase 1: Event Infrastructure Core

**Rationale:** Everything downstream depends on NDJSON events flowing to /tmp. A hook that calls a non-existent pde-tools.cjs subcommand fails at hook fire time, blocking the Claude Code agent on every tool call. This is the write path — it must be stable before any reader is built. Pitfalls 1, 2, 6, and 9 (emission latency, named pipes, import failure propagation, concurrent corruption) must all be designed correctly in this phase — retrofitting is expensive.
**Delivers:** `hooks/hooks.json` + `hooks/emit-event.cjs`; `pde-tools.cjs event-emit` subcommand; `bin/lib/event-bus.cjs`; session ID management in .planning/config.json; session-scoped /tmp NDJSON write path with async dispatch
**Addresses:** Structured event bus (P1), Raw event stream in /tmp (P1), Future-proof event schema (P1), Deep instrumentation via hooks (partial — hooks layer complete; workflow manual emits deferred to Phase 5)
**Avoids:** Concurrent log corruption (session-scoped UUID paths), Named pipe blocking (log file approach from the start), Synchronous emission latency (async dispatch contract in event-bus.cjs), Import failure cascades (lazy require + try-catch guard)

### Phase 2: tmux Dashboard Layer

**Rationale:** Independent of session archival (Phase 3). Dashboard works with raw event tail display before estimation is wired up. No dependency on token-estimator — log stream and agent activity panes use raw tail -F output and event-renderer.cjs. This phase has the highest UX visibility and the most tmux lifecycle pitfalls, all of which must be addressed before first ship.
**Delivers:** `bin/lib/tmux-manager.cjs`; `bin/lib/pane-renderer.cjs`; `bin/lib/event-renderer.cjs`; `commands/monitor.md` (/pde:monitor skill); auto-install detection with platform-aware messages; $TMUX nested session detection + switch-client path; terminal size guard + adaptive 2-pane fallback; remain-on-exit pane configuration; session completion sentinel
**Addresses:** /pde:monitor command (P1), 6-pane tmux dashboard (P1), Auto-install check for tmux (P1), Persistent dashboard (P1)
**Avoids:** Nested tmux session error (switch-client path required at launch), Small terminal layout crash (size guard required before first ship), Dashboard dies silently (remain-on-exit + sentinel in pane config), Shell injection (spawnSync array args throughout)

### Phase 3: Session Archival Layer

**Rationale:** Independent of the tmux dashboard. A user who never opens /pde:monitor should still get session summaries in .planning/logs/. SessionEnd hook spawns the archiver as an async background process so it never blocks the agent. Log retention policy is a design decision in this phase — not a future addition, per Pitfall 10.
**Delivers:** `bin/lib/session-archiver.cjs`; `.planning/logs/` directory + `.gitkeep`; structured markdown session summaries on session end; retention policy (20 most recent summaries kept); .planning/logs/ added to .gitignore or documentation note
**Addresses:** Session summaries in .planning/logs/ (P1)
**Avoids:** Log file accumulation without bounds (retention policy required in first version), Blocking SessionEnd hook (async=true return with asyncTimeout)

### Phase 4: Token/Cost Estimation

**Rationale:** Requires event stream from Phase 1 to have data. model-profiles.cjs already exists — no new dependency. This enhances an already-functional dashboard; it is not a prerequisite for the display layer. Context window pane labeling decisions must be made in design here, not retrofitted after user complaints.
**Delivers:** `bin/lib/token-estimator.cjs`; cost pane content (estimated cost labeled "~est."); context window pane content (orchestrator-only, range display "~35-45% used", explicit "(estimated)" caveat); integration with watch -n 2 in tmux panes 5 and 6
**Addresses:** Token/cost meter (P2), Context window pane (P2)
**Avoids:** Context window pane misleading users (orchestrator-only label + range display required from design), Hardcoded model limits (reads from model-profiles.cjs)
**Research flag:** Needs validation — token count is not in hook payloads (confirmed gap); proxy measurement (byte length / 4) needs empirical validation against real session data. Also: if tokenx 1.3.0 is vendored, confirm the CJS build is current at implementation time.

### Phase 5: Workflow Instrumentation

**Rationale:** Requires pde-tools.cjs event-emit subcommand from Phase 1. Semantic workflow events (phase started, wave N of M, planning complete) enrich an already-flowing event stream — they are not prerequisites for the dashboard or archiver. Building this last keeps the regression surface minimal: ~8 calls in 2 files, after hooks already provide broad coverage.
**Delivers:** ~6 event-emit calls in `workflows/execute-phase.md` (phase_started, wave_started x N, wave_complete x N, phase_complete); ~2 event-emit calls in `workflows/plan-phase.md` (planning_started, planning_complete); wave_started/wave_complete events enabling future wave-aware pane
**Addresses:** Deep instrumentation at lifecycle points (P1 — hooks cover tool calls; this covers semantic workflow events)
**Avoids:** Deep instrumentation regression (layered approach: hooks already provide broad coverage from Phase 1; this phase is surgical, 2 files only), Bulk change regression risk (per-file validation before moving to next file)

### Phase Ordering Rationale

- **Write path before read path:** Phase 1 (write) must precede Phases 2, 3, 4, and 5 (all are consumers or enrichers of the event stream)
- **Display independence:** Phases 2 and 3 share no dependencies on each other — dashboard and archiver both consume the same NDJSON file but neither requires the other to be present
- **Enhancement after foundation:** Phases 4 and 5 add value to a working observability system; they are the correct candidates to defer to v0.8.x if implementation time runs short
- **Hooks before manual:** Claude Code hooks (Phase 1 design, wired in emit-event.cjs) provide automatic coverage of all tool calls before any manual instrumentation touches workflow files (Phase 5), minimizing regression risk and making Phase 5 scope surgically small
- **Pitfall map confirms this order:** Pitfalls 1, 2, 6, 9 (must be designed in Phase 1). Pitfalls 2, 3, 4 (must be addressed in Phase 2). Pitfall 5 (mitigated by doing Phase 5 last with minimal scope). Pitfall 10 (log retention addressed in Phase 3).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Token/Cost Estimation):** Token counts are confirmed absent from hook payloads. The proxy measurement approach needs empirical validation against real session NDJSON before committing to range display thresholds. Additionally: if tokenx 1.3.0 is vendored, verify the CJS build is still current at implementation time.
- **Phase 2 (tmux Dashboard):** Claude Code's sandbox (bwrap on Linux, seatbelt on macOS) may restrict tmux commands that modify the terminal outside the working directory scope. This must be tested through the actual Claude Code Bash tool — not in a raw shell — before assuming tmux commands will execute. If sandbox blocks tmux, the fallback is a log-only dashboard without pane management.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Event Infrastructure Core):** Node.js EventEmitter + NDJSON append is a well-documented zero-dependency pattern. Hook JSON format verified against official Claude Code plugin docs. All decisions are grounded in established patterns.
- **Phase 3 (Session Archival):** Markdown summary generation follows established tracking.cjs patterns already in the codebase. readline streaming of NDJSON is standard Node.js. No unknowns.
- **Phase 5 (Workflow Instrumentation):** Adding bash calls to execute-phase.md follows a pattern used 20+ times in that file already. Scope is explicitly limited to ~8 calls in 2 files.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero-npm approach verified by codebase inspection. All alternatives ruled out with concrete evidence (node-tmux GitHub confirmed, stmux behavior confirmed, blessed unmaintained). tokenx 1.3.0 is MEDIUM — vendoring candidate, not required for v0.8. |
| Features | HIGH | Claude Code hooks API verified against official docs. Competitor analysis (disler/claude-code-hooks-multi-agent-observability) confirms hooks approach is viable. Context window pane accuracy is LOW — inherently estimated, not measured. |
| Architecture | HIGH | Grounded in direct codebase inspection of pde-tools.cjs, tracking.cjs, execute-phase.md, model-profiles.cjs, and mcp-bridge.cjs. Hook payload fields verified against official Claude Code Agent SDK docs. Build wave structure follows verified dependency graph. |
| Pitfalls | HIGH | 10 pitfalls with concrete prevention strategies, warning signs, and verification checklists. Nested tmux issue verified against tmux/tmux GitHub issue #3124. Concurrent write atomic semantics verified against POSIX. Blocking hook handler risk verified against Claude Code cost docs and hooks reference. |

**Overall confidence:** HIGH

### Gaps to Address

- **Token count absent from hook payloads (confirmed gap):** Official docs confirm token counts are not in hook payloads. The proxy measurement (tool_input byte length / 4) needs empirical validation during Phase 4 implementation. Accept that the context pane will always be approximate and label accordingly. Range display ("~35-45%") is the correct UX choice.
- **Claude Code sandbox + tmux compatibility (unverified):** The sandbox may block tmux commands that modify the terminal. This must be tested through the actual Claude Code Bash tool during Phase 2. Fallback path: log-only dashboard without tmux pane management, outputting to stdout instead.
- **tokenx 1.3.0 vendoring decision (deferred):** Chars/4 heuristic should be tried first during Phase 4 implementation. Vendor tokenx only if it proves too coarse for the context window pane to provide useful signal. Vendoring path is clear (copy bin/lib/vendor/tokenx.cjs) but the trigger condition is empirical.
- **fswatch vs inotifywait availability (platform gap):** The file changes pane uses fswatch (macOS) and inotifywait (Linux) — neither is a Node.js built-in. Both must be confirmed available in target environments during Phase 2, with a 2-second polling fallback (`watch -n 2`) if neither is present.

## Sources

### Primary (HIGH confidence)

- PDE codebase direct inspection (2026-03-19) — bin/pde-tools.cjs (subcommand pattern), bin/lib/tracking.cjs (markdown write pattern), workflows/execute-phase.md (bash call patterns + instrumentation injection points), bin/lib/model-profiles.cjs (model-to-agent mapping), bin/lib/mcp-bridge.cjs (zero-npm lib module pattern), .planning/PROJECT.md (v0.8 requirements, zero-npm constraint)
- Claude Code Plugins reference (code.claude.com/docs/en/plugins-reference) — hooks.json format, hook event types, CLAUDE_PLUGIN_ROOT variable, plugin root constraints
- Claude Code Agent SDK Hooks reference (platform.claude.com/docs/en/agent-sdk/hooks) — hook payload fields (session_id, agent_id, agent_type, agent_transcript_path, tool_name, tool_input), SubagentStart/SubagentStop details, async hook return format
- Claude Code cost management docs (code.claude.com/docs/en/costs) — /cost command behavior; token data absent from hook payload (gap confirmed)
- Node.js EventEmitter official docs (nodejs.org/api/events.html) — setMaxListeners, synchronous dispatch, event naming
- node-tmux GitHub (StarlaneStudios) — confirmed only 6 session-level methods; no pane addressing; no split-window; no send-keys with pane targeting
- tmux man page (man7.org/linux/man-pages/man1/tmux.1.html) — send-keys, split-window, select-layout, pane addressing all confirmed
- tmux/tmux GitHub issue #3124 — nested session "$TMUX" behavior confirmed
- stmux GitHub (rse) — confirmed blessed-based pseudo-multiplexer; does not create real tmux sessions
- Anthropic token counting docs (docs.claude.com/en/docs/build-with-claude/token-counting) — /v1/messages/count_tokens endpoint; RPM limits

### Secondary (MEDIUM confidence)

- disler/claude-code-hooks-multi-agent-observability — hooks-based event capture architecture reference; Vue+Bun+SQLite approach (PDE uses NDJSON file instead; no server required)
- tokenx npm/GitHub (johannschopplich/tokenx) — v1.3.0, 2kB, zero deps, ~96% accuracy, CJS build confirmed, zero transitive deps
- ccusage.com session reports — JSONL session transcript format; session-level aggregation patterns
- agent-teams-tmux (lobehub.com) — 5-second refresh interval pattern; fswatch/inotifywait/polling fallback pattern
- NTM (Named Tmux Manager, Dicklesworthstone) — tiled pane layouts for multi-agent systems
- Pino vs Winston comparison (betterstack.com) — both designed for high-throughput APIs; confirmed neither matches PDE's simple append-only need
- codelynx.dev Claude Code context estimation — chars/4 confirmed as common approximation
- Node.js race conditions patterns (nodejsdesignpatterns.com) — concurrent file write semantics
- Sindre Sorhus emittery GitHub — setImmediate-based async dispatch pattern (reference for fire-and-forget emission)
- AWS Architecture Blog leave-and-layer pattern — layered instrumentation strategy (centralized first, distributed second)
- Claude Code sandboxing docs (code.claude.com/docs/en/sandboxing) — bwrap/seatbelt restrictions; Bash tool constraints

### Tertiary (LOW confidence)

- Datadog Claude Code Monitoring (2026) — confirms market direction for Claude Code observability; OpenTelemetry as downstream compatibility target; not applicable to v0.8
- Propel.ai token counting accuracy analysis — Claude 3+ char/token approximation error rate documented at 20-30% for code-heavy vs prose-heavy context

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
