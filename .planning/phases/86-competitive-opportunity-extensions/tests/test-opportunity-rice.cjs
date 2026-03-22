'use strict';

/**
 * test-opportunity-rice.cjs — Phase 86 Plan 02 structural validation tests
 *
 * Covers requirements:
 *   MRKT-03: Business Initiative Framing in RICE scoring — unit economics section
 *            (LTV formula, CAC ceiling, payback period at 3 churn scenarios)
 *            gated on businessMode == true
 *
 * Also covers:
 *   20-field designCoverage write upgrade (from 16 to 20 fields)
 *
 * Run: node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-opportunity-rice.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/opportunity.md by reading the file once
 * and running pattern checks. No runtime execution of the workflow itself.
 *
 * RED state: All tests fail against the unmodified opportunity.md (business framing absent).
 * GREEN state: All tests pass after Plan-02 modifications are applied.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/86-competitive-opportunity-extensions/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const opportunityContent = fs.readFileSync(path.join(ROOT, 'workflows', 'opportunity.md'), 'utf-8');

// ─── MRKT-03: Business Initiative Framing in RICE Scoring ──────────────────

describe('MRKT-03: Business Initiative Framing in RICE scoring', () => {
  it('opportunity.md contains "businessMode" conditional check', () => {
    assert.ok(
      opportunityContent.includes('businessMode'),
      'opportunity.md must contain "businessMode" conditional check for business initiative framing'
    );
  });

  it('opportunity.md contains "Business Initiative Framing" section header', () => {
    assert.ok(
      opportunityContent.includes('Business Initiative Framing'),
      'opportunity.md must contain "Business Initiative Framing" section header'
    );
  });

  it('opportunity.md contains LTV formula reference (Lifetime Value or LTV)', () => {
    const hasLTV =
      opportunityContent.includes('Lifetime Value') ||
      opportunityContent.includes('LTV');
    assert.ok(
      hasLTV,
      'opportunity.md must contain LTV formula reference — "Lifetime Value" or "LTV"'
    );
  });

  it('opportunity.md contains "[YOUR_CAC_CEILING]" placeholder', () => {
    assert.ok(
      opportunityContent.includes('[YOUR_CAC_CEILING]'),
      'opportunity.md must contain "[YOUR_CAC_CEILING]" structural placeholder'
    );
  });

  it('opportunity.md contains "[YOUR_PAYBACK_PERIOD]" placeholder', () => {
    assert.ok(
      opportunityContent.includes('[YOUR_PAYBACK_PERIOD]'),
      'opportunity.md must contain "[YOUR_PAYBACK_PERIOD]" structural placeholder'
    );
  });

  it('opportunity.md contains "[VERIFY FINANCIAL ASSUMPTIONS]" inline flag', () => {
    assert.ok(
      opportunityContent.includes('[VERIFY FINANCIAL ASSUMPTIONS]'),
      'opportunity.md must contain "[VERIFY FINANCIAL ASSUMPTIONS]" inline disclaimer flag'
    );
  });

  it('opportunity.md contains "Optimistic" churn scenario', () => {
    assert.ok(
      opportunityContent.includes('Optimistic'),
      'opportunity.md must contain "Optimistic" churn scenario row in payback period table'
    );
  });

  it('opportunity.md contains "Base Case" churn scenario', () => {
    assert.ok(
      opportunityContent.includes('Base Case'),
      'opportunity.md must contain "Base Case" churn scenario row in payback period table'
    );
  });

  it('opportunity.md contains "Pessimistic" churn scenario', () => {
    assert.ok(
      opportunityContent.includes('Pessimistic'),
      'opportunity.md must contain "Pessimistic" churn scenario row in payback period table'
    );
  });

  it('opportunity.md contains "[YOUR_CHURN_RATE" (partial match for churn rate placeholder)', () => {
    assert.ok(
      opportunityContent.includes('[YOUR_CHURN_RATE'),
      'opportunity.md must contain at least one "[YOUR_CHURN_RATE..." placeholder for churn rate scenarios'
    );
  });
});

// ─── 20-field designCoverage write ──────────────────────────────────────────

const TWENTY_FIELDS = [
  'hasDesignSystem',
  'hasWireframes',
  'hasFlows',
  'hasHardwareSpec',
  'hasCritique',
  'hasIterate',
  'hasHandoff',
  'hasIdeation',
  'hasCompetitive',
  'hasOpportunity',
  'hasMockup',
  'hasHigAudit',
  'hasRecommendations',
  'hasStitchWireframes',
  'hasPrintCollateral',
  'hasProductionBible',
  'hasBusinessThesis',
  'hasMarketLandscape',
  'hasServiceBlueprint',
  'hasLaunchKit',
];

describe('20-field designCoverage write', () => {
  it('opportunity.md contains all 20 designCoverage field names', () => {
    const missing = TWENTY_FIELDS.filter(f => !opportunityContent.includes(f));
    assert.ok(
      missing.length === 0,
      `opportunity.md must contain all 20 designCoverage field names. Missing: ${missing.join(', ')}`
    );
  });

  it('opportunity.md does NOT contain "all 16 fields" (old pattern must be replaced)', () => {
    assert.ok(
      !opportunityContent.includes('all 16 fields'),
      'opportunity.md must not contain "all 16 fields" — this old pattern must be replaced with "all 20 fields"'
    );
  });
});
