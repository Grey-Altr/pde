'use strict';

/**
 * coordinator-cloud.test.cjs — Integration tests for Cloud dispatch routing
 *
 * Phase 193: Cloud Web Backend
 * Satisfies: CLD-01 (cloud dispatch), CLD-02 (cloud polling lifecycle),
 *            CLD-07 (cloud routing with fallback), CLD-08 (auth probe)
 *
 * Tests that DispatchCoordinator correctly routes sessions to Cloud backend,
 * that the router returns 'cloud' with probe fallback, that the aggregator
 * uses RemoteAggregator for cloud sessions, and that tmux sourceLabel returns 'C'.
 *
 * Uses full DI to isolate coordinator logic — no real cloud CLI, no real git ops.
 */

// vitest globals: true — describe, it, expect, vi, beforeEach available without import
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');
const { routeSession } = require('../../packages/dispatcher/lib/remote-router.cjs');
const { detectManagedBackend } = require('../../packages/dispatcher/lib/remote-managed.cjs');
const { CloudPoller } = require('../../packages/dispatcher/lib/remote-cloud.cjs');
const { Aggregator } = require('../../packages/dispatcher/lib/aggregator.cjs');

// Import sourceLabel — exported from tmux-fanout.cjs
let sourceLabel;
try {
  ({ sourceLabel } = require('../../packages/dispatcher/lib/tmux-fanout.cjs'));
} catch (_) {
  sourceLabel = null;
}

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const authAvailable = JSON.stringify({
  loggedIn: true,
  authMethod: 'claude.ai',
  apiProvider: 'firstParty',
  email: 'test@example.com',
});

const authUnavailable = JSON.stringify({
  loggedIn: false,
  authMethod: 'none',
});

