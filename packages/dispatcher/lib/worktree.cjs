'use strict';

/**
 * worktree.cjs — Git worktree lifecycle for PDE session isolation
 *
 * Phase 143: Session Isolation
 * Satisfies: ISO-01, ISO-03
 *
 * All git calls use execFileSync with array arguments (no shell interpretation).
 * Filters to pde/session/ prefix only — never picks up Claude Code's own worktrees.
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');

/**
 * Create a worktree at .sessions/<sessionId> with branch pde/session/<sessionId>.
 * Runs `git worktree prune` first to clear any stale entries.
 *
 * @param {string} projectRoot - Absolute path to the git repo root
 * @param {string} sessionId   - Unique session identifier (e.g. "p143-abc123")
 * @returns {{ worktreePath: string, branch: string }}
 */
function createWorktree(projectRoot, sessionId) {
  const worktreePath = path.join(projectRoot, '.sessions', sessionId);
  const branch = 'pde/session/' + sessionId;

  // Prune stale worktree entries before creating (prevents "already exists" errors)
  execFileSync('git', ['worktree', 'prune'], {
    cwd: projectRoot,
    stdio: 'pipe',
  });

  execFileSync('git', ['worktree', 'add', worktreePath, '-b', branch], {
    cwd: projectRoot,
    stdio: 'pipe',
  });

  return { worktreePath, branch };
}

/**
 * Remove the worktree at .sessions/<sessionId>.
 *
 * @param {string} projectRoot
 * @param {string} sessionId
 * @param {{ force?: boolean }} [opts]
 */
function removeWorktree(projectRoot, sessionId, opts) {
  const force = opts && opts.force;
  const worktreePath = path.join(projectRoot, '.sessions', sessionId);
  const args = ['worktree', 'remove'];
  if (force) args.push('-f');
  args.push(worktreePath);
  execFileSync('git', args, { cwd: projectRoot, stdio: 'pipe' });
}

/**
 * Delete a git branch.
 *
 * @param {string} projectRoot
 * @param {string} branch      - Full branch name (e.g. "pde/session/p143-abc")
 * @param {{ force?: boolean }} [opts]
 */
function deleteBranch(projectRoot, branch, opts) {
  const force = opts && opts.force;
  execFileSync('git', ['branch', force ? '-D' : '-d', branch], {
    cwd: projectRoot,
    stdio: 'pipe',
  });
}

/**
 * List all PDE session worktrees (branch starts with refs/heads/pde/session/).
 * Ignores the main worktree and any non-PDE worktrees (e.g. Claude Code's own).
 *
 * @param {string} projectRoot
 * @returns {Array<{ worktree: string, branch: string, HEAD: string }>}
 */
function listSessionWorktrees(projectRoot) {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  // Split on double newline — each block is one worktree entry
  return output
    .trim()
    .split('\n\n')
    .map(block => {
      const entry = {};
      for (const line of block.trim().split('\n')) {
        const spaceIdx = line.indexOf(' ');
        const key = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
        const val = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1);
        entry[key] = val;
      }
      return entry;
    })
    .filter(e => e.branch && e.branch.startsWith('refs/heads/pde/session/'));
}

module.exports = {
  createWorktree,
  removeWorktree,
  deleteBranch,
  listSessionWorktrees,
};
