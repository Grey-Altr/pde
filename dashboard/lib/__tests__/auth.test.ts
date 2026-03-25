import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateRelayToken } from '../auth';

const VALID_TOKEN = 'test-secret-token-abc123';

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader;
  }
  return new Request('https://example.com/api/ingest', { headers });
}

describe('validateRelayToken', () => {
  const originalEnv = process.env.PDE_RELAY_TOKEN;

  beforeEach(() => {
    process.env.PDE_RELAY_TOKEN = VALID_TOKEN;
  });

  afterEach(() => {
    process.env.PDE_RELAY_TOKEN = originalEnv;
  });

  it('returns true for a valid Bearer token', () => {
    const req = makeRequest(`Bearer ${VALID_TOKEN}`);
    expect(validateRelayToken(req)).toBe(true);
  });

  it('returns false when Authorization header is missing', () => {
    const req = makeRequest();
    expect(validateRelayToken(req)).toBe(false);
  });

  it('returns false for a wrong token', () => {
    const req = makeRequest('Bearer wrong-token');
    expect(validateRelayToken(req)).toBe(false);
  });

  it('returns false for malformed header without "Bearer " prefix', () => {
    const req = makeRequest(VALID_TOKEN);
    expect(validateRelayToken(req)).toBe(false);
  });
});
