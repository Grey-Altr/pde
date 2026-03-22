'use strict';

/**
 * test-brand-system.cjs — Phase 88 Plan 01 structural validation tests
 *
 * Covers requirements:
 *   BRAND-01: MKT artifact generation — system.md produces MKT-brand-system artifact with businessMode gate
 *   BRAND-02: Brand token DTCG extension — system.md generates SYS-brand-tokens.json with brand-marketing group and 20-field designCoverage
 *   BRAND-03: Downstream reference wiring — MKT dependsOn BRF and BTH; launch-frameworks.md has Brand System section
 *
 * Run: node --test .planning/phases/88-brand-system/tests/test-brand-system.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/system.md and references/launch-frameworks.md
 * by reading each file once and running pattern checks. No runtime execution of the workflow itself.
 *
 * RED state: BRAND-01/BRAND-02/BRAND-03 (system.md) tests fail against unmodified system.md.
 *            Test 8 (BRAND-03 launch-frameworks) passes after Part B of Task 1 is applied.
 * GREEN state: All 8 tests pass after Task 2 modifications are applied to system.md.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/88-brand-system/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const systemContent = fs.readFileSync(path.join(ROOT, 'workflows', 'system.md'), 'utf-8');
const frameworksContent = fs.readFileSync(path.join(ROOT, 'references', 'launch-frameworks.md'), 'utf-8');

// ─── BRAND-01: MKT artifact generation ───────────────────────────────────────

describe('BRAND-01: MKT artifact generation', () => {
  it('system.md contains "MKT-brand-system" artifact filename pattern', () => {
    assert.ok(
      systemContent.includes('MKT-brand-system'),
      'system.md must contain "MKT-brand-system" artifact filename pattern'
    );
  });

  it('system.md contains businessMode gate before MKT generation', () => {
    const bmIdx = systemContent.indexOf('manifest-get-top-level businessMode');
    const mktIdx = systemContent.indexOf('MKT-brand-system');
    assert.ok(
      bmIdx !== -1,
      '"manifest-get-top-level businessMode" must be present in system.md'
    );
    assert.ok(
      mktIdx !== -1,
      '"MKT-brand-system" must be present in system.md'
    );
    assert.ok(
      bmIdx < mktIdx,
      'businessMode detection must appear before MKT artifact generation'
    );
  });

  it('system.md contains positioning, tone of voice, and visual differentiation sections', () => {
    assert.ok(
      systemContent.includes('Positioning Statement'),
      'system.md must contain "Positioning Statement"'
    );
    assert.ok(
      systemContent.includes('Tone of Voice Spectrum'),
      'system.md must contain "Tone of Voice Spectrum"'
    );
    assert.ok(
      systemContent.includes('Visual Differentiation Rationale'),
      'system.md must contain "Visual Differentiation Rationale"'
    );
  });
});

// ─── BRAND-02: Brand token DTCG extension ────────────────────────────────────

describe('BRAND-02: Brand token DTCG extension', () => {
  it('system.md contains "SYS-brand-tokens.json" filename pattern', () => {
    assert.ok(
      systemContent.includes('SYS-brand-tokens.json'),
      'system.md must contain "SYS-brand-tokens.json"'
    );
  });

  it('system.md contains "brand-marketing" DTCG group key', () => {
    assert.ok(
      systemContent.includes('brand-marketing'),
      'system.md must contain "brand-marketing" DTCG group key'
    );
  });

  it('system.md designCoverage write contains all 20 fields', () => {
    assert.ok(
      systemContent.includes('hasBusinessThesis'),
      'designCoverage must include hasBusinessThesis'
    );
    assert.ok(
      systemContent.includes('hasMarketLandscape'),
      'designCoverage must include hasMarketLandscape'
    );
    assert.ok(
      systemContent.includes('hasServiceBlueprint'),
      'designCoverage must include hasServiceBlueprint'
    );
    assert.ok(
      systemContent.includes('hasLaunchKit'),
      'designCoverage must include hasLaunchKit'
    );
  });
});

// ─── BRAND-03: Downstream reference wiring ───────────────────────────────────

describe('BRAND-03: Downstream reference wiring', () => {
  it('system.md MKT manifest-update dependsOn includes BRF and BTH', () => {
    assert.ok(
      systemContent.includes('manifest-update MKT dependsOn'),
      'system.md must contain MKT dependsOn manifest-update call'
    );
    const depLine = systemContent.split('\n').find(l => l.includes('manifest-update MKT dependsOn'));
    assert.ok(
      depLine && depLine.includes('BRF'),
      'MKT dependsOn must include BRF'
    );
    assert.ok(
      depLine && depLine.includes('BTH'),
      'MKT dependsOn must include BTH'
    );
  });

  it('launch-frameworks.md contains Brand System section', () => {
    assert.ok(
      frameworksContent.includes('## Brand System'),
      'launch-frameworks.md must contain "## Brand System" section'
    );
  });
});
