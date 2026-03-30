'use strict';

/**
 * tmux-fanout.cjs — NDJSON fan-out writer for tmux pane integration
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-01
 *
 * Subscribes to the coordinator's Aggregator EventEmitter and writes
 * enriched NDJSON lines to a combined file for multi-session tmux pane
 * consumption. Each line contains all original event fields plus:
 *   _pde_session_id    — originating session identifier
 *   _pde_session_source — 'L' (local) or 'R' (ssh/managed)
 *   _pde_color_index   — 0-5, modulo-6 color slot for the session
 *
 * Usage:
 *   const { TmuxFanout, FANOUT_PATH } = require('./tmux-fanout.cjs');
 *   const fanout = new TmuxFanout(aggregator, registry);
 *   fanout.start();
 *   // ...coordinator running...
 *   fanout.stop();
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Path to the combined multi-session NDJSON output file.
 * All sessions fan out to this single file for tmux tail consumption.
 */
const FANOUT_PATH = path.join(os.tmpdir(), 'pde-multi-session.ndjson');

/**
 * Path to the tmux filter control file.
 * Tmux pane scripts read this file to filter which sessions to display.
 */
const FILTER_PATH = path.join(os.tmpdir(), 'pde-tmux-filter.txt');

/**
 * Map backend type to a single-character source label.
 * Defaults to 'L' when backend is undefined (unknown session — assume local).
 *
 * @param {string|undefined} backend - 'local', 'docker', 'ssh', 'managed', or undefined
 * @returns {'L'|'D'|'R'}
 */
function sourceLabel(backend) {
  if (backend === undefined || backend === null) return 'L';
  if (backend === 'local') return 'L';
  if (backend === 'docker') return 'D';
  if (backend === 'cloud') return 'C';
  return 'R';
}

/**
 * TmuxFanout — subscribes to aggregator 'event' emissions and writes
 * enriched NDJSON lines to FANOUT_PATH (or a test-override path).
 */
class TmuxFanout {
  /**
   * @param {import('node:events').EventEmitter} aggregator - Aggregator instance to subscribe to
   * @param {{ get: (id: string) => object|undefined }} registry - SessionRegistry with get(sessionId)
   * @param {object} [opts] - Optional configuration
   * @param {string} [opts.fanoutPath] - Override FANOUT_PATH for testing
   */
  constructor(aggregator, registry, opts) {
    this._aggregator = aggregator;
    this._registry = registry;
    this._fanoutPath = (opts && opts.fanoutPath) || FANOUT_PATH;
    this._sessionIndex = new Map(); // sessionId → color index (0-5)
    this._nextIndex = 0;
    this._handler = null;
  }

  /**
   * Start the fan-out writer.
   * Truncates FANOUT_PATH to empty and registers the 'event' listener.
   */
  start() {
    // Truncate the output file to empty
    try {
      fs.writeFileSync(this._fanoutPath, '', 'utf8');
    } catch (_) {
      // Never crash the coordinator due to file system issues
    }

    // Build the event handler
    this._handler = (sessionId, event) => {
      // Assign a stable color index to each session (modulo 6)
      if (!this._sessionIndex.has(sessionId)) {
        this._sessionIndex.set(sessionId, (this._nextIndex++) % 6);
      }

      // Look up backend type for source label
      const entry = this._registry.get(sessionId);

      // Build the enriched event object
      const enriched = {
        ...event,
        _pde_session_id: sessionId,
        _pde_session_source: sourceLabel(entry && entry.backend),
        _pde_color_index: this._sessionIndex.get(sessionId),
      };

      // Append enriched line to the fanout file
      try {
        fs.appendFileSync(this._fanoutPath, JSON.stringify(enriched) + '\n', 'utf8');
      } catch (_) {
        // Never crash the coordinator due to file system issues
      }
    };

    // Register the handler on the aggregator
    this._aggregator.on('event', this._handler);
  }

  /**
   * Stop the fan-out writer.
   * Removes the 'event' listener from the aggregator.
   */
  stop() {
    if (this._handler) {
      this._aggregator.off('event', this._handler);
      this._handler = null;
    }
  }
}

module.exports = { TmuxFanout, FANOUT_PATH, FILTER_PATH, sourceLabel };
