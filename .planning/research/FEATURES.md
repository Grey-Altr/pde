# Feature Research

**Domain:** Developer tool observability — tmux monitoring dashboard and structured event infrastructure (v0.8)
**Researched:** 2026-03-19
**Confidence:** HIGH (Claude Code hooks API verified via official docs, PDE codebase verified directly), MEDIUM (tmux dashboard patterns from multiple community sources and adjacent tools), LOW (specific behavioral expectations from single sources, flagged inline)

---

> **Scope note:** This file covers ONLY the v0.8 observability milestone. PDE's existing capabilities (34 slash commands, multi-agent parallel wave orchestration, file-based state management in `.planning/`, workflow-status.md tracking, pde-tools.cjs instrumentation points, session stats via `/pde:stats`) are stable dependencies — not re-built here. Every feature described is additive to the v0.7 baseline.

---

## Baseline: What v0.7 Provides (Stable Dependency)

```
Event sources (existing):
  pde-tools.cjs          — CLI commits, phase ops, tracking updates, readiness checks
  workflows/             — Orchestrators that spawn agents and coordinate pipeline
  agents/                — 9 named agents (analyst, plan-checker, researcher, etc.)
  bin/lib/tracking.cjs   — Per-task status tracking, workflow-status.md, HANDOFF.md

Observability today (pre-v0.8):
  /pde:stats             — Project-level aggregated stats (phases, plans, git metrics)
  workflow-status.md     — Per-task status table (TODO/IN_PROGRESS/DONE/SKIPPED)
  HANDOFF.md             — Session-break continuity doc
  .planning/STATE.md     — Top-level project state
  RECONCILIATION.md      — Planned vs. actual git commits (post-execution)

What is missing:
  - No real-time visibility during agent execution
  - No structured event stream from agent spawning, tool calls, or task transitions
  - No persistent session history beyond per-phase SUMMARY.md files
  - No tmux-based live monitoring surface
  - No token/cost tracking during a live session
  - No way to observe parallel agent waves as they execute
```

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are baseline requirements for a "developer tool observability" milestone. Without these, PDE's multi-agent orchestration remains a black box during execution.

