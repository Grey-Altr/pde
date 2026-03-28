import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('@clerk/mcp-tools/next', () => ({
  verifyClerkToken: vi.fn(),
  protectedResourceHandlerClerk: vi.fn(() => vi.fn()),
  metadataCorsOptionsRequestHandler: vi.fn(() => vi.fn()),
  authServerMetadataHandlerClerk: vi.fn(() => vi.fn()),
}));

describe('.well-known/oauth-protected-resource/mcp — export shape', () => {
  let protectedResource: typeof import('@/app/.well-known/oauth-protected-resource/mcp/route');

  beforeAll(async () => {
    protectedResource = await import('@/app/.well-known/oauth-protected-resource/mcp/route');
  });

  it('exports GET as a function', () => {
    expect(typeof protectedResource.GET).toBe('function');
  });

  it('exports OPTIONS as a function', () => {
    expect(typeof protectedResource.OPTIONS).toBe('function');
  });
});

describe('.well-known/oauth-authorization-server — export shape', () => {
  let authServer: typeof import('@/app/.well-known/oauth-authorization-server/route');

  beforeAll(async () => {
    authServer = await import('@/app/.well-known/oauth-authorization-server/route');
  });

  it('exports GET as a function', () => {
    expect(typeof authServer.GET).toBe('function');
  });

  it('exports OPTIONS as a function', () => {
    expect(typeof authServer.OPTIONS).toBe('function');
  });
});
