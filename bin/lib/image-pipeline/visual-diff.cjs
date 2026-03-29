'use strict';

/**
 * visual-diff.cjs — Perceptual hash-based visual diff engine for the image pipeline.
 *
 * Provides:
 *   - computePhash()        — 64-bit pHash from PNG/image buffer via Sharp + 2D DCT
 *   - hammingDistance()     — bit-level distance between two 64-element hash arrays
 *   - classifyChange()      — 4-tier classification: unchanged/minor/significant/major
 *   - listBranchImages()    — list image files tracked in a git branch
 *   - readFileFromBranch()  — read file buffer from git branch without checkout
 *   - runVisualDiff()       — full pipeline: compare branches, write MD + JSON report
 */

const sharp = require('sharp');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;

// ---------------------------------------------------------------------------
// computePhash(imageBuffer)
// ---------------------------------------------------------------------------
/**
 * Compute 64-bit perceptual hash for an image buffer.
 * Algorithm: resize to 32x32 grayscale → separable 2D DCT-II → top-left 8x8 → median threshold.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<number[]>} 64-element array of 0s and 1s
 */
async function computePhash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(32, 32)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data); // 1024 values (32x32 grayscale)
  const N = 32;

  /**
   * 1D DCT-II with orthonormal normalization.
   * @param {number[]} row - N-element input
   * @returns {number[]} N-element DCT output
   */
  function dct1d(row) {
    const len = row.length;
    return row.map((_, k) => {
      const sum = row.reduce((acc, val, i) =>
        acc + val * Math.cos(Math.PI * k * (2 * i + 1) / (2 * len)), 0);
      return sum * (k === 0 ? Math.sqrt(1 / len) : Math.sqrt(2 / len));
    });
  }

  // Row DCTs: apply DCT to each row
  const rowDct = [];
  for (let r = 0; r < N; r++) {
    rowDct.push(dct1d(pixels.slice(r * N, (r + 1) * N)));
  }

  // Column DCTs: compute DCT for columns 0-7, extract top 8 rows each
  // This gives us the top-left 8x8 block of the 2D DCT
  const colDcts = [];
  for (let c = 0; c < 8; c++) {
    const col = rowDct.map(row => row[c]); // Full N-length column
    colDcts.push(dct1d(col));
  }

  // Extract top-left 8x8 in row-major order: topLeft[r*8 + c] = dct2d[r][c]
  const topLeft = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      topLeft.push(colDcts[c][r]);
    }
  }
  // topLeft now has 64 values

  // Median threshold: values above median → 1, else → 0
  const sorted = [...topLeft].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  return topLeft.map(v => v > median ? 1 : 0);
}

// ---------------------------------------------------------------------------
// hammingDistance(h1, h2)
// ---------------------------------------------------------------------------
/**
 * Compute Hamming distance between two equal-length bit arrays.
 *
 * @param {number[]} h1 - 64-element bit array
 * @param {number[]} h2 - 64-element bit array
 * @returns {number} Number of differing bits (0-64)
 */
function hammingDistance(h1, h2) {
  return h1.reduce((acc, bit, i) => acc + (bit !== h2[i] ? 1 : 0), 0);
}

// ---------------------------------------------------------------------------
// classifyChange(dist)
// ---------------------------------------------------------------------------
/**
 * Classify a Hamming distance into a change tier with a 0-100 score.
 *
 * Tiers:
 *   0        → unchanged
 *   1-5      → minor      (~0-8%)
 *   6-15     → significant (~9-23%)
 *   16+      → major      (25%+)
 *
 * @param {number} dist - Hamming distance (0-64)
 * @returns {{ tier: string, score: number }}
 */
function classifyChange(dist) {
  const score = Math.round((dist / 64) * 100);
  let tier;
  if (dist === 0) tier = 'unchanged';
  else if (dist <= 5) tier = 'minor';
  else if (dist <= 15) tier = 'significant';
  else tier = 'major';
  return { tier, score };
}

// ---------------------------------------------------------------------------
// listBranchImages(branch, cwd)
// ---------------------------------------------------------------------------
/**
 * List all image files tracked in a git branch.
 *
 * @param {string} branch - Git branch or ref name
 * @param {string} cwd    - Working directory for git commands
 * @returns {Set<string>} Set of relative file paths matching image extensions
 * @throws {Error} If git ls-tree fails (e.g. branch doesn't exist)
 */
