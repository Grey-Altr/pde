'use strict';

/**
 * cloud-adapter/index.cjs — Cloud dispatch adapter
 *
 * Phase 191: Docker Container Backend
 * Satisfies: CLD-03, CLD-04, CLD-05
 *
 * Implements spawnDockerSession mirroring the async IIFE + synchronous kill handle
 * pattern from packages/dispatcher/lib/remote-ssh.cjs.
 *
 * CRITICAL RULES (mirrors remote-ssh.cjs):
 * 1. CLAUDECODE= (empty) in container env -- prevents "cannot be launched inside another session" error
 * 2. OpenStdin: false -- prevents container hang (equiv to stdio:['ignore'] locally)
 * 3. Tty: false -- prevents NDJSON corruption from terminal escape sequences
 * 4. container.modem.demuxStream() -- required for Tty:false multiplexed stream separation
 * 5. container.wait() is authoritative exit signal; logStream.destroy() forces stream close
 */

const Dockerode = require('dockerode');
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { PassThrough } = require('node:stream');

/**
 * Parse a memory string like '512m' or '2g' into bytes.
 * @param {string|number} val
 * @returns {number}
 */
function parseMemory(val) {
  if (typeof val === 'number') return val;
  const s = String(val).toLowerCase().trim();
  if (s.endsWith('g')) return Math.floor(parseFloat(s) * 1024 * 1024 * 1024);
  if (s.endsWith('m')) return Math.floor(parseFloat(s) * 1024 * 1024);
  if (s.endsWith('k')) return Math.floor(parseFloat(s) * 1024);
  return parseInt(s, 10);
}

/**
 * Spawn a Claude --print session inside a Docker container.
 * Mirrors spawnRemoteSession() from packages/dispatcher/lib/remote-ssh.cjs.
 *
 * @param {object} opts
 * @param {string} opts.sessionId         - PDE session ID (e.g. "p191-1-abc12345")
 * @param {string} [opts.relayId]         - UUID relay ID for NDJSON correlation
 * @param {number|string} opts.phase      - Phase number (e.g. 191)
 * @param {number|string} opts.plan       - Plan number (e.g. 1)
 * @param {string} opts.worktreePath      - Absolute path to git worktree directory
 * @param {string} [opts.pluginDir]       - PDE plugin directory path
 * @param {object} [opts.dockerConfig]    - { image, memory, cpus, failure_cleanup_ms }
 * @param {function} opts.onLine          - Callback(sessionId, parsedEvent) for each NDJSON line
 * @param {function} opts.onExit          - Callback(sessionId, exitCode) on container exit
 * @param {object} [opts._deps]           - DI: { Dockerode } for testing
 * @returns {{ kill: function }}
 */
