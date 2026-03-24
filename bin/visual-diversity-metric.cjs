#!/usr/bin/env node
'use strict';

// visual-diversity-metric.cjs
// IDT-01 through IDT-03: Computes visual diversity from screenshot hash variance.
// Contract: exit 0 always, stdout last line = numeric score (0-100).
// Usage: node bin/visual-diversity-metric.cjs <directory-with-pngs>
// Returns: Math.round((unique_hashes / total_screenshots) * 100)

const fs = require('fs');
const path = require('path');

/**
 * computeVisualDiversity(screenshotPaths)
 *
 * Computes visual diversity from screenshot hash variance.
 * Returns Math.round((unique_hashes / total) * 100).
 *
 * @param {string[]} screenshotPaths  Array of absolute/relative paths to PNG files
 * @returns {number}  Diversity score 0-100
 */
function computeVisualDiversity(screenshotPaths) {
  let hashScreenshot;
  try {
    hashScreenshot = require(path.join(__dirname, 'lib', 'visual-regression.cjs')).hashScreenshot;
  } catch {
    return 0;
  }

  const hashes = screenshotPaths
    .map(p => hashScreenshot(p))
    .filter(h => h !== null);
  if (hashes.length === 0) return 0;
  const uniqueHashes = new Set(hashes);
  return Math.round((uniqueHashes.size / hashes.length) * 100);
}

// Only run as CLI script when invoked directly (not when required as a module)
if (require.main === module) {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir)) {
    process.stdout.write('0\n');
    process.exit(0);
  }

  // Verify hashScreenshot is loadable
  let hashScreenshot;
  try {
    hashScreenshot = require(path.join(__dirname, 'lib', 'visual-regression.cjs')).hashScreenshot;
  } catch {
    process.stdout.write('0\n');
    process.exit(0);
  }

  try {
    const pngFiles = fs.readdirSync(dir)
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(dir, f));

    if (pngFiles.length === 0) {
      process.stdout.write('0\n');
      process.exit(0);
    }

    const score = computeVisualDiversity(pngFiles);

    if (pngFiles.length > 1 && score === Math.round(100 / pngFiles.length)) {
      // All identical — warn but don't fail
      process.stderr.write('[Low visual diversity — all concepts rendered identically. Check wireframe HTML completeness.]\n');
    }

    process.stdout.write(score + '\n');
  } catch {
    process.stdout.write('0\n');
  }
}

module.exports = { computeVisualDiversity };
