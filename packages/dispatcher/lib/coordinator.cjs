'use strict';

/**
 * coordinator.cjs — DispatchCoordinator: full session lifecycle orchestrator
 *
 * Phase 144: Local CLI Dispatch
 * Phase 145: Agent SDK Orchestrator — DAG analysis, file overlap, failure summaries, conflict triage
 * Phase 146: Remote Dispatch — routeSession, spawnRemoteSession, readPlanAutonomous
 * Satisfies: DSP-04, DSP-05, SDK-02, SDK-03, SDK-04, SDK-05, RMT-01, RMT-02, RMT-03, RMT-04
 *
 * Ties together queue, registry, spawn, worktree, merge, and aggregator into a
 * single orchestrated lifecycle. The --parallel flag in pde-tools routes to this
 * class; without it, the existing single-session code path is completely untouched.
 *
 * Session lifecycle:
 *   dispatch(phase, plan, opts)
 *     → readPlanAutonomous (or opts.isAutonomous)
 *     → routeSession (before lock — routing is async, lock window must stay narrow)
 *     → acquireLock (mutual exclusion)
 *     → hasPhase check (reject duplicates)
 *     → createWorktree (git worktree add)
 *     → registry.register (includes backend + remoteHost)
 *     → releaseLock
 *     → aggregator.watch
 *     → queue.add(_runSession | _runRemoteSession)
 *
 *   dispatchWave(plans)
 *     → analyzeDag (once, cached in this._dag)
 *     → checkFileOverlap → emit overlap_warning events
 *     → dispatch each plan concurrently
 *
 *   _runSession → spawnSession → on exit:
 *     exit 0: mergeSession → recalculateFromArtifacts → removeWorktree → deleteBranch → registry.remove
 *     exit 0 + merge needsHuman: registry.update(status:'merge_failed') → triageConflicts → registry.update(conflictTriage)
 *     exit ≠0: write FAILED.json → registry.update(status:'failed') → summarizeFailure → emit failure_summary
 *
 *   _runRemoteSession → spawnRemoteSession (SSH) → on exit: same _handleExit as _runSession
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
const { analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts } = require('./orchestrator.cjs');

// Phase 146: Remote dispatch
const { routeSession } = require('./remote-router.cjs');
const { spawnRemoteSession } = require('./remote-ssh.cjs');

// Phase 191: Docker container dispatch
const { spawnDockerSession } = require('../../cloud-adapter/index.cjs');

// Phase 148: tmux pane integration fan-out writer
const { TmuxFanout } = require('./tmux-fanout.cjs');

/**
 * Read autonomous: true/false from PLAN.md YAML frontmatter.
 * Pure static regex parse -- same pattern as orchestrator.cjs checkFileOverlap.
 *
 * @param {string} projectRoot
 * @param {number} phase
 * @param {number|string} plan
 * @returns {boolean}
 */
