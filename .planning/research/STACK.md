# Stack Research

**Domain:** tmux-based monitoring dashboard and event infrastructure — adding structured event
bus, IPC, terminal rendering, and token/cost estimation to an existing Node.js CommonJS
Claude Code plugin (PDE v0.8)
**Researched:** 2026-03-19
**Confidence:** HIGH (Node.js built-ins verified via official docs), HIGH (tmux shell
scripting is the correct approach — node-tmux confirmed too limited via GitHub), MEDIUM
(token estimation approach verified via Anthropic docs), HIGH (zero-npm constraint
confirmed, no package.json anywhere in repo)

---

> **Scope note:** This file covers ONLY what is new for v0.8. The immovable baseline is:
> Node.js v20 CommonJS, Claude Code plugin API, markdown-based `.planning/` state,
> pde-tools.cjs CLI with 20+ lib modules, zero npm dependencies at plugin root,
> no package.json anywhere in the repo. All new capabilities must fit within this baseline.

---

## Constraint Summary

| Constraint | Source | Implication |
|------------|--------|-------------|
| Node.js v20 (active LTS) | env, no package.json | Use `node:events`, `node:child_process`, `node:fs`, `node:net`, `node:https` |
| Zero npm dependencies at plugin root | No package.json found anywhere in repo | No `blessed`, `ink`, `pino`, `winston`, `node-tmux` as npm installs |
| CommonJS only | Every existing module uses `require()` | No ESM; vendored libs must ship CJS builds |
| No persistent background daemons | Plugin runs inside Claude Code session | Event bus must be in-process; log files are the persistence layer |
| File-based state only | `.planning/` directory, no database | Event streams persist as NDJSON files; no SQLite, no Redis |
| tmux is an external binary | Installed separately by user | All tmux interaction via `spawnSync('tmux', [...args])` — uses execFile semantics, not shell injection |

---

## Architecture Decision: tmux Integration Approach

**The right approach is direct shell invocation via spawnSync, not a Node.js tmux library.**

`node-tmux` (npm) provides only 6 methods: newSession, listSessions, hasSession, killSession,
renameSession, writeInput. It has no support for pane addressing, split-window, new-window,
or send-keys with pane targeting. Building the 6-pane dashboard requires all of these.

`stmux` emulates tmux using blessed internally — it creates a fake multiplexer in a single
terminal rather than a real tmux session. This is the wrong model for PDE's persistent,
inspectable dashboard requirement.

The correct approach: wrap `tmux` CLI commands in a thin `bin/lib/tmux-driver.cjs` module
using `child_process.spawnSync('tmux', [...args])`. All arguments are passed as an array
(execFile semantics — no shell injection risk). This is:
- Zero-dependency
- Full-featured (all tmux subcommands available)
- The same approach used by tmuxinator, tmuxp, and other tmux automation tools
- Cross-platform (macOS homebrew, Linux apt both provide the same tmux CLI)
- Safe: arguments passed as array, not interpolated into shell string

---

## Recommended Stack

### Core Technologies (no changes from existing)

| Technology | Version | Purpose | Why Kept |
|------------|---------|---------|----------|
| Node.js | 20 LTS | Runtime for all bin/ scripts | Already pinned; v20 is the Claude Code runtime |
| CommonJS (`require`) | N/A | Module system | All 20+ lib modules use it |
| `node:events` | Built-in | EventEmitter base class | Native, zero-dependency, synchronous delivery, works in CJS |
| `node:child_process` | Built-in | tmux subprocess execution via spawnSync | spawnSync with array args = execFile semantics, no shell injection |
| `node:fs` | Built-in | Log file writes, NDJSON append, rotation | Already universally used in PDE |
| `node:net` | Built-in | Unix domain socket for IPC (optional path) | Available since Node.js v0.1; no deps |
| `node:os` | Built-in | tmpdir() for socket paths, platform detection | Already used in core.cjs |

### New Capability 1: Structured Event Bus

**Problem:** Agents, executor, and tools produce events (agent.start, phase.complete,
file.written, token.counted) that need to be delivered to multiple consumers: the tmux
dashboard panes, the NDJSON event log, and the cost meter — without tight coupling between
producers and consumers.

**Recommendation: Extend Node.js `EventEmitter` directly in a new `bin/lib/event-bus.cjs`
module. Zero additional dependencies.**

