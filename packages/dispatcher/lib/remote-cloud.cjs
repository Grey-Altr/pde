'use strict';

/**
 * remote-cloud.cjs — Cloud backend polling and session dispatch for PDE
 *
 * Phase 193: Cloud Web Backend
 * Satisfies: CLD-01, CLD-02
 *
 * CloudPoller polls `claude task status <taskId> --json` on an interval to
 * track the lifecycle of a cloud-dispatched task. It emits synthetic NDJSON
 * event objects (cloud_heartbeat, session_end, cloud_error) that mirror the
 * shape expected by RemoteAggregator / Aggregator consumers.
 *
 * spawnCloudSession mirrors spawnRemoteSession() from remote-ssh.cjs:
 *   - Returns a synchronous kill handle immediately
 *   - Runs the async cloud lifecycle in a fire-and-forget IIFE
 *   - All CLI calls go through _deps.execCommand (DI for testability)
 *
 * CRITICAL NOTES:
 *   - `claude task start --remote` does NOT exist in CLI v2.1.87 — the async
 *     IIFE catches this gracefully and calls onExit(sessionId, 1).
 *   - CloudPoller.stop() is called on BOTH non-running status AND errors
 *     (Pitfall 5: prevents infinite error loop).
 *   - All CLI calls use execFile (safe, no shell injection).
 */

const childProcess = require('node:child_process');

/**
 * Default execCommand: safe execFile wrapper.
 * Splits a command string into binary + args array (no shell interpretation).
 * Returns a promise resolving to stdout.trim().
 *
 * @param {string} cmd - Full command string (e.g. "claude task status abc123 --json")
 * @returns {Promise<string>}
 */
function defaultExecCommand(cmd) {
  return new Promise((resolve, reject) => {
    const parts = cmd.split(/\s+/);
    const bin = parts[0];
    const args = parts.slice(1);
    childProcess.execFile(bin, args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * CloudPoller — polls `claude task status <taskId> --json` at a fixed interval.
 *
 * Emits synthetic events to onLine:
 *   { event_type: 'cloud_heartbeat', session_id, ts, cloud_status: 'running' }
 *   { event_type: 'session_end', session_id, ts, cloud_status }
 *   { event_type: 'cloud_error', session_id, ts, error }
 *
 * Stops automatically when status is not 'running' or on CLI failure.
 */
class CloudPoller {
  /**
   * @param {string} taskId - Cloud task ID returned by `claude task start --remote`
   * @param {function} onLine - Callback(event) for each poll result (event is an object)
   * @param {object} [opts]
   * @param {number} [opts.pollInterval] - Poll interval in ms (default 5000)
   * @param {function} [opts._execCommand] - DI override for execCommand
   */
  constructor(taskId, onLine, opts) {
    this._taskId = taskId;
    this._onLine = onLine;
    this._interval = (opts && opts.pollInterval) || 5000;
    this._execCommand = (opts && opts._execCommand) || defaultExecCommand;
    this._timer = null;
  }

  /**
   * Start polling. Begins emitting events every _interval ms.
   */
  start() {
    this._timer = setInterval(() => {
      this._poll().catch(() => {
        // _poll already handles errors internally; catch prevents unhandled rejection
      });
    }, this._interval);
  }

  /**
   * Stop polling. Safe to call multiple times.
   */
  stop() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Execute one poll cycle. Parses CLI JSON output and emits appropriate event.
   * Stops polling when task is no longer running or on CLI failure.
   */
  async _poll() {
    const ts = new Date().toISOString();
    try {
      const raw = await this._execCommand('claude task status ' + this._taskId + ' --json');
      const parsed = JSON.parse(raw);
      const cloudStatus = parsed.status || 'unknown';

      if (cloudStatus === 'running') {
        this._onLine({
          event_type: 'cloud_heartbeat',
          session_id: this._taskId,
          ts,
          cloud_status: 'running',
        });
      } else {
        // Task completed (succeeded, failed, cancelled, or unknown status)
        this._onLine({
          event_type: 'session_end',
          session_id: this._taskId,
          ts,
          cloud_status: cloudStatus,
        });
        // CRITICAL: stop polling — task is done (Pitfall 5)
        this.stop();
      }
    } catch (err) {
      this._onLine({
        event_type: 'cloud_error',
        session_id: this._taskId,
        ts,
        error: err.message,
      });
      // CRITICAL: stop polling on CLI failure — prevents infinite error loop (Pitfall 5)
      this.stop();
    }
  }
}

/**
 * Spawn a cloud task session via `claude task start --remote`.
 * Mirrors spawnRemoteSession() from remote-ssh.cjs: synchronous kill handle,
 * async IIFE for lifecycle management.
 *
 * NOTE: `claude task start --remote` does not exist in CLI v2.1.87.
 * The async IIFE catches the CLI failure and calls onExit(sessionId, 1).
 * This is expected behavior per research (Pitfall 2).
 *
 * @param {object} opts
 * @param {string} opts.sessionId      - PDE session ID
 * @param {number|string} opts.phase   - Phase number
 * @param {number|string} opts.plan    - Plan number
 * @param {object} [opts.cloudConfig]  - Cloud configuration block
 * @param {number} [opts.cloudConfig.poll_interval] - Override poll interval (ms)
 * @param {function} opts.onLine       - Callback(sessionId, event) for each cloud event
 * @param {function} opts.onExit       - Callback(sessionId, exitCode) on completion
 * @param {object} [opts._deps]        - DI: { execCommand } for testing
 * @returns {{ kill: function }}
 */
function spawnCloudSession(opts) {
  // DI for testability — production defaults to defaultExecCommand
  const execCommand = (opts._deps && opts._deps.execCommand) || defaultExecCommand;

  // Declared in outer scope so kill() can reference poller before async IIFE settles
  let poller = null;

  // Async IIFE — runs cloud lifecycle; synchronous return below gives caller kill handle
  (async () => {
    const prompt =
      'Execute phase ' + opts.phase + ', plan ' + opts.plan +
      '. Run /gsd:execute-plan ' + opts.phase + ' ' + opts.plan + '.';

    // Launch cloud task — this CLI command does not exist in v2.1.87 but is the
    // intended interface; catches gracefully per Pitfall 2
    const taskIdRaw = await execCommand('claude task start --remote "' + prompt + '"');
    const taskId = taskIdRaw.trim();

    const pollInterval = (opts.cloudConfig && opts.cloudConfig.poll_interval) || 5000;

    poller = new CloudPoller(
      taskId,
      (event) => {
        // Forward event to caller
        opts.onLine(opts.sessionId, event);

        // Handle terminal event types
        if (event.event_type === 'session_end') {
          opts.onExit(opts.sessionId, 0);
        } else if (event.event_type === 'cloud_error') {
          opts.onExit(opts.sessionId, 1);
        }
      },
      {
        pollInterval,
        _execCommand: execCommand,
      }
    );

    poller.start();
  })().catch((err) => {
    // Top-level async IIFE error (CLI not found, task start failed, etc.)
    // Emit a cloud_error system event so callers can surface the failure
    opts.onLine(opts.sessionId, {
      event_type: 'cloud_error',
      session_id: opts.sessionId,
      ts: new Date().toISOString(),
      error: err.message,
    });
    opts.onExit(opts.sessionId, 1);
  });

  // Return synchronous kill handle — callers can kill() before poller is created
  return {
    kill: () => {
      if (poller) {
        poller.stop();
      }
    },
  };
}

module.exports = { CloudPoller, spawnCloudSession };
