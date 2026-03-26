'use strict';

/**
 * index.cjs — PDE Dispatcher package entry point
 *
 * Phase 143: Session Isolation
 * Re-exports all public functions from worktree, lock, and merge modules.
 *
 * Usage: const { createWorktree, mergeSession, acquireLock } = require('./packages/dispatcher');
 */

const worktree = require('./lib/worktree.cjs');
const lock = require('./lib/lock.cjs');

// merge.cjs is added in Task 2 — exported when present
let merge = {};
try {
  merge = require('./lib/merge.cjs');
} catch (_) {
  // merge.cjs not yet present (Task 1 scaffold only) — no-op
}

module.exports = { ...worktree, ...lock, ...merge };
