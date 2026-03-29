'use strict';

/**
 * embed.cjs — model-viewer HTML embed generation.
 *
 * Provides:
 *   - generateEmbed() — produce a model-viewer HTML snippet and self-contained page
 */

const fs = require('fs');
const path = require('path');
const { THREE_D_DIR } = require('./assets.cjs');

const MODEL_VIEWER_CDN = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';

/**
 * Generate a model-viewer HTML snippet and self-contained HTML page for a GLB asset.
 *
 * @param {object} opts
 * @param {string} opts.glbPath                    - Path to the GLB file (used as src attribute)
 * @param {string} opts.slug                       - Asset slug (used in title and filename)
 * @param {string} [opts.cameraOrbit='45deg 75deg 2m'] - camera-orbit attribute value
 * @param {string} [opts.assetsDir]                - Output directory override (defaults to THREE_D_DIR)
 * @returns {{ snippet: string, html: string, embedPath: string }}
 */
function generateEmbed({ glbPath, slug, cameraOrbit = '45deg 75deg 2m', assetsDir }) {
  const outputDir = assetsDir || THREE_D_DIR;
  fs.mkdirSync(outputDir, { recursive: true });

  const snippet = `<model-viewer
  src="${glbPath}"
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls
  camera-orbit="${cameraOrbit}"
  auto-rotate
  shadow-intensity="1"
  style="width:100%;height:500px"
></model-viewer>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slug} — 3D Preview</title>
  <script type="module" src="${MODEL_VIEWER_CDN}"></script>
</head>
<body>
${snippet}
</body>
</html>`;

  const embedPath = path.join(outputDir, `${slug}-embed.html`);
  fs.writeFileSync(embedPath, html);

  return { snippet, html, embedPath };
}

module.exports = { generateEmbed };
