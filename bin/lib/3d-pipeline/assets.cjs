'use strict';

/**
 * assets.cjs — Shared asset storage module for the 3D pipeline.
 *
 * Provides:
 *   - save3DAsset()  — write GLB + .meta.json sidecar to .planning/design/3d/
 *   - list3DAssets() — return JSON array of all 3D assets with metadata
 *   - THREE_D_DIR    — canonical output directory constant
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const THREE_D_DIR = path.join(process.cwd(), '.planning/design/3d');

/**
 * Save a GLB asset with a JSON sidecar to disk.
 *
 * @param {object} opts
 * @param {string}  opts.slug         - Identifier slug (used in filename)
 * @param {Buffer}  opts.glbBuffer    - Binary GLB buffer to write
 * @param {object}  [opts.meta]       - Extra metadata: { source_model, input_type, vertex_count }
 * @param {string}  [opts.assetsDir]  - Override base directory (used in tests)
 * @returns {{ glbPath: string, metaPath: string, meta: object }}
 */
function save3DAsset({ slug, glbBuffer, meta = {}, assetsDir }) {
  const baseDir = assetsDir || THREE_D_DIR;
  fs.mkdirSync(baseDir, { recursive: true });

  const timestamp = Date.now();
  const glbFilename = `${slug}-${timestamp}.glb`;
  const metaFilename = `${slug}-${timestamp}.meta.json`;
  const glbPath = path.join(baseDir, glbFilename);
  const metaPath = path.join(baseDir, metaFilename);

  fs.writeFileSync(glbPath, glbBuffer);

  const inputHash = crypto.createHash('sha256').update(glbBuffer).digest('hex');
  const fullMeta = {
    source_model: meta.source_model || 'unknown',
    input_type: meta.input_type || 'glb',
    input_hash: inputHash,
    timestamp: new Date(timestamp).toISOString(),
    file_size: glbBuffer.length,
    vertex_count: meta.vertex_count || 0,
    slug,
    glb_path: path.relative(process.cwd(), glbPath),
  };

  fs.writeFileSync(metaPath, JSON.stringify(fullMeta, null, 2));

  return { glbPath, metaPath, meta: fullMeta };
}

/**
 * List all 3D assets with metadata.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.assetsDir] - Override base directory (used in tests)
 * @returns {object[]} Array of metadata objects, each with added `glb_file` field
 */
function list3DAssets({ assetsDir } = {}) {
  const baseDir = assetsDir || THREE_D_DIR;

  if (!fs.existsSync(baseDir)) return [];

  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.meta.json'));
  const results = [];

  for (const f of files) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(baseDir, f), 'utf8'));
      results.push({ ...meta, glb_file: f.replace('.meta.json', '.glb') });
    } catch {
      // Skip malformed sidecar files
    }
  }

  return results;
}

module.exports = { save3DAsset, list3DAssets, THREE_D_DIR };
