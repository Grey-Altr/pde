import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Source inspection tests — validates browser tool structure
// (project uses node environment; renderHook not available without jsdom)
const dir = path.resolve(import.meta.dirname, '../lib/mcp/browser-tools');
const hooksDir = path.resolve(import.meta.dirname, '../hooks');

const designStateSrc = readFileSync(path.join(dir, 'use-design-state-tool.ts'), 'utf-8');
const projectInfoSrc = readFileSync(path.join(dir, 'use-project-info-tool.ts'), 'utf-8');
const artifactListSrc = readFileSync(path.join(dir, 'use-artifact-list-tool.ts'), 'utf-8');
const barrelSrc = readFileSync(path.join(dir, 'index.ts'), 'utf-8');
const compositeHookSrc = readFileSync(path.join(hooksDir, 'use-webmcp-tools.ts'), 'utf-8');

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

describe('WebMCP browser tool stubs (BRW-03)', () => {
  it('get_design_state tool registers with correct name and schema', () => {
    expect(designStateSrc).toContain("'use client'");
    expect(designStateSrc).toContain('useWebMCP');
    expect(designStateSrc).toContain("name: 'get_design_state'");
    // inputSchema must be module-level const (not inline)
    expect(designStateSrc).toMatch(/^const inputSchema/m);
    expect(designStateSrc).toContain('inputSchema,');
  });

  it('get_project_info tool registers with correct name and schema', () => {
    expect(projectInfoSrc).toContain("'use client'");
    expect(projectInfoSrc).toContain('useWebMCP');
    expect(projectInfoSrc).toContain("name: 'get_project_info'");
    // inputSchema must be module-level const (not inline)
    expect(projectInfoSrc).toMatch(/^const inputSchema/m);
    expect(projectInfoSrc).toContain('inputSchema,');
  });

  it('list_artifacts tool registers with correct name and schema', () => {
    expect(artifactListSrc).toContain("'use client'");
    expect(artifactListSrc).toContain('useWebMCP');
    expect(artifactListSrc).toContain("name: 'list_artifacts'");
    // inputSchema must be module-level const (not inline) with Zod filter field
    expect(artifactListSrc).toMatch(/^const inputSchema/m);
    expect(artifactListSrc).toContain('z.string().optional()');
    expect(artifactListSrc).toContain('filter:');
  });

  it('barrel export exports all three tool hooks', () => {
    expect(barrelSrc).toContain('useDesignStateTool');
    expect(barrelSrc).toContain('useProjectInfoTool');
    expect(barrelSrc).toContain('useArtifactListTool');
    // Verify exactly 4 export lines (3 original + approval gate)
    const exportLines = barrelSrc.split('\n').filter(l => l.startsWith('export'));
    expect(exportLines.length).toBe(4);
  });

  it('useWebMcpTools registers all three tools', () => {
    expect(compositeHookSrc).toContain("'use client'");
    expect(compositeHookSrc).toContain('useDesignStateTool()');
    expect(compositeHookSrc).toContain('useProjectInfoTool()');
    expect(compositeHookSrc).toContain('useArtifactListTool()');
    expect(compositeHookSrc).toContain("from '@/lib/mcp/browser-tools'");
  });

  it('tool handlers call correct API routes (source verification)', () => {
    expect(projectInfoSrc).toContain('/api/planning/project-info');
    expect(designStateSrc).toContain('/api/planning/design-state');
    expect(artifactListSrc).toContain('/api/planning/artifacts');
  });

  it('list_artifacts handler passes filter query param', () => {
    // Verify the handler builds a URL with filter query param
    expect(artifactListSrc).toContain('filter=');
    expect(artifactListSrc).toContain('encodeURIComponent(filter)');
    // Verify conditional — with and without filter
    expect(artifactListSrc).toContain('? `/api/planning/artifacts?filter=');
    expect(artifactListSrc).toContain(": '/api/planning/artifacts'");
  });
});
