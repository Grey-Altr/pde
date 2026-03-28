import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const TOOL_FILE = path.resolve(
  import.meta.dirname,
  '../mcp/browser-tools/use-competitor-tools.ts'
);
const HOOK_FILE = path.resolve(
  import.meta.dirname,
  '../../hooks/use-webmcp-tools.ts'
);
const BARREL_FILE = path.resolve(
  import.meta.dirname,
  '../mcp/browser-tools/index.ts'
);

describe('use-competitor-tools.ts -- source inspection', () => {
  const src = readFileSync(TOOL_FILE, 'utf-8');

  it("contains 'use client' directive", () => {
    expect(src).toContain("'use client'");
  });

  it('inputSchema defined at module level before export function', () => {
    const schemaIdx = src.indexOf('const inputSchema');
    const funcIdx = src.indexOf('export function useCompetitorTools');
    expect(schemaIdx).toBeGreaterThan(-1);
    expect(funcIdx).toBeGreaterThan(-1);
    expect(schemaIdx).toBeLessThan(funcIdx);
  });

  it('calls useWebMCP with query_competitor_data name', () => {
    expect(src).toContain('useWebMCP(');
    expect(src).toContain("name: 'query_competitor_data'");
  });

  it('handler fetches from competitor-tools API route', () => {
    expect(src).toContain('/api/planning/competitor-tools');
    expect(src).toContain('encodeURIComponent(competitor_name)');
  });

  it('description mentions approved competitors only', () => {
    expect(src).toContain('approved');
  });

  it('uses zod for inputSchema competitor_name field', () => {
    expect(src).toContain('z.string()');
    expect(src).toContain('competitor_name');
  });
});

describe('useWebMcpTools composite hook -- competitor tools wired', () => {
  const src = readFileSync(HOOK_FILE, 'utf-8');

  it('imports useCompetitorTools from barrel', () => {
    expect(src).toContain('useCompetitorTools');
  });

  it('calls useCompetitorTools()', () => {
    expect(src).toContain('useCompetitorTools()');
  });
});

describe('barrel export -- includes useCompetitorTools', () => {
  const src = readFileSync(BARREL_FILE, 'utf-8');

  it('exports useCompetitorTools', () => {
    expect(src).toContain('useCompetitorTools');
    expect(src).toContain("'./use-competitor-tools'");
  });
});
