/**
 * HDN-01 and HDN-02 hardening tests.
 * Tests auth guard on /api/sessions and session control server actions.
 *
 * NOTE: A separate hardening.test.ts covers ingest/cron-gc tests (H-01..H-11).
 * This file is dedicated to the dashboard-hardening plan (Phase 150, Plan 01).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

// ─── Mock @clerk/nextjs/server ────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// ─── Mock @/lib/queries ───────────────────────────────────────────────────────

vi.mock('@/lib/queries', () => ({
  getSessions: vi.fn(),
}));

// ─── Mock node:fs (for server actions) ───────────────────────────────────────
// We spy rather than fully mock so that realReadFileSync (from the top import)
// still works for source-inspection tests.

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

import { GET } from '../app/api/sessions/route';
import { auth } from '@clerk/nextjs/server';
import { getSessions } from '@/lib/queries';
import { retrySession, abandonSession, killSession } from '../app/actions';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetSessions = getSessions as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;

function makeRegistry(sessionId: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    sessions: {
      [sessionId]: {
        pid: 99999,
        phase: 150,
        plan: 1,
        worktreePath: '/tmp/wt',
        branch: `pde/session/${sessionId}`,
        status: 'failed',
        startedAt: '2026-03-26T00:00:00.000Z',
        ...overrides,
      },
    },
  });
}

// ─── GET /api/sessions (HDN-01) ───────────────────────────────────────────────

describe('GET /api/sessions (HDN-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 200 with sessions array when authenticated', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });
    mockGetSessions.mockResolvedValue([{ id: 'test-1', status: 'running' }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });
});

// ─── Session actions (HDN-02) ─────────────────────────────────────────────────

describe('Session actions (HDN-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PDE_PROJECT_ROOT = '/tmp/test-pde';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PDE_PROJECT_ROOT;
  });

  it('killSession returns unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false });

    const result = await killSession('s1');

    expect(result).toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('killSession calls process.kill(pid, SIGTERM) and updates registry status to stopped', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });
    mockReadFileSync.mockReturnValue(makeRegistry('s1'));
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    const result = await killSession('s1');

    expect(result).toEqual({ ok: true });
    expect(killSpy).toHaveBeenCalledWith(99999, 'SIGTERM');

    const registryWrite = mockWriteFileSync.mock.calls.find(
      ([filePath]) => typeof filePath === 'string' && (filePath as string).includes('dispatcher.pids')
    );
    expect(registryWrite).toBeDefined();
    expect(registryWrite![1] as string).toContain('"status": "stopped"');

    killSpy.mockRestore();
  });

  it('abandonSession sets status to abandoned and writes cleanup request file', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });
    mockReadFileSync.mockReturnValue(makeRegistry('s2'));

    const result = await abandonSession('s2');

    expect(result).toEqual({ ok: true });

    // Registry write contains abandoned status
    const registryWrite = mockWriteFileSync.mock.calls.find(
      ([filePath]) => typeof filePath === 'string' && (filePath as string).includes('dispatcher.pids')
    );
    expect(registryWrite).toBeDefined();
    expect(registryWrite![1] as string).toContain('"status": "abandoned"');

    // mkdirSync called with cleanup-requests path
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('cleanup-requests'),
      { recursive: true }
    );

    // Cleanup request file written with correct shape
    const cleanupWrite = mockWriteFileSync.mock.calls.find(
      ([filePath]) => typeof filePath === 'string' && (filePath as string).includes('cleanup-requests')
    );
    expect(cleanupWrite).toBeDefined();
    const cleanupContent = JSON.parse(cleanupWrite![1] as string);
    expect(cleanupContent).toMatchObject({
      sessionId: 's2',
      worktreePath: '/tmp/wt',
    });
  });

  it('retrySession returns { ok: false, error: retry-requires-local-dispatcher }', async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true });
    mockReadFileSync.mockReturnValue(makeRegistry('s1'));

    const result = await retrySession('s1');

    expect(result).toEqual({ ok: false, error: 'retry-requires-local-dispatcher' });
  });

  it('page.tsx source contains onRetry={retrySession} onAbandon={abandonSession} onKill={killSession}', async () => {
    // Use vi.importActual to get real node:fs for source inspection (bypass the mock)
    const { readFileSync: realReadFileSync } = await vi.importActual<typeof import('node:fs')>('node:fs');
    const pageSource = realReadFileSync(
      path.resolve(__dirname, '../app/page.tsx'),
      'utf-8'
    );
    expect(pageSource).toContain('onRetry={retrySession}');
    expect(pageSource).toContain('onAbandon={abandonSession}');
    expect(pageSource).toContain('onKill={killSession}');
  });
});
