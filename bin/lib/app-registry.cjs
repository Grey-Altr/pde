'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Default I/O functions (overridable via _fns for testing)
// ---------------------------------------------------------------------------

function defaultReadFn(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function defaultWriteFn(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data, 'utf8');
}

function defaultHashFn(binaryPath) {
  const content = fs.readFileSync(binaryPath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ---------------------------------------------------------------------------
// loadRegistry
// ---------------------------------------------------------------------------

/**
 * Load the app registry from disk. Returns empty registry if file missing.
 * @param {string} registryPath - Path to app-registry.json
 * @param {object} [_fns] - Injectable functions for testing
 * @returns {{ version: number, entries: Array }}
 */
function loadRegistry(registryPath, _fns = {}) {
  const { readFn = defaultReadFn } = _fns;
  try {
    const raw = readFn(registryPath);
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { entries: [], version: 1 };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// saveRegistry
// ---------------------------------------------------------------------------

/**
 * Persist registry to disk as JSON with 2-space indent.
 * @param {string} registryPath
 * @param {object} registry
 * @param {object} [_fns]
 */
function saveRegistry(registryPath, registry, _fns = {}) {
  const { writeFn = defaultWriteFn } = _fns;
  writeFn(registryPath, JSON.stringify(registry, null, 2));
}

// ---------------------------------------------------------------------------
// addPendingEntry
// ---------------------------------------------------------------------------

/**
 * Add or update a pending entry from a discovery result.
 * Status always resets to 'pending', binaryHash set to null.
 * @param {string} registryPath
 * @param {object} discoveryResult
 * @param {object} [_fns]
 */
function addPendingEntry(registryPath, discoveryResult, _fns = {}) {
  const reg = loadRegistry(registryPath, _fns);

  const entry = {
    slug: discoveryResult.slug,
    displayName: discoveryResult.displayName,
    binaryPath: discoveryResult.binaryPath,
    version: discoveryResult.version || null,
    executionMode: discoveryResult.executionMode,
    status: 'pending',
    binaryHash: null,
    probeSource: discoveryResult.probeSource,
    displayProbe: discoveryResult.displayProbe,
    parseQuality: discoveryResult.parseQuality,
    discoveredAt: new Date().toISOString(),
    approvedAt: null,
    rejectedAt: null,
  };

  const idx = reg.entries.findIndex((e) => e.slug === discoveryResult.slug);
  if (idx >= 0) {
    reg.entries[idx] = entry;
  } else {
    reg.entries.push(entry);
  }

  saveRegistry(registryPath, reg, _fns);
}

// ---------------------------------------------------------------------------
// approveEntry
// ---------------------------------------------------------------------------

/**
 * Approve a registry entry: set status='approved', compute SHA-256 hash.
 * @param {string} registryPath
 * @param {string} slug
 * @param {object} [_fns]
 */
function approveEntry(registryPath, slug, _fns = {}) {
  const { hashFn = defaultHashFn } = _fns;
  const reg = loadRegistry(registryPath, _fns);

  const entry = reg.entries.find((e) => e.slug === slug);
  if (!entry) {
    throw new Error(
      `App "${slug}" not found in registry.\nRun: pde-tools app discover to add it.`
    );
  }

  entry.status = 'approved';
  entry.binaryHash = hashFn(entry.binaryPath);
  entry.approvedAt = new Date().toISOString();

  saveRegistry(registryPath, reg, _fns);
}

// ---------------------------------------------------------------------------
// rejectEntry
// ---------------------------------------------------------------------------

/**
 * Reject a registry entry: set status='rejected'.
 * @param {string} registryPath
 * @param {string} slug
 * @param {object} [_fns]
 */
function rejectEntry(registryPath, slug, _fns = {}) {
  const reg = loadRegistry(registryPath, _fns);

  const entry = reg.entries.find((e) => e.slug === slug);
  if (!entry) {
    throw new Error(
      `App "${slug}" not found in registry.\nRun: pde-tools app discover to add it.`
    );
  }

  entry.status = 'rejected';
  entry.rejectedAt = new Date().toISOString();

  saveRegistry(registryPath, reg, _fns);
}

// ---------------------------------------------------------------------------
// checkApproved
// ---------------------------------------------------------------------------

/**
 * Guard: returns the entry only if approved and non-mock.
 * Throws with actionable error messages otherwise.
 * @param {string} registryPath
 * @param {string} slug
 * @param {object} [_fns]
 * @returns {object} The approved entry
 */
function checkApproved(registryPath, slug, _fns = {}) {
  const reg = loadRegistry(registryPath, _fns);

  const entry = reg.entries.find((e) => e.slug === slug);
  if (!entry) {
    throw new Error(
      `App "${slug}" not found in registry.\nRun: pde-tools app discover to add it.`
    );
  }

  if (entry.executionMode === 'mock') {
    throw new Error(
      `App "${slug}" has executionMode "mock" - binary not installed or not resolvable.\nInstall the app and re-run: pde-tools app discover`
    );
  }

  if (entry.status !== 'approved') {
    throw new Error(
      `App "${slug}" has status "${entry.status}" - cannot invoke.\nRun: pde-tools app approve ${slug} to grant execution permission.`
    );
  }

  return entry;
}

// ---------------------------------------------------------------------------
// verifyBinaryHash
// ---------------------------------------------------------------------------

/**
 * Compare current binary SHA-256 against stored hash.
 * @param {string} binaryPath
 * @param {string} expectedHash
 * @param {object} [_fns]
 * @returns {{ ok: boolean, actual: string, expected: string } | { ok: false, error: string }}
 */
function verifyBinaryHash(binaryPath, expectedHash, _fns = {}) {
  const { hashFn = defaultHashFn } = _fns;
  try {
    const actual = hashFn(binaryPath);
    return {
      ok: actual === expectedHash,
      actual,
      expected: expectedHash,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// getEntry
// ---------------------------------------------------------------------------

/**
 * Get a single registry entry by slug, or null if not found.
 * @param {string} registryPath
 * @param {string} slug
 * @param {object} [_fns]
 * @returns {object|null}
 */
function getEntry(registryPath, slug, _fns = {}) {
  const reg = loadRegistry(registryPath, _fns);
  return reg.entries.find((e) => e.slug === slug) || null;
}

// ---------------------------------------------------------------------------
// listEntries
// ---------------------------------------------------------------------------

/**
 * List all registry entries, optionally filtered by status.
 * @param {string} registryPath
 * @param {object} [_fns]
 * @param {string} [status] - Optional status filter
 * @returns {Array}
 */
function listEntries(registryPath, _fns = {}, status) {
  const reg = loadRegistry(registryPath, _fns);
  if (status) {
    return reg.entries.filter((e) => e.status === status);
  }
  return reg.entries;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  loadRegistry,
  saveRegistry,
  addPendingEntry,
  approveEntry,
  rejectEntry,
  checkApproved,
  verifyBinaryHash,
  getEntry,
  listEntries,
};
