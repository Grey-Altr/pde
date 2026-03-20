# Architecture Research

**Domain:** PDE v0.8 — Observability & Event Infrastructure (event bus, tmux dashboard, IPC, token tracking)
**Researched:** 2026-03-19
**Confidence:** HIGH (grounded in direct codebase inspection + official Claude Code plugin/hooks documentation + tmux scripting documentation; no speculation on core architectural decisions)

---

> **Scope:** This file answers one question — how do event infrastructure and tmux monitoring integrate with PDE's existing architecture? What is new vs. what is modified, and in what build order?
>
> All existing systems (skills, workflows, agents, pde-tools.cjs, .planning/ state, mcp-bridge.cjs, tracking.cjs, execute-phase.md) are stable dependencies, not targets for restructuring.

---

## Existing Architecture Baseline (v0.7)

```
+--------------------------------------------------------------------------+
|                     Skill Layer  (/pde: slash commands)                   |
|   new-milestone  plan-phase  execute-phase  verify-work  check-readiness  |
+-----------------------------+--------------------------------------------+
                               | invokes
+-----------------------------v--------------------------------------------+
|                         Workflow Layer (orchestrators)                     |
|   execute-phase.md  plan-phase.md  check-readiness.md  verify-work.md    |
+----+-----------------------------------+----------------------------------+
     | spawns subagents                   | calls CLI
+----v------------------+    +-----------v------------------------------------+
|  Agent Layer          |    |  pde-tools.cjs  (bin/)                          |
|  (9 agent files)      |    |  bin/lib/: core, state, tracking, readiness,   |
|                       |    |  sharding, mcp-bridge, memory, reconciliation, |
+-----------------------+    |  manifest, phase, roadmap, milestone, design   |
                             +---------------------------+--------------------+
                                                         | reads/writes
                             +---------------------------v--------------------+
                             |              State Layer  (.planning/)          |
                             |  PROJECT.md  STATE.md  ROADMAP.md  config.json |
                             |  phases/NN-name/  agent-memory/  project-context|
                             +--------------------------------------------------+
```

**What v0.7 does NOT have:**
- No event bus of any kind (tool calls are fire-and-forget with no observation surface)
- No hooks/ directory (PDE does not yet use the Claude Code hooks system)
- No tmux session management
- No log storage beyond .planning/ markdown artifacts
- No token/cost tracking at the plugin level
- No IPC between Claude Code process and external processes

**Key constraint from codebase inspection:**
Zero npm dependencies at plugin root. New Node.js modules must use pure Node.js built-ins only (fs, path, os, child_process, events, readline, crypto). Any library requiring npm install must go in an isolated subdirectory with its own package.json and must not be required from the plugin root.

---

## Standard Architecture for v0.8

### System Overview

```
+-----------------------------------------------------------------------------+
|                    CLAUDE CODE PROCESS  (existing, unchanged)                |
|                                                                               |
|  +-----------------------------------------------------------------------+   |
|  |              Claude Code Hooks System  [NEW USE -- hooks/]             |   |
|  |                                                                         |   |
|  |  hooks/hooks.json (NEW) -- event capture declarations                  |   |
|  |  hooks/emit-event.cjs (NEW) -- hook handler -> event serializer        |   |
|  |                                                                         |   |
|  |  Events captured:  SubagentStart, SubagentStop, PostToolUse,           |   |
|  |  PreToolUse (Bash only), SessionStart, SessionEnd, Stop                 |   |
|  +----------------------------------+------------------------------------- +   |
|                                     | appends NDJSON to event log             |
+-------------------------------------+---------------------------------------+
                                      |
                    +-----------------v-----------------+
                    |   Event Log  [NEW -- /tmp/]       |
                    |   pde-session-{id}.ndjson         |
                    |   (raw events, session-scoped;    |
                    |    OS cleanup after session end)  |
                    +-----------------+-----------------+
                                      | tail -F (by tmux panes)
               +-----------------------+---------------------------+
               |                       |                           |
+--------------v---------+  +----------v----------+  +------------v-----------+
|  tmux Session          |  |  Structured Log     |  |  Session Summary       |
|  [NEW -- bin/lib/      |  |  .planning/logs/    |  |  .planning/logs/       |
|   tmux-manager.cjs]    |  |  session-{id}.md    |  |  {date}-summary.md     |
|                        |  |  [NEW artifact]     |  |  [NEW artifact]        |
|  6 panes (below)       |  +---------------------+  +------------------------+
+------------------------+
```

