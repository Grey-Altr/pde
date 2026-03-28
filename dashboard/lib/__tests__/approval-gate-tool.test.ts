import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TOOL_FILE = path.resolve(
  __dirname,
  '../mcp/browser-tools/use-approval-gate-tool.ts'
);

const HOOK_FILE = path.resolve(__dirname, '../../hooks/use-webmcp-tools.ts');

describe('use-approval-gate-tool.ts — source inspection', () => {
  let src: string;

  it('file exists', () => {
    expect(fs.existsSync(TOOL_FILE)).toBe(true);
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
  });

  it("contains 'use client' directive", () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain("'use client'");
  });

  it("registers name: 'pde_approval_gate'", () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain("name: 'pde_approval_gate'");
  });

  it('calls useWebMCP(', () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain('useWebMCP(');
  });

  it("contains z.enum(['approve', 'reject'])", () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain("z.enum(['approve', 'reject'])");
  });

  it('inputSchema contains gate_id field', () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain('gate_id');
  });

  it('inputSchema contains action field', () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain('action');
  });

  it('inputSchema contains reason field', () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    expect(src).toContain('reason');
  });

  it('inputSchema is defined at module level (before export function)', () => {
    src = fs.readFileSync(TOOL_FILE, 'utf-8');
    const schemaIdx = src.indexOf('const inputSchema');
    const funcIdx = src.indexOf('export function useApprovalGateTool');
    expect(schemaIdx).toBeGreaterThan(-1);
    expect(funcIdx).toBeGreaterThan(-1);
    expect(schemaIdx).toBeLessThan(funcIdx);
  });
});

describe('use-webmcp-tools.ts — composite hook wiring', () => {
  let src: string;

  it('file exists', () => {
    expect(fs.existsSync(HOOK_FILE)).toBe(true);
    src = fs.readFileSync(HOOK_FILE, 'utf-8');
  });

  it('imports useApprovalGateTool', () => {
    src = fs.readFileSync(HOOK_FILE, 'utf-8');
    expect(src).toContain('useApprovalGateTool');
  });

  it('calls useApprovalGateTool()', () => {
    src = fs.readFileSync(HOOK_FILE, 'utf-8');
    expect(src).toContain('useApprovalGateTool()');
  });
});
