/**
 * consent-batch.test.mjs
 * Phase 67 — Ideation Visual Divergence
 *
 * Tests: CONSENT-04 (single batch consent before loop, Experimental model mention, quota display)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ideateMd = readFileSync(resolve(ROOT, 'workflows', 'ideate.md'), 'utf8');

describe('CONSENT-04: Batch outbound consent for ideation', () => {
  test('batch consent prompt exists in 4-STITCH-C', () => {
    assert.ok(
      ideateMd.includes('4-STITCH-C'),
      'ideate.md missing 4-STITCH-C section identifier'
    );
    assert.ok(
      ideateMd.includes('Batch outbound consent'),
      'ideate.md missing "Batch outbound consent" label in 4-STITCH-C'
    );
  });

  test('consent prompt comes before generation loop', () => {
    const consentIdx = ideateMd.indexOf('4-STITCH-C');
    const loopIdx = ideateMd.indexOf('4-STITCH-D');
    assert.ok(
      consentIdx < loopIdx,
      `batch consent (4-STITCH-C, index ${consentIdx}) must precede generation loop (4-STITCH-D, index ${loopIdx})`
    );
  });

  test('consent mentions Experimental model type', () => {
    assert.ok(
      ideateMd.includes('Experimental'),
      'ideate.md consent section missing "Experimental" model type mention'
    );
  });

  test('consent mentions Gemini Pro', () => {
    assert.ok(
      ideateMd.includes('Gemini Pro'),
      'ideate.md consent section missing "Gemini Pro" model mention'
    );
  });

  test('consent shows quota remaining after batch', () => {
    assert.ok(
      ideateMd.includes('remaining after this batch'),
      'ideate.md consent missing "remaining after this batch" quota display'
    );
  });

  test('consent mentions 50/month limit', () => {
    assert.ok(
      ideateMd.includes('50/month'),
      'ideate.md consent missing "50/month" Experimental quota limit mention'
    );
  });

  test('user can decline — DIVERGE_STITCH set to false on "no"', () => {
    assert.ok(
      ideateMd.includes('Visual divergence cancelled by user'),
      'ideate.md missing "Visual divergence cancelled by user" decline message'
    );
  });

  test('consent mentions stitch.withgoogle.com', () => {
    assert.ok(
      ideateMd.includes('stitch.withgoogle.com'),
      'ideate.md consent missing "stitch.withgoogle.com" service URL for data transparency'
    );
  });
});
