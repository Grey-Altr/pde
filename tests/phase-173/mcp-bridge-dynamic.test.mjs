/**
 * tests/phase-173/mcp-bridge-dynamic.test.mjs
 * TDD tests for mcp-bridge.cjs dynamic server registration (REG-01, REG-04)
 *
 * Tests: loadDynamicServers, registerDynamicServer, extended assertApproved
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const bridge = require('../../bin/lib/mcp-bridge.cjs');
const {
  loadDynamicServers,
  registerDynamicServer,
  assertApproved,
  DYNAMIC_SERVERS,
  TOOL_MAP,
  call,
} = bridge;

// ─── Test helpers ─────────────────────────────────────────────────────────────

let tempDir;

function createMockRegistry(entries) {
  return JSON.stringify({ entries });
}

function createMockCapabilityModel(slug, capabilities) {
  return JSON.stringify({
    meta: { source: `/usr/bin/${slug}`, type: 'cli', version: '1.0.0' },
    capabilities,
  });
}

function createMockWrapperMetadata(startupMs = 5000) {
  return JSON.stringify({ startupMs, asyncRequired: false });
}

function setupTempDir(slug, registryEntries, capabilities, wrapperMeta) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  const registryPath = path.join(dir, 'registry.json');
  fs.writeFileSync(registryPath, createMockRegistry(registryEntries));

  if (capabilities !== null) {
    const appWrapperDir = path.join(dir, 'app-wrappers', slug);
    fs.mkdirSync(appWrapperDir, { recursive: true });
    fs.writeFileSync(
      path.join(appWrapperDir, 'capability-model.json'),
      createMockCapabilityModel(slug, capabilities)
    );
    if (wrapperMeta !== undefined) {
      fs.writeFileSync(
        path.join(appWrapperDir, 'wrapper-metadata.json'),
        createMockWrapperMetadata(wrapperMeta)
      );
    }
  }

  return { dir, registryPath };
}

function cleanupDynamic(slugs) {
  for (const slug of slugs) {
    delete DYNAMIC_SERVERS[slug];
    // Remove any TOOL_MAP entries that start with slug:
    for (const key of Object.keys(TOOL_MAP)) {
      if (key.startsWith(`${slug}:`)) {
        delete TOOL_MAP[key];
      }
    }
  }
}

beforeEach(() => {
  tempDir = null;
});

afterEach(() => {
  // Clean up any dynamic registrations added in tests
  cleanupDynamic(['blender', 'gimp', 'rembg', 'testapp', 'myapp']);
  // Clean up temp dirs
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ─── loadDynamicServers tests ─────────────────────────────────────────────────

describe('loadDynamicServers', () => {
  it('populates DYNAMIC_SERVERS[slug] and TOOL_MAP for an approved entry', () => {
    const { dir, registryPath } = setupTempDir(
      'blender',
      [{ slug: 'blender', displayName: 'Blender', status: 'approved', binaryPath: '/usr/bin/blender', executionMode: 'headless' }],
      [{ name: 'blender_render', description: 'Render a scene' }]
    );
    tempDir = dir;

    // Manually override the path resolution by providing registryPath
    // loadDynamicServers needs to resolve app-wrappers relative to registry dir
    loadDynamicServers(registryPath, dir);

    expect(DYNAMIC_SERVERS['blender']).toBeDefined();
    expect(TOOL_MAP['blender:blender-render']).toBe('mcp__app_blender__blender_render');
  });

  it('skips pending entries — DYNAMIC_SERVERS and TOOL_MAP unchanged for that slug', () => {
    const { dir, registryPath } = setupTempDir(
      'gimp',
      [{ slug: 'gimp', displayName: 'GIMP', status: 'pending', binaryPath: '/usr/bin/gimp', executionMode: 'headless' }],
      [{ name: 'gimp_edit', description: 'Edit an image' }]
    );
    tempDir = dir;

    loadDynamicServers(registryPath, dir);

    expect(DYNAMIC_SERVERS['gimp']).toBeUndefined();
    expect(TOOL_MAP['gimp:gimp-edit']).toBeUndefined();
  });

  it('skips rejected entries — DYNAMIC_SERVERS and TOOL_MAP unchanged for that slug', () => {
    const { dir, registryPath } = setupTempDir(
      'rembg',
      [{ slug: 'rembg', displayName: 'Rembg', status: 'rejected', binaryPath: '/usr/bin/rembg', executionMode: 'headless' }],
      [{ name: 'rembg_remove', description: 'Remove background' }]
    );
    tempDir = dir;

    loadDynamicServers(registryPath, dir);

    expect(DYNAMIC_SERVERS['rembg']).toBeUndefined();
    expect(TOOL_MAP['rembg:rembg-remove']).toBeUndefined();
  });

  it('returns without error when registry file does not exist', () => {
    expect(() => {
      loadDynamicServers('/nonexistent/path/registry.json');
    }).not.toThrow();
  });

  it('returns without error when registry JSON is malformed (corrupt)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    tempDir = dir;
    const registryPath = path.join(dir, 'registry.json');
    fs.writeFileSync(registryPath, '{ not valid json !!');

    expect(() => {
      loadDynamicServers(registryPath, dir);
    }).not.toThrow();
  });

  it('adds DYNAMIC_SERVERS entry but no TOOL_MAP tools when capability-model.json is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    tempDir = dir;
    const registryPath = path.join(dir, 'registry.json');
    fs.writeFileSync(registryPath, createMockRegistry([
      { slug: 'blender', displayName: 'Blender', status: 'approved', binaryPath: '/usr/bin/blender', executionMode: 'headless' }
    ]));
    // No capability-model.json created — just registry

    loadDynamicServers(registryPath, dir);

    expect(DYNAMIC_SERVERS['blender']).toBeDefined();
    // No tools should be in TOOL_MAP since capability-model.json is missing
    const blenderTools = Object.keys(TOOL_MAP).filter(k => k.startsWith('blender:'));
    expect(blenderTools).toHaveLength(0);
  });

  it('DYNAMIC_SERVERS entry has correct shape with all required fields', () => {
    const { dir, registryPath } = setupTempDir(
      'blender',
      [{ slug: 'blender', displayName: 'Blender', status: 'approved', binaryPath: '/usr/bin/blender', executionMode: 'headless' }],
      [{ name: 'blender_render', description: 'Render a scene' }],
      8000
    );
    tempDir = dir;

    loadDynamicServers(registryPath, dir);

    const entry = DYNAMIC_SERVERS['blender'];
    expect(entry).toBeDefined();
    expect(entry.displayName).toBe('Blender');
    expect(entry.transport).toBe('stdio');
    expect(typeof entry.serverPath).toBe('string');
    expect(entry.probeTimeoutMs).toBe(8000);
    expect(entry.probeTool).toBe('mcp__app_blender__probe');
    expect(entry.probeArgs).toEqual({});
  });
});

// ─── registerDynamicServer tests ─────────────────────────────────────────────

describe('registerDynamicServer', () => {
  it('adds DYNAMIC_SERVERS entry and TOOL_MAP entries for a single app', () => {
    registerDynamicServer('blender', '/path/server.cjs', [{ name: 'blender_render' }]);

    expect(DYNAMIC_SERVERS['blender']).toBeDefined();
    expect(TOOL_MAP['blender:blender-render']).toBe('mcp__app_blender__blender_render');
  });

  it('is idempotent — calling twice with same slug overwrites without error', () => {
    registerDynamicServer('blender', '/path/v1/server.cjs', [{ name: 'blender_render' }]);
    registerDynamicServer('blender', '/path/v2/server.cjs', [{ name: 'blender_render' }]);

    expect(DYNAMIC_SERVERS['blender'].serverPath).toBe('/path/v2/server.cjs');
    expect(TOOL_MAP['blender:blender-render']).toBe('mcp__app_blender__blender_render');
  });

  it('throws when slug is empty string', () => {
    expect(() => {
      registerDynamicServer('', '/path/server.cjs', []);
    }).toThrow();
  });

  it('throws when slug is missing (undefined)', () => {
    expect(() => {
      registerDynamicServer(undefined, '/path/server.cjs', []);
    }).toThrow();
  });

  it('throws when caps is not an array', () => {
    expect(() => {
      registerDynamicServer('blender', '/path/server.cjs', 'not-an-array');
    }).toThrow();
  });

  it('TOOL_MAP entry uses mcp__app_{slug}__{cap_name} pattern with app_ prefix', () => {
    registerDynamicServer('blender', '/path/server.cjs', [{ name: 'blender_render' }]);

    expect(TOOL_MAP['blender:blender-render']).toBe('mcp__app_blender__blender_render');
  });

  it('converts underscore cap names to hyphen canonical names in TOOL_MAP keys', () => {
    registerDynamicServer('testapp', '/path/server.cjs', [{ name: 'my_tool_name' }]);

    expect(TOOL_MAP['testapp:my-tool-name']).toBe('mcp__app_testapp__my_tool_name');
  });

  it('DYNAMIC_SERVERS entry has correct shape after registration', () => {
    registerDynamicServer('myapp', '/path/to/server.cjs', [{ name: 'do_thing' }], { displayName: 'My App', startupMs: 3000 });

    const entry = DYNAMIC_SERVERS['myapp'];
    expect(entry.displayName).toBe('My App');
    expect(entry.transport).toBe('stdio');
    expect(entry.serverPath).toBe('/path/to/server.cjs');
    expect(entry.probeTimeoutMs).toBe(3000);
    expect(entry.probeTool).toBe('mcp__app_myapp__probe');
    expect(entry.probeArgs).toEqual({});
  });
});

// ─── call() integration tests ─────────────────────────────────────────────────

describe('call() with dynamic servers', () => {
  it('call("blender:blender-render") returns correct toolName after registerDynamicServer', () => {
    registerDynamicServer('blender', '/path/server.cjs', [{ name: 'blender_render' }]);

    const result = call('blender:blender-render', { scene: 'test.blend' });
    expect(result.toolName).toBe('mcp__app_blender__blender_render');
    expect(result.args).toEqual({ scene: 'test.blend' });
  });
});

// ─── assertApproved extension tests ───────────────────────────────────────────

describe('assertApproved with dynamic servers', () => {
  it('does NOT throw for a key added via registerDynamicServer', () => {
    registerDynamicServer('blender', '/path/server.cjs', []);

    expect(() => assertApproved('blender')).not.toThrow();
  });

  it('throws POLICY_VIOLATION for keys not in APPROVED_SERVERS or DYNAMIC_SERVERS', () => {
    let err;
    try {
      assertApproved('unknown-server-xyz-404');
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe('POLICY_VIOLATION');
  });

  it('assertApproved still allows static APPROVED_SERVERS entries', () => {
    // 'github' is in APPROVED_SERVERS — should pass regardless of DYNAMIC_SERVERS
    expect(() => assertApproved('github')).not.toThrow();
  });
});
