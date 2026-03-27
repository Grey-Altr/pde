'use strict';

/**
 * index.cjs — PDE Dispatcher package entry point
 *
 * Phase 143: Session Isolation — worktree, lock, merge, orphan
 * Phase 144: Local CLI Dispatch — spawn, registry, queue, aggregator, coordinator
 * Phase 145: Agent SDK Orchestrator — analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts
 * Phase 146: Remote Dispatch -- spawnRemoteSession, detectManagedBackend, routeSession, readPlanAutonomous
 *
 * Re-exports all public functions and classes from all dispatcher modules.
 *
 * Usage:
 *   const { createWorktree, mergeSession, acquireLock, detectOrphans } = require('./packages/dispatcher');
 *   const { spawnSession, SessionRegistry, ConcurrencyQueue, Aggregator, DispatchCoordinator } = require('./packages/dispatcher');
 *   const { analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts } = require('./packages/dispatcher');
 *   const { spawnRemoteSession, detectManagedBackend, routeSession, readPlanAutonomous } = require('./packages/dispatcher');
 */

// Phase 143 modules
const worktree = require('./lib/worktree.cjs');
const lock = require('./lib/lock.cjs');
const merge = require('./lib/merge.cjs');
const orphan = require('./lib/orphan.cjs');

// Phase 144 modules
const spawn = require('./lib/spawn.cjs');
const registry = require('./lib/registry.cjs');
const queue = require('./lib/queue.cjs');
const aggregator = require('./lib/aggregator.cjs');
const coordinator = require('./lib/coordinator.cjs');

// Phase 145 modules
const orchestrator = require('./lib/orchestrator.cjs');

// Phase 146 modules
const remoteSsh = require('./lib/remote-ssh.cjs');
const remoteManaged = require('./lib/remote-managed.cjs');
const remoteRouter = require('./lib/remote-router.cjs');

module.exports = { ...worktree, ...lock, ...merge, ...orphan, ...spawn, ...registry, ...queue, ...aggregator, ...coordinator, ...orchestrator, ...remoteSsh, ...remoteManaged, ...remoteRouter };
