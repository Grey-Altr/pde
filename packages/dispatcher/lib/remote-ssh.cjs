'use strict';

/**
 * remote-ssh.cjs -- SSH remote execution backend for PDE parallel dispatch
 *
 * Phase 146: Remote Dispatch
 * Satisfies: RMT-01, RMT-02, RMT-03
 *
 * Mirrors spawnSession() from spawn.cjs but executes on a remote host over SSH.
 *
 * Lifecycle:
 *   1. git push session branch to origin (so remote can fetch it)
 *   2. SSH connect with keepalive
 *   3. Remote: git fetch + git worktree add
 *   4. Remote: run claude --print with CLAUDECODE= prefix (prevents nested-session error)
 *   5. Stream NDJSON output via readline to local tmp file + onLine callback
 *   6. On channel close: git fetch results back locally, cleanup remote worktree
 *
 * CRITICAL RULES (mirrored from spawn.cjs):
 * 1. CLAUDECODE= (empty) in remote env -- prevents "cannot be launched inside another session" error
 * 2. channel.stdin.end() IMMEDIATELY -- prevents claude --print hang (same as stdio: ['ignore'] locally)
 * 3. pty: false -- prevents NDJSON corruption from terminal escape sequences
 * 4. Array args to execFileSync -- no shell interpretation (project convention)
 */

const { NodeSSH } = require('node-ssh');
const childProcess = require('node:child_process');
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Spawn a remote claude --print session over SSH.
 * Mirrors spawnSession() from spawn.cjs but executes on a remote host.
 *
 * @param {object} opts
 * @param {string} opts.sessionId       - PDE session ID (e.g. "p146-1-abc12345")
 * @param {string} [opts.relayId]       - UUID relay ID for NDJSON correlation (matches spawn.cjs pattern)
 * @param {number|string} opts.phase    - Phase number (e.g. 146)
 * @param {number|string} opts.plan     - Plan number (e.g. 1)
 * @param {string} opts.branch          - Session branch (pde/session/{sessionId})
 * @param {string} opts.projectRoot     - Local project root for git push/fetch
 * @param {object} opts.remoteConfig    - dispatch.remote config block
 * @param {string} opts.remoteConfig.host
 * @param {string} [opts.remoteConfig.username]
 * @param {string} [opts.remoteConfig.identity_file]
 * @param {string} opts.remoteConfig.repo_path
 * @param {string} [opts.remoteConfig.plugin_dir]
 * @param {object} [opts.remoteConfig.env]
 * @param {function} opts.onLine        - Callback(sessionId, parsedEvent) for each NDJSON line
 * @param {function} opts.onExit        - Callback(sessionId, exitCode) on completion
 * @param {object} [opts._deps]         - DI: { NodeSSH, execFileSync } for testing
 * @returns {{ kill: function }}
 */
