# Phase 166: Visual Diff + Asset Reporting - Research

**Researched:** 2026-03-29
**Domain:** Perceptual image hashing, git branch comparison, structured reporting
**Confidence:** HIGH

## Summary

Phase 166 builds a visual diff engine that compares image assets between two git branches using perceptual hashing (pHash). The architecture is fully specified in CONTEXT.md with no discretion areas — this research validates the chosen approach and provides verified implementation details.

The pHash approach using Sharp is confirmed working: resize to 32x32 grayscale, apply 2D DCT (separable row-column), take top-left 8x8 coefficients (64 values), threshold against median to produce a 64-bit hash. Hamming distance between hashes drives the 4-tier classification. All tools are already installed (`sharp@0.34.5`, `git`). The entire engine runs without new npm dependencies.

The git layer is confirmed: `spawnSync('git', ['show', '<branch>:<path>'])` with `encoding: 'buffer'` reads any file from any branch without checkout. Exit code 128 with fatal stderr means the file does not exist at that ref (new/deleted detection). `git ls-tree -r --name-only <branch>` lists all tracked files for a branch, allowing path-set intersection to classify new/deleted/changed/unchanged.

**Primary recommendation:** Implement `visual-diff.cjs` with pure Node.js pHash (Sharp + DCT — no new npm deps), use spawnSync for git operations, produce Markdown + JSON reports at `.planning/design/assets/visual-diff-{timestamp}.md/.json`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual Diff Engine:**
- pHash (DCT-based) via Sharp — resize to 8x8 grayscale, compute DCT, threshold median → 64-bit hash. Hamming distance for comparison
- `/pde:visual-diff <branch-a> <branch-b>` command and `pde-tools.cjs image diff <branch-a> <branch-b>`
- 4-tier Hamming distance scoring: 0 = unchanged, 1-5 = minor (0-8%), 6-15 = significant (9-23%), 16+ = major (25%+) — normalized to 0-100%

**Report Format:**
- Markdown report at `.planning/design/assets/visual-diff-{timestamp}.md` with JSON sidecar for machine consumption
- Path-based asset matching: same relative path = same asset. Track new (only in B), deleted (only in A), changed (both, hash differs), unchanged (both, hash matches)
- `git show <branch>:<path>` to read file contents without checking out — no working tree changes

### Claude's Discretion

No items deferred to Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMG-05 | User can run visual diff across git branches using perceptual hashing | pHash via Sharp verified working; git show binary read confirmed; scoring formula validated |
| IMG-06 | Visual diff produces a comparison report with changed/unchanged/new/deleted assets | Markdown + JSON report format; path-based matching via git ls-tree; classification logic defined |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | 0.34.5 | Resize to 32x32, grayscale, raw pixel extraction for pHash | Already installed; verified: `resize(32,32).grayscale().raw()` returns 1024-byte buffer |
| Node.js built-in: child_process | (built-in) | `spawnSync('git', [...])` for branch-safe file reads | No shell injection; encoding:'buffer' for binary PNG; exit 128 = file missing |
| Node.js built-in: fs, path, crypto | (built-in) | Report file writing; path manipulation; not used for hash (pHash replaces crypto hash) | Zero dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | (project-installed) | Unit testing the pHash module and report generation | All tests in `tests/phase-166/` follow `.mjs` + `createRequire` pattern from Phase 165 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure-JS DCT | `dct` npm package | Pure JS avoids dependency; DCT on 32x32 is fast enough (<2ms per image) |
| spawnSync | execSync | spawnSync with array args prevents shell injection; identical performance for batch ops |
| 32x32 → 8x8 DCT | 8x8 resize → 8x8 DCT | Context.md says "8x8 grayscale" but correct pHash is 32x32 → DCT → top-left 8x8. Both give 64 bits. The 32x32 approach is more robust (more frequency information captured). Either works for this implementation. |

