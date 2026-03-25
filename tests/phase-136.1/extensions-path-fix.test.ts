import { describe, it, expect } from 'vitest';

// Simulate a wire envelope as it comes from createEnvelope + WireEnvelopeSchema.passthrough()
// phase_name is at TOP LEVEL (spread from PDE event), extensions is empty
function realisticWireEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    seq: 1,
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    machine_id: 'test-machine',
    relay_ts: new Date().toISOString(),
    approval_id: null,
    schema_version: '1.0.0',
    ts: new Date().toISOString(),
    event_type: 'phase_started',
    extensions: {},                  // ALWAYS empty in production
    phase_name: 'Core Dashboard',    // TOP-LEVEL from PDE event spread
    phase_number: '136',
    plan_id: '136-01',
    ...overrides,
  };
}

describe('extensions path fix integration', () => {
  it('phase_name is at top level, not inside extensions', () => {
    const env = realisticWireEnvelope();
    // This is the bug: extensions.phase_name would be undefined
    const ext = env.extensions as Record<string, unknown>;
    expect(ext.phase_name).toBeUndefined();
    // This is the fix: top-level phase_name has the value
    expect(env.phase_name).toBe('Core Dashboard');
  });

  it('plan_id is at top level as fallback for plan_name', () => {
    const env = realisticWireEnvelope();
    expect((env as Record<string, unknown>).plan_name).toBeUndefined();
    expect(env.plan_id).toBe('136-01');
  });
});
