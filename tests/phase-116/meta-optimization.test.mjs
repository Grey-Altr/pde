/**
 * meta-optimization.test.mjs — Phase 116 Nyquist Coverage (META-01..04)
 *
 * Validates strategy-weights.cjs and optimize.md meta-optimization injection:
 *   META-01: computeStrategyWeights exported and handles missing experiments dir
 *   META-02: extractTags returns keyword array from description
 *   META-03: computeStrategyWeights reads JSONL and returns sorted weights
 *   META-04: optimize.md contains strategy_hint injection prose
 *
 * Run: node --test tests/phase-116/meta-optimization.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

describe('META-01: strategy-weights.cjs exports computeStrategyWeights', () => {
  it('module exports computeStrategyWeights function', () => {
    const sw = require(`${ROOT}/bin/lib/strategy-weights.cjs`);
    assert.equal(typeof sw.computeStrategyWeights, 'function');
  });

  it('returns empty array when no experiments dir exists', () => {
    const sw = require(`${ROOT}/bin/lib/strategy-weights.cjs`);
    const result = sw.computeStrategyWeights('/nonexistent/path');
    assert.deepStrictEqual(result, []);
  });
});

describe('META-02: extractTags returns keyword array from description', () => {
  it('module exports extractTags function', () => {
    const sw = require(`${ROOT}/bin/lib/strategy-weights.cjs`);
    assert.equal(typeof sw.extractTags, 'function');
  });

  it('extracts words longer than 4 chars', () => {
    const sw = require(`${ROOT}/bin/lib/strategy-weights.cjs`);
    const tags = sw.extractTags('clarified heading hierarchy in section');
    assert.ok(tags.includes('clarified'));
    assert.ok(tags.includes('heading'));
    assert.ok(tags.includes('hierarchy'));
    assert.ok(tags.includes('section'));
    // "in" should be excluded (< 5 chars)
    assert.ok(!tags.includes('in'));
  });

  it('handles empty/null description', () => {
    const sw = require(`${ROOT}/bin/lib/strategy-weights.cjs`);
    assert.deepStrictEqual(sw.extractTags(''), []);
    assert.deepStrictEqual(sw.extractTags(null), []);
  });
});

describe('META-03: computeStrategyWeights reads JSONL and returns sorted weights', () => {
  it('computes weights from JSONL fixture with min sample filtering', () => {
    const sw = require(`${ROOT}/bin/lib/strategy-weights.cjs`);
    // Create temp fixture
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
    const expDir = path.join(tmpDir, '.planning', 'experiments', 'test-slug');
    fs.mkdirSync(expDir, { recursive: true });
    const rows = [
      { description: 'clarified heading structure', status: 'KEEP' },
      { description: 'clarified contrast ratio', status: 'KEEP' },
      { description: 'clarified label naming', status: 'DISCARD' },
      { description: 'simplified heading layout', status: 'KEEP' },
    ];
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), rows.map(r => JSON.stringify(r)).join('\n'));
    const weights = sw.computeStrategyWeights(tmpDir);
    // "clarified" has 3 total (>= MIN_SAMPLE=3), 2 KEEP -> 0.667 keep_rate
    const clarified = weights.find(w => w.tag === 'clarified');
    assert.ok(clarified, 'clarified tag should be present (3 occurrences >= MIN_SAMPLE)');
    assert.ok(clarified.keep_rate > 0.6, 'clarified keep_rate should be ~0.667');
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('META-04: optimize.md contains strategy_hint injection prose', () => {
  const content = fs.readFileSync(`${ROOT}/workflows/optimize.md`, 'utf-8');

  it('contains strategy_hint tag', () => {
    assert.ok(content.includes('strategy_hint'), 'Missing strategy_hint in optimize.md');
  });

  it('references strategy-weights.cjs', () => {
    assert.ok(content.includes('strategy-weights.cjs'), 'Missing strategy-weights.cjs reference');
  });

  it('contains KEEP rate in strategy hint template', () => {
    assert.ok(/keep.rate/i.test(content), 'Missing keep rate reference in strategy hint');
  });
});