### The Hooks System is the Primary Instrumentation Point

**Key architectural finding (HIGH confidence -- verified against official Claude Code plugin docs):**

Claude Code's plugin system provides a built-in hooks mechanism. PDE can declare hooks in `hooks/hooks.json` at the plugin root. These hooks fire automatically for:
- `SubagentStart` -- every time execute-phase spawns a Task/subagent
- `SubagentStop` -- every subagent completion (includes transcript path)
- `PostToolUse` -- every file write, bash command, edit (filtered by matcher)
- `SessionStart` / `SessionEnd` -- session lifecycle
- `Stop` -- Claude finishes responding (natural checkpoint for summaries)
- `PreCompact` / `PostCompact` -- context compaction events

**Hook payload fields available (HIGH confidence -- from official SDK docs):**
- `session_id` -- correlates all events in a session
- `tool_name` -- which tool fired (Bash, Write, Edit, Read, Agent)
- `tool_input` -- full input arguments (e.g., file_path for Write, command for Bash)
- `agent_id` -- present on subagent hook events
- `agent_type` -- present on subagent hook events
- `agent_transcript_path` -- present on SubagentStop (path to subagent transcript)
- `hook_event_name` -- which event type fired
- `cwd` -- working directory at hook fire time

**What hooks cannot provide (gap -- requires estimation):**
- Token counts per tool call -- not in hook payload
- Running context window percentage -- not directly available; must be estimated
- Per-subagent cost -- not in hook payload

Token and cost data must be estimated from event patterns, not read directly. The estimation approach is documented in the Token/Cost Estimation section below.

### Token/Cost Estimation Approach

**MEDIUM confidence** -- based on official Claude Code cost docs and token counting patterns.

Direct programmatic access to token counts per hook event is not available in the hook payload. The estimation module uses proxy measurements:

1. **Per-event estimation** -- approximate input token size from tool_input JSON byte length (rough proxy: 1 token ~= 4 bytes of UTF-8)
2. **Context window gauge** -- approximate from session event count and known model context limits (claude-sonnet-4-6: 200K tokens context window)
3. **Model context awareness** -- model per-subagent is known from model-profiles.cjs, so per-model pricing applies to subagent cost estimation
4. **Session-level cost** -- available via ccusage or /cost command but not via hook payload programmatically

The token/cost pane in the dashboard displays: estimated session running cost (proxy measurements), model pricing (from model-profiles.cjs), and a context window fill bar (estimated). Accuracy is intentionally approximate; all estimates labeled "~est." in the UI.

---

## Recommended Architecture: Component Breakdown

### New Components

```
hooks/
  hooks.json                 -- Hook declarations (plugin root)
  emit-event.cjs             -- Hook handler: serialize event -> NDJSON append

bin/lib/
  event-bus.cjs              -- EventEmitter wrapper + session ID generation
  tmux-manager.cjs           -- tmux session/pane lifecycle management
  token-estimator.cjs        -- Token/cost estimation from event stream
  session-archiver.cjs       -- NDJSON -> .planning/logs/ summary writer
  event-renderer.cjs         -- NDJSON -> human-readable pane output

commands/
  monitor.md                 -- /pde:monitor skill

.planning/logs/              -- Structured session log storage (new directory)
```

### Modified Components

```
bin/pde-tools.cjs              -- Add event-emit subcommand (MODIFIED)
workflows/execute-phase.md     -- Add phase/wave event emits (MODIFIED)
workflows/plan-phase.md        -- Add planning event emits (MODIFIED)
.planning/config.json schema   -- Add monitoring.enabled, monitoring.session_id (MODIFIED)
```

### Untouched Components

All 9 agents, all 13 design pipeline skills, mcp-bridge.cjs, tracking.cjs, readiness.cjs, reconciliation.cjs, sharding.cjs, memory.cjs, manifest.cjs, all templates, references, and config files.

---

## Architectural Patterns

### Pattern 1: Hooks as the Instrumentation Layer (not manual emit calls)

**What:** Use the Claude Code hooks system (`hooks/hooks.json`) as the primary event capture mechanism rather than injecting emit calls throughout workflow markdown files.

