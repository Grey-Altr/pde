'use strict';

/**
 * visual-regression.cjs — Visual regression circuit breaker for experiment runner.
 *
 * Detects visual regressions by comparing screenshot hashes AND metric scores.
 * A regression is only fired when BOTH the screenshot changed AND the metric decreased.
 *
 * Phase 114 — VRCB-01 through VRCB-04.
 * Under 120 lines — scope creep prevention per PITFALLS research.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── Hash utilities ────────────────────────────────────────────────────────────

/**
 * hashScreenshot(filePath)
 *
 * Computes a SHA-256 hex digest of the file at filePath.
 * Returns null on any error (missing file, permission denied, etc.).
 *
 * @param {string} filePath  Absolute or relative path to the PNG/image file
 * @returns {string|null}    64-char hex string or null on error
 */
function hashScreenshot(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

// ─── Regression detection ──────────────────────────────────────────────────────

/**
 * checkVisualRegression({ cwd, slug, currentScreenshotPath, currentScore, baselineScore, direction })
 *
 * Compares the current screenshot hash against a stored baseline hash, then
 * checks whether the metric score also decreased.  A circuit-breaker fires
 * only when BOTH conditions are true (hash changed AND metric worsened).
 *
 * Baseline file location: /tmp/pde-experiment-{slug}/baseline-screenshot.png
 *
 * @param {Object} opts
 * @param {string} opts.cwd                    - project working directory (unused; reserved)
 * @param {string} opts.slug                   - experiment slug (used to locate baseline)
 * @param {string} opts.currentScreenshotPath  - path to current iteration screenshot
 * @param {number} opts.currentScore           - metric score for current iteration
 * @param {number} opts.baselineScore          - metric score at baseline capture time
 * @param {string} opts.direction              - 'max' | 'min' (metric optimization direction)
 * @returns {{ fired: boolean, reason: string, baselineHash: string|null, currentHash: string|null, scoreDelta?: number }}
 */
function checkVisualRegression({ cwd, slug, currentScreenshotPath, currentScore, baselineScore, direction }) {
  const baselinePath = path.join('/tmp', 'pde-experiment-' + slug, 'baseline-screenshot.png');

  const baselineHash = hashScreenshot(baselinePath);
  const currentHash  = hashScreenshot(currentScreenshotPath);

  if (!baselineHash) {
    return { fired: false, reason: 'no_baseline', baselineHash: null, currentHash };
  }

  if (!currentHash) {
    return { fired: false, reason: 'no_current_screenshot', baselineHash, currentHash: null };
  }

  if (baselineHash === currentHash) {
    return { fired: false, reason: 'no_visual_change', baselineHash, currentHash };
  }

  // Visual change detected — check whether the metric also worsened
  const metricDecreased = direction === 'max'
    ? currentScore < baselineScore
    : currentScore > baselineScore;

  const scoreDelta = currentScore - baselineScore;

  if (metricDecreased) {
    return { fired: true, reason: 'visual_regression_detected', baselineHash, currentHash, scoreDelta };
  }

  return { fired: false, reason: 'visual_change_acceptable', baselineHash, currentHash, scoreDelta };
}

// ─── Baseline capture ──────────────────────────────────────────────────────────

/**
 * captureAndStoreBaseline(cwd, slug, targetHtmlPath)
 *
 * Captures a screenshot of targetHtmlPath via Playwright MCP and stores it as
 * the baseline for future regression comparisons.  Fully non-fatal — any
 * Playwright unavailability (not configured, headless error) swallows silently.
 *
 * @param {string} cwd            - project working directory (unused; reserved)
 * @param {string} slug           - experiment slug (determines /tmp storage dir)
 * @param {string} targetHtmlPath - path to the HTML file to screenshot
 * @returns {string|null}         - absolute path to baseline PNG, or null on error
 */
function captureAndStoreBaseline(cwd, slug, targetHtmlPath) {
  try {
    const bridge = require('./mcp-bridge.cjs');
    const baselineDir  = path.join('/tmp', 'pde-experiment-' + slug);
    fs.mkdirSync(baselineDir, { recursive: true });

    const baselinePath = path.join(baselineDir, 'baseline-screenshot.png');
    const fileUrl      = 'file://' + encodeURI(path.resolve(targetHtmlPath));

    bridge.call('playwright:navigate',   { url: fileUrl });
    bridge.call('playwright:screenshot', { filename: baselinePath, type: 'png' });

    try { bridge.call('playwright:close', {}); } catch (_) {}

    return baselinePath;
  } catch {
    return null;
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = { hashScreenshot, checkVisualRegression, captureAndStoreBaseline };