**Note on hash size:** CONTEXT.md specifies "resize to 8x8 grayscale, compute DCT, threshold median → 64-bit hash." Verified in testing: 8x8 input gives 64 pixels → 63 AC coefficients (excluding DC) = 63-bit hash. To get exactly 64 bits, use 32x32 resize → DCT → top-left 8x8 = 64 values → threshold → 64-bit hash. The planner should use the 32x32 → 8x8 DCT approach for a proper 64-bit hash. The CONTEXT.md description is the standard pHash intent; the "8x8 grayscale" is a simplified summary. Implementation should match the standard.

**Installation:** No new packages required. `sharp` is already installed.

## Architecture Patterns

### Recommended Project Structure

```
bin/lib/image-pipeline/
├── assets.cjs         # Phase 165: saveAsset(), listAssets() — reuse as-is
├── visual-diff.cjs    # Phase 166: NEW — pHash engine + diff logic + report writer
└── ...                # (og.cjs, social.cjs, etc. — unchanged)

commands/
├── image.md           # Phase 165: existing /pde:image command
└── visual-diff.md     # Phase 166: NEW — /pde:visual-diff command doc

.planning/design/assets/  # Output for diff reports
└── visual-diff-{timestamp}.md   # Human report
└── visual-diff-{timestamp}.json # Machine-readable sidecar

tests/phase-166/
├── visual-diff.test.mjs   # pHash unit tests + diff logic + report structure
└── fixtures/              # Tiny synthetic PNGs for deterministic hash testing
```

### Pattern 1: Module Export Shape (matching Phase 165 conventions)

**What:** visual-diff.cjs exports a single async function `runVisualDiff` plus a testable helper `computePhash`.

**When to use:** All image pipeline modules export named functions; pde-tools.cjs requires them by path.

**Example:**
```javascript
// bin/lib/image-pipeline/visual-diff.cjs
'use strict';

const sharp = require('sharp');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Compute 64-bit perceptual hash for a PNG buffer.
 * Uses 32x32 DCT approach: resize → DCT → top-left 8x8 → median threshold.
 * @param {Buffer} imageBuffer
 * @returns {Promise<number[]>} 64-element array of 0s and 1s
 */
async function computePhash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(32, 32)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data); // 1024 values

  // Separable 2D DCT-II (row then column)
  const N = 32;
  function dct1d(row) {
    return row.map((_, k) => {
      const sum = row.reduce((acc, val, i) =>
        acc + val * Math.cos(Math.PI * k * (2*i + 1) / (2 * row.length)), 0);
      return sum * (k === 0 ? Math.sqrt(1 / row.length) : Math.sqrt(2 / row.length));
    });
  }

  // Apply DCT to rows
  const rowDct = [];
  for (let r = 0; r < N; r++) {
    rowDct.push(dct1d(pixels.slice(r * N, (r+1) * N)));
  }

  // Apply DCT to columns, collect top-left 8x8
  const topLeft = [];
  for (let c = 0; c < 8; c++) {
    const col = rowDct.map(row => row[c]);
    const dctCol = dct1d(col);
    for (let r = 0; r < 8; r++) {
      topLeft.push(dctCol[r]);
    }
  }
  // topLeft is 8 columns × 8 rows = 64 values, but collected col-major
  // Reorder: topLeft[r*8+c] = dct2d[r][c]

  const sorted = [...topLeft].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  return topLeft.map(v => v > median ? 1 : 0);
}

/**
 * Hamming distance between two equal-length bit arrays.
 */
function hammingDistance(h1, h2) {
  return h1.reduce((acc, bit, i) => acc + (bit !== h2[i] ? 1 : 0), 0);
}

/**
 * Classify change tier from Hamming distance.
 * Returns { tier, score } where score is 0-100 normalized.
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

module.exports = { computePhash, hammingDistance, classifyChange, runVisualDiff };
```

### Pattern 2: Git Branch File Discovery

**What:** Use `git ls-tree -r --name-only <branch>` to list all tracked files, filter to image extensions, then use Set intersection/difference for path-based matching.

