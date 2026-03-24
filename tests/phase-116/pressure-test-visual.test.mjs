/**
 * pressure-test-visual.test.mjs — Phase 116 Nyquist Coverage (PRES-01..04)
 *
 * Validates visual quality scoring dimension in pressure-test.md:
 *   PRES-01: Step 5b visual scoring block present
 *   PRES-02: dom-metric, a11y-metric, contrast-metric all called
 *   PRES-03: combined score formula with 0.65/0.35 weights
 *   PRES-04: graceful degradation when Playwright unavailable
 *
 * Run: node --test tests/phase-116/pressure-test-visual.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

describe('PRES-01: pressure-test visual quality dimension', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/pressure-test.md`, 'utf-8');

  it('contains Step 5b visual scoring block', () => {
    assert.ok(content.includes('Step 5b'), 'Missing Step 5b visual scoring block');
  });

  it('contains visual_avg computation', () => {
    assert.ok(/visual.avg|VISUAL_AVG/i.test(content), 'Missing visual_avg computation');
  });
});

describe('PRES-02: browser renders and scores DOM/a11y/contrast', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/pressure-test.md`, 'utf-8');

  it('calls dom-metric.cjs', () => {
    assert.ok(content.includes('dom-metric.cjs'), 'Missing dom-metric call');
  });

  it('calls a11y-metric.cjs', () => {
    assert.ok(content.includes('a11y-metric.cjs'), 'Missing a11y-metric call');
  });

  it('calls contrast-metric.cjs', () => {
    assert.ok(content.includes('contrast-metric.cjs'), 'Missing contrast-metric call');
  });
});

describe('PRES-03: combined score formula', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/pressure-test.md`, 'utf-8');

  it('contains 0.65 text weight', () => {
    assert.ok(content.includes('0.65'), 'Missing 0.65 text weight');
  });

  it('contains 0.35 visual weight', () => {
    assert.ok(content.includes('0.35'), 'Missing 0.35 visual weight');
  });

  it('contains combined score reference', () => {
    assert.ok(/combined.score|COMBINED_SCORE/i.test(content), 'Missing combined score');
  });
});

describe('PRES-04: graceful degradation when Playwright unavailable', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/pressure-test.md`, 'utf-8');

  it('contains PLAYWRIGHT_AVAILABLE check', () => {
    assert.ok(content.includes('PLAYWRIGHT_AVAILABLE'), 'Missing PLAYWRIGHT_AVAILABLE check');
  });

  it('contains degradation skip message', () => {
    assert.ok(content.includes('text rubric only'), 'Missing degradation message');
  });

  it('sets VISUAL_AVG = 0 on degradation', () => {
    assert.ok(/VISUAL_AVG\s*=\s*0/.test(content), 'Missing VISUAL_AVG = 0 fallback');
  });
});
