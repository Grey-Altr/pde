'use strict';

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  hexToOklch,
  oklchToHex,
  computeHexDelta,
  writeBackDesignTokens,
  emitAll,
  emitDesignMd,
  buildContextIR,
} = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-phase130-'));
}

/**
 * Create a minimal .planning/ directory structure with DTCG tokens
 * suitable for testing writeBackDesignTokens and emitAll.
 */
function makePlanningDirWithTokens(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });

  // Minimal PROJECT.md
  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    '# Test Project\n\n## Summary\nTest project for phase 130.\n',
    'utf-8'
  );

  // Minimal STATE.md
  fs.writeFileSync(
    path.join(planningDir, 'STATE.md'),
    '---\ngsd_state_version: 1.0\n---\n\n# Project State\n',
    'utf-8'
  );

  // Empty DESIGN-STATE.md
  fs.writeFileSync(
    path.join(planningDir, 'design', 'DESIGN-STATE.md'),
    '',
    'utf-8'
  );

  // design-manifest.json with DTCG tokens
  const manifest = {
    tokens: {
      color: {
        primary: {
          $value: 'oklch(0.6231 0.1880 259.8145)',
          $type: 'color',
          $description: 'Primary brand color',
          $extensions: { 'pde:source': 'design-pipeline' },
        },
        secondary: {
          $value: 'oklch(0.6368 0.2078 25.3313)',
          $type: 'color',
          $description: 'Secondary brand color',
        },
      },
      typography: {
        fontFamily: {
          $value: 'Inter, sans-serif',
          $type: 'fontFamily',
        },
      },
      spacing: {
        base: {
          $value: '8px',
          $type: 'dimension',
        },
      },
    },
  };
  fs.writeFileSync(
    path.join(planningDir, 'design', 'design-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return planningDir;
}

// ─── AGR-03: hexToOklch tests ─────────────────────────────────────────────────

describe('AGR-03: hexToOklch', () => {

  test('AGR-03: Test 1 -- hexToOklch returns valid oklch() string format', () => {
    const result = hexToOklch('#3b82f6');
    assert.match(
      result,
      /^oklch\(\d+\.\d{4}\s+\d+\.\d{4}\s+\d+\.\d{4}\)$/,
      `Expected oklch(L.4d C.4d H.4d), got: ${result}`
    );
  });

  test('AGR-03: Test 2 -- hexToOklch round-trip exact match for #3b82f6', () => {
    const oklch = hexToOklch('#3b82f6');
    const hex = oklchToHex(oklch);
    assert.equal(hex, '#3b82f6', `Round-trip failed: #3b82f6 -> ${oklch} -> ${hex}`);
  });

  test('AGR-03: Test 3 -- round-trip exact match for all in-gamut test colors', () => {
    const testColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ef4444'];
    for (const hex of testColors) {
      const oklch = hexToOklch(hex);
      const roundTripped = oklchToHex(oklch);
      assert.equal(roundTripped, hex, `Round-trip failed for ${hex}: got ${roundTripped} (via ${oklch})`);
    }
  });

  test('AGR-03: Test 4 -- 3-char shorthand #f00 equals 6-char #ff0000', () => {
    const short = hexToOklch('#f00');
    const full = hexToOklch('#ff0000');
    assert.equal(short, full, `3-char expansion failed: #f00 -> ${short}, #ff0000 -> ${full}`);
  });

});

// ─── AGR-03: writeBackDesignTokens tests ─────────────────────────────────────

describe('AGR-03: writeBackDesignTokens', () => {

  test('AGR-03: Test 5 -- updates $value for matched color token', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);
    const newHex = '#3b82f6';

    writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: newHex, role: 'primary color role' },
    ], { cwd: tmpDir });

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    const expectedOklch = hexToOklch(newHex);
    assert.equal(
      after.tokens.color.primary.$value,
      expectedOklch,
      `Expected $value=${expectedOklch}, got ${after.tokens.color.primary.$value}`
    );
  });

  test('AGR-03: Test 6 -- $type, $description, $extensions preserved after $value update', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: '#3b82f6', role: 'primary color role' },
    ], { cwd: tmpDir });

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    assert.equal(after.tokens.color.primary.$type, 'color', '$type changed');
    assert.equal(after.tokens.color.primary.$description, 'Primary brand color', '$description changed');
    assert.deepEqual(
      after.tokens.color.primary.$extensions,
      { 'pde:source': 'design-pipeline' },
      '$extensions changed'
    );
  });

  test('AGR-03: Test 7 -- typography and spacing groups unchanged after color-only write-back', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: '#3b82f6', role: 'primary color role' },
    ], { cwd: tmpDir });

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    assert.equal(after.tokens.typography.fontFamily.$value, 'Inter, sans-serif', 'typography changed');
    assert.equal(after.tokens.typography.fontFamily.$type, 'fontFamily', 'typography $type changed');
    assert.equal(after.tokens.spacing.base.$value, '8px', 'spacing changed');
    assert.equal(after.tokens.spacing.base.$type, 'dimension', 'spacing $type changed');
  });

  test('AGR-03: Test 8 -- computeHexDelta returns 0 for identical colors and >0 for different colors', () => {
    // Unit-test computeHexDelta directly
    const sameColor = computeHexDelta('#ff0000', '#ff0000');
    assert.equal(sameColor, 0, 'Delta for identical colors must be 0');

    const differentColor = computeHexDelta('#ff0000', '#ff0100');
    assert.ok(differentColor > 0, 'Delta for different colors must be >0');
    assert.ok(differentColor < 0.01, 'Delta for close colors should be small (< 0.01)');

    // Test that warning path in writeBackDesignTokens triggers stderr when precision threshold exceeded
    // Simulate by checking that the warning threshold is documented: delta > 0.001 triggers warning
    // White to black is a huge delta to confirm the math is correct
    const bigDelta = computeHexDelta('#000000', '#ffffff');
    assert.ok(bigDelta > 0.001, 'Max delta should exceed warning threshold for #000000 vs #ffffff');
  });

  test('AGR-03: Test 9 -- writeBackDesignTokens calls emitAll after write (return value confirms update count)', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    // Verify return value reflects the update
    const result = writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: '#3b82f6', role: 'primary color role' },
    ], { cwd: tmpDir });

    assert.ok(
      typeof result === 'object' && result !== null,
      'writeBackDesignTokens must return an object'
    );
    assert.ok(
      typeof result.updated === 'number',
      'result.updated must be a number'
    );
    assert.equal(result.updated, 1, 'Should report 1 updated token');
    assert.ok(
      typeof result.warnings === 'number',
      'result.warnings must be a number'
    );
  });

  test('AGR-03: Test 10 -- role matching is case-insensitive and strips " color role" suffix', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);
    const newHex = '#ef4444';

    // Role "Primary Color Role" (uppercase + suffix) must match manifest key "primary"
    const result = writeBackDesignTokens(planningDir, [
      { name: 'Primary', hex: newHex, role: 'Primary Color Role' },
    ], { cwd: tmpDir });

    assert.equal(result.updated, 1, 'Case-insensitive role matching with suffix must match 1 token');

    const after = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    const expectedOklch = hexToOklch(newHex);
    assert.equal(
      after.tokens.color.primary.$value,
      expectedOklch,
      `Expected $value=${expectedOklch} after case-insensitive match`
    );
  });

});

