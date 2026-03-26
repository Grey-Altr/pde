'use strict';

// vitest injects describe/it/expect as globals in CJS test files
const { ConcurrencyQueue } = require('../../packages/dispatcher/lib/queue.cjs');

describe('ConcurrencyQueue', () => {
  it('limits concurrent execution to maxConcurrent', async () => {
    const q = new ConcurrencyQueue(2);
    const running = [];
    let maxRunning = 0;
    const task = () => new Promise(resolve => {
      running.push(1);
      maxRunning = Math.max(maxRunning, running.length);
      setTimeout(() => { running.pop(); resolve(); }, 30);
    });
    await Promise.all([q.add(task), q.add(task), q.add(task), q.add(task)]);
    expect(maxRunning).toBe(2);
  });

  it('runs tasks sequentially with concurrency 1', async () => {
    const q = new ConcurrencyQueue(1);
    const order = [];
    const results = [];
    let nextId = 0;
    const makeTask = (delay) => {
      const id = nextId++;
      return () => new Promise(resolve => {
        order.push(`start-${id}`);
        setTimeout(() => {
          order.push(`end-${id}`);
          resolve(id);
        }, delay);
      });
    };
    await Promise.all([q.add(makeTask(30)), q.add(makeTask(10)), q.add(makeTask(10))]);
    // With concurrency 1, task 0 must complete before task 1 starts
    expect(order[0]).toBe('start-0');
    expect(order[1]).toBe('end-0');
    expect(order[2]).toBe('start-1');
  });

  it('add() returns a Promise that resolves with factory value', async () => {
    const q = new ConcurrencyQueue(2);
    const result = await q.add(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('add() returns a Promise that rejects with factory rejection reason', async () => {
    const q = new ConcurrencyQueue(2);
    const err = new Error('task failed');
    await expect(q.add(() => Promise.reject(err))).rejects.toThrow('task failed');
  });

  it('activeCount getter returns current in-flight count', async () => {
    const q = new ConcurrencyQueue(2);
    let resolveFirst;
    const firstPromise = q.add(() => new Promise(r => { resolveFirst = r; }));
    // Give it a tick to start
    await Promise.resolve();
    expect(q.activeCount).toBe(1);
    resolveFirst();
    await firstPromise;
    await Promise.resolve(); // yield for .finally() microtask to decrement _active
    expect(q.activeCount).toBe(0);
  });

  it('pendingCount getter returns current queued (not yet running) count', async () => {
    const q = new ConcurrencyQueue(1);
    let resolveFirst;
    const firstPromise = q.add(() => new Promise(r => { resolveFirst = r; }));
    await Promise.resolve(); // let first task start
    // Add 2 more — they should be pending since concurrency=1
    q.add(() => Promise.resolve());
    q.add(() => Promise.resolve());
    expect(q.pendingCount).toBe(2);
    resolveFirst();
    await firstPromise;
  });

  it('setMax(n) updates the concurrency limit and drains pending tasks', async () => {
    const q = new ConcurrencyQueue(1);
    let resolveFirst;
    const firstPromise = q.add(() => new Promise(r => { resolveFirst = r; }));
    await Promise.resolve(); // let first start
    const second = q.add(() => Promise.resolve('second'));
    const third = q.add(() => Promise.resolve('third'));
    // Now raise limit so pending tasks can drain when first finishes
    q.setMax(3);
    resolveFirst();
    const [s, t] = await Promise.all([second, third]);
    expect(s).toBe('second');
    expect(t).toBe('third');
    await firstPromise;
  });

  it('tasks that throw do not block the queue — slot is released', async () => {
    const q = new ConcurrencyQueue(1);
    // First task rejects
    await expect(q.add(() => Promise.reject(new Error('oops')))).rejects.toThrow('oops');
    // Queue should still be functional — slot must have been released by the rejection
    const result = await q.add(() => Promise.resolve('ok'));
    await Promise.resolve(); // yield for .finally() microtask
    expect(result).toBe('ok');
    expect(q.activeCount).toBe(0);
  });
});
