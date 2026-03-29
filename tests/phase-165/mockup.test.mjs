/**
 * mockup.test.mjs — Tests for bin/lib/image-pipeline/mockup.cjs
 *
 * Tests:
 *   - generateMockup() produces a composite PNG at frame dimensions
 *   - frames.json is loadable and has browser + phone entries with required fields
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

let generateMockup;
let tmpDir;
let framePngDir;
let testScreenshotPath;
let testFramePngPath;

beforeAll(async () => {
  const mockupModule = require('../../bin/lib/image-pipeline/mockup.cjs');
  generateMockup = mockupModule.generateMockup;

  tmpDir = mkdtempSync(join(tmpdir(), 'mockup-test-'));
  framePngDir = mkdtempSync(join(tmpdir(), 'mockup-frames-'));

  // Create a simple 80x60 screenshot fixture
  testScreenshotPath = join(tmpDir, 'screenshot.png');
  const screenshotBuffer = await sharp({
    create: { width: 80, height: 60, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
  }).png().toBuffer();
  writeFileSync(testScreenshotPath, screenshotBuffer);

  // Create a 100x100 frame PNG with content area starting at top=10, left=10
  testFramePngPath = join(framePngDir, 'test-frame.png');
  const frameBuffer = await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } }
  }).png().toBuffer();
  writeFileSync(testFramePngPath, frameBuffer);

  // Create frames.json for the test frame
  const framesJson = {
    'test-frame': { top: 10, left: 10, width: 80, height: 80 }
  };
  writeFileSync(join(framePngDir, 'frames.json'), JSON.stringify(framesJson, null, 2));

  return () => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    try { rmSync(framePngDir, { recursive: true, force: true }); } catch {}
  };
});

describe('frames.json', () => {
  it('is loadable and has browser entry with required fields', () => {
    const framesPath = join(process.cwd(), 'templates/mockup-frames/frames.json');
    const frames = JSON.parse(readFileSync(framesPath, 'utf8'));

    expect(frames.browser).toBeDefined();
    expect(typeof frames.browser.top).toBe('number');
    expect(typeof frames.browser.left).toBe('number');
    expect(typeof frames.browser.width).toBe('number');
    expect(typeof frames.browser.height).toBe('number');
  });

  it('has phone entry with required fields', () => {
    const framesPath = join(process.cwd(), 'templates/mockup-frames/frames.json');
    const frames = JSON.parse(readFileSync(framesPath, 'utf8'));

    expect(frames.phone).toBeDefined();
    expect(typeof frames.phone.top).toBe('number');
    expect(typeof frames.phone.left).toBe('number');
    expect(typeof frames.phone.width).toBe('number');
    expect(typeof frames.phone.height).toBe('number');
  });
});

describe('generateMockup()', () => {
  it('produces a composite PNG at frame dimensions', async () => {
    const result = await generateMockup({
      screenshotPath: testScreenshotPath,
      frame: 'test-frame',
      slug: 'test-mockup',
      outputDir: tmpDir,
      framesDir: framePngDir,
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.path).toBeTruthy();
    expect(existsSync(result.path)).toBe(true);

    // Verify it's a valid PNG
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50); // 'P'
    expect(result.buffer[2]).toBe(0x4E); // 'N'
    expect(result.buffer[3]).toBe(0x47); // 'G'
  });

  it('output PNG has frame dimensions (100x100)', async () => {
    const result = await generateMockup({
      screenshotPath: testScreenshotPath,
      frame: 'test-frame',
      slug: 'test-dimensions',
      outputDir: tmpDir,
      framesDir: framePngDir,
    });

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it('meta.type is mockup and source is sharp-composite', async () => {
    const result = await generateMockup({
      screenshotPath: testScreenshotPath,
      frame: 'test-frame',
      slug: 'test-meta',
      outputDir: tmpDir,
      framesDir: framePngDir,
    });

    expect(result.meta.type).toBe('mockup');
    expect(result.meta.source).toBe('sharp-composite');
    expect(result.meta.params.frame).toBe('test-frame');
  });

  it('throws on unknown frame name', async () => {
    await expect(
      generateMockup({
        screenshotPath: testScreenshotPath,
        frame: 'nonexistent',
        slug: 'test-error',
        outputDir: tmpDir,
        framesDir: framePngDir,
      })
    ).rejects.toThrow(/Unknown frame/);
  });
});
