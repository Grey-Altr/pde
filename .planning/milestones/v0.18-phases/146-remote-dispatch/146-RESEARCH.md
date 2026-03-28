# Phase 146: Remote Dispatch - Research

**Researched:** 2026-03-26
**Domain:** SSH remote execution, git-based state sync, claude --print dispatch, fallback chain architecture
**Confidence:** HIGH

## Summary

Phase 146 adds SSH-based remote dispatch to the DispatchCoordinator. When configured, autonomous sessions are routed to a remote host: the dispatcher pushes `.planning/` state via git, executes `claude --print` in a remote worktree over SSH, streams events back via NDJSON tail, and merges results on completion. The fallback chain degrades cleanly: managed-backend → SSH → local.

**Critical finding — `claude --remote` is NOT a dispatch mechanism.** The `--remote` flag (added in research preview, ~Feb 2026) creates a new *web session* on claude.ai's managed GitHub-connected infrastructure. It is not a programmatic SSH or API-based dispatch system. It cannot run headlessly, cannot stream NDJSON, requires GitHub integration (not arbitrary repos), and has known active bugs as of March 2026. STATE.md already records the resolution: `[Phase 146]: SSH-primary architecture; claude --remote deferred — research preview, no NDJSON streaming, no CLAUDE.md propagation.`

The managed backend stub (RMT-04) must be implemented as a **detection + fallback stub**: probe whether `claude --remote` would be viable (auth status, repo connectivity), log a warning that it is unavailable, and fall back to SSH. This satisfies RMT-04 without building against an unstable API.

The SSH backend uses `node-ssh` (v13.2.1, published 2025-03-20, wraps `ssh2` v1.17.0) for native Promise/async-await SSH execution. The project's existing pattern (`child_process.execFileSync` for git, `child_process.spawn` for long-running processes) is extended: git operations over SSH go through `node-ssh.execCommand()`, and the NDJSON stream from the remote `claude --print` process is piped back through an SSH channel and written to the local `/tmp/pde-session-{sessionId}.ndjson` file, where the existing Aggregator TailCursor picks it up.

**Primary recommendation:** Create `packages/dispatcher/lib/remote-ssh.cjs` (SSH connection lifecycle + git push/execute/pull), `packages/dispatcher/lib/remote-managed.cjs` (detection + stub + fallback), and `packages/dispatcher/lib/remote-router.cjs` (routes sessions based on type tag + config). Wire into `DispatchCoordinator` via the existing `_deps` injection pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RMT-01 | SSH backend dispatches sessions to configured remote server | SSH execution via `node-ssh` + git push/pull; full pattern in Architecture Patterns |
| RMT-02 | Remote sessions use git push/pull for .planning/ state sync | git push before execution, git pull/merge after; branch-based isolation preserves existing merge.cjs patterns |
| RMT-03 | Remote sessions run relay daemon for real-time event streaming to dashboard | SSH channel pipes NDJSON to local tmp file; existing Aggregator TailCursor requires no changes |
| RMT-04 | Managed backend (claude --remote) dispatches when available, falls back to SSH | `claude --remote` is GitHub-only web sessions, NOT a server dispatch mechanism; implement as detection stub + fallback |
| RMT-05 | Dispatcher routes autonomous work to remote, interactive work stays local | Router reads `autonomous: true/false` tag already set by DispatchCoordinator; tag from PLAN.md frontmatter |
| RMT-06 | Remote dispatch configurable in .planning/config.json (host, repo_path, preferred backend) | Config schema documented; dispatch.remote block in existing config.json |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No CLAUDE.md exists at project root. Constraints are derived from STATE.md decisions and existing code conventions:

- Plugin root `bin/` has zero npm dependencies — all new dependencies go in `packages/dispatcher/package.json`
- All git calls use `execFileSync` with array arguments (no shell interpretation) — same rule applies to remote SSH git commands
- CJS throughout (`packages/dispatcher/` is `"type": "commonjs"`) — no ESM modules in new files
- Dependency injection via `_deps` in constructor — all new modules are injectable for testing
- `pde/session/` branch prefix — remote worktrees use the same prefix
- Session-scoped writes — remote executor inherits same PDE_SESSION_ID environment variable
- `stdin: 'ignore'` for `claude --print` subprocess — same rule applies to remote execution (SSH channel stdin must be closed/ignored)

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node-ssh` | 13.2.1 | SSH connection, execCommand, stream forwarding | Wraps ssh2 with Promise/async-await API; no callback hell; used widely for automated SSH in Node.js scripts |
| `node:child_process` | built-in | Local git operations (push, pull) over standard git CLI | Already used throughout dispatcher; avoids adding libgit2 binding overhead |
| `node:fs` | built-in | NDJSON pipe target, config reading | Already used throughout dispatcher |
| `node:path` | built-in | Path construction for remote repo, local tmp files | Already used throughout dispatcher |
| `node:os` | built-in | tmpdir for NDJSON pipe target | Already used in aggregator.cjs |

### SSH Library Detail

`node-ssh` v13.2.1 (last published 2025-03-20) wraps `ssh2` v1.17.0. Key APIs used:

- `ssh.connect({ host, username, privateKeyPath })` — establishes connection
- `ssh.execCommand('git pull', { cwd })` — returns `{ stdout, stderr, code }`
- `ssh.connection.exec(remoteCmd, { pty: false }, (err, channel) => {...})` — streams stdout/stderr
- `ssh.dispose()` — closes connection cleanly

### Packages to ADD to `packages/dispatcher/package.json`

One package: `node-ssh@^13.2.1`.

```bash
cd packages/dispatcher && npm install node-ssh
```

**Version verification (run date: 2026-03-26):**
```bash
npm view node-ssh version   # -> 13.2.1
npm view node-ssh time.modified   # -> 2025-03-20T00:09:08.354Z
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node-ssh` | Raw `child_process.spawn('ssh', ...)` | spawn('ssh') works but gives no structured error handling, no connection lifecycle management, no SFTP support. node-ssh is the correct level of abstraction. |
| `node-ssh` | `ssh2` directly | ssh2 is the underlying library; node-ssh adds Promise wrappers — use node-ssh to avoid callback nesting |
| `node-ssh` | `simple-git` with remote | simple-git is a git abstraction, not SSH execution; cannot run arbitrary commands like `claude --print` remotely |
| SSH dispatch | `claude --remote` | `--remote` creates GitHub-connected web sessions on Anthropic-managed VMs; NOT a headless dispatch mechanism; no NDJSON streaming; requires GitHub OAuth; research preview with active bugs — deferred |

## Architecture Patterns

### Recommended Project Structure

```
packages/dispatcher/
├── package.json              (add node-ssh)
├── index.cjs                 (add remote module exports)
└── lib/
    ├── remote-ssh.cjs        (NEW: SSH backend — connect, push state, execute, pipe NDJSON, pull results)
    ├── remote-managed.cjs    (NEW: Managed backend stub — detect, warn unavailable, return fallback)
    ├── remote-router.cjs     (NEW: Route sessions: managed -> SSH -> local based on config + session type)
    ├── coordinator.cjs       (MODIFY: wire remote router into dispatch() / dispatchWave())
    └── [all existing modules unchanged]

tests/dispatcher/
    ├── remote-ssh.test.cjs   (NEW: unit tests with mocked NodeSSH)
    ├── remote-router.test.cjs (NEW: routing decision tests with all three paths)
    └── [all existing tests unchanged]
```

### Pattern 1: SSH Remote Execution Lifecycle

**What:** Full lifecycle — push state, connect, execute, stream back, pull results.
**When to use:** When dispatcher routes an autonomous session to a configured SSH remote host.

The `spawnRemoteSession` function signature mirrors `spawnSession` from `spawn.cjs` so it can replace it transparently in `coordinator.cjs`. Key differences from local spawn:

1. `git push origin branch` runs first to upload the session branch to remote
2. SSH connection opens with keepalive
3. Remote worktree is created via `ssh.execCommand('git worktree add ...')`
4. `claude --print` runs via `ssh.connection.exec(cmd, { pty: false }, ...)`
5. `channel.stdin.end()` closes remote stdin immediately (prevents hang — same as `stdin: 'ignore'` locally)
6. channel.stdout is piped through readline into the local NDJSON tmp file
7. On channel close: `git fetch origin branch`, then `ssh.dispose()`
8. `mergeSession()` in merge.cjs handles the actual git merge — unchanged

**Env var setup for remote command:**

```
CLAUDECODE= PDE_SESSION_ID=... PDE_PHASE=... PDE_PLAN=... ANTHROPIC_API_KEY=... claude --print --bare --output-format stream-json --verbose --dangerously-skip-permissions --plugin-dir <remotePluginDir> --append-system-prompt "..." "<prompt>"
```

Note the `CLAUDECODE=` prefix (empty, not unset — but equivalent) to prevent "cannot be launched inside another Claude Code session" error on the remote machine.

### Pattern 2: Managed Backend Stub (RMT-04)

**What:** Return `{ available: false }` immediately. Never attempt actual `claude --remote` dispatch.
**Why:** `claude --remote` creates GitHub-connected web sessions. It cannot: (1) run headlessly, (2) use arbitrary git repos (only GitHub), (3) stream NDJSON back, (4) propagate CLAUDE.md or plugin-dir, (5) run with PDE_SESSION_ID environment variable. Research preview with active bugs as of March 2026. STATE.md decision is final.

```javascript
// packages/dispatcher/lib/remote-managed.cjs
'use strict';