Example usage pattern:
```javascript
// bin/lib/event-bus.cjs
const { EventEmitter } = require('events');

class PdeEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // 6 panes + log + cost + context = well under 20
  }
  emit(eventType, payload) {
    const envelope = { type: eventType, ts: Date.now(), ...payload };
    super.emit(eventType, envelope);
    super.emit('*', envelope); // wildcard subscriber for log writer
  }
}

module.exports = { PdeEventBus, bus: new PdeEventBus() };
```

**Why EventEmitter over alternatives:**
- Native Node.js — zero cost, zero risk, zero maintenance
- Synchronous delivery matches PDE's single-process execution model (no async race conditions)
- `setMaxListeners` prevents the default warning at 10+ listeners for 6-pane dashboard
- The wildcard `'*'` pattern is the standard Node.js event bus pattern
- Alternative (EventEmitter3 npm): 3x faster than Node.js EventEmitter — irrelevant for
  PDE's ~10 events/second monitoring use case; not worth an npm dependency
- Alternative (mitt npm): ESM-first, no CJS build; requires vendoring; same functionality
  as plain EventEmitter for this use case

**Event schema (all events follow this envelope):**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Dot-separated namespace: `agent.start`, `phase.complete`, `file.written`, `token.counted`, `error.thrown` |
| `ts` | number | Unix timestamp ms (`Date.now()`) |
| `source` | string | Producer identity: `executor`, `agent:researcher`, `tool:mcp-bridge` |
| `data` | object | Event-specific payload |

**Why this schema is future-proof:** The envelope structure (type + ts + source + data) is
the CloudEvents specification's minimal event format. PDE can adopt CloudEvents serialization
later without changing the schema.

### New Capability 2: tmux Session and Pane Management

**Problem:** `/pde:monitor` needs to create a named tmux session with 6 panes in a specific
layout, write content to specific panes, and detect whether tmux is installed.

**Recommendation: `bin/lib/tmux-driver.cjs` — thin wrapper over `spawnSync('tmux', args)`
where args is always an array (never shell-interpolated strings).**

| Operation | tmux Subcommand | spawnSync Args Array |
|-----------|----------------|----------------------|
| Detect tmux | `which tmux` | `spawnSync('which', ['tmux'])` |
| Create session | `new-session -d -s pde-monitor` | `spawnSync('tmux', ['new-session', '-d', '-s', 'pde-monitor'])` |
| Split horizontal | `split-window -h -t pde-monitor` | `spawnSync('tmux', ['split-window', '-h', '-t', 'pde-monitor'])` |
| Split vertical | `split-window -v -t TARGET` | `spawnSync('tmux', ['split-window', '-v', '-t', target])` |
| Apply layout | `select-layout -t pde-monitor tiled` | `spawnSync('tmux', ['select-layout', '-t', 'pde-monitor', 'tiled'])` |
| Write to pane | `send-keys -t TARGET "text" Enter` | `spawnSync('tmux', ['send-keys', '-t', target, text, 'Enter'])` |
| Check session exists | `has-session -t pde-monitor` | `spawnSync('tmux', ['has-session', '-t', 'pde-monitor'])` |
| Kill session | `kill-session -t pde-monitor` | `spawnSync('tmux', ['kill-session', '-t', 'pde-monitor'])` |

**6-pane layout for PDE Monitor:**
```
Pane 0: Agent Activity    | Pane 1: Pipeline Progress
Pane 2: File Changes      | Pane 3: Log Stream
Pane 4: Token/Cost Meter  | Pane 5: Context Window
```

Built via: new-session + 5x split-window calls + `select-layout even-vertical`.

**Auto-install detection pattern:**
```javascript
function detectTmux() {
  const result = spawnSync('which', ['tmux'], { encoding: 'utf-8' });
  if (result.status === 0) return { installed: true };
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';
  return {
    installed: false,
    installCommand: isMac ? 'brew install tmux' : isLinux ? 'sudo apt install tmux' : null
  };
}
```

**Why not node-tmux npm:** Confirmed via GitHub — node-tmux only has 6 session-level
methods with no pane addressing, no split-window, no send-keys with pane targeting.

**Why not stmux npm:** stmux creates a pseudo-multiplexer using blessed inside a single
terminal process. It does not create real tmux sessions that persist after the command exits.
PDE requires a persistent dashboard that stays open after operations finish.

