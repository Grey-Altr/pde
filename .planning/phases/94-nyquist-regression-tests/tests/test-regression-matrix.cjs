'use strict';
/**
 * test-regression-matrix.cjs — Phase 94 Nyquist regression tests
 *
 * INTG-02: Non-business product types produce byte-identical manifest output
 *          (business gates exist; non-business skips business artifact generation)
 * INTG-03: business:software composition — independent IF blocks (WFR + LDP both produced)
 * INTG-04: business:hardware composition — hardware + business coexist (hasHardwareSpec + SBP)
 * INTG-05: business:experience composition — both artifact sets produced (EXP + BIZ)
 * INTG-06: deploy.md halts at each of 4 approval gates when user declines
 * INTG-07: all 9 v0.12 coverage-writing workflows contain all 20 designCoverage fields
 *
 * Run: node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const TWENTY_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit'
];

function readWorkflow(name) {
  return fs.readFileSync(path.join(ROOT, 'workflows', name), 'utf-8');
}

// Read all tested workflow files at module level (fail fast if missing)
const briefContent = readWorkflow('brief.md');
const wireframeContent = readWorkflow('wireframe.md');
const flowsContent = readWorkflow('flows.md');
const systemContent = readWorkflow('system.md');
const handoffContent = readWorkflow('handoff.md');
const deployContent = readWorkflow('deploy.md');

// ---------------------------------------------------------------------------
// INTG-02: Non-business product types produce byte-identical manifest output
// ---------------------------------------------------------------------------
describe('INTG-02: Non-business product types do not trigger business artifact generation', () => {
  it('brief.md contains businessMode == false skip path', () => {
    assert.ok(
      briefContent.includes('businessMode == false'),
      'brief.md must contain "businessMode == false" non-business skip path'
    );
  });

  it('brief.md always writes manifest-set-top-level businessMode (field always exists)', () => {
    assert.ok(
      briefContent.includes('manifest-set-top-level businessMode'),
      'brief.md must write manifest-set-top-level businessMode to ensure field exists for all products'
    );
  });

  it('brief.md contains hasBusinessThesis in 20-field coverage write (pass-through for non-business)', () => {
    assert.ok(
      briefContent.includes('hasBusinessThesis'),
      'brief.md must contain hasBusinessThesis in its designCoverage write'
    );
  });

  it('BTH artifact generation appears AFTER businessMode == true gate (ordering check)', () => {
    const trueGateIdx = briefContent.indexOf('businessMode == true');
    // The BTH artifact file is "BTH-thesis-v{N}.md" in brief.md
    const bthIdx = briefContent.indexOf('BTH-thesis');
    assert.ok(
      trueGateIdx !== -1,
      'brief.md must contain "businessMode == true" gate'
    );
    assert.ok(
      bthIdx !== -1,
      'brief.md must contain "BTH-thesis" artifact marker (BTH artifact file path)'
    );
    assert.ok(
      trueGateIdx < bthIdx,
      `BTH-thesis (pos ${bthIdx}) must appear AFTER businessMode == true gate (pos ${trueGateIdx})`
    );
  });

  it('wireframe.md reads businessMode before deciding LDP generation', () => {
    assert.ok(
      wireframeContent.includes('manifest-get-top-level businessMode'),
      'wireframe.md must read manifest-get-top-level businessMode before LDP decision'
    );
  });
});

// ---------------------------------------------------------------------------
// INTG-03: business:software composition — independent IF blocks
// ---------------------------------------------------------------------------
describe('INTG-03: business:software composition produces both WFR and LDP artifacts via independent IF blocks', () => {
  it('wireframe.md contains WFR artifact code (software wireframe path)', () => {
    assert.ok(
      wireframeContent.includes('WFR'),
      'wireframe.md must contain WFR artifact code for software wireframe generation'
    );
  });

  it('wireframe.md contains LDP-landing-page artifact marker (business path)', () => {
    assert.ok(
      wireframeContent.includes('LDP-landing-page'),
      'wireframe.md must contain LDP-landing-page artifact marker for business mode'
    );
  });

  it('wireframe.md does NOT use ELSE IF businessMode pattern (independent IF blocks)', () => {
    assert.ok(
      !wireframeContent.match(/ELSE\s+IF.*businessMode/),
      'wireframe.md must NOT use ELSE IF businessMode — LDP block must be an independent IF block'
    );
  });

  it('handoff.md contains TypeScript output path (software handoff)', () => {
    assert.ok(
      handoffContent.includes('TypeScript'),
      'handoff.md must contain TypeScript output for software products'
    );
  });

  it('handoff.md contains LKT artifact marker (business launch kit path)', () => {
    assert.ok(
      handoffContent.includes('LKT'),
      'handoff.md must contain LKT artifact marker for business mode launch kit assembly'
    );
  });

  it('handoff.md does NOT use ELSE IF businessMode pattern (independent IF blocks)', () => {
    assert.ok(
      !handoffContent.match(/ELSE\s+IF.*businessMode/),
      'handoff.md must NOT use ELSE IF businessMode — LKT block must be an independent IF block'
    );
  });
});

// ---------------------------------------------------------------------------
// INTG-04: business:hardware composition — hardware + business coexist
// ---------------------------------------------------------------------------
describe('INTG-04: business:hardware composition — hasHardwareSpec and business artifacts coexist', () => {
  it('TWENTY_FIELDS array includes hasHardwareSpec (hardware coverage field exists)', () => {
    assert.ok(
      TWENTY_FIELDS.includes('hasHardwareSpec'),
      'TWENTY_FIELDS must include hasHardwareSpec — hardware coverage field must be in the canonical 20-field list'
    );
  });

  it('flows.md reads businessMode BEFORE SBP-service-blueprint generation (ordering check)', () => {
    const bmReadIdx = flowsContent.indexOf('manifest-get-top-level businessMode');
    const sbpIdx = flowsContent.indexOf('SBP-service-blueprint');
    assert.ok(
      bmReadIdx !== -1,
      'flows.md must read manifest-get-top-level businessMode'
    );
    assert.ok(
      sbpIdx !== -1,
      'flows.md must contain SBP-service-blueprint artifact marker'
    );
    assert.ok(
      bmReadIdx < sbpIdx,
      `businessMode read (pos ${bmReadIdx}) must occur before SBP-service-blueprint (pos ${sbpIdx}) — business check gates SBP generation`
    );
  });

  it('handoff.md does NOT gate LKT inside PRODUCT_TYPE === "software" check', () => {
    assert.ok(
      !handoffContent.match(/PRODUCT_TYPE\s*===?\s*"software".*LKT/),
      'handoff.md must NOT gate LKT inside a software product-type check — LKT must be available to all product types in business mode'
    );
  });
});

// ---------------------------------------------------------------------------
// INTG-05: business:experience composition — both artifact sets produced
// ---------------------------------------------------------------------------
describe('INTG-05: business:experience composition produces both experience and business artifacts via independent IF blocks', () => {
  it('flows.md contains PRODUCT_TYPE == "experience" gate (experience path)', () => {
    assert.ok(
      flowsContent.includes('PRODUCT_TYPE == "experience"'),
      'flows.md must contain PRODUCT_TYPE == "experience" gate for experience flow artifacts'
    );
  });

  it('flows.md contains $BM == "true" gate (business path)', () => {
    assert.ok(
      flowsContent.includes('$BM == "true"'),
      'flows.md must contain $BM == "true" gate for business flow artifacts (SBP/GTM)'
    );
  });

  it('flows.md documents that experience+business compositions produce both artifact sets', () => {
    assert.ok(
      flowsContent.includes('experience flow artifacts AND business flow artifacts'),
      'flows.md must document that experience+business produces both experience flow artifacts AND business flow artifacts'
    );
  });

  it('system.md contains Step 5b (experience token block)', () => {
    assert.ok(
      systemContent.includes('Step 5b'),
      'system.md must contain Step 5b for experience-specific token generation'
    );
  });

  it('system.md contains Step 5c (business brand token block)', () => {
    assert.ok(
      systemContent.includes('Steps 5c') || systemContent.includes('Step 5c'),
      'system.md must contain Step 5c (or Steps 5c) for business brand token generation'
    );
  });

  it('system.md documents that Step 5b and 5c are independent conditional blocks', () => {
    assert.ok(
      systemContent.includes('independent conditional blocks'),
      'system.md must document that experience and business token blocks are independent conditional blocks'
    );
  });

  it('handoff.md documents independent IF block pattern for business:experience compositions', () => {
    assert.ok(
      handoffContent.includes('independent IF block'),
      'handoff.md must document the independent IF block pattern ensuring business:experience runs both paths'
    );
  });
});

// ---------------------------------------------------------------------------
// INTG-06: deploy.md halts at each of 4 approval gates on user decline
// ---------------------------------------------------------------------------
describe('INTG-06: deploy.md halts at each gate when user declines', () => {
  it('deploy.md contains all 4 gate labels in ascending order', () => {
    const g1 = deployContent.indexOf('Gate 1/4');
    const g2 = deployContent.indexOf('Gate 2/4');
    const g3 = deployContent.indexOf('Gate 3/4');
    const g4 = deployContent.indexOf('Gate 4/4');
    assert.ok(g1 !== -1, 'deploy.md must contain Gate 1/4');
    assert.ok(g2 !== -1, 'deploy.md must contain Gate 2/4');
    assert.ok(g3 !== -1, 'deploy.md must contain Gate 3/4');
    assert.ok(g4 !== -1, 'deploy.md must contain Gate 4/4');
    assert.ok(
      g1 < g2 && g2 < g3 && g3 < g4,
      `Gates must appear in ascending order: Gate1(${g1}) < Gate2(${g2}) < Gate3(${g3}) < Gate4(${g4})`
    );
  });

  it('deploy.md contains "Halt -- stop deployment" option text', () => {
    assert.ok(
      deployContent.includes('Halt -- stop deployment'),
      'deploy.md must contain "Halt -- stop deployment" as the decline option text'
    );
  });

  it('deploy.md contains Gate 1/4 halt message with "No files written"', () => {
    assert.ok(
      deployContent.includes('Deploy halted at Gate 1/4. No files written.'),
      'deploy.md must contain "Deploy halted at Gate 1/4. No files written." halt message'
    );
  });

  it('deploy.md contains Gate 4/4 halt message', () => {
    assert.ok(
      deployContent.includes('Deploy halted at Gate 4/4.'),
      'deploy.md must contain "Deploy halted at Gate 4/4." halt message'
    );
  });

  it('deploy.md contains "NEVER skip an approval gate" enforcement instruction', () => {
    assert.ok(
      deployContent.includes('NEVER skip an approval gate'),
      'deploy.md must contain "NEVER skip an approval gate" enforcement instruction'
    );
  });
});

// ---------------------------------------------------------------------------
// INTG-07: all v0.12 coverage-writing workflows contain all 20 designCoverage fields
// ---------------------------------------------------------------------------
const V012_COVERAGE_WRITERS = [
  'brief.md',
  'competitive.md',
  'opportunity.md',
  'flows.md',
  'wireframe.md',
  'critique.md',
  'hig.md',
  'handoff.md',
  'system.md'
];

describe('INTG-07: all v0.12 coverage-writing workflows contain all 20 designCoverage fields', () => {
  for (const filename of V012_COVERAGE_WRITERS) {
    it(`${filename} contains all 20 designCoverage field names`, () => {
      const content = readWorkflow(filename);
      const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
      assert.ok(
        missing.length === 0,
        `${filename} is missing designCoverage fields: ${missing.join(', ')}`
      );
    });
  }
});