const runningStatus = JSON.stringify({ status: 'running' });
const completedStatus = JSON.stringify({ status: 'completed' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-coord-cloud-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Create a DispatchCoordinator with full DI for cloud dispatch tests.
 * All deps are stubbed — no real cloud CLI, no real filesystem ops.
 *
 * @param {object} [overrides] - Override specific deps or config
 * @returns {{ coordinator, deps, tmpRoot }}
 */
function createCloudTestCoordinator(overrides = {}) {
  const tmpRoot = makeTempRoot();

  const { depOverrides = {}, configOverride, ...rest } = overrides;

  const mockSpawnCloudSession = vi.fn(() => ({ kill: vi.fn() }));

  const defaults = {
    spawnSession: vi.fn(() => ({ pid: 1234, kill: vi.fn() })),
    spawnRemoteSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnDockerSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnCloudSession: mockSpawnCloudSession,
    routeSession: vi.fn().mockResolvedValue('cloud'),
    readPlanAutonomous: vi.fn().mockReturnValue(true),
    createWorktree: vi.fn((r, sid) => ({
      worktreePath: path.join(r, '.sessions', sid),
      branch: 'pde/session/' + sid,
    })),
    removeWorktree: vi.fn(),
    deleteBranch: vi.fn(),
    mergeSession: vi.fn(() => ({ ok: true })),
    recalculateFromArtifacts: vi.fn(),
    acquireLock: vi.fn(() => ({ acquired: true })),
    releaseLock: vi.fn(),
    analyzeDag: vi.fn().mockResolvedValue({ parallelizable: [], unsafe: [] }),
    checkFileOverlap: vi.fn(() => ({ overlapping: [] })),
    summarizeFailure: vi.fn().mockResolvedValue(''),
    triageConflicts: vi.fn().mockResolvedValue({}),
    // Phase 192: State sync — mock to avoid real git ops
    pushPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    fetchPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    mergePlanningFromCloud: vi.fn().mockResolvedValue({ ok: true, conflicts: [], autoResolved: [] }),
  };

  const deps = { ...defaults, ...depOverrides };

  // Cloud config in config.dispatch.cloud and dispatch.remote.preferred_backend
  const config = configOverride !== undefined
    ? configOverride
    : {
        dispatch: {
          remote: { preferred_backend: 'cloud', host: 'cloud-host.example.com' },
          cloud: { enabled: true, poll_interval: 50, idle_timeout: 300 },
        },
      };

  const coordinator = new DispatchCoordinator(tmpRoot, {
    maxConcurrent: 3,
    config,
    _deps: deps,
    ...rest,
  });

  return { coordinator, deps, tmpRoot };
}

// ─── Test Suite: Coordinator Cloud Dispatch ───────────────────────────────────

describe('DispatchCoordinator — Cloud Backend', () => {
  // ─── Test CC-01: cloud backend queues _runCloudSession ────────────────────

  it('CC-01: dispatch() with backend=cloud queues _runCloudSession (not spawnSession/spawnRemoteSession/spawnDockerSession)', async () => {
    const { coordinator, deps } = createCloudTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('cloud'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    await coordinator.dispatch(193, 2);

    // Let microtask queue flush so the queued job runs
    await new Promise(r => setImmediate(r));

    // Cloud path: spawnCloudSession called, others NOT called
    expect(deps.spawnCloudSession).toHaveBeenCalled();
    expect(deps.spawnSession).not.toHaveBeenCalled();
    expect(deps.spawnRemoteSession).not.toHaveBeenCalled();
    expect(deps.spawnDockerSession).not.toHaveBeenCalled();
  });

  // ─── Test CC-02: cloud backend does NOT spawn relay ───────────────────────

  it('CC-02: dispatch() with backend=cloud does NOT spawn relay (cloud skips relay spawn)', async () => {
    const spawnChildProcess = vi.fn(() => ({
      pid: 999,
      unref: vi.fn(),
      kill: vi.fn(),
    }));

    const { coordinator } = createCloudTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('cloud'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
        spawnChildProcess,
      },
    });

    // Set PDE_REMOTE so relay would normally be triggered
    const origRemote = process.env.PDE_REMOTE;
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';

    await coordinator.dispatch(193, 2);

    process.env.PDE_REMOTE = origRemote || '';
    if (!origRemote) delete process.env.PDE_REMOTE;

    // spawnChildProcess (relay) should NOT have been called for cloud
    expect(spawnChildProcess).not.toHaveBeenCalled();
  });

  // ─── Test CC-03: _runCloudSession passes correct opts ─────────────────────

  it('CC-03: _runCloudSession passes correct opts to spawnCloudSession (sessionId, phase, plan, cloudConfig)', async () => {
    const { coordinator, deps } = createCloudTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('cloud'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    await coordinator.dispatch(193, 2);

    // Let microtask queue flush
    await new Promise(r => setImmediate(r));

    expect(deps.spawnCloudSession).toHaveBeenCalled();
    const opts = deps.spawnCloudSession.mock.calls[0][0];

    // Required fields
    expect(opts.sessionId).toBeDefined();
    expect(opts.relayId).toBeDefined();
    expect(opts.phase).toBe(193);
    expect(opts.plan).toBe(2);
    expect(opts.cloudConfig).toBeDefined();
    expect(typeof opts.onLine).toBe('function');
    expect(typeof opts.onExit).toBe('function');
  });

  // ─── Test CC-04: _runCloudSession onLine forwards events to aggregator ────

  it('CC-04: _runCloudSession onLine forwards events to aggregator.emit("event")', async () => {
    let capturedOnLine;
    const { coordinator } = createCloudTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('cloud'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
        spawnCloudSession: vi.fn((opts) => {
          capturedOnLine = opts.onLine;
          return { kill: vi.fn() };
        }),
      },
    });

    await coordinator.dispatch(193, 2);
    await new Promise(r => setImmediate(r));

    expect(capturedOnLine).toBeDefined();

    // Listen to aggregator for events
    const received = [];
    coordinator._aggregator.on('event', (sid, evt) => received.push({ sid, evt }));

    // Simulate a line event
    const testEvent = { event_type: 'cloud_heartbeat', cloud_status: 'running' };
    capturedOnLine('test-session-id', testEvent);

    expect(received).toHaveLength(1);
    expect(received[0].evt).toEqual(testEvent);
  });

  // ─── Test CC-05: _runCloudSession onExit calls _handleExit ───────────────

  it('CC-05: _runCloudSession onExit calls _handleExit (mergeSession called on exit 0)', async () => {
    let capturedOnExit;
    const { coordinator, deps } = createCloudTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('cloud'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
        spawnCloudSession: vi.fn((opts) => {
          capturedOnExit = opts.onExit;
          return { kill: vi.fn() };
        }),
      },
    });

    const sessionId = await coordinator.dispatch(193, 2);
    await new Promise(r => setImmediate(r));

    expect(capturedOnExit).toBeDefined();

    // Simulate exit with code 0 — should trigger mergeSession
    capturedOnExit(sessionId, 0);
    await new Promise(r => setTimeout(r, 50));

    expect(deps.mergeSession).toHaveBeenCalled();
  });

  // ─── Test CC-05b: routing_fallback event emitted when cloud probe fails ──────

  it('CC-05b: dispatch() emits routing_fallback event when cloud probe fails and backend falls to ssh', async () => {
    const { coordinator } = createCloudTestCoordinator({
      depOverrides: {
        // routeSession returns 'ssh' (cloud probe failed, fell back to ssh)
        routeSession: vi.fn().mockResolvedValue('ssh'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    const received = [];
    coordinator._aggregator.on('event', (sid, evt) => received.push({ sid, evt }));

    await coordinator.dispatch(193, 2);

    // routing_fallback event should be emitted (cloudConfig.enabled=true, but backend=ssh)
    const fallback = received.find(e => e.evt && e.evt.subtype === 'routing_fallback');
    expect(fallback).toBeDefined();
    expect(fallback.evt.from).toBe('cloud');
    expect(fallback.evt.to).toBe('ssh');
  });
});

// ─── Test Suite: detectManagedBackend ─────────────────────────────────────────

describe('detectManagedBackend', () => {
  // ─── Test CC-06: returns unavailable when authMethod !== 'claude.ai' ──────

  it('CC-06: detectManagedBackend returns { available: false } when authMethod !== "claude.ai"', async () => {
    const execCommand = vi.fn().mockResolvedValue(authUnavailable);
    const result = await detectManagedBackend({ execCommand });
    expect(result.available).toBe(false);
    expect(result.reason).toBeDefined();
  });

  // ─── Test CC-07: returns available when authMethod === 'claude.ai' ────────

  it('CC-07: detectManagedBackend returns { available: true } when authMethod === "claude.ai" and loggedIn === true', async () => {
    const execCommand = vi.fn().mockResolvedValue(authAvailable);
    const result = await detectManagedBackend({ execCommand });
    expect(result.available).toBe(true);
  });
});

// ─── Test Suite: CloudPoller ──────────────────────────────────────────────────

describe('CloudPoller', () => {
  // ─── Test CC-08: CloudPoller emits cloud_heartbeat then session_end ───────

  it('CC-08: CloudPoller emits cloud_heartbeat when status=running, then session_end when status=completed, and stops', async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const execCommand = vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(runningStatus);
      return Promise.resolve(completedStatus);
    });

    const received = [];
    const poller = new CloudPoller('task-abc', (event) => {
      received.push(event);
    }, { pollInterval: 50, _execCommand: execCommand });

    poller.start();

    // Advance timer to trigger first poll
    await vi.advanceTimersByTimeAsync(60);
    // Advance timer to trigger second poll
    await vi.advanceTimersByTimeAsync(60);

    vi.useRealTimers();

    // First event should be cloud_heartbeat
    expect(received[0]).toMatchObject({
      event_type: 'cloud_heartbeat',
      cloud_status: 'running',
    });

    // Second event should be session_end
    expect(received[1]).toMatchObject({
      event_type: 'session_end',
      cloud_status: 'completed',
    });

    // After session_end, poller should stop (timer cleared)
    expect(poller._timer).toBeNull();
  });
});

