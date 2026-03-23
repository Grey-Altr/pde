/**
 * experiment-runner-metric-eval.test.mjs
 *
 * Tests for _evalMetric and _compareMetric in bin/lib/experiment-runner.cjs.
 * Uses simple shell commands as verify commands -- no git repo needed.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runner = require('../../bin/lib/experiment-runner.cjs');

const { _evalMetric, _compareMetric } = runner;

const CWD = process.cwd();

// ─── _evalMetric tests ────────────────────────────────────────────────────────

describe('_evalMetric — metric evaluation via spawnSync', () => {

  it('returns status:ok and metric_value when command exits 0 with numeric last line', () => {
    const result = _evalMetric(CWD, 'echo 42.5', 5000);
    assert.equal(result.status, 'ok');
    assert.equal(result.metric_value, 42.5);
  });

  it('returns CRASH/nonzero_exit when command exits non-zero', () => {
    const result = _evalMetric(CWD, 'node -e "process.exit(1)"', 5000);
    assert.equal(result.status, 'CRASH');
    assert.equal(result.reason, 'nonzero_exit');
    assert.equal(result.metric_value, null);
  });

  it('returns CRASH/timeout when command times out', () => {
    // Use node sleep with 2000ms but 100ms timeout
    const result = _evalMetric(CWD, 'node -e "setTimeout(() => {}, 2000)"', 100);
    assert.equal(result.status, 'CRASH');
    assert.equal(result.reason, 'timeout');
    assert.equal(result.metric_value, null);
  });

  it('returns CRASH/unparseable_metric when last line is not a number', () => {
    const result = _evalMetric(CWD, 'echo "not a number"', 5000);
    assert.equal(result.status, 'CRASH');
    assert.equal(result.reason, 'unparseable_metric');
    assert.equal(result.metric_value, null);
  });

  it('returns CRASH/unparseable_metric when stdout is empty', () => {
    const result = _evalMetric(CWD, 'node -e "// nothing"', 5000);
    assert.equal(result.status, 'CRASH');
    assert.equal(result.reason, 'unparseable_metric');
    assert.equal(result.metric_value, null);
  });

  it('returns CRASH when Infinity in stdout (Number.isFinite check)', () => {
    const result = _evalMetric(CWD, 'echo "Infinity"', 5000);
    assert.equal(result.status, 'CRASH');
    assert.equal(result.reason, 'unparseable_metric');
    assert.equal(result.metric_value, null);
  });

});

// ─── _compareMetric tests ─────────────────────────────────────────────────────

describe('_compareMetric — keep/discard decision', () => {

  it('returns KEEP for direction=max when newValue > bestMetric', () => {
    assert.equal(_compareMetric(10, 8, 'max'), 'KEEP');
  });

  it('returns DISCARD for direction=max when newValue < bestMetric', () => {
    assert.equal(_compareMetric(6, 8, 'max'), 'DISCARD');
  });

  it('returns KEEP for direction=min when newValue < bestMetric', () => {
    assert.equal(_compareMetric(3, 5, 'min'), 'KEEP');
  });

  it('returns DISCARD for direction=min when newValue > bestMetric', () => {
    assert.equal(_compareMetric(7, 5, 'min'), 'DISCARD');
  });

  it('returns KEEP when bestMetric is null (first iteration)', () => {
    assert.equal(_compareMetric(42, null, 'max'), 'KEEP');
    assert.equal(_compareMetric(42, null, 'min'), 'KEEP');
  });

});