function spawnRemoteSession(opts) {
  // DI for testability -- production defaults to real node-ssh + child_process
  const execSync = (opts._deps && opts._deps.execFileSync) || childProcess.execFileSync;
  const SSHClass = (opts._deps && opts._deps.NodeSSH) || NodeSSH;

  // Declared in outer scope so kill() can reference it before async IIFE settles
  let sshInstance = null;

  // Async IIFE -- runs lifecycle; synchronous return below gives caller kill handle
  (async () => {
    // Step 1: Push session branch to origin so remote can fetch it
    // Array args -- no shell interpretation (project convention from worktree.cjs)
    execSync('git', ['push', 'origin', opts.branch], {
      cwd: opts.projectRoot,
      stdio: 'pipe',
    });

    // Step 2: SSH connect with keepalive to prevent idle timeout drops
    const ssh = new SSHClass();
    sshInstance = ssh;
    await ssh.connect({
      host: opts.remoteConfig.host,
      username: opts.remoteConfig.username || process.env.USER,
      privateKeyPath: opts.remoteConfig.identity_file || path.join(os.homedir(), '.ssh', 'id_rsa'),
      readyTimeout: 10000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 6,
    });

    // Step 3: Remote git fetch + worktree creation
    const remoteRepoPath = opts.remoteConfig.repo_path;
    const remoteWorktreePath = remoteRepoPath + '/.sessions/' + opts.sessionId;
    await ssh.execCommand('git fetch origin ' + opts.branch, { cwd: remoteRepoPath });
    await ssh.execCommand(
      'git worktree add ' + remoteWorktreePath + ' ' + opts.branch,
      { cwd: remoteRepoPath }
    );

    // Step 4: Build remote claude command
    const remotePluginDir = opts.remoteConfig.plugin_dir || '~/.claude/pde';
    const extraEnv = Object.entries(opts.remoteConfig.env || {})
      .map(([k, v]) => k + '=' + v)
      .join(' ');
    const prompt =
      'Execute phase ' + opts.phase + ', plan ' + opts.plan +
      '. Run /gsd:execute-plan ' + opts.phase + ' ' + opts.plan + '.';

    // CLAUDECODE= (empty) prevents nested-session error; PDE_* vars communicate context to executor
    // Phase 154: Use relayId (UUID) for PDE_SESSION_ID so relay schema validation passes (SSH-02)
    const effectiveSessionId = opts.relayId || opts.sessionId;
    const ingestUrl = (opts.remoteConfig && opts.remoteConfig.ingest_url) || process.env.PDE_REMOTE || '';
    const relayToken = (opts.remoteConfig && opts.remoteConfig.relay_token) || process.env.PDE_RELAY_TOKEN || '';

    const envPrefix =
      'CLAUDECODE= ' +
      'PDE_SESSION_ID=' + effectiveSessionId + ' ' +
      'PDE_PHASE=' + opts.phase + ' ' +
      'PDE_PLAN=' + opts.plan + ' ' +
      'PDE_BACKEND=remote-ssh' +
      (ingestUrl ? ' PDE_REMOTE=' + ingestUrl : '') +
      (relayToken ? ' PDE_RELAY_TOKEN=' + relayToken : '') +
      (extraEnv ? ' ' + extraEnv : '');

    const cmd =
      envPrefix + ' ' +
      'claude --print --bare --output-format stream-json --verbose ' +
      '--dangerously-skip-permissions ' +
      '--plugin-dir ' + remotePluginDir + ' ' +
      '--append-system-prompt "You are a PDE executor agent running in a worktree. ' +
      'Operate in autonomous mode. Auto-approve all checkpoints. Do not ask questions." ' +
      '"' + prompt + '"';

    // Step 5: Open local NDJSON file (Aggregator TailCursor watches this path)
    // Phase 154: Use effectiveSessionId (relayId UUID) so aggregator.watch(relayId) matches (SSH-02)
    const ndjsonPath = path.join(os.tmpdir(), 'pde-session-' + effectiveSessionId + '.ndjson');
    const ndjsonStream = fs.createWriteStream(ndjsonPath, { flags: 'a' });

    // Step 6: Execute via SSH channel (streaming, pty: false -- prevents NDJSON corruption)
    ssh.connection.exec(cmd, { cwd: remoteWorktreePath, pty: false }, (err, channel) => {
      if (err) {
        ndjsonStream.end();
        opts.onLine(opts.sessionId, {
          type: 'system',
          subtype: 'ssh_error',
          message: err.message,
        });
        opts.onExit(opts.sessionId, 1);
        ssh.dispose();
        return;
      }

      // CRITICAL: close stdin immediately -- same as stdio: ['ignore'] locally
      // Prevents claude --print from hanging waiting for EOF on stdin
      channel.stdin.end();

      const rl = readline.createInterface({ input: channel.stdout, crlfDelay: Infinity });
      rl.on('line', (line) => {
        if (!line.trim()) return;
        // Write raw line to NDJSON file for Aggregator
        ndjsonStream.write(line + '\n');
        // Forward parsed event to onLine callback
        try {
          const event = JSON.parse(line);
          opts.onLine(opts.sessionId, event);
        } catch (_) {
          // Non-JSON line (rare startup output) -- skip silently
        }
      });

      channel.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          opts.onLine(opts.sessionId, {
            type: 'system',
            subtype: 'stderr',
            message: msg,
          });
        }
      });

      channel.on('close', (code) => {
        rl.close();
        ndjsonStream.end();

        // Cleanup remote worktree (best-effort, non-blocking)
        ssh.execCommand(
          'git worktree remove ' + remoteWorktreePath + ' --force',
          { cwd: remoteRepoPath }
        )
          .catch(() => {})
          .then(() => ssh.dispose())
          .catch(() => {});

        // Fetch results back locally (array args, no shell)
        try {
          execSync('git', ['fetch', 'origin', opts.branch], {
            cwd: opts.projectRoot,
            stdio: 'pipe',
          });
        } catch (_) {
          // Fetch failure is non-fatal -- remote may have already cleaned up
        }

        opts.onExit(opts.sessionId, code != null ? code : 1);
      });
    });
  })().catch((err) => {
    // Top-level async IIFE error (connect failure, git push failure, etc.)
    opts.onLine(opts.sessionId, {
      type: 'system',
      subtype: 'ssh_error',
      message: err.message,
    });
    opts.onExit(opts.sessionId, 1);
  });

  // Return synchronous kill handle -- callers can kill() even before SSH connects
  return {
    kill: () => {
      if (sshInstance) {
        try { sshInstance.dispose(); } catch (_) {}
      }
    },
  };
}

module.exports = { spawnRemoteSession };
