# Phase 58: Event Infrastructure Core - Research

**Researched:** 2026-03-19
**Domain:** Node.js CommonJS event bus + NDJSON append-file IPC + Claude Code hooks system
**Confidence:** HIGH

---

## Summary

Phase 58 builds the write path for all of PDE's v0.8 observability — the NDJSON event log every downstream consumer (dashboard, archiver, token estimator) depends on. The work is entirely additive: three new files (hooks/hooks.json, hooks/emit-event.cjs, bin/lib/event-bus.cjs), one new subcommand (event-emit in pde-tools.cjs), and two new config fields in .planning/config.json. No existing files are restructured.

The design has three moving parts, each verified against authoritative sources. First, the Claude Code hooks system: hooks are declared in `.claude/settings.json` (project-scoped) or a plugin's `hooks/hooks.json`, receive a JSON payload on stdin for every hook event (SubagentStart, SubagentStop, PostToolUse, SessionStart, SessionEnd), and must exit quickly to avoid blocking the Claude Code agent. Second, the NDJSON append-file pattern: Node.js `fs.appendFile` (async, non-blocking) or `fs.appendFileSync` (blocking per call but still sub-millisecond for a single line) are both viable; the key architectural constraint is that pde-tools.cjs is short-lived (milliseconds), so the single file-append call completes before exit with no event loop required. Third, session ID scoping: `crypto.randomUUID()` is available in Node.js v20 without any require (it is a global since v14.17) but also as `require('crypto').randomUUID()` — both work in CommonJS; manifest.cjs already uses `require('crypto')` so the pattern is established.

**Primary recommendation:** Use `async: true` in the hook declaration in hooks.json so Claude Code does not block on emit-event.cjs completing. The hook handler writes exactly one line to disk and exits. Session ID is generated once at SessionStart, persisted to `.planning/config.json` under `monitoring.session_id`, and reused by all subsequent hook events and manual event-emit calls.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVNT-01 | Event bus emits structured NDJSON events with schema_version, timestamp, event_type, session_id, and extensions fields | Event schema defined below; JSON.stringify + appendFile pattern verified |
| EVNT-02 | Events are appended to session-scoped NDJSON files in /tmp via async dispatch (setImmediate) to avoid blocking workflows | fs.appendFile (async) for in-process bus; `async: true` hook config for hook events; setImmediate pattern verified |
| EVNT-03 | Claude Code hooks (SubagentStart, SubagentStop, PostToolUse, SessionStart, SessionEnd) automatically capture tool-level events | Hook types confirmed in official Claude Code docs; payload fields verified; stdin delivery confirmed |
| EVNT-05 | Event schema includes extensions field for future consumers (presentations, idle-time productivity) | Extensions field in schema definition below; JSON object, never null |
| EVNT-06 | Concurrent PDE sessions write to separate session-scoped event files without interleaving | UUID session ID in filename; each SessionStart generates a new UUID; verified pattern |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:events` EventEmitter | Built-in (v20) | In-process event bus within a single pde-tools.cjs invocation | Zero deps, synchronous delivery, CJS native; `setMaxListeners(20)` prevents warning |
| `node:fs` appendFile | Built-in (v20) | Async NDJSON append to `/tmp/pde-session-{uuid}.ndjson` | Established in every PDE lib module; no locking needed in pde-tools single-process model |
| `node:crypto` randomUUID | Built-in (v20) | Session-scoped UUID generation | Already used in manifest.cjs; `require('crypto').randomUUID()` is the CJS pattern |
| `node:os` tmpdir | Built-in (v20) | Resolve `/tmp` path portably | Already used in core.cjs |
| `node:path` | Built-in (v20) | Log file path construction | Universal in all PDE lib modules |

### Hook Infrastructure (Claude Code hooks system)
| Component | Format | Purpose | Why |
|-----------|--------|---------|-----|
| `hooks/hooks.json` | JSON, plugin-bundled | Declare which Claude Code events fire which scripts | Plugin-scoped hooks, committed to repo, auto-loaded by Claude Code |
| `hooks/emit-event.cjs` | Node.js CJS | Read hook JSON from stdin, map to PDE event type, call pde-tools.cjs event-emit | Thin adapter; all state logic stays in pde-tools.cjs |

### No npm Dependencies
Nothing new to install. All six imports are Node.js built-ins.

---

## Architecture Patterns

### Recommended File Structure (new files only)
```
hooks/
  hooks.json               # Hook declarations (plugin root, auto-loaded)
  emit-event.cjs           # Hook handler: stdin -> pde-tools.cjs event-emit

