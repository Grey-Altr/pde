/**
 * tests/phase-171/app-discovery.test.mjs
 * Tests for bin/lib/app-discovery.cjs (DISC-01, DISC-03, DISC-05)
 *
 * All subprocess calls are mocked via dependency injection (_fns).
 * No real binary probing or subprocess calls.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let mod;

// Load the CJS module
try {
  mod = require('../../bin/lib/app-discovery.cjs');
} catch (_) {
  mod = null;
}

// ---------------------------------------------------------------------------
// probeBinary
// ---------------------------------------------------------------------------
describe('probeBinary', () => {
  it('Tier 1: returns env var path when env is set and file exists', () => {
    const appDef = { slug: 'blender', cli: 'Blender', envVar: 'BLENDER_BIN' };
    const result = mod.probeBinary(appDef, {
      env: { BLENDER_BIN: '/custom/blender' },
      existsFn: vi.fn().mockReturnValue(true),
      execFn: vi.fn(),
      spawnFn: vi.fn(),
      platform: 'darwin',
      homedir: '/Users/test',
    });
    expect(result).toEqual({ tier: 1, path: '/custom/blender', source: 'env:BLENDER_BIN' });
  });

  it('Tier 2: returns which result when env var not set', () => {
    const appDef = { slug: 'blender', cli: 'Blender', envVar: 'BLENDER_BIN' };
    const existsFn = vi.fn().mockReturnValue(true);
    const execFn = vi.fn().mockReturnValue('/usr/bin/blender\n');
    const result = mod.probeBinary(appDef, {
      env: {},
      existsFn,
      execFn,
      spawnFn: vi.fn(),
      platform: 'linux',
      homedir: '/home/test',
    });
    expect(result).toEqual({ tier: 2, path: '/usr/bin/blender', source: 'which' });
  });

  it('Tier 3: returns pip module path when which fails', () => {
    const appDef = { slug: 'rembg', cli: 'rembg', envVar: 'REMBG_BIN', pipModule: 'rembg' };
    const execFn = vi.fn().mockImplementation(() => { throw new Error('not found'); });
    const spawnFn = vi.fn().mockReturnValue({
      stdout: '/path/to/rembg/__init__.py\n',
      status: 0,
    });
    const result = mod.probeBinary(appDef, {
      env: {},
      existsFn: vi.fn().mockReturnValue(false),
      execFn,
      spawnFn,
      platform: 'linux',
      homedir: '/home/test',
    });
    expect(result).toEqual({
      tier: 3,
      path: 'python3 -m rembg',
      source: 'pip-module',
      pyOrigin: '/path/to/rembg/__init__.py',
    });
  });

  it('Tier 4: returns mdfind resolved binary path on macOS', () => {
    const appDef = {
      slug: 'blender',
      cli: 'Blender',
      envVar: 'BLENDER_BIN',
      bundleId: 'org.blenderfoundation.blender',
    };
    const execFn = vi.fn().mockImplementation((cmd, args) => {
      if (cmd === 'which' || cmd === 'where.exe') throw new Error('not found');
      if (cmd === 'mdfind') return '/Applications/Blender.app\n';
      if (cmd === 'plutil') return JSON.stringify({ CFBundleExecutable: 'Blender' });
      return '';
    });
    const existsFn = vi.fn().mockImplementation((p) => {
      // Info.plist and resolved binary both exist
      if (p.includes('Info.plist')) return true;
      if (p.includes('Contents/MacOS/Blender')) return true;
      return false;
    });
    const result = mod.probeBinary(appDef, {
      env: {},
      existsFn,
      execFn,
      spawnFn: vi.fn().mockReturnValue({ stdout: '', status: 1 }),
      platform: 'darwin',
      homedir: '/Users/test',
    });
    expect(result).toEqual({
      tier: 4,
      path: '/Applications/Blender.app/Contents/MacOS/Blender',
      source: 'mdfind',
      appBundle: '/Applications/Blender.app',
    });
  });

  it('Tier 5: returns well-known path when all prior tiers fail', () => {
    const appDef = {
      slug: 'inkscape',
      cli: 'inkscape',
      envVar: 'INKSCAPE_BIN',
      wellKnownPaths: { darwin: ['/usr/bin/inkscape'] },
    };
    const execFn = vi.fn().mockImplementation(() => { throw new Error('not found'); });
    const spawnFn = vi.fn().mockReturnValue({ stdout: '', status: 1 });
    const existsFn = vi.fn().mockImplementation((p) => p === '/usr/bin/inkscape');
    const result = mod.probeBinary(appDef, {
      env: {},
      existsFn,
      execFn,
      spawnFn,
      platform: 'darwin',
      homedir: '/Users/test',
    });
    expect(result).toEqual({ tier: 5, path: '/usr/bin/inkscape', source: 'well-known' });
  });

  it('returns null when all five tiers fail', () => {
    const appDef = {
      slug: 'blender',
      cli: 'Blender',
      envVar: 'BLENDER_BIN',
      wellKnownPaths: { darwin: ['/opt/blender'] },
    };
    const execFn = vi.fn().mockImplementation(() => { throw new Error('not found'); });
    const spawnFn = vi.fn().mockReturnValue({ stdout: '', status: 1 });
    const existsFn = vi.fn().mockReturnValue(false);
    const result = mod.probeBinary(appDef, {
      env: {},
      existsFn,
      execFn,
      spawnFn,
      platform: 'darwin',
      homedir: '/Users/test',
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// executionMode classification
// ---------------------------------------------------------------------------
describe('executionMode classification', () => {
  it('sets executionMode to mock when probeBinary returns null', () => {
    const spawnFn = vi.fn().mockImplementation((cmd) => {
      if (cmd === 'ps') return { stdout: 'WindowServer\n', status: 0 };
      // python3 pip check returns 'none' (not found)
      return { stdout: 'none\n', status: 0 };
    });
    const result = mod.discoverApp('blender', {
      env: {},
      existsFn: vi.fn().mockReturnValue(false),
      execFn: vi.fn().mockImplementation(() => { throw new Error('not found'); }),
      spawnFn,
      platform: 'darwin',
      homedir: '/Users/test',
    });
    expect(result.executionMode).toBe('mock');
    expect(result.binaryPath).toBeNull();
  });

  it('sets executionMode from catalog when probe succeeds for headless app', () => {
    const result = mod.discoverApp('blender', {
      env: { BLENDER_BIN: '/usr/bin/blender' },
      existsFn: vi.fn().mockReturnValue(true),
      execFn: vi.fn(),
      spawnFn: vi.fn().mockReturnValue({ stdout: 'WindowServer\n', status: 0 }),
      platform: 'darwin',
      homedir: '/Users/test',
    });
    expect(result.executionMode).toBe('headless');
    expect(result.binaryPath).toBe('/usr/bin/blender');
  });
});

// ---------------------------------------------------------------------------
// probeDisplay
// ---------------------------------------------------------------------------
describe('probeDisplay', () => {
  it('macOS: detects WindowServer from ps aux output', () => {
    const spawnFn = vi.fn().mockReturnValue({
      stdout: 'root  123  WindowServer\nuser  456  some-app\n',
      stderr: '',
      status: 0,
    });
    const result = mod.probeDisplay({ platform: 'darwin', env: {}, spawnFn });
    expect(result).toEqual({ available: true, method: 'ps-WindowServer' });
  });

  it('macOS: returns unavailable when WindowServer not in ps output', () => {
    const spawnFn = vi.fn().mockReturnValue({
      stdout: 'user  456  some-app\nuser  789  another-app\n',
      stderr: '',
      status: 0,
    });
    const result = mod.probeDisplay({ platform: 'darwin', env: {}, spawnFn });
    expect(result).toEqual({ available: false, method: 'ps-WindowServer' });
  });

  it('Linux: detects DISPLAY env variable', () => {
    const result = mod.probeDisplay({
      platform: 'linux',
      env: { DISPLAY: ':0' },
      spawnFn: vi.fn(),
    });
    expect(result).toEqual({ available: true, method: 'env-DISPLAY' });
  });

  it('Linux: returns unavailable when no display env vars set', () => {
    const result = mod.probeDisplay({
      platform: 'linux',
      env: {},
      spawnFn: vi.fn(),
    });
    expect(result).toEqual({ available: false, method: 'env-DISPLAY' });
  });

  it('win32: always returns available', () => {
    const result = mod.probeDisplay({
      platform: 'win32',
      env: {},
      spawnFn: vi.fn(),
    });
    expect(result).toEqual({ available: true, method: 'win32-assumed' });
  });
});
