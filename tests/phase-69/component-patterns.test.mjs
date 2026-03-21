/**
 * component-patterns.test.mjs
 * Phase 69 — Handoff Pattern Extraction
 *
 * Tests: HND-01 (STITCH_COMPONENT_PATTERNS section, source tags)
 *        HND-03 (Stitch-only components with @verify label in TypeScript interfaces)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const handoffMd = readFileSync(resolve(ROOT, 'workflows', 'handoff.md'), 'utf8');

describe('HND-01: STITCH_COMPONENT_PATTERNS section', () => {
  test('handoff.md contains STITCH_COMPONENT_PATTERNS section header', () => {
    assert.ok(
      handoffMd.includes('STITCH_COMPONENT_PATTERNS'),
      'handoff.md missing STITCH_COMPONENT_PATTERNS section'
    );
  });

  test('STITCH_COMPONENT_PATTERNS section documents WFR+Stitch source tag', () => {
    assert.ok(
      handoffMd.includes('WFR+Stitch'),
      'handoff.md missing WFR+Stitch source tag'
    );
  });

  test('STITCH_COMPONENT_PATTERNS section documents Stitch-only source tag', () => {
    assert.ok(
      handoffMd.includes('Stitch-only'),
      'handoff.md missing Stitch-only source tag'
    );
  });

  test('STITCH_COMPONENT_PATTERNS section documents WFR-only source tag', () => {
    assert.ok(
      handoffMd.includes('WFR-only'),
      'handoff.md missing WFR-only source tag'
    );
  });

  test('STITCH_COMPONENT_PATTERNS appears after Per-Screen Detail Specs', () => {
    const perScreenIdx = handoffMd.lastIndexOf('Per-Screen Detail Specs');
    const stitchPatternsIdx = handoffMd.lastIndexOf('STITCH_COMPONENT_PATTERNS');
    assert.ok(perScreenIdx !== -1, 'handoff.md missing Per-Screen Detail Specs');
    assert.ok(stitchPatternsIdx !== -1, 'handoff.md missing STITCH_COMPONENT_PATTERNS');
    assert.ok(stitchPatternsIdx > perScreenIdx, 'STITCH_COMPONENT_PATTERNS must appear after Per-Screen Detail Specs');
  });
});

describe('HND-03: Stitch-only components with @verify label', () => {
  test('handoff.md includes @verify JSDoc annotation for Stitch-only components', () => {
    assert.ok(
      handoffMd.includes('@verify'),
      'handoff.md missing @verify annotation for Stitch-only components'
    );
  });

  test('handoff.md includes verify before implementation text', () => {
    assert.ok(
      handoffMd.includes('verify before implementation'),
      'handoff.md missing "verify before implementation" label for Stitch-only components'
    );
  });

  test('TypeScript interfaces use STH_ prefix naming convention', () => {
    assert.ok(
      handoffMd.includes('STH_'),
      'handoff.md missing STH_ prefix for Stitch TypeScript interface naming'
    );
  });

  test('Stitch-only interface includes human decision prompt text', () => {
    assert.ok(
      handoffMd.includes('no WFR wireframe counterpart'),
      'handoff.md missing human decision prompt for Stitch-only components'
    );
  });
});
