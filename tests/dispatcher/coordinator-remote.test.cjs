'use strict';

/**
 * coordinator-remote.test.cjs — Integration tests for remote dispatch routing
 *
 * Phase 146: Remote Dispatch
 * Satisfies: RMT-01, RMT-02, RMT-03, RMT-04
 *
 * Tests that DispatchCoordinator correctly routes sessions to SSH vs local backends,
 * registers backend tags in the registry, and integrates readPlanAutonomous.
 *
 * Uses full DI to isolate coordinator logic — no real SSH, no real git operations.
 */

// vitest globals: true — describe, it, expect, vi, beforeEach available without import
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-coord-remote-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Create a DispatchCoordinator with full DI for remote dispatch tests.
 * All deps are stubbed — no real SSH, no real filesystem ops, no real SDK.
 *
 * @param {object} [overrides] - Override specific deps or config
 * @returns {{ coordinator, deps, tmpRoot }}
 */
function createTestCoordinator(overrides = {}) {
  const tmpRoot = makeTempRoot();

  const { depOverrides = {}, configOverride, ...rest } = overrides;

  const defaults = {
    spawnSession: vi.fn(() => ({ pid: 1234, kill: vi.fn() })),
    spawnRemoteSession: vi.fn(() => ({ kill: vi.fn() })),
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
  };

  const deps = { ...defaults, ...depOverrides };

  const config = configOverride !== undefined
    ? configOverride
    : { dispatch: { remote: { host: 'test.example.com', repo_path: '/remote/project' } } };

  const coordinator = new DispatchCoordinator(tmpRoot, {
    maxConcurrent: 3,
    config,
    _deps: deps,
    ...rest,
  });

  return { coordinator, deps, tmpRoot };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('DispatchCoordinator remote dispatch routing', () => {
  let root;

  beforeEach(() => {
    root = makeTempRoot();
  });

  // ─── Test 1: Route autonomous session to SSH ──────────────────────────────

  it('Test 1: dispatch routes autonomous session to SSH when remote configured', async () => {
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('ssh'),
        spawnRemoteSession: vi.fn(() => ({ kill: vi.fn() })),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    await coordinator.dispatch(146, 1);

    expect(deps.routeSession).toHaveBeenCalledWith({
      isAutonomous: true,
      remoteConfig: { host: 'test.example.com', repo_path: '/remote/project' },
    });

    // SSH path: spawnRemoteSession called, spawnSession NOT called
    // Queue is async — let microtask queue flush
    await new Promise(r => setImmediate(r));
    expect(deps.spawnRemoteSession).toHaveBeenCalled();
    expect(deps.spawnSession).not.toHaveBeenCalled();
  });

  // ─── Test 2: Route interactive session to local ───────────────────────────

  it('Test 2: dispatch routes interactive session to local', async () => {
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('local'),
        readPlanAutonomous: vi.fn().mockReturnValue(false),
      },
    });

    await coordinator.dispatch(146, 1);

    await new Promise(r => setImmediate(r));
    expect(deps.spawnSession).toHaveBeenCalled();
    expect(deps.spawnRemoteSession).not.toHaveBeenCalled();
  });

  // ─── Test 3: isAutonomous from opts overrides readPlanAutonomous ──────────

  it('Test 3: dispatch passes isAutonomous from opts when provided', async () => {
    const { coordinator, deps } = createTestCoordinator();

    await coordinator.dispatch(146, 1, { isAutonomous: false });

    expect(deps.routeSession).toHaveBeenCalledWith(
      expect.objectContaining({ isAutonomous: false })
    );
    // readPlanAutonomous should NOT be called when opts.isAutonomous is provided
    expect(deps.readPlanAutonomous).not.toHaveBeenCalled();
  });

  // ─── Test 4: readPlanAutonomous called when opts.isAutonomous not set ──────

  it('Test 4: dispatch uses readPlanAutonomous when opts.isAutonomous not provided', async () => {
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    await coordinator.dispatch(146, 1);

    expect(deps.readPlanAutonomous).toHaveBeenCalled();
  });

  // ─── Test 5: Registry includes backend and remoteHost for SSH ────────────

  it('Test 5: registry includes backend and remoteHost for SSH sessions', async () => {
    let registeredEntry;
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('ssh'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    const sessionId = await coordinator.dispatch(146, 1);

    const entry = coordinator._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.backend).toBe('ssh');
    expect(entry.remoteHost).toBe('test.example.com');
  });

  // ─── Test 6: Registry backend 'local' without remoteHost ─────────────────

  it('Test 6: registry includes backend local without remoteHost for local sessions', async () => {
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('local'),
        readPlanAutonomous: vi.fn().mockReturnValue(false),
      },
    });

    const sessionId = await coordinator.dispatch(146, 1);

    const entry = coordinator._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.backend).toBe('local');
    expect(entry.remoteHost).toBeUndefined();
  });

  // ─── Test 7: No remote config results in null remoteConfig ───────────────

  it('Test 7: existing local dispatch path unchanged when no remote config', async () => {
    const { coordinator, deps } = createTestCoordinator({
      configOverride: null, // No config at all
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('local'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });

    await coordinator.dispatch(146, 1);

    expect(deps.routeSession).toHaveBeenCalledWith({
      isAutonomous: true,
      remoteConfig: null,
    });
  });

  // ─── Test 8: SSH dispatch passes relayId (UUID) to spawnRemoteSession ─────

  it('Test 8: SSH dispatch passes relayId (UUID) to spawnRemoteSession', async () => {
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('ssh'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });
    await coordinator.dispatch(146, 1);
    await new Promise(r => setImmediate(r));
    expect(deps.spawnRemoteSession).toHaveBeenCalled();
    const opts = deps.spawnRemoteSession.mock.calls[0][0];
    // relayId must be a valid UUID v4
    expect(opts.relayId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  // ─── Test 9: SSH dispatch relayId differs from sessionId ─────────────────

  it('Test 9: SSH dispatch relayId differs from sessionId', async () => {
    const { coordinator, deps } = createTestCoordinator({
      depOverrides: {
        routeSession: vi.fn().mockResolvedValue('ssh'),
        readPlanAutonomous: vi.fn().mockReturnValue(true),
      },
    });
    await coordinator.dispatch(146, 1);
    await new Promise(r => setImmediate(r));
    const opts = deps.spawnRemoteSession.mock.calls[0][0];
    expect(opts.relayId).not.toBe(opts.sessionId);
  });
});
