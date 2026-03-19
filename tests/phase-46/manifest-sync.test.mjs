/**
 * manifest-sync.test.mjs
 * Tests: classifyFile logic for update workflow integration.
 * - Stock file (hash matches manifest) returns auto-update
 * - User-modified file (hash differs from manifest) returns preserve
 * - Missing manifest entry returns preserve (conservative)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { classifyFile } = require('../../bin/lib/manifest.cjs');

const STOCK_HASH = 'a'.repeat(64);
const MODIFIED_HASH = 'b'.repeat(64);
const KNOWN_PATH = 'workflows/execute-phase.md';

const MANIFEST_ENTRIES = [
  { path: KNOWN_PATH, sha256: STOCK_HASH, source: 'stock', last_updated: '2026-03-19' },
  { path: 'references/quality-standards.md', sha256: STOCK_HASH, source: 'stock', last_updated: '2026-03-19' },
];

test('stock file (hash matches manifest) returns auto-update', () => {
  const result = classifyFile(KNOWN_PATH, MANIFEST_ENTRIES, STOCK_HASH);
  assert.strictEqual(result.action, 'auto-update', 'unmodified file should be auto-updated');
  assert.strictEqual(result.reason, 'unmodified');
});

test('user-modified file (hash differs from manifest) returns preserve', () => {
  const result = classifyFile(KNOWN_PATH, MANIFEST_ENTRIES, MODIFIED_HASH);
  assert.strictEqual(result.action, 'preserve', 'modified file should be preserved');
  assert.strictEqual(result.reason, 'user-modified');
});

test('file with no manifest entry returns preserve (conservative)', () => {
  const result = classifyFile('workflows/brand-new-file.md', MANIFEST_ENTRIES, STOCK_HASH);
  assert.strictEqual(result.action, 'preserve', 'unknown file should be preserved conservatively');
  assert.strictEqual(result.reason, 'no-manifest-entry');
});

test('references file (hash matches manifest) returns auto-update', () => {
  const result = classifyFile('references/quality-standards.md', MANIFEST_ENTRIES, STOCK_HASH);
  assert.strictEqual(result.action, 'auto-update');
  assert.strictEqual(result.reason, 'unmodified');
});

test('references file (hash differs) returns preserve', () => {
  const result = classifyFile('references/quality-standards.md', MANIFEST_ENTRIES, MODIFIED_HASH);
  assert.strictEqual(result.action, 'preserve');
  assert.strictEqual(result.reason, 'user-modified');
});

test('empty manifest entries returns preserve for any file', () => {
  const result = classifyFile('workflows/execute-phase.md', [], STOCK_HASH);
  assert.strictEqual(result.action, 'preserve');
  assert.strictEqual(result.reason, 'no-manifest-entry');
});
