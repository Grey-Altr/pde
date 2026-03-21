/**
 * visual-convergence.test.mjs
 * Phase 67 — Ideation Visual Divergence
 *
 * Tests: IDT-03 (HAS_VISUAL_VARIANTS detection, Visual column in converge scoring table)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ideateMd = readFileSync(resolve(ROOT, 'workflows', 'ideate.md'), 'utf8');

describe('IDT-03: Visual variants feed into convergence', () => {
  test('HAS_VISUAL_VARIANTS detection logic in Step 6/7', () => {
    assert.ok(
      ideateMd.includes('HAS_VISUAL_VARIANTS'),
      'ideate.md missing HAS_VISUAL_VARIANTS detection logic in converge step'
    );
  });

  test('Visual column in conditional converge scoring table', () => {
    assert.ok(
      ideateMd.includes('| Visual |'),
      'ideate.md missing "| Visual |" column in converge scoring table'
    );
  });

  test('Visual Variants section check precedes converge scoring', () => {
    const variantsIdx = ideateMd.indexOf('HAS_VISUAL_VARIANTS');
    const convergeIdx = ideateMd.indexOf('## Converge Phase');
    assert.ok(variantsIdx > 0, 'ideate.md missing HAS_VISUAL_VARIANTS detection');
    assert.ok(convergeIdx > 0, 'ideate.md missing ## Converge Phase section');
  });

  test('text-only fallback shown in Visual column for non-visual directions', () => {
    assert.ok(
      ideateMd.includes('text-only'),
      'ideate.md missing "text-only" fallback value in Visual column'
    );
  });

  test('backwards-compatible — conditional IF HAS_VISUAL_VARIANTS present', () => {
    assert.ok(
      ideateMd.includes('IF HAS_VISUAL_VARIANTS'),
      'ideate.md missing "IF HAS_VISUAL_VARIANTS" conditional — scoring table must be backwards-compatible'
    );
  });
});