| Feature | Why Expected | Complexity | Dependencies on Existing PDE Infrastructure |
|---------|--------------|------------|---------------------------------------------|
| **Structured event bus (in-process, file-backed)** | Every developer observability tool that works with AI agents captures a structured event stream. Without events, the dashboard has nothing to display and session history has nothing to store. This is the foundational layer everything else reads. Missing = no observable data at all. | MEDIUM | Uses Node.js `EventEmitter` (zero-dependency); event schema designed as append-only JSONL per session in `/tmp/pde-events-{sessionId}.jsonl`; reads nothing from existing infra, but existing infra emits into it |
| **Deep instrumentation at existing PDE lifecycle points** | The instrumentation points already exist conceptually: agent spawn/stop, task status transitions, pde-tools.cjs commits, workflow phase transitions. Without emitting structured events at these points, the event bus carries no signal. Users expect the tool they already use to be observable, not just a new tool layered on top. | MEDIUM | Hooks into: workflows spawning agents (SubagentStart/Stop via Claude Code hooks), pde-tools.cjs tracking set-status calls, pde-tools.cjs commit command, check-readiness results, wave-start/end markers in orchestrators |
| **`/pde:monitor` command to launch tmux dashboard** | A named, explicit command to start the monitoring surface is the expected UX pattern for developer tools with optional monitoring (k9s, lazygit, htop all work this way — invoked explicitly). Without an explicit launch command, users have no discoverable entry point. | LOW | New slash command following existing command pattern (frontmatter + workflow delegation); launches a shell script that creates the tmux session |
| **6-pane tmux dashboard layout** | The PROJECT.md specification calls out 6 specific panes. These map to the six most commonly expected information categories in developer tool monitoring: who is working, what is progressing, what is changing, what is logged, what does it cost, and how much context remains. Any subset would leave a gap that users hit in practice. | MEDIUM | Reads: workflow-status.md (task progress), event JSONL (agent activity + log stream), git log --oneline (file changes), pde-tools.cjs state-snapshot (context window), token/cost from Claude Code hooks |
| **Auto-install check for tmux dependency** | PDE targets Claude Code plugin users who may not have tmux installed. Silently failing or producing a cryptic error when `/pde:monitor` is invoked without tmux breaks user trust immediately. The expected behavior in any developer CLI that depends on an external tool is: detect → inform → offer install command. | LOW | Shell `command -v tmux` check in the launch script; platform detection (uname for macOS/Linux); offers `brew install tmux` on macOS, `sudo apt install tmux` on Debian/Ubuntu |
| **Persistent dashboard (survives operation completion)** | If the dashboard exits when the PDE command finishes, users get a flash of activity they cannot review. The standard pattern for tmux-based monitoring tools is to keep the session alive, showing the final state until the user explicitly closes it. | LOW | `tmux new-session -d` (detached creation); dashboard process polls event file independently of PDE session; user exits with `q` or `Ctrl+C` in the dashboard pane |
| **Structured session summaries in `.planning/logs/`** | Users reviewing what happened in a previous session expect a human-readable summary stored alongside other `.planning/` artifacts. SUMMARY.md files exist per phase, but a session-level summary (what commands ran, which agents were spawned, how long each took, final status) is missing. Session summaries are table stakes for any tool that claims to support reviewable history. | MEDIUM | Written at session end (SessionEnd hook); reads from event JSONL to produce structured markdown; stored as `.planning/logs/session-{date}-{sessionId}.md`; format mirrors existing SUMMARY.md conventions |
| **Raw event stream in `/tmp`** | Raw event JSONL files in `/tmp` provide the machine-readable history that powers session summaries and future analytics. Using `/tmp` (volatile, auto-cleaned) is correct for raw event streams — they are ephemeral observations, not planning artifacts. The `.planning/logs/` summaries are the durable record. | LOW | Append-only JSONL file per session; written by event bus emitter hook scripts; each line is a valid JSON event object with schema version, timestamp, session_id, agent_id, event_type, payload |

### Differentiators (Competitive Advantage)