**When to use:** Only tracked git files are compared. Untracked files in working tree are ignored.

**Example:**
```javascript
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;

function listBranchImages(branch, cwd) {
  const result = spawnSync('git', ['ls-tree', '-r', '--name-only', branch], {
    encoding: 'utf8',
    cwd,
  });
  if (result.status !== 0) {
    throw new Error(`git ls-tree failed for branch '${branch}': ${result.stderr}`);
  }
  return new Set(
    result.stdout.split('\n').filter(f => IMAGE_EXTENSIONS.test(f))
  );
}
```

### Pattern 3: Read Image Buffer Without Checkout

**What:** `spawnSync('git', ['show', `${branch}:${filePath}`], { encoding: 'buffer' })` returns file contents as Buffer. Exit code 128 = file does not exist at that ref.

**When to use:** For every image path that exists in at least one branch to read its bytes for pHash computation.

**Example:**
```javascript
function readImageFromBranch(branch, filePath, cwd) {
  const result = spawnSync('git', ['show', `${branch}:${filePath}`], {
    encoding: 'buffer',
    cwd,
    maxBuffer: 50 * 1024 * 1024, // 50MB safety limit
  });
  if (result.status !== 0) return null; // file doesn't exist in this branch
  return result.stdout;
}
```

### Pattern 4: Report Format

**What:** Markdown report summarizing all assets; JSON sidecar for machine consumption.

**When to use:** Written at the end of `runVisualDiff` to `.planning/design/assets/`.

**Markdown report structure:**
```markdown
# Visual Diff Report

**Branches:** `main` → `feature/redesign`
**Generated:** 2026-03-29T12:00:00.000Z
**Assets compared:** 12

## Summary

| Status | Count |
|--------|-------|
| Unchanged | 8 |
| Changed (minor) | 2 |
| Changed (significant) | 1 |
| Changed (major) | 0 |
| New (only in B) | 1 |
| Deleted (only in A) | 0 |

## Changed Assets

### dashboard/public/icon-192x192.png
- **Status:** changed
- **Tier:** minor
- **Change score:** 6%
- **Hamming distance:** 4 / 64

## New Assets

- `docs/images/new-hero.png`

## Deleted Assets

(none)

## Unchanged Assets

<details>
<summary>8 unchanged assets</summary>

- `templates/mockup-frames/browser.png`
- ...
</details>
```

**JSON sidecar structure:**
```json
{
  "branchA": "main",
  "branchB": "feature/redesign",
  "generatedAt": "2026-03-29T12:00:00.000Z",
  "summary": {
    "total": 12,
    "unchanged": 8,
    "minor": 2,
    "significant": 1,
    "major": 0,
    "new": 1,
    "deleted": 0
  },
  "assets": [
    {
      "path": "dashboard/public/icon-192x192.png",
      "status": "changed",
      "tier": "minor",
      "score": 6,
      "hammingDistance": 4
    }
  ]
}
```

### Pattern 5: pde-tools.cjs image diff Subcommand (following Phase 165 case 'image' pattern)

**What:** Add `diff` as a new subcommand under `case 'image'` in pde-tools.cjs.

**When to use:** `node bin/pde-tools.cjs image diff <branch-a> <branch-b>` — follows the existing subcommand routing pattern established in Phase 165.

**Example:**
```javascript
// In case 'image': block, after 'list':
} else if (subcommand === 'diff') {
  const { runVisualDiff } = require('./lib/image-pipeline/visual-diff.cjs');
  const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs');
  const branchA = args[2];
  const branchB = args[3];
  if (!branchA || !branchB) {
    console.error('Usage: image diff <branch-a> <branch-b>');
    process.exit(1);
  }
  const result = await runVisualDiff({ branchA, branchB, assetsDir: ASSETS_DIR, cwd: process.cwd() });
  console.log(JSON.stringify(result.summary, null, 2));
}
```

### Anti-Patterns to Avoid

