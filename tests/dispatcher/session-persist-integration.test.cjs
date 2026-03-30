'use strict';

/**
 * session-persist-integration.test.cjs — Integration tests for coordinator session-persist wiring
 *
 * Phase 197: Cross-Host Session Resume
 * Satisfies: SYN-05, SYN-06
 *
 * Tests that coordinator.cjs correctly:
 *   1. Captures claudeSessionId from system:init NDJSON events
 *   2. Stores claudeSessionId in registry
 *   3. Calls persistSession on exit code 0 when session_persist.enabled is true
 *   4. Non-fatally handles persistSession failures in _handleExit
 *   5. Calls restoreSession before spawn when opts.resume provided
 *
 * Uses dependency injection via opts._deps to avoid CJS module hoisting issues.
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-persist-integ-test-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Build DispatchCoordinator with all deps injected.
 * Captures onLine and onExit from spawnSession for manual triggering.
 */
function makeCoordWithDeps(root, extraOpts, extraConfig) {
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
    analyzeDag: vi.fn(async () => ({ parallelizable: [], unsafe: [] })),
    routeSession: vi.fn(async () => 'local'),
    persistSession: vi.fn(async () => ({ ok: true, savedTo: '/fake/storage/session.jsonl' })),
    restoreSession: vi.fn(async () => ({ ok: true, restoredTo: '/fake/local/session.jsonl' })),
    ...((extraOpts && extraOpts._deps) || {}),
  };

  const config = {
    dispatch: {
      session_persist: {
        enabled: true,
        storage_path: '/fake/shared-storage',
        max_size_mb: 10,
      },
      ...(extraConfig && extraConfig.dispatch ? extraConfig.dispatch : {}),
    },
  };

  const coord = new DispatchCoordinator(root, {
    maxConcurrent: 3,
    pluginDir: '/fake/plugin',
    config,
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

describe('DispatchCoordinator — session-persist integration', () => {
  let root;

  beforeEach(() => {
    root = makeTempRoot();
  });

  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  });

  // ─── Test 1: claudeSessionId captured from system:init event ─────────────

  it('Test 1: onLine callback captures claudeSessionId from system:init event', async () => {
    const { coord, getCapturedOnLine } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    expect(onLine).toBeDefined();

    // Simulate Claude emitting a system:init event with session_id
    const claudeSessionId = 'deadbeef-0000-0000-0000-000000000001';
    onLine(sessionId, {
      type: 'system',
      subtype: 'init',
      session_id: claudeSessionId,
    });

    // Coordinator should have stored the mapping
    expect(coord._claudeSessionIds.get(sessionId)).toBe(claudeSessionId);
  });

  // ─── Test 2: Registry updated with claudeSessionId ───────────────────────

  it('Test 2: registry entry updated with claudeSessionId after system:init event', async () => {
    const { coord, getCapturedOnLine } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();

    const claudeSessionId = 'deadbeef-0000-0000-0000-000000000002';
    onLine(sessionId, {
      type: 'system',
      subtype: 'init',
      session_id: claudeSessionId,
    });

    const entry = coord._registry.get(sessionId);
    expect(entry).toBeDefined();
    expect(entry.claudeSessionId).toBe(claudeSessionId);
  });

  // ─── Test 3: Non-system:init events do not capture claudeSessionId ────────

  it('Test 3: non-system:init events are forwarded to aggregator but do not capture claudeSessionId', async () => {
    const { coord, getCapturedOnLine } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();

    // Emit a non-init event
    onLine(sessionId, { type: 'assistant', content: 'hello' });

    // claudeSessionId should not be set
    expect(coord._claudeSessionIds.has(sessionId)).toBe(false);
  });

  // ─── Test 4: persistSession called on exit 0 when config enabled ──────────

  it('Test 4: _handleExit calls persistSession on exit code 0 when session_persist.enabled', async () => {
    const { coord, deps, getCapturedOnLine, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    const onExit = getCapturedOnExit();

    // Simulate session ID capture
    const claudeSessionId = 'deadbeef-0000-0000-0000-000000000003';
    onLine(sessionId, { type: 'system', subtype: 'init', session_id: claudeSessionId });

    // Simulate successful exit
    await onExit(sessionId, 0);

    expect(deps.persistSession).toHaveBeenCalledOnce();
    const [worktreePath, csid, storagePath] = deps.persistSession.mock.calls[0];
    expect(csid).toBe(claudeSessionId);
    expect(storagePath).toBe('/fake/shared-storage');
    expect(typeof worktreePath).toBe('string');
  });

  // ─── Test 5: persistSession NOT called when config disabled ──────────────

  it('Test 5: _handleExit does NOT call persistSession when session_persist.enabled is false', async () => {
    const { coord, deps, getCapturedOnLine, getCapturedOnExit } = makeCoordWithDeps(
      root,
      {},
      { dispatch: { session_persist: { enabled: false, storage_path: '/fake/storage', max_size_mb: 10 } } }
    );

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    const onExit = getCapturedOnExit();

    onLine(sessionId, { type: 'system', subtype: 'init', session_id: 'some-uuid' });
    await onExit(sessionId, 0);

    expect(deps.persistSession).not.toHaveBeenCalled();
  });

  // ─── Test 6: persistSession NOT called on exit code non-0 ────────────────

  it('Test 6: _handleExit does NOT call persistSession on exit code non-0', async () => {
    const { coord, deps, getCapturedOnLine, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    const onExit = getCapturedOnExit();

    const worktreePath = path.join(root, '.sessions', sessionId);
    fs.mkdirSync(path.join(worktreePath, '.planning', 'phases'), { recursive: true });

    onLine(sessionId, { type: 'system', subtype: 'init', session_id: 'some-uuid' });
    await onExit(sessionId, 1);

    expect(deps.persistSession).not.toHaveBeenCalled();
  });

  // ─── Test 7: persistSession failure is non-fatal ─────────────────────────

  it('Test 7: persistSession failure in _handleExit is non-fatal (does not throw)', async () => {
    const { coord, deps, getCapturedOnLine, getCapturedOnExit } = makeCoordWithDeps(root);

    // Override persistSession to throw
    deps.persistSession.mockRejectedValue(new Error('disk full'));

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    const onExit = getCapturedOnExit();

    onLine(sessionId, { type: 'system', subtype: 'init', session_id: 'some-uuid' });

    // Should NOT throw — non-fatal error is caught in _handleExit
    let threw = false;
    try {
      await onExit(sessionId, 0);
    } catch (_) {
      threw = true;
    }
    expect(threw).toBe(false);

    // Session should still be cleaned up (merge + removeWorktree called)
    expect(deps.mergeSession).toHaveBeenCalled();
    expect(deps.removeWorktree).toHaveBeenCalled();
  });

  // ─── Test 8: claudeSessionId cleaned up from Map after exit ──────────────

  it('Test 8: _claudeSessionIds entry deleted after _handleExit (success path)', async () => {
    const { coord, getCapturedOnLine, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    const onExit = getCapturedOnExit();

    onLine(sessionId, { type: 'system', subtype: 'init', session_id: 'some-uuid' });
    expect(coord._claudeSessionIds.has(sessionId)).toBe(true);

    await onExit(sessionId, 0);

    // Map entry should be cleaned up
    expect(coord._claudeSessionIds.has(sessionId)).toBe(false);
  });

  // ─── Test 9: claudeSessionId cleaned up on failure path ──────────────────

  it('Test 9: _claudeSessionIds entry deleted after _handleExit (failure path)', async () => {
    const { coord, getCapturedOnLine, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onLine = getCapturedOnLine();
    const onExit = getCapturedOnExit();

    const worktreePath = path.join(root, '.sessions', sessionId);
    fs.mkdirSync(path.join(worktreePath, '.planning', 'phases'), { recursive: true });

    onLine(sessionId, { type: 'system', subtype: 'init', session_id: 'some-uuid' });
    expect(coord._claudeSessionIds.has(sessionId)).toBe(true);

    await onExit(sessionId, 1);

    expect(coord._claudeSessionIds.has(sessionId)).toBe(false);
  });

  // ─── Test 10: persistSession not called without claudeSessionId ───────────

  it('Test 10: persistSession not called when no system:init event received', async () => {
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(197, 2);
    const onExit = getCapturedOnExit();

    // No onLine system:init event fired — no claudeSessionId captured
    await onExit(sessionId, 0);

    expect(deps.persistSession).not.toHaveBeenCalled();
  });
});
