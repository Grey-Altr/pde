'use strict';

/**
 * coordinator-relay.test.cjs — Unit tests for relay lifecycle in DispatchCoordinator
 *
 * Phase 152: Parallel Relay Wiring
 * Satisfies: RLY-01, RLY-02
 *
 * Tests relay spawning, cleanup, graceful degradation (no PDE_REMOTE),
 * correct argv construction, and aggregator UUID correlation.
 *
 * Uses dependency injection via opts._deps (same pattern as coordinator-smoke.test.cjs).
 * All relay spawn behavior is exercised without touching the real relay.cjs process.
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { DispatchCoordinator } = require('../../packages/dispatcher/lib/coordinator.cjs');

// UUID v4 regex
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT_BASE = path.join(os.tmpdir(), 'pde-relay-test-' + process.pid);

function makeTempRoot() {
  const root = fs.mkdtempSync(PROJECT_ROOT_BASE + '-');
  fs.mkdirSync(path.join(root, '.planning'), { recursive: true });
  return root;
}

/**
 * Create a DispatchCoordinator with all dependencies injected as vi.fn() stubs.
 * Includes spawnChildProcess stub for relay spawning (Phase 152).
 */
function makeCoordWithDeps(root, extraOpts) {
  let capturedOnExit;
  let capturedOnLine;

  const relayKillFn = vi.fn();

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
    // Phase 152: relay child process stub
    spawnChildProcess: vi.fn(() => ({
      pid: 8888,
      kill: relayKillFn,
      unref: vi.fn(),
    })),
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
    relayKillFn,
    getCapturedOnExit: () => capturedOnExit,
    getCapturedOnLine: () => capturedOnLine,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('DispatchCoordinator — relay lifecycle (Phase 152)', () => {
  let root;
  const origPdeRemote = process.env.PDE_REMOTE;
  const origPdeRelayToken = process.env.PDE_RELAY_TOKEN;

  beforeEach(() => {
    root = makeTempRoot();
    // Clean slate for env vars
    delete process.env.PDE_REMOTE;
    delete process.env.PDE_RELAY_TOKEN;
  });

  afterEach(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
    // Restore original env
    if (origPdeRemote !== undefined) process.env.PDE_REMOTE = origPdeRemote;
    else delete process.env.PDE_REMOTE;
    if (origPdeRelayToken !== undefined) process.env.PDE_RELAY_TOKEN = origPdeRelayToken;
    else delete process.env.PDE_RELAY_TOKEN;
  });

  // ─── Test 1: pde-tools.cjs source inspection ────────────────────────────

  it('Test 1: session-start in pde-tools.cjs honors PDE_SESSION_ID env var', () => {
    const pdeToolsPath = path.resolve(__dirname, '../../bin/pde-tools.cjs');
    const source = fs.readFileSync(pdeToolsPath, 'utf8');
    expect(source).toContain('process.env.PDE_SESSION_ID');
  });

  // ─── Test 2: _spawnRelay called with UUID during dispatch ───────────────

  it('Test 2: _spawnRelay is called with a valid UUID when PDE_REMOTE is set', async () => {
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatch(152, 1);

    expect(deps.spawnChildProcess).toHaveBeenCalled();
    // Second arg is the argv array: [relayScript, sessionId(UUID), ingestUrl, bearerToken]
    const callArgs = deps.spawnChildProcess.mock.calls[0];
    const argv = callArgs[1]; // second argument = args array
    expect(Array.isArray(argv)).toBe(true);
    expect(argv.length).toBeGreaterThanOrEqual(2);
    // argv[1] is the UUID (relayId)
    expect(argv[1]).toMatch(UUID_V4_RE);
  });

  // ─── Test 3: _spawnRelay returns null when PDE_REMOTE not set ───────────

  it('Test 3: _spawnRelay is NOT called when PDE_REMOTE is not set', async () => {
    // PDE_REMOTE is deleted in beforeEach
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatch(152, 1);

    expect(deps.spawnChildProcess).not.toHaveBeenCalled();
  });

  // ─── Test 4: Correct argv passed to spawnChildProcess ───────────────────

  it('Test 4: spawnChildProcess receives correct argv [relayScript, uuid, ingestUrl, bearerToken]', async () => {
    process.env.PDE_REMOTE = 'https://dash.example.com';
    process.env.PDE_RELAY_TOKEN = 'tok123';
    const { coord, deps } = makeCoordWithDeps(root);

    await coord.dispatch(152, 1);

    expect(deps.spawnChildProcess).toHaveBeenCalled();
    const [execPath, argv] = deps.spawnChildProcess.mock.calls[0];
    // First arg: process.execPath (node binary)
    expect(typeof execPath).toBe('string');
    expect(execPath).toBe(process.execPath);
    // argv: [relayScript, uuid, ingestUrl, bearerToken]
    expect(argv[0]).toMatch(/relay\.cjs$/);
    expect(argv[1]).toMatch(UUID_V4_RE);
    expect(argv[2]).toBe('https://dash.example.com');
    expect(argv[3]).toBe('tok123');
  });

  // ─── Test 5: Relay killed on session exit ───────────────────────────────

  it('Test 5: relay kill() is called when the session exits', async () => {
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';
    const relayKillFn = vi.fn();
    const { coord, deps, getCapturedOnExit } = makeCoordWithDeps(root);
    // Override spawnChildProcess to track its kill
    deps.spawnChildProcess.mockReturnValue({
      pid: 7777,
      kill: relayKillFn,
      unref: vi.fn(),
    });

    const sessionId = await coord.dispatch(152, 1);
    const onExit = getCapturedOnExit();

    await onExit(sessionId, 0);

    expect(relayKillFn).toHaveBeenCalled();
  });

  // ─── Test 6: shutdown kills all relays ──────────────────────────────────

  it('Test 6: shutdown() kills all relay processes', async () => {
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';

    const killFn1 = vi.fn();
    const killFn2 = vi.fn();
    let callCount = 0;

    const { coord, deps } = makeCoordWithDeps(root);
    deps.spawnChildProcess.mockImplementation(() => {
      callCount++;
      return {
        pid: 8000 + callCount,
        kill: callCount === 1 ? killFn1 : killFn2,
        unref: vi.fn(),
      };
    });

    await coord.dispatch(152, 1);
    await coord.dispatch(153, 1);

    coord.shutdown();

    expect(killFn1).toHaveBeenCalled();
    expect(killFn2).toHaveBeenCalled();
  });

  // ─── Test 7: aggregator.watch called with UUID (not coordinator sessionId) ──

  it('Test 7: aggregator.watch is called with a UUID (relayId), not the p152-1-... coordinator ID', async () => {
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';
    const { coord } = makeCoordWithDeps(root);

    const watchSpy = vi.spyOn(coord._aggregator, 'watch');

    await coord.dispatch(152, 1);

    expect(watchSpy).toHaveBeenCalledOnce();
    const watchArg = watchSpy.mock.calls[0][0];
    // Must be a UUID v4, not the p152-1-xxxxxxxx format
    expect(watchArg).toMatch(UUID_V4_RE);
    expect(watchArg).not.toMatch(/^p\d+/);
  });

  // ─── Test 8: relay handle stored in _relays Map ─────────────────────────

  it('Test 8: relay handle is stored in _relays Map after dispatch when PDE_REMOTE is set', async () => {
    process.env.PDE_REMOTE = 'https://example.com/api/ingest';
    const { coord } = makeCoordWithDeps(root);

    const sessionId = await coord.dispatch(152, 1);

    expect(coord._relays).toBeDefined();
    expect(coord._relays).toBeInstanceOf(Map);
    expect(coord._relays.has(sessionId)).toBe(true);
  });
});
