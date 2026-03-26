'use strict';

/**
 * spawn.test.cjs — Unit tests for packages/dispatcher/lib/spawn.cjs
 *
 * Uses vitest globals (no require('vitest') — globals: true in vitest.config.ts).
 * Spies on child_process.spawn to return a fake ChildProcess.
 * No real claude process is spawned.
 */

const childProcess = require('node:child_process');
const { PassThrough, EventEmitter } = require('node:stream');
const { spawnSession } = require('../../packages/dispatcher/lib/spawn.cjs');

/**
 * Create a fake ChildProcess (EventEmitter with stdout/stderr PassThrough streams).
 */
function makeFakeChild(pid = 12345) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn((signal = 'SIGTERM') => {});
  return child;
}

describe('spawnSession', () => {
  let fakeChild;
  let spawnSpy;
  let capturedArgs;
  let capturedOpts;

  beforeEach(() => {
    fakeChild = makeFakeChild(42);
    spawnSpy = vi.spyOn(childProcess, 'spawn').mockImplementation((cmd, args, opts) => {
      capturedArgs = args;
      capturedOpts = opts;
      return fakeChild;
    });
  });

  afterEach(() => {
    spawnSpy.mockRestore();
  });

  it('Test 1: returns object with numeric pid and callable kill function', () => {
    const result = spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-abc',
      phase: 144,
      plan: 1,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit: vi.fn(),
    });

    expect(result).toHaveProperty('pid');
    expect(typeof result.pid).toBe('number');
    expect(result.pid).toBe(42);
    expect(typeof result.kill).toBe('function');
  });

  it('Test 2: child env has CLAUDECODE deleted, PDE_* vars set', () => {
    // Set up process.env with CLAUDECODE so we can verify it is stripped
    const origClaudecode = process.env.CLAUDECODE;
    process.env.CLAUDECODE = '1';

    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-test',
      phase: 144,
      plan: 2,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit: vi.fn(),
    });

    const env = capturedOpts.env;
    expect(env.CLAUDECODE).toBeUndefined();
    expect(env.PDE_SESSION_ID).toBe('p144-test');
    expect(env.PDE_PHASE).toBe('144');
    expect(env.PDE_PLAN).toBe('2');
    expect(env.PDE_SESSION_START).toBeDefined();
    expect(typeof env.PDE_SESSION_START).toBe('string');

    // Restore
    if (origClaudecode === undefined) delete process.env.CLAUDECODE;
    else process.env.CLAUDECODE = origClaudecode;
  });

  it('Test 3: args array contains all required flags', () => {
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-args',
      phase: 144,
      plan: 3,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit: vi.fn(),
    });

    expect(capturedArgs).toContain('--print');
    expect(capturedArgs).toContain('--bare');
    expect(capturedArgs).toContain('--output-format');
    expect(capturedArgs).toContain('stream-json');
    expect(capturedArgs).toContain('--verbose');
    expect(capturedArgs).toContain('--dangerously-skip-permissions');
    expect(capturedArgs).toContain('--plugin-dir');
    expect(capturedArgs).toContain('--append-system-prompt');
  });

  it('Test 4: stdio config is exactly ["ignore", "pipe", "pipe"]', () => {
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-stdio',
      phase: 144,
      plan: 1,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit: vi.fn(),
    });

    expect(capturedOpts.stdio).toEqual(['ignore', 'pipe', 'pipe']);
  });

  it('Test 5: onLine callback receives (sessionId, parsedEvent) for valid JSON stdout', async () => {
    const onLine = vi.fn();
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-online',
      phase: 144,
      plan: 1,
      pluginDir: '/tmp/plugins',
      onLine,
      onExit: vi.fn(),
    });

    const testEvent = { type: 'assistant', content: [{ type: 'text', text: 'hello' }] };
    fakeChild.stdout.push(JSON.stringify(testEvent) + '\n');

    // Give readline time to process
    await new Promise(r => setTimeout(r, 20));

    expect(onLine).toHaveBeenCalledWith('p144-online', testEvent);
  });

  it('Test 6: onLine receives { type: "system", subtype: "stderr" } for stderr output', async () => {
    const onLine = vi.fn();
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-stderr',
      phase: 144,
      plan: 1,
      pluginDir: '/tmp/plugins',
      onLine,
      onExit: vi.fn(),
    });

    fakeChild.stderr.push('some error message\n');
    await new Promise(r => setTimeout(r, 20));

    const stderrCalls = onLine.mock.calls.filter(c => c[1] && c[1].subtype === 'stderr');
    expect(stderrCalls.length).toBeGreaterThan(0);
    const [sid, event] = stderrCalls[0];
    expect(sid).toBe('p144-stderr');
    expect(event.type).toBe('system');
    expect(event.subtype).toBe('stderr');
    expect(event.message).toContain('some error message');
  });

  it('Test 7: onExit callback receives (sessionId, exitCode); null exitCode defaults to 1', async () => {
    const onExit = vi.fn();
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-exit',
      phase: 144,
      plan: 1,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit,
    });

    fakeChild.emit('close', null);
    await new Promise(r => setTimeout(r, 20));

    expect(onExit).toHaveBeenCalledWith('p144-exit', 1);
  });

  it('Test 7b: onExit callback receives non-zero exit code', async () => {
    const onExit = vi.fn();
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-exit2',
      phase: 144,
      plan: 1,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit,
    });

    fakeChild.emit('close', 2);
    await new Promise(r => setTimeout(r, 20));

    expect(onExit).toHaveBeenCalledWith('p144-exit2', 2);
  });

  it('Test 8: prompt is constructed as "Execute phase N, plan M. Run /gsd:execute-plan N M."', () => {
    spawnSession({
      worktreePath: '/tmp/wt',
      sessionId: 'p144-prompt',
      phase: 144,
      plan: 5,
      pluginDir: '/tmp/plugins',
      onLine: vi.fn(),
      onExit: vi.fn(),
    });

    const lastArg = capturedArgs[capturedArgs.length - 1];
    expect(lastArg).toBe('Execute phase 144, plan 5. Run /gsd:execute-plan 144 5.');
  });
});
