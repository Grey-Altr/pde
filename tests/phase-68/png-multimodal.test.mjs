/**
 * png-multimodal.test.mjs
 * Phase 68 — Critique Stitch Comparison
 *
 * Tests: CRT-03 (Multimodal PNG reading for Stitch artifacts)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const critiqueMd = readFileSync(resolve(ROOT, 'workflows', 'critique.md'), 'utf8');

describe('CRT-03: Multimodal PNG reading', () => {
  test('STH PNG path constructed from HTML path', () => {
    assert.ok(
      critiqueMd.includes('.png') && critiqueMd.includes('STH-'),
      'critique.md missing STH PNG path construction'
    );
  });

  test('HAS_PNG variable tracks PNG availability', () => {
    assert.ok(
      critiqueMd.includes('HAS_PNG'),
      'critique.md missing HAS_PNG variable'
    );
  });

  test('PNG read failure is non-blocking (graceful fallback)', () => {
    assert.ok(
      critiqueMd.includes('HAS_PNG = false'),
      'critique.md missing HAS_PNG = false fallback when PNG read fails'
    );
  });

  test('Visual observation requirement for screenshot-derived findings', () => {
    assert.ok(
      critiqueMd.includes('visible') && critiqueMd.includes('screenshot') && critiqueMd.includes('image'),
      'critique.md missing visual observation requirement referencing screenshot/image'
    );
  });

  test('Visual observation tag present', () => {
    assert.ok(
      critiqueMd.includes('[visual: from screenshot]'),
      'critique.md missing [visual: from screenshot] tag for image-derived observations'
    );
  });

  test('PNG path uses .html to .png replacement', () => {
    assert.ok(
      critiqueMd.includes('.html') && critiqueMd.includes('.png') && critiqueMd.includes('replace'),
      'critique.md missing .html to .png path replacement for STH PNG construction'
    );
  });
});