**Why this is correct:**
- Hook events fire automatically for every tool call -- no manual instrumentation needed in 70+ workflow files
- SubagentStart and SubagentStop provide exact agent lifecycle boundaries without any workflow changes
- PostToolUse fires for every Write/Edit/Bash -- file change tracking is automatic
- Decoupled from workflows: hooks fire even if a workflow is added or modified later

**When to supplement with manual emit:**
Workflow-level semantic events (phase started, wave 2 of 3 beginning, planning complete) carry business meaning that hook events cannot express. These are emitted via `node ${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs event-emit <type> <payload>` calls added to specific workflow steps. Total additional calls: approximately 8 across execute-phase.md and plan-phase.md.

**Example hook declaration (hooks/hooks.json):**
```json
{
  "hooks": {
    "SubagentStart": [
      { "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs" }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs" }] }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs" }]
      }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs" }] }
    ]
  }
}
```

**Trade-offs:**
- Pro: Zero workflow file changes for core event capture
- Pro: Events fire even for tool calls not explicitly in PDE workflows
- Con: Hook payload does not include token counts (estimation required)
- Con: Hook handlers must be fast (blocking hook pauses the agent)

### Pattern 2: NDJSON Event Log as the Single Event Store

**What:** `emit-event.cjs` appends one JSON object per line to a session-specific file at `/tmp/pde-session-{id}.ndjson`. All downstream consumers (tmux panes, log archiver) read from this single file.

**Why NDJSON (Newline Delimited JSON):**
- Append-only, no parse-before-write: single fs.appendFileSync call, sub-millisecond
- `tail -F` in tmux panes follows it in real time without needing a server or IPC
- `readline` (built-in Node.js module) streams it without npm dependencies
- Survives Claude Code crashes: partial writes are line-delimited; partial lines skipped on read

**Event schema (all events share base fields):**
```json
{
  "ts": "2026-03-19T14:23:01.123Z",
  "type": "subagent_start",
  "session_id": "abc123",
  "agent_id": "optional-string",
  "agent_type": "optional-string",
  "tool_name": "optional-string",
  "file_path": "optional-string",
  "payload": {}
}
```

**Event type taxonomy:**

| type | Source | What it signals |
|------|--------|-----------------|
| session_start | SessionStart hook | New PDE session begins |
| session_end | SessionEnd hook | Session terminates; triggers archival |
| subagent_start | SubagentStart hook | Task/subagent spawned |
| subagent_stop | SubagentStop hook | Task/subagent completed |
| file_changed | PostToolUse (Write/Edit) | File written or edited |
| bash_called | PostToolUse (Bash) | Bash command executed |
| phase_started | execute-phase.md manual emit | Phase execution begins |
| wave_started | execute-phase.md manual emit | Wave N of M begins |
| wave_complete | execute-phase.md manual emit | Wave N of M finished |
| planning_started | plan-phase.md manual emit | Plan generation begins |
| planning_complete | plan-phase.md manual emit | Plan files written |
| context_compact | PreCompact hook | Context compaction triggered |

**Location decision:**
- `/tmp/` for raw event stream (session-scoped, OS-managed cleanup after reboot)
- `.planning/logs/` for structured summaries (persisted, part of project record)

### Pattern 3: tmux Dashboard via Shell Commands (not Node.js IPC)

**What:** `tmux-manager.cjs` launches and configures a tmux session by spawning the `tmux` CLI via `child_process.spawnSync` (using spawnSync with argument arrays to avoid shell injection). Panes are populated by running shell commands that `tail -F` the event log or display rendered output.

**Why shell commands over named pipes or IPC:**
- `tail -F` + tmux send-keys is the canonical tmux monitoring pattern (verified in tmux docs)
- No persistent Node.js process required: the tmux session is self-sustaining once launched
- Named pipe IPC requires both ends alive simultaneously; `tail -F` works even when no events are flowing
- Zero npm dependencies: `child_process.spawnSync('tmux', ['new-session', ...])` needs only Node.js built-ins

**6-pane layout:**

```
+-----------------------------+--------------------+-----------------------------+
|  PANE 1                     |  PANE 2            |  PANE 3                     |
|  Agent Activity             |  Pipeline Progress |  File Changes               |
|  tail -F events filtered    |  rendered from     |  tail -F file_changed       |
|  to subagent_start/stop     |  wave_started +    |  events, path display       |
|                             |  wave_complete     |                             |
+-----------------------------+--------------------+-----------------------------+
|  PANE 4                     |  PANE 5            |  PANE 6                     |
|  Log Stream                 |  Token/Cost Meter  |  Context Window             |
|  tail -F all events raw     |  ~estimated from   |  ~estimated fill %          |
|                             |  event count +     |  from event count +         |
|                             |  model pricing     |  known model limit          |
+-----------------------------+--------------------+-----------------------------+
```

