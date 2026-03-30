import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Redis mock (same pattern as hardening.test.ts) ──────────────────────────

const mockExpire = vi.fn().mockReturnThis();
const mockZadd = vi.fn().mockReturnThis();
const mockHset = vi.fn().mockReturnThis();
const mockDel = vi.fn().mockReturnThis();
const mockZrem = vi.fn().mockReturnThis();
const mockPipelineExec = vi.fn().mockResolvedValue([]);

const mockHgetallPipeline = vi.fn().mockReturnThis();

const mockPipeline = vi.fn(() => ({
  expire: mockExpire,
  zadd: mockZadd,
  hset: mockHset,
  del: mockDel,
  zrem: mockZrem,
  hgetall: mockHgetallPipeline,
  exec: mockPipelineExec,
}));

const mockZrange = vi.fn().mockResolvedValue([]);
const mockHgetall = vi.fn();

vi.mock('@/lib/redis', () => ({
  redis: {
    pipeline: mockPipeline,
    zrange: mockZrange,
    hgetall: mockHgetall,
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  ratelimit: {
    limit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
  },
}));

vi.mock('@/lib/auth', () => ({
  validateRelayToken: vi.fn().mockReturnValue(true),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ isAuthenticated: true }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function makeIngestRequest(body: unknown): Request {
  return new Request('http://localhost/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  });
}

// ─── session_source ingest tests ─────────────────────────────────────────────

describe('POST /api/ingest — session_source storage', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PDE_RELAY_TOKEN = 'test-token';
    mockPipelineExec.mockResolvedValue([]);
    const mod = await import('@/app/api/ingest/route');
    POST = mod.POST as unknown as (req: Request) => Promise<Response>;
  });

  it('Test SS-01: stores session_source=local on session_start when no source in payload', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const req = makeIngestRequest([makeValidEnvelope({ session_id: sessionId, event_type: 'session_start' })]);
    await POST(req);

    const hsetCalls = mockHset.mock.calls;
    const sourceCall = hsetCalls.find(
      (c) => c[0] === `pde:default:session:${sessionId}` && c[1]?.session_source !== undefined
    );
    expect(sourceCall).toBeDefined();
    expect(sourceCall![1].session_source).toBe('local');
  });

  it('Test SS-02: stores session_source=remote-ssh on session_start when payload has source=remote-ssh', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const req = makeIngestRequest([makeValidEnvelope({ session_id: sessionId, event_type: 'session_start', source: 'remote-ssh' })]);
    await POST(req);

    const hsetCalls = mockHset.mock.calls;
    const sourceCall = hsetCalls.find(
      (c) => c[0] === `pde:default:session:${sessionId}` && c[1]?.session_source !== undefined
    );
    expect(sourceCall).toBeDefined();
    expect(sourceCall![1].session_source).toBe('remote-ssh');
  });

  it('Test SS-03: does not store session_source for non-session_start events', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const req = makeIngestRequest([makeValidEnvelope({ session_id: sessionId, event_type: 'tool_use' })]);
    await POST(req);

    const hsetCalls = mockHset.mock.calls;
    const sourceCall = hsetCalls.find(
      (c) => c[0] === `pde:default:session:${sessionId}` && c[1]?.session_source !== undefined
    );
    expect(sourceCall).toBeUndefined();
  });
});

// ─── getSessions source field tests ──────────────────────────────────────────

