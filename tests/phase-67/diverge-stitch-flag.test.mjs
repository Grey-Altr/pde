/**
 * diverge-stitch-flag.test.mjs
 * Phase 67 — Ideation Visual Divergence
 *
 * Tests: IDT-01 (--diverge flag, GEMINI_3_PRO modelId, prompt isolation),
 *        IDT-02 (STH artifact naming, Visual Variants section),
 *        IDT-04 (experimental quota type)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ideateMd = readFileSync(resolve(ROOT, 'workflows', 'ideate.md'), 'utf8');

describe('IDT-01: --diverge flag on ideate', () => {
  test('flags table contains --diverge row with Boolean type', () => {
    assert.ok(
      ideateMd.includes('`--diverge` | Boolean'),
      'ideate.md flags table missing --diverge Boolean row'
    );
  });

  test('DIVERGE_STITCH variable assignment exists', () => {
    assert.ok(
      ideateMd.includes('DIVERGE_STITCH'),
      'ideate.md missing DIVERGE_STITCH variable assignment'
    );
  });

  test('stitch:generate-screen call exists in 4-STITCH section', () => {
    assert.ok(
      ideateMd.includes('stitch:generate-screen'),
      'ideate.md missing stitch:generate-screen call in 4-STITCH section'
    );
  });

  test('GEMINI_3_PRO modelId used for Experimental generation', () => {
    assert.ok(
      ideateMd.includes('GEMINI_3_PRO'),
      'ideate.md missing GEMINI_3_PRO modelId for Experimental generation'
    );
  });

  test('No shared project_id — isolation required', () => {
    assert.ok(
      ideateMd.includes('isolation required'),
      'ideate.md missing "isolation required" — no shared project_id constraint not documented'
    );
  });
});

describe('IDT-02: STH-ideate-direction artifact naming', () => {
  test('STH-ideate-direction-{i}.png naming convention in persist step', () => {
    assert.ok(
      ideateMd.includes('STH-ideate-direction-'),
      'ideate.md missing STH-ideate-direction- artifact naming convention'
    );
  });

  test('.planning/design/strategy/ is the target directory', () => {
    assert.ok(
      ideateMd.includes('.planning/design/strategy/STH-ideate-direction-'),
      'ideate.md missing .planning/design/strategy/STH-ideate-direction- target path'
    );
  });

  test('## Visual Variants section template exists', () => {
    assert.ok(
      ideateMd.includes('## Visual Variants'),
      'ideate.md missing ## Visual Variants section template'
    );
  });
});

describe('IDT-04: Experimental quota type', () => {
  test('checkStitchQuota with experimental type', () => {
    assert.ok(
      ideateMd.includes("checkStitchQuota('experimental')"),
      "ideate.md missing checkStitchQuota('experimental') call"
    );
  });

  test('incrementStitchQuota with experimental type', () => {
    assert.ok(
      ideateMd.includes("incrementStitchQuota('experimental')"),
      "ideate.md missing incrementStitchQuota('experimental') call"
    );
  });
});
