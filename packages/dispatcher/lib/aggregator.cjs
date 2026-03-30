'use strict';

/**
 * aggregator.cjs — NDJSON multiplexer for PDE dispatcher
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-08
 *
 * Aggregator fans multiple per-session NDJSON streams into a single EventEmitter.
 * Each active session writes events to /tmp/pde-session-{sessionId}.ndjson.
 * One TailCursor per session polls that file every 500ms.
 * All lines are re-emitted as 'event' on the shared EventEmitter with the
 * originating sessionId tagged.
 *
 * Consumers:
 *   - Dashboard SSE endpoint (Phase 147): aggregator.on('event', ...)
 *   - tmux pane integration (Phase 148): aggregator.on('event', ...)
 *
 * Usage:
 *   const agg = new Aggregator();
 *   agg.watch('session-abc');       // start tailing
 *   agg.on('event', (sid, obj) => console.log(sid, obj));
 *   agg.unwatch('session-abc');     // session completed
 *   agg.stopAll();                  // shutdown
 */

const { EventEmitter } = require('node:events');
const path = require('node:path');
const os = require('node:os');
const { TailCursor } = require('../../../bin/lib/relay.cjs');
const { CloudPoller } = require('./remote-cloud.cjs');

/**
 * RemoteAggregator — drop-in replacement for TailCursor for cloud sessions.
 * Phase 193: wired to CloudPoller for cloud HTTP push event delivery.
 * Interface parity: constructor(filePath, onLine), start(ms, opts), stop()
 *
 * CRITICAL: onLine receives STRINGS not objects — JSON.stringify(event) must be
 * called before passing to onLine (Aggregator.watch() calls JSON.parse on receipt).
 */
class RemoteAggregator {
  constructor(filePath, onLine) {
    this._filePath = filePath;
    this._onLine = onLine;
    this._poller = null;
  }

  /**
   * @param {number} [pollInterval]  - Override poll interval in ms
   * @param {object} [opts]          - Additional options passed to CloudPoller
   */
  start(pollInterval, opts) {
    // Extract taskId from filePath: /tmp/pde-session-{taskId}.ndjson
    const taskId = path.basename(this._filePath, '.ndjson').replace('pde-session-', '');
    const onLine = this._onLine;
    this._poller = new CloudPoller(taskId, (event) => {
      onLine(JSON.stringify(event));
    }, {
      pollInterval: pollInterval || 5000,
      ...(opts || {}),
    });
    this._poller.start();
  }

  stop() {
    if (this._poller) this._poller.stop();
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
