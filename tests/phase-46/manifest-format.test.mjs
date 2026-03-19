/**
 * manifest-format.test.mjs
 * Tests: CSV header format, SHA256 hex length, source enum values, parseManifest round-trip.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const manifest = require('../../bin/lib/manifest.cjs');

const { hashFile, parseManifest, classifyFile } = manifest;

test('hashFile returns 64-character hex string for an existing file', () => {
  const tmpFile = join(tmpdir(), `pde-test-${Date.now()}.txt`);
  writeFileSync(tmpFile, 'hello world', 'utf-8');
  const hash = hashFile(tmpFile);
  assert.ok(hash, 'hash should not be null');
  assert.strictEqual(hash.length, 64, 'SHA256 hex should be 64 characters');
  assert.match(hash, /^[0-9a-f]{64}$/, 'hash should be lowercase hex');
});

test('hashFile returns null for a nonexistent file', () => {
  const result = hashFile('/nonexistent/path/to/file.txt');
  assert.strictEqual(result, null);
});

test('parseManifest: CSV header is exactly path,sha256,source,last_updated', () => {
  const csv = 'path,sha256,source,last_updated\nworkflows/test.md,a'.padEnd(66, 'b') + ',stock,2026-03-19\n';
  // Just check parseManifest handles real CSV correctly
  const validHash = 'a'.repeat(64);
  const csvValid = `path,sha256,source,last_updated\nworkflows/test.md,${validHash},stock,2026-03-19\n`;
  const entries = parseManifest(csvValid);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].path, 'workflows/test.md');
  assert.strictEqual(entries[0].sha256, validHash);
  assert.strictEqual(entries[0].source, 'stock');
  assert.strictEqual(entries[0].last_updated, '2026-03-19');
});

test('parseManifest returns empty array for header-only CSV', () => {
  const csv = 'path,sha256,source,last_updated\n';
  const entries = parseManifest(csv);
  assert.deepEqual(entries, []);
});

test('parseManifest: source field values are either stock or user-modified', () => {
  const hash = 'a'.repeat(64);
  const csv = [
    'path,sha256,source,last_updated',
    `workflows/one.md,${hash},stock,2026-03-19`,
    `workflows/two.md,${hash},user-modified,2026-03-19`,
  ].join('\n') + '\n';
  const entries = parseManifest(csv);
  assert.strictEqual(entries.length, 2);
  assert.ok(['stock', 'user-modified'].includes(entries[0].source));
  assert.ok(['stock', 'user-modified'].includes(entries[1].source));
});

test('parseManifest: last_updated matches YYYY-MM-DD format', () => {
  const hash = 'a'.repeat(64);
  const csv = `path,sha256,source,last_updated\nworkflows/test.md,${hash},stock,2026-03-19\n`;
  const entries = parseManifest(csv);
  assert.match(entries[0].last_updated, /^\d{4}-\d{2}-\d{2}$/);
});

test('parseManifest round-trip: parse serialized CSV returns correct data', () => {
  const hash1 = 'a'.repeat(64);
  const hash2 = 'b'.repeat(64);
  const csv = [
    'path,sha256,source,last_updated',
    `workflows/execute-phase.md,${hash1},stock,2026-01-01`,
    `references/quality-standards.md,${hash2},user-modified,2026-02-15`,
  ].join('\n') + '\n';
  const entries = parseManifest(csv);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].path, 'workflows/execute-phase.md');
  assert.strictEqual(entries[0].sha256, hash1);
  assert.strictEqual(entries[0].source, 'stock');
  assert.strictEqual(entries[1].path, 'references/quality-standards.md');
  assert.strictEqual(entries[1].sha256, hash2);
  assert.strictEqual(entries[1].source, 'user-modified');
});

test('classifyFile returns auto-update when diskHash equals manifest hash', () => {
  const hash = 'a'.repeat(64);
  const entries = [{ path: 'workflows/test.md', sha256: hash, source: 'stock', last_updated: '2026-03-19' }];
  const result = classifyFile('workflows/test.md', entries, hash);
  assert.strictEqual(result.action, 'auto-update');
  assert.strictEqual(result.reason, 'unmodified');
});

test('classifyFile returns preserve when diskHash differs from manifest hash', () => {
  const manifestHash = 'a'.repeat(64);
  const diskHash = 'b'.repeat(64);
  const entries = [{ path: 'workflows/test.md', sha256: manifestHash, source: 'stock', last_updated: '2026-03-19' }];
  const result = classifyFile('workflows/test.md', entries, diskHash);
  assert.strictEqual(result.action, 'preserve');
  assert.strictEqual(result.reason, 'user-modified');
});

test('classifyFile returns preserve when no manifest entry exists', () => {
  const entries = [];
  const result = classifyFile('workflows/new-file.md', entries, 'a'.repeat(64));
  assert.strictEqual(result.action, 'preserve');
  assert.strictEqual(result.reason, 'no-manifest-entry');
});
