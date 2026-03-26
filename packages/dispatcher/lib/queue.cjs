'use strict';

/**
 * queue.cjs — Zero-dependency concurrency queue for PDE dispatcher
 *
 * Phase 144: Local CLI Dispatch
 * Satisfies: DSP-06
 *
 * ConcurrencyQueue limits the number of simultaneously-running tasks to a
 * configurable maximum. When all slots are occupied, new tasks are held in a
 * pending list and run as soon as a slot opens (drain cycle).
 *
 * Usage:
 *   const q = new ConcurrencyQueue(3);
 *   const result = await q.add(() => runSession(sessionA));
 *
 * The factory function passed to add() must return a Promise.
 * When the Promise resolves or rejects, a slot opens and the next pending
 * task runs automatically.
 */
class ConcurrencyQueue {
  /**
   * @param {number} maxConcurrent - Maximum number of simultaneous tasks (default 3)
   */
  constructor(maxConcurrent = 3) {
    this._max = maxConcurrent;
    this._active = 0;
    this._pending = [];
  }

  /**
   * Enqueue a task factory. Runs immediately if a slot is available, else queues.
   *
   * @param {function} factory - () => Promise — called when a slot opens
   * @returns {Promise} Resolves/rejects when the factory's Promise settles
   */
  add(factory) {
    return new Promise((resolve, reject) => {
      const run = () => {
        this._active++;
        Promise.resolve()
          .then(factory)
          .then(resolve, reject)
          .finally(() => {
            this._active--;
            this._drain();
          });
      };
      if (this._active < this._max) {
        run();
      } else {
        this._pending.push(run);
      }
    });
  }

  /**
   * Internal drain — called after each task settles.
   * Runs the next pending task if a slot is available.
   */
  _drain() {
    if (this._pending.length > 0 && this._active < this._max) {
      const next = this._pending.shift();
      next();
    }
  }

  /** @returns {number} Number of currently in-flight tasks */
  get activeCount() {
    return this._active;
  }

  /** @returns {number} Number of tasks waiting for a slot */
  get pendingCount() {
    return this._pending.length;
  }

  /**
   * Update the concurrency limit at runtime.
   * Takes effect immediately — triggers a drain cycle so pending tasks
   * can fill newly available slots.
   *
   * @param {number} n - New maximum concurrent tasks
   */
  setMax(n) {
    this._max = n;
    this._drain();
  }
}

module.exports = { ConcurrencyQueue };
