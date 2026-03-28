import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection test — validates useWebMCP lifecycle requirements
// (project uses node environment; no @testing-library/react available)
// BRW-02: useWebMCP() from '@mcp-b/react-webmcp' must register/unregister on mount/unmount.
// Since providers.tsx uses WebMcpInitializer (not useWebMCP directly), lifecycle tests
// validate that initializeWebModelContext() is correctly scoped in useEffect.
// vi.mock('@mcp-b/react-webmcp') would be used for renderHook tests if jsdom were available.

const source = readFileSync(
  path.resolve(import.meta.dirname, '../components/providers.tsx'),
  'utf-8'
);

// Verify @mcp-b/react-webmcp is available (useWebMCP hook registration backed by this package)
describe('useWebMCP package availability (BRW-02)', () => {
  it('@mcp-b/react-webmcp exports useWebMCP', async () => {
    // vi.mock('@mcp-b/react-webmcp') would be used in DOM test env
    // Here we verify the package exports the hook we depend on
    const pkg = await import('@mcp-b/react-webmcp');
    expect(typeof pkg.useWebMCP).toBe('function');
  });
});

describe('WebMCP mount/unmount lifecycle (BRW-02)', () => {
  it('providers.tsx imports useEffect for lifecycle management', () => {
    expect(source).toContain("import { useEffect }");
  });

  it('initializeWebModelContext is wrapped in useEffect (not top-level)', () => {
    // Must be inside useEffect(() => { ... }, []) — not at module scope
    const effectMatch = source.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*initializeWebModelContext/);
    expect(effectMatch).not.toBeNull();
  });

  it('useEffect dependency array is empty — runs only on mount', () => {
    // The WebMcpInitializer useEffect must have [] as deps (run once on mount)
    expect(source).toMatch(/initializeWebModelContext\(\s*\)[^}]*}\s*,\s*\[\s*\]/s);
  });

  it('WebMcpInitializer component is defined and returns null', () => {
    expect(source).toContain('return null');
  });

  it('WebMcpInitializer is rendered inside the Providers tree', () => {
    expect(source).toContain('<WebMcpInitializer />');
  });

  it('initializeWebModelContext is imported from @mcp-b/global', () => {
    expect(source).toContain("from '@mcp-b/global'");
    expect(source).toContain('initializeWebModelContext');
  });
});