Features that go beyond basic monitoring visibility and give PDE a qualitatively better observability story aligned with its multi-agent architecture.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Agent activity pane with wave awareness** | PDE's parallel wave orchestration spawns agents in coordinated waves. A simple "agent list" pane misses the wave structure. Showing wave N of M, which agents are in the current wave, and per-agent status within the wave gives users meaningful signal about parallel progress — not just a flat process list. Most AI agent monitors show flat agent lists; wave-aware display is specific to PDE's orchestration model. | MEDIUM | Wave markers emitted as events by orchestrator workflows (`wave-start`, `wave-end` event types with wave_number and agent_count); dashboard aggregates per-wave |
| **Token/cost meter with per-agent breakdown** | Claude Code's `/cost` command shows session total. A per-agent, per-wave breakdown during live execution tells users which agents are expensive and which complete quickly. For multi-agent pipelines that can spawn 4-6 agents per wave, this is the data needed to decide whether to run a full pipeline or a targeted single-skill invocation. | MEDIUM-HIGH | Requires Claude Code hooks on SubagentStop events that include token usage from transcript; token count parsing from JSONL transcript; display as running total per agent with session grand total |
| **Future-proof event schema with extensibility fields** | PDE's memory file (`project_stakeholder_presentations.md`, `project_idle_time_productivity.md`) describes future milestones that would consume event data — stakeholder presentations generated from session events, idle-time productivity triggered by agent wait states. Building the event schema with `extensions: {}` and `schema_version` from the start means future milestones add consumers without modifying producers. This is the difference between infrastructure and a one-off script. | LOW-MEDIUM | Event schema includes: `event_id`, `schema_version`, `session_id`, `agent_id` (nullable), `event_type`, `timestamp_iso`, `duration_ms` (nullable), `payload`, `extensions` (free-form object). Schema version bumps are additive only. |
| **Context window utilization pane** | Claude Code sessions have a fixed context window. As agent memory loads, PLAN.md shards are read, and RESEARCH.md is injected, the effective context fills. A live "context window utilization" pane (showing estimated token usage as a fraction of the model's context limit) lets users see when context is approaching capacity — a leading indicator for the PreCompact hook firing, which disrupts agent continuity. | HIGH | Context window estimation is not exposed directly by Claude Code API; requires inference from transcript token counts + known model context limits; display as percentage bar; mark as LOW confidence on accuracy — this is an estimate, not a measurement |
| **File change pane scoped to `.planning/`** | Generic file watchers show all project changes. For PDE, the meaningful changes during a pipeline run are `.planning/` state mutations — PLAN.md being written, task-NNN.md shards appearing, workflow-status.md updating, READINESS.md being generated. Scoping the file change pane to `.planning/` surfaces the signal a PDE user cares about without the noise of source code changes happening in parallel. | LOW | `fswatch -r .planning/` on macOS, `inotifywait -r .planning/` on Linux (fallback: polling every 2s); tail the output into the dashboard pane |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Web-based dashboard (browser UI)** | A browser dashboard can show graphs, filters, and rich visualizations. Much more polished than tmux. | PROJECT.md explicitly rules this out: "In-tool web dashboard / UI — markdown files are the dashboard." Web dashboards require a persistent server process, which conflicts with PDE's session-based plugin model. They also require a port, browser access, and introduce a separate runtime dependency. The tmux terminal approach is available wherever PDE runs. | tmux panes with tail/watch patterns. Terminal rendering is sufficient for the data types PDE needs to display (lists, progress bars, log streams). |
| **Persistent background monitoring process** | "Always-on" monitoring that starts when Claude Code loads and runs indefinitely, even when PDE commands aren't active. | PDE is a Claude Code plugin invoked per session. There is no persistent background process model in Claude Code. Attempting to spawn a daemon from a plugin creates processes that outlive the session with no managed lifecycle, and can accumulate across sessions creating resource leaks. | `/pde:monitor` as an explicit on-demand launch. The tmux session persists until the user closes it. This is the correct model: monitoring is active when users want it. |
| **Streaming events to external observability platforms (Datadog, etc.)** | Enterprise teams want to aggregate PDE events alongside their application telemetry. Datadog has native Claude Code monitoring support as of 2026. | PDE's zero-npm-deps-at-plugin-root constraint prevents adding an OpenTelemetry SDK or Datadog agent to the plugin root. HTTP hooks could forward events, but this creates external service dependencies, requires credentials management, and adds network latency to agent lifecycle events. | The JSONL event stream format is compatible with OpenTelemetry's log data model. A future milestone could add an opt-in exporter as a separate optional module. For v0.8, file-based JSONL is sufficient and privacy-preserving. |
| **Intercepting/blocking tool calls for approval via dashboard** | tmux-based dashboards for AI agents sometimes offer interactive approval — seeing a tool call and clicking approve/deny in the dashboard. | Claude Code's hooks system (PreToolUse) already provides blocking capability via command hooks. Adding a second approval path through the dashboard creates two competing control surfaces with unclear priority. PDE's existing protected-files mechanism uses the hooks system correctly. | Use Claude Code PreToolUse hooks for blocking decisions. The dashboard is read-only observability. Approval decisions remain in the hooks system where they have defined semantics. |
| **Historical event replay (scrub through past sessions)** | Developers who debug by replaying event timelines expect to scrub backward through a session. | PDE's JSONL event files in `/tmp` are ephemeral by design. Building replay infrastructure requires either persisting raw events to `.planning/` (bloats planning state) or adding a separate event store. The session summary in `.planning/logs/` provides the durable, human-readable history that satisfies the same need. | `.planning/logs/session-{date}.md` structured summaries are the durable record. If a user needs to investigate a specific session, they read the summary. Raw events in `/tmp` are available until the system cleans `/tmp`, which is typically sufficient for same-session debugging. |
| **Real-time token counting via API calls** | Accurate token counting could be achieved by calling Claude's tokenizer API for each piece of content as it is processed. | This would add API calls (with latency and cost) to every agent action for the purpose of display-only information. The context window pane is a convenience feature, not a safety critical one. Estimation from transcript token counts is sufficient signal for users to notice when context is getting full. | Estimate from JSONL transcript token counts and model context limit constants. Display as approximate percentage with a visual indicator. Clearly labeled as estimate in the UI. |

---

## Feature Dependencies

```
[Structured Event Bus (in-process, file-backed)]
    └──required-by──> ALL dashboard panes (no events = no dashboard data)
    └──required-by──> [Session Summaries in .planning/logs/]
    └──required-by──> [Raw Event Stream in /tmp]
    └──required-by──> [Token/Cost Meter with Per-Agent Breakdown]
    └──required-by──> [Future: Stakeholder Presentations] (consumes events)
    └──required-by──> [Future: Idle-Time Productivity] (triggered by agent wait events)

[Deep Instrumentation at Existing PDE Lifecycle Points]
    └──depends-on──> [Structured Event Bus]
    └──hooks-into──> [EXISTING: workflows/ agent spawn patterns]
    └──hooks-into──> [EXISTING: pde-tools.cjs tracking set-status]
    └──hooks-into──> [EXISTING: pde-tools.cjs commit]
    └──hooks-into──> Claude Code hooks (SubagentStart, SubagentStop, PreToolUse, PostToolUse)
    └──required-by──> [Agent Activity Pane with Wave Awareness]
    └──required-by──> [Pipeline Progress Pane] (reads workflow-status.md + task events)

[/pde:monitor Command]
    └──depends-on──> [Auto-Install Check for tmux]
    └──launches──> [6-Pane tmux Dashboard Layout]
    └──requires──> tmux available on PATH

[Auto-Install Check for tmux]
    └──standalone (shell detection only, no PDE infra dependency)
    └──required-by──> [/pde:monitor Command]

[6-Pane tmux Dashboard Layout]
    └──depends-on──> [Structured Event Bus] (agent activity, log stream panes)
    └──reads──> [EXISTING: workflow-status.md] (pipeline progress pane)
    └──reads──> .planning/ filesystem (file changes pane via fswatch/inotifywait)
    └──reads──> Claude Code session transcript (token/cost pane, context window pane)
    └──required-by──> [Persistent Dashboard]

[Persistent Dashboard]
    └──depends-on──> [6-Pane tmux Dashboard Layout]
    └──polls──> event JSONL file independently of PDE session lifecycle

[Session Summaries in .planning/logs/]
    └──depends-on──> [Structured Event Bus]
    └──written-by──> SessionEnd hook
    └──reads-from──> event JSONL in /tmp
    └──writes-to──> .planning/logs/session-{date}-{sessionId}.md

[Raw Event Stream in /tmp]
    └──depends-on──> [Structured Event Bus]
    └──written-by──> hook scripts on each lifecycle event
    └──read-by──> dashboard panes, session summary generator

[Future-Proof Event Schema]
    └──shapes──> [Structured Event Bus] (schema is the contract, not the implementation)
    └──enables──> [Future: Stakeholder Presentations]
    └──enables──> [Future: Idle-Time Productivity]
    └──enables──> [Future: Analytics/Reporting milestones]

[Token/Cost Meter with Per-Agent Breakdown]
    └──depends-on──> [Structured Event Bus] (reads SubagentStop events with token counts)
    └──displayed-in──> [6-Pane tmux Dashboard Layout]

[Agent Activity Pane with Wave Awareness]
    └──depends-on──> [Deep Instrumentation] (wave-start/wave-end events required)
    └──displayed-in──> [6-Pane tmux Dashboard Layout]

[Context Window Utilization Pane]
    └──depends-on──> [Structured Event Bus] (reads transcript token accumulation)
    └──displayed-in──> [6-Pane tmux Dashboard Layout]
    └──NOTE──> accuracy is estimated, not measured (LOW confidence on precision)
```

### Dependency Notes

- **Event bus is the critical path:** All dashboard panes, session history, and future-proof extensibility depend on the event bus. It must be built first and be stable before any display or storage feature is layered on.

- **Claude Code hooks are the primary instrumentation mechanism:** The platform provides 26 hook events (SessionStart, SessionEnd, SubagentStart, SubagentStop, PreToolUse, PostToolUse, TaskCompleted, Stop, etc.) via `.claude/settings.json` hook configuration. These are the authoritative, Anthropic-supported way to observe agent lifecycle in Claude Code plugins. PDE-specific events (wave boundaries, task transitions) supplement these with additional in-process emissions.

- **tmux dependency check must be first in the `/pde:monitor` flow:** If tmux is not available and the script attempts to create a session before checking, users get a confusing error. Detection-before-use is mandatory.

- **Session summaries depend on event bus but are independent of the dashboard:** A user who never opens `/pde:monitor` should still get session summaries in `.planning/logs/`. The summary writer hooks into SessionEnd regardless of whether the dashboard is running.

- **Wave awareness is a PDE-specific differentiator:** Generic Claude Code monitoring tools (disler's multi-agent observability, NTM) show flat agent lists. Wave-aware display requires PDE's orchestrators to emit wave_start/wave_end events, which no external tool provides.

---

## MVP Definition (for v0.8 Milestone)

### Launch With (v0.8 core — minimum to satisfy "observability" claim)

- [ ] **Structured event bus** — in-process EventEmitter + hook scripts writing append-only JSONL per session to `/tmp/pde-events-{sessionId}.jsonl`. Schema includes: `event_id`, `schema_version`, `session_id`, `agent_id`, `event_type`, `timestamp_iso`, `payload`, `extensions`.
- [ ] **Deep instrumentation** — hook scripts wired to SubagentStart, SubagentStop, PreToolUse, PostToolUse, TaskCompleted, Stop, SessionStart, SessionEnd. In-process events from pde-tools.cjs at: tracking set-status, commit, check-readiness result.
- [ ] **`/pde:monitor` command** — slash command that runs tmux dependency check, then launches the 6-pane dashboard in a detached tmux session named `pde-monitor`.
- [ ] **Auto-install check for tmux** — `command -v tmux` check; platform detection via `uname`; offers `brew install tmux` (macOS) or `sudo apt install tmux` (Linux); exits gracefully if user declines.
- [ ] **6-pane tmux dashboard** — agent activity, pipeline progress, file changes (`.planning/` scoped), log stream (event tail), token/cost meter, context window. Each pane is a shell process reading from the event JSONL or existing PDE files.
- [ ] **Persistent dashboard** — tmux session stays open after PDE command completes; dashboard processes poll event file; user closes with session-level kill command.
- [ ] **Session summaries in `.planning/logs/`** — structured markdown summary written at SessionEnd; reads from event JSONL; stored as `session-{YYYY-MM-DD}-{sessionId}.md`; format: command invoked, agents spawned (count + names), tasks completed, duration, token totals, final status.
- [ ] **Raw event stream in `/tmp`** — JSONL file per session; automatically cleaned by OS `/tmp` lifecycle; no PDE-managed cleanup required.
- [ ] **Future-proof event schema** — `schema_version: "1.0"`, `extensions: {}` field in every event; documented in a schema reference file.

### Add After Validation (v0.8.x — extend once core is working)

- [ ] **Wave-aware agent activity pane** — once orchestrators emit wave_start/wave_end events, upgrade the agent pane to show wave N of M grouping. Add when users report the flat agent list is insufficient for understanding parallel wave progress.
- [ ] **Per-agent token breakdown in cost meter** — once SubagentStop events reliably include token counts from transcript parsing, add per-agent rows to the cost meter pane. Add when users report session-total cost is too coarse.

### Future Consideration (v0.9+)

- [ ] **Stakeholder presentation generator** — consumes `.planning/logs/` session summaries + phase SUMMARY.md files to produce polished presentations. Event schema `extensions` field carries the metadata this consumer will need. Tracked in memory as `project_stakeholder_presentations.md`.
- [ ] **Idle-time productivity system** — triggered by TeammateIdle or agent wait events from the event bus. Dashboard shows guided productivity prompts during processing wait times. Tracked in memory as `project_idle_time_productivity.md`. Pairs with tmux integration (memory `project_tmux_monitoring.md`).
- [ ] **Context window pane accuracy improvements** — currently estimated; future improvement requires either a tokenizer library or Claude Code API surface that exposes exact token counts. Defer until accurate data is available.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Structured event bus | HIGH — foundational; all other features blocked without it | MEDIUM | P1 |
| Deep instrumentation at lifecycle points | HIGH — no signal without emitters at meaningful points | MEDIUM | P1 |
| Auto-install check for tmux | HIGH — first UX failure point; immediate trust damage if absent | LOW | P1 |
| `/pde:monitor` command | HIGH — discoverable entry point for all monitoring UX | LOW | P1 |
| 6-pane tmux dashboard | HIGH — the primary visible output of the milestone | MEDIUM | P1 |
| Persistent dashboard | MEDIUM — without persistence, dashboard is decoration | LOW | P1 |
| Session summaries in `.planning/logs/` | HIGH — durable history; works even without dashboard | MEDIUM | P1 |
| Raw event stream in `/tmp` | MEDIUM — powers summaries; useful for debugging | LOW | P1 |
| Future-proof event schema | HIGH — low cost to do right from the start; very high cost to retrofit | LOW-MEDIUM | P1 |
| Wave-aware agent activity pane | MEDIUM — differentiator; not blocking for v0.8 | MEDIUM | P2 |
| Per-agent token breakdown | MEDIUM — useful when running expensive pipelines | MEDIUM-HIGH | P2 |
| Context window utilization pane | MEDIUM — useful signal; low accuracy acceptable for display purposes | HIGH | P2 |
| Stakeholder presentations | HIGH (future) — depends on durable session history being in place | HIGH | P3 |
| Idle-time productivity | MEDIUM (future) — depends on agent wait events being emitted | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v0.8 milestone to close ("observability" claim requires these)
- P2: Include if implementation time permits; strong v0.8.x candidates
- P3: Future milestone (v0.9+) — event schema must be designed with these consumers in mind

---

## Behavioral Expectations by Feature

### Structured Event Bus

**Core event types (minimum required):**
- `session_start` — fired by SessionStart hook; payload: `{ invoked_command, cwd }`
- `session_end` — fired by SessionEnd hook; payload: `{ duration_ms, commands_run, agents_spawned, tasks_completed }`
- `agent_start` — fired by SubagentStart hook; payload: `{ agent_type, agent_id, parent_session }`
- `agent_stop` — fired by SubagentStop hook; payload: `{ agent_type, agent_id, duration_ms, exit_status }`
- `task_status_change` — fired by pde-tools.cjs tracking set-status; payload: `{ task_num, task_name, from_status, to_status, phase, plan }`
- `tool_use` — fired by PostToolUse hook; payload: `{ tool_name, duration_ms, success }`
- `commit` — fired by pde-tools.cjs commit; payload: `{ message, files_changed }`
- `readiness_result` — fired by pde-tools.cjs readiness check; payload: `{ phase, result: "PASS"|"CONCERNS"|"FAIL", item_counts }`

**Extension event types (v0.8.x, when orchestrators emit them):**
- `wave_start` — payload: `{ wave_number, wave_total, agent_count, wave_type }`
- `wave_end` — payload: `{ wave_number, duration_ms, agents_completed, agents_failed }`

**Schema contract (every event):**
```json
{
  "event_id": "uuid-v4",
  "schema_version": "1.0",
  "session_id": "string",
  "agent_id": "string|null",
  "event_type": "string",
  "timestamp_iso": "2026-03-19T14:22:00.000Z",
  "duration_ms": "number|null",
  "payload": {},
  "extensions": {}
}
```

### 6-Pane tmux Dashboard

**Pane 1 — Agent Activity:**
- Source: event JSONL tail filtered to `agent_start`, `agent_stop`, `wave_start`, `wave_end`
- Display: scrolling list; most recent agent at bottom; format: `[HH:MM:SS] STARTED pde-plan-checker (wave 2/3)`
- Refresh: event-driven (tail -f)

**Pane 2 — Pipeline Progress:**
- Source: `.planning/phases/{phase}/workflow-status.md` for active phase; pde-tools.cjs tracking read
- Display: task table with status badges (TODO/IN_PROGRESS/DONE/SKIPPED); phase and plan header
- Refresh: file watch on workflow-status.md (inotifywait/fswatch/poll every 2s fallback)

**Pane 3 — File Changes:**
- Source: fswatch/inotifywait on `.planning/` directory tree
- Display: tail of recent file write events; format: `[HH:MM:SS] MODIFIED .planning/phases/58/PLAN.md`
- Refresh: event-driven (fswatch output pipe)

**Pane 4 — Log Stream:**
- Source: event JSONL tail (all event types)
- Display: raw event stream, human-readable format (not raw JSON); format: `[HH:MM:SS] [tool_use] Bash — 1240ms`
- Refresh: event-driven (tail -f)

**Pane 5 — Token/Cost Meter:**
- Source: event JSONL filtered to `agent_stop` events with token_count in payload; Claude Code `/cost` command output if available
- Display: running session total (tokens + estimated cost); per-agent breakdown when v0.8.x wave-aware data is available
- Refresh: poll every 5s

**Pane 6 — Context Window:**
- Source: session JSONL transcript token count estimation (cumulative tokens from transcript)
- Display: percentage bar (approximate); model name and limit; "~X% used" label with "(estimated)" caveat
- Refresh: poll every 10s
- Confidence: LOW — this is an estimate, not a measurement from the API

### Auto-Install Check for tmux

**Detection flow:**
```
command -v tmux → exists → proceed with dashboard launch
command -v tmux → not found → detect platform
    uname → Darwin → offer: "Install with: brew install tmux"
    uname → Linux → check apt: offer: "Install with: sudo apt install tmux"
    uname → other → "Install tmux manually: https://github.com/tmux/tmux/wiki/Installing"
→ offer to run install command automatically (yes/no prompt)
→ on decline: exit with clear message "Run /pde:monitor after installing tmux"
```

### Session Summaries in `.planning/logs/`

**File format:** `.planning/logs/session-{YYYY-MM-DD}-{short-id}.md`

**Content structure:**
```markdown
---
session_id: abc123
date: 2026-03-19
command: /pde:execute-phase
duration_seconds: 847
agents_spawned: 6
tasks_completed: 5
tasks_total: 5
token_estimate: 142000
schema_version: "1.0"
---

# Session Summary: /pde:execute-phase

**Date:** 2026-03-19 14:22 – 14:36
**Duration:** 14m 7s
**Status:** COMPLETE

## Agents

| Agent | Duration | Status |
|-------|----------|--------|
| pde-plan-checker | 2m 14s | DONE |
| pde-executor (wave 1) | 4m 03s | DONE |
...

## Tasks Completed

Phase 58, Plan 1: 5/5 tasks DONE

## Token Estimate

~142,000 tokens (session estimate)

## Key Events

- 14:22:01 Session started
- 14:22:03 Agent pde-plan-checker spawned
- 14:24:17 Readiness check: PASS
- 14:24:19 Executor wave 1 started (3 agents)
...
```

---

## Competitor Feature Analysis

| Feature | disler/claude-code-hooks-multi-agent-observability | NTM (Named Tmux Manager) | PDE v0.8 Approach |
|---------|---------------------------------------------------|--------------------------|--------------------|
| Event capture | Claude Code hooks → HTTP POST → SQLite | tmux pane management only | Hooks → JSONL file; no HTTP server required |
| Dashboard | Vue 3 browser dashboard on localhost:5173 | tmux pane layout with AI agents | tmux panes with shell tail processes; no server |
| Persistence | SQLite database (durable) | Session-level only | JSONL in /tmp (ephemeral) + summaries in .planning/logs/ (durable) |
| Wave awareness | None — flat agent list | None | PDE-specific: wave_start/wave_end events from orchestrators |
| Install complexity | Bun server + Vue client + Python hooks | Go binary | Shell scripts + tmux + existing Node.js pde-tools.cjs |
| npm dependencies | Multiple (Bun, Vue, SQLite) | None (binary) | Zero (consistent with PDE zero-npm-deps constraint) |
| Session history | Database query | None | Markdown summaries in .planning/logs/ |
| PDE integration | None — generic Claude Code | None — generic | Deep: reads workflow-status.md, pde-tools.cjs, .planning/ state |

---

## Sources

- **PDE PROJECT.md** (HIGH confidence): `/Users/greyaltaer/code/projects/Platform Development Engine/.planning/PROJECT.md` — active requirements, constraints, existing capabilities
- **Claude Code Hooks Reference** (HIGH confidence): `https://code.claude.com/docs/en/hooks` — 26 hook events, configuration structure, common fields, hook types (command/http/prompt/agent)
- **disler/claude-code-hooks-multi-agent-observability** (HIGH confidence): `https://github.com/disler/claude-code-hooks-multi-agent-observability` — real-world Claude Code hook observability architecture; Vue+Bun+SQLite pattern; 12 captured event types
- **PDE bin/lib/tracking.cjs** (HIGH confidence): verified directly — per-task workflow-status.md structure, existing instrumentation surface
- **agent-teams-tmux** (MEDIUM confidence): `https://lobehub.com/skills/smartassets-io-skills-agent-teams-tmux` — tmux dashboard for parallel agent teams; 5s refresh interval pattern; fswatch/inotifywait/polling fallback pattern
- **NTM (Named Tmux Manager)** (MEDIUM confidence): `https://github.com/Dicklesworthstone/ntm` — AI agent tmux coordination; tiled pane layouts for multi-agent systems
- **Nebulacentre Server Dashboard in tmux** (MEDIUM confidence): `https://www.nebulacentre.net/articles/server_dash/server_dash.html` — tmux 6-pane server monitoring pattern; persistent session design
- **Event Bus Architecture for Coordinating Distributed Agents** (MEDIUM confidence): `https://www.auxiliobits.com/blog/event-bus-architectures-for-coordinating-distributed-agents/` — correlation_id, schema versioning, consumer/producer separation
- **How to Build Event Schema Design** (MEDIUM confidence): `https://oneuptime.com/blog/post/2026-01-30-event-schema-design/view` — event_id, schema_version, timestamp, source as minimum metadata; forward/backward compatibility patterns
- **The Complete Guide to LLM Observability** (MEDIUM confidence): `https://portkey.ai/blog/the-complete-guide-to-llm-observability/` — per-agent token tracking; session duration; tool call tracing
- **Claude Code session history (ccusage)** (MEDIUM confidence): `https://ccusage.com/guide/session-reports` — JSONL session transcript format; session-level aggregation patterns; how existing tools parse Claude Code session data
- **Bash command existence check patterns** (MEDIUM confidence): `https://raymii.org/s/snippets/Bash_Bits_Check_if_command_is_available.html` — `command -v` idiom; platform detection via uname; package manager detection
- **Datadog Claude Code Monitoring** (LOW confidence — enterprise context, not directly applicable): `https://www.datadoghq.com/blog/claude-code-monitoring/` — confirms market direction for Claude Code observability; OpenTelemetry as downstream compatibility target

---

*Feature research for: PDE v0.8 — Observability & Event Infrastructure (tmux monitoring dashboard, structured event bus, session history)*
*Researched: 2026-03-19*
