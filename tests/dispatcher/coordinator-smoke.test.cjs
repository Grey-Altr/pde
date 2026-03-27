'use strict';

/**
 * coordinator-smoke.test.cjs — Integration smoke test for DispatchCoordinator
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-04, DSP-05
 *
 * Uses dependency injection via opts._deps to inject test doubles into
 * DispatchCoordinator. This avoids CJS module binding issues with vi.mock().
 * Production code never passes _deps — it uses module-level requires.
 *
 * Uses vitest globals (globals: true in vitest.config.ts).
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-coord-test-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Create a DispatchCoordinator with all dependencies injected as vi.fn() stubs.
 * Returns { coord, deps } where deps has refs to each stub.
 */
function makeCoordWithDeps(root, extraOpts) {
  let capturedOnExit;
  let capturedOnLine;

  const deps = {
    spawnSession: vi.fn((opts) => {
      capturedOnExit = opts.onExit;
      capturedOnLine = opts.onLine;
      return { pid: 9001, kill: vi.fn() };
    }),
    createWorktree: vi.fn((r, sid) => ({
      worktreePath: path.join(r, '.sessions', sid),
      branch: 'pde/session/' + sid,
    })),
    removeWorktree: vi.fn(),
    deleteBranch: vi.fn(),
    mergeSession: vi.fn(() => ({ ok: true, conflicts: [] })),
    recalculateFromArtifacts: vi.fn(() => ({ updated: true })),
    acquireLock: vi.fn(() => ({ acquired: true, lockPath: '/fake/lock' })),
    releaseLock: vi.fn(),
    // CLN-01: inject SDK orchestrator stubs — prevents real sdkQuery ESM import
    analyzeDag: vi.fn(async () => ({ parallelizable: [], unsafe: [] })),
    routeSession: vi.fn(async () => 'local'),
  };

  const coord = new DispatchCoordinator(root, {
    maxConcurrent: 3,
    pluginDir: '/fake/plugin',
    ...(extraOpts || {}),
    _deps: deps,
  });

  return {
    coord,
    deps,
    getCapturedOnExit: () => capturedOnExit,
    getCapturedOnLine: () => capturedOnLine,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('DispatchCoordinator', () => {
  let root;

  beforeEach(() => {
    root = makeTempRoot();
  });

  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  });

  // ─── Test 1: Constructor wiring ─────────────────────────────────────────

  it('Test 1: constructor creates registry, queue, and aggregator without throwing', () => {
    const { coord } = makeCoordWithDeps(root);

    expect(coord).toBeDefined();
    expect(coord._root).toBe(root);
    expect(coord._registry).toBeDefined();
    expect(coord._queue).toBeDefined();
    expect(coord._aggregator).toBeDefined();
    expect(typeof coord._aggregator.on).toBe('function');
    expect(coord._sessions).toBeInstanceOf(Map);
    expect(coord.aggregator).toBe(coord._aggregator);
  });

  // ─── Test 2: dispatch creates worktree + registers session ───────────────

  it('Test 2: dispatch creates worktree and registers session in registry', async () => {
    const { coord, deps } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(144, 1);

    expect(typeof sessionId).toBe('string');
    expect(sessionId).toMatch(/^p144-1-[0-9a-f]{8}$/);

    expect(deps.createWorktree).toHaveBeenCalledOnce();
    expect(deps.createWorktree).toHaveBeenCalledWith(root, sessionId);

    const entry = coord._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.phase).toBe(144);
    expect(entry.status).toBe('running');
  });

  // ─── Test 3: Duplicate phase rejection ──────────────────────────────────

  it('Test 3: dispatching same phase twice throws duplicate error', async () => {
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatch(144, 1);

    await expect(coord.dispatch(144, 2)).rejects.toThrow('Phase 144 already has a running session');
    // Lock was released (even when throwing after acquire)
    expect(deps.releaseLock).toHaveBeenCalled();
  });

  // ─── Test 4: Exit 0 triggers merge + recalculate + cleanup ──────────────

  it('Test 4: exit code 0 triggers mergeSession + recalculate + removeWorktree + registry.remove', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(144, 1);
    const onExit = getCapturedOnExit();

    await onExit(sessionId, 0);

    expect(deps.mergeSession).toHaveBeenCalledWith(root, sessionId);
    expect(deps.recalculateFromArtifacts).toHaveBeenCalledWith(root);
    expect(deps.removeWorktree).toHaveBeenCalledOnce();
    expect(deps.deleteBranch).toHaveBeenCalledOnce();
    expect(coord._registry.get(sessionId)).toBeUndefined();
  });

  // ─── Test 5: Exit non-0 preserves worktree + writes FAILED.json ─────────

  it('Test 5: exit code non-0 preserves worktree, updates status to failed, writes FAILED.json', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root);
    const sessionId = await coord.dispatch(144, 1);
    const onExit = getCapturedOnExit();

    const worktreePath = path.join(root, '.sessions', sessionId);
    fs.mkdirSync(path.join(worktreePath, '.planning', 'phases'), { recursive: true });

    await onExit(sessionId, 1);

    // removeWorktree must NOT be called (DSP-09: preserve for debugging)
    expect(deps.removeWorktree).not.toHaveBeenCalled();

    const entry = coord._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.status).toBe('failed');
    expect(entry.exitCode).toBe(1);

    const failedPath = path.join(worktreePath, '.planning', 'phases', `FAILED-${sessionId}.json`);
    expect(fs.existsSync(failedPath)).toBe(true);
    const failedJson = JSON.parse(fs.readFileSync(failedPath, 'utf8'));
    expect(failedJson.sessionId).toBe(sessionId);
    expect(failedJson.exitCode).toBe(1);
    expect(failedJson.failedAt).toBeDefined();
  });

  // ─── Test 6: Merge failure preserves worktree ────────────────────────────

  it('Test 6: exit 0 but mergeSession returns needsHuman sets status merge_failed, preserves worktree', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root);
    deps.mergeSession.mockReturnValue({ ok: false, needsHuman: true, conflicts: ['src/foo.ts'] });

    const sessionId = await coord.dispatch(144, 1);
    const onExit = getCapturedOnExit();

    await onExit(sessionId, 0);

    expect(deps.removeWorktree).not.toHaveBeenCalled();
    expect(deps.recalculateFromArtifacts).not.toHaveBeenCalled();

    const entry = coord._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.status).toBe('merge_failed');
    expect(entry.conflicts).toContain('src/foo.ts');
  });

  // ─── Test 7: dispatchWave dispatches multiple plans ──────────────────────

  it('Test 7: dispatchWave dispatches multiple plans and registers all sessions', async () => {
    const { coord } = makeCoordWithDeps(root);

    const results = await coord.dispatchWave([
      { phase: 144, plan: 1 },
      { phase: 145, plan: 1 },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');

    const all = coord._registry.getAll();
    expect(all.size).toBe(2);

    const phases = Array.from(all.values()).map(e => e.phase).sort((a, b) => a - b);
    expect(phases).toEqual([144, 145]);
  });

  // ─── Test 8: shutdown kills all sessions ────────────────────────────────

  it('Test 8: shutdown kills all running sessions and stops aggregator', async () => {
    const killFns = [];
    const { coord, deps } = makeCoordWithDeps(root);

    // Override spawnSession to capture multiple kill functions
    let capturedOnExit8;
    deps.spawnSession.mockImplementation((opts) => {
      capturedOnExit8 = opts.onExit;
      const killFn = vi.fn();
      killFns.push(killFn);
      return { pid: 9000 + killFns.length, kill: killFn };
    });

    await coord.dispatch(144, 1);
    await coord.dispatch(145, 1);

    const aggStopSpy = vi.spyOn(coord._aggregator, 'stopAll');

    coord.shutdown();

    expect(aggStopSpy).toHaveBeenCalledOnce();
    for (const killFn of killFns) {
      expect(killFn).toHaveBeenCalled();
    }
  });

  // ─── Test 9: index.cjs re-exports all dispatcher symbols ────────────────

  it('Test 9: index.cjs re-exports all expected dispatcher symbols', () => {
    const dispatcher = require('../../packages/dispatcher');

    const expectedKeys = [
      'spawnSession',
      'SessionRegistry',
      'ConcurrencyQueue',
      'Aggregator',
      'DispatchCoordinator',
      'createWorktree',
      'removeWorktree',
      'deleteBranch',
      'listSessionWorktrees',
      'mergeSession',
      'recalculateFromArtifacts',
      'acquireLock',
      'releaseLock',
      'detectOrphans',
      'resetAllSessions',
    ];

    for (const key of expectedKeys) {
      expect(dispatcher).toHaveProperty(key);
    }
  });
});
