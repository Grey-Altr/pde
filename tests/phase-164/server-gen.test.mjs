import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { generateServerSource } = require('../../bin/lib/cli-anything/server-gen.cjs');

const sampleCapabilities = [
  {
    name: 'git_commit',
    description: 'Record changes to the repository',
    inputSchema: {
      type: 'object',
      properties: {
        useJson: { type: 'boolean', description: 'Append --json flag' },
        message: { type: 'string', description: 'Commit message' },
      },
    },
    outputSchema: null,
    method: null,
    path: 'git commit',
    extensions: { subcommandPath: ['commit'] },
  },
];

const sampleMeta = {
  source: '/usr/bin/git',
  type: 'cli',
  version: '1.0.0',
  auth: {},
  generatedAt: '2026-01-01T00:00:00.000Z',
};

describe('generateServerSource', () => {
  it('returns a string', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(typeof src).toBe('string');
  });

  it('contains McpServer', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('McpServer');
  });

  it('contains StdioServerTransport', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('StdioServerTransport');
  });

  it('contains BINARY constant with source path', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('BINARY');
    expect(src).toContain('/usr/bin/git');
  });

  it('contains DRY_RUN flag', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('DRY_RUN');
    expect(src).toContain("process.argv.includes('--dry-run')");
  });

  it('contains JSON.parse envelope fallback with stdout, stderr, exitCode', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('JSON.parse');
    expect(src).toContain('stdout');
    expect(src).toContain('stderr');
    expect(src).toContain('exitCode');
  });

  it('contains useJson support that appends --json', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('useJson');
    expect(src).toContain("'--json'");
  });

  it('uses spawnSync (not shell spawn)', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('spawnSync');
  });

  it('contains spawnSync with timeout 30000', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('30000');
  });

  it('registers a tool for each capability via registerTool', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('registerTool');
    expect(src).toContain('git_commit');
  });

  it('includes dryRun return when DRY_RUN is set', () => {
    const src = generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk/path');
    expect(src).toContain('dryRun');
  });
});
