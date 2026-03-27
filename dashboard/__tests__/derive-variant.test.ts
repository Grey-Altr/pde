import { describe, it, expect } from 'vitest';
import type { SessionListItem } from '@/lib/queries';
import { deriveVariant } from '@/components/multi-phase-progress';

// Helper to create minimal SessionListItem fixtures
function makeSession(overrides: Partial<SessionListItem>): SessionListItem {
  return {
    id: 'test-id',
    status: 'active',
    phase: 'phase-1',
    plan: 'plan-01',
    lastEventType: 'task_complete',
    lastEventTs: Date.now(),
    startedAt: Date.now() - 60_000,
    pendingApprovalId: null,
    source: 'local',
    ...overrides,
  };
}

describe('deriveVariant — MultiPhaseProgress phase status logic (DSH-04)', () => {
  it('returns "executing" when any session in the phase has status "active"', () => {
    const sessions = [
      makeSession({ id: 's1', status: 'active' }),
      makeSession({ id: 's2', status: 'idle' }),
    ];
    expect(deriveVariant(sessions)).toBe('executing');
  });

  it('returns "failed" when any session has status "failed"', () => {
    const sessions = [
      makeSession({ id: 's1', status: 'failed' }),
      makeSession({ id: 's2', status: 'active' }),
    ];
    expect(deriveVariant(sessions)).toBe('failed');
  });

  it('returns "failed" when any session has status "error"', () => {
    const sessions = [
      makeSession({ id: 's1', status: 'error' }),
      makeSession({ id: 's2', status: 'idle' }),
    ];
    expect(deriveVariant(sessions)).toBe('failed');
  });

  it('returns "failed" priority over "executing" (failed beats active)', () => {
    // failed/error takes top priority per the implementation
    const sessions = [
      makeSession({ id: 's1', status: 'failed' }),
      makeSession({ id: 's2', status: 'active' }),
    ];
    expect(deriveVariant(sessions)).toBe('failed');
  });

  it('returns "complete" when all sessions have status "complete"', () => {
    const sessions = [
      makeSession({ id: 's1', status: 'complete' }),
      makeSession({ id: 's2', status: 'complete' }),
    ];
    expect(deriveVariant(sessions)).toBe('complete');
  });

  it('returns "waiting" when all sessions are idle (not active, failed, or complete)', () => {
    const sessions = [
      makeSession({ id: 's1', status: 'idle' }),
      makeSession({ id: 's2', status: 'queued' }),
    ];
    expect(deriveVariant(sessions)).toBe('waiting');
  });

  it('returns "waiting" for a single queued session', () => {
    const sessions = [makeSession({ id: 's1', status: 'queued' })];
    expect(deriveVariant(sessions)).toBe('waiting');
  });

  it('returns "executing" for a single active session', () => {
    const sessions = [makeSession({ id: 's1', status: 'active' })];
    expect(deriveVariant(sessions)).toBe('executing');
  });
});
