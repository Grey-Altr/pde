// Phase 80 — Print Collateral
// Nyquist test suite: structural assertions covering PRNT-01, PRNT-02, PRNT-04 requirements.
// Written BEFORE workflow edits (Wave 0) so that failing tests validate the pre-state.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// PRNT-01: FLY artifact — wireframe.md experience branch
// ---------------------------------------------------------------------------

describe('PRNT-01: FLY artifact — wireframe.md experience branch', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md contains FLY artifact generation block', () => {
    assert.ok(
      content.includes('FLY'),
      'wireframe.md missing FLY artifact code'
    );
  });

  test('wireframe.md contains @page A5 size directive', () => {
    assert.ok(
      content.includes('@page') && content.includes('A5'),
      'wireframe.md missing @page A5 size directive'
    );
  });

  test('wireframe.md contains bleed zone visualization (not @page bleed)', () => {
    assert.ok(
      content.includes('bleed') && !content.includes('@page { bleed'),
      'wireframe.md uses unsupported @page bleed property instead of CSS pseudo-element workaround'
    );
  });

  test('wireframe.md contains safe zone 5mm reference', () => {
    assert.ok(
      content.includes('5mm') && content.includes('safe'),
      'wireframe.md missing safe zone 5mm reference'
    );
  });

  test('wireframe.md contains CMYK approximation table instruction', () => {
    assert.ok(
      content.includes('CMYK') && content.includes('approximation'),
      'wireframe.md missing CMYK approximation table instruction'
    );
  });

  test('wireframe.md contains Instagram square format (1080x1080)', () => {
    assert.ok(
      content.includes('1080') && content.includes('Instagram'),
      'wireframe.md missing Instagram square format (1080x1080) reference'
    );
  });

  test('wireframe.md contains format variant switcher', () => {
    assert.ok(
      content.includes('format-selector') || content.includes('setFormat'),
      'wireframe.md missing format variant switcher (format-selector or setFormat)'
    );
  });
});

// ---------------------------------------------------------------------------
// PRNT-02: prepress disclaimer and series template
// ---------------------------------------------------------------------------

describe('PRNT-02: prepress disclaimer and series template', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md has print-ready prohibition instruction', () => {
    assert.ok(
      content.includes('print-ready') &&
        (content.includes('prohibited') ||
          content.includes('MUST NOT') ||
          content.includes('disclaimer')),
      'wireframe.md missing print-ready prohibition instruction (requires "print-ready" adjacent to "prohibited", "MUST NOT", or "disclaimer")'
    );
  });

  test('wireframe.md gates SIT generation on recurring-series', () => {
    assert.ok(
      content.includes('recurring-series') && content.includes('SIT'),
      'wireframe.md missing recurring-series gate for SIT generation'
    );
  });

  test('wireframe.md contains {{variable}} slot pattern for SIT', () => {
    assert.ok(
      content.includes('{{EVENT_NAME}}') ||
        content.includes('{{DATE}}') ||
        content.includes('template-slot'),
      'wireframe.md missing {{variable}} slot pattern for SIT ({{EVENT_NAME}}, {{DATE}}, or template-slot)'
    );
  });
});

// ---------------------------------------------------------------------------
// PRNT-04: Awwwards-level composition annotations
// ---------------------------------------------------------------------------

describe('PRNT-04: Awwwards-level composition annotations', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md print block contains max 3 typefaces rule', () => {
    assert.ok(
      content.includes('3 typefaces') ||
        content.includes('max 3') ||
        content.includes('three typefaces'),
      'wireframe.md print block missing max 3 typefaces composition rule'
    );
  });

  test('wireframe.md print block contains focal hierarchy annotation', () => {
    assert.ok(
      content.includes('focal') && content.includes('hierarchy'),
      'wireframe.md print block missing focal hierarchy annotation'
    );
  });

  test('wireframe.md print block contains negative space annotation', () => {
    assert.ok(
      content.includes('negative space'),
      'wireframe.md print block missing negative space annotation'
    );
  });
});

// ---------------------------------------------------------------------------
// PRNT-01 + PRNT-02: manifest registration
// ---------------------------------------------------------------------------

describe('PRNT-01 + PRNT-02: manifest registration', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md contains FLY manifest registration', () => {
    assert.ok(
      content.includes('manifest-update FLY'),
      'wireframe.md missing FLY manifest registration (manifest-update FLY)'
    );
  });

  test('wireframe.md contains SIT manifest registration', () => {
    assert.ok(
      content.includes('manifest-update SIT'),
      'wireframe.md missing SIT manifest registration (manifest-update SIT)'
    );
  });
});

// ---------------------------------------------------------------------------
// PRNT-01: prepress disclaimer block in generation template
// ---------------------------------------------------------------------------

describe('PRNT-01: prepress disclaimer block in generation template', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md contains COMPOSITION REFERENCE disclaimer text', () => {
    assert.ok(
      content.includes('COMPOSITION REFERENCE'),
      'wireframe.md missing COMPOSITION REFERENCE disclaimer text in print generation block'
    );
  });
});

// ---------------------------------------------------------------------------
// PRNT-03: PRG festival program — wireframe.md experience branch
// ---------------------------------------------------------------------------

describe('PRNT-03: PRG festival program — wireframe.md experience branch', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md contains PRG artifact generation block', () => {
    assert.ok(
      content.includes('PRG'),
      'wireframe.md missing PRG artifact code'
    );
  });

  test('wireframe.md gates PRG generation on multi-day sub-type', () => {
    assert.ok(
      content.includes('multi-day') && content.includes('PRG'),
      'wireframe.md missing multi-day sub-type gate for PRG generation'
    );
  });

  test('wireframe.md PRG contains schedule grid section', () => {
    assert.ok(
      content.includes('schedule') && content.includes('grid'),
      'wireframe.md PRG missing schedule grid section'
    );
  });

  test('wireframe.md PRG contains artist bio section', () => {
    assert.ok(
      content.includes('artist') && (content.includes('bio') || content.includes('lineup')),
      'wireframe.md PRG missing artist bio/lineup section'
    );
  });

  test('wireframe.md PRG contains venue map placeholder', () => {
    assert.ok(
      content.includes('venue') && content.includes('map'),
      'wireframe.md PRG missing venue map placeholder'
    );
  });

  test('wireframe.md PRG contains sponsors section', () => {
    assert.ok(
      content.includes('sponsor'),
      'wireframe.md PRG missing sponsors section'
    );
  });

  test('wireframe.md contains PRG manifest registration', () => {
    assert.ok(
      content.includes('manifest-update PRG'),
      'wireframe.md missing PRG manifest registration (manifest-update PRG)'
    );
  });
});