### New Capability 3: IPC Between pde-tools Processes and Dashboard

**Problem:** pde-tools.cjs is spawned as a child process by Claude Code's Bash tool calls.
Each invocation is a separate process. The tmux dashboard panes need to receive events from
these separate pde-tools invocations without requiring them to share memory.

**Recommendation: NDJSON event log file as the IPC mechanism. Dashboard panes tail the log.**

The cleanest IPC pattern for PDE's use case is not Unix sockets but a shared append-only
NDJSON file that dashboard panes watch via `tail -f`. This aligns with:
1. PDE's file-based state philosophy — events are just another state artifact
2. Zero additional infrastructure — no socket server, no daemon, no port management
3. Dashboard panes read with standard shell: `tail -f /tmp/pde-events.ndjson | jq '.'`
4. Log file survives session breaks — events are reviewable history

**Event file locations:**

| File | Location | Retention |
|------|----------|-----------|
| Live event stream | `/tmp/pde-events-{session}.ndjson` | Session-scoped; cleared on `pde:monitor` exit |
| Structured session summary | `.planning/logs/session-{ts}.ndjson` | Permanent; committed with project |
| Raw event archive | `/tmp/pde-events-{session}-raw.ndjson` | Temporary; used for crash analysis |

**NDJSON write pattern (no library needed):**
```javascript
// Append one event — each line is a complete JSON object
function logEvent(filePath, envelope) {
  const line = JSON.stringify(envelope) + '\n';
  fs.appendFileSync(filePath, line, 'utf-8');
}
```

`fs.appendFileSync` is atomic per write on POSIX systems. For PDE's single-process-per-
invocation model, this is sufficient without locking.

**Why not Unix domain sockets + node:net:**
Unix domain sockets are optimal when multiple long-lived processes need bidirectional
real-time communication. pde-tools invocations are short-lived (milliseconds to seconds).
Standing up a socket server and connecting clients per invocation adds complexity with no
benefit over an append-only file that all processes can write to independently.

**Why not node-ipc npm:** node-ipc is a full network IPC library. PDE's needs are: write
a line to a file. That is `fs.appendFileSync`.

### New Capability 4: Log File Management and Rotation

**Problem:** Event streams in `/tmp` can grow unboundedly during long PDE operations.

**Recommendation: Manual rotation logic in `bin/lib/event-logger.cjs`. No pino, no
winston — they solve problems PDE does not have.**

| Concern | Pino/Winston Approach | PDE Approach |
|---------|----------------------|--------------|
| High-throughput logging | Async I/O, worker threads | Not needed — PDE logs ~10 events/second |
| Multiple transports | Console + file + remote | Only file (NDJSON append) |
| Log levels | 7 levels with filtering | 3: DEBUG, INFO, ERROR |
| Log rotation | pino-roll, winston-daily-rotate-file | Custom: rotate at 10MB or session end |
| JSON serialization | Custom serializers | `JSON.stringify` is sufficient |
| Dependencies | pino: 1 dep; winston: 4 deps | Zero additional dependencies |

**Rotation logic (inline, ~20 lines):**
```javascript
function rotateIfNeeded(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxBytes) {
      const rotated = filePath.replace('.ndjson', '-' + Date.now() + '.ndjson');
      fs.renameSync(filePath, rotated);
    }
  } catch { /* file does not exist yet */ }
}
```

**Why not pino:** pino is the best Node.js logger for high-throughput APIs. PDE is not an
API. pino's async transport model (worker threads) is complexity with no benefit for ~10
events/second. The logging requirement for PDE is: append a JSON line to a file.

**Why not winston:** Same reasoning. 4+ transitive dependencies for complex multi-destination
logging. Not needed here.

### New Capability 5: Token and Cost Estimation

**Problem:** The token/cost pane needs to display approximate token usage and cost per
agent invocation without making API calls (agents run inside Claude Code, not as standalone
API callers).

**Recommendation: Character-based heuristic approximation inline in `bin/lib/token-meter.cjs`.
No library required for estimation. Anthropic's `/v1/messages/count_tokens` endpoint is
available for exact counts if ANTHROPIC_API_KEY is set.**

**Two-tier approach:**

