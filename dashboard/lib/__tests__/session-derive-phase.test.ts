/**
 * MON-01: Validates the session derivation logic from session-detail-client.tsx (lines 42-58).
 *
 * The component uses `latestEv as Record<string, unknown>` to read top-level
 * wire envelope fields phase_name, plan_name, and plan_id into the session object.
 * Since jsdom/RTL are not installed we replicate the pure computation inline.
 */
import type { WireEnvelope } from '../wire-schema';
import { deriveStatus } from '../session-status';
import type { SessionListItem } from '../queries';

// ------------------------------------------------------------------
// Helpers — mirror the mockEnvelope factory from derive-progress.test.ts
// ------------------------------------------------------------------

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

// Replicates the pure derivation from session-detail-client.tsx lines 42-58.
// initialSession is the baseline; mergedEvents[0] is the latest event.
function deriveSessionFromLatestEvent(
  mergedEvents: WireEnvelope[],
  initialSession: SessionListItem,
): SessionListItem {
  const latestEv = mergedEvents[0];
  if (!latestEv) return initialSession;

  const lastEventType = latestEv.event_type;
  const lastEventTs = new Date(latestEv.relay_ts).getTime();
  const evPayload = latestEv as Record<string, unknown>;

  return {
    ...initialSession,
    lastEventType,
    lastEventTs,
    status: deriveStatus(lastEventType, lastEventTs),
    phase: String(evPayload.phase_name ?? '') || initialSession.phase,
    plan: (String(evPayload.plan_name ?? '') || String(evPayload.plan_id ?? '')) || initialSession.plan,
  };
}

// Baseline session used across tests
const baseSession: SessionListItem = {
  id: 'test-session',
  status: 'idle',
  phase: 'initial-phase',
  plan: 'initial-plan',
  lastEventType: 'session_start',
  lastEventTs: 0,
  startedAt: 0,
};

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('session-detail-client: session derivation from latest event', () => {
  it('returns initialSession unchanged when mergedEvents is empty', () => {
    const result = deriveSessionFromLatestEvent([], baseSession);
    expect(result).toBe(baseSession);
  });

  it('reads phase_name from the top-level wire envelope field', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', phase_name: '136.1' } as any),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.phase).toBe('136.1');
  });

  it('falls back to initialSession.phase when event has no phase_name', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called' }),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.phase).toBe('initial-phase');
  });

  it('reads plan_name from the top-level wire envelope field', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', phase_name: '136.1', plan_name: '01' } as any),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.plan).toBe('01');
  });

  it('falls back to plan_id when plan_name is absent', () => {
    const events = [
      mockEnvelope({ event_type: 'plan_started', phase_name: '136.1', plan_id: '136.1-01' } as any),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.plan).toBe('136.1-01');
  });

  it('prefers plan_name over plan_id when both are present', () => {
    const events = [
      mockEnvelope({ event_type: 'plan_started', phase_name: '136.1', plan_name: '01', plan_id: '136.1-01' } as any),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.plan).toBe('01');
  });

  it('falls back to initialSession.plan when event has neither plan_name nor plan_id', () => {
    const events = [
      mockEnvelope({ event_type: 'tool_called', phase_name: '136.1' } as any),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.plan).toBe('initial-plan');
  });

  it('propagates lastEventType and lastEventTs from the latest event', () => {
    const relayTs = '2026-03-25T10:00:00.000Z';
    const events = [
      mockEnvelope({ event_type: 'bash_called', relay_ts: relayTs }),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.lastEventType).toBe('bash_called');
    expect(result.lastEventTs).toBe(new Date(relayTs).getTime());
  });

  it('uses the first (newest) event in the array, not subsequent events', () => {
    const events = [
      mockEnvelope({ event_type: 'bash_called', phase_name: 'newest-phase' } as any),
      mockEnvelope({ event_type: 'session_start', phase_name: 'older-phase' } as any),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.phase).toBe('newest-phase');
  });

  it('derives status from the latest event_type and relay_ts', () => {
    const recentTs = new Date(Date.now() - 5_000).toISOString(); // 5 seconds ago → active
    const events = [
      mockEnvelope({ event_type: 'tool_called', relay_ts: recentTs }),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.status).toBe('active');
  });

  it('sets status to complete when latest event_type is session_end', () => {
    const events = [
      mockEnvelope({ event_type: 'session_end' }),
    ];
    const result = deriveSessionFromLatestEvent(events, baseSession);
    expect(result.status).toBe('complete');
  });
});
