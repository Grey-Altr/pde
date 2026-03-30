'use strict';

/**
 * coordinator-docker.test.cjs — Integration tests for Docker dispatch routing
 *
 * Phase 191: Docker Container Backend
 * Satisfies: CLD-03, CLD-04, CLD-05
 *
 * Tests that DispatchCoordinator correctly routes sessions to Docker backend,
 * that the router returns 'docker' for docker config, that the aggregator
 * uses TailCursor for docker sessions, and that tmux sourceLabel returns 'D'.
 *
 * Uses full DI to isolate coordinator logic — no real Docker, no real git ops.
 */

// vitest globals: true — describe, it, expect, vi, beforeEach available without import
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');
const { routeSession } = require('../../packages/dispatcher/lib/remote-router.cjs');
const { Aggregator } = require('../../packages/dispatcher/lib/aggregator.cjs');

// Import sourceLabel — exported for testing in tmux-fanout.cjs
let sourceLabel;
try {
  ({ sourceLabel } = require('../../packages/dispatcher/lib/tmux-fanout.cjs'));
} catch (_) {
  sourceLabel = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-coord-docker-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Create a DispatchCoordinator with full DI for docker dispatch tests.
 * All deps are stubbed — no real Docker, no real filesystem ops, no real SDK.
 *
 * @param {object} [overrides] - Override specific deps or config
 * @returns {{ coordinator, deps, tmpRoot }}
 */
function createDockerTestCoordinator(overrides = {}) {
  const tmpRoot = makeTempRoot();

  const { depOverrides = {}, configOverride, ...rest } = overrides;

  const mockSpawnDockerSession = vi.fn(() => ({ kill: vi.fn() }));

  const defaults = {
    spawnSession: vi.fn(() => ({ pid: 1234, kill: vi.fn() })),
    spawnRemoteSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnDockerSession: mockSpawnDockerSession,
    routeSession: vi.fn().mockResolvedValue('local'),
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
    // Phase 192: State sync — mock to avoid real git ops in these coordinator tests
    pushPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    fetchPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    mergePlanningFromCloud: vi.fn().mockResolvedValue({ ok: true, conflicts: [], autoResolved: [] }),
  };

  const deps = { ...defaults, ...depOverrides };

  // Docker config in config.dispatch.docker
  const config = configOverride !== undefined
    ? configOverride
    : {
        dispatch: {
          docker: { enabled: true, image: 'pde-runner:latest', memory: '512m' },
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

// ─── Test Suite: Coordinator Docker Dispatch ──────────────────────────────────

describe('DispatchCoordinator docker dispatch routing', () => {
  // ─── Test CD-01: docker backend queues _runDockerSession ─────────────────

  it('Test CD-01: dispatch() with backend=docker queues _runDockerSession (not _runSession or _runRemoteSession)', async () => {
    const { coordinator, deps } = createDockerTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('docker'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    await coordinator.dispatch(191, 2);

    // Let microtask queue flush so the queued job runs
    await new Promise(r => setImmediate(r));

    // Docker path: spawnDockerSession called, others NOT called
    expect(deps.spawnDockerSession).toHaveBeenCalled();
    expect(deps.spawnSession).not.toHaveBeenCalled();
    expect(deps.spawnRemoteSession).not.toHaveBeenCalled();
  });

  // ─── Test CD-02: docker backend skips relay spawn ────────────────────────

  it('Test CD-02: dispatch() with backend=docker skips relay spawn (same as SSH)', async () => {
    const spawnChildProcess = vi.fn(() => ({
      pid: 999,
      unref: vi.fn(),
      kill: vi.fn(),
    }));

    const { coordinator, deps } = createDockerTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('docker'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
        spawnChildProcess,
      },
    });

    // Set PDE_REMOTE so relay would normally be triggered
    const origRemote = process.env.PDE_REMOTE;
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';

    await coordinator.dispatch(191, 2);

    process.env.PDE_REMOTE = origRemote || '';
    if (!origRemote) delete process.env.PDE_REMOTE;

    // spawnChildProcess (relay) should NOT have been called for docker
    expect(spawnChildProcess).not.toHaveBeenCalled();
  });

  // ─── Test CD-03: _runDockerSession passes correct opts ───────────────────

  it('Test CD-03: _runDockerSession passes correct opts to spawnDockerSession', async () => {
    const { coordinator, deps } = createDockerTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('docker'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    const sessionId = await coordinator.dispatch(191, 2);

    // Let microtask queue flush
    await new Promise(r => setImmediate(r));

    expect(deps.spawnDockerSession).toHaveBeenCalled();
    const opts = deps.spawnDockerSession.mock.calls[0][0];

    // Required fields
    expect(opts.sessionId).toBeDefined();
    expect(opts.relayId).toBeDefined();
    expect(opts.phase).toBe(191);
    expect(opts.plan).toBe(2);
    expect(opts.worktreePath).toBeDefined();
    expect(opts.pluginDir).toBeDefined();
    expect(opts.dockerConfig).toBeDefined();
    expect(typeof opts.onLine).toBe('function');
    expect(typeof opts.onExit).toBe('function');
  });

  // ─── Test CD-04: _runDockerSession onLine forwards events to aggregator ──

  it('Test CD-04: _runDockerSession onLine forwards events to aggregator.emit("event")', async () => {
    let capturedOnLine;
    const { coordinator } = createDockerTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('docker'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
        spawnDockerSession: vi.fn((opts) => {
          capturedOnLine = opts.onLine;
          return { kill: vi.fn() };
        }),
      },
    });

    await coordinator.dispatch(191, 2);
    await new Promise(r => setImmediate(r));

    expect(capturedOnLine).toBeDefined();

    // Listen to aggregator for events
    const received = [];
    coordinator._aggregator.on('event', (sid, evt) => received.push({ sid, evt }));

    // Simulate a line event
    const testEvent = { type: 'assistant', content: 'hello' };
    capturedOnLine('test-session-id', testEvent);

    expect(received).toHaveLength(1);
    expect(received[0].evt).toEqual(testEvent);
  });

  // ─── Test CD-05: _runDockerSession onExit calls _handleExit ──────────────

  it('Test CD-05: _runDockerSession onExit calls _handleExit with correct args', async () => {
    let capturedOnExit;
    const { coordinator, deps } = createDockerTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('docker'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
        spawnDockerSession: vi.fn((opts) => {
          capturedOnExit = opts.onExit;
          return { kill: vi.fn() };
        }),
      },
    });

    const sessionId = await coordinator.dispatch(191, 2);
    await new Promise(r => setImmediate(r));

    expect(capturedOnExit).toBeDefined();

    // Simulate exit with code 0 — should trigger mergeSession
    // _handleExit is async (cloud sync ops before mergeSession) — wait for it to settle
    capturedOnExit(sessionId, 0);
    await new Promise(r => setTimeout(r, 50));

    expect(deps.mergeSession).toHaveBeenCalled();
  });
});

