# Phase 144: Local CLI Dispatch - Research

**Researched:** 2026-03-26
**Domain:** Node.js child process orchestration, claude CLI subprocess spawning, PID registry crash recovery, NDJSON stream multiplexing
**Confidence:** HIGH

## Summary

Phase 144 adds the dispatcher engine that spawns parallel `claude --print` subprocesses in dedicated git worktrees, tracks them in a crash-recoverable registry, enforces concurrency limits, and multiplexes their NDJSON event streams into a single aggregated endpoint. Phase 143 has already shipped all the worktree lifecycle primitives (`createWorktree`, `mergeSession`, `removeWorktree`, `detectOrphans`, `resetAllSessions`, `acquireLock`). Phase 144 builds the runtime orchestration layer on top of that foundation — no git primitives need to be reinvented.

The most important pre-flight finding: **`CLAUDECODE=1` is inherited by child processes from the parent claude session, and claude refuses to launch inside another claude session**. The fix is to delete `CLAUDECODE` from the subprocess env before spawning. This was live-verified during research. Similarly, `stdio: ['ignore', 'pipe', 'pipe']` (not `['pipe', 'pipe', 'pipe']`) must be used — piped stdin causes hangs. Both issues were verified against the actual `claude` binary at version 2.1.84.

The stream-json event sequence for a completed `claude --print --output-format stream-json --verbose` run is: `system/hook_started` (×N), `system/hook_response` (×N), `system/init`, `assistant`, (optional `rate_limit_event`), `result/success` (exit 0) or `result/error` (exit 1). The final `result` event with `is_error: false` is the canonical completion signal. The process exit code mirrors `is_error`: 0 for success, 1 for error.

**Primary recommendation:** Implement `packages/dispatcher/lib/spawn.cjs` (subprocess launch), `packages/dispatcher/lib/registry.cjs` (in-memory Map + JSON file crash recovery), `packages/dispatcher/lib/queue.cjs` (concurrency limiter, hand-rolled, zero dependencies), and `packages/dispatcher/lib/aggregator.cjs` (NDJSON multiplexer). Wire the `--parallel` flag in `gsd-tools.cjs` as a pure opt-in branch with zero changes to the non-parallel code path.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSP-01 | Dispatcher spawns `claude` CLI subprocesses in worktrees with session-scoped env vars | Verified: `spawn('claude', [...], { cwd: worktreePath, env: {…, CLAUDECODE: undefined, PDE_SESSION_ID: id}, stdio: ['ignore','pipe','pipe'] })` works |
| DSP-02 | Dispatcher tracks active sessions in registry (Map + JSON file for crash recovery) | Pattern: in-memory Map as source of truth; atomic write-rename to `.planning/dispatcher.pids`; rebuild Map from JSON on restart |
| DSP-03 | Dispatcher detects session completion/failure via exit codes | Verified: exit 0 = success, exit 1 = failure; also detectable from `type: "result", is_error: true/false` in stream-json output |
| DSP-04 | `--parallel` flag on execute-phase enables dispatcher (opt-in, zero change without flag) | Architecture: parse `--parallel` in execute-phase init; route to dispatcher.cjs only when flag present |
| DSP-05 | `--parallel` flag on autonomous enables phase-level + plan-level parallelism | Architecture: same flag, autonomous workflow spawns one session per eligible phase (DAG analysis deferred to Phase 145) |
| DSP-06 | Dispatcher enforces concurrency limit (configurable, default 3) | Pattern: hand-rolled queue with slot counter; reads `dispatch.max_local_sessions` from config.json |
| DSP-07 | Dispatcher never assigns same phase to two concurrent sessions | Pattern: Set of active phase numbers; check before enqueue; fail fast with clear error message |
| DSP-08 | One relay daemon per session streams events to dashboard | Pattern: existing TailCursor in relay.cjs polls per-session NDJSON file; aggregator fans all into single HTTP endpoint |
| DSP-09 | Failed sessions preserve worktree intact for debugging | Pattern: on non-zero exit code, skip `removeWorktree` + `deleteBranch`; write FAILED.json to phase dir; mark session `failed` in registry |
</phase_requirements>

## Standard Stack

### Core (all zero-dependency built-ins)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:child_process` | built-in (Node 20.20.0) | `spawn()` for claude subprocess launch | Already used throughout project; async event-based stdio |
| `node:readline` | built-in | Line-by-line NDJSON parsing from child stdout | Clean line event API; handles partial-line buffering automatically |
| `node:fs` | built-in | Atomic JSON registry write (temp+rename), NDJSON append | Already used in all dispatcher modules |
| `node:path`, `node:os` | built-in | Path construction, temp dir | Already used |
| `node:crypto` | built-in (randomUUID) | Session ID generation | Already used in event-bus.cjs |

### Already Installed in Project

| Library | Version | Purpose | Location |
|---------|---------|---------|----------|
| `vitest` | 4.1.1 | Test runner for dispatcher unit tests | root `node_modules/.bin/vitest` |

### Packages to ADD to `packages/dispatcher/`

Phase 144 adds zero new npm packages. The concurrency queue is hand-rolled in ~60 lines of CJS. The reason to avoid `p-queue` (9.1.0 ESM-only) or `p-queue-cjs` (7.3.4, 2 years stale, low maintenance) is that (a) the project constraint is zero-npm-dependency for the dispatcher in this phase, and (b) the concurrency problem is simple enough to hand-roll correctly.

