/**
 * tests/phase-167/record.test.mjs
 * Tests for bin/lib/video-pipeline/record.cjs (VID-01, VID-05)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);

let record;
let tmpDir;

// Check if Chromium is available for Playwright
let chromiumAvailable = false;
try {
  const { chromium } = require('playwright');
  const executablePath = chromium.executablePath();
  chromiumAvailable = fs.existsSync(executablePath);
} catch {
  chromiumAvailable = false;
}

beforeAll(() => {
  record = require('../../bin/lib/video-pipeline/record.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-record-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('recordUIInteraction', () => {
  it.skipIf(!chromiumAvailable)('records a data URL to MP4 and writes .meta.json sidecar', async () => {
    const dataUrl = 'data:text/html,<html><body style="background:blue"><h1>Test</h1></body></html>';

    const result = await record.recordUIInteraction({
      url: dataUrl,
      slug: 'test-record',
      resolution: '320x240',
      durationMs: 1000,
      assetsDir: tmpDir,
    });

    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('meta');
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.path).toMatch(/\.mp4$/);

    // Meta JSON sidecar
    const metaPath = result.path.replace(/\.mp4$/, '.meta.json');
    // The meta is saved alongside via saveVideoAsset
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.type).toBe('video');
    expect(meta.dimensions).toEqual({ width: 320, height: 240 });
  }, 60000);

  it.skipIf(!chromiumAvailable)('respects resolution alias 720p', async () => {
    const dataUrl = 'data:text/html,<html><body style="background:red"></body></html>';

    const result = await record.recordUIInteraction({
      url: dataUrl,
      slug: 'test-resolution',
      resolution: '720p',
      durationMs: 500,
      assetsDir: tmpDir,
    });

    expect(result.meta.dimensions).toEqual({ width: 1280, height: 720 });
  }, 60000);
});
