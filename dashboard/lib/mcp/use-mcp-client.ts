'use client';

import { useState, useCallback } from 'react';

export type McpCallState = 'idle' | 'calling' | 'done' | 'error';

export interface UseMcpClientOptions {
  /** The MCP endpoint to POST to (e.g. '/api/mcp') */
  endpoint: string;
  /** Optional Clerk token getter — when provided, adds Authorization: Bearer header */
  getToken?: () => Promise<string | null>;
}

/**
 * Thin fetch-based MCP JSON-RPC 2.0 client hook.
 *
 * Uses raw fetch only — no MCP SDK imports — for Vercel stateless
 * transport compatibility (Phase 156 decision).
 *
 * Supports both application/json and text/event-stream (SSE) responses.
 */
export function useMcpClient({ endpoint, getToken }: UseMcpClientOptions) {
  const [state, setState] = useState<McpCallState>('idle');
  const [error, setError] = useState<string | null>(null);

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown> = {}): Promise<unknown> => {
      setState('calling');
      setError(null);

      try {
        const token = getToken ? await getToken() : null;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const body = JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name, arguments: args },
        });

        const res = await fetch(endpoint, { method: 'POST', headers, body });

        if (!res.ok) {
          throw new Error('MCP error: ' + res.status);
        }

        const contentType = res.headers.get('content-type') ?? '';
        let result: unknown;

        if (contentType.includes('application/json')) {
          result = await res.json();
        } else {
          // SSE / text/event-stream: read text and find 'data: ' line
          const text = await res.text();
          const dataLine = text.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) {
            throw new Error('MCP error: no data line in SSE response');
          }
          result = JSON.parse(dataLine.slice('data: '.length));
        }

        setState('done');
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setState('error');
        throw err;
      }
    },
    [endpoint, getToken],
  );

  return { callTool, state, error };
}
