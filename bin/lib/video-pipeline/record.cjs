'use strict';

/**
 * record.cjs — Playwright-based UI recording with FFmpeg MP4 conversion.
 *
 * Provides:
 *   - recordUIInteraction() — launch Playwright with recordVideo, close context, convert WebM to MP4
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { FFMPEG, saveVideoAsset, resolveResolution } = require('./assets.cjs');

/**
 * Record a UI interaction via Playwright headless browser.
 *
 * @param {object} opts
 * @param {string} opts.url           - URL to navigate to (including data: URLs)
 * @param {string} opts.slug          - Asset slug for storage
 * @param {string} [opts.resolution]  - Resolution string — alias (720p) or WxH (1280x720). Default: '1920x1080'
 * @param {number} [opts.durationMs]  - Recording duration in ms (default: 5000)
 * @param {string} [opts.assetsDir]   - Override assets directory (for tests)
 * @returns {Promise<{ path: string, meta: object }>}
 */
async function recordUIInteraction({ url, slug, resolution = '1920x1080', durationMs = 5000, assetsDir } = {}) {
  const { width, height } = resolveResolution(resolution);
  const videoTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rec-'));

  let webmPath = null;
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      recordVideo: {
        dir: videoTmpDir,
        size: { width, height },
      },
      viewport: { width, height },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(durationMs);

    // CRITICAL: save video ref BEFORE context.close() — after close, path() returns the WebM
    const video = page.video();

    await context.close();
    await browser.close();

    // path() only returns a value after context.close()
    webmPath = await video.path();
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }

  // Convert WebM to MP4 via FFmpeg
  const mp4Path = path.join(videoTmpDir, `${slug}-${Date.now()}.mp4`);
  execFileSync(FFMPEG, [
    '-i', webmPath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-s', `${width}x${height}`,
    '-y',
    mp4Path,
  ], { stdio: 'pipe' });

  // Save to assets directory
  const { path: savedPath, metaPath, meta } = saveVideoAsset({
    slug,
    mp4Path,
    dimensions: { width, height },
    params: { url, durationMs, resolution },
    source: 'playwright-record',
    assetsDir,
  });

  // Clean up temp files
  try { fs.unlinkSync(webmPath); } catch {}
  try { fs.unlinkSync(mp4Path); } catch {}
  try { fs.rmdirSync(videoTmpDir, { recursive: true }); } catch {}

  return { path: savedPath, meta };
}

module.exports = { recordUIInteraction };
