'use strict';

/**
 * test-brief-artifacts.cjs — Phase 85 Plan 02 structural validation tests
 *
 * Covers requirements:
 *   BRIEF-03: BTH (Business Thesis) artifact generation — Step 5b
 *   BRIEF-04: LCV (Lean Canvas) artifact generation — Step 5c
 *   BRIEF-06: 20-field designCoverage write in Step 7
 *
 * Run: node --test .planning/phases/85-brief-extensions-detection/tests/test-brief-artifacts.cjs
 *
 * All tests assert STRUCTURAL properties of workflows/brief.md by reading the file once
 * and running pattern checks. No runtime execution of the workflow itself.
 *
 * RED state: All tests fail against the Plan-01-modified brief.md (Steps 5b/5c absent).
 * GREEN state: All tests pass after Plan-02 modifications are applied.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Project root: .planning/phases/85-brief-extensions-detection/tests/ -> go up 4 levels
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const briefContent = fs.readFileSync(path.join(ROOT, 'workflows', 'brief.md'), 'utf-8');

// ─── BRIEF-03: BTH artifact generation ─────────────────────────────────────

describe('BRIEF-03: BTH artifact generation', () => {
  it('brief.md contains a "Step 5b" section for BTH generation', () => {
    const hasStep5b =
      briefContent.includes('Step 5b') ||
      /step 5b/i.test(briefContent);
    assert.ok(
      hasStep5b,
      'brief.md must contain "Step 5b" section for BTH generation'
    );
  });

  it('brief.md contains BTH artifact file path pattern "BTH-thesis-v"', () => {
    assert.ok(
      briefContent.includes('BTH-thesis-v'),
      'brief.md must contain the BTH artifact file path pattern "BTH-thesis-v"'
    );
  });

  it('brief.md contains all four BTH content section headers in the BTH template', () => {
    // These must appear as ## Problem, ## Solution, ## Market, ## Unfair Advantage
    // in the BTH artifact template context
    const hasProb = briefContent.includes('## Problem');
    const hasSol = briefContent.includes('## Solution');
    const hasMkt = briefContent.includes('## Market');
    const hasUA = briefContent.includes('## Unfair Advantage');
    assert.ok(
      hasProb && hasSol && hasMkt && hasUA,
      `brief.md must contain all four BTH sections. Found: Problem=${hasProb}, Solution=${hasSol}, Market=${hasMkt}, UnfairAdvantage=${hasUA}`
    );
  });

  it('brief.md contains BTH manifest registration command "manifest-update BTH code BTH"', () => {
    assert.ok(
      briefContent.includes('manifest-update BTH code BTH'),
      'brief.md must contain "manifest-update BTH code BTH" manifest registration command'
    );
  });

  it('brief.md contains BTH businessMode gate condition', () => {
    // Look for the conditional logic that gates BTH generation on businessMode
    const bthIdx = briefContent.indexOf('BTH-thesis-v');
    assert.ok(bthIdx !== -1, 'BTH-thesis-v must be present in brief.md');
    // Check for businessMode condition within 2000 chars before or after the BTH path
    const surroundingContext = briefContent.slice(
      Math.max(0, bthIdx - 2000),
      bthIdx + 500
    );
    assert.ok(
      surroundingContext.includes('businessMode'),
      '"businessMode" gate condition must appear in proximity to the BTH generation step'
    );
  });

  it('brief.md contains BTH frontmatter template with "businessTrack:" field', () => {
    // The BTH frontmatter should include businessTrack
    const hasBTHFrontmatter =
      briefContent.includes('businessTrack: {confirmed_track}') ||
      briefContent.includes('businessTrack:');
    assert.ok(
      hasBTHFrontmatter,
      'brief.md must contain a BTH frontmatter template with "businessTrack:" field'
    );
  });

  it('brief.md contains BTH DESIGN-STATE update instruction (BTH + DESIGN-STATE in proximity)', () => {
    // Look for DESIGN-STATE update instruction near BTH
    const bthIdx = briefContent.indexOf('BTH-thesis-v');
    assert.ok(bthIdx !== -1, 'BTH-thesis-v must be present in brief.md');
    const afterBTH = briefContent.slice(bthIdx, bthIdx + 3000);
    const hasDesignState =
      afterBTH.includes('DESIGN-STATE') ||
      afterBTH.includes('strategy/DESIGN-STATE');
    assert.ok(
      hasDesignState,
      'brief.md must contain DESIGN-STATE update instruction in the BTH step'
    );
  });
});

// ─── BRIEF-04: LCV artifact generation ──────────────────────────────────────

describe('BRIEF-04: LCV artifact generation', () => {
  it('brief.md contains a "Step 5c" section for LCV generation', () => {
    const hasStep5c =
      briefContent.includes('Step 5c') ||
      /step 5c/i.test(briefContent);
    assert.ok(
      hasStep5c,
      'brief.md must contain "Step 5c" section for LCV generation'
    );
  });

  it('brief.md contains LCV artifact file path pattern "LCV-lean-canvas-v"', () => {
    assert.ok(
      briefContent.includes('LCV-lean-canvas-v'),
      'brief.md must contain the LCV artifact file path pattern "LCV-lean-canvas-v"'
    );
  });

  it('brief.md contains all 9 lean canvas box names in the LCV template', () => {
    const boxes = [
      'Problem',
      'Solution',
      'Unique Value Proposition',
      'Unfair Advantage',
      'Customer Segments',
      'Key Metrics',
      'Channels',
      'Cost Structure',
      'Revenue Streams',
    ];
    const missing = boxes.filter(box => !briefContent.includes(box));
    assert.ok(
      missing.length === 0,
      `brief.md must contain all 9 lean canvas box names. Missing: ${missing.join(', ')}`
    );
  });

  it('brief.md contains confidence status labels: "validated", "assumed", "unknown"', () => {
    const hasValidated = briefContent.includes('validated');
    const hasAssumed = briefContent.includes('assumed');
    const hasUnknown = briefContent.includes('unknown');
    assert.ok(
      hasValidated && hasAssumed && hasUnknown,
      `brief.md must contain all three confidence status labels. Found: validated=${hasValidated}, assumed=${hasAssumed}, unknown=${hasUnknown}`
    );
  });

  it('brief.md contains LCV manifest registration command "manifest-update LCV code LCV"', () => {
    assert.ok(
      briefContent.includes('manifest-update LCV code LCV'),
      'brief.md must contain "manifest-update LCV code LCV" manifest registration command'
    );
  });

  it('brief.md contains "dependsOn" field for LCV with BTH reference', () => {
    // Check for dependsOn in the LCV context
    const lcvIdx = briefContent.indexOf('LCV-lean-canvas-v');
    assert.ok(lcvIdx !== -1, 'LCV-lean-canvas-v must be present in brief.md');
    const afterLCV = briefContent.slice(lcvIdx, lcvIdx + 3000);
    const hasDepends = afterLCV.includes('dependsOn');
    assert.ok(
      hasDepends,
      'brief.md must contain "dependsOn" field for LCV artifact (BTH dependency)'
    );
  });

  it('brief.md contains LCV financial placeholders: [YOUR_CAC_CEILING], [YOUR_ARR_TARGET], [YOUR_LTV_ESTIMATE]', () => {
    const hasCAC = briefContent.includes('[YOUR_CAC_CEILING]');
    const hasARR = briefContent.includes('[YOUR_ARR_TARGET]');
    const hasLTV = briefContent.includes('[YOUR_LTV_ESTIMATE]');
    assert.ok(
      hasCAC && hasARR && hasLTV,
      `brief.md must contain all LCV financial placeholders. Found: CAC=${hasCAC}, ARR=${hasARR}, LTV=${hasLTV}`
    );
  });
});

// ─── BRIEF-06: 20-field designCoverage write ─────────────────────────────────

describe('BRIEF-06: 20-field designCoverage write', () => {
  it('brief.md contains "manifest-set-top-level designCoverage" command', () => {
    assert.ok(
      briefContent.includes('manifest-set-top-level designCoverage'),
      'brief.md must contain "manifest-set-top-level designCoverage" command in Step 7'
    );
  });

  it('brief.md contains all 20 designCoverage field names in the coverage write section', () => {
    const fields = [
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
    const missing = fields.filter(f => !briefContent.includes(f));
    assert.ok(
      missing.length === 0,
      `brief.md must contain all 20 designCoverage field names. Missing: ${missing.join(', ')}`
    );
  });

  it('brief.md contains "hasBusinessThesis":true in the coverage write', () => {
    // Check for hasBusinessThesis set to true (hardcoded for business mode)
    const hasHardcoded =
      briefContent.includes('"hasBusinessThesis":true') ||
      briefContent.includes('"hasBusinessThesis": true') ||
      briefContent.includes('hasBusinessThesis":true');
    assert.ok(
      hasHardcoded,
      'brief.md must set "hasBusinessThesis" to true (hardcoded) in the 20-field coverage write'
    );
  });

  it('brief.md contains "coverage-check" command to read existing coverage before writing', () => {
    assert.ok(
      briefContent.includes('coverage-check'),
      'brief.md must contain "coverage-check" command to read existing coverage before writing'
    );
  });
});
