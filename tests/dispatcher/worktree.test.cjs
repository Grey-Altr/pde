'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Functions under test
const {
  createWorktree,
  removeWorktree,
  deleteBranch,
  listSessionWorktrees,
  acquireLock,
  releaseLock,
} = require('../../packages/dispatcher/index.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh isolated git repo with one commit and returns its path.
 * The repo has no upstream/remote and is self-contained.
 */
function makeTempRepo() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  execFileSync('git', ['init', '-b', 'main', tmpDir], { stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@pde.test'], { cwd: tmpDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'PDE Test'], { cwd: tmpDir, stdio: 'pipe' });
  // Create an initial commit so we have a HEAD
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

// ─── createWorktree ───────────────────────────────────────────────────────────

describe('createWorktree', () => {
  it('creates worktree at .sessions/<sessionId> with branch pde/session/<sessionId>', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-abc001';
      const result = createWorktree(repo, sessionId);

      expect(result).toMatchObject({
        worktreePath: path.join(repo, '.sessions', sessionId),
        branch: 'pde/session/' + sessionId,
      });

      // Directory exists
      expect(fs.existsSync(result.worktreePath)).toBe(true);

      // Branch exists
      const branches = execFileSync('git', ['branch', '--list', 'pde/session/' + sessionId], {
        cwd: repo, encoding: 'utf8', stdio: 'pipe',
      });
      expect(branches.trim()).toBeTruthy();
    } finally {
      // Prune before cleanup since git worktrees need proper teardown
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('runs git worktree prune before creating (idempotent pre-cleanup)', () => {
    const repo = makeTempRepo();
    try {
      // Create and manually delete the worktree dir to leave a stale entry
      const sessionId = 'p143-abc002';
      const wtPath = path.join(repo, '.sessions', sessionId);
      execFileSync('git', ['worktree', 'add', wtPath, '-b', 'pde/session/' + sessionId], {
        cwd: repo, stdio: 'pipe',
      });
      // Forcefully remove the directory without telling git (simulate stale entry)
      fs.rmSync(wtPath, { recursive: true, force: true });

      // createWorktree should prune stale entries and then succeed with a different session
      const session2 = 'p143-abc002b';
      const result = createWorktree(repo, session2);
      expect(fs.existsSync(result.worktreePath)).toBe(true);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });
});

// ─── removeWorktree ───────────────────────────────────────────────────────────

describe('removeWorktree', () => {
  it('removes the worktree directory', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-rm001';
      createWorktree(repo, sessionId);
      const wtPath = path.join(repo, '.sessions', sessionId);
      expect(fs.existsSync(wtPath)).toBe(true);

      removeWorktree(repo, sessionId);
      expect(fs.existsSync(wtPath)).toBe(false);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('passes -f flag when force: true', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-rm002';
      const { worktreePath } = createWorktree(repo, sessionId);
      // Write a dirty file so normal remove would refuse
      fs.writeFileSync(path.join(worktreePath, 'dirty.txt'), 'uncommitted\n');

      // Non-force would fail — force must succeed
      removeWorktree(repo, sessionId, { force: true });
      expect(fs.existsSync(worktreePath)).toBe(false);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });
});

// ─── deleteBranch ─────────────────────────────────────────────────────────────

describe('deleteBranch', () => {
  it('deletes a merged branch with -d', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-del001';
      const { branch, worktreePath } = createWorktree(repo, sessionId);

      // Make a commit in the worktree so the branch is ahead
      fs.writeFileSync(path.join(worktreePath, 'feature.txt'), 'work\n');
      execFileSync('git', ['add', '.'], { cwd: worktreePath, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'feature'], { cwd: worktreePath, stdio: 'pipe' });

      // Merge back so -d (merged only) will work
      execFileSync('git', ['merge', branch, '--no-edit', '--no-verify'], { cwd: repo, stdio: 'pipe' });
      removeWorktree(repo, sessionId);

      deleteBranch(repo, branch);

      const remaining = execFileSync('git', ['branch', '--list', branch], {
        cwd: repo, encoding: 'utf8', stdio: 'pipe',
      });
      expect(remaining.trim()).toBe('');
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('deletes an unmerged branch with force: true (-D)', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-del002';
      const { branch, worktreePath } = createWorktree(repo, sessionId);
      // Add unmerged commit
      fs.writeFileSync(path.join(worktreePath, 'unmerged.txt'), 'x\n');
      execFileSync('git', ['add', '.'], { cwd: worktreePath, stdio: 'pipe' });
      execFileSync('git', ['commit', '--no-verify', '-m', 'unmerged'], { cwd: worktreePath, stdio: 'pipe' });
      removeWorktree(repo, sessionId, { force: true });

      // -D needed since not merged
      deleteBranch(repo, branch, { force: true });

      const remaining = execFileSync('git', ['branch', '--list', branch], {
        cwd: repo, encoding: 'utf8', stdio: 'pipe',
      });
      expect(remaining.trim()).toBe('');
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });
});

// ─── listSessionWorktrees ─────────────────────────────────────────────────────

describe('listSessionWorktrees', () => {
  it('returns empty array when no PDE session worktrees exist', () => {
    const repo = makeTempRepo();
    try {
      const result = listSessionWorktrees(repo);
      expect(result).toEqual([]);
    } finally {
      cleanup(repo);
    }
  });

  it('returns PDE session worktrees with worktree, branch, HEAD keys', () => {
    const repo = makeTempRepo();
    try {
      const sessionId = 'p143-list001';
      createWorktree(repo, sessionId);

      const result = listSessionWorktrees(repo);
      expect(result).toHaveLength(1);
      expect(result[0].branch).toBe('refs/heads/pde/session/' + sessionId);
      expect(result[0].worktree).toContain(sessionId);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('does NOT return non-PDE branch worktrees', () => {
    const repo = makeTempRepo();
    try {
      // Create a non-PDE worktree
      const nonPdePath = path.join(repo, '.sessions', 'other');
      execFileSync('git', ['worktree', 'add', nonPdePath, '-b', 'other-branch'], {
        cwd: repo, stdio: 'pipe',
      });

      const result = listSessionWorktrees(repo);
      // No pde/session/ branches — should be empty
      expect(result).toHaveLength(0);
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });

  it('returns only PDE session worktrees when mixed with others', () => {
    const repo = makeTempRepo();
    try {
      // Create one PDE and one non-PDE worktree
      const pdeSessionId = 'p143-list002';
      createWorktree(repo, pdeSessionId);

      const nonPdePath = path.join(repo, '.sessions', 'non-pde');
      execFileSync('git', ['worktree', 'add', nonPdePath, '-b', 'feature/other'], {
        cwd: repo, stdio: 'pipe',
      });

      const result = listSessionWorktrees(repo);
      expect(result).toHaveLength(1);
      expect(result[0].branch).toContain('pde/session/');
    } finally {
      try { execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'pipe' }); } catch (_) {}
      cleanup(repo);
    }
  });
});

// ─── acquireLock / releaseLock ────────────────────────────────────────────────

describe('acquireLock / releaseLock', () => {
  it('acquires a lock when none exists', () => {
    const repo = makeTempRepo();
    try {
      // Ensure .planning dir exists
      fs.mkdirSync(path.join(repo, '.planning'), { recursive: true });

      const result = acquireLock(repo);
      expect(result.acquired).toBe(true);
      expect(result.lockPath).toContain('dispatcher.lock');
      expect(fs.existsSync(result.lockPath)).toBe(true);

      releaseLock(repo);
    } finally {
      cleanup(repo);
    }
  });

  it('returns acquired: false when live lock already exists', () => {
    const repo = makeTempRepo();
    try {
      fs.mkdirSync(path.join(repo, '.planning'), { recursive: true });

      // Acquire first lock (use our own PID so it looks live)
      const lockPath = path.join(repo, '.planning', 'dispatcher.lock');
      fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, ts: Date.now() }));

      const result = acquireLock(repo);
      expect(result.acquired).toBe(false);
    } finally {
      cleanup(repo);
    }
  });

  it('reclaims a stale lock whose holder PID is dead', () => {
    const repo = makeTempRepo();
    try {
      fs.mkdirSync(path.join(repo, '.planning'), { recursive: true });

      // Write a lock file with a PID that cannot possibly be alive (very high number)
      const lockPath = path.join(repo, '.planning', 'dispatcher.lock');
      fs.writeFileSync(lockPath, JSON.stringify({ pid: 9999999, ts: Date.now() - 60000 }));

      const result = acquireLock(repo);
      expect(result.acquired).toBe(true);

      releaseLock(repo);
    } finally {
      cleanup(repo);
    }
  });

  it('releaseLock removes the lock file', () => {
    const repo = makeTempRepo();
    try {
      fs.mkdirSync(path.join(repo, '.planning'), { recursive: true });
      const result = acquireLock(repo);
      expect(result.acquired).toBe(true);

      releaseLock(repo);
      expect(fs.existsSync(result.lockPath)).toBe(false);
    } finally {
      cleanup(repo);
    }
  });

  it('releaseLock does not throw if lock file does not exist (ENOENT safe)', () => {
    const repo = makeTempRepo();
    try {
      fs.mkdirSync(path.join(repo, '.planning'), { recursive: true });
      // Do not create lock file — just call release
      expect(() => releaseLock(repo)).not.toThrow();
    } finally {
      cleanup(repo);
    }
  });
});
