'use strict';

/**
 * og.cjs — OG image generation via Satori + @resvg/resvg-js.
 *
 * Converts a template element tree to SVG via Satori, then rasterizes
 * to PNG via resvg-js. Optionally saves asset + sidecar via assets.cjs.
 */

const fs = require('fs');
const path = require('path');
const { saveAsset } = require('./assets.cjs');

// Font path bundled with this module — WOFF format (Satori supports TTF, OTF, WOFF, not WOFF2)
const FONT_PATH = path.join(__dirname, 'fonts/Inter-Regular.woff');

/**
 * Generate an OG image (1200x630 PNG) from product data.
 *
 * @param {object} opts
 * @param {string} opts.title         - Product/page title
 * @param {string} [opts.description] - Short description
 * @param {string} opts.slug          - Identifier slug (used in filename)
 * @param {Function} [opts.templateFn] - Custom template function; defaults to ogDefault
 * @param {string} [opts.outputDir]   - If provided, save asset to this directory (overrides assetsDir)
 * @param {string} [opts.assetsDir]   - Base assets directory for saveAsset (used in tests)
 * @returns {Promise<{ buffer: Buffer, path: string|null, meta: object|null }>}
 */
async function generateOgImage({ title, description, slug, templateFn, outputDir, assetsDir }) {
  const { default: satori } = require('satori');
  const { Resvg } = require('@resvg/resvg-js');
  const { ogDefault } = require('./templates/og-default.cjs');

  const fn = templateFn || ogDefault;
  const element = fn({ title, description });

  const fontData = fs.readFileSync(FONT_PATH);

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 400,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { loadSystemFonts: false },
  });
  const pngBuffer = Buffer.from(resvg.render().asPng());

  // Save if outputDir or assetsDir provided
  let filePath = null;
  let meta = null;

  if (outputDir || assetsDir) {
    const saveResult = saveAsset({
      type: 'og',
      slug,
      buffer: pngBuffer,
      dimensions: { width: 1200, height: 630 },
      params: { title, description },
      source: fn.name || 'ogDefault',
      assetsDir: outputDir || assetsDir,
    });
    filePath = saveResult.path;
    meta = saveResult.meta;
  }

  return { buffer: pngBuffer, path: filePath, meta };
}

module.exports = { generateOgImage };
