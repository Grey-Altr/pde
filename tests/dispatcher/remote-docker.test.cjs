'use strict';

/**
 * remote-docker.test.cjs -- Unit tests for packages/cloud-adapter/index.cjs
 *
 * Phase 191: Docker Container Backend
 * Satisfies: CLD-04, CLD-05, CLD-03
 *
 * Uses vitest globals (globals: true in vitest.config.ts).
 * Fully mocked dockerode -- no real Docker connections are made.
 * DI via opts._deps.Dockerode for CJS testability.
 */

const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { spawnDockerSession } = require('../../packages/cloud-adapter/index.cjs');

// ─── Mock factory ─────────────────────────────────────────────────────────────

/**
 * Create a fresh mock dockerode stack for each test.
 *
 * @param {object} opts
 * @param {number} [opts.exitCode=0]       - Exit code for container.wait()
 * @param {string[]} [opts.stdoutLines=[]] - NDJSON lines to emit on stdout
 * @param {string[]} [opts.stderrLines=[]] - Lines to emit on stderr
 */
function makeMockDockerode({ exitCode = 0, stdoutLines = [], stderrLines = [] } = {}) {
  // Track container config for assertions
  let capturedContainerConfig = null;
  let killCallCount = 0;

  // Create mock streams that can be controlled by tests
  const logStream = new PassThrough();
  const stdoutPass = new PassThrough();
  const stderrPass = new PassThrough();

  const mockContainer = {
    start: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn().mockImplementation(() => {
      killCallCount++;
      return Promise.resolve();
    }),
    wait: vi.fn().mockImplementation(() => {
      // Schedule stdout/stderr emission before exit
      setImmediate(() => {
        // Emit stdout lines
        for (const line of stdoutLines) {
          stdoutPass.push(line + '\n');
        }
        // Emit stderr lines
        for (const line of stderrLines) {
          stderrPass.push(Buffer.from(line + '\n'));
        }
        // End streams to trigger readline 'close'
        stdoutPass.end();
        stderrPass.end();
        logStream.destroy();
      });
      return Promise.resolve({ StatusCode: exitCode });
    }),
    logs: vi.fn().mockImplementation((opts, cb) => {
      cb(null, logStream);
    }),
    modem: {
      demuxStream: vi.fn().mockImplementation((stream, stdout, stderr) => {
        // In the real implementation, data flows via demuxStream.
        // Our mock directly pipes to the PassThrough streams we track.
        // The stdoutPass and stderrPass are connected via our mock setup.
        // We store them here so container.wait() can push data into them.
        mockContainer._stdoutPass = stdout;
        mockContainer._stderrPass = stderr;
      }),
    },
    _getKillCallCount: () => killCallCount,
    _getCapturedConfig: () => capturedContainerConfig,
    _logStream: logStream,
    _stdoutPass: stdoutPass,
    _stderrPass: stderrPass,
  };

  const mockDocker = {
    createContainer: vi.fn().mockImplementation((config) => {
      capturedContainerConfig = config;
      return Promise.resolve(mockContainer);
    }),
  };

  // Constructor function -- new MockDockerode() returns the same mockDocker instance
  function MockDockerode() {
    return mockDocker;
  }

  return { MockDockerode, mockDocker, mockContainer };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Standard test opts shape for all tests.
 */
function makeBaseOpts(overrides = {}) {
  const sessionId = 'test-session-001';
  const relayId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  return {
    sessionId,
    relayId,
    phase: 191,
    plan: 1,
    worktreePath: '/tmp/test-worktree',
    pluginDir: '/root/.claude/pde',
    dockerConfig: { image: 'pde-session:latest' },
    onLine: vi.fn(),
    onExit: vi.fn(),
    ...overrides,
  };
}

// ─── Cleanup helpers ──────────────────────────────────────────────────────────

const createdNdjsonPaths = [];

afterEach(() => {
  // Clean up any NDJSON files created during tests
  for (const p of createdNdjsonPaths.splice(0)) {
    try { fs.unlinkSync(p); } catch (_) {}
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('spawnDockerSession', () => {

  // ─── Test 1: CLD-04 — createContainer config ────────────────────────────────

  it('Test 1 (CLD-04): calls docker.createContainer with correct config', async () => {
    const { MockDockerode, mockDocker } = makeMockDockerode();
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);

    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    expect(mockDocker.createContainer).toHaveBeenCalledOnce();
    const config = mockDocker.createContainer.mock.calls[0][0];

    // Image
    expect(config.Image).toBe('pde-session:latest');

    // WorkingDir
    expect(config.WorkingDir).toBe('/workspace');

    // Critical flags
    expect(config.Tty).toBe(false);
    expect(config.OpenStdin).toBe(false);

    // HostConfig
    expect(config.HostConfig.Binds).toContain('/tmp/test-worktree:/workspace');
    expect(config.HostConfig.AutoRemove).toBe(true);

    // Labels
    expect(config.Labels['pde-session']).toBe('test-session-001');

    // Cmd starts with 'claude'
    expect(config.Cmd[0]).toBe('claude');
    expect(config.Cmd).toContain('--print');
    expect(config.Cmd).toContain('--dangerously-skip-permissions');
  });

  // ─── Test 2: CLD-04 — container.start() called after createContainer ────────

  it('Test 2 (CLD-04): calls container.start() after createContainer', async () => {
    const { MockDockerode, mockContainer } = makeMockDockerode();
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    const callOrder = [];
    const origCreate = mockContainer.start;
    mockContainer.start = vi.fn().mockImplementation(async () => {
      callOrder.push('start');
    });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    expect(mockContainer.start).toHaveBeenCalledOnce();
  });

  // ─── Test 3: CLD-05 — onLine receives parsed JSON from stdout ───────────────

  it('Test 3 (CLD-05): onLine callback receives parsed JSON events from container stdout', async () => {
    const testEvent = { type: 'assistant', content: [{ type: 'text', text: 'hello' }] };
    const { MockDockerode } = makeMockDockerode({
      stdoutLines: [JSON.stringify(testEvent)],
    });
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    const lineCalls = opts.onLine.mock.calls.filter(c => c[1] && c[1].type === 'assistant');
    expect(lineCalls.length).toBeGreaterThan(0);
    expect(lineCalls[0][0]).toBe('test-session-001');
    expect(lineCalls[0][1]).toEqual(testEvent);
  });

  // ─── Test 4: CLD-05 — stderr forwarded as { type:'system', subtype:'stderr' }

  it('Test 4 (CLD-05): onLine callback receives { type:"system", subtype:"stderr" } for stderr output', async () => {
    const { MockDockerode } = makeMockDockerode({
      stderrLines: ['Error: something went wrong'],
    });
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    const stderrCalls = opts.onLine.mock.calls.filter(
      c => c[1] && c[1].type === 'system' && c[1].subtype === 'stderr'
    );
    expect(stderrCalls.length).toBeGreaterThan(0);
    expect(stderrCalls[0][0]).toBe('test-session-001');
    expect(stderrCalls[0][1].message).toContain('Error: something went wrong');
  });

  // ─── Test 5: CLD-05 — onExit receives exit code 0 ──────────────────────────

  it('Test 5 (CLD-05): onExit callback receives exit code from container.wait() StatusCode:0', async () => {
    const { MockDockerode } = makeMockDockerode({ exitCode: 0 });
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    expect(opts.onExit).toHaveBeenCalledWith('test-session-001', 0);
  });

  // ─── Test 6: CLD-05 — onExit receives exit code 1 ──────────────────────────

  it('Test 6 (CLD-05): onExit receives exitCode=1 when container.wait() returns StatusCode:1', async () => {
    const { MockDockerode } = makeMockDockerode({ exitCode: 1 });
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    expect(opts.onExit).toHaveBeenCalledWith('test-session-001', 1);
  });

  // ─── Test 7: CLD-03 — NDJSON file written ───────────────────────────────────

  it('Test 7 (CLD-03): NDJSON file is written to /tmp/pde-session-{effectiveSessionId}.ndjson', async () => {
    const testEvent = { type: 'text', text: 'ndjson test' };
    const { MockDockerode } = makeMockDockerode({
      stdoutLines: [JSON.stringify(testEvent)],
    });
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });
    const expectedPath = path.join(os.tmpdir(), `pde-session-${opts.relayId}.ndjson`);
    createdNdjsonPaths.push(expectedPath);

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    // Give a tick for ndjsonStream.end() to flush
    await new Promise(r => setTimeout(r, 50));

    expect(fs.existsSync(expectedPath)).toBe(true);
    const content = fs.readFileSync(expectedPath, 'utf-8');
    expect(content).toContain(JSON.stringify(testEvent));
  });

  // ─── Test 8: kill() calls containerInstance.kill() ──────────────────────────

  it('Test 8: kill() calls containerInstance.kill() when container is running', async () => {
    const { MockDockerode, mockContainer } = makeMockDockerode();
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    const handle = spawnDockerSession(opts);

    // Wait for container to be assigned (start called)
    await vi.waitFor(() => expect(mockContainer.start).toHaveBeenCalled(), { timeout: 2000 });

    handle.kill();

    expect(mockContainer.kill).toHaveBeenCalled();
  });

  // ─── Test 9: kill() safe before container starts ────────────────────────────

  it('Test 9: kill() is safe to call before container starts (containerInstance is null)', () => {
    // We need to delay createContainer resolution so kill fires first
    let resolveCreate;
    const slowDockerode = function MockDockerode() {
      return {
        createContainer: vi.fn().mockImplementation(() => new Promise(res => {
          resolveCreate = res;
        })),
      };
    };
    const opts = makeBaseOpts({ _deps: { Dockerode: slowDockerode } });

    const handle = spawnDockerSession(opts);

    // kill() fires before container resolves -- must not throw
    expect(() => handle.kill()).not.toThrow();

    // Clean up: resolve the promise so no dangling async
    if (resolveCreate) {
      const noop = { start: vi.fn(), kill: vi.fn(), wait: vi.fn().mockResolvedValue({ StatusCode: 0 }), logs: vi.fn(), modem: { demuxStream: vi.fn() } };
      resolveCreate(noop);
    }
  });

  // ─── Test 10: Top-level async error fires onLine + onExit ───────────────────

  it('Test 10: top-level async error fires onLine with docker_error subtype and onExit with code 1', async () => {
    const errorDockerode = function MockDockerode() {
      return {
        createContainer: vi.fn().mockRejectedValue(new Error('Docker daemon not running')),
      };
    };
    const opts = makeBaseOpts({ _deps: { Dockerode: errorDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    expect(opts.onExit).toHaveBeenCalledWith('test-session-001', 1);

    const errorLine = opts.onLine.mock.calls.find(
      c => c[1] && c[1].type === 'system' && c[1].subtype === 'docker_error'
    );
    expect(errorLine).toBeDefined();
    expect(errorLine[1].message).toContain('Docker daemon not running');
  });

  // ─── Test 11: CLAUDECODE env var is set to empty string ─────────────────────

  it('Test 11: CLAUDECODE env var is set to empty string (prevents nested session)', async () => {
    const { MockDockerode, mockDocker } = makeMockDockerode();
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    const config = mockDocker.createContainer.mock.calls[0][0];
    expect(config.Env).toBeDefined();
    expect(config.Env).toContain('CLAUDECODE=');
  });

  // ─── Test 12: Container labels include pde-session={sessionId} ──────────────

  it('Test 12: Container labels include pde-session={sessionId}', async () => {
    const { MockDockerode, mockDocker } = makeMockDockerode();
    const opts = makeBaseOpts({ _deps: { Dockerode: MockDockerode } });

    spawnDockerSession(opts);
    await vi.waitFor(() => expect(opts.onExit).toHaveBeenCalled(), { timeout: 2000 });

    const config = mockDocker.createContainer.mock.calls[0][0];
    expect(config.Labels).toBeDefined();
    expect(config.Labels['pde-session']).toBe('test-session-001');
  });

});
