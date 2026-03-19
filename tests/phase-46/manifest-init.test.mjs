/**
 * manifest-init.test.mjs
 * Tests: manifestInit creates file, entry count > 0, file starts with header line.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const manifest = require('../../bin/lib/manifest.cjs');

const { manifestInit, parseManifest } = manifest;

// The plugin root is two levels up from tests/phase-46/
const PLUGIN_ROOT = resolve(__dirname, '..', '..');

test('manifestInit creates .planning/config/files-manifest.csv', () => {
  // Use the real plugin root (this test project)
  const count = manifestInit(PLUGIN_ROOT);
  const manifestPath = join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  assert.ok(existsSync(manifestPath), 'files-manifest.csv should exist after manifestInit');
});

test('manifestInit: CSV file starts with header line path,sha256,source,last_updated', () => {
  manifestInit(PLUGIN_ROOT);
  const manifestPath = join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  const content = readFileSync(manifestPath, 'utf-8');
  const firstLine = content.split('\n')[0];
  assert.strictEqual(firstLine, 'path,sha256,source,last_updated');
});

test('manifestInit: returns entry count > 0', () => {
  const count = manifestInit(PLUGIN_ROOT);
  assert.ok(count > 0, `Expected at least 1 entry, got ${count}`);
});

test('manifestInit: each data row has exactly 4 comma-separated fields', () => {
  manifestInit(PLUGIN_ROOT);
  const manifestPath = join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  const content = readFileSync(manifestPath, 'utf-8');
  const lines = content.trim().split('\n');
  // Skip header line
  const dataLines = lines.slice(1);
  assert.ok(dataLines.length > 0, 'Should have at least one data line');
  for (const line of dataLines) {
    const fields = line.split(',');
    assert.strictEqual(fields.length, 4, `Line should have 4 fields: "${line}"`);
  }
});

test('manifestInit: each sha256 field is exactly 64 hex characters', () => {
  manifestInit(PLUGIN_ROOT);
  const manifestPath = join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  const content = readFileSync(manifestPath, 'utf-8');
  const entries = parseManifest(content);
  assert.ok(entries.length > 0, 'Should have parsed entries');
  for (const entry of entries) {
    assert.match(
      entry.sha256,
      /^[0-9a-f]{64}$/,
      `SHA256 for "${entry.path}" should be 64 lowercase hex chars, got: "${entry.sha256}"`
    );
  }
});

test('manifestInit: source field is stock for all entries on first init', () => {
  manifestInit(PLUGIN_ROOT);
  const manifestPath = join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  const content = readFileSync(manifestPath, 'utf-8');
  const entries = parseManifest(content);
  for (const entry of entries) {
    assert.strictEqual(entry.source, 'stock', `Expected source=stock for "${entry.path}", got: "${entry.source}"`);
  }
});

test('manifestInit: last_updated matches YYYY-MM-DD format for all entries', () => {
  manifestInit(PLUGIN_ROOT);
  const manifestPath = join(process.cwd(), '.planning', 'config', 'files-manifest.csv');
  const content = readFileSync(manifestPath, 'utf-8');
  const entries = parseManifest(content);
  for (const entry of entries) {
    assert.match(
      entry.last_updated,
      /^\d{4}-\d{2}-\d{2}$/,
      `last_updated for "${entry.path}" should be YYYY-MM-DD, got: "${entry.last_updated}"`
    );
  }
});
