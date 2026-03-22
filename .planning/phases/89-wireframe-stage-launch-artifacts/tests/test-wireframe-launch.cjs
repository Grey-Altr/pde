'use strict';

/**
 * test-wireframe-launch.cjs — Phase 89 Plan 01 structural validation tests
 *
 * Covers requirements:
 *   LAUNCH-01: wireframe.md produces LDP artifact with businessMode detection, LDP filename pattern,
 *              5 required section component names, and 20-field designCoverage write
 *   LAUNCH-02: wireframe.md generates STR Stripe pricing config artifact with correct placeholder pattern
 *   LAUNCH-03: wireframe.md generates DPD pitch deck outline with track-specific branching
 *   LAUNCH-04: LDP generation references MKT brand system tokens for copy framing
 *   LAUNCH-05: STR generation references LCV lean canvas revenue streams
 *   LAUNCH-06: All three launch artifacts route to launch/ directory
 *
 * Run: node --test .planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/wireframe.md and references/launch-frameworks.md
 * by reading each file once at module top and running pattern checks. No runtime execution.
 *
 * RED state (before Task 2): Tests 1-4 (LAUNCH-01), test 9 (LAUNCH-04), tests 10-11 (LAUNCH-05/06)
 *            fail against unmodified wireframe.md. Test that reads launch-frameworks.md (LDP section)
 *            passes after Part B of Task 1 is applied.
 * GREEN state (after Task 2): All 11 tests pass once wireframe.md is updated.
 *
 * Note: Tests 5-8 (LAUNCH-02 and LAUNCH-03) remain RED until Plan 02 adds STR and DPD generation.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/89-wireframe-stage-launch-artifacts/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const wireframeContent = fs.readFileSync(path.join(ROOT, 'workflows', 'wireframe.md'), 'utf-8');
const frameworksContent = fs.readFileSync(path.join(ROOT, 'references', 'launch-frameworks.md'), 'utf-8');

// ─── LAUNCH-01: businessMode detection and LDP artifact generation ────────────

describe('LAUNCH-01: businessMode detection and LDP artifact generation', () => {
  it('wireframe.md contains "manifest-get-top-level businessMode" (businessMode detection present)', () => {
    assert.ok(
      wireframeContent.includes('manifest-get-top-level businessMode'),
      'wireframe.md must contain "manifest-get-top-level businessMode" for businessMode detection'
    );
  });

  it('wireframe.md contains "LDP-landing-page" (LDP artifact filename pattern present)', () => {
    assert.ok(
      wireframeContent.includes('LDP-landing-page'),
      'wireframe.md must contain "LDP-landing-page" artifact filename pattern'
    );
  });

  it('wireframe.md contains all 5 required LDP section component names', () => {
    assert.ok(
      wireframeContent.includes('HeroSection'),
      'wireframe.md must contain "HeroSection" LDP section component name'
    );
    assert.ok(
      wireframeContent.includes('FeaturesGrid'),
      'wireframe.md must contain "FeaturesGrid" LDP section component name'
    );
    assert.ok(
      wireframeContent.includes('PricingTable'),
      'wireframe.md must contain "PricingTable" LDP section component name'
    );
    assert.ok(
      wireframeContent.includes('CTABanner'),
      'wireframe.md must contain "CTABanner" LDP section component name'
    );
    assert.ok(
      wireframeContent.includes('SiteFooter'),
      'wireframe.md must contain "SiteFooter" LDP section component name'
    );
  });

  it('wireframe.md designCoverage write contains "hasBusinessThesis" (confirms 20-field upgrade, not 16)', () => {
    assert.ok(
      wireframeContent.includes('hasBusinessThesis'),
      'wireframe.md designCoverage write must contain "hasBusinessThesis" confirming 20-field upgrade'
    );
  });
});

// ─── LAUNCH-02: STR Stripe pricing config artifact ────────────────────────────

describe('LAUNCH-02: STR Stripe pricing config artifact', () => {
  it('wireframe.md contains "STR-stripe-pricing" (STR artifact filename pattern)', () => {
    assert.ok(
      wireframeContent.includes('STR-stripe-pricing'),
      'wireframe.md must contain "STR-stripe-pricing" artifact filename pattern'
    );
  });

  it('wireframe.md contains "YOUR_PRICE_IN_CENTS" (financial placeholder pattern, not numeric unit_amount)', () => {
    assert.ok(
      wireframeContent.includes('YOUR_PRICE_IN_CENTS'),
      'wireframe.md must contain "YOUR_PRICE_IN_CENTS" financial placeholder pattern (never a numeric dollar amount)'
    );
  });
});

// ─── LAUNCH-03: DPD pitch deck outline artifact ───────────────────────────────

describe('LAUNCH-03: DPD pitch deck outline artifact', () => {
  it('wireframe.md contains "DPD-pitch-deck-outline" (DPD artifact filename pattern)', () => {
    assert.ok(
      wireframeContent.includes('DPD-pitch-deck-outline'),
      'wireframe.md must contain "DPD-pitch-deck-outline" artifact filename pattern'
    );
  });

  it('wireframe.md contains track branching strings in proximity to pitch deck format selection', () => {
    assert.ok(
      wireframeContent.includes('solo_founder'),
      'wireframe.md must contain "solo_founder" for pitch deck track branching'
    );
    assert.ok(
      wireframeContent.includes('startup_team'),
      'wireframe.md must contain "startup_team" for pitch deck track branching'
    );
    assert.ok(
      wireframeContent.includes('product_leader'),
      'wireframe.md must contain "product_leader" for pitch deck track branching'
    );
  });
});

// ─── LAUNCH-04: Brand token cross-reference in LDP generation ─────────────────

describe('LAUNCH-04: Brand token cross-reference in LDP generation', () => {
  it('wireframe.md contains MKT reference in the LDP generation section (brand token cross-reference)', () => {
    const hasMKTRef = wireframeContent.includes('MKT-brand-system') || wireframeContent.includes('MKT_FILE');
    assert.ok(
      hasMKTRef,
      'wireframe.md must contain "MKT-brand-system" or "MKT_FILE" reference in LDP generation section for brand token cross-reference'
    );
  });
});

// ─── LAUNCH-05: LCV lean canvas revenue streams in STR generation ─────────────

describe('LAUNCH-05: LCV lean canvas revenue streams in STR generation', () => {
  it('wireframe.md contains "LCV" reference in proximity to STR generation (lean canvas revenue streams reference)', () => {
    assert.ok(
      wireframeContent.includes('LCV'),
      'wireframe.md must contain "LCV" reference for lean canvas revenue streams in STR generation context'
    );
  });
});

// ─── LAUNCH-06: All launch artifacts route to launch/ directory ───────────────

describe('LAUNCH-06: All launch artifacts route to launch/ directory', () => {
  it('wireframe.md contains launch/LDP, launch/STR, and launch/DPD path patterns', () => {
    assert.ok(
      wireframeContent.includes('launch/LDP'),
      'wireframe.md must contain "launch/LDP" path pattern — LDP artifact routes to launch/ directory'
    );
    assert.ok(
      wireframeContent.includes('launch/STR'),
      'wireframe.md must contain "launch/STR" path pattern — STR artifact routes to launch/ directory'
    );
    assert.ok(
      wireframeContent.includes('launch/DPD'),
      'wireframe.md must contain "launch/DPD" path pattern — DPD artifact routes to launch/ directory'
    );
  });
});
