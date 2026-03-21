/**
 * stitch-detection.test.mjs
 * Phase 68 — Critique Stitch Comparison
 *
 * Tests: CRT-01 (Stitch artifact detection via manifest-read, STITCH_ARTIFACTS, source=stitch)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const critiqueMd = readFileSync(resolve(ROOT, 'workflows', 'critique.md'), 'utf8');

describe('CRT-01: Stitch artifact detection', () => {
  test('critique.md reads design manifest for source classification', () => {
    assert.ok(
      critiqueMd.includes('manifest-read'),
      'critique.md missing manifest-read command for Stitch detection'
    );
  });

  test('critique.md references STITCH_ARTIFACTS list', () => {
    assert.ok(
      critiqueMd.includes('STITCH_ARTIFACTS'),
      'critique.md missing STITCH_ARTIFACTS variable'
    );
  });

  test('critique.md checks source === "stitch" from manifest', () => {
    assert.ok(
      critiqueMd.includes('source') && critiqueMd.includes('"stitch"'),
      'critique.md missing source:"stitch" detection logic'
    );
  });

  test('Step 2g exists and appears after Step 2f', () => {
    const step2fIdx = critiqueMd.indexOf('2f.');
    const step2gIdx = critiqueMd.indexOf('2g.');
    assert.ok(step2fIdx !== -1, 'critique.md missing Step 2f');
    assert.ok(step2gIdx !== -1, 'critique.md missing Step 2g');
    assert.ok(step2gIdx > step2fIdx, 'Step 2g must appear after Step 2f');
  });

  test('Step 2g appears before Step 3/7', () => {
    const step2gIdx = critiqueMd.indexOf('2g.');
    const step3Idx = critiqueMd.indexOf('### Step 3/7');
    assert.ok(step2gIdx !== -1, 'critique.md missing Step 2g');
    assert.ok(step3Idx !== -1, 'critique.md missing Step 3/7');
    assert.ok(step2gIdx < step3Idx, 'Step 2g must appear before Step 3/7');
  });

  test('Stitch-aware evaluation mode message present', () => {
    assert.ok(
      critiqueMd.includes('Stitch-aware evaluation mode'),
      'critique.md missing Stitch-aware evaluation mode display message'
    );
  });

  test('STH fidelity fallback defaults to hifi', () => {
    assert.ok(
      critiqueMd.includes('STH-') && critiqueMd.includes('hifi') && critiqueMd.includes('fidelity fallback'),
      'critique.md missing STH fidelity fallback to hifi'
    );
  });
});