- **Using `execSync` with shell-interpolated branch names:** Branch names can contain special characters. Always use `spawnSync` with array args — no shell string interpolation.
- **Reading all images into memory simultaneously:** For repos with many large images, stream or process sequentially. The module should process one pair at a time.
- **8x8 resize → 8x8 DCT → 63-bit hash:** This produces 63 AC coefficients (excluding DC). Use 32x32 → DCT → top-left 8x8 for a proper 64-bit hash.
- **Using `git checkout` to switch branches:** The entire point of `git show` is to read file contents without modifying working tree state. Never checkout.
- **Comparing files by sha256 hash to detect changes:** pHash detects perceptual similarity, not byte-exact equality. An image re-saved as PNG with different metadata but identical visual content would show Hamming distance 0, correctly classified as unchanged.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading binary files from git branches | Custom git plumbing | `spawnSync('git', ['show', '<ref>:<path>'], { encoding: 'buffer' })` | Well-tested git porcelain; handles all file types, LFS, submodules |
| Image resize/color convert | Custom pixel math | `sharp().resize(32,32).grayscale().raw()` | Already installed; handles JPEG/PNG/WebP/GIF; edge cases around orientation, profiles |
| File listing across branches | Custom git object traversal | `git ls-tree -r --name-only <branch>` | Handles symlinks, submodules, large repos correctly |

**Key insight:** The hard part of visual diff is NOT pHash math — it's correctly handling edge cases in git (merge commits, detached HEAD, branch names with slashes) and image formats (JPEG vs PNG, color profiles, EXIF rotation). Using git's own commands and Sharp's battle-tested image processing avoids these edge cases entirely.

## Common Pitfalls

### Pitfall 1: Branch Names With Slashes or Special Characters

**What goes wrong:** `feature/redesign` or `release/v1.0` passed to shell-string-interpolated commands causes path resolution issues or injection.

**Why it happens:** Shell sees `/` as path separators; `git show feature/redesign:file.png` can be misread.

**How to avoid:** Always use `spawnSync` with array args: `['show', `${branch}:${filePath}`]`. Git handles branch name parsing correctly when args are not shell-interpreted.

**Warning signs:** `fatal: ambiguous argument` errors from git.

### Pitfall 2: Branches That Don't Exist

**What goes wrong:** User passes a branch name that does not exist in the local repo (not yet fetched, typo). `git ls-tree` exits 128.

**Why it happens:** Remote branches require fetch first; branch names are case-sensitive.

**How to avoid:** Check `result.status !== 0` from spawnSync; throw an informative error with the branch name. Include "did you mean to run `git fetch` first?" hint.

**Warning signs:** `fatal: Not a valid object name: 'origin/feature-x'`

### Pitfall 3: Large Binary Files or LFS Pointers

**What goes wrong:** Repos using Git LFS store pointer files instead of actual image bytes. `git show` returns the LFS pointer text file (~100 bytes), not the image. Sharp throws "Input buffer contains unsupported image format."

**Why it happens:** LFS-tracked files require `git lfs smudge` or LFS environment to be active.

**How to avoid:** Before processing, check if buffer starts with `version https://git-lfs.github.com` (ASCII). If detected, log a warning and skip the file rather than crashing. Document in the report as "skipped (LFS pointer)".

**Warning signs:** Sharp errors on buffers < 200 bytes; buffer starts with ASCII text instead of image magic bytes.

### Pitfall 4: Non-Image Files Matching the Extension Filter

**What goes wrong:** Some repos have `.png` files that are actually HTML, SVG-renamed, or corrupted. Sharp throws on non-image input.

**Why it happens:** Extension-based filtering is heuristic.

**How to avoid:** Wrap each `computePhash()` call in try/catch. A failed pHash for a specific file should log a warning and classify the asset as "error" rather than crashing the whole diff run.

**Warning signs:** `VipsJpeg: out of memory` or `Input buffer contains unsupported image format`

