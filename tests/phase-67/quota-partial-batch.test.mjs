/**
 * quota-partial-batch.test.mjs
 * Phase 67 — Ideation Visual Divergence
 *
 * Tests: IDT-04 (partial-batch fallback, STITCH_BATCH_SIZE from remaining, no abort)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ideateMd = readFileSync(resolve(ROOT, 'workflows', 'ideate.md'), 'utf8');

describe('IDT-04: Partial-batch fallback logic', () => {
  test('STITCH_BATCH_SIZE variable exists', () => {
    assert.ok(
      ideateMd.includes('STITCH_BATCH_SIZE'),
      'ideate.md missing STITCH_BATCH_SIZE variable for batch size computation'
    );
  });

  test('remaining field used for batch size computation', () => {
    assert.ok(
      ideateMd.includes('remaining'),
      'ideate.md missing "remaining" field usage for partial-batch computation'
    );
  });

  test('STITCH_FALLBACK_TEXT_ONLY marker exists', () => {
    assert.ok(
      ideateMd.includes('STITCH_FALLBACK_TEXT_ONLY'),
      'ideate.md missing STITCH_FALLBACK_TEXT_ONLY fallback marker'
    );
  });

  test('partial batch warning message present', () => {
    assert.ok(
      ideateMd.includes('Generating visuals for first'),
      'ideate.md missing "Generating visuals for first" partial batch warning message'
    );
  });

  test('run never aborts — text-only fallback is always correct', () => {
    assert.ok(
      ideateMd.includes('NEVER abort'),
      'ideate.md missing "NEVER abort" — run must never abort on partial quota or per-direction failure'
    );
  });

  test('quota exhausted falls back gracefully — not a HALT', () => {
    assert.ok(
      ideateMd.includes('Proceeding with text-only ideation'),
      'ideate.md missing "Proceeding with text-only ideation" graceful fallback message'
    );
  });
});
