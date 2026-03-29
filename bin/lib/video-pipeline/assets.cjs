'use strict';

/**
 * assets.cjs — Video asset storage module for the video pipeline.
 *
 * Provides:
 *   - saveVideoAsset() — write MP4 + .meta.json sidecar to .planning/design/assets/video/
 *   - resolveResolution() — parse WxH or shorthand (720p, 1080p, 4k) to { width, height }
 *   - listVideoAssets() — return JSON array of all video assets
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ASSETS_DIR = path.join(process.cwd(), '.planning/design/assets');

/** Resolution shorthands */
const RESOLUTION_ALIASES = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  '2k': { width: 2560, height: 1440 },
};

/**
 * Parse a resolution string to { width, height }.
 * Accepts WxH (e.g. "1920x1080") or shorthand aliases (720p, 1080p, 4k).
 *
 * @param {string} resolution
 * @returns {{ width: number, height: number }}
 */
function resolveResolution(resolution) {
  if (!resolution) return { width: 1920, height: 1080 };

  const alias = RESOLUTION_ALIASES[resolution.toLowerCase()];
  if (alias) return alias;

  const match = resolution.match(/^(\d+)[x×](\d+)$/i);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }

  // Default fallback
  return { width: 1920, height: 1080 };
}

/**
 * Save an MP4 video asset with a JSON sidecar to disk.
 *
 * @param {object} opts
 * @param {string} opts.slug           - Identifier slug (used in filename)
 * @param {string} opts.mp4Path        - Path to the MP4 file to copy into assets dir
 * @param {{ width: number, height: number }} opts.dimensions
 * @param {object} [opts.params]       - Arbitrary params to persist in sidecar
 * @param {string} [opts.source]       - Source identifier (e.g. 'remotion-branded', 'ffmpeg-record')
 * @param {string} [opts.assetsDir]    - Override for the base assets directory (used in tests)
 * @returns {{ path: string, metaPath: string, meta: object }}
 */
function saveVideoAsset({ slug, mp4Path, dimensions, params = {}, source = '', assetsDir }) {
  const baseDir = assetsDir || ASSETS_DIR;
  const videoDir = path.join(baseDir, 'video');
  fs.mkdirSync(videoDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.mp4`;
  const metaFilename = `${slug}-${timestamp}.meta.json`;
  const destPath = path.join(videoDir, filename);
  const metaPath = path.join(videoDir, metaFilename);

  // Copy MP4 to assets directory
  fs.copyFileSync(mp4Path, destPath);

  // Compute SHA-256 of the MP4 file
  const buffer = fs.readFileSync(destPath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  const meta = {
    type: 'video',
    source,
    dimensions,
    timestamp: new Date(timestamp).toISOString(),
    params,
    hash,
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  return { path: destPath, metaPath, meta };
}

/**
 * List all video assets.
 *
 * @param {object} [opts]
 * @param {string} [opts.assetsDir] - Override base assets directory (used in tests)
 * @returns {object[]} Array of asset metadata objects
 */
function listVideoAssets({ assetsDir } = {}) {
  const baseDir = assetsDir || ASSETS_DIR;
  const videoDir = path.join(baseDir, 'video');
  if (!fs.existsSync(videoDir)) return [];

  const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.meta.json'));
  const results = [];

  for (const f of files) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(videoDir, f), 'utf8'));
      results.push({ ...meta, file: f.replace('.meta.json', '.mp4'), dir: 'video' });
    } catch {
      // Skip malformed sidecar files
    }
  }

  return results;
}

module.exports = { saveVideoAsset, listVideoAssets, resolveResolution, ASSETS_DIR };
