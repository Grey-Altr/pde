// Phase 82 — Integration Validation and Regression Audit
// Milestone completion audit: SC-2 — all experience sub-types exercisable through pipeline.
// Verifies completed phases (74, 79, 80, 81) have implementations intact.
// Documents pending phases (75-78) as test.todo() markers.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function readWorkflow(name) {
  return readFileSync(join(ROOT, name), 'utf8');
}

// ---------------------------------------------------------------------------
// Phase 74 — foundation and regression infrastructure (COMPLETE)
// ---------------------------------------------------------------------------

describe('Phase 74 — foundation and regression infrastructure (COMPLETE)', () => {
  test('brief.md contains experience product type detection', () => {
    const content = readWorkflow('workflows/brief.md');
    assert.ok(
      content.includes('experience'),
      'brief.md: missing experience product type detection — Phase 74 must wire experience classification'
    );
  });

  test('13 pipeline workflow files contain experience branch sites', () => {
    const PIPELINE_WORKFLOWS = [
      'workflows/recommend.md',
      'workflows/competitive.md',
      'workflows/opportunity.md',
      'workflows/ideate.md',
      'workflows/brief.md',
      'workflows/system.md',
      'workflows/flows.md',
      'workflows/wireframe.md',
      'workflows/critique.md',
      'workflows/iterate.md',
      'workflows/mockup.md',
      'workflows/hig.md',
      'workflows/handoff.md',
    ];
    for (const relPath of PIPELINE_WORKFLOWS) {
      const content = readWorkflow(relPath);
      assert.ok(
        content.includes('experience'),
        `${relPath}: missing experience branch site or experience keyword — Phase 74 stubs required in all 13 skills`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 79 — critique and HIG extensions (COMPLETE)
// ---------------------------------------------------------------------------

describe('Phase 79 — critique and HIG extensions (COMPLETE)', () => {
  test('critique.md contains all 7 experience perspectives', () => {
    const content = readWorkflow('workflows/critique.md');
    const perspectives = [
      'Safety',
      'Accessibility',
      'Operations',
      'Sustainability',
      'Licensing',
      'Financial',
      'Community',
    ];
    for (const perspective of perspectives) {
      assert.ok(
        content.includes(`Experience Perspective`) && content.includes(perspective),
        `critique.md: missing Experience Perspective for "${perspective}" — Phase 79 must implement all 7 perspectives`
      );
    }
  });

  test('critique.md includes VERIFY WITH LOCAL AUTHORITY disclaimer', () => {
    const content = readWorkflow('workflows/critique.md');
    assert.ok(
      content.includes('[VERIFY WITH LOCAL AUTHORITY]'),
      'critique.md: missing [VERIFY WITH LOCAL AUTHORITY] tag — all regulatory values must carry this disclaimer'
    );
  });

  test('hig.md contains all 7 physical HIG domains', () => {
    const content = readWorkflow('workflows/hig.md');
    const domains = [
      'Wayfinding',
      'Acoustic',
      'Queue',
      'Transaction',
      'Toilet',
      'Hydration',
      'First Aid',
    ];
    for (const domain of domains) {
      assert.ok(
        content.includes(domain),
        `hig.md: missing Physical HIG Domain for "${domain}" — Phase 79 must implement all 7 domains`
      );
    }
  });

  test('hig.md uses physical-hig-audit manifest type for experience products', () => {
    const content = readWorkflow('workflows/hig.md');
    assert.ok(
      content.includes('physical-hig-audit'),
      'hig.md: missing physical-hig-audit manifest type — experience products must set artifact type to physical-hig-audit'
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 80 — print collateral (COMPLETE)
// ---------------------------------------------------------------------------

describe('Phase 80 — print collateral (COMPLETE)', () => {
  test('wireframe.md contains FLY event flyer generation block', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('FLY artifact'),
      'wireframe.md: missing FLY artifact block — Phase 80 must implement event flyer generation'
    );
  });

  test('wireframe.md contains SIT series identity template generation block', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('GENERATE_SIT'),
      'wireframe.md: missing GENERATE_SIT flag — Phase 80 must implement series identity template generation for recurring-series sub-type'
    );
  });

  test('wireframe.md contains PRG festival program generation block', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('GENERATE_PRG'),
      'wireframe.md: missing GENERATE_PRG flag — Phase 80 must implement festival program generation for multi-day sub-type'
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 81 — handoff production bible (COMPLETE)
// ---------------------------------------------------------------------------

describe('Phase 81 — handoff production bible (COMPLETE)', () => {
  test('handoff.md contains Production Bible generation', () => {
    const content = readWorkflow('workflows/handoff.md');
    assert.ok(
      content.includes('Production Bible'),
      'handoff.md: missing Production Bible — Phase 81 must implement BIB generation for experience products'
    );
  });

  test('handoff.md contains all 6 BIB sections', () => {
    const content = readWorkflow('workflows/handoff.md');
    const sections = [
      'Advance Document',
      'Run Sheet',
      'Staffing Plan',
      'Budget Framework',
      'Post-Event',
      'Print Spec',
    ];
    for (const section of sections) {
      assert.ok(
        content.includes(section),
        `handoff.md: missing BIB section "${section}" — Phase 81 must implement all 6 Production Bible sections`
      );
    }
  });

  test('handoff.md includes VERIFY WITH LOCAL AUTHORITY disclaimer', () => {
    const content = readWorkflow('workflows/handoff.md');
    assert.ok(
      content.includes('[VERIFY WITH LOCAL AUTHORITY]'),
      'handoff.md: missing [VERIFY WITH LOCAL AUTHORITY] tag — all regulatory values in BIB must carry this disclaimer'
    );
  });

  test('handoff.md has HND_GENERATES_SOFTWARE guard for pure experience', () => {
    const content = readWorkflow('workflows/handoff.md');
    assert.ok(
      content.includes('HND_GENERATES_SOFTWARE'),
      'handoff.md: missing HND_GENERATES_SOFTWARE flag — Phase 81 must set this false for pure experience (true only for hybrid-event)'
    );
  });

  test('handoff.md has four-pass BIB generation (Pass A through Pass D)', () => {
    const content = readWorkflow('workflows/handoff.md');
    assert.ok(
      content.includes('Pass A'),
      'handoff.md: missing Pass A — four-pass BIB generation (Pass A through D) is mandatory'
    );
    assert.ok(
      content.includes('Pass D'),
      'handoff.md: missing Pass D — four-pass BIB generation (Pass A through D) is mandatory'
    );
  });
});

// ---------------------------------------------------------------------------
// Pending phases — Phase 74 stubs intact (phases 75-78 NOT YET IMPLEMENTED)
// ---------------------------------------------------------------------------

describe('Pending phases — Phase 74 stubs intact (phases 75-78 NOT YET IMPLEMENTED)', () => {
  test('flows.md still has Phase 74 stub (Phase 77 pending)', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('Phase 74'),
      'flows.md: Phase 74 stub comment missing — stub must remain until Phase 77 implements temporal/spatial/social flow dimensions'
    );
  });

  test('system.md still has Phase 74 stub (Phase 76 pending)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('Phase 74'),
      'system.md: Phase 74 stub comment missing — stub must remain until Phase 76 implements experience design system token extensions'
    );
  });

  test('brief.md has experience detection but BREF extension fields are pending (Phase 75)', () => {
    const content = readWorkflow('workflows/brief.md');
    assert.ok(
      content.includes('experience'),
      'brief.md: experience detection missing — Phase 74 must wire experience classification'
    );
    assert.ok(
      !content.includes('promise_statement'),
      'brief.md: promise_statement field found but Phase 75 (BREF extensions) is not yet implemented'
    );
    assert.ok(
      !content.includes('vibe_contract'),
      'brief.md: vibe_contract field found but Phase 75 (BREF extensions) is not yet implemented'
    );
  });
});

// ---------------------------------------------------------------------------
// Pending phases — test.todo() markers for phases 75-78
// ---------------------------------------------------------------------------

describe('Pending phases — test.todo() markers for phases 75-78', () => {
  // Phase 75: BREF extensions — experience brief capture fields
  test.todo('Phase 75: BREF-01 — experience brief captures promise statement');
  test.todo('Phase 75: BREF-02 — experience brief captures vibe contract');
  test.todo('Phase 75: BREF-03 — experience brief captures audience archetype');
  test.todo('Phase 75: BREF-04 — experience brief captures venue constraints');
  test.todo('Phase 75: BREF-05 — experience brief captures repeatability intent');

  // Phase 76: DSYS — experience design system tokens
  test.todo('Phase 76: DSYS-01 — sonic design tokens generated');
  test.todo('Phase 76: DSYS-02 — lighting design tokens generated');
  test.todo('Phase 76: DSYS-03 — spatial design tokens generated');
  test.todo('Phase 76: DSYS-04 — thermal/atmospheric tokens generated');
  test.todo('Phase 76: DSYS-05 — wayfinding design tokens generated');
  test.todo('Phase 76: DSYS-06 — brand coherence tokens generated');
  test.todo('Phase 76: DSYS-07 — experience tokens in separate SYS-experience-tokens.json');

  // Phase 77: FLOW — experience flow diagrams
  test.todo('Phase 77: FLOW-01 — temporal flow diagram generated');
  test.todo('Phase 77: FLOW-02 — spatial flow diagram generated');
  test.todo('Phase 77: FLOW-03 — social flow diagram generated');
  test.todo('Phase 77: FLOW-04 — spaces inventory JSON produced');

  // Phase 78: WIRE — experience wireframes
  test.todo('Phase 78: WIRE-01 — floor plan wireframe generated as SVG-in-HTML');
  test.todo('Phase 78: WIRE-02 — timeline wireframe generated as gantt-style HTML');
  test.todo('Phase 78: WIRE-03 — floor plan and timeline registered in manifest');
});
