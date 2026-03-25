import type { WireEnvelope } from '../wire-schema';
import { EVENT_FILTER_GROUPS, filterEvents } from '../event-types';

function mockEnvelope(overrides: Partial<WireEnvelope> & { event_type: string }): WireEnvelope {
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

describe('EVENT_FILTER_GROUPS', () => {
  it('all is null', () => {
    expect(EVENT_FILTER_GROUPS.all).toBeNull();
  });

  it('tools contains tool_called, bash_called, file_changed', () => {
    expect(EVENT_FILTER_GROUPS.tools).toContain('tool_called');
    expect(EVENT_FILTER_GROUPS.tools).toContain('bash_called');
    expect(EVENT_FILTER_GROUPS.tools).toContain('file_changed');
  });

  it('agents contains subagent_start, subagent_stop', () => {
    expect(EVENT_FILTER_GROUPS.agents).toContain('subagent_start');
    expect(EVENT_FILTER_GROUPS.agents).toContain('subagent_stop');
  });

  it('phases contains session_start, session_end', () => {
    expect(EVENT_FILTER_GROUPS.phases).toContain('session_start');
    expect(EVENT_FILTER_GROUPS.phases).toContain('session_end');
  });

  it('errors contains "error"', () => {
    expect(EVENT_FILTER_GROUPS.errors).toContain('error');
  });

  it('tokens contains token_usage', () => {
    expect(EVENT_FILTER_GROUPS.tokens).toContain('token_usage');
  });

  it('approvals contains approval_request and approval_response', () => {
    expect(EVENT_FILTER_GROUPS.approvals).toContain('approval_request');
    expect(EVENT_FILTER_GROUPS.approvals).toContain('approval_response');
  });
});

describe('filterEvents', () => {
  const events = [
    mockEnvelope({ event_type: 'tool_called' }),
    mockEnvelope({ event_type: 'bash_called' }),
    mockEnvelope({ event_type: 'file_changed' }),
    mockEnvelope({ event_type: 'subagent_start' }),
    mockEnvelope({ event_type: 'subagent_stop' }),
    mockEnvelope({ event_type: 'session_start' }),
    mockEnvelope({ event_type: 'session_end' }),
    mockEnvelope({ event_type: 'error' }),
    mockEnvelope({ event_type: 'token_usage' }),
  ];

  it('returns all events when group is "all"', () => {
    const result = filterEvents(events, 'all');
    expect(result).toHaveLength(events.length);
    expect(result).toBe(events); // same reference
  });

  it('returns only tool events when group is "tools"', () => {
    const result = filterEvents(events, 'tools');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.event_type)).toEqual(['tool_called', 'bash_called', 'file_changed']);
  });

  it('returns only agent events when group is "agents"', () => {
    const result = filterEvents(events, 'agents');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.event_type)).toEqual(['subagent_start', 'subagent_stop']);
  });

  it('returns only phase events when group is "phases"', () => {
    const result = filterEvents(events, 'phases');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.event_type)).toEqual(['session_start', 'session_end']);
  });

  it('returns only error events when group is "errors"', () => {
    const result = filterEvents(events, 'errors');
    expect(result).toHaveLength(1);
    expect(result[0].event_type).toBe('error');
  });

  it('returns only token events when group is "tokens"', () => {
    const result = filterEvents(events, 'tokens');
    expect(result).toHaveLength(1);
    expect(result[0].event_type).toBe('token_usage');
  });

  it('returns empty array for empty events input', () => {
    expect(filterEvents([], 'tools')).toEqual([]);
    expect(filterEvents([], 'agents')).toEqual([]);
    expect(filterEvents([], 'all')).toEqual([]);
    expect(filterEvents([], 'tokens')).toEqual([]);
  });

  it('returns only approval events when group is "approvals"', () => {
    const approvalEvents = [
      ...events,
      mockEnvelope({ event_type: 'approval_request', approval_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
      mockEnvelope({ event_type: 'approval_response', approval_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
    ];
    const result = filterEvents(approvalEvents, 'approvals');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.event_type)).toEqual(['approval_request', 'approval_response']);
  });

  it('returns empty array when no approval events exist for group "approvals"', () => {
    const result = filterEvents(events, 'approvals');
    expect(result).toHaveLength(0);
  });
});
