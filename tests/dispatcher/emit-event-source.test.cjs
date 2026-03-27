'use strict';
/**
 * emit-event-source.test.cjs -- Source inspection tests for emit-event.cjs PDE_BACKEND fallback
 *
 * Phase 154: SSH Source Propagation
 * Satisfies: SSH-04
 *
 * Uses source inspection pattern (readFileSync) consistent with Phase 150 and Phase 149.
 * emit-event.cjs calls spawnSync internally -- behavioral testing would require process-level
 * mocking. Source inspection confirms the fallback pattern exists.
 */
const fs = require('node:fs');
const path = require('node:path');

const SRC_PATH = path.resolve(__dirname, '../../hooks/emit-event.cjs');
const src = fs.readFileSync(SRC_PATH, 'utf-8');

describe('emit-event.cjs PDE_BACKEND source fallback', () => {
  it('reads PDE_BACKEND as fallback when hookData.source is absent', () => {
    // The source must contain the two-step pattern:
    // 1. const source = hookData.source || process.env.PDE_BACKEND
    // 2. if (source) payload.source = source
    expect(src).toContain('hookData.source || process.env.PDE_BACKEND');
  });

  it('source fallback is guarded by if (source) to avoid undefined assignment', () => {
    expect(src).toContain('if (source) payload.source = source');
  });

  it('PDE_BACKEND fallback is inside SessionStart block only', () => {
    // Extract the SessionStart block and verify PDE_BACKEND is inside it
    const sessionStartIdx = src.indexOf("hookName === 'SessionStart'");
    expect(sessionStartIdx).toBeGreaterThan(-1);
    const pdeBackendIdx = src.indexOf('process.env.PDE_BACKEND');
    expect(pdeBackendIdx).toBeGreaterThan(-1);
    // PDE_BACKEND reference must come after the SessionStart check
    expect(pdeBackendIdx).toBeGreaterThan(sessionStartIdx);
    // And before the next major block (SubagentStop check)
    const subagentStopIdx = src.indexOf("hookName === 'SubagentStop'");
    if (subagentStopIdx > -1) {
      expect(pdeBackendIdx).toBeLessThan(subagentStopIdx);
    }
  });
});
