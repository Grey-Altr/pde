'use strict';

/**
 * test-event-emission.cjs — Unit tests for firecrawl_operation event envelope validation
 *
 * Phase 203, Plan 02: CHG-02
 * Tests:
 *   - Event envelope has all required fields (url, slug, word_count, operation)
 *   - event_type is "firecrawl_operation"
 *   - session_id is read from config.json (not hardcoded "unknown")
 *   - word_count is a number >= 0
 *   - operation is one of the valid subcommand names
 *
 * Run: node tests/phase-203/test-event-emission.cjs
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

// ── Validate event envelope shape ─────────────────────────────────────────────

const VALID_OPERATIONS = ['scrape', 'search', 'map', 'extract', 'crawl', 'agent', 'interact', 'watch'];

function validateEventEnvelope(envelope) {
  assert.strictEqual(typeof envelope, 'object', 'envelope must be an object');
  assert.ok(envelope !== null, 'envelope must not be null');

  // Required fields
  assert.strictEqual(typeof envelope.schema_version, 'string', 'schema_version must be a string');
  assert.strictEqual(envelope.schema_version, '1.0', 'schema_version must be "1.0"');

  assert.strictEqual(typeof envelope.ts, 'string', 'ts must be a string');
  assert.ok(envelope.ts.length > 0, 'ts must not be empty');

  assert.strictEqual(envelope.event_type, 'firecrawl_operation', 'event_type must be "firecrawl_operation"');

  assert.strictEqual(typeof envelope.session_id, 'string', 'session_id must be a string');
  assert.ok(envelope.session_id.length > 0, 'session_id must not be empty');

  assert.strictEqual(typeof envelope.url, 'string', 'url must be a string');
  assert.ok(envelope.url.length > 0, 'url must not be empty');

  assert.strictEqual(typeof envelope.slug, 'string', 'slug must be a string');
  assert.ok(envelope.slug.length > 0, 'slug must not be empty');

  assert.strictEqual(typeof envelope.word_count, 'number', 'word_count must be a number');
  assert.ok(envelope.word_count >= 0, 'word_count must be >= 0');

  assert.ok(VALID_OPERATIONS.includes(envelope.operation), `operation must be one of: ${VALID_OPERATIONS.join(', ')}`);

  assert.strictEqual(typeof envelope.extensions, 'object', 'extensions must be an object');
}

// ── Session ID reading logic (mirrors workflow emission blocks) ────────────────

function readSessionIdFromConfig(configPath) {
  let sessionId = 'unknown';
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg.monitoring && cfg.monitoring.session_id) {
      sessionId = cfg.monitoring.session_id;
    }
  } catch {
    // swallow — fall back to 'unknown'
  }
  return sessionId;
}

// ── safeAppendEvent integration ───────────────────────────────────────────────

const { safeAppendEvent } = require('../../bin/lib/event-bus.cjs');

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nPhase 203 / Plan 02: Event Emission Tests\n');

// --- event_type tests ---
console.log('event_type validation:');

test('event_type is "firecrawl_operation"', () => {
  const envelope = {
    schema_version: '1.0',
    ts: new Date().toISOString(),
    event_type: 'firecrawl_operation',
    session_id: 'test-session-id',
    url: 'https://example.com/pricing',
    slug: 'example-com-pricing',
    word_count: 500,
    operation: 'scrape',
    extensions: {},
  };
  assert.strictEqual(envelope.event_type, 'firecrawl_operation');
});

test('wrong event_type fails validation', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'tool_called',  // wrong
      session_id: 'test-session-id',
      url: 'https://example.com',
      slug: 'example-com',
      word_count: 0,
      operation: 'scrape',
      extensions: {},
    };
    validateEventEnvelope(envelope);
  }, /firecrawl_operation/);
});

// --- required fields tests ---
console.log('\nRequired fields validation:');

test('valid scrape envelope passes validation', () => {
  const envelope = {
    schema_version: '1.0',
    ts: new Date().toISOString(),
    event_type: 'firecrawl_operation',
    session_id: 'ae4d3cf7-83bb-4f3d-906e-749f39fc2f47',
    url: 'https://example.com/pricing',
    slug: 'example-com-pricing',
    word_count: 1234,
    operation: 'scrape',
    extensions: {},
  };
  validateEventEnvelope(envelope);  // should not throw
});

test('missing url field fails validation', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      // url missing
      slug: 'example-com',
      word_count: 0,
      operation: 'scrape',
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

test('missing slug field fails validation', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      url: 'https://example.com',
      // slug missing
      word_count: 0,
      operation: 'scrape',
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

test('missing word_count field fails validation', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      url: 'https://example.com',
      slug: 'example-com',
      // word_count missing
      operation: 'scrape',
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

test('missing operation field fails validation', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      url: 'https://example.com',
      slug: 'example-com',
      word_count: 0,
      // operation missing
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

// --- session_id reading tests ---
console.log('\nsession_id reading:');

test('session_id read from valid config.json is not "unknown"', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const configPath = path.join(tmpDir, 'config.json');
  const expectedSessionId = 'ae4d3cf7-83bb-4f3d-906e-749f39fc2f47';

  fs.writeFileSync(configPath, JSON.stringify({
    monitoring: {
      enabled: true,
      session_id: expectedSessionId,
    },
  }), 'utf-8');

  const sessionId = readSessionIdFromConfig(configPath);
  assert.strictEqual(sessionId, expectedSessionId, `Expected "${expectedSessionId}" but got "${sessionId}"`);
  assert.notStrictEqual(sessionId, 'unknown', 'session_id must not be "unknown" when config.json is present');

  fs.rmSync(tmpDir, { recursive: true });
});

test('session_id falls back to "unknown" when config.json is missing', () => {
  const sessionId = readSessionIdFromConfig('/tmp/nonexistent-pde-test-config.json');
  assert.strictEqual(sessionId, 'unknown');
});

test('session_id falls back to "unknown" when config.json has no monitoring.session_id', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const configPath = path.join(tmpDir, 'config.json');

  fs.writeFileSync(configPath, JSON.stringify({ mode: 'yolo' }), 'utf-8');

  const sessionId = readSessionIdFromConfig(configPath);
  assert.strictEqual(sessionId, 'unknown');

  fs.rmSync(tmpDir, { recursive: true });
});

// --- word_count tests ---
console.log('\nword_count validation:');

test('word_count of 0 is valid (map/extract operations)', () => {
  const envelope = {
    schema_version: '1.0',
    ts: new Date().toISOString(),
    event_type: 'firecrawl_operation',
    session_id: 'test',
    url: 'https://example.com',
    slug: 'example-com',
    word_count: 0,
    operation: 'map',
    extensions: {},
  };
  validateEventEnvelope(envelope);
});

test('word_count of positive integer is valid', () => {
  const envelope = {
    schema_version: '1.0',
    ts: new Date().toISOString(),
    event_type: 'firecrawl_operation',
    session_id: 'test',
    url: 'https://example.com',
    slug: 'example-com',
    word_count: 2500,
    operation: 'scrape',
    extensions: {},
  };
  validateEventEnvelope(envelope);
});

test('word_count as string fails validation', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      url: 'https://example.com',
      slug: 'example-com',
      word_count: '1234',  // string, not number
      operation: 'scrape',
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

// --- operation validation tests ---
console.log('\noperation field validation:');

VALID_OPERATIONS.forEach(op => {
  test(`operation "${op}" is valid`, () => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      url: 'https://example.com',
      slug: 'example-com',
      word_count: 0,
      operation: op,
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

test('invalid operation "agent-status" fails (no event for read-only check)', () => {
  assert.throws(() => {
    const envelope = {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: 'test',
      url: 'https://example.com',
      slug: 'example-com',
      word_count: 0,
      operation: 'agent-status',  // invalid — read-only, no event emitted
      extensions: {},
    };
    validateEventEnvelope(envelope);
  });
});

// --- safeAppendEvent integration test ---
console.log('\nsafeAppendEvent integration:');

test('safeAppendEvent writes event to NDJSON file with correct fields', () => {
  const testSessionId = 'test-' + Date.now();
  const logPath = path.join(os.tmpdir(), `pde-session-${testSessionId}.ndjson`);

  // Clean up if exists
  try { fs.unlinkSync(logPath); } catch {}

  const envelope = {
    schema_version: '1.0',
    ts: new Date().toISOString(),
    event_type: 'firecrawl_operation',
    session_id: testSessionId,
    url: 'https://example.com/pricing',
    slug: 'example-com-pricing',
    word_count: 850,
    operation: 'scrape',
    extensions: {},
  };

  safeAppendEvent(testSessionId, envelope);

  assert.ok(fs.existsSync(logPath), `NDJSON file should exist at ${logPath}`);

  const line = fs.readFileSync(logPath, 'utf-8').trim();
  const parsed = JSON.parse(line);

  assert.strictEqual(parsed.event_type, 'firecrawl_operation');
  assert.strictEqual(parsed.session_id, testSessionId);
  assert.strictEqual(parsed.url, 'https://example.com/pricing');
  assert.strictEqual(parsed.slug, 'example-com-pricing');
  assert.strictEqual(parsed.word_count, 850);
  assert.strictEqual(parsed.operation, 'scrape');

  // Clean up
  try { fs.unlinkSync(logPath); } catch {}
});

test('safeAppendEvent does not throw on error (swallows silently)', () => {
  // Pass invalid sessionId that would produce a bad path — should not throw
  assert.doesNotThrow(() => {
    safeAppendEvent('', {
      schema_version: '1.0',
      ts: new Date().toISOString(),
      event_type: 'firecrawl_operation',
      session_id: '',
      url: 'https://example.com',
      slug: 'example-com',
      word_count: 0,
      operation: 'scrape',
      extensions: {},
    });
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('─'.repeat(50));

if (failed > 0) {
  process.exit(1);
}
