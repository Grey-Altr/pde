'use strict';

/**
 * test-critique-hig-business.cjs — Phase 90 Plan 01 structural validation tests
 *
 * Covers requirements:
 *   QUAL-01: critique.md adds 4 business critique perspectives (unit economics viability,
 *            GTM-ICP fit, pricing psychology, investor readiness) with businessMode detection
 *            and updated composite score formula (denominator 9.5)
 *   QUAL-02: critique.md performs pitch coherence cross-check comparing LCV UVP with DPD
 *            solution slide content using coherence anchors
 *   QUAL-03: hig.md adds business communications HIG section (pitch deck readability,
 *            email cadence, content calendar structure)
 *   QUAL-04: Business critique findings use standard severity levels only — no "info" severity
 *   INTG-02: Both critique.md and hig.md use 20-field designCoverage write including
 *            hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit
 *
 * Run: node --test .planning/phases/90-critique-hig-extensions/tests/test-critique-hig-business.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/critique.md and workflows/hig.md
 * by reading each file once at module top and running pattern checks. No runtime execution.
 *
 * RED state (before Task 2): QUAL-01, QUAL-02, QUAL-03, and INTG-02 tests fail against
 *   unmodified critique.md and hig.md. QUAL-04 negative assertions pass (no "| info |" present).
 * GREEN state (after Task 2): All critique-related tests pass. hig.md tests remain RED
 *   until Plan 02 adds HIG business communications extension.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/90-critique-hig-extensions/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const critiqueContent = fs.readFileSync(path.join(ROOT, 'workflows', 'critique.md'), 'utf-8');
const higContent = fs.readFileSync(path.join(ROOT, 'workflows', 'hig.md'), 'utf-8');

// ─── QUAL-01: 4 business critique perspectives in critique.md ─────────────────

describe('QUAL-01: 4 business critique perspectives in critique.md', () => {
  it('critique.md contains "manifest-get-top-level businessMode" (businessMode detection present)', () => {
    assert.ok(
      critiqueContent.includes('manifest-get-top-level businessMode'),
      'critique.md must contain "manifest-get-top-level businessMode" for businessMode detection'
    );
  });

  it('critique.md contains "Unit Economics Viability" (BIZ-1 perspective name)', () => {
    assert.ok(
      critiqueContent.includes('Unit Economics Viability'),
      'critique.md must contain "Unit Economics Viability" business perspective'
    );
  });

  it('critique.md contains "GTM-ICP Fit" (BIZ-2 perspective name)', () => {
    assert.ok(
      critiqueContent.includes('GTM-ICP Fit'),
      'critique.md must contain "GTM-ICP Fit" business perspective'
    );
  });

  it('critique.md contains "Pricing Psychology" (BIZ-3 perspective name)', () => {
    assert.ok(
      critiqueContent.includes('Pricing Psychology'),
      'critique.md must contain "Pricing Psychology" business perspective'
    );
  });

  it('critique.md contains "Investor Readiness" (BIZ-4 perspective name)', () => {
    assert.ok(
      critiqueContent.includes('Investor Readiness'),
      'critique.md must contain "Investor Readiness" business perspective'
    );
  });

  it('critique.md business mode composite uses denominator 9.5 (sum of 8 perspective weights)', () => {
    assert.ok(
      critiqueContent.includes('/ 9.5'),
      'critique.md must contain "/ 9.5" for business mode composite score denominator'
    );
  });

  it('critique.md scorecard "Groups Evaluated" includes all 4 business perspective names', () => {
    assert.ok(
      critiqueContent.includes('Unit Economics Viability, GTM-ICP Fit, Pricing Psychology, Investor Readiness'),
      'critique.md must contain comma-separated list of all 4 business perspective names for scorecard Groups Evaluated field'
    );
  });
});

// ─── QUAL-02: pitch coherence cross-check in critique.md ─────────────────────

describe('QUAL-02: pitch coherence cross-check in critique.md', () => {
  it('critique.md contains "LCV-lean-canvas" glob in strategy/ path', () => {
    assert.ok(
      critiqueContent.includes('LCV-lean-canvas') && critiqueContent.includes('strategy/'),
      'critique.md must contain both "LCV-lean-canvas" and "strategy/" for correct glob pattern'
    );
  });

  it('critique.md contains "DPD-pitch-deck-outline" glob in launch/ path', () => {
    assert.ok(
      critiqueContent.includes('DPD-pitch-deck-outline'),
      'critique.md must contain "DPD-pitch-deck-outline" for pitch deck artifact glob'
    );
  });

  it('critique.md contains coherence anchor "LCV.box3.UVP"', () => {
    assert.ok(
      critiqueContent.includes('LCV.box3.UVP'),
      'critique.md must contain "LCV.box3.UVP" coherence anchor for UVP cross-check'
    );
  });

  it('critique.md contains coherence anchor "LCV.box6.metrics"', () => {
    assert.ok(
      critiqueContent.includes('LCV.box6.metrics'),
      'critique.md must contain "LCV.box6.metrics" coherence anchor for traction cross-check'
    );
  });

  it('critique.md contains "Pitch Coherence Cross-Check" section heading', () => {
    assert.ok(
      critiqueContent.includes('Pitch Coherence Cross-Check'),
      'critique.md must contain "Pitch Coherence Cross-Check" as section heading'
    );
  });
});

// ─── QUAL-03: business communications HIG in hig.md ──────────────────────────

describe('QUAL-03: business communications HIG in hig.md', () => {
  it('hig.md contains "manifest-get-top-level businessMode" (businessMode detection present)', () => {
    assert.ok(
      higContent.includes('manifest-get-top-level businessMode'),
      'hig.md must contain "manifest-get-top-level businessMode" for businessMode detection'
    );
  });

  it('hig.md contains pitch deck readability domain', () => {
    assert.ok(
      higContent.toLowerCase().includes('pitch deck readability'),
      'hig.md must contain "pitch deck readability" (case-insensitive) as business communications domain'
    );
  });

  it('hig.md contains email cadence domain', () => {
    assert.ok(
      higContent.toLowerCase().includes('email cadence'),
      'hig.md must contain "email cadence" (case-insensitive) as business communications domain'
    );
  });

  it('hig.md contains content calendar domain', () => {
    assert.ok(
      higContent.toLowerCase().includes('content calendar'),
      'hig.md must contain "content calendar" (case-insensitive) as business communications domain'
    );
  });
});

// ─── QUAL-04: standard severity levels only ───────────────────────────────────

describe('QUAL-04: standard severity levels only (no "info" severity)', () => {
  it('critique.md does NOT use "| info |" severity value (canonical system uses critical/major/minor/nit)', () => {
    assert.ok(
      !critiqueContent.includes('| info |'),
      'critique.md must NOT contain "| info |" — canonical severity system uses critical/major/minor/nit only'
    );
  });

  it('hig.md does NOT use "| info |" severity value', () => {
    assert.ok(
      !higContent.includes('| info |'),
      'hig.md must NOT contain "| info |" — canonical severity system uses critical/major/minor/nit only'
    );
  });
});

// ─── INTG-02: 20-field designCoverage write ───────────────────────────────────

describe('INTG-02: 20-field designCoverage write in both critique.md and hig.md', () => {
  it('critique.md designCoverage contains "hasBusinessThesis" (confirms 20-field upgrade)', () => {
    assert.ok(
      critiqueContent.includes('hasBusinessThesis'),
      'critique.md must contain "hasBusinessThesis" in designCoverage write — confirms 16→20 field upgrade'
    );
  });

  it('hig.md designCoverage contains "hasBusinessThesis" (confirms 20-field upgrade)', () => {
    assert.ok(
      higContent.includes('hasBusinessThesis'),
      'hig.md must contain "hasBusinessThesis" in designCoverage write — confirms 16→20 field upgrade'
    );
  });

  it('critique.md designCoverage contains "hasMarketLandscape"', () => {
    assert.ok(
      critiqueContent.includes('hasMarketLandscape'),
      'critique.md must contain "hasMarketLandscape" in designCoverage write'
    );
  });

  it('hig.md designCoverage contains "hasMarketLandscape"', () => {
    assert.ok(
      higContent.includes('hasMarketLandscape'),
      'hig.md must contain "hasMarketLandscape" in designCoverage write'
    );
  });

  it('critique.md designCoverage contains "hasServiceBlueprint"', () => {
    assert.ok(
      critiqueContent.includes('hasServiceBlueprint'),
      'critique.md must contain "hasServiceBlueprint" in designCoverage write'
    );
  });

  it('critique.md designCoverage contains "hasLaunchKit"', () => {
    assert.ok(
      critiqueContent.includes('hasLaunchKit'),
      'critique.md must contain "hasLaunchKit" in designCoverage write'
    );
  });
});
