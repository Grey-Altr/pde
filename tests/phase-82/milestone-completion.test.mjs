// Phase 82 — Integration Validation and Regression Audit
// Milestone completion audit: SC-2 — all experience sub-types exercisable through pipeline.
// Verifies completed phases (74, 75, 76, 77, 78, 79, 80, 81) have implementations intact.
// All phases complete — zero pending markers remaining.

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
// Phase 74 architecture refs intact (all phases 75-78 COMPLETE)
// ---------------------------------------------------------------------------

describe('Phase 74 architecture refs intact (all phases 75-78 COMPLETE)', () => {
  test('flows.md retains Phase 74 architecture reference (Phase 77 complete — reference comment preserved)', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('Phase 74'),
      'flows.md: Phase 74 architecture reference missing — comment must retain "Phase 74" substring'
    );
  });

  test('system.md has Phase 76 experience token architecture (Phase 76 complete)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('SYS-experience-tokens.json'),
      'system.md: SYS-experience-tokens.json generation missing — Phase 76 not implemented'
    );
    assert.ok(
      content.includes('Step 5b'),
      'system.md: Step 5b experience token block missing — Phase 76 not implemented'
    );
  });

  test('brief.md has experience detection and BREF extension fields (Phase 75 complete)', () => {
    const content = readWorkflow('workflows/brief.md');
    assert.ok(
      content.includes('experience'),
      'brief.md: experience detection missing'
    );
    assert.ok(
      content.includes('Promise Statement'),
      'brief.md: Promise Statement section missing — Phase 75 (BREF-01) not implemented'
    );
    assert.ok(
      content.includes('Vibe Contract'),
      'brief.md: Vibe Contract section missing — Phase 75 (BREF-02) not implemented'
    );
    assert.ok(
      content.includes('Audience Archetype'),
      'brief.md: Audience Archetype section missing — Phase 75 (BREF-03) not implemented'
    );
    assert.ok(
      content.includes('Venue Constraints'),
      'brief.md: Venue Constraints section missing — Phase 75 (BREF-04) not implemented'
    );
    assert.ok(
      content.includes('Repeatability Intent'),
      'brief.md: Repeatability Intent section missing — Phase 75 (BREF-05) not implemented'
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 76, 77, 78 — COMPLETE
// ---------------------------------------------------------------------------

describe('Phase 76 — experience design token architecture (COMPLETE)', () => {
  test('system.md instructs generation of SYS-experience-tokens.json for experience products (DSYS-07)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('SYS-experience-tokens.json'),
      'DSYS-07: system.md missing SYS-experience-tokens.json generation instruction'
    );
  });
  test('system.md includes sonic token generation with bpm-range (DSYS-01)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('sonic'), 'DSYS-01: sonic token category missing from system.md');
    assert.ok(content.includes('bpm-range'), 'DSYS-01: bpm-range token missing from system.md');
  });
  test('system.md includes lighting token generation with zone-main-color (DSYS-02)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('lighting'), 'DSYS-02: lighting token category missing from system.md');
    assert.ok(content.includes('zone-main-color'), 'DSYS-02: zone-main-color token missing from system.md');
  });
  test('system.md includes spatial token generation with density-target (DSYS-03)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('spatial'), 'DSYS-03: spatial token category missing from system.md');
    assert.ok(content.includes('density-target'), 'DSYS-03: density-target token missing from system.md');
  });
  test('system.md includes atmospheric token generation with ventilation-type (DSYS-04)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('atmospheric'), 'DSYS-04: atmospheric token category missing from system.md');
    assert.ok(content.includes('ventilation-type'), 'DSYS-04: ventilation-type token missing from system.md');
  });
  test('system.md includes wayfinding token generation with sign-hierarchy (DSYS-05)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('wayfinding'), 'DSYS-05: wayfinding token category missing from system.md');
    assert.ok(content.includes('sign-hierarchy'), 'DSYS-05: sign-hierarchy token missing from system.md');
  });
  test('system.md includes brand-coherence token generation with identity-thread (DSYS-06)', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(content.includes('brand-coherence'), 'DSYS-06: brand-coherence token category missing from system.md');
    assert.ok(content.includes('identity-thread'), 'DSYS-06: identity-thread token missing from system.md');
  });
});

describe('Phase 77 — experience flow diagrams (COMPLETE)', () => {

  // Phase 77: FLOW — experience flow diagrams
  test('Phase 77: FLOW-01 — temporal flow diagram generated (flows.md contains Step 4-EXP with TFL)', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('TFL') || content.includes('temporal flow'), 'FLOW-01: temporal flow generation missing from flows.md');
    assert.ok(content.includes('PRODUCT_TYPE == "experience"'), 'FLOW-01: PRODUCT_TYPE experience guard missing from flows.md');
  });
  test('Phase 77: FLOW-02 — spatial flow diagram generated (flows.md contains SFL with BOTTLENECK)', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('SFL') || content.includes('spatial flow'), 'FLOW-02: spatial flow generation missing from flows.md');
    assert.ok(content.includes('BOTTLENECK'), 'FLOW-02: BOTTLENECK annotation keyword missing from flows.md');
  });
  test('Phase 77: FLOW-03 — social flow diagram generated (flows.md contains SOC)', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('SOC') || content.includes('social flow'), 'FLOW-03: social flow generation missing from flows.md');
  });
  test('Phase 77: FLOW-04 — spaces inventory JSON produced (flows.md contains spaces-inventory.json)', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('spaces-inventory.json'), 'FLOW-04: spaces-inventory.json generation missing from flows.md');
    assert.ok(content.includes('venueCapacity'), 'FLOW-04: venueCapacity schema field missing from flows.md');
  });

  // Phase 78: WIRE — experience wireframes (COMPLETE)
  test('Phase 78: WIRE-01 — floor plan wireframe generated as SVG-in-HTML', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(content.includes('FLP') || content.includes('floor plan'), 'WIRE-01: FLP floor plan generation missing from wireframe.md');
    assert.ok(content.includes('PRODUCT_TYPE') && content.includes('experience'), 'WIRE-01: PRODUCT_TYPE experience guard missing from wireframe.md');
    assert.ok(content.includes('SCHEMATIC ONLY') || content.includes('spaces-inventory.json'), 'WIRE-01: schematic disclaimer or spaces-inventory reference missing');
  });
  test('Phase 78: WIRE-02 — timeline wireframe generated as gantt-style HTML', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(content.includes('TML') || content.includes('timeline'), 'WIRE-02: TML timeline generation missing from wireframe.md');
    assert.ok(content.includes('gantt') || content.includes('mermaid'), 'WIRE-02: gantt/mermaid chart reference missing from wireframe.md');
  });
  test('Phase 78: WIRE-03 — floor plan and timeline registered in manifest', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(content.includes('manifest-update FLP') || (content.includes('FLP') && content.includes('manifest')), 'WIRE-03: FLP manifest registration missing from wireframe.md');
    assert.ok(content.includes('manifest-update TML') || (content.includes('TML') && content.includes('manifest')), 'WIRE-03: TML manifest registration missing from wireframe.md');
  });
});
