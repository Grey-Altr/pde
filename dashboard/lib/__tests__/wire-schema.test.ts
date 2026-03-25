import { describe, it, expect } from 'vitest';
import { WireEnvelopeSchema } from '../wire-schema';

const validEnvelope = {
  seq:            0,
  session_id:     '123e4567-e89b-12d3-a456-426614174000',
  machine_id:     'my-machine',
  relay_ts:       '2024-01-01T00:00:00.000Z',
  approval_id:    null,
  schema_version: '1.0',
  ts:             '2024-01-01T00:00:00.000Z',
  event_type:     'session_start',
};

describe('WireEnvelopeSchema', () => {
  it('accepts a valid envelope', () => {
    const result = WireEnvelopeSchema.safeParse(validEnvelope);
    expect(result.success).toBe(true);
  });

  it('rejects envelope missing session_id', () => {
    const { session_id: _, ...noSessionId } = validEnvelope;
    const result = WireEnvelopeSchema.safeParse(noSessionId);
    expect(result.success).toBe(false);
  });

  it('rejects envelope with negative seq', () => {
    const result = WireEnvelopeSchema.safeParse({ ...validEnvelope, seq: -1 });
    expect(result.success).toBe(false);
  });

  it('passes through extra fields (passthrough mode)', () => {
    const withExtra = { ...validEnvelope, tool_name: 'Bash', file_path: '/foo/bar' };
    const result = WireEnvelopeSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).tool_name).toBe('Bash');
      expect((result.data as Record<string, unknown>).file_path).toBe('/foo/bar');
    }
  });
});