/**
 * Detect whether the claude --remote managed backend is available for dispatch.
 *
 * In v0.18, this always returns { available: false } because:
 * - claude --remote creates GitHub-connected web sessions, not SSH dispatch
 * - No NDJSON streaming from cloud sessions
 * - Research preview with active bugs (March 2026)
 * - Deferred to post-v0.18 pending stable API
 *
 * @returns {Promise<{ available: boolean, reason: string }>}
 */
async function detectManagedBackend() {
  // Future: probe `claude auth status --json` + check GitHub connectivity
  // For v0.18: always unavailable
  return {
    available: false,
    reason: 'claude --remote is a GitHub-connected web session, not a programmatic dispatch backend. Deferred to post-v0.18.',
  };
}

module.exports = { detectManagedBackend };
```

### Pattern 3: Remote Router

**What:** Given a session's autonomy tag and dispatch config, determine which backend to use.
**When to use:** Called from `DispatchCoordinator.dispatch()` before spawning, outside the lock window.

```javascript
// packages/dispatcher/lib/remote-router.cjs
'use strict';

/**
 * Route a session to a backend.
 *
 * Decision tree:
 * 1. !isAutonomous -> 'local' (interactive sessions always local, RMT-05)
 * 2. !remoteConfig.host -> 'local' (no config)
 * 3. preferred_backend === 'managed' -> probe detectManagedBackend()
 *    -> available: return 'managed' (never true in v0.18)
 *    -> unavailable: continue
 * 4. host configured -> 'ssh'
 * 5. -> 'local' (fallback)
 *
 * @param {object} opts
 * @param {boolean} opts.isAutonomous
 * @param {object|undefined} opts.remoteConfig
 * @param {function} [opts._detectManaged]   - Injectable for testing
 * @returns {Promise<'local' | 'ssh' | 'managed'>}
 */
async function routeSession({ isAutonomous, remoteConfig, _detectManaged }) {
  if (!isAutonomous) return 'local';
  if (!remoteConfig || !remoteConfig.host) return 'local';

  const preferred = remoteConfig.preferred_backend || 'ssh';
  if (preferred === 'managed') {
    const detect = _detectManaged || require('./remote-managed.cjs').detectManagedBackend;
    const { available } = await detect();
    if (available) return 'managed';
  }

  return 'ssh';
}

module.exports = { routeSession };
```

### Pattern 4: DispatchCoordinator Integration

**What:** Add remote deps to constructor, call `routeSession()` in `dispatch()` before the lock.
**When to use:** Modify `packages/dispatcher/lib/coordinator.cjs`.

New constructor deps (appended after existing Phase 145 deps):

```javascript
// Phase 146: Remote dispatch
this._spawnRemoteSession = deps.spawnRemoteSession || spawnRemoteSession;
this._routeSession = deps.routeSession || routeSession;
this._remoteConfig = (options.config && options.config.dispatch && options.config.dispatch.remote) || null;
```

In `dispatch(phase, plan, opts)`:

```javascript
// Determine backend BEFORE acquiring lock (routing is async, lock window must stay narrow)
const isAutonomous = (opts && opts.isAutonomous !== undefined) ? opts.isAutonomous : readPlanAutonomous(this._root, phase, plan);
const backend = await this._routeSession({
  isAutonomous,
  remoteConfig: this._remoteConfig,
});

// ... existing lock + worktree + registry.register code ...

// Registry gets backend tag for dashboard display (RMT-03)
this._registry.register(sessionId, {
  pid: 0,
  phase: phaseNum,
  plan: planNum,
  worktreePath,
  branch,
  backend,  // 'local' | 'ssh' | 'managed'
  remoteHost: (backend === 'ssh' && this._remoteConfig) ? this._remoteConfig.host : undefined,
});

