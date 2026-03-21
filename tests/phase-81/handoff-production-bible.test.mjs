// Phase 81 — Handoff: Production Bible
// Nyquist test suite: structural assertions covering HDOF-01 through HDOF-06 requirements.
// Written BEFORE workflow edits (Wave 0) so that failing tests validate the pre-state.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// HDOF-01: Advance document in handoff.md
// ---------------------------------------------------------------------------

describe('HDOF-01: Advance document in handoff.md', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains "Advance Document" section', () => {
    assert.ok(
      content.includes('Advance Document'),
      'handoff.md missing "Advance Document" section in experience branch'
    );
  });

  test('handoff.md contains load-in reference', () => {
    assert.ok(
      content.includes('load-in') || content.includes('Load-in') || content.includes('load_in'),
      'handoff.md missing load-in reference in advance document'
    );
  });

  test('handoff.md contains sound check reference', () => {
    assert.ok(
      content.includes('sound check') || content.includes('Sound check') || content.includes('sound_check'),
      'handoff.md missing sound check reference in advance document'
    );
  });

  test('handoff.md contains doors reference', () => {
    assert.ok(
      content.includes('doors') || content.includes('Doors'),
      'handoff.md missing doors reference in advance document'
    );
  });

  test('handoff.md contains curfew reference', () => {
    assert.ok(
      content.includes('curfew') || content.includes('Curfew'),
      'handoff.md missing curfew reference in advance document'
    );
  });

  test('handoff.md contains load-out reference', () => {
    assert.ok(
      content.includes('load-out') || content.includes('Load-out') || content.includes('load_out'),
      'handoff.md missing load-out reference in advance document'
    );
  });

  test('handoff.md contains Contact Sheet reference', () => {
    assert.ok(
      content.includes('Contact Sheet') || content.includes('contact sheet'),
      'handoff.md missing Contact Sheet reference in advance document'
    );
  });

  test('handoff.md contains Rider reference', () => {
    assert.ok(
      content.includes('Rider') || content.includes('rider'),
      'handoff.md missing Rider fulfillment reference in advance document'
    );
  });
});

// ---------------------------------------------------------------------------
// HDOF-02: Run sheet table format
// ---------------------------------------------------------------------------

describe('HDOF-02: Run sheet table format', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains Run Sheet section', () => {
    assert.ok(
      content.includes('Run Sheet'),
      'handoff.md missing "Run Sheet" section in experience branch'
    );
  });

  test('handoff.md run sheet has Time column', () => {
    assert.ok(
      content.includes('| Time |') || content.includes('Time |'),
      'handoff.md run sheet missing Time column header'
    );
  });

  test('handoff.md run sheet has Duration column', () => {
    assert.ok(
      content.includes('Duration'),
      'handoff.md run sheet missing Duration column header'
    );
  });

  test('handoff.md run sheet has Activity column', () => {
    assert.ok(
      content.includes('Activity'),
      'handoff.md run sheet missing Activity column header'
    );
  });

  test('handoff.md run sheet has Responsible column', () => {
    assert.ok(
      content.includes('Responsible'),
      'handoff.md run sheet missing Responsible column header'
    );
  });

  test('handoff.md run sheet has Technical Cue column', () => {
    assert.ok(
      content.includes('Technical Cue'),
      'handoff.md run sheet missing "Technical Cue" column header'
    );
  });

  test('handoff.md run sheet has Contingency column', () => {
    assert.ok(
      content.includes('Contingency'),
      'handoff.md run sheet missing Contingency column header'
    );
  });
});

// ---------------------------------------------------------------------------
// HDOF-03: Staffing plan
// ---------------------------------------------------------------------------

