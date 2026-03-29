'use strict';

/**
 * rembg.cjs — remove.bg API client with monthly usage tracking.
 *
 * Provides:
 *   - removeBackground() — POST image to remove.bg, save transparent PNG via saveAsset()
 *   - loadUsage()        — load monthly usage count (resets on new month)
 */

const fs = require('fs');
const path = require('path');
const { saveAsset } = require('./assets.cjs');

// Usage tracking constants
const MONTHLY_LIMIT = 50;
const WARN_THRESHOLD = 40;

// Compute USAGE_PATH dynamically so tests can override process.cwd() to isolate storage
function getUsagePath() {
  return path.join(process.cwd(), '.planning/cli-anything/removebg-usage.json');
}

/**
 * Load monthly usage from disk. If the stored month differs from current month,
 * returns a fresh { month, count: 0 } (automatic monthly reset).
 *
 * @returns {{ month: string, count: number }}
 */
function loadUsage() {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const USAGE_PATH = getUsagePath();
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
    if (data.month !== currentMonth) {
      return { month: currentMonth, count: 0 };
    }
    return data;
  } catch {
    return { month: currentMonth, count: 0 };
  }
}

/**
 * Persist monthly usage to disk.
 *
 * @param {{ month: string, count: number }} usage
 */
function saveUsage(usage) {
  const USAGE_PATH = getUsagePath();
  fs.mkdirSync(path.dirname(USAGE_PATH), { recursive: true });
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
}

/**
 * Remove the background from an image using the remove.bg free-tier API.
 *
 * Behaviour:
 *   - Returns null (with console.warn) if REMOVEBG_API_KEY is not set
 *   - Throws if monthly usage >= MONTHLY_LIMIT (50)
 *   - Warns (console.warn) if monthly usage >= WARN_THRESHOLD (40)
 *   - On success, saves result PNG via saveAsset() and increments usage counter
 *
 * @param {object} opts
 * @param {string} opts.inputPath  - Path to the source image file
 * @param {string} opts.slug       - Asset slug for storage
 * @param {string} [opts.outputDir] - Override assets directory (for tests)
 * @returns {Promise<{ buffer: Buffer, path: string, meta: object } | null>}
 */
async function removeBackground({ inputPath, slug, outputDir }) {
  const apiKey = process.env.REMOVEBG_API_KEY;

  if (!apiKey) {
    console.warn('[rembg] REMOVEBG_API_KEY not set — skipping background removal');
    return null;
  }

  const usage = loadUsage();

  if (usage.count >= MONTHLY_LIMIT) {
    throw new Error(`remove.bg monthly limit reached (${MONTHLY_LIMIT}/month) — upgrade or wait until next month`);
  }

  if (usage.count >= WARN_THRESHOLD) {
    console.warn(`[rembg] Warning: ${usage.count}/${MONTHLY_LIMIT} API calls used this month`);
  }

  // Read input file
  const imageBuffer = fs.readFileSync(inputPath);

  // Build multipart form body using native FormData + Blob (Node 20+)
  const formData = new FormData();
  formData.append('image_file', new Blob([imageBuffer]), path.basename(inputPath));
  formData.append('size', 'auto');

  // POST to remove.bg — do NOT set Content-Type manually; fetch handles multipart boundary
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (response.status === 429) {
    throw new Error('remove.bg rate limit exceeded — retry later');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`remove.bg API error: ${response.status} — ${errorText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());

  // Increment usage and persist
  usage.count += 1;
  saveUsage(usage);

  // Save via assets module — do NOT include API key in params
  const { path: assetPath, meta } = saveAsset({
    type: 'rembg',
    slug,
    buffer: resultBuffer,
    dimensions: null,
    params: { inputPath },
    source: 'remove.bg',
    assetsDir: outputDir,
  });

  return { buffer: resultBuffer, path: assetPath, meta };
}

module.exports = { removeBackground, loadUsage, MONTHLY_LIMIT, WARN_THRESHOLD };
