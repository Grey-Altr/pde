/**
 * experiment-tools.test.mjs — Unit tests for checkCircuitBreakers and estimateCost
 *
 * Tests pure functions from experiment-report.cjs.
 * Phase 103, Task 1.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { _checkCircuitBreakers, _estimateCost } = require('../../bin/lib/experiment-report.cjs');

// ─── estimateCost tests ────────────────────────────────────────────────────────

describe('estimateCost', () => {
  it('Test 7: estimateCost(50) returns a number > 0', () => {
    const result = _estimateCost(50);
    assert.ok(typeof result === 'number', 'Should return a number');
    assert.ok(result > 0, 'Should return a positive number');
  });

  it('Test 8: estimateCost(10) returns proportionally less than estimateCost(50)', () => {
    const cost10 = _estimateCost(10);
    const cost50 = _estimateCost(50);
    assert.ok(cost10 < cost50, 'estimateCost(10) should be less than estimateCost(50)');
  });
});

// ─── checkCircuitBreakers tests ───────────────────────────────────────────────

describe('checkCircuitBreakers', () => {
  it('Test 9: iteration_budget fires when currentIteration >= iterationBudget', () => {
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
    assert.equal(result.fired, true);
    assert.equal(result.reason, 'iteration_budget');
  });

  it('Test 10: time_budget fires when elapsedMinutes >= timeBudget', () => {
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
    assert.equal(result.fired, true);
    assert.equal(result.reason, 'time_budget');
  });

  it('Test 11: consecutive_failures fires when consecutiveFailures >= limit', () => {
    const result = _checkCircuitBreakers({
      currentIteration: 5,
      iterationBudget: 50,
      elapsedMinutes: 10,
      timeBudget: 60,
      consecutiveFailures: 5,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 0,
      noProgressLimit: 10,
    });
    assert.equal(result.fired, true);
    assert.equal(result.reason, 'consecutive_failures');
  });

  it('Test 12: no_progress fires when iterationsSinceImprovement >= noProgressLimit', () => {
    const result = _checkCircuitBreakers({
      currentIteration: 15,
      iterationBudget: 50,
      elapsedMinutes: 20,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 10,
      noProgressLimit: 10,
    });
    assert.equal(result.fired, true);
    assert.equal(result.reason, 'no_progress');
  });

  it('Test 13: returns fired=false, reason=null when all values are below limits', () => {
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
    assert.equal(result.fired, false);
    assert.equal(result.reason, null);
  });

  it('Test 14: iteration_budget fires before time_budget when both would fire (priority order)', () => {
    const result = _checkCircuitBreakers({
      currentIteration: 50,
      iterationBudget: 50,
      elapsedMinutes: 65,
      timeBudget: 60,
      consecutiveFailures: 5,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 10,
      noProgressLimit: 10,
    });
    assert.equal(result.fired, true);
    assert.equal(result.reason, 'iteration_budget', 'iteration_budget should fire first');
  });
});