| Tier | Method | Accuracy | When to Use |
|------|--------|----------|-------------|
| Fast estimate | Character count / 4 (chars-per-token heuristic) | ~75-80% | Always available; shown in dashboard in real-time |
| Exact count | `POST /v1/messages/count_tokens` via `node:https` | Exact | On-demand when ANTHROPIC_API_KEY is available |

**Why chars/4 heuristic is sufficient for a monitoring dashboard:**
- Claude's tokenizer averages approximately 3.5-4 characters per token for English text
- The dashboard is informational (decision support), not billing-grade
- For the context window pane (showing % full), this accuracy is adequate
- `tokenx` 1.3.0 (2kB, zero deps, 96% accuracy) is a candidate for vendoring if the
  heuristic proves too coarse during implementation

**tokenx as optional vendor (if heuristic is insufficient):**

| Library | Version | Size | Accuracy | Vendoring |
|---------|---------|------|----------|-----------|
| tokenx | 1.3.0 | 2kB | ~96% | Copy `tokenx/dist/index.cjs` to `bin/lib/vendor/tokenx.cjs`; zero transitive deps |

tokenx provides `estimateTokens(text)` returning a number, with configurable language rules.
It ships a CJS build and has zero transitive dependencies. If the chars/4 heuristic proves
too coarse, vendor tokenx 1.3.0 exactly as acorn was vendored for v0.7.

**Claude model context window constants (for the context pane):**

| Model | Context Window Tokens |
|-------|-----------------------|
| claude-sonnet-4-6 | 200,000 (1M with beta header) |
| claude-opus-4-6 | 200,000 (1M with beta header) |
| All active models | 200,000 baseline |

These are hard constants verified against Anthropic's official model docs — no API call
needed to display context window capacity.

### New Capability 6: Terminal Content Rendering for Pane Updates

**Problem:** pde-tools needs to write formatted content to specific tmux panes — progress
bars, status indicators, structured log lines — without a full TUI framework.

**Recommendation: ANSI escape codes inline in `bin/lib/pane-renderer.cjs`. No blessed,
no ink, no terminal-kit.**

PDE's pane content is written via `tmux send-keys -t pane "text" Enter`. The content is
plain text with optional ANSI color codes. This does not require a TUI widget system.

**What panes actually need:**

| Pane | Content Type | Rendering Needed |
|------|-------------|-----------------|
| Agent Activity | Scrolling log lines with status indicators | ANSI color codes (green/yellow/red dots) |
| Pipeline Progress | Phase list with checkmarks | Unicode box chars + ANSI colors |
| File Changes | Scrolling diff summary | Plain text |
| Log Stream | Raw NDJSON (or formatted) | `tail -f` piped through `jq` or plain `cat` |
| Token/Cost Meter | Progress bar + numbers | Simple ASCII bar: `[####----] 45%` |
| Context Window | Progress bar + percentage | Same ASCII bar pattern |

**ANSI codes needed (inline constants, no library):**
```javascript
// bin/lib/pane-renderer.cjs — all ANSI constants inline, zero deps
const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function progressBar(filled, total, width) {
  const w = width || 20;
  const pct = Math.min(Math.round((filled / total) * w), w);
  return '[' + '#'.repeat(pct) + '-'.repeat(w - pct) + ']';
}
```

**Why not blessed:** blessed is largely unmaintained (last commit 2022 on the original
repo). It requires terminal size detection, event loops, and screen ownership — it wants
to own the entire terminal. PDE's dashboard panes are owned by tmux, not by Node.js.
blessed is the wrong model for content written to tmux panes via send-keys.

**Why not ink:** ink is React-based and ESM-first. It requires a persistent process that
renders to stdout. PDE's pane updates are sent from short-lived pde-tools processes.
ink's model (React render loop) is fundamentally incompatible with tmux send-keys.

**Why not terminal-kit:** terminal-kit is 180KB with 6 transitive dependencies. For
progress bars and ANSI colors, inline constants are the right call.

---

## Recommended New lib Modules