describe('HDOF-03: Staffing plan', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains Staffing Plan section', () => {
    assert.ok(
      content.includes('Staffing Plan'),
      'handoff.md missing "Staffing Plan" section in experience branch'
    );
  });

  test('handoff.md staffing plan contains Role reference', () => {
    assert.ok(
      content.includes('Role') || content.includes('role'),
      'handoff.md staffing plan missing Role reference'
    );
  });

  test('handoff.md staffing plan contains Headcount reference', () => {
    assert.ok(
      content.includes('Headcount') || content.includes('headcount'),
      'handoff.md staffing plan missing Headcount reference'
    );
  });

  test('handoff.md staffing plan contains Shift reference', () => {
    assert.ok(
      content.includes('Shift') || content.includes('shift'),
      'handoff.md staffing plan missing Shift reference'
    );
  });

  test('handoff.md staffing plan contains Briefing reference', () => {
    assert.ok(
      content.includes('Briefing') || content.includes('briefing'),
      'handoff.md staffing plan missing Briefing time reference'
    );
  });

  test('handoff.md staffing plan contains Door Policy reference', () => {
    assert.ok(
      content.includes('Door Policy') || content.includes('door policy'),
      'handoff.md staffing plan missing Door Policy reference'
    );
  });

  test('handoff.md staffing plan contains Bar Menu reference', () => {
    assert.ok(
      content.includes('Bar Menu') || content.includes('bar menu'),
      'handoff.md staffing plan missing Bar Menu framework reference'
    );
  });
});

// ---------------------------------------------------------------------------
// HDOF-04: Budget framework
// ---------------------------------------------------------------------------

describe('HDOF-04: Budget framework', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');
  const lower = content.toLowerCase();

  test('handoff.md contains Budget Framework section', () => {
    assert.ok(
      content.includes('Budget Framework'),
      'handoff.md missing "Budget Framework" section in experience branch'
    );
  });

  test('handoff.md budget contains 60% capacity scenario', () => {
    assert.ok(
      content.includes('60%'),
      'handoff.md budget framework missing 60% capacity scenario'
    );
  });

  test('handoff.md budget contains 80% capacity scenario', () => {
    assert.ok(
      content.includes('80%'),
      'handoff.md budget framework missing 80% capacity scenario'
    );
  });

  test('handoff.md budget contains 100% capacity scenario', () => {
    assert.ok(
      content.includes('100%'),
      'handoff.md budget framework missing 100% capacity scenario'
    );
  });

  test('handoff.md budget contains break-even reference', () => {
    assert.ok(
      lower.includes('break-even'),
      'handoff.md budget framework missing break-even analysis reference'
    );
  });
});

// ---------------------------------------------------------------------------
// HDOF-05: Post-event template
// ---------------------------------------------------------------------------

describe('HDOF-05: Post-event template', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');
  const lower = content.toLowerCase();

  test('handoff.md contains Post-Event Template section', () => {
    assert.ok(
      content.includes('Post-Event Template') || content.includes('Post-Event'),
      'handoff.md missing "Post-Event Template" section in experience branch'
    );
  });

  test('handoff.md post-event contains feedback reference', () => {
    assert.ok(
      lower.includes('feedback'),
      'handoff.md post-event template missing feedback reference'
    );
  });

  test('handoff.md post-event contains financial reconciliation reference', () => {
    assert.ok(
      lower.includes('reconciliation'),
      'handoff.md post-event template missing financial reconciliation reference'
    );
  });

  test('handoff.md post-event contains retrospective reference', () => {
    assert.ok(
      lower.includes('retrospective'),
      'handoff.md post-event template missing retrospective reference'
    );
  });
});

// ---------------------------------------------------------------------------
// HDOF-06: Print spec output
// ---------------------------------------------------------------------------

describe('HDOF-06: Print spec output', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains Print Spec section', () => {
    assert.ok(
      content.includes('Print Spec'),
      'handoff.md missing "Print Spec" section in experience branch'
    );
  });

  test('handoff.md print spec references FLY artifact', () => {
    assert.ok(
      content.includes('FLY'),
      'handoff.md print spec missing FLY (Event Flyer) artifact reference'
    );
  });

  test('handoff.md print spec references SIT artifact', () => {
    assert.ok(
      content.includes('SIT'),
      'handoff.md print spec missing SIT (Series Identity Template) artifact reference'
    );
  });

  test('handoff.md print spec references PRG artifact', () => {
    assert.ok(
      content.includes('PRG'),
      'handoff.md print spec missing PRG (Festival Program) artifact reference'
    );
  });

  test('handoff.md print spec contains bleed reference', () => {
    assert.ok(
      content.includes('bleed') || content.includes('Bleed'),
      'handoff.md print spec missing bleed reference'
    );
  });

  test('handoff.md print spec contains DPI reference', () => {
    assert.ok(
      content.includes('DPI'),
      'handoff.md print spec missing DPI reference'
    );
  });

  test('handoff.md print spec contains CMYK reference', () => {
    assert.ok(
      content.includes('CMYK'),
      'handoff.md print spec missing CMYK color mode reference'
    );
  });
});

