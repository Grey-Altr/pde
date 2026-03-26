'use strict';

/**
 * lock.cjs — Atomic mutual exclusion for dispatcher operations
 *
 * Phase 143: Session Isolation
 *
 * Uses O_EXCL (wx flag) for atomic lock file creation.
 * Reclaims stale locks from dead processes via process.kill(pid, 0).
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Acquire the dispatcher lock at .planning/dispatcher.lock.
 * - On success: creates lock file with { pid, ts }, returns { acquired: true, lockPath }
 * - If lock held by live process: returns { acquired: false }
 * - If lock held by dead process (stale): removes stale file, acquires, returns { acquired: true }
 *
 * @param {string} projectRoot - Absolute path to the git repo root
 * @returns {{ acquired: boolean, lockPath?: string }}
 */
function acquireLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.planning', 'dispatcher.lock');

  try {
    // O_EXCL (wx) — atomic creation, fails if file already exists
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now() }));
    fs.closeSync(fd);
    return { acquired: true, lockPath };
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;

    // Lock file exists — check if holder is alive
    let holder;
    try {
      holder = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch (_) {
      // Unreadable/corrupt lock — treat as stale
      try { fs.unlinkSync(lockPath); } catch (_2) {}
      return acquireLock(projectRoot);
    }

    const isAlive = isPidAlive(holder.pid);
    if (isAlive) {
      return { acquired: false };
    }

    // Stale lock — holder PID is dead, reclaim
    try { fs.unlinkSync(lockPath); } catch (_) {}
    return acquireLock(projectRoot);
  }
}

/**
 * Release the dispatcher lock by removing the lock file.
 * Swallows ENOENT (already released is fine).
 *
 * @param {string} projectRoot
 */
function releaseLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.planning', 'dispatcher.lock');
  try {
    fs.unlinkSync(lockPath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

/**
 * Check if a PID is alive using process.kill(pid, 0).
 * Returns true if alive, false if dead (ESRCH) or out of range.
 *
 * @param {number} pid
 * @returns {boolean}
 */
function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH = no such process (dead)
    // EPERM = process exists but we can't signal it (alive)
    return err.code !== 'ESRCH';
  }
}

module.exports = {
  acquireLock,
  releaseLock,
};
