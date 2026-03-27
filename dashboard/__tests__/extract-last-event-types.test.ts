import { describe, it, expect } from 'vitest';
import type { WireEnvelope } from '@/lib/wire-schema';
import { extractLastEventTypes } from '@/components/action-chevron';

// Helper to create minimal WireEnvelope fixtures
function makeEnvelope(
  sessionId: string,
  eventType: string,
  seq: number = 0
): WireEnvelope {
  return {
    seq,
    session_id: sessionId,
    machine_id: 'test-host',
    relay_ts: '2026-03-25T12:00:00.000Z',
    approval_id: null,
    schema_version: '1.0',
    ts: '2026-03-25T12:00:00.000Z',
    event_type: eventType,
  };
}

const SESSION_A = '550e8400-e29b-41d4-a716-446655440001';
const SESSION_B = '550e8400-e29b-41d4-a716-446655440002';

describe('extractLastEventTypes — ActionChevron state transition logic (DSH-08)', () => {
  it('returns empty array when no events match the sessionId', () => {
    const events = [makeEnvelope(SESSION_B, 'session_start', 0)];
    expect(extractLastEventTypes(events, SESSION_A)).toEqual([]);
  });

  it('filters events to only those belonging to the given sessionId', () => {
    const events = [
      makeEnvelope(SESSION_A, 'session_start', 0),
      makeEnvelope(SESSION_B, 'tool_use', 1),
      makeEnvelope(SESSION_A, 'task_complete', 2),
    ];
    const result = extractLastEventTypes(events, SESSION_A);
    // Should only contain event types from SESSION_A
    expect(result).not.toContain('tool_use');
  });

  it('returns at most 3 event types', () => {
    const events = [
      makeEnvelope(SESSION_A, 'session_start', 0),
      makeEnvelope(SESSION_A, 'tool_use', 1),
      makeEnvelope(SESSION_A, 'task_complete', 2),
      makeEnvelope(SESSION_A, 'session_end', 3),
    ];
    const result = extractLastEventTypes(events, SESSION_A);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns the LAST 3 event types (most recent at the end)', () => {
    const events = [
      makeEnvelope(SESSION_A, 'session_start', 0),
      makeEnvelope(SESSION_A, 'tool_use', 1),
      makeEnvelope(SESSION_A, 'task_complete', 2),
      makeEnvelope(SESSION_A, 'session_end', 3),
    ];
    const result = extractLastEventTypes(events, SESSION_A);
    expect(result).toEqual(['tool_use', 'task_complete', 'session_end']);
  });

  it('deduplicates consecutive identical event_types', () => {
    // If the same event_type appears consecutively, it should be collapsed
    const events = [
      makeEnvelope(SESSION_A, 'tool_use', 0),
      makeEnvelope(SESSION_A, 'tool_use', 1),
      makeEnvelope(SESSION_A, 'tool_use', 2),
      makeEnvelope(SESSION_A, 'task_complete', 3),
    ];
    const result = extractLastEventTypes(events, SESSION_A);
    // Consecutive tool_use deduplicated to one; then task_complete
    expect(result).toEqual(['tool_use', 'task_complete']);
  });

  it('does not deduplicate non-consecutive identical event_types', () => {
    // A → B → A should keep both A occurrences
    const events = [
      makeEnvelope(SESSION_A, 'tool_use', 0),
      makeEnvelope(SESSION_A, 'task_complete', 1),
      makeEnvelope(SESSION_A, 'tool_use', 2),
    ];
    const result = extractLastEventTypes(events, SESSION_A);
    expect(result).toEqual(['tool_use', 'task_complete', 'tool_use']);
  });

  it('returns fewer than 3 items when fewer unique consecutive events exist', () => {
    const events = [makeEnvelope(SESSION_A, 'session_start', 0)];
    const result = extractLastEventTypes(events, SESSION_A);
    expect(result).toEqual(['session_start']);
  });

  it('returns empty array for empty events input', () => {
    expect(extractLastEventTypes([], SESSION_A)).toEqual([]);
  });
});
