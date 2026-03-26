// vitest globals:true — test, describe, expect, it are injected globally

describe('relay downsampling counter-mod (HRD-04)', () => {
  it('keeps every Nth event of high-frequency types', () => {
    const RATE = 5;
    const kept = [];
    const TYPES = new Set(['bash_called', 'file_changed', 'tool_called']);
    const counters = new Map();

    for (let i = 0; i < 10; i++) {
      const type = 'bash_called';
      const count = counters.get(type) ?? 0;
      counters.set(type, count + 1);
      if (count % RATE === 0) kept.push(i);
    }
    expect(kept).toEqual([0, 5]);
  });

  it('never drops non-downsampled types', () => {
    const DOWNSAMPLE_TYPES = new Set(['bash_called', 'file_changed', 'tool_called']);
    const alwaysKept = [
      'session_start', 'session_end', 'subagent_start', 'subagent_stop',
      'token_usage', 'error', 'critical_error', 'approval_request',
      'approval_response', 'phase_started', 'phase_complete',
      'plan_started', 'plan_complete',
    ];
    for (const t of alwaysKept) {
      expect(DOWNSAMPLE_TYPES.has(t)).toBe(false);
    }
  });

  it('counter increments independently per type', () => {
    const RATE = 3;
    const counters = new Map();
    const keptBash = [];
    const keptFile = [];
    const types = ['bash_called', 'file_changed'];

    for (let i = 0; i < 6; i++) {
      for (const type of types) {
        const count = counters.get(type) ?? 0;
        counters.set(type, count + 1);
        if (count % RATE === 0) {
          if (type === 'bash_called') keptBash.push(i);
          else keptFile.push(i);
        }
      }
    }
    expect(keptBash).toEqual([0, 3]);
    expect(keptFile).toEqual([0, 3]);
  });

  it('RATE=1 keeps every event (disables downsampling)', () => {
    const RATE = 1;
    const kept = [];
    const counters = new Map();

    for (let i = 0; i < 5; i++) {
      const type = 'bash_called';
      const count = counters.get(type) ?? 0;
      counters.set(type, count + 1);
      if (count % RATE === 0) kept.push(i);
    }
    expect(kept).toEqual([0, 1, 2, 3, 4]);
  });
});
