'use strict';

/**
 * registry.cjs — Crash-recoverable session registry for PDE parallel dispatch
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-07, DSP-09
 *
 * Uses an in-memory Map as source of truth with atomic JSON flush to
 * .planning/dispatcher.pids on every mutation. On restart, reads JSON file
 * and rebuilds Map, probing each PID with process.kill(pid, 0) to detect
 * stale entries.
 *
 * Atomic write: write to .planning/dispatcher.pids.tmp, then fs.renameSync.
 * Crash-safe: rename is atomic on macOS/Linux (POSIX guarantee).
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
 *       "status": "running",   // "running" | "failed" | "complete" | "orphaned"
 *       "startedAt": "2026-03-26T..."
 *     }
 *   }
 * }
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * SessionRegistry — in-memory Map + JSON file for crash recovery.
 */
class SessionRegistry {
  /**
   * @param {string} projectRoot - Absolute path to the git repo root
   */
  constructor(projectRoot) {
    this._root = projectRoot;
    this._pidFile = path.join(projectRoot, '.planning', 'dispatcher.pids');
    this._tmpFile = this._pidFile + '.tmp';
    this._map = new Map();
  }

  /**
   * Load sessions from disk; mark entries with dead PIDs as orphaned.
   * Call once at dispatcher startup. No-op if file does not exist.
   *
   * @returns {SessionRegistry} this (chainable)
   */
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

  /**
   * Register a new session. Flushes to disk immediately.
   *
   * @param {string} sessionId - Unique session identifier (e.g. "p144-abc123")
   * @param {{ pid: number, phase: number, plan: number, worktreePath: string, branch: string }} entry
   */
  register(sessionId, entry) {
    this._map.set(sessionId, {
      ...entry,
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    this._flush();
  }

  /**
   * Update session fields. Merges updates into existing entry. Flushes to disk.
   * No-op if sessionId not found.
   *
   * @param {string} sessionId
   * @param {object} updates - Fields to merge into the entry
   */
  update(sessionId, updates) {
    const existing = this._map.get(sessionId);
    if (!existing) return;
    this._map.set(sessionId, { ...existing, ...updates });
    this._flush();
  }

  /**
   * Remove a session from the registry. Flushes to disk.
   *
   * @param {string} sessionId
   */
  remove(sessionId) {
    this._map.delete(sessionId);
    this._flush();
  }

  /**
   * Get a session entry by ID.
   *
   * @param {string} sessionId
   * @returns {object|undefined}
   */
  get(sessionId) {
    return this._map.get(sessionId);
  }

  /**
   * Get all sessions as a new Map (copy, not reference).
   *
   * @returns {Map}
   */
  getAll() {
    return new Map(this._map);
  }

  /**
   * Check whether any running session is assigned to the given phase.
   * Used to prevent duplicate phase assignment.
   *
   * @param {number} phaseNumber
   * @returns {boolean}
   */
  hasPhase(phaseNumber) {
    for (const entry of this._map.values()) {
      if (entry.phase === phaseNumber && entry.status === 'running') return true;
    }
    return false;
  }

  /**
   * Count sessions with status === 'running'.
   *
   * @returns {number}
   */
  activeCount() {
    let count = 0;
    for (const entry of this._map.values()) {
      if (entry.status === 'running') count++;
    }
    return count;
  }

  /**
   * Atomic flush to disk.
   * Writes to .tmp file first, then renames to target (POSIX atomic rename).
   *
   * @private
   */
  _flush() {
    const data = JSON.stringify({ sessions: Object.fromEntries(this._map) }, null, 2);
    fs.writeFileSync(this._tmpFile, data, 'utf8');
    fs.renameSync(this._tmpFile, this._pidFile);
  }
}

/**
 * Check if a PID is alive using process.kill(pid, 0).
 * Returns true if alive (or process exists but unowned), false if dead (ESRCH).
 *
 * @param {number} pid
 * @returns {boolean}
 */
function _isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // ESRCH = no such process (dead)
    // EPERM = process exists but we can't signal it (alive)
    return e.code !== 'ESRCH';
  }
}

module.exports = { SessionRegistry };
