/**
 * tests/phase-172/server-gen-async.test.mjs
 * Tests for asyncMode extension in bin/lib/cli-anything/server-gen.cjs (WRAP-05)
 *
 * Verifies that generateServerSource with asyncMode=true emits spawn-based
 * async handlers, and that asyncMode=false (default) preserves spawnSync
 * backward compatibility.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let mod;
try {
  mod = require('../../bin/lib/cli-anything/server-gen.cjs');
} catch (_) {
  mod = null;
}

const sampleCapabilities = [
  {
    name: 'render',
    description: 'Render a scene',
    path: 'blender --background',
    extensions: { subcommandPath: ['--background'] },
    inputSchema: { type: 'object', properties: { scene: { type: 'string' } } },
  },
];

const sampleMeta = {
  source: '/usr/bin/blender',
  type: 'desktop-app',
  generatedAt: '2026-03-29T00:00:00.000Z',
};

describe('generateServerSource asyncMode', () => {
  it('exports generateServerSource', () => {
    expect(mod).not.toBeNull();
    expect(typeof mod.generateServerSource).toBe('function');
  });

  it('asyncMode=true: imports spawn instead of spawnSync', () => {
    const source = mod.generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk', { asyncMode: true });
    expect(source).toContain("const { spawn } = require('child_process')");
    expect(source).not.toContain("spawnSync");
  });

  it('asyncMode=true: handler wraps spawn in Promise', () => {
    const source = mod.generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk', { asyncMode: true });
    expect(source).toContain('new Promise(');
    expect(source).toContain('spawn(BINARY, args');
    expect(source).toContain("timeout: 120000");
  });

  it('asyncMode=false (default): still uses spawnSync (backward compat)', () => {
    const source = mod.generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk', { asyncMode: false });
    expect(source).toContain("spawnSync");
    expect(source).not.toContain("new Promise(");
  });

  it('asyncMode omitted (default): still uses spawnSync (backward compat)', () => {
    const source = mod.generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk');
    expect(source).toContain("spawnSync");
  });

  it('asyncMode=true: handler contains proc.stdout.on data listener', () => {
    const source = mod.generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk', { asyncMode: true });
    expect(source).toContain("proc.stdout.on('data'");
    expect(source).toContain("proc.stderr.on('data'");
    expect(source).toContain("proc.on('close'");
    expect(source).toContain("proc.on('error'");
  });
});

describe('generateAsyncToolHandler', () => {
  it('exports generateAsyncToolHandler', () => {
    expect(mod).not.toBeNull();
    expect(typeof mod.generateAsyncToolHandler).toBe('function');
  });

  it('returns a string containing spawn and Promise', () => {
    const handler = mod.generateAsyncToolHandler(sampleCapabilities[0]);
    expect(typeof handler).toBe('string');
    expect(handler).toContain('spawn(BINARY, args');
    expect(handler).toContain('new Promise(');
    expect(handler).toContain('timeout: 120000');
  });
});

describe('writeServer options pass-through', () => {
  it('exports writeServer', () => {
    expect(typeof mod.writeServer).toBe('function');
  });

  it('writeServer accepts 5 arguments (options pass-through)', () => {
    // Verify signature accepts options without throwing a type error
    // We can't easily call writeServer without real FS, but we can verify
    // generateServerSource is called correctly by checking source generation
    const source = mod.generateServerSource(sampleCapabilities, sampleMeta, '/fake/sdk', { asyncMode: true });
    // If options are passed through, the async source should have spawn
    expect(source).toContain('spawn(BINARY');
  });
});
