import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
const { saveAsset, listAssets } = require('../../bin/lib/image-pipeline/assets.cjs');

// Minimal valid PNG: 1x1 red pixel
const FAKE_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, // IDAT data
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, // IDAT crc
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND
  0x44, 0xae, 0x42, 0x60, 0x82,                   // IEND crc
]);

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'assets-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('saveAsset()', () => {
  it('writes PNG file to the correct type subdirectory', () => {
    const result = saveAsset({
      type: 'og',
      slug: 'test-product',
      buffer: FAKE_PNG_BUFFER,
      dimensions: { width: 1200, height: 630 },
      params: { title: 'Test', description: 'A test product' },
      source: 'ogDefault',
      assetsDir: tmpDir,
    });

    expect(existsSync(result.path)).toBe(true);
    expect(result.path).toContain('og');
    expect(result.path).toContain('test-product');
    expect(result.path).toMatch('.png');
  });

  it('writes .meta.json sidecar file alongside the PNG', () => {
    const result = saveAsset({
      type: 'og',
      slug: 'test-product',
      buffer: FAKE_PNG_BUFFER,
      dimensions: { width: 1200, height: 630 },
      params: { title: 'Test' },
      source: 'ogDefault',
      assetsDir: tmpDir,
    });

    expect(existsSync(result.metaPath)).toBe(true);
    expect(result.metaPath).toMatch('.meta.json');
  });

  it('meta contains all required fields: type, source, dimensions, timestamp, params, hash', () => {
    const result = saveAsset({
      type: 'og',
      slug: 'test-product',
      buffer: FAKE_PNG_BUFFER,
      dimensions: { width: 1200, height: 630 },
      params: { title: 'Test', description: 'A test product' },
      source: 'ogDefault',
      assetsDir: tmpDir,
    });

    const { meta } = result;
    expect(meta.type).toBe('og');
    expect(meta.source).toBe('ogDefault');
    expect(meta.dimensions).toEqual({ width: 1200, height: 630 });
    expect(meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    expect(meta.params).toEqual({ title: 'Test', description: 'A test product' });
    expect(meta.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it('written meta.json matches the returned meta object', () => {
    const result = saveAsset({
      type: 'og',
      slug: 'sidecar-check',
      buffer: FAKE_PNG_BUFFER,
      dimensions: { width: 1200, height: 630 },
      params: {},
      source: 'test',
      assetsDir: tmpDir,
    });

    const written = JSON.parse(readFileSync(result.metaPath, 'utf8'));
    expect(written).toEqual(result.meta);
  });

  it('hash is SHA-256 of the buffer content', () => {
    const expectedHash = createHash('sha256').update(FAKE_PNG_BUFFER).digest('hex');

    const result = saveAsset({
      type: 'og',
      slug: 'hash-test',
      buffer: FAKE_PNG_BUFFER,
      dimensions: { width: 1, height: 1 },
      params: {},
      assetsDir: tmpDir,
    });

    expect(result.meta.hash).toBe(expectedHash);
  });
});

describe('listAssets()', () => {
  it('returns empty array when assets directory is empty', () => {
    const results = listAssets({ assetsDir: tmpDir });
    expect(results).toEqual([]);
  });

  it('returns all assets across types when no filter applied', () => {
    saveAsset({ type: 'og', slug: 'a', buffer: FAKE_PNG_BUFFER, dimensions: { width: 1200, height: 630 }, assetsDir: tmpDir });
    saveAsset({ type: 'social', slug: 'b', buffer: FAKE_PNG_BUFFER, dimensions: { width: 1200, height: 628 }, assetsDir: tmpDir });

    const results = listAssets({ assetsDir: tmpDir });
    expect(results).toHaveLength(2);
  });

  it('filters by type when type is provided', () => {
    saveAsset({ type: 'og', slug: 'og-asset', buffer: FAKE_PNG_BUFFER, dimensions: { width: 1200, height: 630 }, assetsDir: tmpDir });
    saveAsset({ type: 'social', slug: 'social-asset', buffer: FAKE_PNG_BUFFER, dimensions: { width: 1200, height: 628 }, assetsDir: tmpDir });

    const ogOnly = listAssets({ type: 'og', assetsDir: tmpDir });
    expect(ogOnly).toHaveLength(1);
    expect(ogOnly[0].type).toBe('og');

    const socialOnly = listAssets({ type: 'social', assetsDir: tmpDir });
    expect(socialOnly).toHaveLength(1);
    expect(socialOnly[0].type).toBe('social');
  });

  it('each result includes file and dir fields', () => {
    saveAsset({ type: 'og', slug: 'list-test', buffer: FAKE_PNG_BUFFER, dimensions: { width: 1200, height: 630 }, assetsDir: tmpDir });

    const results = listAssets({ assetsDir: tmpDir });
    expect(results[0].file).toMatch('.png');
    expect(results[0].dir).toBe('og');
  });
});
