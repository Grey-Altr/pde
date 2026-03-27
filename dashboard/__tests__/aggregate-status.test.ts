import { describe, it, expect } from 'vitest';
import type { SessionListItem } from '@/lib/queries';

// Pure aggregate logic extracted for testability
function deriveAggregates(sessions: SessionListItem[]) {
  const activeCount = sessions.filter(s => s.status === 'active').length;
  const queuedCount = sessions.filter(s => s.status === 'queued').length;
  const failedCount = sessions.filter(s => s.status === 'failed' || s.status === 'error').length;
  return { activeCount, queuedCount, failedCount };
}

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

describe('AggregateStatusBar counts', () => {
  it('counts active, queued, and failed correctly from mock sessions', () => {
    const sessions: SessionListItem[] = [
      makeSession({ id: 's1', status: 'active' }),
      makeSession({ id: 's2', status: 'active' }),
      makeSession({ id: 's3', status: 'queued' }),
      makeSession({ id: 's4', status: 'failed' }),
      makeSession({ id: 's5', status: 'error' }),
      makeSession({ id: 's6', status: 'complete' }),
    ];

    const { activeCount, queuedCount, failedCount } = deriveAggregates(sessions);

    expect(activeCount).toBe(2);
    expect(queuedCount).toBe(1);
    expect(failedCount).toBe(2); // failed + error
  });

  it('handles empty sessions array', () => {
    const { activeCount, queuedCount, failedCount } = deriveAggregates([]);

    expect(activeCount).toBe(0);
    expect(queuedCount).toBe(0);
    expect(failedCount).toBe(0);
  });

  it('handles mixed statuses with no failed', () => {
    const sessions: SessionListItem[] = [
      makeSession({ id: 's1', status: 'active' }),
      makeSession({ id: 's2', status: 'idle' }),
      makeSession({ id: 's3', status: 'complete' }),
    ];

    const { activeCount, queuedCount, failedCount } = deriveAggregates(sessions);

    expect(activeCount).toBe(1);
    expect(queuedCount).toBe(0);
    expect(failedCount).toBe(0);
  });

  it('counts error status as failed', () => {
    const sessions: SessionListItem[] = [
      makeSession({ id: 's1', status: 'error' }),
      makeSession({ id: 's2', status: 'error' }),
    ];

    const { failedCount } = deriveAggregates(sessions);
    expect(failedCount).toBe(2);
  });

  it('does not count idle or complete as any active category', () => {
    const sessions: SessionListItem[] = [
      makeSession({ id: 's1', status: 'idle' }),
      makeSession({ id: 's2', status: 'complete' }),
    ];

    const { activeCount, queuedCount, failedCount } = deriveAggregates(sessions);

    expect(activeCount).toBe(0);
    expect(queuedCount).toBe(0);
    expect(failedCount).toBe(0);
  });
});
