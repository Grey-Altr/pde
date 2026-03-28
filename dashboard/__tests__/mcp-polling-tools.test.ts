import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock redis
const mockRedisStore: Record<string, Record<string, string>> = {};
vi.mock('@/lib/redis', () => ({
  redis: {
    hset: vi.fn(async (key: string, values: Record<string, string>) => {
      mockRedisStore[key] = { ...mockRedisStore[key], ...values };
    }),
    hgetall: vi.fn(async (key: string) => mockRedisStore[key] ?? null),
    expire: vi.fn(async () => 1),
  },
}));

// Mock next/server after()
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => Promise<void>) => { fn(); }), // execute immediately in tests
}));

import { registerPipelineTools } from '@/lib/mcp/tools/pipeline-tools';

describe('Polling Tools (RMT-06)', () => {
  let toolCallbacks: Record<string, (args: Record<string, string>, ctx: { authInfo?: { extra?: { userId?: string } } }) => Promise<{ content: Array<{ type: string; text: string }> }>> = {};

  beforeEach(() => {
    // Clear Redis store between tests
    for (const key of Object.keys(mockRedisStore)) {
      delete mockRedisStore[key];
    }
    toolCallbacks = {};

    // Reset mocks
    vi.clearAllMocks();
  });

  function buildMockServer() {
    return {
      tool: vi.fn((name: string, _description: string, _schema: unknown, handler: (args: Record<string, string>, ctx: { authInfo?: { extra?: { userId?: string } } }) => Promise<{ content: Array<{ type: string; text: string }> }>) => {
        toolCallbacks[name] = handler;
      }),
    };
  }

  test('registerPipelineTools calls server.tool twice (start and check)', () => {
    const mockServer = buildMockServer();
    registerPipelineTools(mockServer as never);
    expect(mockServer.tool).toHaveBeenCalledTimes(2);
    expect(mockServer.tool.mock.calls[0][0]).toBe('start_pipeline_run');
    expect(mockServer.tool.mock.calls[1][0]).toBe('check_pipeline_run');
  });

  test('start_pipeline_run returns job_id (UUID format) and status running and poll_interval_ms 3000', async () => {
    const mockServer = buildMockServer();
    registerPipelineTools(mockServer as never);

    const result = await toolCallbacks['start_pipeline_run']({ stage: 'wireframe' }, {});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.job_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(parsed.status).toBe('running');
    expect(parsed.poll_interval_ms).toBe(3000);
  });

  test('start_pipeline_run calls redis.hset with key matching pde:mcp:job: prefix', async () => {
    const { redis } = await import('@/lib/redis');
    const mockServer = buildMockServer();
    registerPipelineTools(mockServer as never);

    await toolCallbacks['start_pipeline_run']({ stage: 'mockup' }, {});

    const hsetCalls = vi.mocked(redis.hset).mock.calls;
    expect(hsetCalls.length).toBeGreaterThanOrEqual(1);
    const firstCall = hsetCalls[0];
    expect(firstCall[0]).toMatch(/^pde:mcp:job:[0-9a-f-]+$/i);
  });

  test('start_pipeline_run calls redis.expire with TTL 3600', async () => {
    const { redis } = await import('@/lib/redis');
    const mockServer = buildMockServer();
    registerPipelineTools(mockServer as never);

    await toolCallbacks['start_pipeline_run']({ stage: 'critique' }, {});

    expect(redis.expire).toHaveBeenCalledWith(expect.stringMatching(/^pde:mcp:job:/), 3600);
  });

  test('check_pipeline_run returns job state from Redis for valid job_id', async () => {
    const { redis } = await import('@/lib/redis');
    const mockServer = buildMockServer();
    registerPipelineTools(mockServer as never);

    // Start a job to populate Redis
    const startResult = await toolCallbacks['start_pipeline_run']({ stage: 'wireframe' }, {});
    const { job_id } = JSON.parse(startResult.content[0].text);

    // Now check it
    vi.mocked(redis.hgetall).mockImplementationOnce(async () => ({
      status: 'running',
      stage: 'wireframe',
      userId: 'unknown',
      created_at: String(Date.now()),
    }));

    const checkResult = await toolCallbacks['check_pipeline_run']({ job_id }, {});
    const parsed = JSON.parse(checkResult.content[0].text);

    expect(parsed.status).toBe('running');
    expect(parsed.stage).toBe('wireframe');
  });

  test('check_pipeline_run returns error for non-existent job_id', async () => {
    const mockServer = buildMockServer();
    registerPipelineTools(mockServer as never);

    const result = await toolCallbacks['check_pipeline_run'](
      { job_id: '00000000-0000-0000-0000-000000000000' },
      {},
    );
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.error).toBe('job_not_found');
  });
});
