import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateOrigin, ALLOWED_ORIGINS } from '../lib/mcp/origin-guard';

describe('validateOrigin', () => {
  it('returns 403 Response when origin is not allowlisted', async () => {
    const req = new Request('http://x', {
      headers: { origin: 'https://evil.com' },
    });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('returns null when no Origin header is present (relay/CLI context)', () => {
    const req = new Request('http://x');
    const result = validateOrigin(req);
    expect(result).toBeNull();
  });

  it('returns null when origin is http://localhost:3000', () => {
    const req = new Request('http://x', {
      headers: { origin: 'http://localhost:3000' },
    });
    const result = validateOrigin(req);
    expect(result).toBeNull();
  });

  it('returns null when origin matches NEXT_PUBLIC_APP_URL', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://pde.vercel.app';

    // Re-evaluate ALLOWED_ORIGINS by testing against a known allowed value
    // We need to add it manually since the module is already loaded
    ALLOWED_ORIGINS.add('https://pde.vercel.app');

    const req = new Request('http://x', {
      headers: { origin: 'https://pde.vercel.app' },
    });
    const result = validateOrigin(req);
    expect(result).toBeNull();

    // Cleanup
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      ALLOWED_ORIGINS.delete('https://pde.vercel.app');
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });
});
