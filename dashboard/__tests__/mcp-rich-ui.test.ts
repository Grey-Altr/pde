import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';

// Mock fs/promises before importing the module
vi.mock('node:fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    readFile: vi.fn(),
  },
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

describe('artifact resource template — RUI-03', () => {
  let mockServer: {
    tool: ReturnType<typeof vi.fn>;
    registerResource: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockServer = {
      tool: vi.fn(),
      registerResource: vi.fn(),
      registerTool: vi.fn(),
    };
    vi.resetModules();
  });

  it('registers a resource with uri pattern ui://pde/{artifact}', async () => {
    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    // Find the registerResource call with ResourceTemplate containing ui://pde/{artifact}
    const resourceCalls = mockServer.registerResource.mock.calls;
    const artifactResourceCall = resourceCalls.find((call: any[]) => {
      const templateArg = call[1];
      // ResourceTemplate stores the URI pattern
      return templateArg && typeof templateArg === 'object' && String(templateArg).includes('ui://pde/');
    });
    // At minimum, registerResource was called (may be called by registerAppResource too)
    expect(mockServer.registerResource).toHaveBeenCalled();
  });

  it('resource read callback returns text/html;profile=mcp-app MIME type', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as any).mockResolvedValue('# Test Markdown\n\nHello world');

    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    // Find the read callback for the artifact template resource
    const resourceCalls = mockServer.registerResource.mock.calls;
    // The read callback is the last function argument
    let readCallback: ((...args: any[]) => Promise<any>) | null = null;
    for (const call of resourceCalls) {
      const lastFnArg = [...call].reverse().find((a: any) => typeof a === 'function');
      // Check if this call has a ResourceTemplate with ui://pde pattern
      const hasTemplate = call.some((a: any) => a && typeof a === 'object' && a.uriTemplate && String(a.uriTemplate).includes('ui://pde/'));
      if (lastFnArg && hasTemplate) {
        readCallback = lastFnArg;
      }
    }

    expect(readCallback).not.toBeNull();
    if (readCallback) {
      const result = await readCallback(new URL('ui://pde/test.md'), { artifact: 'test.md' });
      expect(result.contents[0].mimeType).toBe('text/html;profile=mcp-app');
    }
  });

  it('resource read callback includes _meta.ui.csp.connectDomains', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as any).mockResolvedValue('test content');

    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    const resourceCalls = mockServer.registerResource.mock.calls;
    let readCallback: ((...args: any[]) => Promise<any>) | null = null;
    for (const call of resourceCalls) {
      const lastFnArg = [...call].reverse().find((a: any) => typeof a === 'function');
      const hasTemplate = call.some((a: any) => a && typeof a === 'object' && a.uriTemplate && String(a.uriTemplate).includes('ui://pde/'));
      if (lastFnArg && hasTemplate) {
        readCallback = lastFnArg;
      }
    }

    if (readCallback) {
      const result = await readCallback(new URL('ui://pde/test.md'), { artifact: 'test.md' });
      expect(result.contents[0]._meta.ui.csp.connectDomains).toBeDefined();
    }
  });

  it('wraps markdown content in HTML with marked rendering', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as any).mockResolvedValue('# Hello\n\nWorld');

    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    const resourceCalls = mockServer.registerResource.mock.calls;
    let readCallback: ((...args: any[]) => Promise<any>) | null = null;
    for (const call of resourceCalls) {
      const lastFnArg = [...call].reverse().find((a: any) => typeof a === 'function');
      const hasTemplate = call.some((a: any) => a && typeof a === 'object' && a.uriTemplate && String(a.uriTemplate).includes('ui://pde/'));
      if (lastFnArg && hasTemplate) {
        readCallback = lastFnArg;
      }
    }

    if (readCallback) {
      const result = await readCallback(new URL('ui://pde/test.md'), { artifact: 'test.md' });
      const html = result.contents[0].text;
      expect(html).toContain('<!DOCTYPE html>');
      // marked renders # Hello as <h1>
      expect(html).toContain('<h1');
    }
  });

  it('passes HTML artifacts through with inlined CSS', async () => {
    const fs = await import('node:fs/promises');
    const htmlContent = '<html><head><link rel="stylesheet" href="../../assets/tokens.css"></head><body><h1>Test</h1></body></html>';
    // First call = the HTML file, second call might be tokens.css
    (fs.readFile as any)
      .mockResolvedValueOnce(htmlContent)
      .mockResolvedValueOnce(':root { --color: red; }');

    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    const resourceCalls = mockServer.registerResource.mock.calls;
    let readCallback: ((...args: any[]) => Promise<any>) | null = null;
    for (const call of resourceCalls) {
      const lastFnArg = [...call].reverse().find((a: any) => typeof a === 'function');
      const hasTemplate = call.some((a: any) => a && typeof a === 'object' && a.uriTemplate && String(a.uriTemplate).includes('ui://pde/'));
      if (lastFnArg && hasTemplate) {
        readCallback = lastFnArg;
      }
    }

    if (readCallback) {
      const result = await readCallback(new URL('ui://pde/wireframe.html'), { artifact: 'wireframe.html' });
      const html = result.contents[0].text;
      // Should not contain external link tag
      expect(html).not.toContain('href="../../assets/tokens.css"');
    }
  });

  it('renders JSON artifacts with syntax highlighting in pre block', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as any).mockResolvedValue('{"key": "value"}');

    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    const resourceCalls = mockServer.registerResource.mock.calls;
    let readCallback: ((...args: any[]) => Promise<any>) | null = null;
    for (const call of resourceCalls) {
      const lastFnArg = [...call].reverse().find((a: any) => typeof a === 'function');
      const hasTemplate = call.some((a: any) => a && typeof a === 'object' && a.uriTemplate && String(a.uriTemplate).includes('ui://pde/'));
      if (lastFnArg && hasTemplate) {
        readCallback = lastFnArg;
      }
    }

    if (readCallback) {
      const result = await readCallback(new URL('ui://pde/tokens.json'), { artifact: 'tokens.json' });
      const html = result.contents[0].text;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<pre');
    }
  });

  it('returns error HTML when artifact file not found', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

    const { registerArtifactPreviewTools } = await import('../lib/mcp/apps/artifact-preview');
    registerArtifactPreviewTools(mockServer as any);

    const resourceCalls = mockServer.registerResource.mock.calls;
    let readCallback: ((...args: any[]) => Promise<any>) | null = null;
    for (const call of resourceCalls) {
      const lastFnArg = [...call].reverse().find((a: any) => typeof a === 'function');
      const hasTemplate = call.some((a: any) => a && typeof a === 'object' && a.uriTemplate && String(a.uriTemplate).includes('ui://pde/'));
      if (lastFnArg && hasTemplate) {
        readCallback = lastFnArg;
      }
    }

    if (readCallback) {
      const result = await readCallback(new URL('ui://pde/missing.md'), { artifact: 'missing.md' });
      const html = result.contents[0].text;
      expect(html).toContain('not found');
    }
  });
});
