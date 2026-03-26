'use strict';

const { EventEmitter } = require('node:events');
const path = require('node:path');
const os = require('node:os');

// ─── Mock TailCursor ──────────────────────────────────────────────────────────
// vi.mock is hoisted — must use string literal path, not path.resolve()
// Path is relative to the TEST FILE location:
//   tests/dispatcher/aggregator.test.cjs -> ../../bin/lib/relay.cjs
vi.mock('../../bin/lib/relay.cjs', () => {
  class MockTailCursor {
    constructor(filePath, onLine) {
      this.filePath = filePath;
      this.onLine = onLine;
      this.started = false;
      this.stopped = false;
      this.pollMs = null;
      // Store in module-level list so tests can access
      MockTailCursor._instances.push(this);
    }
    start(ms) {
      this.started = true;
      this.pollMs = ms;
    }
    stop() {
      this.stopped = true;
    }
  }
  MockTailCursor._instances = [];
  return { TailCursor: MockTailCursor };
});

// Import after mock registration
const { TailCursor: MockTailCursor } = require('../../bin/lib/relay.cjs');
const { Aggregator } = require('../../packages/dispatcher/lib/aggregator.cjs');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Aggregator', () => {
  beforeEach(() => {
    MockTailCursor._instances.length = 0;
  });

  it('extends EventEmitter', () => {
    const agg = new Aggregator();
    expect(agg instanceof EventEmitter).toBe(true);
  });

  it('watch(sessionId) creates a TailCursor for the correct NDJSON file path', () => {
    const agg = new Aggregator();
    agg.watch('abc123');
    expect(MockTailCursor._instances).toHaveLength(1);
    const expectedPath = path.join(os.tmpdir(), 'pde-session-abc123.ndjson');
    expect(MockTailCursor._instances[0].filePath).toBe(expectedPath);
  });

  it('watch(sessionId) calls cursor.start(500)', () => {
    const agg = new Aggregator();
    agg.watch('session-x');
    expect(MockTailCursor._instances[0].started).toBe(true);
    expect(MockTailCursor._instances[0].pollMs).toBe(500);
  });

  it('watch() is idempotent — calling twice with same sessionId does not create duplicate cursor', () => {
    const agg = new Aggregator();
    agg.watch('dup-session');
    agg.watch('dup-session');
    expect(MockTailCursor._instances).toHaveLength(1);
  });

  it('emits "event" with (sessionId, parsedObject) when TailCursor onLine fires valid JSON', () => {
    const agg = new Aggregator();
    agg.watch('emit-test');
    const received = [];
    agg.on('event', (sid, obj) => received.push({ sid, obj }));
    const payload = { event_type: 'task_start', ts: 123 };
    MockTailCursor._instances[0].onLine(JSON.stringify(payload));
    expect(received).toHaveLength(1);
    expect(received[0].sid).toBe('emit-test');
    expect(received[0].obj).toEqual(payload);
  });

  it('does NOT emit "event" when TailCursor onLine fires invalid JSON', () => {
    const agg = new Aggregator();
    agg.watch('bad-json-session');
    const received = [];
    agg.on('event', (sid, obj) => received.push({ sid, obj }));
    MockTailCursor._instances[0].onLine('not valid json {{{');
    expect(received).toHaveLength(0);
  });

  it('unwatch(sessionId) calls cursor.stop() and removes from internal map', () => {
    const agg = new Aggregator();
    agg.watch('to-unwatch');
    const cursor = MockTailCursor._instances[0];
    agg.unwatch('to-unwatch');
    expect(cursor.stopped).toBe(true);
    // After unwatch, watching again should create a new cursor (map was cleared)
    agg.watch('to-unwatch');
    expect(MockTailCursor._instances).toHaveLength(2);
  });

  it('stopAll() stops all cursors and clears the internal map', () => {
    const agg = new Aggregator();
    agg.watch('s1');
    agg.watch('s2');
    agg.watch('s3');
    expect(MockTailCursor._instances).toHaveLength(3);
    agg.stopAll();
    for (const c of MockTailCursor._instances) {
      expect(c.stopped).toBe(true);
    }
    // After stopAll, watching again creates new cursors (map was cleared)
    agg.watch('s1');
    expect(MockTailCursor._instances).toHaveLength(4);
  });
});
