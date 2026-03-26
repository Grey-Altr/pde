'use strict';

/**
 * registry.test.cjs — Unit tests for packages/dispatcher/lib/registry.cjs
 *
 * Uses vitest globals (no require('vitest') — globals: true in vitest.config.ts).
 * Creates real SessionRegistry instances against temp dirs.
 * Mocks process.kill for stale PID detection in loadFromDisk tests.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SessionRegistry } = require('../../packages/dispatcher/lib/registry.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a temp directory with a .planning subdir (mirrors real project structure).
 */
function makeTempRoot() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-registry-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
  return tmpDir;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('SessionRegistry constructor', () => {
  it('Test 1: constructor creates empty Map and sets pidFile to .planning/dispatcher.pids', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      expect(registry.getAll().size).toBe(0);
      expect(registry._pidFile).toBe(path.join(root, '.planning', 'dispatcher.pids'));
      expect(registry._tmpFile).toBe(path.join(root, '.planning', 'dispatcher.pids.tmp'));
    } finally {
      cleanup(root);
    }
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('SessionRegistry register', () => {
  it('Test 2: register() adds entry with status "running" and startedAt, then flushes to disk', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.register('p144-abc', {
        pid: 12345,
        phase: 144,
        plan: 1,
        worktreePath: '/tmp/.sessions/p144-abc',
        branch: 'pde/session/p144-abc',
      });

      const entry = registry.get('p144-abc');
      expect(entry).toBeDefined();
      expect(entry.pid).toBe(12345);
      expect(entry.phase).toBe(144);
      expect(entry.plan).toBe(1);
      expect(entry.status).toBe('running');
      expect(typeof entry.startedAt).toBe('string');
      // startedAt should be a valid ISO date
      expect(() => new Date(entry.startedAt)).not.toThrow();

      // Verify disk was flushed
      const onDisk = JSON.parse(fs.readFileSync(registry._pidFile, 'utf8'));
      expect(onDisk.sessions['p144-abc']).toBeDefined();
      expect(onDisk.sessions['p144-abc'].status).toBe('running');
    } finally {
      cleanup(root);
    }
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('SessionRegistry update', () => {
  it('Test 3: update() merges updates into existing entry and flushes', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.register('p144-upd', {
        pid: 99,
        phase: 144,
        plan: 2,
        worktreePath: '/tmp/.sessions/p144-upd',
        branch: 'pde/session/p144-upd',
      });

      registry.update('p144-upd', { status: 'complete', exitCode: 0 });

      const entry = registry.get('p144-upd');
      expect(entry.status).toBe('complete');
      expect(entry.exitCode).toBe(0);
      expect(entry.pid).toBe(99); // original fields preserved

      // Verify disk
      const onDisk = JSON.parse(fs.readFileSync(registry._pidFile, 'utf8'));
      expect(onDisk.sessions['p144-upd'].status).toBe('complete');
    } finally {
      cleanup(root);
    }
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('SessionRegistry remove', () => {
  it('Test 4: remove() deletes entry from Map and flushes', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.register('p144-del', {
        pid: 77,
        phase: 144,
        plan: 3,
        worktreePath: '/tmp/.sessions/p144-del',
        branch: 'pde/session/p144-del',
      });

      registry.remove('p144-del');

      expect(registry.get('p144-del')).toBeUndefined();
      expect(registry.getAll().size).toBe(0);

      // Verify disk
      const onDisk = JSON.parse(fs.readFileSync(registry._pidFile, 'utf8'));
      expect(onDisk.sessions['p144-del']).toBeUndefined();
    } finally {
      cleanup(root);
    }
  });
});

// ─── get and getAll ───────────────────────────────────────────────────────────

describe('SessionRegistry get/getAll', () => {
  it('Test 5: get() returns entry or undefined', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      expect(registry.get('nonexistent')).toBeUndefined();

      registry.register('p144-get', {
        pid: 55,
        phase: 144,
        plan: 1,
        worktreePath: '/tmp/wt',
        branch: 'pde/session/p144-get',
      });

      expect(registry.get('p144-get')).toBeDefined();
      expect(registry.get('p144-get').pid).toBe(55);
    } finally {
      cleanup(root);
    }
  });

  it('Test 6: getAll() returns a new Map (copy, not reference)', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.register('p144-all', {
        pid: 33,
        phase: 144,
        plan: 1,
        worktreePath: '/tmp/wt',
        branch: 'pde/session/p144-all',
      });

      const all = registry.getAll();
      expect(all).toBeInstanceOf(Map);
      expect(all.size).toBe(1);

      // Mutating the copy should not affect the registry
      all.delete('p144-all');
      expect(registry.getAll().size).toBe(1);
    } finally {
      cleanup(root);
    }
  });
});

// ─── hasPhase ─────────────────────────────────────────────────────────────────

