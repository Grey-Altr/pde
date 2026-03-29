/**
 * tests/phase-168/assets.test.mjs
 * Tests for bin/lib/3d-pipeline/assets.cjs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

let assets;
let tmpDir;

beforeAll(() => {
  assets = require('../../bin/lib/3d-pipeline/assets.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-3d-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('THREE_D_DIR', () => {
  it('contains .planning/design/3d', () => {
    expect(assets.THREE_D_DIR).toContain(path.join('.planning', 'design', '3d'));
  });
});

describe('save3DAsset', () => {
  it('writes .glb and .meta.json files', () => {
    const glbBuffer = Buffer.from('fake-glb-data');
    const result = assets.save3DAsset({
      slug: 'test-model',
      glbBuffer,
      meta: { source_model: 'triposr', input_type: 'image' },
      assetsDir: tmpDir,
    });

    expect(fs.existsSync(result.glbPath)).toBe(true);
    expect(fs.existsSync(result.metaPath)).toBe(true);
  });

  it('returns glbPath, metaPath, meta', () => {
    const glbBuffer = Buffer.from('fake-glb-return-check');
    const result = assets.save3DAsset({
      slug: 'return-check',
      glbBuffer,
      assetsDir: tmpDir,
    });

    expect(result).toHaveProperty('glbPath');
    expect(result).toHaveProperty('metaPath');
    expect(result).toHaveProperty('meta');
    expect(result.glbPath).toMatch(/\.glb$/);
    expect(result.metaPath).toMatch(/\.meta\.json$/);
  });

  it('meta.json contains source_model, input_type, input_hash, timestamp, file_size, slug', () => {
    const glbBuffer = Buffer.from('fake-glb-meta-test');
    const result = assets.save3DAsset({
      slug: 'meta-check',
      glbBuffer,
      meta: { source_model: 'sf3d', input_type: 'text' },
      assetsDir: tmpDir,
    });

    const meta = JSON.parse(fs.readFileSync(result.metaPath, 'utf8'));

    expect(meta).toHaveProperty('source_model', 'sf3d');
    expect(meta).toHaveProperty('input_type', 'text');
    expect(meta).toHaveProperty('input_hash');
    expect(typeof meta.input_hash).toBe('string');
    expect(meta.input_hash).toHaveLength(64); // sha256 hex
    expect(meta).toHaveProperty('timestamp');
    expect(new Date(meta.timestamp).toISOString()).toBe(meta.timestamp);
    expect(meta).toHaveProperty('file_size', glbBuffer.length);
    expect(meta).toHaveProperty('slug', 'meta-check');
  });

  it('saved GLB file contains correct data', () => {
    const glbBuffer = Buffer.from('glb-content-check');
    const result = assets.save3DAsset({
      slug: 'data-check',
      glbBuffer,
      assetsDir: tmpDir,
    });

    const written = fs.readFileSync(result.glbPath);
    expect(written).toEqual(glbBuffer);
  });
});

describe('list3DAssets', () => {
  it('returns array including saved asset', () => {
    const glbBuffer = Buffer.from('list-test-glb');
    assets.save3DAsset({
      slug: 'list-asset',
      glbBuffer,
      meta: { source_model: 'triposr', input_type: 'image' },
      assetsDir: tmpDir,
    });

    const list = assets.list3DAssets({ assetsDir: tmpDir });
    expect(Array.isArray(list)).toBe(true);
    const found = list.find(a => a.slug === 'list-asset');
    expect(found).toBeDefined();
    expect(found).toHaveProperty('glb_file');
    expect(found.glb_file).toMatch(/\.glb$/);
  });

  it('returns empty array for empty dir', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-3d-empty-'));
    try {
      const list = assets.list3DAssets({ assetsDir: emptyDir });
      expect(list).toEqual([]);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('returns empty array when dir does not exist', () => {
    const list = assets.list3DAssets({ assetsDir: '/tmp/does-not-exist-pde-3d-xyz' });
    expect(list).toEqual([]);
  });
});
