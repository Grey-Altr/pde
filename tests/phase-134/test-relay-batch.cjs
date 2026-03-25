'use strict';

/**
 * test-relay-batch.cjs — BatchQueue flush behavior tests
 * Phase 134, Plan 02
 */

// vitest globals (describe, it, expect, beforeEach, afterEach, vi) are injected via globals:true in vitest.config.ts
const { BatchQueue } = require('../../bin/lib/relay.cjs');

let queues = [];

afterEach(() => {
  for (const q of queues) {
    try { q.stop(); } catch {}
  }
  queues = [];
  vi.useRealTimers();
});

function makeQueue(opts) {
  const q = new BatchQueue(opts);
  queues.push(q);
  return q;
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

describe('BatchQueue', () => {
  it('Test 11: flushes when queue length reaches maxBatchSize', async () => {
    const batches = [];
    const queue = makeQueue({
      maxBatchSize: 3,
      flushIntervalMs: 60000, // very long timer — won't fire
      onFlush: async (batch) => { batches.push([...batch]); },
    });
    queue.start();

    queue.push({ id: 1 });
    queue.push({ id: 2 });
    // Not yet flushed
    expect(batches.length).toBe(0);

    queue.push({ id: 3 }); // hits maxBatchSize
    // _flush is synchronous call path, but onFlush is async — wait a tick
    await wait(10);

    expect(batches.length).toBe(1);
    expect(batches[0]).toHaveLength(3);
    expect(batches[0][0]).toEqual({ id: 1 });
  });

  it('Test 12: flushes on timer even if below maxBatchSize', async () => {
    const batches = [];
    const queue = makeQueue({
      maxBatchSize: 100,
      flushIntervalMs: 80, // short interval for testing
      onFlush: async (batch) => { batches.push([...batch]); },
    });
    queue.start();

    queue.push({ id: 'timer-test' });
    expect(batches.length).toBe(0); // not yet flushed

    await wait(200); // wait for at least one timer fire

    expect(batches.length).toBeGreaterThanOrEqual(1);
    expect(batches[0][0]).toEqual({ id: 'timer-test' });
  });

  it('Test 13: stop() flushes remaining events', async () => {
    const batches = [];
    const queue = makeQueue({
      maxBatchSize: 100,
      flushIntervalMs: 60000,
      onFlush: async (batch) => { batches.push([...batch]); },
    });
    queue.start();

    queue.push({ id: 'remaining-1' });
    queue.push({ id: 'remaining-2' });

    await queue.stop();
    await wait(10);

    expect(batches.length).toBe(1);
    expect(batches[0]).toHaveLength(2);
    expect(batches[0][0]).toEqual({ id: 'remaining-1' });
    expect(batches[0][1]).toEqual({ id: 'remaining-2' });
  });

  it('Test 14: buffer cap drops oldest events when maxBufferSize exceeded', async () => {
    const batches = [];
    const queue = makeQueue({
      maxBatchSize: 200, // won't auto-flush on count
      flushIntervalMs: 60000,
      maxBufferSize: 3, // only 3 events max
      onFlush: async (batch) => { batches.push([...batch]); },
    });
    queue.start();

    // Push 5 events — should cap at 3, dropping the oldest
    queue.push({ id: 1 });
    queue.push({ id: 2 });
    queue.push({ id: 3 });
    queue.push({ id: 4 }); // drops id:1
    queue.push({ id: 5 }); // drops id:2

    await queue.stop();
    await wait(10);

    // Only 3 events flushed, oldest dropped
    expect(batches.length).toBe(1);
    expect(batches[0]).toHaveLength(3);
    const ids = batches[0].map(e => e.id);
    expect(ids).toEqual([3, 4, 5]);
  });
});