**Pane rendering approach:**
- Panes 1, 3, 4: `tail -F /tmp/pde-session-{id}.ndjson | node ${CLAUDE_PLUGIN_ROOT}/bin/lib/event-renderer.cjs --pane=agent`
- Pane 2: `watch -n 1 node ${CLAUDE_PLUGIN_ROOT}/bin/lib/event-renderer.cjs --pane=pipeline`
- Panes 5, 6: `watch -n 2 node ${CLAUDE_PLUGIN_ROOT}/bin/lib/token-estimator.cjs --session={id}`

**tmux session naming:** `pde-monitor-{project-slug}` -- allows multiple PDE projects to have separate dashboards. Idempotent: if session already exists, attach to it.

**tmux availability check:** `tmux-manager.cjs` checks for tmux using `spawnSync('which', ['tmux'])` before proceeding. If missing: print install instructions (macOS: `brew install tmux`, Debian/Ubuntu: `apt install tmux`) and exit cleanly with a non-zero exit code.

### Pattern 4: event-emit as a pde-tools.cjs Subcommand

**What:** Add `event-emit <type> <json-payload>` as a subcommand to `pde-tools.cjs`. This is the single write path for manual emit calls in workflows.

**Why this fits PDE's existing patterns:**
- All workflow bash calls already route through `pde-tools.cjs` subcommands -- adding `event-emit` follows the established pattern
- pde-tools.cjs is CommonJS, zero-npm, already handles all state writes -- event file writes belong here
- Central write point means session log path resolution happens once (session ID lookup from config.json, /tmp path construction) rather than in each hook script

**Interface (called from workflow bash steps):**
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit phase_started \
  '{"phase":"52","name":"Event Infrastructure"}'
```

**emit-event.cjs hook handler** -- thin adapter:
```
reads stdin (Claude Code passes hook JSON via stdin to hook scripts)
extracts: session_id, hook_event_name, tool_name, tool_input fields
maps hook event names to PDE event types
calls: node pde-tools.cjs event-emit <type> <payload>
returns {} (allow operation, no block)
```

This keeps event serialization logic in pde-tools.cjs where state logic already lives, and keeps emit-event.cjs as a thin adapter that does no direct file I/O.

### Pattern 5: Persistent Dashboard (stays open after operation finishes)

**What:** The tmux session launched by `/pde:monitor` persists independently of the Claude Code process.

**How:** tmux sessions are server-managed, not process-managed. Once `tmux new-session -d -s pde-monitor-{slug}` returns, the session lives in the tmux server process. Claude Code exiting does not kill it.

**Session end behavior:** When `SessionEnd` hook fires, `emit-event.cjs` appends a `session_end` event, then spawns `session-archiver.cjs` as a background process. The archiver reads the full NDJSON log, generates `.planning/logs/{date}-{session_id}-summary.md`, then exits. The tmux panes continue showing the final state. The dashboard remains open for post-session review.

The hook returns `{ "async": true, "asyncTimeout": 30000 }` for the archiver spawn -- this tells Claude Code the hook fired successfully and to proceed without waiting for the archiver to complete.

---

## Data Flow

### Event Capture Flow (hooks path)

```
Claude Code invokes tool (Write, Bash, Agent, etc.)
    |
    v  Claude Code Hooks System
    hooks/hooks.json matcher fires
    hooks/emit-event.cjs receives hook JSON on stdin
        |
        +-- extracts: session_id, hook_event_name, tool_name, tool_input
        +-- constructs typed event object
        +-- calls: node pde-tools.cjs event-emit <type> <payload>
                |
                v  pde-tools.cjs event-emit handler
                resolves log path: /tmp/pde-session-{session_id}.ndjson
                appends: JSON.stringify(event) + '\n'
                exits 0  (fast -- must not block Claude Code)
```

### Event Capture Flow (manual workflow emit path)

```
execute-phase.md: wave N of M begins
    |
    v  bash step in workflow markdown
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" event-emit wave_started \
      '{"wave":2,"total":3,"phase":"52"}'
    |
    v  pde-tools.cjs event-emit handler
    appends to same /tmp/pde-session-{session_id}.ndjson
