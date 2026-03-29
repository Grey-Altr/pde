/**
 * tests/phase-175/probe-app-tool.test.mjs
 * Tests for bin/lib/design-pipeline/probe-app-tool.cjs (PIPE-01)
 *
 * probeAppTool never throws — always returns { available, reason, entry }
 * for all registry states: missing file, pending, mock, headless-approved, unknown slug.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

let probeAppTool;
try {
  ({ probeAppTool } = require('../../bin/lib/design-pipeline/probe-app-tool.cjs'));
} catch (_) {
  probeAppTool = null;
}

// Helper: write a registry file with given entries
function makeRegistryFile(tmpDir, entries) {
  const registryPath = path.join(tmpDir, 'app-registry.json');
  const registry = { version: 1, entries };
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  return registryPath;
}

function makeBlenderEntry(overrides = {}) {
  return {
    slug: 'blender',
    displayName: 'Blender',
    binaryPath: '/usr/bin/blender',
    version: '4.0',
    executionMode: 'headless',
    status: 'approved',
    binaryHash: 'abc123',
    probeSource: { tier: 2, source: 'which' },
    displayProbe: { available: true, method: 'ps-WindowServer' },
    parseQuality: 'clean',
    discoveredAt: '2026-03-29T12:00:00.000Z',
    approvedAt: '2026-03-29T12:01:00.000Z',
    rejectedAt: null,
    ...overrides,
  };
}

describe('probeAppTool', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('returns available=false when registry file is missing', () => {
    const nonExistentPath = path.join(tmpDir, 'nonexistent', 'app-registry.json');
    const result = probeAppTool('blender', nonExistentPath);
    expect(result).toBeDefined();
    expect(result.available).toBe(false);
    expect(result.entry).toBeNull();
    expect(result.reason).toBeTruthy();
  });

  it('returns available=false when status is pending', () => {
    const registryPath = makeRegistryFile(tmpDir, [
      makeBlenderEntry({ status: 'pending', approvedAt: null }),
    ]);
    const result = probeAppTool('blender', registryPath);
    expect(result.available).toBe(false);
    expect(result.entry).toBeNull();
    expect(result.reason).toMatch(/pending/i);
  });

  it('returns available=false when executionMode is mock', () => {
    const registryPath = makeRegistryFile(tmpDir, [
      makeBlenderEntry({ executionMode: 'mock', status: 'approved' }),
    ]);
    const result = probeAppTool('blender', registryPath);
    expect(result.available).toBe(false);
    expect(result.entry).toBeNull();
    expect(result.reason).toMatch(/mock/i);
  });

  it('returns available=true with entry when status=approved and executionMode=headless', () => {
    const registryPath = makeRegistryFile(tmpDir, [
      makeBlenderEntry({ status: 'approved', executionMode: 'headless' }),
    ]);
    const result = probeAppTool('blender', registryPath);
    expect(result.available).toBe(true);
    expect(result.reason).toBe('approved');
    expect(result.entry).toBeTruthy();
    expect(result.entry.binaryPath).toBe('/usr/bin/blender');
    expect(result.entry.version).toBe('4.0');
    expect(result.entry.executionMode).toBe('headless');
  });

  it('returns available=false when slug not found in registry', () => {
    const registryPath = makeRegistryFile(tmpDir, [
      makeBlenderEntry({ slug: 'gimp', binaryPath: '/usr/bin/gimp' }),
    ]);
    const result = probeAppTool('nonexistent-app', registryPath);
    expect(result.available).toBe(false);
    expect(result.entry).toBeNull();
    expect(result.reason).toBeTruthy();
  });
});
