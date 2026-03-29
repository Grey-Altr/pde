'use strict';

/**
 * screenshot.cjs — Playwright-based screenshot capture with viewport presets.
 *
 * Provides:
 *   - captureScreenshot() — launch headless Chromium, navigate URL, save PNG
 *   - VIEWPORT_PRESETS    — named viewport size lookup table
 */

const { chromium } = require('playwright');
const { saveAsset } = require('./assets.cjs');

/** Named viewport presets */
const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812  },
};

/**
 * Parse a viewport value into { width, height, name }.
 *
 * Accepts:
 *   - Named preset string: 'desktop' | 'tablet' | 'mobile'
 *   - WxH string: '1280x720'
 *   - Object: { width: number, height: number }
 *
 * @param {string|object} viewport
 * @returns {{ width: number, height: number, name: string }}
 */
function resolveViewport(viewport) {
  if (typeof viewport === 'string') {
    if (VIEWPORT_PRESETS[viewport]) {
      return { ...VIEWPORT_PRESETS[viewport], name: viewport };
    }
    const match = /^(\d+)[xX](\d+)$/.exec(viewport);
    if (match) {
      return { width: parseInt(match[1], 10), height: parseInt(match[2], 10), name: viewport };
    }
    throw new Error(`Unknown viewport preset or format: "${viewport}". Use desktop|tablet|mobile or WxH.`);
  }
  if (viewport && typeof viewport === 'object') {
    return { width: viewport.width, height: viewport.height, name: `${viewport.width}x${viewport.height}` };
  }
  throw new Error('viewport must be a string preset, "WxH" string, or { width, height } object');
}

/**
 * Capture a screenshot via Playwright headless Chromium.
 *
 * @param {object} opts
 * @param {string} opts.url          - URL to navigate to (including data: URLs)
 * @param {string|object} [opts.viewport] - Named preset, WxH string, or { width, height } (default: 'desktop')
 * @param {string} opts.slug         - Asset slug for storage
 * @param {string} [opts.outputDir]  - Override assets directory (for tests)
 * @param {string} [opts.format]     - 'png' (default) or 'jpg'
 * @param {number} [opts.timeout]    - Navigation timeout ms (default: 30000)
 * @returns {Promise<{ buffer: Buffer, path: string, meta: object }>}
 */
async function captureScreenshot({ url, viewport = 'desktop', slug, outputDir, format = 'png', timeout = 30000 }) {
  const vp = resolveViewport(viewport);
  const screenshotType = format === 'jpg' ? 'jpeg' : 'png';

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout });
    const buffer = await page.screenshot({ type: screenshotType, fullPage: false });

    await context.close();

    const { path: assetPath, meta } = saveAsset({
      type: 'screenshot',
      slug,
      buffer,
      dimensions: { width: vp.width, height: vp.height },
      params: { url, viewport: vp.name, format },
      source: 'playwright',
      assetsDir: outputDir,
    });

    return { buffer, path: assetPath, meta };
  } finally {
    await browser.close();
  }
}

module.exports = { captureScreenshot, VIEWPORT_PRESETS };
