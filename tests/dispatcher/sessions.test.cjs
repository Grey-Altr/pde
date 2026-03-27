'use strict';

/**
 * sessions.test.cjs — Unit tests for list-sessions and stop-session subcommands
 *
 * Phase 149, Plan 02
 * Tests the core logic for session listing with PID probing and session stopping.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SessionRegistry } = require('../../packages/dispatcher/lib/registry.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempRoot() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sessions-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
  return tmpDir;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

function writeRegistryFile(root, sessions) {
  fs.writeFileSync(
    path.join(root, '.planning', 'dispatcher.pids'),
    JSON.stringify({ sessions }, null, 2)
  );
}

// ─── list-sessions logic ──────────────────────────────────────────────────────

/**
 * Core list-sessions logic extracted for testability.
 * Mirrors the implementation in pde-tools.cjs case 'list-sessions'.
 */
function listSessions(registry) {
  const sessions = [];
  for (const [id, entry] of registry.getAll()) {
    let liveStatus = entry.status;
    if (entry.status === 'running' && entry.pid > 0) {
      try { process.kill(entry.pid, 0); }
      catch (e) { if (e.code === 'ESRCH') liveStatus = 'orphaned'; }
    }
    const elapsed = entry.startedAt
      ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 1000)
      : null;
    sessions.push({
      id,
      phase: entry.phase,
      plan: entry.plan,
      status: liveStatus,
      backend: entry.backend || 'local',
      pid: entry.pid || null,
      startedAt: entry.startedAt || null,
      elapsedSeconds: elapsed,
    });
  }
  sessions.sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
  return sessions;
}

/**
 * Core stop-session logic extracted for testability.
 * Returns result object instead of calling output/error.
 */
function stopSession(registry, sessionId) {
  if (!sessionId) return { error: 'Usage: pde-tools stop-session <sessionId>' };
  const entry = registry.get(sessionId);
  if (!entry) return { error: `Session not found: ${sessionId}` };
  if (entry.status !== 'running') {
    return { stopped: false, reason: `Session already ${entry.status}` };
  }
  if (entry.backend && entry.backend !== 'local') {
    const msg = `Cannot stop remote session via CLI. SSH to ${entry.remoteHost || 'remote host'} and kill manually.`;
    return { stopped: false, remote: true, instructions: msg };
  }
  if (entry.pid > 0) {
    try { process.kill(entry.pid, 'SIGTERM'); } catch (_) {}
  }
  registry.update(sessionId, { status: 'stopped' });
  return { stopped: true, sessionId, worktreePath: entry.worktreePath };
}

// ─── list-sessions tests ──────────────────────────────────────────────────────

describe('list-sessions', () => {
  it('Test 1: empty registry returns empty array', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const sessions = listSessions(registry);
      expect(sessions).toEqual([]);
    } finally {
      cleanup(root);
    }
  });

  it('Test 2: running session with live PID returns status=running', () => {
    const root = makeTempRoot();
    try {
      const livePid = process.pid; // guaranteed alive
      writeRegistryFile(root, {
        'p149-live': {
          pid: livePid,
          phase: 149,
          plan: 2,
          worktreePath: '/tmp/.sessions/p149-live',
          branch: 'pde/session/p149-live',
          status: 'running',
          startedAt: new Date().toISOString(),
          backend: 'local',
        },
      });
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const sessions = listSessions(registry);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('running');
      expect(sessions[0].id).toBe('p149-live');
    } finally {
      cleanup(root);
    }
  });

  it('Test 3: running session with dead PID returns status=orphaned', () => {
    const root = makeTempRoot();
    try {
      const deadPid = 9999997; // extremely unlikely to exist
      writeRegistryFile(root, {
        'p149-dead': {
          pid: deadPid,
          phase: 149,
          plan: 2,
          worktreePath: '/tmp/.sessions/p149-dead',
          branch: 'pde/session/p149-dead',
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      });
      const registry = new SessionRegistry(root);
      // loadFromDisk marks dead PIDs as 'orphaned' in registry.
      // Our listSessions logic also re-probes, but since registry already
      // marks it 'orphaned', liveStatus stays 'orphaned'.
      registry.loadFromDisk();
      const sessions = listSessions(registry);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('orphaned');
    } finally {
      cleanup(root);
    }
  });

  it('Test 4: session includes phase, plan, backend, startedAt, elapsedSeconds fields', () => {
    const root = makeTempRoot();
    try {
      const livePid = process.pid;
      const startedAt = new Date(Date.now() - 90000).toISOString(); // 90 seconds ago
      writeRegistryFile(root, {
        'p149-fields': {
          pid: livePid,
          phase: 149,
          plan: 2,
          worktreePath: '/tmp/.sessions/p149-fields',
          branch: 'pde/session/p149-fields',
          status: 'running',
          startedAt,
          backend: 'ssh',
        },
      });
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const sessions = listSessions(registry);
      expect(sessions).toHaveLength(1);
      const s = sessions[0];
      expect(s.phase).toBe(149);
      expect(s.plan).toBe(2);
      expect(s.backend).toBe('ssh');
      expect(s.startedAt).toBe(startedAt);
      expect(typeof s.elapsedSeconds).toBe('number');
      expect(s.elapsedSeconds).toBeGreaterThanOrEqual(80);
    } finally {
      cleanup(root);
    }
  });
});

