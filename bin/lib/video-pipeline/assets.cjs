'use strict';

/**
 * assets.cjs — Shared asset storage module for the video pipeline.
 *
 * Provides:
 *   - saveVideoAsset()     — copy MP4 + write .meta.json sidecar to .planning/design/assets/video/
 *   - resolveResolution()  — parse WxH string or shorthand alias to { width, height }
 *   - ASSETS_DIR           — base assets directory constant
 *   - RESOLUTION_ALIASES   — shorthand alias map
 *   - FFMPEG               — path to bundled ffmpeg-static binary
 */

const fs = require('fs');
const path = require('path');

const FFMPEG = require('ffmpeg-static');
if (!FFMPEG) throw new Error('ffmpeg-static: no binary found for this platform');

const ASSETS_DIR = path.join(process.cwd(), '.planning/design/assets');

const RESOLUTION_ALIASES = {
  '720p': '1280x720',
  '1080p': '1920x1080',
  '4k': '3840x2160',
};

/**
 * Resolve a resolution string to { width, height }.
 */
function resolveResolution(r) {
  if (r === undefined) r = '1920x1080';
  const str = String(r).trim();

  if (RESOLUTION_ALIASES[str]) {
    const wh = RESOLUTION_ALIASES[str];
    const [w, h] = wh.split('x').map(Number);
    return { width: w, height: h };
  }

  const match = /^(\d+)[xX](\d+)$/.exec(str);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }

  throw new Error(
    `Unknown resolution format: "${r}". Use an alias (720p, 1080p, 4k) or WxH format (e.g. 1280x720).`
  );
}

/**
 * Save a video asset (MP4) with a JSON sidecar to disk.
 */
function saveVideoAsset({ slug, mp4Path, dimensions, params, source, assetsDir } = {}) {
  dimensions = dimensions || {};
  params = params || {};
  source = source || '';

  const baseDir = assetsDir || ASSETS_DIR;
  const videoDir = path.join(baseDir, 'video');
  fs.mkdirSync(videoDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.mp4`;
  const metaFilename = `${slug}-${timestamp}.meta.json`;
  const destPath = path.join(videoDir, filename);
  const metaPath = path.join(videoDir, metaFilename);

  fs.copyFileSync(mp4Path, destPath);

  const meta = {
    type: 'video',
    source,
    dimensions,
    timestamp: new Date(timestamp).toISOString(),
    params,
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  return { path: destPath, metaPath, meta };
}

module.exports = { saveVideoAsset, resolveResolution, ASSETS_DIR, RESOLUTION_ALIASES, FFMPEG };
