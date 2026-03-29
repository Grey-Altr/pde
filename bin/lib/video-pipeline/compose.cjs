'use strict';

/**
 * compose.cjs — Remotion token extraction + render orchestration for the video pipeline.
 *
 * Provides:
 *   - extractTokens(designDir) — read SYS-*.json DTCG tokens, return { colors, fonts }
 *   - composeVideo(opts)       — extract tokens, invoke npx remotion render, save MP4 asset
 *
 * VID-03: Remotion branded video composition
 * VID-04: PDE design tokens (colors, fonts) passed as Remotion inputProps
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/** Default tokens matching BrandedVideo.tsx fallback defaults */
const DEFAULT_TOKENS = {
  colors: {
    background: '#0a0a0a',
    primary: '#ffffff',
    accent: '#3b82f6',
  },
  fonts: {
    heading: 'Arial',
    body: 'Arial',
  },
};

/**
 * Walk a DTCG token object and extract color and font values.
 *
 * @param {object} obj       - Parsed JSON from SYS-*.json
 * @param {object} collected - Accumulated { colors, fonts } (mutated in place)
 */
function walkTokens(obj, collected) {
  if (!obj || typeof obj !== 'object') return;

  // Check if this node is a DTCG token leaf: has $type and $value
  if (obj.$type && obj.$value !== undefined) {
    return; // Leaf — caller handles assignment
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // Skip DTCG meta keys

    if (value && typeof value === 'object' && value.$type && value.$value !== undefined) {
      // This is a DTCG token: { $type: 'color', $value: '#...' }
      if (value.$type === 'color') {
        // Map well-known keys to our color slots
        const k = key.toLowerCase();
        if (k === 'background' || k === 'bg') {
          collected.colors.background = value.$value;
        } else if (k === 'primary' || k === 'brand' || k === 'main') {
          collected.colors.primary = value.$value;
        } else if (k === 'accent' || k === 'secondary' || k === 'highlight') {
          collected.colors.accent = value.$value;
        }
      } else if (value.$type === 'fontFamily') {
        const k = key.toLowerCase();
        if (k === 'heading' || k === 'display' || k === 'title') {
          collected.fonts.heading = value.$value;
        } else if (k === 'body' || k === 'text' || k === 'paragraph') {
          collected.fonts.body = value.$value;
        }
      }
    } else if (value && typeof value === 'object') {
      // Recurse into nested groups
      walkTokens(value, collected);
    }
  }
}

/**
 * Extract PDE design tokens from SYS-*.json DTCG files in the design directory.
 *
 * @param {string} [designDir] - Path to the directory containing SYS-*.json files.
 *                               Defaults to .planning/design relative to cwd.
 * @returns {{ colors: { background, primary, accent }, fonts: { heading, body } }}
 */
function extractTokens(designDir) {
  const dir = designDir || path.join(process.cwd(), '.planning/design');

  // Start with DEFAULT_TOKENS (deep clone)
  const collected = {
    colors: { ...DEFAULT_TOKENS.colors },
    fonts: { ...DEFAULT_TOKENS.fonts },
  };

  // Glob for SYS-*.json files
  let sysFiles = [];
  try {
    if (!fs.existsSync(dir)) return collected;
    sysFiles = fs.readdirSync(dir).filter(f => f.match(/^SYS-.*\.json$/));
  } catch {
    return DEFAULT_TOKENS;
  }

  if (sysFiles.length === 0) return collected;

  for (const file of sysFiles) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const parsed = JSON.parse(raw);
      walkTokens(parsed, collected);
    } catch {
      // Malformed JSON — skip, use defaults for remaining
      return {
        colors: { ...DEFAULT_TOKENS.colors },
        fonts: { ...DEFAULT_TOKENS.fonts },
      };
    }
  }

  return collected;
}

/**
 * Compose a branded video using Remotion.
 *
 * @param {object} opts
 * @param {string}  [opts.title='Product Demo']  - Video title text
 * @param {string}  [opts.subtitle='']           - Optional subtitle text
 * @param {string}  [opts.slug='branded']        - Slug for output filename
 * @param {string}  [opts.resolution='1920x1080'] - Resolution string (WxH or alias)
 * @param {number}  [opts.durationFrames=150]    - Duration in frames
 * @param {string}  [opts.designDir]             - Override design token directory
 * @param {string}  [opts.assetsDir]             - Override assets base directory
 * @returns {Promise<{ path: string, meta: object }>}
 */
async function composeVideo({
  title = 'Product Demo',
  subtitle = '',
  slug = 'branded',
  resolution = '1920x1080',
  durationFrames = 150,
  designDir,
  assetsDir,
} = {}) {
  const { resolveResolution, saveVideoAsset } = require('./assets.cjs');

  const { width, height } = resolveResolution(resolution);
  const tokens = extractTokens(designDir);

  // Write inputProps to temp JSON file
  const propsPath = path.join(os.tmpdir(), `remotion-props-${Date.now()}.json`);
  const props = {
    ...tokens,
    title,
    subtitle,
    durationInFrames: durationFrames,
  };
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

  const remotionDir = path.join(__dirname, 'remotion');
  const outputPath = path.join(os.tmpdir(), `${slug}-${Date.now()}.mp4`);

  try {
    execFileSync(
      'npx',
      [
        'remotion', 'render',
        'index.ts',
        'branded',
        outputPath,
        '--codec', 'h264',
        '--width', String(width),
        '--height', String(height),
        '--props', propsPath,
      ],
      {
        cwd: remotionDir,
        stdio: 'inherit',
      }
    );
  } finally {
    // Clean up temp props file
    try { fs.unlinkSync(propsPath); } catch { /* ignore */ }
  }

  // Save to assets directory with sidecar
  const result = saveVideoAsset({
    slug,
    mp4Path: outputPath,
    dimensions: { width, height },
    source: 'remotion-branded',
    params: { title, subtitle, durationFrames, resolution },
    assetsDir,
  });

  // Clean up temp MP4 after copying to assets
  try { fs.unlinkSync(outputPath); } catch { /* ignore */ }

  return { path: result.path, meta: result.meta };
}

module.exports = { composeVideo, extractTokens, DEFAULT_TOKENS };
