'use strict';

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  writeBackDesignTokens,
  ingestAll,
  reconcileOnStart,
  emitAll,
  parseDesignMd,
  writeStateFile,
  buildContextIR,
  normalizeDesignTokensForComparison,
  hexToOklch,
  oklchToHex,
  colorListToArray,
} = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-phase133-'));
}

/**
 * Create a minimal project directory structure with DTCG tokens
 * for testing AGR-03 integration (DESIGN.md -> ingest -> design-manifest.json).
 * @param {string} baseDir - Root of temp directory (this is cwd for ingestAll/reconcileOnStart)
 * @returns {string} Absolute path to .planning/ directory
 */
function makePlanningDirWithTokens(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });

  // Minimal PROJECT.md
  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    '# Test Project\n\n## Summary\nTest project for phase 133.\n',
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

  // design-manifest.json with DTCG tokens (original colors)
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

  // Create required directories for emitAll
  fs.mkdirSync(path.join(baseDir, '.agent', 'skills', 'pde-design'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, '.cursor', 'rules'), { recursive: true });

  return planningDir;
}

// Arbitrary 64-char hex hash that will never match any real source hash
// (all zeros is distinctive and won't collide with SHA-256 of real planning files)
const FAKE_OLD_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const FAKE_TIMESTAMP = '2000-01-01T00:00:00.000Z';

/**
 * Write a DESIGN.md at cwd/DESIGN.md (which is what MONITORED_FILES monitors)
 * with a PDE-GENERATED header using the correct format (hash:<64hex> | generated:<ISO>)
 * but with a NON-MATCHING hash, so computeLoopBreak returns 'proceed'
 * (file treated as externally edited by a human/editor).
 * @param {string} baseDir - cwd (project root)
 * @param {string} hex - New hex color for primary (without #), e.g. "FF0000"
 */
function makeDesignMdWithChangedColor(baseDir, hex) {
  const content = [
    `<!-- PDE-GENERATED | hash:${FAKE_OLD_HASH} | generated:${FAKE_TIMESTAMP} -->`,
    '<!-- pde-format-version: 1.0 -->',
    '<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->',
    '# Design Tokens',
    '',
    '## Color Palette',
    '',
    `- **Primary** (#${hex}) -- Primary color role`,
    '- **Secondary** (#EF4444) -- Secondary color role',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(baseDir, 'DESIGN.md'), content, 'utf-8');
}

/**
 * Write .context-sync-state.json with a base IR snapshot containing OLD designTokens.
 * This makes the merge engine detect a diff between editor value and base.
 * @param {string} planningDir - Absolute path to .planning/
 * @param {string} oldDesignTokens - The original color-list string (old state)
 */
