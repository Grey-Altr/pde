/**
 * tests/phase-168/embed.test.mjs
 * Tests for bin/lib/3d-pipeline/embed.cjs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);

let embed;
let tmpDir;

beforeAll(() => {
  embed = require('../../bin/lib/3d-pipeline/embed.cjs');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-3d-embed-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('generateEmbed', () => {
  let result;

  beforeAll(() => {
    result = embed.generateEmbed({
      glbPath: '/path/to/model.glb',
      slug: 'test-model',
      assetsDir: tmpDir,
    });
  });

  it('returns snippet, html, embedPath', () => {
    expect(result).toHaveProperty('snippet');
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('embedPath');
  });

  it('snippet contains <model-viewer', () => {
    expect(result.snippet).toContain('<model-viewer');
  });

  it('snippet contains ar-modes="webxr scene-viewer quick-look"', () => {
    expect(result.snippet).toContain('ar-modes="webxr scene-viewer quick-look"');
  });

  it('snippet contains ar attribute', () => {
    // Match standalone 'ar' attribute (not part of ar-modes)
    expect(result.snippet).toMatch(/\sar\b/);
  });

  it('snippet contains camera-controls', () => {
    expect(result.snippet).toContain('camera-controls');
  });

  it('snippet contains auto-rotate', () => {
    expect(result.snippet).toContain('auto-rotate');
  });

  it('snippet does NOT contain ios-src', () => {
    // model-viewer handles iOS auto-USDZ — no server-side USDZ needed
    expect(result.snippet).not.toContain('ios-src');
  });

  it('html contains <!DOCTYPE html>', () => {
    expect(result.html).toContain('<!DOCTYPE html>');
  });

  it('embedPath ends with -embed.html', () => {
    expect(result.embedPath).toMatch(/-embed\.html$/);
  });

  it('embed HTML file written to disk', () => {
    expect(fs.existsSync(result.embedPath)).toBe(true);
  });

  it('written file content matches html', () => {
    const written = fs.readFileSync(result.embedPath, 'utf8');
    expect(written).toBe(result.html);
  });

  it('html contains model-viewer.min.js CDN URL', () => {
    expect(result.html).toContain('model-viewer.min.js');
  });

  it('html contains slug in title', () => {
    expect(result.html).toContain('test-model');
  });
});

describe('generateEmbed with custom cameraOrbit', () => {
  it('uses custom cameraOrbit value in snippet', () => {
    const r = embed.generateEmbed({
      glbPath: '/model.glb',
      slug: 'custom-orbit',
      cameraOrbit: '90deg 45deg 3m',
      assetsDir: tmpDir,
    });
    expect(r.snippet).toContain('camera-orbit="90deg 45deg 3m"');
  });
});
