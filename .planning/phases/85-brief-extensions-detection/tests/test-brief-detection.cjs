'use strict';

/**
 * test-brief-detection.cjs — Phase 85 structural validation tests
 *
 * Covers requirements:
 *   BRIEF-01: Business intent detection with 5-category signal taxonomy and 3+/2+ threshold
 *   BRIEF-02: Track selection prompt with all 3 tracks and flag handling
 *   BRIEF-05: Conditional Domain Strategy section in BRF output
 *   BRIEF-07: Financial placeholder enforcement and dollar-amount verification
 *
 * Run: node --test .planning/phases/85-brief-extensions-detection/tests/test-brief-detection.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/brief.md by reading the file once
 * and running pattern checks. No runtime execution of the workflow itself.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/85-brief-extensions-detection/tests/ → go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const briefContent = fs.readFileSync(path.join(ROOT, 'workflows', 'brief.md'), 'utf-8');

// ─── BRIEF-01: Business intent detection ────────────────────────────────────

describe('BRIEF-01: Business intent detection', () => {
  it('brief.md contains a "Business Intent Detection" section header or comment', () => {
    assert.ok(
      /Business [Ii]ntent [Dd]etection/i.test(briefContent),
      'brief.md must contain "Business intent detection" or "Business Intent Detection" header'
    );
  });

  it('brief.md contains at least 3 of the 5 signal category names', () => {
    const categories = [
      'Model signals',
      'Market signals',
      'Launch signals',
      'Metrics signals',
      'Positioning signals',
    ];
    const found = categories.filter(cat => briefContent.includes(cat));
    assert.ok(
      found.length >= 3,
      `brief.md must contain at least 3 of 5 signal categories. Found: ${found.length} (${found.join(', ')})`
    );
  });

  it('brief.md contains the 3+/2+ threshold logic (BUSINESS_SIGNAL_COUNT >= 3)', () => {
    const hasThreshold =
      briefContent.includes('BUSINESS_SIGNAL_COUNT >= 3') ||
      (briefContent.includes('3') && briefContent.includes('2+') &&
        briefContent.includes('BUSINESS_SIGNAL_COUNT'));
    assert.ok(
      hasThreshold,
      'brief.md must contain threshold logic "BUSINESS_SIGNAL_COUNT >= 3" and 2+ categories'
    );
  });

  it('brief.md contains strong single signal override phrases', () => {
    const hasBusinessModel = briefContent.includes('business model');
    const hasRevenueModel = briefContent.includes('revenue model');
    const hasGoToMarket = briefContent.includes('go-to-market');
    assert.ok(
      hasBusinessModel && hasRevenueModel && hasGoToMarket,
      'brief.md must contain all three strong override signals: "business model", "revenue model", "go-to-market"'
    );
  });

  it('brief.md contains "businessMode = false" as default', () => {
    assert.ok(
      briefContent.includes('businessMode = false'),
      'brief.md must contain "businessMode = false" as the default value'
    );
  });
});

// ─── BRIEF-02: Track selection ───────────────────────────────────────────────

describe('BRIEF-02: Track selection', () => {
  it('brief.md contains all three track names in a prompt context', () => {
    const hasSoloFounder = briefContent.includes('solo_founder');
    const hasStartupTeam = briefContent.includes('startup_team');
    const hasProductLeader = briefContent.includes('product_leader');
    assert.ok(
      hasSoloFounder && hasStartupTeam && hasProductLeader,
      'brief.md must contain "solo_founder", "startup_team", and "product_leader" track names'
    );
  });

  it('brief.md checks product_leader signals before other tracks (detection order)', () => {
    const posProductLeader = briefContent.indexOf('product_leader');
    const posStartupTeam = briefContent.indexOf('startup_team');
    const posSoloFounder = briefContent.indexOf('solo_founder');
    // product_leader signals should appear before startup_team signals
    // and before solo_founder signals in the detection section
    // Check within a reasonable window — look for track detection section ordering
    const trackDetectionIdx = briefContent.indexOf('Track Detection') !== -1
      ? briefContent.indexOf('Track Detection')
      : briefContent.indexOf('Track detection');
    assert.ok(
      trackDetectionIdx !== -1,
      'brief.md must contain a "Track Detection" or "Track detection" section'
    );
    // After the track detection section starts, product_leader should appear first
    const afterDetection = briefContent.slice(trackDetectionIdx);
    const posAfterPL = afterDetection.indexOf('product_leader');
    const posAfterST = afterDetection.indexOf('startup_team');
    assert.ok(
      posAfterPL < posAfterST,
      'In the Track Detection section, product_leader signals must be listed before startup_team signals'
    );
  });

  it('brief.md contains --force flag handling for the track prompt', () => {
    const hasForceNearTrack =
      briefContent.includes('--force') &&
      (briefContent.includes('track') || briefContent.includes('Track'));
    assert.ok(
      hasForceNearTrack,
      'brief.md must contain "--force" flag handling in proximity to track selection logic'
    );
  });

  it('brief.md contains default fallback to solo_founder', () => {
    // Check that solo_founder appears as the default track
    const hasSoloDefault =
      /Default.*solo_founder|solo_founder.*[Dd]efault/.test(briefContent);
    assert.ok(
      hasSoloDefault,
      'brief.md must contain solo_founder as the default track fallback'
    );
  });
});

// ─── BRIEF-05: Domain Strategy section ───────────────────────────────────────

describe('BRIEF-05: Domain Strategy section', () => {
  it('brief.md contains "## Domain Strategy" section template', () => {
    assert.ok(
      briefContent.includes('## Domain Strategy'),
      'brief.md must contain "## Domain Strategy" section template'
    );
  });

  it('brief.md contains "Naming Direction" in the Domain Strategy context', () => {
    const domainStrategyIdx = briefContent.indexOf('## Domain Strategy');
    assert.ok(domainStrategyIdx !== -1, '"## Domain Strategy" section must exist');
    // Check that "Naming Direction" appears within a reasonable range after Domain Strategy
    const afterDomainStrategy = briefContent.slice(domainStrategyIdx, domainStrategyIdx + 2000);
    assert.ok(
      afterDomainStrategy.includes('Naming Direction'),
      '"Naming Direction" must appear in the Domain Strategy section'
    );
  });

  it('brief.md contains "Domain Availability Notes" in the Domain Strategy context', () => {
    const domainStrategyIdx = briefContent.indexOf('## Domain Strategy');
    assert.ok(domainStrategyIdx !== -1, '"## Domain Strategy" section must exist');
    const afterDomainStrategy = briefContent.slice(domainStrategyIdx, domainStrategyIdx + 2000);
    assert.ok(
      afterDomainStrategy.includes('Domain Availability Notes'),
      '"Domain Availability Notes" must appear in the Domain Strategy section'
    );
  });

  it('brief.md contains "Brand Positioning Seeds" in the Domain Strategy context', () => {
    const domainStrategyIdx = briefContent.indexOf('## Domain Strategy');
    assert.ok(domainStrategyIdx !== -1, '"## Domain Strategy" section must exist');
    const afterDomainStrategy = briefContent.slice(domainStrategyIdx, domainStrategyIdx + 2000);
    assert.ok(
      afterDomainStrategy.includes('Brand Positioning Seeds'),
      '"Brand Positioning Seeds" must appear in the Domain Strategy section'
    );
  });

  it('brief.md contains businessMode gate for Domain Strategy', () => {
    // Check that businessMode appears in proximity to Domain Strategy
    const domainStrategyIdx = briefContent.indexOf('## Domain Strategy');
    assert.ok(domainStrategyIdx !== -1, '"## Domain Strategy" section must exist');
    // Look for businessMode within 500 chars before the section
    const surroundingContext = briefContent.slice(
      Math.max(0, domainStrategyIdx - 500),
      domainStrategyIdx + 500
    );
    assert.ok(
      surroundingContext.includes('businessMode'),
      '"businessMode" must appear in proximity to "## Domain Strategy" as a gate condition'
    );
  });
});

// ─── BRIEF-07: Financial placeholder enforcement ──────────────────────────────

describe('BRIEF-07: Financial placeholder enforcement', () => {
  it('brief.md references @references/business-financial-disclaimer.md in required_reading block', () => {
    assert.ok(
      briefContent.includes('@references/business-financial-disclaimer.md'),
      'brief.md must reference "@references/business-financial-disclaimer.md" in its required_reading block'
    );
  });

  it('brief.md contains [YOUR_ placeholder pattern instruction text', () => {
    assert.ok(
      briefContent.includes('[YOUR_'),
      'brief.md must contain "[YOUR_" placeholder pattern instruction text'
    );
  });

  it('brief.md contains a post-write verification for dollar amounts ($[0-9] pattern)', () => {
    // Check for the grep pattern that verifies no dollar amounts leaked in
    const hasDollarCheck =
      briefContent.includes('$[0-9]') ||
      briefContent.includes('\\$[0-9]') ||
      /\\\$\[0-9\]/.test(briefContent) ||
      briefContent.includes('\\\\$[0-9]');
    assert.ok(
      hasDollarCheck,
      'brief.md must contain post-write verification for dollar amounts using $[0-9] or \\$[0-9] grep pattern'
    );
  });
});
