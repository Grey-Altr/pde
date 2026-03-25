import type { WireEnvelope } from '../wire-schema';
import { deriveProgress } from '../derive-progress';

function mockEnvelope(overrides: Record<string, unknown> & { event_type: string }): WireEnvelope {
  return {
    seq: 0,
    session_id: '00000000-0000-0000-0000-000000000001',
    machine_id: 'test-machine',
    relay_ts: new Date().toISOString(),
    approval_id: null,
    schema_version: '1.0.0',
    ts: new Date().toISOString(),
    ...overrides,
  } as WireEnvelope;
}

describe('deriveProgress', () => {
  it('returns empty strings for empty events array', () => {
    const result = deriveProgress([]);
    expect(result).toEqual({ phaseName: '', planName: '' });
  });

  it('returns phaseName from newest event with top-level phase_name', () => {
    const events = [
      mockEnvelope({ event_type: 'session_start', phase_name: '136' } as any),
      mockEnvelope({ event_type: 'tool_called' }),
    ];
    const result = deriveProgress(events);
    expect(result.phaseName).toBe('136');
    expect(result.planName).toBe('');
  });

  it('returns both phaseName and planName when newest event has both top-level fields', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', phase_name: '136', plan_name: '01' } as any),
    ];
    const result = deriveProgress(events);
    expect(result).toEqual({ phaseName: '136', planName: '01' });
  });

  it('skips events without phase_name and finds the first (newest) event that has one', () => {
    const events = [
      mockEnvelope({ event_type: 'bash_called' }),
      mockEnvelope({ event_type: 'bash_called' }),
      mockEnvelope({ event_type: 'session_start', phase_name: '135', plan_name: '02' } as any),
    ];
    const result = deriveProgress(events);
    expect(result).toEqual({ phaseName: '135', planName: '02' });
  });

  it('returns empty strings when no event has a phase_name', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called' }),
      mockEnvelope({ event_type: 'bash_called' }),
    ];
    const result = deriveProgress(events);
    expect(result).toEqual({ phaseName: '', planName: '' });
  });

  it('returns planName as empty string when only phase_name is present', () => {
    const events = [
      mockEnvelope({ event_type: 'session_start', phase_name: '136' } as any),
    ];
    const result = deriveProgress(events);
    expect(result.phaseName).toBe('136');
    expect(result.planName).toBe('');
  });

  it('returns planName from top-level plan_id when plan_name is absent', () => {
    const events = [
      mockEnvelope({ event_type: 'plan_started', phase_name: '136', plan_id: '136-01' } as any),
    ];
    const result = deriveProgress(events);
    expect(result).toEqual({ phaseName: '136', planName: '136-01' });
  });

  it('prefers plan_name over plan_id when both present', () => {
    const events = [
      mockEnvelope({ event_type: 'plan_started', phase_name: '136', plan_name: '02', plan_id: '136-02' } as any),
    ];
    const result = deriveProgress(events);
    expect(result).toEqual({ phaseName: '136', planName: '02' });
  });
});
