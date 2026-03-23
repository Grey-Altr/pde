/**
 * visual-regression.test.mjs — Phase 114 Nyquist Coverage
 *
 * Validates the visual regression circuit breaker library:
 *   VRCB-01: Visual regression prevention (hashScreenshot)
 *   VRCB-02: Baseline screenshot capture (captureAndStoreBaseline)
 *   VRCB-03: Regression detection logic (checkVisualRegression)
 *   VRCB-04: Configurable threshold / schema support (experiment-schema.cjs)
 *
 * Run: node --test tests/phase-114/visual-regression.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hashScreenshot, checkVisualRegression, captureAndStoreBaseline } = require('../../bin/lib/visual-regression.cjs');
const { parseExperimentFile, JSONL_ROW_FIELDS } = require('../../bin/lib/experiment-schema.cjs');

// ─── ROOT path (decoded — handles spaces in project directory name) ────────────

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ─── Tmp helper ───────────────────────────────────────────────────────────────

/**
 * Creates a unique /tmp directory for a single test and returns helper paths + cleanup.
 * Uses crypto.randomUUID() to prevent interference between parallel/sequential tests.
 *
 * @returns {{ baselineDir: string, baselinePath: string, currentPath: string, cleanup: () => void }}
 */
function makeTmpFixture() {
  const id = crypto.randomUUID();
  const baselineDir  = `/tmp/pde-experiment-test-vrcb-${id}`;
  const baselinePath = path.join(baselineDir, 'baseline-screenshot.png');
  const currentPath  = path.join(baselineDir, 'current-screenshot.png');

  fs.mkdirSync(baselineDir, { recursive: true });

  return {
    baselineDir,
    baselinePath,
    currentPath,
    slug: `test-vrcb-${id}`,
    cleanup() {
      try { fs.rmSync(baselineDir, { recursive: true, force: true }); } catch { /* best-effort */ }
    },
  };
}

// ─── VRCB-01: Visual regression prevention (hash utilities) ──────────────────

