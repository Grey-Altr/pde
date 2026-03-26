'use strict';

/**
 * index.cjs — PDE Dispatcher package entry point
 *
 * Phase 143: Session Isolation
 * Re-exports all public functions from worktree, lock, merge, and orphan modules.
 *
 * Usage: const { createWorktree, mergeSession, acquireLock, detectOrphans } = require('./packages/dispatcher');
 */

const worktree = require('./lib/worktree.cjs');
const lock = require('./lib/lock.cjs');
const merge = require('./lib/merge.cjs');
const orphan = require('./lib/orphan.cjs');

module.exports = { ...worktree, ...lock, ...merge, ...orphan };
