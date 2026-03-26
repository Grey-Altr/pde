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
const merge = require('./lib/merge.cjs');

module.exports = { ...worktree, ...lock, ...merge };