```

### tmux Dashboard Launch Flow

```
/pde:monitor invoked
    |
    v  monitor.md
    reads session_id from .planning/config.json monitoring.session_id
    calls: node "${CLAUDE_PLUGIN_ROOT}/bin/lib/tmux-manager.cjs" --session-id {id}
        |
        v  tmux-manager.cjs
        checks: spawnSync('which', ['tmux']) -> if missing, print install instructions, exit
        checks: has-session pde-monitor-{slug} -> if exists, attach
        creates: new-session -d -s pde-monitor-{slug}
        splits window into 6 panes via split-window calls
        for each pane: send-keys "<tail/watch command>" Enter
        attaches: attach-session -t pde-monitor-{slug}
```

### Session End / Log Archival Flow

```
Claude Code session terminates
    |
    v  SessionEnd hook fires
    emit-event.cjs appends session_end event
    emit-event.cjs spawns background: node session-archiver.cjs --session-id {id}
    returns { "async": true } -- Claude Code proceeds immediately
        |
        v  session-archiver.cjs (background process)
        opens /tmp/pde-session-{id}.ndjson via readline stream
        computes summary:
          - subagents spawned (count subagent_start events)
          - files changed (count file_changed events)
          - phases/waves completed
          - estimated token/cost totals
        writes .planning/logs/{YYYY-MM-DD}-{id}-summary.md
        exits  (raw NDJSON remains in /tmp/ until OS reboot cleanup)
```

### Token/Cost Estimation Flow

```
token-estimator.cjs --session={id}  (called by watch in tmux panes 5 and 6)
    |
    reads /tmp/pde-session-{id}.ndjson (current events so far)
    |
    for each subagent_start event:
        looks up model from agent_type via MODEL_PROFILES in model-profiles.cjs
        applies per-model pricing rate
    for each file_changed / bash_called event:
        estimates input token cost from tool_input JSON byte length / 4
    |
    outputs: formatted cost estimate (~est.) + context window fill bar
