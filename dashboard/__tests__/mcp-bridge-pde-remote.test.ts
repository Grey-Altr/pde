import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const bridgeSrc = readFileSync(
  resolve(__dirname, '../../bin/lib/mcp-bridge.cjs'),
  'utf-8',
);

describe('mcp-bridge.cjs APPROVED_SERVERS — pde_remote', () => {
  it('contains a pde_remote entry', () => {
    expect(bridgeSrc).toContain('pde_remote:');
  });

  it('uses http transport', () => {
    expect(bridgeSrc).toMatch(/pde_remote:\s*\{[^}]*transport:\s*'http'/s);
  });

  it('specifies get_project_state as probeTool', () => {
    expect(bridgeSrc).toContain("probeTool: 'mcp__pde_remote__get_project_state'");
  });

  it('has displayName PDE Remote', () => {
    expect(bridgeSrc).toContain("displayName: 'PDE Remote'");
  });

  it('uses NEXT_PUBLIC_APP_URL env var for url', () => {
    expect(bridgeSrc).toMatch(/pde_remote:\s*\{[^}]*NEXT_PUBLIC_APP_URL/s);
  });
});