function spawnDockerSession(opts) {
  // DI for testability -- production defaults to real dockerode
  const DockerodeClass = (opts._deps && opts._deps.Dockerode) || Dockerode;

  // Declared in outer scope so kill() can reference it before async IIFE settles
  let containerInstance = null;

  // Compute effective session ID: use relayId (UUID) if provided (matches remote-ssh.cjs pattern)
  const effectiveSessionId = opts.relayId || opts.sessionId;

  // NDJSON file path: Aggregator TailCursor watches this path
  const ndjsonPath = path.join(os.tmpdir(), 'pde-session-' + effectiveSessionId + '.ndjson');

  // Async IIFE -- runs lifecycle; synchronous return below gives caller kill handle
  (async () => {
    const docker = new DockerodeClass();
    const dockerConfig = opts.dockerConfig || {};

    // Build environment variables for container
    const ingestUrl = process.env.PDE_REMOTE || '';
    const relayToken = process.env.PDE_RELAY_TOKEN || '';

    const env = [
      'CLAUDECODE=',                                               // CRITICAL: prevents nested session error
      'PDE_SESSION_ID=' + effectiveSessionId,                      // relayId UUID for aggregator correlation
      'PDE_PHASE=' + opts.phase,
      'PDE_PLAN=' + opts.plan,
      'PDE_BACKEND=docker',
      'PDE_SESSION_START=' + new Date().toISOString(),
    ];
    if (ingestUrl) env.push('PDE_REMOTE=' + ingestUrl);
    if (relayToken) env.push('PDE_RELAY_TOKEN=' + relayToken);

    // Build HostConfig with optional resource limits
    const hostConfig = {
      Binds: [opts.worktreePath + ':/workspace'],  // bind-mount worktree as read-write
      AutoRemove: true,                              // success: auto-cleanup
    };
    if (dockerConfig.memory) {
      hostConfig.Memory = parseMemory(dockerConfig.memory);
    }
    if (dockerConfig.cpus) {
      hostConfig.NanoCpus = Math.floor(dockerConfig.cpus * 1e9);
    }

    // Build the claude command
    const prompt = 'Execute phase ' + opts.phase + ', plan ' + opts.plan + '. Run /gsd:execute-plan ' + opts.phase + ' ' + opts.plan + '.';
    const cmd = [
      'claude', '--print', '--bare',
      '--output-format', 'stream-json', '--verbose',
      '--dangerously-skip-permissions',
      '--plugin-dir', opts.pluginDir || '/root/.claude/pde',
      '--append-system-prompt',
      'You are a PDE executor agent running in a worktree. Operate in autonomous mode. Auto-approve all checkpoints. Do not ask questions.',
      prompt,
    ];

    // Create container with critical flags (Tty:false, OpenStdin:false prevent NDJSON corruption + hang)
    const container = await docker.createContainer({
      Image: dockerConfig.image || 'pde-session:latest',
      WorkingDir: '/workspace',
      Env: env,
      OpenStdin: false,   // CRITICAL: prevents hang (equiv to stdio:['ignore'] locally)
      Tty: false,         // CRITICAL: prevents NDJSON corruption from terminal escape sequences
      Labels: { 'pde-session': opts.sessionId },  // enables docker ps --filter label=pde-session
      HostConfig: hostConfig,
      Cmd: cmd,
    });

    containerInstance = container;
    await container.start();

    // Open NDJSON write stream (Aggregator TailCursor watches this path)
    const ndjsonStream = fs.createWriteStream(ndjsonPath, { flags: 'a' });

    // Run logs stream and wait() concurrently.
    // container.wait() is the authoritative exit signal (not log stream end).
    // See: 191-RESEARCH.md Pitfall 1 — logStream never emits 'end' with follow:true
    const waitResult = await new Promise((resolve, reject) => {
      container.logs({ follow: true, stdout: true, stderr: true, timestamps: false }, (err, logStream) => {
        if (err) { reject(err); return; }

        // Demux: Tty:false produces multiplexed stream (Docker 8-byte frame header)
        // container.modem.demuxStream() separates stdout and stderr
        const stdoutPass = new PassThrough();
        const stderrPass = new PassThrough();
        container.modem.demuxStream(logStream, stdoutPass, stderrPass);

        // readline on stdoutPass for NDJSON line-by-line parsing
        const rl = readline.createInterface({ input: stdoutPass, crlfDelay: Infinity });
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

        // stderr forwarded as system events
        stderrPass.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) {
            opts.onLine(opts.sessionId, {
              type: 'system',
              subtype: 'stderr',
              message: msg,
            });
          }
        });

        // container.wait() is authoritative exit signal; resolve when container exits
        container.wait().then((data) => {
          // Destroy logStream to force readline 'close' and end PassThroughs
          // (Pitfall 1: follow:true stream may not self-terminate)
          logStream.destroy();
          rl.close();
          ndjsonStream.end();
          resolve(data);
        }).catch(reject);
      });
    });

    const exitCode = (waitResult && waitResult.StatusCode != null) ? waitResult.StatusCode : 1;

    // Failure cleanup: container already auto-removed (AutoRemove:true) on natural exit,
    // but timer guards against kill() call on lingering container (e.g. idle timeout scenario)
    if (exitCode !== 0) {
      const cleanupMs = dockerConfig.failure_cleanup_ms || 600_000;
      setTimeout(() => {
        try { containerInstance && containerInstance.kill(); } catch (_) {}
      }, cleanupMs).unref(); // unref: don't keep Node process alive for cleanup timer
    }

    opts.onExit(opts.sessionId, exitCode);
  })().catch((err) => {
    // Top-level async IIFE error (Docker daemon not running, createContainer failure, etc.)
    opts.onLine(opts.sessionId, {
      type: 'system',
      subtype: 'docker_error',
      message: err.message,
    });
    opts.onExit(opts.sessionId, 1);
  });

  // Synchronous return -- callers can kill() even before container starts
  return {
    kill: () => {
      if (containerInstance) {
        try { containerInstance.kill(); } catch (_) {}
      }
    },
  };
}

module.exports = { spawnDockerSession };