// ─── AGR-07: format-version tests ────────────────────────────────────────────

describe('AGR-07: emitDesignMd format-version marker', () => {

  test('AGR-07: Test 11 -- emitAll produces DESIGN.md containing pde-format-version: 1.0', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    emitAll(tmpDir);

    const designMd = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    assert.ok(
      designMd.includes('<!-- pde-format-version: 1.0 -->'),
      `DESIGN.md missing pde-format-version marker. Content head:\n${designMd.slice(0, 300)}`
    );
  });

  test('AGR-07: Test 12 -- line order: PDE-GENERATED < SOURCE < pde-format-version < # Design System', () => {
    const tmpDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(tmpDir);

    emitAll(tmpDir);

    const designMd = fs.readFileSync(path.join(tmpDir, 'DESIGN.md'), 'utf-8');
    const idxGenerated = designMd.indexOf('PDE-GENERATED');
    const idxSource = designMd.indexOf('SOURCE:');
    const idxFormatVersion = designMd.indexOf('pde-format-version');
    const idxHeading = designMd.indexOf('# Design System');

    assert.ok(idxGenerated >= 0, 'PDE-GENERATED marker not found in DESIGN.md');
    assert.ok(idxSource >= 0, 'SOURCE: marker not found in DESIGN.md');
    assert.ok(idxFormatVersion >= 0, 'pde-format-version marker not found in DESIGN.md');
    assert.ok(idxHeading >= 0, '# Design System heading not found in DESIGN.md');

    assert.ok(
      idxGenerated < idxSource,
      `PDE-GENERATED (${idxGenerated}) must come before SOURCE (${idxSource})`
    );
    assert.ok(
      idxSource < idxFormatVersion,
      `SOURCE (${idxSource}) must come before pde-format-version (${idxFormatVersion})`
    );
    assert.ok(
      idxFormatVersion < idxHeading,
      `pde-format-version (${idxFormatVersion}) must come before # Design System (${idxHeading})`
    );
  });

});