| Module | Path | Purpose | Dependencies |
|--------|------|---------|--------------|
| `event-bus.cjs` | `bin/lib/event-bus.cjs` | PdeEventBus singleton; typed event emission with wildcard | `node:events` only |
| `event-logger.cjs` | `bin/lib/event-logger.cjs` | NDJSON append to `/tmp` + `.planning/logs/`; rotation at 10MB | `node:fs`, `node:path`, `node:os` |
| `tmux-driver.cjs` | `bin/lib/tmux-driver.cjs` | tmux session/pane creation via spawnSync array args; detect/install hint | `node:child_process` |
| `pane-renderer.cjs` | `bin/lib/pane-renderer.cjs` | ANSI codes, progress bars, status line formatters | None (pure string ops) |
| `token-meter.cjs` | `bin/lib/token-meter.cjs` | Chars/4 heuristic; optional tokenx vendor; context window % | `node:fs`, `node:https` (optional API call) |
| `monitor-layout.cjs` | `bin/lib/monitor-layout.cjs` | 6-pane layout builder; pane IDs; refresh cycle | `tmux-driver.cjs`, `pane-renderer.cjs` |

---

## Installation

No `npm install` required. No `package.json` needed.

All six new modules use only Node.js built-ins. If tokenx is needed for improved token
estimation accuracy:

```bash
# One-time: vendor tokenx 1.3.0 — copy CJS dist, zero transitive deps
# Download: https://registry.npmjs.org/tokenx/-/tokenx-1.3.0.tgz
# Extract: tokenx/dist/index.cjs -> bin/lib/vendor/tokenx.cjs
```

