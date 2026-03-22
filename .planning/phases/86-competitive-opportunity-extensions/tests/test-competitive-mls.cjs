'use strict';

/**
 * test-competitive-mls.cjs — Phase 86 Plan 01 structural validation tests
 *
 * Covers requirements:
 *   MRKT-01: MLS (Market Landscape) artifact generation with TAM/SAM/SOM sizing
 *   MRKT-02: Mermaid quadrantChart competitive positioning matrix
 *   MRKT-04: 20-field designCoverage write with hasMarketLandscape
 *   MRKT-05: Track-differentiated depth (solo_founder, startup_team, product_leader)
 *
 * Run: node --test .planning/phases/86-competitive-opportunity-extensions/tests/test-competitive-mls.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/competitive.md by reading the file once
 * and running pattern checks. No runtime execution of the workflow itself.
 *
 * RED state: All tests fail against the unmodified competitive.md.
 * GREEN state: All tests pass after Plan-01 modifications are applied.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/86-competitive-opportunity-extensions/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const content = fs.readFileSync(path.join(ROOT, 'workflows', 'competitive.md'), 'utf-8');

// ─── MRKT-01: MLS artifact generation ────────────────────────────────────────

describe('MRKT-01: MLS artifact generation', () => {
  it('competitive.md contains "MLS-market-landscape" artifact filename pattern', () => {
    assert.ok(
      content.includes('MLS-market-landscape'),
      'competitive.md must contain "MLS-market-landscape" artifact filename pattern'
    );
  });

  it('competitive.md contains TAM, SAM, and SOM text', () => {
    const hasTAM = content.includes('TAM');
    const hasSAM = content.includes('SAM');
    const hasSOM = content.includes('SOM');
    assert.ok(
      hasTAM && hasSAM && hasSOM,
      `competitive.md must contain TAM, SAM, and SOM text. Found: TAM=${hasTAM}, SAM=${hasSAM}, SOM=${hasSOM}`
    );
  });

  it('competitive.md contains "[Source required]" placeholder text', () => {
    assert.ok(
      content.includes('[Source required]'),
      'competitive.md must contain "[Source required]" placeholder text'
    );
  });

  it('competitive.md contains "[YOUR_TAM_SIZE]" placeholder', () => {
    assert.ok(
      content.includes('[YOUR_TAM_SIZE]'),
      'competitive.md must contain "[YOUR_TAM_SIZE]" placeholder'
    );
  });

  it('competitive.md contains "[VERIFY FINANCIAL ASSUMPTIONS]" inline flag', () => {
    assert.ok(
      content.includes('[VERIFY FINANCIAL ASSUMPTIONS]'),
      'competitive.md must contain "[VERIFY FINANCIAL ASSUMPTIONS]" inline flag'
    );
  });

  it('MLS artifact write is gated on businessMode == true conditional', () => {
    const mlsIdx = content.indexOf('MLS-market-landscape');
    assert.ok(mlsIdx !== -1, 'MLS-market-landscape must be present in competitive.md');
    // Check that businessMode gate condition appears in proximity to MLS artifact write
    const surroundingContext = content.slice(
      Math.max(0, mlsIdx - 3000),
      mlsIdx + 500
    );
    assert.ok(
      surroundingContext.includes('businessMode'),
      '"businessMode" gate condition must appear in proximity to the MLS artifact write'
    );
  });
});

// ─── MRKT-02: Mermaid quadrant chart ─────────────────────────────────────────

describe('MRKT-02: Mermaid quadrant chart', () => {
  it('competitive.md contains "quadrantChart" Mermaid type declaration', () => {
    assert.ok(
      content.includes('quadrantChart'),
      'competitive.md must contain "quadrantChart" Mermaid type declaration'
    );
  });

  it('competitive.md contains "x-axis" and "y-axis" Mermaid axis labels', () => {
    const hasXAxis = content.includes('x-axis');
    const hasYAxis = content.includes('y-axis');
    assert.ok(
      hasXAxis && hasYAxis,
      `competitive.md must contain "x-axis" and "y-axis" Mermaid axis labels. Found: x-axis=${hasXAxis}, y-axis=${hasYAxis}`
    );
  });

  it('competitive.md contains quadrant coordinate pattern with 0-1 range notation', () => {
    // Look for coordinate pattern like [x/10, y/10] or [{x/10}, {y/10}]
    const hasCoordPattern =
      /\[[\d{].*\/10.*,.*\/10.*\]/.test(content) ||
      content.includes('[x/10') ||
      content.includes('{x/10}') ||
      content.includes('/ 10') ||
      content.includes('/10,');
    assert.ok(
      hasCoordPattern,
      'competitive.md must contain quadrant coordinate pattern with 0-1 range notation (coordinates derived from dividing by 10)'
    );
  });
});

// ─── MRKT-04: 20-field designCoverage write ──────────────────────────────────

describe('MRKT-04: 20-field designCoverage write', () => {
  it('competitive.md contains "hasMarketLandscape" in designCoverage write', () => {
    assert.ok(
      content.includes('hasMarketLandscape'),
      'competitive.md must contain "hasMarketLandscape" in the designCoverage write'
    );
  });

  it('competitive.md contains all 20 canonical designCoverage field names', () => {
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
      `competitive.md must contain all 20 canonical designCoverage field names. Missing: ${missing.join(', ')}`
    );
  });

  it('competitive.md does not contain old 16-field-only pattern ("all 16 fields")', () => {
    const hasOld16 = content.includes('all 16 fields') || content.includes('16 flags');
    assert.ok(
      !hasOld16,
      'competitive.md must NOT contain "all 16 fields" or "16 flags" — 20-field pattern must replace the old 16-field pattern'
    );
  });
});

// ─── MRKT-05: Track depth differentiation ────────────────────────────────────

describe('MRKT-05: Track depth differentiation', () => {
  it('competitive.md contains "solo_founder" track conditional', () => {
    assert.ok(
      content.includes('solo_founder'),
      'competitive.md must contain "solo_founder" track conditional'
    );
  });

  it('competitive.md contains "startup_team" track conditional', () => {
    assert.ok(
      content.includes('startup_team'),
      'competitive.md must contain "startup_team" track conditional'
    );
  });

  it('competitive.md contains "product_leader" track conditional', () => {
    assert.ok(
      content.includes('product_leader'),
      'competitive.md must contain "product_leader" track conditional'
    );
  });

  it('competitive.md contains "build-vs-buy" or "Build vs. Buy" in product_leader section', () => {
    const hasBuildVsBuy =
      content.includes('build-vs-buy') ||
      content.includes('Build vs. Buy') ||
      content.includes('build vs. buy') ||
      content.includes('Build vs Buy');
    assert.ok(
      hasBuildVsBuy,
      'competitive.md must contain "build-vs-buy" or "Build vs. Buy" language for product_leader track'
    );
  });

  it('competitive.md contains 1-page or summary format reference for solo_founder', () => {
    const has1Page =
      content.includes('1-page') ||
      content.includes('1 page') ||
      content.includes('one-page') ||
      content.includes('summary format');
    assert.ok(
      has1Page,
      'competitive.md must reference 1-page or summary format for the solo_founder track'
    );
  });
});