```

---

## Component Boundaries

| Component | Responsibility | v0.8 Status |
|-----------|---------------|-------------|
| hooks/hooks.json | Declare which Claude Code events trigger PDE event capture | NEW |
| hooks/emit-event.cjs | Thin hook handler: parse stdin hook JSON, call pde-tools.cjs event-emit | NEW |
| pde-tools.cjs event-emit | Resolve session log path, append typed event to NDJSON file | MODIFIED |
| bin/lib/event-bus.cjs | EventEmitter wrapper, session ID generation (crypto.randomUUID) | NEW |
| bin/lib/tmux-manager.cjs | Launch/attach/check tmux session, configure 6-pane layout | NEW |
| bin/lib/token-estimator.cjs | Read NDJSON stream, estimate cost and context window fill | NEW |
| bin/lib/session-archiver.cjs | Read NDJSON log, generate .planning/logs/ summary on session end | NEW |
| bin/lib/event-renderer.cjs | Format NDJSON events as human-readable output per dashboard pane | NEW |
| commands/monitor.md | /pde:monitor skill -- check tmux, resolve session, launch dashboard | NEW |
| .planning/logs/ | Persistent structured session summaries (markdown) | NEW directory |
| /tmp/pde-session-{id}.ndjson | Raw event stream (session-scoped, OS-managed cleanup) | NEW runtime artifact |

---

## New vs. Modified: Explicit Inventory

### New Files (create from scratch)

| File | Purpose |
|------|---------|
| hooks/hooks.json | Event hook declarations (plugin root) |
| hooks/emit-event.cjs | Hook handler -- thin stdin adapter calling pde-tools.cjs |
| bin/lib/event-bus.cjs | EventEmitter wrapper + session ID generation |
| bin/lib/tmux-manager.cjs | tmux lifecycle (create, configure, attach, detect) |
| bin/lib/token-estimator.cjs | Token/cost estimation from NDJSON stream |
| bin/lib/session-archiver.cjs | Session end -> .planning/logs/ summary writer |
| bin/lib/event-renderer.cjs | NDJSON -> human-readable pane output |
| commands/monitor.md | /pde:monitor skill |
| .planning/logs/.gitkeep | Create persistent log storage directory |

### Modified Files (surgical additions to existing)

| File | Change | Risk |
|------|--------|------|
| bin/pde-tools.cjs | Add event-emit subcommand + session ID management + help text | LOW -- additive subcommand |
| workflows/execute-phase.md | Add ~6 event-emit calls at phase/wave lifecycle points | LOW -- additive bash steps |
| workflows/plan-phase.md | Add 2 event-emit calls at planning-start and planning-complete | LOW -- additive bash steps |
| .planning/config.json schema | Add monitoring.enabled and monitoring.session_id fields | LOW -- additive config fields |

### Untouched Files

All 9 agents, all 13 design pipeline skills, all other workflows (verify-work, check-readiness, reconcile-phase, new-milestone, all MCP sync workflows), mcp-bridge.cjs, tracking.cjs, readiness.cjs, reconciliation.cjs, sharding.cjs, memory.cjs, manifest.cjs, all templates, references, and existing config files.

---

## Suggested Build Order

Dependency graph determines wave structure:

```
[Wave 1 -- parallel, foundational, no inter-dependencies]

  Plan A -- Event infrastructure core
    - pde-tools.cjs: add event-emit subcommand + session ID management
    - bin/lib/event-bus.cjs: EventEmitter wrapper + session ID generation
    - hooks/hooks.json + hooks/emit-event.cjs: hook declarations + thin handler
    - .planning/config.json: add monitoring config fields
    - Rationale: Everything downstream depends on events flowing to /tmp/.
      A hook that calls a non-existent pde-tools.cjs subcommand fails at
      hook fire time, blocking the Claude Code agent on every tool call.
      Build this first.

  Plan B -- tmux dashboard layer
    - bin/lib/tmux-manager.cjs: session/pane lifecycle
    - bin/lib/event-renderer.cjs: NDJSON -> pane-specific display
    - commands/monitor.md: /pde:monitor skill
    - Rationale: No dependency on token estimator or archiver.
      Dashboard works with raw event display before estimation is ready.
      Independent of Plan C (archival).

  Plan C -- Session archival layer
    - bin/lib/session-archiver.cjs: NDJSON -> .planning/logs/ summary
    - .planning/logs/ directory creation
    - Rationale: Independent of tmux. Archival works even without dashboard.
      SessionEnd hook in emit-event.cjs spawns archiver; archiver only needs
      event-emit from Plan A to be complete first.

[Wave 2 -- depends on Wave 1 Plan A completing]

  Plan D -- Token/cost estimation
    - bin/lib/token-estimator.cjs: estimation from event patterns + model-profiles.cjs
    - Wire into tmux panes 5 and 6 (token meter, context window)
    - Rationale: Requires event stream to be flowing (Plan A) before estimation
      has data to work with. model-profiles.cjs already exists (no new dependency).
      This is enhancement to an already-functional dashboard, not a prerequisite.

  Plan E -- Workflow instrumentation
    - workflows/execute-phase.md: add phase/wave event emits (~6 calls)
    - workflows/plan-phase.md: add planning event emits (~2 calls)
    - Rationale: Requires event-emit subcommand in pde-tools.cjs (Plan A).
      Building workflow instrumentation after Plan A means emit calls can be
      tested against a real event log during development. Semantic events
      (phase started, wave N of M) enrich an already-flowing event stream;
      they do not need to be present before the dashboard works.
```

**Wave structure for execute-phase:**
```
Wave 1 (parallel):
  Plan A -- Event infrastructure core
  Plan B -- tmux dashboard layer
  Plan C -- Session archival layer

Wave 2 (sequential after Wave 1):
  Plan D -- Token/cost estimation
  Plan E -- Workflow instrumentation