bin/lib/
  event-bus.cjs            # EventEmitter wrapper + session ID + log path resolution

[modified]
bin/pde-tools.cjs          # Add event-emit subcommand + session-start subcommand
bin/lib/config.cjs         # Add monitoring.session_id and monitoring.enabled to VALID_CONFIG_KEYS
.planning/config.json      # Add monitoring: { enabled: true, session_id: null }
```

### Pattern 1: Hook Declaration in hooks.json

**What:** Plugin-scoped hook configuration lives at `hooks/hooks.json` in the plugin root. Claude Code loads it automatically when the plugin is enabled.

**Official format (verified against code.claude.com/docs/en/hooks):**
```json
{
  "hooks": {
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs",
            "async": true
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs",
            "async": true
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs",
            "async": true
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs",
            "async": false
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs",
            "async": false
          }
        ]
      }
    ]
  }
}
```

**Key facts:**
- `async: true` means Claude Code does NOT wait for the hook to complete before continuing. Use for all hooks except SessionStart (which must persist the session ID before any tool events fire) and SessionEnd (which must flush the final event before session exits).
- The `matcher` field on PostToolUse filters by tool name. `Write|Edit|Bash` captures file operations and shell calls. Omit matcher to capture all tools.
- `${CLAUDE_PLUGIN_ROOT}` is injected by Claude Code. It is available in all hook command strings.
- No `timeout` field is required for async hooks.

### Pattern 2: Hook Stdin Payload

**What:** Claude Code delivers hook input as JSON via stdin to every hook command script.

**Verified payload fields (common across all hook types):**
```json
{
  "session_id": "abc-123-...",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "agent_id": "agent-xyz",
  "agent_type": "Explore"
}
```

**Tool event additional fields (PostToolUse):**
```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "content": "..."
  },
  "tool_use_id": "toolu_01ABC123",
  "tool_response": {}
}
```

**SubagentStart/SubagentStop additional fields:**
```json
{
  "tool_name": "Agent",
  "tool_input": {
    "prompt": "...",
    "subagent_type": "Explore"
  },
  "agent_transcript_path": "/path/to/subagent/transcript.jsonl"
}
```

**SessionStart additional fields:**
```json
{
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear|compact",
  "model": "claude-sonnet-4-6"
}
```

**Reading stdin in emit-event.cjs:**
```javascript
// Source: official Claude Code hooks docs (code.claude.com/docs/en/hooks)
// hooks/emit-event.cjs
let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let hookData;
  try { hookData = JSON.parse(raw); } catch { process.exit(0); }
  // ... map and emit
  process.exit(0);
});
```

### Pattern 3: NDJSON Event Schema

**What:** Every event written to `/tmp/pde-session-{uuid}.ndjson` follows this envelope. All fields are required. The `extensions` field is always present (empty object `{}` when no extensions apply).

**Required schema (satisfies EVNT-01, EVNT-05):**
```json
{
  "schema_version": "1.0",
  "ts": "2026-03-19T14:23:01.123Z",
  "event_type": "subagent_start",
  "session_id": "f5bdbe96-0fa7-4470-8776-c12819eeb03a",
  "extensions": {}
}
```

**Event type taxonomy for Phase 58 (hook-sourced events only — EVNT-04 semantic events are Phase 62):**

| event_type | Hook Source | Additional Fields |
|------------|-------------|-------------------|
| `session_start` | SessionStart | `model`, `source` |
| `session_end` | SessionEnd | — |
| `subagent_start` | SubagentStart | `agent_id`, `agent_type`, `subagent_type` |
| `subagent_stop` | SubagentStop | `agent_id`, `agent_type`, `agent_transcript_path` |
| `file_changed` | PostToolUse (Write/Edit) | `tool_name`, `file_path` |
| `bash_called` | PostToolUse (Bash) | `command` (first 200 chars) |
| `tool_called` | PostToolUse (other tools) | `tool_name` |

**Full example line:**
```json
{"schema_version":"1.0","ts":"2026-03-19T14:23:01.123Z","event_type":"file_changed","session_id":"f5bdbe96-0fa7-4470-8776-c12819eeb03a","tool_name":"Write","file_path":"/path/to/file.ts","extensions":{}}
```

**NDJSON write function:**
```javascript
// Source: Node.js docs (nodejs.org/api/fs.html#fsappendfilepath-data-options-callback)
// bin/lib/event-bus.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

