/**
 * token-suppression.test.mjs
 * Phase 68 — Critique Stitch Comparison
 *
 * Tests: CRT-02 (DTCG token-format suppression for Stitch artifacts)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const critiqueMd = readFileSync(resolve(ROOT, 'workflows', 'critique.md'), 'utf8');

describe('CRT-02: Token suppression for Stitch', () => {
  test('SUPPRESS_TOKEN_FINDINGS variable present', () => {
    assert.ok(
      critiqueMd.includes('SUPPRESS_TOKEN_FINDINGS'),
      'critique.md missing SUPPRESS_TOKEN_FINDINGS gate'
    );
  });

  test('Token not applied suppressed for Stitch source', () => {
    assert.ok(
      critiqueMd.includes('Token not applied') && critiqueMd.includes('SUPPRESS'),
      'critique.md missing Token not applied suppression for Stitch'
    );
  });

  test('Suppression scoped to Token not applied only', () => {
    // Verify the suppression gate mentions the specific row
    const suppressIdx = critiqueMd.indexOf('SUPPRESS_TOKEN_FINDINGS');
    const afterSuppress = critiqueMd.slice(suppressIdx, suppressIdx + 1000);
    assert.ok(
      afterSuppress.includes('Token not applied'),
      'Suppression gate does not reference "Token not applied" finding type'
    );
  });

  test('Color contrast findings NOT suppressed (still evaluated)', () => {
    // Color contrast row must still be present and unmodified
    assert.ok(
      critiqueMd.includes('Color contrast failure') || critiqueMd.includes('color contrast'),
      'critique.md missing color contrast evaluation (should NOT be suppressed for Stitch)'
    );
  });

  test('Fidelity-severity calibration table unchanged', () => {
    // The original table row must still exist
    assert.ok(
      critiqueMd.includes('| Token not applied | Skip | Minor | Major |'),
      'Fidelity-severity calibration table Token not applied row has been modified (should be unchanged)'
    );
  });

  test('STITCH_SOURCE variable tracks per-artifact source', () => {
    assert.ok(
      critiqueMd.includes('STITCH_SOURCE'),
      'critique.md missing STITCH_SOURCE per-artifact variable'
    );
  });
});
