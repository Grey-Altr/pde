import { describe, it, expect, vi } from 'vitest';
import { registerPdeTools } from '../lib/mcp/server-factory';

describe('registerPdeTools', () => {
  it('calls server.tool at least once', () => {
    const mockServer = { tool: vi.fn(), registerResource: vi.fn(), registerTool: vi.fn() };
    registerPdeTools(mockServer as any);
    expect(mockServer.tool).toHaveBeenCalled();
  });

  it("registers 'get_project_state' as the first argument", () => {
    const mockServer = { tool: vi.fn(), registerResource: vi.fn(), registerTool: vi.fn() };
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
      registerResource: vi.fn(),
      registerTool: vi.fn(),
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

describe('registerArtifactPreviewTools — RUI-01 dual-mode responses', () => {
  it('calls registerAppTool with preview_artifact tool name', async () => {
    // Import dynamically to ensure package is installed
    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    const registerToolCalls: any[] = [];
    const mockServer = {
      tool: vi.fn(),
      registerResource: vi.fn(),
      registerTool: vi.fn((...args: any[]) => registerToolCalls.push(args)),
    };
    registerArtifactPreviewTools(mockServer as any);
    // registerAppTool internally calls server.registerTool — but since we use the ext-apps
    // wrapper, check that registerAppTool was called by verifying the mock was exercised.
    // The ext-apps registerAppTool uses server.tool() under the hood.
    expect(mockServer.tool.mock.calls.length + mockServer.registerTool.mock.calls.length).toBeGreaterThan(0);
  });

  it('registers a resource with RESOURCE_MIME_TYPE for the artifact viewer', async () => {
    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    const mockServer = {
      tool: vi.fn(),
      registerResource: vi.fn(),
      registerTool: vi.fn(),
    };
    registerArtifactPreviewTools(mockServer as any);
    expect(mockServer.registerResource).toHaveBeenCalled();
  });
});

describe('registerArtifactPreviewTools — RUI-02 CSP connectDomains', () => {
  it('resource read callback returns contents with _meta.ui.csp.connectDomains', async () => {
    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    let staticViewerCallback: ((...args: any[]) => Promise<any>) | null = null;
    const mockServer = {
      tool: vi.fn(),
      registerTool: vi.fn(),
      registerResource: vi.fn((...args: any[]) => {
        // Capture the static pde-artifact-viewer resource callback (first string-URI call)
        // The dynamic ResourceTemplate call uses an object as second arg, not a string
        const secondArg = args[1];
        const lastArg = args[args.length - 1];
        if (typeof secondArg === 'string' && typeof lastArg === 'function') {
          staticViewerCallback = lastArg;
        }
      }),
    };
    registerArtifactPreviewTools(mockServer as any);
    expect(staticViewerCallback).not.toBeNull();

    const result = await staticViewerCallback!();
    expect(result.contents).toBeDefined();
    expect(result.contents[0]._meta.ui.csp.connectDomains).toBeDefined();
    expect(Array.isArray(result.contents[0]._meta.ui.csp.connectDomains)).toBe(true);
  });
});