// ─── Test Suite: Remote Router Docker Rules ───────────────────────────────────

describe('routeSession docker routing rules', () => {
  // ─── Test CD-06: returns docker when preferred_backend === 'docker' ───────

  it('Test CD-06: routeSession returns "docker" when remoteConfig.preferred_backend === "docker"', async () => {
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: { preferred_backend: 'docker' },
    });
    expect(result).toBe('docker');
  });

  // ─── Test CD-07: returns docker when dockerConfig.enabled === true ────────

  it('Test CD-07: routeSession returns "docker" when dockerConfig.enabled === true', async () => {
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: null,
      dockerConfig: { enabled: true, image: 'pde-runner:latest' },
    });
    expect(result).toBe('docker');
  });

  // ─── Test CD-08: non-autonomous always returns local ─────────────────────

  it('Test CD-08: routeSession returns "local" for non-autonomous sessions even with docker config', async () => {
    const result = await routeSession({
      isAutonomous: false,
      remoteConfig: { preferred_backend: 'docker' },
      dockerConfig: { enabled: true },
    });
    expect(result).toBe('local');
  });
});

// ─── Test Suite: tmux sourceLabel ─────────────────────────────────────────────

describe('tmux sourceLabel docker label', () => {
  // ─── Test CD-09: sourceLabel('docker') returns 'D' ───────────────────────

  it('Test CD-09: sourceLabel("docker") returns "D"', () => {
    if (!sourceLabel) {
      // If sourceLabel is not exported, import TmuxFanout's source via module internals
      const fanoutModule = require('../../packages/dispatcher/lib/tmux-fanout.cjs');
      // Check if sourceLabel is exported
      if (typeof fanoutModule.sourceLabel === 'function') {
        expect(fanoutModule.sourceLabel('docker')).toBe('D');
      } else {
        // Create a fanout and verify via indirect behavior
        // The test verifies the label is 'D' via integration
        throw new Error('sourceLabel must be exported from tmux-fanout.cjs for direct testing');
      }
      return;
    }
    expect(sourceLabel('docker')).toBe('D');
    // Also verify other labels still work
    expect(sourceLabel('local')).toBe('L');
    expect(sourceLabel('ssh')).toBe('R');
    expect(sourceLabel(undefined)).toBe('L');
  });
});

// ─── Test Suite: Aggregator docker routing ────────────────────────────────────

describe('Aggregator watch() docker vs cloud routing', () => {
  // ─── Test CD-10: watch(id, 'docker') uses TailCursor, not RemoteAggregator ─

  it('Test CD-10: aggregator.watch(id, "docker") uses TailCursor (not RemoteAggregator)', () => {
    // Use class-like constructors (not arrow functions) for vi.fn so `new` works
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
    agg.watch('docker-session-abc', 'docker');

    // TailCursor MUST have been called
    expect(mockTailCursor).toHaveBeenCalledTimes(1);
    // RemoteAggregator must NOT have been called
    expect(mockRemoteAggregator).not.toHaveBeenCalled();
  });

  it('Test CD-10b: aggregator.watch(id, "cloud") still uses RemoteAggregator', () => {
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
