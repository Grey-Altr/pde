import { vi, beforeEach, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock @/lib/auth
vi.mock('@/lib/auth', () => ({
  validateRelayToken: vi.fn(),
}));

// Mock @/lib/queries
vi.mock('@/lib/queries', () => ({
  writeApprovalResponse: vi.fn(),
  readApprovalResponse: vi.fn(),
  findPendingApproval: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { validateRelayToken } from '@/lib/auth';
import { writeApprovalResponse, readApprovalResponse } from '@/lib/queries';
import { POST, GET } from '@/app/api/approval-response/route';

const mockAuth = vi.mocked(auth);
const mockValidateRelayToken = vi.mocked(validateRelayToken);
const mockWriteApprovalResponse = vi.mocked(writeApprovalResponse);
const mockReadApprovalResponse = vi.mocked(readApprovalResponse);

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const APPROVAL_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/approval-response', () => {
  it('returns 401 when Clerk session is not authenticated', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false } as never);

    const req = new Request('http://localhost/api/approval-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, approval_id: APPROVAL_ID, action: 'approved' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 422 when body schema is invalid (missing action)', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true, userId: 'user-1' } as never);

    const req = new Request('http://localhost/api/approval-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, approval_id: APPROVAL_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 422 when action enum is invalid', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true, userId: 'user-1' } as never);

    const req = new Request('http://localhost/api/approval-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, approval_id: APPROVAL_ID, action: 'maybe' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 200 on valid body and calls writeApprovalResponse', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true, userId: 'user-1' } as never);
    mockWriteApprovalResponse.mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/approval-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, approval_id: APPROVAL_ID, action: 'approved' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockWriteApprovalResponse).toHaveBeenCalledWith(SESSION_ID, APPROVAL_ID, 'approved', 'user-1');
  });
});

describe('GET /api/approval-response', () => {
  it('returns 401 when Bearer token is invalid', async () => {
    mockValidateRelayToken.mockReturnValue(false);

    const req = new NextRequest(
      `http://localhost/api/approval-response?session_id=${SESSION_ID}&approval_id=${APPROVAL_ID}`
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when session_id or approval_id query params are missing', async () => {
    mockValidateRelayToken.mockReturnValue(true);

    const req = new NextRequest('http://localhost/api/approval-response');

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when readApprovalResponse returns null', async () => {
    mockValidateRelayToken.mockReturnValue(true);
    mockReadApprovalResponse.mockResolvedValue(null);

    const req = new NextRequest(
      `http://localhost/api/approval-response?session_id=${SESSION_ID}&approval_id=${APPROVAL_ID}`
    );

    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ pending: true });
  });

  it('returns 200 with payload when readApprovalResponse returns data (one-shot)', async () => {
    mockValidateRelayToken.mockReturnValue(true);
    const payload = {
      approval_id: APPROVAL_ID,
      action: 'approved',
      responded_at: '2026-03-25T12:00:00.000Z',
      responder_id: 'user-1',
    };
    mockReadApprovalResponse.mockResolvedValue(payload);

    const req = new NextRequest(
      `http://localhost/api/approval-response?session_id=${SESSION_ID}&approval_id=${APPROVAL_ID}`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(payload);
  });
});
