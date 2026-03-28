import { describe, it, expect, vi } from 'vitest';
import { registerPdeTools } from '../lib/mcp/server-factory';

describe('registerPdeTools', () => {
  it('calls server.tool at least once', () => {
    const mockServer = { tool: vi.fn() };
    registerPdeTools(mockServer as any);
    expect(mockServer.tool).toHaveBeenCalled();
  });

  it("registers 'get_project_state' as the first argument", () => {
    const mockServer = { tool: vi.fn() };
    registerPdeTools(mockServer as any);
    const calls = mockServer.tool.mock.calls;
    const toolNames = calls.map((c) => c[0]);
    expect(toolNames).toContain('get_project_state');
  });

  it("get_project_state handler returns text content with status ok", async () => {
    let capturedHandler: (() => Promise<any>) | null = null;
    const mockServer = {
      tool: vi.fn((_name: string, _desc: string, _schema: unknown, handler: () => Promise<any>) => {
        if (_name === 'get_project_state') {
          capturedHandler = handler;
        }
      }),
    };

    registerPdeTools(mockServer as any);
    expect(capturedHandler).not.toBeNull();

    const result = await capturedHandler!();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('ok');
  });
});
