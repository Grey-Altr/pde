// Phase 79 — Critique and HIG Extensions
// Nyquist test suite: structural assertions covering CRIT-01 through CRIT-08
// and PHIG-01 through PHIG-07 requirements.
// Written BEFORE workflow edits (Wave 0) so that failing tests validate the pre-state.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// CRIT-01 through CRIT-07: seven experience perspectives in critique.md
// ---------------------------------------------------------------------------

describe('CRIT-01 through CRIT-07: seven experience perspectives in critique.md', () => {
  const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');

  test('CRIT-01: critique.md contains Experience Perspective 1: Safety', () => {
    assert.ok(
      content.includes('Experience Perspective 1: Safety'),
      'critique.md missing "Experience Perspective 1: Safety"'
    );
  });

  test('CRIT-02: critique.md contains Experience Perspective 2: Physical Accessibility', () => {
    assert.ok(
      content.includes('Experience Perspective 2: Physical Accessibility'),
      'critique.md missing "Experience Perspective 2: Physical Accessibility"'
    );
  });

  test('CRIT-03: critique.md contains Experience Perspective 3: Operations', () => {
    assert.ok(
      content.includes('Experience Perspective 3: Operations'),
      'critique.md missing "Experience Perspective 3: Operations"'
    );
  });

  test('CRIT-04: critique.md contains Experience Perspective 4: Sustainability', () => {
    assert.ok(
      content.includes('Experience Perspective 4: Sustainability'),
      'critique.md missing "Experience Perspective 4: Sustainability"'
    );
  });

  test('CRIT-05: critique.md contains Experience Perspective 5: Licensing/Legal', () => {
    assert.ok(
      content.includes('Experience Perspective 5: Licensing/Legal'),
      'critique.md missing "Experience Perspective 5: Licensing/Legal"'
    );
  });

  test('CRIT-06: critique.md contains Experience Perspective 6: Financial', () => {
    assert.ok(
      content.includes('Experience Perspective 6: Financial'),
      'critique.md missing "Experience Perspective 6: Financial"'
    );
  });

  test('CRIT-07: critique.md contains Experience Perspective 7: Community', () => {
    assert.ok(
      content.includes('Experience Perspective 7: Community'),
      'critique.md missing "Experience Perspective 7: Community"'
    );
  });
});

// ---------------------------------------------------------------------------
// CRIT-08: regulatory disclaimer tags in critique.md
// ---------------------------------------------------------------------------

describe('CRIT-08: regulatory disclaimer tags in critique.md', () => {
  const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');

  test('CRIT-08a: critique.md contains [VERIFY WITH LOCAL AUTHORITY] tag', () => {
    assert.ok(
      content.includes('[VERIFY WITH LOCAL AUTHORITY]'),
      'critique.md missing "[VERIFY WITH LOCAL AUTHORITY]" inline disclaimer tag'
    );
  });

  test('CRIT-08b: ELSE guard present after experience branch in critique.md', () => {
    const firstPerspectiveIdx = content.indexOf('Experience Perspective 1');
    assert.ok(
      firstPerspectiveIdx !== -1,
      'critique.md: Experience Perspective 1 not found — cannot verify ELSE guard position'
    );
    const elseAfterIdx = content.indexOf('ELSE', firstPerspectiveIdx);
    assert.ok(
      elseAfterIdx !== -1,
      'critique.md: ELSE guard not found after Experience Perspective 1 — experience/software path isolation missing'
    );
  });
});

// ---------------------------------------------------------------------------
// PHIG-01 through PHIG-07: seven physical HIG domains in hig.md
// ---------------------------------------------------------------------------

describe('PHIG-01 through PHIG-07: seven physical HIG domains in hig.md', () => {
  const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');

  test('PHIG-01: hig.md contains Physical HIG Domain 1: Wayfinding', () => {
    assert.ok(
      content.includes('Physical HIG Domain 1: Wayfinding'),
      'hig.md missing "Physical HIG Domain 1: Wayfinding"'
    );
  });

  test('PHIG-02: hig.md contains Physical HIG Domain 2: Acoustic Zoning', () => {
    assert.ok(
      content.includes('Physical HIG Domain 2: Acoustic Zoning'),
      'hig.md missing "Physical HIG Domain 2: Acoustic Zoning"'
    );
  });

  test('PHIG-03: hig.md contains Physical HIG Domain 3: Queue UX', () => {
    assert.ok(
      content.includes('Physical HIG Domain 3: Queue UX'),
      'hig.md missing "Physical HIG Domain 3: Queue UX"'
    );
  });

  test('PHIG-04: hig.md contains Physical HIG Domain 4: Transaction Speed', () => {
    assert.ok(
      content.includes('Physical HIG Domain 4: Transaction Speed'),
      'hig.md missing "Physical HIG Domain 4: Transaction Speed"'
    );
  });

  test('PHIG-05: hig.md contains Physical HIG Domain 5: Toilet Ratio', () => {
    assert.ok(
      content.includes('Physical HIG Domain 5: Toilet Ratio'),
      'hig.md missing "Physical HIG Domain 5: Toilet Ratio"'
    );
  });

  test('PHIG-06: hig.md contains Physical HIG Domain 6: Hydration', () => {
    assert.ok(
      content.includes('Physical HIG Domain 6: Hydration'),
      'hig.md missing "Physical HIG Domain 6: Hydration"'
    );
  });

  test('PHIG-07: hig.md contains Physical HIG Domain 7: First Aid', () => {
    assert.ok(
      content.includes('Physical HIG Domain 7: First Aid'),
      'hig.md missing "Physical HIG Domain 7: First Aid"'
    );
  });
});

// ---------------------------------------------------------------------------
// PHIG cross-type isolation: hig.md experience gate
// ---------------------------------------------------------------------------

describe('PHIG cross-type isolation: hig.md experience gate', () => {
  const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');

  test('hig.md contains productType or PRODUCT_TYPE gate string', () => {
    assert.ok(
      content.includes('productType') || content.includes('PRODUCT_TYPE'),
      'hig.md missing productType/PRODUCT_TYPE gate — experience/software isolation not present'
    );
  });

  test('hig.md has ELSE guard after experience branch', () => {
    const firstDomainIdx = content.indexOf('Physical HIG Domain');
    assert.ok(
      firstDomainIdx !== -1,
      'hig.md: Physical HIG Domain not found — cannot verify ELSE guard position'
    );
    const elseAfterIdx = content.indexOf('ELSE', firstDomainIdx);
    assert.ok(
      elseAfterIdx !== -1,
      'hig.md: ELSE guard not found after Physical HIG Domain — experience/software path isolation missing'
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-type isolation: productType gate in both workflows
// ---------------------------------------------------------------------------

describe('Cross-type isolation: productType gate in both workflows', () => {
  test('critique.md contains productType or PRODUCT_TYPE gate', () => {
    const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');
    assert.ok(
      content.includes('productType') || content.includes('PRODUCT_TYPE'),
      'critique.md missing productType/PRODUCT_TYPE gate — experience gate not present'
    );
  });

  test('hig.md contains productType or PRODUCT_TYPE gate', () => {
    const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');
    assert.ok(
      content.includes('productType') || content.includes('PRODUCT_TYPE'),
      'hig.md missing productType/PRODUCT_TYPE gate — experience gate not present'
    );
  });
});
