import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @/lib/redis
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    pipeline: vi.fn(),
  },
}));

// Mock @/lib/push
vi.mock('@/lib/push', () => ({
  webpush: {
    sendNotification: vi.fn(),
  },
}));

// Mock @clerk/nextjs/server (used by other actions, not needed for persistSessionCost)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ isAuthenticated: false }),
}));

describe('Server Actions', () => {
  let subscribeUser: (sub: PushSubscriptionJSON) => Promise<{ success: boolean }>;
  let unsubscribeUser: () => Promise<{ success: boolean }>;
  let sendPushToOwner: (payload: { title: string; body: string; url: string; tag: string }) => Promise<{ success: boolean; reason?: string }>;
  let persistSessionCost: (sessionId: string, inputTokensDelta: number, outputTokensDelta: number) => Promise<void>;
  let redisMock: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn>; pipeline: ReturnType<typeof vi.fn> };
  let webpushMock: { sendNotification: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Re-apply mocks after resetModules
    vi.mock('@/lib/redis', () => ({
      redis: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        pipeline: vi.fn(),
      },
    }));

    vi.mock('@/lib/push', () => ({
      webpush: {
        sendNotification: vi.fn(),
      },
    }));

    vi.mock('@clerk/nextjs/server', () => ({
      auth: vi.fn().mockResolvedValue({ isAuthenticated: false }),
    }));

    const redisMod = await import('@/lib/redis');
    redisMock = redisMod.redis as unknown as typeof redisMock;

    const pushMod = await import('@/lib/push');
    webpushMock = (pushMod as unknown as { webpush: typeof webpushMock }).webpush;

    const actions = await import('@/app/actions');
    subscribeUser = actions.subscribeUser;
    unsubscribeUser = actions.unsubscribeUser;
    sendPushToOwner = actions.sendPushToOwner;
    persistSessionCost = actions.persistSessionCost;
  });

  describe('subscribeUser', () => {
    it('stores subscription JSON in Redis at key push:sub:owner', async () => {
      const sub = { endpoint: 'https://example.com/push', keys: { p256dh: 'abc', auth: 'def' } } as unknown as PushSubscriptionJSON;
      redisMock.set.mockResolvedValue('OK');

      await subscribeUser(sub);

      expect(redisMock.set).toHaveBeenCalledWith('push:sub:owner', JSON.stringify(sub));
    });
  });

  describe('unsubscribeUser', () => {
    it('deletes key push:sub:owner from Redis', async () => {
      redisMock.del.mockResolvedValue(1);

      await unsubscribeUser();

      expect(redisMock.del).toHaveBeenCalledWith('push:sub:owner');
    });
  });

  describe('sendPushToOwner', () => {
    const payload = { title: 'Test Title', body: 'Test body', url: '/', tag: 'test-tag' };

    it('returns success false with reason no-subscription when no sub in Redis', async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await sendPushToOwner(payload);

      expect(result).toEqual({ success: false, reason: 'no-subscription' });
    });

    it('calls sendNotification with correct payload shape', async () => {
      const mockSub = { endpoint: 'https://push.example.com', keys: { p256dh: 'abc', auth: 'def' } };
      redisMock.get.mockResolvedValue(JSON.stringify(mockSub));
      webpushMock.sendNotification.mockResolvedValue(undefined);

      const result = await sendPushToOwner(payload);

      expect(webpushMock.sendNotification).toHaveBeenCalledWith(
        mockSub,
        JSON.stringify(payload)
      );
      expect(result).toEqual({ success: true });
    });

    it('deletes stale subscription from Redis when webpush throws 410 error', async () => {
      const mockSub = { endpoint: 'https://push.example.com', keys: {} };
      redisMock.get.mockResolvedValue(JSON.stringify(mockSub));
      redisMock.del.mockResolvedValue(1);
      const err = Object.assign(new Error('Gone'), { statusCode: 410 });
      webpushMock.sendNotification.mockRejectedValue(err);

      const result = await sendPushToOwner(payload);

      expect(redisMock.del).toHaveBeenCalledWith('push:sub:owner');
      expect(result.success).toBe(false);
    });

    it('deletes stale subscription from Redis when webpush throws 404 error', async () => {
      const mockSub = { endpoint: 'https://push.example.com', keys: {} };
      redisMock.get.mockResolvedValue(JSON.stringify(mockSub));
      redisMock.del.mockResolvedValue(1);
      const err = Object.assign(new Error('Not Found'), { statusCode: 404 });
      webpushMock.sendNotification.mockRejectedValue(err);

      const result = await sendPushToOwner(payload);

      expect(redisMock.del).toHaveBeenCalledWith('push:sub:owner');
      expect(result.success).toBe(false);
    });
  });

  describe('persistSessionCost', () => {
    it('calls redis.pipeline() with 3 HINCRBY commands on the correct session key', async () => {
      const hincrby = vi.fn();
      const exec = vi.fn().mockResolvedValue([1, 1, 1]);
      redisMock.pipeline.mockReturnValue({ hincrby, exec });

      await persistSessionCost('sess-abc', 1_000_000, 500_000);

      expect(redisMock.pipeline).toHaveBeenCalledOnce();
      expect(hincrby).toHaveBeenCalledTimes(3);
      expect(hincrby).toHaveBeenCalledWith(
        'pde:default:session:sess-abc',
        'total_input_tokens',
        1_000_000
      );
      expect(hincrby).toHaveBeenCalledWith(
        'pde:default:session:sess-abc',
        'total_output_tokens',
        500_000
      );
    });

    it('stores cost as integer multiplied by 10000 to avoid HINCRBY float issues', async () => {
      const hincrby = vi.fn();
      const exec = vi.fn().mockResolvedValue([1, 1, 1]);
      redisMock.pipeline.mockReturnValue({ hincrby, exec });

      // 1M input @ $3/M + 1M output @ $15/M = $18.00 → 180000 units (18 * 10000)
      await persistSessionCost('sess-cost', 1_000_000, 1_000_000);

      const costCall = (hincrby.mock.calls as [string, string, number][]).find(
        ([, field]) => field === 'cost_usd_cents'
      );
      expect(costCall).toBeDefined();
      expect(costCall![2]).toBe(180_000); // 18 USD * 10000
    });

    it('uses the correct key pattern pde:default:session:{sessionId}', async () => {
      const hincrby = vi.fn();
      const exec = vi.fn().mockResolvedValue([1, 1, 1]);
      redisMock.pipeline.mockReturnValue({ hincrby, exec });

      await persistSessionCost('my-session-id', 0, 0);

      const allKeys = (hincrby.mock.calls as [string, string, number][]).map(([key]) => key);
      expect(allKeys.every(k => k === 'pde:default:session:my-session-id')).toBe(true);
    });

    it('executes the pipeline to commit all 3 HINCRBY commands atomically', async () => {
      const hincrby = vi.fn();
      const exec = vi.fn().mockResolvedValue([1, 1, 1]);
      redisMock.pipeline.mockReturnValue({ hincrby, exec });

      await persistSessionCost('sess-exec', 100, 50);

      expect(exec).toHaveBeenCalledOnce();
    });
  });
});
