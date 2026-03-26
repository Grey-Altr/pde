'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  isProcessAlive,
  detectOrphans,
  resetAllSessions,
} = require('../../packages/dispatcher/index.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempRepo() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-orphan-test-'));
  execFileSync('git', ['init', '-b', 'main', tmpDir], { stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@pde.test'], { cwd: tmpDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'PDE Test'], { cwd: tmpDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpDir, 'README.md'), 'init\n');
  execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '--no-verify', '-m', 'init'], { cwd: tmpDir, stdio: 'pipe' });
  return tmpDir;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

// ─── isProcessAlive ───────────────────────────────────────────────────────────

describe('isProcessAlive', () => {
  it('returns true for the current process PID (alive)', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('returns false for a PID that does not exist (ESRCH)', () => {
    // 9999999 is beyond typical PID max on macOS/Linux and extremely unlikely to exist
    expect(isProcessAlive(9999999)).toBe(false);
  });
});

// ─── detectOrphans ────────────────────────────────────────────────────────────

describe('detectOrphans', () => {
  it('returns empty array when no PDE session worktrees exist', () => {
    const repo = makeTempRepo();
    try {
      const result = detectOrphans(repo, null);
      expect(result).toEqual([]);
    } finally {
      cleanup(repo);
    }
  });

  it('returns orphan with status "unregistered" when worktree exists but registry is null', () => {
    const repo = makeTempRepo();
    try {
      const { createWorktree } = require('../../packages/dispatcher/index.cjs');
      const sessionId = 'p143-orp001';
      createWorktree(repo, sessionId);

      const result = detectOrphans(repo, null);
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(sessionId);
      expect(result[0].status).toBe('unregistered');
      expect(result[0].branch).toBe('pde/session/' + sessionId);
      expect(result[0].worktreePath).toContain(sessionId);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('returns orphan with status "dead_process" when registered PID is dead', () => {
    const repo = makeTempRepo();
    try {
      const { createWorktree } = require('../../packages/dispatcher/index.cjs');
      const sessionId = 'p143-orp002';
      createWorktree(repo, sessionId);

      const registry = new Map([[sessionId, { pid: 9999999, status: 'running' }]]);
      const result = detectOrphans(repo, registry);

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(sessionId);
      expect(result[0].status).toBe('dead_process');
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('returns empty array when registered PID is alive', () => {
    const repo = makeTempRepo();
    try {
      const { createWorktree } = require('../../packages/dispatcher/index.cjs');
      const sessionId = 'p143-orp003';
      createWorktree(repo, sessionId);

      // Use current process PID — definitely alive
      const registry = new Map([[sessionId, { pid: process.pid, status: 'running' }]]);
      const result = detectOrphans(repo, registry);

      expect(result).toEqual([]);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });
});

// ─── resetAllSessions ─────────────────────────────────────────────────────────

describe('resetAllSessions', () => {
  it('removes all PDE session worktrees and returns { removed: N }', () => {
    const repo = makeTempRepo();
    try {
      const { createWorktree } = require('../../packages/dispatcher/index.cjs');
      createWorktree(repo, 'p143-rst001');
      createWorktree(repo, 'p143-rst002');

      const result = resetAllSessions(repo);
      expect(result).toEqual({ removed: 2 });

      // Verify worktrees are gone
      const wtList = execFileSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: repo, encoding: 'utf8', stdio: 'pipe',
      });
      expect(wtList).not.toContain('pde/session/');
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('returns { removed: 0 } with no error when no sessions exist', () => {
    const repo = makeTempRepo();
    try {
      const result = resetAllSessions(repo);
      expect(result).toEqual({ removed: 0 });
    } finally {
      cleanup(repo);
    }
  });
});
