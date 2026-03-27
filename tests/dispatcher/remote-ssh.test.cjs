'use strict';

/**
 * remote-ssh.test.cjs -- Unit tests for packages/dispatcher/lib/remote-ssh.cjs
 *
 * Phase 146: Remote Dispatch
 * Satisfies: RMT-01, RMT-02, RMT-03
 *
 * Uses vitest globals (globals: true in vitest.config.ts).
 * Fully mocked NodeSSH -- no real SSH connections are made.
 * DI via opts._deps (NodeSSH, execFileSync) for CJS testability.
 */

const { PassThrough } = require('node:stream');
const { spawnRemoteSession } = require('../../packages/dispatcher/lib/remote-ssh.cjs');

// ─── Mock factory ─────────────────────────────────────────────────────────────

/**
 * Create a fresh mock SSH stack for each test.
 * mockChannel simulates an SSH2 channel with stdout/stderr streams + stdin stub.
 */
function createMockSSH() {
  const mockChannel = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: { end: vi.fn() },
    on: vi.fn(),
  };

  const mockSSH = {
    connect: vi.fn().mockResolvedValue(undefined),
    execCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
    connection: {
      exec: vi.fn((cmd, opts, cb) => cb(null, mockChannel)),
    },
    dispose: vi.fn(),
  };

  // Constructor function -- new MockNodeSSH() returns the same mockSSH instance
  function MockNodeSSH() { return mockSSH; }

  return { MockNodeSSH, mockSSH, mockChannel };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const remoteConfig = {
  host: 'test.example.com',
  username: 'testuser',
  identity_file: '/home/test/.ssh/id_ed25519',
  repo_path: '/home/testuser/project',
  plugin_dir: '/home/testuser/.claude/pde',
  env: {},
};

/**
 * Create opts with fresh mocks per test.
 * Returns opts with fresh MockNodeSSH + mockSSH + mockChannel + mockExecFileSync.
 */
function makeOpts(overrides) {
  const { MockNodeSSH, mockSSH, mockChannel } = createMockSSH();
  const mockExecFileSync = vi.fn();
  const opts = {
    sessionId: 'p146-1-abc12345',
    phase: 146,
    plan: 1,
    branch: 'pde/session/p146-1-abc12345',
    projectRoot: '/tmp/test-project',
    remoteConfig,
    onLine: vi.fn(),
    onExit: vi.fn(),
    _deps: { NodeSSH: MockNodeSSH, execFileSync: mockExecFileSync },
    ...overrides,
  };
  return { opts, mockSSH, mockChannel, mockExecFileSync };
}

// ─── Helper: let async IIFE settle ────────────────────────────────────────────

