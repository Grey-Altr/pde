/**
 * wireframe-stitch-flag.test.mjs
 * Phase 66 — Wireframe + Mockup Stitch Integration
 *
 * Tests: WFR-01 (--use-stitch flag), WFR-02 (STH artifact paths),
 *        WFR-04 (manifest source:stitch), WFR-06 (fallback), EFF-02 (local paths)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const wireframeMd = readFileSync(resolve(ROOT, 'workflows', 'wireframe.md'), 'utf8');

describe('WFR-01: --use-stitch flag on wireframe', () => {
  test('flags table contains --use-stitch row with Boolean type', () => {
    assert.ok(
      wireframeMd.includes('`--use-stitch` | Boolean'),
      'wireframe.md flags table missing --use-stitch Boolean row'
    );
  });

  test('Parse --use-stitch flag section exists in Step 2', () => {
    assert.ok(
      wireframeMd.includes('Parse --use-stitch flag'),
      'wireframe.md missing "Parse --use-stitch flag" section'
    );
  });

  test('USE_STITCH = true assignment exists', () => {
    assert.ok(
      wireframeMd.includes('USE_STITCH = true'),
      'wireframe.md missing "USE_STITCH = true" assignment'
    );
  });

  test('USE_STITCH = false assignment exists', () => {
    assert.ok(
      wireframeMd.includes('USE_STITCH = false'),
      'wireframe.md missing "USE_STITCH = false" assignment'
    );
  });

  test('Step 3 contains Stitch MCP probe section', () => {
    assert.ok(
      wireframeMd.includes('Probe Stitch MCP'),
      'wireframe.md Step 3 missing "Probe Stitch MCP" section'
    );
  });
});

describe('WFR-02: STH artifact paths', () => {
  test('wireframe.md contains STH-{slug}.html file path', () => {
    assert.ok(
      wireframeMd.includes('STH-{slug}.html'),
      'wireframe.md missing STH-{slug}.html artifact path'
    );
  });

  test('wireframe.md contains STH-{slug}.png file path', () => {
    assert.ok(
      wireframeMd.includes('STH-{slug}.png'),
      'wireframe.md missing STH-{slug}.png artifact path'
    );
  });

  test('target directory is .planning/design/ux/wireframes/', () => {
    assert.ok(
      wireframeMd.includes('.planning/design/ux/wireframes/STH-{slug}'),
      'wireframe.md missing .planning/design/ux/wireframes/STH-{slug} path'
    );
  });
});

describe('WFR-04: manifest source:stitch metadata', () => {
  test('wireframe.md contains manifest-update STH-{slug} source stitch', () => {
    assert.ok(
      wireframeMd.includes('manifest-update STH-{slug} source stitch'),
      'wireframe.md missing "manifest-update STH-{slug} source stitch" command'
    );
  });

  test('wireframe.md contains manifest-update STH-{slug} stitch_annotated true', () => {
    assert.ok(
      wireframeMd.includes('manifest-update STH-{slug} stitch_annotated true'),
      'wireframe.md missing "manifest-update STH-{slug} stitch_annotated true" command'
    );
  });

  test('wireframe.md contains manifest-add-artifact STH-{slug}', () => {
    assert.ok(
      wireframeMd.includes('manifest-add-artifact STH-{slug}'),
      'wireframe.md missing "manifest-add-artifact STH-{slug}" command'
    );
  });
});

describe('WFR-06: graceful fallback', () => {
  test('wireframe.md contains FALLBACK_SCREENS or fallback section', () => {
    assert.ok(
      wireframeMd.includes('FALLBACK_SCREENS'),
      'wireframe.md missing FALLBACK_SCREENS fallback section'
    );
  });

  test('wireframe.md contains Falling back to Claude HTML/CSS message text', () => {
    assert.ok(
      wireframeMd.includes('Falling back to Claude HTML/CSS'),
      'wireframe.md missing "Falling back to Claude HTML/CSS" fallback message'
    );
  });

  test('wireframe.md references checkStitchQuota for quota-based fallback', () => {
    assert.ok(
      wireframeMd.includes('checkStitchQuota'),
      'wireframe.md missing checkStitchQuota reference for quota-based fallback'
    );
  });
});

describe('EFF-02: local artifact paths in manifest', () => {
  test('manifest path field contains local path .planning/design/ux/wireframes/STH-', () => {
    assert.ok(
      wireframeMd.includes('.planning/design/ux/wireframes/STH-'),
      'wireframe.md manifest path missing local .planning/design/ux/wireframes/STH- prefix'
    );
  });

  test('wireframe.md does NOT contain any Stitch download URL in manifest path context', () => {
    // Check that manifest-update path commands don't reference external URLs
    // The manifest path should use local .planning/ paths, not stitch.withgoogle.com download URLs
    const manifestPathLines = wireframeMd
      .split('\n')
      .filter(line => line.includes('manifest-update') && line.includes('path'));
    for (const line of manifestPathLines) {
      assert.ok(
        !line.includes('https://stitch') && !line.includes('http://stitch'),
        `manifest-update path line contains external Stitch URL: ${line.trim()}`
      );
    }
    // Also confirm the actual path value is local
    assert.ok(
      manifestPathLines.some(l => l.includes('.planning/')),
      'No manifest-update path line found with local .planning/ path'
    );
  });
});