For tmux availability (user's machine, one-time setup):
```bash
brew install tmux          # macOS
sudo apt install tmux      # Ubuntu/Debian
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| spawnSync with array args | node-tmux npm | node-tmux has 6 session-level methods only; no pane addressing, no split-window, no send-keys with pane targeting — confirmed via GitHub |
| spawnSync with array args | stmux npm | stmux creates a pseudo-multiplexer using blessed in-process; does not create persistent real tmux sessions |
| `node:events` EventEmitter | EventEmitter3 npm | 3x faster than built-in; irrelevant for 10 events/second; adds npm dep for zero practical benefit |
| `node:events` EventEmitter | mitt npm | ESM-first, no CJS build; requires vendoring; identical functionality for this use case |
| NDJSON file + `tail -f` | Unix domain socket + `node:net` | pde-tools processes are short-lived; socket server per invocation is complexity without benefit |
| NDJSON file + `tail -f` | node-ipc npm | Overkill IPC library for "append a line to a file" |
| `fs.appendFileSync` + manual rotation | pino npm | Designed for high-throughput APIs; async worker threads are overhead for 10 events/second; pino-roll adds another dep |
| `fs.appendFileSync` + manual rotation | winston npm | Same reasoning; 4+ transitive deps for features PDE does not need |
| ANSI constants inline | blessed npm | Unmaintained; wants terminal ownership; incompatible with tmux send-keys model |
| ANSI constants inline | ink npm | React-based, ESM-first, persistent render process — wrong model for tmux pane content |
| ANSI constants inline | terminal-kit npm | 180KB, 6 deps, for progress bars and colors |
| chars/4 heuristic | tokenx 1.3.0 (vendored) | Heuristic is sufficient for a monitoring dashboard; vendor tokenx if higher accuracy is needed |
| chars/4 heuristic | gpt-tokenizer npm | Designed for GPT tokenizers; approximate for Claude; npm install required |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `package.json` at plugin root | Creates npm install requirement for plugin users; breaks zero-dep distribution model | Vendor tiny CJS files in `bin/lib/vendor/` as committed source (tokenx if needed) |
| blessed, neo-blessed, unblessed | All want terminal ownership via a render loop; incompatible with tmux pane model where content is injected via send-keys | ANSI escape codes inline in pane-renderer.cjs |
| ink | ESM-first, React-based, requires persistent render process; fundamentally wrong model | ANSI codes + tmux send-keys |
| pino, winston | Designed for high-throughput multi-destination logging; all their features exceed PDE's needs; deps chain | `fs.appendFileSync` + manual rotation in event-logger.cjs |
| node-ipc | Full IPC framework for TCP/UDP/Unix sockets; PDE only needs file-based message passing | NDJSON append file + `tail -f` |
| Any ESM-only package | Claude Code plugin runtime requires CJS compatibility | Verify CJS export before vendoring any package |
| `@anthropic-ai/sdk` for token counting | SDK requires npm install; PDE avoids it | Use `node:https` for `POST /v1/messages/count_tokens` if needed, or chars/4 heuristic |

---

## Stack Patterns by Variant

**If tmux is not installed (user's machine):**
- `tmux-driver.cjs` returns `{ installed: false, installCommand: '...' }`
- `/pde:monitor` skill prints install instructions and exits cleanly
- All other PDE functionality continues unaffected (event bus + logging work without tmux)

**If ANTHROPIC_API_KEY is not set (common for Claude Code users):**
- `token-meter.cjs` falls back to chars/4 heuristic
- Cost pane shows values marked `~estimated`
- No external API calls are made

**If tokenx heuristic is needed:**
- Vendor `tokenx/dist/index.cjs` as `bin/lib/vendor/tokenx.cjs` (2kB, no transitive deps)
- Change token-meter.cjs to require the vendor file instead of inline heuristic
- No other changes needed

---

## Integration with Existing PDE Architecture

| Existing Component | Integration Point | How |
|-------------------|------------------|-----|
| `pde-tools.cjs` | Emit events from existing commands | Add `bus.emit('phase.complete', {...})` calls in `phase.cjs` and `verify.cjs` |
| `bin/lib/mcp-bridge.cjs` | Emit tool call events | `bus.emit('tool.called', { tool, args })` on each tool invocation |
| `bin/lib/tracking.cjs` | Emit task status events | `bus.emit('task.updated', { task, status })` |
| Agent spawning (workflows) | Emit agent lifecycle events | Add event emission at agent start/complete in orchestrator workflows |
| `.planning/logs/` | Session summaries | `event-logger.cjs` writes structured NDJSON summaries here; same directory as existing logs |

**Key constraint:** The event bus (`event-bus.cjs`) is in-process. pde-tools invocations
are separate processes. The bus fans out to multiple consumers within a single invocation
(log writer, pane updater). Cross-invocation communication uses the NDJSON file (written
by event-logger.cjs, read by tmux panes via `tail -f`).

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `node:events` EventEmitter | Node.js v20+ | `setMaxListeners(n)` since v0.11.2; `eventNames()` since v6 |
| `child_process.spawnSync` | Node.js v20+ | Available since v0.12; array args = no shell injection |
| `fs.appendFileSync` | Node.js v20+ | POSIX atomic per-call for single process; available since v0.6.7 |
| ANSI escape codes | All terminal emulators | tmux passes ANSI through to panes; universal support |
| tmux send-keys pane addressing | tmux 1.6+ | `session:window.pane` format since tmux 1.6; macOS homebrew ships tmux 3.3a+ |
| tokenx 1.3.0 (if vendored) | Node.js v18+ | Pure JavaScript, no native bindings; CJS build confirmed; zero transitive deps |

---

## Sources

- **Node.js EventEmitter official docs** (HIGH confidence): https://nodejs.org/api/events.html
- **node-tmux GitHub** (HIGH confidence): https://github.com/StarlaneStudios/node-tmux — confirmed only 6 session-level methods; no pane addressing, no split-window
- **tmux man page** (HIGH confidence): https://man7.org/linux/man-pages/man1/tmux.1.html — `send-keys`, `split-window`, `select-layout`, pane addressing all confirmed
- **Anthropic token counting docs** (HIGH confidence): https://docs.claude.com/en/docs/build-with-claude/token-counting — free endpoint, RPM-limited
- **tokenx npm** (MEDIUM confidence): https://www.npmjs.com/package/tokenx — v1.3.0, 2kB, zero deps, ~96% accuracy
- **tokenx GitHub** (MEDIUM confidence): https://github.com/johannschopplich/tokenx — CJS build confirmed; zero transitive deps confirmed
- **stmux GitHub** (HIGH confidence): https://github.com/rse/stmux — confirmed blessed-based pseudo-multiplexer; does not create real tmux sessions
- **NDJSON Node.js patterns** (HIGH confidence): https://www.bennadel.com/blog/3233-parsing-and-serializing-large-datasets-using-newline-delimited-json-in-node-js.htm
- **Pino vs Winston comparison** (MEDIUM confidence): https://betterstack.com/community/guides/scaling-nodejs/pino-vs-winston/ — both designed for high-throughput; neither matches PDE's simple append-only requirement
- **Claude Code context estimation heuristic** (MEDIUM confidence): https://codelynx.dev/posts/calculate-claude-code-context — chars/4 confirmed as common approximation

---

*Stack research for: PDE v0.8 — tmux monitoring dashboard and event infrastructure*
*Researched: 2026-03-19*
