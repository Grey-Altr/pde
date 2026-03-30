'use strict';

/**
 * classify.test.cjs — Unit tests for classifyTaskRouting()
 *
 * Phase 194: Intelligent Routing
 * Satisfies: RTG-01 (manual override), RTG-02 (auto-classify), RTG-03 (phase override),
 *            RTG-04 (cost ceiling), RTG-06 (fast-path)
 *
 * Pure unit tests — no I/O, no network, all synchronous.
 * classifyTaskRouting() is a pure function; all inputs injected as arguments.
 */

// vitest globals: true — describe, it, expect, vi, beforeEach available without import
const { classifyTaskRouting } = require('../../packages/dispatcher/lib/classify.cjs');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const defaultPlanMetadata = {
  autonomous: true,
  estimated_minutes: 30,
  agent_type: 'autonomous',
  wave: null,
};

const defaultCostConfig = {
  ceiling: null,
  costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
};

function classify(overrides = {}) {
  return classifyTaskRouting({
    initialBackend: 'local',
    planMetadata: defaultPlanMetadata,
    dispatchOverride: null,
    configOverrides: {},
    costConfig: defaultCostConfig,
    isFastPath: false,
    fastPathLocal: true,
    phase: 194,
    ...overrides,
  });
}

// ─── Test Suite: Priority 1 — Fast-path guard (RTG-06) ────────────────────────

describe('classifyTaskRouting — Priority 1: fast-path guard (RTG-06)', () => {
  it('CL-01: isFastPath=true with fastPathLocal=true returns backend=local, reason=fast_path', () => {
    const result = classify({ isFastPath: true, fastPathLocal: true, initialBackend: 'cloud' });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('fast_path');
    expect(result.estimatedCost).toBe(0);
  });

  it('CL-02: isFastPath=true with fastPathLocal=false does NOT use fast-path guard', () => {
    const result = classify({ isFastPath: true, fastPathLocal: false, initialBackend: 'cloud' });
    // fast_path guard skipped — falls through to auto_classify
    expect(result.reason).not.toBe('fast_path');
  });

  it('CL-03: isFastPath=false does not trigger fast-path guard', () => {
    const result = classify({ isFastPath: false, initialBackend: 'cloud' });
    expect(result.reason).not.toBe('fast_path');
    expect(result.backend).toBe('cloud');
  });
});

// ─── Test Suite: Priority 2 — CLI --dispatch flag (RTG-01) ────────────────────

describe('classifyTaskRouting — Priority 2: CLI --dispatch flag (RTG-01)', () => {
  it('CL-04: dispatchOverride=docker returns backend=docker, reason=manual_override', () => {
    const result = classify({ dispatchOverride: 'docker', initialBackend: 'cloud' });
    expect(result.backend).toBe('docker');
    expect(result.reason).toBe('manual_override');
    expect(result.estimatedCost).toBeNull();
  });

  it('CL-05: dispatchOverride=cloud returns backend=cloud regardless of initialBackend', () => {
    const result = classify({ dispatchOverride: 'cloud', initialBackend: 'local' });
    expect(result.backend).toBe('cloud');
    expect(result.reason).toBe('manual_override');
  });

  it('CL-06: dispatchOverride=null does not trigger manual_override', () => {
    const result = classify({ dispatchOverride: null, initialBackend: 'local' });
    expect(result.reason).not.toBe('manual_override');
  });
});

// ─── Test Suite: Priority 3 — Per-phase config override (RTG-03) ──────────────

describe('classifyTaskRouting — Priority 3: per-phase config override (RTG-03)', () => {
  it('CL-07: configOverrides.override[phase] returns that backend with reason=manual_override', () => {
    const result = classify({
      configOverrides: { override: { '194': 'docker' } },
      phase: 194,
      initialBackend: 'local',
    });
    expect(result.backend).toBe('docker');
    expect(result.reason).toBe('manual_override');
  });

  it('CL-08: per-phase override only applies to the matching phase', () => {
    const result = classify({
      configOverrides: { override: { '195': 'docker' } },
      phase: 194,
      initialBackend: 'local',
    });
    // Override is for phase 195, not 194 — should not apply
    expect(result.backend).toBe('local');
    expect(result.reason).not.toBe('manual_override');
  });

  it('CL-09: empty configOverrides does not trigger phase override', () => {
    const result = classify({ configOverrides: {}, phase: 194 });
    expect(result.reason).not.toBe('manual_override');
  });
});

