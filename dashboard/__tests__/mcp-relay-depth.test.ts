import { describe, it, expect } from 'vitest';
import { validateRelayDepth, RELAY_DEPTH_LIMIT } from '../lib/mcp/relay-depth-guard';

describe('validateRelayDepth', () => {
  it('returns null when X-PDE-Relay-Depth header is absent (direct client)', () => {
    const req = new Request('http://x');
    const result = validateRelayDepth(req);
    expect(result).toBeNull();
  });

  it('returns null when X-PDE-Relay-Depth is "0" (first relay hop — allowed)', () => {
    const req = new Request('http://x', {
      headers: { 'x-pde-relay-depth': '0' },
    });
    const result = validateRelayDepth(req);
    expect(result).toBeNull();
  });

  it('returns 400 Response when X-PDE-Relay-Depth is "1" (circular — rejected)', () => {
    const req = new Request('http://x', {
      headers: { 'x-pde-relay-depth': '1' },
    });
    const result = validateRelayDepth(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
  });

  it('returns 400 Response when X-PDE-Relay-Depth is "5" (deeply nested — rejected)', () => {
    const req = new Request('http://x', {
      headers: { 'x-pde-relay-depth': '5' },
    });
    const result = validateRelayDepth(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
  });

  it('returns null when X-PDE-Relay-Depth is non-numeric garbage (treated as not a relay)', () => {
    const req = new Request('http://x', {
      headers: { 'x-pde-relay-depth': 'banana' },
    });
    const result = validateRelayDepth(req);
    expect(result).toBeNull();
  });

  it('Response body contains JSON with error: "relay_depth_exceeded" and received_depth field', async () => {
    const req = new Request('http://x', {
      headers: { 'x-pde-relay-depth': '2' },
    });
    const result = validateRelayDepth(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
    const body = await result!.json();
    expect(body.error).toBe('relay_depth_exceeded');
    expect(body.received_depth).toBe(2);
  });

  it('RELAY_DEPTH_LIMIT is exported and equals 1', () => {
    expect(RELAY_DEPTH_LIMIT).toBe(1);
  });
});