function listBranchImages(branch, cwd) {
  const result = spawnSync('git', ['ls-tree', '-r', '--name-only', branch], {
    encoding: 'utf8',
    cwd,
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.trim() : '';
    throw new Error(
      `git ls-tree failed for branch '${branch}': ${stderr}\n` +
      `Did you mean to run git fetch first?`
    );
  }

  return new Set(
    result.stdout
      .split('\n')
      .filter(f => IMAGE_EXTENSIONS.test(f))
  );
}

// ---------------------------------------------------------------------------
// readFileFromBranch(branch, filePath, cwd)
// ---------------------------------------------------------------------------
/**
 * Read a file's bytes from a git branch without checking it out.
 * Returns null if the file doesn't exist at that ref or is an LFS pointer.
 *
 * @param {string} branch   - Git branch or ref
 * @param {string} filePath - Relative file path
 * @param {string} cwd      - Working directory for git commands
 * @returns {Buffer|null}
 */
function readFileFromBranch(branch, filePath, cwd) {
  const result = spawnSync('git', ['show', `${branch}:${filePath}`], {
    encoding: 'buffer',
    cwd,
    maxBuffer: 50 * 1024 * 1024, // 50MB safety limit
  });

  if (result.status !== 0) return null;

  const buf = result.stdout;

  // LFS pointer detection: skip files that are LFS pointers
  const head = buf.toString('utf8', 0, 40);
  if (head.startsWith('version https://git-lfs')) {
    console.warn(`[visual-diff] Skipping LFS pointer: ${filePath}`);
    return null;
  }

  return buf;
}

// ---------------------------------------------------------------------------
// runVisualDiff({ branchA, branchB, assetsDir, cwd })
// ---------------------------------------------------------------------------
/**
 * Run a full visual diff between two git branches.
 * Compares all image assets using pHash, classifies changes, and writes reports.
 *
 * @param {object} opts
 * @param {string} opts.branchA   - Source branch (e.g. 'main')
 * @param {string} opts.branchB   - Target branch (e.g. 'feature/redesign')
 * @param {string} opts.assetsDir - Directory to write report files
 * @param {string} opts.cwd       - Working directory for git commands
 * @returns {Promise<{ summary, reportPath, jsonPath, assets }>}
 */
async function runVisualDiff({ branchA, branchB, assetsDir, cwd }) {
  // Ensure output directory exists
  fs.mkdirSync(assetsDir, { recursive: true });

  // 1. List images in each branch
  const setA = listBranchImages(branchA, cwd);
  const setB = listBranchImages(branchB, cwd);

  // 2. Compute set relationships
  const both = new Set([...setA].filter(p => setB.has(p)));
  const newAssets = [...setB].filter(p => !setA.has(p));
  const deletedAssets = [...setA].filter(p => !setB.has(p));

  // 3. Compare images in both branches
  const assets = [];

  for (const filePath of both) {
    const bufA = readFileFromBranch(branchA, filePath, cwd);
    const bufB = readFileFromBranch(branchB, filePath, cwd);

    if (!bufA || !bufB) {
      // LFS pointer or unreadable — skip
      assets.push({ path: filePath, status: 'skipped', reason: 'unreadable' });
      continue;
    }

    try {
      const hashA = await computePhash(bufA);
      const hashB = await computePhash(bufB);
      const dist = hammingDistance(hashA, hashB);
      const { tier, score } = classifyChange(dist);

      if (tier === 'unchanged') {
        assets.push({ path: filePath, status: 'unchanged' });
      } else {
        assets.push({
          path: filePath,
          status: 'changed',
          tier,
          score,
          hammingDistance: dist,
        });
      }
    } catch (err) {
      console.warn(`[visual-diff] pHash failed for ${filePath}: ${err.message}`);
      assets.push({ path: filePath, status: 'error', error: err.message });
    }
  }

  // 4. Add new and deleted assets
  for (const filePath of newAssets) {
    assets.push({ path: filePath, status: 'new' });
  }
  for (const filePath of deletedAssets) {
    assets.push({ path: filePath, status: 'deleted' });
  }

  // 5. Build summary
  const summary = {
    total: assets.filter(a => a.status !== 'skipped' && a.status !== 'error').length,
    unchanged: assets.filter(a => a.status === 'unchanged').length,
    minor: assets.filter(a => a.status === 'changed' && a.tier === 'minor').length,
    significant: assets.filter(a => a.status === 'changed' && a.tier === 'significant').length,
    major: assets.filter(a => a.status === 'changed' && a.tier === 'major').length,
    new: assets.filter(a => a.status === 'new').length,
    deleted: assets.filter(a => a.status === 'deleted').length,
  };

  // 6. Generate timestamp
  const generatedAt = new Date().toISOString();
  const timestamp = Date.now();

  // 7. Write JSON sidecar
  const jsonFilename = `visual-diff-${timestamp}.json`;
  const jsonPath = path.join(assetsDir, jsonFilename);
  const jsonData = {
    branchA,
    branchB,
    generatedAt,
    summary,
    assets,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  // 8. Write Markdown report
  const reportFilename = `visual-diff-${timestamp}.md`;
  const reportPath = path.join(assetsDir, reportFilename);
  const md = generateMarkdownReport({ branchA, branchB, generatedAt, summary, assets });
  fs.writeFileSync(reportPath, md);

  return { summary, reportPath, jsonPath, assets };
}

// ---------------------------------------------------------------------------
// generateMarkdownReport (internal)
// ---------------------------------------------------------------------------
/**
 * Generate a Markdown visual diff report.
 *
 * @param {object} opts
 * @returns {string} Markdown content
 */
function generateMarkdownReport({ branchA, branchB, generatedAt, summary, assets }) {
  const changedAssets = assets.filter(a => a.status === 'changed');
  const newAssets = assets.filter(a => a.status === 'new');
  const deletedAssets = assets.filter(a => a.status === 'deleted');
  const unchangedAssets = assets.filter(a => a.status === 'unchanged');
  const errorAssets = assets.filter(a => a.status === 'error' || a.status === 'skipped');

  const totalCompared = summary.unchanged + summary.minor + summary.significant + summary.major + summary.new + summary.deleted;

  let md = `# Visual Diff Report\n\n`;
  md += `**Branches:** \`${branchA}\` → \`${branchB}\`\n`;
  md += `**Generated:** ${generatedAt}\n`;
  md += `**Assets compared:** ${totalCompared}\n\n`;
  md += `> Note: Only committed (tracked) image files are compared. Untracked files are excluded.\n\n`;

  md += `## Summary\n\n`;
  md += `| Status | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Unchanged | ${summary.unchanged} |\n`;
  md += `| Changed (minor) | ${summary.minor} |\n`;
  md += `| Changed (significant) | ${summary.significant} |\n`;
  md += `| Changed (major) | ${summary.major} |\n`;
  md += `| New (only in B) | ${summary.new} |\n`;
  md += `| Deleted (only in A) | ${summary.deleted} |\n`;
  md += `\n`;

  if (changedAssets.length > 0) {
    md += `## Changed Assets\n\n`;
    for (const asset of changedAssets) {
      md += `### ${asset.path}\n`;
      md += `- **Status:** changed\n`;
      md += `- **Tier:** ${asset.tier}\n`;
      md += `- **Change score:** ${asset.score}%\n`;
      md += `- **Hamming distance:** ${asset.hammingDistance} / 64\n\n`;
    }
  }

  if (newAssets.length > 0) {
    md += `## New Assets\n\n`;
    for (const asset of newAssets) {
      md += `- \`${asset.path}\`\n`;
    }
    md += `\n`;
  } else {
    md += `## New Assets\n\n(none)\n\n`;
  }

  if (deletedAssets.length > 0) {
    md += `## Deleted Assets\n\n`;
    for (const asset of deletedAssets) {
      md += `- \`${asset.path}\`\n`;
    }
    md += `\n`;
  } else {
    md += `## Deleted Assets\n\n(none)\n\n`;
  }

  if (unchangedAssets.length > 0) {
    md += `## Unchanged Assets\n\n`;
    md += `<details>\n`;
    md += `<summary>${unchangedAssets.length} unchanged asset${unchangedAssets.length === 1 ? '' : 's'}</summary>\n\n`;
    for (const asset of unchangedAssets) {
      md += `- \`${asset.path}\`\n`;
    }
    md += `\n</details>\n\n`;
  } else {
    md += `## Unchanged Assets\n\n(none)\n\n`;
  }

  if (errorAssets.length > 0) {
    md += `## Skipped Assets\n\n`;
    for (const asset of errorAssets) {
      const reason = asset.error || asset.reason || 'unknown';
      md += `- \`${asset.path}\` — ${reason}\n`;
    }
    md += `\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  computePhash,
  hammingDistance,
  classifyChange,
  listBranchImages,
  readFileFromBranch,
  runVisualDiff,
};