// ---------------------------------------------------------------------------
// SC-3: Disclaimer enforcement
// ---------------------------------------------------------------------------

describe('SC-3: Disclaimer enforcement', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md experience branch contains [VERIFY WITH LOCAL AUTHORITY] tag at least twice', () => {
    const count = (content.match(/\[VERIFY WITH LOCAL AUTHORITY\]/g) || []).length;
    assert.ok(
      count >= 2,
      `handoff.md has ${count} occurrences of [VERIFY WITH LOCAL AUTHORITY] — need at least 2 in experience branch`
    );
  });
});

// ---------------------------------------------------------------------------
// SC-4/5: Product type isolation
// ---------------------------------------------------------------------------

describe('SC-4/5: Product type isolation', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains HND_GENERATES_SOFTWARE flag for product type isolation', () => {
    assert.ok(
      content.includes('HND_GENERATES_SOFTWARE'),
      'handoff.md missing HND_GENERATES_SOFTWARE flag for experience product type isolation'
    );
  });

  test('handoff.md sets HND_GENERATES_SOFTWARE = false for pure experience', () => {
    assert.ok(
      content.includes('HND_GENERATES_SOFTWARE = false'),
      'handoff.md missing HND_GENERATES_SOFTWARE = false for pure experience products'
    );
  });

  test('handoff.md sets HND_GENERATES_SOFTWARE = true for hybrid-event', () => {
    assert.ok(
      content.includes('HND_GENERATES_SOFTWARE = true'),
      'handoff.md missing HND_GENERATES_SOFTWARE = true for hybrid-event products'
    );
  });
});

// ---------------------------------------------------------------------------
// Step 2a bypass: STACK.md skip for pure experience
// ---------------------------------------------------------------------------

describe('Step 2a bypass: STACK.md skip for pure experience', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains STACK.md skip condition for non-hybrid experience', () => {
    assert.ok(
      content.includes('SKIP STACK.md check'),
      'handoff.md missing STACK.md skip condition for non-hybrid-event experience products'
    );
  });
});

// ---------------------------------------------------------------------------
// Four-pass split generation
// ---------------------------------------------------------------------------

describe('Four-pass split generation', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains Pass A reference', () => {
    assert.ok(
      content.includes('Pass A'),
      'handoff.md missing Pass A reference for four-pass split generation'
    );
  });

  test('handoff.md contains Pass B reference', () => {
    assert.ok(
      content.includes('Pass B'),
      'handoff.md missing Pass B reference for four-pass split generation'
    );
  });

  test('handoff.md contains Pass C reference', () => {
    assert.ok(
      content.includes('Pass C'),
      'handoff.md missing Pass C reference for four-pass split generation'
    );
  });

  test('handoff.md contains Pass D reference', () => {
    assert.ok(
      content.includes('Pass D'),
      'handoff.md missing Pass D reference for four-pass split generation'
    );
  });

  test('handoff.md contains BIB_GENERATES_SECTIONS flag', () => {
    assert.ok(
      content.includes('BIB_GENERATES_SECTIONS'),
      'handoff.md missing BIB_GENERATES_SECTIONS flag for four-pass split gating'
    );
  });
});

// ---------------------------------------------------------------------------
// Manifest template: hasProductionBible and hasPrintCollateral flags
// ---------------------------------------------------------------------------

describe('Manifest template: hasProductionBible flag', () => {
  const content = readFileSync(join(ROOT, 'templates/design-manifest.json'), 'utf8');

  test('templates/design-manifest.json contains hasProductionBible in designCoverage', () => {
    assert.ok(
      content.includes('"hasProductionBible"'),
      'templates/design-manifest.json missing "hasProductionBible" in designCoverage object'
    );
  });

  test('templates/design-manifest.json contains hasPrintCollateral in designCoverage', () => {
    assert.ok(
      content.includes('"hasPrintCollateral"'),
      'templates/design-manifest.json missing "hasPrintCollateral" in designCoverage object'
    );
  });
});
