'use strict';

/**
 * orphan.cjs — Orphan detection and nuclear reset for PDE session worktrees
 *
 * Phase 143: Session Isolation
 * Satisfies: ISO-04, ISO-05
 *
 * Detects worktrees whose owner processes have died or are unregistered.
 * Provides nuclear reset to remove all PDE session worktrees in one call.
 * Never touches Claude Code's .claude/worktrees/ — only pde/session/* branches.
 */

const { execFileSync } = require('node:child_process');
const { listSessionWorktrees, removeWorktree, deleteBranch } = require('./worktree.cjs');

/**
 * Check whether a process with the given PID is alive.
 *
 * Uses process.kill(pid, 0) — signal 0 does not kill the process,
 * but throws an error if the process does not exist (ESRCH) or if
 * we lack permission (EPERM, which means the process exists and is alive).
 *
 * @param {number} pid
 * @returns {boolean}
 */
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // ESRCH = no such process (dead)
    // EPERM = process exists but no permission to signal (still alive)
    return e.code !== 'ESRCH';
  }
}

/**
 * Detect orphaned PDE session worktrees.
 *
 * A worktree is considered orphaned if:
 * - It is not in the session registry at all ("unregistered"), or
 * - Its registered owner PID is no longer alive ("dead_process")
 *
 * @param {string} projectRoot - Absolute path to the git repo root
 * @param {Map<string, { pid: number, status: string }>|null} sessionRegistry
 *   Map from sessionId to session metadata. Pass null to treat all found worktrees as orphans.
 * @returns {Array<{ sessionId: string, worktreePath: string, branch: string, status: 'dead_process'|'unregistered' }>}
 */
function detectOrphans(projectRoot, sessionRegistry) {
  const entries = listSessionWorktrees(projectRoot);
  const orphans = [];

  for (const entry of entries) {
    // Extract sessionId from refs/heads/pde/session/<sessionId>
    const sessionId = entry.branch.replace('refs/heads/pde/session/', '');
    const branch = entry.branch.replace('refs/heads/', '');

    if (!sessionRegistry) {
      // No registry provided — all found worktrees are unregistered orphans
      orphans.push({
        sessionId,
        worktreePath: entry.worktree,
        branch,
        status: 'unregistered',
      });
      continue;
    }

    const registration = sessionRegistry.get(sessionId);

    if (!registration) {
      // Not in registry
      orphans.push({
        sessionId,
        worktreePath: entry.worktree,
        branch,
        status: 'unregistered',
      });
    } else if (!isProcessAlive(registration.pid)) {
      // Registered but owner process is dead
      orphans.push({
        sessionId,
        worktreePath: entry.worktree,
        branch,
        status: 'dead_process',
      });
    }
    // else: registered with a live PID — not an orphan
  }

  return orphans;
}

/**
 * Nuclear reset: remove all PDE session worktrees and delete all pde/session/* branches.
 *
 * - Force-removes each worktree (even if dirty)
 * - Force-deletes each branch (-D to skip merge check)
 * - Errors per session are caught so one failure does not prevent cleaning others
 * - Runs git worktree prune at the end to clean up admin files
 *
 * Per D-17: This is a full recovery path for when sessions are stuck or corrupt.
 *
 * @param {string} projectRoot
 * @returns {{ removed: number }}
 */
function resetAllSessions(projectRoot) {
  const entries = listSessionWorktrees(projectRoot);
  let removed = 0;

  for (const entry of entries) {
    const sessionId = entry.branch.replace('refs/heads/pde/session/', '');
    const branch = entry.branch.replace('refs/heads/', '');

    try {
      removeWorktree(projectRoot, sessionId, { force: true });
    } catch (_) {
      // One removal failure should not stop others
    }

    try {
      deleteBranch(projectRoot, branch, { force: true });
    } catch (_) {
      // One branch deletion failure should not stop others
    }

    removed++;
  }

  // Clean up any remaining worktree admin files
  try {
    execFileSync('git', ['worktree', 'prune'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch (_) {}

  return { removed };
}

module.exports = {
  isProcessAlive,
  detectOrphans,
  resetAllSessions,
};
