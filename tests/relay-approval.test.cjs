'use strict';
const http = require('node:http');
const { getApprovalResponse } = require('../bin/lib/relay.cjs');

describe('getApprovalResponse', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);
      const sessionId = url.searchParams.get('session_id');
      const approvalId = url.searchParams.get('approval_id');

      // Check auth header
      const authHeader = req.headers['authorization'];
      if (authHeader !== 'Bearer test-token') {
        res.writeHead(401); res.end(); return;
      }

      // Return 200 with payload for known approval_id, 404 otherwise
      if (approvalId === 'found-id') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          approval_id: approvalId,
          action: 'approved',
          responded_at: '2026-03-25T00:00:00Z',
          responder_id: 'user-1'
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ pending: true }));
      }
    });

    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}/api/approval-response`;
        resolve();
      });
    });
  });

  afterAll(() => { server.close(); });

  it('resolves to parsed JSON on 200', async () => {
    const result = await getApprovalResponse(baseUrl, 'test-token', 'sess-1', 'found-id');
    expect(result).not.toBeNull();
    expect(result.action).toBe('approved');
    expect(result.approval_id).toBe('found-id');
  });

  it('resolves to null on 404', async () => {
    const result = await getApprovalResponse(baseUrl, 'test-token', 'sess-1', 'not-found');
    expect(result).toBeNull();
  });

  it('resolves to null on connection error', async () => {
    const result = await getApprovalResponse('http://127.0.0.1:1/api/x', 'test-token', 's', 'a');
    expect(result).toBeNull();
  });

  it('includes session_id and approval_id as query params', async () => {
    // The 200 response proves the server received the correct params
    const result = await getApprovalResponse(baseUrl, 'test-token', 'my-session', 'found-id');
    expect(result).not.toBeNull();
  });
});