function appendEvent(sessionId, envelope) {
  const logPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
  const line = JSON.stringify(envelope) + '\n';
  // fs.appendFile is async — does NOT block the caller
  fs.appendFile(logPath, line, 'utf-8', (err) => {
    if (err) { /* swallow silently — event log failure must not crash PDE */ }
  });
}
```

**Why `fs.appendFile` (async) over `fs.appendFileSync` (blocking):**
- In emit-event.cjs (hook handler): the script must exit before a timeout, so use `fs.appendFileSync` here since it is a short-lived process and we need the write to complete before exit.
- In pde-tools.cjs `event-emit` subcommand (called from workflow markdown): same — short-lived process, `appendFileSync` is fine and simpler.
- In the in-process event-bus.cjs (used inside a running pde-tools.cjs invocation): use `fs.appendFile` (async) to avoid blocking the current operation.

### Pattern 4: In-Process Event Bus

**What:** `bin/lib/event-bus.cjs` wraps Node.js EventEmitter for in-process fan-out within a single pde-tools.cjs invocation. Consumers (future log rotator, future session archiver caller) subscribe to events. The NDJSON writer is the primary subscriber.

```javascript
// Source: nodejs.org/api/events.html
// bin/lib/event-bus.cjs
'use strict';
const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');

class PdeEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // supports 6 dashboard panes + log + cost + context
  }

  dispatch(eventType, payload) {
    // Deferred dispatch: does not block caller
    setImmediate(() => {
      const envelope = {
        schema_version: '1.0',
        ts: new Date().toISOString(),
        event_type: eventType,
        session_id: payload.session_id || this._sessionId || 'unknown',
        ...payload,
        extensions: payload.extensions || {},
      };
      this.emit(eventType, envelope);
      this.emit('*', envelope); // wildcard subscriber for NDJSON writer
    });
  }
}

// Session ID management
let _sessionId = null;

function generateSessionId() {
  _sessionId = randomUUID();
  return _sessionId;
}

function getSessionId() {
  return _sessionId;
}

const bus = new PdeEventBus();
module.exports = { PdeEventBus, bus, generateSessionId, getSessionId };
```

**Why `setImmediate` over `process.nextTick`:**
- `process.nextTick` fires before I/O callbacks in the same event loop tick — effectively still synchronous in context
- `setImmediate` fires in the check phase, after I/O, ensuring the calling operation is fully complete
- For fire-and-forget event emission, `setImmediate` is the correct choice (mirrors emittery's design)

### Pattern 5: event-emit Subcommand in pde-tools.cjs

**What:** `node pde-tools.cjs event-emit <event_type> [json-payload]` is the external write path for hook handler scripts and workflow manual emits.

**Implementation in pde-tools.cjs switch block:**
```javascript
case 'event-emit': {
  // Lazy require — if event-bus.cjs fails to load, this command fails gracefully
  // but other pde-tools commands are unaffected
  const eb = require('./lib/event-bus.cjs');
  const eventType = args[1];
  if (!eventType) { error('event-emit: missing event_type'); }

  let payload = {};
  if (args[2]) {
    try { payload = JSON.parse(args[2]); } catch { /* malformed payload — silent fail */ }
  }

  // Read session ID from config
  const configPath = require('path').join(cwd, '.planning', 'config.json');
  let sessionId = 'unknown';
  try {
    const cfg = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    sessionId = (cfg.monitoring && cfg.monitoring.session_id) || 'unknown';
  } catch { /* config not found — session ID unknown, still emit */ }

  const envelope = {
    schema_version: '1.0',
    ts: new Date().toISOString(),
    event_type: eventType,
    session_id: sessionId,
    ...payload,
    extensions: payload.extensions || {},
  };

  const fs = require('fs');
  const os = require('os');
  const logPath = require('path').join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
  try {
    fs.appendFileSync(logPath, JSON.stringify(envelope) + '\n', 'utf-8');
  } catch { /* swallow — event log write failure must never crash a workflow */ }

  if (raw) { process.stdout.write(JSON.stringify({ ok: true, event_type: eventType })); }
  break;
}

