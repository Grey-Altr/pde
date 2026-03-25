'use strict';

/**
 * test-relay-protocol.cjs
 *
 * Unit tests for wire protocol envelope schema and factory.
 * Phase 134 — Plan 01: Wire Protocol Schema
 * Requirement: RLY-02
 */

// vitest globals are injected by the test runner (globals: true in vitest.config.ts)
// describe, it, expect, beforeEach are available globally
const { WireEnvelopeSchema, createEnvelope, resetSequence } = require('../../bin/lib/relay-protocol.cjs');

const validEnvelope = {
  seq: 0,
  session_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  machine_id: 'test-host',
  relay_ts: '2026-03-24T00:00:00.000Z',
  approval_id: null,
  schema_version: '1.0',
  ts: '2026-03-24T00:00:00.000Z',
  event_type: 'session_start',
};

describe('WireEnvelopeSchema', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('Test 1: valid envelope with all required fields passes safeParse with success=true', () => {
    const result = WireEnvelopeSchema.safeParse(validEnvelope);
    expect(result.success).toBe(true);
  });

  it('Test 2: envelope missing session_id fails safeParse with success=false', () => {
    const { session_id, ...withoutSessionId } = validEnvelope;
    const result = WireEnvelopeSchema.safeParse(withoutSessionId);
    expect(result.success).toBe(false);
  });

  it('Test 3: envelope missing seq fails safeParse with success=false', () => {
    const { seq, ...withoutSeq } = validEnvelope;
    const result = WireEnvelopeSchema.safeParse(withoutSeq);
    expect(result.success).toBe(false);
  });

  it('Test 4: envelope with extra PDE fields passes due to .passthrough()', () => {
    const withExtras = {
      ...validEnvelope,
      tool_name: 'bash',
      file_path: '/some/file.ts',
    };
    const result = WireEnvelopeSchema.safeParse(withExtras);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tool_name).toBe('bash');
      expect(result.data.file_path).toBe('/some/file.ts');
    }
  });

  it('Test 5: approval_id accepts both valid UUID and null', () => {
    const withUuid = { ...validEnvelope, approval_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
    const withNull = { ...validEnvelope, approval_id: null };

    const resultUuid = WireEnvelopeSchema.safeParse(withUuid);
    const resultNull = WireEnvelopeSchema.safeParse(withNull);

    expect(resultUuid.success).toBe(true);
    expect(resultNull.success).toBe(true);
  });

  it('Test 6: createEnvelope returns valid envelope with auto-incrementing seq starting at 0', () => {
    const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const pdeEvent = {
      schema_version: '1.0',
      ts: '2026-03-24T00:00:00.000Z',
      event_type: 'session_start',
    };

    const env0 = createEnvelope(sessionId, pdeEvent);
    const env1 = createEnvelope(sessionId, pdeEvent);
    const env2 = createEnvelope(sessionId, pdeEvent);

    expect(env0.seq).toBe(0);
    expect(env1.seq).toBe(1);
    expect(env2.seq).toBe(2);
    expect(env0.session_id).toBe(sessionId);

    const parseResult = WireEnvelopeSchema.safeParse(env0);
    expect(parseResult.success).toBe(true);
  });

  it('Test 7: resetSequence() resets the counter to 0', () => {
    const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const pdeEvent = {
      schema_version: '1.0',
      ts: '2026-03-24T00:00:00.000Z',
      event_type: 'session_start',
    };

    createEnvelope(sessionId, pdeEvent); // seq=0
    createEnvelope(sessionId, pdeEvent); // seq=1
    resetSequence();
    const afterReset = createEnvelope(sessionId, pdeEvent); // should be 0 again
    expect(afterReset.seq).toBe(0);
  });

  it('Test 8: machine_id is a non-empty string derived from os.hostname()', () => {
    const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const pdeEvent = {
      schema_version: '1.0',
      ts: '2026-03-24T00:00:00.000Z',
      event_type: 'session_start',
    };
    const env = createEnvelope(sessionId, pdeEvent);
    expect(typeof env.machine_id).toBe('string');
    expect(env.machine_id.length).toBeGreaterThan(0);

    const os = require('os');
    expect(env.machine_id).toBe(os.hostname());
  });
});