describe('SessionRegistry hasPhase', () => {
  it('Test 7: hasPhase() returns true only if a "running" session exists for that phase', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);

      expect(registry.hasPhase(144)).toBe(false);

      registry.register('p144-phase', {
        pid: 11,
        phase: 144,
        plan: 1,
        worktreePath: '/tmp/wt',
        branch: 'pde/session/p144-phase',
      });

      expect(registry.hasPhase(144)).toBe(true);
      expect(registry.hasPhase(145)).toBe(false);

      // Mark complete — should no longer count as running
      registry.update('p144-phase', { status: 'complete' });
      expect(registry.hasPhase(144)).toBe(false);
    } finally {
      cleanup(root);
    }
  });
});

// ─── activeCount ──────────────────────────────────────────────────────────────

describe('SessionRegistry activeCount', () => {
  it('Test 8: activeCount() counts only "running" status entries', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      expect(registry.activeCount()).toBe(0);

      registry.register('p144-c1', { pid: 1, phase: 144, plan: 1, worktreePath: '/tmp/wt1', branch: 'pde/session/p144-c1' });
      registry.register('p144-c2', { pid: 2, phase: 144, plan: 2, worktreePath: '/tmp/wt2', branch: 'pde/session/p144-c2' });
      expect(registry.activeCount()).toBe(2);

      registry.update('p144-c1', { status: 'failed' });
      expect(registry.activeCount()).toBe(1);

      registry.update('p144-c2', { status: 'complete' });
      expect(registry.activeCount()).toBe(0);
    } finally {
      cleanup(root);
    }
  });
});

// ─── loadFromDisk ─────────────────────────────────────────────────────────────

describe('SessionRegistry loadFromDisk', () => {
  it('Test 9: loadFromDisk() reads JSON, rebuilds Map, marks dead PIDs as "orphaned"', () => {
    const root = makeTempRoot();
    try {
      // Write a fake pids file with one running + one already-dead PID
      const livePid = process.pid; // guaranteed alive
      const deadPid = 9999997;     // extremely unlikely to exist

      const data = {
        sessions: {
          'live-session': {
            pid: livePid,
            phase: 144,
            plan: 1,
            worktreePath: '/tmp/wt-live',
            branch: 'pde/session/live-session',
            status: 'running',
            startedAt: new Date().toISOString(),
          },
          'dead-session': {
            pid: deadPid,
            phase: 144,
            plan: 2,
            worktreePath: '/tmp/wt-dead',
            branch: 'pde/session/dead-session',
            status: 'running',
            startedAt: new Date().toISOString(),
          },
        },
      };
      fs.writeFileSync(path.join(root, '.planning', 'dispatcher.pids'), JSON.stringify(data, null, 2));

      const registry = new SessionRegistry(root);
      registry.loadFromDisk();

      const liveEntry = registry.get('live-session');
      const deadEntry = registry.get('dead-session');

      expect(liveEntry).toBeDefined();
      expect(liveEntry.status).toBe('running'); // live PID stays running

      expect(deadEntry).toBeDefined();
      expect(deadEntry.status).toBe('orphaned'); // dead PID marked orphaned
    } finally {
      cleanup(root);
    }
  });

  it('Test 10: loadFromDisk() handles missing file gracefully (empty Map)', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      // No file written — should not throw
      expect(() => registry.loadFromDisk()).not.toThrow();
      expect(registry.getAll().size).toBe(0);
    } finally {
      cleanup(root);
    }
  });
});

// ─── _flush (atomic write) ────────────────────────────────────────────────────

describe('SessionRegistry _flush', () => {
  it('Test 11: _flush() uses atomic temp+rename pattern', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      // Spy on fs.renameSync to verify it's called with the right paths
      const renameSpy = vi.spyOn(fs, 'renameSync');

      registry.register('p144-flush', {
        pid: 999,
        phase: 144,
        plan: 1,
        worktreePath: '/tmp/wt',
        branch: 'pde/session/p144-flush',
      });

      // Verify renameSync was called from tmpFile -> pidFile
      const renameCalls = renameSpy.mock.calls.filter(
        c => c[0] === registry._tmpFile && c[1] === registry._pidFile
      );
      expect(renameCalls.length).toBeGreaterThan(0);

      // Tmp file should not exist after rename (cleanup)
      expect(fs.existsSync(registry._tmpFile)).toBe(false);

      renameSpy.mockRestore();
    } finally {
      cleanup(root);
    }
  });

  it('Test 12: JSON file format has sessions object with expected shape', () => {
    const root = makeTempRoot();
    try {
      const registry = new SessionRegistry(root);
      registry.register('p144-fmt', {
        pid: 5678,
        phase: 144,
        plan: 2,
        worktreePath: '/tmp/.sessions/p144-fmt',
        branch: 'pde/session/p144-fmt',
      });

      const onDisk = JSON.parse(fs.readFileSync(registry._pidFile, 'utf8'));
      expect(onDisk).toHaveProperty('sessions');
      const s = onDisk.sessions['p144-fmt'];
      expect(s).toBeDefined();
      expect(s.pid).toBe(5678);
      expect(s.phase).toBe(144);
      expect(s.plan).toBe(2);
      expect(s.worktreePath).toBe('/tmp/.sessions/p144-fmt');
      expect(s.branch).toBe('pde/session/p144-fmt');
      expect(s.status).toBe('running');
      expect(typeof s.startedAt).toBe('string');
    } finally {
      cleanup(root);
    }
  });
});
