'use strict';

/**
 * test-flows-sbp.cjs — Phase 87 Plan 01+02 structural validation tests
 *
 * Covers requirements:
 *   OPS-01: flows.md produces SBP artifact as 5-lane Mermaid sequence diagram
 *   OPS-02: GTM channel flow artifact produced as Mermaid flowchart with ACQ/CONV/RET subgraphs
 *   OPS-03: hasServiceBlueprint coverage flag set in designCoverage (20-field write)
 *   OPS-04: Service blueprint and GTM flow depth adapt per businessTrack
 *
 * Run: node --test .planning/phases/87-flows-stage/tests/test-flows-sbp.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/flows.md by reading the file once
 * and running pattern checks. No runtime execution of the workflow itself.
 *
 * RED state: All tests fail against the unmodified flows.md.
 * GREEN state: All tests pass after Plan-01 (and Plan-02) modifications are applied.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/87-flows-stage/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const content = fs.readFileSync(path.join(ROOT, 'workflows', 'flows.md'), 'utf-8');

// ─── OPS-01: SBP artifact generation ─────────────────────────────────────────

describe('OPS-01: SBP artifact generation', () => {
  it('flows.md contains "SBP-service-blueprint" artifact filename pattern', () => {
    assert.ok(
      content.includes('SBP-service-blueprint'),
      'flows.md must contain "SBP-service-blueprint" artifact filename pattern'
    );
  });

  it('flows.md contains 5-participant sequence diagram syntax', () => {
    const hasCustomerActions = content.includes('participant C as Customer Actions');
    assert.ok(
      hasCustomerActions,
      'flows.md must contain "participant C as Customer Actions" (5-participant sequence diagram)'
    );
  });

  it('flows.md contains "Note over C,E:" line-of-visibility spanning syntax', () => {
    assert.ok(
      content.includes('Note over C,E:'),
      'flows.md must contain "Note over C,E:" spanning syntax for line of visibility'
    );
  });

  it('flows.md contains businessMode detection before SBP generation', () => {
    const bmIdx = content.indexOf('manifest-get-top-level businessMode');
    const sbpIdx = content.indexOf('SBP-service-blueprint');
    assert.ok(
      bmIdx !== -1,
      '"manifest-get-top-level businessMode" must be present in flows.md'
    );
    assert.ok(
      sbpIdx !== -1,
      '"SBP-service-blueprint" must be present in flows.md'
    );
    assert.ok(
      bmIdx < sbpIdx,
      '"manifest-get-top-level businessMode" must appear BEFORE "SBP-service-blueprint" in flows.md'
    );
  });
});

// ─── OPS-02: GTM channel flow ─────────────────────────────────────────────────

describe('OPS-02: GTM channel flow', () => {
  it('flows.md contains "GTM-channel-flow" filename pattern', () => {
    assert.ok(
      content.includes('GTM-channel-flow'),
      'flows.md must contain "GTM-channel-flow" filename pattern'
    );
  });

  it('flows.md contains acquisition/conversion/retention subgraph structure', () => {
    const hasAcquisition = content.includes('Acquisition');
    const hasConversion = content.includes('Conversion');
    const hasRetention = content.includes('Retention');
    assert.ok(
      hasAcquisition && hasConversion && hasRetention,
      `flows.md must contain Acquisition, Conversion, and Retention as subgraph labels. Found: Acquisition=${hasAcquisition}, Conversion=${hasConversion}, Retention=${hasRetention}`
    );
  });

  it('flows.md contains "flowchart LR" for GTM chart', () => {
    assert.ok(
      content.includes('flowchart LR'),
      'flows.md must contain "flowchart LR" for GTM channel flow chart'
    );
  });
});

// ─── OPS-03: hasServiceBlueprint coverage flag ────────────────────────────────

describe('OPS-03: hasServiceBlueprint coverage flag', () => {
  it('flows.md contains hasServiceBlueprint field reference', () => {
    assert.ok(
      content.includes('hasServiceBlueprint'),
      'flows.md must contain "hasServiceBlueprint" field reference in designCoverage write'
    );
  });

  it('flows.md coverage write contains all 20 designCoverage fields', () => {
    const TWENTY_FIELDS = [
      'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
      'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
      'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
      'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
      'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
      'hasServiceBlueprint', 'hasLaunchKit'
    ];
    const missing = TWENTY_FIELDS.filter(field => !content.includes(field));
    assert.ok(
      missing.length === 0,
      `flows.md must contain all 20 canonical designCoverage field names. Missing: ${missing.join(', ')}`
    );
  });
});

// ─── OPS-04: Track-specific branching ────────────────────────────────────────

describe('OPS-04: Track-specific branching for SBP', () => {
  it('flows.md contains track-specific branching for SBP (solo_founder, startup_team, product_leader)', () => {
    const hasSolo = content.includes('solo_founder');
    const hasStartup = content.includes('startup_team');
    const hasLeader = content.includes('product_leader');
    assert.ok(
      hasSolo && hasStartup && hasLeader,
      `flows.md must contain "solo_founder", "startup_team", and "product_leader" track branching. Found: solo_founder=${hasSolo}, startup_team=${hasStartup}, product_leader=${hasLeader}`
    );
  });
});
