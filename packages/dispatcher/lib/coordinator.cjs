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

// Phase 193: Cloud web backend dispatch
const { spawnCloudSession } = require('./remote-cloud.cjs');

// Phase 192: Git-based state sync
const { pushPlanningState, fetchPlanningState, mergePlanningFromCloud } = require('./sync.cjs');

// Phase 194: Intelligent routing classifier
const { classifyTaskRouting } = require('./classify.cjs');

// Phase 197: Session JSONL persistence and restore for cross-host resume
const { persistSession: _persistSessionDefault, restoreSession: _restoreSessionDefault } = require('./session-persist.cjs');

// Phase 148: tmux pane integration fan-out writer
const { TmuxFanout } = require('./tmux-fanout.cjs');

/**
 * Read full PLAN.md frontmatter metadata including autonomous, estimated_minutes, agent_type, wave.
 * Pure static regex parse — extends the old readPlanAutonomous() pattern.
 *
 * Phase 194: Replaces readPlanAutonomous() as the primary metadata reader.
 *
 * @param {string} projectRoot
 * @param {number} phase
 * @param {number|string} plan
 * @returns {{ autonomous: boolean, estimated_minutes: number, agent_type: string|null, wave: number|null }}
 */
function readPlanMetadata(projectRoot, phase, plan) {
  const phasesDir = path.join(projectRoot, '.planning', 'phases');
  const padded = String(phase).padStart(3, '0');
  const planPadded = String(plan).padStart(2, '0');
  const defaults = { autonomous: false, estimated_minutes: 30, agent_type: null, wave: null };
  try {
    const phaseDirs = fs.readdirSync(phasesDir).filter(d => d.startsWith(padded + '-'));
    if (phaseDirs.length === 0) return defaults;
    const planFile = path.join(phasesDir, phaseDirs[0], padded + '-' + planPadded + '-PLAN.md');
    const content = fs.readFileSync(planFile, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return defaults;
    const fm = fmMatch[1];
    const autonomous = /^autonomous:\s*true/m.test(fm);
    const minutesMatch = fm.match(/^estimated_minutes:\s*(\d+)/m);
    const agentTypeMatch = fm.match(/^agent_type:\s*(\S+)/m);
    const waveMatch = fm.match(/^wave:\s*(\d+)/m);
    return {
      autonomous,
      estimated_minutes: minutesMatch ? parseInt(minutesMatch[1], 10) : 30,
      agent_type: agentTypeMatch ? agentTypeMatch[1] : (autonomous ? 'autonomous' : null),
      wave: waveMatch ? parseInt(waveMatch[1], 10) : null,
    };
  } catch (_) {
    return defaults;
  }
}

/**
 * Backward-compatible wrapper — returns just the autonomous boolean.
 * Kept for existing tests and callers that only need the boolean.
 *
 * @param {string} projectRoot
 * @param {number} phase
 * @param {number|string} plan
 * @returns {boolean}
 */
function readPlanAutonomous(projectRoot, phase, plan) {
  return readPlanMetadata(projectRoot, phase, plan).autonomous;
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
   *            spawnRemoteSession, routeSession, readPlanAutonomous, readPlanMetadata,
   *            classifyTaskRouting,
   *            pushPlanningState, fetchPlanningState, mergePlanningFromCloud,
   *            persistSession, restoreSession }
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

    // Phase 197 (SYN-05, SYN-06): claudeSessionId mapping — captured from system:init NDJSON event
    this._claudeSessionIds = new Map(); // PDE sessionId → Claude session UUID

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

    // Phase 194: Intelligent routing classifier — injectable for testability
    this._readPlanMetadata = deps.readPlanMetadata || readPlanMetadata;
    this._classifyTaskRouting = deps.classifyTaskRouting || classifyTaskRouting;

    // Phase 192: State sync — injectable for testability
    this._pushPlanningState = deps.pushPlanningState || pushPlanningState;
    this._fetchPlanningState = deps.fetchPlanningState || fetchPlanningState;
    this._mergePlanningFromCloud = deps.mergePlanningFromCloud || mergePlanningFromCloud;

    // Phase 192: Routing config for fallback_to_local
    this._routingConfig = (options.config && options.config.dispatch && options.config.dispatch.routing) || {};

    // Phase 191: Docker container dispatch
    this._spawnDockerSession = deps.spawnDockerSession || spawnDockerSession;
    this._dockerConfig = (options.config && options.config.dispatch && options.config.dispatch.docker) || null;

    // Phase 193: Cloud web backend dispatch
    this._spawnCloudSession = deps.spawnCloudSession || spawnCloudSession;
    this._cloudConfig = (options.config && options.config.dispatch && options.config.dispatch.cloud) || null;

    // Phase 197 (SYN-05, SYN-06): Session-persist injectable deps and config
    this._persistSession = deps.persistSession || _persistSessionDefault;
    this._restoreSession = deps.restoreSession || _restoreSessionDefault;
    this._sessionPersistConfig = (options.config && options.config.dispatch && options.config.dispatch.session_persist) || null;
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
    // Phase 194: Use readPlanMetadata() to get full frontmatter (extends readPlanAutonomous)
    const planMeta = this._readPlanMetadata(this._root, phaseNum, planNum);
    const isAutonomous = (opts && opts.isAutonomous !== undefined)
      ? opts.isAutonomous
      : planMeta.autonomous;
    let backend = await this._routeSession({
      isAutonomous,
      remoteConfig: this._remoteConfig,
      dockerConfig: this._dockerConfig,
      cloudConfig: this._cloudConfig,
    });

    // Phase 193: Determine requested backend BEFORE fallback — needed for routing_fallback event.
    // Cloud is "requested" when either cloudConfig.enabled or remoteConfig.preferred_backend === 'cloud'.
    const requestedBackend = (this._cloudConfig && this._cloudConfig.enabled)
      ? 'cloud'
      : (this._remoteConfig && this._remoteConfig.preferred_backend) || 'local';
    if (requestedBackend === 'cloud' && backend !== 'cloud') {
      this._aggregator.emit('event', 'system', {
        type: 'system',
        subtype: 'routing_fallback',
        from: 'cloud',
        to: backend,
      });
    }

    // Phase 194: Intelligent routing classification
    // Runs after routeSession() (which provides initialBackend) and before acquireLock()
    // (so no resources are allocated for a backend that might be downgraded).
    const routingConfig = this._routingConfig || {};
    const classifyResult = this._classifyTaskRouting({
      initialBackend: backend,
      planMetadata: planMeta,
      dispatchOverride: (opts && opts.dispatchOverride) || null,
      configOverrides: routingConfig,
      costConfig: {
        ceiling: routingConfig.cost_ceiling !== undefined ? routingConfig.cost_ceiling : null,
        costPerMinute: routingConfig.cost_per_minute || { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
      },
      isFastPath: (opts && opts.isFastPath) || false,
      fastPathLocal: routingConfig.fast_path_local !== false,
      phase: phaseNum,
    });
    backend = classifyResult.backend;
    for (const evt of classifyResult.events) {
      this._aggregator.emit('event', 'system', evt);
    }
    // RTG-05: Always emit routing_decision event for every dispatch call
    this._aggregator.emit('event', 'system', {
      type: 'system',
      subtype: 'routing_decision',
      phase: phaseNum,
      plan: planNum,
      backend: classifyResult.backend,
      reason: classifyResult.reason,
      estimatedCost: classifyResult.estimatedCost,
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

      // Phase 192 (SYN-01): Push planning state to remote before spawn
      // Push happens AFTER lock release (push is a slow network op — don't hold lock)
      // Push happens BEFORE spawn (cloud executor needs current .planning/ state)
      const CLOUD_BACKENDS = ['docker', 'ssh', 'managed', 'cloud'];
      if (CLOUD_BACKENDS.includes(backend)) {
        const syncResult = await this._pushPlanningState(this._root, branch);
        if (!syncResult.ok) {
          if (this._routingConfig.fallback_to_local) {
            // Downgrade to local dispatch — re-route
            backend = 'local';
          } else {
            // Abort dispatch — cloud dispatch without state sync is useless
            this._registry.remove(sessionId);
            this._removeWorktree(this._root, sessionId);
            this._deleteBranch(this._root, branch);
            throw new Error('State sync push failed: ' + syncResult.error);
          }
        }
      }

      // Phase 152: Store relayId mapping for aggregator unwatch in _handleExit
      this._relayIds.set(sessionId, relayId);

      // 7. Start aggregator watch — use relayId (UUID) so NDJSON path aligns with relay.cjs (D-11)
      // Phase 193: cloud sessions use RemoteAggregator (not TailCursor) — pass 'cloud' sessionType
      const sessionType = (backend === 'cloud') ? 'cloud' : undefined;
      this._aggregator.watch(relayId, sessionType);

      // Phase 152 (RLY-01): Spawn relay immediately (synchronous) so it is available before session
      // starts writing events. Keyed by coordinator sessionId for lookup in _handleExit.
      // Phase 193: cloud sessions must NOT spawn relay — cloud manages its own lifecycle
      if (backend !== 'ssh' && backend !== 'docker' && backend !== 'cloud') {
        const relayHandle = this._spawnRelay(relayId);
        this._relays.set(sessionId, relayHandle || { pid: null, kill: () => {} });
      }

      // Phase 197 (SYN-06): Restore session JSONL from shared storage before spawn when resuming.
      // opts.resume contains the claudeSessionId to restore (or undefined if not resuming).
      if (opts && opts.resume && this._sessionPersistConfig && this._sessionPersistConfig.enabled) {
        const storagePath = this._sessionPersistConfig.storage_path;
        if (storagePath) {
          try {
            await this._restoreSession(opts.resume, storagePath, worktreePath);
          } catch (_restoreErr) {
            // Non-fatal — resume will fail gracefully if JSONL not found
          }
        }
      }

      // 8. Queue the session — runs when a concurrency slot opens
      if (backend === 'ssh') {
        this._queue.add(() => this._runRemoteSession(sessionId, phaseNum, plan, worktreePath, branch, relayId));
      } else if (backend === 'docker') {
        this._queue.add(() => this._runDockerSession(sessionId, phaseNum, plan, worktreePath, branch, relayId));
      } else if (backend === 'cloud') {
        this._queue.add(() => this._runCloudSession(sessionId, phaseNum, plan, worktreePath, branch, relayId));
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
          // Phase 197 (SYN-05): Capture claudeSessionId from system:init NDJSON event
          if (event && event.type === 'system' && event.subtype === 'init' && event.session_id) {
            this._claudeSessionIds.set(sid, event.session_id);
            this._registry.update(sid, { claudeSessionId: event.session_id });
          }
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
          // Phase 197 (SYN-05): Capture claudeSessionId from system:init NDJSON event
          if (event && event.type === 'system' && event.subtype === 'init' && event.session_id) {
            this._claudeSessionIds.set(sid, event.session_id);
            this._registry.update(sid, { claudeSessionId: event.session_id });
          }
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
          // Phase 197 (SYN-05): Capture claudeSessionId from system:init NDJSON event
          if (event && event.type === 'system' && event.subtype === 'init' && event.session_id) {
            this._claudeSessionIds.set(sid, event.session_id);
            this._registry.update(sid, { claudeSessionId: event.session_id });
          }
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
   * Internal: spawn and manage a cloud web backend session. Returns a Promise that
   * resolves when the session completes (success or failure).
   *
   * Cloud sessions use RemoteAggregator (not TailCursor) — aggregator.watch is called
   * with sessionType='cloud'. No relay is spawned — cloud manages its own lifecycle.
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
  _runCloudSession(sessionId, phase, plan, worktreePath, branch, relayId) {
    return new Promise((resolve) => {
      const handle = this._spawnCloudSession({
        sessionId,
        relayId,
        phase,
        plan,
        worktreePath,
        cloudConfig: this._cloudConfig || {},
        onLine: (sid, event) => {
          // Phase 197 (SYN-05): Capture claudeSessionId from system:init NDJSON event
          if (event && event.type === 'system' && event.subtype === 'init' && event.session_id) {
            this._claudeSessionIds.set(sid, event.session_id);
            this._registry.update(sid, { claudeSessionId: event.session_id });
          }
          this._aggregator.emit('event', sid, event);
        },
        onExit: (sid, exitCode) => {
          this._handleExit(sid, exitCode, worktreePath, branch).then(resolve);
        },
      });
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
      // Phase 192 (SYN-02, SYN-04): Fetch and merge cloud planning state BEFORE session merge
      // CRITICAL call order: fetchPlanningState → mergePlanningFromCloud → THEN mergeSession()
      // Cloud sync MUST complete before session merge runs (Pitfall 6 from research)
      const entry = this._registry.get(sessionId);
      if (entry && entry.backend && entry.backend !== 'local') {
        const mergeLock = this._acquireLock(this._root);
        try {
          await this._fetchPlanningState(this._root, branch);
          await this._mergePlanningFromCloud(this._root, branch);
        } catch (syncErr) {
          // Cloud sync failure is non-fatal — log and continue to session merge
          // The session work is still in the worktree; session merge will handle it
        } finally {
          if (mergeLock.acquired) {
            this._releaseLock(this._root);
          }
        }
      }

      // Success path: merge → recalculate → persist → cleanup
      const result = this._mergeSession(this._root, sessionId);
      if (result.ok) {
        this._recalculateFromArtifacts(this._root);

        // Phase 197 (SYN-05): Persist session JSONL to shared storage for cross-host resume.
        // MUST happen BEFORE removeWorktree (worktree cwd is needed to locate JSONL source path).
        const claudeSessionId = this._claudeSessionIds.get(sessionId);
        if (claudeSessionId && this._sessionPersistConfig && this._sessionPersistConfig.enabled) {
          try {
            const storagePath = this._sessionPersistConfig.storage_path;
            const maxSizeMb = this._sessionPersistConfig.max_size_mb || 10;
            if (storagePath) {
              await this._persistSession(worktreePath, claudeSessionId, storagePath, { maxSizeMb });
            }
          } catch (_persistErr) {
            // Non-fatal — session work already merged. Log but don't abort exit handler.
          }
        }
        this._claudeSessionIds.delete(sessionId);

        this._removeWorktree(this._root, sessionId);
        this._deleteBranch(this._root, branch);
        this._registry.remove(sessionId);
      } else {
        // merge returned needsHuman — preserve worktree for manual resolution
        this._claudeSessionIds.delete(sessionId);
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
      this._claudeSessionIds.delete(sessionId);

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

module.exports = { DispatchCoordinator, readPlanAutonomous, readPlanMetadata };
