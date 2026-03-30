'use strict';

/**
 * remote-cloud.cjs — Cloud session dispatch for Phase 193 Cloud Web Backend
 *
 * Phase 193: Cloud Dispatch & State Sync
 * Satisfies: CLD-01 (cloud session dispatch), CLD-02 (cloud polling lifecycle),
 *            CLD-08 (auth probe integration)
 *
 * Provides:
 *   CloudPoller — polls claude task status via CLI, emits synthetic NDJSON events
 *   spawnCloudSession — async IIFE + synchronous kill handle (mirrors remote-ssh.cjs pattern)
 *
 * All CLI calls route through _deps.execCommand for testability.
 * The `claude task start --remote` command does not exist in current CLI (v2.1.87);
 * spawnCloudSession catches gracefully per Pitfall 2 from research.
 */

const childProcess = require('node:child_process');

/**
 * Default execCommand: safe child_process.execFile wrapper.
 * Splits command string into binary + args array (no shell injection).
 *
 * @param {string} cmd - Full command string (e.g. 'claude task status abc --json')
 * @returns {Promise<string>} Resolves to stdout.trim()
 */
function defaultExecCommand(cmd) {
  const parts = cmd.split(/\s+/);
  const bin = parts[0];
  const args = parts.slice(1);
  return new Promise((resolve, reject) => {
    childProcess.execFile(bin, args, { timeout: 30000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

/**
 * CloudPoller — polls `claude task status {taskId} --json` on an interval.
 * Emits synthetic NDJSON-compatible event objects via the onLine callback.
 *
 * Event shapes:
 *   { event_type: 'cloud_heartbeat', session_id, ts, cloud_status: 'running' }
 *   { event_type: 'session_end', session_id, ts, cloud_status: 'completed' }
 *   { event_type: 'cloud_error', session_id, ts, error: string }
 */
class CloudPoller {
  /**
   * @param {string} taskId          - Cloud task ID to poll
   * @param {function} onLine        - Callback(event object) for each poll result
   * @param {object} [opts]
   * @param {number} [opts.pollInterval=5000]  - Poll interval in ms
   * @param {function} [opts._execCommand]     - Injectable execCommand for testing
   */
  constructor(taskId, onLine, opts) {
    this._taskId = taskId;
    this._onLine = onLine;
    this._interval = (opts && opts.pollInterval) || 5000;
    this._execCommand = (opts && opts._execCommand) || defaultExecCommand;
    this._timer = null;
  }

  /**
   * Start polling. Sets interval timer that calls _poll() periodically.
   */
  start() {
    this._timer = setInterval(() => { this._poll(); }, this._interval);
  }

  /**
   * Stop polling. Clears the interval timer.
   */
  stop() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Execute one poll cycle. Called by the interval timer.
   * On error or non-running status: stops the poller.
   * @private
   */
  async _poll() {
    const ts = new Date().toISOString();
    try {
      const raw = await this._execCommand('claude task status ' + this._taskId + ' --json');
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        parsed = {};
      }
      const status = parsed.status || 'unknown';

      if (status === 'running') {
        this._onLine({
          event_type: 'cloud_heartbeat',
          session_id: this._taskId,
          ts,
          cloud_status: 'running',
        });
      } else {
        this._onLine({
          event_type: 'session_end',
          session_id: this._taskId,
          ts,
          cloud_status: status,
        });
        this.stop();
      }
    } catch (err) {
      this._onLine({
        event_type: 'cloud_error',
        session_id: this._taskId,
        ts,
        error: err.message,
      });
      this.stop();
    }
  }
}

/**
 * Spawn a cloud session via the claude CLI.
 * Mirrors spawnRemoteSession async IIFE + synchronous kill handle pattern.
 *
 * NOTE: `claude task start --remote` does not exist in CLI v2.1.87.
 * This function catches CLI failure gracefully — onExit(sessionId, 1) on error.
 *
 * @param {object} opts
 * @param {string} opts.sessionId       - PDE session ID for event correlation
 * @param {string} [opts.relayId]       - UUID relay ID (passed through)
 * @param {number|string} opts.phase    - Phase number
 * @param {number|string} opts.plan     - Plan number
 * @param {object} opts.cloudConfig     - dispatch.cloud config block
 * @param {number} [opts.cloudConfig.poll_interval] - Poll interval ms (default 5000)
 * @param {function} opts.onLine        - Callback(sessionId, eventObject)
 * @param {function} opts.onExit        - Callback(sessionId, exitCode)
 * @param {object} [opts._deps]         - DI: { execCommand } for testing
 * @returns {{ kill: function }}
 */
function spawnCloudSession(opts) {
  const execCommand = (opts._deps && opts._deps.execCommand) || defaultExecCommand;
  const sessionId = opts.sessionId;
  const cloudConfig = opts.cloudConfig || {};
  let poller = null;

  (async () => {
    try {
      const prompt = 'Run GSD plan phase=' + opts.phase + ' plan=' + opts.plan;
      const raw = await execCommand('claude task start --remote "' + prompt + '"');

      let taskId;
      try {
        const parsed = JSON.parse(raw);
        taskId = parsed.taskId || parsed.id || raw.trim();
      } catch (_) {
        taskId = raw.trim();
      }

      // Emit synthetic session_start with source so dashboard shows [C] badge (DSH-01 integration)
      opts.onLine(sessionId, {
        type: 'session_start',
        event_type: 'session_start',
        session_id: sessionId,
        source: 'remote-cloud',
        ts: new Date().toISOString(),
      });

      poller = new CloudPoller(taskId, (event) => {
        opts.onLine(sessionId, event);
        if (event.event_type === 'session_end') {
          opts.onExit(sessionId, 0);
        } else if (event.event_type === 'cloud_error') {
          opts.onExit(sessionId, 1);
        }
      }, {
        pollInterval: cloudConfig.poll_interval || 5000,
        _execCommand: execCommand,
      });
      poller.start();
    } catch (err) {
      opts.onLine(sessionId, {
        event_type: 'cloud_error',
        session_id: sessionId,
        ts: new Date().toISOString(),
        error: err.message,
      });
      opts.onExit(sessionId, 1);
    }
  })().catch(() => {
    opts.onExit(sessionId, 1);
  });

  return {
    kill: () => {
      if (poller) poller.stop();
    },
  };
}

module.exports = { CloudPoller, spawnCloudSession };
