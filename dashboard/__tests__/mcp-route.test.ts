import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock external MCP packages not yet installed
vi.mock('mcp-handler', () => ({
  createMcpHandler: vi.fn(() => vi.fn()),
  withMcpAuth: vi.fn((_handler: unknown, _verify: unknown, _opts: unknown) => vi.fn()),
}));

vi.mock('@clerk/mcp-tools/next', () => ({
  verifyClerkToken: vi.fn(),
  protectedResourceHandlerClerk: vi.fn(() => vi.fn()),
  metadataCorsOptionsRequestHandler: vi.fn(() => vi.fn()),
  authServerMetadataHandlerClerk: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/mcp/server-factory', () => ({
  registerPdeTools: vi.fn(),
}));

vi.mock('@/lib/mcp/origin-guard', () => ({
  validateOrigin: vi.fn(() => null),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_test' })),
}));

describe('MCP route — export shape and static config', () => {
  let routeModule: typeof import('@/app/api/mcp/route');

  beforeAll(async () => {
    routeModule = await import('@/app/api/mcp/route');
  });

  it('exports GET as a function', () => {
    expect(typeof routeModule.GET).toBe('function');
  });

  it('exports POST as a function', () => {
    expect(typeof routeModule.POST).toBe('function');
  });

  it('exports DELETE as a function', () => {
    expect(typeof routeModule.DELETE).toBe('function');
  });

  it('exports dynamic = force-dynamic', () => {
    expect(routeModule.dynamic).toBe('force-dynamic');
  });

  it('exports maxDuration = 300', () => {
    expect(routeModule.maxDuration).toBe(300);
  });

  it('GET, POST, DELETE all reference the same handler', () => {
    // All three should be the same guardedHandler function
    expect(routeModule.GET).toBe(routeModule.POST);
    expect(routeModule.POST).toBe(routeModule.DELETE);
  });

  // Full integration tests (actual MCP JSON-RPC requests) require a deployed environment
  // with real Clerk OAuth tokens and MCP client infrastructure.
  it.todo('POST with valid MCP JSON-RPC and Bearer token returns JSON-RPC response (requires deployed env)');
  it.todo('POST without Authorization header returns 401 (requires deployed env)');
  it.todo('POST from unlisted Origin returns 403 (requires deployed env)');
  it.todo('Response does not contain Mcp-Session-Id header (stateless) (requires deployed env)');
});
