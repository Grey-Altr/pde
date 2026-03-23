'use strict';
/**
 * test-clobber-audit.cjs — Phase 93 structural validation tests
 *
 * INTG-01: All 4 regression workflows (recommend, iterate, mockup, ideate) write 21 designCoverage fields
 * INTG-08: recommend.md, iterate.md, mockup.md each contain a Business product type stub comment
 *
 * NOTE on INTG-08: The requirement's "grep count matches" language describes the qualitative intent
 * that businessTrack awareness appears wherever businessMode branching appears. The literal count
 * equality (60 businessMode vs 40 businessTrack across all workflows/) is not achievable because
 * build.md has 7 businessMode references with 0 businessTrack references by design — the orchestrator
 * gates Stage 14 on businessMode but never branches on track (track-depth variation is for content
 * generators, not the orchestrator). Per-file presence checks are the correct implementation of INTG-08.
 *
 * Run: node --test .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const TWENTY_ONE_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit', 'hasDeployStaging'
];

function readWorkflow(name) {
  return fs.readFileSync(path.join(ROOT, 'workflows', name), 'utf-8');
}

// INTG-01: recommend.md
describe('INTG-01: recommend.md has 21-field designCoverage write', () => {
  const content = readWorkflow('recommend.md');
  it('recommend.md contains all 21 designCoverage field names', () => {
    const missing = TWENTY_ONE_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `recommend.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('recommend.md IMPORTANT note does not say "16 fields"', () => {
    assert.ok(!content.includes('16-field JSON object'), 'recommend.md must not say "16-field JSON object" — update IMPORTANT note');
  });
});

// INTG-01: iterate.md
describe('INTG-01: iterate.md has 21-field designCoverage write', () => {
  const content = readWorkflow('iterate.md');
  it('iterate.md contains all 21 designCoverage field names', () => {
    const missing = TWENTY_ONE_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `iterate.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('iterate.md does not say "ALL sixteen current flag values"', () => {
    assert.ok(!content.includes('ALL sixteen'), 'iterate.md must not say "ALL sixteen" — update to twenty-one');
  });
});

// INTG-01: mockup.md
describe('INTG-01: mockup.md has 21-field designCoverage write', () => {
  const content = readWorkflow('mockup.md');
  it('mockup.md contains all 21 designCoverage field names', () => {
    const missing = TWENTY_ONE_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `mockup.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('mockup.md IMPORTANT does not say "ALWAYS write all 16 fields"', () => {
    assert.ok(!content.includes('ALWAYS write all 16 fields'), 'mockup.md must not say "ALWAYS write all 16 fields"');
  });
});

// INTG-01: ideate.md
describe('INTG-01: ideate.md has 21-field designCoverage write', () => {
  const content = readWorkflow('ideate.md');
  it('ideate.md contains all 21 designCoverage field names', () => {
    const missing = TWENTY_ONE_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `ideate.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('ideate.md IMPORTANT does not say "ALWAYS write all 16 fields"', () => {
    assert.ok(!content.includes('ALWAYS write all 16 fields'), 'ideate.md must not say "ALWAYS write all 16 fields"');
  });
});

// INTG-08: Business product type stubs
describe('INTG-08: recommend.md has Business product type stub', () => {
  const content = readWorkflow('recommend.md');
  it('recommend.md contains <!-- Business product type — Phase 93 stub', () => {
    assert.ok(
      content.includes('<!-- Business product type \u2014 Phase 93 stub'),
      'recommend.md must contain the Phase 93 business product type stub comment'
    );
  });
});

describe('INTG-08: iterate.md has Business product type stub', () => {
  const content = readWorkflow('iterate.md');
  it('iterate.md contains <!-- Business product type — Phase 93 stub', () => {
    assert.ok(
      content.includes('<!-- Business product type \u2014 Phase 93 stub'),
      'iterate.md must contain the Phase 93 business product type stub comment'
    );
  });
});

describe('INTG-08: mockup.md has Business product type stub', () => {
  const content = readWorkflow('mockup.md');
  it('mockup.md contains <!-- Business product type — Phase 93 stub', () => {
    assert.ok(
      content.includes('<!-- Business product type \u2014 Phase 93 stub'),
      'mockup.md must contain the Phase 93 business product type stub comment'
    );
  });
});
