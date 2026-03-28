import { describe, it, expect, vi, beforeAll } from 'vitest';

// Capture mock calls for assertion
const mockWithMcpAuth = vi.fn((_handler: unknown, _verifyFn: unknown, _opts: unknown) => vi.fn());
const mockCreateMcpHandler = vi.fn(() => vi.fn());
const mockVerifyClerkToken = vi.fn();
const mockAuth = vi.fn(async () => ({ userId: 'user_test' }));

vi.mock('mcp-handler', () => ({
  createMcpHandler: mockCreateMcpHandler,
  withMcpAuth: mockWithMcpAuth,
}));

vi.mock('@clerk/mcp-tools/next', () => ({
  verifyClerkToken: mockVerifyClerkToken,
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
  auth: mockAuth,
}));

describe('MCP route — auth configuration', () => {
  beforeAll(async () => {
    // Import the module to trigger module-level side effects (withMcpAuth call)
    await import('@/app/api/mcp/route');
  });

  it('withMcpAuth is called during module initialization', () => {
    expect(mockWithMcpAuth).toHaveBeenCalled();
  });

  it('withMcpAuth is called with required: true', () => {
    const opts = mockWithMcpAuth.mock.calls[0][2] as { required: boolean };
    expect(opts.required).toBe(true);
  });

  it('withMcpAuth is called with correct resourceMetadataPath', () => {
    const opts = mockWithMcpAuth.mock.calls[0][2] as { resourceMetadataPath: string };
    expect(opts.resourceMetadataPath).toBe('/.well-known/oauth-protected-resource/mcp');
  });

  it('auth is called with acceptsToken: oauth_token when verify function is invoked', async () => {
    // Extract the verify function passed to withMcpAuth (second argument)
    const verifyFn = mockWithMcpAuth.mock.calls[0][1] as (req: unknown, token: unknown) => Promise<unknown>;
    await verifyFn(null, 'test-token');
    expect(mockAuth).toHaveBeenCalledWith({ acceptsToken: 'oauth_token' });
  });

  it('verifyClerkToken is called with clerkAuth result and token', async () => {
    const verifyFn = mockWithMcpAuth.mock.calls[0][1] as (req: unknown, token: unknown) => Promise<unknown>;
    const clerkAuthResult = { userId: 'user_test' };
    mockAuth.mockResolvedValueOnce(clerkAuthResult);
    await verifyFn(null, 'bearer-token-123');
    expect(mockVerifyClerkToken).toHaveBeenCalledWith(clerkAuthResult, 'bearer-token-123');
  });
});
