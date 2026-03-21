/**
 * annotation-extraction.test.mjs
 * Phase 69 — Handoff Pattern Extraction
 *
 * Tests: HND-03 (@component: format handling in Step 4b extension)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const handoffMd = readFileSync(resolve(ROOT, 'workflows', 'handoff.md'), 'utf8');

describe('HND-03: @component: annotation extraction in Step 4b', () => {
  test('handoff.md contains @component: extraction regex', () => {
    assert.ok(
      handoffMd.includes('@component:'),
      'handoff.md missing @component: extraction pattern'
    );
  });

  test('handoff.md references STITCH_SCREEN_ANNOTATIONS storage', () => {
    assert.ok(
      handoffMd.includes('STITCH_SCREEN_ANNOTATIONS'),
      'handoff.md missing STITCH_SCREEN_ANNOTATIONS variable'
    );
  });

  test('Step 4b-stitch section exists for Stitch annotation extraction', () => {
    assert.ok(
      handoffMd.includes('4b-stitch'),
      'handoff.md missing Step 4b-stitch section'
    );
  });

  test('Step 4b-stitch appears after standard Step 4b', () => {
    const step4bIdx = handoffMd.indexOf('#### 4b.');
    const step4bStitchIdx = handoffMd.indexOf('4b-stitch');
    assert.ok(step4bIdx !== -1, 'handoff.md missing Step 4b');
    assert.ok(step4bStitchIdx !== -1, 'handoff.md missing Step 4b-stitch');
    assert.ok(step4bStitchIdx > step4bIdx, 'Step 4b-stitch must appear after Step 4b');
  });

  test('Stitch extraction handles Navigation, Header, Form component types', () => {
    const hasNav = handoffMd.includes('<nav');
    const hasHeader = handoffMd.includes('<header');
    const hasForm = handoffMd.includes('<form');
    assert.ok(
      hasNav && hasHeader && hasForm,
      'handoff.md missing element-to-component mapping for nav/header/form'
    );
  });

  test('Cross-reference between @component: and ANNOTATION: formats', () => {
    assert.ok(
      handoffMd.includes('WFR+Stitch') && handoffMd.includes('cross-reference'),
      'handoff.md missing cross-reference logic between annotation formats'
    );
  });

  test('STITCH_COLORS extraction for hex values', () => {
    assert.ok(
      handoffMd.includes('STITCH_COLORS'),
      'handoff.md missing STITCH_COLORS hex extraction variable'
    );
  });
});
