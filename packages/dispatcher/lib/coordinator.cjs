'use strict';

/**
 * coordinator.cjs — DispatchCoordinator: full session lifecycle orchestrator
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-04, DSP-05
 *
 * Ties together queue, registry, spawn, worktree, merge, and aggregator into a
 * single orchestrated lifecycle. The --parallel flag in pde-tools routes to this
 * class; without it, the existing single-session code path is completely untouched.
 *
 * Session lifecycle:
 *   dispatch(phase, plan)
 *     → acquireLock (mutual exclusion)
 *     → hasPhase check (reject duplicates)
 *     → createWorktree (git worktree add)
 *     → registry.register
 *     → releaseLock
 *     → aggregator.watch
 *     → queue.add(_runSession)
 *
 *   _runSession → spawnSession → on exit:
 *     exit 0: mergeSession → recalculateFromArtifacts → removeWorktree → deleteBranch → registry.remove
 *     exit ≠0: write FAILED.json → registry.update(status:'failed') — preserve worktree (DSP-09)
 *     exit 0 + merge needsHuman: registry.update(status:'merge_failed') — preserve worktree
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { spawnSession } = require('./spawn.cjs');
const { SessionRegistry } = require('./registry.cjs');
const { ConcurrencyQueue } = require('./queue.cjs');
const { Aggregator } = require('./aggregator.cjs');
const { createWorktree, removeWorktree, deleteBranch } = require('./worktree.cjs');
const { mergeSession, recalculateFromArtifacts } = require('./merge.cjs');
const { acquireLock, releaseLock } = require('./lock.cjs');

class DispatchCoordinator {
  /**
   * @param {string} projectRoot - Absolute path to the git repo root
   * @param {object} [opts]
   * @param {number} [opts.maxConcurrent=3]   - Max simultaneous sessions
   * @param {string} [opts.pluginDir]          - Absolute path to PDE plugin directory
   * @param {object} [opts._deps]              - Dependency injection for testing only.
   *   Shape: { spawnSession, createWorktree, removeWorktree, deleteBranch,
   *            mergeSession, recalculateFromArtifacts, acquireLock, releaseLock }
   *   When omitted, production module-level requires are used.
   */
  constructor(projectRoot, opts) {
    const options = opts || {};
    this._root = projectRoot;
    this._registry = new SessionRegistry(projectRoot).loadFromDisk();
    this._queue = new ConcurrencyQueue(options.maxConcurrent || 3);
    this._aggregator = new Aggregator();
    this._pluginDir = options.pluginDir || DispatchCoordinator.resolvePluginDir();
    this._sessions = new Map(); // sessionId → { pid, kill }

    // Dependency injection — allows test doubles without vi.mock() hoisting.
    // Production code never passes _deps; tests inject stubs here.
    const deps = options._deps || {};
    this._spawnSession = deps.spawnSession || spawnSession;
    this._createWorktree = deps.createWorktree || createWorktree;
    this._removeWorktree = deps.removeWorktree || removeWorktree;
    this._deleteBranch = deps.deleteBranch || deleteBranch;
    this._mergeSession = deps.mergeSession || mergeSession;
    this._recalculateFromArtifacts = deps.recalculateFromArtifacts || recalculateFromArtifacts;
    this._acquireLock = deps.acquireLock || acquireLock;
    this._releaseLock = deps.releaseLock || releaseLock;
  }

  /**
   * Resolve the PDE plugin directory from installed_plugins.json.
   * Falls back to CLAUDE_PLUGIN_ROOT env var or ~/.claude/pde.
   *
   * @returns {string} Absolute path to plugin directory
   */
  static resolvePluginDir() {
    const pluginsFile = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
    try {
      const raw = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
      // installed_plugins.json format: { "plugin-name": { installPath: "..." }, ... }
      for (const [key, entry] of Object.entries(raw)) {
        if (key.toLowerCase().includes('pde') && entry && entry.installPath) {
          return entry.installPath;
        }
      }
      // Fallback: check any entry with 'pde-tools' or 'platform' in installPath
      for (const entry of Object.values(raw)) {
        if (entry && entry.installPath && (
          entry.installPath.includes('pde') ||
          entry.installPath.toLowerCase().includes('platform')
        )) {
          return entry.installPath;
        }
      }
    } catch (_) {
      // File not found or malformed — use env var fallback
    }
    return process.env.CLAUDE_PLUGIN_ROOT || path.join(os.homedir(), '.claude', 'pde');
  }

  /**
   * Dispatch a single phase/plan session.
   * Acquires lock, checks for duplicate phase assignment, creates worktree,
   * registers session, releases lock, then queues the spawn.
   *
   * @param {number|string} phase - Phase number (e.g. 144)
   * @param {number|string} plan  - Plan number (e.g. 1)
   * @returns {Promise<string>} Resolves to sessionId immediately after queuing
   */
  async dispatch(phase, plan) {
    const phaseNum = typeof phase === 'string' ? parseInt(phase, 10) : phase;

    // 1. Acquire dispatcher lock
    const lockResult = this._acquireLock(this._root);
    if (!lockResult.acquired) {
      throw new Error(`Another dispatcher is running (PID: ${lockResult.pid || 'unknown'})`);
    }

    try {
      // 2. Reject duplicate phase assignment
      if (this._registry.hasPhase(phaseNum)) {
        throw new Error(`Phase ${phaseNum} already has a running session`);
      }

      // 3. Generate session ID
      const sessionId = `p${phaseNum}-${plan}-${crypto.randomUUID().slice(0, 8)}`;

      // 4. Create git worktree
      const { worktreePath, branch } = this._createWorktree(this._root, sessionId);

      // 5. Register in registry (with placeholder pid 0 — updated after spawn)
      this._registry.register(sessionId, {
        pid: 0,
        phase: phaseNum,
        plan: typeof plan === 'string' ? parseInt(plan, 10) : plan,
        worktreePath,
        branch,
      });

      // 6. Release lock before spawning (spawn is slow; don't hold lock)
      this._releaseLock(this._root);

      // 7. Start aggregator watch for this session's NDJSON file
      this._aggregator.watch(sessionId);

      // 8. Queue the session — runs when a concurrency slot opens
      this._queue.add(() => this._runSession(sessionId, phaseNum, plan, worktreePath, branch));

      return sessionId;
    } catch (err) {
      // Release lock if we threw after acquiring but before the try block's releaseLock
      try { this._releaseLock(this._root); } catch (_) {}
      throw err;
    }
  }

  /**
   * Dispatch multiple plans in parallel (wave-based).
   * All plans are dispatched concurrently — ConcurrencyQueue limits simultaneous
   * spawned processes.
   *
   * @param {Array<{phase: number, plan: number}>} plans
   * @returns {Promise<Array>} Promise.allSettled result
   */
  async dispatchWave(plans) {
    const dispatches = plans.map(({ phase, plan }) => this.dispatch(phase, plan));
    return Promise.allSettled(dispatches);
  }

  /**
   * Internal: spawn and manage a single session. Returns a Promise that
   * resolves when the session completes (success or failure).
   *
   * @param {string} sessionId
   * @param {number} phase
   * @param {number|string} plan
   * @param {string} worktreePath
   * @param {string} branch
   * @returns {Promise<void>}
   * @private
   */
  _runSession(sessionId, phase, plan, worktreePath, branch) {
    return new Promise((resolve) => {
      const handle = this._spawnSession({
        worktreePath,
        sessionId,
        phase,
        plan,
        pluginDir: this._pluginDir,
        onLine: (sid, event) => {
          // Forward events to aggregator for dashboard/tmux consumers
          this._aggregator.emit('event', sid, event);
        },
        onExit: (sid, exitCode) => {
          this._handleExit(sid, exitCode, worktreePath, branch).then(resolve);
        },
      });

      // Update registry with actual PID
      this._registry.update(sessionId, { pid: handle.pid });
      this._sessions.set(sessionId, handle);
    });
  }

  /**
   * Handle session exit: merge on success, preserve on failure.
   *
   * @param {string} sessionId
   * @param {number} exitCode
   * @param {string} worktreePath
   * @param {string} branch
   * @returns {Promise<void>}
   * @private
   */
  async _handleExit(sessionId, exitCode, worktreePath, branch) {
    // Stop tailing the NDJSON file for this session
    this._aggregator.unwatch(sessionId);
    this._sessions.delete(sessionId);

    if (exitCode === 0) {
      // Success path: merge → recalculate → cleanup
      const result = this._mergeSession(this._root, sessionId);
      if (result.ok) {
        this._recalculateFromArtifacts(this._root);
        this._removeWorktree(this._root, sessionId);
        this._deleteBranch(this._root, branch);
        this._registry.remove(sessionId);
      } else {
        // merge returned needsHuman — preserve worktree for manual resolution
        this._registry.update(sessionId, {
          status: 'merge_failed',
          conflicts: result.conflicts || [],
        });
      }
    } else {
      // Failure path: write FAILED.json, preserve worktree (DSP-09)
      const planningDir = path.join(worktreePath, '.planning', 'phases');
      try {
        fs.mkdirSync(planningDir, { recursive: true });
      } catch (_) {}
      const failedPath = path.join(planningDir, `FAILED-${sessionId}.json`);
      fs.writeFileSync(
        failedPath,
        JSON.stringify(
          { sessionId, exitCode, failedAt: new Date().toISOString() },
          null,
          2
        )
      );
      this._registry.update(sessionId, { status: 'failed', exitCode });
      // Do NOT remove worktree — preserve for debugging
    }
  }

  /**
   * Kill all running sessions and stop aggregator tailing.
   * Call on process exit or SIGINT.
   */
  shutdown() {
    for (const { kill } of this._sessions.values()) {
      kill();
    }
    this._aggregator.stopAll();
  }

  /**
   * Aggregator instance — subscribe to 'event' for dashboard SSE or tmux output.
   *
   * @type {Aggregator}
   */
  get aggregator() {
    return this._aggregator;
  }
}

module.exports = { DispatchCoordinator };
