'use strict';

/**
 * social.cjs — Social card generation via Satori + @resvg/resvg-js.
 *
 * Generates three platform-specific PNG variants from a single data input:
 *   - Twitter/X:  1200x628
 *   - LinkedIn:   1200x627
 *   - Facebook:   1200x630
 */

const fs = require('fs');
const path = require('path');
const { saveAsset } = require('./assets.cjs');

// Font path bundled with this module — WOFF format (Satori supports TTF, OTF, WOFF, not WOFF2)
const FONT_PATH = path.join(__dirname, 'fonts/Inter-Regular.woff');

const SOCIAL_SIZES = {
  twitter: { width: 1200, height: 628 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
};

/**
 * Generate social card images for all 3 platforms.
 *
 * @param {object} opts
 * @param {string} opts.title         - Product/page title
 * @param {string} [opts.description] - Short description
 * @param {string} opts.slug          - Identifier slug (used in filename, e.g. "my-product")
 * @param {Function} [opts.templateFn] - Custom template function; defaults to socialDefault
 * @param {string} [opts.outputDir]   - If provided, save assets to this directory
 * @param {string} [opts.assetsDir]   - Base assets directory for saveAsset (used in tests)
 * @returns {Promise<Array<{ buffer: Buffer, path: string|null, meta: object|null }>>}
 */
async function generateSocialCards({ title, description, slug, templateFn, outputDir, assetsDir }) {
  const { default: satori } = require('satori');
  const { Resvg } = require('@resvg/resvg-js');
  const { socialDefault } = require('./templates/social-default.cjs');

  const fn = templateFn || socialDefault;
  const fontData = fs.readFileSync(FONT_PATH);

  const results = [];

  for (const [platform, { width, height }] of Object.entries(SOCIAL_SIZES)) {
    const element = fn({ title, description, width, height });

    const svg = await satori(element, {
      width,
      height,
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
      fitTo: { mode: 'width', value: width },
      font: { loadSystemFonts: false },
    });
    const pngBuffer = Buffer.from(resvg.render().asPng());

    let filePath = null;
    let meta = null;

    if (outputDir || assetsDir) {
      // Platform suffix: {slug}-{timestamp}-{platform}.png
      const platformSlug = `${slug}-${platform}`;
      const saveResult = saveAsset({
        type: 'social',
        slug: platformSlug,
        buffer: pngBuffer,
        dimensions: { width, height },
        params: { title, description, platform },
        source: fn.name || 'socialDefault',
        assetsDir: outputDir || assetsDir,
      });
      filePath = saveResult.path;
      meta = saveResult.meta;
    }

    results.push({ buffer: pngBuffer, path: filePath, meta });
  }

  return results;
}

module.exports = { generateSocialCards, SOCIAL_SIZES };
