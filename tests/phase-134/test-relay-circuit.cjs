'use strict';

/**
 * test-relay-circuit.cjs — CircuitBreaker state machine tests
 * Phase 134, Plan 02
 *
 * Pure state machine tests — no I/O, no timers.
 */

// vitest globals (describe, it, expect, beforeEach, vi) are injected via globals:true in vitest.config.ts
const { CircuitBreaker } = require('../../bin/lib/relay.cjs');

describe('CircuitBreaker', () => {
  it('Test 6: starts in CLOSED state, canAttempt() returns true', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.canAttempt()).toBe(true);
  });

  it('Test 7: after failureThreshold consecutive recordFailure() calls, state becomes OPEN and canAttempt() returns false', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('CLOSED'); // not yet at threshold

    breaker.recordFailure(); // threshold reached
    expect(breaker.state).toBe('OPEN');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('Test 8: after cooldownMs in OPEN state, canAttempt() transitions to HALF_OPEN and returns true', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100 });

    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');
    expect(breaker.canAttempt()).toBe(false);

    // Simulate cooldown elapsed by manipulating _openedAt
    breaker._openedAt = Date.now() - 200; // 200ms ago > 100ms cooldown
    expect(breaker.canAttempt()).toBe(true);
    expect(breaker.state).toBe('HALF_OPEN');
  });

  it('Test 9: recordSuccess() in HALF_OPEN returns to CLOSED', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100 });

    breaker.recordFailure();
    breaker._openedAt = Date.now() - 200;
    breaker.canAttempt(); // transitions to HALF_OPEN
    expect(breaker.state).toBe('HALF_OPEN');

    breaker.recordSuccess();
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.failureCount).toBe(0);
    expect(breaker.canAttempt()).toBe(true);
  });

  it('Test 10: recordFailure() in HALF_OPEN returns to OPEN', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100 });

    breaker.recordFailure();
    breaker._openedAt = Date.now() - 200;
    breaker.canAttempt(); // transitions to HALF_OPEN
    expect(breaker.state).toBe('HALF_OPEN');

    breaker.recordFailure(); // probe failed — re-open
    expect(breaker.state).toBe('OPEN');
    expect(breaker.canAttempt()).toBe(false);
  });
});
