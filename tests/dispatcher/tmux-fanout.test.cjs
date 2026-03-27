'use strict';

/**
 * tmux-fanout.test.cjs — Unit tests for TmuxFanout NDJSON writer
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-01
 *
 * Tests fan-out behavior: subscribes to aggregator 'event' emissions
 * and writes enriched NDJSON lines to a combined output file.
 */

const { EventEmitter } = require('node:events');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { TmuxFanout, FANOUT_PATH, FILTER_PATH } = require('../../packages/dispatcher/lib/tmux-fanout.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Unique temp file per test run to avoid collisions */
function makeTempFanoutPath() {
  return path.join(os.tmpdir(), `pde-test-fanout-${process.pid}-${Date.now()}.ndjson`);
}

/** Create a mock aggregator (plain EventEmitter) */
function makeAggregator() {
  return new EventEmitter();
}

/** Create a map-based mock registry */
function makeRegistry(entries) {
  // entries: { sessionId: { backend: 'local'|'ssh'|'managed' } }
  const map = new Map(Object.entries(entries || {}));
  return {
    get: (id) => map.get(id),
  };
}

/** Read all lines from fanout path, parse each as JSON */
function readFanoutLines(fanoutPath) {
  const raw = fs.readFileSync(fanoutPath, 'utf8');
  return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TmuxFanout', () => {
  let fanoutPath;

  beforeEach(() => {
    fanoutPath = makeTempFanoutPath();
  });

  afterEach(() => {
    try { fs.rmSync(fanoutPath, { force: true }); } catch (_) {}
  });

  // ─── Test 1: start() truncates FANOUT_PATH ──────────────────────────────

  it('Test 1: start() truncates the fanout file to empty', () => {
    // Pre-populate the file with existing content
    fs.writeFileSync(fanoutPath, '{"old": "content"}\n', 'utf8');

    const agg = makeAggregator();
    const reg = makeRegistry({});
    const fanout = new TmuxFanout(agg, reg, { fanoutPath });
    fanout.start();

    const content = fs.readFileSync(fanoutPath, 'utf8');
    expect(content).toBe('');

    fanout.stop();
  });

  // ─── Test 2: Emitted event is written as enriched NDJSON line ───────────

  it('Test 2: aggregator event is appended as enriched NDJSON with session metadata fields', () => {
    const agg = makeAggregator();
    const reg = makeRegistry({ 'sess-1': { backend: 'local' } });
    const fanout = new TmuxFanout(agg, reg, { fanoutPath });
    fanout.start();

    const event = { event_type: 'task_start', ts: 123, content: 'hello' };
    agg.emit('event', 'sess-1', event);

    const lines = readFanoutLines(fanoutPath);
    expect(lines).toHaveLength(1);

    const enriched = lines[0];
    // Original fields preserved
    expect(enriched.event_type).toBe('task_start');
    expect(enriched.ts).toBe(123);
    expect(enriched.content).toBe('hello');
    // Enrichment fields present
    expect(enriched._pde_session_id).toBe('sess-1');
    expect(enriched._pde_session_source).toBeDefined();
    expect(enriched._pde_color_index).toBeDefined();

    fanout.stop();
  });

  // ─── Test 3: _pde_session_source mapping ────────────────────────────────

  it('Test 3: _pde_session_source is L for local backend, R for ssh or managed', () => {
    const agg = makeAggregator();
    const reg = makeRegistry({
      'local-sess': { backend: 'local' },
      'ssh-sess': { backend: 'ssh' },
      'managed-sess': { backend: 'managed' },
    });
    const fanout = new TmuxFanout(agg, reg, { fanoutPath });
    fanout.start();

    agg.emit('event', 'local-sess', { event_type: 'test' });
    agg.emit('event', 'ssh-sess', { event_type: 'test' });
    agg.emit('event', 'managed-sess', { event_type: 'test' });

    const lines = readFanoutLines(fanoutPath);
    expect(lines).toHaveLength(3);

    expect(lines[0]._pde_session_source).toBe('L');  // local
    expect(lines[1]._pde_session_source).toBe('R');  // ssh
    expect(lines[2]._pde_session_source).toBe('R');  // managed

    fanout.stop();
  });

  // ─── Test 4: _pde_session_source defaults to L for unknown session ───────

  it('Test 4: _pde_session_source defaults to L when registry.get returns undefined', () => {
    const agg = makeAggregator();
    const reg = makeRegistry({});  // no sessions registered
    const fanout = new TmuxFanout(agg, reg, { fanoutPath });
    fanout.start();

    agg.emit('event', 'unknown-sess', { event_type: 'test' });

    const lines = readFanoutLines(fanoutPath);
    expect(lines).toHaveLength(1);
    expect(lines[0]._pde_session_source).toBe('L');

    fanout.stop();
  });

  // ─── Test 5: _pde_color_index assignment and wraparound ─────────────────

  it('Test 5: first session gets index 0, second gets 1, seventh wraps to 0 (modulo 6)', () => {
    const agg = makeAggregator();
    const reg = makeRegistry({});
    const fanout = new TmuxFanout(agg, reg, { fanoutPath });
    fanout.start();

    // Emit one event for each of 7 distinct sessions
    for (let i = 0; i < 7; i++) {
      agg.emit('event', `sess-${i}`, { event_type: 'test' });
    }

    const lines = readFanoutLines(fanoutPath);
    expect(lines).toHaveLength(7);

    // First 6 sessions get indices 0-5
    for (let i = 0; i < 6; i++) {
      expect(lines[i]._pde_color_index).toBe(i);
    }
    // Seventh session wraps to 0
    expect(lines[6]._pde_color_index).toBe(0);

    fanout.stop();
  });

  // ─── Test 6: stop() removes event listener ──────────────────────────────

  it('Test 6: stop() removes the event listener so subsequent events are not written', () => {
    const agg = makeAggregator();
    const reg = makeRegistry({ 'active-sess': { backend: 'local' } });
    const fanout = new TmuxFanout(agg, reg, { fanoutPath });
    fanout.start();

    // Emit before stop — should be written
    agg.emit('event', 'active-sess', { event_type: 'before_stop' });

    fanout.stop();

    // Emit after stop — should NOT be written
    agg.emit('event', 'active-sess', { event_type: 'after_stop' });

    const lines = readFanoutLines(fanoutPath);
    expect(lines).toHaveLength(1);
    expect(lines[0].event_type).toBe('before_stop');
  });
});

// ─── Exports ──────────────────────────────────────────────────────────────────

describe('TmuxFanout module exports', () => {
  it('exports FANOUT_PATH as a string in os.tmpdir()', () => {
    expect(typeof FANOUT_PATH).toBe('string');
    expect(FANOUT_PATH).toContain(os.tmpdir());
  });

  it('exports FILTER_PATH as a string in os.tmpdir()', () => {
    expect(typeof FILTER_PATH).toBe('string');
    expect(FILTER_PATH).toContain(os.tmpdir());
  });
});