case 'session-start': {
  // Generate new session ID, persist to config.json
  const { randomUUID } = require('crypto');
  const newId = randomUUID();
  const config = require('./lib/config.cjs');
  config.setNestedConfigValue(cwd, 'monitoring.session_id', newId);
  if (raw) { process.stdout.write(JSON.stringify({ session_id: newId })); }
  else { console.log(`Session started: ${newId}`); }
  break;
}
```

**CRITICAL: Lazy require pattern.** Do NOT add `require('./lib/event-bus.cjs')` at the top of pde-tools.cjs. If event-bus.cjs has a syntax error or import failure, it would crash every single pde-tools.cjs command. Use `const eb = require('./lib/event-bus.cjs')` inside the `case 'event-emit':` block only.

### Pattern 6: emit-event.cjs Hook Handler

**What:** Thin adapter — reads hook JSON from stdin, maps hook event to PDE event type, calls `node pde-tools.cjs event-emit`.

```javascript
#!/usr/bin/env node
// hooks/emit-event.cjs
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const HOOK_TO_EVENT_TYPE = {
  SubagentStart:  'subagent_start',
  SubagentStop:   'subagent_stop',
  SessionStart:   'session_start',
  SessionEnd:     'session_end',
  PostToolUse:    null, // resolved per tool_name below
};

