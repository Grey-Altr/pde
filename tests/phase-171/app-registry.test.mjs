/**
 * tests/phase-171/app-registry.test.mjs
 * Tests for bin/lib/app-registry.cjs (DISC-02)
 *
 * Two-tier approval registry: pending/approved/rejected state machine,
 * SHA-256 hash verification at approval time, checkApproved guard.
 *
 * All fs and crypto operations mocked via _fns dependency injection.
 * No real file I/O or binary hashing.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let registry;

// Load the CJS module
try {
  registry = require('../../bin/lib/app-registry.cjs');
} catch (_) {
  registry = null;
}

// Helper: create a mock discovery result
function makeDiscoveryResult(overrides = {}) {
  return {
    slug: 'blender',
    displayName: 'Blender',
    binaryPath: '/usr/bin/blender',
    version: '4.2.0',
    executionMode: 'headless',
    probeSource: { tier: 2, source: 'which' },
    displayProbe: { available: true, method: 'ps-WindowServer' },
    parseQuality: 'clean',
    ...overrides,
  };
}

// Helper: create a registry with one entry
function makeRegistry(entryOverrides = {}) {
  return {
    version: 1,
    entries: [
      {
        slug: 'blender',
        displayName: 'Blender',
        binaryPath: '/usr/bin/blender',
        version: '4.2.0',
        executionMode: 'headless',
        status: 'pending',
        binaryHash: null,
        probeSource: { tier: 2, source: 'which' },
        displayProbe: { available: true, method: 'ps-WindowServer' },
        parseQuality: 'clean',
        discoveredAt: '2026-03-29T12:00:00.000Z',
        approvedAt: null,
        rejectedAt: null,
        ...entryOverrides,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// loadRegistry
// ---------------------------------------------------------------------------
describe('loadRegistry', () => {
  it('returns empty registry when file is missing (ENOENT)', () => {
    const readFn = vi.fn().mockImplementation(() => {
      const err = new Error('ENOENT: no such file');
      err.code = 'ENOENT';
      throw err;
    });
    const result = registry.loadRegistry('/fake/path.json', { readFn });
    expect(result).toEqual({ entries: [], version: 1 });
  });

  it('parses valid JSON registry file', () => {
    const data = makeRegistry();
    const readFn = vi.fn().mockReturnValue(JSON.stringify(data));
    const result = registry.loadRegistry('/fake/path.json', { readFn });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].slug).toBe('blender');
    expect(result.version).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// addPendingEntry
// ---------------------------------------------------------------------------
describe('addPendingEntry', () => {
  it('creates a pending entry with binaryHash null', () => {
    const readFn = vi.fn().mockImplementation(() => {
      const err = new Error('ENOENT');
      err.code = 'ENOENT';
      throw err;
    });
    const writeFn = vi.fn();
    const discovery = makeDiscoveryResult();

    registry.addPendingEntry('/fake/path.json', discovery, { readFn, writeFn });

    expect(writeFn).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(writeFn.mock.calls[0][1]);
    const entry = saved.entries[0];

    expect(entry.slug).toBe('blender');
    expect(entry.displayName).toBe('Blender');
    expect(entry.binaryPath).toBe('/usr/bin/blender');
    expect(entry.executionMode).toBe('headless');
    expect(entry.status).toBe('pending');
    expect(entry.binaryHash).toBeNull();
    expect(entry.approvedAt).toBeNull();
    expect(entry.rejectedAt).toBeNull();
    expect(typeof entry.discoveredAt).toBe('string');
    // discoveredAt should be an ISO date string
    expect(new Date(entry.discoveredAt).toISOString()).toBe(entry.discoveredAt);
  });

  it('updates existing entry on re-discover without duplication', () => {
    const existingRegistry = makeRegistry();
    const readFn = vi.fn().mockReturnValue(JSON.stringify(existingRegistry));
    const writeFn = vi.fn();
    const discovery = makeDiscoveryResult({ binaryPath: '/opt/blender/blender' });

    registry.addPendingEntry('/fake/path.json', discovery, { readFn, writeFn });

    const saved = JSON.parse(writeFn.mock.calls[0][1]);
    // Should not duplicate - still one entry
    expect(saved.entries).toHaveLength(1);
    // Should update binaryPath
    expect(saved.entries[0].binaryPath).toBe('/opt/blender/blender');
    // Status should reset to pending
    expect(saved.entries[0].status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// approveEntry
// ---------------------------------------------------------------------------
describe('approveEntry', () => {
  it('sets status approved and hashes binary', () => {
    const existingRegistry = makeRegistry();
    const readFn = vi.fn().mockReturnValue(JSON.stringify(existingRegistry));
    const writeFn = vi.fn();
    const hashFn = vi.fn().mockReturnValue('abc123hash');

    registry.approveEntry('/fake/path.json', 'blender', { readFn, writeFn, hashFn });

    const saved = JSON.parse(writeFn.mock.calls[0][1]);
    const entry = saved.entries[0];

    expect(entry.status).toBe('approved');
    expect(entry.binaryHash).toBe('abc123hash');
    expect(typeof entry.approvedAt).toBe('string');
    expect(new Date(entry.approvedAt).toISOString()).toBe(entry.approvedAt);
    expect(hashFn).toHaveBeenCalledWith('/usr/bin/blender');
  });

  it('throws for unknown slug with discover hint', () => {
    const readFn = vi.fn().mockReturnValue(JSON.stringify({ version: 1, entries: [] }));
    const writeFn = vi.fn();
    const hashFn = vi.fn();

    expect(() => {
      registry.approveEntry('/fake/path.json', 'unknown-app', { readFn, writeFn, hashFn });
    }).toThrow(/not found/);
    expect(() => {
      registry.approveEntry('/fake/path.json', 'unknown-app', { readFn, writeFn, hashFn });
    }).toThrow(/pde-tools app discover/);
  });
});

// ---------------------------------------------------------------------------
// rejectEntry
// ---------------------------------------------------------------------------
describe('rejectEntry', () => {
  it('sets status rejected with timestamp', () => {
    const existingRegistry = makeRegistry();
    const readFn = vi.fn().mockReturnValue(JSON.stringify(existingRegistry));
    const writeFn = vi.fn();

    registry.rejectEntry('/fake/path.json', 'blender', { readFn, writeFn });

    const saved = JSON.parse(writeFn.mock.calls[0][1]);
    const entry = saved.entries[0];

    expect(entry.status).toBe('rejected');
    expect(typeof entry.rejectedAt).toBe('string');
    expect(new Date(entry.rejectedAt).toISOString()).toBe(entry.rejectedAt);
    expect(entry.binaryHash).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkApproved
// ---------------------------------------------------------------------------
describe('checkApproved', () => {
  it('returns entry for approved non-mock app', () => {
    const reg = makeRegistry({ status: 'approved', binaryHash: 'abc123', executionMode: 'headless' });
    const readFn = vi.fn().mockReturnValue(JSON.stringify(reg));

    const result = registry.checkApproved('/fake/path.json', 'blender', { readFn });
    expect(result.slug).toBe('blender');
    expect(result.status).toBe('approved');
  });

  it('throws for pending status with approve hint', () => {
    const reg = makeRegistry({ status: 'pending' });
    const readFn = vi.fn().mockReturnValue(JSON.stringify(reg));

    expect(() => {
      registry.checkApproved('/fake/path.json', 'blender', { readFn });
    }).toThrow(/pending/);
    expect(() => {
      registry.checkApproved('/fake/path.json', 'blender', { readFn });
    }).toThrow(/pde-tools app approve blender/);
  });

  it('throws for rejected status', () => {
    const reg = makeRegistry({ status: 'rejected' });
    const readFn = vi.fn().mockReturnValue(JSON.stringify(reg));

    expect(() => {
      registry.checkApproved('/fake/path.json', 'blender', { readFn });
    }).toThrow(/rejected/);
  });

  it('throws for mock executionMode with not-installed message', () => {
    const reg = makeRegistry({ status: 'approved', executionMode: 'mock', binaryHash: 'abc' });
    const readFn = vi.fn().mockReturnValue(JSON.stringify(reg));

    expect(() => {
      registry.checkApproved('/fake/path.json', 'blender', { readFn });
    }).toThrow(/mock/);
    expect(() => {
      registry.checkApproved('/fake/path.json', 'blender', { readFn });
    }).toThrow(/not installed/);
  });

  it('throws for unknown slug with discover hint', () => {
    const readFn = vi.fn().mockReturnValue(JSON.stringify({ version: 1, entries: [] }));

    expect(() => {
      registry.checkApproved('/fake/path.json', 'nonexistent', { readFn });
    }).toThrow(/not found/);
    expect(() => {
      registry.checkApproved('/fake/path.json', 'nonexistent', { readFn });
    }).toThrow(/pde-tools app discover/);
  });
});

// ---------------------------------------------------------------------------
// verifyBinaryHash
// ---------------------------------------------------------------------------
describe('verifyBinaryHash', () => {
  it('returns ok:true when hash matches', () => {
    const hashFn = vi.fn().mockReturnValue('sha256hashvalue');
    const result = registry.verifyBinaryHash('/usr/bin/blender', 'sha256hashvalue', { hashFn });
    expect(result.ok).toBe(true);
    expect(result.actual).toBe('sha256hashvalue');
    expect(result.expected).toBe('sha256hashvalue');
  });

  it('returns ok:false when hash differs', () => {
    const hashFn = vi.fn().mockReturnValue('newhashvalue');
    const result = registry.verifyBinaryHash('/usr/bin/blender', 'oldhashvalue', { hashFn });
    expect(result.ok).toBe(false);
    expect(result.actual).toBe('newhashvalue');
    expect(result.expected).toBe('oldhashvalue');
  });
});
