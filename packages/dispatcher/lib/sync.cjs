'use strict';

/**
 * sync.cjs - Git-based planning state sync for cloud dispatch
 * Phase 192: Git-Based State Sync
 * Satisfies: SYN-01, SYN-02, SYN-03, SYN-04, SYN-07
 */

const simpleGit = require('simple-git');
const { execFileSync } = require('node:child_process');

// Cloud merge direction — OPPOSITE of merge.cjs OURS_ON_CONFLICT
// STATE.md: --theirs (cloud executor updated it, cloud content survives)
// ROADMAP.md, REQUIREMENTS.md: --ours (local orchestrator owns these)
const CLOUD_THEIRS = ['.planning/STATE.md'];
const CLOUD_OURS = ['.planning/REQUIREMENTS.md', '.planning/ROADMAP.md'];

/**
 * Push the current session branch to origin.
 * Does NOT stage or commit — worktree branch already has .planning/ committed.
 *
 * @param {string} projectRoot - Absolute path to git repo root
 * @param {string} branch - Session branch to push (e.g. 'pde/session/abc123')
 * @param {object} [_git] - Optional simple-git instance for DI in tests
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function pushPlanningState(projectRoot, branch, _git) {
  const git = _git || simpleGit(projectRoot);
  try {
    await git.push('origin', branch);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Fetch remote changes for a session branch into local remote-tracking ref.
 *
 * @param {string} projectRoot - Absolute path to git repo root
 * @param {string} branch - Session branch to fetch
 * @param {object} [_git] - Optional simple-git instance for DI in tests
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function fetchPlanningState(projectRoot, branch, _git) {
  const git = _git || simpleGit(projectRoot);
  try {
    await git.fetch('origin', branch);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Merge cloud session branch with direction-aware conflict resolution.
 *
 * Merge direction (INVERTED from merge.cjs):
 *   - STATE.md: --theirs (cloud executor updated it; cloud content wins)
 *   - ROADMAP.md, REQUIREMENTS.md: --ours (local orchestrator owns these)
 *   - Non-.planning/ conflicts: abort merge, return { needsHuman: true }
 *
 * @param {string} projectRoot - Absolute path to git repo root
 * @param {string} branch - Session branch on origin to merge (merges 'origin/<branch>')
 * @param {object} [_git] - Optional simple-git instance for DI in tests
 * @returns {Promise<{ ok: boolean, conflicts: string[], autoResolved?: string[], needsHuman?: boolean, error?: string }>}
 */
async function mergePlanningFromCloud(projectRoot, branch, _git) {
  const git = _git || simpleGit(projectRoot);
  try {
    await git.merge(['origin/' + branch, '--no-edit']);
    return { ok: true, conflicts: [], autoResolved: [] };
  } catch (_mergeErr) {
    // Detect conflicting files
    const conflictOutput = execFileSync(
      'git', ['diff', '--name-only', '--diff-filter=U'],
      { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
    );
    const conflicts = conflictOutput.trim().split('\n').filter(Boolean);

    const planningConflicts = conflicts.filter(f => f.startsWith('.planning/'));
    const sourceConflicts = conflicts.filter(f => !f.startsWith('.planning/'));

    // Non-.planning/ conflicts require human resolution
    if (sourceConflicts.length > 0) {
      execFileSync('git', ['merge', '--abort'], { cwd: projectRoot, stdio: 'pipe' });
      return { ok: false, conflicts: sourceConflicts, needsHuman: true };
    }

    // Resolve .planning/ conflicts with direction-aware strategy
    for (const file of planningConflicts) {
      const strategy = CLOUD_THEIRS.includes(file) ? '--theirs' : '--ours';
      execFileSync('git', ['checkout', strategy, '--', file], {
        cwd: projectRoot,
        stdio: 'pipe',
      });
      execFileSync('git', ['add', '--', file], {
        cwd: projectRoot,
        stdio: 'pipe',
      });
    }

    // Finalize the merge commit
    execFileSync('git', ['commit', '--no-edit'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });

    return { ok: true, conflicts: planningConflicts, autoResolved: planningConflicts };
  }
}

module.exports = { pushPlanningState, fetchPlanningState, mergePlanningFromCloud };
