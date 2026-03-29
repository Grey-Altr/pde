'use strict';

/**
 * mockup.cjs — Sharp-based device mockup compositing.
 *
 * Provides:
 *   - generateMockup() — resize screenshot and composite it onto a device frame PNG
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { saveAsset } = require('./assets.cjs');

const FRAMES_JSON = path.join(process.cwd(), 'templates/mockup-frames/frames.json');
const FRAMES_DIR  = path.join(process.cwd(), 'templates/mockup-frames');

/**
 * Generate a device mockup by compositing a screenshot onto a frame template.
 *
 * @param {object} opts
 * @param {string} opts.screenshotPath - Absolute path to the source screenshot PNG
 * @param {string} [opts.frame]        - Frame name: 'browser' | 'phone' (default: 'browser')
 * @param {string} opts.slug           - Asset slug for storage
 * @param {string} [opts.outputDir]    - Override assets directory (for tests)
 * @param {string} [opts.framesDir]    - Override frames directory (for tests)
 * @returns {Promise<{ buffer: Buffer, path: string, meta: object }>}
 */
async function generateMockup({ screenshotPath, frame = 'browser', slug, outputDir, framesDir }) {
  const framesJsonPath = framesDir
    ? path.join(framesDir, 'frames.json')
    : FRAMES_JSON;
  const framesPngDir = framesDir || FRAMES_DIR;

  // Load viewport rectangles
  const framesConfig = JSON.parse(fs.readFileSync(framesJsonPath, 'utf8'));
  const viewportRect = framesConfig[frame];
  if (!viewportRect) {
    throw new Error(`Unknown frame "${frame}". Available frames: ${Object.keys(framesConfig).join(', ')}`);
  }

  const framePngPath = path.join(framesPngDir, `${frame}.png`);
  if (!fs.existsSync(framePngPath)) {
    throw new Error(`Frame PNG not found: ${framePngPath}`);
  }

  // Get frame dimensions for output metadata
  const frameMeta = await sharp(framePngPath).metadata();
  const frameDimensions = { width: frameMeta.width, height: frameMeta.height };

  // Resize screenshot to fit the viewport area, then composite onto frame
  const resizedScreenshot = await sharp(screenshotPath)
    .resize(viewportRect.width, viewportRect.height, { fit: 'cover' })
    .toBuffer();

  const compositeBuffer = await sharp(framePngPath)
    .composite([{
      input: resizedScreenshot,
      top: viewportRect.top,
      left: viewportRect.left,
    }])
    .png()
    .toBuffer();

  const { path: assetPath, meta } = saveAsset({
    type: 'mockup',
    slug,
    buffer: compositeBuffer,
    dimensions: frameDimensions,
    params: { frame, screenshotPath },
    source: 'sharp-composite',
    assetsDir: outputDir,
  });

  return { buffer: compositeBuffer, path: assetPath, meta };
}

module.exports = { generateMockup };