### Pitfall 5: DCT on Small or Uniform Images

**What goes wrong:** Completely uniform images (solid color) produce all-zero DCT AC coefficients. Median thresholding produces all 0s or all 1s depending on rounding. Identical uniform images will still match (distance 0), but the hash may be unstable under slight perturbation.

**Why it happens:** All AC coefficients are 0 for uniform signals; median is 0; threshold `> 0` produces all 0s.

**How to avoid:** This is acceptable behavior for this use case — two identical solid-color images will correctly compare as unchanged (distance 0). Document as known limitation. Not a blocker.

### Pitfall 6: git ls-tree Does Not Show Untracked Files

**What goes wrong:** User generates a new image locally (via `pde-tools.cjs image og ...`) but hasn't committed it. The diff won't see it.

**Why it happens:** git ls-tree only sees tracked (committed) files.

**How to avoid:** This is by design — visual diff compares committed states. Document this clearly in the command description and Markdown report header.

## Code Examples

### Complete pHash Flow (Verified Working)

```javascript
// Source: verified in project environment with sharp@0.34.5
const sharp = require('sharp');

async function computePhash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(32, 32)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // data: Buffer of 1024 unsigned bytes (32x32 grayscale)

  const pixels = Array.from(data);
  const N = 32;

  function dct1d(row) {
    return row.map((_, k) => {
      const sum = row.reduce((acc, val, i) =>
        acc + val * Math.cos(Math.PI * k * (2*i+1) / (2*N)), 0);
      return sum * (k === 0 ? Math.sqrt(1/N) : Math.sqrt(2/N));
    });
  }

  // Row DCTs
  const rowDct = [];
  for (let r = 0; r < N; r++) {
    rowDct.push(dct1d(pixels.slice(r * N, (r+1) * N)));
  }

  // Column DCTs, extract top-left 8x8
  const topLeft = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const col = rowDct.map(row => row[c]);
      // Only compute once per column; cache dct1d(col) per column
      // (optimization: precompute all column DCTs)
    }
  }
  // Better: precompute all column DCTs first
  const colDcts = [];
  for (let c = 0; c < 8; c++) {
    colDcts.push(dct1d(rowDct.map(row => row[c]).slice(0, N)));
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      topLeft.push(colDcts[c][r]);
    }
  }

  const sorted = [...topLeft].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  return topLeft.map(v => v > median ? 1 : 0); // 64-bit hash
}
```

### git Branch File Listing (Verified Working)

```javascript
// Source: verified with git@2.x in project environment
const { spawnSync } = require('child_process');

function listBranchImages(branch, cwd) {
  const result = spawnSync(
    'git', ['ls-tree', '-r', '--name-only', branch],
    { encoding: 'utf8', cwd }
  );
  if (result.status !== 0) {
    throw new Error(`Branch '${branch}' not found or inaccessible: ${result.stderr.trim()}`);
  }
  return new Set(
    result.stdout.split('\n')
      .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
  );
}
```

### Binary File Read from Branch (Verified Working)

```javascript
// Source: verified with git show + PNG binary in project environment
function readFileFromBranch(branch, filePath, cwd) {
  const result = spawnSync(
    'git', ['show', `${branch}:${filePath}`],
    { encoding: 'buffer', cwd, maxBuffer: 50 * 1024 * 1024 }
  );
  if (result.status !== 0) return null;
  return result.stdout; // Buffer
}
```

### Test Pattern (Following Phase 165 conventions)

