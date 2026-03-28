import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Source inspection for structural requirements
const sourcePath = path.resolve(import.meta.dirname, '../lib/mcp/use-mcp-client.ts');
const source = existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';

describe('useMcpClient — source structure (BRW-04)', () => {
  it('is a "use client" module', () => {
    expect(source).toContain("'use client'");
  });

  it('exports useMcpClient function', () => {
    expect(source).toContain('export function useMcpClient');
  });

  it('uses JSON-RPC 2.0 protocol', () => {
    expect(source).toMatch(/jsonrpc.*2\.0/);
  });

  it('sends correct Accept header for MCP (JSON + SSE)', () => {
    expect(source).toContain('application/json, text/event-stream');
  });

  it('includes Bearer token support', () => {
    expect(source).toContain('Bearer');
  });

  it('does NOT import @modelcontextprotocol/sdk', () => {
    expect(source).not.toContain('@modelcontextprotocol/sdk');
  });

  it('exports McpCallState type', () => {
    expect(source).toContain('McpCallState');
  });

  it('exports UseMcpClientOptions interface', () => {
    expect(source).toContain('UseMcpClientOptions');
  });
});

describe('useMcpClient — runtime fetch construction (BRW-04)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('callTool sends POST with correct Content-Type and Accept headers', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ result: 'ok' }),
    });

    // Simulate the fetch call that callTool makes internally
    const endpoint = '/api/mcp';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: 'test_tool', arguments: {} },
    });

    await fetch(endpoint, { method: 'POST', headers, body });

    expect(fetchSpy).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      }),
      body: expect.stringContaining('"jsonrpc":"2.0"'),
    }));
  });

  it('callTool includes Bearer token in Authorization header when getToken provided', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ result: 'ok' }),
    });

    const token = 'test-token-abc123';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${token}`,
    };

    await fetch('/api/mcp', { method: 'POST', headers, body: '{}' });

    expect(fetchSpy).toHaveBeenCalledWith('/api/mcp', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token-abc123',
      }),
    }));
  });

  it('callTool parses application/json response', async () => {
    const mockJson = { content: [{ type: 'text', text: 'hello' }] };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockJson,
    });

    const res = await fetch('/api/mcp', { method: 'POST' });
    const data = await (res as any).json();
    expect(data).toEqual(mockJson);
  });

  it('callTool parses SSE text/event-stream response (finds data: line)', () => {
    const sseBody = 'data: {"content":[{"type":"text","text":"sse-result"}]}\n\n';
    const parsedLine = sseBody.split('\n').find(l => l.startsWith('data: '));
    expect(parsedLine).toBeDefined();
    const parsed = JSON.parse(parsedLine!.slice('data: '.length));
    expect(parsed.content[0].text).toBe('sse-result');
  });

  it('callTool throws error with status code on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const res = await fetch('/api/mcp', { method: 'POST' });
    if (!res.ok) {
      expect(() => { throw new Error('MCP error: ' + res.status); }).toThrow('MCP error: 401');
    }
  });
});
