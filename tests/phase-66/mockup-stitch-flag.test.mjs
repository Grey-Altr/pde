/**
 * mockup-stitch-flag.test.mjs
 * Phase 66 — Wireframe + Mockup Stitch Integration
 *
 * Tests: WFR-05 (--use-stitch flag on mockup)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const mockupMd = readFileSync(resolve(ROOT, 'workflows', 'mockup.md'), 'utf8');

describe('WFR-05: --use-stitch flag on mockup', () => {
  test('flags table contains --use-stitch row', () => {
    assert.ok(
      mockupMd.includes('`--use-stitch` | Boolean'),
      'mockup.md flags table missing --use-stitch Boolean row'
    );
  });

  test('Step 2 contains Parse --use-stitch flag section', () => {
    assert.ok(
      mockupMd.includes('Parse --use-stitch flag'),
      'mockup.md missing "Parse --use-stitch flag" section in Step 2'
    );
  });

  test('mockup.md contains 4-STITCH section', () => {
    assert.ok(
      mockupMd.includes('4-STITCH'),
      'mockup.md missing 4-STITCH Stitch generation pipeline section'
    );
  });

  test('mockup.md contains STH-{slug}-hifi.html artifact name', () => {
    assert.ok(
      mockupMd.includes('STH-{slug}-hifi.html'),
      'mockup.md missing STH-{slug}-hifi.html artifact name'
    );
  });

  test('mockup.md contains .planning/design/ux/mockups/ target directory', () => {
    assert.ok(
      mockupMd.includes('.planning/design/ux/mockups/STH-{slug}-hifi'),
      'mockup.md missing .planning/design/ux/mockups/STH-{slug}-hifi target path'
    );
  });

  test('mockup.md contains manifest-update STH-{slug}-hifi source stitch', () => {
    assert.ok(
      mockupMd.includes('manifest-update STH-{slug}-hifi source stitch'),
      'mockup.md missing "manifest-update STH-{slug}-hifi source stitch" command'
    );
  });

  test('mockup.md does NOT contain stitch:fetch-screen-image in Stitch branch (no PNG for mockups)', () => {
    // The mockup Stitch branch deliberately omits fetch-screen-image
    // Verify by checking the 4-STITCH-C section does not use fetch-screen-image
    const stitchSectionStart = mockupMd.indexOf('4-STITCH-C');
    const stitchSectionEnd = mockupMd.indexOf('4-STITCH-D');
    assert.ok(stitchSectionStart !== -1, '4-STITCH-C section not found in mockup.md');
    assert.ok(stitchSectionEnd !== -1, '4-STITCH-D section not found in mockup.md');
    const stitchCSection = mockupMd.slice(stitchSectionStart, stitchSectionEnd);
    assert.ok(
      !stitchCSection.includes('stitch:fetch-screen-image'),
      'mockup.md 4-STITCH-C section contains stitch:fetch-screen-image (should be omitted for mockups)'
    );
  });

  test('mockup.md contains stitch:generate-screen', () => {
    assert.ok(
      mockupMd.includes('stitch:generate-screen'),
      'mockup.md missing stitch:generate-screen call'
    );
  });

  test('mockup.md contains stitch:fetch-screen-code', () => {
    assert.ok(
      mockupMd.includes('stitch:fetch-screen-code'),
      'mockup.md missing stitch:fetch-screen-code call'
    );
  });
});