// ─── Test Suite: Priority 4 — Cost ceiling (RTG-04) ──────────────────────────

describe('classifyTaskRouting — Priority 4: cost ceiling (RTG-04)', () => {
  it('CL-10: estimatedCost > ceiling downgrades to local, reason=cost_ceiling', () => {
    const result = classify({
      initialBackend: 'cloud',
      planMetadata: { ...defaultPlanMetadata, estimated_minutes: 30 },
      costConfig: {
        ceiling: 5.0, // 30 min * $0.50/min = $15.00 > $5.00
        costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
      },
    });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('cost_ceiling');
    expect(result.estimatedCost).toBe(15.0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].subtype).toBe('routing_cost_ceiling');
    expect(result.events[0].from).toBe('cloud');
    expect(result.events[0].to).toBe('local');
  });

  it('CL-11: estimatedCost <= ceiling does not downgrade', () => {
    const result = classify({
      initialBackend: 'cloud',
      planMetadata: { ...defaultPlanMetadata, estimated_minutes: 5 },
      costConfig: {
        ceiling: 10.0, // 5 min * $0.50/min = $2.50 <= $10.00
        costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
      },
    });
    expect(result.backend).toBe('cloud');
    expect(result.reason).not.toBe('cost_ceiling');
  });

  it('CL-12: ceiling=null disables cost ceiling check', () => {
    const result = classify({
      initialBackend: 'cloud',
      planMetadata: { ...defaultPlanMetadata, estimated_minutes: 100 },
      costConfig: {
        ceiling: null, // no ceiling
        costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
      },
    });
    expect(result.backend).toBe('cloud');
    expect(result.reason).not.toBe('cost_ceiling');
  });

  it('CL-13: cost_ceiling event includes estimatedCost, ceiling, from, to fields', () => {
    const result = classify({
      initialBackend: 'docker',
      planMetadata: { ...defaultPlanMetadata, estimated_minutes: 60 },
      costConfig: {
        ceiling: 1.0, // 60 min * $0.10/min = $6.00 > $1.00
        costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
      },
    });
    expect(result.events[0]).toMatchObject({
      type: 'system',
      subtype: 'routing_cost_ceiling',
      from: 'docker',
      to: 'local',
      estimatedCost: 6.0,
      ceiling: 1.0,
    });
  });
});

// ─── Test Suite: Priority 5 — Auto-classify (RTG-02) ──────────────────────────

describe('classifyTaskRouting — Priority 5: auto-classify (RTG-02)', () => {
  it('CL-14: when no overrides apply, returns initialBackend with reason=auto_classify', () => {
    const result = classify({ initialBackend: 'cloud' });
    expect(result.backend).toBe('cloud');
    expect(result.reason).toBe('auto_classify');
  });

  it('CL-15: estimatedCost is computed as costPerMinute[backend] * estimated_minutes', () => {
    const result = classify({
      initialBackend: 'cloud',
      planMetadata: { ...defaultPlanMetadata, estimated_minutes: 20 },
      costConfig: {
        ceiling: null,
        costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 },
      },
    });
    expect(result.estimatedCost).toBe(10.0); // 20 * 0.50
  });

  it('CL-16: local backend has estimatedCost=0', () => {
    const result = classify({ initialBackend: 'local' });
    expect(result.estimatedCost).toBe(0);
  });

  it('CL-17: auto_classify returns empty events array', () => {
    const result = classify({ initialBackend: 'local' });
    expect(result.events).toHaveLength(0);
  });
});

// ─── Test Suite: Return value shape ───────────────────────────────────────────

describe('classifyTaskRouting — return value shape', () => {
  it('CL-18: always returns { backend, reason, estimatedCost, events }', () => {
    const result = classify();
    expect(result).toHaveProperty('backend');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('estimatedCost');
    expect(result).toHaveProperty('events');
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('CL-19: fast_path result has estimatedCost=0 and empty events', () => {
    const result = classify({ isFastPath: true, fastPathLocal: true });
    expect(result.estimatedCost).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('CL-20: manual_override has estimatedCost=null', () => {
    const result = classify({ dispatchOverride: 'ssh' });
    expect(result.estimatedCost).toBeNull();
  });
});