function toolNameToEventType(toolName) {
  if (toolName === 'Write' || toolName === 'Edit') return 'file_changed';
  if (toolName === 'Bash') return 'bash_called';
  return 'tool_called';
}

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let hookData;
  try { hookData = JSON.parse(raw); } catch { process.exit(0); }

  const hookName = hookData.hook_event_name;

  // Special case: session_start generates a new session ID first
  if (hookName === 'SessionStart') {
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
    const pdeTools = path.join(pluginRoot, 'bin', 'pde-tools.cjs');
    // Generate session ID
    spawnSync(process.execPath, [pdeTools, 'session-start'], { encoding: 'utf-8' });
  }

  let eventType = HOOK_TO_EVENT_TYPE[hookName];
  if (hookName === 'PostToolUse') {
    eventType = toolNameToEventType(hookData.tool_name || '');
  }
  if (!eventType) { process.exit(0); } // unknown hook event — ignore silently

  // Build minimal payload (keep under 1KB to avoid interleave risk)
  const payload = {
    session_id: hookData.session_id,
  };
  if (hookData.agent_id)              payload.agent_id = hookData.agent_id;
  if (hookData.agent_type)            payload.agent_type = hookData.agent_type;
  if (hookData.tool_name)             payload.tool_name = hookData.tool_name;
  if (hookData.tool_input) {
    if (hookData.tool_input.file_path) payload.file_path = hookData.tool_input.file_path;
    if (hookData.tool_input.command)   payload.command = hookData.tool_input.command.slice(0, 200);
  }
  if (hookData.agent_transcript_path) payload.agent_transcript_path = hookData.agent_transcript_path;

  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
  const pdeTools = path.join(pluginRoot, 'bin', 'pde-tools.cjs');

  spawnSync(process.execPath, [pdeTools, 'event-emit', eventType, JSON.stringify(payload)], {
    encoding: 'utf-8',
    timeout: 5000, // hard cap: hook must not hang
  });

  process.exit(0);
});
```

### Pattern 7: config.json Monitoring Section

**What:** Add `monitoring.session_id` and `monitoring.enabled` to `.planning/config.json`. These keys must also be added to `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`.

**Updated config.json shape:**
```json
{
  "monitoring": {
    "enabled": true,
    "session_id": null
  }
}
```

**config.cjs VALID_CONFIG_KEYS additions:**
```javascript
'monitoring.enabled',
'monitoring.session_id',
```

### Anti-Patterns to Avoid

- **Top-level require of event-bus.cjs in pde-tools.cjs:** If the module fails to load, all 40+ pde-tools.cjs commands break. Always lazy-require inside the case block.
- **Synchronous EventEmitter listeners that call fs.writeFileSync:** EventEmitter fires listeners synchronously. A sync file write in a listener blocks the emitter. Use `setImmediate` to defer or use `fs.appendFile` (async) in listeners.
- **Using `fs.appendFileSync` inside an event listener (registered on the bus):** Short-lived script (hook handler or event-emit subcommand) = appendFileSync OK. In-process EventEmitter listener = must be async.
- **Hook handler calling slow operations (readline, full file reads):** Hook handlers run on every tool call. Keep to: parse stdin, construct envelope, single file write, exit. Target under 10ms.
- **Fixed global log path (no session ID in filename):** Concurrent parallel agent waves would interleave lines. Session-scoped UUID in the filename is the complete fix.
- **Named pipes (mkfifo) for event transport:** FIFO writes block indefinitely when no reader is attached. NDJSON append file + `tail -F` is self-healing and reader-absence-safe.
- **session_id = hookData.session_id only (trusting hook payload):** On SessionStart, the hook payload session_id comes from Claude Code. Use it as the primary source. Persist it to config.json so that manual event-emit calls in workflow markdown can also use it via config lookup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom timestamp-based ID | `require('crypto').randomUUID()` | RFC 4122 UUID v4, cryptographically random, zero edge cases, built-in since Node.js v14.17 |
| NDJSON serialization | Custom line formatter | `JSON.stringify(obj) + '\n'` | JSON.stringify handles all edge cases (special chars, nested objects, Unicode); no library needed |
| Event bus with wildcard support | Custom pub/sub system | `node:events` EventEmitter with `emit('*', ...)` | EventEmitter is synchronous, well-tested, zero overhead; wildcard pattern is one extra `emit` call |
| Async event dispatch | Custom queue/deferred system | `setImmediate(fn)` | Built-in, correct tick phase, zero overhead |
| Hook stdin reading | Shell piping | Node.js `process.stdin` on('data') / on('end') | Direct stdin consumption in CJS script; no shell dependency |

**Key insight:** Every "library" needed for Phase 58 is already inside Node.js. The work is wiring, not dependencies.

---

## Common Pitfalls

### Pitfall 1: Hook Handler Latency Blocking Claude Code Agents
**What goes wrong:** `async: false` on PostToolUse means Claude Code waits for emit-event.cjs to complete before proceeding. If emit-event.cjs spawns pde-tools.cjs synchronously (it must, as a short-lived script), and pde-tools.cjs does any slow operation (config read, large file stat), every tool call is visibly delayed.
**Why it happens:** Hook handler latency is invisible during development when only a few tool calls are made. Multiplied across a phase with 50+ tool calls, 50ms per hook = 2.5 seconds of hidden overhead.
**How to avoid:** Use `async: true` for PostToolUse, SubagentStart, SubagentStop. Use `async: false` only for SessionStart (needs session ID to exist before any tool events) and SessionEnd (needs to flush final event). Keep the handler to: parse stdin JSON + construct envelope + single appendFileSync + exit.
**Warning signs:** Phase execution time increases more than 5% after hooks are added. pde-tools.cjs commands appear in profiler output during what should be pure workflow execution.

### Pitfall 2: Malformed Event Payload Crashing a Running Workflow
**What goes wrong:** A workflow calls `pde-tools.cjs event-emit phase_started '{malformed json'`. If pde-tools.cjs throws on JSON.parse, the workflow bash step exits non-zero, triggering error handling in execute-phase.md.
**Why it happens:** Bash variable substitution can produce malformed JSON if the payload contains quotes or special characters.
**How to avoid:** The `event-emit` case must wrap JSON.parse in a try-catch and swallow silently on failure. The `fs.appendFileSync` call must also be try-catched. Event infrastructure MUST fail silently — it can never cause a primary workflow step to fail.

### Pitfall 3: session_id Unknown When First Tool Events Fire
**What goes wrong:** SessionStart hook fires, emit-event.cjs is called. If the session ID is generated inside emit-event.cjs but not persisted before SessionStart exits, subsequent PostToolUse hook events that read session_id from config.json get `null`.
**Why it happens:** SessionStart fires once; the session_id generated there must survive to all subsequent hook events in the same session. If persist-to-config happens asynchronously or is skipped, all subsequent events use session_id = 'unknown'.
**How to avoid:** SessionStart hook MUST be `async: false` and MUST persist the session_id synchronously to .planning/config.json before exiting. The session-start subcommand in pde-tools.cjs uses `config.setNestedConfigValue` synchronously. Only after session_id is persisted does the hook exit with code 0.

### Pitfall 4: Concurrent Write Interleaving Between Parallel Agent Waves
**What goes wrong:** Wave 2 of a phase runs three subagents in parallel. Each subagent's tool calls trigger PostToolUse hooks. All three hook processes call pde-tools.cjs event-emit simultaneously. If they write to the same file at the same time with payloads larger than PIPE_BUF (~4096 bytes), lines interleave at the byte level.
**Why it happens:** `fs.appendFileSync` uses the O_APPEND flag which provides atomic writes only up to PIPE_BUF bytes on Linux/macOS. Payloads trimmed to 1KB are safe; larger payloads are not.
**How to avoid:** Session-scoped filenames (`/tmp/pde-session-{uuid}.ndjson`) do NOT fix concurrent writes from multiple processes to the SAME file — multiple hook processes can still write to the same session file concurrently. Fix: keep payloads under 1KB (strip large fields like `content` from tool_input). The event schema trims `command` to 200 chars. Do NOT include file content in file_changed events — only file_path.

### Pitfall 5: Hook Declaration Format Mismatch
**What goes wrong:** The hooks.json outer structure uses incorrect nesting. For example, declaring `"SubagentStart": [{ "type": "command", "command": "..." }]` (missing the inner `hooks` array) causes Claude Code to silently ignore the hook.
**Why it happens:** The hooks.json format has a double-hooks nesting: the outer array is a list of hook matchers (each with optional `matcher` field), and each matcher has an inner `hooks` array of hook definitions. This is easy to flatten incorrectly.
**How to avoid:** Use the exact structure verified in this research: `"EventName": [{ "matcher": "...", "hooks": [{ "type": "command", "command": "..." }] }]`. The matcher field is optional for events without tool-name filtering (SubagentStart, SessionStart, etc.), but the inner `hooks` array is always required.
**Warning signs:** Hooks are declared but no NDJSON file is created after running a PDE command. Check: does `ls /tmp/pde-session-*.ndjson` show a file? If not, the hook declaration is silently failing.

---

## Code Examples

### Complete Event Envelope (all required fields)
```javascript
// Source: EVNT-01 requirement + research
const envelope = {
  schema_version: '1.0',
  ts: new Date().toISOString(),      // ISO 8601 with milliseconds
  event_type: 'subagent_start',      // dot-separated or underscore_separated (use underscore)
  session_id: 'f5bdbe96-0fa7-4470-8776-c12819eeb03a',
  extensions: {},                     // always present, always an object, never null
  // Optional fields (present when relevant):
  agent_id: 'agent-xyz',
  agent_type: 'gsd-researcher',
  tool_name: 'Write',
  file_path: '/path/to/file.ts',
};
const line = JSON.stringify(envelope) + '\n';
// line is safely under 500 bytes for any realistic PDE event
```

### Session ID Generation (session-start subcommand)
```javascript
// Source: Node.js docs (nodejs.org/api/crypto.html#cryptorandomuuid)
const { randomUUID } = require('crypto');
const sessionId = randomUUID(); // 'f5bdbe96-0fa7-4470-8776-c12819eeb03a'
// Persist to .planning/config.json monitoring.session_id
```

### Reading Hook stdin in emit-event.cjs
```javascript
// Source: official Claude Code hooks docs (code.claude.com/docs/en/hooks)
let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let hookData;
  try { hookData = JSON.parse(raw); } catch { process.exit(0); }
  // hookData.session_id, hookData.hook_event_name, hookData.tool_name available here
  process.exit(0);
});
```

### Safe Event Append (fail-silent contract)
```javascript
// Source: Node.js docs (nodejs.org/api/fs.html#fsappendfilesyncpath-data-options)
// In short-lived scripts (hook handlers, pde-tools.cjs subcommands) — appendFileSync is OK
const fs = require('fs');
const os = require('os');
const path = require('path');