```

**Rationale summary:**
Build the write path (event-emit) before any consumer. Build consumers (dashboard, archiver) in parallel with each other. Build semantic enrichments (estimation, workflow instrumentation) only after the core stream flows, so they have real data to work against during development.

---

## Anti-Patterns

### Anti-Pattern 1: Manual Emit Calls in Every Workflow File

**What people do:** Add event-emit bash calls to all 70+ workflow markdown files to ensure comprehensive coverage.

**Why it's wrong:** The hooks system automatically captures every tool call (Write, Edit, Bash, Agent/Task) without touching workflow files. Manual calls in every workflow would create dual instrumentation, duplicate events in the log, and impose a maintenance burden where every future workflow file must remember to include emit calls.

**Do this instead:** Rely on hooks for tool-level events. Add manual emits only for semantic workflow events (phase started, wave began) that the hooks system cannot express -- approximately 8 calls in 2 workflow files, not 70+ files.

### Anti-Pattern 2: Node.js Long-Running Process as Event Bus

**What people do:** Build a persistent Node.js broker daemon that hooks connect to via named pipe, and tmux panes subscribe to via IPC.

**Why it's wrong:** PDE has no daemon infrastructure. A persistent process must survive Claude Code session restarts, be started before any hook fires (ordering problem), and be killed cleanly on session end. Named pipe IPC requires both ends alive simultaneously -- a tmux pane that launched before the daemon has no data until the daemon starts. This conflicts with PDE's stateless, file-based state model.

**Do this instead:** Use an append-only NDJSON file as the event store. `tail -F` in tmux panes is self-healing -- it waits for the file to appear and follows appends automatically. No daemon needed. No IPC complexity. OS handles file cleanup.

### Anti-Pattern 3: Storing Raw Event Stream in .planning/

**What people do:** Write event logs to `.planning/logs/events/` to keep all state in one place.

**Why it's wrong:** Raw event streams are session-scoped, high-volume (potentially hundreds of events per session), and not human-readable. Storing them in `.planning/` would bloat the project directory, conflict with the manifest tracking system, and accumulate across sessions without a cleanup mechanism.

**Do this instead:** Raw NDJSON event stream -> `/tmp/pde-session-{id}.ndjson` (OS-managed cleanup). Structured human-readable summaries -> `.planning/logs/{date}-summary.md` (permanent project record, generated at session end).

### Anti-Pattern 4: Installing npm Packages for tmux Management

**What people do:** Add `node-tmux` or similar npm packages to bin/ and require them in tmux-manager.cjs.

**Why it's wrong:** PDE's zero-npm-at-plugin-root constraint is an explicit architectural decision (PROJECT.md). Every tmux operation needed (new-session, split-window, send-keys, attach-session, has-session) is available as a simple `tmux <subcommand>` CLI call. `child_process.spawnSync('tmux', ['new-session', '-d', '-s', sessionName])` needs no installation and has identical capability to an npm abstraction.

**Do this instead:** `child_process.spawnSync` with explicit argument arrays (not exec/shell strings) for all tmux calls. spawnSync returns `{ status, stdout, stderr }` for clean error handling. If tmux exits non-zero, surface the stderr message to the user.

### Anti-Pattern 5: Blocking Hook Handlers

**What people do:** Put slow operations (file reads, summary generation, HTTP calls) directly in emit-event.cjs.

**Why it's wrong:** Claude Code waits for hook handlers to complete before the agent proceeds. A slow hook that reads the full event log or generates a summary will visibly pause the agent at every tool call -- unacceptable UX for a monitoring system.

**Do this instead:** emit-event.cjs does only: parse stdin, call `pde-tools.cjs event-emit` (single synchronous file append, sub-millisecond). Session archival (the slow operation) happens in a background child_process spawned from the SessionEnd hook. The hook returns `{ "async": true, "asyncTimeout": 30000 }` so the agent proceeds immediately.

---

## Integration Points: Connections to Existing Code

### hooks/emit-event.cjs -> pde-tools.cjs

`emit-event.cjs` calls `pde-tools.cjs event-emit` via `child_process.spawnSync`. This keeps the hook handler thin and event serialization logic in pde-tools.cjs where state logic already lives.

### pde-tools.cjs event-emit -> event-bus.cjs

`event-bus.cjs` owns session ID generation (using `crypto.randomUUID()` from Node.js built-ins) and the canonical session log path formula: `/tmp/pde-session-${sessionId}.ndjson`. The `event-emit` subcommand imports event-bus.cjs for these utilities. Session ID is persisted to `.planning/config.json` (monitoring.session_id) at SessionStart.

### token-estimator.cjs -> model-profiles.cjs (existing)

`token-estimator.cjs` imports `bin/lib/model-profiles.cjs` (already exists, no modification required) to look up the model assigned to each agent type appearing in `subagent_start` events. This provides per-agent cost estimation without duplicating the model-to-agent mapping.

### session-archiver.cjs -> tracking.cjs pattern (reference, not import)

`session-archiver.cjs` follows the same table-writing markdown pattern as `tracking.cjs` when generating `.planning/logs/` summaries. It does not import tracking.cjs (different file format and purpose), but mirrors its output structure for visual consistency with the existing .planning/ file family.

### commands/monitor.md -> tmux-manager.cjs

`/pde:monitor` is a command file that calls `node "${CLAUDE_PLUGIN_ROOT}/bin/lib/tmux-manager.cjs"` via bash, following the established pattern (e.g., /pde:sync-github calls sync-github.md which calls mcp-bridge.cjs via bash).

### execute-phase.md -> event-emit (new bash calls)

Approximately 6 new bash lines in execute-phase.md:
1. After phase_found confirmation -- emit phase_started
2. Before each wave spawn loop iteration -- emit wave_started with wave number and total
3. After all agents in a wave return results -- emit wave_complete
4. After reconciler completes -- emit phase_complete

Each call uses the same `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" <subcommand>` pattern already used 20+ times in execute-phase.md.