// ─── Test Suite: routeSession — cloud fallback ────────────────────────────────

describe('routeSession — cloud fallback', () => {
  // ─── Test CC-09: fallback chain when cloud probe unavailable ─────────────

  it('CC-09: routeSession with cloud preferred but probe unavailable returns ssh (when host configured)', async () => {
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: { preferred_backend: 'cloud', host: 'remote.example.com' },
      cloudConfig: null,
      _detectManaged: vi.fn().mockResolvedValue({ available: false, reason: 'Not logged in' }),
    });
    expect(result).toBe('ssh');
  });

  it('CC-09b: routeSession with cloud preferred but probe unavailable returns local (when no host)', async () => {
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: { preferred_backend: 'cloud' },
      cloudConfig: null,
      _detectManaged: vi.fn().mockResolvedValue({ available: false, reason: 'Not logged in' }),
    });
    expect(result).toBe('local');
  });
});

// ─── Test Suite: sourceLabel ──────────────────────────────────────────────────

describe('sourceLabel', () => {
  // ─── Test CC-10: sourceLabel('cloud') returns 'C' ────────────────────────

  it("CC-10: sourceLabel('cloud') returns 'C'", () => {
    if (!sourceLabel) {
      const fanoutModule = require('../../packages/dispatcher/lib/tmux-fanout.cjs');
      if (typeof fanoutModule.sourceLabel === 'function') {
        expect(fanoutModule.sourceLabel('cloud')).toBe('C');
      } else {
        throw new Error('sourceLabel must be exported from tmux-fanout.cjs for direct testing');
      }
      return;
    }
    expect(sourceLabel('cloud')).toBe('C');
    // Verify other labels still work
    expect(sourceLabel('docker')).toBe('D');
    expect(sourceLabel('local')).toBe('L');
    expect(sourceLabel('ssh')).toBe('R');
  });
});

// ─── Test Suite: Aggregator — cloud sessions ──────────────────────────────────

describe('Aggregator — cloud sessions', () => {
  // ─── Test CC-11: aggregator.watch(id, 'cloud') uses RemoteAggregator ─────

  it('CC-11: aggregator.watch(id, "cloud") uses RemoteAggregator (not TailCursor)', () => {
    const tailCursorInstances = [];
    function MockTailCursor(filePath, onLine) {
      this.filePath = filePath;
      this.onLine = onLine;
      this.start = vi.fn();
      this.stop = vi.fn();
      tailCursorInstances.push(this);
    }
    const mockTailCursor = vi.fn(MockTailCursor);

    const remoteAggInstances = [];
    function MockRemoteAggregator(filePath, onLine) {
      this.filePath = filePath;
      this.onLine = onLine;
      this.start = vi.fn();
      this.stop = vi.fn();
      remoteAggInstances.push(this);
    }
    const mockRemoteAggregator = vi.fn(MockRemoteAggregator);

    const agg = new Aggregator(mockTailCursor, mockRemoteAggregator);
    agg.watch('cloud-session-xyz', 'cloud');

    // RemoteAggregator MUST have been called for cloud
    expect(mockRemoteAggregator).toHaveBeenCalledTimes(1);
    // TailCursor must NOT have been called
    expect(mockTailCursor).not.toHaveBeenCalled();
  });
});