// Choose spawn method based on backend
if (backend === 'ssh') {
  this._queue.add(() => this._runRemoteSession(sessionId, phaseNum, plan, worktreePath, branch));
} else {
  this._queue.add(() => this._runSession(sessionId, phaseNum, plan, worktreePath, branch));
}
```

`_runRemoteSession` mirrors `_runSession` but calls `this._spawnRemoteSession(...)`.

### Pattern 5: Autonomous Session Detection from PLAN.md

**What:** Read `autonomous: true/false` from PLAN.md YAML frontmatter. All Phase 144/145 PLANs already have this field.
**When to use:** Called in `dispatch()` when caller does not pass `opts.isAutonomous` explicitly.

```javascript
// Pure static frontmatter parse — same regex pattern as orchestrator.cjs checkFileOverlap
function readPlanAutonomous(projectRoot, phase, plan) {
  const phasesDir = path.join(projectRoot, '.planning', 'phases');
  const padded = String(phase).padStart(3, '0');
  const planPadded = String(plan).padStart(2, '0');
  try {
    const phaseDirs = fs.readdirSync(phasesDir).filter(d => d.startsWith(padded + '-'));
    if (phaseDirs.length === 0) return false;
    const planFile = path.join(phasesDir, phaseDirs[0], `${padded}-${planPadded}-PLAN.md`);
    const content = fs.readFileSync(planFile, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return false;
    return /^autonomous:\s*true/m.test(fmMatch[1]);
  } catch (_) {
    return false; // Default to local if PLAN.md unreadable
  }
}
```

### Pattern 6: Config Schema for `dispatch.remote`

**What:** The `dispatch.remote` block in `.planning/config.json` (RMT-06).
**When to use:** Phase 146 introduces and documents this schema; Phase 149 wires the full `dispatch` config block.

```json
{
  "dispatch": {
    "remote": {
      "host": "build-server.example.com",
      "username": "deploy",
      "identity_file": "~/.ssh/id_ed25519",
      "repo_path": "/home/deploy/projects/myproject",
      "plugin_dir": "~/.claude/pde",
      "preferred_backend": "ssh",
      "env": {}
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `host` | YES | SSH hostname or IP |
| `username` | NO | SSH user (default: current USER env var) |
| `identity_file` | NO | Path to SSH private key (default: `~/.ssh/id_rsa`) |
| `repo_path` | YES | Absolute path to git repo on remote machine |
| `plugin_dir` | NO | Path to PDE plugin on remote (default: `~/.claude/pde`) |
| `preferred_backend` | NO | `"ssh"` (default) or `"managed"` (always falls back to ssh in v0.18) |
| `env` | NO | Extra env vars to pass to remote claude process |

### Anti-Patterns to Avoid

- **Using `claude --remote` for headless dispatch:** `claude --remote` creates a GitHub-connected web session, NOT a programmable SSH execution endpoint. It cannot return structured NDJSON and requires GitHub OAuth.
- **PTY mode for remote claude:** Use `pty: false` in SSH connection.exec options — PTY adds ANSI escape sequences that corrupt NDJSON output.
- **Running git push with shell interpolation:** Use `execFileSync('git', ['push', 'origin', branch])` with array args — never string interpolation.
- **Remote plugin discovery:** The remote machine's `installed_plugins.json` may differ from local. Always require explicit `plugin_dir` in config, or use a well-known default path.
- **Streaming NDJSON to stdout instead of tmp file:** Write remote NDJSON to the same `/tmp/pde-session-{sessionId}.ndjson` path that local sessions use. No changes needed to Aggregator.
- **Interactive sessions routed to remote:** Interactive sessions contain approval gates. Only `autonomous: true` sessions are eligible (RMT-05). The router enforces this as rule #1.
- **Blocking dispatch on SSH connection:** SSH connect + worktree setup goes inside `_runRemoteSession` (queued work), not in `dispatch()`. The lock window must stay narrow — only registry check + worktree create + register.
- **Forgetting to close remote stdin:** After opening the SSH channel, call `channel.stdin.end()` immediately. This is the SSH equivalent of `stdio: ['ignore', ...]`. Without it, `claude --print` hangs waiting for EOF on stdin (verified local bug #6295, same behavior remotely).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSH connection with async/await | Custom ssh2 callbacks | `node-ssh` (wraps ssh2) | node-ssh gives clean Promise API, proper error events, keepalive built-in |
| SSH keepalive | Custom TCP heartbeat | `keepaliveInterval` in node-ssh connect opts | Built-in to ssh2; `keepaliveInterval: 10000, keepaliveCountMax: 3` |
| Git push over SSH | Custom git protocol | `execFileSync('git', ['push', 'origin', branch])` | Standard git remote; uses existing execFileSync pattern from worktree.cjs |
| NDJSON line parsing from SSH channel | Custom stream splitter | `readline.createInterface({ input: channel.stdout })` | Already proven in spawn.cjs for local sessions — same pattern works for SSH channel.stdout |
| Managed backend detection | Complex API probe | Simple `{ available: false }` stub | `claude --remote` is not a dispatch API; no detection is meaningful; return unavailable immediately |
| Config validation | JSON Schema library | Simple required-field checks at load time | `dispatch.remote` has only 2 required fields; full schema validation would add a dependency |
| Merge after remote completion | Custom merge logic | `mergeSession()` from merge.cjs (unchanged) | After `git fetch`, the session branch exists locally; existing merge.cjs handles all conflict resolution |

**Key insight:** The SSH dispatch pattern is structurally identical to local dispatch. Same worktree branch, same NDJSON format, same Aggregator TailCursor, same merge.cjs — only execution location changes. Minimize divergence from the local path.

## Common Pitfalls

### Pitfall 1: SSH Channel stdin Not Closed (Session Hangs)

**What goes wrong:** `claude --print` hangs waiting for stdin on the remote machine, just as it does locally (Issue #6295 referenced in spawn.cjs). SSH channels provide a writable stdin by default.
**Why it happens:** SSH connection.exec leaves stdin open. Claude detects stdin is not a TTY but the channel is still open, causing it to wait for EOF.
**How to avoid:** After opening the SSH channel, immediately call `channel.stdin.end()` to signal EOF. SSH equivalent of `stdio: ['ignore', 'pipe', 'pipe']` in child_process.spawn.
**Warning signs:** Remote session never produces NDJSON output; SSH connection stays open indefinitely; no `close` event fires.

### Pitfall 2: PTY Mode Corrupts NDJSON

**What goes wrong:** SSH connection.exec with `pty: true` injects ANSI escape sequences and carriage returns into stdout. JSON.parse fails on every line.
**Why it happens:** PTY (pseudo-terminal) is for interactive shells; it adds terminal control bytes to all output.
**How to avoid:** Always use `pty: false` (or omit `pty` — default is false in node-ssh).
**Warning signs:** NDJSON lines contain `\r` characters or ANSI escape codes; JSON.parse throws on every line.

### Pitfall 3: Remote Plugin Directory Not Configured

**What goes wrong:** `claude --plugin-dir` path on the remote machine points to a non-existent directory (e.g., same path as local `~/.claude/pde`). Claude falls back to minimal tools, PLAN.md is never read, execution exits immediately with code 0 but no artifacts.
**Why it happens:** `resolvePluginDir()` in coordinator.cjs reads `~/.claude/plugins/installed_plugins.json` on the **local** machine. Remote machine has a different home directory structure.
**How to avoid:** Require `plugin_dir` in `dispatch.remote` config. Validate presence before first remote dispatch. Provide a config-time validation error, not a silent runtime failure.
**Warning signs:** Remote session exits with code 0 but no COMPLETE.json artifact created; no PLAN tasks visible in NDJSON.

### Pitfall 4: Git Remote Not Configured for Push

**What goes wrong:** `git push origin branch` fails because the remote in the local repo is a GitHub URL (not the SSH host). The remote machine cannot pull from GitHub (or the origin is not the same repo).
**Why it happens:** "Remote" in git and "remote machine" in SSH are different concepts. The git remote named `origin` points to GitHub; the SSH host is a separate server.
**How to avoid:** Support `remote_git_url` in config as an override for the push target. If not set, fall back to `origin`. Add pre-flight connectivity check before first dispatch.
**Warning signs:** `git push` exits with non-zero; or remote `git worktree add` fails with "branch not found."

### Pitfall 5: SSH Connection Timeout During Long Sessions

**What goes wrong:** SSH connection closes mid-session (typically 30-120 minutes of inactivity or firewall idle timeout). NDJSON pipe breaks silently; local aggregator stops receiving events.
**Why it happens:** Many SSH servers and firewalls terminate idle connections. `claude --print` may not produce output for extended periods during long thinking turns.
**How to avoid:** Set `keepaliveInterval: 10000` (10 seconds) and `keepaliveCountMax: 6` in node-ssh connect options. SSH keepalive packets are sent even when the channel is silent.
**Warning signs:** Session shows `status: 'running'` in registry but no new NDJSON lines after N minutes; SSH channel close event fires unexpectedly mid-execution.

### Pitfall 6: CLAUDECODE Env Var Blocks Remote Launch

**What goes wrong:** The remote system has `CLAUDECODE=1` set in its shell environment (e.g., if an operator runs Claude Code interactively on that machine). Remote `claude --print` exits immediately with "cannot be launched inside another Claude Code session."
**Why it happens:** Same env var issue as local dispatch (documented in spawn.cjs). `CLAUDECODE=1` means "I'm already inside a Claude Code session."
**How to avoid:** Prefix the remote command with `CLAUDECODE= ` to clear the variable in the remote subshell context. The command prefix approach works because SSH connection.exec runs the command in a fresh shell context.
**Warning signs:** Remote session exits with code 1 immediately; stderr contains "cannot be launched inside another Claude Code session."

### Pitfall 7: Confusing `claude --remote` with SSH Dispatch

**What goes wrong:** Phase implementation uses `claude --remote "Execute phase N plan M"` as the dispatch mechanism. This creates a GitHub-connected web session on Anthropic's infrastructure, NOT a dispatch to the configured SSH host.
**Why it happens:** The flag name "remote" and the requirement name "RMT-04 managed backend" suggest `claude --remote` is the answer for managed backend.
**How to avoid:** `claude --remote` = GitHub web session (not an API). RMT-04 is satisfied by the managed backend stub that always returns `{ available: false }`. Only `claude --print` executed over SSH satisfies RMT-01 through RMT-03.
**Warning signs:** `dispatch.remote.host` config is ignored; sessions appear in claude.ai web UI instead of local registry.

## Code Examples

### SSH Connection with Keepalive

```javascript
// Source: node-ssh v13.2.1 API + ssh2 keepalive documentation
const { NodeSSH } = require('node-ssh');
const os = require('node:os');
const path = require('node:path');

async function connectSSH(remoteConfig) {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: remoteConfig.host,
    username: remoteConfig.username || process.env.USER,
    privateKeyPath: remoteConfig.identity_file || path.join(os.homedir(), '.ssh', 'id_rsa'),
    readyTimeout: 10000,      // 10s connection timeout
    keepaliveInterval: 10000, // 10s keepalive ping interval
    keepaliveCountMax: 6,     // 6 missed pings before disconnect
  });
  return ssh;
}
```

### Remote Git Worktree Setup via SSH

```javascript
// Source: verified pattern from worktree.cjs (local) applied via SSH execCommand
async function setupRemoteWorktree(ssh, remoteConfig, sessionId, branch) {
  const remoteWorktreePath = remoteConfig.repo_path + '/.sessions/' + sessionId;

  const result = await ssh.execCommand(
    'git worktree prune && git worktree add ' + remoteWorktreePath + ' ' + branch,
    { cwd: remoteConfig.repo_path }
  );

  if (result.code !== 0) {
    throw new Error('Remote worktree setup failed: ' + result.stderr);
  }

  return remoteWorktreePath;
}
```

### NDJSON Streaming via SSH Channel (Critical Patterns)

```javascript
// Source: spawn.cjs readline pattern + node-ssh channel.stdout
// CRITICAL: pty: false + channel.stdin.end() immediately
const readline = require('node:readline');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function streamRemoteSession(ssh, remoteCmd, sessionId, onLine, onExit) {
  const ndjsonPath = path.join(os.tmpdir(), 'pde-session-' + sessionId + '.ndjson');
  const writeStream = fs.createWriteStream(ndjsonPath, { flags: 'a' });

  return new Promise((resolve, reject) => {
    ssh.connection.exec(remoteCmd, { pty: false }, (err, channel) => {
      if (err) return reject(err);

      // CRITICAL: close stdin immediately — prevents claude --print from hanging
      channel.stdin.end();

      const rl = readline.createInterface({ input: channel.stdout, crlfDelay: Infinity });
      rl.on('line', line => {
        if (!line.trim()) return;
        writeStream.write(line + '\n');
        try {
          const event = JSON.parse(line);
          onLine(sessionId, event);
        } catch (_) {}
      });

      channel.stderr.on('data', data => {
        const msg = data.toString().trim();
        if (msg) onLine(sessionId, { type: 'system', subtype: 'stderr', message: msg });
      });

      let exitCode = 0;
      channel.on('exit', code => { exitCode = code != null ? code : 1; });
      channel.on('close', () => {
        rl.close();
        writeStream.end();
        onExit(sessionId, exitCode);
      });

      resolve({
        kill: () => {
          channel.signal('TERM');
          channel.stdin.end();
        },
      });
    });
  });
}
```

### Git Push/Fetch for State Sync

```javascript
// Source: worktree.cjs pattern (execFileSync with array args — no shell injection)
const { execFileSync } = require('node:child_process');

// Before remote execution: push session branch
function pushSessionBranch(projectRoot, branch) {
  execFileSync('git', ['push', 'origin', branch], {
    cwd: projectRoot,
    stdio: 'pipe',
  });
}

// After remote completion: fetch updated branch
function fetchRemoteBranch(projectRoot, branch) {
  execFileSync('git', ['fetch', 'origin', branch], {
    cwd: projectRoot,
    stdio: 'pipe',
  });
  // mergeSession() in merge.cjs handles actual merge — no changes needed there
}
```

### Router Decision (All Three Paths)

```javascript
// Demonstrates all three routing outcomes with injection points for testing
async function routeSession({ isAutonomous, remoteConfig, _detectManaged }) {
  // Path 1: interactive always local (RMT-05)
  if (!isAutonomous) return 'local';

  // Path 2: no config -> local (graceful degradation)
  if (!remoteConfig || !remoteConfig.host) return 'local';

  // Path 3: try managed if preferred
  const preferred = remoteConfig.preferred_backend || 'ssh';
  if (preferred === 'managed') {
    const detect = _detectManaged || require('./remote-managed.cjs').detectManagedBackend;
    const { available } = await detect();
    if (available) return 'managed'; // not reachable in v0.18
  }

  // Path 4: SSH (host is configured)
  return 'ssh';
}
```

### Registry Entry with Backend Tag

```javascript
// Extended for remote sessions (RMT-03: source tag for dashboard display)
this._registry.register(sessionId, {
  pid: 0,           // No local PID for remote sessions
  phase: phaseNum,
  plan: planNum,
  worktreePath,     // Local worktree path reference
  branch,
  backend: 'ssh',            // 'local' | 'ssh' | 'managed'
  remoteHost: remoteConfig.host,
});
```

## State of the Art

| Old Assumption | Reality (2026-03-26) | Impact |
|----------------|----------------------|--------|
| `claude --remote` = "managed backend for SSH dispatch" | `claude --remote` creates GitHub web sessions on claude.ai — completely different feature | RMT-04 must be a stub; no managed backend in v0.18 |
| Direct `ssh` subprocess | `node-ssh` wrapper for Promise/async-await | Cleaner async lifecycle, keepalive built-in |
| Custom state sync | Git push/fetch with branch isolation | Existing merge.cjs handles merge; only push/fetch is new |
| Remote NDJSON requires new relay | Same `/tmp/pde-session-{id}.ndjson` file | Aggregator TailCursor unchanged; zero new dashboard code for RMT-03 |

**Deprecated/outdated:**
- `ssh-exec` npm package: last updated 2016; do not use
- `ssh2-promise`: thinner wrapper around ssh2; `node-ssh` is more maintained (2025) and has broader usage

## Open Questions

1. **Git remote transport: origin vs SSH host**
   - What we know: `git push origin branch` requires `origin` to be reachable from both machines
   - What's unclear: Projects may use GitHub as `origin`; the SSH host is a separate server with its own repo clone
   - Recommendation: Support `remote_git_url` config field as push target override. If unset, use `git push origin`. Document the two-machine vs shared-remote patterns in config schema comments.

2. **Remote ANTHROPIC_API_KEY forwarding**
   - What we know: `claude --print` on the remote machine requires ANTHROPIC_API_KEY in the remote environment
   - What's unclear: Whether the remote machine has it set independently, or if PDE should forward it
   - Recommendation: Always forward `ANTHROPIC_API_KEY` from local env to remote command via env prefix in the SSH command string. Add to `dispatch.remote.env` as an auto-populated field (not stored in config.json).

3. **Remote claude CLI version check**
   - What we know: Remote machine may have a different `claude` CLI version than local
   - What's unclear: Whether flags like `--bare`, `--output-format stream-json`, `--plugin-dir` are available on the remote version
   - Recommendation: Pre-flight check via `ssh.execCommand('claude --version')` before first dispatch. Warn if version differs from local. Minimum required version: 2.1.51 (when `--bare` was added per changelog).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 20 | Package runtime | ✓ | 20.20.0 | — |
| `node-ssh` | RMT-01 SSH backend | Not yet (to be installed) | 13.2.1 | — |
| SSH access to remote host | RMT-01 | Depends on user config | — | Local dispatch |
| `git` CLI (local) | RMT-02 push/fetch | ✓ | — | — |
| `git` CLI (remote) | RMT-02 worktree setup | Assumed on remote | — | Config-time error |
| `claude` CLI on remote | RMT-01 execution | Depends on user setup | >= 2.1.51 | Local dispatch |
| `ANTHROPIC_API_KEY` | Remote claude execution | Forward from local env | — | Fail with clear error message |
| `.planning/config.json` dispatch.remote block | RMT-06 | Not yet present (to be documented) | — | Local dispatch (graceful degradation) |

**Missing dependencies with no fallback:**
- `node-ssh` — must be installed in Wave 0 before any SSH dispatch code runs

**Missing dependencies with fallback (graceful degradation to local):**
- SSH host config (`dispatch.remote.host`) — if absent, all sessions route local; zero behavioral change
- Remote `claude` CLI — if unreachable, route falls back to local with log warning

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/dispatcher/ --reporter=verbose` |
| Full suite command | `npx vitest run tests/ --reporter=verbose` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RMT-01 | `spawnRemoteSession()` calls ssh.connect, sets up worktree, streams claude --print | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ Wave 0 |
| RMT-02 | `spawnRemoteSession()` calls `git push origin branch` before SSH, `git fetch` after | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ Wave 0 |
| RMT-03 | NDJSON written to `/tmp/pde-session-{sessionId}.ndjson` during SSH streaming | unit | `npx vitest run tests/dispatcher/remote-ssh.test.cjs` | ❌ Wave 0 |
| RMT-04 | `detectManagedBackend()` returns `{ available: false }`, router falls through to SSH | unit | `npx vitest run tests/dispatcher/remote-router.test.cjs` | ❌ Wave 0 |
| RMT-05 | `routeSession({ isAutonomous: false })` returns `'local'` regardless of config | unit | `npx vitest run tests/dispatcher/remote-router.test.cjs` | ❌ Wave 0 |
| RMT-06 | `dispatch.remote` block from config.json is read and passed to routeSession | unit | `npx vitest run tests/dispatcher/remote-router.test.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/ --reporter=verbose`
- **Per wave merge:** `npx vitest run tests/ --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dispatcher/remote-ssh.test.cjs` — covers RMT-01, RMT-02, RMT-03 with mocked NodeSSH + mocked execFileSync
- [ ] `tests/dispatcher/remote-router.test.cjs` — covers RMT-04, RMT-05, RMT-06 routing decisions
- [ ] Package install: `cd packages/dispatcher && npm install node-ssh` — required before any SSH code
- [ ] `packages/dispatcher/lib/remote-ssh.cjs` — SSH backend (Wave 1 deliverable, not Wave 0)
- [ ] `packages/dispatcher/lib/remote-managed.cjs` — managed stub (Wave 1 deliverable)
- [ ] `packages/dispatcher/lib/remote-router.cjs` — router (Wave 1 deliverable)

*(No framework install needed — vitest 4.1.1 already in root devDependencies)*

## Sources

### Primary (HIGH confidence)

- Official Claude Code CLI reference — `code.claude.com/docs/en/cli-reference` — confirmed `--remote` flag behavior: "Create a new web session on claude.ai with the provided task description" — verified 2026-03-26
- Official Claude Code on the web docs — `code.claude.com/docs/en/claude-code-on-the-web` — full detail: GitHub-connected VM, NOT SSH dispatch, limitations — verified 2026-03-26
- Official Claude Code changelog — `code.claude.com/docs/en/changelog` — `claude --remote` is web session feature; no SSH dispatch mechanism exists
- Project STATE.md — `[Phase 146]: SSH-primary architecture; claude --remote deferred — research preview, no NDJSON streaming, no CLAUDE.md propagation` — architectural decision
- npm registry — `node-ssh@13.2.1` (published 2025-03-20); dependencies: ssh2@^1.14.0, is-stream@^2.0.0
- npm registry — `ssh2@1.17.0` (underlying library confirmed)
- Project `packages/dispatcher/lib/spawn.cjs` — stdin MUST be 'ignore' (Issue #6295); CLAUDECODE env var must be deleted — both apply to remote execution
- Project `packages/dispatcher/lib/coordinator.cjs` — `_deps` injection pattern, exact constructor shape for new dep additions
- Project `packages/dispatcher/lib/worktree.cjs` — `execFileSync` with array args pattern, `pde/session/` branch convention
- Project `packages/dispatcher/lib/merge.cjs` — `mergeSession()` works unchanged after `git fetch`; no modifications needed

### Secondary (MEDIUM confidence)

- WebSearch: `claude --remote` active bugs (March 2026) — sessions dying when idle, rapid-message queuing, WebSocket disconnect recovery — via releasebot.io changelog summary
- WebSearch: `node-ssh` API patterns — connect options, execCommand, channel streaming — multiple consistent sources
- Claude Code changelog v2.1.51: `claude remote-control` subcommand added (distinct from `--remote`)

### Tertiary (LOW confidence)

- SSH `channel.stdin.end()` for EOF signaling — inferred from spawn.cjs `stdin: 'ignore'` pattern + SSH protocol; not in node-ssh README explicitly but standard SSH stream pattern
- SSH `pty: false` default — inferred from node-ssh/ssh2 defaults; PTY is opt-in

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — node-ssh version verified from npm 2026-03-26; ssh2 dependency confirmed
- Architecture: HIGH — SSH dispatch mirrors existing local dispatch; merge.cjs unchanged; Aggregator unchanged
- `claude --remote` deferral: HIGH — confirmed by official CLI reference + claude-code-on-the-web docs + STATE.md decision
- Pitfalls: HIGH — stdin/PTY pitfalls extrapolated from spawn.cjs live-verified patterns; CLAUDECODE env var from spawn.cjs comments
- RMT-04 stub approach: HIGH — `claude --remote` is definitively NOT a programmatic dispatch API per official docs

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (node-ssh is stable; `claude --remote` web session status may change — check changelog before upgrade)