function readPlanAutonomous(projectRoot, phase, plan) {
  const phasesDir = path.join(projectRoot, '.planning', 'phases');
  const padded = String(phase).padStart(3, '0');
  const planPadded = String(plan).padStart(2, '0');
  try {
    const phaseDirs = fs.readdirSync(phasesDir).filter(d => d.startsWith(padded + '-'));
    if (phaseDirs.length === 0) return false;
    const planFile = path.join(phasesDir, phaseDirs[0], padded + '-' + planPadded + '-PLAN.md');
    const content = fs.readFileSync(planFile, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return false;
    return /^autonomous:\s*true/m.test(fmMatch[1]);
  } catch (_) {
    return false;
  }
}

class DispatchCoordinator {
  /**
   * @param {string} projectRoot - Absolute path to the git repo root
   * @param {object} [opts]
   * @param {number} [opts.maxConcurrent=3]   - Max simultaneous sessions
   * @param {string} [opts.pluginDir]          - Absolute path to PDE plugin directory
   * @param {object} [opts.config]             - Project config object (config.json). Used to extract
   *   dispatch.remote block for remote routing.
   * @param {object} [opts._deps]              - Dependency injection for testing only.
   *   Shape: { spawnSession, createWorktree, removeWorktree, deleteBranch,
   *            mergeSession, recalculateFromArtifacts, acquireLock, releaseLock,
   *            analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts,
   *            spawnRemoteSession, routeSession, readPlanAutonomous }
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

    // Phase 152: Relay process tracking — one relay.cjs per local session (RLY-01)
    this._relays = new Map();   // sessionId → { pid, kill }
    this._relayIds = new Map(); // sessionId → relayId (UUID) — for aggregator unwatch

    // Dependency injection — allows test doubles without vi.mock() hoisting.
    // Production code never passes _deps; tests inject stubs here.
    const deps = options._deps || {};

    // Phase 148: tmux fan-out writer — starts immediately, stops on shutdown
    const TmuxFanoutClass = deps.TmuxFanout || TmuxFanout;
    this._tmuxFanout = new TmuxFanoutClass(this._aggregator, this._registry);
    this._tmuxFanout.start();
    this._spawnSession = deps.spawnSession || spawnSession;
    this._createWorktree = deps.createWorktree || createWorktree;
    this._removeWorktree = deps.removeWorktree || removeWorktree;
    this._deleteBranch = deps.deleteBranch || deleteBranch;
    this._mergeSession = deps.mergeSession || mergeSession;
    this._recalculateFromArtifacts = deps.recalculateFromArtifacts || recalculateFromArtifacts;
    this._acquireLock = deps.acquireLock || acquireLock;
    this._releaseLock = deps.releaseLock || releaseLock;

    // Phase 145: SDK orchestrator functions — injectable for testability
    this._analyzeDag = deps.analyzeDag || analyzeDag;
    this._checkFileOverlap = deps.checkFileOverlap || checkFileOverlap;
    this._summarizeFailure = deps.summarizeFailure || summarizeFailure;
    this._triageConflicts = deps.triageConflicts || triageConflicts;
    this._dag = null; // cached DAG analysis result — computed once per coordinator lifetime

    // Phase 152: Injectable child process spawner for relay (avoids vi.mock CJS hoisting)
    this._spawnChildProcess = deps.spawnChildProcess || require('node:child_process').spawn;

    // Phase 146: Remote dispatch
    this._spawnRemoteSession = deps.spawnRemoteSession || spawnRemoteSession;
    this._routeSession = deps.routeSession || routeSession;
    this._remoteConfig = (options.config && options.config.dispatch && options.config.dispatch.remote) || null;
    this._readPlanAutonomous = deps.readPlanAutonomous || readPlanAutonomous;

    // Phase 191: Docker container dispatch
    this._spawnDockerSession = deps.spawnDockerSession || spawnDockerSession;
    this._dockerConfig = (options.config && options.config.dispatch && options.config.dispatch.docker) || null;
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
   * @param {object} [opts]       - Optional dispatch options
   * @param {boolean} [opts.isAutonomous] - Override autonomous detection (skip PLAN.md parse)
   * @returns {Promise<string>} Resolves to sessionId immediately after queuing
   */
  async dispatch(phase, plan, opts) {
    const phaseNum = typeof phase === 'string' ? parseInt(phase, 10) : phase;
    const planNum = typeof plan === 'string' ? parseInt(plan, 10) : plan;

    // Phase 146: Determine backend BEFORE lock (routing is async, lock window must stay narrow)
    const isAutonomous = (opts && opts.isAutonomous !== undefined)
      ? opts.isAutonomous
      : this._readPlanAutonomous(this._root, phaseNum, planNum);
    const backend = await this._routeSession({
      isAutonomous,
      remoteConfig: this._remoteConfig,
      dockerConfig: this._dockerConfig,
    });

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

      // Phase 152 (RLY-01): Pre-assign relay UUID for NDJSON/relay correlation (D-01, D-02)
      const relayId = crypto.randomUUID();

      // 4. Create git worktree
      const { worktreePath, branch } = this._createWorktree(this._root, sessionId);

      // 5. Register in registry (with placeholder pid 0 — updated after spawn)
      this._registry.register(sessionId, {
        pid: 0,
        phase: phaseNum,
        plan: planNum,
        worktreePath,
        branch,
        backend,
        remoteHost: (backend === 'ssh' && this._remoteConfig) ? this._remoteConfig.host : undefined,
      });

      // 6. Release lock before spawning (spawn is slow; don't hold lock)
      this._releaseLock(this._root);

      // Phase 152: Store relayId mapping for aggregator unwatch in _handleExit
      this._relayIds.set(sessionId, relayId);

      // 7. Start aggregator watch — use relayId (UUID) so NDJSON path aligns with relay.cjs (D-11)
      this._aggregator.watch(relayId);

      // Phase 152 (RLY-01): Spawn relay immediately (synchronous) so it is available before session
      // starts writing events. Keyed by coordinator sessionId for lookup in _handleExit.
      if (backend !== 'ssh' && backend !== 'docker') {
        const relayHandle = this._spawnRelay(relayId);
        this._relays.set(sessionId, relayHandle || { pid: null, kill: () => {} });
      }

      // 8. Queue the session — runs when a concurrency slot opens
      if (backend === 'ssh') {
        this._queue.add(() => this._runRemoteSession(sessionId, phaseNum, plan, worktreePath, branch, relayId));
      } else if (backend === 'docker') {
        this._queue.add(() => this._runDockerSession(sessionId, phaseNum, plan, worktreePath, branch, relayId));
      } else {
        this._queue.add(() => this._runSession(sessionId, phaseNum, plan, worktreePath, branch, relayId));
      }

      return sessionId;
    } catch (err) {
      // Release lock if we threw after acquiring but before the try block's releaseLock
      try { this._releaseLock(this._root); } catch (_) {}
      throw err;
    }
  }

  /**
   * Dispatch multiple plans in parallel (wave-based).
   * Runs DAG analysis (once, cached) and file overlap check before dispatching.
   * Emits overlap_warning events via aggregator if overlapping files are detected.
   * All plans are dispatched concurrently — ConcurrencyQueue limits simultaneous
   * spawned processes.
   *
   * @param {Array<{phase: number, plan: number}>} plans
   * @returns {Promise<Array>} Promise.allSettled result
   */
  async dispatchWave(plans) {
    // Phase 145 (SDK-02): Run DAG analysis once per coordinator lifetime (cached)
    if (!this._dag) {
      try {
        this._dag = await this._analyzeDag(this._root);
      } catch (_) {
        this._dag = { parallelizable: [], unsafe: [] };
      }
    }

    // Phase 145 (SDK-03): Check for file overlap before dispatching
    const phases = plans.map(p => typeof p.phase === 'string' ? parseInt(p.phase, 10) : p.phase);
    const overlap = this._checkFileOverlap(this._root, phases);
    if (overlap.overlapping.length > 0) {
      for (const pair of overlap.overlapping) {
        this._aggregator.emit('event', 'system', {
          type: 'system',
          subtype: 'overlap_warning',
          phases: pair.phases,
          files: pair.files,
        });
      }
    }

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
  _runSession(sessionId, phase, plan, worktreePath, branch, relayId) {
    return new Promise((resolve) => {
      const handle = this._spawnSession({
        worktreePath,
        sessionId,
        relayId,  // Phase 152: UUID for PDE_SESSION_ID env var (D-02)
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
   * Internal: spawn and manage a remote SSH session. Returns a Promise that
   * resolves when the session completes (success or failure).
   *
   * @param {string} sessionId
   * @param {number} phase
   * @param {number|string} plan
   * @param {string} worktreePath - Local worktree path (used for merge after fetch)
   * @param {string} branch
   * @param {string} [relayId] - UUID relay ID for NDJSON correlation (matches spawn.cjs pattern)
   * @returns {Promise<void>}
   * @private
   */
  _runRemoteSession(sessionId, phase, plan, worktreePath, branch, relayId) {
    return new Promise((resolve) => {
      const handle = this._spawnRemoteSession({
        sessionId,
        relayId,
        phase,
        plan,
        branch,
        projectRoot: this._root,
        remoteConfig: this._remoteConfig,
        onLine: (sid, event) => {
          this._aggregator.emit('event', sid, event);
        },
        onExit: (sid, exitCode) => {
          this._handleExit(sid, exitCode, worktreePath, branch).then(resolve);
        },
      });
      // Note: no pid update for remote sessions — SSH has no local PID. kill() uses ssh.dispose()
      this._sessions.set(sessionId, handle);
    });
  }

  /**
   * Internal: spawn and manage a Docker container session. Returns a Promise that
   * resolves when the container completes (success or failure).
   *
   * Docker sessions write NDJSON to local /tmp/pde-session-{relayId}.ndjson,
   * so TailCursor is used (not RemoteAggregator). No relay is spawned — container
   * manages its own lifecycle via kill().
   *
   * @param {string} sessionId
   * @param {number} phase
   * @param {number|string} plan
   * @param {string} worktreePath
   * @param {string} branch
   * @param {string} [relayId] - UUID relay ID for NDJSON correlation
   * @returns {Promise<void>}
   * @private
   */
  _runDockerSession(sessionId, phase, plan, worktreePath, branch, relayId) {
    return new Promise((resolve) => {
      const handle = this._spawnDockerSession({
        sessionId,
        relayId,
        phase,
        plan,
        worktreePath,
        pluginDir: this._pluginDir,
        dockerConfig: this._dockerConfig || {},
        onLine: (sid, event) => {
          this._aggregator.emit('event', sid, event);
        },
        onExit: (sid, exitCode) => {
          this._handleExit(sid, exitCode, worktreePath, branch).then(resolve);
        },
      });
      // Note: no pid update for docker — container has no local PID. kill() uses containerInstance.kill()
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
    // Phase 152: Stop tailing using relayId (UUID) — aligns with watch(relayId) call in dispatch
    const relayId = this._relayIds.get(sessionId);
    this._aggregator.unwatch(relayId || sessionId);
    this._relayIds.delete(sessionId);
    this._sessions.delete(sessionId);

    // Phase 152: Kill relay process for this session (D-09)
    const relayHandle = this._relays.get(sessionId);
    if (relayHandle) {
      relayHandle.kill();
      this._relays.delete(sessionId);
    }

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

        // Phase 145 (SDK-05): Triage conflicts (non-blocking — don't let triage failure break exit handler)
        try {
          const triage = await this._triageConflicts(result.conflicts || [], this._root);
          this._registry.update(sessionId, { conflictTriage: triage });
        } catch (_) {
          // Triage failed — non-critical
        }
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

      // Phase 145 (SDK-04): Generate failure summary (non-blocking — don't let summary failure break exit handler)
      try {
        const summary = await this._summarizeFailure(sessionId);
        this._aggregator.emit('event', sessionId, {
          type: 'system',
          subtype: 'failure_summary',
          sessionId,
          summary,
        });
      } catch (_) {
        // Summary generation failed — non-critical, do not block
      }
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
    // Phase 152: Kill all relay processes
    for (const { kill } of this._relays.values()) {
      kill();
    }
    this._aggregator.stopAll();
    this._tmuxFanout.stop();
  }

  /**
   * Spawn a relay.cjs child process for a session. Returns handle or null.
   * Per D-04: detached + unref. Per D-06: returns null when PDE_REMOTE not set.
   * Per D-07: all errors caught — relay failures never surface.
   *
   * Required env vars (set on dispatcher machine, not Vercel):
   *   PDE_REMOTE      — Dashboard ingest URL (e.g. https://your-dashboard.vercel.app/api/ingest).
   *                     When absent, relay is silently skipped.
   *   PDE_RELAY_TOKEN — Bearer token matching the dashboard's PDE_RELAY_TOKEN env var.
   *                     When absent, ingest route rejects with 401.
   *
   * @param {string} sessionId - UUID v4 for relay correlation
   * @returns {{ pid: number, kill: Function }|null}
   * @private
   */
  _spawnRelay(sessionId) {
    const ingestUrl   = process.env.PDE_REMOTE || '';
    const bearerToken = process.env.PDE_RELAY_TOKEN || '';
    if (!ingestUrl) return null; // D-06: no dashboard — skip silently

    const relayScript = path.resolve(__dirname, '..', '..', '..', 'bin', 'lib', 'relay.cjs');

    try {
      const child = this._spawnChildProcess(
        process.execPath,
        [relayScript, sessionId, ingestUrl, bearerToken],
        {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
          env: { ...process.env },
        }
      );
      child.unref();
      return {
        pid: child.pid,
        kill: (sig = 'SIGTERM') => { try { child.kill(sig); } catch (_) {} },
      };
    } catch (_) {
      return null; // D-07: relay spawn failure — never surfaces
    }
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

module.exports = { DispatchCoordinator, readPlanAutonomous };
