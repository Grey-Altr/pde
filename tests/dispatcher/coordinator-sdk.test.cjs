'use strict';

/**
 * coordinator-sdk.test.cjs — Integration tests for DispatchCoordinator + orchestrator wiring
 *
 * Phase 145: Agent SDK Orchestrator
 * Satisfies: SDK-02, SDK-03, SDK-04, SDK-05
 *
 * Tests that DispatchCoordinator correctly integrates all four orchestrator
 * functions: analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts.
 *
 * Uses dependency injection via opts._deps to inject test doubles.
 * All deps are stubbed — no real filesystem, no real SDK.
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-coord-sdk-test-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Create a DispatchCoordinator with ALL dependencies injected as vi.fn() stubs,
 * including the four new orchestrator functions.
 */
function makeCoordWithDeps(root, overrides) {
  let capturedOnExit;
  let capturedOnLine;

  const deps = {
    // Existing deps from Phase 144
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

    // Phase 145 orchestrator deps
    analyzeDag: vi.fn().mockResolvedValue({ parallelizable: [], unsafe: [] }),
    checkFileOverlap: vi.fn().mockReturnValue({ overlapping: [] }),
    summarizeFailure: vi.fn().mockResolvedValue('Session failed due to test error'),
    triageConflicts: vi.fn().mockResolvedValue('Accept incoming changes for file a.js'),

    // Apply overrides
    ...(overrides || {}),
  };

  const coord = new DispatchCoordinator(root, {
    maxConcurrent: 3,
    pluginDir: '/fake/plugin',
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

describe('DispatchCoordinator + Orchestrator Wiring', () => {
  let root;

  beforeEach(() => {
    root = makeTempRoot();
  });

  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  });

  // ─── Test 1 (SDK-02): dispatchWave calls analyzeDag once ─────────────────

  it('Test 1 (SDK-02): dispatchWave calls analyzeDag once with projectRoot before dispatching', async () => {
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatchWave([
      { phase: 144, plan: 1 },
    ]);

    expect(deps.analyzeDag).toHaveBeenCalledOnce();
    expect(deps.analyzeDag).toHaveBeenCalledWith(root);
  });

  // ─── Test 2 (SDK-02): analyzeDag result is cached ────────────────────────

  it('Test 2 (SDK-02): dispatchWave does NOT call analyzeDag on second call (uses cached _dag)', async () => {
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatchWave([{ phase: 144, plan: 1 }]);
    await coord.dispatchWave([{ phase: 145, plan: 1 }]);

    expect(deps.analyzeDag).toHaveBeenCalledOnce();
  });

  // ─── Test 3 (SDK-03): checkFileOverlap called with phase numbers ─────────

  it('Test 3 (SDK-03): dispatchWave calls checkFileOverlap with extracted phase numbers from plans array', async () => {
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatchWave([
      { phase: 144, plan: 1 },
      { phase: 145, plan: 2 },
    ]);

    expect(deps.checkFileOverlap).toHaveBeenCalledWith(root, expect.arrayContaining([144, 145]));
  });

  // ─── Test 4 (SDK-03): overlap_warning emitted when overlapping files found ─

  it('Test 4 (SDK-03): when checkFileOverlap returns overlapping files, aggregator emits overlap_warning event', async () => {
    const overlappingResult = {
      overlapping: [
        { phases: [144, 145], files: ['packages/dispatcher/lib/coordinator.cjs'] },
      ],
    };

    const { coord, deps } = makeCoordWithDeps(root, {
      checkFileOverlap: vi.fn().mockReturnValue(overlappingResult),
    });

    const emittedEvents = [];
    coord._aggregator.on('event', (sessionId, event) => {
      emittedEvents.push({ sessionId, event });
    });

    await coord.dispatchWave([
      { phase: 144, plan: 1 },
      { phase: 145, plan: 1 },
    ]);

    const warningEvents = emittedEvents.filter(e => e.event.subtype === 'overlap_warning');
    expect(warningEvents).toHaveLength(1);
    expect(warningEvents[0].event.phases).toEqual([144, 145]);
    expect(warningEvents[0].event.files).toContain('packages/dispatcher/lib/coordinator.cjs');
  });

  // ─── Test 5 (SDK-03): no overlap_warning when no overlaps ────────────────

  it('Test 5 (SDK-03): when checkFileOverlap returns no overlaps, no overlap_warning event is emitted', async () => {
    const { coord } = makeCoordWithDeps(root);

    const emittedEvents = [];
    coord._aggregator.on('event', (sessionId, event) => {
      emittedEvents.push({ sessionId, event });
    });

    await coord.dispatchWave([
      { phase: 144, plan: 1 },
    ]);

    const warningEvents = emittedEvents.filter(e => e.event.subtype === 'overlap_warning');
    expect(warningEvents).toHaveLength(0);
  });

  // ─── Test 6 (SDK-04): failure generates summarizeFailure + emits event ────

  it('Test 6 (SDK-04): _handleExit with exitCode != 0 calls summarizeFailure with sessionId and emits failure_summary event', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(144, 1);
    const onExit = getCapturedOnExit();

    const worktreePath = path.join(root, '.sessions', sessionId);
    fs.mkdirSync(path.join(worktreePath, '.planning', 'phases'), { recursive: true });

    const emittedEvents = [];
    coord._aggregator.on('event', (sid, event) => {
      emittedEvents.push({ sid, event });
    });

    await onExit(sessionId, 1);

    expect(deps.summarizeFailure).toHaveBeenCalledWith(sessionId);

    const summaryEvents = emittedEvents.filter(e => e.event.subtype === 'failure_summary');
    expect(summaryEvents).toHaveLength(1);
    expect(summaryEvents[0].event.sessionId).toBe(sessionId);
    expect(summaryEvents[0].event.summary).toBe('Session failed due to test error');
  });

  // ─── Test 7 (SDK-04): summarizeFailure failure doesn't break exit handler ─

  it('Test 7 (SDK-04): _handleExit with exitCode != 0 still writes FAILED.json even if summarizeFailure throws', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root, {
      summarizeFailure: vi.fn().mockRejectedValue(new Error('SDK unavailable')),
    });

    const sessionId = await coord.dispatch(144, 1);
    // Flush microtask queue: queue schedules via Promise.resolve().then(run),
    // and run schedules via Promise.resolve().then(factory) — two levels deep
    await Promise.resolve();
    await Promise.resolve();
    const onExit = getCapturedOnExit();

    const worktreePath = path.join(root, '.sessions', sessionId);
    fs.mkdirSync(path.join(worktreePath, '.planning', 'phases'), { recursive: true });

    // Should not throw even if summarizeFailure rejects
    await onExit(sessionId, 1);

    // FAILED.json still written
    const failedPath = path.join(worktreePath, '.planning', 'phases', `FAILED-${sessionId}.json`);
    expect(fs.existsSync(failedPath)).toBe(true);

    // Registry still updated
    const entry = coord._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.status).toBe('failed');
  });

  // ─── Test 8 (SDK-05): triageConflicts called on merge failure ────────────

  it('Test 8 (SDK-05): _handleExit with exit 0 and merge returning needsHuman calls triageConflicts', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root, {
      mergeSession: vi.fn(() => ({ ok: false, needsHuman: true, conflicts: ['a.js'] })),
    });

    const sessionId = await coord.dispatch(144, 1);
    const onExit = getCapturedOnExit();

    await onExit(sessionId, 0);

    expect(deps.triageConflicts).toHaveBeenCalledWith(['a.js'], root);
  });

  // ─── Test 9 (SDK-05): triageConflicts result stored in registry ──────────

  it('Test 9 (SDK-05): triageConflicts result is stored in registry update as conflictTriage field', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root, {
      mergeSession: vi.fn(() => ({ ok: false, needsHuman: true, conflicts: ['a.js'] })),
    });

    const sessionId = await coord.dispatch(144, 1);
    const onExit = getCapturedOnExit();

    await onExit(sessionId, 0);

    const entry = coord._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.conflictTriage).toBe('Accept incoming changes for file a.js');
  });
});
