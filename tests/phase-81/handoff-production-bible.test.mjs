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

// ---------------------------------------------------------------------------
// SC-4: Software product isolation — no BIB generation
// ---------------------------------------------------------------------------

describe('SC-4: Software product isolation — no BIB generation', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  // Extract the software branch text from Step 4i
  // The software branch starts at `- "software":` and ends before `- "hardware":`
  const softwareBranchMatch = content.match(/- "software":[^\n]*(?:\n(?!- ")[^\n]*)*/);
  const softwareBranchText = softwareBranchMatch ? softwareBranchMatch[0] : '';

  test('handoff.md software branch contains "software component API" instruction', () => {
    assert.ok(
      softwareBranchText.includes('software component API') || softwareBranchText.includes('software component api'),
      'handoff.md software branch missing "software component API" instruction at Step 4i'
    );
  });

  test('handoff.md software branch does NOT contain "Production Bible"', () => {
    assert.ok(
      !softwareBranchText.includes('Production Bible'),
      'handoff.md software branch must not reference "Production Bible" — BIB generation is for experience products only'
    );
  });

  test('handoff.md software branch does NOT contain "BIB_GENERATES_SECTIONS"', () => {
    assert.ok(
      !softwareBranchText.includes('BIB_GENERATES_SECTIONS'),
      'handoff.md software branch must not set BIB_GENERATES_SECTIONS — this flag is for experience products only'
    );
  });

  test('handoff.md software branch does NOT contain "Advance Document"', () => {
    assert.ok(
      !softwareBranchText.includes('Advance Document'),
      'handoff.md software branch must not contain "Advance Document" — this is a BIB section (experience products only)'
    );
  });

  test('handoff.md software branch does NOT contain "Run Sheet"', () => {
    assert.ok(
      !softwareBranchText.includes('Run Sheet'),
      'handoff.md software branch must not contain "Run Sheet" — this is a BIB section (experience products only)'
    );
  });

  test('handoff.md anti-patterns section explicitly prohibits BIB generation for software products', () => {
    assert.ok(
      content.includes('Generate BIB for software products') ||
      content.includes('NEVER receive production bible sections') ||
      content.includes('NEVER generate Production Bible'),
      'handoff.md anti-patterns must explicitly prohibit BIB generation for software products'
    );
  });
});

// ---------------------------------------------------------------------------
// SC-5: Hybrid-event dual-surface output
// ---------------------------------------------------------------------------

describe('SC-5: Hybrid-event dual-surface output', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md contains hybrid-event sub-type name', () => {
    assert.ok(
      content.includes('hybrid-event'),
      'handoff.md missing "hybrid-event" sub-type reference'
    );
  });

  test('handoff.md sets HND_GENERATES_SOFTWARE = true for hybrid-event', () => {
    assert.ok(
      content.includes('HND_GENERATES_SOFTWARE = true'),
      'handoff.md must set HND_GENERATES_SOFTWARE = true for hybrid-event sub-type'
    );
  });

  test('handoff.md sets BIB_GENERATES_SECTIONS = true for experience products', () => {
    assert.ok(
      content.includes('BIB_GENERATES_SECTIONS = true'),
      'handoff.md must set BIB_GENERATES_SECTIONS = true for experience products (including hybrid-event)'
    );
  });

  test('handoff.md contains instruction to write BIB file (BIB- prefix)', () => {
    assert.ok(
      content.includes('BIB-{event-slug}') || content.includes('BIB-{event_slug}') || content.includes('BIB-'),
      'handoff.md must contain instruction to write BIB output file'
    );
  });

  test('handoff.md contains instruction to ALSO write HND-handoff-spec for hybrid-event', () => {
    assert.ok(
      content.includes('HND-handoff-spec-v{HND_VERSION}.md') || content.includes('HND-handoff-spec'),
      'handoff.md must contain instruction to write HND-handoff-spec file (for hybrid-event software layer)'
    );
  });

  test('handoff.md Step 7b-bib registers BIB artifact in manifest', () => {
    assert.ok(
      content.includes('manifest-update BIB'),
      'handoff.md Step 7b-bib must register BIB artifact via manifest-update BIB'
    );
  });

  test('handoff.md Step 7b registers HND artifact in manifest', () => {
    assert.ok(
      content.includes('manifest-update HND'),
      'handoff.md Step 7b must register HND artifact via manifest-update HND'
    );
  });

  test('handoff.md hybrid-event produces both BIB and HND (dual output instruction present)', () => {
    // Verify the dual-output instruction: hybrid-event writes BOTH BIB and HND outputs
    assert.ok(
      content.includes('BOTH BIB') || content.includes('ALSO write HND') || content.includes('both BIB'),
      'handoff.md must explicitly state that hybrid-event produces BOTH BIB and HND outputs'
    );
  });
});

