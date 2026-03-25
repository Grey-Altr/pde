import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the redis module before importing route
const mockExec = vi.fn().mockResolvedValue([]);
const mockZadd = vi.fn().mockReturnThis();
const mockHset = vi.fn().mockReturnThis();
const mockPipeline = vi.fn(() => ({
  zadd: mockZadd,
  hset: mockHset,
  exec: mockExec,
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    pipeline: mockPipeline,
  },
}));

// Import the route handler after mocks are set up
const { POST } = await import('@/app/api/ingest/route');

// Helper to create a valid WireEnvelope with optional overrides
function makeValidEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    seq: 0,
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    machine_id: 'test-host',
    relay_ts: '2026-03-25T12:00:00.000Z',
    approval_id: null,
    schema_version: '1.0',
    ts: '2026-03-25T12:00:00.000Z',
    event_type: 'session_start',
    ...overrides,
  };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PDE_RELAY_TOKEN = 'test-token-123';
    mockExec.mockResolvedValue([]);
  });

  it('Test 1: missing Authorization header returns 401', async () => {
    const req = makeRequest([makeValidEnvelope()]);
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('Test 2: wrong Bearer token returns 401', async () => {
    const req = makeRequest([makeValidEnvelope()], { authorization: 'Bearer wrong-token' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('Test 3: valid token but invalid JSON body returns 400', async () => {
    const req = new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token-123',
      },
      body: 'not-valid-json{{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Invalid JSON' });
  });

  it('Test 4: valid token but schema-invalid events returns 422', async () => {
    const invalid = [{ seq: -1, session_id: 'not-a-uuid' }]; // invalid event
    const req = makeRequest(invalid, { authorization: 'Bearer test-token-123' });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('Test 5: valid token and empty array returns 422 (min 1 event)', async () => {
    const req = makeRequest([], { authorization: 'Bearer test-token-123' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('Test 6: valid token and array of over 100 events returns 422 (max 100)', async () => {
    const events = Array.from({ length: 101 }, (_, i) =>
      makeValidEnvelope({ seq: i })
    );
    const req = makeRequest(events, { authorization: 'Bearer test-token-123' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('Test 7: valid token and valid batch returns 200 with { ok: true, count: N }', async () => {
    const events = [makeValidEnvelope(), makeValidEnvelope({ seq: 1, event_type: 'task_start' })];
    const req = makeRequest(events, { authorization: 'Bearer test-token-123' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, count: 2 });
  });

  it('Test 9: hset stores phase from top-level phase_name field (not extensions)', async () => {
    const events = [makeValidEnvelope({ phase_name: 'Core Dashboard', plan_name: '02' })];
    const req = makeRequest(events, { authorization: 'Bearer test-token-123' });
    await POST(req);
    const hsetArgs = mockHset.mock.calls[0];
    expect(hsetArgs[1]).toMatchObject({
      phase: 'Core Dashboard',
      plan: '02',
    });
  });

  it('Test 8: valid batch triggers redis.pipeline() with zadd and hset calls', async () => {
    const events = [makeValidEnvelope()];
    const req = makeRequest(events, { authorization: 'Bearer test-token-123' });
    await POST(req);

    // pipeline() should have been called
    expect(mockPipeline).toHaveBeenCalledTimes(1);

    // zadd should be called for each event + once for session registry
    expect(mockZadd).toHaveBeenCalledTimes(2); // 1 event + session registry

    // hset should be called once for session metadata
    expect(mockHset).toHaveBeenCalledTimes(1);

    // exec should be called once
    expect(mockExec).toHaveBeenCalledTimes(1);

    // Verify key patterns
    const zaddCalls = mockZadd.mock.calls;
    const eventKey = zaddCalls.find((call) =>
      call[0].startsWith('pde:default:events:')
    );
    expect(eventKey).toBeDefined();

    const sessionRegKey = zaddCalls.find((call) => call[0] === 'pde:default:sessions');
    expect(sessionRegKey).toBeDefined();

    const hsetCalls = mockHset.mock.calls;
    expect(hsetCalls[0][0]).toMatch(/^pde:default:session:/);
  });
});
