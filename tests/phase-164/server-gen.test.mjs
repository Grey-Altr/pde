import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// These modules don't exist yet — tests are RED by design
const { generateServerSource } = require('../../bin/lib/cli-anything/server-gen.cjs');

const mockModel = {
  meta: {
    source: '/usr/bin/mytool',
    type: 'cli',
    version: '1.0',
    auth: {},
    generatedAt: '2026-01-01T00:00:00Z',
  },
  capabilities: [
    {
      name: 'init',
      description: 'Initialize a new project',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
        },
      },
      outputSchema: null,
      method: null,
      path: null,
      extensions: {},
    },
    {
      name: 'build',
      description: 'Build the project',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      outputSchema: null,
      method: null,
      path: null,
      extensions: {},
    },
  ],
};

describe('generateServerSource', () => {
  it('produces valid JS containing McpServer', () => {
    const src = generateServerSource(mockModel);
    expect(typeof src).toBe('string');
    expect(src).toContain('McpServer');
  });

  it('includes BINARY constant with source path', () => {
    const src = generateServerSource(mockModel);
    expect(src).toContain('BINARY');
    expect(src).toContain('/usr/bin/mytool');
  });

  it('generated source includes DRY_RUN check', () => {
    const src = generateServerSource(mockModel);
    expect(src).toContain('DRY_RUN');
  });

  it('generated source includes JSON.parse(stdout) with envelope fallback', () => {
    const src = generateServerSource(mockModel);
    expect(src).toContain('JSON.parse');
    expect(src).toContain('stdout');
  });

  it('generated tool includes useJson input field that appends --json', () => {
    const src = generateServerSource(mockModel);
    expect(src).toContain('useJson');
    expect(src).toContain('--json');
  });

  it('generated source uses spawnSync (not exec/spawn)', () => {
    const src = generateServerSource(mockModel);
    expect(src).toContain('spawnSync');
    expect(src).not.toMatch(/\bexec\b/);
    // Should not use async spawn (only spawnSync)
    expect(src).not.toMatch(/require\('child_process'\)\.spawn\b/);
  });
});