function safeAppendEvent(sessionId, envelope) {
  const logPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
  try {
    fs.appendFileSync(logPath, JSON.stringify(envelope) + '\n', 'utf-8');
  } catch {
    // Swallow silently — event log failure must NEVER crash a PDE workflow
  }
}
```

### hooks.json with Correct Double-Nesting
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/emit-event.cjs",
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual emit calls in every workflow file | Claude Code hooks auto-capture all tool events | Claude Code hooks system (2024) | Zero workflow changes for basic instrumentation |
| Named pipes (FIFO) for event IPC | Append-only log file + `tail -F` | Established pattern | Self-healing, no reader-required, no blocked writes |
| Winston/Pino for structured logging | `JSON.stringify + fs.appendFileSync` | Always (for zero-dep plugins) | No dependencies, identical output |
| Global event log file | Session-scoped UUID filename | Best practice for concurrent systems | Eliminates concurrent write interleaving |
| Custom UUID generation | `crypto.randomUUID()` | Node.js v14.17 (2021) | RFC 4122 compliant, cryptographically random, zero deps |

**Deprecated/outdated:**
- `async: true` on hook handlers via JSON return: the correct mechanism is the `async` field in hooks.json hook declaration, not a JSON response body. Async hooks simply do not return a response that Claude Code waits on.
- `$CLAUDE_PLUGIN_ROOT` shell expansion in hook commands: this is the correct approach; do NOT hardcode paths in hooks.json.

---

## Open Questions

1. **CLAUDE_PLUGIN_ROOT value in hook command**
   - What we know: `${CLAUDE_PLUGIN_ROOT}` is available as an environment variable in all hook command strings per official docs
   - What's unclear: Whether it resolves at hook declaration time or at hook execution time. If at declaration time and the plugin root changes (e.g., different Claude Code installation), the path would be stale.
   - Recommendation: Use `${CLAUDE_PLUGIN_ROOT}` as documented. Alternatively, use a relative path `./hooks/emit-event.cjs` if the hook is always executed from the plugin root — but official pattern uses the env var.

2. **session_id from hook payload vs. generated UUID**
   - What we know: Claude Code injects `session_id` into all hook payloads. This session_id is Claude Code's own session identifier.
   - What's unclear: Whether this Claude Code session_id is stable across a full PDE session (multiple execute-phase runs) or resets per Claude Code session restart.
   - Recommendation: For EVNT-06 (concurrent session isolation), use a PDE-generated UUID stored in config.json rather than relying on Claude Code's session_id. The Claude Code session_id is useful for correlating events within a single Claude Code session but may not span the full PDE session lifecycle. Store both: use PDE UUID for file naming, include Claude Code session_id in payload for correlation.

3. **Payload size in concurrent scenarios**
   - What we know: POSIX guarantees atomic O_APPEND writes up to PIPE_BUF (~4096 bytes)
   - What's unclear: Whether file content in `tool_input.content` (Write events) could exceed 4096 bytes and cause interleaving
   - Recommendation: Never include file content in file_changed events. Only include file_path. Cap `command` at 200 chars. This keeps all payloads well under 1KB.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test runner exists in PDE — zero-npm constraint) |
| Config file | none — validation is manual shell verification |
| Quick run command | `node bin/pde-tools.cjs event-emit test_event '{"test":true}' && ls /tmp/pde-session-*.ndjson` |
| Full suite command | `ls /tmp/pde-session-*.ndjson \| head -1 \| xargs cat \| node -e "process.stdin.setEncoding('utf-8'); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ d.trim().split('\n').forEach((l,i)=>{ JSON.parse(l); }); console.log('All lines valid JSON'); })"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVNT-01 | Events have schema_version, ts, event_type, session_id, extensions | unit/smoke | `node bin/pde-tools.cjs event-emit test '{}' && cat /tmp/pde-session-*.ndjson | node -e "const l=require('fs').readFileSync('/dev/stdin','utf-8').trim().split('\n'); const e=JSON.parse(l[l.length-1]); console.assert(e.schema_version==='1.0'); console.assert(e.extensions!==undefined); console.log('EVNT-01 PASS')"` | Wave 0 |
| EVNT-02 | Events written to /tmp/pde-session-{uuid}.ndjson | smoke | `ls /tmp/pde-session-*.ndjson` | Wave 0 |
| EVNT-03 | Running a PDE command produces hook events in the log | integration | Run any `node bin/pde-tools.cjs` command and verify hook fired | Wave 0 |
| EVNT-05 | extensions field present on all events | unit | Check envelope in EVNT-01 test above | Wave 0 |
| EVNT-06 | Two concurrent sessions write to separate files | integration | `node bin/pde-tools.cjs session-start; sleep 0.1; node bin/pde-tools.cjs session-start; ls /tmp/pde-session-*.ndjson | wc -l` (expect 2) | Wave 0 |

