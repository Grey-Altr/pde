/**
 * experiment-runner-metric-eval.test.mjs
 *
 * Tests for _evalMetric in experiment-runner.cjs.
 * Uses simple shell commands — no git repo needed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const RUNNER_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-runner.cjs');
const runner = require(RUNNER_MODULE);

const CWD = os.tmpdir();

// --- Tests -------------------------------------------------------------------

test('_evalMetric: command exits 0 with numeric last line -> status ok, metric_value parsed', () => {
  const result = runner._evalMetric(CWD, 'node -e "process.stdout.write(\'42.5\n\')"', 5000);
  assert.equal(result.status, 'ok', 'Should return ok status');
  assert.equal(result.metric_value, 42.5, 'Should parse metric_value as 42.5');
});

test('_evalMetric: command exits non-zero -> CRASH nonzero_exit', () => {
  const result = runner._evalMetric(CWD, 'node -e "process.exit(1)"', 5000);
  assert.equal(result.status, 'CRASH', 'Should return CRASH status');
  assert.equal(result.reason, 'nonzero_exit', 'Reason should be nonzero_exit');
  assert.equal(result.metric_value, null, 'metric_value should be null');
});

test('_evalMetric: command times out -> CRASH timeout', () => {
  // Use a 100ms timeout with a command that sleeps 10s
  const result = runner._evalMetric(CWD, 'node -e "setTimeout(()=>{},10000)"', 100);
  assert.equal(result.status, 'CRASH', 'Should return CRASH on timeout');
  assert.equal(result.reason, 'timeout', 'Reason should be timeout');
  assert.equal(result.metric_value, null, 'metric_value should be null');
});

test('_evalMetric: command exits 0 but last line is not a number -> CRASH unparseable_metric', () => {
  const result = runner._evalMetric(CWD, 'node -e "process.stdout.write(\'not a number\n\')"', 5000);
  assert.equal(result.status, 'CRASH', 'Should return CRASH for non-numeric output');
  assert.equal(result.reason, 'unparseable_metric', 'Reason should be unparseable_metric');
  assert.equal(result.metric_value, null, 'metric_value should be null');
});

test('_evalMetric: command exits 0 but stdout is empty -> CRASH unparseable_metric', () => {
  const result = runner._evalMetric(CWD, 'node -e ""', 5000);
  assert.equal(result.status, 'CRASH', 'Should return CRASH for empty stdout');
  assert.equal(result.reason, 'unparseable_metric', 'Reason should be unparseable_metric');
  assert.equal(result.metric_value, null, 'metric_value should be null');
});

test('_evalMetric: Infinity in stdout -> CRASH (Number.isFinite check)', () => {
  const result = runner._evalMetric(CWD, 'node -e "process.stdout.write(\'Infinity\n\')"', 5000);
  assert.equal(result.status, 'CRASH', 'Should return CRASH for Infinity');
  assert.equal(result.reason, 'unparseable_metric', 'Reason should be unparseable_metric for Infinity');
  assert.equal(result.metric_value, null, 'metric_value should be null for Infinity');
});

// --- _compareMetric tests ---------------------------------------------------

test('_compareMetric: direction=max, newValue>bestMetric -> KEEP', () => {
  const result = runner._compareMetric(10, 8, 'max');
  assert.equal(result, 'KEEP', 'Should KEEP when newValue > bestMetric in max direction');
});

test('_compareMetric: direction=max, newValue<bestMetric -> DISCARD', () => {
  const result = runner._compareMetric(6, 8, 'max');
  assert.equal(result, 'DISCARD', 'Should DISCARD when newValue < bestMetric in max direction');
});

test('_compareMetric: direction=min, newValue<bestMetric -> KEEP', () => {
  const result = runner._compareMetric(3, 5, 'min');
  assert.equal(result, 'KEEP', 'Should KEEP when newValue < bestMetric in min direction');
});

test('_compareMetric: direction=min, newValue>bestMetric -> DISCARD', () => {
  const result = runner._compareMetric(7, 5, 'min');
  assert.equal(result, 'DISCARD', 'Should DISCARD when newValue > bestMetric in min direction');
});

test('_compareMetric: bestMetric is null (first iteration) -> KEEP', () => {
  const result = runner._compareMetric(5.5, null, 'max');
  assert.equal(result, 'KEEP', 'Should KEEP when bestMetric is null (first iteration)');
});
