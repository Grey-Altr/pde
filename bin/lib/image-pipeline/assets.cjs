'use strict';

/**
 * assets.cjs — Shared asset storage module for the image pipeline.
 *
 * Provides:
 *   - saveAsset()  — write PNG + .meta.json sidecar to .planning/design/assets/{type}/
 *   - listAssets() — return JSON array of all assets, optionally filtered by type
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ASSETS_DIR = path.join(process.cwd(), '.planning/design/assets');

const ASSET_TYPES = ['og', 'social', 'mockup', 'screenshot', 'rembg'];

/**
 * Save a PNG asset with a JSON sidecar to disk.
 *
 * @param {object} opts
 * @param {string} opts.type        - Asset type: og | social | mockup | screenshot | rembg
 * @param {string} opts.slug        - Identifier slug (used in filename)
 * @param {Buffer} opts.buffer      - PNG buffer to write
 * @param {{width: number, height: number}} opts.dimensions
 * @param {object} [opts.params]    - Arbitrary params to persist in sidecar (e.g. title, description)
 * @param {string} [opts.source]    - Template or source identifier
 * @param {string} [opts.assetsDir] - Override for the base assets directory (used in tests)
 * @returns {{ path: string, metaPath: string, meta: object }}
 */
function saveAsset({ type, slug, buffer, dimensions, params = {}, source = '', assetsDir }) {
  const baseDir = assetsDir || ASSETS_DIR;
  const typeDir = path.join(baseDir, type);
  fs.mkdirSync(typeDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.png`;
  const metaFilename = `${slug}-${timestamp}.meta.json`;
  const filePath = path.join(typeDir, filename);
  const metaPath = path.join(typeDir, metaFilename);

  fs.writeFileSync(filePath, buffer);

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const meta = {
    type,
    source,
    dimensions,
    timestamp: new Date(timestamp).toISOString(),
    params,
    hash,
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  return { path: filePath, metaPath, meta };
}

/**
 * List all assets, optionally filtered by type.
 *
 * @param {object} [opts]
 * @param {string} [opts.type]       - Filter by asset type (optional)
 * @param {string} [opts.assetsDir]  - Override base assets directory (used in tests)
 * @returns {object[]} Array of asset metadata objects, each with additional `file` and `dir` fields
 */
function listAssets({ type, assetsDir } = {}) {
  const baseDir = assetsDir || ASSETS_DIR;
  const types = type ? [type] : ASSET_TYPES;
  const results = [];

  for (const t of types) {
    const dir = path.join(baseDir, t);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.meta.json'));
    for (const f of files) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        results.push({ ...meta, file: f.replace('.meta.json', '.png'), dir: t });
      } catch {
        // Skip malformed sidecar files
      }
    }
  }

  return results;
}

module.exports = { saveAsset, listAssets, ASSETS_DIR };