### Sampling Rate
- **Per task commit:** `node bin/pde-tools.cjs event-emit test_event '{}' && ls /tmp/pde-session-*.ndjson`
- **Per wave merge:** Full NDJSON parse of all session files + schema field verification
- **Phase gate:** All 5 requirements produce verifiable NDJSON output before `/pde:verify-work`

### Wave 0 Gaps
- [ ] No formal test runner exists — verification is shell-based smoke tests
- [ ] `hooks/` directory does not exist yet — must be created as part of Wave 1
- [ ] `bin/lib/event-bus.cjs` does not exist yet — created in Wave 1
- [ ] `monitoring.*` config keys not in VALID_CONFIG_KEYS — must be added to config.cjs in Wave 1

*(No existing test infrastructure to extend — all verification is new for this phase)*

---

## Sources

### Primary (HIGH confidence)
- Claude Code Hooks official docs (code.claude.com/docs/en/hooks, fetched 2026-03-19) — hook event types, hooks.json format, stdin delivery, payload fields, async declaration, matcher syntax, CLAUDE_PLUGIN_ROOT env var
- Node.js v20 EventEmitter docs (nodejs.org/api/events.html) — setMaxListeners, synchronous dispatch behavior, emit semantics
- Node.js v20 fs docs (nodejs.org/api/fs.html) — appendFile async vs appendFileSync, O_APPEND flag behavior
- Node.js v20 crypto docs (nodejs.org/api/crypto.html) — randomUUID() availability and usage
- PDE codebase direct inspection (2026-03-19):
  - `bin/pde-tools.cjs` — subcommand registration pattern, switch/case structure, lazy require for infrequent subcommands
  - `bin/lib/config.cjs` — VALID_CONFIG_KEYS set, ensureConfigFile pattern, setNestedConfigValue function
  - `bin/lib/manifest.cjs` — `require('crypto')` usage pattern (established precedent)
  - `.planning/config.json` — current config schema (no monitoring keys yet)
  - `.planning/STACK.md`, `.planning/ARCHITECTURE.md`, `.planning/PITFALLS.md` — milestone research