// ─── stop-session tests ───────────────────────────────────────────────────────

describe('stop-session', () => {
  it('Test 5: stop-session with no sessionId returns error', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const result = stopSession(registry, undefined);
      expect(result.error).toMatch(/Usage/);
    } finally {
      cleanup(root);
    }
  });

  it('Test 6: stop-session with unknown sessionId returns error', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const result = stopSession(registry, 'nonexistent-session');
      expect(result.error).toMatch(/not found/);
    } finally {
      cleanup(root);
    }
  });

  it('Test 7: stop-session with status=complete returns already complete without killing', () => {
    const root = makeTempRoot();
    try {
      const killSpy = vi.spyOn(process, 'kill');
      writeRegistryFile(root, {
        'p149-complete': {
          pid: 12345,
          phase: 149,
          plan: 2,
          worktreePath: '/tmp/.sessions/p149-complete',
          branch: 'pde/session/p149-complete',
          status: 'complete',
          startedAt: new Date().toISOString(),
        },
      });
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const result = stopSession(registry, 'p149-complete');
      expect(result.stopped).toBe(false);
      expect(result.reason).toMatch(/already complete/);
      // process.kill should not have been called with SIGTERM
      const sigtermCalls = killSpy.mock.calls.filter(c => c[1] === 'SIGTERM');
      expect(sigtermCalls).toHaveLength(0);
      killSpy.mockRestore();
    } finally {
      cleanup(root);
    }
  });

  it('Test 8: stop-session with remote backend (pid=0) returns manual instructions', () => {
    const root = makeTempRoot();
    try {
      writeRegistryFile(root, {
        'p149-remote': {
          pid: 0,
          phase: 149,
          plan: 2,
          worktreePath: '/tmp/.sessions/p149-remote',
          branch: 'pde/session/p149-remote',
          status: 'running',
          startedAt: new Date().toISOString(),
          backend: 'ssh',
          remoteHost: 'gpu-server.example.com',
        },
      });
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();
      const result = stopSession(registry, 'p149-remote');
      expect(result.stopped).toBe(false);
      expect(result.remote).toBe(true);
      expect(result.instructions).toMatch(/SSH/);
      expect(result.instructions).toMatch(/gpu-server\.example\.com/);
    } finally {
      cleanup(root);
    }
  });

  it('Test 9: stop-session with local running session (pid > 0) sends SIGTERM and updates status to stopped', () => {
    const root = makeTempRoot();
    try {
      // Use current process PID (live) so loadFromDisk keeps it as 'running'
      const testPid = process.pid;
      writeRegistryFile(root, {
        'p149-running': {
          pid: testPid,
          phase: 149,
          plan: 2,
          worktreePath: '/tmp/.sessions/p149-running',
          branch: 'pde/session/p149-running',
          status: 'running',
          startedAt: new Date().toISOString(),
          backend: 'local',
        },
      });
      const registry = new SessionRegistry(root);
      registry.loadFromDisk();

      // Spy on process.kill AFTER loadFromDisk to only capture stopSession calls
      const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, sig) => {
        // Allow SIGTERM for our test pid; swallow silently
        return undefined;
      });

      const result = stopSession(registry, 'p149-running');
      expect(result.stopped).toBe(true);
      expect(result.sessionId).toBe('p149-running');

      // Verify SIGTERM was sent to the correct PID
      const sigtermCalls = killSpy.mock.calls.filter(c => c[0] === testPid && c[1] === 'SIGTERM');
      expect(sigtermCalls).toHaveLength(1);

      // Verify registry was updated
      const updated = registry.get('p149-running');
      expect(updated.status).toBe('stopped');

      killSpy.mockRestore();
    } finally {
      cleanup(root);
    }
  });

  it('Test 10: stop-session never calls process.kill(0, ...) — PID 0 guard', () => {
    const root = makeTempRoot();
    try {
      // Local session with pid=0 (edge case — e.g. malformed entry)
      // Use registry.register then manually update pid to 0 to avoid loadFromDisk PID probing
      const registry = new SessionRegistry(root);
      // Directly set an entry with pid=0 and status=running (bypass loadFromDisk)
      registry._map.set('p149-pid0', {
        pid: 0,
        phase: 149,
        plan: 2,
        worktreePath: '/tmp/.sessions/p149-pid0',
        branch: 'pde/session/p149-pid0',
        status: 'running',
        startedAt: new Date().toISOString(),
        backend: 'local', // local backend, pid=0 — should NOT kill
      });

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => undefined);
      stopSession(registry, 'p149-pid0');

      // Verify process.kill was NEVER called with PID 0 (SIGTERM or signal check)
      const pid0Calls = killSpy.mock.calls.filter(c => c[0] === 0);
      expect(pid0Calls).toHaveLength(0);

      killSpy.mockRestore();
    } finally {
      cleanup(root);
    }
  });
});
