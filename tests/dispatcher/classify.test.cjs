'use strict';

// vitest globals: describe, it, expect are injected by vitest (globals: true in config)

const { classifyTaskRouting } = require('../../packages/dispatcher/lib/classify.cjs');

// ─── Base fixture ─────────────────────────────────────────────────────────────

const baseOpts = {
  initialBackend: 'cloud',
  planMetadata: { autonomous: true, estimated_minutes: 30, agent_type: 'autonomous', wave: 1 },
  dispatchOverride: null,
  configOverrides: {},
  costConfig: { ceiling: null, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
  isFastPath: false,
  fastPathLocal: true,
  phase: 194,
};

// ─── Priority 1: fast_path ───────────────────────────────────────────────────

describe('Priority 1: fast_path', () => {
  it('isFastPath=true with fastPathLocal=true routes to local with fast_path reason', () => {
    const result = classifyTaskRouting({ ...baseOpts, isFastPath: true, fastPathLocal: true });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('fast_path');
    expect(result.estimatedCost).toBe(0);
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('isFastPath=true with fastPathLocal=false does NOT force local (passthrough to next rule)', () => {
    // fastPathLocal=false means fast-path doesn't force local — passes through
    const result = classifyTaskRouting({
      ...baseOpts,
      isFastPath: true,
      fastPathLocal: false,
      dispatchOverride: null,
      costConfig: { ceiling: null, costPerMinute: baseOpts.costConfig.costPerMinute },
    });
    // Should NOT be fast_path — should reach auto_classify
    expect(result.reason).not.toBe('fast_path');
    expect(result.reason).toBe('auto_classify');
    expect(result.backend).toBe('cloud');
  });
});

// ─── Priority 2: CLI --dispatch override ─────────────────────────────────────

describe('Priority 2: CLI --dispatch override', () => {
  it('dispatchOverride=docker routes to docker with manual_override reason (RTG-01)', () => {
    const result = classifyTaskRouting({ ...baseOpts, dispatchOverride: 'docker' });
    expect(result.backend).toBe('docker');
    expect(result.reason).toBe('manual_override');
  });

  it('dispatchOverride=ssh overrides cost ceiling (priority 2 > priority 4)', () => {
    // Even with ceiling=0 that would downgrade cloud to local, CLI override wins
    const result = classifyTaskRouting({
      ...baseOpts,
      dispatchOverride: 'ssh',
      costConfig: { ceiling: 0, costPerMinute: baseOpts.costConfig.costPerMinute },
    });
    expect(result.backend).toBe('ssh');
    expect(result.reason).toBe('manual_override');
  });
});

// ─── Priority 3: per-phase config override ───────────────────────────────────

describe('Priority 3: per-phase config override', () => {
  it('configOverrides.override[phase]=ssh routes to ssh with manual_override reason (RTG-03)', () => {
    const result = classifyTaskRouting({
      ...baseOpts,
      configOverrides: { override: { '194': 'ssh' } },
    });
    expect(result.backend).toBe('ssh');
    expect(result.reason).toBe('manual_override');
  });

  it('CLI dispatchOverride takes priority over per-phase config override', () => {
    // CLI=docker, config=ssh → CLI wins (priority 2 > priority 3)
    const result = classifyTaskRouting({
      ...baseOpts,
      dispatchOverride: 'docker',
      configOverrides: { override: { '194': 'ssh' } },
    });
    expect(result.backend).toBe('docker');
    expect(result.reason).toBe('manual_override');
  });
});

// ─── Priority 4: cost ceiling ─────────────────────────────────────────────────

describe('Priority 4: cost ceiling', () => {
  it('ceiling=0, initialBackend=cloud routes to local with cost_ceiling reason (RTG-04)', () => {
    const result = classifyTaskRouting({
      ...baseOpts,
      costConfig: { ceiling: 0, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('cost_ceiling');
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0].subtype).toBe('routing_cost_ceiling');
    expect(result.events[0].from).toBe('cloud');
    expect(result.events[0].to).toBe('local');
  });

  it('ceiling=null (no ceiling) passes through to auto_classify', () => {
    const result = classifyTaskRouting({
      ...baseOpts,
      costConfig: { ceiling: null, costPerMinute: baseOpts.costConfig.costPerMinute },
    });
    expect(result.reason).toBe('auto_classify');
    expect(result.backend).toBe('cloud');
  });

  it('ceiling=20, estimated=$15 (under ceiling) passes through to auto_classify', () => {
    // cloud at $0.50/min * 30min = $15, ceiling=$20 → under ceiling
    const result = classifyTaskRouting({
      ...baseOpts,
      costConfig: { ceiling: 20, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    });
    expect(result.reason).toBe('auto_classify');
    expect(result.backend).toBe('cloud');
    expect(result.estimatedCost).toBe(15);
  });

  it('ceiling=10, estimated=$15 (over ceiling) downgrades to local', () => {
    // cloud at $0.50/min * 30min = $15, ceiling=$10 → over ceiling → local
    const result = classifyTaskRouting({
      ...baseOpts,
      costConfig: { ceiling: 10, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    });
    expect(result.backend).toBe('local');
    expect(result.reason).toBe('cost_ceiling');
    expect(result.estimatedCost).toBe(15);
    expect(result.events.length).toBeGreaterThan(0);
  });
});

// ─── Priority 5: auto_classify ───────────────────────────────────────────────

describe('Priority 5: auto_classify', () => {
  it('no overrides, no ceiling → backend=initialBackend, reason=auto_classify (RTG-02)', () => {
    const result = classifyTaskRouting(baseOpts);
    expect(result.backend).toBe('cloud');
    expect(result.reason).toBe('auto_classify');
    expect(typeof result.estimatedCost).toBe('number');
    expect(Array.isArray(result.events)).toBe(true);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('missing planMetadata.estimated_minutes defaults to 30 for cost calculation', () => {
    // planMetadata without estimated_minutes → default 30 minutes
    const result = classifyTaskRouting({
      ...baseOpts,
      planMetadata: { autonomous: true, agent_type: 'autonomous' },
      costConfig: { ceiling: null, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    });
    // 0.50 * 30 = 15
    expect(result.estimatedCost).toBe(15);
    expect(result.reason).toBe('auto_classify');
  });

  it('opts without isFastPath key does NOT trigger fast_path routing (RTG-06 edge case)', () => {
    // Pitfall 3: opts={} — no isFastPath key means undefined, not true
    const optsWithoutFastPath = {
      initialBackend: 'cloud',
      planMetadata: baseOpts.planMetadata,
      dispatchOverride: null,
      configOverrides: {},
      costConfig: { ceiling: null, costPerMinute: baseOpts.costConfig.costPerMinute },
      fastPathLocal: true,
      phase: 194,
      // isFastPath intentionally omitted
    };
    const result = classifyTaskRouting(optsWithoutFastPath);
    expect(result.reason).not.toBe('fast_path');
    expect(result.backend).toBe('cloud');
  });

  it('estimatedCost is correctly computed as costPerMinute[backend] * estimated_minutes', () => {
    const result = classifyTaskRouting({
      ...baseOpts,
      initialBackend: 'docker',
      planMetadata: { ...baseOpts.planMetadata, estimated_minutes: 20 },
      costConfig: { ceiling: null, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    });
    // docker at $0.10/min * 20min = $2.00
    expect(result.estimatedCost).toBe(2.0);
    expect(result.backend).toBe('docker');
    expect(result.reason).toBe('auto_classify');
  });

  it('events array is always returned (empty when no routing event fires)', () => {
    const result = classifyTaskRouting(baseOpts);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.events.length).toBe(0);
  });

  it('cost_ceiling event includes from, to, estimatedCost, ceiling fields', () => {
    const result = classifyTaskRouting({
      ...baseOpts,
      costConfig: { ceiling: 5, costPerMinute: { cloud: 0.50, docker: 0.10, ssh: 0.05, local: 0.00 } },
    });
    expect(result.events.length).toBe(1);
    const evt = result.events[0];
    expect(evt.type).toBe('system');
    expect(evt.subtype).toBe('routing_cost_ceiling');
    expect(evt.from).toBe('cloud');
    expect(evt.to).toBe('local');
    expect(typeof evt.estimatedCost).toBe('number');
    expect(evt.ceiling).toBe(5);
  });
});