- Codebase verification of Node.js built-ins (2026-03-19):
  - `crypto.randomUUID()` — verified works in current Node.js environment
  - `EventEmitter.setMaxListeners(20)` — verified
  - `fs.appendFileSync` NDJSON pattern — verified with correct schema fields

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — PDE v0.8 architecture decisions; build order; data flow diagrams; anti-patterns
- `.planning/research/PITFALLS.md` — 10 pitfalls with prevention strategies and verification checklists
- `.planning/research/STACK.md` — complete alternatives analysis; zero-npm rationale; NDJSON IPC decision

### Tertiary (LOW confidence, flagged)
- emittery GitHub (sindresorhus) — confirms `setImmediate` is the correct async dispatch pattern for event buses; not used directly (ESM-only)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all built-ins verified against official docs and existing codebase patterns
- Architecture: HIGH — data flow matches architecture research; hook format verified against live docs
- Pitfalls: HIGH — grounded in PITFALLS.md + direct codebase inspection + official hooks docs
- Hook payload fields: HIGH — fetched live from code.claude.com/docs/en/hooks
- Concurrent write safety: HIGH — POSIX O_APPEND semantics + 1KB payload cap recommendation

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — hooks API is stable; Node.js v20 is LTS)

**Phase scope note:** This research covers EVNT-01, EVNT-02, EVNT-03, EVNT-05, EVNT-06 only. EVNT-04 (semantic workflow events: phase_started, wave_started) is Phase 62 per REQUIREMENTS.md traceability table.
