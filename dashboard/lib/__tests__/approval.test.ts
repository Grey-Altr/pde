import { findPendingApproval } from '../queries';
import type { WireEnvelope } from '../wire-schema';

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

const REQUEST_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const REQUEST_ID_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('findPendingApproval', () => {
  it('returns the approval_request when it has no matching response', () => {
    const events = [
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID }),
    ];
    const result = findPendingApproval(events);
    expect(result).not.toBeNull();
    expect(result!.event_type).toBe('approval_request');
    expect(result!.approval_id).toBe(REQUEST_ID);
  });

  it('returns null when approval_request has a matching approval_response', () => {
    const events = [
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID }),
      mockEnvelope({ event_type: 'approval_response', approval_id: REQUEST_ID }),
    ];
    const result = findPendingApproval(events);
    expect(result).toBeNull();
  });

  it('returns null when events array is empty', () => {
    const result = findPendingApproval([]);
    expect(result).toBeNull();
  });

  it('returns the unresponded request when two requests exist and only one is responded', () => {
    const events = [
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID }),
      mockEnvelope({ event_type: 'approval_response', approval_id: REQUEST_ID }),
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID_2 }),
    ];
    const result = findPendingApproval(events);
    expect(result).not.toBeNull();
    expect(result!.approval_id).toBe(REQUEST_ID_2);
  });

  it('handles out-of-order events (response before request in newest-first array)', () => {
    // newest-first: response at index 0, request at index 1
    const events = [
      mockEnvelope({ event_type: 'approval_response', approval_id: REQUEST_ID }),
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID }),
    ];
    const result = findPendingApproval(events);
    // request has a response, so should return null
    expect(result).toBeNull();
  });

  it('returns unresponded request even when response appears before request in array', () => {
    // newest-first: response for REQUEST_ID at index 0, unresponded request at index 1
    const events = [
      mockEnvelope({ event_type: 'approval_response', approval_id: REQUEST_ID }),
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID }),
      mockEnvelope({ event_type: 'approval_request', approval_id: REQUEST_ID_2 }),
    ];
    const result = findPendingApproval(events);
    expect(result).not.toBeNull();
    expect(result!.approval_id).toBe(REQUEST_ID_2);
  });
});