// ---------------------------------------------------------------------------
// Hybrid-event STACK.md check NOT skipped
// ---------------------------------------------------------------------------

describe('Hybrid-event STACK.md check NOT skipped', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md Step 2a explicitly requires STACK.md check for hybrid-event', () => {
    // The bypass condition must exclude hybrid-event — hybrid-event needs STACK.md for digital layer
    assert.ok(
      content.includes('experienceSubType is "hybrid-event"') ||
      content.includes("experienceSubType is 'hybrid-event'"),
      'handoff.md Step 2a must reference hybrid-event in STACK.md bypass condition'
    );
  });

  test('handoff.md Step 2a SKIP condition applies only to non-hybrid-event experience', () => {
    // The skip must be conditional on NOT being hybrid-event
    assert.ok(
      content.includes('experienceSubType is NOT "hybrid-event"') ||
      content.includes("experienceSubType is NOT 'hybrid-event'"),
      'handoff.md SKIP STACK.md check must be gated on experienceSubType NOT being "hybrid-event"'
    );
  });

  test('handoff.md Step 2a contains "Proceed with STACK.md check" for hybrid-event path', () => {
    assert.ok(
      content.includes('Proceed with STACK.md check'),
      'handoff.md Step 2a must have a "Proceed with STACK.md check" instruction for hybrid-event'
    );
  });
});

// ---------------------------------------------------------------------------
// No Phase 74 stubs remaining
// ---------------------------------------------------------------------------

describe('No Phase 74 stubs remaining', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md does NOT contain "Phase 74 stub"', () => {
    assert.ok(
      !content.includes('Phase 74 stub'),
      'handoff.md must not contain "Phase 74 stub" — all stubs must be replaced with full implementation'
    );
  });
});

// ---------------------------------------------------------------------------
// Step 7d summary handles experience products
// ---------------------------------------------------------------------------

describe('Step 7d summary handles experience products', () => {
  const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');

  test('handoff.md Step 7d summary table contains "Production Bible" row for experience products', () => {
    assert.ok(
      content.includes('Production Bible'),
      'handoff.md Step 7d summary table must include "Production Bible" row for experience product output'
    );
  });

  test('handoff.md Step 7d summary has conditional block for experience products', () => {
    assert.ok(
      content.includes('IF PRODUCT_TYPE is "experience"') || content.includes("IF PRODUCT_TYPE is 'experience'"),
      'handoff.md Step 7d must have a conditional block specifically for experience product summary output'
    );
  });

  test('handoff.md Step 7d summary includes Sub-type row for experience products', () => {
    assert.ok(
      content.includes('Sub-type') || content.includes('sub-type') || content.includes('Sub-Type'),
      'handoff.md Step 7d experience summary must include Sub-type row showing experienceSubType value'
    );
  });

  test('handoff.md Step 7d summary for hybrid-event includes HND spec reference', () => {
    // The summary note for hybrid-event should reference both BIB and HND outputs
    assert.ok(
      content.includes('hybrid-event') && (content.includes('HND spec') || content.includes('HND-handoff-spec')),
      'handoff.md Step 7d must reference HND spec for hybrid-event alongside the production bible'
    );
  });
});