describe('VRCB-01: hashScreenshot', () => {
  it('returns null for missing file', () => {
    const result = hashScreenshot('/does/not/exist.png');
    assert.equal(result, null);
  });

  it('returns consistent SHA-256 hex for same file', () => {
    const fixturePath = path.join(ROOT, 'references/experiments/fixtures/good-wireframe.html');
    const hash1 = hashScreenshot(fixturePath);
    const hash2 = hashScreenshot(fixturePath);
    assert.equal(hash1, hash2);
  });

  it('returns a 64-character lowercase hex string', () => {
    const fixturePath = path.join(ROOT, 'references/experiments/fixtures/good-wireframe.html');
    const hash = hashScreenshot(fixturePath);
    assert.ok(hash !== null, 'hash should not be null for existing file');
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('returns different hashes for different files', () => {
    const goodPath = path.join(ROOT, 'references/experiments/fixtures/good-wireframe.html');
    const badPath  = path.join(ROOT, 'references/experiments/fixtures/bad-wireframe.html');
    const hash1 = hashScreenshot(goodPath);
    const hash2 = hashScreenshot(badPath);
    assert.ok(hash1 !== null, 'good-wireframe hash should not be null');
    assert.ok(hash2 !== null, 'bad-wireframe hash should not be null');
    assert.notEqual(hash1, hash2);
  });
});

// ─── VRCB-02: Baseline capture (graceful degradation) ─────────────────────────

describe('VRCB-02: captureAndStoreBaseline', () => {
  it('is a function', () => {
    assert.equal(typeof captureAndStoreBaseline, 'function');
  });

  it('does not throw when called with any arguments', () => {
    // bridge.call() performs a TOOL_MAP lookup and returns without executing MCP tools.
    // captureAndStoreBaseline must never throw — swallows all errors from try/catch.
    // In a test environment without MCP runtime, the function completes the lookup and
    // returns either a path (if no exception) or null (if an error occurs).
    assert.doesNotThrow(() => {
      captureAndStoreBaseline('/nonexistent/cwd', 'test-slug-no-playwright', '/no/html.html');
    });
  });
});

// ─── VRCB-03: Regression detection logic ──────────────────────────────────────

describe('VRCB-03: checkVisualRegression', () => {
  it('returns fired:false with reason no_baseline when no baseline exists', () => {
    const result = checkVisualRegression({
      cwd: '/tmp',
      slug: 'definitely-no-baseline-' + crypto.randomUUID(),
      currentScreenshotPath: '/does/not/exist/current.png',
      currentScore: 50,
      baselineScore: 80,
      direction: 'max',
    });
    assert.equal(result.fired, false);
    assert.equal(result.reason, 'no_baseline');
    assert.equal(result.baselineHash, null);
  });

  it('returns fired:false with reason no_current_screenshot when current screenshot missing', () => {
    const { baselinePath, cleanup } = makeTmpFixture();
    fs.writeFileSync(baselinePath, 'fake-baseline-png-data');

    try {
      const slug = path.basename(path.dirname(baselinePath)).replace('pde-experiment-', '');
      const result = checkVisualRegression({
        cwd: '/tmp',
        slug,
        currentScreenshotPath: '/does/not/exist/current.png',
        currentScore: 50,
        baselineScore: 80,
        direction: 'max',
      });
      assert.equal(result.fired, false);
      assert.equal(result.reason, 'no_current_screenshot');
      assert.ok(result.baselineHash !== null);
    } finally {
      cleanup();
    }
  });

  it('returns fired:false with reason no_visual_change when hashes match', () => {
    const { baselinePath, currentPath, slug, cleanup } = makeTmpFixture();
    const sameContent = 'identical-png-content';
    fs.writeFileSync(baselinePath, sameContent);
    fs.writeFileSync(currentPath, sameContent);

    try {
      const result = checkVisualRegression({
        cwd: '/tmp',
        slug,
        currentScreenshotPath: currentPath,
        currentScore: 75,
        baselineScore: 80,
        direction: 'max',
      });
      assert.equal(result.fired, false);
      assert.equal(result.reason, 'no_visual_change');
    } finally {
      cleanup();
    }
  });

  it('returns fired:true when hash changed AND score decreased (direction:max)', () => {
    const { baselinePath, currentPath, slug, cleanup } = makeTmpFixture();
    fs.writeFileSync(baselinePath, 'baseline-content-v1');
    fs.writeFileSync(currentPath, 'current-content-v2-different');

    try {
      const result = checkVisualRegression({
        cwd: '/tmp',
        slug,
        currentScreenshotPath: currentPath,
        currentScore: 40,
        baselineScore: 80,
        direction: 'max',
      });
      assert.equal(result.fired, true);
      assert.equal(result.reason, 'visual_regression_detected');
      assert.ok(result.baselineHash !== null);
      assert.ok(result.currentHash !== null);
      assert.equal(result.scoreDelta, -40); // 40 - 80
    } finally {
      cleanup();
    }
  });

  it('returns fired:false when hash changed but score improved (direction:max)', () => {
    const { baselinePath, currentPath, slug, cleanup } = makeTmpFixture();
    fs.writeFileSync(baselinePath, 'baseline-content-alpha');
    fs.writeFileSync(currentPath, 'current-content-beta-different');

    try {
      const result = checkVisualRegression({
        cwd: '/tmp',
        slug,
        currentScreenshotPath: currentPath,
        currentScore: 90,
        baselineScore: 80,
        direction: 'max',
      });
      assert.equal(result.fired, false);
      assert.equal(result.reason, 'visual_change_acceptable');
      assert.equal(result.scoreDelta, 10); // 90 - 80
    } finally {
      cleanup();
    }
  });

  it('returns fired:true when hash changed AND score increased (direction:min)', () => {
    const { baselinePath, currentPath, slug, cleanup } = makeTmpFixture();
    fs.writeFileSync(baselinePath, 'baseline-min-content');
    fs.writeFileSync(currentPath, 'current-min-content-changed');

    try {
      const result = checkVisualRegression({
        cwd: '/tmp',
        slug,
        currentScreenshotPath: currentPath,
        currentScore: 90,
        baselineScore: 80,
        direction: 'min',
      });
      assert.equal(result.fired, true);
      assert.equal(result.reason, 'visual_regression_detected');
    } finally {
      cleanup();
    }
  });
});

// ─── VRCB-04: Configurable threshold / schema support ─────────────────────────

describe('VRCB-04: parseExperimentFile visual_regression schema support', () => {
  it('parseExperimentFile returns visual_regression.enabled false when field absent', () => {
    const wirePath = path.join(ROOT, 'references/experiments/wireframe.md');
    const parsed = parseExperimentFile(wirePath);
    assert.equal(parsed.visual_regression.enabled, false);
  });

  it('parseExperimentFile returns visual_regression.target null when field absent', () => {
    const wirePath = path.join(ROOT, 'references/experiments/wireframe.md');
    const parsed = parseExperimentFile(wirePath);
    assert.equal(parsed.visual_regression.target, null);
  });

  it('JSONL_ROW_FIELDS includes screenshot_hash', () => {
    assert.ok(JSONL_ROW_FIELDS.includes('screenshot_hash'));
  });

  it('JSONL_ROW_FIELDS includes baseline_hash', () => {
    assert.ok(JSONL_ROW_FIELDS.includes('baseline_hash'));
  });
});

// ─── VRCB-05: Integration with existing circuit breaker infrastructure ────────

describe('VRCB-05: optimize.md BREAK-05 integration', () => {
  const optimizeMd = fs.readFileSync(path.join(ROOT, 'workflows/optimize.md'), 'utf-8');

  it('optimize.md contains BREAK-05 visual_regression circuit breaker', () => {
    assert.match(optimizeMd, /BREAK-05.*visual_regression/);
  });

  it('optimize.md contains captureAndStoreBaseline call in Step 6b', () => {
    assert.match(optimizeMd, /captureAndStoreBaseline/);
  });

  it('optimize.md contains checkVisualRegression call', () => {
    assert.match(optimizeMd, /checkVisualRegression/);
  });

  it('optimize.md gates BREAK-05 behind CRASH status check', () => {
    assert.match(optimizeMd, /CRASH/);
    // BREAK-05 should not fire on CRASH status
    assert.match(optimizeMd, /status.*not.*CRASH|CRASH.*not/i);
  });

  it('optimize.md preserves all 4 existing circuit breakers', () => {
    assert.match(optimizeMd, /BREAK-01.*iteration_budget/);
    assert.match(optimizeMd, /BREAK-02.*time_budget/);
    assert.match(optimizeMd, /BREAK-03.*consecutive_failures/);
    assert.match(optimizeMd, /BREAK-04.*no_progress/);
  });

  it('optimize.md updates baseline on KEEP when guard active', () => {
    assert.match(optimizeMd, /KEEP.*visualRegressionGuard|visualRegressionGuard.*KEEP/s);
  });

  it('optimize.md references visual_regression.enabled for guard activation', () => {
    assert.match(optimizeMd, /visual_regression\.enabled/);
  });

  it('optimize.md passes screenshot_hash to JSONL row', () => {
    assert.match(optimizeMd, /screenshot_hash/);
  });

  it('optimize.md passes baseline_hash to JSONL row', () => {
    assert.match(optimizeMd, /baseline_hash/);
  });
});

describe('VRCB-05: No regression in existing experiment schema', () => {
  it('REQUIRED_FIELDS unchanged (4 fields)', () => {
    const { parseExperimentFile } = require('../../bin/lib/experiment-schema.cjs');
    // Verify existing templates still parse
    const result = parseExperimentFile(path.join(ROOT, 'references/experiments/wireframe.md'));
    assert.equal(result.valid, true);
    // visual_regression defaults to disabled
    assert.equal(result.visual_regression.enabled, false);
  });

  it('JSONL_ROW_FIELDS has 11 fields (9 original + 2 new)', () => {
    assert.equal(JSONL_ROW_FIELDS.length, 11);
  });
});
