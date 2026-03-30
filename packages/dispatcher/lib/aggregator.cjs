'use strict';

/**
 * aggregator.cjs — NDJSON multiplexer for PDE dispatcher
 *
 * Phase 144: Local CLI Dispatch
 * Phase 193: Cloud Web Backend — RemoteAggregator wired with CloudPoller
 * Satisfies: DSP-08, CLD-01
 *
 * Aggregator fans multiple per-session NDJSON streams into a single EventEmitter.
 * Each active session writes events to /tmp/pde-session-{sessionId}.ndjson.
 * One TailCursor per session polls that file every 500ms.
 * All lines are re-emitted as 'event' on the shared EventEmitter with the
 * originating sessionId tagged.
 *
 * For cloud sessions (sessionType === 'cloud'), RemoteAggregator is used instead
 * of TailCursor. It creates a CloudPoller that polls `claude task status` and
 * forwards synthetic NDJSON events to the Aggregator event bus.
 *
 * Consumers:
 *   - Dashboard SSE endpoint (Phase 147): aggregator.on('event', ...)
 *   - tmux pane integration (Phase 148): aggregator.on('event', ...)
 *
 * Usage:
 *   const agg = new Aggregator();
 *   agg.watch('session-abc');          // start tailing (local)
 *   agg.watch('session-xyz', 'cloud'); // start cloud polling
 *   agg.on('event', (sid, obj) => console.log(sid, obj));
 *   agg.unwatch('session-abc');        // session completed
 *   agg.stopAll();                     // shutdown
 */

const { EventEmitter } = require('node:events');
const path = require('node:path');
const os = require('node:os');
const { TailCursor } = require('../../../bin/lib/relay.cjs');
const { CloudPoller } = require('./remote-cloud.cjs');

/**
 * RemoteAggregator — drop-in replacement for TailCursor for cloud sessions.
 * Phase 193: Wired with CloudPoller to poll `claude task status --json`.
 * Interface parity: constructor(filePath, onLine), start(pollInterval, opts), stop()
 *
 * CRITICAL: onLine receives STRINGS not objects (Pitfall 3).
 * Aggregator.watch() passes a function(line) that calls JSON.parse(line),
 * so RemoteAggregator._onLine must forward JSON.stringify(event).
 */
class RemoteAggregator {
  /**
   * @param {string} filePath - Path like /tmp/pde-session-{taskId}.ndjson
   *                            Used to extract taskId via path.basename
   * @param {function} onLine - Callback(line: string) — must receive strings, not objects
   */
  constructor(filePath, onLine) {
    this._filePath = filePath;
    this._onLine = onLine;
    this._poller = null;
  }

  /**
   * Start polling for cloud task status.
   *
   * @param {number} [pollInterval] - Poll interval in ms (default 5000)
   * @param {object} [opts] - Additional options passed to CloudPoller (e.g. _execCommand for DI)
   */
  start(pollInterval, opts) {
    // Extract taskId from the session file path
    // e.g. /tmp/pde-session-abc123def.ndjson → 'abc123def'
    const taskId = path.basename(this._filePath, '.ndjson').replace('pde-session-', '');

    this._poller = new CloudPoller(
      taskId,
      (event) => {
        // CRITICAL: forward as JSON string — Aggregator.watch callback calls JSON.parse(line)
        this._onLine(JSON.stringify(event));
      },
      {
        pollInterval: pollInterval || 5000,
        ...(opts || {}),
      }
    );

    this._poller.start();
  }

  /**
   * Stop polling. Safe to call even if start() was never called.
   */
  stop() {
    if (this._poller) {
      this._poller.stop();
    }
  }
}

class Aggregator extends EventEmitter {
  /**
   * @param {function} [TailCursorClass] - Optional TailCursor constructor override (for testing)
   * @param {function} [RemoteAggregatorClass] - Optional RemoteAggregator constructor override (for testing)
   */
  constructor(TailCursorClass, RemoteAggregatorClass) {
    super();
    this._TailCursor = TailCursorClass || TailCursor;
    this._RemoteAggregator = RemoteAggregatorClass || RemoteAggregator;
    this._cursors = new Map(); // sessionId → TailCursor or RemoteAggregator instance
  }

  /**
   * Start tailing a session's NDJSON file. Idempotent — safe to call twice.
   *
   * @param {string} sessionId - Session identifier (e.g. "p144-abc123")
   * @param {string} [sessionType] - Optional session type: 'cloud' | 'docker' | undefined (local)
   */
  watch(sessionId, sessionType) {
    if (this._cursors.has(sessionId)) return;

    const filePath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    const isRemote = sessionType === 'cloud';
    const CursorClass = isRemote ? this._RemoteAggregator : this._TailCursor;
    const cursor = new CursorClass(filePath, (line) => {
      try {
        const parsed = JSON.parse(line);
        this.emit('event', sessionId, parsed);
      } catch (_) {
        // Silently skip unparseable lines — never crash the aggregator
      }
    });
    cursor.start(500);
    this._cursors.set(sessionId, cursor);
  }

  /**
   * Stop tailing a session. Call after session completes or fails.
   *
   * @param {string} sessionId
   */
  unwatch(sessionId) {
    const cursor = this._cursors.get(sessionId);
    if (cursor) {
      cursor.stop();
      this._cursors.delete(sessionId);
    }
  }

  /**
   * Stop all cursors and clear the map. Called on dispatcher shutdown.
   */
  stopAll() {
    for (const cursor of this._cursors.values()) {
      cursor.stop();
    }
    this._cursors.clear();
  }
}

module.exports = { Aggregator, RemoteAggregator };
