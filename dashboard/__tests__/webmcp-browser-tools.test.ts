import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection test — validates WebMCP initialization + tool registration
// (project uses node environment; no @testing-library/react available)
const providersSource = readFileSync(
  path.resolve(import.meta.dirname, '../components/providers.tsx'),
  'utf-8'
);

describe('WebMCP browser initialization (BRW-01)', () => {
  it('WebMcpInitializer component calls initializeWebModelContext on mount', () => {
    expect(providersSource).toContain('initializeWebModelContext()');
  });

  it('initializeWebModelContext is called inside useEffect (not at module level)', () => {
    // Verify the call is inside a useEffect block, not at module scope
    const lines = providersSource.split('\n');
    // Find non-comment lines that contain the function call
    const initLine = lines.findIndex(
      l => l.includes('initializeWebModelContext()') && !l.trimStart().startsWith('//')
    );
    expect(initLine).toBeGreaterThan(-1);

    // The line should have indentation (inside a function/block), not at column 0
    const lineContent = lines[initLine];
    expect(lineContent.startsWith(' ') || lineContent.startsWith('\t')).toBe(true);

    // Verify useEffect appears before the initializeWebModelContext call
    const effectLine = lines.findIndex(l => l.includes('useEffect'));
    expect(effectLine).toBeGreaterThan(-1);
    expect(effectLine).toBeLessThan(initLine);
  });

  it('providers.tsx is a "use client" component (required for useEffect)', () => {
    expect(providersSource).toContain('"use client"');
  });

  it('providers.tsx imports @mcp-b/global package', () => {
    expect(providersSource).toContain("'@mcp-b/global'");
  });
});

describe('WebMCP browser tool stubs (BRW-03 — implemented in Plan 03)', () => {
  it.todo('get_design_state tool registers with correct name and schema');
  it.todo('get_project_info tool registers with correct name and schema');
  it.todo('list_artifacts tool registers with correct name and schema');
});