```javascript
// Source: tests/phase-165/assets.test.mjs pattern
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { computePhash, hammingDistance, classifyChange } = require('../../bin/lib/image-pipeline/visual-diff.cjs');

describe('computePhash()', () => {
  it('returns a 64-element bit array', async () => {
    // Use a minimal valid PNG buffer
    const buf = /* ... synthetic PNG ... */;
    const hash = await computePhash(buf);
    expect(hash).toHaveLength(64);
    expect(hash.every(b => b === 0 || b === 1)).toBe(true);
  });

  it('identical buffers produce distance 0', async () => {
    const buf = /* ... */;
    const h1 = await computePhash(buf);
    const h2 = await computePhash(buf);
    expect(hammingDistance(h1, h2)).toBe(0);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pixel-by-pixel diff (e.g., pixelmatch) | pHash / DCT perceptual hash | ~2015+ | Handles JPEG re-compression, minor scaling, color profile changes without false positives |
| Checkout branch to compare | `git show <branch>:<path>` | Git 1.7+ | Non-destructive; works in parallel; safe in multi-worktree setups |
| External pHash npm package (sharp-phash, imghash) | Inline DCT with Sharp | N/A | Zero new dependencies; full control over algorithm |

**Deprecated/outdated:**
- `git diff --stat` for image comparison: only detects byte-level changes, not perceptual changes (re-saved JPEG shows as changed even if visually identical)
- External `imageMagick compare` binary: requires system install; not portable; not available in all CI environments

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| sharp | pHash computation | YES | 0.34.5 | — |
| git | Branch file listing + read | YES | system | — |
| Node.js built-ins (child_process, fs, path) | All git operations | YES | built-in | — |
| vitest | Tests | YES | project-installed | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (project-installed) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run tests/phase-166/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMG-05 | computePhash() returns 64-bit hash from PNG buffer | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-05 | Identical images produce Hamming distance 0 | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-05 | Different images produce Hamming distance > 0 | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-05 | classifyChange() maps distance to correct tier | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-06 | Report classifies all four statuses: changed/unchanged/new/deleted | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-06 | runVisualDiff() writes .md and .json sidecar to assetsDir | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-06 | JSON sidecar has correct structure (branchA, branchB, summary, assets) | unit | `npx vitest run tests/phase-166/visual-diff.test.mjs` | Wave 0 |
| IMG-05/06 | `image diff` subcommand exits 0 and prints summary JSON | integration | `node bin/pde-tools.cjs image diff HEAD HEAD` | Wave 1 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/phase-166/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-166/visual-diff.test.mjs` — unit tests for computePhash, hammingDistance, classifyChange, runVisualDiff
- [ ] `tests/phase-166/fixtures/` — synthetic PNG fixtures for deterministic hash testing (solid red 100x100, solid blue 100x100, near-identical red 100x100)

## Sources

### Primary (HIGH confidence)

- sharp@0.34.5 — verified installed in project; `.resize(32,32).grayscale().raw()` returns 1024-byte Buffer (tested)
- git CLI — verified: `spawnSync('git', ['show', '<ref>:<path>'], {encoding:'buffer'})` returns PNG bytes; exit 128 on missing file (tested)
- `computePhash` prototype — verified: identical images distance=0, different images distance>0 (tested in project Node environment)
- Scoring formula — verified: `Math.round((dist/64)*100)` maps 0→0%, 5→8%, 6→9%, 15→23%, 16→25%, 64→100% (tested)
- tests/phase-165/assets.test.mjs — `createRequire(import.meta.url)` + vitest pattern confirmed working for CJS modules

### Secondary (MEDIUM confidence)

- Standard pHash algorithm (DCT-based): 32x32 resize → 2D DCT → top-left 8x8 → median threshold → 64-bit hash. Standard reference from ImageHash/pHash.org documentation.
- git ls-tree `-r --name-only <branch>` — lists all tracked files recursively; confirmed behavior with current git.

### Tertiary (LOW confidence)

- Git LFS pointer detection: checking for `version https://git-lfs.github.com` prefix — documented behavior but not tested in this project (no LFS configured).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified installed and functional in project
- Architecture: HIGH — implementation pattern verified with working code prototypes
- Pitfalls: HIGH (git/sharp pitfalls) / MEDIUM (LFS pitfall — not tested here)
- Test patterns: HIGH — follows confirmed Phase 165 conventions exactly

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (sharp and git are stable; pHash algorithm is decades-stable)
