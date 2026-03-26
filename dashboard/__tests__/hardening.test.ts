import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Rate limit mock — controlled per-test
const mockRatelimitLimit = vi.fn();

vi.mock('@/lib/ratelimit', () => ({
  ratelimit: {
    limit: mockRatelimitLimit,
  },
}));

// Redis pipeline mock — capture expire/zadd/hset/del/zrem calls
const mockExpire = vi.fn().mockReturnThis();
const mockZadd = vi.fn().mockReturnThis();
const mockHset = vi.fn().mockReturnThis();
const mockDel = vi.fn().mockReturnThis();
const mockZrem = vi.fn().mockReturnThis();
const mockPipelineExec = vi.fn().mockResolvedValue([]);

const mockPipeline = vi.fn(() => ({
  expire: mockExpire,
  zadd: mockZadd,
  hset: mockHset,
  del: mockDel,
  zrem: mockZrem,
  exec: mockPipelineExec,
}));

const mockZrange = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/redis', () => ({
  redis: {
    pipeline: mockPipeline,
    zrange: mockZrange,
  },
}));

// Auth mock — always valid for ingest tests
vi.mock('@/lib/auth', () => ({
  validateRelayToken: vi.fn().mockReturnValue(true),
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

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

function makeIngestRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// ─── Ingest hardening tests ───────────────────────────────────────────────────

describe('POST /api/ingest — rate limiting and TTL', () => {
  // Lazy-import after mocks are registered
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PDE_RELAY_TOKEN = 'test-token';
    mockPipelineExec.mockResolvedValue([]);
    const mod = await import('@/app/api/ingest/route');
    POST = mod.POST as unknown as (req: Request) => Promise<Response>;
  });

  it('Test H-01: returns 429 with Retry-After and X-RateLimit-Remaining:0 when rate limit exceeded', async () => {
    const resetMs = Date.now() + 60_000;
    mockRatelimitLimit.mockResolvedValue({ success: false, reset: resetMs });

    const req = makeIngestRequest([makeValidEnvelope()]);
    const res = await POST(req);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Rate limit exceeded' });

    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number.isInteger(Number(retryAfter))).toBe(true);

    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('Test H-02: calls p.expire on events key with 604800 seconds on successful ingest', async () => {
    mockRatelimitLimit.mockResolvedValue({ success: true, reset: 0 });

    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const req = makeIngestRequest([makeValidEnvelope({ session_id: sessionId })]);
    await POST(req);

    const expireCalls = mockExpire.mock.calls;
    const eventsExpire = expireCalls.find(
      (c) => c[0] === `pde:default:events:${sessionId}` && c[1] === 604800
    );
    expect(eventsExpire).toBeDefined();
  });

  it('Test H-03: calls p.expire on session metadata key with 604800 seconds on successful ingest', async () => {
    mockRatelimitLimit.mockResolvedValue({ success: true, reset: 0 });

    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const req = makeIngestRequest([makeValidEnvelope({ session_id: sessionId })]);
    await POST(req);

    const expireCalls = mockExpire.mock.calls;
    const sessionExpire = expireCalls.find(
      (c) => c[0] === `pde:default:session:${sessionId}` && c[1] === 604800
    );
    expect(sessionExpire).toBeDefined();
  });

  it('Test H-04: does NOT call p.expire on global sessions registry key', async () => {
    mockRatelimitLimit.mockResolvedValue({ success: true, reset: 0 });

    const req = makeIngestRequest([makeValidEnvelope()]);
    await POST(req);

    const expireCalls = mockExpire.mock.calls;
    const globalExpire = expireCalls.find((c) => c[0] === 'pde:default:sessions');
    expect(globalExpire).toBeUndefined();
  });
});

// ─── Cron GC tests ────────────────────────────────────────────────────────────

describe('GET /api/cron/gc — garbage collection', () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    mockPipelineExec.mockResolvedValue([]);
    mockZrange.mockResolvedValue([]);
    const mod = await import('@/app/api/cron/gc/route');
    GET = mod.GET as unknown as (req: Request) => Promise<Response>;
  });

  function makeGcRequest(authHeader?: string): Request {
    const headers: Record<string, string> = {};
    if (authHeader !== undefined) {
      headers['Authorization'] = authHeader;
    }
    return new Request('http://localhost/api/cron/gc', { headers });
  }

  it('Test H-05: returns 401 when Authorization header is missing', async () => {
    const req = makeGcRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('Test H-06: returns 401 when Authorization header has wrong secret', async () => {
    const req = makeGcRequest('Bearer wrong-secret');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('Test H-07: returns 401 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;
    const req = makeGcRequest('Bearer test-secret');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('Test H-08: pipelines del for events+metadata keys and zrem from sessions for each stale ID', async () => {
    mockZrange.mockResolvedValue(['session-stale-1', 'session-stale-2']);

    const req = makeGcRequest('Bearer test-secret');
    await GET(req);

    const delCalls = mockDel.mock.calls.map((c) => c[0]);
    expect(delCalls).toContain('pde:default:events:session-stale-1');
    expect(delCalls).toContain('pde:default:session:session-stale-1');
    expect(delCalls).toContain('pde:default:events:session-stale-2');
    expect(delCalls).toContain('pde:default:session:session-stale-2');

    const zremCalls = mockZrem.mock.calls;
    const zremSessions = zremCalls.filter((c) => c[0] === 'pde:default:sessions');
    const zremMembers = zremSessions.map((c) => c[1]);
    expect(zremMembers).toContain('session-stale-1');
    expect(zremMembers).toContain('session-stale-2');

    expect(mockPipelineExec).toHaveBeenCalledTimes(1);
  });

  it('Test H-09: returns JSON with ok:true and deleted.count matching stale session count', async () => {
    mockZrange.mockResolvedValue(['session-stale-1', 'session-stale-2']);

    const req = makeGcRequest('Bearer test-secret');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted.count).toBe(2);
  });

  it('Test H-10: returns ok:true with deleted.count:0 when no stale sessions', async () => {
    mockZrange.mockResolvedValue([]);

    const req = makeGcRequest('Bearer test-secret');
    const res = await GET(req);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted.count).toBe(0);
    // No pipeline exec needed when no stale sessions
    expect(mockPipelineExec).not.toHaveBeenCalled();
  });
});
