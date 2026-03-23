/**
 * experiment-tools.test.mjs
 *
 * Tests for estimateCost and checkCircuitBreakers in experiment-report.cjs.
 * These are pure functions — no filesystem or git operations needed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const REPORT_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-report.cjs');
const { _estimateCost, _checkCircuitBreakers } = require(REPORT_MODULE);

// --- estimateCost tests -------------------------------------------------------

test('Test 7: estimateCost(50) returns a number > 0', () => {
  const result = _estimateCost(50);
  assert.ok(typeof result === 'number', 'estimateCost should return a number');
  assert.ok(result > 0, 'estimateCost(50) should return > 0');
  // 50 * 2000 = 100000
  assert.equal(result, 100000, 'estimateCost(50) should be 100000 (50 * 2000)');
});

test('Test 8: estimateCost(10) returns proportionally less than estimateCost(50)', () => {
  const est10 = _estimateCost(10);
  const est50 = _estimateCost(50);
  assert.ok(est10 < est50, 'estimateCost(10) should be less than estimateCost(50)');
  // Check proportionality: est10 / est50 should approximate 10/50 = 0.2
  const ratio = est10 / est50;
  assert.ok(ratio > 0.1 && ratio < 0.3, `ratio ${ratio} should be approximately 0.2`);
});

// --- checkCircuitBreakers tests -----------------------------------------------

test('Test 9: iteration_budget fires when currentIteration >= iterationBudget', () => {
  const result = _checkCircuitBreakers({
    currentIteration: 50,
    iterationBudget: 50,
    elapsedMinutes: 0,
    timeBudget: 60,
    consecutiveFailures: 0,
    consecutiveFailureLimit: 5,
    iterationsSinceImprovement: 0,
    noProgressLimit: 10,
  });
  assert.equal(result.fired, true, 'should fire');
  assert.equal(result.reason, 'iteration_budget', 'reason should be iteration_budget');
});

test('Test 10: time_budget fires when elapsedMinutes >= timeBudget', () => {
  const result = _checkCircuitBreakers({
    currentIteration: 5,
    iterationBudget: 50,
    elapsedMinutes: 61,
    timeBudget: 60,
    consecutiveFailures: 0,
    consecutiveFailureLimit: 5,
    iterationsSinceImprovement: 0,
    noProgressLimit: 10,
  });
  assert.equal(result.fired, true, 'should fire');
  assert.equal(result.reason, 'time_budget', 'reason should be time_budget');
});

test('Test 11: consecutive_failures fires when consecutiveFailures >= limit', () => {
  const result = _checkCircuitBreakers({
    currentIteration: 5,
    iterationBudget: 50,
    elapsedMinutes: 10,
    timeBudget: 60,
    consecutiveFailures: 5,
    consecutiveFailureLimit: 5,
    iterationsSinceImprovement: 5,
    noProgressLimit: 10,
  });
  assert.equal(result.fired, true, 'should fire');
  assert.equal(result.reason, 'consecutive_failures', 'reason should be consecutive_failures');
});

test('Test 12: no_progress fires when iterationsSinceImprovement >= noProgressLimit', () => {
  const result = _checkCircuitBreakers({
    currentIteration: 10,
    iterationBudget: 50,
    elapsedMinutes: 10,
    timeBudget: 60,
    consecutiveFailures: 2,
    consecutiveFailureLimit: 5,
    iterationsSinceImprovement: 10,
    noProgressLimit: 10,
  });
  assert.equal(result.fired, true, 'should fire');
  assert.equal(result.reason, 'no_progress', 'reason should be no_progress');
});

test('Test 13: no breaker fires when all values below limits', () => {
  const result = _checkCircuitBreakers({
    currentIteration: 5,
    iterationBudget: 50,
    elapsedMinutes: 10,
    timeBudget: 60,
    consecutiveFailures: 2,
    consecutiveFailureLimit: 5,
    iterationsSinceImprovement: 3,
    noProgressLimit: 10,
  });
  assert.equal(result.fired, false, 'should not fire');
  assert.equal(result.reason, null, 'reason should be null');
});

test('Test 14: iteration_budget fires before time_budget when both would fire (priority order)', () => {
  // Both iteration_budget AND time_budget would fire — iteration_budget has higher priority
  const result = _checkCircuitBreakers({
    currentIteration: 50,
    iterationBudget: 50,
    elapsedMinutes: 61,
    timeBudget: 60,
    consecutiveFailures: 5,
    consecutiveFailureLimit: 5,
    iterationsSinceImprovement: 10,
    noProgressLimit: 10,
  });
  assert.equal(result.fired, true, 'should fire');
  assert.equal(result.reason, 'iteration_budget', 'iteration_budget should fire first (priority order)');
});