function writeBaseStateWithOldTokens(planningDir, oldDesignTokens) {
  const statePath = path.join(planningDir, '.context-sync-state.json');
  const state = {
    schemaVersion: '1.0',
    lastEmittedAt: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
    lastSourceHash: FAKE_OLD_HASH, // non-matching so files are detected as changed
    lastIR: {
      techStack: '',
      constraints: '',
      componentCatalog: '',
      designTokens: oldDesignTokens,
    },
    pendingIngest: [],
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Phase 133: AGR-03 DESIGN.md Write-Back Integration', () => {

  // ── colorListToArray unit tests (Tests 1-3) ──────────────────────────────

  test('Test 1: colorListToArray parses valid color-list string', () => {
    const input = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    const result = colorListToArray(input);
    assert.deepStrictEqual(result, [
      { name: 'Primary', hex: '#3B82F6', role: 'Primary color role' },
      { name: 'Secondary', hex: '#EF4444', role: 'Secondary color role' },
    ]);
  });

  test('Test 2: colorListToArray returns [] for null/empty', () => {
    assert.deepStrictEqual(colorListToArray(null), []);
    assert.deepStrictEqual(colorListToArray(''), []);
    assert.deepStrictEqual(colorListToArray(undefined), []);
  });

  test('Test 3: colorListToArray returns [] for non-matching format (token-summary)', () => {
    const input = 'Primary: oklch(0.6231 0.1880 259.8145)';
    assert.deepStrictEqual(colorListToArray(input), []);
  });

  // ── Integration tests (Tests 4-9) ────────────────────────────────────────

  test('Test 4: ingestAll calls writeBackDesignTokens when DESIGN.md colors differ', () => {
    const baseDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(baseDir);

    // Original tokens in IR base state (old hex values)
    const oldDesignTokens = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    writeBaseStateWithOldTokens(planningDir, oldDesignTokens);

    // Write DESIGN.md with a CHANGED primary color (red)
    makeDesignMdWithChangedColor(baseDir, 'FF0000');

    // Run ingestAll
    const result = ingestAll(baseDir);
    assert.ok(!result.error, 'ingestAll should not return an error: ' + (result.error || ''));

    // Verify manifest was updated
    const manifestRaw = fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    assert.ok(
      manifest.tokens.color.primary.$value !== 'oklch(0.6231 0.1880 259.8145)',
      'Primary $value should have changed from original OKLCH'
    );
  });

  test('Test 5: design-manifest.json $value updated with OKLCH string after ingestAll', () => {
    const baseDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(baseDir);

    const oldDesignTokens = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    writeBaseStateWithOldTokens(planningDir, oldDesignTokens);

    // Changed primary to red
    makeDesignMdWithChangedColor(baseDir, 'FF0000');

    const result = ingestAll(baseDir);
    assert.ok(!result.error, 'ingestAll should not error: ' + (result.error || ''));

    const manifestRaw = fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    const primaryValue = manifest.tokens.color.primary.$value;

    // $value must be an oklch() string
    assert.ok(
      typeof primaryValue === 'string' && primaryValue.startsWith('oklch('),
      `Primary $value should be oklch() string, got: ${primaryValue}`
    );
  });

  test('Test 6: reconcileOnStart calls writeBackDesignTokens when colors differ', () => {
    const baseDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(baseDir);

    const oldDesignTokens = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    writeBaseStateWithOldTokens(planningDir, oldDesignTokens);

    // Write DESIGN.md with changed color — ensure mtime is AFTER lastEmittedAt
    makeDesignMdWithChangedColor(baseDir, 'FF0000');

    // reconcileOnStart uses mtime comparison. We need the file mtime to be > lastEmittedAt.
    // writeBaseStateWithOldTokens sets lastEmittedAt to 10 seconds ago, so freshly written
    // DESIGN.md will have a newer mtime. This should work without sleep.

    const result = reconcileOnStart(baseDir);
    assert.ok(!result.error, 'reconcileOnStart should not error: ' + (result.error || ''));

    const manifestRaw = fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    assert.ok(
      manifest.tokens.color.primary.$value !== 'oklch(0.6231 0.1880 259.8145)',
      'Primary $value should have changed after reconcileOnStart'
    );
  });

  test('Test 7: idempotent -- second ingestAll with no changes produces no manifest update', () => {
    const baseDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(baseDir);

    const oldDesignTokens = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    writeBaseStateWithOldTokens(planningDir, oldDesignTokens);

    makeDesignMdWithChangedColor(baseDir, 'FF0000');

    // First ingestAll: updates manifest
    const result1 = ingestAll(baseDir);
    assert.ok(!result1.error, 'First ingestAll should not error');

    // Read manifest after first run
    const manifestAfterFirst = JSON.parse(
      fs.readFileSync(path.join(planningDir, 'design', 'design-manifest.json'), 'utf-8')
    );
    const valueAfterFirst = manifestAfterFirst.tokens.color.primary.$value;

    // Get mtime after first run
    const mtimeAfterFirst = fs.statSync(
      path.join(planningDir, 'design', 'design-manifest.json')
    ).mtimeMs;

    // Second ingestAll: DESIGN.md now has PDE-GENERATED header with matching hash
    // (emitAll re-wrote it with current source hash), so computeLoopBreak returns 'skip'
    // and no write-back occurs.
    const result2 = ingestAll(baseDir);
    assert.ok(!result2.error, 'Second ingestAll should not error');

    const mtimeAfterSecond = fs.statSync(
      path.join(planningDir, 'design', 'design-manifest.json')
    ).mtimeMs;

    // Manifest mtime should not change on second run
    assert.strictEqual(
      mtimeAfterSecond,
      mtimeAfterFirst,
      'design-manifest.json should not be rewritten on second ingestAll (idempotent)'
    );
  });

  test('Test 8: non-fatal when design-manifest.json absent', () => {
    const baseDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(baseDir);

    // Remove design-manifest.json
    fs.unlinkSync(path.join(planningDir, 'design', 'design-manifest.json'));

    const oldDesignTokens = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    writeBaseStateWithOldTokens(planningDir, oldDesignTokens);
    makeDesignMdWithChangedColor(baseDir, 'FF0000');

    // ingestAll must not throw
    let result;
    assert.doesNotThrow(() => {
      result = ingestAll(baseDir);
    }, 'ingestAll should not throw when design-manifest.json is absent');

    // Result should not have an error field from the top-level catch
    assert.ok(!result.error, 'ingestAll result should not have top-level error: ' + (result && result.error));
  });

  test('Test 9: emitAll re-normalizes DESIGN.md after write-back', () => {
    const baseDir = makeTmpDir();
    const planningDir = makePlanningDirWithTokens(baseDir);

    const oldDesignTokens = '- **Primary** (#3B82F6) -- Primary color role\n- **Secondary** (#EF4444) -- Secondary color role';
    writeBaseStateWithOldTokens(planningDir, oldDesignTokens);

    // Set primary to red (#FF0000)
    makeDesignMdWithChangedColor(baseDir, 'FF0000');

    const result = ingestAll(baseDir);
    assert.ok(!result.error, 'ingestAll should not error: ' + (result.error || ''));

    // After ingestAll + emitAll, DESIGN.md should be re-written with updated OKLCH-derived hex
    // The manifest now has the new OKLCH for red; emitAll reads it and emits DESIGN.md
    const designMdContent = fs.readFileSync(path.join(baseDir, 'DESIGN.md'), 'utf-8');

    // The re-emitted DESIGN.md should contain a color line for Primary
    // (case-insensitive check since emitDesignMd may lowercase role text from manifest)
    const hasColorLine = /- \*\*Primary\*\* \(#[a-fA-F0-9]{3,6}\) -- /i.test(designMdContent);
    assert.ok(hasColorLine, 'Re-emitted DESIGN.md should contain Primary color line with hex: ' + designMdContent.slice(0, 500));

    // Also confirm it has PDE-GENERATED header (re-emitted by emitAll)
    assert.ok(designMdContent.includes('PDE-GENERATED'), 'Re-emitted DESIGN.md should have PDE-GENERATED header');
  });

});