**Version verification:**
```bash
npm view p-queue version   # → 9.1.0 (ESM-only, incompatible with CJS)
npm view p-queue-cjs version  # → 7.3.4 (stale, unmaintained)
```
Neither is appropriate. Hand-roll instead (see Code Examples section).

### Alternatives Considered

| Instead of | Could Use | Why We Don't |
|------------|-----------|--------------|
| Hand-rolled queue | p-queue-cjs 7.3.4 | Stale package, unmaintained, adds a dependency for ~60 lines of logic |
| `spawn` with `['ignore', 'pipe', 'pipe']` | `spawn` with `['pipe', 'pipe', 'pipe']` | Piped stdin causes claude CLI to hang (verified bug, Issue #771) |
| Atomic temp+rename for registry | `fs.writeFileSync` directly | Direct write is not crash-safe; partial write corrupts registry |
| `delete env.CLAUDECODE` | `env.CLAUDECODE = ''` | Both work; delete is cleaner — no empty string key in the env |
| `detached: false` (default) | `detached: true` with negative PID kill | Detached is unnecessary complexity; SIGTERM to child.pid is sufficient for claude's clean shutdown |

**Installation:** No new packages. All modules are new `.cjs` files in `packages/dispatcher/lib/`.

## Architecture Patterns

### Recommended Project Structure

```
packages/dispatcher/
├── index.cjs                    # existing: re-exports all modules
├── package.json                 # existing
└── lib/
    ├── worktree.cjs             # existing (Phase 143)
    ├── merge.cjs                # existing (Phase 143)
    ├── orphan.cjs               # existing (Phase 143)
    ├── lock.cjs                 # existing (Phase 143)
    ├── spawn.cjs                # NEW: subprocess launch + stdio wiring
    ├── registry.cjs             # NEW: in-memory Map + JSON file persistence
    ├── queue.cjs                # NEW: concurrency limiter (hand-rolled)
    └── aggregator.cjs           # NEW: NDJSON multiplexer / relay aggregator
```

And in `bin/`:
```
bin/
├── pde-tools.cjs                # existing: add --parallel flag parsing in execute-phase
└── lib/
    └── event-bus.cjs            # existing: used by per-session event relay
```

And in `tests/dispatcher/`:
```
tests/dispatcher/
├── worktree.test.cjs            # existing (43 tests, all passing)
├── merge.test.cjs               # existing
├── orphan.test.cjs              # existing
├── artifacts.test.cjs           # existing
├── spawn.test.cjs               # NEW
├── registry.test.cjs            # NEW
├── queue.test.cjs               # NEW
└── aggregator.test.cjs          # NEW
```

### Pattern 1: subprocess spawn

**What:** Launch a `claude --print` process in a worktree directory with session-scoped env.
**When to use:** Every time `--parallel` triggers a new parallel session.

```javascript
// Source: live-verified 2026-03-26 against claude 2.1.84
// packages/dispatcher/lib/spawn.cjs
'use strict';
const { spawn } = require('node:child_process');
const readline = require('node:readline');

/**
 * Spawn a claude --print subprocess in the given worktree.
 *
 * CRITICAL ENV RULES:
 * 1. Delete CLAUDECODE — inherited value is "1", which causes "cannot be launched
 *    inside another Claude Code session" error. Live-verified fix.
 * 2. Set PDE_SESSION_ID — executor reads this to activate session-scoped writes.
 * 3. Set ANTHROPIC_API_KEY — inherited from parent env (already present).
 *
 * CRITICAL STDIO RULE:
 * stdio[0] (stdin) MUST be 'ignore', NOT 'pipe'.
 * 'pipe' causes claude to hang waiting for input (verified bug, Issue #6295).
 *
 * @param {object} opts
 * @param {string} opts.worktreePath  - Absolute path to worktree cwd
 * @param {string} opts.sessionId     - PDE session ID (e.g. "p144-abc123")
 * @param {string} opts.prompt        - The prompt string to pass to claude
 * @param {string[]} [opts.extraArgs] - Additional claude flags (e.g. --plugin-dir)
 * @param {function} opts.onLine      - Callback(sessionId, parsedEvent) for each NDJSON line
 * @param {function} opts.onExit      - Callback(sessionId, exitCode) on process exit
 * @returns {{ pid: number, kill: function }}
 */
function spawnSession(opts) {
  const { worktreePath, sessionId, phase, plan, pluginDir, extraArgs = [], onLine, onExit } = opts;
  const prompt = `Execute phase ${phase}, plan ${plan}. Run /gsd:execute-plan ${phase} ${plan}.`;

  const env = { ...process.env };
  delete env.CLAUDECODE;   // must not be "1" — blocks nested launch
  env.PDE_SESSION_ID = sessionId;
  env.PDE_PHASE = String(phase);
  env.PDE_PLAN = String(plan);
  env.PDE_SESSION_START = String(Date.now());

  const args = [
    '--print',
    '--bare',                // fast startup: skip hooks, LSP, plugin sync, auto-memory
    '--output-format', 'stream-json',
    '--verbose',             // REQUIRED with stream-json
    '--dangerously-skip-permissions',
    '--plugin-dir', pluginDir,  // load PDE plugin (sets CLAUDE_PLUGIN_ROOT)
    '--append-system-prompt', 'You are a PDE executor agent running in a worktree. Operate in autonomous mode. Auto-approve all checkpoints. Do not ask questions.',
    ...extraArgs,
    prompt,                  // positional arg (last) — NOT a --prompt flag
  ];

  const child = spawn('claude', args, {
    cwd: worktreePath,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],  // stdin MUST be ignore, not pipe
  });

  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on('line', line => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      onLine(sessionId, event);
    } catch (_) {
      // Non-JSON lines (rare) — skip silently
    }
  });

  child.stderr.on('data', data => {
    // Stderr from claude goes to PDE log; not surfaced to aggregator
    // This catches auth errors, "cannot be launched inside session" errors, etc.
    const msg = data.toString().trim();
    if (msg) onLine(sessionId, { type: 'system', subtype: 'stderr', message: msg });
  });

  child.on('close', exitCode => {
    rl.close();
    onExit(sessionId, exitCode ?? 1);
  });

  return {
    pid: child.pid,
    kill: (signal = 'SIGTERM') => child.kill(signal),
  };
}

module.exports = { spawnSession };
```

### Pattern 2: Crash-recoverable registry

**What:** In-memory Map as source of truth; atomic JSON flush to `.planning/dispatcher.pids` on every mutation. On restart, read JSON file and rebuild Map; probe each PID with `process.kill(pid, 0)` to filter stale entries.

```javascript
// packages/dispatcher/lib/registry.cjs — skeleton
'use strict';
const fs = require('node:fs');
const path = require('node:path');

/**
 * SessionRegistry — in-memory Map + JSON file for crash recovery.
 *
 * .planning/dispatcher.pids format:
 * {
 *   "sessions": {
 *     "<sessionId>": {
 *       "pid": 12345,
 *       "phase": 144,
 *       "plan": 1,
 *       "worktreePath": "/abs/.sessions/p144-abc",
 *       "branch": "pde/session/p144-abc",
 *       "status": "running",   // "running" | "failed" | "complete"
 *       "startedAt": "2026-03-26T..."
 *     }
 *   }
 * }
 *
 * Atomic write: write to .planning/dispatcher.pids.tmp, then fs.renameSync.
 * Crash-safe: rename is atomic on macOS/Linux (POSIX guarantee).
 */

class SessionRegistry {
  constructor(projectRoot) {
    this._root = projectRoot;
    this._pidFile = path.join(projectRoot, '.planning', 'dispatcher.pids');
    this._tmpFile = this._pidFile + '.tmp';
    this._map = new Map();
  }

  /** Load from disk; prune stale PIDs. Call once at dispatcher startup. */
  loadFromDisk() {
    try {
      const raw = JSON.parse(fs.readFileSync(this._pidFile, 'utf8'));
      for (const [id, entry] of Object.entries(raw.sessions || {})) {
        if (entry.status === 'running' && !_isPidAlive(entry.pid)) {
          entry.status = 'orphaned';
        }
        this._map.set(id, entry);
      }
    } catch (_) {
      // File doesn't exist yet — that's fine
    }
    return this;
  }

  /** Register a new session. Flushes to disk immediately. */
  register(sessionId, entry) {
    this._map.set(sessionId, { ...entry, status: 'running', startedAt: new Date().toISOString() });
    this._flush();
  }

  /** Update session status. Flushes to disk. */
  update(sessionId, updates) {
    const existing = this._map.get(sessionId);
    if (!existing) return;
    this._map.set(sessionId, { ...existing, ...updates });
    this._flush();
  }

  /** Remove completed session from registry. Flushes to disk. */
  remove(sessionId) {
    this._map.delete(sessionId);
    this._flush();
  }

  get(sessionId) { return this._map.get(sessionId); }

  getAll() { return new Map(this._map); }

  hasPhase(phaseNumber) {
    for (const entry of this._map.values()) {
      if (entry.phase === phaseNumber && entry.status === 'running') return true;
    }
    return false;
  }

  activeCount() {
    let count = 0;
    for (const entry of this._map.values()) {
      if (entry.status === 'running') count++;
    }
    return count;
  }

  /** Atomic write to disk (temp + rename). */
  _flush() {
    const data = JSON.stringify({ sessions: Object.fromEntries(this._map) }, null, 2);
    fs.writeFileSync(this._tmpFile, data, 'utf8');
    fs.renameSync(this._tmpFile, this._pidFile);   // atomic on POSIX
  }
}

function _isPidAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== 'ESRCH'; }
}

module.exports = { SessionRegistry };
```

### Pattern 3: Hand-rolled concurrency queue (zero dependencies)

**What:** A slot-based queue that limits concurrent subprocess count. When `activeCount < maxConcurrent`, runs the task immediately. Otherwise queues it and drains when a slot opens.

```javascript
// packages/dispatcher/lib/queue.cjs
'use strict';

/**
 * ConcurrencyQueue — zero-dependency promise queue with configurable slot limit.
 *
 * Usage:
 *   const q = new ConcurrencyQueue(3);
 *   q.add(() => runSession(sessionA));
 *   q.add(() => runSession(sessionB));
 *
 * The factory function passed to add() must return a Promise.
 * When the Promise resolves/rejects, a slot opens and the next pending task runs.
 */
class ConcurrencyQueue {
  constructor(maxConcurrent = 3) {
    this._max = maxConcurrent;
    this._active = 0;
    this._pending = [];
  }

  /**
   * Enqueue a task factory. Runs immediately if slots available, else queues.
   * @param {function} factory - () => Promise
   * @returns {Promise} Resolves/rejects when the task completes
   */
  add(factory) {
    return new Promise((resolve, reject) => {
      const run = () => {
        this._active++;
        Promise.resolve().then(factory).then(resolve, reject).finally(() => {
          this._active--;
          this._drain();
        });
      };
      if (this._active < this._max) {
        run();
      } else {
        this._pending.push(run);
      }
    });
  }

  _drain() {
    if (this._pending.length > 0 && this._active < this._max) {
      const next = this._pending.shift();
      next();
    }
  }

  get activeCount() { return this._active; }
  get pendingCount() { return this._pending.length; }

  /** Update the concurrency limit at runtime (takes effect on next drain). */
  setMax(n) { this._max = n; this._drain(); }
}

module.exports = { ConcurrencyQueue };
```

### Pattern 4: NDJSON aggregator / relay daemon

**What:** One relay cursor per active session (using the existing `TailCursor` from `relay.cjs`), all feeding into a single in-process EventEmitter that the aggregator endpoint subscribes to.

```javascript
// packages/dispatcher/lib/aggregator.cjs
'use strict';
const { EventEmitter } = require('node:events');
const path = require('node:path');
const os = require('node:os');
// TailCursor already implemented in Phase 143 — reuse directly
const { TailCursor } = require('../../bin/lib/relay.cjs');

/**
 * Aggregator — fans multiple session NDJSON streams into one EventEmitter.
 *
 * Each active session writes to /tmp/pde-session-{sessionId}.ndjson.
 * One TailCursor per session polls that file every 500ms.
 * All lines are re-emitted as 'event' on a shared EventEmitter with sessionId tagged.
 *
 * The dashboard SSE endpoint subscribes to this EventEmitter.
 * The tmux aggregation (Phase 148) also subscribes to this EventEmitter.
 *
 * Events emitted:
 *   aggregator.on('event', (sessionId, parsedLine) => { ... })
 */
class Aggregator extends EventEmitter {
  constructor() {
    super();
    this._cursors = new Map();  // sessionId → TailCursor
  }

  /** Start tailing a session's NDJSON file. Idempotent. */
  watch(sessionId) {
    if (this._cursors.has(sessionId)) return;
    const filePath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    const cursor = new TailCursor(filePath, (line) => {
      try {
        const parsed = JSON.parse(line);
        this.emit('event', sessionId, parsed);
      } catch (_) {}
    });
    cursor.start(500);
    this._cursors.set(sessionId, cursor);
  }

  /** Stop tailing a session. Call after session completes or fails. */
  unwatch(sessionId) {
    const cursor = this._cursors.get(sessionId);
    if (cursor) {
      cursor.stop();
      this._cursors.delete(sessionId);
    }
  }

  /** Stop all cursors (shutdown). */
  stopAll() {
    for (const cursor of this._cursors.values()) cursor.stop();
    this._cursors.clear();
  }
}

module.exports = { Aggregator };
```

### Pattern 5: --parallel flag wiring (zero-change to non-parallel path)

**What:** Parse `--parallel` flag early in execute-phase and autonomous init. Route to dispatcher only when present. When absent, behavior is 100% identical to pre-v0.18.

```javascript
// In pde-tools.cjs, execute-phase init path (pseudocode):
const isParallel = process.argv.includes('--parallel');
if (isParallel) {
  // Route to packages/dispatcher — lazy require for graceful degradation
  const { DispatchCoordinator } = require('../packages/dispatcher/lib/coordinator.cjs');
  // ...
} else {
  // Existing code path — ZERO changes
}
```

### Pattern 6: dispatcher.cjs coordinator (new module)

**What:** The top-level coordinator that ties together `queue.cjs`, `registry.cjs`, `spawn.cjs`, `worktree.cjs`, `merge.cjs`, and `aggregator.cjs` into a single orchestrated lifecycle.

Lifecycle per session:
1. Check `registry.hasPhase(phase)` — reject if duplicate
2. `queue.add(() => runSession(...))`
3. Inside `runSession`: `createWorktree` → `spawnSession` → on-exit:
   - exit 0: `mergeSession` → `recalculateFromArtifacts` → `removeWorktree` → `registry.remove`
   - exit non-0: write `FAILED.json` → `registry.update(status: 'failed')` → preserve worktree

### Anti-Patterns to Avoid

- **Piped stdin:** Never use `stdio: ['pipe', 'pipe', 'pipe']` — hangs claude indefinitely (verified)
- **Inheriting CLAUDECODE:** Never let `CLAUDECODE=1` reach the child env — causes immediate rejection error
- **Direct fs.writeFile for registry:** Partial write corrupts JSON on crash; always use temp+rename atomic pattern
- **Calling `removeWorktree` on failure:** Preserving the failed worktree is DSP-09 — skip cleanup on non-zero exit
- **Calling `worktree.cjs` from the child claude session:** The child session must never touch its own worktree lifecycle; only the parent dispatcher manages that
- **Sharing the `SessionRegistry` instance across processes:** The registry is in-process only; the JSON file is the crash-recovery artifact

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line-by-line NDJSON parsing from stdio | Custom buffer/split logic | `readline.createInterface({ input: child.stdout })` | Built-in, handles partial lines, EOF, encoding correctly |
| Crash-safe atomic file write | `fs.writeFileSync` directly | `writeFileSync(tmp) + renameSync(tmp, target)` | POSIX rename is atomic; direct write can corrupt on crash |
| Process liveness check | `ps`, `procfs`, external commands | `process.kill(pid, 0)` — ESRCH means dead, EPERM means alive | Already proven in Phase 143's `lock.cjs` and `orphan.cjs` |
| Worktree create/remove/list | New git commands | `createWorktree`, `removeWorktree`, `listSessionWorktrees` from `packages/dispatcher/lib/worktree.cjs` | Already implemented and tested in Phase 143 |
| Merge-back + recalculation | New git merge logic | `mergeSession`, `recalculateFromArtifacts` from `packages/dispatcher/lib/merge.cjs` | Already implemented and tested in Phase 143 |
| Orphan detection on startup | Worktree enumeration logic | `detectOrphans` from `packages/dispatcher/lib/orphan.cjs` | Already implemented and tested in Phase 143 |
| NDJSON file tailing | Poll + read + split | `TailCursor` from `bin/lib/relay.cjs` | Already implemented in Phase 134 with truncation/rotation handling |
| Dispatcher lock | Custom file locking | `acquireLock`, `releaseLock` from `packages/dispatcher/lib/lock.cjs` | Already implemented and tested in Phase 143 |

**Key insight:** Nearly all the hard primitives are already built. Phase 144 assembles them into a runtime coordinator. The only genuinely new code is `spawn.cjs`, `registry.cjs`, `queue.cjs`, `aggregator.cjs`, and the coordinator wiring.

## Common Pitfalls

### Pitfall 1: CLAUDECODE=1 inheritance blocks subprocess launch
**What goes wrong:** The dispatcher runs inside a live claude session. `CLAUDECODE=1` is in the env. Spawning `claude --print` inherits this and immediately exits with: "Error: Claude Code cannot be launched inside another Claude Code session."
**Why it happens:** Claude CLI detects `CLAUDECODE` env var and refuses nested launch to prevent resource contention.
**How to avoid:** `delete env.CLAUDECODE` before building the subprocess env object. **Do not** set it to empty string — deletion is cleaner. This was live-verified.
**Warning signs:** Subprocess exits with code 1 immediately (< 1 second), stderr contains "cannot be launched inside another Claude Code session"

### Pitfall 2: Piped stdin hangs subprocess
**What goes wrong:** `spawn('claude', [...], { stdio: ['pipe', 'pipe', 'pipe'] })` never produces output; process hangs until killed.
**Why it happens:** Claude CLI reads from stdin (for interactive input) and never detects EOF when stdin is a pipe with no writer.
**How to avoid:** Always use `stdio: ['ignore', 'pipe', 'pipe']`. The `'ignore'` connects stdin to `/dev/null`, which immediately signals EOF to claude, allowing it to proceed in `--print` mode.
**Warning signs:** Subprocess takes > 30 seconds to produce any output; no NDJSON lines arrive.

### Pitfall 3: Registry corruption on crash during write
**What goes wrong:** `fs.writeFileSync(pidFile, data)` crashes midway → partial JSON in `.planning/dispatcher.pids` → subsequent `loadFromDisk()` throws parse error → dispatcher can't start.
**Why it happens:** `writeFileSync` is not atomic; crash between open and close leaves partial data.
**How to avoid:** Write to `.planning/dispatcher.pids.tmp`, then `fs.renameSync(tmp, target)`. `rename` is atomic on macOS/Linux (POSIX).
**Warning signs:** Dispatcher fails to start with "JSON parse error on dispatcher.pids" after a crash.

### Pitfall 4: Duplicate phase assignment
**What goes wrong:** Two concurrent sessions both assigned phase 144. Both create worktrees, both execute, both attempt to merge → git merge conflict on phase artifacts.
**Why it happens:** Race condition if `hasPhase` check and `register` call are not atomic.
**How to avoid:** In the coordinator, hold the dispatcher lock (`acquireLock`) for the duration of the `hasPhase` check + `register` call. Release lock after registration. This ensures no two concurrent `add()` calls can both pass the duplicate check.
**Warning signs:** Two entries in registry with same `phase` number; merge conflict on COMPLETE.json

### Pitfall 5: Orphaned worktrees from failed merge after successful completion
**What goes wrong:** Session exits 0, `mergeSession` is called, but merge fails (`ok: false, needsHuman: true`). Worktree is still removed. The work is lost.
**Why it happens:** Merge failure path removes worktree before user can inspect.
**How to avoid:** On `mergeSession` returning `{ ok: false, needsHuman: true }`, set session status to `merge_failed` (not `failed`), preserve worktree, emit event to dashboard with conflict file list. User can then manually resolve.
**Warning signs:** `mergeSession` returns `needsHuman: true`; worktree removed anyway.

### Pitfall 6: `stream-json` requires `--verbose`
**What goes wrong:** `claude --print --output-format stream-json` exits with code 1 and stderr: "When using --print, --output-format=stream-json requires --verbose"
**Why it happens:** Undocumented CLI requirement; `--verbose` is mandatory for `stream-json` format.
**How to avoid:** Always include `--verbose` when using `--output-format stream-json`. Live-verified.
**Warning signs:** Immediate exit code 1, stderr contains the specific error message.

### Pitfall 7: Process group leak from claude subprocesses
**What goes wrong:** Claude spawns its own child processes (MCP servers, hooks). When the dispatcher kills the claude process, those grandchildren become orphans.
**Why it happens:** `SIGTERM` to `child.pid` kills claude but not its process group.
**How to avoid:** Use `process.kill(-child.pid, 'SIGTERM')` (negative PID = process group leader) — BUT only if spawned with `detached: true`. For Phase 144, simpler approach: kill child directly and let Phase 143's orphan detection handle stale worktrees on next startup. Do NOT use `detached: true` in Phase 144 (adds complexity without clean benefit for this phase scope).
**Warning signs:** After `child.kill()`, `ps aux | grep claude` still shows grandchildren.

### Pitfall 8: Missing `--plugin-dir` in subprocess causes skills not to load
**What goes wrong:** The child claude session can't find the PDE plugin (execute-phase workflow, etc.) because it's spawned in a worktree directory without the project's plugin context.
**Why it happens:** `--print` mode respects `--plugin-dir` for skills loading; worktrees don't auto-inherit plugin config.
**How to avoid:** Pass `--plugin-dir <abs-path-to-pde-plugin>` to the spawn args so the child session loads the PDE skills. The plugin dir is the parent project root's plugin directory. This is required for the child to run `/gsd:execute-phase`.
**Warning signs:** Child session can't run `/gsd:execute-phase` inside the worktree.

## Code Examples

### Verified: spawn claude from Node.js inside a running claude session

```javascript
// Live-verified 2026-03-26 against claude 2.1.84
// Both spawn patterns verified to work:

// Pattern A: json output format (completion detection via type:"result")
const { spawn } = require('node:child_process');
const env = { ...process.env };
delete env.CLAUDECODE;  // critical — prevents nested session error
env.PDE_SESSION_ID = sessionId;

const child = spawn('claude', [
  '--print',
  '--output-format', 'json',  // or 'stream-json --verbose'
  '--dangerously-skip-permissions',
  prompt
], {
  cwd: worktreePath,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],  // stdin must be 'ignore'
});

// Pattern B: stream-json (requires --verbose)
const child2 = spawn('claude', [
  '--print',
  '--output-format', 'stream-json',
  '--verbose',            // REQUIRED with stream-json
  '--dangerously-skip-permissions',
  prompt
], { cwd: worktreePath, env, stdio: ['ignore', 'pipe', 'pipe'] });
```

### Verified: stream-json event sequence for a completed session

```
// Actual events observed (2026-03-26, claude 2.1.84):
{ type: "system", subtype: "hook_started" }   // N times (one per hook)
{ type: "system", subtype: "hook_response" }  // N times
{ type: "system", subtype: "init" }           // session initialized
{ type: "assistant" }                          // LLM response
{ type: "rate_limit_event" }                  // optional, when rate limited
{ type: "result", subtype: "success", is_error: false }  // DONE — exit 0
// OR:
{ type: "result", subtype: "error", is_error: true }     // FAILED — exit 1
```

### Verified: atomic registry flush (crash-safe)

```javascript
// Atomic write — crash between writeFileSync and renameSync leaves .tmp
// On next startup, .tmp is stale and ignored; target is intact
function _flush(pidFile, tmpFile, mapData) {
  const data = JSON.stringify({ sessions: Object.fromEntries(mapData) }, null, 2);
  fs.writeFileSync(tmpFile, data, 'utf8');  // write to temp
  fs.renameSync(tmpFile, pidFile);           // atomic rename (POSIX)
}
```

### Verified: hand-rolled concurrency queue test pattern

```javascript
// Verified against vitest 4.1.1 in CJS format
describe('ConcurrencyQueue', () => {
  it('limits concurrent execution to maxConcurrent', async () => {
    const q = new ConcurrencyQueue(2);
    const running = [];
    let maxRunning = 0;
    const task = () => new Promise(resolve => {
      running.push(1);
      maxRunning = Math.max(maxRunning, running.length);
      setTimeout(() => { running.pop(); resolve(); }, 50);
    });
    await Promise.all([q.add(task), q.add(task), q.add(task), q.add(task)]);
    expect(maxRunning).toBe(2);
  });
});
```

## Runtime State Inventory

> This phase creates new runtime state. Explicitly audited below.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `.planning/dispatcher.pids` — new file created by Phase 144 | Code creates it on first registration; no migration needed |
| Live service config | None — dispatcher is a spawned process, not a persistent service | None |
| OS-registered state | None — no systemd, launchd, or Task Scheduler entries | None |
| Secrets/env vars | `ANTHROPIC_API_KEY` — inherited from parent env (not renamed) | None — inherited transparently |
| Build artifacts | None — all new CJS modules; no compiled output | None |

**Ephemeral files created by Phase 144:**
- `.planning/dispatcher.pids` — registry JSON, survives dispatcher restart
- `.planning/dispatcher.pids.tmp` — temp file during atomic write, may appear during crash
- `/tmp/pde-session-{sessionId}.ndjson` — per-session event log (already created by Phase 143's event-bus.cjs pattern)

**Phase 143 runtime state (already exists, unaffected):**
- `.planning/dispatcher.lock` — dispatcher lock file; Phase 144 continues using same lock
- `.sessions/<sessionId>/` — worktree directories; Phase 144 creates and manages these

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--output-format stream-json` without `--verbose` | Requires `--verbose` flag | Current as of claude 2.1.84 (verified) | Must include `--verbose` in spawn args |
| `stdio: ['pipe', 'pipe', 'pipe']` for claude spawn | `stdio: ['ignore', 'pipe', 'pipe']` | Active bug at time of research (Issue #6295, #771) | Piped stdin hangs; must use ignore |
| Nested session blocked by default | `delete env.CLAUDECODE` to unset | Active behavior as of claude 2.1.84 | Must explicitly remove from subprocess env |
| Worktrees in `.claude/worktrees/` (Claude's own) | PDE sessions in `.sessions/<id>/` with `pde/session/` branches | Phase 143 decision D-01 | Keeps PDE sessions separate from Claude's internal worktree system |

**Deprecated/outdated:**
- `claude --worktree` flag: Creates worktrees in `.claude/worktrees/` under Claude's own management. PDE does NOT use this — PDE manages worktrees directly via `packages/dispatcher/lib/worktree.cjs` to maintain full control.
- `p-queue` ESM: The sindresorhus ESM-only `p-queue` 9.1.0 is incompatible with CJS modules in `packages/dispatcher/`. Hand-roll instead.

## Resolved Questions (researched 2026-03-26)

### RQ-1: Plugin directory for child claude sessions — RESOLVED

**Finding:** `--plugin-dir` works with `--print` mode (confirmed from CLI help and docs). `--bare` mode skips auto-discovery but explicitly preserves skills when `--plugin-dir` is passed — CLI help states: "Skills still resolve via /skill-name."

**Plugin path resolution:** Read `~/.claude/plugins/installed_plugins.json`, extract `installPath` for the `platform-development-engine@pde` entry. Current path: `/Users/greyaltaer/.claude/plugins/cache/pde/platform-development-engine/1.0.0`. The `--plugin-dir` flag takes this root directory (the one containing `.claude-plugin/`). `CLAUDE_PLUGIN_ROOT` is set automatically when a plugin is loaded via `--plugin-dir`.

**`--system-prompt` alone is NOT viable** — the execute-phase workflow has hard dependencies on `CLAUDE_PLUGIN_ROOT` for `pde-tools.cjs` and sub-workflow resolution. Plugin loading via `--plugin-dir` is required.

**Security flags available:** `--allowedTools` (auto-approve), `--disallowedTools` (remove from context), `--tools` (restrict built-in set).

**Decision:** Use `--bare --plugin-dir <resolved-path>` for child sessions. Fast startup + full skill access.

### RQ-2: `--parallel` flag scope in autonomous — RESOLVED

**Finding:** Phase 144 should implement **plan-level parallelism only**. Phase-level parallelism deferred to Phase 145.

**Rationale:**
1. The design spec explicitly places DAG analysis in Phase 145 (SDK-02, SDK-03)
2. ROADMAP.md "Depends on" captures ordering but NOT file-overlap — insufficient for safe phase parallelism
3. Wave-based plan parallelization is already established (plan frontmatter has `wave`, `depends_on`, `files_modified`)
4. Phase 144 builds the dispatch infrastructure; Phase 145 adds intelligence

**Concrete behavior:**
- `execute-phase N --parallel` → Plans in same wave spawn as CLI sessions in worktrees (upgrade from Task() subagents). Waves still sequential.
- `autonomous --parallel` → Phases sequential (same as today). Within each phase, plans use the parallel dispatcher.
- Without `--parallel` → Zero behavioral change (DSP-04).

**DSP-05 adjustment:** Narrow to "plan-level parallelism within phases" for Phase 144. Add new Phase 145 requirement for phase-level parallelism across phases.

### RQ-3: What prompt to pass to spawned claude sessions — RESOLVED

**Finding:** The prompt is a **positional argument** (last arg). There is no `--prompt` flag. Slash commands are interactive-only and CANNOT be the initial `-p` prompt. However, the agent CAN invoke skills during execution if loaded via `--plugin-dir`.

**Actual env vars (corrected from research question):**
- `PDE_SESSION_ID` — guards session-scoped writes
- `PDE_PHASE` — phase number (NOT `PDE_PHASE_NUMBER`)
- `PDE_PLAN` — plan number (NOT `PDE_PLAN_NUMBER`)
- `PDE_SESSION_START` — epoch timestamp for duration calculation

**Recommended spawn pattern:**
```javascript
const args = [
  '--print',
  '--bare',
  '--output-format', 'stream-json',
  '--verbose',
  '--dangerously-skip-permissions',
  '--plugin-dir', resolvedPluginPath,
  '--append-system-prompt', 'You are a PDE executor agent running in a worktree. Operate in autonomous mode. Auto-approve all checkpoints. Do not ask questions.',
  `Execute phase ${phase}, plan ${plan}. Run /gsd:execute-plan ${phase} ${plan}.`,
];

const env = { ...process.env };
delete env.CLAUDECODE;
env.PDE_SESSION_ID = sessionId;
env.PDE_PHASE = String(phase);
env.PDE_PLAN = String(plan);
env.PDE_SESSION_START = String(Date.now());
```

**Max prompt length:** OS ARG_MAX (~1MB on macOS). PDE prompts are <1KB. Use `--append-system-prompt-file` for long context if needed.

## Resolved Blockers (researched 2026-03-26)

### BLK-1: Worktree skills-loading fix — RESOLVED (not applicable)

**Finding:** The March 2026 worktree skills-loading bug (GitHub #27985, #28041) affected `claude --worktree` which loads skills from the main working tree instead of the worktree. **PDE does NOT use `claude --worktree`** — PDE manages worktrees directly via `packages/dispatcher/lib/worktree.cjs` and spawns `claude --print` with `cwd` set to the worktree path + `--plugin-dir` for explicit plugin loading. The bug is irrelevant to PDE's architecture.

### BLK-2: claude --remote managed backend stability — RESOLVED (unstable, defer)

**Finding:** `claude --remote` (branded "Claude Code on the web" / "Dispatch") exists and is recognized in CLI v2.1.84, but is in **research preview** with active blocking bugs:
- GitHub #38066: 403 "Request not allowed" on Pro plan
- GitHub #38049: Sessions stuck on "Brewing..." indefinitely
- GitHub #37713: No CLAUDE.md propagation in dispatch sessions
- GitHub #38029: Abnormal token consumption on session resume

**Architectural mismatch:** `--remote` creates web sessions — no NDJSON streaming, no programmatic control, GitHub-only repos. Incompatible with PDE's aggregator pattern.

**Decision:** Phase 146 proceeds with **SSH-primary architecture**. `claude --remote` integration deferred to post-v0.18 when it exits preview and supports programmatic NDJSON streaming. Success criteria 146-SC2 should be revised to: "SSH is the primary remote backend; `claude --remote` is tracked for future integration."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `claude` CLI | DSP-01 (subprocess spawn) | Yes | 2.1.84 | None — blocking |
| `git` | Worktree lifecycle (Phase 143) | Yes | 2.48.1 | None — blocking |
| Node.js | All dispatcher modules | Yes | 20.20.0 | None — blocking |
| `vitest` | Test suite | Yes | 4.1.1 (root node_modules) | None |
| `ANTHROPIC_API_KEY` | claude subprocess auth | Yes (inherited from env) | n/a | None — blocking |

**Missing dependencies:** None. All required tools are present.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/dispatcher/ --reporter=verbose` |
| Full suite command | `npx vitest run tests/ --reporter=verbose` |

**Baseline:** 43 tests across 4 files, all passing as of 2026-03-26.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSP-01 | spawn claude in worktree with correct env (CLAUDECODE deleted, PDE_SESSION_ID set) | unit | `npx vitest run tests/dispatcher/spawn.test.cjs` | No — Wave 0 |
| DSP-02 | registry survives crash: write to JSON, reload from JSON, prune dead PIDs | unit | `npx vitest run tests/dispatcher/registry.test.cjs` | No — Wave 0 |
| DSP-03 | exit code 0 → complete, exit code 1 → failed; is_error field detection | unit | `npx vitest run tests/dispatcher/spawn.test.cjs` | No — Wave 0 |
| DSP-04 | `--parallel` flag absent → identical non-parallel behavior | integration | manual | No |
| DSP-05 | `--parallel` on autonomous → plans within phase run in parallel | integration | manual | No |
| DSP-06 | concurrency limit enforced: max 3 simultaneous sessions | unit | `npx vitest run tests/dispatcher/queue.test.cjs` | No — Wave 0 |
| DSP-07 | same phase not assigned twice: registry.hasPhase check before enqueue | unit | `npx vitest run tests/dispatcher/registry.test.cjs` | No — Wave 0 |
| DSP-08 | aggregator fans multiple session NDJSON files into one event stream | unit | `npx vitest run tests/dispatcher/aggregator.test.cjs` | No — Wave 0 |
| DSP-09 | failed session worktree preserved: removeWorktree NOT called on non-zero exit | unit | `npx vitest run tests/dispatcher/spawn.test.cjs` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/ --reporter=verbose`
- **Per wave merge:** `npx vitest run tests/ --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dispatcher/spawn.test.cjs` — covers DSP-01, DSP-03, DSP-09
- [ ] `tests/dispatcher/registry.test.cjs` — covers DSP-02, DSP-07
- [ ] `tests/dispatcher/queue.test.cjs` — covers DSP-06
- [ ] `tests/dispatcher/aggregator.test.cjs` — covers DSP-08

**Note:** spawn.test.cjs should NOT actually spawn live claude processes in tests (too slow, API cost). Tests should mock the spawn call and verify env construction, stdio config, and event handling logic. Registry and queue tests can run with no external dependencies.

## Sources

### Primary (HIGH confidence)

- Live verification — `claude --print` spawn from within claude session with `CLAUDECODE` deleted: verified working 2026-03-26
- Live verification — `stdio: ['ignore', 'pipe', 'pipe']` does not hang, `['pipe', 'pipe', 'pipe']` does: verified 2026-03-26
- Live verification — `stream-json` event sequence: observed directly from `claude 2.1.84` output 2026-03-26
- Phase 143 implementation — `packages/dispatcher/lib/` (worktree.cjs, merge.cjs, orphan.cjs, lock.cjs): all code read directly
- `https://code.claude.com/docs/en/headless` — `--print` mode flags, output formats, bare mode
- `https://code.claude.com/docs/en/cli-reference` — complete flag reference including `--output-format`, `--verbose`, `--dangerously-skip-permissions`
- `https://platform.claude.com/docs/en/agent-sdk/streaming-output` — StreamEvent types, message flow, result event structure
- Node.js 20.20.0 built-in `child_process.spawn`, `readline.createInterface` — verified in live environment

### Secondary (MEDIUM confidence)

- GitHub Issue #771 / #6295 — stdin pipe hang: reported August 2025, workaround `stdio: inherit` for stdin
- GitHub Issue #573 (claude-agent-sdk-python) — `CLAUDECODE=1` inheritance blocks subprocess: workaround is setting `CLAUDECODE: ""`
- `https://code.claude.com/docs/en/common-workflows` — parallel sessions with git worktrees pattern
- npm registry — p-queue 9.1.0 (ESM-only), p-queue-cjs 7.3.4 (stale): confirmed incompatible/stale for CJS use

### Tertiary (LOW confidence, flagged for validation)

- Open Question 1 (plugin-dir for child sessions) — not verified with live test; needs validation in Wave 0
- Open Question 2 (autonomous --parallel scope) — architectural decision not yet locked

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all built-ins, verified live
- Architecture: HIGH — Phase 143 primitives confirmed; spawn pattern live-verified; new modules follow existing patterns
- Pitfalls: HIGH — CLAUDECODE issue, stdio hang, stream-json + verbose all live-verified
- Open questions: LOW — plugin-dir and autonomous scope not yet resolved

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (30 days; claude CLI changes infrequently for programmatic flags)
