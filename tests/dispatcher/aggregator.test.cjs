'use strict';

const { EventEmitter } = require('node:events');
const path = require('node:path');
const os = require('node:os');
const { Aggregator } = require('../../packages/dispatcher/lib/aggregator.cjs');

// ─── MockTailCursor ───────────────────────────────────────────────────────────
// Injected via Aggregator constructor — no vi.mock needed.
// Each instance records its lifecycle for test assertions.

class MockTailCursor {
  constructor(filePath, onLine) {
    this.filePath = filePath;
    this.onLine = onLine;
    this.started = false;
    this.stopped = false;
    this.pollMs = null;
    MockTailCursor.instances.push(this);
  }
  start(ms) {
    this.started = true;
    this.pollMs = ms;
  }
  stop() {
    this.stopped = true;
  }
}
MockTailCursor.instances = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a fresh Aggregator with MockTailCursor injected */
function makeAgg() {
  return new Aggregator(MockTailCursor);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Aggregator', () => {
  beforeEach(() => {
    MockTailCursor.instances.length = 0;
  });

  it('extends EventEmitter', () => {
    const agg = makeAgg();
    expect(agg instanceof EventEmitter).toBe(true);
  });

  it('watch(sessionId) creates a TailCursor for the correct NDJSON file path', () => {
    const agg = makeAgg();
    agg.watch('abc123');
    expect(MockTailCursor.instances).toHaveLength(1);
    const expectedPath = path.join(os.tmpdir(), 'pde-session-abc123.ndjson');
    expect(MockTailCursor.instances[0].filePath).toBe(expectedPath);
  });

  it('watch(sessionId) calls cursor.start(500)', () => {
    const agg = makeAgg();
    agg.watch('session-x');
    expect(MockTailCursor.instances[0].started).toBe(true);
    expect(MockTailCursor.instances[0].pollMs).toBe(500);
  });

  it('watch() is idempotent — calling twice with same sessionId does not create duplicate cursor', () => {
    const agg = makeAgg();
    agg.watch('dup-session');
    agg.watch('dup-session');
    expect(MockTailCursor.instances).toHaveLength(1);
  });

  it('emits "event" with (sessionId, parsedObject) when TailCursor onLine fires valid JSON', () => {
    const agg = makeAgg();
    agg.watch('emit-test');
    const received = [];
    agg.on('event', (sid, obj) => received.push({ sid, obj }));
    const payload = { event_type: 'task_start', ts: 123 };
    MockTailCursor.instances[0].onLine(JSON.stringify(payload));
    expect(received).toHaveLength(1);
    expect(received[0].sid).toBe('emit-test');
    expect(received[0].obj).toEqual(payload);
  });

  it('does NOT emit "event" when TailCursor onLine fires invalid JSON', () => {
    const agg = makeAgg();
    agg.watch('bad-json-session');
    const received = [];
    agg.on('event', (sid, obj) => received.push({ sid, obj }));
    MockTailCursor.instances[0].onLine('not valid json {{{');
    expect(received).toHaveLength(0);
  });

  it('unwatch(sessionId) calls cursor.stop() and removes from internal map', () => {
    const agg = makeAgg();
    agg.watch('to-unwatch');
    const cursor = MockTailCursor.instances[0];
    agg.unwatch('to-unwatch');
    expect(cursor.stopped).toBe(true);
    // After unwatch, watching again creates a new cursor (map entry deleted)
    agg.watch('to-unwatch');
    expect(MockTailCursor.instances).toHaveLength(2);
  });

  it('stopAll() stops all cursors and clears the internal map', () => {
    const agg = makeAgg();
    agg.watch('s1');
    agg.watch('s2');
    agg.watch('s3');
    expect(MockTailCursor.instances).toHaveLength(3);
    agg.stopAll();
    for (const c of MockTailCursor.instances) {
      expect(c.stopped).toBe(true);
    }
    // After stopAll, watching again creates new cursors (map was cleared)
    agg.watch('s1');
    expect(MockTailCursor.instances).toHaveLength(4);
  });
});