function settle(ms = 50) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('spawnRemoteSession', () => {

  it('Test 1: calls git push with correct branch before SSH connect', async () => {
    const { opts, mockSSH, mockExecFileSync } = makeOpts();

    // Track call order
    const callOrder = [];
    mockExecFileSync.mockImplementation((cmd, args) => {
      callOrder.push('execFileSync:' + args[0]);
    });
    mockSSH.connect.mockImplementation(async () => {
      callOrder.push('ssh:connect');
    });

    spawnRemoteSession(opts);
    await settle();

    // git push must come before SSH connect
    const pushIdx = callOrder.findIndex(e => e === 'execFileSync:push');
    const connectIdx = callOrder.findIndex(e => e === 'ssh:connect');
    expect(pushIdx).toBeGreaterThanOrEqual(0);
    expect(connectIdx).toBeGreaterThanOrEqual(0);
    expect(pushIdx).toBeLessThan(connectIdx);

    // Verify push args: git push origin <branch>
    const pushCall = mockExecFileSync.mock.calls.find(c => c[1][0] === 'push');
    expect(pushCall).toBeDefined();
    expect(pushCall[1]).toEqual(['push', 'origin', 'pde/session/p146-1-abc12345']);
    expect(pushCall[2].cwd).toBe('/tmp/test-project');
  });

  it('Test 2: SSH connect uses host, username, and privateKeyPath from remoteConfig', async () => {
    const { opts, mockSSH } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    expect(mockSSH.connect).toHaveBeenCalledOnce();
    const connectArgs = mockSSH.connect.mock.calls[0][0];
    expect(connectArgs.host).toBe('test.example.com');
    expect(connectArgs.username).toBe('testuser');
    expect(connectArgs.privateKeyPath).toBe('/home/test/.ssh/id_ed25519');
  });

  it('Test 3: SSH connect includes keepaliveInterval and keepaliveCountMax', async () => {
    const { opts, mockSSH } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    const connectArgs = mockSSH.connect.mock.calls[0][0];
    expect(connectArgs.keepaliveInterval).toBe(10000);
    expect(connectArgs.keepaliveCountMax).toBe(6);
    expect(connectArgs.readyTimeout).toBe(10000);
  });

  it('Test 4: creates remote worktree via execCommand with correct path', async () => {
    const { opts, mockSSH } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    const execCommandCalls = mockSSH.execCommand.mock.calls;
    const worktreeCall = execCommandCalls.find(c =>
      typeof c[0] === 'string' && c[0].includes('git worktree add')
    );
    expect(worktreeCall).toBeDefined();
    // Should include session-scoped path
    expect(worktreeCall[0]).toContain('/home/testuser/project/.sessions/p146-1-abc12345');
    expect(worktreeCall[0]).toContain('pde/session/p146-1-abc12345');
  });

  it('Test 5: remote command includes CLAUDECODE= prefix', async () => {
    const { opts, mockSSH } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    expect(mockSSH.connection.exec).toHaveBeenCalled();
    const execedCmd = mockSSH.connection.exec.mock.calls[0][0];
    expect(execedCmd).toContain('CLAUDECODE=');
  });

  it('Test 6: remote command includes PDE_SESSION_ID, PDE_PHASE, PDE_PLAN env vars', async () => {
    const { opts, mockSSH } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    const execedCmd = mockSSH.connection.exec.mock.calls[0][0];
    expect(execedCmd).toContain('PDE_SESSION_ID=p146-1-abc12345');
    expect(execedCmd).toContain('PDE_PHASE=146');
    expect(execedCmd).toContain('PDE_PLAN=1');
  });

  it('Test 7: channel.stdin.end() is called immediately (prevents hang)', async () => {
    const { opts, mockChannel } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    expect(mockChannel.stdin.end).toHaveBeenCalledOnce();
  });

  it('Test 8: NDJSON lines forwarded to onLine callback as parsed JSON', async () => {
    const { opts, mockChannel } = makeOpts();

    spawnRemoteSession(opts);
    await settle(20);

    // Emit a valid NDJSON line on stdout
    const testEvent = { type: 'assistant', content: [{ type: 'text', text: 'hello' }] };
    mockChannel.stdout.push(JSON.stringify(testEvent) + '\n');

    await settle(50);

    const lineCalls = opts.onLine.mock.calls.filter(c => c[1] && c[1].type === 'assistant');
    expect(lineCalls.length).toBeGreaterThan(0);
    expect(lineCalls[0][0]).toBe('p146-1-abc12345');
    expect(lineCalls[0][1]).toEqual(testEvent);
  });

  it('Test 9: on channel close, git fetch is called to pull results back', async () => {
    const { opts, mockChannel, mockExecFileSync } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    // Simulate channel close
    mockChannel.on.mock.calls
      .filter(c => c[0] === 'close')
      .forEach(c => c[1](0));

    await settle(50);

    const fetchCall = mockExecFileSync.mock.calls.find(c => c[1] && c[1][0] === 'fetch');
    expect(fetchCall).toBeDefined();
    expect(fetchCall[1]).toEqual(['fetch', 'origin', 'pde/session/p146-1-abc12345']);
    expect(fetchCall[2].cwd).toBe('/tmp/test-project');
  });

  it('Test 10: on channel close, remote worktree is cleaned up', async () => {
    const { opts, mockSSH, mockChannel } = makeOpts();

    spawnRemoteSession(opts);
    await settle();

    // Simulate channel close
    mockChannel.on.mock.calls
      .filter(c => c[0] === 'close')
      .forEach(c => c[1](0));

    await settle(50);

    const cleanupCall = mockSSH.execCommand.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('git worktree remove')
    );
    expect(cleanupCall).toBeDefined();
    expect(cleanupCall[0]).toContain('/home/testuser/project/.sessions/p146-1-abc12345');
    expect(cleanupCall[0]).toContain('--force');
  });

  it('Test 11: SSH connect error triggers onExit with code 1', async () => {
    const { opts, mockSSH } = makeOpts();

    mockSSH.connect.mockRejectedValue(new Error('Connection refused'));

    spawnRemoteSession(opts);
    await settle(100);

    expect(opts.onExit).toHaveBeenCalledWith('p146-1-abc12345', 1);
    const errorLine = opts.onLine.mock.calls.find(
      c => c[1] && c[1].subtype === 'ssh_error'
    );
    expect(errorLine).toBeDefined();
    expect(errorLine[1].message).toContain('Connection refused');
  });

  it('Test 12: kill() calls ssh.dispose()', async () => {
    const { opts, mockSSH } = makeOpts();

    const handle = spawnRemoteSession(opts);
    await settle(); // let async IIFE connect and set sshInstance

    handle.kill();

    expect(mockSSH.dispose).toHaveBeenCalled();
  });

});
