/**
 * stitch-detection.test.mjs
 * Phase 69 — Handoff Pattern Extraction
 *
 * Tests: HND-01 (Stitch artifact detection via manifest-read, STITCH_ARTIFACTS, source=stitch)
 *        HND-04 (stitch_annotated gate, STITCH_UNANNOTATED, remediation message)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const handoffMd = readFileSync(resolve(ROOT, 'workflows', 'handoff.md'), 'utf8');

describe('HND-01: Stitch artifact detection in handoff', () => {
  test('handoff.md reads design manifest for source classification', () => {
    assert.ok(
      handoffMd.includes('manifest-read'),
      'handoff.md missing manifest-read command for Stitch detection'
    );
  });

  test('handoff.md references STITCH_ARTIFACTS list', () => {
    assert.ok(
      handoffMd.includes('STITCH_ARTIFACTS'),
      'handoff.md missing STITCH_ARTIFACTS variable'
    );
  });

  test('handoff.md checks source === "stitch" from manifest', () => {
    assert.ok(
      handoffMd.includes('source') && handoffMd.includes('"stitch"'),
      'handoff.md missing source:"stitch" detection logic'
    );
  });

  test('Step 2l exists and appears after Step 2k', () => {
    const step2kIdx = handoffMd.lastIndexOf('2k.');
    const step2lIdx = handoffMd.lastIndexOf('2l.');
    assert.ok(step2kIdx !== -1, 'handoff.md missing Step 2k');
    assert.ok(step2lIdx !== -1, 'handoff.md missing Step 2l');
    assert.ok(step2lIdx > step2kIdx, 'Step 2l must appear after Step 2k');
  });

  test('Step 2l appears before Step 3/7', () => {
    const step2lIdx = handoffMd.lastIndexOf('2l.');
    const step3Idx = handoffMd.indexOf('### Step 3/7');
    assert.ok(step2lIdx !== -1, 'handoff.md missing Step 2l');
    assert.ok(step3Idx !== -1, 'handoff.md missing Step 3/7');
    assert.ok(step2lIdx < step3Idx, 'Step 2l must appear before Step 3/7');
  });

  test('Step 2 intro mentions twelve sub-sections', () => {
    assert.ok(
      handoffMd.includes('twelve sub-sections'),
      'Step 2 intro should say twelve sub-sections after adding 2l'
    );
  });
});

describe('HND-04: stitch_annotated gate', () => {
  test('handoff.md checks stitch_annotated field', () => {
    assert.ok(
      handoffMd.includes('stitch_annotated'),
      'handoff.md missing stitch_annotated check'
    );
  });

  test('handoff.md references STITCH_UNANNOTATED list', () => {
    assert.ok(
      handoffMd.includes('STITCH_UNANNOTATED'),
      'handoff.md missing STITCH_UNANNOTATED list for failed gate'
    );
  });

  test('Remediation message references --use-stitch', () => {
    assert.ok(
      handoffMd.includes('--use-stitch'),
      'handoff.md missing --use-stitch in remediation message'
    );
  });

  test('Remediation message explains annotation prerequisite', () => {
    assert.ok(
      handoffMd.includes('Annotation injection is a hard prerequisite'),
      'handoff.md missing annotation prerequisite explanation'
    );
  });

  test('Step 2j handles STH- prefix for Stitch HTML files', () => {
    assert.ok(
      handoffMd.includes('STH-') && handoffMd.includes('pde-state coverage not applicable'),
      'Step 2j missing STH- filename prefix compatibility fix'
    );
  });
});