describe('getSessions — source field mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test SS-04: getSessions returns source=local when session_source is not set in Redis', async () => {
    mockZrange.mockResolvedValue(['session-1']);
    mockPipelineExec.mockResolvedValue([
      {
        last_event_type: 'tool_use',
        last_event_ts: '1711368000000',
        started_at: '1711368000000',
        phase: 'test',
        plan: '01',
        // no session_source
      },
    ]);

    const { getSessions } = await import('@/lib/queries');
    const sessions = await getSessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].source).toBe('local');
  });

  it('Test SS-05: getSessions returns source=remote-ssh when session_source=remote-ssh in Redis', async () => {
    mockZrange.mockResolvedValue(['session-2']);
    mockPipelineExec.mockResolvedValue([
      {
        last_event_type: 'tool_use',
        last_event_ts: '1711368000000',
        started_at: '1711368000000',
        phase: 'test',
        plan: '01',
        session_source: 'remote-ssh',
      },
    ]);

    const { getSessions } = await import('@/lib/queries');
    const sessions = await getSessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].source).toBe('remote-ssh');
  });

  it('Test SS-06: getSessions returns source=remote-managed when session_source=remote-managed in Redis', async () => {
    mockZrange.mockResolvedValue(['session-3']);
    mockPipelineExec.mockResolvedValue([
      {
        last_event_type: 'tool_use',
        last_event_ts: '1711368000000',
        started_at: '1711368000000',
        phase: 'test',
        plan: '01',
        session_source: 'remote-managed',
      },
    ]);

    const { getSessions } = await import('@/lib/queries');
    const sessions = await getSessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].source).toBe('remote-managed');
  });
});

// ─── GET /api/sessions tests ──────────────────────────────────────────────────

describe('GET /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test SS-07: GET /api/sessions returns JSON array of SessionListItem objects', async () => {
    mockZrange.mockResolvedValue(['session-1']);
    mockPipelineExec.mockResolvedValue([
      {
        last_event_type: 'tool_use',
        last_event_ts: '1711368000000',
        started_at: '1711368000000',
        phase: '147',
        plan: '01',
        session_source: 'local',
      },
    ]);

    const mod = await import('@/app/api/sessions/route');
    const GET = mod.GET as unknown as () => Promise<Response>;
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('source');
    expect(body[0]).toHaveProperty('status');
  });

  it('Test SS-08: GET /api/sessions returns empty array when no sessions', async () => {
    mockZrange.mockResolvedValue([]);

    const mod = await import('@/app/api/sessions/route');
    const GET = mod.GET as unknown as () => Promise<Response>;
    const res = await GET();

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });
});

// ─── Docker session_source tests ─────────────────────────────────────────────

describe('POST /api/ingest — docker session_source', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PDE_RELAY_TOKEN = 'test-token';
    mockPipelineExec.mockResolvedValue([]);
    const mod = await import('@/app/api/ingest/route');
    POST = mod.POST as unknown as (req: Request) => Promise<Response>;
  });

  it('Test SS-docker-01: stores session_source=docker on session_start when source=docker', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440099';
    const req = makeIngestRequest([
      makeValidEnvelope({
        session_id: sessionId,
        event_type: 'session_start',
        source: 'docker',
      }),
    ]);
    await POST(req);

    const hsetCalls = mockHset.mock.calls;
    const sourceCall = hsetCalls.find(
      (c) => c[0] === `pde:default:session:${sessionId}` && c[1]?.session_source !== undefined
    );
    expect(sourceCall).toBeDefined();
    expect(sourceCall![1].session_source).toBe('docker');
  });
});

describe('getSessions — docker source field mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test SS-docker-02: getSessions returns source=docker when session_source=docker in Redis', async () => {
    mockZrange.mockResolvedValue(['docker-session-1']);
    mockPipelineExec.mockResolvedValue([
      {
        last_event_type: 'tool_use',
        last_event_ts: '1711368000000',
        started_at: '1711368000000',
        phase: 'test',
        plan: '01',
        session_source: 'docker',
      },
    ]);

    const { getSessions } = await import('@/lib/queries');
    const sessions = await getSessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].source).toBe('docker');
  });
});

// ─── SessionStatus type tests ─────────────────────────────────────────────────

describe('SessionStatus type variants', () => {
  it('Test SS-09: deriveStatus returns failed when lastEventType includes fail', async () => {
    const { deriveStatus } = await import('@/lib/session-status');
    const status = deriveStatus('task_failed', Date.now());
    expect(status).toBe('failed');
  });

  it('Test SS-10: deriveStatus still returns error for error events', async () => {
    const { deriveStatus } = await import('@/lib/session-status');
    const status = deriveStatus('critical_error', Date.now());
    expect(status).toBe('error');
  });
});
