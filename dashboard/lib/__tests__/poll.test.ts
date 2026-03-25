import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @clerk/nextjs/server before importing the route
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock @/lib/redis before importing the route
vi.mock('@/lib/redis', () => ({
  redis: {
    zrange: vi.fn(),
  },
}));

import { GET } from '../../app/api/poll/route';
import { auth } from '@clerk/nextjs/server';
import { redis } from '@/lib/redis';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockZrange = redis.zrange as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('https://example.com/api/poll');
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return new Request(url.toString());
}

describe('GET /api/poll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false });

    const req = makeRequest({ session: 'test-session-id' });
    const res = await GET(req as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when session param is missing', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });

    const req = makeRequest(); // no session param
    const res = await GET(req as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('session');
  });

  it('returns events array and cursor on valid request', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });

    const mockEvent = {
      seq: 1,
      session_id: 'abc-123',
      event_type: 'phase_start',
      relay_ts: '2026-03-25T10:00:00.000Z',
    };
    // Interleaved [member, score] pairs as returned by zrange withScores:true
    mockZrange.mockResolvedValue([JSON.stringify(mockEvent), '1711360800000']);

    const req = makeRequest({ session: 'abc-123' });
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('events');
    expect(body).toHaveProperty('cursor');
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ event_type: 'phase_start' });
    expect(body.cursor).toBe(1711360800000);
  });

  it('returns only events newer than last_ts cursor', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });

    const newerEvent = {
      seq: 2,
      session_id: 'abc-123',
      event_type: 'plan_start',
      relay_ts: '2026-03-25T10:01:00.000Z',
    };
    // zrange is called with cursor+1 as min, so Redis handles the filtering;
    // we verify zrange receives the correct min score
    mockZrange.mockResolvedValue([JSON.stringify(newerEvent), '1711360860000']);

    const req = makeRequest({ session: 'abc-123', last_ts: '1711360800000' });
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    // Verify the zrange call passed cursor+1 as min score
    expect(mockZrange).toHaveBeenCalledWith(
      'pde:default:events:abc-123',
      1711360800001,
      '+inf',
      { byScore: true, withScores: true }
    );
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.cursor).toBe(1711360860000);
  });

  it('returns empty events array with unchanged cursor when no new events', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });
    mockZrange.mockResolvedValue([]); // no new events

    const req = makeRequest({ session: 'abc-123', last_ts: '1711360800000' });
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(0);
    // cursor stays at last_ts value when no new events
    expect(body.cursor).toBe(1711360800000);
  });
});
