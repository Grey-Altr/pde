/**
 * tests/phase-167/assets.test.mjs
 * Tests for bin/lib/video-pipeline/assets.cjs
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
  assets = require('../../bin/lib/video-pipeline/assets.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-video-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ASSETS_DIR', () => {
  it('points to .planning/design/assets', () => {
    expect(assets.ASSETS_DIR).toContain('.planning/design/assets');
  });
});

describe('RESOLUTION_ALIASES', () => {
  it('exports known aliases', () => {
    expect(assets.RESOLUTION_ALIASES['720p']).toBe('1280x720');
    expect(assets.RESOLUTION_ALIASES['1080p']).toBe('1920x1080');
    expect(assets.RESOLUTION_ALIASES['4k']).toBe('3840x2160');
  });
});

describe('resolveResolution', () => {
  it('resolves 1080p alias', () => {
    const r = assets.resolveResolution('1080p');
    expect(r).toEqual({ width: 1920, height: 1080 });
  });

  it('resolves 720p alias', () => {
    const r = assets.resolveResolution('720p');
    expect(r).toEqual({ width: 1280, height: 720 });
  });

  it('resolves 4k alias', () => {
    const r = assets.resolveResolution('4k');
    expect(r).toEqual({ width: 3840, height: 2160 });
  });

  it('resolves WxH string', () => {
    const r = assets.resolveResolution('1280x720');
    expect(r).toEqual({ width: 1280, height: 720 });
  });

  it('resolves uppercase WxH string', () => {
    const r = assets.resolveResolution('1920X1080');
    expect(r).toEqual({ width: 1920, height: 1080 });
  });

  it('returns default 1920x1080 when called with no args', () => {
    const r = assets.resolveResolution();
    expect(r).toEqual({ width: 1920, height: 1080 });
  });

  it('throws on invalid input', () => {
    expect(() => assets.resolveResolution('invalid')).toThrow();
  });
});

describe('saveVideoAsset', () => {
  it('copies mp4 and writes .meta.json sidecar', () => {
    // Create a dummy "mp4" file
    const dummyMp4 = path.join(tmpDir, 'source.mp4');
    fs.writeFileSync(dummyMp4, Buffer.from('fake-mp4-data'));

    const result = assets.saveVideoAsset({
      slug: 'test-video',
      mp4Path: dummyMp4,
      dimensions: { width: 1920, height: 1080 },
      params: { url: 'http://localhost', durationMs: 3000 },
      source: 'playwright-record',
      assetsDir: tmpDir,
    });

    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('metaPath');
    expect(result).toHaveProperty('meta');
    expect(fs.existsSync(result.path)).toBe(true);
    expect(fs.existsSync(result.metaPath)).toBe(true);
  });

  it('meta has correct type, dimensions, timestamp', () => {
    const dummyMp4 = path.join(tmpDir, 'source2.mp4');
    fs.writeFileSync(dummyMp4, Buffer.from('fake-mp4-data-2'));

    const result = assets.saveVideoAsset({
      slug: 'meta-check',
      mp4Path: dummyMp4,
      dimensions: { width: 1280, height: 720 },
      params: {},
      source: 'test',
      assetsDir: tmpDir,
    });

    expect(result.meta.type).toBe('video');
    expect(result.meta.dimensions).toEqual({ width: 1280, height: 720 });
    expect(typeof result.meta.timestamp).toBe('string');
    // ISO string check
    expect(new Date(result.meta.timestamp).toISOString()).toBe(result.meta.timestamp);
  });

  it('output path is inside video/ subdirectory of assetsDir', () => {
    const dummyMp4 = path.join(tmpDir, 'source3.mp4');
    fs.writeFileSync(dummyMp4, Buffer.from('x'));

    const result = assets.saveVideoAsset({
      slug: 'path-check',
      mp4Path: dummyMp4,
      dimensions: { width: 1920, height: 1080 },
      assetsDir: tmpDir,
    });

    expect(result.path).toContain(path.join(tmpDir, 'video'));
    expect(result.path).toMatch(/\.mp4$/);
  });
});

describe('FFMPEG export', () => {
  it('exports FFMPEG path that exists', () => {
    expect(typeof assets.FFMPEG).toBe('string');
    expect(fs.existsSync(assets.FFMPEG)).toBe(true);
  });
});
