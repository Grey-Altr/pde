/**
 * screenshot.test.mjs — Tests for bin/lib/image-pipeline/screenshot.cjs
 *
 * Tests:
 *   - VIEWPORT_PRESETS has correct desktop/tablet/mobile values
 *   - captureScreenshot() captures a valid PNG at the specified viewport
 *   - Meta type is 'screenshot' with correct dimensions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);

// Detect Chromium availability synchronously at module level so skipIf evaluates correctly.
// Uses execFileSync (not exec/execSync) — args are not user-provided, no injection risk.
function isChromiumAvailable() {
  try {
    const script = "const {chromium}=require('playwright');console.log(chromium.executablePath())";
    const result = execFileSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return result.length > 0 && existsSync(result);
  } catch {
    return false;
  }
}

const chromiumAvailable = isChromiumAvailable();
let tmpDir;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'screenshot-test-'));
});

afterAll(() => {
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

describe('VIEWPORT_PRESETS', () => {
  it('has desktop preset at 1440x900', () => {
    const { VIEWPORT_PRESETS } = require('../../bin/lib/image-pipeline/screenshot.cjs');
    expect(VIEWPORT_PRESETS.desktop).toEqual({ width: 1440, height: 900 });
  });

  it('has tablet preset at 768x1024', () => {
    const { VIEWPORT_PRESETS } = require('../../bin/lib/image-pipeline/screenshot.cjs');
    expect(VIEWPORT_PRESETS.tablet).toEqual({ width: 768, height: 1024 });
  });

  it('has mobile preset at 375x812', () => {
    const { VIEWPORT_PRESETS } = require('../../bin/lib/image-pipeline/screenshot.cjs');
    expect(VIEWPORT_PRESETS.mobile).toEqual({ width: 375, height: 812 });
  });
});

describe('captureScreenshot()', () => {
  it.skipIf(!chromiumAvailable)('captures a valid PNG using data: URL', async () => {
    const { captureScreenshot } = require('../../bin/lib/image-pipeline/screenshot.cjs');

    const result = await captureScreenshot({
      url: 'data:text/html,<h1>Test</h1>',
      viewport: 'mobile',
      slug: 'test-screenshot',
      outputDir: tmpDir,
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.path).toBeTruthy();
    expect(existsSync(result.path)).toBe(true);
    expect(result.meta).toBeTruthy();
  });

  it.skipIf(!chromiumAvailable)('output is a valid PNG (starts with PNG magic bytes)', async () => {
    const { captureScreenshot } = require('../../bin/lib/image-pipeline/screenshot.cjs');

    const result = await captureScreenshot({
      url: 'data:text/html,<p>PNG test</p>',
      viewport: { width: 800, height: 600 },
      slug: 'test-png-magic',
      outputDir: tmpDir,
    });

    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50); // 'P'
    expect(result.buffer[2]).toBe(0x4E); // 'N'
    expect(result.buffer[3]).toBe(0x47); // 'G'
  });

  it.skipIf(!chromiumAvailable)('meta.type is screenshot with correct dimensions', async () => {
    const { captureScreenshot } = require('../../bin/lib/image-pipeline/screenshot.cjs');

    const result = await captureScreenshot({
      url: 'data:text/html,<div>Meta test</div>',
      viewport: 'tablet',
      slug: 'test-meta',
      outputDir: tmpDir,
    });

    expect(result.meta.type).toBe('screenshot');
    expect(result.meta.dimensions).toEqual({ width: 768, height: 1024 });
    expect(result.meta.source).toBe('playwright');
  });

  it.skipIf(!chromiumAvailable)('resolves WxH string viewport', async () => {
    const { captureScreenshot } = require('../../bin/lib/image-pipeline/screenshot.cjs');

    const result = await captureScreenshot({
      url: 'data:text/html,<b>WxH test</b>',
      viewport: '1024x768',
      slug: 'test-wxh',
      outputDir: tmpDir,
    });

    expect(result.meta.dimensions).toEqual({ width: 1024, height: 768 });
  });

  it('throws on unknown string viewport (no browser needed)', async () => {
    const { captureScreenshot } = require('../../bin/lib/image-pipeline/screenshot.cjs');

    await expect(
      captureScreenshot({ url: 'data:text/html,x', viewport: 'ultrawide', slug: 'test', outputDir: tmpDir })
    ).rejects.toThrow(/Unknown viewport preset/);
  });
});
