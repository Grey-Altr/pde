'use strict';

/**
 * test-foundation.cjs — Phase 84 structural validation tests
 *
 * Covers all 7 FOUND requirements:
 *   FOUND-01: businessMode + businessTrack in design-manifest.json
 *   FOUND-02: 20 designCoverage fields (16 existing + 4 new) in design-manifest.json
 *   FOUND-03: 'launch' in DOMAIN_DIRS in bin/lib/design.cjs
 *   FOUND-04: references/business-track.md exists with expected content
 *   FOUND-05: references/launch-frameworks.md exists with expected content
 *   FOUND-06: references/business-financial-disclaimer.md exists with placeholder guards
 *   FOUND-07: references/business-legal-disclaimer.md exists with checklist and prohibited patterns
 *
 * Run: node .planning/phases/84-foundation/tests/test-foundation.cjs
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/84-foundation/tests/ → go up 4 levels
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ─── FOUND-01 ────────────────────────────────────────────────────────────────

describe('FOUND-01: businessMode and businessTrack in design-manifest.json', () => {
  it('contains businessMode: false (boolean) and businessTrack string field', () => {
    const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');

    assert.ok(
      content.includes('"businessMode": false'),
      'design-manifest.json must contain "businessMode": false'
    );
    assert.ok(
      content.includes('"businessTrack"'),
      'design-manifest.json must contain "businessTrack" field'
    );
  });

  it('businessMode appears after experienceSubType and before outputRoot', () => {
    const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');

    const posExperienceSubType = content.indexOf('"experienceSubType"');
    const posBusinessMode = content.indexOf('"businessMode"');
    const posOutputRoot = content.indexOf('"outputRoot"');

    assert.ok(posExperienceSubType !== -1, 'experienceSubType must exist in manifest');
    assert.ok(posBusinessMode !== -1, 'businessMode must exist in manifest');
    assert.ok(posOutputRoot !== -1, 'outputRoot must exist in manifest');

    assert.ok(
      posExperienceSubType < posBusinessMode,
      'businessMode must appear after experienceSubType'
    );
    assert.ok(
      posBusinessMode < posOutputRoot,
      'businessMode must appear before outputRoot'
    );
  });
});

// ─── FOUND-02 ────────────────────────────────────────────────────────────────

describe('FOUND-02: 20 designCoverage fields in design-manifest.json', () => {
  const EXISTING_16 = [
    'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
    'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
    'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
    'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral', 'hasProductionBible'
  ];
  const NEW_4 = [
    'hasBusinessThesis', 'hasMarketLandscape', 'hasServiceBlueprint', 'hasLaunchKit'
  ];

  it('all 16 existing designCoverage field names appear in the manifest', () => {
    const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');

    for (const field of EXISTING_16) {
      assert.ok(
        content.includes(`"${field}"`),
        `designCoverage must contain existing field: ${field}`
      );
    }
  });

  it('all 4 new designCoverage field names appear in the manifest', () => {
    const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');

    for (const field of NEW_4) {
      assert.ok(
        content.includes(`"${field}"`),
        `designCoverage must contain new field: ${field}`
      );
    }
  });

  it('4 new fields appear AFTER hasProductionBible in the file', () => {
    const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');

    const posProductionBible = content.indexOf('"hasProductionBible"');
    assert.ok(posProductionBible !== -1, 'hasProductionBible must exist in manifest');

    for (const field of NEW_4) {
      const pos = content.indexOf(`"${field}"`);
      assert.ok(pos !== -1, `New field ${field} must exist in manifest`);
      assert.ok(
        pos > posProductionBible,
        `New field ${field} must appear after hasProductionBible`
      );
    }
  });

  it('designCoverage has exactly 20 non-comment fields', () => {
    const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const coverageKeys = Object.keys(manifest.designCoverage).filter(k => k !== '_comment');
    assert.strictEqual(
      coverageKeys.length,
      20,
      `designCoverage must have exactly 20 fields, found: ${coverageKeys.length}`
    );
  });
});

// ─── FOUND-03 ────────────────────────────────────────────────────────────────

describe("FOUND-03: 'launch' in DOMAIN_DIRS in bin/lib/design.cjs", () => {
  it("'launch' appears inside the DOMAIN_DIRS array definition", () => {
    const designCjsPath = path.join(PROJECT_ROOT, 'bin', 'lib', 'design.cjs');
    const content = fs.readFileSync(designCjsPath, 'utf-8');

    const match = content.match(/DOMAIN_DIRS\s*=\s*\[[\s\S]*?'launch'[\s\S]*?\]/);
    assert.ok(
      match !== null,
      "DOMAIN_DIRS array in bin/lib/design.cjs must contain 'launch'"
    );
  });
});

// ─── FOUND-04 ────────────────────────────────────────────────────────────────

describe('FOUND-04: references/business-track.md exists with expected content', () => {
  const filePath = path.join(PROJECT_ROOT, 'references', 'business-track.md');

  it('file exists', () => {
    assert.ok(
      fs.existsSync(filePath),
      'references/business-track.md must exist'
    );
  });

  it('contains solo_founder, startup_team, and product_leader track identifiers', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('solo_founder'), 'business-track.md must contain "solo_founder"');
    assert.ok(content.includes('startup_team'), 'business-track.md must contain "startup_team"');
    assert.ok(content.includes('product_leader'), 'business-track.md must contain "product_leader"');
  });
});

// ─── FOUND-05 ────────────────────────────────────────────────────────────────

describe('FOUND-05: references/launch-frameworks.md exists with expected content', () => {
  const filePath = path.join(PROJECT_ROOT, 'references', 'launch-frameworks.md');

  it('file exists', () => {
    assert.ok(
      fs.existsSync(filePath),
      'references/launch-frameworks.md must exist'
    );
  });

  it('contains Lean Canvas, Pitch Deck, Service Blueprint, and Pricing Config', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Lean Canvas'), 'launch-frameworks.md must contain "Lean Canvas"');
    assert.ok(content.includes('Pitch Deck'), 'launch-frameworks.md must contain "Pitch Deck"');
    assert.ok(content.includes('Service Blueprint'), 'launch-frameworks.md must contain "Service Blueprint"');
    assert.ok(content.includes('Pricing Config'), 'launch-frameworks.md must contain "Pricing Config"');
  });
});

// ─── FOUND-06 ────────────────────────────────────────────────────────────────

describe('FOUND-06: references/business-financial-disclaimer.md placeholder guards', () => {
  const filePath = path.join(PROJECT_ROOT, 'references', 'business-financial-disclaimer.md');

  it('file exists', () => {
    assert.ok(
      fs.existsSync(filePath),
      'references/business-financial-disclaimer.md must exist'
    );
  });

  it('contains [YOUR_ placeholder pattern', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      content.includes('[YOUR_'),
      'business-financial-disclaimer.md must contain "[YOUR_" placeholder pattern'
    );
  });

  it('does NOT contain dollar amounts ($ followed by a digit)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      !/\$\d/.test(content),
      'business-financial-disclaimer.md must not contain dollar amounts like $100'
    );
  });

  it('contains ## Prohibited Patterns section', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      content.includes('## Prohibited Patterns'),
      'business-financial-disclaimer.md must contain "## Prohibited Patterns" section'
    );
  });
});

// ─── FOUND-07 ────────────────────────────────────────────────────────────────

describe('FOUND-07: references/business-legal-disclaimer.md checklist and prohibited patterns', () => {
  const filePath = path.join(PROJECT_ROOT, 'references', 'business-legal-disclaimer.md');

  it('file exists', () => {
    assert.ok(
      fs.existsSync(filePath),
      'references/business-legal-disclaimer.md must exist'
    );
  });

  it('contains "checklist" (case-insensitive)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      /checklist/i.test(content),
      'business-legal-disclaimer.md must contain "checklist" (case-insensitive)'
    );
  });

  it('contains ## Prohibited Patterns section', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      content.includes('## Prohibited Patterns'),
      'business-legal-disclaimer.md must contain "## Prohibited Patterns" section'
    );
  });

  it('does NOT contain "Terms of Service" or "Privacy Policy" as generated content (outside Prohibited Patterns)', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const prohibitedIdx = content.indexOf('## Prohibited Patterns');

    // Content before Prohibited Patterns section should not contain these phrases
    const beforeProhibited = prohibitedIdx !== -1 ? content.slice(0, prohibitedIdx) : content;
    assert.ok(
      !beforeProhibited.includes('Terms of Service'),
      'business-legal-disclaimer.md must not contain "Terms of Service" as generated content'
    );
    assert.ok(
      !beforeProhibited.includes('Privacy Policy'),
      'business-legal-disclaimer.md must not contain "Privacy Policy" as generated content'
    );
  });
});