---

## Scaling Considerations

PDE is a Claude Code plugin. "Scale" means event volume per session and tmux pane rendering performance -- not concurrent users.

| Concern | With v0.8 | Mitigation |
|---------|-----------|------------|
| Event volume (large phase) | 5 parallel subagents x 20 tool calls x 5 waves = ~500 events/session | NDJSON append is O(1); 500 events ~50KB -- negligible |
| tmux pane render lag | tail -F pipes each new line through event-renderer.cjs | event-renderer.cjs must be fast (no file I/O per event); target under 5ms |
| Log accumulation in .planning/logs/ | Multiple sessions per day = multiple summary files | Summary files are small (~5KB each); no cleanup needed for months of daily use |
| Hook handler latency | Every tool call blocked while emit-event.cjs runs | emit-event.cjs does single file append only; target under 10ms per hook fire |
| Token estimator accuracy | Byte-length proxies are rough order-of-magnitude | Label all estimates as "~est."; accuracy sufficient for awareness, not billing |

**First bottleneck if v0.8 expands:** event-renderer.cjs processing latency at high event velocity. Prevention: keep renderer purely transformational (stdin read + string formatting + stdout write; no additional I/O).

---

## Sources

- PDE codebase direct inspection (2026-03-19):
  - `bin/pde-tools.cjs` -- subcommand registration pattern, CLI interface, zero-npm constraint
  - `bin/lib/core.cjs` -- output helpers, file write patterns
  - `bin/lib/tracking.cjs` -- markdown file write pattern (reference for session-archiver)
  - `bin/lib/model-profiles.cjs` -- model-to-agent mapping (consumed by token estimator)
  - `bin/lib/mcp-bridge.cjs` -- zero-npm pattern for lib modules
  - `workflows/execute-phase.md` -- existing bash call patterns for instrumentation injection points
  - `.planning/PROJECT.md` -- v0.8 requirements, zero-npm constraint, architectural constraints

- Official Claude Code documentation (2026-03-19, HIGH confidence):
  - Plugins reference: https://code.claude.com/docs/en/plugins-reference -- hooks.json format, hook event types, plugin root vs data dir, CLAUDE_PLUGIN_ROOT variable
  - Agent SDK hooks reference: https://platform.claude.com/docs/en/agent-sdk/hooks -- hook payload fields (session_id, agent_id, agent_type, agent_transcript_path, tool_name, tool_input), SubagentStart/SubagentStop details, async hook return format
  - Cost management docs: https://code.claude.com/docs/en/costs -- /cost command behavior, token tracking approach, no per-event token data in hook payload (gap confirmed)

- tmux documentation (2026-03-19, HIGH confidence):
  - tmux man page: https://man7.org/linux/man-pages/man1/tmux.1.html -- pipe-pane, send-keys, new-session, split-window syntax
  - tmux Advanced Use wiki: https://github.com/tmux/tmux/wiki/Advanced-Use -- pipe-pane with -I/-O flags
  - tail -F + NDJSON file following pattern confirmed in community practice

- Community reference (MEDIUM confidence -- architecture reference only, no code reuse):
  - claude-code-hooks-multi-agent-observability (github.com/disler) -- confirmed hooks-based event capture is viable; that project uses WebSocket/SQLite server (PDE uses simpler NDJSON-file approach instead)

---

*Architecture research for: PDE v0.8 -- Observability & Event Infrastructure*
*Researched: 2026-03-19*
